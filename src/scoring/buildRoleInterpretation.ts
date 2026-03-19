import type { PlayerRoleProfile } from '../types/playerRole.ts';
import type { ScoreBands, ScoreBand, ScoreBreakdown, Verdict } from '../types/roleOutput.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';

const toScoreBand = (score: number): ScoreBand => {
  if (score >= 80) {
    return 'elite';
  }

  if (score >= 65) {
    return 'good';
  }

  if (score >= 45) {
    return 'mixed';
  }

  return 'poor';
};

export const buildScoreBands = (scores: ScoreBreakdown): ScoreBands => ({
  roleValue: toScoreBand(scores.roleValue),
  opportunityQuality: toScoreBand(scores.opportunityQuality),
  roleStability: toScoreBand(scores.roleStability),
  vacatedOpportunity: toScoreBand(scores.vacatedOpportunity),
});

export const deriveVerdict = (compositeScore: number): Verdict => {
  if (compositeScore >= 75) {
    return 'strong';
  }

  if (compositeScore >= 62) {
    return 'solid';
  }

  if (compositeScore >= 48) {
    return 'mixed';
  }

  return 'weak';
};

export const deriveFlags = (
  scores: ScoreBreakdown,
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
): string[] => {
  const flags: string[] = [];

  if (scores.roleValue >= 80) {
    flags.push('high-role-value');
  }
  if (scores.opportunityQuality >= 70) {
    flags.push('favorable-environment');
  }
  if (scores.roleStability >= 70) {
    flags.push('stable-role');
  }
  if (scores.vacatedOpportunity >= 60) {
    flags.push('vacated-volume');
  }
  if (profile.firstReadShare >= 30 || profile.redZoneTargetShare >= 25) {
    flags.push('featured-usage');
  }
  if (context.targetCompetitionIndex >= 65 || profile.competitionForRole >= 60) {
    flags.push('crowded-target-tree');
  }
  if (profile.injuryRisk >= 55) {
    flags.push('injury-risk');
  }
  if (context.quarterbackStability < 50 || context.playCallerContinuity < 50) {
    flags.push('environment-volatility');
  }

  return flags;
};

export const buildPrimaryReason = (
  verdict: Verdict,
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
  scores: ScoreBreakdown,
): string => {
  if (verdict === 'strong') {
    return `${profile.playerName} carries a strong role because usage concentration and team context both grade well.`;
  }

  if (scores.roleValue >= 65 && scores.roleStability >= 65) {
    return `${profile.playerName} looks dependable with a solid role profile and enough weekly stability to trust.`;
  }

  if (scores.roleValue >= 65) {
    return `${profile.playerName} wins on role talent and usage, but the surrounding environment is more uneven.`;
  }

  return `${profile.playerName} has a less secure receiving role in ${context.teamName}'s current ecosystem.`;
};

export const buildRiskNote = (
  flags: string[],
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
): string | undefined => {
  if (flags.includes('injury-risk')) {
    return `${profile.playerName}'s elevated injury risk can interrupt role continuity.`;
  }

  if (flags.includes('crowded-target-tree')) {
    return `Competition for targets creates a thinner margin for reliable weekly volume.`;
  }

  if (flags.includes('environment-volatility')) {
    return `${context.teamName} carries enough quarterback or play-caller uncertainty to raise outcome variance.`;
  }

  return undefined;
};
