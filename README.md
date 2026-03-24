# Role and Opportunity Model

## What this service does

This repository exposes a deterministic HTTP API for evaluating WR and TE receiving roles and now emits a canonical **TIBER-Data role-opportunity v1** integration surface. The scoring engine still computes internal role scores, but downstream consumers should integrate with the canonical `roleOpportunityRecord` envelope.

## Internal output vs canonical output

The repo now keeps two layers separate:

- **Internal deterministic evaluation**: role archetype, score breakdowns, verdicts, flags, and explanation text.
- **Canonical export**: a `roleOpportunityRecord` shaped for TIBER-Data-aligned integrations with identity, scope, role, usage/opportunity metrics, confidence, and source metadata.

The canonical adapter is intentionally strict:

- required canonical identity/scope fields must be present,
- field names are normalized to the canonical contract,
- unsupported metrics remain `null` rather than being fabricated,
- invalid canonical payloads fail validation loudly.

## Alignment with TIBER-Data contract v1

The service now emits canonical records with:

- explicit player identity (`playerId`, `playerName`, `team`, `position`)
- explicit scope (`season`, `week`)
- canonical role fields (`primaryRole`, `roleTags`)
- canonical usage/opportunity metrics grouped under `usage`
- canonical confidence block (`score`, `tier`, `reasons`)
- canonical source metadata (`model`, `modelVersion`, `generatedAt`, `inputWindow`, `notes`)

A temporary local compatibility validator mirrors the expected upstream role-opportunity v1 shape so the repo can validate exported records without coupling this package to the upstream repo at runtime.

## Install and run

```bash
npm install
npm run dev
```

The service listens on `PORT` (default `3000`), binds to `HOST` (default `0.0.0.0`), and reads upstream compatibility data from `TIBER_DATA_BASE_URL` (default `http://localhost:3001`).

## Runtime hardening

- `/health` provides liveness.
- `/ready` validates runtime configuration and reports readiness metadata.
- startup now validates `PORT` and `TIBER_DATA_BASE_URL`
- startup/shutdown logging is stable JSON for easier Railway ingestion.

## Run tests

```bash
npm test
```

## API endpoints

### `GET /`
Returns service metadata and the list of supported routes.

### `GET /health`
Basic liveness check.

### `GET /ready`
Readiness check including validated runtime configuration state.

### `GET /openapi.json`
Returns an OpenAPI 3.1 contract that documents both the internal evaluation shape and the canonical role-opportunity export.

### `POST /api/evaluate`
Runs the existing deterministic scorer and returns the **internal** evaluation output.

### `POST /api/evaluate/from-data`
Fetches compatibility inputs from TIBER-Data and returns the **internal** evaluation output.

### `POST /api/role-opportunity`
Runs the scorer and returns the canonical integration-safe envelope.

Required additions beyond the legacy request:

- `season`
- `week`
- optional `inputWindow`

Example request:

```json
{
  "profile": {
    "playerId": "wr-alpha-001",
    "playerName": "Atlas X",
    "position": "WR",
    "targetShare": 31,
    "airYardShare": 38,
    "routeParticipation": 93,
    "slotRate": 24,
    "inlineRate": 0,
    "wideRate": 76,
    "redZoneTargetShare": 29,
    "firstReadShare": 33,
    "averageDepthOfTarget": 13.8,
    "explosiveTargetRate": 18,
    "personnelVersatility": 72,
    "competitionForRole": 25,
    "injuryRisk": 22,
    "vacatedTargetsAvailable": 58
  },
  "context": {
    "teamId": "TM-ALP",
    "teamName": "Metro Meteors",
    "passRateOverExpected": 7,
    "neutralPassRate": 62,
    "redZonePassRate": 60,
    "paceIndex": 66,
    "quarterbackStability": 84,
    "playCallerContinuity": 81,
    "targetCompetitionIndex": 34,
    "receiverRoomCertainty": 79,
    "vacatedTargetShare": 41
  },
  "season": 2025,
  "week": 4,
  "inputWindow": "season=2025;week=4"
}
```

Example response:

