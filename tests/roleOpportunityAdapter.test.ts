import test from 'node:test';
import assert from 'node:assert/strict';
import { RoleOpportunityContractError, confidenceScoreToTier, toTiberDataRoleOpportunityV1 } from '../src/adapters/tiberDataRoleOpportunityV1.ts';
import { validateRoleOpportunityRecord } from '../src/contracts/tiberDataRoleOpportunityV1.ts';

const baseSource = {
  model: 'role-and-opportunity-model',
  modelVersion: '0.1.0',
  inputWindow: 'season=2025;week=4',
};

test('maps a valid internal RB output to a canonical role-opportunity record', () => {
  const record = toTiberDataRoleOpportunityV1({
    playerId: 'rb-test-001',
    playerName: 'Runner One',
    team: 'Test Team',
    position: 'RB',
    season: 2025,
    week: 4,
    primaryRole: 'lead_back',
    roleTags: ['early_down', 'goal_line'],
    usage: {
      snapShare: 68,
      carryShare: 72,
      rushAttemptShare: 72,
      redZoneTouchShare: 65,
      inside10TouchShare: 70,
      inside5TouchShare: 80,
      goalLineCarryShare: 75,
      teamOpportunityShare: 61,
      carries: 18,
      redZoneTouches: 5,
      inside10Touches: 3,
      inside5Touches: 2,
      goalLineCarries: 2,
    },
    confidenceScore: 82,
    confidenceReasons: ['Lead back usage is stable.'],
    source: baseSource,
  });

  assert.equal(record.primaryRole, 'lead_back');
  assert.equal(record.usage.carryShare, 72);
  assert.equal(record.confidence.tier, 'high');
  assert.equal(validateRoleOpportunityRecord(record).success, true);
});

test('maps a valid internal WR output to a canonical role-opportunity record', () => {
  const record = toTiberDataRoleOpportunityV1({
    playerId: 'wr-test-001',
    playerName: 'Receiver One',
    team: 'Test Team',
    position: 'WR',
    season: 2025,
    week: 4,
    primaryRole: 'alpha_receiver',
    roleTags: ['outside', 'high_aDOT'],
    usage: {
      routeParticipation: 91,
      targetShare: 29,
      airYardShare: 41,
      redZoneTouchShare: 22,
      teamOpportunityShare: 29,
      routesRun: 39,
      targets: 11,
    },
    confidenceScore: 74,
    confidenceReasons: ['Receiver One owns a concentrated downfield role.'],
    source: baseSource,
  });

  assert.equal(record.primaryRole, 'alpha_receiver');
  assert.equal(record.usage.routeParticipation, 91);
  assert.equal(record.confidence.tier, 'medium');
  assert.equal(validateRoleOpportunityRecord(record).success, true);
});

test('mapper rejects impossible required fields', () => {
  assert.throws(
    () =>
      toTiberDataRoleOpportunityV1({
        playerId: '',
        playerName: 'Broken Player',
        team: 'Test Team',
        position: 'WR',
        season: 2025,
        week: 0,
        usage: {
          targetShare: 101,
        },
        confidenceScore: 120,
        source: baseSource,
      }),
    (error: unknown) => {
      assert.ok(error instanceof RoleOpportunityContractError);
      assert.ok(error.details.some((detail) => detail.field === 'playerId'));
      assert.ok(error.details.some((detail) => detail.field === 'week'));
      assert.ok(error.details.some((detail) => detail.field === 'usage.targetShare'));
      return true;
    },
  );
});

test('confidence tier mapping follows score thresholds', () => {
  assert.equal(confidenceScoreToTier(80), 'high');
  assert.equal(confidenceScoreToTier(60), 'medium');
  assert.equal(confidenceScoreToTier(49.9), 'low');
});
