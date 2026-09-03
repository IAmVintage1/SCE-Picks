"use client";

import { useEffect, useState } from "react";
import { STAT_SHORT, StatType } from "@/lib/types";

interface Submission {
  id: string;
  submission_code: string;
  submitted_at: string;
  status: string;
  user: { name: string; instagram_username: string | null; email: string | null } | null;
  picks: {
    id: string;
    selection: "over" | "under";
    result: string;
    prop: {
      line: number;
      stat_type: StatType;
      player: { name: string; team: { name: string } };
    };
  }[];
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(q?: string) {
    setLoading(true);
    const url = q ? `/api/admin/submissions?q=${encodeURIComponent(q)}` : "/api/admin/submissions";
    const res = await fetch(url);
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(query)}
          placeholder="Search by name, Instagram, or submission ID"
          className="w-full max-w-md rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
        />
        <button
          onClick={() => load(query)}
          className="rounded-lg bg-bone px-4 py-2 text-sm font-semibold text-ink"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-bone/40">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-bone/40">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-semibold tracking-wide text-bone">
                    #{s.submission_code} &middot; {s.user?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-bone/40">
                    {s.user?.instagram_username ? `@${s.user.instagram_username}` : "No Instagram"}
                    {" · "}
                    {new Date(s.submitted_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full border border-line px-2 py-1 text-[11px] uppercase text-bone/50">
                  {s.status}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {s.picks.map((p) => (
                  <p key={p.id} className="text-sm text-bone/70">
                    {p.prop.player.name} ({p.prop.player.team.name}) &mdash;{" "}
                    {p.selection.toUpperCase()} {p.prop.line}{" "}
                    {STAT_SHORT[p.prop.stat_type]}
                    {p.result !== "pending" && (
                      <span
                        className={
                          p.result === "hit" ? "text-alum-light" : "text-young-light"
                        }
                      >
                        {" "}
                        &middot; {p.result.toUpperCase()}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
