"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Team {
  id: string;
  name: string;
  slug: string;
}
interface Player {
  id: string;
  name: string;
  team_id: string;
  image_url: string | null;
  active: boolean;
  team: Team;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    const [playersRes, teamsRes] = await Promise.all([
      fetch("/api/admin/players"),
      fetch("/api/admin/teams"),
    ]);
    const playersData = await playersRes.json();
    const teamsData = await teamsRes.json();
    setPlayers(playersData.players ?? []);
    setTeams(teamsData.teams ?? []);
    if ((teamsData.teams ?? []).length > 0 && !newTeam) {
      setNewTeam(teamsData.teams[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim() || !newTeam) {
      setError("Enter a name and choose a team.");
      return;
    }
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, team_id: newTeam }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    setNewName("");
    load();
  }

  async function toggleActive(player: Player) {
    await fetch(`/api/admin/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !player.active }),
    });
    load();
  }

  async function handleUpload(playerId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("playerId", playerId);
    await fetch("/api/admin/players/upload", { method: "POST", body: formData });
    load();
  }

  async function handleDeletePhoto(playerId: string) {
    await fetch("/api/admin/players/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addPlayer}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-4"
      >
        <div>
          <label className="text-xs font-medium text-bone/50">Player name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 block rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-bone/50">Team</label>
          <select
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            className="mt-1 block rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-bone px-4 py-2 text-sm font-semibold text-ink">
          Add player
        </button>
        {error && <p className="text-xs text-young-light">{error}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-bone/40">Loading players...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3"
            >
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-panelLight">
                {player.image_url ? (
                  <Image
                    src={player.image_url}
                    alt={player.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-bone/25">
                    {player.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-bone">
                  {player.name}
                </p>
                <p className="text-xs text-bone/40">{player.team.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    ref={(el) => {
                      fileInputs.current[player.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(player.id, file);
                    }}
                  />
                  <button
                    onClick={() => fileInputs.current[player.id]?.click()}
                    className="text-xs font-medium text-bone/60 underline underline-offset-2"
                  >
                    {player.image_url ? "Replace photo" : "Upload photo"}
                  </button>
                  {player.image_url && (
                    <button
                      onClick={() => handleDeletePhoto(player.id)}
                      className="text-xs font-medium text-young-light underline underline-offset-2"
                    >
                      Delete photo
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(player)}
                    className="text-xs font-medium text-bone/60 underline underline-offset-2"
                  >
                    {player.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
