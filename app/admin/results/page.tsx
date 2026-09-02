"use client";

import { useEffect, useState } from "react";
import { STAT_LABELS, StatType } from "@/lib/types";

interface PropRow {
  id: string;
  stat_type: StatType;
  line: number;
  player: { name: string; team: { name: string } } | null;
}
interface TeamPropRow {
  id: string;
  prop_type: "winning_team" | "combined_points";
  line: number | null;
}
interface ResultRow {
  prop_id: string;
  actual_value: number;
}
interface TeamResultRow {
  team_prop_id: string;
  actual_value: number | null;
  winning_team_slug: string | null;
}

export default function AdminResultsPage() {
  const [props, setProps] = useState<PropRow[]>([]);
  const [teamProps, setTeamProps] = useState<TeamPropRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [teamResults, setTeamResults] = useState<TeamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/results");
    const data = await res.json();
    setProps(data.props ?? []);
    setTeamProps(data.teamProps ?? []);
    setResults(data.results ?? []);
    setTeamResults(data.teamResults ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitPlayerResult(propId: string, value: string) {
    if (!value) return;
    setSavingId(propId);
    await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "player", propId, actualValue: Number(value) }),
    });
    setSavingId(null);
    load();
  }

  async function submitTeamResult(
    teamPropId: string,
    actualValue?: string,
    winningTeamSlug?: string
  ) {
    setSavingId(teamPropId);
    await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "team",
        teamPropId,
        actualValue: actualValue ? Number(actualValue) : undefined,
        winningTeamSlug,
      }),
    });
    setSavingId(null);
    load();
  }

  const existingResult = (propId: string) =>
    results.find((r) => r.prop_id === propId);
  const existingTeamResult = (teamPropId: string) =>
    teamResults.find((r) => r.team_prop_id === teamPropId);

  if (loading) return <p className="text-sm text-bone/40">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line bg-panel p-4">
        <p className="text-xs text-bone/50">
          Enter the final stat for each prop once the game is over. Saving a
          value automatically grades every card that included that pick --
          you don't need to grade cards individually.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-bone/70">
          GAME PROPS
        </h2>
        <div className="space-y-3">
          {teamProps.map((tp) => {
            const existing = existingTeamResult(tp.id);
            return (
              <div
                key={tp.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-4"
              >
                <span className="w-40 text-sm font-semibold text-bone">
                  {tp.prop_type === "winning_team" ? "Winning Team" : "Combined Points"}
                </span>
                {tp.prop_type === "winning_team" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitTeamResult(tp.id, undefined, "youngknights")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        existing?.winning_team_slug === "youngknights"
                          ? "border-young bg-young/20 text-young-light"
                          : "border-line text-bone/60"
                      }`}
                    >
                      YoungKnights
                    </button>
                    <button
                      onClick={() => submitTeamResult(tp.id, undefined, "alumknights")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        existing?.winning_team_slug === "alumknights"
                          ? "border-alum bg-alum/20 text-alum-light"
                          : "border-line text-bone/60"
                      }`}
                    >
                      AlumKnights
                    </button>
                  </div>
                ) : (
                  <input
                    placeholder={`Line: ${tp.line}`}
                    defaultValue={existing?.actual_value ?? ""}
                    onBlur={(e) => submitTeamResult(tp.id, e.target.value)}
                    className="w-24 rounded border border-line bg-panelLight px-2 py-1 text-sm text-bone"
                  />
                )}
                {savingId === tp.id && (
                  <span className="text-xs text-bone/40">Saving...</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-bone/70">
          PLAYER PROPS
        </h2>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wide text-bone/40">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Stat</th>
                <th className="px-4 py-3">Line</th>
                <th className="px-4 py-3">Actual</th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop) => {
                const existing = existingResult(prop.id);
                return (
                  <tr key={prop.id} className="border-t border-line">
                    <td className="px-4 py-3 text-bone">
                      {prop.player?.name}
                      <span className="ml-1 text-xs text-bone/40">
                        ({prop.player?.team?.name})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bone/70">
                      {STAT_LABELS[prop.stat_type]}
                    </td>
                    <td className="px-4 py-3 text-bone/70">{prop.line}</td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={existing?.actual_value ?? ""}
                        onBlur={(e) => submitPlayerResult(prop.id, e.target.value)}
                        placeholder="Enter final stat"
                        className="w-24 rounded border border-line bg-panelLight px-2 py-1 text-bone"
                      />
                      {savingId === prop.id && (
                        <span className="ml-2 text-xs text-bone/40">Saving...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
