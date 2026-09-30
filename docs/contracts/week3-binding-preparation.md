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

## Focused checks

- Before changes: `node --experimental-strip-types --test tests/*.test.ts` — 212/212 pass.
- After changes: same command — 225/225 pass, all synthetic.
- Strict TypeScript check of changed adapter and added tests passes using installed TypeScript/Node types; no dependency installed. The baseline adapter also passes.
- Existing Week 1/2 binding bytes and all original tests remain unchanged. New checks cover synthetic scope, lossless companion, pending purpose, null/unresolved population, Data share operands, admission rejection, altered/missing bytes, wrong-week substitution and missing generation witness.

These are implementer checks, not independent review or real-output acceptance. No full application suite or real Week 1/2/3 producer was run.

## Next boundary

Recover the exact missing generation/support/review witnesses, complete a separately reviewed real Week 3 retained binding, and return a purpose-specific provisional-use decision plus explicit bounded execution scope. The continuity cohort and Research #24 supplement remain separate; no additional subjects or older baseline runs are implied. No output, comparison, source admission, Forecast use, consumer activation, scheduler or public football report follows from this PR.
