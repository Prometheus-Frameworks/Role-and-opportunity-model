# Slice 2 — retained Data allocation bridge

Status: proposed, offline interface qualification only. Base: `145d063d6bc42f7d9746a0ddd09a54c01f9f073b` (merged Slice 1). No changes to Slice 1, its schemas, the legacy scorer, routes, OpenAPI, from-data adapter, lab exports or consumers.

## Scope and ownership

`adaptRetainedWeek1(injectedBytes, outputIdentity)` accepts the exact previously retained 2026 REG Week 1 Data candidate and its 18 pinned support files. It returns a `PlayerTeamAllocationHandoffV1` candidate **plus a mandatory lossless companion**. It does not emit or evaluate a `WeeklyRoleStateV1`. It performs no filesystem/network access, provider calls, source admission, scoring, role interpretation, consumer activation or publication. `adaptSyntheticAllocation` is a separate fixture-only seam: custom bindings can only yield synthetic/fixture lineage. The real binding is deeply frozen at runtime.

Data owns observations, source population, native identity, team denominators, reconciliation and its supplied shares. This adapter verifies those declarations against retained bytes and translates representations. It does not run Data builders or regenerate a competing candidate. ROP owns only the representation bridge at this stage. TTS remains unchanged. A Data-owned shared producer is still a proposed interface, not an admitted producer.

The bridge follows the successfully exercised TTS `week1Projector.ts` boundary: retain `sourceEnvelope`, map the complete source allocation population, and copy Data's `dataDerived` values. TTS accounting/scoring logic is neither imported nor executed. Its prior output review supported numerical/population correctness but required Markdown disclosure repairs; this proposal does not claim that review admitted Data or ROP use.

## Exact inputs and authentication

The fixed source-support commit is `e890f825bc5863d16c7afedfbd376c806cfed448`. The raw candidate is:

`exports/candidates/weekly_boxscore/revisions/2026_REG_w01/e59ff910a70414be333a5145adb9e451d007ea0c5b07c66fd9d87182ce7844d5.json`

Its raw SHA-256 is `e59ff910a70414be333a5145adb9e451d007ea0c5b07c66fd9d87182ce7844d5` (1,343,499 bytes). The exact 18 paths, sizes and SHA-256 values are in `src/adapters/retainedWeek1Binding.ts`, copied from the reviewed TTS binding. They include player/team/schedule CSVs, receipts, licenses, producer and intake scripts, candidate, index and audit records. All 18 must match before parsing. Extra injected map entries are ignored, never read or treated as evidence.

Verification copies each supplied byte array before hashing and parsing, then checks:

- Raw length/hash pins; strict UTF-8 JSON with duplicate-key and invalid-Unicode rejection through unchanged Slice 1 parsing.
- Embedded versus retained receipts, receipt-to-CSV hashes/sizes, license hashes, producer script hashes and support-commit declarations.
- Every in-scope raw CSV logical row represented exactly once, before any position or player selection; every candidate observation (all 25 Data fields) agrees with its raw source cell. Vendor fantasy columns in transport CSVs are never mapped, read as numeric inputs or used in calculations.
- Source-native identity/team/opponent/position agreement; schedule game/team membership; complete source-row counts, position counts and out-of-scope counts.
- All supplied Data reconciliation tuples and exact carry/target share operands, value, status and reason. Validation arithmetic rejects disagreement; output copies Data's values rather than replacing them.
- Valid Slice 1 handoff and unchanged content digest semantics.

This authenticates **bytes against the already-reviewed retained pins** and their local dependency links. It is stronger than declaration-only graph consistency, but does not establish cryptographic provider authorship, independent football correctness, source admission, historical availability or external live-state freshness. The raw source endpoint is never contacted. Index/audit historical references are retained records, not a claim of recursive authentication of every artifact they mention. For a future different candidate, integration must independently qualify and authenticate its bytes/dependencies; this entry point cannot silently accept new pins or refresh.

