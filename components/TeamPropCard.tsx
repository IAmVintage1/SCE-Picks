"use client";

import { Team, TeamProp } from "@/lib/types";

export default function TeamPropCard({
  prop,
  teams,
  selection,
  onSelect,
}: {
  prop: TeamProp;
  teams: Team[];
  selection: string | null;
  onSelect: (selection: string) => void;
}) {
  const young = teams.find((t) => t.slug === "youngknights");
  const alum = teams.find((t) => t.slug === "alumknights");

  if (prop.prop_type === "winning_team") {
    const youngSelected = selection === "youngknights";
    const alumSelected = selection === "alumknights";

    return (
      <div className="relative overflow-hidden rounded-2xl border border-bone/40 bg-panel shadow-card">
        <div className="absolute left-3 top-3 z-10 rounded-full bg-bone px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-ink">
          FEATURED
        </div>

        <div className="relative overflow-hidden px-4 pb-4 pt-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(239,68,68,0.13),transparent_36%),radial-gradient(circle_at_75%_30%,rgba(59,130,246,0.13),transparent_36%)]" />
          <div className="relative z-10">
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-bone/40">
              GAME PROP
            </p>
            <p className="mt-1 font-head text-xl font-bold tracking-wide text-bone">
              WINNING TEAM
            </p>
            <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-bone/30">
              PICK THE WINNER
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-px border-t border-line bg-line">
          <button
            disabled={prop.locked}
            onClick={() => onSelect("youngknights")}
            className={`relative isolate flex min-h-[92px] flex-col items-center justify-center gap-2 overflow-hidden px-3 py-5 font-head text-sm font-bold tracking-[0.06em] transition-all duration-200 active:scale-[0.98] disabled:opacity-30 ${
              youngSelected
                ? "bg-young text-white shadow-glowRed"
                : "bg-panel text-young-light hover:bg-young/10"
            }`}
          >
            {youngSelected && (
              <>
                <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_62%)]" />
                <span className="animate-pop text-base leading-none">✓</span>
              </>
            )}
            <span>{young?.name.toUpperCase() ?? "YOUNGKNIGHTS"}</span>
            <span className={`font-mono text-[8px] font-bold tracking-[0.14em] ${youngSelected ? "text-white/75" : "text-young-light/45"}`}>
              {youngSelected ? "YOUR PICK" : "SELECT"}
            </span>
          </button>

          <button
            disabled={prop.locked}
            onClick={() => onSelect("alumknights")}
            className={`relative isolate flex min-h-[92px] flex-col items-center justify-center gap-2 overflow-hidden px-3 py-5 font-head text-sm font-bold tracking-[0.06em] transition-all duration-200 active:scale-[0.98] disabled:opacity-30 ${
              alumSelected
                ? "bg-alum text-white shadow-glowBlue"
                : "bg-panel text-alum-light hover:bg-alum/10"
            }`}
          >
            {alumSelected && (
              <>
                <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_62%)]" />
                <span className="animate-pop text-base leading-none">✓</span>
              </>
            )}
            <span>{alum?.name.toUpperCase() ?? "ALUMKNIGHTS"}</span>
            <span className={`font-mono text-[8px] font-bold tracking-[0.14em] ${alumSelected ? "text-white/75" : "text-alum-light/45"}`}>
              {alumSelected ? "YOUR PICK" : "SELECT"}
            </span>
          </button>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bone/15 bg-ink font-mono text-[8px] font-black text-bone/50 shadow-lg">
            VS
          </div>
        </div>
      </div>
    );
  }

  const moreSelected = selection === "more";
  const lessSelected = selection === "less";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bone/40 bg-panel shadow-card">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-bone px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-ink">
        FEATURED
      </div>

      <div className="relative overflow-hidden p-4 pt-9 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.04),transparent_42%)]" />
        <div className="relative z-10">
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-bone/40">
            GAME PROP
          </p>
          <p className="mt-1 font-head text-lg font-bold tracking-wide text-bone">
            COMBINED POINTS
          </p>
          <p className="tabular mt-2 font-display text-5xl leading-none text-bone transition-transform duration-200">
            {prop.line}
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-bone/35">
            PREVIOUS SCE GAME: 128 TOTAL POINTS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
        <button
          disabled={prop.locked}
          onClick={() => onSelect("more")}
          className={`relative isolate flex min-h-[60px] items-center justify-center gap-1.5 overflow-hidden py-3.5 font-head text-sm font-bold tracking-[0.08em] transition-all duration-200 active:scale-[0.98] disabled:opacity-30 ${
            moreSelected
              ? "bg-young text-white shadow-glowRed"
              : "bg-panel text-bone/60 hover:bg-young/10 hover:text-young-light"
          }`}
        >
          {moreSelected && (
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_64%)]" />
          )}
          {moreSelected && (
            <span className="animate-pop text-xs">✓</span>
          )}
          MORE
        </button>

        <button
          disabled={prop.locked}
          onClick={() => onSelect("less")}
          className={`relative isolate flex min-h-[60px] items-center justify-center gap-1.5 overflow-hidden py-3.5 font-head text-sm font-bold tracking-[0.08em] transition-all duration-200 active:scale-[0.98] disabled:opacity-30 ${
            lessSelected
              ? "bg-alum text-white shadow-glowBlue"
              : "bg-panel text-bone/60 hover:bg-alum/10 hover:text-alum-light"
          }`}
        >
          {lessSelected && (
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_64%)]" />
          )}
          {lessSelected && (
            <span className="animate-pop text-xs">✓</span>
          )}
          LESS
        </button>
      </div>
    </div>
  );
}
