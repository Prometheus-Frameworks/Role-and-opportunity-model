/** Closed Week 3 retained replay binding. Pins authenticate bytes; they do not admit the source, apply purpose acceptance, or authorize execution. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Identity of the separately reviewed 16-member retained-input manifest supplied with TQ-011 r2. */
export const RETAINED_WEEK3_INPUT_MANIFEST_SHA256 = 'cf1c2a555bda20199ca36642f427eb83edfbfbb5f4546e233ce994a0fe8aa1b1' as const;

export const RETAINED_WEEK3_BINDING = freeze({
  "version": "rop_retained_week3_binding_v1",
  "sourceSupportCommit": "2b58e2c22ccd2430041afcfbd143b057830878f0",
  "candidateGeneratedAt": null,
  "generationEvidence": "docs/audits/week3-replay-2026-10-03/build-receipt.json#build_completed_at",
  "replayWitness": {
    "path": "docs/audits/week3-replay-2026-10-03/build-receipt.json",
    "manifestPath": "docs/audits/week3-replay-2026-10-03/manifest.json",
    "reviewPath": "docs/audits/week3-replay-2026-10-03/independent-review.json",
    "dataBase": "e1e92078c626b9e2e502e927ba0de79afd26f451",
    "selectedDataHead": "eac3b9bc22cf1fa230b233a09f5e031a2a9b409a",
    "reviewedHead": "4821a08ecad8c4ed7177b2acda0cb29d93a2649a"
  },
  "games": [
    "2026_03_ARI_SF",
    "2026_03_ATL_GB",
    "2026_03_BAL_DAL",
    "2026_03_CAR_CLE",
    "2026_03_CIN_PIT",
    "2026_03_HOU_IND",
    "2026_03_KC_MIA",
    "2026_03_LAC_BUF",
    "2026_03_LA_DEN",
    "2026_03_LV_NO",
    "2026_03_MIN_TB",
    "2026_03_NE_JAX",
    "2026_03_NYJ_DET",
    "2026_03_PHI_CHI",
    "2026_03_SEA_WAS",
    "2026_03_TEN_NYG"
  ],
  "paths": {
    "candidate": "exports/candidates/weekly_boxscore/revisions/2026_REG_w03/f3366ac1c2192641c6e94ba7c756ed2e12ba73b37550619ae143deaeab9f9902.json",
    "player": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/player.csv",
    "team": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/team.csv",
    "schedule": "data/raw/weekly_schedule/f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062/games.csv",
    "sourceReceipt": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/receipt.json",
    "scheduleReceipt": "data/raw/weekly_schedule/f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062/receipt.json",
    "sourceLicense": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/LICENSE.md",
    "scheduleLicense": "data/raw/weekly_schedule/f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062/LICENSE.md",
    "publisher": "scripts/publish_weekly_boxscore_candidate_v0.py",
    "builder": "scripts/build_weekly_boxscore_candidate_v0.py"
  },
  "pins": [
    {
      "path": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/player.csv",
      "size": 1487226,
      "sha256": "c04c03a2aedbca54680f5fd49e8fbee638028036f5dfc3b54992da71b0a056e1"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/team.csv",
      "size": 40384,
      "sha256": "8e4ec146327dd4af1ce01b1d10b57182725c9e44a20744ebb33561b454faa42a"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/receipt.json",
      "size": 2061,
      "sha256": "96ef8d1b07626e4298a9351d1ffc8c0b37d019bcef8200843fb915a242ae02e1"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w03_6e8426cf948791cd5819b9e3ea7a5bb3ee3290370e1133bab7aeb488b093d196/LICENSE.md",
      "size": 18651,
      "sha256": "2a82ac9bbc3e3ee066908381e8d373896db5a6025d083fbd59692fe9ccfb9111"
    },
    {
      "path": "data/raw/weekly_schedule/f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062/games.csv",
      "size": 2182348,
      "sha256": "f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062"
    },
    {
      "path": "data/raw/weekly_schedule/f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062/receipt.json",
      "size": 1149,
      "sha256": "6e8d9ab46965ec1f39f8f547202e06d6a698a54adbf33e5c925943221773b4ff"
    },
    {
      "path": "data/raw/weekly_schedule/f3f8613f47dc9568f61506723d819ecac75c5b526de49884dc18d678c69de062/LICENSE.md",
      "size": 18651,
      "sha256": "2a82ac9bbc3e3ee066908381e8d373896db5a6025d083fbd59692fe9ccfb9111"
    },
    {
      "path": "exports/candidates/weekly_boxscore/revisions/2026_REG_w03/f3366ac1c2192641c6e94ba7c756ed2e12ba73b37550619ae143deaeab9f9902.json",
      "size": 1339996,
      "sha256": "f3366ac1c2192641c6e94ba7c756ed2e12ba73b37550619ae143deaeab9f9902"
    },
    {
      "path": "exports/candidates/weekly_boxscore/revisions/2026_REG_w03/index.json",
      "size": 156,
      "sha256": "b7760a53f5db6cfbca5aff9afdbd8562ef3bd1e266284364c8930f49f5fbfbf8"
    },
    {
      "path": "scripts/publish_weekly_boxscore_candidate_v0.py",
      "size": 8330,
      "sha256": "dea7944cd57f38c4a2374e6072a726f4cd89cb1c685d430ecd9c061d66165d71"
    },
    {
      "path": "scripts/build_weekly_boxscore_candidate_v0.py",
      "size": 12594,
      "sha256": "e3195d836b2fcc77895ff05a8722f8fb24b50d0fdde50bf0b36730b9d8ef920d"
    },
    {
      "path": "scripts/intake_weekly_boxscore_v0.py",
      "size": 9503,
      "sha256": "1622fd838aaf07844d5c53655778a8a91945844bff15f1b07fb0488c26292322"
    },
    {
      "path": "scripts/intake_weekly_schedule_v0.py",
      "size": 5258,
      "sha256": "8b0f48a606bfd9ad13b6f902e5d08abf6a2ba956ce3bea6276b4bf02d3bdfcbd"
    },
    {
      "path": "docs/audits/week3-replay-2026-10-03/build-receipt.json",
      "size": 1332,
      "sha256": "c7e0b4d5a7c299ed51b85b2e1d98f5ce13eb0ac8d2765c155d2ca36ab8b66bba"
    },
    {
      "path": "docs/audits/week3-replay-2026-10-03/manifest.json",
      "size": 3624,
      "sha256": "7bd6c42918c76e55bd521a9211a702bfcbab8292853569a07462852c4be28820"
    },
    {
      "path": "docs/audits/week3-replay-2026-10-03/independent-review.json",
      "size": 3623,
      "sha256": "e9a9611c3cbe294189584e8da30108d36594fcffc4e72a460e6b406784fb5643"
    }
  ]
} as const);
