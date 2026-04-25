#!/usr/bin/env python3
"""Validate v0 role-to-fantasy baseline and team role opportunity artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

REQUIRED_BASELINE_TOP_LEVEL = {"model", "season", "source_status", "roles"}
REQUIRED_TEAM_TOP_LEVEL = {"model", "season", "source_status", "team_profiles"}
REQUIRED_BASELINE_ROLES = {
    "QB_starter",
    "QB_developmental",
    "RB1",
    "RB2_change_of_pace",
    "passing_down_rb",
    "injury_contingent_rb",
    "WR1",
    "WR2",
    "slot_wr",
    "field_stretcher_wr",
    "rotational_wr",
    "TE1",
    "move_te",
    "blocking_rotational_te",
}
REQUIRED_TEAM_FIELDS = {"team", "season", "roles", "source_status"}
REQUIRED_ROLE_FIELDS = {
    "role",
    "role_family",
    "role_description",
    "positive_role_tags",
    "risk_role_tags",
}
ALLOWED_RED_ZONE_USAGE = {"unknown", "low", "medium", "medium_high", "high"}
ALLOWED_STABILITY = {"low", "medium", "medium_high", "high"}
ALLOWED_VOLATILITY = {"low", "medium", "medium_high", "high"}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _check_required_fields(obj: dict[str, Any], required: set[str], label: str, errors: list[str]) -> None:
    missing = sorted(required - set(obj.keys()))
    if missing:
        errors.append(f"{label} missing fields: {', '.join(missing)}")


def validate_baseline_artifact(data: dict[str, Any], errors: list[str]) -> None:
    _check_required_fields(data, REQUIRED_BASELINE_TOP_LEVEL, "baseline artifact", errors)

    roles = data.get("roles")
    if not isinstance(roles, list):
        errors.append("baseline artifact 'roles' must be a list")
        return

    seen_roles = set()
    for index, role_entry in enumerate(roles):
        if not isinstance(role_entry, dict):
            errors.append(f"baseline role at index {index} must be an object")
            continue

        _check_required_fields(role_entry, REQUIRED_ROLE_FIELDS, f"baseline role[{index}]", errors)

        role_name = role_entry.get("role")
        if isinstance(role_name, str):
            if role_name in seen_roles:
                errors.append(f"duplicate baseline role '{role_name}'")
            seen_roles.add(role_name)

        red_zone = role_entry.get("expected_red_zone_usage")
        if red_zone not in ALLOWED_RED_ZONE_USAGE:
            errors.append(
                f"baseline role[{index}] expected_red_zone_usage must be one of {sorted(ALLOWED_RED_ZONE_USAGE)}"
            )

        volatility = role_entry.get("volatility")
        if volatility not in ALLOWED_VOLATILITY:
            errors.append(
                f"baseline role[{index}] volatility must be one of {sorted(ALLOWED_VOLATILITY)}"
            )

    missing_required = sorted(REQUIRED_BASELINE_ROLES - seen_roles)
    if missing_required:
        errors.append(f"baseline artifact missing required roles: {', '.join(missing_required)}")


def validate_team_artifact(data: dict[str, Any], errors: list[str]) -> None:
    _check_required_fields(data, REQUIRED_TEAM_TOP_LEVEL, "team profiles artifact", errors)

    team_profiles = data.get("team_profiles")
    if not isinstance(team_profiles, list):
        errors.append("team profiles artifact 'team_profiles' must be a list")
        return

    for team_index, profile in enumerate(team_profiles):
        if not isinstance(profile, dict):
            errors.append(f"team profile at index {team_index} must be an object")
            continue

        _check_required_fields(profile, REQUIRED_TEAM_FIELDS, f"team profile[{team_index}]", errors)
        for optional_tag_field in ("positive_team_context_tags", "risk_team_context_tags"):
            if optional_tag_field in profile:
                value = profile[optional_tag_field]
                if not isinstance(value, list) or not all(isinstance(tag, str) for tag in value):
                    errors.append(
                        f"team profile[{team_index}] '{optional_tag_field}' must be a list of strings when provided"
                    )

        roles = profile.get("roles")
        if not isinstance(roles, list):
            errors.append(f"team profile[{team_index}] 'roles' must be a list")
            continue

        seen_roles: set[str] = set()
        for role_index, role_entry in enumerate(roles):
            if not isinstance(role_entry, dict):
                errors.append(f"team profile[{team_index}] role[{role_index}] must be an object")
                continue

            _check_required_fields(
                role_entry,
                REQUIRED_ROLE_FIELDS,
                f"team profile[{team_index}] role[{role_index}]",
                errors,
            )

            role_name = role_entry.get("role")
            if isinstance(role_name, str):
                if role_name in seen_roles:
                    team_name = profile.get("team", f"index_{team_index}")
                    errors.append(f"team {team_name} has duplicate role '{role_name}'")
                seen_roles.add(role_name)

            red_zone = role_entry.get("expected_red_zone_usage")
            if red_zone not in ALLOWED_RED_ZONE_USAGE:
                errors.append(
                    f"team profile[{team_index}] role[{role_index}] expected_red_zone_usage must be one of {sorted(ALLOWED_RED_ZONE_USAGE)}"
                )

            stability = role_entry.get("role_stability")
            if stability not in ALLOWED_STABILITY:
                errors.append(
                    f"team profile[{team_index}] role[{role_index}] role_stability must be one of {sorted(ALLOWED_STABILITY)}"
                )


def validate_artifacts(baseline_path: Path, team_path: Path) -> list[str]:
    errors: list[str] = []

    if not baseline_path.exists():
        errors.append(f"baseline artifact not found: {baseline_path}")
        return errors
    if not team_path.exists():
        errors.append(f"team profiles artifact not found: {team_path}")
        return errors

    baseline = load_json(baseline_path)
    team_profiles = load_json(team_path)

    if not isinstance(baseline, dict):
        errors.append("baseline artifact root must be an object")
    else:
        validate_baseline_artifact(baseline, errors)

    if not isinstance(team_profiles, dict):
        errors.append("team profiles artifact root must be an object")
    else:
        validate_team_artifact(team_profiles, errors)

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--baseline",
        default="data/processed/2026_role_to_fantasy_baselines.json",
        type=Path,
        help="Path to the role baseline artifact.",
    )
    parser.add_argument(
        "--team-profiles",
        default="data/processed/2026_team_role_opportunity_profiles.json",
        type=Path,
        help="Path to the team role opportunity artifact.",
    )

    args = parser.parse_args()

    errors = validate_artifacts(args.baseline, args.team_profiles)
    if errors:
        print("Validation failed:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
