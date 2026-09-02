export type StatType =
  | "points"
  | "rebounds"
  | "assists"
  | "three_pt_made"
  | "steals"
  | "blocks"
  | "turnovers"
  | "points_rebounds"
  | "points_assists"
  | "rebounds_assists"
  | "rebounds_blocks"
  | "pra";

export const STAT_LABELS: Record<StatType, string> = {
  points: "POINTS",
  rebounds: "REBOUNDS",
  assists: "ASSISTS",
  three_pt_made: "3PT MADE",
  steals: "STEALS",
  blocks: "BLOCKS",
  turnovers: "TURNOVERS",
  points_rebounds: "PTS + REB",
  points_assists: "PTS + AST",
  rebounds_assists: "REB + AST",
  rebounds_blocks: "REB + BLK",
  pra: "PRA",
};

export const STAT_SHORT: Record<StatType, string> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
  three_pt_made: "3PM",
  steals: "STL",
  blocks: "BLK",
  turnovers: "TOV",
  points_rebounds: "PTS+REB",
  points_assists: "PTS+AST",
  rebounds_assists: "REB+AST",
  rebounds_blocks: "REB+BLK",
  pra: "PRA",
};

export interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  team_id: string;
  image_url: string | null;
  active: boolean;
  bio_tags: string[] | null;
  bio: string | null;
}

export interface Prop {
  id: string;
  player_id: string;
  stat_type: StatType;
  line: number;
  active: boolean;
  locked: boolean;
  featured: boolean;
}

export interface PropWithPlayer extends Prop {
  player: Player & { team: Team };
}

// "over"/"under" are the stored DB values (kept for schema
// compatibility); the product-facing language is MORE / LESS.
export type Selection = "over" | "under";

export interface PickSlipItem {
  propId: string;
  playerId: string;
  playerName: string;
  teamName: string;
  statType: StatType;
  line: number;
  selection: Selection;
}

export type TeamPropType = "winning_team" | "combined_points";

export interface TeamProp {
  id: string;
  prop_type: TeamPropType;
  line: number | null;
  featured: boolean;
  active: boolean;
  locked: boolean;
}

export interface TeamPickItem {
  teamPropId: string;
  propType: TeamPropType;
  label: string;
  selection: string; // team slug for winning_team, "more"/"less" for combined_points
  line: number | null;
}

// Any single leg on the card, player prop or team prop, in one
// shape so the pick card can render/count them uniformly.
export type CardLeg =
  | ({ kind: "player" } & PickSlipItem)
  | ({ kind: "team" } & TeamPickItem);

export const CARD_TIERS = [3, 5, 10] as const;
export type CardTier = (typeof CARD_TIERS)[number];

export interface EventSettings {
  event_name: string;
  event_date: string | null;
  venue: string | null;
  event_logo_url: string | null;
  young_logo_url: string | null;
  alum_logo_url: string | null;
  pick_lock_time: string | null;
  picks_locked: boolean;
  leaderboard_visible: boolean;
  email_required: boolean;
  instagram_required: boolean;
  min_picks: number;
  prize_3: string;
  prize_5: string;
  prize_10: string;
}
