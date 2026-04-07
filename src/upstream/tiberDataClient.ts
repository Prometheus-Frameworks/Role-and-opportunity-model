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

type ProfileSchemaField = keyof PlayerRoleProfile;
type ContextSchemaField = keyof TeamOpportunityContext;

type CompatibilityCollectionPayload = {
  data: unknown[];
};

const PLAYER_ROLE_PROFILE_PATH = '/api/compatibility/player-role-profiles';
const TEAM_OPPORTUNITY_CONTEXT_PATH = '/api/compatibility/team-opportunity-context';

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const describeLookup = (lookup: EvaluationLookup) =>
  JSON.stringify({
    ...(lookup.playerId ? { player_id: lookup.playerId } : {}),
    ...(lookup.team ? { team: lookup.team } : {}),
    ...(lookup.season !== undefined ? { season: lookup.season } : {}),
    ...(lookup.week !== undefined ? { week: lookup.week } : {}),
  });

const readRequiredString = (
  source: UnknownRecord,
  sourceField: string,
  issues: ValidationIssue[],
  targetField: string,
) => {
  const value = source[sourceField];

  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ field: targetField, message: 'is required and must be a string' });
    return undefined;
  }

  return value;
};

const readRequiredNumber = (
  source: UnknownRecord,
  sourceField: string,
  issues: ValidationIssue[],
  targetField: string,
) => {
  const value = source[sourceField];

  if (typeof value !== 'number' || Number.isNaN(value)) {
    issues.push({ field: targetField, message: 'is required and must be a number' });
    return undefined;
  }

  return value;
};

const parseCompatibilityCollection = (path: string, payload: unknown): unknown[] => {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new TiberDataError(`TIBER-Data response for ${path} must contain a data array.`, { status: 502 });
  }

  return (payload as CompatibilityCollectionPayload).data;
};

const PROFILE_STRING_FIELDS: Array<{ sourceField: string; targetField: `profile.${ProfileSchemaField}` }> = [
  { sourceField: 'player_id', targetField: 'profile.playerId' },
  { sourceField: 'player_name', targetField: 'profile.playerName' },
  { sourceField: 'position', targetField: 'profile.position' },
  { sourceField: 'team_id', targetField: 'profile.teamId' },
];

const PROFILE_NUMBER_FIELDS: Array<{ sourceField: string; targetField: `profile.${ProfileSchemaField}` }> = [
  { sourceField: 'target_share', targetField: 'profile.targetShare' },
  { sourceField: 'air_yard_share', targetField: 'profile.airYardShare' },
  { sourceField: 'route_participation', targetField: 'profile.routeParticipation' },
  { sourceField: 'slot_rate', targetField: 'profile.slotRate' },
  { sourceField: 'inline_rate', targetField: 'profile.inlineRate' },
  { sourceField: 'wide_rate', targetField: 'profile.wideRate' },
  { sourceField: 'red_zone_target_share', targetField: 'profile.redZoneTargetShare' },
  { sourceField: 'first_read_share', targetField: 'profile.firstReadShare' },
  { sourceField: 'average_depth_of_target', targetField: 'profile.averageDepthOfTarget' },
  { sourceField: 'explosive_target_rate', targetField: 'profile.explosiveTargetRate' },
  { sourceField: 'personnel_versatility', targetField: 'profile.personnelVersatility' },
  { sourceField: 'competition_for_role', targetField: 'profile.competitionForRole' },
  { sourceField: 'injury_risk', targetField: 'profile.injuryRisk' },
  { sourceField: 'vacated_targets_available', targetField: 'profile.vacatedTargetsAvailable' },
];

const CONTEXT_STRING_FIELDS: Array<{ sourceField: string; targetField: `context.${ContextSchemaField}` }> = [
  { sourceField: 'team_id', targetField: 'context.teamId' },
  { sourceField: 'team_name', targetField: 'context.teamName' },
];

const CONTEXT_NUMBER_FIELDS: Array<{ sourceField: string; targetField: `context.${ContextSchemaField}` }> = [
  { sourceField: 'pass_rate_over_expected', targetField: 'context.passRateOverExpected' },
  { sourceField: 'neutral_pass_rate', targetField: 'context.neutralPassRate' },
  { sourceField: 'red_zone_pass_rate', targetField: 'context.redZonePassRate' },
  { sourceField: 'pace_index', targetField: 'context.paceIndex' },
  { sourceField: 'quarterback_stability', targetField: 'context.quarterbackStability' },
  { sourceField: 'play_caller_continuity', targetField: 'context.playCallerContinuity' },
  { sourceField: 'target_competition_index', targetField: 'context.targetCompetitionIndex' },
  { sourceField: 'receiver_room_certainty', targetField: 'context.receiverRoomCertainty' },
  { sourceField: 'vacated_target_share', targetField: 'context.vacatedTargetShare' },
];

