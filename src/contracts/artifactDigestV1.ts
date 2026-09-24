import { createHash } from 'node:crypto';
import type { ArtifactRef } from './weeklyRoleStateV1.ts';

export const CONTENT_PROFILE = 'tiber-jcs-root-sha256-v1' as const;
export const RAW_PROFILE = 'raw-bytes-sha256-v1' as const;
export type ArtifactNode = { artifact: ArtifactRef; dependencies: ArtifactRef[] };
export const artifactKey = (ref: ArtifactRef): string => JSON.stringify([ref.artifactId, ref.revision]);

export function validUnicode(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { const next = value.charCodeAt(++i); if (!(next >= 0xdc00 && next <= 0xdfff)) return false; }
    else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}

/** RFC 8785 primitive serialization and UTF-16 sorting; plain finite JSON only. */
export function canonicalizeJcs(value: unknown): string {
  const active = new Set<object>();
  const encode = (v: unknown): string => {
    if (v === null) return 'null';
    if (typeof v === 'string') { if (!validUnicode(v)) throw Error('JCS: lone surrogate'); return JSON.stringify(v); }
    if (typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number') { if (!Number.isFinite(v)) throw Error('JCS: non-finite number'); return JSON.stringify(v); }
    if (typeof v !== 'object') throw Error('JCS: non-JSON value');
    if (active.has(v)) throw Error('JCS: cyclic object');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw Error('JCS: non-plain object');
    active.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Reflect.ownKeys(v).some(k => typeof k !== 'string') || Object.values(descriptors).some(d => 'get' in d || 'set' in d)) throw Error('JCS: symbol/accessor property');
    let encoded: string;
    if (Array.isArray(v)) {
      if (Object.keys(descriptors).length !== v.length + 1 || Array.from({ length: v.length }, (_, i) => !Object.hasOwn(descriptors, String(i))).some(Boolean)) throw Error('JCS: sparse/extended array');
      encoded = '[' + Array.from({ length: v.length }, (_, i) => encode(descriptors[String(i)].value)).join(',') + ']';
    } else {
      if (Object.values(descriptors).some(d => !d.enumerable)) throw Error('JCS: hidden property');
      // Emit keys directly: rebuilding an object would reorder integer-index keys.
      encoded = '{' + Object.keys(descriptors).sort().map(k => encode(k) + ':' + encode(descriptors[k].value)).join(',') + '}';
    }
    active.delete(v); return encoded;
  };
  return encode(value);
}

/** Strict UTF-8 JSON decoder. Detect duplicate decoded keys before a parser can erase them. */
export function parseJcsJson(bytes: Uint8Array): unknown {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  let at = 0;
  const fail = (): never => { throw Error(`JCS JSON: invalid/duplicate input at ${at}`); };
  const whitespace = () => { while (/[\x20\t\r\n]/.test(text[at] ?? '') && at < text.length) at++; };
  const string = (): string => {
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '"') {
        const value: unknown = JSON.parse(text.slice(start, at));
        if (typeof value !== 'string' || !validUnicode(value)) fail();
        return value as string;
      }
      if (c === '\\') at++;
    }
    return fail();
  };
  const value = (): unknown => {
    whitespace(); const c = text[at];
    if (c === '"') return string();
    if (c === '{') {
      at++; whitespace(); const obj = Object.create(null) as Record<string, unknown>, keys = new Set<string>();
      if (text[at] === '}') { at++; return obj; }
      while (true) {
        whitespace(); if (text[at] !== '"') fail(); const key = string();
        if (keys.has(key)) fail(); keys.add(key); whitespace(); if (text[at++] !== ':') fail();
        obj[key] = value(); whitespace(); const end = text[at++];
        if (end === '}') return obj; if (end !== ',') fail();
      }
    }
    if (c === '[') {
      at++; whitespace(); const arr: unknown[] = [];
      if (text[at] === ']') { at++; return arr; }
      while (true) { arr.push(value()); whitespace(); const end = text[at++]; if (end === ']') return arr; if (end !== ',') fail(); }
    }
    for (const [token, v] of [['true', true], ['false', false], ['null', null]] as const) if (text.startsWith(token, at)) { at += token.length; return v; }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(at));
    if (!match) return fail(); at += match[0].length;
    const n = Number(match[0]); if (!Number.isFinite(n)) return fail(); return n;
  };
  const decoded = value(); whitespace(); if (at !== text.length) fail();
  canonicalizeJcs(decoded); return decoded;
}

/** UTC clocks with arbitrary fractional precision; no millisecond truncation. Validate syntax first. */
export function compareArtifactClocks(a: string, b: string): number {
  const as = a.slice(0, 19), bs = b.slice(0, 19);
  const seconds = as === bs ? 0 : as < bs ? -1 : 1;
  if (seconds) return seconds;
  const af = a[19] === '.' ? a.slice(20, -1) : '', bf = b[19] === '.' ? b.slice(20, -1) : '';
  const length = Math.max(af.length, bf.length), av = af.padEnd(length, '0'), bv = bf.padEnd(length, '0');
  return av === bv ? 0 : av < bv ? -1 : 1;
}

