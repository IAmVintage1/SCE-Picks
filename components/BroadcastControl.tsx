"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LiveSnapshot } from "@/lib/live";
type Event = {
  id: string;
  name: string;
  label: string;
  created_at: string;
  reversed_at: string | null;
};
type Data = LiveSnapshot & { token: string; events: Event[] };
export default function BroadcastControl() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/broadcast", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setConnected(true);
    } catch (e) {
      setConnected(false);
      setError(e instanceof Error ? e.message : "Connection lost");
    }
  }, []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await load();
      if (active) timer = setTimeout(poll, 2500);
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load]);
  async function update(patch: Record<string, unknown>) {
    if (!data || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/broadcast", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, revision: data.state.revision }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change failed");
    } finally {
      await load();
      lock.current = false;
      setBusy(false);
    }
  }
  async function undo(eventId: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/live-stats", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, undo: true }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Undo failed");
    } finally {
      await load();
      lock.current = false;
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div>
        <p>{error || "Loading broadcast…"}</p>
        <button onClick={load}>Retry</button>
      </div>
    );
  const { state, scores, players, events } = data;
  const input = "rounded-lg border border-line bg-panel px-3 py-2 text-bone";
  const button =
    "min-h-12 rounded-xl bg-bone px-4 py-3 text-base font-bold text-ink disabled:opacity-40";
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">LIVE BROADCAST</h1>
        <span className={connected ? "text-green-400" : "text-young-light"}>
          {connected ? "● Connected" : "● Disconnected · last confirmed data"}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-young p-3 text-young-light"
        >
          {error}
        </p>
      )}
      <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <div className="grid grid-cols-3 items-center gap-3">
          <div className="text-young-light">
            <p className="text-xs sm:text-base">YOUNGKNIGHTS</p>
            <b className="text-4xl sm:text-5xl">{scores.youngknights}</b>
          </div>
          <div className="text-center">
            <p className="text-xs text-bone/50">CURRENT</p>
            <b className="text-2xl sm:text-3xl">
              {state.period <= 4 ? `Q${state.period}` : `OT${state.period - 4}`}
            </b>
          </div>
          <div className="text-right text-alum-light">
            <p className="text-xs sm:text-base">ALUMKNIGHTS</p>
            <b className="text-4xl sm:text-5xl">{scores.alumknights}</b>
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-bone/70">CHANGE QUARTER</p>
          <div className="grid grid-cols-5 gap-2" aria-label="Quarter controls">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                className={`${button} px-2 ${state.period === value ? "bg-young text-white ring-2 ring-young-light" : ""}`}
                disabled={busy || state.status === "final"}
                onClick={() => update({ period: value })}
              >
                {value <= 4 ? `Q${value}` : "OT1"}
              </button>
            ))}
          </div>
          {state.status === "final" && (
            <button
              className={button}
              disabled={busy}
              onClick={() => update({ status: "live" })}
            >
              Reopen stats for corrections
            </button>
          )}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {(["scoreboard", "boxscore", "player"] as const).map((kind) => (
          <section
            key={kind}
            className="rounded-xl border border-line bg-panel p-4 space-y-3"
          >
            <h2 className="font-head text-xl uppercase">
              {kind === "player" ? "Player spotlight" : kind}
            </h2>
            {kind === "scoreboard" && (
              <button
                className={`${button} w-full ${state.scoreboard_visible ? "bg-young text-white" : ""}`}
                disabled={busy}
                onClick={() => update({ scoreboard_visible: !state.scoreboard_visible })}
              >
                {state.scoreboard_visible ? "Hide Scoreboard" : "Show Scoreboard"}
              </button>
            )}
            {kind === "boxscore" && (
              <select
                className={`${input} w-full`}
                disabled={busy}
                value={state.boxscore_team}
                onChange={(e) => update({ boxscore_team: e.target.value })}
              >
                <option value="both">Both teams</option>
                <option value="youngknights">YoungKnights</option>
                <option value="alumknights">AlumKnights</option>
              </select>
            )}
            {kind === "player" && (
              <select
                aria-label="Featured player"
                className={`${input} w-full`}
                disabled={busy}
                value={state.featured_player_id || ""}
                onChange={(e) =>
                  update({ featured_player_id: e.target.value || null })
                }
              >
                <option value="">Select player</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.team.name}
                  </option>
                ))}
              </select>
            )}
            {kind === "boxscore" && (
              <button
                className={`${button} w-full`}
                disabled={busy}
                onClick={() => update({ cue: "boxscore" })}
              >
                Show Box Score
              </button>
            )}
            {kind === "player" && (
              <button
                className={`${button} w-full`}
                disabled={busy || !state.featured_player_id}
                onClick={() => update({ cue: "player" })}
              >
                Show Player Stats
              </button>
            )}
          </section>
        ))}
      </div>
      <Link className={`${button} block w-full text-center`} href="/admin/tracker">
        Open Live Tracker
      </Link>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-xl border border-line p-4 text-center font-bold" href="/admin/boxscore">
          Review Box Score
        </Link>
        <Link className="rounded-xl border border-line p-4 text-center font-bold" href="/admin/results">
          Finalize Results
        </Link>
      </div>
      <details className="rounded-xl border border-line bg-panel p-4">
        <summary className="cursor-pointer font-bold">OBS Setup Links</summary>
        <div className="mt-4 space-y-4">
          {(["scoreboard", "boxscore", "player"] as const).map((kind) => (
            <div key={kind} className="space-y-2">
              <p className="font-bold capitalize">{kind === "player" ? "Player stats" : kind}</p>
              <input
                aria-label={`${kind} OBS URL`}
                readOnly
                className={`${input} w-full text-xs`}
                value={`${typeof window === "undefined" ? "" : location.origin}/overlay/${kind}?token=${encodeURIComponent(data.token)}`}
                onFocus={(e) => e.target.select()}
              />
              <button
                className="text-sm underline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${location.origin}/overlay/${kind}?token=${encodeURIComponent(data.token)}`);
                    setError("");
                  } catch {
                    setError("Tap and hold the link above to copy it.");
                  }
                }}
              >
                Copy link
              </button>
            </div>
          ))}
          <button className="text-sm underline" disabled={busy} onClick={() => update({ rotateToken: true })}>
            Replace all OBS links
          </button>
        </div>
      </details>
      <section className="rounded-xl border border-line p-4">
        <h2 className="font-head text-xl mb-3">ACTION HISTORY</h2>
        {!events.length && (
          <p className="text-bone/50">
            Actions recorded after this update will appear here.
          </p>
        )}
        {events.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-4 border-t border-line py-3"
          >
            <div className={e.reversed_at ? "text-bone/30 line-through" : ""}>
              <b>{e.name}</b> · {e.label}
              {e.reversed_at && <small className="block text-bone/40">Undone</small>}
            </div>
            <button
              className="underline disabled:opacity-30"
              disabled={busy || !!e.reversed_at || state.status === "final"}
              onClick={() => undo(e.id)}
            >
              Undo
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
