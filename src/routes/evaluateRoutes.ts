import { buildMeta } from '../config/service.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';
import type { BatchItemError, BatchItemSuccess } from '../types/roleOutput.ts';
import type { NamedScenario } from '../types/scenario.ts';
import {
  validateBatchRoleEvaluationEnvelope,
  validateBatchRoleEvaluationRequest,
  validateRoleEvaluationRequest,
  validateRoleEvaluationRequestAtPath,
  type RoleEvaluationRequest,
} from '../validation/roleEvaluationRequest.ts';

const INVALID_JSON_RESPONSE = {
  status: 400,
  body: {
    error: 'Invalid JSON body',
    details: [{ field: 'body', message: 'must be valid JSON' }],
  },
} as const;

const toNamedScenario = (request: RoleEvaluationRequest, index?: number): NamedScenario => ({
  scenarioId: request.scenarioId ?? `custom-evaluation${index !== undefined ? `-${index + 1}` : ''}`,
  scenarioName: request.scenarioName ?? `Custom evaluation${index !== undefined ? ` ${index + 1}` : ''}`,
  profile: request.profile,
  context: request.context,
});

const readJson = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON_RESPONSE;
  }
};

export const evaluatePostedScenario = async (request: Request) => {
  const payload = await readJson(request);

  if ('status' in payload) {
    return payload;
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
  const payload = await readJson(request);

  if ('status' in payload) {
    return payload;
  }

  const envelope = validateBatchRoleEvaluationEnvelope(payload);

  if (!envelope.success || !envelope.data) {
    return {
      status: 400,
      body: {
        error: 'Invalid batch role evaluation request',
        details: envelope.errors,
      },
    };
  }

  if (envelope.data.strict) {
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
  }

  const items: BatchItemSuccess[] = [];
  const errors: BatchItemError[] = [];

  envelope.data.items.forEach((item, index) => {
    const validation = validateRoleEvaluationRequestAtPath(item, `body[${index}]`);

    if (!validation.success || !validation.data) {
      errors.push({
        requestIndex: index,
        error: 'Invalid role evaluation request',
        details: validation.errors ?? [],
      });
      return;
    }

    const requestData = {
      ...validation.data,
      explanationLevel: validation.data.explanationLevel ?? 'standard',
    };

    items.push({
      requestIndex: index,
      result: evaluateRoleProfile(toNamedScenario(requestData, index), {
        explanationLevel: requestData.explanationLevel,
        requestIndex: index,
      }),
    });
  });

  return {
    status: 200,
    body: {
      meta: buildMeta(),
      partialSuccess: errors.length > 0,
      items,
      errors,
      summary: {
        requested: envelope.data.items.length,
        succeeded: items.length,
        failed: errors.length,
      },
    },
  };
};
