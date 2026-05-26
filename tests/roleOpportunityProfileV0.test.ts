import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildRoleOpportunityProfileArtifactV0, exportRoleOpportunityProfilesV0Artifact } from '../src/services/roleOpportunityProfileExportService.ts';

test('builds role_opportunity_profiles_v0 artifact with WR/TE profiles and fixture readiness guardrails', () => {
  const artifact = buildRoleOpportunityProfileArtifactV0({
    season: 2025,
    week: 1,
    generatedAt: '2025-01-01T00:00:00.000Z',
  });

  assert.equal(artifact.artifact, 'role_opportunity_profiles_v0');
  assert.equal(artifact.week, 1);
  assert.ok(Array.isArray(artifact.profiles));
  assert.ok(artifact.profiles.length >= 2);

  const wrProfile = artifact.profiles.find((profile) => profile.position === 'WR');
  const teProfile = artifact.profiles.find((profile) => profile.position === 'TE');

  assert.ok(wrProfile);
  assert.ok(teProfile);

  assert.equal(wrProfile?.contractVersion, 'role_opportunity_profile_v0');
  assert.equal(wrProfile?.usage.routeParticipationStatus, wrProfile?.usage.routeParticipation === null ? 'missing' : 'proxy');
  assert.equal(teProfile?.usage.routeParticipationStatus, teProfile?.usage.routeParticipation === null ? 'missing' : 'proxy');

  assert.equal(wrProfile?.readiness.readyForFantasyInspection, true);
  assert.equal(wrProfile?.readiness.readyForForgeScoring, false);
  assert.ok(wrProfile?.readiness.missingRequiredFields.includes('source-backed route participation'));
  assert.ok(wrProfile?.readiness.blockingWarnings.includes('fixture input is not governed real-player source truth'));
  assert.ok(wrProfile?.evidence.some((item) => item.field === 'routeParticipation' && item.sourceType !== 'source_backed'));
});

test('exports role_opportunity_profiles_v0 artifact to a governed path without changing lab artifact naming', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'role-opportunity-profiles-v0-'));
  const outputPath = path.join(tempDir, 'role_opportunity_profiles_v0.json');

  const result = await exportRoleOpportunityProfilesV0Artifact({
    season: 2025,
    week: 1,
    outputPath,
    generatedAt: '2025-01-01T00:00:00.000Z',
  });

  const raw = await readFile(result.resolvedOutputPath, 'utf-8');
  const artifact = JSON.parse(raw);

  assert.equal(artifact.artifact, 'role_opportunity_profiles_v0');
  assert.equal(artifact.season, 2025);
  assert.equal(artifact.week, 1);
  assert.ok(Array.isArray(artifact.sourceArtifacts));
  assert.ok(artifact.sourceArtifacts.includes('fixture:seeded_scenarios'));
  assert.ok(Array.isArray(artifact.profiles));
  assert.ok(artifact.profiles.every((profile: { readiness: { readyForForgeScoring: boolean } }) => profile.readiness.readyForForgeScoring === false));
});
