# Role and Opportunity Model

## Role in the TIBER ecosystem

`Role-and-opportunity-model` is the **role/opportunity interpretation layer** in TIBER.

It is responsible for interpreting receiving-role evidence into structured role/opportunity outputs, especially in areas where TIBER-Data does not yet provide fully sourced direct evidence (for example route/alignment-derived role interpretation).

This repository is **not** the canonical provenance spine.

## Current trajectory alignment (TIBER-Data + GOBLIN)

As of the current trajectory:

- **TIBER-Data owns canonical source-backed Evidence Layer spine**, including:
  - source-backed identity
  - source-backed player-week PPR / scoreboard
  - source-backed player-week usage
- **GOBLIN is emerging inside TIBER-Data** as a research/evidence lane for ugly-output and legitimate-indicator candidates.
- **Role-and-opportunity-model consumes and interprets evidence**; it does not replace source-backed truth ownership.

## What this repo owns

This repo owns deterministic role/opportunity interpretation logic and outputs, including:

- receiving role classification/archetyping (WR/TE-centric today)
- role confidence and explanation signals
- role/opportunity interpretation output shapes suitable for downstream research and decision layers
- translation of sourced usage evidence into role-oriented indicators when supported by governed inputs

## What this repo consumes

Where applicable, this repo should consume upstream TIBER-Data artifacts as inputs, especially:

- canonical player/team identity
- player-week usage evidence that is already source-backed
- player-week scoreboard/PPR evidence (for diagnostic context, not scoring ownership)

If an input field is not available from governed source-backed artifacts, the model should leave unsupported fields empty/null instead of fabricating values.

## What this repo produces

Primary outputs are role/opportunity interpretation records that can support:

- analyst-facing role diagnostics
- downstream research workflows
- future GOBLIN indicator candidates that need role context

Potential future unblockers for GOBLIN-style flags include:

- `high_route_participation_low_output`
- `snap_share_jump_without_points` *(when source-backed snap data is available)*
- `slot_role_without_box_score` *(when source-backed alignment data is available)*

## What this repo does **not** own

To keep boundaries clear:

- It does **not** own canonical source/provenance truth (TIBER-Data owns this).
- It does **not** own fantasy scoring/projection (Point-prediction-model owns this).
- It does **not** own the user-facing cockpit/product surface (TIBER-Fantasy owns this).
- It does **not** invent route/snap/red-zone evidence without governed source support.

## Current limitations and future data needs

Current interpretation quality is constrained by availability of governed source-backed inputs.

High-priority future evidence dependencies include:

- sourced route participation depth and stability fields
- sourced snap share and snap count evidence
- sourced alignment/slot-vs-wide deployment evidence
- sourced red-zone and goal-line opportunity evidence at stable weekly granularity

As those inputs become governed and available through TIBER-Data, this repo can expand role/opportunity interpretation fidelity and support stronger GOBLIN candidate flagging.

## Local development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```
