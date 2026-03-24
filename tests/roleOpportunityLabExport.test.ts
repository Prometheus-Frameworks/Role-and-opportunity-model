import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { app } from '../src/app.ts';
import { exportRoleOpportunityLabArtifact } from '../src/services/roleOpportunityLabService.ts';

const withLabPath = async (labPath: string, callback: () => Promise<void>) => {
  const original = process.env.ROLE_OPPORTUNITY_EXPORTS_PATH;
  process.env.ROLE_OPPORTUNITY_EXPORTS_PATH = labPath;

  try {
    await callback();
  } finally {
    if (original === undefined) {
      delete process.env.ROLE_OPPORTUNITY_EXPORTS_PATH;
    } else {
      process.env.ROLE_OPPORTUNITY_EXPORTS_PATH = original;
    }
  }
};

test('exports deterministic role-opportunity lab artifact with expected envelope shape', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'role-opportunity-lab-'));
  const outputPath = path.join(tempDir, 'role_opportunity_lab.json');

  const result = await exportRoleOpportunityLabArtifact({
    season: 2025,
    week: 4,
    generatedAt: '2025-01-01T00:00:00.000Z',
    outputPath,
  });

  const raw = await readFile(result.resolvedOutputPath, 'utf-8');
  const artifact = JSON.parse(raw);

  assert.equal(artifact.season, 2025);
  assert.equal(artifact.week, 4);
  assert.equal(artifact.season_scope_marker, 'season=2025;week=4');
  assert.deepEqual(artifact.available_seasons, [2025]);
  assert.ok(Array.isArray(artifact.rows));
  assert.ok(artifact.rows.length >= 4);

  const row = artifact.rows[0];
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

  for (const key of requiredRowFields) {
    assert.ok(key in row, `missing row field ${key}`);
  }

  for (const artifactRow of artifact.rows) {
    assert.ok(
      artifactRow.confidence_score >= 0 && artifactRow.confidence_score <= 1,
      `confidence_score out of canonical range: ${artifactRow.confidence_score}`,
    );
  }
});

test('GET /api/role-opportunity/lab serves artifact and supports season/week filtering', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'role-opportunity-lab-'));
  const outputPath = path.join(tempDir, 'role_opportunity_lab.json');

  const exported = await exportRoleOpportunityLabArtifact({
    season: 2025,
    week: 4,
    generatedAt: '2025-01-01T00:00:00.000Z',
    outputPath,
  });

  await withLabPath(outputPath, async () => {
    const matching = await app.fetch(new Request('http://local.test/api/role-opportunity/lab?season=2025&week=4'));
    const matchingBody = await matching.json();

    assert.equal(matching.status, 200);
    assert.equal(matchingBody.season_scope_marker, 'season=2025;week=4');
    assert.ok(matchingBody.rows.length >= 4);

    const nonMatching = await app.fetch(new Request('http://local.test/api/role-opportunity/lab?season=2025&week=5'));
    const nonMatchingBody = await nonMatching.json();

    assert.equal(nonMatching.status, 200);
    assert.equal(nonMatchingBody.rows.length, 0);
    assert.equal(nonMatchingBody.season_scope_marker, 'season=2025;week=5');

    const byPlayer = new Map<string, number>(
      exported.envelope.rows.map((row) => [row.player_id, row.confidence_score]),
    );

    for (const row of matchingBody.rows as Array<{ player_id: string; confidence_score: number }>) {
      assert.equal(row.confidence_score, byPlayer.get(row.player_id));
      assert.ok(row.confidence_score >= 0 && row.confidence_score <= 1);
    }
  });
});
