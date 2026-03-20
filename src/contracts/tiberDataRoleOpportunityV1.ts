import type {
  ConfidenceTier,
  InternalRoleOpportunityInput,
  PrimaryRole,
  RoleOpportunityPosition,
  RoleOpportunityRecord,
  UsageOpportunityMetrics,
} from '../types/roleOpportunity.ts';

export const PRIMARY_ROLES: PrimaryRole[] = [
  'alpha_receiver',
  'secondary_receiver',
  'slot_receiver',
  'field_stretcher',
  'primary_tight_end',
  'rotational_receiver',
  'hybrid_weapon',
  'lead_back',
  'committee_back',
  'change_of_pace_back',
];

export const ROLE_OPPORTUNITY_POSITIONS: RoleOpportunityPosition[] = ['QB', 'RB', 'WR', 'TE'];
export const CONFIDENCE_TIERS: ConfidenceTier[] = ['high', 'medium', 'low'];

export const ROLE_OPPORTUNITY_SHARE_FIELDS: Array<keyof UsageOpportunityMetrics> = [
  'snapShare',
  'routeParticipation',
  'targetShare',
  'airYardShare',
  'carryShare',
  'rushAttemptShare',
  'redZoneTouchShare',
  'inside10TouchShare',
  'inside5TouchShare',
  'goalLineCarryShare',
  'teamOpportunityShare',
];

export const ROLE_OPPORTUNITY_COUNT_FIELDS: Array<keyof UsageOpportunityMetrics> = [
  'snaps',
  'routesRun',
  'targets',
  'carries',
  'redZoneTouches',
  'inside10Touches',
  'inside5Touches',
  'goalLineCarries',
];

export interface CanonicalValidationIssue {
  field: string;
  message: string;
}

export interface CanonicalValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: CanonicalValidationIssue[];
}

const isIsoDateString = (value: string) => !Number.isNaN(Date.parse(value));

const pushIfBlank = (issues: CanonicalValidationIssue[], field: string, value: string | undefined) => {
  if (!value || value.trim() === '') {
    issues.push({ field, message: 'is required' });
  }
};

const validateShare = (issues: CanonicalValidationIssue[], field: string, value: number | null) => {
  if (value === null) {
    return;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    issues.push({ field, message: 'must be a number or null' });
    return;
  }

  if (value < 0 || value > 100) {
    issues.push({ field, message: 'must be between 0 and 100 when provided' });
  }
};

const validateCount = (issues: CanonicalValidationIssue[], field: string, value: number | null) => {
  if (value === null) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    issues.push({ field, message: 'must be a non-negative integer or null' });
  }
};

export const buildEmptyUsageMetrics = (): UsageOpportunityMetrics => ({
  snapShare: null,
  routeParticipation: null,
  targetShare: null,
  airYardShare: null,
  carryShare: null,
  rushAttemptShare: null,
  redZoneTouchShare: null,
  inside10TouchShare: null,
  inside5TouchShare: null,
  goalLineCarryShare: null,
  teamOpportunityShare: null,
  snaps: null,
  routesRun: null,
  targets: null,
  carries: null,
  redZoneTouches: null,
  inside10Touches: null,
  inside5Touches: null,
  goalLineCarries: null,
});

