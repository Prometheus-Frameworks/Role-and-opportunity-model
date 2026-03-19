import type { PlayerRoleProfile, RoleArchetype } from './playerRole.ts';
import type { TeamOpportunityContext } from './teamOpportunity.ts';

export type ExplanationLevel = 'short' | 'standard' | 'full';
export type Verdict = 'strong' | 'solid' | 'mixed' | 'weak';
export type ScoreBand = 'elite' | 'good' | 'mixed' | 'poor';

export interface ScoreBreakdown {
  roleValue: number;
  opportunityQuality: number;
  roleStability: number;
  vacatedOpportunity: number;
}

export interface ScoreBands {
  roleValue: ScoreBand;
  opportunityQuality: ScoreBand;
  roleStability: ScoreBand;
  vacatedOpportunity: ScoreBand;
}

export interface EvaluationMetadata {
  requestIndex?: number;
  explanationLevel: ExplanationLevel;
}

export interface RoleEvaluationOutput {
  scenarioId: string;
  scenarioName: string;
  roleArchetype: RoleArchetype;
  scores: ScoreBreakdown;
  compositeScore: number;
  verdict: Verdict;
  flags: string[];
  primaryReason: string;
  riskNote?: string;
  scoreBands?: ScoreBands;
  explanationBullets: string[];
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
  evaluationMeta: EvaluationMetadata;
}
