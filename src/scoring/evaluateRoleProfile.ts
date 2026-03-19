import type { PlayerRoleProfile } from '../types/playerRole.ts';
import type { RoleEvaluationOutput } from '../types/roleOutput.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import { buildRoleExplanation } from './buildRoleExplanation.ts';
import { scoreOpportunityQuality } from './scoreOpportunityQuality.ts';
import { classifyRoleArchetype, scoreRoleValue } from './scoreRoleValue.ts';
import { scoreRoleStability } from './scoreRoleStability.ts';
import { scoreVacatedOpportunity } from './scoreVacatedOpportunity.ts';
import { round, weightedAverage } from '../utils/math.ts';

export interface NamedScenario {
  scenarioId: string;
  scenarioName: string;
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
}

export const evaluateRoleProfile = (scenario: NamedScenario): RoleEvaluationOutput => {
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

  return {
    scenarioId: scenario.scenarioId,
    scenarioName: scenario.scenarioName,
    roleArchetype,
    scores,
    compositeScore,
    explanationBullets: buildRoleExplanation(roleArchetype, scores, scenario.profile, scenario.context),
    profile: scenario.profile,
    context: scenario.context,
  };
};
