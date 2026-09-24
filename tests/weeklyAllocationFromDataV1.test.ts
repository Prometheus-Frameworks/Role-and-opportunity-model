import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptSyntheticAllocation, adaptRetainedWeek1, readSourceCsv } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { validateAllocationHandoffV1 } from '../src/validation/weeklyRoleStateV1.ts';
import { contractContentSha256, rawByteSha256, parseJcsJson } from '../src/contracts/artifactDigestV1.ts';
import { RETAINED_WEEK1_BINDING } from '../src/adapters/retainedWeek1Binding.ts';
import { fixture, output } from './fixtures/allocationFromDataV1.ts';
const adapt = (f = fixture(), identity = output) => adaptSyntheticAllocation(f.bytes, f.binding, identity);
const rejects = (edit: (f: ReturnType<typeof fixture>) => void, match?: RegExp) => { const f = fixture(); edit(f); f.rebind(); if (match) assert.throws(() => adapt(f), match); else assert.throws(() => adapt(f)); };

test('full source population, all positions, unattributed zero, Data shares and immutable envelope retained', () => {
  const f = fixture(), r = adapt(f), all = r.handoff.teams.flatMap(t => t.rows);
  assert.equal(all.length, 6); assert.equal(all.filter(r => r.identity.status === 'unresolved').length, 1);
  assert(all.some(r => r.position === 'SAF')); assert(all.some(r => r.position === null));
  assert.equal(r.handoff.mode, 'synthetic'); assert(r.handoff.evidence.every(e => e.kind === 'fixture' || (e.kind === 'derived' && e.parents.length > 0)));
  assert.deepEqual(r.handoff.purpose, { status: 'pending', purposes: [], evidence: [] });
  assert.equal(r.handoff.finality, 'unknown'); assert.equal(r.handoff.evidenceCutoff, null); assert.equal(r.handoff.correction, 'open');
  assert.equal(r.handoff.teams[0].totals.carries.value, 6); // QB included; not RB-room denominator.
  assert.equal(r.handoff.teams[0].totals.targets.value, 5); assert.equal(r.handoff.teams[0].totals.passAttempts.value, 8);
  assert.deepEqual(r.companion.sourceEnvelope, f.candidate);
  assert.deepEqual(r.companion.sourceNativeRows[0].dataDerived, f.candidate.candidate.players[0].derived);
  assert.equal(validateAllocationHandoffV1(r.handoff).valid, true);
  const root = r.handoff.artifact, source = r.handoff.evidence[0].artifact;
  assert.equal(contractContentSha256(new TextEncoder().encode(JSON.stringify(r.handoff)), [{ artifact: root, dependencies: [source] }, { artifact: source, dependencies: [] }]), root.sha256);
  assert.equal(rawByteSha256(r.companionBytes), r.companionPin.sha256); assert.equal(r.companionBytes.length, r.companionPin.size);
  assert.deepEqual(JSON.parse(JSON.stringify(parseJcsJson(r.companionBytes))), r.companion);
  f.candidate.candidate.players[0].observed.carries = 999; assert.equal((r.companion.sourceEnvelope as any).candidate.players[0].observed.carries, 4);
  assert.equal(r.companion.verification.externalProviderAuthentication, 'not_claimed');
});
test('zero denominator remains Data unavailable, not a computed zero share', () => {
  const r = adapt(); const b = r.companion.sourceNativeRows.find(r => r.identity.team === 'BBB' && r.identity.position === 'TE')!;
  assert.deepEqual((b.dataDerived as any).carry_share_all_team_carries, { numerator: 0, denominator: 0, value: null, status: 'unavailable', reason: 'zero_or_missing_denominator' });
});
test('missing counts differ from observed zero and make population incomplete', () => {
  const r = adapt(fixture(rows => { rows[0].carries = null; }));
  assert.equal(r.handoff.teams[0].rows[0].counts.carries.status, 'missing');
  assert.equal(r.handoff.teams[0].rows[1].counts.carries.status, 'observed');
  assert.equal(r.handoff.teams[0].population.status, 'incomplete');
  assert.equal(r.handoff.teams[0].population.unallocated.carries.value, null);
});
test('unattributed positive work retained as a row, never synthetic identity or residual twice', () => {
  const r = adapt(fixture(rows => { rows[5].carries = 3; })), t = r.handoff.teams[1];
  assert.equal(t.totals.carries.value, 3); assert.equal(t.rows[2].identity.playerId, null);
  assert.equal(t.rows[2].counts.carries.value, 3); assert.equal(t.population.unallocated.carries.value, 0);
});
test('unattributed missing count remains unknown', () => {
  const r = adapt(fixture(rows => { rows[5].carries = null; })); assert.equal(r.handoff.teams[1].population.unallocated.carries.status, 'missing');
});
test('no absent-player synthesis and no advanced-evidence requirement', () => {
  const r = adapt(fixture(rows => { rows.splice(4, 1); })); assert.equal(r.handoff.teams.flatMap(t => t.rows).length, 5);
  assert(!('segments' in r.handoff)); assert(!('claims' in r.handoff));
});
test('dropped observed-zero row fails even with plausible totals/coverage counts', () => rejects(f => {
  const c = f.candidate.candidate; c.players.splice(4, 1); c.coverage.player_rows--; c.coverage.source_player_rows_in_scope--; delete c.coverage.positions.SAF;
}, /complete source player population/));
test('duplicate CSV references fail', () => rejects(f => { f.candidate.candidate.players[1].source_csv_row = 2; }, /duplicate/));
for (const [name, edit] of [
  ['wrong scope', (f: any) => { f.candidate.candidate.scope.week = 2; }],
  ['wrong source-observed team', (f: any) => { f.candidate.candidate.players[0].identity.team = 'OTHER'; }],
  ['wrong game', (f: any) => { f.candidate.candidate.players[0].identity.game_id = 'other'; }],
  ['position rewrite', (f: any) => { f.candidate.candidate.players[4].identity.position = 'S'; }],
  ['identity rewrite', (f: any) => { f.candidate.candidate.players[0].identity.player_id = '00-9999999'; }],
  ['observed count contradiction', (f: any) => { f.candidate.candidate.players[0].observed.carries++; }],
  ['reconciliation contradiction', (f: any) => { f.candidate.candidate.teams[0].reconciliation.carries.player_sum++; }],
  ['orphan team reference', (f: any) => { f.candidate.candidate.players[0].team_reference.team = 'OTHER'; }],
  ['manufactured finality', (f: any) => { f.candidate.coverage.full_week_final = true; }],
  ['fantasy input', (f: any) => { f.candidate.candidate.players[0].observed.fantasy_points = 10; }],
  ['future volume input', (f: any) => { f.candidate.candidate.players[0].derived.predicted_targets = 10; }],
] as const) test(name, () => rejects(edit));
for (const key of ['numerator', 'denominator', 'value', 'status', 'reason']) test(`Data share ${key} contradiction rejected`, () => rejects(f => { const s = f.candidate.candidate.players[0].derived.carry_share_all_team_carries; s[key] = typeof s[key] === 'number' ? s[key] + 1 : 'bogus'; }, /supplied share mismatch/));
test('carries+targets contradiction rejected', () => rejects(f => { f.candidate.candidate.players[0].derived.carries_plus_targets++; }, /carries\+targets/));
test('raw bytes tampering and missing retained dependency reject before conversion', () => {
  const f = fixture(); f.bytes.set('player.csv', new TextEncoder().encode('altered')); assert.throws(() => adapt(f), /raw-byte pin mismatch/);
  const g = fixture(); g.bytes.delete('builder.py'); assert.throws(() => adapt(g), /missing retained bytes/);
});
test('receipt/file link substitution fails even when synthetic top-level pins are rebound', () => rejects(f => { f.put('player.csv', 'changed\n'); }, /receipt dependency mismatch/));
test('embedded source receipt substitution fails', () => rejects(f => { f.candidate.candidate.source_receipt.status = 'admitted'; }, /embedded source receipt mismatch/));
test('builder dependency substitution fails', () => rejects(f => { f.candidate.fact_builder_sha256 = '1'.repeat(64); }, /builder dependency mismatch/));
test('duplicate pin and unbound dependency reject', () => {
  const f = fixture(); f.binding.pins = [...f.binding.pins, f.binding.pins[0]]; assert.throws(() => adapt(f), /duplicate pins/);
  const g = fixture(); g.binding.pins = g.binding.pins.filter(p => p.path !== 'builder.py'); assert.throws(() => adapt(g), /unbound dependency/);
});
test('caller-controlled synthetic pins cannot produce source evidence through retained entry', () => {
  const f = fixture(); assert.throws(() => adaptRetainedWeek1(f.bytes, output), /missing retained bytes/);
});
test('exact generation chronology preserves fractions and never supplies football cutoff', () => {
  const f = fixture(); assert.throws(() => adapt(f, { ...output, generatedAt: '2026-09-16T19:22:16.255940Z' }), /artifact chronology/);
  assert.equal(adapt(f, { ...output, generatedAt: f.binding.candidateGeneratedAt }).handoff.evidenceCutoff, null);
  f.binding.candidateGeneratedAt = '2026-09-16T15:00:59Z'; assert.throws(() => adapt(f), /chronology/);
});
test('source receptions cannot exceed observed targets', () => assert.throws(() => adapt(fixture(rows => { rows[0].receptions = 3; })), /receptions exceed targets/));
test('strict CSV supports quoting and embedded newline, rejects malformed/duplicate headers', () => {
  const bytes = (s: string) => new TextEncoder().encode(s);
  assert.deepEqual(readSourceCsv(bytes('a,b\r\n"x,y","one\n""two"""\r\n')), [{ a: 'x,y', b: 'one\n"two"' }]);
  for (const s of ['a,a\nx,y\n', 'a,b\nx\n', 'a,b\n"x,y\n', 'a,b\n"x"z,y\n']) assert.throws(() => readSourceCsv(bytes(s)));
});

