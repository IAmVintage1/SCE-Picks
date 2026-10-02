export const RAW_STATS = [
  "points",
  "rebounds",
  "assists",
  "three_pt_made",
  "three_pt_attempted",
  "steals",
  "blocks",
  "turnovers",
  "fouls",
  "field_goals_made",
  "field_goals_attempted",
  "ft_made",
  "ft_attempted",
] as const;
export type RawStat = (typeof RAW_STATS)[number];
export type LivePlayer = {
  id: string;
  name: string;
  image_url: string | null;
  team: { id: string; name: string; slug: string };
  stats: Partial<Record<RawStat, number>>;
};
export type BroadcastState = {
  revision: number;
  period: number;
  clock_seconds: number;
  clock_running: boolean;
  clock_started_at: string | null;
  status: "pregame" | "live" | "final";
  scoreboard_visible: boolean;
  boxscore_visible: boolean;
  player_visible: boolean;
  boxscore_team: string;
  featured_player_id: string | null;
  token_version: number;
  updated_at: string;
};
export type LiveSnapshot = {
  state: BroadcastState;
  players: LivePlayer[];
  scores: Record<string, number>;
  serverTime: number;
};
export function clockRemaining(state: BroadcastState, now: number) {
  return Math.max(
    0,
    state.clock_seconds -
      (state.clock_running && state.clock_started_at
        ? Math.floor((now - Date.parse(state.clock_started_at)) / 1000)
        : 0),
  );
}
export function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function validDeltas(
  value: unknown,
): value is Partial<Record<RawStat, number>> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(
      ([k, v]) =>
        RAW_STATS.includes(k as RawStat) &&
        typeof v === "number" &&
        Number.isInteger(v) &&
        v !== 0 &&
        Math.abs(v) <= 100,
    )
  );
}
