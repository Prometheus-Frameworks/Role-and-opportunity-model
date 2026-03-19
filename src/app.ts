import { SERVICE_NAME, SERVICE_VERSION, buildMeta } from './config/service.ts';
import { getOpenApiDocument } from './contracts/openapi.ts';
import { listScenarios, getScenarioDetail } from './routes/scenarioRoutes.ts';
import { getHealthResponse } from './routes/healthRoutes.ts';
import { evaluatePostedScenario, evaluatePostedScenarioBatch, evaluateScenarioFromData } from './routes/evaluateRoutes.ts';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const notFound = () =>
  jsonResponse(
    {
      error: 'Not found',
    },
    404,
  );

export const app = {
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/') {
      return jsonResponse({
        meta: buildMeta(),
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        description: 'Deterministic WR/TE role intelligence API.',
        endpoints: [
          'GET /',
          'GET /health',
          'GET /openapi.json',
          'GET /api/scenarios',
          'GET /api/scenarios/:scenarioId',
          'POST /api/evaluate',
          'POST /api/evaluate/from-data',
          'POST /api/evaluate/batch',
        ],
        examples: [
          'docs/examples/evaluate-request.json',
          'docs/examples/evaluate-batch-partial-request.json',
          'docs/examples/evaluate-batch-partial-response.json',
        ],
      });
    }

    if (request.method === 'GET' && path === '/health') {
      return jsonResponse(getHealthResponse());
    }

    if (request.method === 'GET' && path === '/openapi.json') {
      return jsonResponse(getOpenApiDocument());
    }

    if (request.method === 'GET' && path === '/api/scenarios') {
      return jsonResponse(listScenarios());
    }

    if (request.method === 'GET' && path.startsWith('/api/scenarios/')) {
      const scenarioId = decodeURIComponent(path.slice('/api/scenarios/'.length));
      const result = getScenarioDetail(scenarioId);
      return jsonResponse(result.body, result.status);
    }

    if (request.method === 'POST' && path === '/api/evaluate') {
      const result = await evaluatePostedScenario(request);
      return jsonResponse(result.body, result.status);
    }

    if (request.method === 'POST' && path === '/api/evaluate/from-data') {
      const result = await evaluateScenarioFromData(request);
      return jsonResponse(result.body, result.status);
    }

    if (request.method === 'POST' && path === '/api/evaluate/batch') {
      const result = await evaluatePostedScenarioBatch(request);
      return jsonResponse(result.body, result.status);
    }

    return notFound();
  },
};
