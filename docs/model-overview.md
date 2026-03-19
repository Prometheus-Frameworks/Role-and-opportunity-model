# Model Overview

## Purpose

This repository provides a deterministic TypeScript MVP for evaluating WR and TE role quality, team opportunity environment, and role stability. It is designed to describe how strong and secure a receiving role looks within its offense without projecting fantasy points.

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
- Front-end rendering or a service layer.

## How To Read The Outputs

Each evaluation returns:

- A role archetype label such as `WR1`, `SLOT`, or `TE1`.
- Four component scores from 0 to 100.
- A composite role profile score that summarizes the overall signal.
- Plain-language explanation bullets describing why the profile landed there.
