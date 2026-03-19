import { buildMeta } from '../config/service.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';
import type { NamedScenario } from '../types/scenario.ts';
import {
  validateBatchRoleEvaluationRequest,
  validateRoleEvaluationRequest,
  type RoleEvaluationRequest,
} from '../validation/roleEvaluationRequest.ts';

const toNamedScenario = (request: RoleEvaluationRequest, index?: number): NamedScenario => ({
  scenarioId: request.scenarioId ?? `custom-evaluation${index !== undefined ? `-${index + 1}` : ''}`,
  scenarioName: request.scenarioName ?? `Custom evaluation${index !== undefined ? ` ${index + 1}` : ''}`,
  profile: request.profile,
  context: request.context,
});

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

  return {
    status: 200,
    body: {
      meta: buildMeta(),
      ...evaluateRoleProfile(toNamedScenario(validation.data), {
        explanationLevel: validation.data.explanationLevel,
      }),
    },
  };
};

export const evaluatePostedScenarioBatch = async (request: Request) => {
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

  const validation = validateBatchRoleEvaluationRequest(payload);

  if (!validation.success || !validation.data) {
    return {
      status: 400,
      body: {
        error: 'Invalid batch role evaluation request',
        details: validation.errors,
      },
    };
  }

  return {
    status: 200,
    body: {
      meta: buildMeta(),
      items: validation.data.map((item, index) =>
        evaluateRoleProfile(toNamedScenario(item, index), {
          explanationLevel: item.explanationLevel,
          requestIndex: index,
        }),
      ),
    },
  };
};
