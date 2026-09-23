# WeeklyRoleStateV1 — Slice 1 proposal

Status: additive local contract proposal for operator review. No live producer, builder,
runner, endpoint, export, consumer or source admission is supplied by this slice.
Baseline: `6435d8d3c2c4e53dc45ab57a05a2716e2b47598d` (ROP main, refreshed before work).

## Meaning and ownership

A Role State describes recorded work in an explicit historical week. It does not
describe expected work, player quality, fantasy production or a permanent archetype.
The minimum valid object needs no claims, primary role label, continuous score,
route/snap evidence, Teamstate context or prior-week comparison.

| Owner | Boundary |
|---|---|
| TIBER-Data | Source-observed player work, team totals, population/residuals, event identity, definitions, source clocks, evidence receipts and shared allocation handoff |
| TIBER-Teamstate | Optional read-only environment interpretation of that same handoff |
| Role-and-opportunity | Validate observed Role State and deterministic atomic claims against the supplied handoff |
| Fantasy / TIBER Team | Future separately authorized read-only presentation |

Source event → Data derivation → ROP interpretation remains distinct. Validator
arithmetic checks an asserted result; it is not a Data producer or a role builder.
It neither fetches bytes nor authenticates evidence. A successful validation means
internal consistency of supplied objects, **not** truth, rights clearance, acceptance,
promotion, freshness, operational readiness or permission to activate a consumer.

## Files and entry points

| File | Purpose |
|---|---|
| `src/contracts/weeklyRoleStateV1.ts` | Exported TypeScript contracts, including the proposed shared Data handoff |
| `src/validation/weeklyRoleStateV1.ts` | Closed runtime shapes, cross-object validators and frozen draft-2020-12 JSON Schemas |
| `tests/fixtures/weeklyRoleStateV1.ts` | Invented SYN-A/SYN-B player/game examples; test-only construction helpers |
| `tests/weeklyRoleStateV1.test.ts` | Positive/negative synthetic contract tests |
| `docs/contracts/player-team-allocation-handoff-v1.md` | Exact proposed Slice 2 Data interface and remaining ownership decisions |

Public validators:

```ts
validateAllocationHandoffV1(input: unknown): ValidationResult
validateWeeklyRoleStateV1(input: unknown, {
  handoff: unknown,
  prior?: { state: unknown, handoff: unknown },
  suppliedArtifacts?: ArtifactNode[]
}): ValidationResult
```

Both return `{ valid, errors }`, without coercion, defaults, I/O or mutation.
`ArtifactNode` is the typed exact reference plus its locally declared dependency
references from the digest profile. The optional `suppliedArtifacts` list lets a
caller provide a Teamstate attachment or other exact artifact's known edges; an
attachment reference by itself does not assert that its upstream bytes were supplied.
The validator joins current state, Data handoff, pinned prior state/handoff when
comparison is present, and these supplied nodes into one known revision graph.
Conflicting SHA-256, type/profile or generation for the same artifact ID/revision,
cross-object cycles, self-references and future dependencies fail. A shared dependency
may occur on more than one acyclic path. Unsupplied referenced revisions are retained
as declared leaves for **local consistency only**; this does not authenticate their
bytes or claim their full external dependency graph is complete. Upstream byte/source
verification and external dependency resolution remain future integration gates.
`weeklyRoleStateV1JsonSchema` and `playerTeamAllocationHandoffV1JsonSchema` are
standard structural JSON Schemas. JSON Schema alone cannot establish joins,
population reconciliation, claim rules, exact revisions or comparability: the
runtime validator is also required. The internal `stateSchema`/`handoffSchema`
descriptors are not JSON Schema; consumers should use the explicitly named JSON
Schema exports. All schema objects and the field list are frozen recursively.

## State envelope and grain

All properties in the types/schema are required; optional concepts use explicit
nulls or empty arrays. Unknown properties fail, including nested fantasy inputs.

| Property | Semantics |
|---|---|
| `contractVersion` | Literal `weekly_role_state_v1` |
| `artifact` | Logical artifact ID, immutable revision ID, lowercase SHA-256 |
| `supersedes` | Null or previous revision of the same logical artifact; new revision/hash required |
| `input` | Exact Data handoff artifact ID/revision/hash, not a current/latest pointer |
| `scope` | Season, PRE/REG/POST, week; must exactly match input |
| `generatedAt` | UTC artifact-generation clock, at or after input generation |
| `evidenceCutoff` | Copied nullable football/source cutoff; retrieval never supplies a missing cutoff |
| `subject` | Source player namespace/ID, resolution status and evidence references |
| `presence` | Observed row(s) versus absent from this input, not active roster or game participation |
| `segments` | One retained player/game/source-team segment per matching source row |
| `readiness` | Inspectable dimensions below; not player confidence/quality |
| `missingEvidence` | Explicit gaps, including validator-required core gaps |
| `comparison` | Null or pinned, bounded prior-week comparison |
| `teamstate` | Empty array or exact game/team attachments; never a readiness prerequisite |
| `scoringArea` | Literal `{ status: 'reserved_data_derivation' }` |
| `advanced` | Literal `{ status: 'not_supplied' }` |
| `consumerActivation` | Literal `none`; cannot be enabled through this contract |

