/** Invented teams/players only. Not an adapter, producer, or real-player fixture. */
import type { AllocationRow, ArtifactRef, Counts, Field, PlayerTeamAllocationHandoffV1 as Handoff, Position, Share, WeeklyRoleStateV1 as State } from '../../src/contracts/weeklyRoleStateV1.ts';
export const clock = '2026-01-01T00:00:00Z';
export const artifact = (name: string, revision = '1', digit = 'a'): ArtifactRef => {
  const artifactType = name.startsWith('input-') ? 'player_team_allocation_handoff_v1' : name.startsWith('state-') ? 'weekly_role_state_v1' : name === 'tts' ? 'teamstate_context' : 'evidence_file';
  return { artifactId: `synthetic:${name}`, revision, sha256: digit.repeat(64), artifactType, digestProfile: artifactType === 'player_team_allocation_handoff_v1' || artifactType === 'weekly_role_state_v1' ? 'tiber-jcs-root-sha256-v1' : 'raw-bytes-sha256-v1', generatedAt: clock };
};
export function counts(values: number[], evidence: string): Counts {
  return Object.fromEntries(['carries', 'targets', 'receptions', 'passAttempts'].map((field, i) => [field, { value: values[i], status: 'observed', reason: null, evidence: [evidence] }])) as Counts;
}
export function packet(week = 1): Handoff {
  const gameId = `SYNTHETIC-W${week}`;
  const teams = ['SYN-A', 'SYN-B'].map((team, index) => {
    const opponent = index ? 'SYN-A' : 'SYN-B';
    const rows: AllocationRow[] = (['RB', 'RB', 'WR', 'TE', 'QB'] as Position[]).map((position, i) => {
      const id = `${team}-row-${i}`;
      return { rowId: id, gameId, team, opponent, identity: { namespace: 'synthetic', playerId: `${team}-player-${i}`, status: 'resolved', evidence: [id] }, position, positionEvidence: [id], counts: counts([[8, 2, 2, 0], [4, 1, 1, 0], [1, 5, 3, 0], [0, 2, 1, 0], [2, 0, 0, 10]][i], id) };
    });
    return { gameId, team, opponent, totals: counts([15, 10, 7, 10], team), rows, population: { status: 'complete' as const, evidence: [team], unallocated: counts([0, 0, 0, 0], team), reconciliation: { carries: 'reconciled' as const, targets: 'reconciled' as const, receptions: 'reconciled' as const, passAttempts: 'reconciled' as const } } };
  });
  return {
    contractVersion: 'player_team_allocation_handoff_v1', artifact: artifact(`input-w${week}`), supersedes: null, mode: 'synthetic', scope: { season: 2026, seasonType: 'REG', week },
    games: [{ gameId, homeTeam: 'SYN-A', awayTeam: 'SYN-B' }], expectedGameIds: [gameId], coverage: 'complete', finality: 'unknown', correction: 'open', evidenceCutoff: null, generatedAt: clock,
    definitions: { carries: 'synthetic:official-stat-carries-v1', targets: 'synthetic:credited-targets-v1', receptions: 'synthetic:receptions-v1', passAttempts: 'synthetic:official-pass-attempts-v1' },
    purpose: { status: 'pending', purposes: [], evidence: [] },
    evidence: teams.flatMap(t => [t.team, ...t.rows.map(r => r.rowId)]).map(id => ({ id, kind: 'fixture', artifact: artifact(`evidence-${id}-w${week}`), locator: `synthetic:${id}`, definition: 'synthetic:stat-line-and-event-identity', parents: [], sourceObservedAt: null, sourcePublishedAt: null, retrievedAt: null, generatedAt: clock })), teams,
  };
}
function share(n: number, d: number, definition: Share['definition'], evidence: string[]): Share {
  return { numerator: n, denominator: d, value: d === 0 ? null : n / d, status: d === 0 ? 'zero_denominator' : 'available', reason: d === 0 ? 'No denominator opportunities observed' : null, definition, evidence };
}
/** Synthetic examples only; deliberately not exported from production code. */
export function state(h = packet(), index = 0): State {
  const t = h.teams[0], r = t.rows[index], position = r.position as Position;
  const carryShare = share(r.counts.carries.value!, t.totals.carries.value!, 'player_carries/all_team_carries', [r.rowId, t.team]);
  const targetShare = share(r.counts.targets.value!, t.totals.targets.value!, 'player_targets/credited_team_targets', [r.rowId, t.team]);
  const branch = position === 'QB' ? { position, carryShare, passAttemptShare: share(r.counts.passAttempts.value!, t.totals.passAttempts.value!, 'player_attempts/all_team_attempts', [r.rowId, t.team]) }
    : position === 'RB' ? { position, carryShare, targetShare, rbRoomCarryShare: share(r.counts.carries.value!, t.rows.filter(r => r.position === 'RB').reduce((sum, r) => sum + r.counts.carries.value!, 0), 'player_carries/qualified_RB_carries', [t.team, ...t.rows.map(r => r.rowId)]) }
    : { position, carryShare, targetShare };
  return {
    contractVersion: 'weekly_role_state_v1', artifact: artifact(`state-${index}-w${h.scope.week}`), supersedes: null, input: structuredClone(h.artifact), scope: structuredClone(h.scope), generatedAt: clock, evidenceCutoff: null,
    subject: structuredClone(r.identity), presence: 'observed', segments: [{ rowId: r.rowId, gameId: r.gameId, team: r.team, opponent: r.opponent, sourcePosition: position, observations: structuredClone(r.counts), branch, claims: [] }],
    readiness: { identity: 'resolved', observations: 'available', population: 'complete', coverage: 'complete', finality: 'unknown', correction: 'open', purpose: 'pending', evidence: 'fixture' },
    missingEvidence: [], scoringArea: { status: 'reserved_data_derivation' }, advanced: { status: 'not_supplied' }, comparison: null, teamstate: [], consumerActivation: 'none',
  };
}
export function changeCount(h: Handoff, row: number, field: Field, value: number) {
  const t = h.teams[0], old = t.rows[row].counts[field].value!;
  t.rows[row].counts[field].value = value; t.totals[field].value! += value - old;
}
