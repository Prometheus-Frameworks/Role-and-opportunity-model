import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAllocationHandoffV1 as handoff, validateWeeklyRoleStateV1 as validate, weeklyRoleStateV1JsonSchema, playerTeamAllocationHandoffV1JsonSchema, fields } from '../src/validation/weeklyRoleStateV1.ts';
import type { Claim, PlayerTeamAllocationHandoffV1 as Handoff, WeeklyRoleStateV1 as State } from '../src/contracts/weeklyRoleStateV1.ts';
import { artifact, changeCount, clock, packet, state } from './fixtures/weeklyRoleStateV1.ts';

const valid = (s: State, h: Handoff, prior?: { state: State; handoff: Handoff }) => assert.deepEqual(validate(s, { handoff: h, prior }), { valid: true, errors: [] });
const invalid = (s: unknown, h: unknown, pattern: RegExp, prior?: { state: State; handoff: Handoff }) => { const v = validate(s, { handoff: h, prior }); assert.equal(v.valid, false); assert.match(v.errors.join('\n'), pattern); };
function claim(s: State, id: Claim['id'], status: Claim['status'] = 'supported'): Claim {
  const refs = id.includes('qualified_rb') ? ['SYN-A', 'SYN-A-row-0', 'SYN-A-row-1', 'SYN-A-row-2', 'SYN-A-row-3', 'SYN-A-row-4'] : [s.segments[0].rowId];
  return { id, ruleVersion: '1', status, support: status === 'supported' ? refs : [], counterevidence: status === 'not_supported' ? refs : [], gaps: status === 'insufficient' ? ['missing_required_evidence'] : [] };
}
test('four explicit branches accept synthetic observations without labels, scores, advanced evidence or Teamstate', () => {
  const h = packet(); assert.equal(handoff(h).valid, true);
  for (const index of [0, 2, 3, 4]) { const s = state(h, index); valid(s, h); assert.equal('primaryRole' in s, false); }
});
test('observed zero is a count and cannot support a positive-work claim', () => {
  const h = packet(), s = state(h, 3); s.segments[0].claims = [claim(s, 'recorded_rushing_work', 'not_supported')]; valid(s, h);
  s.segments[0].claims[0].status = 'supported'; invalid(s, h, /rule outcome/);
});
test('missing null remains inspectable and does not become observed zero', () => {
  const h = packet(), t = h.teams[0]; t.rows[3].counts.carries = { value: null, status: 'missing', reason: 'source_not_supplied', evidence: [] };
  t.population.status = 'incomplete'; t.population.reconciliation.carries = 'incomplete';
  const s = state(h, 3); s.segments[0].branch.carryShare = { ...s.segments[0].branch.carryShare, numerator: null, value: null, status: 'ineligible', reason: 'population_incomplete' };
  s.readiness.observations = 'partial'; s.readiness.population = 'incomplete'; s.missingEvidence = ['SYN-A-row-3.carries'];
  s.segments[0].claims = [claim(s, 'recorded_rushing_work', 'insufficient')]; valid(s, h);
  s.segments[0].observations.carries.value = 0; invalid(s, h, /source observation/);
});
test('null/zero status and unknown gaps fail closed', () => {
  const h = packet(); h.teams[0].rows[0].counts.carries.value = null; assert.match(handoff(h).errors.join(), /count status/);
  const s = state(); s.missingEvidence = []; s.presence = 'absent'; s.segments = []; invalid(s, packet(), /absent/);
});
test('absent player has no segments and never a fabricated zero row', () => {
  const h = packet(), s = state(h); s.subject.playerId = 'synthetic:absent'; s.presence = 'absent'; s.segments = [];
  s.readiness.observations = 'absent'; s.readiness.population = 'absent'; s.missingEvidence = ['player_not_observed']; s.readiness.evidence = 'unavailable'; valid(s, h);
  s.segments = state(h).segments; invalid(s, h, /absent/);
});
test('unresolved identity retained as evidence-only segment, no resolved player claim', () => {
  const h = packet(); h.teams[0].rows[2].identity = { namespace: 'synthetic', playerId: null, status: 'unresolved', evidence: [] };
  const s = state(h, 2); s.readiness.identity = 'unresolved'; s.missingEvidence = ['unresolved_identity']; valid(s, h);
  s.segments[0].claims = [claim(s, 'recorded_receiving_opportunity')]; invalid(s, h, /unresolved subject/);
});
test('unknown position residual blocks RB-room inference but preserves all-team shares', () => {
  const h = packet(); h.teams[0].rows[1].position = null; h.teams[0].rows[1].positionEvidence = [];
  const s = state(h); const b = s.segments[0].branch; assert.equal(b.position, 'RB'); if (b.position !== 'RB') return;
  b.rbRoomCarryShare = { ...b.rbRoomCarryShare, denominator: null, value: null, status: 'ineligible', reason: 'unknown_position' };
  s.segments[0].claims = [claim(s, 'led_qualified_rb_room_carries', 'insufficient')]; valid(s, h);
  s.segments[0].claims[0].status = 'supported'; invalid(s, h, /rule outcome/);
});
test('unattributed row is preserved and blocks qualified-room claims', () => {
  const h = packet(); h.teams[0].rows[1].identity = { namespace: 'synthetic', playerId: null, status: 'unresolved', evidence: [] };
  const s = state(h); if (s.segments[0].branch.position !== 'RB') return;
  s.segments[0].branch.rbRoomCarryShare.denominator = null; s.segments[0].branch.rbRoomCarryShare.value = null; s.segments[0].branch.rbRoomCarryShare.status = 'ineligible'; s.segments[0].branch.rbRoomCarryShare.reason = 'unattributed';
  valid(s, h);
});
test('unallocated positive work reconciles only as an incomplete population', () => {
  const h = packet(), t = h.teams[0]; t.totals.carries.value! += 2; t.population.unallocated.carries.value = 2;
  assert.match(handoff(h).errors.join(), /incomplete population/); t.population.status = 'incomplete'; assert.equal(handoff(h).valid, true);
  const s = state(h); s.readiness.population = 'incomplete'; if (s.segments[0].branch.position !== 'RB') return;
  Object.assign(s.segments[0].branch.rbRoomCarryShare, { denominator: null, value: null, status: 'ineligible', reason: 'unallocated_work' }); valid(s, h);
});
for (const mutation of ['duplicate-player', 'duplicate-row', 'wrong-game', 'wrong-team', 'wrong-opponent', 'missing-team', 'missing-game', 'incomplete-sum'] as const) test(`handoff rejects ${mutation}`, () => {
  const h = packet(), t = h.teams[0];
  if (mutation === 'duplicate-player') t.rows[1].identity.playerId = t.rows[0].identity.playerId;
  if (mutation === 'duplicate-row') t.rows[1].rowId = t.rows[0].rowId;
  if (mutation === 'wrong-game') t.rows[0].gameId = 'WRONG';
  if (mutation === 'wrong-team') t.rows[0].team = 'WRONG';
  if (mutation === 'wrong-opponent') t.opponent = 'WRONG';
  if (mutation === 'missing-team') h.teams.pop();
  if (mutation === 'missing-game') h.expectedGameIds.push('MISSING');
  if (mutation === 'incomplete-sum') t.totals.targets.value! += 1;
  assert.equal(handoff(h).valid, false);
});
for (const [field, value] of [['season', 2025], ['week', 2], ['seasonType', 'POST']] as const) test(`state rejects wrong ${field}`, () => {
  const h = packet(), s = state(h); (s.scope as any)[field] = value; invalid(s, h, /scope/);
});
test('state rejects duplicate and omitted segments', () => {
  const h = packet(), s = state(h); s.segments.push(structuredClone(s.segments[0])); invalid(s, h, /duplicate/);
  s.segments = []; invalid(s, h, /omitted|observed/);
});
for (const part of ['numerator', 'denominator', 'value', 'definition'] as const) test(`share rejects wrong ${part}`, () => {
  const h = packet(), s = state(h), share = s.segments[0].branch.carryShare;
  (share as any)[part] = part === 'definition' ? 'player_targets/credited_team_targets' : 0.3; invalid(s, h, /mismatch|shape/);
});
test('zero denominator yields null rather than zero share or NaN', () => {
  const h = packet(); for (let i = 0; i < 5; i++) changeCount(h, i, 'carries', 0);
  const s = state(h); valid(s, h); assert.equal(s.segments[0].branch.carryShare.status, 'zero_denominator');
  s.segments[0].branch.carryShare.value = 0; invalid(s, h, /value\/reason/);
});
test('unique RB leader and strict majority use room denominator, not team carries', () => {
  const h = packet(), s = state(h); s.segments[0].claims = [claim(s, 'led_qualified_rb_room_carries'), claim(s, 'majority_qualified_rb_room_carries')]; valid(s, h);
  const b = s.segments[0].branch; assert.equal(b.position === 'RB' && b.rbRoomCarryShare.denominator, 12); assert.equal(b.carryShare.denominator, 15);
});
test('tied RB carries support neither sole leadership nor strict majority', () => {
  const h = packet(); changeCount(h, 1, 'carries', 8); const s = state(h);
  s.segments[0].claims = [claim(s, 'led_qualified_rb_room_carries', 'not_supported'), claim(s, 'majority_qualified_rb_room_carries', 'not_supported')]; valid(s, h);
  s.segments[0].claims[0].status = 'supported'; invalid(s, h, /rule outcome/);
});
test('each position allows only its own conservative claim family', () => {
  const h = packet();
  for (const i of [0, 2, 3]) { const s = state(h, i); s.segments[0].claims = [claim(s, 'recorded_receiving_opportunity'), claim(s, 'observed_receiving_involvement')]; valid(s, h); }
  const qb = state(h, 4); qb.segments[0].claims = [claim(qb, 'recorded_qb_passing_work'), claim(qb, 'recorded_qb_rushing_work')]; valid(qb, h);
  qb.segments[0].claims = [claim(qb, 'recorded_rushing_work')]; invalid(qb, h, /wrong position/);
  const wr = state(h, 2); wr.segments[0].claims = [claim(wr, 'led_qualified_rb_room_carries')]; invalid(wr, h, /wrong position/);
  (wr.segments[0].branch as any).rbRoomCarryShare = state(h).segments[0].branch.carryShare; invalid(wr, h, /unknown field/);
});
test('claim support, counterevidence and gaps cannot be omitted or fabricated', () => {
  const h = packet(), s = state(h); s.segments[0].claims = [claim(s, 'recorded_rushing_work')]; s.segments[0].claims[0].support = []; invalid(s, h, /missing rule evidence/);
  s.segments[0].claims[0].support = ['unknown']; invalid(s, h, /unknown evidence/);
  s.segments[0].claims[0] = claim(s, 'recorded_rushing_work'); s.segments[0].claims[0].counterevidence = ['SYN-A']; invalid(s, h, /support conflict/);
});
for (const kind of ['proxy', 'reported'] as const) test(`${kind} cannot become measured work or claim support`, () => {
  const h = packet(); h.evidence[1].kind = kind; assert.match(handoff(h).errors.join(), /ineligible|mismatch/);
});
test('candidate cannot launder fixture evidence as source-backed', () => {
  const h = packet(); h.mode = 'candidate'; assert.equal(handoff(h).valid, false);
});
test('source-shaped test follows supplied lineage and does not imply purpose admission', () => {
  const h = packet(); h.evidence.forEach(e => e.kind = 'source'); const s = state(h); s.readiness.evidence = 'source_backed'; valid(s, h); assert.equal(s.readiness.purpose, 'pending');
  s.readiness.evidence = 'fixture'; invalid(s, h, /readiness/);
});
test('derived evidence requires qualified lineage and rejects cycles', () => {
  const h = packet(); h.evidence.push({ ...h.evidence[0], id: 'derived', kind: 'derived', parents: [h.evidence[0].id] }); assert.equal(handoff(h).valid, true);
  h.evidence.at(-1)!.parents = ['derived']; assert.equal(handoff(h).valid, false);
});
test('purpose acceptance is copied only from exact-purpose evidence; synthetic cannot be admitted', () => {
  const h = packet(), s = state(h); s.readiness.purpose = 'accepted'; invalid(s, h, /readiness/);
  h.purpose = { status: 'accepted', purposes: ['rop_observed_role'], evidence: ['SYN-A'] }; assert.equal(handoff(h).valid, false);
});
function weeks() {
  const p = packet(1), h = packet(2), prior = state(p), s = state(h);
  s.comparison = { priorState: prior.artifact, priorInput: prior.input, status: 'comparable', reasons: [], deltas: [{ field: 'carries', unit: 'count', previous: 8, current: 8, delta: 0 }] };
  return { p, h, prior, s, context: { state: prior, handoff: p } };
}
test('comparable weeks permit exact count and percentage-point arithmetic', () => {
  const { p, h, prior } = weeks(); changeCount(h, 0, 'targets', 5); changeCount(h, 2, 'targets', 2); const s = state(h);
  s.comparison = { priorState: prior.artifact, priorInput: prior.input, status: 'comparable', reasons: [], deltas: [{ field: 'targets', unit: 'count', previous: 2, current: 5, delta: 3 }, { field: 'targetShare', unit: 'percentage_points', previous: 0.2, current: 0.5, delta: 30 }] };
  // Keep receptions within changed targets in this invented game.
  changeCount(h, 2, 'receptions', 2); valid(s, h, { state: prior, handoff: p });
  s.comparison.deltas[1].delta = 0.3; invalid(s, h, /invalid delta/, { state: prior, handoff: p });
});
for (const reason of ['team_changed', 'position_changed', 'definition_changed', 'not_adjacent_weeks'] as const) test(`comparison explicitly blocks ${reason}`, () => {
  const { h, p, prior } = weeks();
  if (reason === 'position_changed') h.teams[0].rows[0].position = 'WR';
  if (reason === 'team_changed') {
    h.games[0].homeTeam = 'SYN-C'; h.teams[0].team = 'SYN-C'; h.teams[0].rows.forEach(r => r.team = 'SYN-C'); h.teams[1].opponent = 'SYN-C'; h.teams[1].rows.forEach(r => r.opponent = 'SYN-C');
  }
  if (reason === 'definition_changed') h.definitions.carries = 'synthetic:new-carries-v2';
  if (reason === 'not_adjacent_weeks') h.scope.week = 3;
  const s = state(h); // Evidence IDs remain historical IDs even if test team label changes.
  if (reason === 'team_changed') {
    s.segments[0].branch.carryShare.evidence = ['SYN-A-row-0', 'SYN-A'];
    if ('targetShare' in s.segments[0].branch) s.segments[0].branch.targetShare.evidence = ['SYN-A-row-0', 'SYN-A'];
    if (s.segments[0].branch.position === 'RB') s.segments[0].branch.rbRoomCarryShare.evidence[0] = 'SYN-A';
  }
  s.comparison = { priorState: prior.artifact, priorInput: prior.input, status: 'non_comparable', reasons: [reason], deltas: [] }; valid(s, h, { state: prior, handoff: p });
  s.comparison.status = 'comparable'; invalid(s, h, /comparability/, { state: prior, handoff: p });
});
test('comparison needs pinned prior evidence, not a free-floating prior value', () => {
  const { s, h, context } = weeks(); invalid(s, h, /prior state/);
  s.comparison!.priorInput.revision = 'wrong'; invalid(s, h, /revision pin|input\/scope/, context);
});
test('corrections require new revision/hash and invalidate a comparison using the old pin', () => {
  const { s, h, p, prior } = weeks(); const old = structuredClone(p.artifact);
  p.supersedes = old; p.artifact = { ...old, revision: '2', sha256: 'b'.repeat(64) }; prior.input = structuredClone(p.artifact);
  prior.supersedes = structuredClone(prior.artifact); prior.artifact = { ...prior.artifact, revision: '2', sha256: 'c'.repeat(64) };
  valid(prior, p); invalid(s, h, /revision pin/, { state: prior, handoff: p });
  s.comparison!.priorInput = structuredClone(p.artifact); s.comparison!.priorState = structuredClone(prior.artifact); valid(s, h, { state: prior, handoff: p });
  p.artifact.sha256 = old.sha256; assert.equal(handoff(p).valid, false);
});
test('retrieval/generation clocks cannot replace football evidence cutoff', () => {
  const h = packet(), s = state(h); s.evidenceCutoff = clock; invalid(s, h, /cutoff/);
  h.evidence[0].retrievedAt = '2027-01-01T00:00:00Z'; assert.equal(handoff(h).valid, false);
});
test('Teamstate is optional; supplied attachment must match event scope and shared input', () => {
  const h = packet(), s = state(h); valid(s, h);
  s.teamstate = [{ artifact: artifact('tts'), input: structuredClone(h.artifact), scope: structuredClone(h.scope), gameId: h.games[0].gameId, team: 'SYN-A', rowRef: 'synthetic:team-row', evidenceCutoff: null, generatedAt: clock, purpose: 'pending', finality: 'unknown' }]; valid(s, h);
  for (const [key, value] of [['team', 'WRONG'], ['gameId', 'WRONG'], ['evidenceCutoff', clock]] as const) { const changed = structuredClone(s); (changed.teamstate[0] as any)[key] = value; invalid(changed, h, /teamstate/); }
  s.teamstate[0].scope.week = 2; invalid(s, h, /teamstate/);
});
for (const key of ['fantasyPoints', 'prediction', 'futureVolume', 'primaryRole', 'roleScore', 'confidenceScore']) test(`closed contract rejects ${key}`, () => {
  const h = packet(), s = state(h); (s as any)[key] = 10; invalid(s, h, /unknown field/);
});
test('no narrow/future-volume claim, scoring-area policy or consumer activation', () => {
  const h = packet(), s = state(h); (s.scoringArea as any).goalLineYardLine = 2; invalid(s, h, /unknown field/); delete (s.scoringArea as any).goalLineYardLine;
  (s.consumerActivation as any) = 'enabled'; invalid(s, h, /shape/); s.consumerActivation = 'none';
  (s.segments[0].claims as any) = [{ ...claim(s, 'recorded_rushing_work'), id: 'will_receive_more_carries' }]; invalid(s, h, /shape/);
});
test('malformed inputs return errors rather than throw or coerce', () => {
  for (const input of [null, [], {}, 1, 'text', { contractVersion: 'weekly_role_state_v1' }]) assert.doesNotThrow(() => { assert.equal(validate(input, { handoff: packet() }).valid, false); });
  const h = packet(); (h.teams[0].rows[0].counts.carries.value as any) = '8'; assert.equal(handoff(h).valid, false);
});
test('unknown non-null position token cannot silently shrink the RB denominator', () => {
  const h = packet(); h.teams[0].rows[1].position = 'UNK'; const s = state(h);
  invalid(s, h, /rbRoomCarryShare/);
  if (s.segments[0].branch.position !== 'RB') return;
  Object.assign(s.segments[0].branch.rbRoomCarryShare, { denominator: null, value: null, status: 'ineligible', reason: 'unknown_source_position_token' }); valid(s, h);
});
test('FB is retained in all-team carries but excluded from exact RB-token room', () => {
  const h = packet(); h.teams[0].rows[1].position = 'FB'; const s = state(h); valid(s, h);
  assert.equal(s.segments[0].branch.position === 'RB' && s.segments[0].branch.rbRoomCarryShare.denominator, 8);
  assert.equal(s.segments[0].branch.carryShare.denominator, 15);
});
test('reported/proxy context may be retained separately without entering work', () => {
  const h = packet(); h.evidence.push({ ...h.evidence[0], id: 'report-only', kind: 'reported' }, { ...h.evidence[0], id: 'proxy-only', kind: 'proxy' }); valid(state(h), h);
  const s = state(h); s.segments[0].claims = [claim(s, 'recorded_rushing_work')]; s.segments[0].claims[0].support.push('report-only'); invalid(s, h, /ineligible support/);
});
test('unresolved identity can express an insufficient claim with a gap', () => {
  const h = packet(); h.teams[0].rows[2].identity = { namespace: 'synthetic', playerId: null, status: 'unresolved', evidence: [] };
  const s = state(h, 2); s.readiness.identity = 'unresolved'; s.missingEvidence = ['unresolved_identity']; s.segments[0].claims = [claim(s, 'recorded_receiving_opportunity', 'insufficient')]; valid(s, h);
});
test('absent prior week is non-comparable and must not generate deltas', () => {
  const { s, h, p, prior } = weeks();
  p.teams[0].rows[0].identity.playerId = 'synthetic:different-player';
  prior.presence = 'absent'; prior.segments = []; prior.readiness.observations = 'absent'; prior.readiness.population = 'absent'; prior.missingEvidence = ['player_not_observed']; prior.readiness.evidence = 'unavailable';
  s.comparison!.status = 'non_comparable'; s.comparison!.reasons = ['player_absent', 'multi_or_no_game_scope', 'incomplete_evidence', 'evidence_basis_changed']; s.comparison!.deltas = [];
  valid(s, h, { state: prior, handoff: p }); s.comparison!.deltas = [{ field: 'carries', previous: 0, current: 8, delta: 8, unit: 'count' }]; invalid(s, h, /non-comparable/, { state: prior, handoff: p });
});
test('partial coverage cannot claim comparable weeks', () => {
  const { s, h, context } = weeks(); h.coverage = 'partial'; s.readiness.coverage = 'partial'; s.comparison!.status = 'non_comparable'; s.comparison!.reasons = ['incomplete_evidence']; s.comparison!.deltas = []; valid(s, h, context);
});
test('multiple same-week games keep separate segments and source identity evidence', () => {
  const h = packet(), extra = packet(2), s = state(h), second = state(extra).segments[0];
  const rename = (id: string) => `${id}:extra`;
  const visit = (value: any): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['evidence', 'positionEvidence'].includes(key) && Array.isArray(child) && child.every(x => typeof x === 'string')) value[key] = child.map(rename);
      else if (key === 'rowId') value[key] = rename(child as string);
      else visit(child);
    }
  };
  visit(extra.teams); visit(second);
  extra.evidence.forEach(e => e.id = rename(e.id));
  h.games.push(...extra.games); h.expectedGameIds.push(...extra.expectedGameIds); h.teams.push(...extra.teams); h.evidence.push(...extra.evidence);
  s.subject.evidence.push(rename(s.subject.evidence[0])); s.segments.push(second); valid(s, h);
  s.segments.pop(); invalid(s, h, /omitted/);
});
test('different source/fixture basis blocks a weekly comparison even with identical arithmetic', () => {
  const { s, h, context } = weeks(); h.mode = 'candidate'; h.evidence.forEach(e => e.kind = 'source'); s.readiness.evidence = 'source_backed';
  s.comparison!.status = 'non_comparable'; s.comparison!.reasons = ['evidence_basis_changed']; s.comparison!.deltas = []; valid(s, h, context);
});
test('artifact correction and source finality never silently elevate readiness', () => {
  const h = packet(), s = state(h); s.readiness.finality = 'final'; invalid(s, h, /readiness/);
  s.readiness.finality = 'unknown'; s.supersedes = structuredClone(s.artifact); invalid(s, h, /correction requires/);
});
test('handoff rejects fantasy-point fields at the source boundary too', () => {
  const h = packet(); (h.teams[0].rows[0].counts as any).fantasyPoints = { value: 20 }; assert.match(handoff(h).errors.join(), /unknown field/);
});
test('standard schemas and validator definitions cannot be mutated by consumers', () => {
  assert.equal(weeklyRoleStateV1JsonSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(playerTeamAllocationHandoffV1JsonSchema.$id, 'urn:tiber:player-team-allocation-handoff:v1');
  assert.throws(() => (weeklyRoleStateV1JsonSchema as any).additionalProperties = true, TypeError);
  assert.throws(() => (fields as any).push('fantasyPoints'), TypeError);
});
test('invalid calendar dates and inherited-key tricks fail closed', () => {
  const h = packet(); h.generatedAt = '2026-02-30T00:00:00Z'; assert.equal(handoff(h).valid, false);
  const s = state(); Object.defineProperty(s, 'constructor', { value: 'bad', enumerable: true }); invalid(s, packet(), /unknown field/);
});
