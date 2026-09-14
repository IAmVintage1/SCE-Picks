"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { STAT_SHORT } from "@/lib/types";

type PropRow = {
  id: string;
  stat_type: keyof typeof STAT_SHORT;
  line: number;
  active: boolean;
  player_id: string;
  player_name: string;
  image_url: string | null;
  team_name: string;
  team_slug: string;
  actual_value: number | null;
  result: "hit" | "miss" | "push" | null;
  live_actual: number;
};

type TeamPropRow = {
  id: string;
  prop_type: "winning_team" | "combined_points";
  line: number | null;
  actual_value: number | null;
  winning_team_slug: string | null;
};

type TeamScore = {
  team_slug: string;
  team_name: string;
  points: number;
};

type ResultsState = {
  props: PropRow[];
  teamProps: TeamPropRow[];
  scores: TeamScore[];
  summary: {
    playerPropsTotal: number;
    playerPropsGraded: number;
    teamPropsTotal: number;
    teamPropsGraded: number;
    cards: Record<string, number>;
  };
};

function resultClasses(result: PropRow["result"]) {
  if (result === "hit") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (result === "miss") return "border-young/30 bg-young/10 text-young-light";
  if (result === "push") return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return "border-line bg-panel text-bone/40";
}

function statusLabel(result: PropRow["result"]) {
  return result ? result.toUpperCase() : "LIVE";
}

