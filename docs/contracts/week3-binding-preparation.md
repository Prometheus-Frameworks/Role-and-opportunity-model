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

October 3 blocker repair was performed in a **complete checkout of canonical head `345a368c56368024cf78fce7fed549c6ba0072a1`**. The prior partial-snapshot counts of 212/225 are historical local observations only and are not reproducible counts for the committed files. Both independent findings `4145971912` and `4146079084` remain preserved.

The seven-file command below passed **216/216**, and adding `tests/weeklyAllocationWeek3Preparation.test.ts` passed **229/229**. These are new implementer executions in the complete checkout, matching the second review's restricted-suite counts. No exact-parent test run is claimed.

```sh
node --experimental-strip-types --test tests/artifactDigestV1.test.ts tests/weeklyAllocationFromDataV1.test.ts tests/weeklyAllocationWeek2.test.ts tests/weeklyRoleStateBuilderV1.test.ts tests/weeklyRoleStateV1.test.ts tests/weeklyRoleStateV1AggregateGraph.test.ts tests/weeklyRoleStateV1Repairs.test.ts
```

The earlier reviewer reported complete-checkout glob totals of 243 without the new file and 256 with it. Those remain attributed historical reviewer results. The October 3 complete glob command `node --experimental-strip-types --test tests/*.test.ts` also passed **256/256** in this checkout. No tests or code were changed by this count correction.

All restricted-suite checks are synthetic. No real Week 1/2/3 adapter or Role State producer was invoked, and no source or purpose acceptance is inferred. The first preparation's TypeScript checks remain historical implementer results, not fresh October 3 compilation. Independent exact-head review of this documentation correction is required before treating the prior P2 as closed.

## Next boundary

Recover the exact missing generation/support/review witnesses, complete a separately reviewed real Week 3 retained binding, and return a purpose-specific provisional-use decision plus explicit bounded execution scope. The continuity cohort and Research #24 supplement remain separate; no additional subjects or older baseline runs are implied. No output, comparison, source admission, Forecast use, consumer activation, scheduler or public football report follows from this PR.

## October 6 bounded replay/receipt guard extension

Joe's live scope now includes the builder guard and focused builder regressions alongside
adapter preparation. The October 5 blocker in comment `5994622165` is addressed by
separating the original candidate from a fresh materialization. Original W1/W2 paths,
frozen retained bindings and representations remain unchanged.

The optional `OfflineBinding.replayWitness` names three distinct pinned records: the
build receipt, member manifest and independent review. Its base, selected Data head and
reviewed head are explicit identities. `candidateGeneratedAt` must be **null** in this
lane; the original clock remains unknown. Evidence identity becomes
`data-replay:<build-receipt-path>:<candidate-path>` with the candidate raw-byte digest
and the build receipt's completed clock. This identifies the newly materialized evidence
bytes rather than attributing a clock to their original publication. The separate build,
manifest and review remain raw-byte pinned in the mandatory companion; their original
records are not modified. Pending labels in the original build/manifest are historical;
the separately pinned clean review must bind the candidate and selected/reviewed heads.
The handoff cannot predate the review's completed replay.

The adapter authenticates all supplied input pins and the additional record bytes. The
builder reauthenticates those record strings against the companion's support pins and
cross-checks witness eligibility, manifest members, review identity and chronology before
accepting the evidence identity. It still relies on prior adapter qualification for raw
source rows; no external provider authentication is claimed. Complete population, source
row lineage, Data share objects, eligibility, handoff JCS digest and companion raw digest
checks remain in force. No shared contract or validator changed.

A future optional `purposeReceipt.path` prepares a **separate** raw-byte-pinned artifact,
`operator-receipt:<path>`. Its proposed external record has schema version
`rop_provisional_purpose_receipt_v1`, status `accepted`, exact handoff `scope`, exact
`evidence_artifact`, nonempty unique `purposes` restricted to the existing two contract
purposes, and `accepted_at`. It must declare `source_admission`, `execution_authorized`
and `consumer_activation` false. Its clock cannot predate replay/review completion.
This is an interface, not an operator signature or an authority-discovery mechanism;
the qualified caller must independently establish the receipt's operator authority.
**No such real receipt was created or applied in this change.** The adapter continues
to emit pending purpose, including when a prepared receipt is supplied. For a separately
accepted replay handoff, the builder requires exactly one receipt evidence leaf at `/`,
matching that artifact and clock, with no parents and exactly matching purpose values.
It cannot substitute for observation/population evidence. Synthetic mode cannot accept
purpose. The existing W1/W2 guard behavior is preserved.

Fresh implementer validation: the original exact tree's 256 synthetic tests passed;
the extended complete suite passes 284/284. Focused adapter/W1/W2/W3/builder selection
passes 145/145. A direct old/new preservation comparison found byte-identical W1/W2
handoffs, complete companion bytes/pins and all four positional branch state/binding
outputs using fictional fixtures. Retained W1/W2 binding files are untouched. No real
W1/W2/W3 adapter or producer was run. Strict no-emit TypeScript checking of the changed adapter, builder and focused test
passes with the existing compiler recovered from a prior scratch checkout; no dependency
was installed. The independent review's residual-population evidence exclusion finding
was repaired and covered across all four count fields before the final review.
A distinct-residual-ID regression also protects unchanged RB claim/share evidence selection.
Fresh independent exact-head review is still required; implementer checks do not supply it.

This change deliberately leaves `adaptReviewedAllocation` closed to real W3 input.
A concrete retained W3 binding, independently qualified purpose receipt and separately
authorized execution remain subsequent gates. There is no source admission, cohort
expansion, Forecast work, consumer activation, deployment or schedule. Keep PR #30 unmerged.
