import type { AllocationRow, ArtifactRef, Claim, Count, Counts, Field, PlayerTeamAllocationHandoffV1 as Handoff, Segment, Share, ValidationResult, WeeklyRoleStateV1 as State } from '../contracts/weeklyRoleStateV1.ts';
import { artifactKey, canonicalizeJcs, compareArtifactClocks, contractReferences, validateArtifactGraph, validateArtifactReference } from '../contracts/artifactDigestV1.ts';
import type { ArtifactNode } from '../contracts/artifactDigestV1.ts';

// Closed runtime schema: every property is required, nullable only where explicit.
// No coercion, defaults, unknown fields, arbitrary prose claims or executable inputs.
type Schema = string | readonly unknown[] | { [key: string]: Schema };
const one = (...values: unknown[]): Schema => values;
const array = (item: Schema): Schema => ({ $array: item });
const nullable = (item: Schema): Schema => ({ $nullable: item });
const ref = { artifactId: 'text', revision: 'text', sha256: 'hash', artifactType: one('player_team_allocation_handoff_v1', 'weekly_role_state_v1', 'teamstate_context', 'evidence_file'), digestProfile: one('tiber-jcs-root-sha256-v1', 'raw-bytes-sha256-v1'), generatedAt: 'clock' };
const scope = { season: 'year', seasonType: one('REG', 'POST', 'PRE'), week: 'week' };
const refs = array('text');
const identity = { namespace: 'text', playerId: nullable('text'), status: one('resolved', 'unresolved'), evidence: refs };
const count = { value: nullable('count'), status: one('observed', 'missing', 'conflicted'), reason: nullable('text'), evidence: refs };
export const fields: readonly Field[] = Object.freeze(['carries', 'targets', 'receptions', 'passAttempts'] as Field[]);
const counts = Object.fromEntries(fields.map(f => [f, count]));
const evidence = { id: 'text', kind: one('source', 'derived', 'fixture', 'proxy', 'reported'), artifact: ref, locator: 'text', definition: 'text', parents: refs, sourceObservedAt: nullable('clock'), sourcePublishedAt: nullable('clock'), retrievedAt: nullable('clock'), generatedAt: 'clock' };
const row = { rowId: 'text', gameId: 'text', team: 'text', opponent: 'text', identity, position: nullable('text'), positionEvidence: refs, counts };
const coverage = one('complete', 'partial', 'unknown');
const finality = one('unknown', 'provisional', 'final');
const correction = one('unknown', 'open', 'settled');
export const handoffSchema: Schema = {
  contractVersion: one('player_team_allocation_handoff_v1'), artifact: ref, supersedes: nullable(ref), mode: one('synthetic', 'candidate'), scope,
  games: array({ gameId: 'text', homeTeam: 'text', awayTeam: 'text' }), expectedGameIds: refs, coverage, finality, correction,
  evidenceCutoff: nullable('clock'), generatedAt: 'clock', definitions: Object.fromEntries(fields.map(f => [f, 'text'])),
  purpose: { status: one('pending', 'accepted'), purposes: array(one('rop_observed_role', 'tts_allocation')), evidence: refs },
  evidence: array(evidence), teams: array({ gameId: 'text', team: 'text', opponent: 'text', totals: counts, rows: array(row), population: {
    status: one('complete', 'incomplete'), evidence: refs, unallocated: counts,
    reconciliation: Object.fromEntries(fields.map(f => [f, one('reconciled', 'incomplete', 'conflicted')])),
  } }),
};
const share = { numerator: nullable('count'), denominator: nullable('count'), value: nullable('fraction'), status: one('available', 'missing', 'zero_denominator', 'ineligible'), reason: nullable('text'), definition: one('player_carries/all_team_carries', 'player_targets/credited_team_targets', 'player_carries/qualified_RB_carries', 'player_attempts/all_team_attempts'), evidence: refs };
const claimIds = ['recorded_rushing_work', 'recorded_receiving_opportunity', 'observed_receiving_involvement', 'led_qualified_rb_room_carries', 'majority_qualified_rb_room_carries', 'recorded_qb_passing_work', 'recorded_qb_rushing_work'];
export const stateSchema: Schema = {
  contractVersion: one('weekly_role_state_v1'), artifact: ref, supersedes: nullable(ref), input: ref, scope, generatedAt: 'clock', evidenceCutoff: nullable('clock'), subject: identity,
  presence: one('observed', 'absent'), segments: array({ rowId: 'text', gameId: 'text', team: 'text', opponent: 'text', sourcePosition: one('RB', 'WR', 'TE', 'QB'), observations: counts,
    branch: { $branches: array({}) }, // Handled explicitly below; position is the discriminator.
    claims: array({ id: one(...claimIds), ruleVersion: one('1'), status: one('supported', 'not_supported', 'insufficient'), support: refs, counterevidence: refs, gaps: refs }),
  }), readiness: { identity: one('resolved', 'unresolved'), observations: one('available', 'partial', 'absent'), population: one('complete', 'incomplete', 'absent'), coverage, finality, correction, purpose: one('pending', 'accepted'), evidence: one('fixture', 'source_backed', 'unavailable') },
  missingEvidence: refs, scoringArea: { status: one('reserved_data_derivation') }, advanced: { status: one('not_supplied') },
  comparison: nullable({ priorState: ref, priorInput: ref, status: one('comparable', 'non_comparable'), reasons: refs, deltas: array({ field: one(...fields, 'carryShare', 'targetShare', 'passAttemptShare'), unit: one('count', 'percentage_points'), previous: 'number', current: 'number', delta: 'number' }) }),
  teamstate: array({ artifact: ref, input: ref, scope, gameId: 'text', team: 'text', rowRef: 'text', evidenceCutoff: nullable('clock'), generatedAt: 'clock', purpose: one('pending', 'accepted'), finality }), consumerActivation: one('none'),
};
function shape(value: unknown, schema: Schema, path: string, errors: string[]): void {
  const bad = () => errors.push(`${path}: invalid shape`);
  if (typeof schema === 'string') {
    const number = typeof value === 'number' && Number.isFinite(value);
    const integer = number && Number.isSafeInteger(value);
    const ok = schema === 'text' ? typeof value === 'string' && value.trim().length > 0
      : schema === 'hash' ? typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
      : schema === 'clock' ? typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
      : schema === 'count' ? integer && (value as number) >= 0
      : schema === 'fraction' ? number && (value as number) >= 0 && (value as number) <= 1
      : schema === 'year' ? integer && (value as number) >= 1920 && (value as number) <= 2200
      : schema === 'week' ? integer && (value as number) >= 1 && (value as number) <= 30 : number;
    if (!ok) bad(); return;
  }
  if (Array.isArray(schema)) { if (!schema.includes(value)) bad(); return; }
  const s = schema as Record<string, Schema>;
  if ('$nullable' in s) { if (value !== null) shape(value, s.$nullable, path, errors); return; }
  if ('$array' in s) { if (!Array.isArray(value)) bad(); else value.forEach((v, i) => shape(v, s.$array, `${path}[${i}]`, errors)); return; }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) { bad(); return; }
  const v = value as Record<string, unknown>;
  if ('$branches' in s) {
    const p = v.position;
    if (!['RB', 'WR', 'TE', 'QB'].includes(p as string)) { bad(); return; }
    const b: Record<string, Schema> = { position: one(p), carryShare: share };
    if (p === 'QB') b.passAttemptShare = share; else b.targetShare = share;
    if (p === 'RB') b.rbRoomCarryShare = share;
    shape(v, b, path, errors); return;
  }
  for (const k of Object.keys(v)) if (!Object.hasOwn(s, k)) errors.push(`${path}.${k}: unknown field`);
  for (const [k, child] of Object.entries(s)) shape(v[k], child, `${path}.${k}`, errors);
}
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  return ak.length === bk.length && ak.every(k => Object.hasOwn(b, k) && same((a as any)[k], (b as any)[k]));
}
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-12;
const unique = (a: string[]) => new Set(a).size === a.length;
const result = (errors: string[]): ValidationResult => ({ valid: errors.length === 0, errors });
const refsOf = (counts: Counts, field: Field) => counts[field].evidence;
function evidenceTools(h: Handoff, errors: string[]) {
  const map = new Map(h.evidence.map(e => [e.id, e]));
  const check = (ids: string[], path: string, required = true) => {
    if ((required && !ids.length) || !unique(ids) || ids.some(id => !map.has(id))) errors.push(`${path}: missing, duplicate or unknown evidence`);
  };
  const eligible = (id: string, seen = new Set<string>()): boolean => {
    const e = map.get(id); if (!e || seen.has(id)) return false;
    if (e.kind === 'source') return true;
    if (e.kind === 'fixture') return h.mode === 'synthetic';
    return e.kind === 'derived' && e.parents.length > 0 && e.parents.every(p => eligible(p, new Set([...seen, id])));
  };
  return { map, check, eligible };
}
function revision(current: ArtifactRef, previous: ArtifactRef | null, errors: string[], path: string) {
  if (previous && (current.artifactId !== previous.artifactId || current.artifactType !== previous.artifactType || current.digestProfile !== previous.digestProfile || current.revision === previous.revision || current.sha256 === previous.sha256)) errors.push(`${path}: correction requires same artifact identity/type/profile and new revision/hash`);
}
function jsonInput(value: unknown, errors: string[]): void { try { canonicalizeJcs(value); } catch (error) { errors.push(`JSON input: ${(error as Error).message}`); } }
function referencedArtifactNodes(value: Handoff | State, errors: string[]): ArtifactNode[] {
  const all = contractReferences(value), root = value.artifact, unique = new Map<string, ArtifactRef>();
  if (root.artifactType !== value.contractVersion || root.generatedAt !== value.generatedAt) errors.push('artifact: own type/generation mismatch');
  for (const r of all) {
    errors.push(...validateArtifactReference(r));
    const key = artifactKey(r);
    if (unique.has(key) && !same(unique.get(key), r)) errors.push('artifact: conflicting revision references');
    unique.set(key, r);
  }
  const deps = contractReferences(Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'artifact')));
  const dedup = new Map(deps.map(r => [artifactKey(r), r]));
  // Known local edges. Complete transitive byte binding is separately required by the digest API.
  const nodes = new Map([...unique.values()].map(artifact => [artifactKey(artifact), { artifact, dependencies: [] as ArtifactRef[] }]));
  nodes.set(artifactKey(root), { artifact: root, dependencies: [...dedup.values()] });
  const edge = (from: ArtifactRef, to: ArtifactRef) => {
    const node = nodes.get(artifactKey(from));
    if (node && !node.dependencies.some(r => artifactKey(r) === artifactKey(to))) node.dependencies.push(to);
  };
  if (value.contractVersion === 'player_team_allocation_handoff_v1') {
    const evidence = new Map(value.evidence.map(e => [e.id, e]));
    for (const e of value.evidence) if (e.kind === 'derived') for (const id of e.parents) {
      const parent = evidence.get(id);
      // Same-file field lineage does not embed a hash in that file. Distinct artifacts are dependencies.
      if (parent && artifactKey(e.artifact) !== artifactKey(parent.artifact)) edge(e.artifact, parent.artifact);
    }
  } else {
    value.teamstate.forEach(a => edge(a.artifact, a.input));
    if (value.comparison) edge(value.comparison.priorState, value.comparison.priorInput);
  }
  errors.push(...validateArtifactGraph([...nodes.values()]));
  return [...nodes.values()];
}
/** Compose all declarations available in this call. Unsupplied revisions are leaves for
 * local consistency only; their bytes and further edges require later authentication. */
