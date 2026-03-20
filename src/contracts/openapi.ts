import { buildMeta, SERVICE_NAME, SERVICE_VERSION } from '../config/service.ts';
import { EXPLANATION_LEVELS, ROLE_EVALUATION_FLAGS, SCORE_BANDS, VERDICTS } from './constants.ts';

const requestExample = {
  profile: {
    playerId: 'wr-alpha-001',
    playerName: 'Atlas X',
    position: 'WR',
    targetShare: 31,
    airYardShare: 38,
    routeParticipation: 93,
    slotRate: 24,
    inlineRate: 0,
    wideRate: 76,
    redZoneTargetShare: 29,
    firstReadShare: 33,
    averageDepthOfTarget: 13.8,
    explosiveTargetRate: 18,
    personnelVersatility: 72,
    competitionForRole: 25,
    injuryRisk: 22,
    vacatedTargetsAvailable: 58,
  },
  context: {
    teamId: 'TM-ALP',
    teamName: 'Metro Meteors',
    passRateOverExpected: 7,
    neutralPassRate: 62,
    redZonePassRate: 60,
    paceIndex: 66,
    quarterbackStability: 84,
    playCallerContinuity: 81,
    targetCompetitionIndex: 34,
    receiverRoomCertainty: 79,
    vacatedTargetShare: 41,
  },
  scenarioId: 'custom-alpha',
  scenarioName: 'Custom alpha evaluation',
  explanationLevel: 'full',
} as const;

const successExample = {
  meta: buildMeta(),
  scenarioId: 'custom-alpha',
  scenarioName: 'Custom alpha evaluation',
  roleArchetype: 'X_receiver_alpha',
  scores: {
    roleValue: 84,
    opportunityQuality: 75,
    roleStability: 79,
    vacatedOpportunity: 61,
  },
  compositeScore: 78.6,
  verdict: 'strong',
  flags: ['high-role-value', 'favorable-environment', 'stable-role', 'vacated-volume', 'featured-usage'],
  primaryReason: 'Atlas X carries a strong role because usage concentration and team context both grade well.',
  riskNote: undefined,
  scoreBands: {
    roleValue: 'elite',
    opportunityQuality: 'good',
    roleStability: 'good',
    vacatedOpportunity: 'mixed',
  },
  explanationBullets: [
    'Atlas X profiles as a X_receiver_alpha with 31% target share and 93% route participation.',
    'Metro Meteors offers a favorable passing environment through neutral pass rate, red-zone usage, and quarterback continuity.',
  ],
  profile: requestExample.profile,
  context: requestExample.context,
  evaluationMeta: {
    explanationLevel: 'full',
  },
} as const;

const upstreamRequestExample = {
  player_id: 'wr-alpha-001',
  team: 'Metro Meteors',
  season: 2025,
  week: 4,
  scenarioId: 'tiber-alpha',
  scenarioName: 'TIBER alpha evaluation',
  explanationLevel: 'full',
} as const;

const upstreamSuccessExample = {
  ...successExample,
  scenarioId: 'tiber-alpha',
  scenarioName: 'TIBER alpha evaluation',
  dataSource: {
    name: 'TIBER-Data',
    baseUrl: 'http://localhost:3001',
    lookup: {
      player_id: 'wr-alpha-001',
      team: 'Metro Meteors',
      season: 2025,
      week: 4,
    },
  },
} as const;

const partialBatchResponseExample = {
  meta: buildMeta(),
  partialSuccess: true,
  items: [
    {
      requestIndex: 0,
      result: {
        ...successExample,
        evaluationMeta: {
          requestIndex: 0,
          explanationLevel: 'short',
        },
      },
    },
  ],
  errors: [
    {
      requestIndex: 1,
      error: 'Invalid role evaluation request',
      details: [{ field: 'body[1].context.neutralPassRate', message: 'must be less than or equal to 100' }],
    },
  ],
  summary: {
    requested: 2,
    succeeded: 1,
    failed: 1,
  },
} as const;

