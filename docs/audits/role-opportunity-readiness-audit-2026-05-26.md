# Role-and-opportunity readiness audit (2026-05-26)

## Scope

This audit checks whether Role-and-opportunity can currently produce a source-labeled player role/opportunity artifact suitable for downstream use by TIBER-Fantasy and later FORGE, without fabricating role truth.

## 1) Current repo inventory

### Runtime / language
- Node.js ESM TypeScript-style source (`.ts`) executed directly with Node 22+ runtime requirement.
- Package scripts are minimal (`dev`, `start`, `test`, `export:role-opportunity-lab`).

### Endpoints
- Core app routes include internal evaluation, canonical role-opportunity output, from-data variants, and lab artifact retrieval:
  - `POST /api/evaluate`
  - `POST /api/evaluate/from-data`
  - `POST /api/evaluate/batch`
  - `POST /api/role-opportunity`
  - `POST /api/role-opportunity/from-data`
  - `GET /api/role-opportunity/lab`

### Contracts / types
- Canonical contract validator and enums exist for a role-opportunity v1 record shape, including strict usage metric validation and null-safe unsupported metrics.
- Lab artifact contracts exist via `RoleOpportunityLabEnvelope` and `RoleOpportunityLabRow`.

### Adapters / upstream boundary
- Canonical adapter (`toTiberDataRoleOpportunityV1`) maps internal evaluation into a validated canonical record and sets unsupported fields to `null`.
- Upstream adapter/client (`TiberDataClient`) fetches compatibility collections from TIBER-Data-style endpoints and maps snake_case payloads into internal request structures.

### Data / artifact directories
- Seed scenarios under `src/data/scenarios/*` drive deterministic evaluation + lab export content.
- Committed artifact path exists at `data/role-opportunity/role_opportunity_lab.json`.
- Additional processed JSON artifacts also exist under `data/processed`.

### Tests
- Node test suite covers API routes, scoring, adapter validation, and lab export/endpoint behavior.

### Deploy / run assumptions
- Service expects `PORT`, `HOST`, and `TIBER_DATA_BASE_URL` (default `http://localhost:3001`).
- No auth/caching/retry layer in upstream client; behavior is intentionally minimal.

## 2) Current capabilities status

| Capability | Status | Notes |
|---|---|---|
| Internal deterministic WR/TE role scoring | **exists** | Scoring engine and seeded scenario tests are present and passing. |
| Canonical `roleOpportunityRecord` output | **exists** | `POST /api/role-opportunity` returns canonical envelope validated against contract. |
| Lab artifact export script | **exists** | `export:role-opportunity-lab` script writes deterministic artifact to configured path. |
| Lab endpoint filtering by season/week | **exists** | `GET /api/role-opportunity/lab` supports optional `season`/`week` integer filters and returns empty rows on no match. |
| `from-data` path against TIBER-Data compatibility input | **partial/demo-only** | Code path is real and tested with mocked upstream behavior, but production readiness depends on governed upstream artifact availability + schema continuity. |
| Real NFL player-role truth artifact | **missing** | Current promoted lab artifact is seeded scenario output, not governed real player truth. |

## 3) Artifact reality check (`./data/role-opportunity/role_opportunity_lab.json`)

- **Exists on repo now:** yes (committed file present).
- **Generated from seeded scenarios only:** yes; export service maps `seededScenarios` and embeds scenario metadata.
- **Real NFL players vs demo players:** demo players (e.g., `Atlas X`, `Harbor Z`, `Vale Q`) and fictional teams.
- **Source metadata/timestamps:** yes (`source_name`, `source_type`, `model_version`, `generated_at`, envelope `source` block).
- **Shape stability for consumption:** moderate for lab inspection; contract interface is explicit and tested, but semantics are demo-seeded.
- **Promoted artifact suitability:** should remain **lab/demo-only**; not suitable as promoted role truth for fantasy advice pipelines.

## 4) Contract shape assessment (lab envelope/row)

`RoleOpportunityLabRow` includes the expected core fields:
- identity/scope: `player_id`, `player_name`, `team`, `position`, `season`, `week`
- role/opportunity: `primary_role`, `role_tags`, `route_participation`, `target_share`, `air_yard_share`, `snap_share`, `usage_rate`
- confidence: `confidence_score`, `confidence_tier`
- provenance: `source_name`, `source_type`, `model_version`, `generated_at`
- explainability/raw: `insights`, `raw_fields`