function suppliedArtifactGraph(contracts: (Handoff | State)[], supplied: ArtifactNode[], errors: string[]): void {
  const revisions = new Map<string, ArtifactNode>();
  const add = (artifact: ArtifactRef, dependencies: ArtifactRef[] = []) => {
    const key = artifactKey(artifact), previous = revisions.get(key);
    if (previous && !same(previous.artifact, artifact)) errors.push(`aggregate artifact graph: conflicting revision metadata ${key}`);
    if (!previous) revisions.set(key, { artifact, dependencies: [] });
    const node = revisions.get(key)!;
    for (const dependency of dependencies) {
      const depKey = artifactKey(dependency);
      if (!node.dependencies.some(ref => artifactKey(ref) === depKey && same(ref, dependency))) node.dependencies.push(dependency);
      add(dependency);
    }
  };
  for (const contract of contracts) {
    // Local checks remain independent and report their own schema/semantic errors.
    const local = referencedArtifactNodes(contract, []);
    for (const node of local) add(node.artifact, node.dependencies);
  }
  for (const node of supplied) {
    if (!node || typeof node !== 'object' || !node.artifact || !Array.isArray(node.dependencies)) {
      errors.push('aggregate artifact graph: invalid supplied node'); continue;
    }
    add(node.artifact, node.dependencies);
  }
  errors.push(...validateArtifactGraph([...revisions.values()]));
}
function receptionConsistency(counts: Counts, path: string, errors: string[]) {
  if (counts.receptions.status === 'observed' && counts.targets.status === 'observed' && counts.receptions.value! > counts.targets.value!) errors.push(`${path}: receptions exceed targets`);
}
export function validateAllocationHandoffV1(input: unknown): ValidationResult {
  const errors: string[] = []; jsonInput(input, errors); if (errors.length) return result(errors); shape(input, handoffSchema, 'handoff', errors); if (errors.length) return result(errors);
  const h = input as Handoff, ev = evidenceTools(h, errors);
  referencedArtifactNodes(h, errors);
  revision(h.artifact, h.supersedes, errors, 'handoff.supersedes');
  if (!unique(h.evidence.map(e => e.id))) errors.push('handoff.evidence: duplicate ids');
  for (const e of h.evidence) {
    ev.check(e.parents, `evidence.${e.id}.parents`, e.kind === 'derived');
    if (e.kind !== 'derived' && e.parents.length) errors.push(`evidence.${e.id}: non-derived parents`);
    if (e.kind === 'derived' && !ev.eligible(e.id)) errors.push(`evidence.${e.id}: ineligible/cyclic derivation`);
    if (compareArtifactClocks(e.artifact.generatedAt, e.generatedAt) > 0) errors.push(`evidence.${e.id}: artifact generated after evidence`);
    for (const id of e.parents) { const parent = ev.map.get(id); if (parent && compareArtifactClocks(parent.generatedAt, e.generatedAt) > 0) errors.push(`evidence.${e.id}: parent generated after derived evidence`); }
    for (const clock of [e.sourceObservedAt, e.sourcePublishedAt, e.retrievedAt]) if (clock && compareArtifactClocks(clock, e.generatedAt) > 0) errors.push(`evidence.${e.id}: clock after generation`);
    if (compareArtifactClocks(e.generatedAt, h.generatedAt) > 0) errors.push(`evidence.${e.id}: generated after handoff`);
  }
  if (h.evidenceCutoff && compareArtifactClocks(h.evidenceCutoff, h.generatedAt) > 0) errors.push('handoff: cutoff after generation');
  ev.check(h.purpose.evidence, 'purpose.evidence', h.purpose.status === 'accepted');
  if (!unique(h.purpose.purposes) || (h.purpose.status === 'pending' && h.purpose.purposes.length) || (h.purpose.status === 'accepted' && (!h.purpose.purposes.length || h.mode === 'synthetic' || h.purpose.evidence.some(id => !ev.eligible(id))))) errors.push('purpose: inconsistent receipt/status');
  if (!unique(h.expectedGameIds) || !unique(h.games.map(g => g.gameId))) errors.push('games: duplicate ids');
  if (h.games.some(g => !h.expectedGameIds.includes(g.gameId) || g.homeTeam === g.awayTeam)) errors.push('games: unexpected game or identical opponents');
  if (h.coverage === 'complete' && (h.games.length === 0 || h.games.length !== h.expectedGameIds.length)) errors.push('coverage: incomplete schedule');
  const checkCount = (c: Count, path: string) => {
    ev.check(c.evidence, `${path}.evidence`, c.status !== 'missing');
    if (c.status === 'observed' ? c.value === null || c.reason !== null || c.evidence.some(id => !ev.eligible(id)) : c.value !== null || c.reason === null) errors.push(`${path}: count status/value/evidence mismatch`);
  };
  const teamKeys = new Set<string>(), rowIds = new Set<string>(), playerGames = new Set<string>();
  for (const t of h.teams) {
    const key = JSON.stringify([t.gameId, t.team]);
    if (teamKeys.has(key)) errors.push('teams: duplicate game/team'); teamKeys.add(key);
    const g = h.games.find(g => g.gameId === t.gameId);
    if (!g || !((g.homeTeam === t.team && g.awayTeam === t.opponent) || (g.awayTeam === t.team && g.homeTeam === t.opponent))) errors.push('teams: wrong game/team/opponent');
    ev.check(t.population.evidence, 'population.evidence');
    if (t.population.evidence.some(id => !ev.eligible(id))) errors.push('population: ineligible evidence');
    for (const r of t.rows) {
      if (rowIds.has(r.rowId)) errors.push('rows: duplicate row id'); rowIds.add(r.rowId);
      if (r.gameId !== t.gameId || r.team !== t.team || r.opponent !== t.opponent) errors.push('row: wrong game/team/opponent');
      if ((r.identity.status === 'resolved') !== (r.identity.playerId !== null)) errors.push('row: inconsistent identity');
      ev.check(r.identity.evidence, 'identity.evidence', r.identity.status === 'resolved');
      ev.check(r.positionEvidence, 'position.evidence', r.position !== null);
      if ([...r.identity.evidence, ...r.positionEvidence].some(id => !ev.eligible(id))) errors.push('row: ineligible identity/position evidence');
      if (r.identity.playerId !== null) {
        const pk = JSON.stringify([r.gameId, r.identity.namespace, r.identity.playerId]);
        if (playerGames.has(pk)) errors.push('rows: duplicate player/game key'); playerGames.add(pk);
      }
      for (const f of fields) checkCount(r.counts[f], `row.${r.rowId}.${f}`);
      receptionConsistency(r.counts, 'row', errors);
    }
    receptionConsistency(t.totals, 'team', errors);
    receptionConsistency(t.population.unallocated, 'residual', errors);
    for (const f of fields) {
      checkCount(t.totals[f], `team.${f}`); checkCount(t.population.unallocated[f], `residual.${f}`);
      const values = t.rows.map(r => r.counts[f].value), residual = t.population.unallocated[f].value, total = t.totals[f].value;
      const matches = total !== null && residual !== null && values.every(v => v !== null) && values.reduce<number>((a, v) => a + (v ?? 0), 0) + residual === total;
      if (t.population.reconciliation[f] === 'reconciled' && !matches) errors.push(`population.${f}: reconciliation mismatch`);
      if (t.population.status === 'complete' && (t.population.reconciliation[f] !== 'reconciled' || residual !== 0)) errors.push(`population.${f}: incomplete population labeled complete`);
    }
  }
  if (h.coverage === 'complete' && h.games.some(g => !teamKeys.has(JSON.stringify([g.gameId, g.homeTeam])) || !teamKeys.has(JSON.stringify([g.gameId, g.awayTeam])))) errors.push('coverage: missing team/game');
  return result(errors);
}

