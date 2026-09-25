/** Offline qualification bridge, not a Data producer or a Role State builder. */
import { canonicalizeJcs, parseJcsJson, rawByteSha256, contractContentSha256, CONTENT_PROFILE, RAW_PROFILE, compareArtifactClocks, validateArtifactReference } from '../contracts/artifactDigestV1.ts';
import type { ArtifactRef, Counts, Field, Evidence, PlayerTeamAllocationHandoffV1 as Handoff } from '../contracts/weeklyRoleStateV1.ts';
import { validateAllocationHandoffV1 } from '../validation/weeklyRoleStateV1.ts';
import { RETAINED_WEEK1_BINDING } from './retainedWeek1Binding.ts';
import { RETAINED_WEEK2_BINDING } from './retainedWeek2Binding.ts';

export type RawPin = { path: string; size: number; sha256: string };
export type OfflineBinding = {
  sourceSupportCommit: string; candidateGeneratedAt: string; generationEvidence: string;
  generationWitness?: { path: string; dataBase: string };
  games: readonly string[]; paths: Record<'candidate' | 'player' | 'team' | 'schedule' | 'sourceReceipt' | 'scheduleReceipt' | 'sourceLicense' | 'scheduleLicense' | 'publisher' | 'builder', string>;
  pins: readonly RawPin[];
};
export type OutputIdentity = { artifactId: string; revision: string; generatedAt: string };
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };
const must = (ok: unknown, message: string): void => { if (!ok) throw Error(`offline allocation: ${message}`); };
const obj = (v: Json | undefined): Obj => { must(v !== null && typeof v === 'object' && !Array.isArray(v), 'expected object'); return v as Obj; };
const arr = (v: Json | undefined): Json[] => { must(Array.isArray(v), 'expected array'); return v as Json[]; };
const str = (v: Json | undefined): string => { must(typeof v === 'string', 'expected string'); return v as string; };
const same = (a: unknown, b: unknown, label: string): void => must(canonicalizeJcs(a) === canonicalizeJcs(b), label);
const clone = <T>(v: T): T => structuredClone(v);
const utf8 = (v: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(v));
export type ReviewedAllocationScope = { season: 2026; seasonType: 'REG'; week: 1 | 2 };
const week1: ReviewedAllocationScope = { season: 2026, seasonType: 'REG', week: 1 };
const core = { carries: 'carries', targets: 'targets', receptions: 'receptions', passAttempts: 'attempts' } as const;
const fields = Object.keys(core) as Field[];
const signed = new Set(['passing_yards', 'rushing_yards', 'receiving_yards', 'receiving_air_yards', 'receiving_yards_after_catch']);
export const DATA_OBSERVATIONS = ['completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 'sacks_suffered', 'sack_fumbles_lost', 'carries', 'rushing_yards', 'rushing_tds', 'rushing_fumbles_lost', 'receptions', 'targets', 'receiving_yards', 'receiving_tds', 'receiving_fumbles_lost', 'fumbles_lost_total', 'passing_2pt_conversions', 'rushing_2pt_conversions', 'receiving_2pt_conversions', 'receiving_air_yards', 'receiving_yards_after_catch', 'passing_first_downs', 'rushing_first_downs', 'receiving_first_downs'] as const;

/** Strict CSV reader; row numbers are logical records including the header, not physical lines.
 * Raw transport extras (including vendor fantasy columns) are never mapped as observations. */
export function readSourceCsv(bytes: Uint8Array): Record<string, string>[] {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const records: string[][] = []; let record: string[] = [], cell = '', quoted = false, closed = false;
  const endCell = () => { record.push(cell); cell = ''; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',') endCell();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endCell(); must(record.some(x => x !== ''), 'blank CSV record'); records.push(record); record = [];
    } else if (c === '"') { must(cell === '' && !closed, 'malformed CSV quote'); quoted = true; }
    else { must(!closed, 'text after CSV quote'); cell += c; }
  }
  must(!quoted, 'unterminated CSV quote');
  if (cell !== '' || record.length || closed) { endCell(); records.push(record); }
  const header = records.shift() ?? [];
  must(header.length > 0 && header.every(Boolean) && new Set(header).size === header.length, 'missing/duplicate CSV headers');
  return records.map(row => { must(row.length === header.length, 'malformed CSV width'); return Object.fromEntries(header.map((h, i) => [h, row[i]])); });
}
function sourceNumber(value: string | undefined, field: string): number | null {
  if (value === undefined || ['', 'NA', 'NaN', 'null'].includes(value)) return null;
  must(/^-?\d+(?:\.0+)?$/.test(value), `non-integer ${field}`);
  const n = Number(value); must(Number.isSafeInteger(n) && Math.abs(n) <= 1_000_000 && (n >= 0 || signed.has(field)), `invalid count ${field}`); return n;
}
function utc(v: Json | undefined): string {
  const s = str(v).replace(/\+00:00$/, 'Z');
  must(!validateArtifactReference({ artifactId: 'clock', revision: 'clock', sha256: '0'.repeat(64), artifactType: 'evidence_file', digestProfile: RAW_PROFILE, generatedAt: s }).length, 'invalid source clock'); return s;
}
export type AllocationAdapterResult = {
  handoff: Handoff;
  /** Mandatory lossless companion. Its raw-byte pin binds the exact handoff digest and source envelope. */
  companion: {
    format: 'rop_allocation_bridge_companion_v1'; handoff: ArtifactRef;
    use: 'interface_qualification_only'; sourceEnvelope: Json;
    sourceNativeRows: { rowId: string; sourceCsvRow: number; identity: Record<string, string | null>; dataDerived: Json }[];
    binding: OfflineBinding; verification: { basis: 'retained_reviewed_pins' | 'synthetic_pins'; verifiedFiles: (RawPin & { digestProfile: typeof RAW_PROFILE })[]; externalProviderAuthentication: 'not_claimed'; sourceAdmission: 'none'; consumerActivation: 'none' };
  };
  companionPin: { digestProfile: typeof RAW_PROFILE; sha256: string; size: number };
  companionBytes: Uint8Array;
};

