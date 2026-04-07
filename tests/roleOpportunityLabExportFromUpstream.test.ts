import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { UpstreamEvaluationInput } from '../src/upstream/tiberDataClient.ts';
import type { RoleOpportunityLabEnvelope, RoleOpportunityLabRow } from '../src/types/roleOpportunityLab.ts';
import { evaluateRoleProfile } from '../src/scoring/evaluateRoleProfile.ts';
import { buildRoleOpportunityInputFromEvaluation } from '../src/services/roleOpportunityService.ts';
import { confidenceScoreToTier } from '../src/adapters/tiberDataRoleOpportunityV1.ts';
import { SERVICE_NAME, SERVICE_VERSION } from '../src/config/service.ts';

const PERCENT_TO_DECIMAL_SCALE = 100;

const normalizeConfidenceScoreForLab = (confidenceScore: number) =>
  Number((confidenceScore / PERCENT_TO_DECIMAL_SCALE).toFixed(3));

// Create test inputs
const createTestInputs = (): UpstreamEvaluationInput[] => [
  {
    profile: {
      playerId: 'wr-alpha-001',
      playerName: 'Atlas X',
      teamId: 'TM-ALP',
      position: 'WR',
      targetShare: 31,
      airYardShare: 38,
      routeParticipation: 93,
      slotRate: 24,
      inlineRate: 0,
      wideRate: 76,
      redZoneTargetShare: 29,
      firstReadShare: 33,
      averageDepthOfTarget: 13.8,
      explosiveTargetRate: 18,
      personnelVersatility: 72,
      competitionForRole: 25,
      injuryRisk: 22,
      vacatedTargetsAvailable: 58,
    },
    context: {
      teamId: 'TM-ALP',
      teamName: 'Metro Meteors',
      passRateOverExpected: 7,
      neutralPassRate: 62,
      redZonePassRate: 60,
      paceIndex: 66,
      quarterbackStability: 84,
      playCallerContinuity: 81,
      targetCompetitionIndex: 34,
      receiverRoomCertainty: 79,
      vacatedTargetShare: 41,
    },
  },
  {
    profile: {
      playerId: 'wr-beta-002',
      playerName: 'Blaze Y',
      teamId: 'TM-ALP',
      position: 'WR',
      targetShare: 22,
      airYardShare: 25,
      routeParticipation: 88,
      slotRate: 45,
      inlineRate: 0,
      wideRate: 55,
      redZoneTargetShare: 18,
      firstReadShare: 22,
      averageDepthOfTarget: 10.2,
      explosiveTargetRate: 12,
      personnelVersatility: 65,
      competitionForRole: 31,
      injuryRisk: 28,
      vacatedTargetsAvailable: 58,
    },
    context: {
      teamId: 'TM-ALP',
      teamName: 'Metro Meteors',
      passRateOverExpected: 7,
      neutralPassRate: 62,
      redZonePassRate: 60,
      paceIndex: 66,
      quarterbackStability: 84,
      playCallerContinuity: 81,
      targetCompetitionIndex: 34,
      receiverRoomCertainty: 79,
      vacatedTargetShare: 41,
    },
  },
];

// Build lab row directly from input (mirrors service implementation)
const buildLabRowFromUpstreamInput = (
  upstreamInput: UpstreamEvaluationInput,
  options: { season: number; week: number; generatedAt: string },
): RoleOpportunityLabRow => {
  const { profile, context } = upstreamInput;
  const { season, week, generatedAt } = options;

  const evaluation = evaluateRoleProfile(upstreamInput, { explanationLevel: 'standard' });
  const canonicalInput = buildRoleOpportunityInputFromEvaluation(evaluation, {
    season,
    week,
    generatedAt,
    inputWindow: `season=${season};week=${week}`,
  });
  const normalizedConfidenceScore = normalizeConfidenceScoreForLab(canonicalInput.confidenceScore);

  return {
    player_id: canonicalInput.playerId,
    player_name: canonicalInput.playerName,
    team: canonicalInput.team,
    position: canonicalInput.position,
    season: canonicalInput.season,
    week: canonicalInput.week,
    primary_role: canonicalInput.primaryRole,
    role_tags: canonicalInput.roleTags,
    route_participation: canonicalInput.usage.routeParticipation ?? null,
    target_share: canonicalInput.usage.targetShare ?? null,
    air_yard_share: canonicalInput.usage.airYardShare ?? null,
    snap_share: canonicalInput.usage.snapShare ?? null,
    usage_rate: null,
    confidence_score: normalizedConfidenceScore,
    confidence_tier: confidenceScoreToTier(canonicalInput.confidenceScore),
    source_name: SERVICE_NAME,
    source_type: 'deterministic_model',
    model_version: SERVICE_VERSION,
    generated_at: generatedAt,
    insights: [evaluation.primaryReason, evaluation.riskNote, ...evaluation.explanationBullets]
      .filter((insight): insight is string => typeof insight === 'string' && insight.length > 0)
      .slice(0, 5),
    raw_fields: {
      upstream_source: 'tiber_data_compatibility',
      profile,
      context,
      evaluation: {
        role_archetype: evaluation.roleArchetype,
        scores: evaluation.scores,
        verdict: evaluation.verdict,
        flags: evaluation.flags,
      },
    },
  };
};

