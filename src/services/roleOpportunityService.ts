import { toTiberDataRoleOpportunityV1 } from '../adapters/tiberDataRoleOpportunityV1.ts';
import { buildMeta, SERVICE_NAME, SERVICE_VERSION } from '../config/service.ts';
import type { RoleArchetype } from '../types/playerRole.ts';
import type { RoleEvaluationOutput } from '../types/roleOutput.ts';
import type { CanonicalRoleOpportunityEnvelope, InternalRoleOpportunityInput, PrimaryRole } from '../types/roleOpportunity.ts';

const mapRoleArchetypeToPrimaryRole = (roleArchetype: RoleArchetype, position: RoleEvaluationOutput['profile']['position']): PrimaryRole => {
  switch (roleArchetype) {
    case 'WR1':
      return 'alpha_receiver';
    case 'WR2':
      return 'secondary_receiver';
    case 'SLOT':
      return 'slot_receiver';
    case 'FIELD_STRETCHER':
      return 'field_stretcher';
    case 'TE1':
      return 'primary_tight_end';
    case 'HYBRID':
      return 'hybrid_weapon';
    case 'ROTATIONAL':
      return position === 'TE' ? 'primary_tight_end' : 'rotational_receiver';
    default:
      return 'rotational_receiver';
  }
};

const tagFlag = (flag: string) => `flag:${flag}`;

export const buildRoleOpportunityInputFromEvaluation = (
  evaluation: RoleEvaluationOutput,
  options: {
    season: number;
    week: number;
    inputWindow?: string;
    generatedAt?: string;
    sourceNotes?: string[];
  },
): InternalRoleOpportunityInput => ({
  playerId: evaluation.profile.playerId,
  playerName: evaluation.profile.playerName,
  team: evaluation.context.teamName,
  position: evaluation.profile.position,
  season: options.season,
  week: options.week,
  primaryRole: mapRoleArchetypeToPrimaryRole(evaluation.roleArchetype, evaluation.profile.position),
  roleTags: [
    evaluation.roleArchetype.toLowerCase(),
    `position:${evaluation.profile.position.toLowerCase()}`,
    ...evaluation.flags.map(tagFlag),
  ],
  usage: {
    routeParticipation: evaluation.profile.routeParticipation,
    targetShare: evaluation.profile.targetShare,
    airYardShare: evaluation.profile.airYardShare,
  },
  confidenceScore: evaluation.compositeScore,
  confidenceReasons: [
    evaluation.primaryReason,
    evaluation.riskNote,
    ...evaluation.explanationBullets.slice(0, 2),
  ],
  generatedAt: options.generatedAt,
  source: {
    model: SERVICE_NAME,
    modelVersion: SERVICE_VERSION,
    inputWindow: options.inputWindow ?? `season=${options.season};week=${options.week}`,
    notes: [
      'Derived from internal deterministic role evaluation output.',
      'Only metrics directly supported by the current model are populated; unsupported canonical metrics remain null.',
      ...(options.sourceNotes ?? []),
    ],
  },
});

export const buildCanonicalRoleOpportunityEnvelope = (
  evaluation: RoleEvaluationOutput,
  options: Parameters<typeof buildRoleOpportunityInputFromEvaluation>[1],
): CanonicalRoleOpportunityEnvelope => ({
  meta: buildMeta(),
  roleOpportunityRecord: toTiberDataRoleOpportunityV1(buildRoleOpportunityInputFromEvaluation(evaluation, options)),
  internalEvaluation: evaluation,
});