Every artifact reference now includes `artifactType`, `digestProfile` and the retained
artifact's `generatedAt`, in addition to ID/revision/SHA-256. The explicit type/profile
mapping, strict JSON decoder, JCS canonicalizer, dependency-graph requirements and
root-only projection are specified in [artifact-digest-v1.md](artifact-digest-v1.md).
The pure injected-byte digest utility is part of this repair. It does not fetch,
admit, promote or evaluate evidence. Source/transport pins remain raw-byte digests;
new contract content digests use `tiber-jcs-root-sha256-v1`. Synthetic hashes remain
placeholders unless a digest conformance test explicitly computes them.

Each segment retains row ID, game ID, source-observed team/opponent/position,
all four observed counts, its position branch and zero or more claims. There is
no single current-team field that can overwrite historical team-at-event identity.
Multiple games/teams/positions may be represented as separate segments. No weekly
sum or cross-team denominator is invented. Duplicate source player/game keys and
omitted/duplicated matching segments are rejected. Source-native resolution does
not imply canonical/Sleeper/Team identity admission.

An absent subject has no segments, `observations: absent`, `population: absent`
and the `player_not_observed` gap. An unresolved subject uses a null player ID,
`unresolved_identity` gap and, if observed, at most one source-row segment: unknown
actors cannot be merged into a fictional player. Claims for it are insufficient.
Unknown-position source rows remain in the Data population; they cannot themselves
be emitted as one of the four supported position branches without a Data resolution.

## Counts, shares and residuals

`Count = { value, status, reason, evidence }`.

| Status | Value | Reason | Meaning |
|---|---|---|---|
| observed | Nonnegative safe integer, including 0 | null | Qualified recorded count (fixture evidence allowed only in synthetic mode) |
| missing | null | Required | Not available; no zero substitution |
| conflicted | null | Required | Conflicting source observations retained as evidence, not an elected value |

The four ordinary fields are `carries`, `targets`, `receptions`, `passAttempts`.
Non-QB passing work and unusual QB receiving work remain recorded counts; they
do not force unrelated position claims. At player, team and quantified residual levels, observed receptions cannot exceed corresponding observed credited targets. Missing/conflicted values remain null; validation does not mutate them.
Pass attempts are not credited team targets, and neither is dropbacks. Stat carries
are not designed rushes. No sacks/kneels/scrambles are reclassified in ROP.

Shares carry exact `numerator`, `denominator`, fractional `value` (0–1), status,
reason, a literal formula ID and operand/population evidence. No rounding occurs;
validation allows absolute floating-point error at most 1e-12. No weighted universal
opportunity-share formula exists. No carries-plus-targets field is produced here.

| Branch | Shares |
|---|---|
| RB | Carries / all-team carries; targets / credited team targets; carries / qualified RB carries |
| WR | Carries / all-team carries; targets / credited team targets |
| TE | Carries / all-team carries; targets / credited team targets |
| QB | Carries / all-team carries; attempts / all-team attempts |

Status precedence is `ineligible` (population prerequisites fail), `missing`
(operand null), `zero_denominator` (eligible denominator 0), then `available`.
Only available shares have a numeric value and null reason. Other shares preserve
known operands, have a null value and require a reason. An ineligible RB room has
a null denominator; a known-position subtotal is not advertised as the room total.

The injected Data input preserves every position and unresolved identity row,
plus separately quantified unallocated work. For each field, reconciliation checks
`sum(all retained row counts) + unallocated = team total`. Complete population
requires all four fields reconciled and all unallocated counts observed zero.
Explicit incomplete/conflicted populations remain valid evidence; they do not
silently become complete. All-team shares require that field's reconciliation.
Incomplete population can therefore retain a valid reconciled all-team share.

Qualified RB room is deliberately stricter: complete population, reconciled carries,
zero unallocated carries, resolved identities, known source positions and non-null
carry counts for every retained row. Exact `RB` tokens are included; `FB` is excluded.
Recognized non-RB tokens are listed in `knownPositions` in the validator; null,
`UNK`, unfamiliar tokens or aliases such as `HB` block room qualification. No alias
normalization is performed. This conservative whole-population rule can withhold
room claims even when the unknown row has zero work or an unrelated field is missing.
It does not block the basic observed counts or receiving/rushing-work claims.

