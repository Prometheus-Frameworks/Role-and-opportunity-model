import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptSyntheticAllocation, readSourceCsv } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { rawByteSha256, contractContentSha256, contractReferences, artifactKey } from '../src/contracts/artifactDigestV1.ts';
import { buildWeeklyRoleStateV1, type BuildInput } from '../src/builders/weeklyRoleStateV1.ts';
import { validateWeeklyRoleStateV1 } from '../src/validation/weeklyRoleStateV1.ts';
import { fixture, output } from './fixtures/allocationFromDataV1.ts';

function setup(edit?: Parameters<typeof fixture>[0]) {
  const f = fixture(edit), a = adaptSyntheticAllocation(f.bytes, f.binding, output);
  const input: BuildInput = { handoff: a.handoff, companionBytes: a.companionBytes, companionPin: a.companionPin, subject: { namespace: 'nflverse:gsis', playerId: '00-0000001' }, artifact: { artifactId: 'synthetic:role-state', revision: '1', generatedAt: '2026-09-24T12:00:01Z' } };
  return { f, a, input };
}
const state = (i: BuildInput) => buildWeeklyRoleStateV1(i).state;
const denies = (change: (i: BuildInput) => void, match: RegExp) => { const { input } = setup(); change(input); assert.throws(() => state(input), match); };

test('RB, WR, TE, QB branches use actual Data shares and preserve evidence/readiness', () => {
  const { input, a } = setup();
  for (const [id, pos] of [['00-0000001','RB'],['00-0000002','WR'],['00-0000004','TE'],['00-0000003','QB']] as const) {
    input.subject.playerId = id; input.artifact.artifactId = `synthetic:${pos}`;
    const s = state(input), seg = s.segments[0]; assert.equal(seg.sourcePosition, pos);
    assert.equal(seg.branch.position, pos); assert.equal(s.readiness.evidence, 'fixture'); assert.equal(s.readiness.purpose, 'pending');
    assert.equal(s.readiness.finality, 'unknown'); assert.equal(s.readiness.correction, 'open'); assert.equal(s.evidenceCutoff, null);
    assert.deepEqual(seg.observations, a.handoff.teams.flatMap(t => t.rows).find(r => r.identity.playerId === id)!.counts);
    assert.deepEqual(validateWeeklyRoleStateV1(s, { handoff: a.handoff }), { valid: true, errors: [] });
    assert(!('primaryRole' in s)); assert(!('score' in s)); assert.equal(s.consumerActivation,'none');
  }
});

