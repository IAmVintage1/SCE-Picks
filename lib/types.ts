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
}

export interface Prop {
  id: string;
  player_id: string;
  stat_type: StatType;
  line: number;
  active: boolean;
  locked: boolean;
}

export interface PropWithPlayer extends Prop {
  player: Player & { team: Team };
}

export interface PickSlipItem {
  propId: string;
  playerId: string;
  playerName: string;
  teamName: string;
  statType: StatType;
  line: number;
  selection: "over" | "under";
}

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
}
