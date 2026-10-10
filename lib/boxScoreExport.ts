export interface BoxScoreLine {
  name: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
}

export interface BoxScoreSnapshot {
  eventName: string;
  young: BoxScoreLine[];
  alum: BoxScoreLine[];
  youngTotal: BoxScoreLine;
  alumTotal: BoxScoreLine;
}

function cell(value: string | number): string {
  // Keep names as text in spreadsheet apps, including formula-like names.
  const text = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function pct(made: number, attempted: number): string {
  return attempted === 0 ? "" : `${Math.round((made / attempted) * 100)}%`;
}

export function boxScoreCsv(snapshot: BoxScoreSnapshot): string {
  const rows: (string | number)[][] = [[
    "Event", "Team", "Player", "PTS", "REB", "AST", "STL", "BLK", "TOV", "PF",
    "FGM", "FGA", "FG%", "3PM", "3PA", "3P%", "FTM", "FTA", "FT%",
  ]];
  for (const [team, lines, total] of [
    ["YoungKnights", snapshot.young, snapshot.youngTotal],
    ["AlumKnights", snapshot.alum, snapshot.alumTotal],
  ] as const) {
    for (const line of [...lines, total]) {
      rows.push([
        snapshot.eventName, team, line.name, line.pts, line.reb, line.ast, line.stl,
        line.blk, line.tov, line.pf, line.fgm, line.fga, pct(line.fgm, line.fga),
        line.tpm, line.tpa, pct(line.tpm, line.tpa), line.ftm, line.fta, pct(line.ftm, line.fta),
      ]);
    }
  }
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