test('retained trusted binding cannot be changed through exported JS objects', () => {
  assert(Object.isFrozen(RETAINED_WEEK1_BINDING)); assert(Object.isFrozen(RETAINED_WEEK1_BINDING.pins[0]));
  assert.throws(() => { (RETAINED_WEEK1_BINDING.pins[0] as any).sha256 = '0'.repeat(64); });
});
test('same native player/game on two rows rejected by contract validation', () => {
  assert.throws(() => adapt(fixture(rows => { rows[1].id = rows[0].id; })), /duplicate player\/game/);
});
test('unresolved native identity and supplied nonstandard position remain distinct', () => {
  const r = adapt(fixture(rows => { rows[5].id = 'unresolved-token'; rows[5].position = 'OTHER'; }));
  const row = r.handoff.teams[1].rows[2]; assert.equal(row.identity.status, 'unresolved'); assert.equal(row.position, 'OTHER');
  assert.equal(r.companion.sourceNativeRows.at(-1)!.identity.player_id, 'unresolved-token');
});
test('honest Data conflict retains counts and conflicting unquantified residual; it is not repaired', () => {
  const f = fixture(), c = f.candidate.candidate, t = c.teams[0];
  t.observed.carries = 7; t.reconciliation.carries = { player_sum: 6, team_value: 7, status: 'conflict' };
  for (const p of c.players.filter((p: any) => p.identity.team === 'AAA')) p.derived.carry_share_all_team_carries = { numerator: p.observed.carries, denominator: 7, value: null, status: 'unavailable', reason: 'conflict' };
  const raw = readSourceCsv(f.bytes.get('team.csv')!); raw[0].carries = '7';
  const h = Object.keys(raw[0]); f.put('team.csv', [h.join(','), ...raw.map(r => h.map(k => r[k]).join(','))].join('\n') + '\n');
  c.source_receipt.sources.team = { ...c.source_receipt.sources.team, ...f.rawPin('team.csv') };
  f.put('source.json', c.source_receipt); f.candidate.source_receipt_sha256 = f.rawPin('source.json').sha256; f.rebind();
  const r = adapt(f), team = r.handoff.teams[0];
  assert.equal(team.totals.carries.value, 7); assert.equal(team.rows[0].counts.carries.value, 4);
  assert.equal(team.population.reconciliation.carries, 'conflicted'); assert.equal(team.population.status, 'incomplete');
  assert.deepEqual(team.population.unallocated.carries, { value: null, status: 'conflicted', reason: 'Data_population_conflicted', evidence: ['population:0'] });
});

test('partial schedule coverage remains partial and preserves expected absent games', () => {
  const f = fixture(), second = '2026_01_CCC_DDD';
  f.put('games.csv', new TextDecoder().decode(f.bytes.get('games.csv')) + `${second},2026,REG,1,DDD,CCC\n`);
  const receipt = { ...f.candidate.schedule_receipt, ...f.rawPin('games.csv') }; delete receipt.source_support_commit;
  f.put('schedule.json', receipt); f.candidate.schedule_receipt = { ...receipt, source_support_commit: f.binding.sourceSupportCommit };
  f.binding.games = [...f.binding.games, second];
  f.candidate.coverage.scheduled_game_ids.push(second); f.candidate.coverage.missing_game_ids.push(second); f.candidate.coverage.schedule_coverage = 'partial_or_conflicting'; f.rebind();
  const r = adapt(f); assert.equal(r.handoff.coverage, 'partial'); assert.equal(r.handoff.games.length, 1); assert.equal(r.handoff.expectedGameIds.length, 2);
});
