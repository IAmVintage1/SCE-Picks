"use client";

import { useEffect, useMemo, useState } from "react";
import { STAT_LABELS, StatType } from "@/lib/types";

interface Player {
  id: string;
  name: string;
  team?: { id: string; name: string } | null;
}

interface TeamProp {
  id: string;
  prop_type: "winning_team" | "combined_points";
  line: number | null;
  active: boolean;
  locked: boolean;
}

interface Prop {
  id: string;
  player_id: string;
  stat_type: StatType;
  line: number;
  active: boolean;
  locked: boolean;
  featured: boolean;
  player?: Player | null;
}

type Tab = "board" | "players" | "import";
type StatusFilter = "all" | "live" | "locked" | "inactive";
type Draft = Partial<Pick<Prop, "line" | "stat_type" | "featured" | "active" | "locked">>;

interface ImportRow {
  row: number;
  playerName: string;
  statType: StatType | null;
  line: number | null;
  featured?: boolean;
  active?: boolean;
  locked?: boolean;
  existing?: Prop;
  error?: string;
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
  "rebounds_blocks",
  "pra",
];

const ALIASES: Record<string, StatType> = {
  PTS: "points",
  POINTS: "points",
  REB: "rebounds",
  REBOUNDS: "rebounds",
  AST: "assists",
  ASSISTS: "assists",
  "3PT": "three_pt_made",
  "3PM": "three_pt_made",
  "3PT MADE": "three_pt_made",
  STEALS: "steals",
  STL: "steals",
  BLOCKS: "blocks",
  BLK: "blocks",
  TURNOVERS: "turnovers",
  TOV: "turnovers",
  "PTS+REB": "points_rebounds",
  "PTS + REB": "points_rebounds",
  "PTS+AST": "points_assists",
  "PTS + AST": "points_assists",
  "REB+AST": "rebounds_assists",
  "REB + AST": "rebounds_assists",
  "REB+BLK": "rebounds_blocks",
  "REB + BLK": "rebounds_blocks",
  PRA: "pra",
};

function normalizeStat(value: string): StatType | null {
  const raw = value.trim();
  const exact = STAT_OPTIONS.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const pretty = raw.toUpperCase().replace(/\s+/g, " ").trim();
  return ALIASES[pretty] ?? ALIASES[pretty.replace(/\s+/g, "")] ?? null;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "live", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "inactive", "off"].includes(v)) return false;
  return undefined;
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((v) => v.trim());
  return line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
}

