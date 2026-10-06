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
test('review P1: resealed evidence artifact cannot diverge from the pinned candidate bytes', () => {
  const { input } = setup();
  input.handoff.evidence.forEach(e => { e.artifact.sha256 = 'a'.repeat(64); e.artifact.revision = 'a'.repeat(64); });
  resealHandoff(input);
  assert.throws(() => state(input), /evidence artifact\/candidate support pin mismatch/);
});
test('review P1: altered candidate pin cannot authenticate unchanged evidence, even with resealed companion', () => {
  const { input } = setup(); resealCompanion(input,c => {
    const candidate = c.binding.pins.find((pin:any) => pin.path === c.binding.paths.candidate);
    candidate.sha256 = 'a'.repeat(64);
    c.verification.verifiedFiles = c.binding.pins.map((pin:any) => ({ ...pin, digestProfile:'raw-bytes-sha256-v1' }));
  });
  assert.throws(() => state(input), /evidence artifact\/candidate support pin mismatch/);
});
test('review P2: malformed, duplicate or missing candidate support pins fail closed', () => {
  for (const mutate of [
    (c:any) => { c.binding.pins = [{}]; },
    (c:any) => { c.binding.pins[0].size = 0; },
    (c:any) => { c.binding.pins[0].sha256 = 'not-a-digest'; },
    (c:any) => { c.binding.pins.push({ ...c.binding.pins[0] }); },
    (c:any) => { c.binding.pins = c.binding.pins.filter((p:any) => p.path !== c.binding.paths.candidate); },
  ]) {
    const { input } = setup(); resealCompanion(input,c => {
      mutate(c);
      c.verification.verifiedFiles = c.binding.pins.map((pin:any) => ({ ...pin, digestProfile:'raw-bytes-sha256-v1' }));
    });
    assert.throws(() => state(input), /invalid or duplicated retained support pin|candidate support pin required/);
  }
});
test('review P2: admission or publication in outer or inner source envelope fails closed', () => {
  for (const mutate of [
    (c:any) => { c.sourceEnvelope.consumer_admitted = true; },
    (c:any) => { c.sourceEnvelope.status = 'published'; },
    (c:any) => { c.sourceEnvelope.candidate.consumer_admitted = true; },
    (c:any) => { c.sourceEnvelope.candidate.status = 'published'; },
  ]) {
    const { input } = setup(); resealCompanion(input,mutate);
    assert.throws(() => state(input), /noncandidate or admitted source envelope/);
  }
});
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