The handoff uses `tiber-jcs-root-sha256-v1`; its source reference uses explicit `evidence_file` / `raw-bytes-sha256-v1`. Source bytes are never relabeled JCS. Its declared graph binds handoff → exact candidate; specialized byte verification authenticates the candidate's retained dependency bundle before output. No digest code/profile was changed. The companion uses a separate raw-byte SHA-256/size pin and embeds the exact handoff reference; the handoff does not hash the companion, so no circular hash exists. Persist the returned companion bytes and pin together; reserialization requires a new raw-byte pin.

## Data → ROP field mapping

`c` below means `sourceEnvelope.candidate`. Companion `sourceEnvelope` preserves the complete parsed candidate, including every limitation, unavailable field, validation report, source clock, numerator, denominator and source value. Raw transport identity remains in `sourceNativeRows`, and the raw candidate itself remains byte-pinned.

| Data location | Handoff / companion destination | Ownership and meaning |
|---|---|---|
| `c.scope.season/season_type/week` | `scope.season/seasonType/week` | Fixed 2026/REG/1, no Week 2 path |
| Schedule CSV `game_id/home_team/away_team` | `games`, `expectedGameIds` | Exact retained schedule; no current-team lookup |
| Outer `coverage` and `c.coverage` | `coverage` plus both original objects in companion | `complete` means all scheduled games/two team rows represented; **not** certified football finality or active-roster completeness |
| Every `c.players[]` and `c.unattributed_source_observations[]` | Every `teams[].rows[]` | No position filter; unknown IDs remain rows, never invented players |
| `source_csv_row` | `rowId = player.csv:<logical-row>`, companion `sourceCsvRow` | Source-revision-local locator; not stable player identity across revisions |
| Raw `player_id` and resolved candidate `identity.player_id` | `identity.namespace=nflverse:gsis`, `playerId`, `status` | Valid source GSIS format is source-native resolution only; no canonical crosswalk admission |
| Unattributed `raw_player_id` | `playerId=null`, `status=unresolved`; original string in companion | Never name-join, silently resolve or drop |
| `identity.game_id/team/opponent_team` | `gameId/team/opponent` | Game-time/source-observed affiliation; no current roster rewrite |
| Raw CSV `position`, identified candidate `identity.position` | `position`, `positionEvidence`; exact native token in companion | Blank→null; `SAF` stays `SAF`; no aliasing. Raw position of unattributed rows preserved if present |
| Raw season/week/identity/name strings | Companion `sourceNativeRows[].identity` | Keeps string forms even where normalized scope is numeric |
| `observed.carries` | `counts.carries` / team `totals.carries` | Data credited carries, all positions including QB |
| `observed.targets` | `counts.targets` / `totals.targets` | Credited targets; distinct from pass attempts |
| `observed.receptions` | `counts.receptions` / `totals.receptions` | Observed receptions cannot exceed observed targets |
| `observed.attempts` | `counts.passAttempts` / `totals.passAttempts` | Attempts, not dropbacks, starts or designed passes |
| Numeric zero / null observations | `observed/0` versus `missing/null` | No missing-to-zero conversion or absent-player synthesis |
| `teams[].reconciliation[field]` | `population.reconciliation[field]` and original tuple in companion | `matched→reconciled`; `unknown→incomplete`; `conflict→conflicted` |
| Matched reconciliation with all source rows retained | `population.unallocated[field]=observed/0` | Representation of Data's reconciled zero residual; explicit derived evidence links team and row observations |
| Unknown or conflicting reconciliation | Unallocated `null`, status `missing` or `conflicted` | No invented numeric difference allocation; original conflicting totals/subtotals remain in companion |
| All four core fields matched | `population.status=complete` | Source-row/core-count reconciliation only; not complete RB membership or a participation census |
| `derived.carry_share_all_team_carries` | Companion `sourceNativeRows[].dataDerived` unchanged | Data's numerator/denominator/value/status/reason; **all-team**, not RB-room denominator |
| `derived.target_share_credited_team_targets` | Same unchanged companion object | Data's credited-target denominator, not attempts |
| `derived.carries_plus_targets` | Same unchanged companion object | Unweighted sum owned by Data; no universal opportunity share |
| Other 21 observed fields, their reconciliation and conflicts | Complete companion source envelope | Retained for losslessness, not imported into role claims or a score |
| `limitations`, `unavailable`, `validation` | Complete companion source envelope | Preserves 22 receiving-air-yard conflicts in this retained candidate |
| Raw candidate digest + JSON pointer | `evidence[].artifact/locator` | Row/team source lineage; residual normalization is explicitly `derived` with parents |
| Producer execution completion record | Source artifact/evidence `generatedAt` | `2026-09-16T19:22:16.255941Z`, documented below |
| Source release/retrieval clocks | Evidence `sourcePublishedAt/retrievedAt`; exact originals retained | UTC normalization preserves fractional precision; never refreshes football evidence |
| No event availability/cutoff witness | `sourceObservedAt=null`, `evidenceCutoff=null` | No fabricated football cutoff |
| Unknown finality, provisional correction limitations | `finality=unknown`, `correction=open` | Does not mark values final/settled |
| Unadmitted candidate / no ROP purpose receipt | `mode=candidate`, purpose pending/empty | Candidate lifecycle and byte verification do not accept a downstream purpose |

