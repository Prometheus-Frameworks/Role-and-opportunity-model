export interface RoleOpportunityLabRow {
  player_id: string;
  player_name: string;
  team: string;
  position: 'WR' | 'TE';
  season: number;
  week: number;
  primary_role: string;
  role_tags: string[];
  route_participation: number | null;
  target_share: number | null;
  air_yard_share: number | null;
  snap_share: number | null;
  usage_rate: number | null;
  confidence_score: number;
  confidence_tier: 'low' | 'medium' | 'high';
  source_name: string;
  source_type: 'deterministic_model';
  model_version: string;
  generated_at: string;
  insights: string[];
  raw_fields: Record<string, unknown>;
}

export interface RoleOpportunityLabEnvelope {
  season: number;
  week: number;
  season_scope_marker: string;
  available_seasons: number[];
  rows: RoleOpportunityLabRow[];
  source: {
    name: string;
    type: 'deterministic_export';
    model_version: string;
    generated_at: string;
    artifact_path: string;
    deterministic: true;
  };
}
