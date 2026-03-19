import type { PlayerRoleProfile, Position } from '../types/playerRole.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import { EXPLANATION_LEVELS, type ExplanationLevel } from '../contracts/constants.ts';
import type { BatchEvaluationRequestEnvelope } from '../types/roleOutput.ts';

export interface RoleEvaluationRequest {
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
  scenarioId?: string;
  scenarioName?: string;
  explanationLevel?: ExplanationLevel;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationIssue[];
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const joinPath = (basePath: string, field: string) => `${basePath}.${field}`;

const readString = (source: UnknownRecord, basePath: string, field: string, issues: ValidationIssue[], required = true) => {
  const value = source[field];
  const path = joinPath(basePath, field);

  if (value === undefined || value === null || value === '') {
    if (required) {
      issues.push({ field: path, message: 'is required' });
    }

    return undefined;
  }

  if (typeof value !== 'string') {
    issues.push({ field: path, message: 'must be a string' });
    return undefined;
  }

  return value;
};

const readNumber = (
  source: UnknownRecord,
  basePath: string,
  field: string,
  issues: ValidationIssue[],
  options: { min?: number; max?: number } = {},
) => {
  const value = source[field];
  const path = joinPath(basePath, field);

  if (typeof value !== 'number' || Number.isNaN(value)) {
    issues.push({ field: path, message: 'must be a number' });
    return undefined;
  }

  if (options.min !== undefined && value < options.min) {
    issues.push({ field: path, message: `must be greater than or equal to ${options.min}` });
    return undefined;
  }

  if (options.max !== undefined && value > options.max) {
    issues.push({ field: path, message: `must be less than or equal to ${options.max}` });
    return undefined;
  }

  return value;
};

const readPosition = (source: UnknownRecord, basePath: string, field: string, issues: ValidationIssue[]): Position | undefined => {
  const value = readString(source, basePath, field, issues);

  if (value === undefined) {
    return undefined;
  }

  if (value !== 'WR' && value !== 'TE') {
    issues.push({ field: joinPath(basePath, field), message: 'must be WR or TE' });
    return undefined;
  }

  return value;
};

const readExplanationLevel = (
  source: UnknownRecord,
  basePath: string,
  field: string,
  issues: ValidationIssue[],
): ExplanationLevel | undefined => {
  const value = source[field];
  const path = joinPath(basePath, field);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !EXPLANATION_LEVELS.includes(value as ExplanationLevel)) {
    issues.push({ field: path, message: `must be ${EXPLANATION_LEVELS.join(', ')}` });
    return undefined;
  }

  return value as ExplanationLevel;
};

const readBoolean = (source: UnknownRecord, basePath: string, field: string, issues: ValidationIssue[]) => {
  const value = source[field];
  const path = joinPath(basePath, field);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    issues.push({ field: path, message: 'must be a boolean' });
    return undefined;
  }

  return value;
};

const validateProfile = (input: unknown, path: string, issues: ValidationIssue[]): PlayerRoleProfile | undefined => {
  if (!isRecord(input)) {
    issues.push({ field: path, message: 'must be an object' });
    return undefined;
  }

  return {
    playerId: readString(input, path, 'playerId', issues) ?? '',
    playerName: readString(input, path, 'playerName', issues) ?? '',
    position: readPosition(input, path, 'position', issues) ?? 'WR',
    targetShare: readNumber(input, path, 'targetShare', issues, { min: 0, max: 100 }) ?? 0,
    airYardShare: readNumber(input, path, 'airYardShare', issues, { min: 0, max: 100 }) ?? 0,
    routeParticipation: readNumber(input, path, 'routeParticipation', issues, { min: 0, max: 100 }) ?? 0,
    slotRate: readNumber(input, path, 'slotRate', issues, { min: 0, max: 100 }) ?? 0,
    inlineRate: readNumber(input, path, 'inlineRate', issues, { min: 0, max: 100 }) ?? 0,
    wideRate: readNumber(input, path, 'wideRate', issues, { min: 0, max: 100 }) ?? 0,
    redZoneTargetShare: readNumber(input, path, 'redZoneTargetShare', issues, { min: 0, max: 100 }) ?? 0,
    firstReadShare: readNumber(input, path, 'firstReadShare', issues, { min: 0, max: 100 }) ?? 0,
    averageDepthOfTarget: readNumber(input, path, 'averageDepthOfTarget', issues, { min: 0, max: 40 }) ?? 0,
    explosiveTargetRate: readNumber(input, path, 'explosiveTargetRate', issues, { min: 0, max: 100 }) ?? 0,
    personnelVersatility: readNumber(input, path, 'personnelVersatility', issues, { min: 0, max: 100 }) ?? 0,
    competitionForRole: readNumber(input, path, 'competitionForRole', issues, { min: 0, max: 100 }) ?? 0,
    injuryRisk: readNumber(input, path, 'injuryRisk', issues, { min: 0, max: 100 }) ?? 0,
    vacatedTargetsAvailable: readNumber(input, path, 'vacatedTargetsAvailable', issues, { min: 0, max: 100 }) ?? 0,
  };
};

