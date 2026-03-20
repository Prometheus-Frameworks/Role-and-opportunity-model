import { buildMeta } from '../config/service.ts';
import { buildCanonicalRoleOpportunityEnvelope } from '../services/roleOpportunityService.ts';
import { evaluateRoleProfile } from '../scoring/evaluateRoleProfile.ts';
import type { BatchItemError, BatchItemSuccess } from '../types/roleOutput.ts';
import type { NamedScenario } from '../types/scenario.ts';
import { TiberDataError, tiberDataClient } from '../upstream/tiberDataClient.ts';
import {
  validateBatchRoleEvaluationEnvelope,
  validateBatchRoleEvaluationRequest,
  validateCanonicalRoleOpportunityRequest,
  validateRoleEvaluationRequest,
  validateRoleEvaluationRequestAtPath,
  validateUpstreamRoleEvaluationRequest,
  type RoleEvaluationRequest,
  type UpstreamRoleEvaluationRequest,
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

const toUpstreamNamedScenario = (request: UpstreamRoleEvaluationRequest & RoleEvaluationRequest): NamedScenario => ({
  scenarioId: request.scenarioId ?? `tiber-data-${request.playerId ?? request.team ?? 'evaluation'}`,
  scenarioName: request.scenarioName ?? `TIBER-Data evaluation for ${request.playerId ?? request.team ?? 'request'}`,
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

export const evaluateCanonicalRoleOpportunity = async (request: Request) => {
  const payload = await readJson(request);

  if ('status' in payload) {
    return payload;
  }

  const validation = validateCanonicalRoleOpportunityRequest(payload);

  if (!validation.success || !validation.data) {
    return {
      status: 400,
      body: {
        error: 'Invalid canonical role-opportunity request',
        details: validation.errors,
      },
    };
  }

  const evaluation = evaluateRoleProfile(toNamedScenario(validation.data), {
    explanationLevel: validation.data.explanationLevel,
  });

  return {
    status: 200,
    body: buildCanonicalRoleOpportunityEnvelope(evaluation, {
      season: validation.data.season,
      week: validation.data.week,
      inputWindow: validation.data.inputWindow,
    }),
  };
};

export const evaluateScenarioFromData = async (request: Request) => {
  const payload = await readJson(request);

  if ('status' in payload) {
    return payload;
  }

  const validation = validateUpstreamRoleEvaluationRequest(payload);

  if (!validation.success || !validation.data) {
    return {
      status: 400,
      body: {
        error: 'Invalid upstream role evaluation request',
        details: validation.errors,
      },
    };
  }

  try {
    const upstreamData = await tiberDataClient.getEvaluationInput(validation.data);
    const requestData = {
      ...validation.data,
      ...upstreamData,
    };

    return {
      status: 200,
      body: {
        meta: buildMeta(),
        dataSource: {
          name: 'TIBER-Data',
          baseUrl: tiberDataClient.baseUrl,
          lookup: {
            player_id: validation.data.playerId,
            team: validation.data.team,
            season: validation.data.season,
            week: validation.data.week,
          },
        },
        ...evaluateRoleProfile(toUpstreamNamedScenario(requestData), {
          explanationLevel: requestData.explanationLevel,
        }),
      },
    };
  } catch (error) {
    if (error instanceof TiberDataError) {
      return {
        status: error.status,
        body: {
          error: error.message,
          details: error.details,
        },
      };
    }

    throw error;
  }
};

export const evaluateCanonicalRoleOpportunityFromData = async (request: Request) => {
  const payload = await readJson(request);

  if ('status' in payload) {
    return payload;
  }

  const validation = validateUpstreamRoleEvaluationRequest(payload);

  if (!validation.success || !validation.data) {
    return {
      status: 400,
      body: {
        error: 'Invalid canonical role-opportunity request',
        details: validation.errors,
      },
    };
  }

  if (validation.data.season === undefined || validation.data.week === undefined) {
    return {
      status: 400,
      body: {
        error: 'Invalid canonical role-opportunity request',
        details: [
          { field: 'body.season', message: 'is required for canonical output' },
          { field: 'body.week', message: 'is required for canonical output' },
        ],
      },
    };
  }

  try {
    const upstreamData = await tiberDataClient.getEvaluationInput(validation.data);
    const requestData = {
      ...validation.data,
      ...upstreamData,
    };
    const evaluation = evaluateRoleProfile(toUpstreamNamedScenario(requestData), {
      explanationLevel: requestData.explanationLevel,
    });

    return {
      status: 200,
      body: buildCanonicalRoleOpportunityEnvelope(evaluation, {
        season: validation.data.season,
        week: validation.data.week,
        inputWindow: `season=${validation.data.season};week=${validation.data.week}`,
        sourceNotes: [`Fetched source inputs from ${tiberDataClient.baseUrl}.`],
      }),
    };
  } catch (error) {
    if (error instanceof TiberDataError) {
      return {
        status: error.status,
        body: {
          error: error.message,
          details: error.details,
        },
      };
    }

    throw error;
  }
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