### Membership versus recorded-carry attribution (policy unchanged)

`membership_complete` and `recorded_carry_attribution_complete` are different evidence
claims. They are explanatory concepts, not newly emitted readiness booleans. A retained
row with unknown position and **observed zero carries** may leave membership unresolved
while contributing zero to the recorded RB-carry denominator under every position
resolution. Missing/conflicted carries are not observed zero. Numerical box-score
reconciliation is not a census of roster membership or zero-stat participants.

| Proposed assertion | Fundamental evidence requirement |
|---|---|
| Complete RB-room membership (not emitted) | Defined membership universe and complete identity/position resolution |
| Led qualified RB room in carries | Complete relevant recorded-carry attribution, subject identity, unique positive maximum |
| Majority of qualified RB-room carries | Complete relevant recorded-carry attribution, exact numerator/denominator, strictly >0.5 |
| Recorded rushing/receiving work or receiving involvement | Qualified subject-level recorded counts and identity |
| Recorded QB passing/rushing work | Qualified subject-level QB counts and identity |

None of the proposed atomic work/leadership/majority assertions fundamentally requires
a general complete-membership label. **For this repair the existing stronger whole-population
qualification rule is retained unchanged**, so zero-carry unknown-position rows still
produce ineligible room shares and insufficient room claims. A narrower attribution-based
policy is a future separately reviewed choice; no eligibility is loosened here.

## Atomic rule registry, version 1

Claims are optional; omitted claims make no assertion. Each supplied claim includes
`id`, `ruleVersion`, `status`, `support`, `counterevidence` and `gaps`. Support and
counterevidence are evidence IDs, not natural-language verdicts or scores.

| Rule ID | Positions | Supported iff |
|---|---|---|
| recorded_rushing_work | RB, WR, TE | Recorded carries > 0 |
| recorded_receiving_opportunity | RB, WR, TE | Recorded targets > 0 |
| observed_receiving_involvement | RB, WR, TE | Recorded targets > 0; synonymous broad observation, not deployment |
| led_qualified_rb_room_carries | RB | Qualified room; player's carries > 0 and unique maximum |
| majority_qualified_rb_room_carries | RB | Qualified room; positive room total; player's share strictly > 0.5 |
| recorded_qb_passing_work | QB | Recorded pass attempts > 0 |
| recorded_qb_rushing_work | QB | Recorded carries > 0 |

Known zero / false predicates produce `not_supported` with counterevidence. Missing
required measurements, unresolved subject identity or unqualified room produces
`insufficient` with gaps. Tied positive maxima do not support sole leadership;
exactly half is not a majority. Zero room carries support neither claim. All room
claims require complete population/identity/position evidence, not just the subject.
Supported claims cannot contain unresolved counterevidence/gaps. Insufficient claims
may retain partial support, but cannot turn it into a supported conclusion.

These are scoped mathematical statements, including in a pending/synthetic inspection
object. They do not imply purpose admission or durable role. No bellcow, committee,
X/slot receiver, passing-down back, goal-line back, starter, designed-rushing QB,
future-volume or predicted-point claim is in the registry. Higher-level rules would
need separate review and versioned schema/semantic changes.

## Evidence and readiness

Evidence registry entries live in the pinned Data input, so ROP does not clone a
parallel provenance catalog. Every reference must resolve there. Each entry carries
kind, artifact/revision/hash, row/field locator, definition, parent references and
separate observed/published/retrieved/generated clocks. All clocks are UTC ISO strings;
unknown source clocks remain null. A retrieval clock never establishes a football cutoff.

Source and (synthetic-only) fixture evidence can support observations. Derived evidence
must have an acyclic, eligible parent chain. Proxy/reported evidence can be retained
in the registry but cannot support recorded counts, identity, shares or these claim
rules. Unreferenced optional reports do not block the ordinary core. No true-route,
snap or first-read substitution exists. Future enrichment needs a separately reviewed
typed extension and must preserve the meaning of existing counts and claims.

Readiness is recomputed from input/state consistency: identity resolved/unresolved;
observations available/partial/absent; population complete/incomplete/absent; schedule
coverage; source finality; correction state; exact ROP-purpose pending/accepted; and
fixture/source-backed/unavailable evidence basis. This follows the leaves supporting
observed **subject work**, not lifecycle mode, unused catalog entries, purpose receipts,
identity-only references or Teamstate. No observed work lineage means `unavailable`;
any fixture leaf means `fixture` (including mixed source/fixture ancestry); only
source leaves mean `source_backed`. A structurally valid empty candidate and absent
unresolved state need no fabricated evidence. `source_backed` describes supplied lineage,
not independently verified authenticity. Finality and correction are preserved, never
inferred from game occurrence or retrieval time. No composite confidence is emitted.

