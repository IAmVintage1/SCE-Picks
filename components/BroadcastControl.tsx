"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LiveSnapshot, clockRemaining, formatClock } from "@/lib/live";
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
  const [time, setTime] = useState("10:00");
  const [period, setPeriod] = useState("1");
  const [tick, setTick] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/broadcast", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setOffset(d.serverTime - Date.now());
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
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
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
    "rounded-lg bg-bone px-4 py-3 font-bold text-ink disabled:opacity-40";
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
      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="text-young-light">
            <p>YOUNGKNIGHTS</p>
            <b className="text-5xl">{scores.youngknights}</b>
          </div>
          <div className="text-center">
            <p>
              {state.status.toUpperCase()} ·{" "}
              {state.period <= 4 ? `Q${state.period}` : `OT${state.period - 4}`}
            </p>
            <b className="font-mono text-4xl">
              {formatClock(clockRemaining(state, tick + offset))}
            </b>
          </div>
          <div className="text-alum-light">
            <p>ALUMKNIGHTS</p>
            <b className="text-5xl">{scores.alumknights}</b>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className={button}
            disabled={busy || state.status === "final"}
            onClick={() =>
              update({ clock_running: !state.clock_running, status: "live" })
            }
          >
            {state.clock_running ? "Pause clock" : "Start clock"}
          </button>
          <label>
            Clock{" "}
            <input
              aria-label="Game clock minutes and seconds"
              className={`${input} w-24`}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label>
            Period{" "}
            <input
              aria-label="Period (5 is first overtime)"
              className={`${input} w-16`}
              type="number"
              min="1"
              max="20"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
          <button
            className={button}
            disabled={busy || state.status === "final"}
            onClick={() => {
              if (!/^\d{1,3}:[0-5]\d$/.test(time)) {
                setError("Enter clock as minutes:seconds");
                return;
              }
              const [m, s] = time.split(":").map(Number);
              update({
                clock_seconds: m * 60 + s,
                period: Number(period),
                clock_running: false,
              });
            }}
          >
            Set clock / period
          </button>
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
        <p className="mt-3 text-sm text-bone/50">
          Clock operator must match the official gym clock. Period 5 = OT1.
          Reopening stats requires finalizing again after review.
        </p>
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
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                update({ [`${kind}_visible`]: !state[`${kind}_visible`] })
              }
            >
              {state[`${kind}_visible`] ? "Hide graphic" : "Show graphic"}
            </button>
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
            <button
              className="block text-sm underline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${location.origin}/overlay/${kind}#token=${encodeURIComponent(data.token)}`,
                  );
                  setError("");
                } catch {
                  setError("Copy the link from the field below.");
                }
              }}
            >
              Copy OBS browser-source URL
            </button>
            <input
              aria-label={`${kind} OBS URL`}
              readOnly
              className={`${input} w-full text-xs`}
              value={`${typeof window === "undefined" ? "" : location.origin}/overlay/${kind}#token=${encodeURIComponent(data.token)}`}
              onFocus={(e) => e.target.select()}
            />
            <Link
              className="block text-sm underline"
              href={`/overlay/${kind}?demo=1`}
              target="_blank"
            >
              Preview with sample data
            </Link>
          </section>
        ))}
      </div>
      <p className="text-sm text-bone/60">
        OBS: add each URL as a Browser Source at 1920 × 1080. Backgrounds are
        transparent. Leave “Shutdown source when not visible” off. Links provide
        read-only access and expire in 30 days.
      </p>
      <button
        className="text-sm underline"
        disabled={busy}
        onClick={() => update({ rotateToken: true })}
      >
        Revoke old overlay links and issue new ones
      </button>
      <div className="flex gap-5">
        <Link className="underline" href="/admin/tracker">
          Enter player stats →
        </Link>
        <Link className="underline" href="/admin/boxscore">
          Review box score →
        </Link>
        <Link className="underline" href="/admin/results">
          Finalize reviewed results →
        </Link>
      </div>
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
              <small className="block text-bone/40">
                {new Date(e.created_at).toLocaleTimeString()}
                {e.reversed_at ? " · Undone" : ""}
              </small>
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
