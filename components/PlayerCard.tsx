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
  onSelect: (
    prop: PropWithPlayer,
    selection: "over" | "under"
  ) => void;
  onOpenProfile?: () => void;
}) {
  const primary =
    props.find((p) => p.id === primaryPropId) ?? props[0];

  if (!primary) return null;

  const player = primary.player;

  const isYoung =
    player.team.slug === "youngknights";

  const accentText = isYoung
    ? "text-young-light"
    : "text-alum-light";

  const accentBorder = isYoung
    ? "border-young/35"
    : "border-alum/35";

  const accentBg = isYoung
    ? "bg-young"
    : "bg-alum";

  const accentSoft = isYoung
    ? "bg-young/10"
    : "bg-alum/10";

  const selected =
    getSelection(primary.id);

  const otherProps =
    props.filter(
      (p) => p.id !== primary.id
    );

  return (
    <article
      className={`
        group relative overflow-hidden border
        ${accentBorder}
        bg-panel
        shadow-card
        transition-all duration-300
        ${
          selected
            ? `${accentBorder} -translate-y-0.5 shadow-lg`
            : "hover:-translate-y-0.5"
        }
        ${
          isYoung
            ? "hover:shadow-glowRed"
            : "hover:shadow-glowBlue"
        }
      `}
    >
      {/* ================================================== */}
      {/* PLAYER IMAGE                                        */}
      {/* ================================================== */}

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
              className="
                object-cover
                object-top
                transition-transform
                duration-500
                group-hover:scale-[1.04]
              "
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfile}
            className="absolute inset-0 z-10 flex items-center justify-center"
            aria-label={`View ${player.name} profile`}
          >
            <span
              className={`font-display text-7xl ${accentText} opacity-20`}
            >
              {player.name.charAt(0)}
            </span>
          </button>
        )}

        {/* IMAGE OVERLAY */}
        <div
          className={`
            pointer-events-none absolute inset-0
            bg-gradient-to-t
            ${
              isYoung
                ? "from-young-dark/95"
                : "from-alum-dark/95"
            }
            via-black/20
            to-transparent
          `}
        />

        <div className="grain-overlay opacity-25" />

        {/* ================================================= */}
        {/* BADGES                                              */}
        {/* ================================================= */}

        <div className="absolute left-3 top-3 z-20 flex gap-1.5">

          {primary.featured && (
            <span
              className="
                border border-bone/25
                bg-ink/75
                px-2 py-1
                font-mono text-[8px]
                font-bold tracking-[0.16em]
                text-bone
                backdrop-blur
              "
            >
              🔥 HOT
            </span>
          )}

          {!primary.featured &&
            props.some(
              (p) => p.featured
            ) && (
              <span
                className="
                  border border-bone/20
                  bg-ink/65
                  px-2 py-1
                  font-mono text-[8px]
                  font-bold tracking-[0.16em]
                  text-bone/80
                  backdrop-blur
                "
              >
                HOT PROPS
              </span>
            )}

        </div>

        {/* SELECTED BADGE */}
        {selected && (
          <div
            className={`
              absolute right-3 top-3 z-20
              flex items-center gap-1.5
              border border-white/20
              ${accentBg}
              px-2 py-1
              font-mono text-[8px]
              font-bold tracking-[0.12em]
              text-white
              shadow-lg
              animate-pulse
            `}
          >
            <span>✓</span>
            ON CARD
          </div>
        )}

        {/* ================================================= */}
        {/* PLAYER NAME                                        */}
        {/* ================================================= */}

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

      {/* ================================================== */}
      {/* PROP AREA                                           */}
      {/* ================================================== */}

      <div className="p-3 sm:p-4">

        {/* PRIMARY PROP */}
        <div
          className={`
            relative overflow-hidden
            border
            ${
              selected
                ? `${accentBorder} ${accentSoft}`
                : "border-line bg-ink2"
            }
            p-3
            transition-all duration-300
          `}
        >

          {selected && (
            <div
              className={`
                absolute inset-y-0 left-0 w-1
                ${accentBg}
              `}
            />
          )}

          <div className="flex items-end justify-between gap-2">

            <div className="min-w-0">

              <p className="font-mono text-[8px] font-bold tracking-[0.15em] text-bone/35">
                {STAT_LABELS[
                  primary.stat_type
                ]}
              </p>

              <div className="mt-0.5 flex items-baseline gap-2">

                <span className="font-display text-[38px] leading-none tracking-tight text-bone">
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
                    {selected === "over"
                      ? "MORE"
                      : "LESS"}
                  </span>
                )}

              </div>

            </div>

            {/* MORE / LESS */}
            <div className="grid w-[112px] shrink-0 grid-cols-2 gap-1">

              <button
                type="button"
                disabled={primary.locked}
                onClick={() =>
                  onSelect(
                    primary,
                    "over"
                  )
                }
                className={`
                  min-h-11
                  font-head text-[9px]
                  font-bold tracking-[0.06em]
                  transition-all duration-200
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-25
                  ${
                    selected ===
                    "over"
                      ? `${accentBg} text-white shadow-lg`
                      : "bg-panelLight text-bone/55 hover:bg-line hover:text-bone"
                  }
                `}
              >
                {selected ===
                "over"
                  ? "✓ MORE"
                  : "MORE"}
              </button>

              <button
                type="button"
                disabled={primary.locked}
                onClick={() =>
                  onSelect(
                    primary,
                    "under"
                  )
                }
                className={`
                  min-h-11
                  font-head text-[9px]
                  font-bold tracking-[0.06em]
                  transition-all duration-200
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-25
                  ${
                    selected ===
                    "under"
                      ? `${accentBg} text-white shadow-lg`
                      : "bg-panelLight text-bone/55 hover:bg-line hover:text-bone"
                  }
                `}
              >
                {selected ===
                "under"
                  ? "✓ LESS"
                  : "LESS"}
              </button>

            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* SECONDARY PROPS                                    */}
        {/* ================================================= */}

        {otherProps.length > 0 && (
          <div className="mt-2">

            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-mono text-[7px] font-bold tracking-[0.16em] text-bone/25">
                MORE PROPS
              </p>

              <p className="font-mono text-[7px] text-bone/20">
                {otherProps.length}
              </p>
            </div>

            <div className="space-y-1">

              {otherProps
                .slice(0, 2)
                .map((prop) => {

                  const propSelection =
                    getSelection(
                      prop.id
                    );

                  return (
                    <div
                      key={prop.id}
                      className={`
                        flex items-center
                        justify-between
                        gap-2
                        border
                        ${
                          propSelection
                            ? `${accentBorder} ${accentSoft}`
                            : "border-line bg-ink2"
                        }
                        px-2 py-1.5
                        transition-all duration-200
                      `}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          onSelect(
                            prop,
                            "over"
                          )
                        }
                        disabled={
                          prop.locked
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate font-mono text-[7px] font-bold tracking-[0.08em] text-bone/35">
                          {
                            STAT_LABELS[
                              prop.stat_type
                            ]
                          }
                        </span>

                        <span className="font-display text-base leading-none text-bone/75">
                          {prop.line}
                        </span>
                      </button>

                      <div className="flex shrink-0 gap-1">

                        <button
                          type="button"
                          disabled={
                            prop.locked
                          }
                          onClick={() =>
                            onSelect(
                              prop,
                              "over"
                            )
                          }
                          className={`
                            px-2
                            py-1.5
                            font-mono
                            text-[7px]
                            font-bold
                            tracking-[0.05em]
                            transition
                            ${
                              propSelection ===
                              "over"
                                ? `${accentBg} text-white`
                                : "bg-panelLight text-bone/35 hover:text-bone"
                            }
                          `}
                        >
                          {propSelection ===
                          "over"
                            ? "✓"
                            : "MORE"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            prop.locked
                          }
                          onClick={() =>
                            onSelect(
                              prop,
                              "under"
                            )
                          }
                          className={`
                            px-2
                            py-1.5
                            font-mono
                            text-[7px]
                            font-bold
                            tracking-[0.05em]
                            transition
                            ${
                              propSelection ===
                              "under"
                                ? `${accentBg} text-white`
                                : "bg-panelLight text-bone/35 hover:text-bone"
                            }
                          `}
                        >
                          {propSelection ===
                          "under"
                            ? "✓"
                            : "LESS"}
                        </button>

                      </div>
                    </div>
                  );
                })}

            </div>

            {otherProps.length >
              2 && (
              <button
                type="button"
                onClick={
                  onOpenProfile
                }
                className={`
                  mt-2
                  w-full
                  border
                  border-line
                  py-2
                  font-mono
                  text-[7px]
                  font-bold
                  tracking-[0.15em]
                  ${accentText}
                  transition
                  hover:border-lineBright
                `}
              >
                VIEW ALL{" "}
                {otherProps.length}{" "}
                MORE PROPS →
              </button>
            )}

          </div>
        )}

      </div>

      {/* SELECTED CARD EDGE */}
      {selected && (
        <div
          className={`
            absolute bottom-0 left-0 right-0
            h-[2px]
            ${accentBg}
          `}
        />
      )}

    </article>
  );
}
