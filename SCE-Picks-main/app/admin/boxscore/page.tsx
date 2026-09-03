import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface PlayerRow {
  id: string;
  name: string;
  team_id: string;
  team: { id: string; name: string; slug: string } | null;
}

interface StatRow {
  player_id: string;
  stat_type: string;
  value: number;
}

interface Line {
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

function emptyLine(name: string): Line {
  return {
    name,
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    pf: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
  };
}

function addLines(a: Line, b: Line): Line {
  return {
    name: a.name,
    pts: a.pts + b.pts,
    reb: a.reb + b.reb,
    ast: a.ast + b.ast,
    stl: a.stl + b.stl,
    blk: a.blk + b.blk,
    tov: a.tov + b.tov,
    pf: a.pf + b.pf,
    fgm: a.fgm + b.fgm,
    fga: a.fga + b.fga,
    tpm: a.tpm + b.tpm,
    tpa: a.tpa + b.tpa,
    ftm: a.ftm + b.ftm,
    fta: a.fta + b.fta,
  };
}

async function getBoxScore() {
  const supabase = createAdminSupabase();

  const [{ data: settingsData }, { data: playersData }, { data: statsData }] =
    await Promise.all([
      supabase
        .from("event_settings")
        .select("event_name")
        .eq("id", 1)
        .single(),
      supabase
        .from("players")
        .select(
          "id, name, team_id, team:teams!players_team_id_fkey(id, name, slug)",
        )
        .eq("active", true)
        .order("name"),
      supabase.from("live_box_score").select("player_id, stat_type, value"),
    ]);

  const players = (playersData as unknown as PlayerRow[]) ?? [];
  const stats = (statsData as StatRow[]) ?? [];

  const statsByPlayer = new Map<string, Record<string, number>>();
  for (const row of stats) {
    if (!statsByPlayer.has(row.player_id)) {
      statsByPlayer.set(row.player_id, {});
    }
    statsByPlayer.get(row.player_id)![row.stat_type] = row.value;
  }

  function lineFor(player: PlayerRow): Line {
    const s = statsByPlayer.get(player.id) ?? {};
    return {
      name: player.name,
      pts: s.points ?? 0,
      reb: s.rebounds ?? 0,
      ast: s.assists ?? 0,
      stl: s.steals ?? 0,
      blk: s.blocks ?? 0,
      tov: s.turnovers ?? 0,
      pf: s.fouls ?? 0,
      fgm: s.field_goals_made ?? 0,
      fga: s.field_goals_attempted ?? 0,
      tpm: s.three_pt_made ?? 0,
      tpa: s.three_pt_attempted ?? 0,
      ftm: s.ft_made ?? 0,
      fta: s.ft_attempted ?? 0,
    };
  }

  const young = players
    .filter((p) => p.team?.slug === "youngknights")
    .map(lineFor);
  const alum = players
    .filter((p) => p.team?.slug === "alumknights")
    .map(lineFor);

  const youngTotal = young.reduce(
    (acc, l) => addLines(acc, l),
    emptyLine("TOTAL"),
  );
  const alumTotal = alum.reduce(
    (acc, l) => addLines(acc, l),
    emptyLine("TOTAL"),
  );

  return {
    eventName: settingsData?.event_name ?? "SCE Picks",
    young,
    alum,
    youngTotal,
    alumTotal,
  };
}

function pct(made: number, attempted: number): string {
  if (attempted === 0) return "-";
  return `${Math.round((made / attempted) * 100)}%`;
}

function BoxTable({
  label,
  accent,
  lines,
  total,
}: {
  label: string;
  accent: string;
  lines: Line[];
  total: Line;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-line bg-panel">
            <th
              className={`px-3 py-2.5 font-mono font-black uppercase tracking-[0.1em] ${accent}`}
            >
              {label}
            </th>
            {[
              "PTS",
              "REB",
              "AST",
              "STL",
              "BLK",
              "TOV",
              "PF",
              "FG",
              "FG%",
              "3PT",
              "3P%",
              "FT",
              "FT%",
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-center font-mono text-[10px] font-bold text-bone/40"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.name} className="border-b border-line/60">
              <td className="px-3 py-2 font-head font-bold text-bone">
                {l.name}
              </td>
              <td className="px-3 py-2 text-center font-display text-base text-bone">
                {l.pts}
              </td>
              <td className="px-3 py-2 text-center text-bone/70">
                {l.reb}
              </td>
              <td className="px-3 py-2 text-center text-bone/70">
                {l.ast}
              </td>
              <td className="px-3 py-2 text-center text-bone/70">
                {l.stl}
              </td>
              <td className="px-3 py-2 text-center text-bone/70">
                {l.blk}
              </td>
              <td className="px-3 py-2 text-center text-bone/70">
                {l.tov}
              </td>
              <td className="px-3 py-2 text-center text-bone/70">
                {l.pf}
              </td>
              <td className="px-3 py-2 text-center text-bone/50">
                {l.fgm}-{l.fga}
              </td>
              <td className="px-3 py-2 text-center text-bone/40">
                {pct(l.fgm, l.fga)}
              </td>
              <td className="px-3 py-2 text-center text-bone/50">
                {l.tpm}-{l.tpa}
              </td>
              <td className="px-3 py-2 text-center text-bone/40">
                {pct(l.tpm, l.tpa)}
              </td>
              <td className="px-3 py-2 text-center text-bone/50">
                {l.ftm}-{l.fta}
              </td>
              <td className="px-3 py-2 text-center text-bone/40">
                {pct(l.ftm, l.fta)}
              </td>
            </tr>
          ))}
          <tr className="bg-panel">
            <td className="px-3 py-2.5 font-head font-black uppercase text-bone">
              TOTAL
            </td>
            <td className="px-3 py-2.5 text-center font-display text-base text-bone">
              {total.pts}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-bone/80">
              {total.reb}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-bone/80">
              {total.ast}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-bone/80">
              {total.stl}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-bone/80">
              {total.blk}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-bone/80">
              {total.tov}
            </td>
            <td className="px-3 py-2.5 text-center font-bold text-bone/80">
              {total.pf}
            </td>
            <td className="px-3 py-2.5 text-center text-bone/60">
              {total.fgm}-{total.fga}
            </td>
            <td className="px-3 py-2.5 text-center text-bone/50">
              {pct(total.fgm, total.fga)}
            </td>
            <td className="px-3 py-2.5 text-center text-bone/60">
              {total.tpm}-{total.tpa}
            </td>
            <td className="px-3 py-2.5 text-center text-bone/50">
              {pct(total.tpm, total.tpa)}
            </td>
            <td className="px-3 py-2.5 text-center text-bone/60">
              {total.ftm}-{total.fta}
            </td>
            <td className="px-3 py-2.5 text-center text-bone/50">
              {pct(total.ftm, total.fta)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function BoxScorePage() {
  const { eventName, young, alum, youngTotal, alumTotal } =
    await getBoxScore();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bone/40">
            🏁 FINAL BOX SCORE
          </p>
          <h1 className="font-display text-3xl uppercase text-bone">
            {eventName}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bone/30">
            YOUNGKNIGHTS {youngTotal.pts} &middot; ALUMKNIGHTS{" "}
            {alumTotal.pts}
          </p>
        </div>
        <Link
          href="/admin/tracker"
          className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-bone/50 hover:text-bone"
        >
          ← Back to tracker
        </Link>
      </div>

      <p className="text-xs text-bone/30">
        📸 Screenshot this section (or the whole page) to post. This
        pulls live from whatever's been tracked so far, refresh after
        the final stat is logged.
      </p>

      <BoxTable
        label="YOUNGKNIGHTS"
        accent="text-young-light"
        lines={young}
        total={youngTotal}
      />
      <BoxTable
        label="ALUMKNIGHTS"
        accent="text-alum-light"
        lines={alum}
        total={alumTotal}
      />

      <div className="text-center">
        <p className="font-head text-xs font-black uppercase tracking-[0.15em] text-bone/50">
          SCE <span className="text-young-light">PICKS</span>
        </p>
      </div>
    </div>
  );
}
