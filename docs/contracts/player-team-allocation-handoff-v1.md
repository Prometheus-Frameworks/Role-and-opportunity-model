# Proposed shared PlayerTeamAllocationHandoffV1

Status: exact proposed interface for Slice 2 review, defined in ROP only. It is not
an existing TIBER-Data contract or an accepted real-player artifact. TTS and ROP
should later consume the same immutable Data-owned artifact and definitions.

The executable type is `PlayerTeamAllocationHandoffV1` in
`src/contracts/weeklyRoleStateV1.ts`; the structural JSON Schema export is
`playerTeamAllocationHandoffV1JsonSchema`. All fields below are required, with
explicit nulls/empty arrays where indicated. No fantasy-scoring payload is allowed.

## Exact envelope

| Field | Type / requirement |
|---|---|
| contractVersion | `player_team_allocation_handoff_v1` |
| artifact | `{artifactId, revision, artifactType, digestProfile, sha256, generatedAt}`; explicit profile/type and retained-artifact generation; SHA-256 is 64 lowercase hex |
| supersedes | Null or previous ref of same artifact ID, different revision/hash |
| mode | `synthetic` or `candidate`; neither means consumer-admitted |
| scope | `{season, seasonType: PRE/REG/POST, week}` |
| games | Array of `{gameId, homeTeam, awayTeam}` preserving Data/source identity |
| expectedGameIds | Explicit expected schedule IDs, unique; no inference from box-score rows |
| coverage | complete / partial / unknown; complete requires both team sides of every expected game |
| finality | unknown / provisional / final, copied from qualified source receipt |
| correction | unknown / open / settled, copied from correction receipt |
| evidenceCutoff | UTC source/football cutoff or null; never retrieval time by substitution |
| generatedAt | UTC projection artifact-generation clock |
| definitions | Exact versioned definition IDs for carries, targets, receptions, passAttempts |
| purpose | `{status: pending/accepted, purposes: [], evidence: []}` |
| evidence | Array of the evidence entries below |
| teams | Array of full team/game allocation populations below |

Accepted purposes are separately enumerated `rop_observed_role` and `tts_allocation`.
The versioned profile and type mapping are defined in [artifact-digest-v1.md](artifact-digest-v1.md).
New contract content uses root-self-hash projection followed by RFC 8785/JCS and SHA-256;
source/transport bytes use the separate raw-byte profile. Pure injected-byte hashing,
strict decoding and declared-graph checks are implemented in this repair. Source admission,
receipt authentication and external byte acquisition/adaptation are not.

Pending means empty purposes; accepted requires at least one purpose and evidence.
Synthetic cannot be accepted. Data's candidate/finality/correction state must survive
unchanged; accepting an inspection purpose does not finalize or promote the source.
No purpose is inferred from another repository's earlier receipt.

## Exact evidence record

`{id, kind, artifact, locator, definition, parents, sourceObservedAt,
sourcePublishedAt, retrievedAt, generatedAt}`.

Kind is source / derived / fixture / proxy / reported. Locator identifies the actual
retained source row and relevant fields or receipt section; definition identifies
the observed fact or derivation. Parents are evidence IDs; derived entries require
nonempty eligible acyclic lineage. Other kinds have no parents. Derived evidence and distinct derived artifacts cannot predate their exact parents; the enclosing handoff cannot predate any pinned artifact. See the digest specification for separate artifact-digest graph checks. All source clocks
may be null except generatedAt. The whole referenced artifact must be retained and
hash-verifiable; declaration of a hash is not verification of its bytes.

The packet needs evidence for schedule qualification, source identity/position,
all measured fields, population completeness, corrections/finality and acceptance.
Current validator proves structural/reference consistency, not that a locator contains
the claimed fact. Slice 2 byte/receipt validation must check this distinction.

## Exact team/game population

`{gameId, team, opponent, totals, rows, population}`.

`totals` contains the four Count objects: carries, targets, receptions, passAttempts.
Targets are **credited targets**, never pass attempts used as a convenient substitute.
Totals include all positions, including QB rushing and unusual non-skill work.

