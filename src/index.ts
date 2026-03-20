export { app } from './app.ts';
export { toTiberDataRoleOpportunityV1, confidenceScoreToTier, RoleOpportunityContractError } from './adapters/tiberDataRoleOpportunityV1.ts';
export { validateRoleOpportunityRecord, validateInternalRoleOpportunityInput } from './contracts/tiberDataRoleOpportunityV1.ts';
export { seededScenarios, getScenarioById } from './data/scenarios/index.ts';
export { EXPLANATION_LEVELS, ROLE_EVALUATION_FLAGS, SCORE_BANDS, VERDICTS } from './contracts/constants.ts';
export { getOpenApiDocument } from './contracts/openapi.ts';
export { evaluateRoleProfile } from './scoring/evaluateRoleProfile.ts';
export { buildCanonicalRoleOpportunityEnvelope, buildRoleOpportunityInputFromEvaluation } from './services/roleOpportunityService.ts';
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
export type {
  CanonicalRoleOpportunityEnvelope,
  ConfidenceTier,
  InternalRoleOpportunityInput,
  PrimaryRole,
  RoleOpportunityConfidence,
  RoleOpportunityPosition,
  RoleOpportunityRecord,
  RoleOpportunitySource,
  UsageOpportunityMetrics,
} from './types/roleOpportunity.ts';
