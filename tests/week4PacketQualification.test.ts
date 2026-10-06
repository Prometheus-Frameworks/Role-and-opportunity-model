/** Synthetic metadata/negative tests; no retained NFL bytes or real-input wrapper execution. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEK4_PACKET as B } from '../src/adapters/week4PacketBinding.ts';
import { authenticateWeek4Evidence as authenticate, assertWeek4EvidenceSemantics as assertSemantics, assertWeek4EmbeddedReceipts as assertEmbedded, week4Pin as pin, week4ClockMicros as clock } from '../src/adapters/week4PacketQualification.ts';
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
function semanticFixture(): any {
 return { buildWitness: structuredClone(B.buildWitness),
 inventory: { schema_version: 'week4_preparation_input_inventory_v1', status: 'candidate_only_inventory_not_consumer_binding', scope: structuredClone(B.scope), members: structuredClone(B.inventoryMembers), independent_review: null },
 review: { schema_version: 'independent_week4_data_review_v1', reviewed_head: B.reviewedDataHead, reviewed_tree: B.reviewedDataTree, candidate_path: B.candidatePath, candidate_sha256: pin(B.candidatePath).sha256, source_support_commit: B.sourceSupportCommit, producer_code_commit: B.producerCodeCommit, review_completed_at: B.qualifiedAt, input_inventory_sha256: pin(B.auditPath + 'input-inventory.json').sha256, build_witness_sha256: pin(B.auditPath + 'build-witness.json').sha256, disposition: 'clean_with_non_blocking_notes', material_findings: [], actionable_findings: [], independent_reviewer: true, author_of_reviewed_packet: false, consumer_admitted: false } };
}
test('closed 16-member inventory is frozen and separates reviewed packet from later storage', () => {
 assert.equal(B.pins.length, 16); assert.equal(new Set(B.pins.map(p => p.path)).size, 16);
 assert(Object.isFrozen(B)); assert(Object.isFrozen(B.pins)); assert(B.pins.every(Object.isFrozen));
 assert.notEqual(B.reviewedDataHead, B.storageHead); assert.equal(B.scope.week, 4);
});
test('synthetic metadata verification returns no artifact or acceptance and preserves inputs', () => {
 const f=semanticFixture(), before=structuredClone(f); assert.equal(assertSemantics(f), undefined); assert.deepEqual(f,before);
});
for (const [label,mutate] of [
 ['build generation',(f: any)=>f.buildWitness.build_completed_at='2026-01-01T00:00:00Z'],
 ['build kind',(f: any)=>f.buildWitness.kind='fresh_offline_replay_materialization'],
 ['build scope',(f: any)=>f.buildWitness.scope.week=3], ['build support',(f: any)=>f.buildWitness.source_support_commit='0'.repeat(40)],
 ['build candidate',(f: any)=>f.buildWitness.candidate_sha256='0'.repeat(64)],
 ['build acceptance',(f: any)=>f.buildWitness.purpose_acceptance=true], ['build admission',(f: any)=>f.buildWitness.consumer_admitted=true],
 ['missing inventory member',(f: any)=>f.inventory.members.pop()], ['duplicate inventory member',(f: any)=>f.inventory.members.push(f.inventory.members[0])],
 ['member hash',(f: any)=>f.inventory.members[0].sha256='0'.repeat(64)], ['member commit',(f: any)=>f.inventory.members[0].support_commit='0'.repeat(40)],
 ['historical review state',(f: any)=>f.inventory.independent_review='clean'], ['review head',(f: any)=>f.review.reviewed_head=B.storageHead],
 ['review tree',(f: any)=>f.review.reviewed_tree='0'.repeat(40)], ['review candidate',(f: any)=>f.review.candidate_sha256='0'.repeat(64)],
 ['review inventory',(f: any)=>f.review.input_inventory_sha256='0'.repeat(64)], ['review witness',(f: any)=>f.review.build_witness_sha256='0'.repeat(64)],
 ['review clock',(f: any)=>f.review.review_completed_at='2026-01-01T00:00:00Z'], ['review findings',(f: any)=>f.review.material_findings=['P1']],
 ['review author',(f: any)=>f.review.author_of_reviewed_packet=true], ['review independence',(f: any)=>f.review.independent_reviewer=false],
 ['review admission',(f: any)=>f.review.consumer_admitted=true], ['review disposition',(f: any)=>f.review.disposition='pending']
] as [string, (f: any) => void][]) test('fails closed: '+label,()=>{const f=semanticFixture();mutate(f);assert.throws(()=>assertSemantics(f));});
test('packet authentication rejects missing, extra, wrong-size and hash-drift bytes before parsing', () => {
 assert.throws(()=>authenticate(new Map()),/16-file/);
 const p=new Map(B.pins.map(pin=>[pin.path,new Uint8Array(pin.size)]));assert.throws(()=>authenticate(p),/hash/);
 p.set(B.pins[0].path,new Uint8Array(1));assert.throws(()=>authenticate(p),/size/);
 p.set('extra',new Uint8Array());assert.throws(()=>authenticate(p),/16-file/);
});
function embeddedFixture(): any {
 const sourceReceipt={fixture_only:true,nested:{alpha:1,beta:2}},scheduleReceipt={fixture_only:true};
 return {sourceReceipt,scheduleReceipt,envelope:{candidate:{scope:structuredClone(B.scope),source_support_commit:B.sourceSupportCommit,source_receipt:structuredClone(sourceReceipt)},schedule_receipt:{...scheduleReceipt,source_support_commit:B.sourceSupportCommit},source_receipt_sha256:pin(B.paths.sourceReceipt).sha256,builder_sha256:pin(B.paths.publisher).sha256,fact_builder_sha256:pin(B.paths.builder).sha256}};
}
test('embedded receipt comparison preserves structural property-order independence', () => {
 const f=embeddedFixture();f.envelope.candidate.source_receipt={nested:{beta:2,alpha:1},fixture_only:true};assertEmbedded(f);
});
for(const [label,mutate] of [
 ['source',(f: any)=>f.envelope.candidate.source_receipt.nested.alpha=2],['schedule',(f: any)=>f.envelope.schedule_receipt.extra=true],
 ['scope',(f: any)=>f.envelope.candidate.scope.week=3],['digest',(f: any)=>f.envelope.builder_sha256='0'.repeat(64)]
] as [string, (f: any) => void][])test('embedded fail closed: '+label,()=>{const f=embeddedFixture();mutate(f);assert.throws(()=>assertEmbedded(f));});
test('clock comparison preserves microseconds and rejects rolled-over calendar dates',()=>{
 assert.equal(clock('2026-10-06T11:43:10.583805Z')-clock('2026-10-06T11:43:10.583804Z'),1n);
 for(const value of ['2026-02-30T00:00:00Z','invalid','2026-10-06T00:00:00','2026-10-06T00:00:00.1234567Z'])assert.throws(()=>clock(value));
});
