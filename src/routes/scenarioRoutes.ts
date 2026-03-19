import { buildMeta } from '../config/service.ts';
import { getScenarioById, scenarioSummaries } from '../data/scenarios/index.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';

export const listScenarios = () => ({
  meta: buildMeta(),
  scenarios: scenarioSummaries,
});

export const getScenarioDetail = (scenarioId: string) => {
  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    return {
      status: 404,
      body: {
        error: 'Scenario not found',
        scenarioId,
      },
    };
  }

  return {
    status: 200,
    body: {
      meta: buildMeta(),
      scenario,
      evaluation: evaluateRoleProfile(scenario),
    },
  };
};