`RoleOpportunityLabEnvelope` adds:
- `season`, `week`, `season_scope_marker`, `available_seasons`, `rows`, `source`

Assessment:
- Good lab-level transparency (raw fields + explanation snippets).
- Missing for stronger downstream join/governance: explicit upstream source IDs/URIs, source timestamps per metric, data-quality flags, proxy-label flags, and canonical cross-system artifact ID/versioning policy.

## 5) TIBER-Data boundary clarification

Recommended boundary (aligned with repo docs and current implementation):

### TIBER-Data should own
- Player identity and roster/team ownership truth.
- Weekly source-backed usage/PPR evidence.
- Source provenance metadata and timestamps.
- Receiving role integrity proxy outputs (clearly labeled proxies) until source-backed route participation is available.

### Role-and-opportunity should own
- Player role interpretation (`primary_role`, tags, confidence).
- Opportunity-quality interpretation and warning/explanation language.
- Deterministic player-role artifact generation from governed upstream inputs.

Current reality: boundary intent is documented, but lab export currently bypasses governed upstream truth by design (seed scenarios).

## 6) Teamstate dependency

Role-and-opportunity should consume Teamstate context as a separate governed input (e.g., pass environment tier, pace tier, volatility/context warnings) rather than reproducing Teamstate logic internally.

Current reality:
- Internal model already ingests team context features inside scenario/context input.
- There is no explicit Teamstate artifact ingestion contract yet in this repo.

Conclusion: Teamstate integration is conceptually compatible but not yet formalized at artifact-contract level.

## 7) Downstream use cases and lowest-risk path

### Option A (current-state safe)
Use `role_opportunity_lab.json` and `/api/role-opportunity/lab` for **inspection/demo only** in TIBER-Fantasy UI/dev workflows. Do **not** use for roster advice or truth assertions.

### Option B (first production-safe target)
Promote a new governed player-role artifact generated from TIBER-Data inputs (and Teamstate context once artifactized), keyed by stable identity/scope (`player_id`, `team`, `position`, `season`, `week`), with explicit source metadata and proxy labels.

### Option C (FORGE-first)
Possible later, but higher integration risk today because it may skip early validation of Fantasy-level joins/inspection surfaces.

**Recommendation:** choose **Option B** as the next lowest-risk integration path, while keeping Option A explicitly demo-only.

## Desired conclusion

### What ROP can safely provide today
- Deterministic WR/TE role interpretation and canonical role-opportunity envelope generation for provided inputs.
- A stable lab/demo artifact shape for inspection/testing.

### What is demo-only today
- Seeded scenario lab artifact and lab endpoint data content.
- Any implied player-role “truth” derived from fictional scenarios.

### Missing upstream artifacts
- Governed real player weekly usage/role evidence feed finalized for this repo’s from-data production use.
- Teamstate artifact contract ingestion path.
- Promoted player-role artifact specification (versioned) with provenance + proxy semantics.

### Is current lab endpoint/artifact safe for TIBER-Fantasy inspection?
- **Yes**, for demo/inspection only.
- **No**, for production roster advice or truth-bearing role assertions.

### Is a new promoted artifact needed?
- **Yes**. A new promoted artifact (e.g., `RoleOpportunityProfileV0`) is needed to distinguish governed real-player outputs from lab/demo rows.

## First three follow-up issues (ordered low-risk/high-utility)

1. **Define `RoleOpportunityProfileV0` promoted artifact contract**
   - Add versioned schema, required provenance/source-time fields, proxy-label fields, and stable join keys.
2. **Implement governed export path from TIBER-Data compatibility inputs**
   - Produce promoted artifact rows only from upstream-governed data; keep seeded lab path separate.
3. **Add Teamstate context adapter contract (read-only)**
   - Ingest Teamstate environment profile artifact as optional context block without duplicating Teamstate logic.

## Validation run in this audit

- `npm test` ✅ (24/24 passing)
- `npm run export:role-opportunity-lab -- --season=2025 --week=1` ✅ (artifact exported successfully with 4 rows)

If additional build/lint commands exist, they are not currently declared in `package.json` scripts.