// Exact recognized source tokens; no aliases (e.g. HB -> RB) silently introduced.
const knownPositions = new Set(['RB', 'FB', 'WR', 'TE', 'QB', 'OL', 'OT', 'OG', 'T', 'G', 'C', 'DL', 'DT', 'DE', 'NT', 'EDGE', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'CB', 'S', 'FS', 'SS', 'K', 'P', 'LS']);
function qualifiedRoom(t: Handoff['teams'][number]): boolean {
  return t.population.status === 'complete' && t.population.reconciliation.carries === 'reconciled' && t.population.unallocated.carries.value === 0 && t.rows.every(r => r.position !== null && knownPositions.has(r.position) && r.identity.status === 'resolved' && r.counts.carries.value !== null);
}
function checkShare(s: Share, definition: Share['definition'], n: Count, d: number | null, eligible: boolean, requiredEvidence: string[], errors: string[], path: string) {
  const expected = !eligible ? 'ineligible' : n.value === null || d === null ? 'missing' : d === 0 ? 'zero_denominator' : 'available';
  if (s.definition !== definition || s.numerator !== n.value || s.denominator !== d || s.status !== expected) errors.push(`${path}: numerator/denominator/definition/status mismatch`);
  if (expected === 'available' ? s.value === null || !near(s.value, n.value! / d!) || s.reason !== null : s.value !== null || s.reason === null) errors.push(`${path}: value/reason mismatch`);
  if (!requiredEvidence.every(id => s.evidence.includes(id))) errors.push(`${path}: missing operand evidence`);
}
function checkClaim(c: Claim, s: Segment, r: AllocationRow, t: Handoff['teams'][number], errors: string[]) {
  const qb = s.sourcePosition === 'QB';
  const room = c.id === 'led_qualified_rb_room_carries' || c.id === 'majority_qualified_rb_room_carries';
  if (room && s.sourcePosition !== 'RB' || c.id.startsWith('recorded_qb_') !== qb && (c.id.startsWith('recorded_qb_') || qb)) errors.push(`claim.${c.id}: wrong position semantics`);
  let field: Field = c.id === 'recorded_qb_passing_work' ? 'passAttempts' : c.id.includes('receiving') ? 'targets' : 'carries';
  const n = r.counts[field].value;
  let status: Claim['status'] = n === null ? 'insufficient' : n > 0 ? 'supported' : 'not_supported';
  let needed = refsOf(r.counts, field);
  if (room) {
    const members = t.rows.filter(row => row.position === 'RB');
    const sum = members.reduce((a, row) => a + (row.counts.carries.value ?? 0), 0);
    const max = Math.max(0, ...members.map(row => row.counts.carries.value ?? 0));
    status = !qualifiedRoom(t) ? 'insufficient' : c.id === 'led_qualified_rb_room_carries'
      ? n! > 0 && n === max && members.filter(row => row.counts.carries.value === max).length === 1 ? 'supported' : 'not_supported'
      : sum > 0 && n! / sum > 0.5 ? 'supported' : 'not_supported';
    needed = [...new Set([...t.population.evidence, ...t.rows.flatMap(row => [...row.counts.carries.evidence, ...row.positionEvidence, ...row.identity.evidence])])];
  }
  if (r.identity.status !== 'resolved') status = 'insufficient';
  if (c.status !== status) errors.push(`claim.${c.id}: rule outcome mismatch`);
  const refs = status === 'supported' ? c.support : status === 'not_supported' ? c.counterevidence : [];
  if (status !== 'insufficient' && !needed.every(id => refs.includes(id))) errors.push(`claim.${c.id}: missing rule evidence`);
  if (status === 'insufficient' && !c.gaps.length) errors.push(`claim.${c.id}: missing gap`);
  if (status === 'supported' && (c.counterevidence.length || c.gaps.length)) errors.push(`claim.${c.id}: unresolved support conflict`);
}

