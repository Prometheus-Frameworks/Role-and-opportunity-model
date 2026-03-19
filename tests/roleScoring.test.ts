import test from 'node:test';
import assert from 'node:assert/strict';
import { alphaWrRole } from '../src/data/scenarios/alphaWrRole.ts';
import { crowdedRoomRole } from '../src/data/scenarios/crowdedRoomRole.ts';
import { slotWrRole } from '../src/data/scenarios/slotWrRole.ts';
import { tePrimaryRole } from '../src/data/scenarios/tePrimaryRole.ts';
import { evaluateRoleProfile } from '../src/scoring/evaluateRoleProfile.ts';
import { scoreOpportunityQuality } from '../src/scoring/scoreOpportunityQuality.ts';
import { classifyRoleArchetype, scoreRoleValue } from '../src/scoring/scoreRoleValue.ts';
import { scoreRoleStability } from '../src/scoring/scoreRoleStability.ts';
import { scoreVacatedOpportunity } from '../src/scoring/scoreVacatedOpportunity.ts';

const boundedScores = [
  scoreRoleValue(alphaWrRole.profile),
  scoreOpportunityQuality(alphaWrRole.context),
  scoreRoleStability(alphaWrRole.profile, alphaWrRole.context),
  scoreVacatedOpportunity(alphaWrRole.profile, alphaWrRole.context),
  scoreRoleValue(crowdedRoomRole.profile),
  scoreOpportunityQuality(crowdedRoomRole.context),
  scoreRoleStability(crowdedRoomRole.profile, crowdedRoomRole.context),
  scoreVacatedOpportunity(crowdedRoomRole.profile, crowdedRoomRole.context),
];

test('keeps all scores in 0-100 bounds', () => {
  for (const score of boundedScores) {
    assert.ok(score >= 0);
    assert.ok(score <= 100);
  }
});

test('classifies seeded archetypes correctly', () => {
  assert.equal(classifyRoleArchetype(alphaWrRole.profile), 'WR1');
  assert.equal(classifyRoleArchetype(slotWrRole.profile), 'SLOT');
  assert.equal(classifyRoleArchetype(tePrimaryRole.profile), 'TE1');
  assert.equal(classifyRoleArchetype(crowdedRoomRole.profile), 'ROTATIONAL');
});

test('alpha role evaluates higher than crowded ambiguous role', () => {
  const alpha = evaluateRoleProfile(alphaWrRole);
  const crowded = evaluateRoleProfile(crowdedRoomRole);

  assert.ok(alpha.scores.roleValue > crowded.scores.roleValue);
  assert.ok(alpha.compositeScore > crowded.compositeScore);
});

test('crowded room suppresses stability and opportunity quality', () => {
  const alpha = evaluateRoleProfile(alphaWrRole);
  const crowded = evaluateRoleProfile(crowdedRoomRole);

  assert.ok(crowded.scores.roleStability < alpha.scores.roleStability);
  assert.ok(crowded.scores.opportunityQuality < alpha.scores.opportunityQuality);
});
