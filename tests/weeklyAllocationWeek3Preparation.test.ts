import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptReviewedAllocation, adaptSyntheticAllocation, readSourceCsv, type SyntheticAllocationScope } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { fixture, output } from './fixtures/allocationFromDataV1.ts';
const selection: SyntheticAllocationScope = { season: 2026, seasonType: 'REG', week: 3 };

/** Fictional AAA/BBB players only. This does not rebind any retained NFL evidence. */
function week3() {
  const f = fixture();
  const walk = (v: any): any => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'week' ? typeof x === 'string' ? '3' : 3 : walk(x)]))
    : typeof v === 'string' ? v.replaceAll('2026_01_', '2026_03_') : v;
  for (const p of ['player.csv', 'team.csv', 'games.csv']) {
    const rows = readSourceCsv(f.bytes.get(p)!).map(r => ({ ...walk(r), week: '3' }));
    const keys = Object.keys(rows[0]);
    f.put(p, [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n') + '\n');
  }
  Object.assign(f.candidate, walk(f.candidate));
  f.binding.games = f.binding.games.map(g => g.replace('2026_01_', '2026_03_'));
  for (const kind of ['player', 'team']) Object.assign(f.candidate.candidate.source_receipt.sources[kind], f.rawPin(kind + '.csv'));
  f.put('source.json', f.candidate.candidate.source_receipt);
  f.candidate.source_receipt_sha256 = f.rawPin('source.json').sha256;
  Object.assign(f.candidate.schedule_receipt, f.rawPin('games.csv'));
  const schedule = { ...f.candidate.schedule_receipt }; delete schedule.source_support_commit;
  f.put('schedule.json', schedule); f.rebind(); return f;
}
const adapt = (f = week3()) => adaptSyntheticAllocation(f.bytes, f.binding, output, selection);

/** These two real-format IDs exercise sorting only; observations remain fictional AAA/BBB rows. */
function week3PrefixSchedule() {
  const f = week3(), observed = '2026_03_AAA_BBB';
  const prefixes = ['2026_03_LA_DEN', '2026_03_LAC_BUF'];
  f.put('games.csv', 'game_id,season,game_type,week,home_team,away_team\n' +
    '2026_03_LA_DEN,2026,REG,3,DEN,LA\n' +
    '2026_03_AAA_BBB,2026,REG,3,BBB,AAA\n' +
    '2026_03_LAC_BUF,2026,REG,3,BUF,LAC\n');
  f.binding.games = [observed, ...prefixes];
  f.candidate.coverage.scheduled_game_ids = [...f.binding.games].sort();
  f.candidate.coverage.missing_game_ids = [...prefixes].sort();
  f.candidate.coverage.schedule_coverage = 'partial_or_conflicting';
  const rebindSchedule = () => {
    Object.assign(f.candidate.schedule_receipt, f.rawPin('games.csv'));
    const receipt = { ...f.candidate.schedule_receipt }; delete receipt.source_support_commit;
    f.put('schedule.json', receipt); f.rebind();
  };
  rebindSchedule(); return { f, observed, prefixes, rebindSchedule };
}

test('Week 3 LA_DEN/LAC_BUF schedule IDs use consistent code-unit ordering', () => {
  const baseline = adapt(), { f, observed } = week3PrefixSchedule(), r = adapt(f);
  assert.deepEqual(r.handoff.expectedGameIds, f.binding.games);
  assert.deepEqual(r.handoff.games.map(g => g.gameId), [observed]);
  assert.equal(r.handoff.coverage, 'partial');
  assert.deepEqual(r.handoff.teams, baseline.handoff.teams);
  assert.deepEqual(r.companion.sourceNativeRows, baseline.companion.sourceNativeRows);
  assert.deepEqual(r.handoff.purpose, { status: 'pending', purposes: [], evidence: [] });
  assert.equal(r.handoff.finality, 'unknown'); assert.equal(r.handoff.correction, 'open');
  assert.equal(r.handoff.evidenceCutoff, null);
  assert.equal(r.companion.binding.candidateGeneratedAt, baseline.companion.binding.candidateGeneratedAt);
});

test('Week 3 prefix schedule still rejects changed game membership', () => {
  const { f, observed } = week3PrefixSchedule();
  f.binding.games = [observed, '2026_03_LA_DEN', '2026_03_LAC_SEA'];
  assert.throws(() => adapt(f), /schedule game set/);
});

test('Week 3 prefix schedule still rejects duplicate game IDs', () => {
  const { f, rebindSchedule } = week3PrefixSchedule();
  const csv = new TextDecoder().decode(f.bytes.get('games.csv'));
  f.put('games.csv', csv + '2026_03_LAC_BUF,2026,REG,3,BUF,LAC\n');
  rebindSchedule();
  assert.throws(() => adapt(f), /schedule game set/);
});

test('Week 3 fixture is synthetic and pending, with complete companion and unchanged definitions', () => {
  const f = week3(), r = adapt(f);
  assert.equal(r.handoff.mode, 'synthetic'); assert.deepEqual(r.handoff.scope, selection);
  assert.deepEqual(r.handoff.purpose, { status: 'pending', purposes: [], evidence: [] });
  assert.equal(r.handoff.finality, 'unknown'); assert.equal(r.handoff.correction, 'open');
  assert.equal(r.handoff.evidenceCutoff, null);
  assert.equal(r.companion.verification.basis, 'synthetic_pins');
  assert.equal(r.companion.verification.sourceAdmission, 'none');
  assert.deepEqual(r.companion.sourceEnvelope, f.candidate);
  assert.deepEqual(r.companion.sourceNativeRows[0].dataDerived, f.candidate.candidate.players[0].derived);
  assert(r.handoff.teams.flatMap(t => t.rows).some(row => row.position === null && row.identity.playerId === null));
  assert(r.handoff.teams.flatMap(t => t.rows).some(row => row.position === 'SAF'));
  assert.deepEqual(adapt(f).companionBytes, r.companionBytes);
});
test('Week 3 real-source entry is closed to the retained binding and rejects caller hints', () => {
  assert.throws(() => adaptReviewedAllocation(week3().bytes, output, selection), /missing retained bytes/);
  for (const scope of [{ ...selection, pins: [] }, { ...selection, accepted: true }]) {
    assert.throws(() => adaptReviewedAllocation(week3().bytes, output, scope as any), /unreviewed scope/);
  }
});
test('extra selectors, wrong season/type and future weeks remain rejected', () => {
  for (const scope of [{ ...selection, week: 4 }, { ...selection, season: 2025 }, { ...selection, seasonType: 'POST' }, { ...selection, pins: [] }]) {
    assert.throws(() => adaptSyntheticAllocation(week3().bytes, week3().binding, output, scope as any), /unsupported synthetic scope/);
  }
});
test('Week 3 fixture cannot substitute into Week 1/2 scopes', () => {
  const f = week3();
  for (const week of [1, 2] as const) assert.throws(() => adaptSyntheticAllocation(f.bytes, f.binding, output, { ...selection, week }), /scope/);
});
for (const key of ['numerator', 'denominator', 'value', 'status', 'reason']) test(`Week 3 preserves Data share ${key} validation`, () => {
  const f = week3(), share = f.candidate.candidate.players[0].derived.target_share_credited_team_targets;
  share[key] = typeof share[key] === 'number' ? share[key] + 1 : 'changed'; f.rebind();
  assert.throws(() => adapt(f), /supplied share mismatch/);
});
for (const nested of [false, true]) test(`Week 3 rejects ${nested ? 'nested' : 'outer'} admitted lifecycle`, () => {
  const f = week3(); (nested ? f.candidate.candidate : f.candidate).consumer_admitted = true; f.rebind();
  assert.throws(() => adapt(f), /lifecycle\/admission/);
});
test('missing bytes, hash drift and unavailable generation clock never pass', () => {
  const missing = week3(); missing.bytes.delete('source.json');
  assert.throws(() => adapt(missing), /missing retained bytes/);
  const drift = week3(); drift.put('source.json', {});
  assert.throws(() => adapt(drift), /raw-byte pin mismatch/);
  const clock = week3(); (clock.binding as any).candidateGeneratedAt = null;
  assert.throws(() => adapt(clock));
});
test('Week 3 rejects an incomplete retained player population even when coverage counters are rewritten', () => {
  const f = week3(), c = f.candidate.candidate;
  c.players.pop();
  c.coverage.player_rows--;
  c.coverage.source_player_rows_in_scope--;
  f.rebind();
  assert.throws(() => adapt(f), /complete source player population required/);
});
test('a declared generation witness must exist and bind the same candidate', () => {
  const f = week3(); f.binding.generationWitness = { path: 'absent-build-receipt.json', dataBase: 'b'.repeat(40) };
  f.binding.generationEvidence = 'absent-build-receipt.json#build_completed_at';
  assert.throws(() => adapt(f), /unbound dependency/);
});