export type ValidationContext = { handoff: unknown; prior?: { state: unknown; handoff: unknown }; suppliedArtifacts?: ArtifactNode[] };
/** Validity checks internal consistency only. It does not authenticate hashes/receipts or admit a source. */
export function validateWeeklyRoleStateV1(input: unknown, context: ValidationContext): ValidationResult {
  const errors: string[] = []; jsonInput(input, errors); if (errors.length) return result(errors); shape(input, stateSchema, 'state', errors);
  const hv = validateAllocationHandoffV1(context.handoff); errors.push(...hv.errors); if (errors.length) return result(errors);
  const s = input as State, h = context.handoff as Handoff, ev = evidenceTools(h, errors);
  referencedArtifactNodes(s, errors);
  revision(s.artifact, s.supersedes, errors, 'state.supersedes');
  if (!same(s.input, h.artifact) || !same(s.scope, h.scope) || s.evidenceCutoff !== h.evidenceCutoff) errors.push('state: input/scope/cutoff mismatch');
  if (compareArtifactClocks(s.generatedAt, h.generatedAt) < 0) errors.push('state: generated before input');
  if ((s.subject.status === 'resolved') !== (s.subject.playerId !== null)) errors.push('state: unresolved identity mismatch');
  ev.check(s.subject.evidence, 'subject.evidence', s.subject.status === 'resolved');
  if (s.subject.evidence.some(id => !ev.eligible(id))) errors.push('subject: ineligible evidence');
  const matches = h.teams.flatMap(t => t.rows).filter(r => s.subject.playerId !== null && r.identity.namespace === s.subject.namespace && r.identity.playerId === s.subject.playerId);
  if (s.presence === 'absent' ? s.segments.length !== 0 || matches.length !== 0 : s.segments.length === 0) errors.push('state: absent/observed mismatch');
  if (s.subject.status === 'unresolved' && s.segments.length > 1) errors.push('state: cannot combine unresolved actors');
  if (!unique(s.segments.map(x => x.rowId)) || (s.subject.status === 'resolved' && !same([...s.segments.map(x => x.rowId)].sort(), matches.map(x => x.rowId).sort()))) errors.push('state: duplicate or omitted player/game segments');
  const observedTeams: Handoff['teams'] = [];
  for (const seg of s.segments) {
    const t = h.teams.find(t => t.gameId === seg.gameId && t.team === seg.team);
    const r = t?.rows.find(r => r.rowId === seg.rowId);
    if (!t || !r) { errors.push('segment: unknown game/team/row'); continue; }
    observedTeams.push(t);
    if (seg.opponent !== r.opponent || s.subject.namespace !== r.identity.namespace || s.subject.playerId !== r.identity.playerId || s.subject.status !== r.identity.status || !r.identity.evidence.every(id => s.subject.evidence.includes(id)) || seg.sourcePosition !== r.position || seg.branch.position !== r.position || !same(seg.observations, r.counts)) errors.push('segment: source observation/identity/position mismatch');
    const b = seg.branch;
    checkShare(b.carryShare, 'player_carries/all_team_carries', r.counts.carries, t.totals.carries.value, t.population.reconciliation.carries === 'reconciled', [...r.counts.carries.evidence, ...t.totals.carries.evidence, ...t.population.evidence], errors, 'carryShare');
    if ('targetShare' in b) checkShare(b.targetShare, 'player_targets/credited_team_targets', r.counts.targets, t.totals.targets.value, t.population.reconciliation.targets === 'reconciled', [...r.counts.targets.evidence, ...t.totals.targets.evidence, ...t.population.evidence], errors, 'targetShare');
    if (b.position === 'QB') checkShare(b.passAttemptShare, 'player_attempts/all_team_attempts', r.counts.passAttempts, t.totals.passAttempts.value, t.population.reconciliation.passAttempts === 'reconciled', [...r.counts.passAttempts.evidence, ...t.totals.passAttempts.evidence, ...t.population.evidence], errors, 'passAttemptShare');
    if (b.position === 'RB') {
      const room = t.rows.filter(r => r.position === 'RB'), d = !qualifiedRoom(t) ? null : room.reduce((a, r) => a + r.counts.carries.value!, 0);
      checkShare(b.rbRoomCarryShare, 'player_carries/qualified_RB_carries', r.counts.carries, d, qualifiedRoom(t), [...t.population.evidence, ...t.rows.flatMap(r => [...r.counts.carries.evidence, ...r.positionEvidence, ...r.identity.evidence])], errors, 'rbRoomCarryShare');
    }
    for (const [key, val] of Object.entries(b)) if (key !== 'position') { ev.check((val as Share).evidence, key); if ((val as Share).evidence.some(id => !ev.eligible(id))) errors.push(`${key}: ineligible evidence`); }
    if (!unique(seg.claims.map(c => c.id))) errors.push('claims: duplicate ids');
    for (const c of seg.claims) {
      ev.check(c.support, 'claim.support', false); ev.check(c.counterevidence, 'claim.counterevidence', false);
      if ([...c.support, ...c.counterevidence].some(id => !ev.eligible(id))) errors.push('claim: ineligible support/counterevidence');
      if (s.subject.status !== 'resolved' && c.status !== 'insufficient') errors.push('claim: unresolved subject');
      checkClaim(c, seg, r, t, errors);
    }
  }
  const readiness: State['readiness'] = {
    identity: s.subject.status, observations: !s.segments.length ? 'absent' : s.segments.every(seg => fields.every(f => seg.observations[f].status === 'observed')) ? 'available' : 'partial',
    population: !observedTeams.length ? 'absent' : observedTeams.every(t => t.population.status === 'complete') ? 'complete' : 'incomplete',
    coverage: h.coverage, finality: h.finality, correction: h.correction, purpose: h.purpose.status === 'accepted' && h.purpose.purposes.includes('rop_observed_role') ? 'accepted' : 'pending', evidence: evidenceBasis(s, h),
  };
  if (!same(s.readiness, readiness)) errors.push('readiness: does not preserve evidence dimensions');
  const gaps = s.segments.flatMap(seg => fields.filter(f => seg.observations[f].status !== 'observed').map(f => `${seg.rowId}.${f}`));
  if (s.presence === 'absent') gaps.push('player_not_observed');
  if (s.subject.status === 'unresolved') gaps.push('unresolved_identity');
  if (!gaps.every(gap => s.missingEvidence.includes(gap))) errors.push('missingEvidence: missing core gap');
  if (!unique(s.teamstate.map(t => JSON.stringify([t.gameId, t.team])))) errors.push('teamstate: duplicate attachment');
  for (const a of s.teamstate) if (a.artifact.artifactType !== 'teamstate_context' || a.artifact.generatedAt !== a.generatedAt || compareArtifactClocks(a.input.generatedAt, a.generatedAt) > 0 || !same(a.scope, s.scope) || !same(a.input, s.input) || a.evidenceCutoff !== s.evidenceCutoff || !s.segments.some(seg => seg.gameId === a.gameId && seg.team === a.team) || compareArtifactClocks(a.generatedAt, s.generatedAt) > 0) errors.push('teamstate: mismatched scope/input/team/clock');
  const priorValidated = s.comparison ? validateComparison(s, h, context, errors) : false;
  // Include a supplied prior snapshot only when the comparison pins it. The prior
  // validator above verifies its own contract before this aggregate consistency pass.
  if (context.suppliedArtifacts !== undefined && !Array.isArray(context.suppliedArtifacts)) errors.push('aggregate artifact graph: suppliedArtifacts must be an array');
  const supplied = Array.isArray(context.suppliedArtifacts) ? context.suppliedArtifacts : [];
  const suppliedErrors: string[] = [];
  jsonInput(supplied, suppliedErrors);
  supplied.forEach((node, i) => shape(node, { artifact: ref, dependencies: array(ref) }, `suppliedArtifacts[${i}]`, suppliedErrors));
  errors.push(...suppliedErrors);
  if (!suppliedErrors.length) suppliedArtifactGraph(priorValidated && context.prior ? [s, h, context.prior.state as State, context.prior.handoff as Handoff] : [s, h], supplied, errors);
  return result(errors);
}
function evidenceBasis(s: State, h: Handoff): State['readiness']['evidence'] {
  const map = new Map(h.evidence.map(e => [e.id, e]));
  // Only observed subject work can establish this dimension: receipts/unused catalog entries cannot.
  const ids = s.segments.flatMap(seg => fields.flatMap(f => seg.observations[f].status === 'observed' ? seg.observations[f].evidence : []));
  const leaves = new Set<string>();
  const visit = (id: string, seen = new Set<string>()) => {
    const e = map.get(id); if (!e || seen.has(id)) return;
    if (e.kind === 'derived') e.parents.forEach(p => visit(p, new Set([...seen, id]))); else leaves.add(e.kind);
  };
  ids.forEach(id => visit(id));
  return leaves.has('fixture') ? 'fixture' : leaves.size === 1 && leaves.has('source') ? 'source_backed' : 'unavailable';
}
function validateComparison(s: State, h: Handoff, context: ValidationContext, errors: string[]): boolean {
  const c = s.comparison!;
  if (!context.prior) { errors.push('comparison: prior state and handoff required'); return false; }
  // Deliberately bounded: prior snapshots must be standalone, not recursive chains.
  const priorInput = context.prior.state as State;
  if (priorInput?.comparison !== null) { errors.push('comparison: prior must be standalone snapshot'); return false; }
  const v = validateWeeklyRoleStateV1(priorInput, { handoff: context.prior.handoff });
  if (!v.valid) { errors.push(...v.errors.map(e => `prior.${e}`)); return false; }
  const p = priorInput, ph = context.prior.handoff as Handoff;
  if (compareArtifactClocks(p.generatedAt, s.generatedAt) > 0) errors.push('comparison: prior state generated after comparison');
  if (!same(c.priorState, p.artifact) || !same(c.priorInput, p.input)) errors.push('comparison: revision pin mismatch');
  const reasons: string[] = [];
  if (s.subject.status !== 'resolved' || p.subject.status !== 'resolved' || s.subject.namespace !== p.subject.namespace || s.subject.playerId !== p.subject.playerId) reasons.push('identity_mismatch');
  if (s.scope.season !== p.scope.season || s.scope.seasonType !== p.scope.seasonType || s.scope.week !== p.scope.week + 1) reasons.push('not_adjacent_weeks');
  if (s.presence !== 'observed' || p.presence !== 'observed') reasons.push('player_absent');
  if (s.segments.length !== 1 || p.segments.length !== 1) reasons.push('multi_or_no_game_scope');
  const now = s.segments[0], prev = p.segments[0];
  if (now && prev && now.team !== prev.team) reasons.push('team_changed');
  if (now && prev && now.sourcePosition !== prev.sourcePosition) reasons.push('position_changed');
  if (now && prev && now.gameId === prev.gameId) reasons.push('same_game_across_weeks');
  if (!same(h.definitions, ph.definitions)) reasons.push('definition_changed');
  if (s.readiness.evidence !== p.readiness.evidence) reasons.push('evidence_basis_changed');
  if (s.readiness.purpose !== p.readiness.purpose) reasons.push('purpose_changed');
  if ([s, p].some(x => x.readiness.coverage !== 'complete' || x.readiness.population !== 'complete' || x.readiness.observations !== 'available')) reasons.push('incomplete_evidence');
  if (c.status !== (reasons.length ? 'non_comparable' : 'comparable') || !same([...c.reasons].sort(), reasons.sort())) errors.push('comparison: comparability/reasons mismatch');
  if (reasons.length) { if (c.deltas.length) errors.push('comparison: deltas on non-comparable states'); return true; }
  if (!unique(c.deltas.map(d => d.field))) errors.push('comparison: duplicate deltas');
  for (const d of c.deltas) {
    const isCount = fields.includes(d.field as Field);
    const get = (seg: Segment): number | null | undefined => isCount ? seg.observations[d.field as Field].value : (seg.branch as any)[d.field]?.value;
    const a = get(prev), b = get(now);
    if (a == null || b == null || d.previous !== a || d.current !== b || d.unit !== (isCount ? 'count' : 'percentage_points') || !near(d.delta, (b - a) * (isCount ? 1 : 100))) errors.push(`comparison.${d.field}: invalid delta`);
  }
  return true;
}

