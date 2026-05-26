export type SupportedRoleOpportunityPositionV0 = 'WR' | 'TE';

export type FutureRoleOpportunityPositionV0 = 'RB';

export type RoleOpportunityEvidenceSourceTypeV0 =
  | 'source_backed'
  | 'proxy'
  | 'derived'
  | 'model_output'
  | 'missing';

export type RouteParticipationStatusV0 = 'source_backed' | 'proxy' | 'missing';

export interface RoleOpportunityProfileArtifactV0 {
  artifact: 'role_opportunity_profiles_v0';
  generatedAt: string;
  season: number;
  week: number | null;
  sourceArtifacts: string[];
  profiles: RoleOpportunityProfileV0[];
}

export interface RoleOpportunityProfileV0 {
  contractVersion: 'role_opportunity_profile_v0';
  playerId: string;
  playerName: string;
  team: string;
  position: SupportedRoleOpportunityPositionV0;
  season: number;
  week: number | null;
  generatedAt: string;
  inputWindow: string | null;
  primaryRole: string;
  roleTags: string[];
  usage: ReceiverUsageBlockV0 | TightEndUsageBlockV0;
  roleQuality: RoleQualityBlockV0;
  teamContext: TeamContextAttachmentV0 | null;
  evidence: RoleOpportunityEvidenceItemV0[];
  warnings: string[];
  readiness: RoleOpportunityReadinessV0;
}

export interface ReceiverUsageBlockV0 {
  snapShare: number | null;
  routeParticipation: number | null;
  routeParticipationStatus: RouteParticipationStatusV0;
  targetShare: number | null;
  targetsPerRouteRun: number | null;
  airYardShare: number | null;
  redZoneTargetShare: number | null;
  firstReadShare: number | null;
  slotRate: number | null;
  wideRate: number | null;
  averageDepthOfTarget: number | null;
}

export interface TightEndUsageBlockV0 extends ReceiverUsageBlockV0 {
  inlineRate: number | null;
  detachedRate: number | null;
}

export interface RoleQualityBlockV0 {
  roleScore: number | null;
  opportunityScore: number | null;
  stabilityScore: number | null;
  targetEarningScore: number | null;
  deploymentQualityScore: number | null;
  competitionRiskScore: number | null;
  confidenceScore: number;
  confidenceTier: 'low' | 'medium' | 'high';
  confidenceReasons: string[];
}

export interface TeamContextAttachmentV0 {
  source: 'TIBER-Teamstate';
  artifact: 'team_environment_profiles_v0';
  teamAbbr: string;
  offenseTier: 'elite' | 'strong' | 'average' | 'weak' | 'unknown';
  passEnvironmentTier: 'pass_heavy' | 'balanced' | 'run_heavy' | 'unknown';
  paceTier: 'fast' | 'neutral' | 'slow' | 'unknown';
  volatilityTier: 'stable' | 'volatile' | 'unknown';
  warnings: string[];
}

export interface RoleOpportunityEvidenceItemV0 {
  field: string;
  source: string;
  sourceType: RoleOpportunityEvidenceSourceTypeV0;
  generatedAt?: string;
  sourceSnapshotAt?: string | null;
  notes?: string;
}

export interface RoleOpportunityReadinessV0 {
  readyForFantasyInspection: boolean;
  readyForForgeScoring: boolean;
  missingRequiredFields: string[];
  blockingWarnings: string[];
}

export interface RunningBackUsageBlockV0 {
  snapShare: number | null;
  carryShare: number | null;
  rushAttemptShare: number | null;
  targetShare: number | null;
  routeParticipation: number | null;
  routeParticipationStatus: RouteParticipationStatusV0;
  redZoneTouchShare: number | null;
  inside10TouchShare: number | null;
  inside5TouchShare: number | null;
  goalLineCarryShare: number | null;
  twoMinuteSnapShare: number | null;
  thirdDownSnapShare: number | null;
  teamOpportunityShare: number | null;
}
