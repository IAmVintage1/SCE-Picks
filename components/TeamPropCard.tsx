"use client";

import { Team, TeamProp } from "@/lib/types";

// Compact SQUARE variant of a team prop, used to feature a game
// bet inside the main player grid (which is itself squarish),
// since the full-size TeamPropCard below is a wide rectangle
// and gets missed outside the GAME tab.
export function SquareTeamPropCard({
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

  const isWinningTeam = prop.prop_type === "winning_team";

  return (
    <article className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl border-2 border-bone/50 bg-gradient-to-br from-young/25 via-ink to-alum/25 shadow-[0_0_30px_-10px_rgba(245,244,241,0.35)]">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-bone px-2 py-0.5 font-mono text-[8px] font-black tracking-[0.12em] text-ink">
        🎮 GAME BET
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-3 pt-8 text-center">
        <p className="font-head text-sm font-black uppercase leading-tight text-bone">
          {isWinningTeam ? "WINNING TEAM" : "COMBINED PTS"}
        </p>

        {!isWinningTeam && (
          <p className="mt-1 font-display text-3xl leading-none text-bone">
            {prop.line}
          </p>
        )}
      </div>

      {isWinningTeam ? (
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
          <button
            disabled={prop.locked}
            onClick={() => onSelect("youngknights")}
            className={`py-3 text-center font-mono text-[9px] font-black tracking-[0.08em] transition disabled:opacity-30 ${
              selection === "youngknights"
                ? "bg-young text-white"
                : "bg-panel text-young-light active:bg-panelLight"
            }`}
          >
            {young?.name.toUpperCase().slice(0, 5) ?? "YOUNG"}
          </button>
          <button
            disabled={prop.locked}
            onClick={() => onSelect("alumknights")}
            className={`py-3 text-center font-mono text-[9px] font-black tracking-[0.08em] transition disabled:opacity-30 ${
              selection === "alumknights"
                ? "bg-alum text-white"
                : "bg-panel text-alum-light active:bg-panelLight"
            }`}
          >
            {alum?.name.toUpperCase().slice(0, 5) ?? "ALUM"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
          <button
            disabled={prop.locked}
            onClick={() => onSelect("more")}
            className={`py-3 text-center font-mono text-[9px] font-black tracking-[0.1em] transition disabled:opacity-30 ${
              selection === "more"
                ? "bg-bone text-ink"
                : "bg-panel text-bone/60 active:bg-panelLight"
            }`}
          >
            MORE
          </button>
          <button
            disabled={prop.locked}
            onClick={() => onSelect("less")}
            className={`py-3 text-center font-mono text-[9px] font-black tracking-[0.1em] transition disabled:opacity-30 ${
              selection === "less"
                ? "bg-bone text-ink"
                : "bg-panel text-bone/60 active:bg-panelLight"
            }`}
          >
            LESS
          </button>
        </div>
      )}
    </article>
  );
}

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
    return (
      <div className="relative overflow-hidden rounded-2xl border border-bone/40 bg-panel shadow-card">
        <div className="absolute left-3 top-3 z-10 rounded-full bg-bone px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-ink">
          FEATURED
        </div>
        <div className="p-4 pt-9 text-center">
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-bone/40">
            GAME PROP
          </p>
          <p className="mt-1 font-head text-lg font-bold tracking-wide text-bone">
            WINNING TEAM
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
          <button
            disabled={prop.locked}
            onClick={() => onSelect("youngknights")}
            className={`flex flex-col items-center gap-1 bg-panel py-4 font-head text-sm font-bold tracking-[0.06em] transition disabled:opacity-30 ${
              selection === "youngknights"
                ? "bg-young text-white shadow-glowRed"
                : "text-young-light active:bg-panelLight"
            }`}
          >
            {selection === "youngknights" && (
              <span className="animate-pop text-xs">&#10003;</span>
            )}
            {young?.name.toUpperCase() ?? "YOUNGKNIGHTS"}
          </button>
          <button
            disabled={prop.locked}
            onClick={() => onSelect("alumknights")}
            className={`flex flex-col items-center gap-1 bg-panel py-4 font-head text-sm font-bold tracking-[0.06em] transition disabled:opacity-30 ${
              selection === "alumknights"
                ? "bg-alum text-white shadow-glowBlue"
                : "text-alum-light active:bg-panelLight"
            }`}
          >
            {selection === "alumknights" && (
              <span className="animate-pop text-xs">&#10003;</span>
            )}
            {alum?.name.toUpperCase() ?? "ALUMKNIGHTS"}
          </button>
        </div>
      </div>
    );
  }

  // combined_points
  return (
    <div className="relative overflow-hidden rounded-2xl border border-bone/40 bg-panel shadow-card">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-bone px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-ink">
        FEATURED
      </div>
      <div className="p-4 pt-9 text-center">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-bone/40">
          GAME PROP
        </p>
        <p className="mt-1 font-head text-lg font-bold tracking-wide text-bone">
          COMBINED POINTS
        </p>
        <p className="tabular mt-2 font-display text-5xl leading-none text-bone">
          {prop.line}
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-bone/35">
          PREVIOUS SCE GAME: 128 TOTAL POINTS
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
        <button
          disabled={prop.locked}
          onClick={() => onSelect("more")}
          className={`flex items-center justify-center gap-1.5 bg-panel py-3.5 font-head text-sm font-bold tracking-[0.08em] transition disabled:opacity-30 ${
            selection === "more"
              ? "bg-bone text-ink"
              : "text-bone/60 active:bg-panelLight"
          }`}
        >
          {selection === "more" && (
            <span className="animate-pop text-xs">&#10003;</span>
          )}
          MORE
        </button>
        <button
          disabled={prop.locked}
          onClick={() => onSelect("less")}
          className={`flex items-center justify-center gap-1.5 bg-panel py-3.5 font-head text-sm font-bold tracking-[0.08em] transition disabled:opacity-30 ${
            selection === "less"
              ? "bg-bone text-ink"
              : "text-bone/60 active:bg-panelLight"
          }`}
        >
          {selection === "less" && (
            <span className="animate-pop text-xs">&#10003;</span>
          )}
          LESS
        </button>
      </div>
    </div>
  );
}
