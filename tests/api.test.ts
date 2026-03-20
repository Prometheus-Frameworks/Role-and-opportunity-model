import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.ts';
import { CONFIDENCE_TIERS, PRIMARY_ROLES } from '../src/contracts/tiberDataRoleOpportunityV1.ts';
import { EXPLANATION_LEVELS, ROLE_EVALUATION_FLAGS, SCORE_BANDS, VERDICTS } from '../src/contracts/constants.ts';
import { tiberDataClient } from '../src/upstream/tiberDataClient.ts';

const withMockTiberFetch = async (handler: (url: URL) => Response | Promise<Response>, callback: () => Promise<void>) => {
  const originalFetch = (tiberDataClient as { fetchImpl: typeof fetch }).fetchImpl;

  (tiberDataClient as { fetchImpl: typeof fetch }).fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
    return handler(url);
  }) as typeof fetch;

  try {
    await callback();
  } finally {
    (tiberDataClient as { fetchImpl: typeof fetch }).fetchImpl = originalFetch;
  }
};

const validBody = {
  profile: {
    playerId: 'wr-test-001',
    playerName: 'Test Player',
    position: 'WR',
    targetShare: 26,
    airYardShare: 31,
    routeParticipation: 88,
    slotRate: 32,
    inlineRate: 0,
    wideRate: 68,
    redZoneTargetShare: 24,
    firstReadShare: 27,
    averageDepthOfTarget: 12.7,
    explosiveTargetRate: 15,
    personnelVersatility: 69,
    competitionForRole: 29,
    injuryRisk: 17,
    vacatedTargetsAvailable: 43,
  },
  context: {
    teamId: 'TM-TST',
    teamName: 'Test Team',
    passRateOverExpected: 5,
    neutralPassRate: 60,
    redZonePassRate: 58,
    paceIndex: 64,
    quarterbackStability: 75,
    playCallerContinuity: 71,
    targetCompetitionIndex: 44,
    receiverRoomCertainty: 73,
    vacatedTargetShare: 29,
  },
  scenarioId: 'test-scenario',
  scenarioName: 'Test scenario',
};

test('GET /health returns 200', async () => {
  const response = await app.fetch(new Request('http://local.test/health'));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'role-and-opportunity-model',
  });
});

test('GET /ready returns readiness details', async () => {
  const response = await app.fetch(new Request('http://local.test/ready'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.checks.config, true);
  assert.match(body.checks.upstreamBaseUrl, /^http/);
});

test('GET /openapi.json returns machine-readable contract with canonical enums', async () => {
  const response = await app.fetch(new Request('http://local.test/openapi.json'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.openapi, '3.1.0');
  assert.deepEqual(body.components.schemas.ExplanationLevel.enum, [...EXPLANATION_LEVELS]);
  assert.deepEqual(body.components.schemas.Verdict.enum, [...VERDICTS]);
  assert.deepEqual(body.components.schemas.ScoreBand.enum, [...SCORE_BANDS]);
  assert.deepEqual(body.components.schemas.RoleEvaluationFlag.enum, [...ROLE_EVALUATION_FLAGS]);
  assert.deepEqual(body.components.schemas.PrimaryRole.enum, [...PRIMARY_ROLES]);
  assert.deepEqual(body.components.schemas.ConfidenceTier.enum, [...CONFIDENCE_TIERS]);
  assert.ok(body.components.schemas.RoleOpportunityRecord);
  assert.equal(body.paths['/api/role-opportunity'].post.requestBody.content['application/json'].schema.$ref, '#/components/schemas/CanonicalRoleOpportunityRequest');
  assert.equal(body.paths['/api/role-opportunity/from-data'].post.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/CanonicalRoleOpportunityEnvelope');
  assert.equal(body.paths['/api/evaluate/batch'].post.responses['200'].content['application/json'].examples.partialSuccess.value.summary.failed, 1);
});

test('GET /api/scenarios returns seeded scenario list', async () => {
  const response = await app.fetch(new Request('http://local.test/api/scenarios'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.scenarios));
  assert.ok(body.scenarios.length >= 4);
  assert.deepEqual(Object.keys(body.scenarios[0]).sort(), ['playerName', 'position', 'scenarioId', 'scenarioName', 'summary']);
});

test('POST /api/evaluate returns raw internal evaluation output', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.scenarioId, 'test-scenario');
  assert.equal(body.profile.playerName, 'Test Player');
  assert.equal(body.meta.service, 'role-and-opportunity-model');
  assert.ok(VERDICTS.includes(body.verdict));
  assert.ok(body.flags.every((flag: string) => ROLE_EVALUATION_FLAGS.includes(flag)));
});

test('POST /api/role-opportunity returns canonical role-opportunity output plus internal evaluation', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/role-opportunity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...validBody,
        season: 2025,
        week: 4,
        explanationLevel: 'full',
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.roleOpportunityRecord.playerId, 'wr-test-001');
  assert.equal(body.roleOpportunityRecord.season, 2025);
  assert.equal(body.roleOpportunityRecord.week, 4);
  assert.ok(PRIMARY_ROLES.includes(body.roleOpportunityRecord.primaryRole));
  assert.equal(body.roleOpportunityRecord.usage.routeParticipation, 88);
  assert.equal(body.roleOpportunityRecord.usage.targetShare, 26);
  assert.ok(CONFIDENCE_TIERS.includes(body.roleOpportunityRecord.confidence.tier));
  assert.equal(body.internalEvaluation.evaluationMeta.explanationLevel, 'full');
});

