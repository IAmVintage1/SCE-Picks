import { RAW_STATS } from "@/lib/live";

export interface ActionLogRow {
  id: string;
  player_id: string;
  player_name: string | null;
  team_name: string | null;
  label: string;
  deltas: Record<string, number>;
  created_at: string | Date;
  reversed_at: string | Date | null;
}

function csvCell(value: string | number): string {
  const text = typeof value === "string" && /^\s*[=+@-]/.test(value) ? `'${value}` : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function actionLogCsv(actions: ActionLogRow[]): string {
  const rows: (string | number)[][] = [[
    "Action ID", "Recorded At (UTC)", "Player ID", "Player", "Team", "Action",
    "Status", "Reversed At (UTC)", ...RAW_STATS.map((stat) => `${stat} delta`), "Raw Deltas JSON",
  ]];
  for (const action of actions) {
    rows.push([
      action.id, new Date(action.created_at).toISOString(), action.player_id,
      action.player_name ?? "Unknown player", action.team_name ?? "Unknown team", action.label,
      action.reversed_at ? "Reversed (undo or reset)" : "Active",
      action.reversed_at ? new Date(action.reversed_at).toISOString() : "",
      ...RAW_STATS.map((stat) => Number(action.deltas[stat] ?? 0)), JSON.stringify(action.deltas),
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
