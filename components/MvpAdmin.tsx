"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type VoteRow = { id: string; name: string; team_name: string; team_slug: string; votes: number };

export default function MvpAdmin() {
  const [rows, setRows] = useState<VoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/mvp", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load votes.");
      setRows(body.votes);
      setTotal(body.total);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load votes.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const high = rows[0]?.votes || 0;
  const leaders = high > 0 ? rows.filter((row) => row.votes === high) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-bone/40">LIVE RESULTS</p>
        <h1 className="mt-1 font-display text-4xl text-bone">MVP VOTING</h1>
        <Link
          href="/picks?preview=mvp"
          target="_blank"
          className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-bone px-5 font-head text-sm font-black text-ink"
        >
          Preview MVP Ballot
        </Link>
      </div>
      {error && <p role="alert" className="rounded-xl border border-young p-3 text-young-light">{error}</p>}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-xs font-bold tracking-wider text-bone/40">CURRENT WINNER</p>
        <p className="mt-2 font-display text-4xl text-bone">{leaders.length ? leaders.map((row) => row.name).join(" / ") : "NO VOTES YET"}</p>
        <p className="mt-2 text-sm text-bone/50">{high} leading votes · {total} total votes</p>
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        {rows.map((row, index) => {
          const percent = total ? Math.round((row.votes / total) * 100) : 0;
          return (
            <div key={row.id} className="border-b border-line p-4 last:border-0">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-head font-black text-bone">{index + 1}. {row.name}</p>
                  <p className={row.team_slug === "youngknights" ? "text-xs text-young-light" : "text-xs text-alum-light"}>{row.team_name}</p>
                </div>
                <div className="text-right">
                  <b className="font-display text-2xl text-bone">{row.votes}</b>
                  <p className="text-xs text-bone/40">{percent}%</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink2">
                <div className={row.team_slug === "youngknights" ? "h-full bg-young" : "h-full bg-alum"} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </section>
      <p className="text-center text-xs text-bone/35">Updates automatically every 5 seconds.</p>
    </div>
  );
}
