import type { PlayerRoleProfile } from '../types/playerRole.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import { clamp, round, weightedAverage } from '../utils/math.ts';

export const scoreRoleStability = (
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
): number => {
  const score = weightedAverage([
    [profile.routeParticipation, 0.25],
    [100 - profile.competitionForRole, 0.2],
    [100 - profile.injuryRisk, 0.1],
    [context.quarterbackStability, 0.15],
    [context.playCallerContinuity, 0.1],
    [context.receiverRoomCertainty, 0.2],
  ]);

  return round(clamp(score));
};