const parsePlayerRoleProfile = (payload: unknown): PlayerRoleProfile => {
  if (!isRecord(payload)) {
    throw new TiberDataError('TIBER-Data player role profile response must contain an object result.', { status: 502 });
  }

  const issues: ValidationIssue[] = [];
  const strings = Object.fromEntries(
    PROFILE_STRING_FIELDS.map(({ sourceField, targetField }) => [
      targetField,
      readRequiredString(payload, sourceField, issues, targetField),
    ]),
  ) as Record<(typeof PROFILE_STRING_FIELDS)[number]['targetField'], string | undefined>;
  const numbers = Object.fromEntries(
    PROFILE_NUMBER_FIELDS.map(({ sourceField, targetField }) => [
      targetField,
      readRequiredNumber(payload, sourceField, issues, targetField),
    ]),
  ) as Record<(typeof PROFILE_NUMBER_FIELDS)[number]['targetField'], number | undefined>;

  const profile: PlayerRoleProfile = {
    playerId: strings['profile.playerId'] ?? '',
    playerName: strings['profile.playerName'] ?? '',
    teamId: strings['profile.teamId'],
    position: (strings['profile.position'] as PlayerRoleProfile['position'] | undefined) ?? 'WR',
    targetShare: numbers['profile.targetShare'] ?? 0,
    airYardShare: numbers['profile.airYardShare'] ?? 0,
    routeParticipation: numbers['profile.routeParticipation'] ?? 0,
    slotRate: numbers['profile.slotRate'] ?? 0,
    inlineRate: numbers['profile.inlineRate'] ?? 0,
    wideRate: numbers['profile.wideRate'] ?? 0,
    redZoneTargetShare: numbers['profile.redZoneTargetShare'] ?? 0,
    firstReadShare: numbers['profile.firstReadShare'] ?? 0,
    averageDepthOfTarget: numbers['profile.averageDepthOfTarget'] ?? 0,
    explosiveTargetRate: numbers['profile.explosiveTargetRate'] ?? 0,
    personnelVersatility: numbers['profile.personnelVersatility'] ?? 0,
    competitionForRole: numbers['profile.competitionForRole'] ?? 0,
    injuryRisk: numbers['profile.injuryRisk'] ?? 0,
    vacatedTargetsAvailable: numbers['profile.vacatedTargetsAvailable'] ?? 0,
  };

  if (profile.position !== 'WR' && profile.position !== 'TE') {
    issues.push({ field: 'profile.position', message: 'must be WR or TE' });
  }

  if (issues.length > 0) {
    throw new TiberDataError('TIBER-Data player role profiles were incomplete.', {
      status: 502,
      details: issues,
    });
  }

  return profile;
};

