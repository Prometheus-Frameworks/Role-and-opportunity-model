import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.ts';
import { EXPLANATION_LEVELS, ROLE_EVALUATION_FLAGS, SCORE_BANDS, VERDICTS } from '../src/contracts/constants.ts';

import { tiberDataClient } from '../src/upstream/tiberDataClient.ts';

const withMockTiberFetch = async (handler: (url: URL) => Response | Promise<Response>, callback: () => Promise<void>) => {
  const originalFetch = (tiberDataClient as { fetchImpl: typeof fetch }).fetchImpl;

  (tiberDataClient as { fetchImpl: typeof fetch }).fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
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

test('GET /openapi.json returns machine-readable contract with canonical enums', async () => {
  const response = await app.fetch(new Request('http://local.test/openapi.json'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.openapi, '3.1.0');
  assert.deepEqual(body.components.schemas.ExplanationLevel.enum, [...EXPLANATION_LEVELS]);
  assert.deepEqual(body.components.schemas.Verdict.enum, [...VERDICTS]);
  assert.deepEqual(body.components.schemas.ScoreBand.enum, [...SCORE_BANDS]);
  assert.deepEqual(body.components.schemas.RoleEvaluationFlag.enum, [...ROLE_EVALUATION_FLAGS]);
  assert.ok(body.components.schemas.UpstreamRoleEvaluationRequest);
  assert.equal(body.paths['/api/evaluate/from-data'].post.requestBody.content['application/json'].schema.$ref, '#/components/schemas/UpstreamRoleEvaluationRequest');
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

test('GET /api/scenarios/:scenarioId returns 404 for bad id', async () => {
  const response = await app.fetch(new Request('http://local.test/api/scenarios/missing-scenario'));
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Scenario not found');
});

test('POST /api/evaluate returns 200 for valid body', async () => {
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
  assert.ok(Array.isArray(body.flags));
  assert.ok(body.flags.every((flag: string) => ROLE_EVALUATION_FLAGS.includes(flag)));
  assert.equal(body.evaluationMeta.explanationLevel, 'standard');
  assert.equal(body.scoreBands, undefined);
});

test('POST /api/evaluate supports full explanation level', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...validBody,
        explanationLevel: 'full',
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.evaluationMeta.explanationLevel, 'full');
  assert.ok(body.explanationBullets.length >= 5);
  assert.deepEqual(Object.keys(body.scoreBands).sort(), ['opportunityQuality', 'roleStability', 'roleValue', 'vacatedOpportunity']);
  assert.ok(SCORE_BANDS.includes(body.scoreBands.roleValue));
});

test('POST /api/evaluate returns 400 for invalid body', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        profile: { ...validBody.profile, position: 'RB' },
        context: { ...validBody.context, neutralPassRate: 101 },
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid role evaluation request');
  assert.ok(Array.isArray(body.details));
  assert.ok(body.details.some((detail: { field: string; message: string }) => detail.field === 'body.profile.position' && detail.message.includes('WR or TE')));
});

test('POST /api/evaluate/batch returns evaluated items with per-item metadata in strict mode', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        {
          ...validBody,
          explanationLevel: 'short',
        },
        {
          ...validBody,
          scenarioId: 'test-scenario-2',
          scenarioName: 'Test scenario two',
          profile: {
            ...validBody.profile,
            playerId: 'te-test-002',
            playerName: 'Second Player',
            position: 'TE',
            inlineRate: 61,
            wideRate: 17,
            slotRate: 22,
          },
          explanationLevel: 'full',
        },
      ]),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.meta.service, 'role-and-opportunity-model');
  assert.equal(body.items.length, 2);
  assert.equal(body.items[0].evaluationMeta.requestIndex, 0);
  assert.equal(body.items[0].evaluationMeta.explanationLevel, 'short');
  assert.equal(body.items[0].explanationBullets.length, 1);
  assert.equal(body.items[1].evaluationMeta.requestIndex, 1);
  assert.equal(body.items[1].evaluationMeta.explanationLevel, 'full');
  assert.ok(body.items[1].scoreBands);
});

