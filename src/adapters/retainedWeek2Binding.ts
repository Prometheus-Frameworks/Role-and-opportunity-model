/** Closed Week 2 source binding. No source admission or downstream purpose acceptance.
 * Data packet identity is a retrieval reference; each required member below is byte-authenticated.
 * Support bundle is pinned as bytes, not executed or externally authenticated by this adapter. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const RETAINED_WEEK2_BINDING = freeze({
  "version": "rop_retained_week2_binding_v1",
  "reviewedDataPacketSha256": "5ec880f0d553c23b8ad9322bf0890286c8440a9b19a1a117d1a4bc2941737823",
  "sourceSupportCommit": "426655473c53ba347a99ce2914cd5c9e7a7fbec1",
  "candidateGeneratedAt": "2026-09-25T12:01:50.547930Z",
  "generationEvidence": "data-packet/build-receipt.json#build_completed_at",
  "generationWitness": {
    "path": "data-packet/build-receipt.json",
    "dataBase": "e1e92078c626b9e2e502e927ba0de79afd26f451"
  },
  "games": [
    "2026_02_CAR_ATL",
    "2026_02_CIN_HOU",
    "2026_02_CLE_TB",
    "2026_02_DET_BUF",
    "2026_02_GB_NYJ",
    "2026_02_IND_KC",
    "2026_02_JAX_DEN",
    "2026_02_LV_LAC",
    "2026_02_MIA_SF",
    "2026_02_MIN_CHI",
    "2026_02_NO_BAL",
    "2026_02_NYG_LA",
    "2026_02_PHI_TEN",
    "2026_02_PIT_NE",
    "2026_02_SEA_ARI",
    "2026_02_WAS_DAL"
  ],
  "paths": {
    "candidate": "exports/candidates/weekly_boxscore/revisions/2026_REG_w02/3c7cd5d0bfaeb52363cf30fa2387ce024b78070dc2ad51a2b2f77ee2efa44ef9.json",
    "player": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/player.csv",
    "team": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/team.csv",
    "schedule": "data/raw/weekly_schedule/1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55/games.csv",
    "sourceReceipt": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/receipt.json",
    "scheduleReceipt": "data/raw/weekly_schedule/1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55/receipt.json",
    "sourceLicense": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/LICENSE.md",
    "scheduleLicense": "data/raw/weekly_schedule/1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55/LICENSE.md",
    "publisher": "scripts/publish_weekly_boxscore_candidate_v0.py",
    "builder": "scripts/build_weekly_boxscore_candidate_v0.py"
  },
  "pins": [
    {
      "path": "data-packet/build-receipt.json",
      "size": 780,
      "sha256": "8a220eb5f1508751b6ee28b2ea5a7b423a3b57c60fe4e33026a6db971061a196"
    },
    {
      "path": "data-packet/manifest.json",
      "size": 5339,
      "sha256": "6fde4ec96d6597731aa911ea010fb2f997b10a4cf471f556aa7bf840b0bf8766"
    },
    {
      "path": "data-packet/retained-support.bundle",
      "size": 680724,
      "sha256": "0a9738d83b7c968f9b6de8f83c848ad422dc0ea1d0519ba14bae0858fe673f0f"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/LICENSE.md",
      "size": 18651,
      "sha256": "2a82ac9bbc3e3ee066908381e8d373896db5a6025d083fbd59692fe9ccfb9111"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/player.csv",
      "size": 1022102,
      "sha256": "315cfb8d5abbd44c6a36c43e3e8ad78c96351193c8e2fe717fcff8413df43b2b"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/receipt.json",
      "size": 2061,
      "sha256": "e822fdde71e4e6d405ae4c8dc9c45ae3a159921db6cb7765dd63927e192782b0"
    },
    {
      "path": "data/raw/weekly_boxscore/2026_w02_5d2675c53a8602c3b3d74c4de91f5c3a9db376585d0c2eb584f7c7a46ba6b730/team.csv",
      "size": 28404,
      "sha256": "9410b59c9a0a2afd847361778586b19f958fa259ebe63a343e2f19863683eee0"
    },
    {
      "path": "data/raw/weekly_schedule/1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55/LICENSE.md",
      "size": 18651,
      "sha256": "2a82ac9bbc3e3ee066908381e8d373896db5a6025d083fbd59692fe9ccfb9111"
    },
    {
      "path": "data/raw/weekly_schedule/1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55/games.csv",
      "size": 2180913,
      "sha256": "1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55"
    },
    {
      "path": "data/raw/weekly_schedule/1f64b3aa67a026251ab637a9f2ebe536fd424263e9509f43778615698bb71e55/receipt.json",
      "size": 1149,
      "sha256": "27b2e6bcf3cc812f77db487d3430afda70b6190cdfd2a50e415b63b71243f3c9"
    },
    {
      "path": "exports/candidates/weekly_boxscore/revisions/2026_REG_w02/3c7cd5d0bfaeb52363cf30fa2387ce024b78070dc2ad51a2b2f77ee2efa44ef9.json",
      "size": 1332388,
      "sha256": "3c7cd5d0bfaeb52363cf30fa2387ce024b78070dc2ad51a2b2f77ee2efa44ef9"
    },
    {
      "path": "exports/candidates/weekly_boxscore/revisions/2026_REG_w02/index.json",
      "size": 156,
      "sha256": "7c0c0f2008f21a886ddb607a42db41e10f8088a62ddffefb44cf52c7cbd0eb6e"
    },
    {
      "path": "reviews/TIBER-Data-2026-REG-W02-independent-review.json",
      "size": 4368,
      "sha256": "dbd91cb453b16a84271efe94e9cda485cd4efea7ccc9e837327221a6e0fda901"
    },
    {
      "path": "reviews/TIBER-Data-2026-REG-W02-independent-review.md",
      "size": 8780,
      "sha256": "1a475403df6197256ce599aaf1953ede6b585b2cf19b87a95e1ce82b90f384b5"
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
      "path": "scripts/publish_weekly_boxscore_candidate_v0.py",
      "size": 8330,
      "sha256": "dea7944cd57f38c4a2374e6072a726f4cd89cb1c685d430ecd9c061d66165d71"
    }
  ]
} as const);
