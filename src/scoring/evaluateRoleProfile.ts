import type { RoleEvaluationOutput } from '../types/roleOutput.ts';
import type { NamedScenario } from '../types/scenario.ts';
import { buildRoleExplanation } from './buildRoleExplanation.ts';
import { buildPrimaryReason, buildRiskNote, buildScoreBands, deriveFlags, deriveVerdict } from './buildRoleInterpretation.ts';
import { scoreOpportunityQuality } from './scoreOpportunityQuality.ts';
import { classifyRoleArchetype, scoreRoleValue } from './scoreRoleValue.ts';
import { scoreRoleStability } from './scoreRoleStability.ts';
import { scoreVacatedOpportunity } from './scoreVacatedOpportunity.ts';
import { round, weightedAverage } from '../utils/math.ts';
import type { ExplanationLevel } from '../types/roleOutput.ts';

export const evaluateRoleProfile = (
  scenario: NamedScenario,
  options: { explanationLevel?: ExplanationLevel; requestIndex?: number } = {},
): RoleEvaluationOutput => {
  const explanationLevel = options.explanationLevel ?? 'standard';
  const roleArchetype = classifyRoleArchetype(scenario.profile);
  const scores = {
    roleValue: scoreRoleValue(scenario.profile),
    opportunityQuality: scoreOpportunityQuality(scenario.context),
    roleStability: scoreRoleStability(scenario.profile, scenario.context),
    vacatedOpportunity: scoreVacatedOpportunity(scenario.profile, scenario.context),
  };

  const compositeScore = round(
    weightedAverage([
      [scores.roleValue, 0.4],
      [scores.opportunityQuality, 0.25],
      [scores.roleStability, 0.25],
      [scores.vacatedOpportunity, 0.1],
    ]),
  );
  const verdict = deriveVerdict(compositeScore);
  const flags = deriveFlags(scores, scenario.profile, scenario.context);
  const riskNote = buildRiskNote(flags, scenario.profile, scenario.context);

  return {
    scenarioId: scenario.scenarioId,
    scenarioName: scenario.scenarioName,
    roleArchetype,
    scores,
    compositeScore,
    verdict,
    flags,
    primaryReason: buildPrimaryReason(verdict, scenario.profile, scenario.context, scores),
    riskNote,
    scoreBands: explanationLevel === 'full' ? buildScoreBands(scores) : undefined,
    explanationBullets: buildRoleExplanation(roleArchetype, scores, scenario.profile, scenario.context, explanationLevel),
    profile: scenario.profile,
    context: scenario.context,
    evaluationMeta: {
      requestIndex: options.requestIndex,
      explanationLevel,
    },
  };
};
