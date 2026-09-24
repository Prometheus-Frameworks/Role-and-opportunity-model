import test from 'node:test';
import assert from 'node:assert/strict';
import { artifact, clock, packet, state } from './fixtures/weeklyRoleStateV1.ts';
import { validateWeeklyRoleStateV1 as validate } from '../src/validation/weeklyRoleStateV1.ts';
import type { ArtifactRef, PlayerTeamAllocationHandoffV1, WeeklyRoleStateV1 } from '../src/contracts/weeklyRoleStateV1.ts';

function pair() {
  const handoff = packet(), current = state(handoff);
  assert.equal(validate(current, { handoff }).valid, true);
  return { handoff, current };
}
function comparison() {
  const priorHandoff = packet(1), prior = state(priorHandoff);
  const handoff = packet(2), current = state(handoff);
  current.comparison = { priorState: structuredClone(prior.artifact), priorInput: structuredClone(priorHandoff.artifact), status: 'comparable', reasons: [], deltas: [] };
  const context = { handoff, prior: { state: prior, handoff: priorHandoff } };
  assert.equal(validate(current, context).valid, true);
  return { current, handoff, prior, priorHandoff, context };
}
function teamstate(current: WeeklyRoleStateV1, handoff: PlayerTeamAllocationHandoffV1) {
  const ref = artifact('tts');
  current.teamstate = [{ artifact: ref, input: structuredClone(handoff.artifact), scope: structuredClone(current.scope), gameId: current.segments[0].gameId, team: current.segments[0].team, rowRef: 'synthetic:row', evidenceCutoff: null, generatedAt: clock, purpose: 'pending', finality: 'unknown' }];
  return ref;
}
function rejects(errors: string[], pattern: RegExp) { assert.match(errors.join('; '), pattern); }

test('R2-F1 original: enclosing validation rejects current state → handoff → current state', () => {
  const { handoff, current } = pair();
  handoff.evidence[0].artifact = structuredClone(current.artifact);
  rejects(validate(current, { handoff }).errors, /dependency cycle/);
});
test('R2-F1 original: same supplied state revision cannot carry a different SHA-256', () => {
  const { handoff, current } = pair();
  handoff.evidence[0].artifact = { ...current.artifact, sha256: 'b'.repeat(64) };
  rejects(validate(current, { handoff }).errors, /conflicting revision metadata|missing\/conflicting revision/);
});
for (const field of ['artifactType', 'digestProfile', 'generatedAt'] as const) test(`R2-F1: same supplied state revision cannot change ${field}`, () => {
  const { handoff, current } = pair();
  const ref: ArtifactRef = { ...current.artifact };
  if (field === 'artifactType') { ref.artifactType = 'evidence_file'; ref.digestProfile = 'raw-bytes-sha256-v1'; }
  else if (field === 'digestProfile') ref.digestProfile = 'raw-bytes-sha256-v1';
  else ref.generatedAt = '2025-12-31T00:00:00Z';
  handoff.evidence[0].artifact = ref;
  rejects(validate(current, { handoff }).errors, field === 'digestProfile' ? /type\/digest-profile mismatch|conflicting revision metadata/ : /conflicting revision metadata/);
});
test('R2-F1: supplied prior state ↔ prior handoff cycle fails enclosing validation', () => {
  const { current, context, prior, priorHandoff } = comparison();
  priorHandoff.evidence[0].artifact = structuredClone(prior.artifact);
  rejects(validate(current, context).errors, /dependency cycle/);
});
test('R2-F1: longer cross-object current/prior cycle merges all four roots', () => {
  const { current, handoff, prior, priorHandoff, context } = comparison();
  handoff.evidence[0].artifact = structuredClone(prior.artifact);
  priorHandoff.evidence[0].artifact = structuredClone(current.artifact);
  rejects(validate(current, context).errors, /dependency cycle/);
});
test('R2-F1: supplied exact Teamstate artifact can reveal a cycle', () => {
  const { current, handoff } = pair();
  const ref = teamstate(current, handoff);
  assert.equal(validate(current, { handoff }).valid, true); // attachment alone declares no upstream Teamstate edges
  rejects(validate(current, { handoff, suppliedArtifacts: [{ artifact: ref, dependencies: [structuredClone(current.artifact)] }] }).errors, /dependency cycle/);
});
test('R2-F1: conflicting supplied Teamstate revision or dependency metadata fails', () => {
  const { current, handoff } = pair();
  const ref = teamstate(current, handoff);
  rejects(validate(current, { handoff, suppliedArtifacts: [{ artifact: { ...ref, sha256: 'b'.repeat(64) }, dependencies: [] }] }).errors, /conflicting revision metadata/);
  rejects(validate(current, { handoff, suppliedArtifacts: [{ artifact: ref, dependencies: [{ ...handoff.artifact, generatedAt: '2025-12-31T00:00:00Z' }] }] }).errors, /conflicting revision metadata|missing\/conflicting revision/);
});
test('R2-F1: valid current state → handoff and current/prior comparison stay valid', () => {
  const a = pair(); assert.equal(validate(a.current, { handoff: a.handoff }).valid, true);
  const b = comparison(); assert.equal(validate(b.current, b.context).valid, true);
});
test('R2-F1: shared dependency diamond remains valid', () => {
  const { current, handoff } = pair();
  const ref = teamstate(current, handoff);
  assert.equal(validate(current, { handoff, suppliedArtifacts: [{ artifact: ref, dependencies: [structuredClone(handoff.artifact)] }] }).valid, true);
});
test('R2-F1: unsupplied external dependency remains deferred, not rejected for absent bytes', () => {
  const { current, handoff } = pair();
  const external = artifact('unprovided-evidence');
  handoff.evidence[0].artifact = external;
  assert.equal(validate(current, { handoff }).valid, true);
  const ref = teamstate(current, handoff);
  assert.equal(validate(current, { handoff, suppliedArtifacts: [{ artifact: ref, dependencies: [external] }] }).valid, true);
});
