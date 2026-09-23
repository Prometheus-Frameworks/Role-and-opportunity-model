/** Additive, offline Slice 1 contract. No producer, admission or consumer entrypoint. */
export type Position = 'RB' | 'WR' | 'TE' | 'QB';
export type Field = 'carries' | 'targets' | 'receptions' | 'passAttempts';
export type Scope = { season: number; seasonType: 'REG' | 'POST' | 'PRE'; week: number };
/** Explicit profile/type; generatedAt is retained-artifact generation, never football event time. */
export type ArtifactRef = { artifactId: string; revision: string; sha256: string;
  artifactType: 'player_team_allocation_handoff_v1' | 'weekly_role_state_v1' | 'teamstate_context' | 'evidence_file';
  digestProfile: 'tiber-jcs-root-sha256-v1' | 'raw-bytes-sha256-v1'; generatedAt: string };
export type Evidence = {
  id: string; kind: 'source' | 'derived' | 'fixture' | 'proxy' | 'reported';
  artifact: ArtifactRef; locator: string; definition: string; parents: string[];
  sourceObservedAt: string | null; sourcePublishedAt: string | null;
  retrievedAt: string | null; generatedAt: string;
};
export type Count = {
  value: number | null; status: 'observed' | 'missing' | 'conflicted';
  reason: string | null; evidence: string[];
};
export type Counts = Record<Field, Count>;
export type AllocationRow = {
  rowId: string; gameId: string; team: string; opponent: string;
  identity: { namespace: string; playerId: string | null; status: 'resolved' | 'unresolved'; evidence: string[] };
  position: string | null; positionEvidence: string[]; counts: Counts;
};
export type TeamAllocation = {
  gameId: string; team: string; opponent: string; totals: Counts;
  /** Every retained source row, including unresolved identities and non-skill positions. */
  rows: AllocationRow[];
  population: {
    status: 'complete' | 'incomplete'; evidence: string[];
    /** Work not represented in rows; null means not quantified. Never a synthetic player. */
    unallocated: Counts;
    reconciliation: Record<Field, 'reconciled' | 'incomplete' | 'conflicted'>;
  };
};
/** Proposed Data-owned, common TTS/ROP boundary. Not a claim that Data emits this today. */
export type PlayerTeamAllocationHandoffV1 = {
  contractVersion: 'player_team_allocation_handoff_v1'; artifact: ArtifactRef;
  supersedes: ArtifactRef | null; mode: 'synthetic' | 'candidate'; scope: Scope;
  games: { gameId: string; homeTeam: string; awayTeam: string }[];
  expectedGameIds: string[]; coverage: 'complete' | 'partial' | 'unknown';
  finality: 'unknown' | 'provisional' | 'final'; correction: 'unknown' | 'open' | 'settled';
  evidenceCutoff: string | null; generatedAt: string;
  definitions: Record<Field, string>;
  purpose: { status: 'pending' | 'accepted'; purposes: ('rop_observed_role' | 'tts_allocation')[]; evidence: string[] };
  evidence: Evidence[]; teams: TeamAllocation[];
};
export type Share = {
  numerator: number | null; denominator: number | null; value: number | null;
  status: 'available' | 'missing' | 'zero_denominator' | 'ineligible';
  reason: string | null; definition: 'player_carries/all_team_carries' | 'player_targets/credited_team_targets' | 'player_carries/qualified_RB_carries' | 'player_attempts/all_team_attempts';
  evidence: string[];
};
export type ClaimId = 'recorded_rushing_work' | 'recorded_receiving_opportunity' | 'observed_receiving_involvement' | 'led_qualified_rb_room_carries' | 'majority_qualified_rb_room_carries' | 'recorded_qb_passing_work' | 'recorded_qb_rushing_work';
export type Claim = {
  id: ClaimId; ruleVersion: '1'; status: 'supported' | 'not_supported' | 'insufficient';
  support: string[]; counterevidence: string[]; gaps: string[];
};
export type Branch =
  | { position: 'RB'; carryShare: Share; targetShare: Share; rbRoomCarryShare: Share }
  | { position: 'WR'; carryShare: Share; targetShare: Share }
  | { position: 'TE'; carryShare: Share; targetShare: Share }
  | { position: 'QB'; carryShare: Share; passAttemptShare: Share };
export type Segment = {
  rowId: string; gameId: string; team: string; opponent: string;
  sourcePosition: Position; observations: Counts; branch: Branch; claims: Claim[];
};
export type Readiness = {
  identity: 'resolved' | 'unresolved'; observations: 'available' | 'partial' | 'absent';
  population: 'complete' | 'incomplete' | 'absent'; coverage: PlayerTeamAllocationHandoffV1['coverage'];
  finality: PlayerTeamAllocationHandoffV1['finality']; correction: PlayerTeamAllocationHandoffV1['correction'];
  purpose: 'pending' | 'accepted'; evidence: 'fixture' | 'source_backed' | 'unavailable';
};
export type Comparison = {
  priorState: ArtifactRef; priorInput: ArtifactRef; status: 'comparable' | 'non_comparable';
  reasons: string[];
  deltas: { field: Field | 'carryShare' | 'targetShare' | 'passAttemptShare'; unit: 'count' | 'percentage_points'; previous: number; current: number; delta: number }[];
};
export type TeamstateAttachment = {
  artifact: ArtifactRef; input: ArtifactRef; scope: Scope; gameId: string; team: string;
  rowRef: string; evidenceCutoff: string | null; generatedAt: string;
  purpose: 'pending' | 'accepted'; finality: PlayerTeamAllocationHandoffV1['finality'];
};
export type WeeklyRoleStateV1 = {
  contractVersion: 'weekly_role_state_v1'; artifact: ArtifactRef; supersedes: ArtifactRef | null;
  input: ArtifactRef; scope: Scope; generatedAt: string; evidenceCutoff: string | null;
  subject: AllocationRow['identity']; presence: 'observed' | 'absent'; segments: Segment[];
  readiness: Readiness; missingEvidence: string[];
  /** Reserved only: no scoring-area thresholds or advanced evidence admitted by v1. */
  scoringArea: { status: 'reserved_data_derivation' }; advanced: { status: 'not_supplied' };
  comparison: Comparison | null; teamstate: TeamstateAttachment[];
  consumerActivation: 'none';
};
export type ValidationResult = { valid: boolean; errors: string[] };
