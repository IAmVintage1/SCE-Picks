"use client";
import { useEffect, useState } from "react";
import type { LiveSnapshot, LivePlayer } from "@/lib/live";
import "./live-broadcast.css";
export default function LiveBroadcast({
  kind,
}: {
  kind: "scoreboard" | "boxscore" | "player";
}) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState("Connecting to broadcast…");
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const demoMode = new URLSearchParams(location.search).get("demo") === "1";
    setDemo(demoMode);
    if (demoMode) {
      setSnapshot(demoSnapshot());
      setError("");
      return;
    }
    const token =
      new URLSearchParams(location.search).get("token") ||
      new URLSearchParams(location.hash.slice(1)).get("token") ||
      "";
    const key = `sce-obs:v1:${token}`;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.snapshot?.state && Array.isArray(cached.snapshot.players)) {
        setSnapshot(cached.snapshot);
      }
    } catch {}
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let delay = 1500;
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch("/api/broadcast", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.status === 401) {
          if (!stopped) {
            setSnapshot(null);
            setError(
              "Broadcast link expired or revoked. Get a new link from Live Broadcast.",
            );
            try {
              localStorage.removeItem(key);
            } catch {}
          }
          return;
        }
        if (!res.ok) throw new Error();
        const value = (await res.json()) as LiveSnapshot;
        if (stopped) return;
        setSnapshot(value);
        setError("");
        delay = 1500;
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              snapshot: value,
              offset: value.serverTime - Date.now(),
            }),
          );
        } catch {}
      } catch {
        if (!stopped) {
          setError("Connection interrupted — showing last confirmed stats");
          delay = Math.min(delay * 2, 10000);
        }
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(poll, delay);
      }
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, []);
  if (!snapshot)
    return (
      <div className="obs-overlay">
        <div className="obs-error">{error}</div>
      </div>
    );
  const { state, players, scores } = snapshot;
  const teams = ["youngknights", "alumknights"].filter(
    (t) => state.boxscore_team === "both" || t === state.boxscore_team,
  );
  const featured = players.find((p) => p.id === state.featured_player_id);
  const visible =
    kind === "scoreboard"
      ? state.scoreboard_visible
      : kind === "boxscore"
        ? state.boxscore_visible
        : state.player_visible && !!featured;
  return (
    <div className="obs-overlay">
      {demo && <div className="obs-demo">PREVIEW · SAMPLE DATA</div>}
      <div className={`obs-graphic ${visible ? "is-visible" : ""}`}>
        {kind === "scoreboard" && (
          <div className="obs-scoreboard">
            <div className="obs-team young">
              <span>YOUNGKNIGHTS</span>
              <strong>{scores.youngknights}</strong>
            </div>
            <div className="obs-team alum">
              <span>ALUMKNIGHTS</span>
              <strong>{scores.alumknights}</strong>
            </div>
            <div className="obs-period">
              <b>
                {state.status === "final"
                  ? "FINAL"
                  : state.period <= 4
                    ? `${["1ST", "2ND", "3RD", "4TH"][state.period - 1]} QUARTER`
                    : `OVERTIME ${state.period - 4}`}
              </b>
            </div>
          </div>
        )}
        {kind === "boxscore" && (
          <section className="obs-boxscore">
            <header>
              <span>SCE LIVE</span>
              <h1>BOX SCORE</h1>
              <small>
                {state.status === "final" ? "FINAL" : "LIVE · PROVISIONAL"}
              </small>
            </header>
            <div className="obs-tables">
              {teams.map((team) => (
                <div key={team}>
                  <h2 className={team === "youngknights" ? "young" : "alum"}>
                    {team === "youngknights" ? "YOUNGKNIGHTS" : "ALUMKNIGHTS"}{" "}
                    <b>{scores[team]}</b>
                  </h2>
                  <table>
                    <thead>
                      <tr>
                        {[
                          "PLAYER",
                          "PTS",
                          "REB",
                          "AST",
                          "STL",
                          "BLK",
                          "TO",
                          "PF",
                          "FG",
                          "3PT",
                          "FT",
                        ].map((x) => (
                          <th key={x}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players
                        .filter((p) => p.team.slug === team)
                        .sort(
                          (a, b) =>
                            (b.stats.points || 0) - (a.stats.points || 0),
                        )
                        .map((p) => (
                          <StatRow key={p.id} player={p} />
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )}
        {kind === "player" && featured && (
          <section
            className={`obs-spotlight ${featured.team.slug === "youngknights" ? "young" : "alum"}`}
          >
            {featured.image_url?.startsWith("/") ? (
              <img src={featured.image_url} alt="" />
            ) : (
              <div className="obs-initials">
                {featured.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            )}
            <div>
              <small>{featured.team.name} · PLAYER SPOTLIGHT</small>
              <h1>{featured.name}</h1>
              <div className="obs-player-stats">
                {["points", "rebounds", "assists"].map((s, i) => (
                  <div key={s}>
                    <b>
                      {Number(
                        featured.stats[s as keyof typeof featured.stats] || 0,
                      )}
                    </b>
                    <span>{["PTS", "REB", "AST"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
function StatRow({ player: p }: { player: LivePlayer }) {
  const s = p.stats;
  return (
    <tr>
      <td>{p.name}</td>
      {[
        "points",
        "rebounds",
        "assists",
        "steals",
        "blocks",
        "turnovers",
        "fouls",
      ].map((k) => (
        <td key={k}>{s[k as keyof typeof s] || 0}</td>
      ))}
      <td>
        {s.field_goals_made || 0}/{s.field_goals_attempted || 0}
      </td>
      <td>
        {s.three_pt_made || 0}/{s.three_pt_attempted || 0}
      </td>
      <td>
        {s.ft_made || 0}/{s.ft_attempted || 0}
      </td>
    </tr>
  );
}
function demoSnapshot(): LiveSnapshot {
  return {
    state: {
      revision: 0,
      period: 2,
      clock_seconds: 272,
      clock_running: false,
      clock_started_at: null,
      status: "live",
      scoreboard_visible: true,
      boxscore_visible: true,
      player_visible: true,
      boxscore_team: "both",
      featured_player_id: "sample-y0",
      token_version: 0,
      updated_at: new Date().toISOString(),
    },
    scores: { youngknights: 42, alumknights: 39 },
    serverTime: Date.now(),
    players: ["youngknights", "alumknights"].flatMap((slug) =>
      Array.from({ length: 7 }, (_, i) => ({
        id: `sample-${slug[0]}${i}`,
        name: `Sample Player ${i + 1}`,
        image_url: null,
        team: {
          id: slug,
          name: slug === "youngknights" ? "YoungKnights" : "AlumKnights",
          slug,
        },
        stats: {
          points: [14, 10, 8, 6, 4, 0, 0][i],
          rebounds: i + 1,
          assists: 3,
          steals: 1,
          blocks: 0,
          turnovers: 2,
          fouls: 1,
          field_goals_made: 4,
          field_goals_attempted: 8,
          three_pt_made: 2,
          three_pt_attempted: 4,
          ft_made: 0,
          ft_attempted: 0,
        },
      })),
    ),
  };
}
