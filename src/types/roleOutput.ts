import type { PlayerRoleProfile, RoleArchetype } from './playerRole.ts';
import type { TeamOpportunityContext } from './teamOpportunity.ts';
import type { ExplanationLevel, RoleEvaluationFlag, ScoreBand, Verdict } from '../contracts/constants.ts';

export type { ExplanationLevel, RoleEvaluationFlag, ScoreBand, Verdict } from '../contracts/constants.ts';

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
  flags: RoleEvaluationFlag[];
  primaryReason: string;
  riskNote?: string;
  scoreBands?: ScoreBands;
  explanationBullets: string[];
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
  evaluationMeta: EvaluationMetadata;
}

export interface BatchEvaluationRequestEnvelope {
  items: unknown[];
  options?: {
    strict?: boolean;
  };
}

export interface BatchItemSuccess {
  requestIndex: number;
  result: RoleEvaluationOutput;
}

export interface BatchItemError {
  requestIndex: number;
  error: string;
  details: {
    field: string;
    message: string;
  }[];
}