test('POST /api/role-opportunity fails loudly when canonical scope is missing', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/role-opportunity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid canonical role-opportunity request');
  assert.ok(body.details.some((detail: { field: string }) => detail.field === 'body.season'));
  assert.ok(body.details.some((detail: { field: string }) => detail.field === 'body.week'));
});

test('POST /api/evaluate/batch supports partial success mode with indexed errors', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            ...validBody,
            explanationLevel: 'short',
          },
          {
            ...validBody,
            profile: { ...validBody.profile, position: 'RB' },
            context: { ...validBody.context, neutralPassRate: 101 },
          },
        ],
        options: {
          strict: false,
        },
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.partialSuccess, true);
  assert.equal(body.items.length, 1);
  assert.equal(body.errors.length, 1);
  assert.equal(body.errors[0].requestIndex, 1);
});

test('POST /api/role-opportunity/from-data fetches TIBER-Data inputs and returns canonical output', async () => {
  await withMockTiberFetch((url) => {
    if (url.pathname === '/api/compatibility/player-role-profiles') {
      return Response.json({
        dataset: 'player_role_profile_compatibility',
        count: 1,
        data: [
          {
            player_id: 'wr-test-001',
            player_name: 'Test Player',
            position: 'WR',
            target_share: 26,
            air_yard_share: 31,
            route_participation: 88,
            slot_rate: 32,
            inline_rate: 0,
            wide_rate: 68,
            red_zone_target_share: 24,
            first_read_share: 27,
            average_depth_of_target: 12.7,
            explosive_target_rate: 15,
            personnel_versatility: 69,
            competition_for_role: 29,
            injury_risk: 17,
            vacated_targets_available: 43,
          },
        ],
      });
    }

    if (url.pathname === '/api/compatibility/team-opportunity-context') {
      return Response.json({
        dataset: 'team_opportunity_context_compatibility',
        count: 1,
        data: [
          {
            team_id: 'TM-TST',
            team_name: 'Test Team',
            pass_rate_over_expected: 5,
            neutral_pass_rate: 60,
            red_zone_pass_rate: 58,
            pace_index: 64,
            quarterback_stability: 75,
            play_caller_continuity: 71,
            target_competition_index: 44,
            receiver_room_certainty: 73,
            vacated_target_share: 29,
          },
        ],
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const response = await app.fetch(
      new Request('http://local.test/api/role-opportunity/from-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player_id: 'wr-test-001',
          team: 'Test Team',
          season: 2025,
          week: 4,
        }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.roleOpportunityRecord.playerId, 'wr-test-001');
    assert.equal(body.roleOpportunityRecord.source.inputWindow, 'season=2025;week=4');
    assert.ok(body.roleOpportunityRecord.source.notes.some((note: string) => note.includes('Fetched source inputs')));
    assert.equal(body.internalEvaluation.profile.playerId, 'wr-test-001');
  });
});

test('POST /api/role-opportunity/from-data requires season and week', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/role-opportunity/from-data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        player_id: 'wr-test-001',
        team: 'Test Team',
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid canonical role-opportunity request');
  assert.ok(body.details.some((detail: { field: string }) => detail.field === 'body.season'));
  assert.ok(body.details.some((detail: { field: string }) => detail.field === 'body.week'));
});