/** Standard JSON Schema covers structure. Cross-artifact invariants require the validator above. */
function jsonSchema(schema: Schema): Record<string, unknown> {
  if (typeof schema === 'string') {
    if (schema === 'text') return { type: 'string', pattern: '\\S' };
    if (schema === 'hash') return { type: 'string', pattern: '^[a-f0-9]{64}$' };
    if (schema === 'clock') return { type: 'string', format: 'date-time', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$' };
    if (schema === 'number') return { type: 'number' };
    if (schema === 'fraction') return { type: 'number', minimum: 0, maximum: 1 };
    return { type: 'integer', minimum: schema === 'year' ? 1920 : schema === 'week' ? 1 : 0, maximum: schema === 'year' ? 2200 : schema === 'week' ? 30 : Number.MAX_SAFE_INTEGER };
  }
  if (Array.isArray(schema)) return { enum: schema };
  const s = schema as Record<string, Schema>;
  if ('$nullable' in s) return { anyOf: [{ type: 'null' }, jsonSchema(s.$nullable)] };
  if ('$array' in s) return { type: 'array', items: jsonSchema(s.$array) };
  if ('$branches' in s) return { oneOf: ['RB', 'WR', 'TE', 'QB'].map(position => {
    const branch: Record<string, Schema> = { position: one(position), carryShare: share };
    if (position === 'QB') branch.passAttemptShare = share; else branch.targetShare = share;
    if (position === 'RB') branch.rbRoomCarryShare = share;
    return jsonSchema(branch);
  }) };
  return { type: 'object', additionalProperties: false, required: Object.keys(s), properties: Object.fromEntries(Object.entries(s).map(([key, child]) => [key, jsonSchema(child)])) };
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
freeze(handoffSchema); freeze(stateSchema);
export const playerTeamAllocationHandoffV1JsonSchema = freeze({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'urn:tiber:player-team-allocation-handoff:v1', ...jsonSchema(handoffSchema) });
export const weeklyRoleStateV1JsonSchema = freeze({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'urn:tiber:weekly-role-state:v1', ...jsonSchema(stateSchema) });
