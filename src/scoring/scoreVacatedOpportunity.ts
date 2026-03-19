import type { PlayerRoleProfile } from '../types/playerRole.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import { clamp, round } from '../utils/math.ts';

export const scoreVacatedOpportunity = (
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
): number => {
  const playerAccess = profile.vacatedTargetsAvailable * 0.55;
  const teamVacated = context.vacatedTargetShare * 0.35;
  const roleFit = profile.personnelVersatility * 0.1;

  return round(clamp(playerAccess + teamVacated + roleFit));
};
