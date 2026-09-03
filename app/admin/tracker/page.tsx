"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Player {
  id: string;
  name: string;
  team: { id: string; name: string; slug: string } | null;
}

type RawStat =
  | "points"
  | "rebounds"
  | "assists"
  | "three_pt_made"
  | "steals"
  | "blocks"
  | "turnovers";

const RAW_STATS: RawStat[] = [
  "points",
  "rebounds",
  "assists",
  "three_pt_made",
  "steals",
  "blocks",
  "turnovers",
];

type StatMap = Record<string, Partial<Record<RawStat, number>>>;

function emptyStats(): Partial<Record<RawStat, number>> {
  return {
    points: 0,
    rebounds: 0,
    assists: 0,
    three_pt_made: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
  };
}

const RESET_PHRASE = "RESET GAME";

export default function AdminTrackerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<StatMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    null,
  );
  const [bumpError, setBumpError] = useState<string | null>(
    null,
  );

  const [resetOpen, setResetOpen] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(
    null,
  );

  const isFirstLoad = useRef(true);

  async function load() {
    try {
      const res = await fetch("/api/admin/live-stats");
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data?.error ?? "Couldn't load players.");
        return;
      }

      setLoadError(data.statsError ?? null);
      setPlayers(data.players ?? []);

      const next: StatMap = {};
      for (const p of data.players ?? []) {
        next[p.id] = emptyStats();
      }
      for (const row of data.stats ?? []) {
        if (!next[row.player_id]) next[row.player_id] = emptyStats();
        next[row.player_id][row.stat_type as RawStat] = row.value;
      }
      setStats(next);
    } catch {
      setLoadError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }

  useEffect(() => {
    load();
    // Light polling so multiple trackers roughly see each
    // other's updates without needing realtime infrastructure.
    const interval = window.setInterval(load, 7000);
    return () => window.clearInterval(interval);
  }, []);

  const selected = players.find((p) => p.id === selectedId) ?? null;

  const young = useMemo(
    () => players.filter((p) => p.team?.slug === "youngknights"),
    [players],
  );
  const alum = useMemo(
    () => players.filter((p) => p.team?.slug === "alumknights"),
    [players],
  );

  async function bump(
    playerId: string,
    statType: RawStat,
    delta: number,
  ) {
    // Optimistic update so it feels instant courtside.
    setStats((current) => {
      const playerStats = current[playerId] ?? emptyStats();
      const nextVal = Math.max(
        (playerStats[statType] ?? 0) + delta,
        0,
      );
      return {
        ...current,
        [playerId]: { ...playerStats, [statType]: nextVal },
      };
    });

    setPending(true);
    setBumpError(null);
    try {
      const res = await fetch("/api/admin/live-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, statType, delta }),
      });
      const data = await res.json();

      if (!res.ok) {
        setBumpError(data?.error ?? "That tap didn't save.");
        // Resync with the server since the optimistic update
        // above didn't actually take, so it would otherwise
        // silently drift out of sync.
        await load();
        return;
      }

      if (data.stats) {
        setStats((current) => {
          const merged = { ...emptyStats() };
          for (const row of data.stats) {
            merged[row.stat_type as RawStat] = row.value;
          }
          return { ...current, [playerId]: merged };
        });
      }
    } catch {
      setBumpError(
        "Couldn't reach the server, that tap didn't save.",
      );
      await load();
    } finally {
      setPending(false);
    }
  }

  async function bumpPoints(
    playerId: string,
    points: number,
    isThree: boolean,
  ) {
    await bump(playerId, "points", points);
    if (isThree) {
      await bump(playerId, "three_pt_made", points > 0 ? 1 : -1);
    }
  }

  async function handleReset() {
    if (resetInput !== RESET_PHRASE) return;

    const confirmed = window.confirm(
      "This wipes every tracked stat, every prop result, and " +
        "resets every card back to pending. Submissions themselves " +
        "are not deleted. This can't be undone. Continue?",
    );
    if (!confirmed) return;

    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/admin/live-stats/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: resetInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResetError(data?.error ?? "Reset failed.");
        return;
      }

      setResetInput("");
      setResetOpen(false);
      await load();
    } catch {
      setResetError("Something went wrong. Try again.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-bone/40">
        Loading tracker...
      </p>
    );
  }

  // -------------------------------------------------------
  // Player picker
  // -------------------------------------------------------
  if (!selected) {
    return (
      <div className="max-w-2xl space-y-6">
        <p className="text-sm text-bone/50">
          Pick the player you're watching. Taps save instantly,
          everyone tracking sees roughly-live totals within a
          few seconds.
        </p>

        {loadError && (
          <div className="rounded-xl border border-young/40 bg-young/10 p-3 text-sm text-young-light">
            {loadError}
          </div>
        )}

        {players.length === 0 && !loadError && (
          <div className="rounded-xl border border-line bg-panel p-3 text-sm text-bone/40">
            No active players found. Add players under Players first.
          </div>
        )}

        <TeamColumn
          label="YOUNGKNIGHTS"
          accent="text-young-light"
          players={young}
          stats={stats}
          onSelect={setSelectedId}
        />
        <TeamColumn
          label="ALUMKNIGHTS"
          accent="text-alum-light"
          players={alum}
          stats={stats}
          onSelect={setSelectedId}
        />

        <div className="rounded-2xl border border-young/30 bg-young/[0.04] p-4">
          {!resetOpen ? (
            <button
              onClick={() => setResetOpen(true)}
              className="text-xs font-medium text-young-light/70 underline underline-offset-2 hover:text-young-light"
            >
              Reset everything
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-bone/50">
                Wipes every tracked stat and every graded result
                back to pending. Use this to clear a practice run
                before the real game. Type{" "}
                <span className="font-mono font-bold text-bone">
                  {RESET_PHRASE}
                </span>{" "}
                to confirm.
              </p>
              <input
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder={RESET_PHRASE}
                className="w-full rounded-lg border border-line bg-panelLight px-3 py-2 font-mono text-sm uppercase text-bone placeholder:text-bone/25"
              />
              {resetError && (
                <p className="text-xs text-young-light">
                  {resetError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={
                    resetInput !== RESET_PHRASE || resetting
                  }
                  className="rounded-lg bg-young px-4 py-2 text-xs font-bold text-white disabled:opacity-30"
                >
                  {resetting ? "Resetting..." : "Reset Everything"}
                </button>
                <button
                  onClick={() => {
                    setResetOpen(false);
                    setResetInput("");
                    setResetError(null);
                  }}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-bone/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // Focused tracker panel for the selected player
  // -------------------------------------------------------
  const s = stats[selected.id] ?? emptyStats();

  return (
    <div className="max-w-md space-y-5">
      <button
        onClick={() => setSelectedId(null)}
        className="text-sm font-medium text-bone/50 underline underline-offset-2"
      >
        ← Change player
      </button>

      <div className="rounded-2xl border border-line bg-panel p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bone/40">
          {selected.team?.name ?? ""}
        </p>
        <h1 className="font-display text-2xl font-black text-bone">
          {selected.name}
        </h1>
      </div>

      {/* Scoring */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-bone/40">
            POINTS
          </p>
          <p className="font-display text-3xl text-bone">
            {s.points ?? 0}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ScoreButton
            label="FT"
            sub="+1"
            onClick={() => bumpPoints(selected.id, 1, false)}
            onUndo={() => bumpPoints(selected.id, -1, false)}
          />
          <ScoreButton
            label="2PT"
            sub="+2"
            onClick={() => bumpPoints(selected.id, 2, false)}
            onUndo={() => bumpPoints(selected.id, -2, false)}
          />
          <ScoreButton
            label="3PT"
            sub="+3"
            onClick={() => bumpPoints(selected.id, 3, true)}
            onUndo={() => bumpPoints(selected.id, -3, true)}
          />
        </div>
      </div>

      {/* Other raw stats */}
      <div className="space-y-2">
        <StatRow
          label="REBOUNDS"
          value={s.rebounds ?? 0}
          onInc={() => bump(selected.id, "rebounds", 1)}
          onDec={() => bump(selected.id, "rebounds", -1)}
        />
        <StatRow
          label="ASSISTS"
          value={s.assists ?? 0}
          onInc={() => bump(selected.id, "assists", 1)}
          onDec={() => bump(selected.id, "assists", -1)}
        />
        <StatRow
          label="STEALS"
          value={s.steals ?? 0}
          onInc={() => bump(selected.id, "steals", 1)}
          onDec={() => bump(selected.id, "steals", -1)}
        />
        <StatRow
          label="BLOCKS"
          value={s.blocks ?? 0}
          onInc={() => bump(selected.id, "blocks", 1)}
          onDec={() => bump(selected.id, "blocks", -1)}
        />
        <StatRow
          label="TURNOVERS"
          value={s.turnovers ?? 0}
          onInc={() => bump(selected.id, "turnovers", 1)}
          onDec={() => bump(selected.id, "turnovers", -1)}
        />
      </div>

      <p
        className={`text-center text-xs ${
          bumpError ? "text-young-light" : "text-bone/25"
        }`}
      >
        {pending ? "Saving..." : bumpError ?? "3-PT MADE tracked automatically off the 3PT button."}
      </p>
    </div>
  );
}

function TeamColumn({
  label,
  accent,
  players,
  stats,
  onSelect,
}: {
  label: string;
  accent: string;
  players: Player[];
  stats: StatMap;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p
        className={`mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${accent}`}
      >
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="rounded-xl border border-line bg-panel px-3 py-3 text-left transition hover:border-bone/30"
          >
            <p className="truncate text-sm font-semibold text-bone">
              {p.name}
            </p>
            <p className="text-xs text-bone/35">
              {stats[p.id]?.points ?? 0} pts
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreButton({
  label,
  sub,
  onClick,
  onUndo,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className="flex h-16 w-full flex-col items-center justify-center rounded-xl bg-bone font-head text-sm font-black text-ink active:scale-95"
      >
        {label}
        <span className="text-xs font-bold opacity-60">{sub}</span>
      </button>
      <button
        onClick={onUndo}
        className="text-[10px] font-medium text-bone/30 underline underline-offset-2 hover:text-bone/60"
      >
        undo
      </button>
    </div>
  );
}

function StatRow({
  label,
  value,
  onInc,
  onDec,
}: {
  label: string;
  value: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-bone/50">
        {label}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onDec}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-bone/50 active:scale-95"
        >
          −
        </button>
        <span className="w-8 text-center font-display text-xl text-bone">
          {value}
        </span>
        <button
          onClick={onInc}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-bone font-black text-ink active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
