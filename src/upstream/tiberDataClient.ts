import { TIBER_DATA_BASE_URL } from '../config/service.ts';
import type { PlayerRoleProfile } from '../types/playerRole.ts';
import type { TeamOpportunityContext } from '../types/teamOpportunity.ts';
import type { ValidationIssue } from '../validation/roleEvaluationRequest.ts';

export interface EvaluationLookup {
  playerId?: string;
  team?: string;
  season?: number;
  week?: number;
}

export interface UpstreamEvaluationInput {
  profile: PlayerRoleProfile;
  context: TeamOpportunityContext;
}

export class TiberDataError extends Error {
  status: number;
  details?: ValidationIssue[];

  constructor(message: string, options: { status?: number; details?: ValidationIssue[] } = {}) {
    super(message);
    this.name = 'TiberDataError';
    this.status = options.status ?? 502;
    this.details = options.details;
  }
}

type UnknownRecord = Record<string, unknown>;
type FetchLike = typeof fetch;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const readField = (source: UnknownRecord, fieldNames: string[]): unknown => {
  for (const fieldName of fieldNames) {
    if (fieldName in source) {
      return source[fieldName];
    }
  }

  return undefined;
};

const readString = (source: UnknownRecord, fieldNames: string[], issues: ValidationIssue[], field: string) => {
  const value = readField(source, fieldNames);

  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ field, message: 'is required and must be a string' });
    return undefined;
  }

  return value;
};

const readNumber = (source: UnknownRecord, fieldNames: string[], issues: ValidationIssue[], field: string) => {
  const value = readField(source, fieldNames);

  if (typeof value !== 'number' || Number.isNaN(value)) {
    issues.push({ field, message: 'is required and must be a number' });
    return undefined;
  }

  return value;
};

const normalizeCollection = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const collection = readField(payload, ['items', 'data', 'results']);

  if (Array.isArray(collection)) {
    return collection;
  }

  return [payload];
};

const describeLookup = (lookup: EvaluationLookup) =>
  JSON.stringify({
    ...(lookup.playerId ? { player_id: lookup.playerId } : {}),
    ...(lookup.team ? { team: lookup.team } : {}),
    ...(lookup.season !== undefined ? { season: lookup.season } : {}),
    ...(lookup.week !== undefined ? { week: lookup.week } : {}),
  });

const parsePlayerRoleProfile = (payload: unknown): PlayerRoleProfile => {
  if (!isRecord(payload)) {
    throw new TiberDataError('TIBER-Data player role inputs response must contain an object result.', { status: 502 });
  }

  const issues: ValidationIssue[] = [];
  const position = readString(payload, ['position'], issues, 'profile.position');
  const profile: PlayerRoleProfile = {
    playerId: readString(payload, ['playerId', 'player_id'], issues, 'profile.playerId') ?? '',
    playerName: readString(payload, ['playerName', 'player_name'], issues, 'profile.playerName') ?? '',
    position: (position as PlayerRoleProfile['position'] | undefined) ?? 'WR',
    targetShare: readNumber(payload, ['targetShare', 'target_share'], issues, 'profile.targetShare') ?? 0,
    airYardShare: readNumber(payload, ['airYardShare', 'air_yard_share'], issues, 'profile.airYardShare') ?? 0,
    routeParticipation: readNumber(payload, ['routeParticipation', 'route_participation'], issues, 'profile.routeParticipation') ?? 0,
    slotRate: readNumber(payload, ['slotRate', 'slot_rate'], issues, 'profile.slotRate') ?? 0,
    inlineRate: readNumber(payload, ['inlineRate', 'inline_rate'], issues, 'profile.inlineRate') ?? 0,
    wideRate: readNumber(payload, ['wideRate', 'wide_rate'], issues, 'profile.wideRate') ?? 0,
    redZoneTargetShare: readNumber(payload, ['redZoneTargetShare', 'red_zone_target_share'], issues, 'profile.redZoneTargetShare') ?? 0,
    firstReadShare: readNumber(payload, ['firstReadShare', 'first_read_share'], issues, 'profile.firstReadShare') ?? 0,
    averageDepthOfTarget: readNumber(payload, ['averageDepthOfTarget', 'average_depth_of_target'], issues, 'profile.averageDepthOfTarget') ?? 0,
    explosiveTargetRate: readNumber(payload, ['explosiveTargetRate', 'explosive_target_rate'], issues, 'profile.explosiveTargetRate') ?? 0,
    personnelVersatility: readNumber(payload, ['personnelVersatility', 'personnel_versatility'], issues, 'profile.personnelVersatility') ?? 0,
    competitionForRole: readNumber(payload, ['competitionForRole', 'competition_for_role'], issues, 'profile.competitionForRole') ?? 0,
    injuryRisk: readNumber(payload, ['injuryRisk', 'injury_risk'], issues, 'profile.injuryRisk') ?? 0,
    vacatedTargetsAvailable: readNumber(payload, ['vacatedTargetsAvailable', 'vacated_targets_available'], issues, 'profile.vacatedTargetsAvailable') ?? 0,
  };

  if (profile.position !== 'WR' && profile.position !== 'TE') {
    issues.push({ field: 'profile.position', message: 'must be WR or TE' });
  }

  if (issues.length > 0) {
    throw new TiberDataError('TIBER-Data player role inputs were incomplete.', {
      status: 502,
      details: issues,
    });
  }

  return profile;
};

