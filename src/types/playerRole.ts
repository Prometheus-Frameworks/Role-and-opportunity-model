export type Position = 'WR' | 'TE';

export type RoleArchetype =
  | 'WR1'
  | 'WR2'
  | 'SLOT'
  | 'FIELD_STRETCHER'
  | 'TE1'
  | 'ROTATIONAL'
  | 'HYBRID';

export interface PlayerRoleProfile {
  playerId: string;
  playerName: string;
  teamId?: string;
  position: Position;
  targetShare: number;
  airYardShare: number;
  routeParticipation: number;
  slotRate: number;
  inlineRate: number;
  wideRate: number;
  redZoneTargetShare: number;
  firstReadShare: number;
  averageDepthOfTarget: number;
  explosiveTargetRate: number;
  personnelVersatility: number;
  competitionForRole: number;
  injuryRisk: number;
  vacatedTargetsAvailable: number;
}
