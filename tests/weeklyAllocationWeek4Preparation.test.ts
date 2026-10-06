import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptReviewedAllocation, adaptSyntheticAllocation, readSourceCsv, type SyntheticAllocationScope } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { adaptRetainedWeek4, allocationEvidenceIdentity } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { RETAINED_WEEK4_BINDING } from '../src/adapters/retainedWeek4Binding.ts';
import { buildWeeklyRoleStateV1 } from '../src/builders/weeklyRoleStateV1.ts';
import { rawByteSha256, contractContentSha256, contractReferences, artifactKey, RAW_PROFILE } from '../src/contracts/artifactDigestV1.ts';
import { fixture, output } from './fixtures/allocationFromDataV1.ts';
const selection: SyntheticAllocationScope = { season: 2026, seasonType: 'REG', week: 4 };

/** Fictional AAA/BBB players only. This does not rebind any retained NFL evidence. */
function week4() {
  const f = fixture();
  const walk = (v: any): any => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'week' ? typeof x === 'string' ? '4' : 4 : walk(x)]))
    : typeof v === 'string' ? v.replaceAll('2026_01_', '2026_04_') : v;
  for (const p of ['player.csv', 'team.csv', 'games.csv']) {
    const rows = readSourceCsv(f.bytes.get(p)!).map(r => ({ ...walk(r), week: '4' }));
    const keys = Object.keys(rows[0]);
    f.put(p, [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n') + '\n');
  }
  Object.assign(f.candidate, walk(f.candidate));
  f.binding.games = f.binding.games.map(g => g.replace('2026_01_', '2026_04_'));
  for (const kind of ['player', 'team']) Object.assign(f.candidate.candidate.source_receipt.sources[kind], f.rawPin(kind + '.csv'));
  f.put('source.json', f.candidate.candidate.source_receipt);
  f.candidate.source_receipt_sha256 = f.rawPin('source.json').sha256;
  Object.assign(f.candidate.schedule_receipt, f.rawPin('games.csv'));
  const schedule = { ...f.candidate.schedule_receipt }; delete schedule.source_support_commit;
  f.put('schedule.json', schedule); f.rebind(); return f;
}
const adapt = (f = week4()) => adaptSyntheticAllocation(f.bytes, f.binding, output, selection);

test('Week 4 fictional core keeps pending synthetic evidence and complete denominators',()=>{
 const f=week4(),r=adapt(f);assert.equal(r.handoff.mode,'synthetic');assert.equal(r.handoff.scope.week,4);
 assert.equal(r.handoff.purpose.status,'pending');assert.equal(r.handoff.finality,'unknown');
 assert.equal(r.companion.sourceNativeRows.length,f.candidate.candidate.coverage.source_player_rows_in_scope);
 assert.deepEqual(adapt(f).companionBytes,r.companionBytes);
});
test('generic real selector continues to reject Week 4 and unsupported synthetic selectors fail',()=>{
 const f=week4();assert.throws(()=>adaptReviewedAllocation(f.bytes,output,selection as any),/unreviewed scope/);
 for(const bad of [{...selection,week:5},{...selection,pins:[]},{...selection,season:2025}])assert.throws(()=>adaptSyntheticAllocation(f.bytes,f.binding,output,bad as any));
});
test('Week 4 fictional source cannot hide a missing population row or changed denominator',()=>{
 const f=week4();f.candidate.candidate.players.pop();f.rebind();assert.throws(()=>adapt(f),/population/);
 const g=week4();g.candidate.candidate.players[0].derived.target_share_credited_team_targets.denominator++;g.rebind();assert.throws(()=>adapt(g),/share/);
});
test('closed Week 4 source entry rejects all caller bindings and empty bytes',()=>{
 assert.throws(()=>adaptRetainedWeek4(new Map(),output),/16-file/);
 assert.throws(()=>allocationEvidenceIdentity(RETAINED_WEEK4_BINDING,{}, {season:2026,seasonType:'REG',week:3}),/scope/);
 const changed=structuredClone(RETAINED_WEEK4_BINDING);changed.candidateGeneratedAt='2026-01-01T00:00:00Z';
 assert.throws(()=>allocationEvidenceIdentity(changed,{},selection),/closed Week 4 binding/);
 assert.throws(()=>allocationEvidenceIdentity(RETAINED_WEEK4_BINDING,{},selection),/missing evidence record/);
});
/** Fictional resealing attack: a checksum and a claimed candidate mode are not a Week 4 qualification. */
function resealedCandidate(accepted: boolean, marker: boolean) {
 const a=adapt(week4()),h=a.handoff;h.mode='candidate';
 h.evidence.forEach(e=>{if(e.kind==='fixture')e.kind='source';});
 if(accepted)h.purpose={status:'accepted',purposes:['rop_observed_role'],evidence:['team:0']};
 const refs=contractReferences(Object.fromEntries(Object.entries(h).filter(([key])=>key!=='artifact')));
 const dedup=new Map(refs.map(ref=>[artifactKey(ref),ref]));h.artifact.sha256='0'.repeat(64);
 h.artifact.sha256=contractContentSha256(new TextEncoder().encode(JSON.stringify(h)),[{artifact:h.artifact,dependencies:[...dedup.values()]},...[...dedup.values()].map(artifact=>({artifact,dependencies:[]}))]);
 const companion=JSON.parse(new TextDecoder().decode(a.companionBytes));companion.handoff=structuredClone(h.artifact);
 companion.verification.basis='retained_reviewed_pins';if(marker)companion.binding.candidateWitness=structuredClone(RETAINED_WEEK4_BINDING.candidateWitness);
 const companionBytes=new TextEncoder().encode(JSON.stringify(companion));
 return {handoff:h,companionBytes,companionPin:{digestProfile:RAW_PROFILE,size:companionBytes.length,sha256:rawByteSha256(companionBytes)},subject:{namespace:'nflverse:gsis',playerId:'00-0000001'},artifact:{artifactId:'fictional-only:w4-regression',revision:'1',generatedAt:'2026-09-24T12:00:01Z'}};
}
test('candidate Week 4 cannot omit closed witness under pending or accepted purpose',()=>{
 for(const accepted of [false,true])assert.throws(()=>buildWeeklyRoleStateV1(resealedCandidate(accepted,false)),/closed Week 4 candidate witness required/);
});
test('candidate Week 4 cannot claim accepted purpose by adding the optional marker',()=>{
 assert.throws(()=>buildWeeklyRoleStateV1(resealedCandidate(true,true)),/Week 4 preparation purpose must remain pending/);
 assert.throws(()=>buildWeeklyRoleStateV1(resealedCandidate(false,true)),/closed Week 4 binding required/);
});
