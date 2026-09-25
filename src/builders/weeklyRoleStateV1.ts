/** Pure Slice 3 state constructor. The caller supplies a qualified handoff and its pinned
 * Slice 2 companion; this module neither retrieves evidence nor admits a producer. */
import type { ArtifactRef, Claim, ClaimId, Count, Field, PlayerTeamAllocationHandoffV1 as Handoff, Position, Segment, Share, TeamAllocation, WeeklyRoleStateV1 as State } from '../contracts/weeklyRoleStateV1.ts';
import { CONTENT_PROFILE, RAW_PROFILE, artifactKey, canonicalizeJcs, compareArtifactClocks, contractContentSha256, contractReferences, parseJcsJson, rawByteSha256, validateArtifactReference } from '../contracts/artifactDigestV1.ts';
import { fields, validateAllocationHandoffV1, validateWeeklyRoleStateV1 } from '../validation/weeklyRoleStateV1.ts';

export type CompanionPin = { digestProfile: typeof RAW_PROFILE; sha256: string; size: number };
export type SubjectSelector = { namespace: string; playerId: string | null; rowId?: string; gameId?: string; team?: string; position?: Position };
export type BuildInput = {
  handoff: Handoff; companionBytes: Uint8Array; companionPin: CompanionPin;
  subject: SubjectSelector; artifact: { artifactId: string; revision: string; generatedAt: string };
};
export type BuildResult = {
  state: State;
  /** This receipt is outside the unchanged Slice 1 contract. It must accompany the state
   * when Data-derived shares or evidence lineage are used downstream. */
  binding: { handoff: ArtifactRef; companionPin: CompanionPin; supportBasis: 'synthetic_pins' | 'retained_reviewed_pins'; purpose: Handoff['purpose'] };
};
type Obj = Record<string, any>;
function fail(condition: unknown, reason: string): asserts condition { if (!condition) throw Error(`weekly role state: ${reason}`); }
function object(v: unknown, what: string): Obj { fail(v !== null && typeof v === 'object' && !Array.isArray(v), what); return v as Obj; }
function array(v: unknown, what: string): unknown[] { fail(Array.isArray(v), what); return v as unknown[]; }
const equal = (a: unknown, b: unknown): boolean => canonicalizeJcs(a) === canonicalizeJcs(b);
const copy = <T>(v: T): T => structuredClone(v);
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
function exactContent(ref: ArtifactRef, value: Handoff): void {
  const found = new Map<string, ArtifactRef>();
  const dependencies = contractReferences(Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'artifact')));
  for (const dep of dependencies) {
    const key = artifactKey(dep);
    fail(!found.has(key) || equal(found.get(key), dep), 'conflicting handoff dependency reference');
    found.set(key, dep);
  }
  const graph = [{ artifact: ref, dependencies: [...found.values()] }, ...[...found.values()].map(artifact => ({ artifact, dependencies: [] }))];
  fail(contractContentSha256(bytes(value), graph) === ref.sha256, 'handoff JCS digest mismatch');
}
/** All source rows, including non-skill/anonymous rows, must be accounted for in the
 * companion even when only one selected player becomes a state. This does not authenticate
 * unavailable upstream bytes: Slice 2 qualification remains the caller's responsibility. */
