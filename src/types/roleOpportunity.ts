export type RoleOpportunityPosition = 'QB' | 'RB' | 'WR' | 'TE';

export type PrimaryRole =
  | 'alpha_receiver'
  | 'secondary_receiver'
  | 'slot_receiver'
  | 'field_stretcher'
  | 'primary_tight_end'
  | 'rotational_receiver'
  | 'hybrid_weapon'
  | 'lead_back'
  | 'committee_back'
  | 'change_of_pace_back';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface UsageOpportunityMetrics {
  snapShare: number | null;
  routeParticipation: number | null;
  targetShare: number | null;
  airYardShare: number | null;
  carryShare: number | null;
  rushAttemptShare: number | null;
  redZoneTouchShare: number | null;
  inside10TouchShare: number | null;
  inside5TouchShare: number | null;
  goalLineCarryShare: number | null;
  teamOpportunityShare: number | null;
  snaps: number | null;
  routesRun: number | null;
  targets: number | null;
  carries: number | null;
  redZoneTouches: number | null;
  inside10Touches: number | null;
  inside5Touches: number | null;
  goalLineCarries: number | null;
}

export interface RoleOpportunityConfidence {
  score: number;
  tier: ConfidenceTier;
  reasons: string[];
}

export interface RoleOpportunitySource {
  model: string;
  modelVersion: string;
  generatedAt: string;
  inputWindow: string;
  notes: string[];
}

export interface RoleOpportunityRecord {
  playerId: string;
  playerName: string;
  team: string;
  position: RoleOpportunityPosition;
  season: number;
  week: number;
  primaryRole: PrimaryRole;
  roleTags: string[];
  usage: UsageOpportunityMetrics;
  confidence: RoleOpportunityConfidence;
  source: RoleOpportunitySource;
}

export interface InternalRoleOpportunityInput {
  playerId: string;
  playerName: string;
  team: string;
  position: RoleOpportunityPosition;
  season: number;
  week: number;
  primaryRole?: PrimaryRole;
  roleTags?: string[];
  usage: Partial<UsageOpportunityMetrics>;
  confidenceScore: number;
  confidenceReasons?: string[];
  generatedAt?: string;
  source: {
    model: string;
    modelVersion: string;
    inputWindow: string;
    notes?: string[];
  };
}

export interface CanonicalRoleOpportunityEnvelope {
  meta: {
    service: string;
    version: string;
    evaluatedAt: string;
  };
  roleOpportunityRecord: RoleOpportunityRecord;
  internalEvaluation?: unknown;
}
