"use client";

import Image from "next/image";
import { PropWithPlayer, STAT_LABELS } from "@/lib/types";

export default function PlayerCard({
  props,
  primaryPropId,
  getSelection,
  onSelect,
  onOpenProfile,
}: {
  props: PropWithPlayer[];
  primaryPropId?: string;
  getSelection: (propId: string) => "over" | "under" | null;
  onSelect: (prop: PropWithPlayer, selection: "over" | "under") => void;
  onOpenProfile?: () => void;
}) {
  const primary =
    props.find((p) => p.id === primaryPropId) ?? props[0];

  if (!primary) return null;

  const player = primary.player;

  const isYoung = player.team.slug === "youngknights";

  const accentText = isYoung
    ? "text-young-light"
    : "text-alum-light";

  const accentBorder = isYoung
    ? "border-young/35"
    : "border-alum/35";

  const accentBg = isYoung
    ? "bg-young"
    : "bg-alum";

  const selected = getSelection(primary.id);

  const otherProps = props.filter(
    (p) => p.id !== primary.id
  );

  const tags = player.bio_tags?.slice(0, 2) ?? [];

  return (
    <article
      className={`
        group relative overflow-hidden
        border ${accentBorder}
        bg-panel shadow-card
        transition duration-200
        hover:-translate-y-0.5
        ${isYoung ? "hover:shadow-glowRed" : "hover:shadow-glowBlue"}
      `}
    >
      {/* PLAYER IMAGE */}
      <div className="relative aspect-[4/5] overflow-hidden bg-panelLight">
        {player.image_url ? (
          <button
            type="button"
            onClick={onOpenProfile}
            className="absolute inset-0 z-10 block w-full cursor-pointer text-left"
            aria-label={`View ${player.name} profile`}
          >
            <Image
              src={player.image_url}
              alt={player.name}
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1200px) 30vw, 280px"
              className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfile}
            className="absolute inset-0 z-10 flex items-center justify-center"
            aria-label={`View ${player.name} profile`}
          >
            <span className="font-display text-7xl text-bone/10">
              {player.name.charAt(0)}
            </span>
          </button>
        )}

        {/* IMAGE GRADIENT */}
        <div
          className={`
            pointer-events-none absolute inset-0
            bg-gradient-to-t
            ${
              isYoung
                ? "from-young-dark/95 via-black/20"
                : "from-alum-dark/95 via-black/20"
            }
            to-transparent
          `}
        />

        <div className="grain-overlay opacity-25" />

        {/* FEATURED / HOT */}
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          {primary.featured && (
            <span className="border border-bone/25 bg-ink/75 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.16em] text-bone backdrop-blur">
              FEATURED
            </span>
          )}

          {props.some((p) => p.featured) && !primary.featured && (
            <span className="border border-bone/20 bg-ink/65 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.16em] text-bone/80 backdrop-blur">
              HOT
            </span>
          )}
        </div>

        {/* PLAYER NAME */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-4">
          <button
            type="button"
            onClick={onOpenProfile}
            className="block max-w-full text-left"
          >
            <p className="truncate font-display text-[25px] leading-[0.92] tracking-tight text-white sm:text-3xl">
              {player.name}
            </p>

            <p
              className={`
                mt-1
                font-mono text-[9px]
                font-bold tracking-[0.18em]
                ${accentText}
              `}
            >
              {player.team.name.toUpperCase()}
            </p>
          </button>
        </div>
      </div>

      {/* CARD CONTENT */}
      <div className="p-3 sm:p-4">
        {/* PRIMARY PROP */}
        <div>
          {/* LINE */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-bold tracking-[0.15em] text-bone/35">
                {STAT_LABELS[primary.stat_type]}
              </p>

              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-[38px] leading-none tracking-tight text-bone sm:text-[44px]">
                  {primary.line}
                </span>

                {selected && (
                  <span
                    className={`
                      font-mono text-[8px]
                      font-bold tracking-[0.1em]
                      ${accentText}
                    `}
                  >
                    {selected === "over" ? "MORE" : "LESS"}
                  </span>
                )}
              </div>
            </div>

            <span className="mb-1 shrink-0 text-[9px] font-semibold text-bone/25">
              {props.length} PROPS
            </span>
          </div>

          {/* MORE / LESS BUTTONS */}
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <SelectButton
              label="MORE"
              active={selected === "over"}
              disabled={primary.locked}
              activeBg={accentBg}
              onClick={() =>
                onSelect(primary, "over")
              }
            />

            <SelectButton
              label="LESS"
              active={selected === "under"}
              disabled={primary.locked}
              activeBg={accentBg}
              onClick={() =>
                onSelect(primary, "under")
              }
            />
          </div>
        </div>

        {/* ADDITIONAL PROPS */}
        {otherProps.length > 0 && (
          <div className="mt-3 border-t border-line pt-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold tracking-[0.14em] text-bone/35">
                MORE PROPS
              </span>

              <span
                className={`
                  font-mono text-[9px]
                  font-bold
                  ${accentText}
                `}
              >
                +{otherProps.length}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {otherProps.slice(0, 3).map((prop) => {
                const selection = getSelection(prop.id);

                return (
                  <button
                    key={prop.id}
                    type="button"
                    disabled={prop.locked}
                    onClick={onOpenProfile}
                    className={`
                      border px-2 py-1.5
                      text-left transition
                      ${
                        selection
                          ? `${accentBorder} bg-panelLight`
                          : "border-line bg-ink2"
                      }
                    `}
                    title={`${STAT_LABELS[prop.stat_type]} ${prop.line}`}
                  >
                    <span className="block font-mono text-[8px] font-bold text-bone/45">
                      {STAT_LABELS[prop.stat_type]}
                    </span>

                    <span className="tabular block font-display text-sm leading-none text-bone">
                      {prop.line}
                    </span>
                  </button>
                );
              })}
            </div>

            {otherProps.length > 3 && (
              <button
                type="button"
                onClick={onOpenProfile}
                className={`
                  mt-2
                  font-mono text-[9px]
                  font-bold tracking-[0.12em]
                  ${accentText}
                `}
              >
                VIEW ALL {otherProps.length} MORE PROPS →
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   MORE / LESS BUTTON
   ========================================================= */

function SelectButton({
  label,
  active,
  disabled,
  activeBg,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  activeBg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        relative
        min-h-11
        w-full
        font-head
        text-sm
        font-bold
        tracking-[0.08em]
        transition
        duration-150
        disabled:cursor-not-allowed
        disabled:opacity-25
        ${
          active
            ? `${activeBg} text-white shadow-lg`
            : "bg-panelLight text-bone/60 hover:bg-line active:scale-[0.98]"
        }
      `}
    >
      {active && (
        <span className="mr-1 animate-pop text-xs">
          ✓
        </span>
      )}

      {label}
    </button>
  );
}
