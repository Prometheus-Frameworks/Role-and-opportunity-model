import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalizeJcs, parseJcsJson, contractContentSha256, rawByteSha256, contractReferences, validateArtifactGraph, type ArtifactNode } from '../src/contracts/artifactDigestV1.ts';
import { packet, artifact } from './fixtures/weeklyRoleStateV1.ts';

const bytes = (s: string) => new TextEncoder().encode(s);
const vectors = JSON.parse(readFileSync(new URL('./fixtures/digest/jcs-vectors.json', import.meta.url), 'utf8')) as { id: string; json: string; canonical?: string; reject?: boolean }[];
for (const v of vectors) test(`JCS vector: ${v.id}`, () => {
  if (v.reject) assert.throws(() => canonicalizeJcs(parseJcsJson(bytes(v.json))));
  else assert.equal(canonicalizeJcs(parseJcsJson(bytes(v.json))), v.canonical);
});
function binding() {
  const h = packet();
  const deps = [...new Map(contractReferences({ evidence: h.evidence }).map(r => [JSON.stringify([r.artifactId, r.revision]), r])).values()];
  const graph: ArtifactNode[] = [{ artifact: h.artifact, dependencies: deps }, ...deps.map(artifact => ({ artifact, dependencies: [] }))];
  return { h, graph };
}
test('profile projection preserves nested hashes and array order, excludes only root self-hash', () => {
  const { h, graph } = binding(), before = structuredClone(h);
  const first = contractContentSha256(bytes(JSON.stringify(h)), graph);
  h.artifact.sha256 = 'b'.repeat(64); assert.equal(contractContentSha256(bytes(JSON.stringify(h)), graph), first);
  h.evidence[0].artifact.sha256 = 'c'.repeat(64); assert.notEqual(contractContentSha256(bytes(JSON.stringify(h)), graph), first);
  const second = contractContentSha256(bytes(JSON.stringify(h)), graph); h.evidence.reverse(); assert.notEqual(contractContentSha256(bytes(JSON.stringify(h)), graph), second);
  assert.equal(before.evidence[0].artifact.sha256, 'a'.repeat(64));
});
test('raw transport pin differs across whitespace while canonical content digest does not', () => {
  const { h, graph } = binding(), compact = bytes(JSON.stringify(h)), pretty = bytes(JSON.stringify(h, null, 2));
  assert.notEqual(rawByteSha256(compact), rawByteSha256(pretty));
  assert.equal(contractContentSha256(compact, graph), contractContentSha256(pretty, graph));
});
test('same-revision self-reference is forbidden even when forged with a different hash', () => {
  const { h, graph } = binding(); h.evidence[0].artifact = { ...h.artifact, sha256: 'd'.repeat(64) };
  graph[0].dependencies.push(h.evidence[0].artifact);
  assert.match(validateArtifactGraph(graph).join(), /self-reference/);
  assert.throws(() => contractContentSha256(bytes(JSON.stringify(h)), graph), /self-reference/);
});
test('artifact cycles, missing dependencies, conflicting clocks/profiles fail closed', () => {
  const a = artifact('a'), b = artifact('b');
  assert.match(validateArtifactGraph([{ artifact: a, dependencies: [b] }, { artifact: b, dependencies: [a] }]).join(), /cycle/);
  assert.match(validateArtifactGraph([{ artifact: a, dependencies: [b] }]).join(), /missing/);
  b.generatedAt = '2026-01-02T00:00:00Z'; assert.match(validateArtifactGraph([{ artifact: a, dependencies: [b] }, { artifact: b, dependencies: [] }]).join(), /generated after/);
  b.digestProfile = 'tiber-jcs-root-sha256-v1'; assert.match(validateArtifactGraph([{ artifact: b, dependencies: [] }]).join(), /profile/);
});
test('declared root dependencies must match embedded references', () => {
  const { h, graph } = binding(); graph[0].dependencies.pop(); assert.throws(() => contractContentSha256(bytes(JSON.stringify(h)), graph), /dependencies differ/);
});
test('all raw content bytes go through duplicate/Unicode/UTF8 validation before content hashing', () => {
  const { h, graph } = binding(); const json = JSON.stringify(h);
  assert.throws(() => contractContentSha256(bytes(json.replace('"contractVersion":', '"contractVersion":"bad","contractVersion":')), graph), /duplicate/);
  assert.throws(() => parseJcsJson(new Uint8Array([0xff])));
  assert.throws(() => parseJcsJson(bytes('\ufeff{}')));
});
test('canonicalizer rejects non-JSON JS values, cycles, accessors and sparse arrays', () => {
  const cycle: any = {}; cycle.self = cycle;
  for (const v of [NaN, Infinity, undefined, 1n, new Date(), cycle, Array(1), { get x() { throw Error('must not execute'); } }, { x: '\ud800' }]) assert.throws(() => canonicalizeJcs(v));
  assert.equal(canonicalizeJcs(-0), '0');
  assert.notEqual(canonicalizeJcs('é'), canonicalizeJcs('e\u0301'));
});