/** All replay/receipt records below are fictional; no real-player adapter is called. */
function replaySetup() {
  const f = fixture();
  const walk = (v: any): any => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'week' ? typeof x === 'string' ? '3' : 3 : walk(x)]))
    : typeof v === 'string' ? v.replaceAll('2026_01_', '2026_03_') : v;
  for (const path of ['player.csv', 'team.csv', 'games.csv']) {
    const rows = readSourceCsv(f.bytes.get(path)!).map(r => ({ ...walk(r), week: '3' }));
    const keys = Object.keys(rows[0]); f.put(path, [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n') + '\n');
  }
  Object.assign(f.candidate, walk(f.candidate)); f.binding.games = f.binding.games.map(g => g.replace('2026_01_', '2026_03_'));
  for (const kind of ['player', 'team']) Object.assign(f.candidate.candidate.source_receipt.sources[kind], f.rawPin(kind + '.csv'));
  f.put('source.json', f.candidate.candidate.source_receipt); f.candidate.source_receipt_sha256 = f.rawPin('source.json').sha256;
  Object.assign(f.candidate.schedule_receipt, f.rawPin('games.csv'));
  const schedule = { ...f.candidate.schedule_receipt }; delete schedule.source_support_commit; f.put('schedule.json', schedule); f.rebind();
  const w = { path:'replay/build-receipt.json', manifestPath:'replay/manifest.json', reviewPath:'replay/review.json', dataBase:'b'.repeat(40), selectedDataHead:'c'.repeat(40), reviewedHead:'d'.repeat(40) };
  const members = f.binding.pins.map(p => ({ ...p, commit:w.selectedDataHead }));
  const build = { schema_version:'week3_fresh_replay_generation_witness_v1', witness_kind:'fresh_offline_replay_materialization', original_candidate_generated_at:null, base:w.dataBase, selected_data_head:w.selectedDataHead, support_commit:f.binding.sourceSupportCommit, candidate_path:f.binding.paths.candidate, result:{sha256:f.rawPin('candidate.json').sha256,status:'candidate_revision_written'}, build_started_at:'2026-10-03T15:34:05Z', build_completed_at:'2026-10-03T15:34:06Z', source_admission:false, rop_purpose_acceptance:false,evidence_cutoff:null,finality:'unknown' };
  f.put(w.path,build);
  const manifest = { schema_version:'week3_replay_member_manifest_v1', selected_data_head:w.selectedDataHead, implementation_commit:w.dataBase,source_support_commit:f.binding.sourceSupportCommit,candidate_sha256:build.result.sha256,consumer_admitted:false,build_receipt:{file:'build-receipt.json',sha256:f.rawPin(w.path).sha256,size:f.bytes.get(w.path)!.length},members };
  const review = { schema_version:'week3_independent_repair_review_v1',disposition:'clean',material_findings:[],data:{reviewed_head:w.reviewedHead,parent:w.selectedDataHead,candidate_sha256:build.result.sha256,tree_equivalence_verified:true,manifest_members_authenticated:members.length,original_generation_clock:'unknown',fresh_independent_replay_started_at:'2026-10-03T15:37:01Z',fresh_independent_replay_completed_at:'2026-10-03T15:37:02Z'} };
  f.put(w.manifestPath,manifest); f.put(w.reviewPath,review); f.rebind();
  f.binding.candidateGeneratedAt = null; f.binding.generationEvidence = `${w.path}#build_completed_at`; f.binding.replayWitness = w;
  const a = adaptSyntheticAllocation(f.bytes,f.binding,{...output,generatedAt:'2026-10-03T16:00:00Z'},{season:2026,seasonType:'REG',week:3});
  const input: BuildInput = {handoff:a.handoff,companionBytes:a.companionBytes,companionPin:a.companionPin,subject:{namespace:'nflverse:gsis',playerId:'00-0000001'},artifact:{artifactId:'synthetic:replay-state',revision:'1',generatedAt:'2026-10-03T16:00:01Z'}};
  return { f, a, input, w };
}
function editRecord(i: BuildInput, path: string, mutate: (r:any) => void) {
  resealCompanion(i,c => {
    const r = JSON.parse(c.evidenceRecords[path]); mutate(r); c.evidenceRecords[path] = JSON.stringify(r);
    const raw = new TextEncoder().encode(c.evidenceRecords[path]), pin = c.binding.pins.find((p:any)=>p.path===path);
    pin.sha256 = rawByteSha256(raw); pin.size = raw.length;
    c.verification.verifiedFiles = c.binding.pins.map((p:any)=>({...p,digestProfile:'raw-bytes-sha256-v1'}));
  });
}
test('replay has separate identity, truthful clock, complete population and pending purpose', () => {
  const {input,a} = replaySetup(), s = state(input);
  assert(input.handoff.evidence.every(e=>e.artifact.artifactId.startsWith('data-replay:')));
  assert.equal(input.handoff.evidence[0].artifact.generatedAt,'2026-10-03T15:34:06Z');
  assert.equal(a.companion.binding.candidateGeneratedAt,null); assert.equal(s.readiness.purpose,'pending');
  assert.equal(s.readiness.evidence,'fixture'); assert.equal(s.consumerActivation,'none');
  assert.equal(a.handoff.teams.flatMap(t=>t.rows).length,6);
  assert.deepEqual(state(input),s);
});
for (const [name, mutate] of [
  ['wrong replay identity',(r:any)=>{r.witness_kind='original_build';}],
  ['wrong candidate digest',(r:any)=>{r.result.sha256='a'.repeat(64);}],
  ['wrong replay candidate path',(r:any)=>{r.candidate_path='other.json';}],
  ['original clock claimed',(r:any)=>{r.original_candidate_generated_at=r.build_completed_at;}],
  ['source admitted',(r:any)=>{r.source_admission=true;}],
] as const) test(`repinned ${name} rejected at builder`,()=>{
  const {input,w}=replaySetup(); editRecord(input,w.path,mutate); assert.throws(()=>state(input),/replay/);
});
for (const [name,mutate] of [
  ['wrong review head',(r:any)=>{r.data.reviewed_head='e'.repeat(40);}],
  ['wrong reviewed candidate',(r:any)=>{r.data.candidate_sha256='a'.repeat(64);}],
  ['unresolved findings',(r:any)=>{r.material_findings=['P1'];}],
  ['wrong manifest member count',(r:any)=>{r.data.manifest_members_authenticated++;}],
  ['review predates replay',(r:any)=>{r.data.fresh_independent_replay_started_at='2026-10-03T15:30:00Z';}],
] as const) test(`repinned ${name} rejected`,()=>{
  const {input,w}=replaySetup(); editRecord(input,w.reviewPath,mutate); assert.throws(()=>state(input),/review/);
});
test('replay cannot borrow its clock under original candidate identity or binding',()=>{
  for (const change of [
    (i:BuildInput)=>{i.handoff.evidence.forEach(e=>{e.artifact.artifactId='data:candidate.json';});resealHandoff(i);},
    (i:BuildInput)=>{resealCompanion(i,c=>{c.binding.candidateGeneratedAt='2026-10-03T15:34:06Z';});},
  ]) { const {input}=replaySetup();change(input);assert.throws(()=>state(input),/evidence artifact|original generation clock/); }
});
test('missing and altered raw replay records fail after companion repinning',()=>{
  for(const change of [(c:any)=>{delete c.evidenceRecords[c.binding.replayWitness.reviewPath];},(c:any)=>{c.evidenceRecords[c.binding.replayWitness.path]+=' ';}]) {
    const {input}=replaySetup();resealCompanion(input,change);assert.throws(()=>state(input),/missing evidence record|raw-byte pin/);
  }
});
test('manifest omissions and hash changes fail after repinning',()=>{
  for(const mutate of [(m:any)=>{m.members.pop();},(m:any)=>{m.members[0].sha256='f'.repeat(64);},(m:any)=>{m.build_receipt.sha256='f'.repeat(64);}]) {
    const {input,w}=replaySetup();editRecord(input,w.manifestPath,mutate);assert.throws(()=>state(input),/manifest|member/);
  }
});
function withReceipt() {
  const {input,w}=replaySetup();input.handoff.mode='candidate'; input.handoff.evidence.forEach(e=>{if(e.kind==='fixture')e.kind='source';});
  const path='operator/receipt.json', acceptedAt='2026-10-03T15:45:00Z';
  const r={schema_version:'rop_provisional_purpose_receipt_v1',status:'accepted',source_admission:false,execution_authorized:false,consumer_activation:false,scope:input.handoff.scope,evidence_artifact:input.handoff.evidence[0].artifact,purposes:['rop_observed_role'],accepted_at:acceptedAt};
  const text=JSON.stringify(r), raw=new TextEncoder().encode(text), sha=rawByteSha256(raw);
  input.handoff.purpose={status:'accepted',purposes:['rop_observed_role'],evidence:['purpose:receipt']};
  input.handoff.evidence.push({id:'purpose:receipt',kind:'source',artifact:{artifactId:`operator-receipt:${path}`,revision:sha,sha256:sha,artifactType:'evidence_file',digestProfile:'raw-bytes-sha256-v1',generatedAt:acceptedAt},locator:'/',definition:'Fictional operator receipt for guard regression only',parents:[],sourceObservedAt:null,sourcePublishedAt:null,retrievedAt:null,generatedAt:acceptedAt});
  resealCompanion(input,c=>{c.binding.purposeReceipt={path};c.evidenceRecords[path]=text;c.binding.pins.push({path,size:raw.length,sha256:sha});c.verification.verifiedFiles=c.binding.pins.map((p:any)=>({...p,digestProfile:'raw-bytes-sha256-v1'}));});
  resealHandoff(input); return {input,path,w};
}
test('separate fictional operator receipt supports purpose and never replaces row observations',()=>{
  const {input}=withReceipt(),s=state(input);assert.equal(s.readiness.purpose,'accepted');assert.equal(s.consumerActivation,'none');
  assert.equal(s.segments[0].observations.targets.value,2);
});
for(const [name,mutate] of [
  ['receipt scope',(r:any)=>{r.scope.week=2;}],
  ['receipt evidence digest',(r:any)=>{r.evidence_artifact.sha256='a'.repeat(64);}],
  ['receipt original identity',(r:any)=>{r.evidence_artifact.artifactId='data:candidate.json';}],
  ['receipt execution authority',(r:any)=>{r.execution_authorized=true;}],
  ['receipt predates review',(r:any)=>{r.accepted_at='2026-10-03T15:35:00Z';}],
  ['receipt wrong purpose',(r:any)=>{r.purposes=['tts_allocation'];}],
] as const) test(`repinned ${name} mismatch fails`,()=>{const {input,path}=withReceipt();editRecord(input,path,mutate);assert.throws(()=>state(input),/purpose receipt/);});
test('replay purpose cannot be accepted without external receipt',()=>{
  const {input}=replaySetup();input.handoff.mode='candidate';input.handoff.evidence.forEach(e=>{if(e.kind==='fixture')e.kind='source';});
  input.handoff.purpose={status:'accepted',purposes:['rop_observed_role'],evidence:['team:0']};resealHandoff(input);assert.throws(()=>state(input),/replay purpose receipt required/);
});
test('receipt cannot become row observation evidence even with resealed handoff',()=>{
  const {input}=withReceipt();input.handoff.teams[0].totals.targets.evidence=['purpose:receipt'];resealHandoff(input);assert.throws(()=>state(input),/purpose receipt cannot support observations/);
});
test('replay cannot evade companion or handoff digest checks',()=>{
  const {input}=replaySetup();input.companionPin.sha256='a'.repeat(64);assert.throws(()=>state(input),/companion raw-byte pin/);
  const other=replaySetup().input;other.handoff.evidence[0].artifact.revision='altered';assert.throws(()=>state(other),/handoff JCS|invalid qualified handoff/);
});
test('adapter authenticates replay records before emitting a handoff',()=>{
  for(const pathKey of ['path','reviewPath','manifestPath'] as const) {
    const {f,w}=replaySetup(); const path=w[pathKey]; f.put(path,{}); f.rebind();
    assert.throws(()=>adaptSyntheticAllocation(f.bytes,f.binding,{...output,generatedAt:'2026-10-03T16:00:00Z'},{season:2026,seasonType:'REG',week:3}),/replay|expected/);
  }
  const {f}=replaySetup();f.binding.candidateGeneratedAt='2026-10-03T15:34:06Z';
  assert.throws(()=>adaptSyntheticAllocation(f.bytes,f.binding,{...output,generatedAt:'2026-10-03T16:00:00Z'},{season:2026,seasonType:'REG',week:3}),/original generation clock/);
});
test('replay handoff cannot predate the completed independent review',()=>{
  const {f,input}=replaySetup();
  assert.throws(()=>adaptSyntheticAllocation(f.bytes,f.binding,{...output,generatedAt:'2026-10-03T15:35:00Z'},{season:2026,seasonType:'REG',week:3}),/artifact chronology/);
  input.handoff.generatedAt='2026-10-03T15:35:00Z';input.handoff.artifact.generatedAt=input.handoff.generatedAt;
  input.handoff.evidence.filter(e=>e.kind==='derived').forEach(e=>{e.generatedAt=input.handoff.generatedAt;});resealHandoff(input);
  assert.throws(()=>state(input),/predates replay review/);
});

test('independent P2: receipt cannot replace residual population evidence after resealing',()=>{
  for(const field of ['carries','targets','receptions','passAttempts'] as const) {
    const {input}=withReceipt();input.handoff.teams[0].population.unallocated[field].evidence=['purpose:receipt'];resealHandoff(input);
    assert.throws(()=>state(input),/purpose receipt cannot support observations/);
  }
});

test('distinct residual evidence does not change RB claim or room-share support selection',()=>{
  const {input}=balanced(), before=state(input).segments[0];
  const population=input.handoff.evidence.find(e=>e.id===input.handoff.teams[0].population.evidence[0])!;
  for(const field of ['carries','targets','receptions','passAttempts'] as const) {
    const id=`residual:${field}`;input.handoff.evidence.push({...structuredClone(population),id});
    input.handoff.teams[0].population.unallocated[field].evidence=[id];
  }
  resealHandoff(input);const after=state(input).segments[0];
  assert.deepEqual(after.claims,before.claims);assert.deepEqual(after.branch,before.branch);
});
