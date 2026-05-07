# Role-to-Fantasy Translation (v0)

## Purpose

Role-and-Opportunity translates offensive roles into fantasy opportunity outputs. In practical terms, this layer answers questions like:

- What does an RB1 role in this offense usually produce?
- What does a passing-down RB role usually produce?
- What does a WR2, slot WR, TE1, or move TE role typically return in PPR contexts?

## Ownership boundaries

This repository's v0 artifacts follow the TIBER ownership doctrine:

- **TIBER-Data** owns governed source/provenance truth: source-backed weekly usage, computed or source-backed PPR outcomes, roster identity, play-caller PROE scaffold/input validation, Receiving Role Integrity proxy outputs once source-backed, and GOBLIN research candidates.
- **TIBER-Teamstate** owns team context, offensive environment, and play-caller interpretation.
- **Role-and-Opportunity** owns player-level role interpretation and role-to-fantasy translation from governed inputs; it must not own raw source truth or fabricate missing usage/route data.
- **GOBLIN** owns ugly-output legitimate-signal candidate discovery. Candidate artifacts may be inspected as read-only context here, but they should not directly drive scoring by default.
- **FORGE** owns fantasy-signal grading.
- **TIBER-Fantasy** owns the fantasy cockpit experience that consumes these interpreted layers.
- **TIBER-Rookies** owns prospect profile, draft capital, and post-draft interpretation.

## Alignment guardrails

Role-to-fantasy artifacts remain interpretive and must respect the post-May data boundary:

- Do not fabricate routes, target totals/shares, usage values, PPR outcomes, roster identity, or source metadata.
- Do not make proprietary route claims.
- Do not mutate TIBER-Data artifacts.
- Do not call Receiving Role Integrity proxy participation true route participation.
- Do not introduce scoring or ranking changes in docs-only alignment work.

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

Each team profile can also include:

- `positive_team_context_tags`
- `risk_team_context_tags`

These fields hold broad environment signals, while `positive_role_tags` and `risk_role_tags` are reserved for role-specific fantasy translation signals (e.g., RB1-specific versus WR2-specific).

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
