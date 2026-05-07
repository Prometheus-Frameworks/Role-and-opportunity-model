# Model Overview

## Purpose

This repository provides a deterministic TypeScript MVP for evaluating WR and TE role quality, team opportunity environment, and role stability. It is designed to describe how strong and secure a receiving role looks within its offense without projecting fantasy points.


## TIBER Stack Boundary

Role-and-opportunity is the TIBER player-role interpretation layer. It sits downstream of governed TIBER-Data artifacts and downstream of TIBER-Teamstate team-environment interpretation. Its job is to explain what source-backed player usage and interpreted team context mean for a player's role; it should not become a raw-data provenance system, a team-context source of truth, a fantasy grading system, or the fantasy cockpit.

The system boundary is:

- **TIBER-Data proves what happened** with governed source/provenance truth, including source-backed weekly usage, computed or source-backed PPR outcomes, roster identity, play-caller PROE scaffold/input validation, GOBLIN research candidates, and Receiving Role Integrity proxy outputs once source-backed.
- **TIBER-Teamstate explains team environment** by interpreting team-level offensive context before it is consumed by player-level models.
- **Role-and-opportunity explains player role** by translating governed usage and team context into role archetypes, opportunity quality, stability, confidence, and explanations.
- **GOBLIN finds ugly-output legitimate-signal candidates** that may be inspected as read-only context, but should not directly alter player scoring by default.
- **FORGE grades fantasy signal** after upstream data truth and interpretation layers are available.
- **TIBER-Fantasy becomes the cockpit** that presents and orchestrates fantasy workflows.

## Expected TIBER-Data Inputs

Future integrations should consume these governed artifacts from TIBER-Data rather than re-create them locally:

- Source-backed weekly player usage.
- Computed or source-backed PPR outcomes.
- Roster identity and player/team identifiers.
- Receiving Role Integrity proxy outputs once source-backed and clearly labeled as proxy participation.
- GOBLIN candidates as read-only inspection context, not direct scoring inputs by default.

## Data Guardrails

Role-and-opportunity must not fabricate missing source truth. Specifically:

- No fabricated routes, route participation, targets, usage values, PPR outcomes, roster identity, or source metadata.
- No proprietary route claims.
- No mutation of governed TIBER-Data artifacts.
- No scoring or ranking changes in documentation-only alignment work.
- Proxy participation must not be described as true route participation. If an input is a Receiving Role Integrity proxy, output text and metadata should keep that proxy label until TIBER-Data provides source-backed route participation.

## MVP Scope

The current MVP focuses on:

- Canonical typed role, team, and output interfaces.
- Deterministic scoring for role value, opportunity quality, role stability, and vacated opportunity.
- A lightweight archetype classifier for common WR and TE deployment patterns.
- Seeded scenarios that demonstrate how the model treats alpha roles, slot roles, TE focal points, and uncertain depth-chart rooms.

## What It Does Not Do

This repository intentionally excludes:

- Fantasy point prediction.
- Machine learning.
- Scraping, databases, or APIs.
- Raw source/provenance ownership for usage, PPR outcomes, roster identity, GOBLIN candidates, play-caller PROE inputs, or Receiving Role Integrity source/proxy truth.
- Front-end rendering or a service layer.

## How To Read The Outputs

Each evaluation returns:

- A role archetype label such as `WR1`, `SLOT`, or `TE1`.
- Four component scores from 0 to 100.
- A composite role profile score that summarizes the overall signal.
- Plain-language explanation bullets describing why the profile landed there.