const parseTeamOpportunityContext = (payload: unknown): TeamOpportunityContext => {
  if (!isRecord(payload)) {
    throw new TiberDataError('TIBER-Data team opportunity context response must contain an object result.', { status: 502 });
  }

  const issues: ValidationIssue[] = [];
  const strings = Object.fromEntries(
    CONTEXT_STRING_FIELDS.map(({ sourceField, targetField }) => [
      targetField,
      readRequiredString(payload, sourceField, issues, targetField),
    ]),
  ) as Record<(typeof CONTEXT_STRING_FIELDS)[number]['targetField'], string | undefined>;
  const numbers = Object.fromEntries(
    CONTEXT_NUMBER_FIELDS.map(({ sourceField, targetField }) => [
      targetField,
      readRequiredNumber(payload, sourceField, issues, targetField),
    ]),
  ) as Record<(typeof CONTEXT_NUMBER_FIELDS)[number]['targetField'], number | undefined>;

  const context: TeamOpportunityContext = {
    teamId: strings['context.teamId'] ?? '',
    teamName: strings['context.teamName'] ?? '',
    passRateOverExpected: numbers['context.passRateOverExpected'] ?? 0,
    neutralPassRate: numbers['context.neutralPassRate'] ?? 0,
    redZonePassRate: numbers['context.redZonePassRate'] ?? 0,
    paceIndex: numbers['context.paceIndex'] ?? 0,
    quarterbackStability: numbers['context.quarterbackStability'] ?? 0,
    playCallerContinuity: numbers['context.playCallerContinuity'] ?? 0,
    targetCompetitionIndex: numbers['context.targetCompetitionIndex'] ?? 0,
    receiverRoomCertainty: numbers['context.receiverRoomCertainty'] ?? 0,
    vacatedTargetShare: numbers['context.vacatedTargetShare'] ?? 0,
  };

  if (issues.length > 0) {
    throw new TiberDataError('TIBER-Data team opportunity context was incomplete.', {
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

    return parseCompatibilityCollection(path, payload);
  }

  async getPlayerRoleInputs(lookup: EvaluationLookup): Promise<PlayerRoleProfile> {
    const results = await this.requestCollection(PLAYER_ROLE_PROFILE_PATH, lookup);

    if (results.length === 0) {
      throw new TiberDataError(`No TIBER-Data player role profiles matched ${describeLookup(lookup)}.`, { status: 404 });
    }

    if (results.length > 1) {
      throw new TiberDataError(`Ambiguous TIBER-Data player role profiles matched ${describeLookup(lookup)}.`, { status: 409 });
    }

    return parsePlayerRoleProfile(results[0]);
  }

  async getTeamContext(lookup: EvaluationLookup): Promise<TeamOpportunityContext> {
    const results = await this.requestCollection(TEAM_OPPORTUNITY_CONTEXT_PATH, lookup);

    if (results.length === 0) {
      throw new TiberDataError(`No TIBER-Data team opportunity context matched ${describeLookup(lookup)}.`, { status: 404 });
    }

    if (results.length > 1) {
      throw new TiberDataError(`Ambiguous TIBER-Data team opportunity context matched ${describeLookup(lookup)}.`, { status: 409 });
    }

    return parseTeamOpportunityContext(results[0]);
  }

  async getEvaluationInput(lookup: EvaluationLookup): Promise<UpstreamEvaluationInput> {
    const [profile, context] = await Promise.all([this.getPlayerRoleInputs(lookup), this.getTeamContext(lookup)]);
    return { profile, context };
  }

  /**
   * Fetch all WR/TE player role profiles for a given season and week.
   * Returns an empty array if no records exist for the scope.
   * Fails loudly if the upstream response is malformed.
   */
  async getAllPlayerRoleInputs(season: number, week: number): Promise<PlayerRoleProfile[]> {
    const results = await this.requestCollection(PLAYER_ROLE_PROFILE_PATH, { season, week });
    const profiles: PlayerRoleProfile[] = [];

    for (const result of results) {
      try {
        profiles.push(parsePlayerRoleProfile(result));
      } catch (error) {
        if (error instanceof TiberDataError) {
          // Skip individual invalid records but fail if nothing was parsed
          continue;
        }
        throw error;
      }
    }

    return profiles;
  }

  /**
   * Fetch all team opportunity contexts for a given season and week.
   * Returns an empty array if no records exist for the scope.
   * Fails loudly if the upstream response is malformed.
   */
  async getAllTeamContexts(season: number, week: number): Promise<TeamOpportunityContext[]> {
    const results = await this.requestCollection(TEAM_OPPORTUNITY_CONTEXT_PATH, { season, week });
    const contexts: TeamOpportunityContext[] = [];

    for (const result of results) {
      try {
        contexts.push(parseTeamOpportunityContext(result));
      } catch (error) {
        if (error instanceof TiberDataError) {
          // Skip individual invalid records but fail if nothing was parsed
          continue;
        }
        throw error;
      }
    }

    return contexts;
  }

  /**
   * Fetch all eligible WR/TE evaluation inputs for a given season and week.
   * Returns an empty array if no upstream data exists for the scope.
   * Fails loudly if upstream is unreachable or returns malformed data.
   *
   * Note: This method requires TIBER-Data to provide player profiles with
   * a `team_id` field so players can be paired with their team contexts.
   */
  async getAllEvaluationInputs(season: number, week: number): Promise<UpstreamEvaluationInput[]> {
    const [profiles, contexts] = await Promise.all([
      this.getAllPlayerRoleInputs(season, week),
      this.getAllTeamContexts(season, week),
    ]);

    // Build a map of teamId -> context for efficient lookup
    const contextByTeam = new Map<string, TeamOpportunityContext>();
    for (const context of contexts) {
      contextByTeam.set(context.teamId, context);
    }

    // Pair each profile with its corresponding team context
    const inputs: UpstreamEvaluationInput[] = [];
    const skippedPlayers: string[] = [];

    for (const profile of profiles) {
      // Find the context by teamId from the player profile
      if (!profile.teamId) {
        skippedPlayers.push(profile.playerId);
        continue;
      }

      const context = contextByTeam.get(profile.teamId);
      if (!context) {
        skippedPlayers.push(profile.playerId);
        continue;
      }

      inputs.push({ profile, context });
    }

    if (skippedPlayers.length > 0 && inputs.length === 0) {
      throw new TiberDataError(
        `No valid player-context pairs found. ${skippedPlayers.length} players could not be paired with team contexts.`,
        { status: 502 },
      );
    }

    return inputs;
  }
}

export const tiberDataClient = new TiberDataClient();
