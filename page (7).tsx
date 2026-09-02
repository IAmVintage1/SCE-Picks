import { createAdminSupabase } from "@/lib/supabase/admin";
import { STAT_SHORT, StatType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PickRow {
  id: string;
  selection: "over" | "under";
  prop: {
    id: string;
    stat_type: StatType;
    line: number;
    player: { id: string; name: string } | null;
  } | null;
}

async function getStats() {
  const supabase = createAdminSupabase();

  const [{ count: submissionCount }, { data: pickRows, count: pickCount }] =
    await Promise.all([
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      supabase
        .from("picks")
        .select(
          "id, selection, prop:props(id, stat_type, line, player:players(id, name))",
          { count: "exact" }
        ),
    ]);

  const rows = (pickRows as unknown as PickRow[]) ?? [];

  const playerCounts = new Map<string, number>();
  const propCounts = new Map<
    string,
    { label: string; count: number; over: number; under: number }
  >();

  for (const row of rows) {
    const playerName = row.prop?.player?.name;
    if (playerName) {
      playerCounts.set(playerName, (playerCounts.get(playerName) ?? 0) + 1);
    }
    if (row.prop) {
      const key = row.prop.id;
      const label = `${row.prop.player?.name ?? "Unknown"} — ${
        row.prop.line
      } ${STAT_SHORT[row.prop.stat_type]}`;
      const current = propCounts.get(key) ?? {
        label,
        count: 0,
        over: 0,
        under: 0,
      };
      current.count += 1;
      if (row.selection === "over") current.over += 1;
      else current.under += 1;
      propCounts.set(key, current);
    }
  }

  const topPlayer = [...playerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topProp = [...propCounts.values()].sort((a, b) => b.count - a.count)[0];

  return {
    submissionCount: submissionCount ?? 0,
    pickCount: pickCount ?? 0,
    topPlayer,
    topProp,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Participants" value={stats.submissionCount} />
        <StatCard label="Total picks" value={stats.pickCount} />
        <StatCard
          label="Top player"
          value={stats.topPlayer ? stats.topPlayer[0] : "—"}
          sub={stats.topPlayer ? `${stats.topPlayer[1]} picks` : undefined}
        />
        <StatCard
          label="Top prop"
          value={stats.topProp ? stats.topProp.label : "—"}
          sub={
            stats.topProp
              ? `${stats.topProp.over} over / ${stats.topProp.under} under`
              : undefined
          }
        />
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide text-bone/70">
          NEXT STEPS
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-bone/60">
          <li>1. Add players and upload photos under Players.</li>
          <li>2. Create props (stat + line) for each player under Props.</li>
          <li>3. Share the site link on Instagram once props are live.</li>
          <li>4. After the game, enter results — Phase 2 will grade picks automatically.</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-xs font-medium tracking-wide text-bone/40">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 truncate font-display text-xl font-bold text-bone">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-bone/40">{sub}</p>}
    </div>
  );
}