const validateContext = (input: unknown, path: string, issues: ValidationIssue[]): TeamOpportunityContext | undefined => {
  if (!isRecord(input)) {
    issues.push({ field: path, message: 'must be an object' });
    return undefined;
  }

  return {
    teamId: readString(input, path, 'teamId', issues) ?? '',
    teamName: readString(input, path, 'teamName', issues) ?? '',
    passRateOverExpected: readNumber(input, path, 'passRateOverExpected', issues, { min: -100, max: 100 }) ?? 0,
    neutralPassRate: readNumber(input, path, 'neutralPassRate', issues, { min: 0, max: 100 }) ?? 0,
    redZonePassRate: readNumber(input, path, 'redZonePassRate', issues, { min: 0, max: 100 }) ?? 0,
    paceIndex: readNumber(input, path, 'paceIndex', issues, { min: 0, max: 100 }) ?? 0,
    quarterbackStability: readNumber(input, path, 'quarterbackStability', issues, { min: 0, max: 100 }) ?? 0,
    playCallerContinuity: readNumber(input, path, 'playCallerContinuity', issues, { min: 0, max: 100 }) ?? 0,
    targetCompetitionIndex: readNumber(input, path, 'targetCompetitionIndex', issues, { min: 0, max: 100 }) ?? 0,
    receiverRoomCertainty: readNumber(input, path, 'receiverRoomCertainty', issues, { min: 0, max: 100 }) ?? 0,
    vacatedTargetShare: readNumber(input, path, 'vacatedTargetShare', issues, { min: 0, max: 100 }) ?? 0,
  };
};

const withDefaultExplanationLevel = (data: RoleEvaluationRequest): RoleEvaluationRequest => ({
  ...data,
  explanationLevel: data.explanationLevel ?? 'standard',
});

export const validateRoleEvaluationRequestAtPath = (input: unknown, path: string): ValidationResult<RoleEvaluationRequest> => {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ field: path, message: 'must be an object' }],
    };
  }

  const issues: ValidationIssue[] = [];
  const profile = validateProfile(input.profile, joinPath(path, 'profile'), issues);
  const context = validateContext(input.context, joinPath(path, 'context'), issues);
  const scenarioId = readString(input, path, 'scenarioId', issues, false);
  const scenarioName = readString(input, path, 'scenarioName', issues, false);
  const explanationLevel = readExplanationLevel(input, path, 'explanationLevel', issues);

  if (issues.length > 0 || !profile || !context) {
    return {
      success: false,
      errors: issues,
    };
  }

  return {
    success: true,
    data: {
      profile,
      context,
      scenarioId,
      scenarioName,
      explanationLevel,
    },
  };
};

export const validateRoleEvaluationRequest = (input: unknown): ValidationResult<RoleEvaluationRequest> => {
  const result = validateRoleEvaluationRequestAtPath(input, 'body');

  if (!result.success || !result.data) {
    return result;
  }

  return {
    success: true,
    data: withDefaultExplanationLevel(result.data),
  };
};

