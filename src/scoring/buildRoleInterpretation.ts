import type { PlayerRoleProfile } from '../types/playerRole.ts';
import type { RoleEvaluationFlag, ScoreBands, ScoreBand, ScoreBreakdown, Verdict } from '../types/roleOutput.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import {
  ROLE_EVALUATION_FLAGS,
  SCORE_BAND_THRESHOLDS,
  VERDICT_THRESHOLDS,
} from '../contracts/constants.ts';

const ROLE_EVALUATION_FLAG_SET = new Set<string>(ROLE_EVALUATION_FLAGS);

const toScoreBand = (score: number): ScoreBand => {
  if (score >= SCORE_BAND_THRESHOLDS.elite) {
    return 'elite';
  }

  if (score >= SCORE_BAND_THRESHOLDS.good) {
    return 'good';
  }

  if (score >= SCORE_BAND_THRESHOLDS.mixed) {
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
  if (compositeScore >= VERDICT_THRESHOLDS.strong) {
    return 'strong';
  }

  if (compositeScore >= VERDICT_THRESHOLDS.solid) {
    return 'solid';
  }

  if (compositeScore >= VERDICT_THRESHOLDS.mixed) {
    return 'mixed';
  }

  return 'weak';
};

export const deriveFlags = (
  scores: ScoreBreakdown,
  profile: PlayerRoleProfile,
  context: TeamOpportunityContext,
): RoleEvaluationFlag[] => {
  const flags: RoleEvaluationFlag[] = [];

  const pushFlag = (flag: RoleEvaluationFlag) => {
    if (ROLE_EVALUATION_FLAG_SET.has(flag)) {
      flags.push(flag);
    }
  };

  if (scores.roleValue >= 80) {
    pushFlag('high-role-value');
  }
  if (scores.opportunityQuality >= 70) {
    pushFlag('favorable-environment');
  }
  if (scores.roleStability >= 70) {
    pushFlag('stable-role');
  }
  if (scores.vacatedOpportunity >= 60) {
    pushFlag('vacated-volume');
  }
  if (profile.firstReadShare >= 30 || profile.redZoneTargetShare >= 25) {
    pushFlag('featured-usage');
  }
  if (context.targetCompetitionIndex >= 65 || profile.competitionForRole >= 60) {
    pushFlag('crowded-target-tree');
  }
  if (profile.injuryRisk >= 55) {
    pushFlag('injury-risk');
  }
  if (context.quarterbackStability < 50 || context.playCallerContinuity < 50) {
    pushFlag('environment-volatility');
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
  flags: RoleEvaluationFlag[],
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
