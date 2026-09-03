"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface Player {
  id: string;
  name: string;
  image_url: string | null;
  team: { id: string; name: string; slug: string } | null;
}

type RawStat =
  | "points"
  | "rebounds"
  | "assists"
  | "three_pt_made"
  | "three_pt_attempted"
  | "steals"
  | "blocks"
  | "turnovers"
  | "fouls"
  | "field_goals_made"
  | "field_goals_attempted"
  | "ft_made"
  | "ft_attempted";

type StatMap = Record<string, Partial<Record<RawStat, number>>>;

const ALL_RAW_STATS: RawStat[] = [
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
];

function emptyStats(): Partial<Record<RawStat, number>> {
  const obj: Partial<Record<RawStat, number>> = {};
  for (const s of ALL_RAW_STATS) obj[s] = 0;
  return obj;
}

// A "shot type" bundles everything one tap of MAKE or MISS
// should update. Kept here as data rather than duplicated
// button logic, since these are the same numbers the box
// score sheet (End Game) reads back out later.
const SHOT_TYPES: {
  key: string;
  label: string;
  make: [RawStat, number][];
  miss: [RawStat, number][];
}[] = [
  {
    key: "ft",
    label: "FT",
    make: [
      ["points", 1],
      ["ft_made", 1],
      ["ft_attempted", 1],
    ],
    miss: [["ft_attempted", 1]],
  },
  {
    key: "2pt",
    label: "2PT",
    make: [
      ["points", 2],
      ["field_goals_made", 1],
      ["field_goals_attempted", 1],
    ],
    miss: [["field_goals_attempted", 1]],
  },
  {
    key: "3pt",
    label: "3PT",
    make: [
      ["points", 3],
      ["field_goals_made", 1],
      ["field_goals_attempted", 1],
      ["three_pt_made", 1],
      ["three_pt_attempted", 1],
    ],
    miss: [
      ["field_goals_attempted", 1],
      ["three_pt_attempted", 1],
    ],
  },
];

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

    try {
      const res = await fetch("/api/admin/live-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, statType, delta }),
      });
      const data = await res.json();

      if (!res.ok) {
        setBumpError(data?.error ?? "That tap didn't save.");
        await load();
        return false;
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
      return true;
    } catch {
      setBumpError(
        "Couldn't reach the server, that tap didn't save.",
      );
      await load();
      return false;
    }
  }

  // Applies every (stat, delta) pair in one logical action, e.g.
  // a made 3 bumps points, field_goals_made/attempted, AND
  // three_pt_made/attempted together. Pass negative deltas to
  // undo the same action.
  async function bumpMulti(
    playerId: string,
    entries: [RawStat, number][],
  ) {
    setPending(true);
    setBumpError(null);
    try {
      for (const [statType, delta] of entries) {
        const ok = await bump(playerId, statType, delta);
        if (!ok) return;
      }
    } finally {
      setPending(false);
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-md text-sm text-bone/50">
            Pick the player you're watching. Taps save instantly,
            everyone tracking sees roughly-live totals within a
            few seconds.
          </p>

          <Link
            href="/admin/boxscore"
            className="shrink-0 rounded-xl bg-bone px-4 py-2.5 text-center font-head text-xs font-black uppercase tracking-wider text-ink"
          >
            🏁 END GAME → BOX SCORE
          </Link>
        </div>

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

      <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
        <PlayerPhoto
          url={selected.image_url}
          name={selected.name}
          size={56}
        />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bone/40">
            {selected.team?.name ?? ""}
          </p>
          <h1 className="font-display text-2xl font-black text-bone">
            {selected.name}
          </h1>
        </div>
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
          {SHOT_TYPES.map((shot) => (
            <ShotButtons
              key={shot.key}
              label={shot.label}
              onMake={() => bumpMulti(selected.id, shot.make)}
              onMiss={() => bumpMulti(selected.id, shot.miss)}
              onUndoMake={() =>
                bumpMulti(
                  selected.id,
                  shot.make.map(([s2, d]) => [s2, -d]),
                )
              }
              onUndoMiss={() =>
                bumpMulti(
                  selected.id,
                  shot.miss.map(([s2, d]) => [s2, -d]),
                )
              }
            />
          ))}
        </div>

        <p className="mt-2 text-center text-[10px] text-bone/30">
          FG {s.field_goals_made ?? 0}-{s.field_goals_attempted ?? 0}
          {"  ·  "}3PT {s.three_pt_made ?? 0}-{s.three_pt_attempted ?? 0}
          {"  ·  "}FT {s.ft_made ?? 0}-{s.ft_attempted ?? 0}
        </p>
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
        <StatRow
          label="FOULS"
          value={s.fouls ?? 0}
          onInc={() => bump(selected.id, "fouls", 1)}
          onDec={() => bump(selected.id, "fouls", -1)}
        />
      </div>

      <p
        className={`text-center text-xs ${
          bumpError ? "text-young-light" : "text-bone/25"
        }`}
      >
        {pending
          ? "Saving..."
          : bumpError ??
            "Turnovers and fouls are tracked for the box score, they aren't bettable in the app."}
      </p>
    </div>
  );
}

function PlayerPhoto({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: number;
}) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full border border-line bg-panelLight font-head text-sm font-bold text-bone/40"
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full border border-line object-cover"
    />
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
            className="flex items-center gap-2.5 rounded-xl border border-line bg-panel px-3 py-2.5 text-left transition hover:border-bone/30"
          >
            <PlayerPhoto url={p.image_url} name={p.name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-bone">
                {p.name}
              </p>
              <p className="text-xs text-bone/35">
                {stats[p.id]?.points ?? 0} pts
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShotButtons({
  label,
  onMake,
  onMiss,
  onUndoMake,
  onUndoMiss,
}: {
  label: string;
  onMake: () => void;
  onMiss: () => void;
  onUndoMake: () => void;
  onUndoMiss: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-mono text-[10px] font-bold text-bone/40">
        {label}
      </p>
      <button
        onClick={onMake}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-bone font-head text-xs font-black text-ink active:scale-95"
      >
        MAKE
      </button>
      <button
        onClick={onMiss}
        className="flex h-9 w-full items-center justify-center rounded-lg border border-line text-xs font-bold text-bone/50 active:scale-95"
      >
        MISS
      </button>
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={onUndoMake}
          className="text-[9px] font-medium text-bone/25 underline underline-offset-2 hover:text-bone/60"
        >
          undo make
        </button>
        <button
          onClick={onUndoMiss}
          className="text-[9px] font-medium text-bone/25 underline underline-offset-2 hover:text-bone/60"
        >
          undo miss
        </button>
      </div>
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
