import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptReviewedAllocation, adaptSyntheticAllocation, type ReviewedAllocationScope } from '../src/adapters/weeklyAllocationFromDataV1.ts';
import { RETAINED_WEEK1_BINDING } from '../src/adapters/retainedWeek1Binding.ts';
import { RETAINED_WEEK2_BINDING } from '../src/adapters/retainedWeek2Binding.ts';
import { RETAINED_WEEK3_BINDING, RETAINED_WEEK3_INPUT_MANIFEST_SHA256 } from '../src/adapters/retainedWeek3Binding.ts';
import { output } from './fixtures/allocationFromDataV1.ts';

const selection: ReviewedAllocationScope = { season: 2026, seasonType: 'REG', week: 3 };

const firstMissing = (scope: ReviewedAllocationScope, path: string) => {
  try {
    adaptReviewedAllocation(new Map(), output, scope);
    assert.fail('expected missing retained evidence');
  } catch (error) {
    assert.match((error as Error).message, /missing retained bytes/);
    assert((error as Error).message.includes(path));
  }
};

test('Week 3 retained binding is closed, frozen, replay-scoped and purpose-pending', () => {
  assert.equal(RETAINED_WEEK3_INPUT_MANIFEST_SHA256, 'cf1c2a555bda20199ca36642f427eb83edfbfbb5f4546e233ce994a0fe8aa1b1');
  assert.equal(RETAINED_WEEK3_BINDING.version, 'rop_retained_week3_binding_v1');
  assert.equal(RETAINED_WEEK3_BINDING.sourceSupportCommit, '2b58e2c22ccd2430041afcfbd143b057830878f0');
  assert.equal(RETAINED_WEEK3_BINDING.candidateGeneratedAt, null);
  assert.equal(RETAINED_WEEK3_BINDING.generationEvidence, 'docs/audits/week3-replay-2026-10-03/build-receipt.json#build_completed_at');
  assert.equal(RETAINED_WEEK3_BINDING.replayWitness.selectedDataHead, 'eac3b9bc22cf1fa230b233a09f5e031a2a9b409a');
  assert.equal(RETAINED_WEEK3_BINDING.replayWitness.reviewedHead, '4821a08ecad8c4ed7177b2acda0cb29d93a2649a');
  assert.equal(RETAINED_WEEK3_BINDING.pins.length, 16);
  assert.equal(RETAINED_WEEK3_BINDING.games.length, 16);
  assert.equal(new Set(RETAINED_WEEK3_BINDING.pins.map(pin => pin.path)).size, 16);
  assert(!('purposeReceipt' in RETAINED_WEEK3_BINDING));
  assert(!('generationWitness' in RETAINED_WEEK3_BINDING));
  assert(Object.isFrozen(RETAINED_WEEK3_BINDING));
  assert(Object.isFrozen(RETAINED_WEEK3_BINDING.pins));
  assert(Object.isFrozen(RETAINED_WEEK3_BINDING.pins[0]));
  assert.throws(() => { (RETAINED_WEEK3_BINDING.pins[0] as any).sha256 = '0'.repeat(64); });
});

test('closed reviewed selector reaches the exact Week 3 binding without changing Week 1 or Week 2 selection', () => {
  firstMissing({ season: 2026, seasonType: 'REG', week: 1 }, RETAINED_WEEK1_BINDING.pins[0].path);
  firstMissing({ season: 2026, seasonType: 'REG', week: 2 }, RETAINED_WEEK2_BINDING.pins[0].path);
  firstMissing(selection, RETAINED_WEEK3_BINDING.pins[0].path);
});

test('closed reviewed selector rejects wrong week, season, type and caller-supplied selectors', () => {
  for (const scope of [
    { ...selection, week: 4 },
    { ...selection, season: 2025 },
    { ...selection, seasonType: 'POST' },
    { ...selection, pins: [] },
  ]) assert.throws(() => adaptReviewedAllocation(new Map(), output, scope as any), /unreviewed scope/);
});

test('changed Week 3 pins fail closed before parsing', () => {
  const changed = structuredClone(RETAINED_WEEK3_BINDING) as any;
  changed.pins[0].sha256 = '0'.repeat(64);
  const bytes = new Map([[changed.pins[0].path, new Uint8Array(changed.pins[0].size)]]);
  assert.throws(() => adaptSyntheticAllocation(bytes, changed, output, selection), /raw-byte pin mismatch/);
});

test('Week 3 candidate and replay records remain distinct exact pins', () => {
  const byPath = new Map(RETAINED_WEEK3_BINDING.pins.map(pin => [pin.path, pin]));
  const candidate = byPath.get(RETAINED_WEEK3_BINDING.paths.candidate)!;
  assert.equal(candidate.sha256, 'f3366ac1c2192641c6e94ba7c756ed2e12ba73b37550619ae143deaeab9f9902');
  assert.equal(candidate.size, 1339996);
  for (const path of [
    RETAINED_WEEK3_BINDING.replayWitness.path,
    RETAINED_WEEK3_BINDING.replayWitness.manifestPath,
    RETAINED_WEEK3_BINDING.replayWitness.reviewPath,
  ]) assert(byPath.has(path));
  assert.notEqual(RETAINED_WEEK3_BINDING.replayWitness.path, RETAINED_WEEK3_BINDING.paths.candidate);
});
