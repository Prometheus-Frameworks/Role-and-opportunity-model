import test from 'node:test';
import assert from 'node:assert/strict';
import { packet, state, clock, artifact, changeCount } from './fixtures/weeklyRoleStateV1.ts';
import { validateAllocationHandoffV1 as handoff, validateWeeklyRoleStateV1 as validate } from '../src/validation/weeklyRoleStateV1.ts';

function empty() {
  const h = packet(), s = state(h); h.mode = 'candidate'; h.games = []; h.expectedGameIds = []; h.teams = []; h.evidence = []; h.coverage = 'unknown';
  s.subject = { namespace: 'synthetic', playerId: null, status: 'unresolved', evidence: [] }; s.presence = 'absent'; s.segments = [];
  s.readiness = { identity: 'unresolved', observations: 'absent', population: 'absent', coverage: 'unknown', finality: 'unknown', correction: 'open', purpose: 'pending', evidence: 'unavailable' };
  s.missingEvidence = ['player_not_observed', 'unresolved_identity']; return { h, s };
}
test('F1: empty candidate and absent unresolved subject need no invented evidence', () => {
  const { h, s } = empty(); assert.equal(handoff(h).valid, true); assert.equal(validate(s, { handoff: h }).valid, true);
  s.readiness.evidence = 'source_backed'; assert.match(validate(s, { handoff: h }).errors.join(), /readiness/);
});
test('F1: observed source lineage, fixture ancestry and lifecycle are distinct', () => {
  const h = packet(); h.mode = 'candidate'; h.evidence.forEach(e => e.kind = 'source'); const s = state(h); s.readiness.evidence = 'source_backed';
  assert.equal(validate(s, { handoff: h }).valid, true);
  h.mode = 'synthetic'; assert.equal(validate(s, { handoff: h }).valid, true);
  h.evidence[1].kind = 'fixture'; s.readiness.evidence = 'fixture'; assert.equal(validate(s, { handoff: h }).valid, true);
  h.evidence.push({ ...h.evidence[1], id: 'derived-fixture', kind: 'derived', parents: [h.evidence[1].id] });
  h.teams[0].rows[0].counts.carries.evidence = ['derived-fixture']; s.segments[0].observations.carries.evidence = ['derived-fixture']; s.segments[0].branch.carryShare.evidence.push('derived-fixture');
  if (s.segments[0].branch.position === 'RB') s.segments[0].branch.rbRoomCarryShare.evidence.push('derived-fixture');
  assert.equal(validate(s, { handoff: h }).valid, true); s.readiness.evidence = 'source_backed'; assert.equal(validate(s, { handoff: h }).valid, false);
});
test('F1: purpose acceptance and unused source catalog entries cannot manufacture work evidence', () => {
  const { h, s } = empty(); h.evidence = [{ ...packet().evidence[0], kind: 'source', id: 'receipt-only' }];
  h.purpose = { status: 'accepted', purposes: ['rop_observed_role'], evidence: ['receipt-only'] }; s.readiness.purpose = 'accepted';
  assert.equal(validate(s, { handoff: h }).valid, true); s.readiness.evidence = 'source_backed'; assert.equal(validate(s, { handoff: h }).valid, false);
});
for (const level of ['player', 'team', 'residual'] as const) test(`F2: observed reception/target contradiction at ${level}`, () => {
  const h = packet(), t = h.teams[0]; t.population.status = 'incomplete';
  if (level === 'player') t.rows[0].counts.receptions.value = 3;
  if (level === 'team') t.totals.receptions.value = 11;
  if (level === 'residual') { t.population.unallocated.receptions.value = 10; t.totals.receptions.value = 17; }
  assert.match(handoff(h).errors.join(), new RegExp(`${level === 'player' ? 'row' : level}: receptions exceed targets`));
});
for (const status of ['missing', 'conflicted'] as const) test(`F2: ${status} targets remain null without a fabricated contradiction or zero`, () => {
  const h = packet(), t = h.teams[0]; t.population.status = 'incomplete'; t.population.reconciliation.targets = 'incomplete';
  for (const c of [t.rows[0].counts, t.totals, t.population.unallocated]) c.targets = { value: null, status, reason: 'synthetic unresolved target evidence', evidence: status === 'conflicted' ? ['SYN-A'] : [] };
  const before = structuredClone(h); assert.equal(handoff(h).valid, true); assert.deepEqual(h, before);
});
test('F3: derived evidence cannot predate exact parent; equal boundary allowed', () => {
  const h = packet(); h.generatedAt = h.artifact.generatedAt = '2026-01-03T00:00:00Z'; h.evidence[0].generatedAt = '2026-01-02T00:00:00Z';
  h.evidence.push({ ...h.evidence[0], id: 'early-derived', kind: 'derived', parents: [h.evidence[0].id], generatedAt: clock });
  assert.match(handoff(h).errors.join(), /parent generated after/); h.evidence.at(-1)!.generatedAt = h.evidence[0].generatedAt; assert.equal(handoff(h).valid, true);
});
test('F3: referenced source artifact cannot postdate evidence or handoff', () => {
  const h = packet(); h.evidence[0].artifact.generatedAt = '2026-01-02T00:00:00Z'; assert.match(handoff(h).errors.join(), /generated after/);
});
test('F3/F4: distinct derived artifacts obey chronology and artifact cycles cannot hide behind acyclic evidence IDs', () => {
  const h = packet(); h.generatedAt = h.artifact.generatedAt = '2026-01-03T00:00:00Z';
  const parent = { ...h.evidence[0], id: 'p', artifact: artifact('parent'), generatedAt: '2026-01-02T00:00:00Z' }; parent.artifact.generatedAt = parent.generatedAt;
  h.evidence.push(parent, { ...h.evidence[0], id: 'd', artifact: artifact('derived'), kind: 'derived', parents: ['p'], generatedAt: h.generatedAt });
  assert.match(handoff(h).errors.join(), /dependency generated after/);
  h.evidence.at(-1)!.artifact.generatedAt = parent.generatedAt; assert.equal(handoff(h).valid, true);
  const a = artifact('A'), b = artifact('B'), base = h.evidence[0];
  h.evidence.push({ ...base, id: 'a-source', artifact: a }, { ...base, id: 'b-source', artifact: b }, { ...base, id: 'a-derived', artifact: a, kind: 'derived', parents: ['b-source'] }, { ...base, id: 'b-derived', artifact: b, kind: 'derived', parents: ['a-source'] });
  assert.match(handoff(h).errors.join(), /dependency cycle/);
});
test('F3: Teamstate cannot predate exact input; equal boundary allowed without a cutoff', () => {
  const h = packet(), s = state(h), a = artifact('tts'); a.generatedAt = '1920-01-01T00:00:00Z';
  s.teamstate = [{ artifact: a, input: h.artifact, scope: h.scope, gameId: h.games[0].gameId, team: 'SYN-A', rowRef: 'synthetic:row', generatedAt: a.generatedAt, evidenceCutoff: null, purpose: 'pending', finality: 'unknown' }];
  assert.match(validate(s, { handoff: h }).errors.join(), /teamstate/); a.generatedAt = s.teamstate[0].generatedAt = clock;
  assert.equal(validate(s, { handoff: h }).valid, true); assert.equal(s.evidenceCutoff, null);
});
test('F3: comparison cannot incorporate a later prior correction; exact equality allowed', () => {
  const ph = packet(1); ph.generatedAt = ph.artifact.generatedAt = '2026-01-03T00:00:00Z'; const p = state(ph); p.generatedAt = p.artifact.generatedAt = ph.generatedAt;
  const h = packet(2), s = state(h); s.comparison = { priorState: p.artifact, priorInput: p.input, status: 'comparable', reasons: [], deltas: [] };
  const context = { handoff: h, prior: { state: p, handoff: ph } };
  assert.match(validate(s, context).errors.join(), /generated after/); s.generatedAt = s.artifact.generatedAt = p.generatedAt;
  assert.equal(validate(s, context).valid, true);
});
test('F3: superseded artifact generation and sub-millisecond clock order are enforced', () => {
  const h = packet(); h.supersedes = { ...h.artifact, revision: 'older', sha256: 'b'.repeat(64), generatedAt: '2026-01-02T00:00:00Z' };
  assert.match(handoff(h).errors.join(), /generated after/); h.supersedes.generatedAt = clock; assert.equal(handoff(h).valid, true);
  h.generatedAt = h.artifact.generatedAt = '2026-01-01T00:00:00.0001Z'; assert.equal(handoff(h).valid, true);
  h.supersedes.generatedAt = '2026-01-01T00:00:00.0002Z'; assert.match(handoff(h).errors.join(), /generated after/);
});
test('F4/F5: same-revision self-reference, conflicting profiles and invalid Unicode fail at contract boundary', () => {
  const h = packet(); h.evidence[0].artifact = structuredClone(h.artifact); assert.match(handoff(h).errors.join(), /self-reference/);
  const bad = packet(); bad.evidence[0].artifact.digestProfile = 'tiber-jcs-root-sha256-v1'; assert.match(handoff(bad).errors.join(), /profile/);
  const unicode = packet(); unicode.evidence[0].locator = '\ud800'; assert.match(handoff(unicode).errors.join(), /surrogate/);
});
test('RB policy unchanged for unknown-position observed zero carries', () => {
  const h = packet(); changeCount(h, 1, 'carries', 0); h.teams[0].rows[1].position = null; h.teams[0].rows[1].positionEvidence = [];
  assert.equal(handoff(h).valid, true); const s = state(h); assert.equal(validate(s, { handoff: h }).valid, false);
  if (s.segments[0].branch.position !== 'RB') throw Error('fixture');
  Object.assign(s.segments[0].branch.rbRoomCarryShare, { denominator: null, value: null, status: 'ineligible', reason: 'membership unresolved, zero carries observed' });
  s.segments[0].claims = [{ id: 'led_qualified_rb_room_carries', ruleVersion: '1', status: 'insufficient', support: [], counterevidence: [], gaps: ['membership_unresolved'] }];
  assert.equal(validate(s, { handoff: h }).valid, true); s.segments[0].claims[0].status = 'supported'; assert.equal(validate(s, { handoff: h }).valid, false);
});
