/** Fictional source-shaped fixture. No NFL rows or source admission. */
import { rawByteSha256 } from '../../src/contracts/artifactDigestV1.ts';
import { DATA_OBSERVATIONS, type OfflineBinding } from '../../src/adapters/weeklyAllocationFromDataV1.ts';
export type TestRow = { id: string; position: string; team: string; carries: number | null; targets: number | null; receptions: number | null; attempts: number | null };
export const output = { artifactId: 'synthetic:allocation', revision: '1', generatedAt: '2026-09-24T12:00:00Z' };
export function fixture(edit?: (rows: TestRow[]) => void) {
  const rows: TestRow[] = [
    { id: '00-0000001', position: 'RB', team: 'AAA', carries: 4, targets: 2, receptions: 1, attempts: 0 },
    { id: '00-0000002', position: 'WR', team: 'AAA', carries: 0, targets: 3, receptions: 2, attempts: 0 },
    { id: '00-0000003', position: 'QB', team: 'AAA', carries: 2, targets: 0, receptions: 0, attempts: 8 },
    { id: '00-0000004', position: 'TE', team: 'BBB', carries: 0, targets: 1, receptions: 1, attempts: 0 },
    { id: '00-0000005', position: 'SAF', team: 'BBB', carries: 0, targets: 0, receptions: 0, attempts: 0 },
    { id: '', position: '', team: 'BBB', carries: 0, targets: 0, receptions: 0, attempts: 0 },
  ]; edit?.(rows);
  const game = '2026_01_AAA_BBB', scope = { season: 2026, season_type: 'REG', week: 1 };
  const paths = { candidate: 'candidate.json', player: 'player.csv', team: 'team.csv', schedule: 'games.csv', sourceReceipt: 'source.json', scheduleReceipt: 'schedule.json', sourceLicense: 'license.md', scheduleLicense: 'schedule-license.md', publisher: 'publisher.py', builder: 'builder.py' };
  const bytes = new Map<string, Uint8Array>();
  const put = (path: string, v: unknown) => bytes.set(path, new TextEncoder().encode(typeof v === 'string' ? v : JSON.stringify(v)));
  const rawPin = (path: string) => ({ sha256: rawByteSha256(bytes.get(path)!), byte_count: bytes.get(path)!.length });
  const common = (team: string) => ({ ...scope, game_id: game, team, opponent_team: team === 'AAA' ? 'BBB' : 'AAA' });
  const obs = (r: TestRow) => Object.fromEntries(DATA_OBSERVATIONS.map(f => [f, f in r ? r[f as 'carries'] : 0])) as Record<string, number | null>;
  const csv = (objects: Record<string, unknown>[], header = Object.keys(objects[0])) => [header.join(','), ...objects.map(r => header.map(k => r[k] === null ? '' : String(r[k] ?? '')).join(','))].join('\n') + '\n';
  const rawRows = rows.map(r => ({ ...common(r.team), player_id: r.id, position: r.position, player_display_name: `Fixture ${r.id}`, ...obs(r) }));
  put(paths.player, csv(rawRows));
  const players: any[] = [], unattributed: any[] = [];
  rows.forEach((r, i) => {
    const base = { observed: obs(r), source: 'nflverse_stats_player', source_csv_row: i + 2 };
    if (/^00-\d{7}$/.test(r.id)) players.push({ ...base, identity: { ...common(r.team), player_id: r.id, player_name: `Fixture ${r.id}`, position: r.position || null }, team_reference: { game_id: game, team: r.team } });
    else unattributed.push({ ...base, identity: { ...common(r.team), season: '2026', week: '1' }, raw_player_id: r.id, reason: 'unresolved_source_player_id' });
  });
  const teams: any[] = ['AAA', 'BBB'].map((team, ti) => {
    const members = rows.filter(r => r.team === team).map(obs);
    const observed = Object.fromEntries(DATA_OBSERVATIONS.map(f => [f, members.some(r => r[f] === null) ? null : members.reduce((n, r) => n + r[f]!, 0)]));
    return { identity: common(team), observed, source: 'nflverse_stats_team', source_csv_row: ti + 2, reconciliation: Object.fromEntries(DATA_OBSERVATIONS.map(f => [f, { player_sum: observed[f], team_value: observed[f], status: observed[f] === null ? 'unknown' : 'matched' }])) };
  });
  put(paths.team, csv(teams.map(t => ({ ...t.identity, ...t.observed }))));
  for (const player of players) {
    const t = teams.find(t => t.identity.team === player.identity.team), o = player.observed;
    player.derived = { carries_plus_targets: o.carries === null || o.targets === null ? null : o.carries + o.targets };
    for (const [f, key] of [['carries', 'carry_share_all_team_carries'], ['targets', 'target_share_credited_team_targets']]) {
      const denominator = t.observed[f], available = t.reconciliation[f].status === 'matched' && denominator > 0 && o[f] !== null;
      player.derived[key] = { numerator: o[f], denominator, value: available ? o[f] / denominator : null, status: available ? 'available' : 'unavailable', reason: available ? null : t.reconciliation[f].status === 'matched' ? 'zero_or_missing_denominator' : t.reconciliation[f].status };
    }
  }
  put(paths.schedule, 'game_id,season,game_type,week,home_team,away_team\n2026_01_AAA_BBB,2026,REG,1,BBB,AAA\n');
  put(paths.sourceLicense, 'Synthetic license fixture\n'); put(paths.scheduleLicense, 'Synthetic schedule license fixture\n');
  put(paths.builder, '# synthetic builder bytes; never executed\n'); put(paths.publisher, '# synthetic publisher bytes; never executed\n');
  const clocks = { release_asset_updated_at: '2026-09-16T14:00:00Z', retrieval_started_at: '2026-09-16T15:00:00+00:00', retrieval_completed_at: '2026-09-16T15:01:00+00:00' };
  const receipt = { status: 'unadmitted_candidate_source_snapshot', requested_scope: scope, sources: { player: { ...rawPin(paths.player), ...clocks }, team: { ...rawPin(paths.team), ...clocks } }, attribution: { license_sha256: rawPin(paths.sourceLicense).sha256 }, snapshot_compiled_at: '2026-09-16T16:00:00+00:00' };
  const scheduleReceipt = { status: 'unadmitted_schedule_snapshot', ...rawPin(paths.schedule), ...clocks, attribution: { license_sha256: rawPin(paths.scheduleLicense).sha256 } };
  put(paths.sourceReceipt, receipt); put(paths.scheduleReceipt, scheduleReceipt);
  const sourceSupportCommit = 'a'.repeat(40);
  const positions: Record<string, number> = {}; players.forEach(p => { const pos = p.identity.position || 'unknown'; positions[pos] = (positions[pos] ?? 0) + 1; });
  const candidate: any = { schema_version: 'weekly_boxscore_publication_candidate_v0', status: 'candidate_needs_review', consumer_admitted: false, builder_sha256: rawPin(paths.publisher).sha256, fact_builder_sha256: rawPin(paths.builder).sha256, source_receipt_sha256: rawPin(paths.sourceReceipt).sha256, schedule_receipt: { ...scheduleReceipt, source_support_commit: sourceSupportCommit }, coverage: { observed_game_ids: [game], scheduled_game_ids: [game], missing_game_ids: [], unexpected_game_ids: [], schedule_coverage: 'matched', game_finality: 'unknown', full_week_final: false }, candidate: { schema_version: 'weekly_boxscore_candidate_v0', status: 'candidate_needs_review', consumer_admitted: false, scope, source_support_commit: sourceSupportCommit, source_receipt: receipt, snapshot_compiled_at: receipt.snapshot_compiled_at, players, teams, unattributed_source_observations: unattributed, coverage: { player_rows: players.length, unattributed_player_rows: unattributed.length, source_player_rows_in_scope: rows.length, team_rows: teams.length, positions, excluded_out_of_scope_rows: { player: 0, team: 0 }, game_ids: [game], game_count: 1, game_finality: 'unverified', full_week_completeness: 'unverified', player_universe: 'source rows, not participation census' }, limitations: ['Synthetic fixture; not football truth'], unavailable: ['routes', 'first_read_share'], validation: { metric_conflicts: [] } } };
  const binding: OfflineBinding = { sourceSupportCommit, candidateGeneratedAt: '2026-09-16T19:22:16.255941Z', generationEvidence: 'synthetic generation clock', games: [game], paths, pins: [] };
  const rebind = () => { put(paths.candidate, candidate); binding.pins = [...bytes].map(([path, b]) => ({ path, size: b.length, sha256: rawByteSha256(b) })); };
  rebind(); return { bytes, binding, candidate, rebind, put, rawPin };
}
