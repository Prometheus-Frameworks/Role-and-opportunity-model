import type { PlayerRoleProfile, RoleArchetype } from '../types/playerRole.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import type { ScoreBreakdown } from '../types/roleOutput.ts';

export const buildRoleExplanation = (
  archetype: RoleArchetype,
  scores: ScoreBreakdown,
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
): string[] => {
  const bullets: string[] = [
    `${profile.playerName} profiles as a ${archetype} with ${profile.targetShare}% target share and ${profile.routeParticipation}% route participation.`,
  ];

  if (scores.opportunityQuality >= 65) {
    bullets.push(
      `${context.teamName} offers a favorable passing environment through neutral pass rate, red-zone usage, and quarterback continuity.`,
    );
  } else {
    bullets.push(
      `${context.teamName} limits role upside because the passing environment and target ecosystem are less supportive.`,
    );
  }

  if (scores.roleStability >= 65) {
    bullets.push(
      `The role looks stable thanks to dependable participation and relatively contained competition inside the room.`,
    );
  } else {
    bullets.push(
      `Role stability is pressured by competition, health, or uncertainty in how targets will be distributed.`,
    );
  }

  if (scores.vacatedOpportunity >= 55) {
    bullets.push(
      `There is meaningful vacated opportunity available, giving this role a clear path to absorb additional volume.`,
    );
  }

  return bullets;
};