const parseTeamOpportunityContext = (payload: unknown): TeamOpportunityContext => {
  if (!isRecord(payload)) {
    throw new TiberDataError('TIBER-Data team context response must contain an object result.', { status: 502 });
  }

  const issues: ValidationIssue[] = [];
  const context: TeamOpportunityContext = {
    teamId: readString(payload, ['teamId', 'team_id'], issues, 'context.teamId') ?? '',
    teamName: readString(payload, ['teamName', 'team_name'], issues, 'context.teamName') ?? '',
    passRateOverExpected: readNumber(payload, ['passRateOverExpected', 'pass_rate_over_expected'], issues, 'context.passRateOverExpected') ?? 0,
    neutralPassRate: readNumber(payload, ['neutralPassRate', 'neutral_pass_rate'], issues, 'context.neutralPassRate') ?? 0,
    redZonePassRate: readNumber(payload, ['redZonePassRate', 'red_zone_pass_rate'], issues, 'context.redZonePassRate') ?? 0,
    paceIndex: readNumber(payload, ['paceIndex', 'pace_index'], issues, 'context.paceIndex') ?? 0,
    quarterbackStability: readNumber(payload, ['quarterbackStability', 'quarterback_stability'], issues, 'context.quarterbackStability') ?? 0,
    playCallerContinuity: readNumber(payload, ['playCallerContinuity', 'play_caller_continuity'], issues, 'context.playCallerContinuity') ?? 0,
    targetCompetitionIndex: readNumber(payload, ['targetCompetitionIndex', 'target_competition_index'], issues, 'context.targetCompetitionIndex') ?? 0,
    receiverRoomCertainty: readNumber(payload, ['receiverRoomCertainty', 'receiver_room_certainty'], issues, 'context.receiverRoomCertainty') ?? 0,
    vacatedTargetShare: readNumber(payload, ['vacatedTargetShare', 'vacated_target_share'], issues, 'context.vacatedTargetShare') ?? 0,
  };

  if (issues.length > 0) {
    throw new TiberDataError('TIBER-Data team context was incomplete.', {
      status: 502,
      details: issues,
    });
  }

  return context;
};

export class TiberDataClient {
  readonly baseUrl: string;
  readonly fetchImpl: FetchLike;

  constructor(options: { baseUrl?: string; fetchImpl?: FetchLike } = {}) {
    this.baseUrl = (options.baseUrl ?? TIBER_DATA_BASE_URL).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async requestCollection(path: string, lookup: EvaluationLookup) {
    const url = new URL(path, `${this.baseUrl}/`);

    for (const [key, value] of Object.entries({
      ...(lookup.playerId ? { player_id: lookup.playerId } : {}),
      ...(lookup.team ? { team: lookup.team } : {}),
      ...(lookup.season !== undefined ? { season: String(lookup.season) } : {}),
      ...(lookup.week !== undefined ? { week: String(lookup.week) } : {}),
    })) {
      url.searchParams.set(key, value);
    }

    let response: Response;

    try {
      response = await this.fetchImpl(url, {
        headers: {
          accept: 'application/json',
        },
      });
    } catch {
      throw new TiberDataError(`Unable to reach TIBER-Data at ${this.baseUrl}.`, { status: 502 });
    }

    if (!response.ok) {
      throw new TiberDataError(`TIBER-Data request failed for ${path} with status ${response.status}.`, { status: 502 });
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new TiberDataError(`TIBER-Data returned invalid JSON for ${path}.`, { status: 502 });
    }

    return normalizeCollection(payload);
  }

  async getPlayerRoleInputs(lookup: EvaluationLookup): Promise<PlayerRoleProfile> {
    const results = await this.requestCollection('/api/player-role-inputs', lookup);

    if (results.length === 0) {
      throw new TiberDataError(`No TIBER-Data player role inputs matched ${describeLookup(lookup)}.`, { status: 404 });
    }

    if (results.length > 1) {
      throw new TiberDataError(`Ambiguous TIBER-Data player role inputs matched ${describeLookup(lookup)}.`, { status: 409 });
    }

    return parsePlayerRoleProfile(results[0]);
  }

  async getTeamContext(lookup: EvaluationLookup): Promise<TeamOpportunityContext> {
    const results = await this.requestCollection('/api/team-context', lookup);

    if (results.length === 0) {
      throw new TiberDataError(`No TIBER-Data team context matched ${describeLookup(lookup)}.`, { status: 404 });
    }

    if (results.length > 1) {
      throw new TiberDataError(`Ambiguous TIBER-Data team context matched ${describeLookup(lookup)}.`, { status: 409 });
    }

    return parseTeamOpportunityContext(results[0]);
  }

  async getEvaluationInput(lookup: EvaluationLookup): Promise<UpstreamEvaluationInput> {
    const [profile, context] = await Promise.all([this.getPlayerRoleInputs(lookup), this.getTeamContext(lookup)]);
    return { profile, context };
  }
}

export const tiberDataClient = new TiberDataClient();
