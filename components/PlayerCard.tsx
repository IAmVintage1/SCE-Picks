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

  const teamAccent = isYoung ? "text-young-light" : "text-alum-light";
  const teamGlow = isYoung ? "shadow-glowRed" : "shadow-glowBlue";
  const teamRing = isYoung ? "border-young/25" : "border-alum/25";
  const teamGradient = isYoung
    ? "from-young-dark/70 via-young-dark/10"
    : "from-alum-dark/70 via-alum-dark/10";
  const selectedBg = isYoung ? "bg-young" : "bg-alum";
  const selectedShadow = isYoung ? "shadow-glowRed" : "shadow-glowBlue";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${teamRing} bg-panel ${teamGlow}`}
    >
      <div className="flex">
        {/* Large portrait photo block */}
        <div className="relative h-36 w-28 shrink-0 overflow-hidden bg-panelLight sm:h-40 sm:w-32">
          {prop.player.image_url ? (
            <Image
              src={prop.player.image_url}
              alt={prop.player.name}
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-display text-4xl text-bone/15">
                {prop.player.name.charAt(0)}
              </span>
            </div>
          )}
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${teamGradient} to-transparent`}
          />
          <div className="grain-overlay opacity-30" />
        </div>

        {/* Info + stat */}
        <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
          <div>
            <p className="truncate font-head text-lg font-bold leading-tight text-bone sm:text-xl">
              {prop.player.name}
            </p>
            <p
              className={`text-[11px] font-bold tracking-[0.15em] ${teamAccent}`}
            >
              {team.name.toUpperCase()}
            </p>
          </div>

          <div className="mt-2 flex items-end justify-between">
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-bone/40">
              {STAT_LABELS[prop.stat_type]}
            </p>
            <p className="tabular font-display text-4xl leading-none text-bone sm:text-5xl">
              {prop.line}
            </p>
          </div>
        </div>
      </div>

      {/* Over / Under selector */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
        <SelectButton
          label="OVER"
          active={selection === "over"}
          disabled={prop.locked}
          activeBg={selectedBg}
          activeShadow={selectedShadow}
          onClick={() => onSelect("over")}
        />
        <SelectButton
          label="UNDER"
          active={selection === "under"}
          disabled={prop.locked}
          activeBg={selectedBg}
          activeShadow={selectedShadow}
          onClick={() => onSelect("under")}
        />
      </div>

      {prop.locked && (
        <div className="absolute right-3 top-3 rounded-full bg-ink/80 px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-bone/60 backdrop-blur">
          LOCKED
        </div>
      )}
    </div>
  );
}

function SelectButton({
  label,
  active,
  disabled,
  activeBg,
  activeShadow,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  activeBg: string;
  activeShadow: string;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-1.5 bg-panel py-3.5 font-head text-sm font-bold tracking-[0.08em] transition-all duration-150 disabled:opacity-30 ${
        active
          ? `${activeBg} ${activeShadow} text-white`
          : "text-bone/60 active:bg-panelLight"
      }`}
    >
      {active && (
        <span className="animate-pop inline-block text-xs">&#10003;</span>
      )}
      {label}
    </button>
  );
}