```json
{
  "meta": {
    "service": "role-and-opportunity-model",
    "evaluatedAt": "2026-03-20T00:00:00.000Z",
    "version": "0.1.0"
  },
  "roleOpportunityRecord": {
    "playerId": "wr-alpha-001",
    "playerName": "Atlas X",
    "team": "Metro Meteors",
    "position": "WR",
    "season": 2025,
    "week": 4,
    "primaryRole": "alpha_receiver",
    "roleTags": ["wr1", "position:wr", "flag:high-role-value"],
    "usage": {
      "snapShare": null,
      "routeParticipation": 93,
      "targetShare": 31,
      "airYardShare": 38,
      "carryShare": null,
      "rushAttemptShare": null,
      "redZoneTouchShare": null,
      "inside10TouchShare": null,
      "inside5TouchShare": null,
      "goalLineCarryShare": null,
      "teamOpportunityShare": null,
      "snaps": null,
      "routesRun": null,
      "targets": null,
      "carries": null,
      "redZoneTouches": null,
      "inside10Touches": null,
      "inside5Touches": null,
      "goalLineCarries": null
    },
    "confidence": {
      "score": 78.6,
      "tier": "high",
      "reasons": [
        "Atlas X carries a strong role because usage concentration and team context both grade well."
      ]
    },
    "source": {
      "model": "role-and-opportunity-model",
      "modelVersion": "0.1.0",
      "generatedAt": "2026-03-20T00:00:00.000Z",
      "inputWindow": "season=2025;week=4",
      "notes": [
        "Derived from internal deterministic role evaluation output."
      ]
    }
  },
  "internalEvaluation": {
    "...": "existing internal scorer output preserved for debugging"
  }
}
```

### `POST /api/role-opportunity/from-data`
Fetches compatibility inputs from TIBER-Data, runs the deterministic scorer, and emits the canonical role-opportunity envelope. This is the preferred integration path when upstream data is available.

Canonical output requires `season` and `week`; the endpoint rejects requests missing those fields.


### `GET /api/role-opportunity/lab`
Returns a read-only promoted lab envelope from the exported artifact at `ROLE_OPPORTUNITY_EXPORTS_PATH` (default: `./data/role-opportunity/role_opportunity_lab.json`).

Optional query params:

- `season` (integer)
- `week` (integer)

If filters do not match rows present in the artifact scope, the endpoint still returns `200` with an empty `rows` array.


## Deterministic demo command

```bash
curl -X POST http://localhost:3000/api/role-opportunity \
  -H 'content-type: application/json' \
  -d @docs/examples/evaluate-request.json
```

> Note: `docs/examples/evaluate-request.json` is still the internal example file. Add `season` and `week` fields when calling the canonical endpoint.

## TIBER-Data configuration

```bash
export TIBER_DATA_BASE_URL=http://localhost:3001
npm run dev
```

The upstream client remains intentionally small: no auth, no caching, and no retry layer.


## Promoted lab artifact export (artifact-first handoff)

Generate the stable lab artifact for downstream TIBER-Fantasy consumption:

```bash
npm run export:role-opportunity-lab -- --season=2025 --week=4
```

Default artifact path:

- `./data/role-opportunity/role_opportunity_lab.json`
- override with `ROLE_OPPORTUNITY_EXPORTS_PATH`

Example with explicit override:

```bash
ROLE_OPPORTUNITY_EXPORTS_PATH=./data/role-opportunity/role_opportunity_lab.json \
  npm run export:role-opportunity-lab -- --season=2025 --week=4
```

The exported JSON envelope is designed for promoted-lab reads and includes:

- top-level: `season`, `week`, `season_scope_marker`, `available_seasons`, `rows`, `source`
- row-level minimum fields used by TIBER-Fantasy: `player_id`, `player_name`, `team`, `position`, `season`, `week`, `primary_role`, `role_tags`, `route_participation`, `target_share`, `air_yard_share`, `snap_share`, `usage_rate`, `confidence_score`, `confidence_tier`, `source_name`, `source_type`, `model_version`, `generated_at`, `insights`, `raw_fields`
- `confidence_score` in the promoted lab artifact and `GET /api/role-opportunity/lab` is emitted on a canonical `0.0-1.0` scale for direct TIBER-Fantasy compatibility (no post-export normalization required)
- `confidence_tier` remains human-readable (`low`/`medium`/`high`) and is derived from the deterministic model's native confidence signal

TIBER-Fantasy promoted adapter compatibility:

- artifact-first: point `ROLE_OPPORTUNITY_EXPORTS_PATH` to the generated `role_opportunity_lab.json`
- optional endpoint path is also available at `GET /api/role-opportunity/lab`