// Build envelope from inputs (mirrors service implementation for testing)
const buildTestEnvelope = (
  upstreamInputs: UpstreamEvaluationInput[],
  options: { season: number; week: number; generatedAt: string; artifactPath?: string },
): RoleOpportunityLabEnvelope => {
  const { season, week, generatedAt } = options;
  const artifactPath = options.artifactPath ?? './data/role-opportunity/role_opportunity_lab.json';

  const rows = upstreamInputs.map((input) =>
    buildLabRowFromUpstreamInput(input, { season, week, generatedAt }),
  );

  // Stable sort by team:position:player_name:player_id
  rows.sort((left, right) =>
    `${left.team}:${left.position}:${left.player_name}:${left.player_id}`.localeCompare(
      `${right.team}:${right.position}:${right.player_name}:${right.player_id}`,
    ),
  );

  return {
    season,
    week,
    season_scope_marker: `season=${season};week=${week}`,
    available_seasons: [season],
    rows,
    source: {
      name: SERVICE_NAME,
      type: 'upstream_export',
      model_version: SERVICE_VERSION,
      generated_at: generatedAt,
      artifact_path: artifactPath,
      deterministic: true,
      upstream_scope: {
        season,
        week,
        player_count: upstreamInputs.length,
      },
    },
  };
};

test('buildLabRowFromUpstreamInput validates all required row fields', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  const requiredRowFields = [
    'player_id',
    'player_name',
    'team',
    'position',
    'season',
    'week',
    'primary_role',
    'role_tags',
    'route_participation',
    'target_share',
    'air_yard_share',
    'snap_share',
    'usage_rate',
    'confidence_score',
    'confidence_tier',
    'source_name',
    'source_type',
    'model_version',
    'generated_at',
    'insights',
    'raw_fields',
  ];

  for (const input of testInputs) {
    const row = buildLabRowFromUpstreamInput(input, {
      season: 2025,
      week: 4,
      generatedAt,
    });

    for (const key of requiredRowFields) {
      assert.ok(key in row, `missing row field ${key} in row for ${row.player_id}`);
    }
  }
});

test('buildLabRowFromUpstreamInput emits confidence_score on canonical 0.0-1.0 scale', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  for (const input of testInputs) {
    const row = buildLabRowFromUpstreamInput(input, {
      season: 2025,
      week: 4,
      generatedAt,
    });

    assert.ok(
      row.confidence_score >= 0 && row.confidence_score <= 1,
      `confidence_score out of canonical range for ${row.player_id}: ${row.confidence_score}`,
    );
  }
});

test('buildLabRowFromUpstreamInput includes upstream source metadata in raw_fields', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  for (const input of testInputs) {
    const row = buildLabRowFromUpstreamInput(input, {
      season: 2025,
      week: 4,
      generatedAt,
    });

    assert.equal(row.raw_fields.upstream_source, 'tiber_data_compatibility');
    assert.ok(row.raw_fields.profile, 'missing profile in raw_fields');
    assert.ok(row.raw_fields.context, 'missing context in raw_fields');
    assert.ok(row.raw_fields.evaluation, 'missing evaluation in raw_fields');
  }
});

test('buildTestEnvelope builds envelope with correct shape', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  const envelope = buildTestEnvelope(testInputs, {
    season: 2025,
    week: 4,
    generatedAt,
  });

  assert.equal(envelope.season, 2025);
  assert.equal(envelope.week, 4);
  assert.equal(envelope.season_scope_marker, 'season=2025;week=4');
  assert.deepEqual(envelope.available_seasons, [2025]);
  assert.ok(Array.isArray(envelope.rows));
  assert.equal(envelope.rows.length, 2);

  // Check source metadata for upstream export
  assert.equal(envelope.source.type, 'upstream_export');
  assert.ok(envelope.source.upstream_scope);
  assert.equal(envelope.source.upstream_scope?.season, 2025);
  assert.equal(envelope.source.upstream_scope?.week, 4);
  assert.equal(envelope.source.upstream_scope?.player_count, 2);
});

test('upstream envelope rows are sorted stably by team:position:player_name:player_id', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  const envelope = buildTestEnvelope(testInputs, {
    season: 2025,
    week: 4,
    generatedAt,
  });

  // Verify stable sort order
  for (let i = 1; i < envelope.rows.length; i++) {
    const prev = envelope.rows[i - 1];
    const curr = envelope.rows[i];
    const prevKey = `${prev.team}:${prev.position}:${prev.player_name}:${prev.player_id}`;
    const currKey = `${curr.team}:${curr.position}:${curr.player_name}:${curr.player_id}`;
    assert.ok(
      prevKey <= currKey,
      `rows not sorted: "${prevKey}" should be <= "${currKey}"`,
    );
  }
});

test('envelope with empty upstream inputs produces empty rows array', () => {
  const envelope = buildTestEnvelope([], {
    season: 2025,
    week: 4,
    generatedAt: '2025-01-01T00:00:00.000Z',
  });

  assert.equal(envelope.rows.length, 0);
  assert.equal(envelope.source.upstream_scope?.player_count, 0);
});

test('upstream export preserves player identity from upstream input', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  const envelope = buildTestEnvelope(testInputs, {
    season: 2025,
    week: 4,
    generatedAt,
  });

  // Verify player IDs match input
  assert.equal(envelope.rows[0].player_id, 'wr-alpha-001');
  assert.equal(envelope.rows[0].player_name, 'Atlas X');
  assert.equal(envelope.rows[1].player_id, 'wr-beta-002');
  assert.equal(envelope.rows[1].player_name, 'Blaze Y');
});

test('envelope source includes correct model metadata', () => {
  const testInputs = createTestInputs();
  const generatedAt = '2025-01-01T00:00:00.000Z';

  const envelope = buildTestEnvelope(testInputs, {
    season: 2025,
    week: 4,
    generatedAt,
  });

  assert.equal(envelope.source.name, SERVICE_NAME);
  assert.equal(envelope.source.model_version, SERVICE_VERSION);
  assert.equal(envelope.source.generated_at, generatedAt);
  assert.equal(envelope.source.deterministic, true);
});
