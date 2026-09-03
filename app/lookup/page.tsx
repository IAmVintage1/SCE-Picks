"use client";

import { useState } from "react";
import Link from "next/link";
import { STAT_SHORT, StatType } from "@/lib/types";

interface PickRow {
  id: string;
  selection: "over" | "under";
  result: "pending" | "hit" | "miss" | "push";
  prop: {
    line: number;
    stat_type: StatType;
    player: { name: string; team: { name: string } } | null;
  } | null;
}

interface TeamPickRow {
  id: string;
  selection: string;
  result: "pending" | "hit" | "miss" | "push";
  team_prop: {
    prop_type: "winning_team" | "combined_points";
    line: number | null;
  } | null;
}

interface Submission {
  submission_code: string;
  submitted_at: string;
  pick_count: number;
  prize_tier: number | null;
  card_status: "pending" | "perfect" | "busted";
  user: { name: string; instagram_username: string | null } | null;
  picks: PickRow[];
  team_picks: TeamPickRow[];
}

const RESULT_STYLE: Record<string, string> = {
  hit: "text-alum-light",
  miss: "text-young-light",
  push: "text-bone/50",
  pending: "text-bone/30",
};

export default function LookupPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setSubmission(null);

    try {
      const res = await fetch(
        `/api/lookup?code=${encodeURIComponent(code.trim())}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Card not found.");
        return;
      }

      setSubmission(data.submission);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-bone sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bone/30">
            LOOK UP YOUR CARD
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase leading-[0.9] text-bone">
            CHECK YOUR PICKS
          </h1>
          <p className="mt-2 text-sm text-bone/40">
            Enter the code from your locked card.
          </p>
        </div>

        <form onSubmit={handleLookup} className="mt-6 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SCE-12345"
            className="flex-1 rounded-full border border-line bg-panel px-4 py-3 text-center font-mono text-sm uppercase tracking-wider text-bone placeholder:text-bone/25 focus:border-bone/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-bone px-5 py-3 font-head text-xs font-black uppercase tracking-wider text-ink disabled:opacity-50"
          >
            {loading ? "..." : "FIND"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-center text-sm text-young-light">
            {error}
          </p>
        )}

        {submission && (
          <div className="flex-card-in mt-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-panel via-ink to-ink shadow-2xl">
            <div className="border-b border-line px-6 py-5 text-center">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-bone/35">
                #{submission.submission_code}
              </p>
              <h2 className="mt-1 font-display text-2xl uppercase text-bone">
                {submission.user?.name ?? "Your card"}
              </h2>

              <p
                className={`mt-2 inline-block rounded-full border px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${
                  submission.card_status === "perfect"
                    ? "border-alum-light/50 bg-alum/10 text-alum-light"
                    : submission.card_status === "busted"
                    ? "border-young-light/50 bg-young/10 text-young-light"
                    : "border-line text-bone/40"
                }`}
              >
                {submission.card_status === "perfect"
                  ? "PERFECT CARD"
                  : submission.card_status === "busted"
                  ? "CARD BUSTED"
                  : "PENDING"}
              </p>
            </div>

            <div className="space-y-2 px-4 py-4">
              {submission.picks.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-panel px-3.5 py-2.5"
                >
                  <p className="truncate font-head text-sm font-bold text-bone">
                    {p.prop?.player?.name}{" "}
                    <span className="text-bone/35">
                      {p.selection === "over" ? "MORE" : "LESS"}{" "}
                      {p.prop?.line}{" "}
                      {p.prop
                        ? STAT_SHORT[p.prop.stat_type]
                        : ""}
                    </span>
                  </p>
                  <span
                    className={`shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.1em] ${
                      RESULT_STYLE[p.result]
                    }`}
                  >
                    {p.result === "pending" ? "..." : p.result}
                  </span>
                </div>
              ))}

              {submission.team_picks.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-panel px-3.5 py-2.5"
                >
                  <p className="truncate font-head text-sm font-bold text-bone">
                    {p.team_prop?.prop_type === "winning_team"
                      ? "Winning Team"
                      : "Combined Points"}{" "}
                    <span className="text-bone/35">
                      {p.selection.toUpperCase()}
                    </span>
                  </p>
                  <span
                    className={`shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.1em] ${
                      RESULT_STYLE[p.result]
                    }`}
                  >
                    {p.result === "pending" ? "..." : p.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/picks"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-6 font-head text-sm font-black uppercase tracking-wider text-bone/60 hover:text-bone"
          >
            BACK TO PICKS
          </Link>
        </div>
      </div>
    </main>
  );
}