Each row is:

```ts
{
  rowId, gameId, team, opponent,
  identity: { namespace, playerId: string | null,
              status: 'resolved' | 'unresolved', evidence: string[] },
  position: string | null, positionEvidence: string[],
  counts: { carries, targets, receptions, passAttempts }
}
```

Each Count is `{value: number | null, status: observed/missing/conflicted,
reason: string | null, evidence: string[]}`. Observed values are nonnegative safe
integers and require evidence. Missing/conflicted values stay null with reasons.
Zero is an observed value, not a default. Preserve raw/source-observed team and
position; normalize only with a separately versioned Data identity mapping. Never
use current-roster team to rewrite game evidence. A source-native ID is not proof
of a downstream canonical crosswalk.

`population = {status: complete/incomplete, evidence: string[], unallocated: Counts,
reconciliation: {carries, targets, receptions, passAttempts}}`.
Each reconciliation entry is reconciled / incomplete / conflicted.

Retain **all** rows, not only RB/WR/TE/QB or players later requested by a UI. Unresolved
player and unknown-position rows stay in `rows`; their work is already included in
the sum and must not also be counted as unallocated. `unallocated` holds work outside
the retained rows; null means unquantified, observed zero means none. This distinguishes
identity residuals, position residuals and numerical residuals without double counting.

For reconciled fields:

`sum(retained rows[field]) + unallocated[field] = totals[field]`.

Complete population requires all four fields reconciled and unallocated observed zero. At player, team and residual levels, observed receptions must not exceed observed credited targets; missing/conflicted values are preserved, not coerced.
Duplicate row IDs, duplicate namespace/player/game keys, wrong game/team/opponent and
false reconciliation fail. Unresolved identities and unknown positions can coexist
with complete numerical reconciliation; qualified-room interpretation still blocks.

## Derivations and producer ownership

The handoff provides operands, definitions and evidence. It does not require ROP or
TTS to build competing football-source pipelines. Data remains responsible for the
qualified allocation population and any published derived metrics. ROP validates
asserted shares against those operands and interprets atomic claims. Existing Data
target/carry shares may be mapped only after exact definition/revision equivalence
is proven; this slice does not regenerate or replace them.

The proposed formulas are player carries / all-team carries; player targets /
credited team targets; QB attempts / all-team attempts; player carries / qualified
exact-RB-token room carries. Exact room membership policy is documented in the ROP
contract and requires joint Data/ROP review before Data publishes a room derivation.
FB is excluded, unknown tokens block; there is no automatic HB alias. Ineligible room
denominators remain null. No universal opportunity weighting is proposed.

No PBP/scoring-area fields are present. Future source-event derivations belong to
Data, with separate opportunity-credit, field-position, penalty/no-play, QB and
coverage definitions. No goal-line threshold is authorized or adopted here.
No route/snap/first-read/alignment/situational/protection field is required. Optional
future qualified enrichments need explicit typed extensions rather than silent proxies.

## Slice 2 proof obligations and review gate

1. Data and TTS owners review this proposed interface and agree one common allocation
   artifact, metric definition IDs, source identity rules and retention locations.
2. Map retained source bytes, schedules, rows and exact revisions to the proposal.
   Preserve source flags, source and artifact clocks, conflicts and all residuals.
   Reject unknown schemas/definitions rather than defaulting fields to zero.
3. Verify file digests and receipt content, including exact season/type/week/games,
   population, intended purpose and authority. A generic clean review or TTS-only
   acceptance cannot substitute for ROP player-level acceptance.
4. Build only the separately authorized offline boundary, with injected bytes and
   synthetic tests. No network/current-pointer fetch, football acquisition, real-player
   role builder or consumer path should be added as an adapter side effect.
5. Return exact mapping, tests and local diff for review. Data producer changes require
   their own authorization; do not implement a shadow producer inside ROP to fill gaps.

The audit's retained Week 1 evidence is a future mapping target, not an input exercised
in this slice. No Week 2 qualification, real player evaluation or source promotion is
established by these types or synthetic tests.
