# Role and Opportunity Model

## What this service does

This repository exposes a deterministic HTTP API for evaluating WR and TE receiving roles. It scores role value, team opportunity quality, role stability, and vacated opportunity for a posted player/context combination or a seeded scenario. It is **not** a fantasy point projection service.

## Why it exists

- Deterministic WR/TE-only role intelligence.
- Railway-ready runtime with no database and no required environment variables beyond an optional `PORT`.
- Seeded scenarios that can be browsed and re-evaluated through the API.
- Typed scoring engine that remains separate from the transport layer.

## Install and run in 30 seconds

```bash
npm install
npm run dev
```

The service listens on `process.env.PORT || 3000`.

### Production-style start

```bash
npm start
```

## Run tests

```bash
npm test
```

## API endpoints

### `GET /`
Returns a JSON service description with version information and the available endpoints.

### `GET /health`
Returns:

```json
{
  "ok": true,
  "service": "role-and-opportunity-model"
}
```

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
Accepts a JSON body containing a `profile` and `context`, plus optional `scenarioId` and `scenarioName` metadata.

Example request body:

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
  "scenarioId": "custom-alpha",
  "scenarioName": "Custom alpha evaluation"
}
```

## Response notes

- API responses for evaluation and scenario routes include a compact `meta` block with service name, version, and evaluation timestamp.
- Invalid request bodies return HTTP `400` with readable validation details.
- Positions are limited to `WR` and `TE`.
- Percentage-like fields are validated against reasonable numeric ranges.

## Project structure

```text
src/
  app.ts
  server.ts
  index.ts
  scoring/
  types/
  data/
    scenarios/
  routes/
  validation/
  utils/
tests/
```