function resealCompanion(i: BuildInput, mutate: (companion: any) => void) {
  const companion = JSON.parse(new TextDecoder().decode(i.companionBytes)); mutate(companion);
  i.companionBytes = new TextEncoder().encode(JSON.stringify(companion));
  i.companionPin = { digestProfile: 'raw-bytes-sha256-v1', size: i.companionBytes.length, sha256: rawByteSha256(i.companionBytes) };
}
function balanced(edit?: Parameters<typeof fixture>[0]) {
  return setup(rows => { rows[4].position = 'RB'; rows[4].team = 'AAA'; rows[4].carries = 3;
    rows[5].id = '00-0000006'; rows[5].position = 'S'; edit?.(rows); });
}
test('zero is observed and yields a documented negative claim, distinct from missing', () => {
  const { input } = setup(); input.subject.playerId = '00-0000004';
  const s = state(input), seg = s.segments[0]; assert.equal(seg.observations.carries.value, 0);
  assert.equal(seg.observations.carries.status, 'observed');
  assert.equal(seg.claims.find(c => c.id === 'recorded_rushing_work')!.status, 'not_supported');
  assert.equal(seg.branch.carryShare.value, null); assert.equal(seg.branch.carryShare.status, 'zero_denominator');
  assert.equal(s.readiness.observations, 'available');
});
test('missing source observation remains null, incomplete and insufficient', () => {
  const { input } = setup(rows => { rows[0].carries = null; });
  const s = state(input), seg = s.segments[0]; assert.equal(seg.observations.carries.value, null);
  assert.equal(seg.branch.carryShare.status, 'ineligible'); assert.equal(seg.branch.carryShare.value, null);
  assert.equal(seg.claims.find(c => c.id === 'recorded_rushing_work')!.status, 'insufficient');
  assert.equal(s.readiness.population, 'incomplete'); assert.equal(s.readiness.observations, 'partial');
  assert(s.missingEvidence.includes('player.csv:2.carries'));
});
test('absent subject has no segments, does not turn missing work into zero, and has unavailable evidence', () => {
  const { input } = setup(); input.subject = { namespace: 'nflverse:gsis', playerId: null };
  const s = state(input); assert.equal(s.presence, 'absent'); assert.deepEqual(s.segments, []);
  assert.equal(s.readiness.identity, 'unresolved'); assert.equal(s.readiness.observations, 'absent');
  assert.equal(s.readiness.evidence, 'unavailable'); assert(s.missingEvidence.includes('player_not_observed'));
  assert.throws(() => { input.subject.playerId = '00-9999999'; state(input); }, /absent resolved identity/);
});
test('unresolved source row is retained in handoff but cannot acquire absent Data-owned shares', () => {
  const { input } = setup(rows => { rows[5].position = 'RB'; }); input.subject = { namespace: 'nflverse:gsis', playerId: null, rowId: 'player.csv:7' };
  assert(input.handoff.teams.flatMap(t => t.rows).some(r => r.rowId === 'player.csv:7' && r.identity.status === 'unresolved'));
  assert.throws(() => state(input), /Data-owned share object required/);
});
test('Data-owned carry and target shares use supplied exact value and all-team denominators', () => {
  const { input, a } = setup(), s = state(input), b = s.segments[0].branch;
  assert.equal(b.position, 'RB'); if (b.position !== 'RB') return;
  assert.equal(b.carryShare.denominator, 6); assert.equal(b.targetShare.denominator, 5);
  assert.equal(b.carryShare.value, (a.companion.sourceNativeRows[0].dataDerived as any).carry_share_all_team_carries.value);
  assert.equal(b.targetShare.value, (a.companion.sourceNativeRows[0].dataDerived as any).target_share_credited_team_targets.value);
  assert.equal(s.readiness.purpose, 'pending'); assert.equal(s.readiness.evidence, 'fixture');
});
test('unknown/nonstandard positions and unresolved zero-carry row block room share and claims', () => {
  const { input } = setup(rows => { rows[4].team = 'AAA'; rows[5].team = 'AAA'; }), s = state(input), b = s.segments[0].branch;
  assert.equal(b.position, 'RB'); if (b.position !== 'RB') return;
  assert.equal(b.rbRoomCarryShare.status, 'ineligible'); assert.equal(b.rbRoomCarryShare.denominator, null);
  assert.equal(s.segments[0].claims.find(c => c.id === 'led_qualified_rb_room_carries')!.status, 'insufficient');
  assert.equal(s.segments[0].claims.find(c => c.id === 'majority_qualified_rb_room_carries')!.status, 'insufficient');
  assert.equal(b.carryShare.status, 'available');
});
test('qualified unique RB leader and strict majority use qualified room rather than all-team denominator', () => {
  const { input } = balanced(), s = state(input), b = s.segments[0].branch;
  assert.equal(b.position, 'RB'); if (b.position !== 'RB') return;
  assert.equal(b.rbRoomCarryShare.denominator, 7); assert.equal(b.carryShare.denominator, 9);
  assert.equal(b.rbRoomCarryShare.value, 4 / 7);
  for (const id of ['led_qualified_rb_room_carries', 'majority_qualified_rb_room_carries']) assert.equal(s.segments[0].claims.find(c => c.id === id)!.status, 'supported');
});
test('tie at 50% does not support sole leadership or strict majority', () => {
  const { input } = balanced(rows => { rows[4].carries = 4; }), s = state(input), b = s.segments[0].branch;
  assert.equal(b.position, 'RB'); if (b.position !== 'RB') return;
  assert.equal(b.rbRoomCarryShare.denominator, 8); assert.equal(b.rbRoomCarryShare.value, .5);
  assert.equal(s.segments[0].claims.find(c => c.id === 'led_qualified_rb_room_carries')!.status, 'not_supported');
  assert.equal(s.segments[0].claims.find(c => c.id === 'majority_qualified_rb_room_carries')!.status, 'not_supported');
});
test('receiving involvement is target evidence for RB/WR/TE; QB is attempt/carry evidence', () => {
  const { input } = setup();
  for (const id of ['00-0000001','00-0000002','00-0000004']) {
    input.subject.playerId = id; const s = state(input), ids = s.segments[0].claims.map(c => c.id);
    assert(ids.includes('recorded_receiving_opportunity') && ids.includes('observed_receiving_involvement'));
  }
  input.subject.playerId = '00-0000003'; const qb = state(input), ids = qb.segments[0].claims.map(c => c.id);
  assert.deepEqual(ids, ['recorded_qb_passing_work','recorded_qb_rushing_work']);
  assert.equal(qb.segments[0].branch.position, 'QB');
  if(qb.segments[0].branch.position === 'QB') assert.equal(qb.segments[0].branch.passAttemptShare.denominator,8);
});
test('identical injected bytes and references yield identical state and binding bytes/digest', () => {
  const { input } = setup(), before = structuredClone(input);
  const a = buildWeeklyRoleStateV1(input), b = buildWeeklyRoleStateV1(input);
  assert.deepEqual(a,b); assert.deepEqual(input,before);
  assert.equal(a.binding.companionPin.sha256, rawByteSha256(input.companionBytes));
});
for (const [name, change, pattern] of [
  ['wrong position', (i: BuildInput) => { i.subject.position = 'WR'; }, /wrong source game\/team\/position/],
  ['wrong event team', (i: BuildInput) => { i.subject.team = 'BBB'; }, /wrong source game\/team\/position/],
  ['wrong game window', (i: BuildInput) => { i.subject.gameId = '2026_02_AAA_BBB'; }, /wrong source game\/team\/position/],
  ['wrong week', (i: BuildInput) => { i.handoff.scope.week = 2; }, /candidate scope mismatch|handoff JCS digest mismatch/],
  ['wrong output clock', (i: BuildInput) => { i.artifact.generatedAt = '2026-09-24T11:59:59.999999Z'; }, /chronology mismatch/],
  ['wrong companion hash', (i: BuildInput) => { i.companionPin.sha256 = 'a'.repeat(64); }, /companion raw-byte pin mismatch/],
  ['wrong companion size', (i: BuildInput) => { i.companionPin.size++; }, /companion raw-byte pin mismatch/],
  ['wrong handoff digest', (i: BuildInput) => { i.handoff.artifact.sha256 = 'a'.repeat(64); }, /handoff JCS digest mismatch/],
  ['wrong purpose receipt', (i: BuildInput) => { i.handoff.purpose = { status:'accepted', purposes:['rop_observed_role'], evidence:[] }; }, /invalid qualified handoff/],
] as const) test(name, () => denies(change,pattern));
for (const path of ['carry_share_all_team_carries','target_share_credited_team_targets'] as const) for (const key of ['numerator','denominator','value','status','reason'] as const)
  test(`injected Data ${path}.${key} contradiction is rejected`, () => {
    const { input } = setup();
    resealCompanion(input,c => {
      const d = c.sourceNativeRows[0].dataDerived[path];
      d[key] = typeof d[key] === 'number' ? d[key] + 1 : 'contradiction';
      c.sourceEnvelope.candidate.players[0].derived[path][key] = d[key];
    });
    assert.throws(() => state(input), /Data numerator\/denominator mismatch|Data availability mismatch|Data value\/reason mismatch|value\/reason mismatch|source envelope|invalid shape/);
  });
