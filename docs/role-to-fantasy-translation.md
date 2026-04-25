# Role-to-Fantasy Translation (v0)

## Purpose

Role-and-Opportunity translates offensive roles into fantasy opportunity outputs. In practical terms, this layer answers questions like:

- What does an RB1 role in this offense usually produce?
- What does a passing-down RB role usually produce?
- What does a WR2, slot WR, TE1, or move TE role typically return in PPR contexts?

## Ownership boundaries

This repository's v0 artifacts follow the TIBER ownership doctrine:

- **TIBER-Teamstate** owns team context, offensive environment, and play-caller context.
- **Role-and-Opportunity** owns role value and role-to-fantasy translation.
- **TIBER-Rookies** owns prospect profile, draft capital, and post-draft interpretation.
- **TIBER-Data** should eventually own shared cross-repo contracts.

## v0 characteristics

This is a deterministic, inspectable, operator-seeded version:

- No scraping.
- No external API ingestion.
- No model training.
- No scoring-system changes.
- No precision claims beyond seeded range bands.

## Artifacts

### 1) Team role opportunity profiles

`data/processed/2026_team_role_opportunity_profiles.json`

This file captures team-scoped role interpretations for operator-priority teams, including role descriptions, range placeholders, risk/positive tags, and role stability labels.

### 2) Generic role-to-fantasy baselines

`data/processed/2026_role_to_fantasy_baselines.json`

This file captures player-name-independent role baselines (e.g., RB1, WR2, slot WR, move TE) with expected range bands for touches, targets, routes, red-zone usage, and PPR points.

## Why this matters for Rookies

TIBER-Rookies can consume these artifacts to convert landing spots into role outcomes:

1. Pull team environment assumptions from Teamstate.
2. Map player to likely offensive role(s).
3. Translate role to expected fantasy opportunity via these baselines and team role profiles.

## Validation and quality gates

`scripts/validate_role_to_fantasy_profiles.py` validates both artifacts for:

- Required top-level fields.
- Required baseline roles.
- Required team and role-level fields.
- Enum compliance (`expected_red_zone_usage`, `role_stability`, `volatility`).
- Duplicate role prevention inside a single team profile.

## Forward path (post-v0)

Planned later versions can calibrate seeded ranges with historical projected-versus-actual role outcomes once:

- Shared role labels stabilize across Teamstate, Rookies, and Role-and-Opportunity.
- Baseline contracts and data handoffs are formalized in TIBER-Data.
- Historical data quality is sufficient for robust calibration.

ML should be added only after clean role labels and stable baselines exist.