/** Closed retained binding selection. No caller pins, current pointers, discovery, or provider I/O. */
export function adaptReviewedAllocation(bytes: ReadonlyMap<string, Uint8Array>, output: OutputIdentity, selection: ReviewedAllocationScope): AllocationAdapterResult {
  must(selection !== null && typeof selection === 'object' && (selection.week === 1 || selection.week === 2), 'unreviewed scope');
  same(selection, { season: 2026, seasonType: 'REG', week: selection.week }, 'unreviewed scope');
  return adapt(bytes, selection.week === 1 ? RETAINED_WEEK1_BINDING : RETAINED_WEEK2_BINDING, output, 'candidate', selection);
}
/** Backward-compatible exact Week 1 entry; its binding and output representation are unchanged. */
export function adaptRetainedWeek1(bytes: ReadonlyMap<string, Uint8Array>, output: OutputIdentity): AllocationAdapterResult {
  return adaptReviewedAllocation(bytes, output, week1);
}
/** Test/import seam: caller pins can ONLY produce fixture evidence and synthetic mode. */
export function adaptSyntheticAllocation(bytes: ReadonlyMap<string, Uint8Array>, binding: OfflineBinding, output: OutputIdentity, selection: ReviewedAllocationScope = week1): AllocationAdapterResult {
  must(selection !== null && typeof selection === 'object' && (selection.week === 1 || selection.week === 2), 'unsupported synthetic scope');
  same(selection, { season: 2026, seasonType: 'REG', week: selection.week }, 'unsupported synthetic scope');
  return adapt(bytes, binding, output, 'synthetic', selection);
}
function adapt(input: ReadonlyMap<string, Uint8Array>, suppliedBinding: OfflineBinding, output: OutputIdentity, mode: Handoff['mode'], selection: ReviewedAllocationScope): AllocationAdapterResult {
  const scope = { season: selection.season, season_type: selection.seasonType, week: selection.week };
  const binding = clone(suppliedBinding), bytes = new Map<string, Uint8Array>();
  must(new Set(binding.pins.map(p => p.path)).size === binding.pins.length, 'duplicate pins');
  for (const pin of binding.pins) {
    must(typeof pin.path === 'string' && pin.path.trim().length > 0 && Number.isSafeInteger(pin.size) && pin.size > 0 && /^[0-9a-f]{64}$/.test(pin.sha256), 'invalid support pin');
    const supplied = input.get(pin.path); must(supplied, `missing retained bytes ${pin.path}`);
    const copy = new Uint8Array(supplied!);
    must(copy.length === pin.size && rawByteSha256(copy) === pin.sha256, `raw-byte pin mismatch ${pin.path}`); bytes.set(pin.path, copy);
  }
  const get = (path: string): Uint8Array => { must(bytes.has(path), `unbound dependency ${path}`); return bytes.get(path)!; };
  const read = (path: string): Obj => obj(parseJcsJson(get(path)) as Json);
  const p = binding.paths, envelope = read(p.candidate), c = obj(envelope.candidate), receipt = read(p.sourceReceipt), scheduleReceipt = read(p.scheduleReceipt);
  must(envelope.schema_version === 'weekly_boxscore_publication_candidate_v0' && c.schema_version === 'weekly_boxscore_candidate_v0', 'unsupported candidate version');
  must(envelope.status === 'candidate_needs_review' && c.status === 'candidate_needs_review' && envelope.consumer_admitted === false && c.consumer_admitted === false, 'candidate lifecycle/admission mismatch');
  same(c.scope, scope, 'selected scope mismatch'); same(receipt.requested_scope, scope, 'receipt scope');
  if (binding.generationWitness) {
    const witness = read(binding.generationWitness.path), result = obj(witness.result);
    same(binding.generationEvidence, `${binding.generationWitness.path}#build_completed_at`, 'generation witness locator');
    must(witness.base === binding.generationWitness.dataBase && witness.support_commit === binding.sourceSupportCommit, 'generation witness revisions');
    must(result.sha256 === rawByteSha256(get(p.candidate)) && result.status === 'candidate_revision_written', 'generation witness candidate');
    must(utc(witness.build_completed_at) === binding.candidateGeneratedAt && compareArtifactClocks(utc(witness.build_started_at), binding.candidateGeneratedAt) <= 0, 'generation witness clock');
    must(witness.source_admission === false && witness.rop_purpose_acceptance === false && witness.evidence_cutoff === null && witness.finality === 'unknown', 'generation witness eligibility');
  }
  same(c.source_receipt, receipt, 'embedded source receipt mismatch');
  same(envelope.schedule_receipt, { ...scheduleReceipt, source_support_commit: binding.sourceSupportCommit }, 'embedded schedule receipt mismatch');
  must(c.source_support_commit === binding.sourceSupportCommit, 'support commit mismatch');
  must(envelope.source_receipt_sha256 === rawByteSha256(get(p.sourceReceipt)), 'source receipt raw hash');
  must(envelope.builder_sha256 === rawByteSha256(get(p.publisher)) && envelope.fact_builder_sha256 === rawByteSha256(get(p.builder)), 'builder dependency mismatch');
  must(receipt.status === 'unadmitted_candidate_source_snapshot' && scheduleReceipt.status === 'unadmitted_schedule_snapshot', 'source admission mismatch');
  const sources = obj(receipt.sources);
  const rawLink = (r: Obj, path: string) => { must(r.sha256 === rawByteSha256(get(path)) && r.byte_count === get(path).length, `receipt dependency mismatch ${path}`); };
  rawLink(obj(sources.player), p.player); rawLink(obj(sources.team), p.team); rawLink(scheduleReceipt, p.schedule);
  must(obj(receipt.attribution).license_sha256 === rawByteSha256(get(p.sourceLicense)) && obj(scheduleReceipt.attribution).license_sha256 === rawByteSha256(get(p.scheduleLicense)), 'license dependency mismatch');
  same(c.snapshot_compiled_at, receipt.snapshot_compiled_at, 'snapshot clock mismatch');
  for (const r of [obj(sources.player), obj(sources.team), scheduleReceipt]) {
    const publication = utc(r.release_asset_updated_at), start = utc(r.retrieval_started_at), end = utc(r.retrieval_completed_at);
    must(compareArtifactClocks(publication, end) <= 0 && compareArtifactClocks(start, end) <= 0 && compareArtifactClocks(end, binding.candidateGeneratedAt) <= 0, 'source/candidate chronology');
  }
  must(compareArtifactClocks(utc(receipt.snapshot_compiled_at), binding.candidateGeneratedAt) <= 0, 'snapshot after candidate');
  const sourceRef: ArtifactRef = { artifactId: `data:${p.candidate}`, revision: rawByteSha256(get(p.candidate)), sha256: rawByteSha256(get(p.candidate)), artifactType: 'evidence_file', digestProfile: RAW_PROFILE, generatedAt: binding.candidateGeneratedAt };
  const root: ArtifactRef = { ...output, sha256: '0'.repeat(64), artifactType: 'player_team_allocation_handoff_v1', digestProfile: CONTENT_PROFILE };
  must(!validateArtifactReference(sourceRef).length && !validateArtifactReference(root).length && compareArtifactClocks(sourceRef.generatedAt, root.generatedAt) <= 0, 'artifact chronology/identity');
  const rawPlayers = readSourceCsv(get(p.player)), rawTeams = readSourceCsv(get(p.team)), schedule = readSourceCsv(get(p.schedule));
  const inScope = (r: Record<string, string>, seasonType = 'season_type') => r.season === String(scope.season) && r.week === String(scope.week) && r[seasonType] === scope.season_type;
  const games = schedule.filter(r => inScope(r, 'game_type')).map(r => ({ gameId: r.game_id, homeTeam: r.home_team, awayTeam: r.away_team })).sort((a, b) => a.gameId.localeCompare(b.gameId));
  same(games.map(g => g.gameId), [...binding.games].sort(), 'schedule game set');
  must(games.every(g => g.homeTeam && g.awayTeam && g.homeTeam !== g.awayTeam), 'invalid schedule teams');
  const players = arr(c.players).map(obj), unattributed = arr(c.unattributed_source_observations).map(obj), teams = arr(c.teams).map(obj), population = [...players, ...unattributed];
  const cov = obj(c.coverage), outerCov = obj(envelope.coverage);
  same([cov.player_rows, cov.unattributed_player_rows, cov.source_player_rows_in_scope, cov.team_rows], [players.length, unattributed.length, population.length, teams.length], 'population coverage counts');
  const nativeRows: AllocationAdapterResult['companion']['sourceNativeRows'] = [];
  const checkRows = (rows: Obj[], raw: Record<string, string>[], kind: 'player' | 'team') => {
    const seen = new Set<number>();
    for (const r of rows) {
      const n = r.source_csv_row; must(typeof n === 'number' && Number.isSafeInteger(n) && n >= 2 && n <= raw.length + 1 && !seen.has(n), 'duplicate/invalid CSV row reference'); seen.add(n as number);
      const native = raw[(n as number) - 2], i = obj(r.identity), obs = obj(r.observed);
      must(inScope(native), 'source row out of scope');
      for (const key of ['game_id', 'team', 'opponent_team', 'season_type']) must(i[key] === native[key] && native[key] && native[key] === native[key].trim(), `native identity mismatch ${key}`);
      must(String(i.season) === native.season && String(i.week) === native.week, 'native scope mismatch');
      must(r.source === `nflverse_stats_${kind}`, 'source family mismatch');
      same(Object.keys(obs).sort(), [...DATA_OBSERVATIONS].sort(), 'observed field vocabulary (no fantasy/prediction inputs)');
      for (const f of DATA_OBSERVATIONS) same(obs[f], sourceNumber(native[f], f), `source count mismatch ${f}`);
      if (kind === 'player') {
        const resolved = /^00-\d{7}$/.test(native.player_id ?? '');
        must(resolved === players.includes(r), 'identified/unattributed partition mismatch');
        if (resolved) {
          must(i.player_id === native.player_id && i.position === (native.position || null) && i.player_name === (native.player_display_name || null), 'native player/position/name mismatch');
          same(r.team_reference, { game_id: i.game_id, team: i.team }, 'team reference mismatch');
        } else must(r.raw_player_id === native.player_id && r.reason === 'unresolved_source_player_id', 'unattributed identity mismatch');
        nativeRows.push({ rowId: `player.csv:${n}`, sourceCsvRow: n as number, identity: Object.fromEntries(['season', 'season_type', 'week', 'game_id', 'team', 'opponent_team', 'player_id', 'position', 'player_name', 'player_display_name'].map(k => [k, native[k] ?? null])), dataDerived: resolved ? clone(r.derived) : null });
      }
    }
    const inScopeNumbers = raw.flatMap((r, i) => inScope(r) ? [i + 2] : []);
    same([...seen].sort((a, b) => a - b), inScopeNumbers, `complete source ${kind} population required`);
    must(obj(cov.excluded_out_of_scope_rows)[kind] === raw.length - inScopeNumbers.length, 'excluded population mismatch');
  };
  checkRows(population, rawPlayers, 'player'); checkRows(teams, rawTeams, 'team');
  const positions: Record<string, number> = {};
  for (const row of players) { const pos = obj(row.identity).position || 'unknown'; const key = str(pos); positions[key] = (positions[key] ?? 0) + 1; }
  same(cov.positions, positions, 'position population mismatch');
  const gameIds = [...new Set(teams.map(t => str(obj(t.identity).game_id)))].sort();
  same(cov.game_ids, gameIds, 'inner game coverage'); must(cov.game_count === gameIds.length, 'game count');
  same(outerCov.observed_game_ids, gameIds, 'observed game coverage'); same(outerCov.scheduled_game_ids, [...binding.games].sort(), 'scheduled game coverage');
  const missing = binding.games.filter(g => !gameIds.includes(g)).sort();
  same(outerCov.missing_game_ids, missing, 'missing games'); same(outerCov.unexpected_game_ids, gameIds.filter(g => !binding.games.includes(g)), 'unexpected games');
  must(outerCov.schedule_coverage === (missing.length || gameIds.some(g => !binding.games.includes(g)) ? 'partial_or_conflicting' : 'matched'), 'schedule coverage status');
  // This v0 lane does not certify finality or closed corrections, even if scheduled scores exist.
  must(outerCov.game_finality === 'unknown' && outerCov.full_week_final === false && cov.game_finality === 'unverified' && cov.full_week_completeness === 'unverified', 'unsupported finality assertion');
  const evidence: Evidence[] = [];
  const evidenceFor = (id: string, locator: string, kind: 'player' | 'team', definition: string) => {
    const r = obj(sources[kind]); evidence.push({ id, kind: mode === 'synthetic' ? 'fixture' : 'source', artifact: sourceRef, locator, definition, parents: [], sourceObservedAt: null, sourcePublishedAt: utc(r.release_asset_updated_at), retrievedAt: utc(r.retrieval_completed_at), generatedAt: binding.candidateGeneratedAt }); return [id];
  };
  const counts = (observation: Obj, ids: string[]): Counts => Object.fromEntries(fields.map(f => [f, { value: observation[core[f]], status: observation[core[f]] === null ? 'missing' : 'observed', reason: observation[core[f]] === null ? 'source_value_missing' : null, evidence: ids }])) as Counts;
  const mappedTeams: Handoff['teams'] = teams.map((t, ti) => {
    const identity = obj(t.identity), observed = obj(t.observed), reconciliation = obj(t.reconciliation);
    const members = population.filter(r => { const i = obj(r.identity); return i.game_id === identity.game_id && i.team === identity.team; });
    same(Object.keys(reconciliation).sort(), [...DATA_OBSERVATIONS].sort(), 'reconciliation field vocabulary');
    for (const f of DATA_OBSERVATIONS) {
      const values = members.map(r => obj(r.observed)[f]);
      const sum = values.length && values.every(v => v !== null) ? values.reduce<number>((s, v) => s + (v as number), 0) : null;
      const status = sum === null || observed[f] === null ? 'unknown' : sum === observed[f] ? 'matched' : 'conflict';
      same(reconciliation[f], { player_sum: sum, team_value: observed[f], status }, `Data reconciliation mismatch ${f}`);
    }
    const teamEvidence = evidenceFor(`team:${ti}`, `/candidate/teams/${ti}`, 'team', 'Data team observations and supplied population reconciliation; all positions and unattributed rows included.');
    const rows = members.map(r => {
      const i = obj(r.identity), o = obj(r.observed), pi = players.indexOf(r), isResolved = pi >= 0;
      const rowId = `player.csv:${r.source_csv_row}`, ids = evidenceFor(rowId, `/candidate/${isResolved ? 'players' : 'unattributed_source_observations'}/${isResolved ? pi : unattributed.indexOf(r)}`, 'player', 'Retained source-native identity and Data observed quantities; no canonical crosswalk admission.');
      if (isResolved) {
        const d = obj(r.derived);
        same(Object.keys(d).sort(), ['carries_plus_targets', 'carry_share_all_team_carries', 'target_share_credited_team_targets'].sort(), 'derived field vocabulary');
        same(d.carries_plus_targets, o.carries === null || o.targets === null ? null : (o.carries as number) + (o.targets as number), 'Data carries+targets mismatch');
        for (const [f, key] of [['carries', 'carry_share_all_team_carries'], ['targets', 'target_share_credited_team_targets']] as const) {
          const check = obj(reconciliation[f]), denominator = observed[f], numerator = o[f];
          const available = check.status === 'matched' && typeof denominator === 'number' && denominator > 0 && numerator !== null;
          same(d[key], { numerator, denominator, value: available ? (numerator as number) / (denominator as number) : null, status: available ? 'available' : 'unavailable', reason: available ? null : check.status === 'matched' ? 'zero_or_missing_denominator' : check.status }, `Data supplied share mismatch ${key}`);
        }
      }
      const native = rawPlayers[(r.source_csv_row as number) - 2];
      return { rowId, gameId: str(i.game_id), team: str(i.team), opponent: str(i.opponent_team), identity: { namespace: 'nflverse:gsis', playerId: isResolved ? str(i.player_id) : null, status: isResolved ? 'resolved' as const : 'unresolved' as const, evidence: ids }, position: native.position || null, positionEvidence: ids, counts: counts(o, ids) };
    });
    const states = Object.fromEntries(fields.map(f => [f, obj(reconciliation[core[f]]).status === 'matched' ? 'reconciled' : obj(reconciliation[core[f]]).status === 'conflict' ? 'conflicted' : 'incomplete'])) as Handoff['teams'][number]['population']['reconciliation'];
    const populationEvidence = [`population:${ti}`];
    evidence.push({ id: populationEvidence[0], kind: 'derived', artifact: sourceRef,
      locator: `/candidate/teams/${ti}/reconciliation`,
      definition: 'Representation of supplied Data reconciliation: matched with every retained row maps to unallocated observed zero; unknown/conflict maps to null. No residual assigned to a player.',
      parents: [...teamEvidence, ...rows.map(r => r.rowId)], sourceObservedAt: null, sourcePublishedAt: null, retrievedAt: null, generatedAt: output.generatedAt });
    const residual = Object.fromEntries(fields.map(f => [f, { value: states[f] === 'reconciled' ? 0 : null, status: states[f] === 'reconciled' ? 'observed' : states[f] === 'conflicted' ? 'conflicted' : 'missing', reason: states[f] === 'reconciled' ? null : `Data_population_${states[f]}`, evidence: populationEvidence }])) as Counts;
    return { gameId: str(identity.game_id), team: str(identity.team), opponent: str(identity.opponent_team), totals: counts(observed, teamEvidence), rows, population: { status: fields.every(f => states[f] === 'reconciled') ? 'complete' : 'incomplete', evidence: populationEvidence, unallocated: residual, reconciliation: states } };
  });
  must(mappedTeams.reduce((n, t) => n + t.rows.length, 0) === population.length, 'orphan or multiply allocated source rows');
  const handoff: Handoff = { contractVersion: 'player_team_allocation_handoff_v1', artifact: root, supersedes: null, mode, scope: { ...selection }, games: games.filter(g => gameIds.includes(g.gameId)), expectedGameIds: [...binding.games], coverage: missing.length ? 'partial' : 'complete', finality: 'unknown', correction: 'open', evidenceCutoff: null, generatedAt: output.generatedAt, definitions: { carries: 'Data credited carries, all positions including QB; no designed-run inference.', targets: 'Data credited targets; denominator is credited team targets, not pass attempts.', receptions: 'Data credited receptions; not targets or touches.', passAttempts: 'Data credited attempts; not dropbacks or starter participation.' }, purpose: { status: 'pending', purposes: [], evidence: [] }, evidence, teams: mappedTeams };
  const validation = validateAllocationHandoffV1(handoff); must(validation.valid, validation.errors.join('; '));
  root.sha256 = contractContentSha256(utf8(handoff), [{ artifact: root, dependencies: [sourceRef] }, { artifact: sourceRef, dependencies: [] }]);
  const companion: AllocationAdapterResult['companion'] = { format: 'rop_allocation_bridge_companion_v1', handoff: clone(root), use: 'interface_qualification_only', sourceEnvelope: clone(envelope), sourceNativeRows: nativeRows, binding, verification: { basis: mode === 'candidate' ? 'retained_reviewed_pins' : 'synthetic_pins', verifiedFiles: binding.pins.map(pin => ({ ...pin, digestProfile: RAW_PROFILE })), externalProviderAuthentication: 'not_claimed', sourceAdmission: 'none', consumerActivation: 'none' } };
  const companionBytes = utf8(companion);
  return { handoff, companion, companionBytes, companionPin: { digestProfile: RAW_PROFILE, sha256: rawByteSha256(companionBytes), size: companionBytes.length } };
}
