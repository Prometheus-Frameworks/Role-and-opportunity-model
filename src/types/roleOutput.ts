import type { PlayerRoleProfile, RoleArchetype } from './playerRole.ts';
import type { TeamOpportunityContext } from './teamOpportunity.ts';

export interface ScoreBreakdown {
  roleValue: number;
  opportunityQuality: number;
  roleStability: number;
  vacatedOpportunity: number;
}

export interface RoleEvaluationOutput {
  scenarioId: string;
  scenarioName: string;
  roleArchetype: RoleArchetype;
  scores: ScoreBreakdown;
  compositeScore: number;
  explanationBullets: string[];
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
}