export default function AdminPropsPage() {
  const [props, setProps] = useState<Prop[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamProps, setTeamProps] = useState<TeamProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("board");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newPlayerId, setNewPlayerId] = useState("");
  const [newStat, setNewStat] = useState<StatType>("points");
  const [newLine, setNewLine] = useState("");

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [statFilter, setStatFilter] = useState<StatType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [importText, setImportText] = useState("");
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const responses = await Promise.all([
        fetch("/api/admin/props"),
        fetch("/api/admin/players"),
        fetch("/api/admin/team-props"),
      ]);

      if (responses.some((r) => !r.ok)) throw new Error("Could not load admin prop data.");

      const propsData = await responses[0].json();
      const playersData = await responses[1].json();
      const teamPropsData = await responses[2].json();

      const nextPlayers: Player[] = playersData.players ?? [];
      setProps(propsData.props ?? []);
      setPlayers(nextPlayers);
      setTeamProps(teamPropsData.teamProps ?? []);
      setDrafts({});
      setDirty(new Set());
      setSelected(new Set());

      if (!newPlayerId && nextPlayers[0]) setNewPlayerId(nextPlayers[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load prop data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    players.forEach((p) => {
      if (p.team) map.set(p.team.id, p.team);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...props]
      .filter((p) => {
        if (teamFilter !== "all" && p.player?.team?.id !== teamFilter) return false;
        if (playerFilter !== "all" && p.player_id !== playerFilter) return false;
        if (statFilter !== "all" && p.stat_type !== statFilter) return false;
        if (statusFilter === "live" && (!p.active || p.locked)) return false;
        if (statusFilter === "locked" && (!p.active || !p.locked)) return false;
        if (statusFilter === "inactive" && p.active) return false;

        if (q) {
          const hay = [
            p.player?.name ?? "",
            p.player?.team?.name ?? "",
            STAT_LABELS[p.stat_type],
          ].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const t = (a.player?.team?.name ?? "").localeCompare(b.player?.team?.name ?? "");
        if (t) return t;
        const n = (a.player?.name ?? "").localeCompare(b.player?.name ?? "");
        if (n) return n;
        return STAT_LABELS[a.stat_type].localeCompare(STAT_LABELS[b.stat_type]);
      });
  }, [props, search, teamFilter, playerFilter, statFilter, statusFilter]);

  const playerGroups = useMemo(() => {
    return players
      .map((player) => ({
        player,
        props: props
          .filter((p) => p.player_id === player.id)
          .sort((a, b) => STAT_LABELS[a.stat_type].localeCompare(STAT_LABELS[b.stat_type])),
      }))
      .filter(({ player, props: rows }) => {
        if (!rows.length) return false;
        if (teamFilter !== "all" && player.team?.id !== teamFilter) return false;
        if (playerFilter !== "all" && player.id !== playerFilter) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return [player.name, player.team?.name ?? "", ...rows.map((p) => STAT_LABELS[p.stat_type])]
            .join(" ")
            .toLowerCase()
            .includes(q);
        }
        return true;
      })
      .sort((a, b) => a.player.name.localeCompare(b.player.name));
  }, [players, props, teamFilter, playerFilter, search]);

  function edit(id: string, patch: Draft) {
    setProps((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? {}), ...patch } }));
    setDirty((current) => new Set(current).add(id));
  }

  function toggleSelection(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      const all = filtered.length > 0 && filtered.every((p) => next.has(p.id));
      filtered.forEach((p) => (all ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  }

  function bulk(patch: Draft) {
    selected.forEach((id) => edit(id, patch));
    setNotice(String(selected.size) + " props changed locally. Save when ready.");
  }

  async function saveAll() {
    if (!dirty.size) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const ids = Array.from(dirty);
      const responses = await Promise.all(
        ids.map((id) =>
          fetch("/api/admin/props/" + id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(drafts[id] ?? {}),
          })
        )
      );

      const failed = responses.find((r) => !r.ok);
      if (failed) {
        const data = await failed.json().catch(() => ({}));
        throw new Error(data.error || "One or more changes failed.");
      }

      setNotice(String(ids.length) + " prop change" + (ids.length === 1 ? "" : "s") + " saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function createProp(e: React.FormEvent) {
    e.preventDefault();
    const line = Number(newLine);

    if (!newPlayerId || !Number.isFinite(line)) {
      setError("Choose a player and enter a valid line.");
      return;
    }

    const res = await fetch("/api/admin/props", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: newPlayerId, stat_type: newStat, line }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create prop.");
      return;
    }

    setNewLine("");
    setNotice("Prop created.");
    await load();
  }

  async function deactivate(id: string) {
    if (!window.confirm("Deactivate this prop?")) return;

    const res = await fetch("/api/admin/props/" + id, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not deactivate prop.");
      return;
    }

    setNotice("Prop deactivated.");
    await load();
  }

  async function updateTeamProp(id: string, patch: Partial<TeamProp>) {
    const res = await fetch("/api/admin/team-props/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update game prop.");
      return;
    }

    await load();
  }

  function previewImport() {
    const lines = importText.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);

    if (!lines.length) {
      setError("Paste CSV or Google Sheets rows first.");
      return;
    }

    const first = splitRow(lines[0]).map((v) => v.toLowerCase());
    const hasHeader = first.some((v) =>
      ["player", "name", "stat", "line", "featured", "hot", "active", "locked"].includes(v)
    );

    const headers = hasHeader ? first : ["player", "stat", "line", "featured", "active", "locked"];
    const rows = hasHeader ? lines.slice(1) : lines;

    const next = rows.map((raw, index): ImportRow => {
      const cells = splitRow(raw);
      const values: Record<string, string> = {};
      headers.forEach((h, i) => {
        values[h] = cells[i] ?? "";
      });

      const playerName = (values.player || values.name || "").trim();
      const player = players.find((p) => p.name.trim().toLowerCase() === playerName.toLowerCase());
      const statType = normalizeStat(values.stat || values.stat_type || "");
      const line = Number(values.line);
      let error = "";

      if (!player) error = 'Player "' + playerName + '" not found.';
      else if (!statType) error = 'Unknown stat "' + (values.stat || "") + '".';
      else if (!Number.isFinite(line)) error = "Invalid line.";

      return {
        row: index + 1 + (hasHeader ? 1 : 0),
        playerName,
        statType,
        line: Number.isFinite(line) ? line : null,
        featured: parseBool(values.featured ?? values.hot),
        active: parseBool(values.active ?? values.status),
        locked: parseBool(values.locked),
        existing:
          player && statType
            ? props.find((p) => p.player_id === player.id && p.stat_type === statType)
            : undefined,
        error: error || undefined,
      };
    });

    setPreview(next);
    const bad = next.filter((r) => r.error).length;
    const updates = next.filter((r) => !r.error && r.existing).length;
    const creates = next.filter((r) => !r.error && !r.existing).length;
    setNotice(
      String(updates) +
        " update" +
        (updates === 1 ? "" : "s") +
        ", " +
        String(creates) +
        " new prop" +
        (creates === 1 ? "" : "s") +
        (bad ? ", " + String(bad) + " error" + (bad === 1 ? "" : "s") : "") +
        "."
    );
  }

  async function applyImport() {
    if (!preview.length || preview.some((r) => r.error)) return;

    setImporting(true);
    setError(null);

    try {
      for (const row of preview) {
        const player = players.find(
          (p) => p.name.trim().toLowerCase() === row.playerName.toLowerCase()
        );
        if (!player || !row.statType || row.line === null) throw new Error("Invalid import row.");

        const extras: Draft = {};
        if (row.featured !== undefined) extras.featured = row.featured;
        if (row.active !== undefined) extras.active = row.active;
        if (row.locked !== undefined) extras.locked = row.locked;

        if (row.existing) {
          const res = await fetch("/api/admin/props/" + row.existing.id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ line: row.line, stat_type: row.statType, ...extras }),
          });
          if (!res.ok) throw new Error("Import failed on row " + String(row.row) + ".");
        } else {
          const res = await fetch("/api/admin/props", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              player_id: player.id,
              stat_type: row.statType,
              line: row.line,
            }),
          });
          if (!res.ok) throw new Error("Import failed on row " + String(row.row) + ".");

          const created = await res.json();
          if (created.prop?.id && Object.keys(extras).length) {
            const patchRes = await fetch("/api/admin/props/" + created.prop.id, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(extras),
            });
            if (!patchRes.ok) throw new Error("Import failed on row " + String(row.row) + ".");
          }
        }
      }

      setImportText("");
      setPreview([]);
      setNotice("Import applied successfully.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-bone/35">
              PROP MANAGEMENT
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-bone">Bulk Prop Editor</h1>
            <p className="mt-1 text-sm text-bone/45">
              Edit the whole board faster, group props by player, or paste updates from Google Sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {dirty.size > 0 && (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 font-mono text-[9px] font-bold text-amber-200">
                {dirty.size} UNSAVED
              </span>
            )}
            <button
              type="button"
              onClick={saveAll}
              disabled={!dirty.size || saving}
              className="rounded-xl bg-bone px-4 py-2.5 font-head text-xs font-bold text-ink disabled:opacity-30"
            >
              {saving ? "SAVING..." : "SAVE ALL CHANGES"}
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto px-3">
          {[
            ["board", "BOARD EDITOR"],
            ["players", "PLAYER VIEW"],
            ["import", "IMPORT"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value as Tab)}
              className={[
                "shrink-0 border-b-2 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em]",
                tab === value ? "border-bone text-bone" : "border-transparent text-bone/35",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {(error || notice) && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            error
              ? "border-young/25 bg-young/10 text-young-light"
              : "border-alum/25 bg-alum/10 text-alum-light",
          ].join(" ")}
        >
          {error ?? notice}
        </div>
      )}

      <form onSubmit={createProp} className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-4">
        <Field label="Player">
          <select
            value={newPlayerId}
            onChange={(e) => setNewPlayerId(e.target.value)}
            className="mt-1 block rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.team?.name ? "(" + p.team.name + ")" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Stat">
          <select
            value={newStat}
            onChange={(e) => setNewStat(e.target.value as StatType)}
            className="mt-1 block rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          >
            {STAT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAT_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Line">
          <input
            value={newLine}
            onChange={(e) => setNewLine(e.target.value)}
            inputMode="decimal"
            placeholder="12.5"
            className="mt-1 block w-24 rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          />
        </Field>

        <button className="rounded-lg bg-bone px-4 py-2 text-sm font-semibold text-ink">+ ADD PROP</button>
      </form>

      {tab !== "import" && (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <FilterField label="Search" className="xl:col-span-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Player, team, or stat..."
                className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
              />
            </FilterField>

            <FilterField label="Team">
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone">
                <option value="all">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Player">
              <select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone">
                <option value="all">All players</option>
                {players
                  .filter((p) => teamFilter === "all" || p.team?.id === teamFilter)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </FilterField>

            <FilterField label="Stat">
              <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as StatType | "all")} className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone">
                <option value="all">All stats</option>
                {STAT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STAT_LABELS[s]}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Status">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone">
                <option value="all">All statuses</option>
                <option value="live">Live</option>
                <option value="locked">Locked</option>
                <option value="inactive">Inactive</option>
              </select>
            </FilterField>
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-bone/40">Loading props...</p>
      ) : tab === "board" ? (
        <section className="space-y-3">
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
              <span className="mr-2 font-mono text-[9px] font-bold text-bone/45">{selected.size} SELECTED</span>
              <BulkButton label="🔥 HOT" onClick={() => bulk({ featured: true })} />
              <BulkButton label="REMOVE HOT" onClick={() => bulk({ featured: false })} />
              <BulkButton label="ACTIVATE" onClick={() => bulk({ active: true })} />
              <BulkButton label="DEACTIVATE" onClick={() => bulk({ active: false })} />
              <BulkButton label="LOCK" onClick={() => bulk({ locked: true })} />
              <BulkButton label="UNLOCK" onClick={() => bulk({ locked: false })} />
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-panel text-xs uppercase tracking-wide text-bone/40">
                <tr>
                  <th className="w-12 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-bone"
                    />
                  </th>
                  <th className="px-3 py-3">Player</th>
                  <th className="px-3 py-3">Stat</th>
                  <th className="px-3 py-3">Line</th>
                  <th className="px-3 py-3 text-center">🔥 Hot</th>
                  <th className="px-3 py-3 text-center">Live</th>
                  <th className="px-3 py-3 text-center">Locked</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={dirty.has(p.id) ? "border-t border-line bg-amber-400/[0.035]" : "border-t border-line"}>
                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelection(p.id)} className="h-4 w-4 accent-bone" />
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-semibold text-bone">{p.player?.name ?? "Unknown Player"}</div>
                      <div className="text-[10px] text-bone/35">{p.player?.team?.name ?? "No team"}</div>
                    </td>

                    <td className="px-3 py-3">
                      <select value={p.stat_type} onChange={(e) => edit(p.id, { stat_type: e.target.value as StatType })} className="min-w-36 rounded-lg border border-line bg-panelLight px-2.5 py-2 text-xs text-bone">
                        {STAT_OPTIONS.map((s) => (
                          <option key={s} value={s}>{STAT_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        step="0.5"
                        value={p.line}
                        onChange={(e) => edit(p.id, { line: Number(e.target.value) })}
                        className="w-20 rounded-lg border border-line bg-panelLight px-2.5 py-2 font-mono text-sm font-bold text-bone"
                      />
                    </td>

                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={p.featured} onChange={() => edit(p.id, { featured: !p.featured })} className="h-4 w-4 accent-orange-400" />
                    </td>

                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={p.active} onChange={() => edit(p.id, { active: !p.active })} className="h-4 w-4 accent-bone" />
                    </td>

                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={p.locked} onChange={() => edit(p.id, { locked: !p.locked })} className="h-4 w-4 accent-bone" />
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => deactivate(p.id)} className="text-xs font-medium text-young-light underline underline-offset-2">
                          Deactivate
                        </button>
                        {dirty.has(p.id) && <span className="font-mono text-[8px] text-amber-200">UNSAVED</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-mono text-[9px] text-bone/25">{filtered.length} PROPS VISIBLE</p>
        </section>
      ) : tab === "players" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {playerGroups.map(({ player, props: rows }) => (
            <div key={player.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-bone">{player.name}</h2>
                  <p className="text-[10px] text-bone/35">
                    {player.team?.name ?? "No team"} · {rows.length} PROP{rows.length === 1 ? "" : "S"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerFilter(player.id);
                    setTab("board");
                  }}
                  className="rounded-lg border border-line bg-panelLight px-3 py-2 font-mono text-[9px] font-bold text-bone/55"
                >
                  OPEN IN BOARD
                </button>
              </div>

              <div className="divide-y divide-line">
                {rows.map((p) => (
                  <div key={p.id} className={dirty.has(p.id) ? "grid grid-cols-[1fr_80px_auto] items-center gap-3 bg-amber-400/[0.035] px-4 py-3" : "grid grid-cols-[1fr_80px_auto] items-center gap-3 px-4 py-3"}>
                    <select value={p.stat_type} onChange={(e) => edit(p.id, { stat_type: e.target.value as StatType })} className="min-w-0 rounded-lg border border-line bg-panelLight px-2.5 py-2 text-xs text-bone">
                      {STAT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STAT_LABELS[s]}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.5"
                      value={p.line}
                      onChange={(e) => edit(p.id, { line: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-line bg-panelLight px-2 py-2 text-center font-mono text-sm font-bold text-bone"
                    />

                    <div className="flex items-center gap-1.5">
                      <TinyButton active={p.featured} label="🔥" onClick={() => edit(p.id, { featured: !p.featured })} />
                      <TinyButton active={p.active} label={p.active ? "LIVE" : "OFF"} onClick={() => edit(p.id, { active: !p.active })} />
                      <TinyButton active={p.locked} label={p.locked ? "🔒" : "🔓"} onClick={() => edit(p.id, { locked: !p.locked })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="grid gap-4 rounded-2xl border border-line bg-panel p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="font-mono text-[9px] font-bold tracking-[0.15em] text-bone/35">PASTE FROM GOOGLE SHEETS / CSV</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"player,stat,line,featured,active,locked\nBao Nguyen,POINTS,20.5,true,true,false\nMatt,3PT MADE,5.5,true,true,false"}
                className="mt-3 min-h-64 w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-xs leading-6 text-bone"
              />
            </div>

            <div className="rounded-xl border border-line bg-panelLight p-4">
              <h3 className="font-head text-sm font-bold text-bone">Import format</h3>
              <p className="mt-2 text-xs leading-5 text-bone/45">
                Required: player, stat, line. Optional: featured/hot, active/status, locked.
              </p>
              <p className="mt-3 font-mono text-[9px] leading-5 text-bone/35">
                Existing player + stat updates that prop. A new player + stat combination creates a new prop.
              </p>
              <button type="button" onClick={previewImport} className="mt-5 w-full rounded-xl bg-bone px-4 py-3 font-head text-xs font-bold text-ink">
                PREVIEW IMPORT
              </button>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
                <div>
                  <p className="font-head text-sm font-bold text-bone">Import Preview</p>
                  <p className="text-[10px] text-bone/35">Nothing changes until you click Apply Import.</p>
                </div>
                <button
                  type="button"
                  disabled={importing || preview.some((r) => r.error)}
                  onClick={applyImport}
                  className="rounded-xl bg-bone px-4 py-2.5 font-head text-xs font-bold text-ink disabled:opacity-30"
                >
                  {importing ? "APPLYING..." : "APPLY IMPORT"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[700px] w-full text-left text-sm">
                  <thead className="bg-panel text-[10px] uppercase text-bone/35">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Stat</th>
                      <th className="px-4 py-3">Line</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => (
                      <tr key={String(r.row) + r.playerName} className="border-t border-line">
                        <td className="px-4 py-3 font-mono text-bone/35">{r.row}</td>
                        <td className="px-4 py-3 text-bone">{r.playerName || "—"}</td>
                        <td className="px-4 py-3 text-bone/60">{r.statType ? STAT_LABELS[r.statType] : "—"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-bone">{r.line ?? "—"}</td>
                        <td className="px-4 py-3 text-xs">{r.error ? "ERROR" : r.existing ? "UPDATE" : "CREATE"}</td>
                        <td className="px-4 py-3 text-xs text-bone/40">{r.error ?? "Ready"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-bone/70">GAME PROPS</h2>
        <div className="space-y-3">
          {teamProps.map((tp) => (
            <div key={tp.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel p-4">
              <span className="w-40 text-sm font-semibold text-bone">
                {tp.prop_type === "winning_team" ? "Winning Team" : "Combined Points"}
              </span>

              {tp.prop_type === "combined_points" && (
                <input
                  defaultValue={tp.line ?? ""}
                  onBlur={(e) => Number(e.target.value) !== tp.line && updateTeamProp(tp.id, { line: Number(e.target.value) })}
                  className="w-20 rounded border border-line bg-panelLight px-2 py-1 text-sm text-bone"
                />
              )}

              <span className="text-xs text-bone/45">
                {!tp.active ? "Inactive" : tp.locked ? "Locked" : "Live"}
              </span>

              <button
                type="button"
                onClick={() => updateTeamProp(tp.id, { locked: !tp.locked })}
                className="text-xs font-medium text-bone/60 underline underline-offset-2"
              >
                {tp.locked ? "Unlock" : "Lock"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-bone/50">{label}</label>
      {children}
    </div>
  );
}

function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] font-bold uppercase tracking-wide text-bone/35">{label}</label>
      {children}
    </div>
  );
}

function BulkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-line bg-panelLight px-3 py-2 font-mono text-[9px] font-bold text-bone/60"
    >
      {label}
    </button>
  );
}

function TinyButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg border px-2.5 py-2 font-mono text-[8px] font-bold",
        active ? "border-bone/20 bg-bone/10 text-bone" : "border-line bg-panelLight text-bone/30",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
