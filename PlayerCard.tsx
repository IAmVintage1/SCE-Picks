"use client";

import Image from "next/image";
import { PropWithPlayer, STAT_LABELS } from "@/lib/types";

export default function PlayerCard({
  prop,
  selection,
  onSelect,
}: {
  prop: PropWithPlayer;
  selection: "over" | "under" | null;
  onSelect: (selection: "over" | "under") => void;
}) {
  const team = prop.player.team;
  const isYoung = team.slug === "youngknights";
  const accent = isYoung ? "text-young-light" : "text-alum-light";
  const accentBg = isYoung ? "bg-young" : "bg-alum";

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-panelLight">
          {prop.player.image_url ? (
            <Image
              src={prop.player.image_url}
              alt={prop.player.name}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-display text-xl font-semibold text-bone/25">
                {prop.player.name.charAt(0)}
              </span>
            </div>
          )}
          <div className={`absolute inset-x-0 bottom-0 h-1 ${accentBg}`} />
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <p className="truncate font-display text-lg font-semibold leading-tight text-bone">
            {prop.player.name}
          </p>
          <p className={`text-xs font-semibold tracking-wide ${accent}`}>
            {team.name.toUpperCase()}
          </p>
          <p className="mt-1 text-[11px] font-medium tracking-wider text-bone/40">
            {STAT_LABELS[prop.stat_type]}
          </p>
        </div>

        <div className="flex flex-col items-end justify-center">
          <span className="font-display text-3xl font-bold text-bone">
            {prop.line}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-line">
        <button
          disabled={prop.locked}
          onClick={() => onSelect("over")}
          className={`py-3 text-center font-display text-sm font-semibold tracking-wide transition disabled:opacity-40 ${
            selection === "over"
              ? "bg-bone text-ink"
              : "text-bone/70 active:bg-panelLight"
          }`}
        >
          OVER
        </button>
        <button
          disabled={prop.locked}
          onClick={() => onSelect("under")}
          className={`border-l border-line py-3 text-center font-display text-sm font-semibold tracking-wide transition disabled:opacity-40 ${
            selection === "under"
              ? "bg-bone text-ink"
              : "text-bone/70 active:bg-panelLight"
          }`}
        >
          UNDER
        </button>
      </div>
    </div>
  );
}
