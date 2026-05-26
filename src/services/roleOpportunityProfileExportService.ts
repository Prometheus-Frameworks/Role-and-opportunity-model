import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seededScenarios } from '../data/scenarios/index.ts';
import { toTiberDataRoleOpportunityV1 } from '../adapters/tiberDataRoleOpportunityV1.ts';
import { toRoleOpportunityProfileV0 } from '../adapters/toRoleOpportunityProfileV0.ts';
import { buildRoleOpportunityInputFromEvaluation } from './roleOpportunityService.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';
import type { RoleOpportunityProfileArtifactV0 } from '../types/roleOpportunityProfileV0.ts';

export const DEFAULT_ROLE_OPPORTUNITY_PROFILE_EXPORT_PATH =
  './data/role-opportunity/role_opportunity_profiles_v0.json';
export const DEFAULT_PROFILE_GENERATED_AT = '2025-01-01T00:00:00.000Z';

export const getRoleOpportunityProfileExportPath = () =>
  process.env.ROLE_OPPORTUNITY_PROFILE_EXPORT_PATH?.trim() || DEFAULT_ROLE_OPPORTUNITY_PROFILE_EXPORT_PATH;

export const buildRoleOpportunityProfileArtifactV0 = (options: {
  season: number;
  week: number | null;
  generatedAt?: string;
  sourceArtifacts?: string[];
}): RoleOpportunityProfileArtifactV0 => {
  const generatedAt = options.generatedAt ?? DEFAULT_PROFILE_GENERATED_AT;
  const weekForInput = options.week ?? 1;
  const sourceArtifacts =
    options.sourceArtifacts ?? ['fixture:seeded_scenarios', 'deterministic:internal_role_evaluation'];

  const profiles = seededScenarios
    .filter((scenario) => scenario.profile.position === 'WR' || scenario.profile.position === 'TE')
    .map((scenario) => {
      const evaluation = evaluateRoleProfile(scenario, { explanationLevel: 'standard' });
      const canonicalInput = buildRoleOpportunityInputFromEvaluation(evaluation, {
        season: options.season,
        week: weekForInput,
        generatedAt,
        inputWindow: `season=${options.season};week=${options.week ?? 'null'};fixture=true`,
        sourceNotes: ['Fixture/demo scenario used for governed profile scaffold export.'],
      });
      const record = toTiberDataRoleOpportunityV1(canonicalInput);

      return toRoleOpportunityProfileV0({
        record,
        sourceArtifacts,
        generatedAt,
        hasSourceBackedRouteParticipation: false,
        additionalEvidence: [
          {
            field: 'fixtureScenarioId',
            source: 'seededScenarios',
            sourceType: 'derived',
            notes: `Fixture scenario: ${scenario.scenarioId}`,
          },
        ],
      });
    })
    .sort((left, right) =>
      `${left.team}:${left.position}:${left.playerName}:${left.playerId}`.localeCompare(
        `${right.team}:${right.position}:${right.playerName}:${right.playerId}`,
      ),
    );

  return {
    artifact: 'role_opportunity_profiles_v0',
    generatedAt,
    season: options.season,
    week: options.week,
    sourceArtifacts,
    profiles,
  };
};

export const exportRoleOpportunityProfilesV0Artifact = async (options: {
  season: number;
  week: number | null;
  generatedAt?: string;
  outputPath?: string;
  sourceArtifacts?: string[];
}) => {
  const outputPath = options.outputPath ?? getRoleOpportunityProfileExportPath();
  const resolvedOutputPath = path.resolve(outputPath);

  const artifact = buildRoleOpportunityProfileArtifactV0(options);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf-8');

  return { outputPath, resolvedOutputPath, artifact };
};
