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

## Specific independent code-review questions

1. Does the new W6–W8 scope **fail closed**, without allowing an unreviewed private binding or reusing W1–W5 release reviews/purpose receipts?
2. Is the **W6-from-W7 retrospective acquisition** exception narrow enough? Does it preserve source acquisition scope, derivation clock, source identity and cutoff unknowns without pretending a W6-only source download?
3. Are witness/manifest/review fields, digests and chronology checked consistently? Can an attacker or accidental bad packet exploit a missing pin, mismatched scope or forged review identity? Note that `reviewer_independent=true` is a recorded claim, not independently attributable proof.
4. Do the four added tests cover the actual acceptance paths, or merely verify the intentionally empty binding registry? Identify the smallest missing negative and positive synthetic cases.
5. Are there any **material blockers** before implementing an append-only W6–W8 runner and independent exact-input/output review? Keep source qualification, code review and consumer activation distinct.

## Test record and remaining gates

Owner-side: 301 historical Node tests + 4 new tests passed under Node 22.16 with experimental TypeScript stripping; local strict TypeScript 5.8.3 passed. The originally documented Node 24 / TS 5.9.2 environment was unavailable. The proposed patch has **not** been independently tested or reviewed.

**Still required:** independent W6/W7 input and code review; W8 exact private source transfer and candidate; separate purpose receipts; reviewed populated extension registry; append-only runner/validator; independent exact output review; private readback and explicit recurring-use eligibility. Existing W1–5 output bytes, source clocks and review receipts remain immutable.

**Authority and safety:** This is a code-only review request, not permission to retrieve private bytes into GitHub, run producers, merge, deploy, promote data, activate Forecast, alter settings, spend money or perform fantasy transactions. If the reviewer cannot access required private evidence, return `blocked_private_evidence_inaccessible` for exact-input/output qualification while still delivering any supported code-only findings.
