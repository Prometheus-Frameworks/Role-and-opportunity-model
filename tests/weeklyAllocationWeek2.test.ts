import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptReviewedAllocation, adaptSyntheticAllocation, readSourceCsv, type ReviewedAllocationScope } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { RETAINED_WEEK1_BINDING } from '../src/adapters/retainedWeek1Binding.ts';
import { RETAINED_WEEK2_BINDING } from '../src/adapters/retainedWeek2Binding.ts';
import { fixture, output } from './fixtures/allocationFromDataV1.ts';
const selection: ReviewedAllocationScope = { season: 2026, seasonType: 'REG', week: 2 };

/** Re-scope fictional rows only. Rebind fixture source receipts so checks reach semantic gates. */
function week2() {
  const f = fixture();
  const walk = (v: any): any => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'week' ? typeof x === 'string' ? '2' : 2 : walk(x)]))
    : typeof v === 'string' ? v.replaceAll('2026_01_', '2026_02_') : v;
  for (const p of ['player.csv', 'team.csv', 'games.csv']) {
    const rows = readSourceCsv(f.bytes.get(p)!).map(r => ({ ...walk(r), week: '2' }));
    const keys = Object.keys(rows[0]);
    f.put(p, [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n') + '\n');
  }
  Object.assign(f.candidate, walk(f.candidate));
  f.binding.games = f.binding.games.map(g => g.replace('2026_01_', '2026_02_'));
  for (const kind of ['player', 'team']) Object.assign(f.candidate.candidate.source_receipt.sources[kind], f.rawPin(kind + '.csv'));
  f.put('source.json', f.candidate.candidate.source_receipt);
  f.candidate.source_receipt_sha256 = f.rawPin('source.json').sha256;
  Object.assign(f.candidate.schedule_receipt, f.rawPin('games.csv'));
  const schedule = { ...f.candidate.schedule_receipt }; delete schedule.source_support_commit;
  f.put('schedule.json', schedule);
  f.rebind();
  return f;
}
const adapt = (f = week2()) => adaptSyntheticAllocation(f.bytes, f.binding, output, selection);

test('Week 2 fixture retains counts, exact Data objects, native OTHER and unresolved blank semantics', () => {
  const f = week2(), r = adapt(f);
  assert.deepEqual(r.handoff.scope, selection); assert.equal(r.handoff.mode, 'synthetic');
  assert.equal(r.handoff.teams.flatMap(t => t.rows).length, 6);
  assert(r.handoff.teams.flatMap(t => t.rows).some(r => r.position === 'SAF'));
  assert(r.handoff.teams.flatMap(t => t.rows).some(r => r.position === null && r.identity.playerId === null));
  assert.deepEqual(r.companion.sourceEnvelope, f.candidate);
  assert.deepEqual(r.companion.sourceNativeRows[0].dataDerived, f.candidate.candidate.players[0].derived);
  assert.deepEqual(r.handoff.purpose, { status: 'pending', purposes: [], evidence: [] });
  assert.equal(r.handoff.evidenceCutoff, null); assert.equal(r.handoff.correction, 'open');
  assert.equal(r.handoff.finality, 'unknown'); assert.deepEqual(adapt(f).companionBytes, r.companionBytes);
});
test('unreviewed scope or injected source binding cannot enter source lane', () => {
  for (const scope of [{ ...selection, week: 3 }, { ...selection, season: 2025 }, { ...selection, seasonType: 'POST' }, { ...selection, pins: [] }]) {
    assert.throws(() => adaptReviewedAllocation(new Map(), output, scope as any), /unreviewed scope/);
  }
  assert.throws(() => adaptReviewedAllocation(week2().bytes, output, selection), /missing retained bytes/);
});
test('both retained bindings are frozen and disjoint candidate identities', () => {
  assert.equal(RETAINED_WEEK1_BINDING.pins.length, 18); assert.equal(RETAINED_WEEK2_BINDING.pins.length, 18);
  assert.notEqual(String(RETAINED_WEEK1_BINDING.paths.candidate), String(RETAINED_WEEK2_BINDING.paths.candidate));
  assert(Object.isFrozen(RETAINED_WEEK2_BINDING.pins[0]));
  assert.throws(() => { (RETAINED_WEEK2_BINDING as any).candidateGeneratedAt = output.generatedAt; });
});
test('wrong week rejects both directions, including receipt-only substitution', () => {
  const f = fixture(); assert.throws(() => adapt(f), /scope/);
  const g = week2(); assert.throws(() => adaptSyntheticAllocation(g.bytes, g.binding, output), /scope/);
  g.candidate.candidate.source_receipt.requested_scope.week = 1;
  g.put('source.json', g.candidate.candidate.source_receipt); g.candidate.source_receipt_sha256 = g.rawPin('source.json').sha256; g.rebind();
  assert.throws(() => adapt(g), /receipt scope/);
});
for (const key of ['numerator', 'denominator', 'value', 'status', 'reason']) test(`Week 2 rejects changed Data share ${key}`, () => {
  const f = week2(), s = f.candidate.candidate.players[0].derived.target_share_credited_team_targets;
  s[key] = typeof s[key] === 'number' ? s[key] + 1 : 'changed'; f.rebind();
  assert.throws(() => adapt(f), /supplied share mismatch/);
});
test('Week 2 rejects altered carries_plus_targets', () => {
  const f = week2(); f.candidate.candidate.players[0].derived.carries_plus_targets++; f.rebind();
  assert.throws(() => adapt(f), /carries\+targets/);
});
for (const nested of [false, true]) for (const change of ['admitted', 'published', 'flag']) test(`Week 2 rejects ${nested ? 'nested' : 'outer'} ${change}`, () => {
  const f = week2(), c = nested ? f.candidate.candidate : f.candidate;
  if (change === 'flag') c.consumer_admitted = true; else c.status = change;
  f.rebind(); assert.throws(() => adapt(f), /lifecycle\/admission/);
});
test('invalid and duplicate support pins rejected; extra injected bytes ignored', () => {
  const f = week2(); f.binding.pins = [...f.binding.pins, f.binding.pins[0]];
  assert.throws(() => adapt(f), /duplicate pins/);
  for (const edit of [{ size: 0 }, { path: ' ' }, { sha256: 'invalid' }]) {
    const g = week2(); g.binding.pins = [{ ...g.binding.pins[0], ...edit }, ...g.binding.pins.slice(1)];
    assert.throws(() => adapt(g), /invalid support pin/);
  }
  const g = week2(), expected = adapt(g); g.bytes.set('unbound.json', new TextEncoder().encode('untrusted'));
  assert.deepEqual(adapt(g), expected);
});
test('wrong candidate hash/size, changed and missing receipt rejected', () => {
  for (const edit of [{ size: 1 }, { sha256: '0'.repeat(64) }]) {
    const f = week2(); f.binding.pins = f.binding.pins.map(p => p.path === 'candidate.json' ? { ...p, ...edit } : p);
    assert.throws(() => adapt(f), /raw-byte pin mismatch/);
  }
  const f = week2(); f.bytes.delete('source.json'); assert.throws(() => adapt(f), /missing retained bytes/);
  const g = week2(); g.put('source.json', {}); assert.throws(() => adapt(g), /raw-byte pin mismatch/);
});
function witnessed() {
  const f = week2(), path = 'build-receipt.json';
  f.binding.generationEvidence = path + '#build_completed_at';
  f.binding.generationWitness = { path, dataBase: 'b'.repeat(40) };
  const witness = { base: 'b'.repeat(40), support_commit: f.binding.sourceSupportCommit,
    build_started_at: f.binding.candidateGeneratedAt, build_completed_at: f.binding.candidateGeneratedAt,
    result: { sha256: f.rawPin('candidate.json').sha256, status: 'candidate_revision_written' },
    source_admission: false, rop_purpose_acceptance: false, evidence_cutoff: null, finality: 'unknown' };
  f.put(path, witness); f.rebind(); return { f, witness, path };
}
test('exact generation witness bound and checked, preserving sub-millisecond chronology', () => {
  const { f } = witnessed(); assert.equal(adapt(f).handoff.evidenceCutoff, null);
  assert.throws(() => adaptSyntheticAllocation(f.bytes, f.binding, { ...output, generatedAt: '2026-09-16T19:22:16.255940Z' }, selection), /artifact chronology/);
  for (const field of ['base', 'support_commit', 'build_completed_at', 'build_started_at', 'source_admission']) {
    const { f, witness, path } = witnessed();
    (witness as any)[field] = field.includes('_at') ? '2026-09-17T00:00:00Z' : field === 'source_admission' ? true : 'wrong';
    f.put(path, witness); f.rebind(); assert.throws(() => adapt(f), /generation witness/);
  }
  const { f: g, witness, path } = witnessed(); witness.result.sha256 = '0'.repeat(64); g.put(path, witness); g.rebind();
  assert.throws(() => adapt(g), /generation witness candidate/);
});