export interface BatchRoleEvaluationRequest {
  items: unknown[];
  strict: boolean;
}

export const validateBatchRoleEvaluationEnvelope = (input: unknown): ValidationResult<BatchRoleEvaluationRequest> => {
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return {
        success: false,
        errors: [{ field: 'body', message: 'must contain at least one role evaluation request' }],
      };
    }

    return {
      success: true,
      data: {
        items: input,
        strict: true,
      },
    };
  }

  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ field: 'body', message: 'must be an array of role evaluation requests or an object with items' }],
    };
  }

  const issues: ValidationIssue[] = [];
  const envelope = input as BatchEvaluationRequestEnvelope;

  if (!Array.isArray(envelope.items)) {
    issues.push({ field: 'body.items', message: 'must be an array of role evaluation requests' });
  } else if (envelope.items.length === 0) {
    issues.push({ field: 'body.items', message: 'must contain at least one role evaluation request' });
  }

  let strict = true;

  if (envelope.options !== undefined) {
    if (!isRecord(envelope.options)) {
      issues.push({ field: 'body.options', message: 'must be an object' });
    } else {
      strict = readBoolean(envelope.options, 'body.options', 'strict', issues) ?? true;
    }
  }

  if (issues.length > 0 || !Array.isArray(envelope.items)) {
    return {
      success: false,
      errors: issues,
    };
  }

  return {
    success: true,
    data: {
      items: envelope.items,
      strict,
    },
  };
};

export const validateBatchRoleEvaluationRequest = (input: unknown): ValidationResult<RoleEvaluationRequest[]> => {
  const envelope = validateBatchRoleEvaluationEnvelope(input);

  if (!envelope.success || !envelope.data) {
    return {
      success: false,
      errors: envelope.errors,
    };
  }

  const data: RoleEvaluationRequest[] = [];
  const errors: ValidationIssue[] = [];

  envelope.data.items.forEach((item, index) => {
    const result = validateRoleEvaluationRequestAtPath(item, `body[${index}]`);

    if (!result.success || !result.data) {
      errors.push(...(result.errors ?? []));
      return;
    }

    data.push(withDefaultExplanationLevel(result.data));
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data,
  };
};

export interface UpstreamRoleEvaluationRequest {
  playerId?: string;
  team?: string;
  season?: number;
  week?: number;
  scenarioId?: string;
  scenarioName?: string;
  explanationLevel?: ExplanationLevel;
}

export const validateUpstreamRoleEvaluationRequest = (input: unknown): ValidationResult<UpstreamRoleEvaluationRequest> => {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ field: 'body', message: 'must be an object' }],
    };
  }

  const issues: ValidationIssue[] = [];
  const playerId = readString(input, 'body', 'player_id', issues, false);
  const team = readString(input, 'body', 'team', issues, false);
  const scenarioId = readString(input, 'body', 'scenarioId', issues, false);
  const scenarioName = readString(input, 'body', 'scenarioName', issues, false);
  const explanationLevel = readExplanationLevel(input, 'body', 'explanationLevel', issues);

  const seasonValue = input.season;
  let season: number | undefined;
  if (seasonValue !== undefined) {
    if (typeof seasonValue !== 'number' || Number.isNaN(seasonValue)) {
      issues.push({ field: 'body.season', message: 'must be a number' });
    } else {
      season = seasonValue;
    }
  }

  const weekValue = input.week;
  let week: number | undefined;
  if (weekValue !== undefined) {
    if (typeof weekValue !== 'number' || Number.isNaN(weekValue)) {
      issues.push({ field: 'body.week', message: 'must be a number' });
    } else {
      week = weekValue;
    }
  }

  if (!playerId && !team) {
    issues.push({ field: 'body', message: 'must include at least one identifier: player_id or team' });
  }

  if (issues.length > 0) {
    return {
      success: false,
      errors: issues,
    };
  }

  return {
    success: true,
    data: {
      playerId,
      team,
      season,
      week,
      scenarioId,
      scenarioName,
      explanationLevel: explanationLevel ?? 'standard',
    },
  };
};
