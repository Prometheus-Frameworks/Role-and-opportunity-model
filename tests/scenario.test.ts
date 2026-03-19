import test from 'node:test';
import assert from 'node:assert/strict';
import { alphaWrRole } from '../src/data/scenarios/alphaWrRole.ts';
import { crowdedRoomRole } from '../src/data/scenarios/crowdedRoomRole.ts';
import { slotWrRole } from '../src/data/scenarios/slotWrRole.ts';
import { tePrimaryRole } from '../src/data/scenarios/tePrimaryRole.ts';
import { evaluateRoleProfile } from '../src/scoring/evaluateRoleProfile.ts';

const scenarios = [alphaWrRole, slotWrRole, tePrimaryRole, crowdedRoomRole];

test('each scenario returns readable explanation bullets', () => {
  for (const scenario of scenarios) {
    const result = evaluateRoleProfile(scenario);
    assert.ok(result.explanationBullets.length >= 3);
    assert.ok(result.explanationBullets.every((bullet) => bullet.length > 20));
  }
});

test('scenario identifiers stay unique', () => {
  assert.equal(new Set(scenarios.map((scenario) => scenario.scenarioId)).size, scenarios.length);
});

test('slot scenario remains less valuable than alpha but more stable than crowded room', () => {
  const slot = evaluateRoleProfile(slotWrRole);
  const alpha = evaluateRoleProfile(alphaWrRole);
  const crowded = evaluateRoleProfile(crowdedRoomRole);

  assert.ok(slot.scores.roleValue < alpha.scores.roleValue);
  assert.ok(slot.scores.roleStability > crowded.scores.roleStability);
});

test('primary TE preserves a strong role value profile', () => {
  const te = evaluateRoleProfile(tePrimaryRole);

  assert.equal(te.roleArchetype, 'TE1');
  assert.ok(te.scores.roleValue >= 60);
  assert.ok(['strong', 'solid', 'mixed', 'weak'].includes(te.verdict));
  assert.ok(te.primaryReason.length > 20);
});
