export { app } from './app.ts';
export { seededScenarios, getScenarioById } from './data/scenarios/index.ts';
export { EXPLANATION_LEVELS, ROLE_EVALUATION_FLAGS, SCORE_BANDS, VERDICTS } from './contracts/constants.ts';
export { getOpenApiDocument } from './contracts/openapi.ts';
export { evaluateRoleProfile } from './scoring/evaluateRoleProfile.ts';
export type { NamedScenario, ScenarioSummary } from './types/scenario.ts';
export type { PlayerRoleProfile, Position, RoleArchetype } from './types/playerRole.ts';
export type {
  BatchItemError,
  BatchItemSuccess,
  ExplanationLevel,
  RoleEvaluationFlag,
  RoleEvaluationOutput,
  ScoreBand,
  ScoreBreakdown,
  Verdict,
} from './types/roleOutput.ts';
export type { TeamOpportunityContext } from './types/teamOpportunity.ts';
