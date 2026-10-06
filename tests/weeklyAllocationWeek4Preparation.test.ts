import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptReviewedAllocation, adaptSyntheticAllocation, readSourceCsv, type SyntheticAllocationScope } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { adaptRetainedWeek4, allocationEvidenceIdentity } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { RETAINED_WEEK4_BINDING } from '../src/adapters/retainedWeek4Binding.ts';
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
