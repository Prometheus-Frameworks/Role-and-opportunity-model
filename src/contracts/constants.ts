export const EXPLANATION_LEVELS = ['short', 'standard', 'full'] as const;
export type ExplanationLevel = (typeof EXPLANATION_LEVELS)[number];

export const VERDICTS = ['strong', 'solid', 'mixed', 'weak'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const SCORE_BANDS = ['elite', 'good', 'mixed', 'poor'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const ROLE_EVALUATION_FLAGS = [
  'high-role-value',
  'favorable-environment',
  'stable-role',
  'vacated-volume',
  'featured-usage',
  'crowded-target-tree',
  'injury-risk',
  'environment-volatility',
] as const;
export type RoleEvaluationFlag = (typeof ROLE_EVALUATION_FLAGS)[number];

export const SCORE_BAND_THRESHOLDS = {
  elite: 80,
  good: 65,
  mixed: 45,
} as const;

export const VERDICT_THRESHOLDS = {
  strong: 75,
  solid: 62,
  mixed: 48,
} as const;
