# Role and Opportunity Model

## What this service does

This repository exposes a deterministic HTTP API for evaluating WR and TE receiving roles. It scores role value, team opportunity quality, role stability, and vacated opportunity for a posted player/context combination or a seeded scenario. It is **not** a fantasy point projection service.

## Why it exists

- Deterministic WR/TE-only role intelligence.
- Railway-ready runtime with no database and no required environment variables beyond an optional `PORT` and `HOST`.
- Seeded scenarios that can be browsed and re-evaluated through the API.
- Typed scoring engine that remains separate from the transport layer.
- Small, composable output primitives that are easy for downstream systems to consume.
- Machine-readable contract output through `GET /openapi.json`.

## Install and run in 30 seconds

```bash
npm install
npm run dev
```

The service listens on `process.env.PORT || 3000` and binds to `process.env.HOST || 0.0.0.0`.

### Production-style start

```bash
npm start
```

The runtime now sets explicit HTTP timeouts and handles `SIGINT`/`SIGTERM` for more predictable Railway shutdown behavior.

## Run tests

```bash
npm test
```

## API endpoints

### `GET /`
Returns a JSON service description with version information, example file references, and the available endpoints.

### `GET /health`
Returns:

```json
{
  "ok": true,
  "service": "role-and-opportunity-model"
}
```

### `GET /openapi.json`
Returns an OpenAPI 3.1 document describing request/response shapes, canonical enums, and batch partial-success behavior.

### `GET /api/scenarios`
Returns a compact list of seeded scenarios with:

- `scenarioId`
- `scenarioName`
- `playerName`
- `position`
- `summary`

### `GET /api/scenarios/:scenarioId`
Returns the full seeded scenario plus the evaluated output for that scenario.

### `POST /api/evaluate`
Accepts a JSON body containing a `profile` and `context`, plus optional `scenarioId`, `scenarioName`, and `explanationLevel` metadata.

Canonical enum sets exposed in code and schema:

- `explanationLevel`: `short`, `standard`, `full`
- `verdict`: `strong`, `solid`, `mixed`, `weak`
- `scoreBands`: `elite`, `good`, `mixed`, `poor`
- `flags`: `high-role-value`, `favorable-environment`, `stable-role`, `vacated-volume`, `featured-usage`, `crowded-target-tree`, `injury-risk`, `environment-volatility`

Example request body: see [`docs/examples/evaluate-request.json`](docs/examples/evaluate-request.json).

Single-item evaluations include deterministic interpretation fields for downstream consumers:

- `verdict`: canonical recommendation bucket
- `flags`: canonical machine-readable integration flags
- `primaryReason`: short human-readable summary sentence
- `riskNote`: short risk sentence when a deterministic concern is present
- `scoreBands`: included for `explanationLevel: "full"`
- `evaluationMeta.explanationLevel`: echoes the explanation verbosity applied to the output

### `POST /api/evaluate/batch`
Accepts either:

- the legacy array of role evaluation request objects, which stays in **strict validation mode** by default, or
- an envelope `{ "items": [...], "options": { "strict": false } }` to enable **partial-success mode**.

Strict mode keeps the prior behavior: if any item fails validation, the endpoint responds with `400` and aggregated validation details.

Partial-success mode returns `200` with:

- `items`: successful evaluations, each wrapped with its `requestIndex`
- `errors`: structured validation failures with `requestIndex`, `error`, and `details`
- `summary`: requested, succeeded, and failed counts
- `partialSuccess`: `true` when at least one item fails validation

Example files:

- [`docs/examples/evaluate-batch-partial-request.json`](docs/examples/evaluate-batch-partial-request.json)
- [`docs/examples/evaluate-batch-partial-response.json`](docs/examples/evaluate-batch-partial-response.json)