test('Data carries_plus_targets contradiction fails even when companion raw pin is updated', () => {
  const { input } = setup(); resealCompanion(input,c => { c.sourceNativeRows[0].dataDerived.carries_plus_targets++; c.sourceEnvelope.candidate.players[0].derived.carries_plus_targets++; });
  assert.throws(() => state(input), /Data carries-plus-targets contradiction/);
});
test('companion row lineage mismatch fails with a newly valid raw pin', () => {
  const { input } = setup(); resealCompanion(input,c => { c.sourceNativeRows[0].identity.position = 'WR'; });
  assert.throws(() => state(input), /native\/candidate identity mismatch|source-native identity\/team\/position mismatch/);
});
test('companion reference mismatch and missing source member fail', () => {
  const { input } = setup(); resealCompanion(input,c => { c.handoff.sha256 = 'a'.repeat(64); });
  assert.throws(() => state(input), /companion handoff\/reference mismatch/);
  const other = setup().input; resealCompanion(other,c => { c.sourceNativeRows.pop(); });
  assert.throws(() => state(other), /source population mismatch/);
});
test('companion cannot duplicate one native CSV observation and omit another', () => {
  const { input } = setup(); resealCompanion(input,c => { c.sourceNativeRows[1].sourceCsvRow = c.sourceNativeRows[0].sourceCsvRow; });
  assert.throws(() => state(input), /duplicate\/invalid native row ID|unbound or duplicated native source row/);
});
test('unsupported score/primary role/fantasy/prediction fields do not enter closed state', () => {
  const { input } = setup(), s = state(input); assert(!('primaryRole' in s)); assert(!('fantasyPoints' in s));
  assert(!('predictedVolume' in s)); assert(!('roleScore' in s));
  const invalid: any = structuredClone(s); invalid.prediction = 1;
  assert.equal(validateWeeklyRoleStateV1(invalid,{handoff:input.handoff}).valid,false);
});
test('fixture purpose cannot be accepted; source-shaped fictional acceptance requires explicit exact-purpose receipt', () => {
  const { input } = setup(); assert.equal(state(input).readiness.purpose,'pending');
  input.handoff.purpose = { status:'accepted',purposes:['rop_observed_role'],evidence:['team:0'] };
  assert.throws(() => state(input), /invalid qualified handoff/);
});