## Time, revisions and limitations

`c.snapshot_compiled_at=2026-09-16T16:54:12.716238+00:00` is the player/team snapshot compilation clock. It predates schedule retrieval completion and is **not** the outer publication artifact's generation clock. The pinned `docs/audits/weekly-boxscore-candidate-2026-09-16.md` records publisher completion at `2026-09-16T19:22:16.255941+00:00`; the binding uses that recorded completion as the retained artifact generation clock. This explicit documentary provenance is needed because the publication envelope lacks a dedicated generation field. Retrieval cannot rejuvenate the evidence. Output generation must be at or after that dependency, including sub-millisecond precision.

This is one fixed initial qualification candidate (`supersedes=null`), not a correction ingestion pipeline. Callers choose output artifact ID/revision/generation. Persistence uniqueness, later corrected snapshots, supersession authentication and revision comparison require separate integration review. No historical or current role is inferred here.

## Unresolved contract mismatches and conservative decisions

1. Slice 1 has no slots for supplied Data shares or the whole source envelope. Returning a handoff alone would lose semantics. The mandatory companion is the bounded bridge; a future shared interface review must decide whether/how Data-derived metrics and their provenance become a formal shared extension. Do not let a later builder ignore these Data-owned values and silently adopt competing denominators.
2. `population.complete` is source-row/core reconciliation, not active-roster membership. An unattributed zero row and unknown source positions stay present. `membership_complete` differs from `recorded_carry_attribution_complete`; this slice changes neither policy nor eligibility. Slice 1's conservative RB-room rule remains intact, including refusal to normalize `SAF` into its known-position vocabulary.
3. Native `nflverse:gsis` is not an admitted cross-provider identity. Missing players are absent, not zero usage. Names are diagnostic only.
4. No certified finality, atomic player/team upstream snapshot, pre-cutoff availability witness or settled correction history exists. Schedule completeness remains separate.
5. The 22 air-yard conflicts are preserved, not fixed or silently accepted for role use. No routes, snaps, first reads, alignment, scoring-area derivation or narrow role interpretation is introduced.
6. The companion is an adapter review format, not an admitted TTS/Data contract. Its mandatory use and the output pair's retained-byte verification must be resolved before a production consumer. The existing TTS interface is reconciled read-only; it is not migrated.

## Review and compatibility

Only additive adapter, fixed binding, synthetic fixtures/tests and this document are proposed. No runtime route imports this module. Package scripts, Slice 1 schemas/types/validators/JCS vectors, legacy interfaces and external repositories remain unchanged. No admission/purpose acceptance, real-player Role State, scoring, future-volume output or consumer activation occurs. The synthetic suite tests zero/null, absent/unattributed rows, preserved unknown positions, all-team denominators, reconciliation conflict, Data share mismatches, identity/scope changes, pin tampering, exact chronology and fixture/source separation.

The next boundary is independent review of the sealed Slice 2 packet, including byte authentication, full-population preservation, mandatory companion semantics and the proposed shared interface gap. This document does not authorize real-player evaluation or Slice 3.