export default function AdminResultsPage() {
  const [data, setData] = useState<ResultsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalMessage, setFinalMessage] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/results", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Couldn't load results.");
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load results.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const youngScore = Number(
    data?.scores.find((s) => s.team_slug === "youngknights")?.points ?? 0,
  );
  const alumScore = Number(
    data?.scores.find((s) => s.team_slug === "alumknights")?.points ?? 0,
  );

  const progress = data
    ? data.summary.playerPropsTotal + data.summary.teamPropsTotal === 0
      ? 0
      : Math.round(
          ((data.summary.playerPropsGraded + data.summary.teamPropsGraded) /
            (data.summary.playerPropsTotal + data.summary.teamPropsTotal)) *
            100,
        )
    : 0;

  const grouped = useMemo(() => {
    const props = data?.props ?? [];
    return {
      young: props.filter((p) => p.team_slug === "youngknights"),
      alum: props.filter((p) => p.team_slug === "alumknights"),
    };
  }, [data]);

  async function savePlayer(propId: string, value: number) {
    setSavingId(propId);
    setError(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "player", propId, actualValue: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Couldn't save result.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save result.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveTeam(
    teamPropId: string,
    actualValue?: number,
    winningTeamSlug?: string,
  ) {
    setSavingId(teamPropId);
    setError(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "team",
          teamPropId,
          actualValue,
          winningTeamSlug,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Couldn't save game result.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save game result.");
    } finally {
      setSavingId(null);
    }
  }

  async function finalizeGame() {
    const confirmed = window.confirm(
      "Finalize the game from the Live Tracker? This will write every player result, combined points, determine the winning team, and grade every submitted card.",
    );
    if (!confirmed) return;

    setFinalizing(true);
    setError(null);
    setFinalMessage(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Couldn't finalize game.");
      setData(body.state);
      const f = body.final;
      setFinalMessage(
        `Finalized: YoungKnights ${f.young} – AlumKnights ${f.alum}. All cards regraded.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't finalize game.");
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-line bg-panel p-8 text-center text-sm text-bone/40">
        Loading live game results...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-young/30 bg-young/10 p-5 text-sm text-young-light">
        {error ?? "Couldn't load results."}
      </div>
    );
  }

  const winningProp = data.teamProps.find((p) => p.prop_type === "winning_team");
  const combinedProp = data.teamProps.find((p) => p.prop_type === "combined_points");
  const cardCounts = data.summary.cards;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <section className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-panel via-panel to-black">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-bone/35">
                LIVE GAME → RESULTS
              </p>
              <h1 className="mt-1 font-display text-4xl uppercase text-bone">
                Game Results
              </h1>
              <p className="mt-2 max-w-xl text-sm text-bone/45">
                Player results and combined points are linked to the Live Tracker.
                Finalize once the game is over to lock the winner and grade every card.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/tracker"
                className="rounded-xl border border-line px-3 py-2 text-xs font-bold uppercase tracking-wider text-bone/60 hover:text-bone"
              >
                ← Live Tracker
              </Link>
              <Link
                href="/admin/boxscore"
                className="rounded-xl border border-line px-3 py-2 text-xs font-bold uppercase tracking-wider text-bone/60 hover:text-bone"
              >
                Box Score
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-7 sm:px-7">
          <ScoreBlock label="YOUNGKNIGHTS" score={youngScore} side="young" />
          <div className="font-mono text-xs font-black tracking-[0.2em] text-bone/25">VS</div>
          <ScoreBlock label="ALUMKNIGHTS" score={alumScore} side="alum" />
        </div>

        <div className="border-t border-line px-5 py-4 sm:px-7">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-[0.14em] text-bone/40">
              Grading progress
            </span>
            <span className="font-bold text-bone">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-bone transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-bone/40">
            <span>
              Player props: {data.summary.playerPropsGraded}/{data.summary.playerPropsTotal}
            </span>
            <span>
              Game props: {data.summary.teamPropsGraded}/{data.summary.teamPropsTotal}
            </span>
            <span>Cards pending: {cardCounts.pending ?? 0}</span>
            <span>Perfect: {cardCounts.perfect ?? 0}</span>
            <span>Busted: {cardCounts.busted ?? 0}</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-young/30 bg-young/10 px-4 py-3 text-sm text-young-light">
          {error}
        </div>
      )}
      {finalMessage && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          {finalMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <GamePropCard
          title="Winning Team"
          eyebrow="GAME PROP"
          value={
            winningProp?.winning_team_slug === "youngknights"
              ? "YOUNGKNIGHTS"
              : winningProp?.winning_team_slug === "alumknights"
                ? "ALUMKNIGHTS"
                : "Not final"
          }
          side={winningProp?.winning_team_slug ?? null}
        >
          {winningProp && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => saveTeam(winningProp.id, undefined, "youngknights")}
                disabled={savingId === winningProp.id}
                className="rounded-xl border border-young/30 bg-young/10 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-young-light"
              >
                YoungKnights
              </button>
              <button
                onClick={() => saveTeam(winningProp.id, undefined, "alumknights")}
                disabled={savingId === winningProp.id}
                className="rounded-xl border border-alum/30 bg-alum/10 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-alum-light"
              >
                AlumKnights
              </button>
            </div>
          )}
        </GamePropCard>

        <GamePropCard
          title="Combined Points"
          eyebrow={combinedProp?.line != null ? `LINE ${combinedProp.line}` : "GAME PROP"}
          value={String(combinedProp?.actual_value ?? youngScore + alumScore)}
          side={null}
        >
          {combinedProp && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-bone/30">
                Manual override
              </span>
              <input
                type="number"
                step="0.5"
                defaultValue={combinedProp.actual_value ?? youngScore + alumScore}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value)) saveTeam(combinedProp.id, value);
                }}
                className="w-full rounded-xl border border-line bg-panelLight px-3 py-2.5 font-display text-lg text-bone outline-none focus:border-bone/30"
              />
            </label>
          )}
        </GamePropCard>
      </section>

      <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-bone/35">
              END OF GAME
            </p>
            <h2 className="mt-1 font-display text-2xl uppercase text-bone">
              Finalize & Grade Everything
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-bone/40">
              Pulls every final stat from Live Tracker, writes all player results,
              calculates combined points, determines the winner from the score,
              and regrades every submitted card.
            </p>
          </div>
          <button
            onClick={finalizeGame}
            disabled={finalizing || youngScore === alumScore}
            className="rounded-2xl bg-bone px-5 py-3 font-head text-sm font-black uppercase tracking-wider text-ink transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {finalizing ? "FINALIZING..." : "FINALIZE GAME"}
          </button>
        </div>
        {youngScore === alumScore && (
          <p className="mt-3 text-xs text-amber-200/70">
            Finalize is disabled while the score is tied.
          </p>
        )}
      </section>

      <PlayerResultsSection
        title="YOUNGKNIGHTS"
        accent="young"
        props={grouped.young}
        savingId={savingId}
        onSave={savePlayer}
      />
      <PlayerResultsSection
        title="ALUMKNIGHTS"
        accent="alum"
        props={grouped.alum}
        savingId={savingId}
        onSave={savePlayer}
      />
    </div>
  );
}

function ScoreBlock({
  label,
  score,
  side,
}: {
  label: string;
  score: number;
  side: "young" | "alum";
}) {
  const color = side === "young" ? "text-young-light" : "text-alum-light";
  return (
    <div className={side === "alum" ? "text-right" : ""}>
      <p className={`font-mono text-[10px] font-black uppercase tracking-[0.16em] ${color}`}>
        {label}
      </p>
      <p className="font-display text-6xl leading-none text-bone sm:text-7xl">{score}</p>
    </div>
  );
}

function GamePropCard({
  title,
  eyebrow,
  value,
  side,
  children,
}: {
  title: string;
  eyebrow: string;
  value: string;
  side: string | null;
  children: React.ReactNode;
}) {
  const border =
    side === "youngknights"
      ? "border-young/35"
      : side === "alumknights"
        ? "border-alum/35"
        : "border-line";
  return (
    <div className={`rounded-3xl border ${border} bg-panel p-5`}>
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-bone/30">
        {eyebrow}
      </p>
      <p className="mt-1 text-sm font-semibold text-bone/60">{title}</p>
      <p className="my-4 font-display text-4xl uppercase text-bone">{value}</p>
      {children}
    </div>
  );
}

function PlayerResultsSection({
  title,
  accent,
  props,
  savingId,
  onSave,
}: {
  title: string;
  accent: "young" | "alum";
  props: PropRow[];
  savingId: string | null;
  onSave: (propId: string, value: number) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, PropRow[]>();
    for (const prop of props) {
      if (!map.has(prop.player_id)) map.set(prop.player_id, []);
      map.get(prop.player_id)!.push(prop);
    }
    return [...map.values()];
  }, [props]);

  const heading = accent === "young" ? "text-young-light" : "text-alum-light";
  const border = accent === "young" ? "border-young/25" : "border-alum/25";

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`font-display text-2xl uppercase ${heading}`}>{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-bone/30">
          {props.length} props
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {grouped.map((playerProps) => {
          const player = playerProps[0];
          return (
            <div key={player.player_id} className={`overflow-hidden rounded-3xl border ${border} bg-panel`}>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                {player.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.image_url}
                    alt={player.player_name}
                    className="h-11 w-11 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panelLight font-display text-lg text-bone/30">
                    {player.player_name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-head text-sm font-black text-bone">{player.player_name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-bone/30">
                    {player.team_name}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-line">
                {playerProps.map((prop) => {
                  const displayActual = prop.actual_value ?? prop.live_actual;
                  return (
                    <div key={prop.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-bone/55">
                            {STAT_SHORT[prop.stat_type]}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wider ${resultClasses(prop.result)}`}>
                            {statusLabel(prop.result)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-bone/35">
                          Line {prop.line} · Live {prop.live_actual}
                        </p>
                      </div>

                      <div className="text-right">
                        <input
                          type="number"
                          step="0.5"
                          defaultValue={displayActual}
                          onBlur={(e) => {
                            const value = Number(e.target.value);
                            if (Number.isFinite(value) && value !== displayActual) {
                              onSave(prop.id, value);
                            }
                          }}
                          className="w-20 rounded-lg border border-line bg-panelLight px-2 py-1.5 text-right font-display text-xl text-bone outline-none focus:border-bone/30"
                        />
                        {savingId === prop.id && (
                          <p className="mt-1 text-[9px] text-bone/30">Saving...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