export const validateInternalRoleOpportunityInput = (
  input: InternalRoleOpportunityInput,
): CanonicalValidationResult<InternalRoleOpportunityInput> => {
  const issues: CanonicalValidationIssue[] = [];

  pushIfBlank(issues, 'playerId', input.playerId);
  pushIfBlank(issues, 'playerName', input.playerName);
  pushIfBlank(issues, 'team', input.team);
  pushIfBlank(issues, 'source.model', input.source.model);
  pushIfBlank(issues, 'source.modelVersion', input.source.modelVersion);
  pushIfBlank(issues, 'source.inputWindow', input.source.inputWindow);

  if (!ROLE_OPPORTUNITY_POSITIONS.includes(input.position)) {
    issues.push({ field: 'position', message: `must be one of ${ROLE_OPPORTUNITY_POSITIONS.join(', ')}` });
  }

  if (!Number.isInteger(input.season) || input.season < 1900) {
    issues.push({ field: 'season', message: 'must be a valid integer season' });
  }

  if (!Number.isInteger(input.week) || input.week < 1 || input.week > 25) {
    issues.push({ field: 'week', message: 'must be an integer between 1 and 25' });
  }

  if (typeof input.confidenceScore !== 'number' || Number.isNaN(input.confidenceScore)) {
    issues.push({ field: 'confidenceScore', message: 'must be a number' });
  } else if (input.confidenceScore < 0 || input.confidenceScore > 100) {
    issues.push({ field: 'confidenceScore', message: 'must be between 0 and 100' });
  }

  for (const field of ROLE_OPPORTUNITY_SHARE_FIELDS) {
    validateShare(issues, `usage.${field}`, (input.usage[field] as number | null | undefined) ?? null);
  }

  for (const field of ROLE_OPPORTUNITY_COUNT_FIELDS) {
    validateCount(issues, `usage.${field}`, (input.usage[field] as number | null | undefined) ?? null);
  }

  if (input.generatedAt && !isIsoDateString(input.generatedAt)) {
    issues.push({ field: 'generatedAt', message: 'must be an ISO-8601 timestamp when provided' });
  }

  if (issues.length > 0) {
    return { success: false, errors: issues };
  }

  return { success: true, data: input };
};

export const validateRoleOpportunityRecord = (
  record: RoleOpportunityRecord,
): CanonicalValidationResult<RoleOpportunityRecord> => {
  const issues: CanonicalValidationIssue[] = [];

  pushIfBlank(issues, 'playerId', record.playerId);
  pushIfBlank(issues, 'playerName', record.playerName);
  pushIfBlank(issues, 'team', record.team);
  pushIfBlank(issues, 'source.model', record.source.model);
  pushIfBlank(issues, 'source.modelVersion', record.source.modelVersion);
  pushIfBlank(issues, 'source.inputWindow', record.source.inputWindow);

  if (!ROLE_OPPORTUNITY_POSITIONS.includes(record.position)) {
    issues.push({ field: 'position', message: `must be one of ${ROLE_OPPORTUNITY_POSITIONS.join(', ')}` });
  }

  if (!PRIMARY_ROLES.includes(record.primaryRole)) {
    issues.push({ field: 'primaryRole', message: `must be one of ${PRIMARY_ROLES.join(', ')}` });
  }

  if (!Array.isArray(record.roleTags) || record.roleTags.some((tag) => typeof tag !== 'string' || tag.trim() === '')) {
    issues.push({ field: 'roleTags', message: 'must be an array of non-empty strings' });
  }

  if (!Number.isInteger(record.season) || record.season < 1900) {
    issues.push({ field: 'season', message: 'must be a valid integer season' });
  }

  if (!Number.isInteger(record.week) || record.week < 1 || record.week > 25) {
    issues.push({ field: 'week', message: 'must be an integer between 1 and 25' });
  }

  for (const field of ROLE_OPPORTUNITY_SHARE_FIELDS) {
    validateShare(issues, `usage.${field}`, record.usage[field]);
  }

  for (const field of ROLE_OPPORTUNITY_COUNT_FIELDS) {
    validateCount(issues, `usage.${field}`, record.usage[field]);
  }

  if (typeof record.confidence.score !== 'number' || record.confidence.score < 0 || record.confidence.score > 100) {
    issues.push({ field: 'confidence.score', message: 'must be between 0 and 100' });
  }

  if (!CONFIDENCE_TIERS.includes(record.confidence.tier)) {
    issues.push({ field: 'confidence.tier', message: `must be one of ${CONFIDENCE_TIERS.join(', ')}` });
  }

  if (!Array.isArray(record.confidence.reasons) || record.confidence.reasons.length === 0) {
    issues.push({ field: 'confidence.reasons', message: 'must contain at least one reason' });
  }

  if (!isIsoDateString(record.source.generatedAt)) {
    issues.push({ field: 'source.generatedAt', message: 'must be an ISO-8601 timestamp' });
  }

  if (!Array.isArray(record.source.notes)) {
    issues.push({ field: 'source.notes', message: 'must be an array' });
  }

  if (issues.length > 0) {
    return { success: false, errors: issues };
  }

  return { success: true, data: record };
};