function resealHandoff(input: BuildInput) {
  const h = input.handoff, refs = contractReferences(Object.fromEntries(Object.entries(h).filter(([key]) => key !== 'artifact')));
  const dedup = new Map(refs.map(ref => [artifactKey(ref), ref]));
  h.artifact.sha256 = '0'.repeat(64);
  h.artifact.sha256 = contractContentSha256(new TextEncoder().encode(JSON.stringify(h)), [
    { artifact: h.artifact, dependencies: [...dedup.values()] },
    ...[...dedup.values()].map(artifact => ({ artifact, dependencies: [] }))
  ]);
  resealCompanion(input,c => { c.handoff = structuredClone(h.artifact); c.verification.basis = h.mode === 'candidate' ? 'retained_reviewed_pins' : 'synthetic_pins'; });
}
test('fictional source-shaped candidate carries an explicit accepted ROP purpose; TTS-only purpose stays pending', () => {
  const { input } = setup();
  input.handoff.mode = 'candidate'; input.handoff.evidence.forEach(e => { if (e.kind === 'fixture') e.kind = 'source'; });
  input.handoff.purpose = { status: 'accepted', purposes:['tts_allocation'], evidence:['team:0'] }; resealHandoff(input);
  let s = state(input); assert.equal(s.readiness.purpose, 'pending'); assert.equal(s.readiness.evidence,'source_backed');
  input.handoff.purpose = { status:'accepted', purposes:['rop_observed_role'], evidence:['team:0'] }; resealHandoff(input);
  s = state(input); assert.equal(s.readiness.purpose,'accepted');
  // Fictional data exercises the contract predicate only; no source was actually admitted.
  assert.equal(JSON.parse(new TextDecoder().decode(input.companionBytes)).verification.sourceAdmission,'none');
});
test('conflicting team reconciliation cannot manufacture a residual or Data share', () => {
  const f = fixture(), c = f.candidate.candidate, t = c.teams[0];
  t.observed.carries = 7; t.reconciliation.carries = { player_sum: 6, team_value: 7, status: 'conflict' };
  for (const p of c.players.filter((p:any) => p.identity.team === 'AAA'))
    p.derived.carry_share_all_team_carries = { numerator: p.observed.carries, denominator: 7, value: null, status: 'unavailable', reason: 'conflict' };
  const raw = readSourceCsv(f.bytes.get('team.csv')!); raw[0].carries = '7'; const columns = Object.keys(raw[0]);
  f.put('team.csv', [columns.join(','), ...raw.map(r => columns.map(k => r[k]).join(','))].join('\n')+'\n');
  c.source_receipt.sources.team = { ...c.source_receipt.sources.team, ...f.rawPin('team.csv') };
  f.put('source.json', c.source_receipt); f.candidate.source_receipt_sha256 = f.rawPin('source.json').sha256; f.rebind();
  const a = adaptSyntheticAllocation(f.bytes,f.binding,output);
  const input: BuildInput = { handoff:a.handoff,companionBytes:a.companionBytes,companionPin:a.companionPin,subject:{namespace:'nflverse:gsis',playerId:'00-0000001'},artifact:{artifactId:'synthetic:conflict',revision:'1',generatedAt:'2026-09-24T12:00:01Z'} };
  const s = state(input), b = s.segments[0].branch;
  assert.equal(b.carryShare.status,'ineligible'); assert.equal(b.carryShare.denominator,7); assert.equal(b.carryShare.value,null);
  assert.equal(s.readiness.population,'incomplete');
  assert.equal(input.handoff.teams[0].population.unallocated.carries.value,null);
});
test('changed count evidence is rejected even when handoff and companion are resealed', () => {
  const { input } = setup(); input.handoff.teams[0].rows[0].counts.carries.evidence = ['team:0'];
  resealHandoff(input); assert.throws(() => state(input), /source row evidence lineage mismatch/);
});
test('missing Data-owned share object is never reconstructed from counts', () => {
  const { input } = setup(); resealCompanion(input,c => {
    delete c.sourceNativeRows[0].dataDerived.carry_share_all_team_carries;
    delete c.sourceEnvelope.candidate.players[0].derived.carry_share_all_team_carries;
  });
  assert.throws(() => state(input), /Data-owned share object required/);
});
test('unsupported claim semantics remain outside the output vocabulary', () => {
  const { input } = setup(), s = state(input);
  assert(!s.segments[0].claims.some(c => String(c.id).includes('bellcow')));
  const changed:any = structuredClone(s); changed.segments[0].claims[0].id = 'bellcow';
  assert.equal(validateWeeklyRoleStateV1(changed,{handoff:input.handoff}).valid,false);
});
test('companion verification declaration cannot imply admission or authentication', () => {
  const { input } = setup(); resealCompanion(input,c => { c.verification.sourceAdmission = 'accepted'; });
  assert.throws(() => state(input), /companion admission\/verification mismatch/);
});
