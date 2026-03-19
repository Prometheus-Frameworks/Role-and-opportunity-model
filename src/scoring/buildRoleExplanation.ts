import type { PlayerRoleProfile, RoleArchetype } from '../types/playerRole.ts';
import type { ExplanationLevel, ScoreBreakdown } from '../types/roleOutput.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';

export const buildRoleExplanation = (
  archetype: RoleArchetype,
  scores: ScoreBreakdown,
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
  explanationLevel: ExplanationLevel,
): string[] => {
  const bullets: string[] = [
    `${profile.playerName} profiles as a ${archetype} with ${profile.targetShare}% target share and ${profile.routeParticipation}% route participation.`,
  ];

  const environmentBullet =
    scores.opportunityQuality >= 65
      ? `${context.teamName} offers a favorable passing environment through neutral pass rate, red-zone usage, and quarterback continuity.`
      : `${context.teamName} limits role upside because the passing environment and target ecosystem are less supportive.`;

  const stabilityBullet =
    scores.roleStability >= 65
      ? `The role looks stable thanks to dependable participation and relatively contained competition inside the room.`
      : `Role stability is pressured by competition, health, or uncertainty in how targets will be distributed.`;

  const vacatedBullet =
    scores.vacatedOpportunity >= 55
      ? `There is meaningful vacated opportunity available, giving this role a clear path to absorb additional volume.`
      : `There is not much vacated volume to unlock, so this profile must win through current usage instead.`;

  if (explanationLevel === 'short') {
    return bullets;
  }

  bullets.push(environmentBullet, stabilityBullet);

  if (explanationLevel === 'full') {
    bullets.push(
      `${profile.playerName} also sees ${profile.firstReadShare}% first-read share and ${profile.redZoneTargetShare}% red-zone target share, which helps contextualize weekly touch quality.`,
      `${context.teamName} posts ${context.neutralPassRate}% neutral pass rate with ${context.redZonePassRate}% red-zone pass rate, keeping the role grounded in repeatable team behavior.`,
      vacatedBullet,
    );
  } else if (scores.vacatedOpportunity >= 55) {
    bullets.push(vacatedBullet);
  }

  return bullets;
};
