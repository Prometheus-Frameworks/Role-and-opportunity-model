# Role-to-Fantasy Translation (Boundary Clarification)

## Status in current trajectory

This document clarifies boundaries under the current TIBER trajectory.

Historically, this repo described role-to-fantasy translation artifacts. Under the current model, those artifacts should be interpreted as **role/opportunity interpretation support**, not as ownership of scoring/projection truth.

## Ownership boundaries (current)

- **TIBER-Data**: canonical source-backed identity and player-week evidence/provenance spine.
- **Role-and-opportunity-model**: role/opportunity interpretation, especially receiving-role evidence interpretation.
- **Point-prediction-model**: fantasy scoring/projection ownership.
- **TIBER-Fantasy**: user-facing cockpit and product experience.

## Practical meaning for this repo

This repo may produce interpretation outputs that help explain *why* opportunity looked the way it did, but it should not:

- own canonical scoring outputs,
- claim provenance authority over source evidence,
- fabricate unsourced route/snap/alignment/red-zone fields.

## Relationship to GOBLIN

GOBLIN is emerging in TIBER-Data as a research/evidence lane for ugly-output / legitimate-indicator candidates.

Role-and-opportunity-model can eventually supply interpretation features that help unblock candidate indicators such as:

- `high_route_participation_low_output`
- `snap_share_jump_without_points` (requires sourced snap evidence)
- `slot_role_without_box_score` (requires sourced alignment evidence)

## Data readiness dependencies

Higher-confidence translation from role evidence to downstream indicator support depends on governed source-backed availability of:

- snap share/count data
- route participation depth and stability data
- alignment/slot deployment data
- red-zone and goal-line opportunity data

Until those are source-backed upstream, this repo should preserve null/unknown states rather than invent values.
