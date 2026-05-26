# RoleOpportunityProfileV0 Contract

## Purpose

`RoleOpportunityProfileV0` defines the first governed real-player role/opportunity artifact contract for Role-and-opportunity. This contract is **contract-first** and does **not** implement a full export pipeline.

This contract exists to support safe downstream usage by FORGE and TIBER-Fantasy while preserving system boundaries:

- **TIBER-Data** proves what happened.
- **TIBER-Teamstate** explains team environment.
- **Role-and-opportunity (ROP)** explains player role.

## Scope and non-goals

### In scope (v0)

- Governed artifact shape for role/opportunity profiles.
- Explicit distinction between source-backed, proxy-derived, derived, model-output, and missing fields.
- WR/TE role/opportunity usage semantics.
- Readiness flags that separate fantasy inspection readiness from FORGE scoring readiness.
- Optional read-only Teamstate context attachment.

### Out of scope (v0)

- Full export pipeline implementation.
- Runtime scoring changes.
- Ranking/trade/roster verdict behavior.
- RB scoring logic implementation.
- QB role/opportunity implementation under this contract.

## Guardrails

- Seeded/demo lab artifacts (for example `data/role-opportunity/role_opportunity_lab.json`) are **not** governed real-player truth.
- Route participation must never be fabricated.
- Proxy participation must never be labeled as true source-backed route participation.
- ROP must not mutate TIBER-Data or TIBER-Teamstate artifacts.
- ROP must not wire TIBER-Fantasy or feed FORGE scoring directly from partial/proxy outputs without readiness checks.

## Artifact-level contract

```ts
interface RoleOpportunityProfileArtifactV0 {
  artifact: "role_opportunity_profiles_v0";
  generatedAt: string; // ISO-8601 timestamp
  season: number;
  week: number | null;
  sourceArtifacts: string[];
  profiles: RoleOpportunityProfileV0[];
}
```

### Field notes

- `artifact`: fixed literal identifying this governed artifact shape.
- `generatedAt`: timestamp for this artifact build operation.
- `season`/`week`: explicit scope. `week = null` indicates full-season scope.
- `sourceArtifacts`: provenance references (URIs/paths/ids) for upstream inputs.
- `profiles`: player-level governed role/opportunity profiles.

## Profile-level contract

```ts
type SupportedRoleOpportunityPositionV0 = "WR" | "TE";
type FutureRoleOpportunityPosition = "RB";

interface RoleOpportunityProfileV0 {
  contractVersion: "role_opportunity_profile_v0";

  playerId: string;
  playerName: string;
  team: string;
  position: SupportedRoleOpportunityPositionV0;

  season: number;
  week: number | null;
  generatedAt: string; // ISO-8601 timestamp
  inputWindow: string | null;

  primaryRole: string;
  roleTags: string[];

  usage: ReceiverUsageBlockV0 | TightEndUsageBlockV0;
  roleQuality: RoleQualityBlockV0;
  teamContext: TeamContextAttachmentV0 | null;

  evidence: RoleOpportunityEvidenceItemV0[];
  warnings: string[];
  readiness: RoleOpportunityReadinessV0;
}
```

## WR/TE usage semantics

This contract intentionally reflects the current deterministic model reality: WR/TE first.

```ts
interface ReceiverUsageBlockV0 {
  snapShare: number | null;
  routeParticipation: number | null;
  routeParticipationStatus: "source_backed" | "proxy" | "missing";
  targetShare: number | null;
  targetsPerRouteRun: number | null;
  airYardShare: number | null;
  redZoneTargetShare: number | null;
  firstReadShare: number | null;
  slotRate: number | null;
  wideRate: number | null;
  averageDepthOfTarget: number | null;
}

interface TightEndUsageBlockV0 extends ReceiverUsageBlockV0 {
  inlineRate: number | null;
  detachedRate: number | null;
}
```

### Route participation truth labeling requirement

If `routeParticipation` is not backed by true source route data:

- set `routeParticipationStatus` to `"proxy"` or `"missing"`.
- include matching explanation in `warnings`.
- include matching provenance in `evidence`.

## Role quality block

```ts
interface RoleQualityBlockV0 {
  roleScore: number | null;
  opportunityScore: number | null;
  stabilityScore: number | null;
  targetEarningScore: number | null;
  deploymentQualityScore: number | null;
  competitionRiskScore: number | null;
  confidenceScore: number;
  confidenceTier: "low" | "medium" | "high";
  confidenceReasons: string[];
}
```

## Teamstate context attachment (read-only)

ROP attaches Teamstate context when available and does not duplicate Teamstate logic.

```ts
interface TeamContextAttachmentV0 {
  source: "TIBER-Teamstate";
  artifact: "team_environment_profiles_v0";
  teamAbbr: string;
  offenseTier: "elite" | "strong" | "average" | "weak" | "unknown";
  passEnvironmentTier: "pass_heavy" | "balanced" | "run_heavy" | "unknown";
  paceTier: "fast" | "neutral" | "slow" | "unknown";
  volatilityTier: "stable" | "volatile" | "unknown";
  warnings: string[];
}
```

- `teamContext` may be `null` in v0 when no Teamstate artifact is available.

## Evidence/provenance block

```ts
interface RoleOpportunityEvidenceItemV0 {
  field: string;
  source: string;
  sourceType: "source_backed" | "proxy" | "derived" | "model_output" | "missing";
  generatedAt?: string;
  sourceSnapshotAt?: string | null;
  notes?: string;
}
```

All interpretation-relevant metrics should be explainable through `evidence` items.

## Readiness block

```ts
interface RoleOpportunityReadinessV0 {
  readyForFantasyInspection: boolean;
  readyForForgeScoring: boolean;
  missingRequiredFields: string[];
  blockingWarnings: string[];
}
```

### Readiness intent

- `readyForFantasyInspection` can be `true` while a profile is still unsuitable for hard scoring.
- `readyForForgeScoring` should remain `false` when required source-backed fields are missing/proxy-only.

Example:

```json
{
  "readyForFantasyInspection": true,
  "readyForForgeScoring": false,
  "missingRequiredFields": ["source-backed route participation", "firstReadShare"],
  "blockingWarnings": ["routeParticipation is proxy-derived and not source-backed"]
}
```

## RB extension path (future, not implemented in v0 runtime)

RB role/opportunity is explicitly in-scope for a future ROP version because RB value is role/opportunity dependent.

Suggested future RB role labels:

- `bellcow_back`
- `lead_early_down_back`
- `receiving_back`
- `goal_line_back`
- `committee_back`
- `change_of_pace_back`
- `stash_back`
- `unknown`

Suggested future usage block:

```ts
interface RunningBackUsageBlockV0 {
  snapShare: number | null;
  carryShare: number | null;
  rushAttemptShare: number | null;
  targetShare: number | null;
  routeParticipation: number | null;
  routeParticipationStatus: "source_backed" | "proxy" | "missing";
  redZoneTouchShare: number | null;
  inside10TouchShare: number | null;
  inside5TouchShare: number | null;
  goalLineCarryShare: number | null;
  twoMinuteSnapShare: number | null;
  thirdDownSnapShare: number | null;
  teamOpportunityShare: number | null;
}
```

## QB decision

QBs are explicitly out of scope for this contract version.

QB opportunity should be a separate future contract (for example `QBOpportunityProfileV0`) because QB evaluation depends on distinct signals:

- starter security
- dropback volume
- designed rush share
- scramble tendency
- red-zone rushing role
- pressure/sack behavior
- pass environment
- play-caller stability
- weapon quality
- bench risk

## Backward compatibility and migration note

This contract does not retroactively reclassify existing lab/demo exports as governed truth. Existing seeded/demo artifacts remain non-governed until a future governed export pipeline explicitly emits `role_opportunity_profiles_v0` using source/proxy/readiness semantics defined here.
