# Week 3 binding preparation — blocked before real-input qualification

**Status: partial implementation preparation; no source or purpose accepted.**
Joe's September 30 live authorization covers reconciliation, minimum isolated binding/test changes and independent exact-head review. It explicitly excludes merge, source admission, real-player runs, additional cohort expansion, Forecast and scheduled-report activation. This document is agent-materialized; it is not an execution or merge receipt.

## Reconciled existing work

The base is `eab07cbfc17a841804991194ac162609224bf744`, including the reviewed Week 1/2 retained interfaces. The only open ROP PR found before this preparation was the unrelated README link PR #25; it remains untouched. Focused source/tests were restored from the retained Slice 1/2/3 and Week 2 interface packets; the changed adapter's original Git blob `04e5117c4ba2c3d6cd910229fb41bd4dcd151b0f` matches this base. This was not a full fresh repository clone.

A separate September 29 exploratory Week 3 packet exists: support `093c94af881eef92c1b3648dd0a7462ab156bb2f`, candidate `476f2a4c450a7f4ab62d558dd6a1e6e204f25b718470ba5cfe4530d0f274866e`. It is not the selected #277 candidate, not a reviewed ROP output, and not a substitute generation witness. Its replays do not replace frozen W1/W2 baselines.

## Selected Data identity and review qualification

The non-executable companion `week3-binding-preparation.json` records the exact #277 head, support and candidate. The canonical head has ancestry `eac3b9bc... -> ffd9e829... -> 2b58e2c... -> e1e92078...`, verified through GitHub Git-commit records. The two earlier P1s concern different tested commit objects. Reconciliation is recorded at Data #277 comment `5913251206`; the resulting independent review comment `5913333560` reports no major issues at `eac3b9bc22`. It supplies no detailed replay receipt. The original findings remain intact. Any later authorized merge must preserve ancestry with a normal merge commit, not squash/rebase. No merge is authorized here.

## Actual code change

Only the existing fixture seam gains an explicit `SyntheticAllocationScope` for Week 3. The original allocation, receipt, chronology, denominator and companion logic is reused. Thirteen added synthetic tests use fictional AAA/BBB rows; they never inspect a real player. The source entry `adaptReviewedAllocation` and its closed `ReviewedAllocationScope` remain Weeks 1/2 only and continue rejecting Week 3. There is no runtime route, real Week 3 adapter, new source pin override, caller acceptance flag or Role State invocation.

The JSON plan is documentation, not an `OfflineBinding`. Null generation and review fields are intentional blockers, not defaults to fill with plausible values. It is never imported by production code.

## Why complete qualification stopped

The selected candidate's original generation witness was not established in the inspected #277 audit/handoff records. Its retrieval and compilation timestamps describe sources. Git commit time describes publication. Neither is a `candidateGeneratedAt` witness. The existing artifact-reference contract requires a valid generation clock; this change does not weaken it. A separately retained, exact generation record may exist in the original executor and should be recovered before any new producer task is proposed.

The full exact retained input manifest/member authentication and adapter-consumable review receipt also remain to be bound. No #277 raw candidate was supplied to this adapter or authenticated here. A missing witness must not be replaced with September 29's different candidate or a newly invented original build time. Any later replay, replacement witness semantics, or contract adjustment must be explicitly proposed and reviewed, not silently performed by this preparation.

## Focused checks and exact coverage correction

The implementer worked in a restored partial snapshot, not a complete checkout. Local results were **212/212 before** and **225/225 after**, including the 13 new Week 3 tests. Those counts apply ONLY to the explicit restored files below, not the repository-wide `tests/*.test.ts` selection.

Reproducible restricted command (run from the repository root):

```sh
node --experimental-strip-types --test tests/artifactDigestV1.test.ts tests/weeklyAllocationFromDataV1.test.ts tests/weeklyAllocationWeek2.test.ts tests/weeklyRoleStateBuilderV1.test.ts tests/weeklyRoleStateV1.test.ts tests/weeklyRoleStateV1AggregateGraph.test.ts tests/weeklyRoleStateV1Repairs.test.ts
```

That seven-file subset passed 212 tests locally before this change. Add `tests/weeklyAllocationWeek3Preparation.test.ts` to that explicit command for the eight-file subset; it passed 225 tests locally after this change. Both explicit-file commands were rerun and passed after the review finding. No test file is removed or excluded from the repository by this coverage description.

**Independent review P2 `4145971912`:** at canonical first head `26e1f9f96dced04ec43ac46f42c5bd350872348b`, the reviewer reports that the complete `tests/*.test.ts` selection passes **256 tests**, and the same checkout without the new Week 3 test file passes **243**. These are reviewer-reported complete-checkout results, not implementer runs or a claim that the exact parent tree was separately executed. The original document incorrectly presented the partial-snapshot counts as the unqualified glob command outcome. This documentation-only repair separates the two scopes; no code or tests changed.

Strict TypeScript checks of the changed adapter and added test file pass using the implementer's installed TypeScript/Node types; no dependency was installed. The baseline adapter also passed. Existing Week 1/2 binding bytes and all original tests remain unchanged. New checks cover synthetic scope, lossless companion, pending purpose, null/unresolved population, Data share operands, admission rejection, altered/missing bytes, wrong-week substitution and missing generation witness.

No real Week 1/2/3 producer was run. The implementer did not run a full application suite. All reported tests are synthetic; code review and test success are not source or real-output acceptance. Fresh exact-head review is requested for this documentation repair.

## Next boundary

Recover the exact missing generation/support/review witnesses, complete a separately reviewed real Week 3 retained binding, and return a purpose-specific provisional-use decision plus explicit bounded execution scope. The continuity cohort and Research #24 supplement remain separate; no additional subjects or older baseline runs are implied. No output, comparison, source admission, Forecast use, consumer activation, scheduler or public football report follows from this PR.