function boundCompanion(h: Handoff, input: BuildInput): Obj {
  const pin = input.companionPin;
  fail(pin?.digestProfile === RAW_PROFILE && /^[a-f0-9]{64}$/.test(pin.sha256) && Number.isSafeInteger(pin.size) && pin.size > 0, 'explicit raw-byte companion pin required');
  fail(input.companionBytes instanceof Uint8Array && input.companionBytes.length === pin.size && rawByteSha256(input.companionBytes) === pin.sha256, 'companion raw-byte pin mismatch');
  const c = object(parseJcsJson(input.companionBytes), 'companion JSON object required');
  fail(c.format === 'rop_allocation_bridge_companion_v1' && c.use === 'interface_qualification_only' && equal(c.handoff, h.artifact), 'companion handoff/reference mismatch');
  const v = object(c.verification, 'verification declaration required');
  fail(v.sourceAdmission === 'none' && v.consumerActivation === 'none' && v.externalProviderAuthentication === 'not_claimed', 'companion admission/verification mismatch');
  const basis = h.mode === 'synthetic' ? 'synthetic_pins' : 'retained_reviewed_pins';
  fail(v.basis === basis, 'companion qualification basis mismatch');
  const pins = array(object(c.binding, 'companion binding required').pins, 'support pins required');
  fail(pins.length > 0 && equal(v.verifiedFiles, pins.map(pin => ({ ...object(pin, 'support pin'), digestProfile: RAW_PROFILE }))), 'retained support-pin declaration mismatch');
  const envelope = object(c.sourceEnvelope, 'source envelope required'), candidate = object(envelope.candidate, 'candidate required');
  fail(candidate.schema_version === 'weekly_boxscore_candidate_v0' && candidate.consumer_admitted === false, 'noncandidate or admitted source envelope');
  fail(candidate.scope?.season === h.scope.season && candidate.scope?.season_type === h.scope.seasonType && candidate.scope?.week === h.scope.week, 'candidate scope mismatch');
  const native = array(c.sourceNativeRows, 'native source rows required'), source = [...array(candidate.players, 'identified source rows required'), ...array(candidate.unattributed_source_observations, 'unattributed source rows required')].map(x => object(x, 'source row'));
  const rows = h.teams.flatMap(t => t.rows), evidenceById = new Map(h.evidence.map(e => [e.id, e]));
  fail(native.length === rows.length && source.length === rows.length, 'source population mismatch');
  const nativeById = new Map<string, Obj>(), sourceByCsv = new Map<number, Obj>(), nativeCsv = new Set<number>();
  for (const raw of source) { const n = raw.source_csv_row; fail(Number.isSafeInteger(n) && !sourceByCsv.has(n), 'duplicate source row'); sourceByCsv.set(n, raw); }
  for (const entry of native) {
    const n = object(entry, 'native row'); fail(typeof n.rowId === 'string' && n.rowId === `player.csv:${n.sourceCsvRow}` && !nativeById.has(n.rowId), 'duplicate/invalid native row ID'); nativeById.set(n.rowId, n);
    const raw = sourceByCsv.get(n.sourceCsvRow); fail(raw && !nativeCsv.has(n.sourceCsvRow), 'unbound or duplicated native source row'); nativeCsv.add(n.sourceCsvRow);
    const identity = object(n.identity, 'native source identity');
    const sourceIdentity = object(raw!.identity, 'candidate source identity');
    fail(identity.game_id === sourceIdentity.game_id && identity.team === sourceIdentity.team && identity.opponent_team === sourceIdentity.opponent_team &&
      identity.player_id === (Object.hasOwn(raw!, 'derived') ? sourceIdentity.player_id : raw!.raw_player_id) &&
      (!Object.hasOwn(raw!, 'derived') || identity.position === sourceIdentity.position), 'native/candidate identity mismatch');
    const resolved = Object.hasOwn(raw!, 'derived');
    fail(equal(n.dataDerived, resolved ? raw!.derived : null), 'Data-derived object differs from source envelope');
  }
  fail(nativeCsv.size === sourceByCsv.size, 'incomplete native source population');
  const teams = array(candidate.teams, 'source teams required').map(x => object(x, 'source team'));
  fail(teams.length === h.teams.length, 'team population mismatch');
  for (const t of h.teams) {
    const original = teams.find(src => src.identity?.game_id === t.gameId && src.identity?.team === t.team);
    fail(original && original.identity.opponent_team === t.opponent, 'native team identity mismatch');
    for (const [f, field] of Object.entries({ carries: 'carries', targets: 'targets', receptions: 'receptions', passAttempts: 'attempts' }))
      fail(original!.observed?.[field] === t.totals[f as Field].value, `native team ${field} mismatch`);
    for (const row of t.rows) {
      const n = nativeById.get(row.rowId), raw = n && sourceByCsv.get(n.sourceCsvRow);
      fail(n && raw, 'handoff row missing from companion');
      const sourceIndex = array(candidate.players, 'identified rows').findIndex(item => object(item, 'player').source_csv_row === n!.sourceCsvRow);
      const anonymousIndex = array(candidate.unattributed_source_observations, 'anonymous rows').findIndex(item => object(item, 'anonymous').source_csv_row === n!.sourceCsvRow);
      const expectedLocator = sourceIndex >= 0 ? `/candidate/players/${sourceIndex}` : `/candidate/unattributed_source_observations/${anonymousIndex}`;
      const rowEvidence = evidenceById.get(row.rowId);
      fail((sourceIndex >= 0 || anonymousIndex >= 0) && rowEvidence?.locator === expectedLocator && row.identity.evidence.includes(row.rowId) && (row.position === null || row.positionEvidence.includes(row.rowId)) && fields.every(field => row.counts[field].status !== 'observed' || row.counts[field].evidence.includes(row.rowId)), 'source row evidence lineage mismatch');
      const identity = object(n!.identity, 'native player identity');
      fail(identity.game_id === row.gameId && identity.team === row.team && identity.opponent_team === row.opponent && (identity.position || null) === row.position && (row.identity.status === 'resolved' ? identity.player_id === row.identity.playerId : raw!.raw_player_id === identity.player_id), 'source-native identity/team/position mismatch');
      for (const [f, field] of Object.entries({ carries: 'carries', targets: 'targets', receptions: 'receptions', passAttempts: 'attempts' }))
        fail(raw!.observed?.[field] === row.counts[f as Field].value, `native player ${field} mismatch`);
      if (row.identity.status === 'resolved') {
        const derived = object(n!.dataDerived, 'Data-derived observations required');
        const carries = row.counts.carries.value, targets = row.counts.targets.value;
        fail(derived.carries_plus_targets === (carries === null || targets === null ? null : carries + targets), 'Data carries-plus-targets contradiction');
      }
    }
  }
  return c;
}
// Exactly the conservative recognized-token and qualification rule in the merged Slice 1
// validator. No aliases (SAF/unknown), unresolved identities, or residual allowances.
const knownPositions = new Set(['RB', 'FB', 'WR', 'TE', 'QB', 'OL', 'OT', 'OG', 'T', 'G', 'C', 'DL', 'DT', 'DE', 'NT', 'EDGE', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'CB', 'S', 'FS', 'SS', 'K', 'P', 'LS']);
function qualifiedRoom(t: TeamAllocation): boolean {
  return t.population.status === 'complete' && t.population.reconciliation.carries === 'reconciled' && t.population.unallocated.carries.value === 0 && t.rows.every(r => r.position !== null && knownPositions.has(r.position) && r.identity.status === 'resolved' && r.counts.carries.value !== null);
}
const unique = (ids: string[]) => [...new Set(ids)];
function share(n: Count, d: Count, eligible: boolean, definition: Share['definition'], evidence: string[], data?: Obj): Share {
  const status = !eligible ? 'ineligible' : n.value === null || d.value === null ? 'missing' : d.value === 0 ? 'zero_denominator' : 'available';
  if (definition === 'player_carries/all_team_carries' || definition === 'player_targets/credited_team_targets')
    fail(data && typeof data === 'object' && !Array.isArray(data), `${definition}: Data-owned share object required`);
  if (data) {
    fail(equal([data.numerator, data.denominator], [n.value, d.value]), `${definition}: Data numerator/denominator mismatch`);
    fail(data.status === (status === 'available' ? 'available' : 'unavailable'), `${definition}: Data availability mismatch`);
    fail(status === 'available' ? typeof data.value === 'number' && Number.isFinite(data.value) && data.reason === null : data.value === null && typeof data.reason === 'string' && data.reason.length > 0, `${definition}: Data value/reason mismatch`);
  }
  return { numerator: n.value, denominator: d.value, value: status === 'available' ? data ? data.value : n.value! / d.value! : null, status, reason: status === 'available' ? null : data?.reason ?? `${definition}:${status}`, definition, evidence: unique(evidence) };
}
function claim(id: ClaimId, row: TeamAllocation['rows'][number], t: TeamAllocation): Claim {
  const room = id === 'led_qualified_rb_room_carries' || id === 'majority_qualified_rb_room_carries';
  const field: Field = id === 'recorded_qb_passing_work' ? 'passAttempts' : id.includes('receiving') ? 'targets' : 'carries';
  const n = row.counts[field].value;
  let status: Claim['status'] = n === null ? 'insufficient' : n > 0 ? 'supported' : 'not_supported';
  let needed = row.counts[field].evidence;
  if (room) {
    const rb = t.rows.filter(r => r.position === 'RB'), total = rb.reduce((sum, r) => sum + (r.counts.carries.value ?? 0), 0), top = Math.max(0, ...rb.map(r => r.counts.carries.value ?? 0));
    status = !qualifiedRoom(t) ? 'insufficient' : id === 'led_qualified_rb_room_carries'
      ? n! > 0 && n === top && rb.filter(r => r.counts.carries.value === top).length === 1 ? 'supported' : 'not_supported'
      : total > 0 && n! / total > 0.5 ? 'supported' : 'not_supported';
    needed = unique([...t.population.evidence, ...t.rows.flatMap(r => [...r.counts.carries.evidence, ...r.positionEvidence, ...r.identity.evidence])]);
  }
  if (row.identity.status !== 'resolved') status = 'insufficient';
  return { id, ruleVersion: '1', status, support: status === 'supported' ? unique(needed) : [], counterevidence: status === 'not_supported' ? unique(needed) : [], gaps: status === 'insufficient' ? [row.identity.status !== 'resolved' ? 'unresolved_identity' : room ? 'qualified_rb_room_unavailable' : `${row.rowId}.${field}`] : [] };
}
function evidenceBasis(segments: Segment[], h: Handoff): State['readiness']['evidence'] {
  const map = new Map(h.evidence.map(e => [e.id, e])), leaves = new Set<string>();
  const visit = (id: string, seen = new Set<string>()) => {
    const e = map.get(id); if (!e || seen.has(id)) return;
    if (e.kind === 'derived') e.parents.forEach(p => visit(p, new Set([...seen, id]))); else leaves.add(e.kind);
  };
  segments.forEach(seg => fields.forEach(f => { if (seg.observations[f].status === 'observed') seg.observations[f].evidence.forEach(id => visit(id)); }));
  return leaves.has('fixture') ? 'fixture' : leaves.size === 1 && leaves.has('source') ? 'source_backed' : 'unavailable';
}
export function buildWeeklyRoleStateV1(injected: BuildInput): BuildResult {
  const input = copy(injected), h = input.handoff;
  const hv = validateAllocationHandoffV1(h); fail(hv.valid, `invalid qualified handoff: ${hv.errors.join('; ')}`);
  exactContent(h.artifact, h);
  const c = boundCompanion(h, input);
  const who = input.subject; fail(who && typeof who.namespace === 'string' && who.namespace.trim() && (who.playerId === null || typeof who.playerId === 'string' && who.playerId.trim()), 'explicit native subject identity required');
  const matches = h.teams.flatMap(t => t.rows.map(r => ({ t, r }))).filter(({ r }) => who.rowId ? r.rowId === who.rowId : who.playerId !== null && r.identity.namespace === who.namespace && r.identity.playerId === who.playerId);
  fail(matches.every(({ r }) => r.identity.namespace === who.namespace && r.identity.playerId === who.playerId), 'row selector/subject identity mismatch');
  fail(who.playerId !== null || who.rowId === undefined || matches.length === 1, 'unresolved row must have one exact row ID');
  fail(matches.every(({ r }) => (who.gameId === undefined || r.gameId === who.gameId) && (who.team === undefined || r.team === who.team) && (who.position === undefined || r.position === who.position)), 'wrong source game/team/position window');
  fail(matches.length > 0 || who.playerId === null && who.rowId === undefined, 'absent resolved identity requires separately qualified evidence');
  fail(matches.every(({ r }) => ['RB', 'WR', 'TE', 'QB'].includes(r.position ?? '')), 'source position has no v1 branch');
  const generation = input.artifact.generatedAt;
  const root: ArtifactRef = { ...input.artifact, artifactType: 'weekly_role_state_v1', digestProfile: CONTENT_PROFILE, sha256: '0'.repeat(64) };
  fail(validateArtifactReference(root).length === 0 && compareArtifactClocks(generation, h.generatedAt) >= 0 && h.artifact.artifactId !== root.artifactId, 'state identity/dependency chronology mismatch');
  const native = new Map((c.sourceNativeRows as Obj[]).map(n => [n.rowId, n]));
  const segments: Segment[] = matches.map(({ t, r }) => {
    const data = native.get(r.rowId)?.dataDerived;
    fail(data && typeof data === 'object', 'Data-owned share object required for an observed row');
    const carry = share(r.counts.carries, t.totals.carries, t.population.reconciliation.carries === 'reconciled', 'player_carries/all_team_carries', [...r.counts.carries.evidence, ...t.totals.carries.evidence, ...t.population.evidence], data.carry_share_all_team_carries);
    let branch: Segment['branch'];
    if (r.position === 'QB') branch = { position: 'QB', carryShare: carry, passAttemptShare: share(r.counts.passAttempts, t.totals.passAttempts, t.population.reconciliation.passAttempts === 'reconciled', 'player_attempts/all_team_attempts', [...r.counts.passAttempts.evidence, ...t.totals.passAttempts.evidence, ...t.population.evidence]) };
    else {
      const target = share(r.counts.targets, t.totals.targets, t.population.reconciliation.targets === 'reconciled', 'player_targets/credited_team_targets', [...r.counts.targets.evidence, ...t.totals.targets.evidence, ...t.population.evidence], data.target_share_credited_team_targets);
      if (r.position === 'RB') {
        const qualified = qualifiedRoom(t), total = qualified ? t.rows.filter(row => row.position === 'RB').reduce((sum, row) => sum + row.counts.carries.value!, 0) : null;
        const d: Count = { value: total, status: total === null ? 'missing' : 'observed', reason: total === null ? 'unqualified_room' : null, evidence: t.population.evidence };
        branch = { position: 'RB', carryShare: carry, targetShare: target, rbRoomCarryShare: share(r.counts.carries, d, qualified, 'player_carries/qualified_RB_carries', [...t.population.evidence, ...t.rows.flatMap(row => [...row.counts.carries.evidence, ...row.positionEvidence, ...row.identity.evidence])]) };
      } else branch = { position: r.position as 'WR' | 'TE', carryShare: carry, targetShare: target };
    }
    const ids: ClaimId[] = r.position === 'QB' ? ['recorded_qb_passing_work', 'recorded_qb_rushing_work']
      : r.position === 'RB' ? ['recorded_rushing_work', 'recorded_receiving_opportunity', 'observed_receiving_involvement', 'led_qualified_rb_room_carries', 'majority_qualified_rb_room_carries']
      : ['recorded_rushing_work', 'recorded_receiving_opportunity', 'observed_receiving_involvement'];
    return { rowId: r.rowId, gameId: r.gameId, team: r.team, opponent: r.opponent, sourcePosition: r.position as Position, observations: copy(r.counts), branch, claims: ids.map(id => claim(id, r, t)) };
  });
  const observedTeams = matches.map(x => x.t);
  const subject = matches.length ? { namespace: who.namespace, playerId: who.playerId, status: who.playerId === null ? 'unresolved' as const : 'resolved' as const, evidence: unique(matches.flatMap(x => x.r.identity.evidence)) } : { namespace: who.namespace, playerId: null, status: 'unresolved' as const, evidence: [] as string[] };
  const missingEvidence = unique([...segments.flatMap(s => fields.filter(f => s.observations[f].status !== 'observed').map(f => `${s.rowId}.${f}`)), ...segments.flatMap(s => s.claims.filter(c => c.status === 'insufficient').flatMap(c => c.gaps)), ...(!matches.length ? ['player_not_observed'] : []), ...(subject.status === 'unresolved' ? ['unresolved_identity'] : [])]);
  const state: State = { contractVersion: 'weekly_role_state_v1', artifact: root, supersedes: null, input: copy(h.artifact), scope: copy(h.scope), generatedAt: generation, evidenceCutoff: h.evidenceCutoff, subject, presence: segments.length ? 'observed' : 'absent', segments,
    readiness: { identity: subject.status, observations: !segments.length ? 'absent' : segments.every(seg => fields.every(f => seg.observations[f].status === 'observed')) ? 'available' : 'partial', population: !observedTeams.length ? 'absent' : observedTeams.every(t => t.population.status === 'complete') ? 'complete' : 'incomplete', coverage: h.coverage, finality: h.finality, correction: h.correction, purpose: h.purpose.status === 'accepted' && h.purpose.purposes.includes('rop_observed_role') ? 'accepted' : 'pending', evidence: evidenceBasis(segments, h) }, missingEvidence,
    scoringArea: { status: 'reserved_data_derivation' }, advanced: { status: 'not_supplied' }, comparison: null, teamstate: [], consumerActivation: 'none' };
  root.sha256 = contractContentSha256(bytes(state), [{ artifact: root, dependencies: [h.artifact] }, { artifact: h.artifact, dependencies: [] }]);
  const result = validateWeeklyRoleStateV1(state, { handoff: h }); fail(result.valid, `state contract validation failed: ${result.errors.join('; ')}`);
  return { state, binding: { handoff: copy(h.artifact), companionPin: copy(input.companionPin), supportBasis: c.verification.basis, purpose: copy(h.purpose) } };
}
