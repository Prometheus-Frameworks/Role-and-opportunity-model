import { buildEmptyUsageMetrics, validateInternalRoleOpportunityInput, validateRoleOpportunityRecord } from '../contracts/tiberDataRoleOpportunityV1.ts';
import type { InternalRoleOpportunityInput, RoleOpportunityRecord } from '../types/roleOpportunity.ts';

export class RoleOpportunityContractError extends Error {
  readonly details: { field: string; message: string }[];

  constructor(message: string, details: { field: string; message: string }[]) {
    super(message);
    this.name = 'RoleOpportunityContractError';
    this.details = details;
  }
}

export const confidenceScoreToTier = (score: number) => {
  if (score >= 75) {
    return 'high' as const;
  }

  if (score >= 50) {
    return 'medium' as const;
  }

  return 'low' as const;
};

const dedupeStrings = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim() !== ''))];

export const toTiberDataRoleOpportunityV1 = (input: InternalRoleOpportunityInput): RoleOpportunityRecord => {
  const validation = validateInternalRoleOpportunityInput(input);

  if (!validation.success || !validation.data) {
    throw new RoleOpportunityContractError('Unable to build canonical role-opportunity record.', validation.errors ?? []);
  }

  const usage = {
    ...buildEmptyUsageMetrics(),
    ...validation.data.usage,
  };

  const generatedAt = validation.data.generatedAt ?? new Date().toISOString();
  const confidenceReasons = dedupeStrings(validation.data.confidenceReasons);
  const notes = dedupeStrings([
    ...(validation.data.source.notes ?? []),
    ...Object.entries(usage)
      .filter(([, value]) => value === null)
      .map(([field]) => `${field} unavailable from current model inputs`),
  ]);

  const record: RoleOpportunityRecord = {
    playerId: validation.data.playerId,
    playerName: validation.data.playerName,
    team: validation.data.team,
    position: validation.data.position,
    season: validation.data.season,
    week: validation.data.week,
    primaryRole: validation.data.primaryRole ?? 'rotational_receiver',
    roleTags: dedupeStrings(validation.data.roleTags ?? ['adapter-generated']),
    usage,
    confidence: {
      score: validation.data.confidenceScore,
      tier: confidenceScoreToTier(validation.data.confidenceScore),
      reasons: confidenceReasons.length > 0 ? confidenceReasons : ['Deterministic role-opportunity adapter generated canonical output.'],
    },
    source: {
      model: validation.data.source.model,
      modelVersion: validation.data.source.modelVersion,
      generatedAt,
      inputWindow: validation.data.source.inputWindow,
      notes,
    },
  };

  const recordValidation = validateRoleOpportunityRecord(record);

  if (!recordValidation.success || !recordValidation.data) {
    throw new RoleOpportunityContractError('Canonical role-opportunity record failed validation.', recordValidation.errors ?? []);
  }

  return recordValidation.data;
};
