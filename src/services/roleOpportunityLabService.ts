import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seededScenarios } from '../data/scenarios/index.ts';
import { confidenceScoreToTier } from '../adapters/tiberDataRoleOpportunityV1.ts';
import { buildRoleOpportunityInputFromEvaluation } from './roleOpportunityService.ts';
import { SERVICE_NAME, SERVICE_VERSION } from '../config/service.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';
import type { RoleOpportunityLabEnvelope, RoleOpportunityLabRow } from '../types/roleOpportunityLab.ts';

export const DEFAULT_ROLE_OPPORTUNITY_LAB_EXPORT_PATH = './data/role-opportunity/role_opportunity_lab.json';
export const DEFAULT_LAB_GENERATED_AT = '2025-01-01T00:00:00.000Z';

export const getRoleOpportunityLabExportPath = () =>
  process.env.ROLE_OPPORTUNITY_EXPORTS_PATH?.trim() || DEFAULT_ROLE_OPPORTUNITY_LAB_EXPORT_PATH;

const stableSortRows = (rows: RoleOpportunityLabRow[]) =>
  rows
    .slice()
    .sort((left, right) =>
      `${left.team}:${left.position}:${left.player_name}:${left.player_id}`.localeCompare(
        `${right.team}:${right.position}:${right.player_name}:${right.player_id}`,
      ),
    );

export const buildRoleOpportunityLabEnvelope = (options: {
  season: number;
  week: number;
  generatedAt?: string;
  artifactPath?: string;
}): RoleOpportunityLabEnvelope => {
  const generatedAt = options.generatedAt ?? DEFAULT_LAB_GENERATED_AT;
  const artifactPath = options.artifactPath ?? getRoleOpportunityLabExportPath();

  const rows = stableSortRows(
    seededScenarios.map((scenario) => {
      const evaluation = evaluateRoleProfile(scenario, { explanationLevel: 'standard' });
      const canonicalInput = buildRoleOpportunityInputFromEvaluation(evaluation, {
        season: options.season,
        week: options.week,
        generatedAt,
        inputWindow: `season=${options.season};week=${options.week}`,
      });

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
        confidence_score: canonicalInput.confidenceScore,
        confidence_tier: confidenceScoreToTier(canonicalInput.confidenceScore),
        source_name: SERVICE_NAME,
        source_type: 'deterministic_model',
        model_version: SERVICE_VERSION,
        generated_at: generatedAt,
        insights: [evaluation.primaryReason, evaluation.riskNote, ...evaluation.explanationBullets]
          .filter((insight): insight is string => typeof insight === 'string' && insight.length > 0)
          .slice(0, 5),
        raw_fields: {
          scenario_id: scenario.scenarioId,
          scenario_name: scenario.scenarioName,
          profile: scenario.profile,
          context: scenario.context,
          evaluation: {
            role_archetype: evaluation.roleArchetype,
            scores: evaluation.scores,
            verdict: evaluation.verdict,
            flags: evaluation.flags,
          },
        },
      } satisfies RoleOpportunityLabRow;
    }),
  );

  return {
    season: options.season,
    week: options.week,
    season_scope_marker: `season=${options.season};week=${options.week}`,
    available_seasons: [options.season],
    rows,
    source: {
      name: SERVICE_NAME,
      type: 'deterministic_export',
      model_version: SERVICE_VERSION,
      generated_at: generatedAt,
      artifact_path: artifactPath,
      deterministic: true,
    },
  };
};

export const exportRoleOpportunityLabArtifact = async (options: {
  season: number;
  week: number;
  generatedAt?: string;
  outputPath?: string;
}) => {
  const outputPath = options.outputPath ?? getRoleOpportunityLabExportPath();
  const resolvedOutputPath = path.resolve(outputPath);
  const envelope = buildRoleOpportunityLabEnvelope({
    season: options.season,
    week: options.week,
    generatedAt: options.generatedAt,
    artifactPath: outputPath,
  });

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf-8');

  return {
    outputPath,
    resolvedOutputPath,
    envelope,
  };
};

export const readRoleOpportunityLabArtifact = async (artifactPath = getRoleOpportunityLabExportPath()) => {
  const resolvedPath = path.resolve(artifactPath);
  const contents = await readFile(resolvedPath, 'utf-8');
  return JSON.parse(contents) as RoleOpportunityLabEnvelope;
};

export const filterRoleOpportunityLabEnvelope = (
  envelope: RoleOpportunityLabEnvelope,
  options: { season?: number; week?: number },
): RoleOpportunityLabEnvelope => {
  const season = options.season ?? envelope.season;
  const week = options.week ?? envelope.week;

  return {
    ...envelope,
    season,
    week,
    season_scope_marker: `season=${season};week=${week}`,
    rows: envelope.rows.filter((row) => row.season === season && row.week === week),
  };
};
