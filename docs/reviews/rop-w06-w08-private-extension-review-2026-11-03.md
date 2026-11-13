# ROP 2026 W6–W8 — code-only independent review packet (not an admitted release)

**Prepared:** 2026-11-03, America/Toronto. **Purpose:** a bounded, public-safe review of a proposed private Data → ROP extension for Joe's 209-player descriptive role/opportunity cohort. **Status:** preparation only; **no new formal Role States, qualified source/purpose receipts, producer activation, or release approval**.

## Review target and important limitation

- Proposed patch: [rop-w06-w08-private-extension-proposed.patch](./rop-w06-w08-private-extension-proposed.patch). This is a **textual proposed patch, not an applied implementation** in this branch.
- It applies to the **authenticated, privately retained W1–5 successor**, not to the current GitHub `main` tree. The private successor contains `src/adapters/privateReleaseBindings.ts` and related runner files absent from GitHub `main`; applying the patch to `main` or PR #30 would be misleading.
- The exact private candidate/source/manifest bytes are **not on GitHub**. A GitHub-only reviewer may assess code logic, failure modes, scope and tests from this patch, but **must not claim independent source/input/output qualification**, exact-byte review, or that the patch was compiled against public `main`.
- Private release: frozen 2026 REG W1–5, 209 identities, 939 supported player-week States and 106 source gaps. Historical output reproduction: 962/962 byte-identical output files in an owner-side offline replay. Original release was not modified.
- Existing background: [Ops #95 Week 6 investigation](https://github.com/Prometheus-Frameworks/TIBER-Ops/issues/95#issuecomment-6314622503), [Ops #95 W1–5 closeout](https://github.com/Prometheus-Frameworks/TIBER-Ops/issues/95#issuecomment-6157262521), [ROP PR #30](https://github.com/Prometheus-Frameworks/Role-and-opportunity-model/pull/30), [ROP PR #32](https://github.com/Prometheus-Frameworks/Role-and-opportunity-model/pull/32). Those public branches are **not** interchangeable with the private successor.

## Owner-side preparation (not independent verification)

| Week | Source scope | Frozen cohort source matches | Explicit source gaps | Status |
| --- | --- | ---: | ---: | --- |
| 6 | Retrospectively derived from an Oct 27 W7-acquired season-to-date source snapshot; original acquisition scope preserved | 155 | 54 | Candidate/witness/manifest, **not reviewed or admitted** |
| 7 | Original Oct 27 candidate reproduced byte-identically | 150 | 59 | Candidate/witness/manifest, **not reviewed or admitted** |
| 8 | Nov 3 nflverse weekly player/team release metadata and remote SHA-256 checks matched | Not qualified | Not qualified | Remote asset bytes not transferred to private producer workspace; no local candidate |

For W6 and W7, owner-side checks found 14 games, 28 team-game rows and 112/112 reconciliations each across carries, credited targets, receptions and pass attempts. One unattributed player source row per week remains excluded from identity-resolved observations. These are **not formal ROP outputs**. Advanced receiving-air-yard conflicts are outside the currently supported core fields. No source finality or original pregame availability is claimed.

W8 remote asset metadata only (no private byte transfer): nflverse player asset `705134467`, SHA-256 `e0ec8ca727cfe709769796f28b75787abd81d8e198420c6edfbd4e2a043f3592`; team asset `705134650`, SHA-256 `1b9f8a689fcf8f6d86cfd84d513d119847be462006c0761f262f53be20549280`. New snapshots must be rechecked for drift.

## November 3 remediation candidate for a second independent review

The first independent code review examined head `504943cd2c605f8f0ac5a274e35ce7f912c3fba5` and returned two P2 findings. This revision addresses them in the **textual proposed patch only**; it does not populate the registry or apply code to GitHub `main`.

| Finding | Proposed remediation | Validation |
| --- | --- | --- |
| [Manifest inventory integrity](https://github.com/Prometheus-Frameworks/Role-and-opportunity-model/pull/33#discussion_r4455279231) | Compare the complete `manifest.inputs` inventory with consumed binding pins, including exact path, byte size and SHA-256. Require named dependencies, unique paths and distinct control records. | Omission of each of the eleven fixture inputs, substitution, duplicate/extra inventory entries, raw drift and newly pinned but uninventoried support all reject. Checks also run through the companion evidence-identity boundary. |
| [Populated positive-path coverage](https://github.com/Prometheus-Frameworks/Role-and-opportunity-model/pull/33#discussion_r4455279237) | Add `adaptSyntheticPrivateExtensionAllocation`, which runs the same `adapt` and qualification checks but always uses synthetic mode. Add fictional populated packets for W6-from-W7 and same-week W7/W8. Production selection still uses the frozen empty registry. | 88 extension tests include successful full adaptation, record mutations with refreshed pins, review identity, witness scope/eligibility, chronology, historical-authority conflicts and purpose-receipt rejection. |

The extension additionally rejects mixed historical witnesses before processing historical qualification. Its review cannot predate witness preparation, and its purpose receipt cannot predate the independent review. Those checks apply only to the new extension lineage; historical W1–5 authority is unchanged.

### Complete inventory contract

`manifest.inputs` is an unordered array of exact `{path, size, sha256}` records. It must equal **every binding pin except three separately authenticated control records**: the manifest itself, its independent review and its purpose receipt. The ten named adapter paths and the extension generation witness must all be pinned and included. Any additional support pin consumed by `adapt` must also be included. Duplicate records, extra fields, omissions, substitutions and extra unconsumed inventory entries reject.

The three control paths must be distinct from each other and all named input/witness paths. Their raw bytes are still checked against binding pins; the review separately binds the manifest SHA-256, and the purpose receipt binds the extension evidence identity and review chronology. Excluding those control records from `inputs` prevents self/review hash cycles. This is an explicit proposed schema contract, **not a claim that existing private preparation manifests already satisfy it**. No private manifest was regenerated or admitted here.

The synthetic fixture uses only fictional AAA/BBB teams, invented identities/counts, and inert publisher/builder strings. It neither executes those strings nor imports a private producer. Caller-supplied records cannot select a production binding, change synthetic mode, accept the handoff's pending purpose or activate a consumer. `reviewer_independent=true` remains a recorded assertion, not proof of reviewer provenance.

## Specific independent code-review questions

1. Does the new W6–W8 scope **fail closed**, without allowing an unreviewed private binding or reusing W1–W5 release reviews/purpose receipts?
2. Is the **W6-from-W7 retrospective acquisition** exception narrow enough? Does it preserve source acquisition scope, derivation clock, source identity and cutoff unknowns without pretending a W6-only source download?
3. Are witness/manifest/review fields, digests and chronology checked consistently? Can an attacker or accidental bad packet exploit a missing pin, mismatched scope or forged review identity? Note that `reviewer_independent=true` is a recorded claim, not independently attributable proof.
4. Do the populated synthetic tests reach the full adapter, witness, manifest, review and purpose-receipt paths? Can any malformed inventory or receipt bypass a gate? Does the synthetic-only seam preserve the closed production registry and fixture evidence mode?
5. Are there any **material blockers** before implementing an append-only W6–W8 runner and independent exact-input/output review? Keep source qualification, code review and consumer activation distinct.

## Test record and remaining gates

Original preparation record (superseded code candidate): 301 historical Node tests + 4 gate tests passed under Node 22.16 with experimental TypeScript stripping. That owner-side record is not validation of this revised patch.

Current owner-side validation used an isolated local copy of the retained W1–5 **code** snapshot. Private source/candidate inputs were not loaded, and no private producer, release runner or consumer was executed. These are local implementation checks, **not independent source/input/output qualification**.

| Check | Current result / limit |
| --- | --- |
| Unified patch application to the unmodified retained code snapshot | Pass, followed by byte comparison of all four patched files with the tested candidate. This is not an application to public `main`. |
| Node 24.22.1 extension suite | **88/88 pass**, including the original four boundary tests. |
| Selected historical + extension Node suite | **385/385 pass**: 297 historical tests plus 88 extension tests. |
| Guard-removal probes | Five deliberately disabled guards (inventory equality, witness scope, review disposition, exact review hash, purpose-after-review chronology) were each caught by the corresponding test; original candidate restored. |
| Strict TypeScript 5.8.3 for the changed adapter, empty registry, new fixture/tests and their transitive imports | Pass with `--noEmit --allowImportingTsExtensions --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --types node`. |
| Full-project strict TypeScript 5.8.3 | **Not clean:** ten diagnostics in unrelated adapter/server/service/validation/API-test code; output is byte-identical on the unmodified retained baseline and revised candidate. No new diagnostics introduced. No TS 5.9.2 qualification is claimed. |

Not run: the four tests in `tests/privateReleaseBatch.test.ts`, which import the private release runner and include a retained-input test requiring `ROP_PRIVATE_RELEASE_ROOT`. They are deliberately excluded to preserve this source-free, no-producer validation boundary. Historical release replay/output reproduction was not rerun.

Blocked: applying/typechecking this extension against public `main` as though it contained the private successor; independent W6/W7 exact input/candidate/manifest/output qualification; a real W8 candidate and exact output qualification. The GitHub review packet contains no authenticated private evidence for those tasks. **Independent input/output qualification remains `blocked_private_evidence_inaccessible`.** A synthetic W8 pass is a code-path test, not a real W8 source or output.

Reproduce these checks only in an authorized retained-code copy, after applying the textual patch: `node --test tests/privateExtensionGate.test.ts`; for the 385-test suite, select all top-level `tests/*.test.ts` except `privateReleaseBatch.test.ts`. A public GitHub-only checkout cannot reproduce these private-target integration checks and must report that limit.

**Still required:** independent W6/W7 input and code review; W8 exact private source transfer and candidate; separate purpose receipts; reviewed populated extension registry; append-only runner/validator; independent exact output review; private readback and explicit recurring-use eligibility. Existing W1–5 output bytes, source clocks and review receipts remain immutable.

**Authority and safety:** This is a code-only review request, not permission to retrieve private bytes into GitHub, run producers, merge, deploy, promote data, activate Forecast, alter settings, spend money or perform fantasy transactions. If the reviewer cannot access required private evidence, return `blocked_private_evidence_inaccessible` for exact-input/output qualification while still delivering any supported code-only findings.

