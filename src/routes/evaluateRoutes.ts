import { buildMeta } from '../config/service.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';
import type { NamedScenario } from '../types/scenario.ts';
import { validateRoleEvaluationRequest } from '../validation/roleEvaluationRequest.ts';

export const evaluatePostedScenario = async (request: Request) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      status: 400,
      body: {
        error: 'Invalid JSON body',
        details: [{ field: 'body', message: 'must be valid JSON' }],
      },
    };
  }

  const validation = validateRoleEvaluationRequest(payload);

  if (!validation.success || !validation.data) {
    return {
      status: 400,
      body: {
        error: 'Invalid role evaluation request',
        details: validation.errors,
      },
    };
  }

  const scenario: NamedScenario = {
    scenarioId: validation.data.scenarioId ?? 'custom-evaluation',
    scenarioName: validation.data.scenarioName ?? 'Custom evaluation',
    profile: validation.data.profile,
    context: validation.data.context,
  };

  return {
    status: 200,
    body: {
      meta: buildMeta(),
      ...evaluateRoleProfile(scenario),
    },
  };
};
