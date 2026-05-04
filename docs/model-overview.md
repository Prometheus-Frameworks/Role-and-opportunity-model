# Model Overview

## Purpose

This repository provides deterministic role/opportunity interpretation for receiving roles (WR/TE focus), positioned as a TIBER interpretation layer rather than a source-of-truth data system.

## Role in TIBER

- **TIBER-Data** owns canonical, source-backed evidence/provenance.
- **Role-and-opportunity-model** interprets eligible evidence into role/opportunity meaning.
- **GOBLIN (inside TIBER-Data)** can consume these interpretations as one lane of indicator support.

## Ownership boundaries

This repository owns:

- role archetype interpretation
- opportunity-context interpretation
- deterministic confidence/explanation outputs

This repository does **not** own:

- canonical source truth/provenance
- fantasy scoring/projection outputs
- user-facing product cockpit

## Inputs and dependency model

Preferred inputs are governed artifacts from TIBER-Data, including:

- canonical identity
- player-week usage evidence
- player-week scoreboard/PPR evidence (context only)

If a required field is not source-backed and governed, it should be treated as unavailable rather than inferred/fabricated.

## Output intent

Outputs are designed to help:

- role-level analysis
- opportunity diagnostics
- future indicator pipelines (including GOBLIN research lanes)

Example future indicator-supporting interpretations include:

- high route participation with low output
- snap-share jumps without points (when snap evidence is sourced)
- slot role without box-score delivery (when alignment evidence is sourced)

## Current limitations

Interpretation breadth is constrained by which evidence domains are currently source-backed and available. Route depth, snap granularity, alignment deployment, and red-zone/goal-line opportunity evidence remain key expansion dependencies.
