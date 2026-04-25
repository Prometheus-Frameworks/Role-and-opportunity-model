from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BASELINE_PATH = Path("data/processed/2026_role_to_fantasy_baselines.json")
TEAM_PATH = Path("data/processed/2026_team_role_opportunity_profiles.json")
VALIDATOR_PATH = Path("scripts/validate_role_to_fantasy_profiles.py")

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

REQUIRED_TEAMS = {
    "NO",
    "HOU",
    "TEN",
    "WAS",
    "LAR",
    "PHI",
    "CLE",
    "SF",
    "SEA",
    "PIT",
    "KC",
    "BUF",
    "NYG",
    "MIA",
    "CHI",
    "JAX",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


class RoleToFantasyProfileTests(unittest.TestCase):
    def test_baseline_artifact_exists_and_has_required_roles(self) -> None:
        self.assertTrue(BASELINE_PATH.exists())
        baseline = load_json(BASELINE_PATH)
        roles = {role["role"] for role in baseline.get("roles", [])}
        self.assertTrue(REQUIRED_BASELINE_ROLES.issubset(roles))

    def test_team_profiles_exist_and_include_required_teams(self) -> None:
        self.assertTrue(TEAM_PATH.exists())
        teams = {profile["team"] for profile in load_json(TEAM_PATH).get("team_profiles", [])}
        self.assertTrue(REQUIRED_TEAMS.issubset(teams))

    def test_hou_includes_rb1(self) -> None:
        by_team = {p["team"]: p for p in load_json(TEAM_PATH)["team_profiles"]}
        hou_roles = {role["role"] for role in by_team["HOU"]["roles"]}
        self.assertIn("RB1", hou_roles)

    def test_was_includes_slot_wr(self) -> None:
        by_team = {p["team"]: p for p in load_json(TEAM_PATH)["team_profiles"]}
        was_roles = {role["role"] for role in by_team["WAS"]["roles"]}
        self.assertIn("slot_wr", was_roles)

    def test_lar_includes_move_te_and_qb_developmental(self) -> None:
        by_team = {p["team"]: p for p in load_json(TEAM_PATH)["team_profiles"]}
        lar_roles = {role["role"] for role in by_team["LAR"]["roles"]}
        self.assertIn("move_te", lar_roles)
        self.assertIn("QB_developmental", lar_roles)

    def test_kc_includes_passing_down_and_injury_contingent_rb(self) -> None:
        by_team = {p["team"]: p for p in load_json(TEAM_PATH)["team_profiles"]}
        kc_roles = {role["role"] for role in by_team["KC"]["roles"]}
        self.assertIn("passing_down_rb", kc_roles)
        self.assertIn("injury_contingent_rb", kc_roles)

    def test_jax_te_watch_signal_present(self) -> None:
        by_team = {p["team"]: p for p in load_json(TEAM_PATH)["team_profiles"]}
        jax_profile = by_team["JAX"]

        all_positive_tags = set()
        for role in jax_profile["roles"]:
            all_positive_tags.update(role.get("positive_role_tags", []))

        self.assertIn("late_round_te_watch", all_positive_tags)

    def test_validator_passes_on_committed_artifacts(self) -> None:
        result = subprocess.run(
            [sys.executable, str(VALIDATOR_PATH)],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_duplicate_roles_fail_validation(self) -> None:
        baseline = load_json(BASELINE_PATH)
        team_profiles = load_json(TEAM_PATH)

        modified_team_profiles = copy.deepcopy(team_profiles)
        target_team = modified_team_profiles["team_profiles"][0]
        target_team["roles"].append(copy.deepcopy(target_team["roles"][0]))

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            baseline_path = temp_path / "baseline.json"
            teams_path = temp_path / "teams.json"

            baseline_path.write_text(json.dumps(baseline), encoding="utf-8")
            teams_path.write_text(json.dumps(modified_team_profiles), encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(VALIDATOR_PATH),
                    "--baseline",
                    str(baseline_path),
                    "--team-profiles",
                    str(teams_path),
                ],
                check=False,
                capture_output=True,
                text=True,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate role", result.stdout)

    def test_hou_and_ten_role_specific_tags_do_not_leak(self) -> None:
        by_team = {p["team"]: p for p in load_json(TEAM_PATH)["team_profiles"]}

        hou_roles = {role["role"]: role for role in by_team["HOU"]["roles"]}
        self.assertIn("lead_rb_volume_watch", set(hou_roles["RB1"]["positive_role_tags"]))
        self.assertNotIn("lead_rb_volume_watch", set(hou_roles["WR2"]["positive_role_tags"]))
        self.assertNotIn("lead_rb_volume_watch", set(hou_roles["TE1"]["positive_role_tags"]))

        ten_roles = {role["role"]: role for role in by_team["TEN"]["roles"]}
        self.assertIn("wr1_depth_chart_path", set(ten_roles["WR1"]["positive_role_tags"]))
        self.assertNotIn("wr1_depth_chart_path", set(ten_roles["RB1"]["positive_role_tags"]))
        self.assertNotIn("wr1_depth_chart_path", set(ten_roles["RB2_change_of_pace"]["positive_role_tags"]))


if __name__ == "__main__":
    unittest.main()
