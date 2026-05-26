import type { RoleOpportunityProfileV0, RoleOpportunityEvidenceItemV0, RouteParticipationStatusV0 } from '../types/roleOpportunityProfileV0.ts';
import type { RoleOpportunityRecord } from '../types/roleOpportunity.ts';

const routeParticipationStatusFromEvidence = (hasSourceBackedRouteParticipation: boolean, routeParticipation: number | null): RouteParticipationStatusV0 => {
  if (hasSourceBackedRouteParticipation) {
    return 'source_backed';
  }

  if (routeParticipation === null) {
    return 'missing';
  }

  return 'proxy';
};

const defaultFixtureWarnings = [
  'fixture input is not governed real-player source truth',
  'route participation is deterministic model output and not source-backed',
];

const toSupportedPosition = (position: RoleOpportunityRecord['position']) => {
  if (position === 'WR' || position === 'TE') {
    return position;
  }

  throw new Error(
    `Unsupported role-opportunity position for RoleOpportunityProfileV0 adapter: ${position}. Supported positions are WR and TE.`,
  );
};

export const toRoleOpportunityProfileV0 = (input: {
  record: RoleOpportunityRecord;
  sourceArtifacts: string[];
  generatedAt?: string;
  hasSourceBackedRouteParticipation?: boolean;
  additionalEvidence?: RoleOpportunityEvidenceItemV0[];
  additionalWarnings?: string[];
}): RoleOpportunityProfileV0 => {
  const generatedAt = input.generatedAt ?? input.record.source.generatedAt;
  const hasSourceBackedRouteParticipation = input.hasSourceBackedRouteParticipation ?? false;
  const routeParticipationStatus = routeParticipationStatusFromEvidence(
    hasSourceBackedRouteParticipation,
    input.record.usage.routeParticipation,
  );

  const evidence: RoleOpportunityEvidenceItemV0[] = [
    {
      field: 'role_opportunity_record',
      source: input.record.source.model,
      sourceType: 'model_output',
      generatedAt,
      notes: 'Deterministic canonical role-opportunity record used as adapter input.',
    },
    {
      field: 'routeParticipation',
      source: input.record.source.model,
      sourceType: hasSourceBackedRouteParticipation ? 'source_backed' : input.record.usage.routeParticipation === null ? 'missing' : 'proxy',
      generatedAt,
      notes: hasSourceBackedRouteParticipation
        ? 'Route participation was explicitly provided as source-backed.'
        : 'Route participation is not source-backed in this scaffold export.',
    },
    ...(input.additionalEvidence ?? []),
  ];

  const warnings = [...new Set([...defaultFixtureWarnings, ...(input.additionalWarnings ?? [])])];
  const missingRequiredFields = hasSourceBackedRouteParticipation ? [] : ['source-backed route participation'];

  return {
    contractVersion: 'role_opportunity_profile_v0',
    playerId: input.record.playerId,
    playerName: input.record.playerName,
    team: input.record.team,
    position: toSupportedPosition(input.record.position),
    season: input.record.season,
    week: input.record.week,
    generatedAt,
    inputWindow: input.record.source.inputWindow,
    primaryRole: input.record.primaryRole,
    roleTags: input.record.roleTags,
    usage: {
      snapShare: input.record.usage.snapShare,
      routeParticipation: input.record.usage.routeParticipation,
      routeParticipationStatus,
      targetShare: input.record.usage.targetShare,
      targetsPerRouteRun: null,
      airYardShare: input.record.usage.airYardShare,
      redZoneTargetShare: input.record.usage.redZoneTouchShare,
      firstReadShare: null,
      slotRate: null,
      wideRate: null,
      averageDepthOfTarget: null,
      ...(input.record.position === 'TE' ? { inlineRate: null, detachedRate: null } : {}),
    },
    roleQuality: {
      roleScore: null,
      opportunityScore: null,
      stabilityScore: null,
      targetEarningScore: null,
      deploymentQualityScore: null,
      competitionRiskScore: null,
      confidenceScore: input.record.confidence.score,
      confidenceTier: input.record.confidence.tier,
      confidenceReasons: input.record.confidence.reasons,
    },
    teamContext: null,
    evidence,
    warnings,
    readiness: {
      readyForFantasyInspection: true,
      readyForForgeScoring: false,
      missingRequiredFields,
      blockingWarnings: warnings,
    },
  };
};
