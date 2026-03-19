import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.ts';

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
  assert.ok(['strong', 'solid', 'mixed', 'weak'].includes(body.verdict));
  assert.ok(Array.isArray(body.flags));
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

test('POST /api/evaluate/batch returns evaluated items with per-item metadata', async () => {
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

test('POST /api/evaluate/batch returns 400 for invalid payload', async () => {
  const response = await app.fetch(
    new Request('http://local.test/api/evaluate/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        validBody,
        {
          ...validBody,
          explanationLevel: 'verbose',
          context: { ...validBody.context, neutralPassRate: 101 },
        },
      ]),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Invalid batch role evaluation request');
  assert.ok(body.details.some((detail: { field: string; message: string }) => detail.field === 'body[1].explanationLevel'));
  assert.ok(body.details.some((detail: { field: string; message: string }) => detail.field === 'body[1].context.neutralPassRate'));
});