test('POST /api/evaluate/batch preserves strict validation by default for envelope requests', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [
          validBody,
          {
            ...validBody,
            explanationLevel: 'verbose',
            context: { ...validBody.context, neutralPassRate: 101 },
          },
        ],
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid batch role evaluation request');
  assert.ok(body.details.some((detail: { field: string; message: string }) => detail.field === 'body[1].explanationLevel'));
  assert.ok(body.details.some((detail: { field: string; message: string }) => detail.field === 'body[1].context.neutralPassRate'));
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
  assert.deepEqual(body.summary, {
    requested: 2,
    succeeded: 1,
    failed: 1,
  });
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].requestIndex, 0);
  assert.equal(body.items[0].result.evaluationMeta.requestIndex, 0);
  assert.equal(body.errors.length, 1);
  assert.equal(body.errors[0].requestIndex, 1);
  assert.equal(body.errors[0].error, 'Invalid role evaluation request');
  assert.ok(body.errors[0].details.some((detail: { field: string; message: string }) => detail.field === 'body[1].profile.position'));
  assert.ok(body.errors[0].details.some((detail: { field: string; message: string }) => detail.field === 'body[1].context.neutralPassRate'));
});


test('POST /api/evaluate/from-data fetches TIBER-Data inputs and keeps deterministic scoring intact', async () => {
  await withMockTiberFetch((url) => {
    if (url.pathname === '/api/compatibility/player-role-profiles') {
      assert.equal(url.searchParams.get('player_id'), 'wr-test-001');
      assert.equal(url.searchParams.get('team'), 'Test Team');
      assert.equal(url.searchParams.get('season'), '2025');
      assert.equal(url.searchParams.get('week'), '4');

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
      new Request('http://local.test/api/evaluate/from-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player_id: 'wr-test-001',
          team: 'Test Team',
          season: 2025,
          week: 4,
          scenarioName: 'Upstream test scenario',
        }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.profile.playerId, 'wr-test-001');
    assert.equal(body.context.teamName, 'Test Team');
    assert.equal(body.scenarioName, 'Upstream test scenario');
    assert.equal(body.dataSource.name, 'TIBER-Data');
    assert.equal(body.dataSource.lookup.player_id, 'wr-test-001');
    assert.equal(body.evaluationMeta.explanationLevel, 'standard');
    assert.ok(VERDICTS.includes(body.verdict));
  });
});

test('POST /api/evaluate/from-data fails clearly when TIBER-Data results are ambiguous or incomplete', async () => {
  await withMockTiberFetch((url) => {
    if (url.pathname === '/api/compatibility/player-role-profiles') {
      return Response.json({
        dataset: 'player_role_profile_compatibility',
        count: 2,
        data: [
          { player_id: 'wr-test-001' },
          { player_id: 'wr-test-001-b' },
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
    const ambiguousResponse = await app.fetch(
      new Request('http://local.test/api/evaluate/from-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player_id: 'wr-test-001',
          team: 'Test Team',
        }),
      }),
    );
    const ambiguousBody = await ambiguousResponse.json();

    assert.equal(ambiguousResponse.status, 409);
    assert.match(ambiguousBody.error, /Ambiguous TIBER-Data player role profiles/);
  });

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
          },
        ],
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const incompleteResponse = await app.fetch(
      new Request('http://local.test/api/evaluate/from-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player_id: 'wr-test-001',
          team: 'Test Team',
        }),
      }),
    );
    const incompleteBody = await incompleteResponse.json();

    assert.equal(incompleteResponse.status, 502);
    assert.equal(incompleteBody.error, 'TIBER-Data team opportunity context was incomplete.');
    assert.ok(incompleteBody.details.some((detail: { field: string; message: string }) => detail.field === 'context.neutralPassRate'));
  });
});
