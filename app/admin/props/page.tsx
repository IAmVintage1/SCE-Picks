"use client";

import { useEffect, useState } from "react";
import { STAT_LABELS, StatType } from "@/lib/types";

interface Player {
  id: string;
  name: string;
  team?: { id: string; name: string } | null;
}

interface Prop {
  id: string;
  player_id: string;
  stat_type: StatType;
  line: number;
  active: boolean;
  locked: boolean;
  player?: Player | null;
}

const STAT_OPTIONS: StatType[] = [
  "points",
  "rebounds",
  "assists",
  "three_pt_made",
  "steals",
  "blocks",
  "turnovers",
  "points_rebounds",
  "points_assists",
  "rebounds_assists",
  "pra",
];

export default function AdminPropsPage() {
  const [props, setProps] = useState<Prop[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [statType, setStatType] = useState<StatType>("points");
  const [line, setLine] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [propsRes, playersRes] = await Promise.all([
        fetch("/api/admin/props"),
        fetch("/api/admin/players"),
      ]);

      const propsData = await propsRes.json();
      const playersData = await playersRes.json();

      const fetchedProps = propsData.props ?? [];
      const fetchedPlayers = playersData.players ?? [];

      setProps(fetchedProps);
      setPlayers(fetchedPlayers);

      if (fetchedPlayers.length > 0 && !playerId) {
        setPlayerId(fetchedPlayers[0].id);
      }
    } catch (err) {
      console.error("Failed to load admin props:", err);
      setError("Failed to fetch data from API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!playerId || !line) {
      setError("Choose a player and enter a line.");
      return;
    }

    const res = await fetch("/api/admin/props", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, stat_type: statType, line: Number(line) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create prop");
      return;
    }

    setLine("");
    load();
  }

  async function updateProp(id: string, updates: Partial<Prop>) {
    await fetch(`/api/admin/props/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    load();
  }

  async function deactivateProp(id: string) {
    await fetch(`/api/admin/props/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createProp}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-4"
      >
        <div>
          <label className="text-xs font-medium text-bone/50">Player</label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="mt-1 block rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.team?.name ? `(${p.team.name})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-bone/50">Stat</label>
          <select
            value={statType}
            onChange={(e) => setStatType(e.target.value as StatType)}
            className="mt-1 block rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          >
            {STAT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAT_LABELS[s] || s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-bone/50">Line</label>
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="12.5"
            inputMode="decimal"
            className="mt-1 block w-24 rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          />
        </div>
        <button type="submit" className="rounded-lg bg-bone px-4 py-2 text-sm font-semibold text-ink">
          Create prop
        </button>
        {error && <p className="text-xs text-young-light">{error}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-bone/40">Loading props...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wide text-bone/40">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Stat</th>
                <th className="px-4 py-3">Line</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop) => (
                <tr key={prop.id} className="border-t border-line">
                  <td className="px-4 py-3 text-bone">
                    {prop.player?.name || "Unknown Player"}
                    {prop.player?.team?.name && (
                      <span className="ml-1 text-xs text-bone/40">
                        ({prop.player.team.name})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-bone/70">
                    {STAT_LABELS[prop.stat_type] || prop.stat_type}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={prop.line}
                      onBlur={(e) =>
                        Number(e.target.value) !== prop.line &&
                        updateProp(prop.id, { line: Number(e.target.value) })
                      }
                      className="w-16 rounded border border-line bg-panelLight px-2 py-1 text-bone"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {!prop.active ? (
                      <span className="text-xs text-bone/40">Inactive</span>
                    ) : prop.locked ? (
                      <span className="text-xs text-young-light">Locked</span>
                    ) : (
                      <span className="text-xs text-alum-light">Live</span>
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      onClick={() => updateProp(prop.id, { locked: !prop.locked })}
                      className="text-xs font-medium text-bone/60 underline underline-offset-2"
                    >
                      {prop.locked ? "Unlock" : "Lock"}
                    </button>
                    <button
                      onClick={() => deactivateProp(prop.id)}
                      className="text-xs font-medium text-young-light underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