Purpose acceptance can only be copied when the handoff declares the exact ROP purpose
with evidence. Synthetic packets cannot be accepted. A TTS-only acceptance does not
admit ROP. The validator checks receipt references/consistency, not the authority or
content of receipt bytes. Slice 2 must verify those bytes, scope and identity. This
module cannot itself grant acceptance, promote anything or activate a consumer.

### Exact dependency chronology

Artifact references carry retained-artifact generation clocks, distinct from football
event time, provider publication/update, retrieval and the nullable evidence cutoff.
Every known exact dependency must be generated at or before its dependent; equality
is permitted. UTC fractional seconds are compared without millisecond truncation.
Reference generation and the corresponding supplied artifact header must agree.

This applies to handoff/evidence artifacts, distinct derived-artifact parent edges,
evidence-record parent edges, superseded revisions, state/input, Teamstate/input,
state/Teamstate and state/prior-state/prior-input comparison edges. Later corrected
prior evidence cannot be inserted into an earlier comparison artifact. Unknown event
cutoffs remain null; generation ordering never manufactures one. Complete external
artifact-byte/receipt verification is still a separate future binding responsibility.

## Comparison and revisions

The optional comparison pins both prior state and prior Data artifact revisions.
The caller must supply both prior objects. Prior snapshots must be standalone
(`comparison: null`); unbounded chains are intentionally rejected. Corrections keep
the logical artifact identity and require a different revision and hash. Updated
prior inputs/states invalidate old comparison pins; no current pointer is followed.

Comparability requires the same resolved source identity, adjacent weeks within the
same season/type, observed presence, one segment in each week, distinct game IDs,
same source team/position, identical metric definitions, same evidence basis and
purpose status, complete coverage/population and available counts. Both provisional
weeks may be compared descriptively; this does not establish finality or durable role.

Non-comparable objects enumerate exact reason codes computed by the validator and
carry no deltas. Team/position changes are non-comparable under this initial policy;
the original counts remain visible in both states. No previous absence becomes zero.
Multi-game weeks remain valid states but are not automatically aggregated for comparison.
Field-by-field comparison of partly missing weeks is deferred; current policy is
deliberately conservative. RB-room share deltas are deferred because membership and
qualification need a separate change policy.

Comparable deltas are optional explicit entries for the four counts and applicable
all-team shares. Each contains prior/current values, unit and exact subtraction.
Count delta is current minus previous; share delta is 100 × fractional difference
in percentage points. Wrong-branch share deltas, duplicated fields and invented
values fail. No causal, predictive, stability or breakout interpretation is emitted.

## Optional Teamstate reference

An attachment is a pinned reference, not a copied Teamstate calculation. It must
match the state/input revision, season/type/week, a segment's game/team and cutoff;
it has its own generation clock, row locator, purpose and finality. It cannot predate
its exact input or postdate the Role State; its reference and attachment clocks agree. Missing context is `[]`, always valid. A mismatched supplied
attachment is an error; callers may omit it after recording their own inspection
result rather than silently attach unrelated context. Actual Teamstate receipt bytes,
payload and authority are not authenticated here and require the later attachment
slice. Attachments do not raise ROP readiness.

## Reserved fields and legacy compatibility

Scoring-area fields reserve future Data-owned event derivation only. No yard-line,
goal-line, penalty or no-play policy is adopted here. Advanced deployment is also
reserved rather than populated by the old scorer. Both reservations are non-blocking.

All legacy files are byte-for-byte unchanged: scorer, routes, `roleOpportunityRecord`,
from-data adapter/client, V0 profile export, lab exports, fixtures, package scripts and
OpenAPI. The new module is not imported by legacy entry points. Existing seeded
fictional outputs remain legacy demonstrations. No adapter converts their scores,
confidence or role labels into WeeklyRoleStateV1, and no fallback invokes them.

## Review boundary

This slice validates contracts and synthetic examples only. Recommended next
gate is fresh independent exact-packet re-review of the bounded F1–F5 repair. No Slice 2
work is authorized by this repair. Any subsequent handoff/adapter work requires a new
operator decision and any Data-side production remains separately authorized. No real-player build,
acquisition, Data/TTS modification, source acceptance, promotion or consumer wiring
follows from approving this contract.
