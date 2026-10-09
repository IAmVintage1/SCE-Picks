"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Player, Team } from "@/lib/types";

type MvpPlayer = Player & { team: Team };

export default function MvpVoting({
  players,
  opensAt,
  initiallyOpen,
  closed,
  preview,
}: {
  players: MvpPlayer[];
  opensAt: string | null;
  initiallyOpen: boolean;
  closed: boolean;
  preview: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [submittedPlayer, setSubmittedPlayer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const opensAtMs = opensAt ? Date.parse(opensAt) : Number.POSITIVE_INFINITY;
  const isOpen = initiallyOpen || now >= opensAtMs;
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selected),
    [players, selected],
  );

  async function submitVote() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/mvp/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Vote failed.");
      setSubmittedPlayer(body.playerName || selectedPlayer?.name || "your MVP");
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Vote failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (closed) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-ink px-5 text-center">
        <div className="max-w-md">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-bone/40">VOTING CLOSED</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-bone">THANKS FOR<br />VOTING.</h1>
        </div>
      </main>
    );
  }

  if (!isOpen) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-ink px-5 text-center">
        <div className="max-w-md">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-young-light">PICKS ARE CLOSED</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-bone">MVP VOTING<br />OPENS AT 8 PM.</h1>
          <p className="mt-5 text-sm leading-relaxed text-bone/50">Come back after the game gets underway and vote for the player who showed out.</p>
        </div>
      </main>
    );
  }

  if (submittedPlayer) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-ink px-5 text-center">
        <div className="max-w-md rounded-3xl border border-line bg-panel p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-500/15 text-3xl">✓</div>
          <p className="mt-5 font-mono text-xs font-bold tracking-[0.25em] text-green-400">
            {preview ? "PREVIEW COMPLETE" : "VOTE COUNTED"}
          </p>
          <h1 className="mt-3 font-display text-4xl text-bone">{submittedPlayer}</h1>
          <p className="mt-3 text-sm text-bone/50">
            {preview ? "This was only a preview. No vote was recorded." : "Your MVP vote is locked in."}
          </p>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setSubmittedPlayer(null);
                setSelected(null);
              }}
              className="mt-6 min-h-12 w-full rounded-xl border border-line px-4 font-head text-sm font-black text-bone"
            >
              Back to Ballot
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-ink px-4 pb-28 pt-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        {preview && (
          <div className="mb-6 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-center font-mono text-xs font-bold tracking-wider text-yellow-200">
            ADMIN PREVIEW · VOTES WILL NOT BE RECORDED
          </div>
        )}
        <header className="text-center">
          <p className="font-mono text-xs font-bold tracking-[0.3em] text-young-light">YOUNGKNIGHTS VS ALUMKNIGHTS</p>
          <h1 className="mt-3 font-display text-5xl leading-none text-bone sm:text-7xl">VOTE FOR<br />YOUR MVP.</h1>
          <p className="mt-4 text-sm text-bone/50">Choose one player. Your vote cannot be changed.</p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {players.map((player) => {
            const active = selected === player.id;
            const isYoung = player.team.slug === "youngknights";
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelected(player.id)}
                className={`overflow-hidden rounded-2xl border text-left transition active:scale-[0.98] ${
                  active
                    ? isYoung
                      ? "border-young bg-young/15 ring-2 ring-young"
                      : "border-alum bg-alum/15 ring-2 ring-alum"
                    : "border-line bg-panel"
                }`}
              >
                <div className="relative aspect-[4/3] bg-panelLight">
                  {player.image_url ? (
                    <Image src={player.image_url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" unoptimized className="object-cover object-top" />
                  ) : (
                    <div className="grid h-full place-items-center font-display text-5xl text-bone/15">{player.name.charAt(0)}</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-head text-sm font-black text-bone">{player.name}</p>
                  <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${isYoung ? "text-young-light" : "text-alum-light"}`}>{player.team.name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="mt-4 text-center text-sm text-young-light">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/95 p-4 backdrop-blur">
        <button
          type="button"
          disabled={!selected || submitting}
          onClick={
            preview
              ? () => selectedPlayer && setSubmittedPlayer(selectedPlayer.name)
              : submitVote
          }
          className="mx-auto block min-h-14 w-full max-w-md rounded-2xl bg-bone px-5 font-head text-base font-black text-ink disabled:opacity-35"
        >
          {preview
            ? selectedPlayer
              ? `PREVIEW: ${selectedPlayer.name.toUpperCase()} SELECTED`
              : "SELECT A PLAYER TO PREVIEW"
            : submitting
              ? "COUNTING VOTE..."
              : selectedPlayer
                ? `VOTE FOR ${selectedPlayer.name.toUpperCase()}`
                : "SELECT A PLAYER"}
        </button>
      </div>
    </main>
  );
}