export const getOpenApiDocument = () => ({
  openapi: '3.1.0',
  info: {
    title: 'Role and Opportunity Model API',
    version: SERVICE_VERSION,
    description: 'Deterministic WR/TE role intelligence API for downstream integrations.',
  },
  servers: [{ url: '/', description: 'Relative server root' }],
  tags: [
    { name: 'service', description: 'Service metadata and health' },
    { name: 'evaluation', description: 'Role evaluation contract endpoints' },
    { name: 'scenarios', description: 'Seeded scenario discovery' },
  ],
  components: {
    schemas: {
      ExplanationLevel: { type: 'string', enum: [...EXPLANATION_LEVELS] },
      Verdict: { type: 'string', enum: [...VERDICTS] },
      ScoreBand: { type: 'string', enum: [...SCORE_BANDS] },
      RoleEvaluationFlag: { type: 'string', enum: [...ROLE_EVALUATION_FLAGS] },
      ValidationIssue: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'message'],
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
      PlayerRoleProfile: {
        type: 'object',
        additionalProperties: false,
        required: [
          'playerId',
          'playerName',
          'position',
          'targetShare',
          'airYardShare',
          'routeParticipation',
          'slotRate',
          'inlineRate',
          'wideRate',
          'redZoneTargetShare',
          'firstReadShare',
          'averageDepthOfTarget',
          'explosiveTargetRate',
          'personnelVersatility',
          'competitionForRole',
          'injuryRisk',
          'vacatedTargetsAvailable',
        ],
        properties: {
          playerId: { type: 'string' },
          playerName: { type: 'string' },
          position: { type: 'string', enum: ['WR', 'TE'] },
          targetShare: { type: 'number', minimum: 0, maximum: 100 },
          airYardShare: { type: 'number', minimum: 0, maximum: 100 },
          routeParticipation: { type: 'number', minimum: 0, maximum: 100 },
          slotRate: { type: 'number', minimum: 0, maximum: 100 },
          inlineRate: { type: 'number', minimum: 0, maximum: 100 },
          wideRate: { type: 'number', minimum: 0, maximum: 100 },
          redZoneTargetShare: { type: 'number', minimum: 0, maximum: 100 },
          firstReadShare: { type: 'number', minimum: 0, maximum: 100 },
          averageDepthOfTarget: { type: 'number', minimum: 0, maximum: 40 },
          explosiveTargetRate: { type: 'number', minimum: 0, maximum: 100 },
          personnelVersatility: { type: 'number', minimum: 0, maximum: 100 },
          competitionForRole: { type: 'number', minimum: 0, maximum: 100 },
          injuryRisk: { type: 'number', minimum: 0, maximum: 100 },
          vacatedTargetsAvailable: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      TeamOpportunityContext: {
        type: 'object',
        additionalProperties: false,
        required: [
          'teamId',
          'teamName',
          'passRateOverExpected',
          'neutralPassRate',
          'redZonePassRate',
          'paceIndex',
          'quarterbackStability',
          'playCallerContinuity',
          'targetCompetitionIndex',
          'receiverRoomCertainty',
          'vacatedTargetShare',
        ],
        properties: {
          teamId: { type: 'string' },
          teamName: { type: 'string' },
          passRateOverExpected: { type: 'number', minimum: -100, maximum: 100 },
          neutralPassRate: { type: 'number', minimum: 0, maximum: 100 },
          redZonePassRate: { type: 'number', minimum: 0, maximum: 100 },
          paceIndex: { type: 'number', minimum: 0, maximum: 100 },
          quarterbackStability: { type: 'number', minimum: 0, maximum: 100 },
          playCallerContinuity: { type: 'number', minimum: 0, maximum: 100 },
          targetCompetitionIndex: { type: 'number', minimum: 0, maximum: 100 },
          receiverRoomCertainty: { type: 'number', minimum: 0, maximum: 100 },
          vacatedTargetShare: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      RoleEvaluationRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['profile', 'context'],
        properties: {
          profile: { $ref: '#/components/schemas/PlayerRoleProfile' },
          context: { $ref: '#/components/schemas/TeamOpportunityContext' },
          scenarioId: { type: 'string' },
          scenarioName: { type: 'string' },
          explanationLevel: { $ref: '#/components/schemas/ExplanationLevel' },
        },
      },
      UpstreamRoleEvaluationRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          player_id: { type: 'string' },
          team: { type: 'string' },
          season: { type: 'number' },
          week: { type: 'number' },
          scenarioId: { type: 'string' },
          scenarioName: { type: 'string' },
          explanationLevel: { $ref: '#/components/schemas/ExplanationLevel' },
        },
        anyOf: [{ required: ['player_id'] }, { required: ['team'] }],
      },
      BatchRequestEnvelope: {
        type: 'object',
        additionalProperties: false,
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/components/schemas/RoleEvaluationRequest' },
          },
          options: {
            type: 'object',
            additionalProperties: false,
            properties: {
              strict: {
                type: 'boolean',
                description: 'Defaults to true. Set false to enable partial-success mode.',
              },
            },
          },
        },
      },
      RoleEvaluationOutput: {
        type: 'object',
        additionalProperties: true,
        required: [
          'scenarioId',
          'scenarioName',
          'roleArchetype',
          'scores',
          'compositeScore',
          'verdict',
          'flags',
          'primaryReason',
          'explanationBullets',
          'profile',
          'context',
          'evaluationMeta',
        ],
        properties: {
          meta: { type: 'object' },
          scenarioId: { type: 'string' },
          scenarioName: { type: 'string' },
          roleArchetype: { type: 'string' },
          scores: {
            type: 'object',
            additionalProperties: false,
            required: ['roleValue', 'opportunityQuality', 'roleStability', 'vacatedOpportunity'],
            properties: {
              roleValue: { type: 'number' },
              opportunityQuality: { type: 'number' },
              roleStability: { type: 'number' },
              vacatedOpportunity: { type: 'number' },
            },
          },
          compositeScore: { type: 'number' },
          verdict: { $ref: '#/components/schemas/Verdict' },
          flags: {
            type: 'array',
            items: { $ref: '#/components/schemas/RoleEvaluationFlag' },
          },
          primaryReason: { type: 'string' },
          riskNote: { type: 'string' },
          scoreBands: {
            type: 'object',
            additionalProperties: false,
            properties: {
              roleValue: { $ref: '#/components/schemas/ScoreBand' },
              opportunityQuality: { $ref: '#/components/schemas/ScoreBand' },
              roleStability: { $ref: '#/components/schemas/ScoreBand' },
              vacatedOpportunity: { $ref: '#/components/schemas/ScoreBand' },
            },
          },
          explanationBullets: {
            type: 'array',
            items: { type: 'string' },
          },
          profile: { $ref: '#/components/schemas/PlayerRoleProfile' },
          context: { $ref: '#/components/schemas/TeamOpportunityContext' },
          evaluationMeta: {
            type: 'object',
            additionalProperties: false,
            required: ['explanationLevel'],
            properties: {
              requestIndex: { type: 'integer', minimum: 0 },
              explanationLevel: { $ref: '#/components/schemas/ExplanationLevel' },
            },
          },
        },
      },
      BatchItemSuccess: {
        type: 'object',
        additionalProperties: false,
        required: ['requestIndex', 'result'],
        properties: {
          requestIndex: { type: 'integer', minimum: 0 },
          result: { $ref: '#/components/schemas/RoleEvaluationOutput' },
        },
      },
      BatchItemError: {
        type: 'object',
        additionalProperties: false,
        required: ['requestIndex', 'error', 'details'],
        properties: {
          requestIndex: { type: 'integer', minimum: 0 },
          error: { type: 'string' },
          details: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationIssue' },
          },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['service'],
        summary: 'Service description',
        responses: {
          '200': {
            description: 'Service metadata and endpoint list.',
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['service'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Healthy service.',
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['service'],
        summary: 'Machine-readable OpenAPI contract',
        responses: {
          '200': {
            description: 'OpenAPI 3.1 contract document.',
          },
        },
      },
    },
    '/api/evaluate': {
      post: {
        tags: ['evaluation'],
        summary: 'Evaluate one WR/TE role profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RoleEvaluationRequest' },
              examples: {
                default: { value: requestExample },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Deterministic evaluation result.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleEvaluationOutput' },
                examples: {
                  default: { value: successExample },
                },
              },
            },
          },
          '400': {
            description: 'Validation failure.',
          },
        },
      },
    },
    '/api/evaluate/from-data': {
      post: {
        tags: ['evaluation'],
        summary: 'Evaluate one WR/TE role profile from TIBER-Data',
        description:
          'Fetches compatibility player role profiles from /api/compatibility/player-role-profiles and team opportunity context from /api/compatibility/team-opportunity-context before running the deterministic scorer.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpstreamRoleEvaluationRequest' },
              examples: {
                default: { value: upstreamRequestExample },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Deterministic evaluation result with upstream source metadata.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleEvaluationOutput' },
                examples: {
                  default: { value: upstreamSuccessExample },
                },
              },
            },
          },
          '400': {
            description: 'Validation failure.',
          },
          '404': {
            description: 'Upstream data was not found.',
          },
          '409': {
            description: 'Upstream data was ambiguous.',
          },
          '502': {
            description: 'Upstream data was incomplete or unavailable.',
          },
        },
      },
    },
    '/api/evaluate/batch': {
      post: {
        tags: ['evaluation'],
        summary: 'Evaluate a batch of WR/TE role profiles',
        description:
          'Accepts either the legacy raw array form (strict by default) or an envelope with items and options.strict=false for partial-success mode.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/RoleEvaluationRequest' },
                  },
                  { $ref: '#/components/schemas/BatchRequestEnvelope' },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Strict success or partial-success batch result.',
            content: {
              'application/json': {
                examples: {
                  partialSuccess: { value: partialBatchResponseExample },
                },
              },
            },
          },
          '400': {
            description: 'Strict-mode validation failure.',
          },
        },
      },
    },
  },
  'x-serviceMeta': {
    ...buildMeta(),
    service: SERVICE_NAME,
  },
});