export function validateArtifactReference(ref: ArtifactRef): string[] {
  const errors: string[] = [];
  const content = ref.artifactType === 'player_team_allocation_handoff_v1' || ref.artifactType === 'weekly_role_state_v1';
  if (!['player_team_allocation_handoff_v1', 'weekly_role_state_v1', 'teamstate_context', 'evidence_file'].includes(ref.artifactType) || ref.digestProfile !== (content ? CONTENT_PROFILE : RAW_PROFILE)) errors.push('artifact: type/digest-profile mismatch');
  if (typeof ref.artifactId !== 'string' || !ref.artifactId.trim() || typeof ref.revision !== 'string' || !ref.revision.trim() || !/^[a-f0-9]{64}$/.test(ref.sha256)) errors.push('artifact: invalid identity/hash');
  if (typeof ref.generatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(ref.generatedAt) || !Number.isFinite(Date.parse(ref.generatedAt)) || new Date(ref.generatedAt).toISOString().slice(0, 19) !== ref.generatedAt.slice(0, 19)) errors.push('artifact: invalid generation clock');
  return errors;
}

/** Validates a closed declared graph. Byte authentication/completeness against external artifacts is separate. */
export function validateArtifactGraph(nodes: ArtifactNode[]): string[] {
  const errors: string[] = [], map = new Map<string, ArtifactNode>();
  for (const node of nodes) {
    errors.push(...validateArtifactReference(node.artifact));
    const key = artifactKey(node.artifact);
    if (map.has(key)) errors.push('artifact graph: duplicate revision node'); map.set(key, node);
  }
  for (const node of nodes) {
    const seen = new Set<string>();
    for (const dep of node.dependencies) {
      errors.push(...validateArtifactReference(dep));
      const key = artifactKey(dep), target = map.get(key);
      if (seen.has(key)) errors.push('artifact graph: duplicate dependency'); seen.add(key);
      if (key === artifactKey(node.artifact)) errors.push('artifact graph: same-revision self-reference');
      if (!target || canonicalizeJcs(target.artifact) !== canonicalizeJcs(dep)) errors.push('artifact graph: missing/conflicting revision');
      if (compareArtifactClocks(dep.generatedAt, node.artifact.generatedAt) > 0) errors.push('artifact graph: dependency generated after dependent');
    }
  }
  const active = new Set<string>(), done = new Set<string>();
  const visit = (key: string) => {
    if (active.has(key)) { errors.push('artifact graph: dependency cycle'); return; }
    if (done.has(key)) return; active.add(key);
    for (const dep of map.get(key)?.dependencies ?? []) visit(artifactKey(dep));
    active.delete(key); done.add(key);
  };
  for (const key of map.keys()) visit(key);
  return errors;
}

/** Collects typed references without dropping nested dependency hashes. */
export function contractReferences(value: unknown): ArtifactRef[] {
  const refs: ArtifactRef[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (!Array.isArray(v) && Object.hasOwn(v, 'artifactId') && Object.hasOwn(v, 'digestProfile')) { refs.push(v as ArtifactRef); return; }
    Object.values(v).forEach(walk);
  };
  walk(value); return refs;
}

export function rawByteSha256(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }

/** Injected bytes only. No file/network adapter, source admission, or role builder. */
export function contractContentSha256(bytes: Uint8Array, graph: ArtifactNode[]): string {
  const value = parseJcsJson(bytes) as { artifact: ArtifactRef; contractVersion: string; generatedAt: string };
  if (!value || !value.artifact || !['weekly_role_state_v1', 'player_team_allocation_handoff_v1'].includes(value.contractVersion) || value.artifact.artifactType !== value.contractVersion || value.artifact.digestProfile !== CONTENT_PROFILE || value.generatedAt !== value.artifact.generatedAt) throw Error('content digest: unsupported contract header');
  const errors = validateArtifactGraph(graph); if (errors.length) throw Error(errors.join('; '));
  const root = graph.find(n => artifactKey(n.artifact) === artifactKey(value.artifact));
  if (!root || canonicalizeJcs(root.artifact) !== canonicalizeJcs(value.artifact)) throw Error('content digest: missing/conflicting root');
  const deps = contractReferences(Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'artifact')));
  const actual = new Map<string, ArtifactRef>();
  for (const ref of deps) {
    const key = artifactKey(ref);
    if (actual.has(key) && canonicalizeJcs(actual.get(key)) !== canonicalizeJcs(ref)) throw Error('content digest: conflicting nested revision');
    actual.set(key, ref);
  }
  if (actual.size !== root.dependencies.length || root.dependencies.some(ref => canonicalizeJcs(actual.get(artifactKey(ref))) !== canonicalizeJcs(ref))) throw Error('content digest: declared dependencies differ from content');
  const projected = { ...value, artifact: { ...value.artifact } };
  delete (projected.artifact as Partial<ArtifactRef>).sha256;
  return rawByteSha256(new TextEncoder().encode(canonicalizeJcs(projected)));
}
