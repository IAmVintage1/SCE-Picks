"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PropWithPlayer, STAT_LABELS } from "@/lib/types";

type Selection = "over" | "under" | null;

interface PlayerCardProps {
  props: PropWithPlayer[];
  primaryPropId?: string;
  getSelection: (propId: string) => Selection;
  onSelect: (
    prop: PropWithPlayer,
    selection: "over" | "under"
  ) => void;
  onOpenProfile?: () => void;
}

export default function PlayerCard({
  props,
  primaryPropId,
  getSelection,
  onSelect,
  onOpenProfile,
}: PlayerCardProps) {
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

  const selectedBorder = isYoung
    ? "border-young/80"
    : "border-alum/80";

  const accentBg = isYoung
    ? "bg-young"
    : "bg-alum";

  const glowClass = isYoung
    ? "shadow-[0_0_30px_-10px_rgba(220,38,38,0.65)]"
    : "shadow-[0_0_30px_-10px_rgba(37,99,235,0.65)]";

  const selected = getSelection(primary.id);
  const isPicked = selected !== null;

  const otherProps = props.filter(
    (p) => p.id !== primary.id
  );

  // Controls the short visual feedback animation.
  const [feedback, setFeedback] = useState<
    "over" | "under" | "remove" | null
  >(null);

  const [previousSelection, setPreviousSelection] =
    useState<Selection>(selected);

  useEffect(() => {
    if (selected === previousSelection) return;

    if (selected) {
      setFeedback(selected);

      const timer = window.setTimeout(() => {
        setFeedback(null);
      }, 420);

      setPreviousSelection(selected);

      return () => window.clearTimeout(timer);
    }

    if (!selected && previousSelection) {
      setFeedback("remove");

      const timer = window.setTimeout(() => {
        setFeedback(null);
      }, 320);

      setPreviousSelection(selected);

      return () => window.clearTimeout(timer);
    }

    setPreviousSelection(selected);
  }, [selected, previousSelection]);

  const handleSelect = (
    prop: PropWithPlayer,
    selection: "over" | "under"
  ) => {
    onSelect(prop, selection);
  };

  return (
    <article
      className={`
        group relative overflow-hidden border bg-ink
        transition-all duration-300 ease-out
        ${
          isPicked
            ? `${selectedBorder} ${glowClass} scale-[1.005]`
            : `${accentBorder} hover:border-bone/20`
        }
        ${
          feedback === "over" || feedback === "under"
            ? "animate-[pickPulse_420ms_ease-out]"
            : ""
        }
        ${
          feedback === "remove"
            ? "animate-[pickRemove_320ms_ease-out]"
            : ""
        }
      `}
    >
      {/* Selection flash */}
      {feedback === "over" || feedback === "under" ? (
        <div
          className={`
            pointer-events-none absolute inset-0 z-40
            ${
              isYoung
                ? "bg-young/10"
                : "bg-alum/10"
            }
            animate-[selectionFlash_420ms_ease-out]
          `}
        />
      ) : null}

      {/* Picked badge */}
      {isPicked && (
        <div
          className={`
            absolute right-3 top-3 z-30
            flex items-center gap-1.5
            border border-white/15
            bg-ink/90 px-2.5 py-1.5
            backdrop-blur-md
            shadow-lg
            ${accentText}
            animate-[badgeIn_260ms_ease-out]
          `}
        >
          <span className="text-[10px] font-black">
            ✓
          </span>

          <span className="font-mono text-[8px] font-bold tracking-[0.14em]">
            PICKED
          </span>
        </div>
      )}

      {/* Player image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
        {player.image_url ? (
          <Image
            src={player.image_url}
            alt={player.name}
            fill
            className={`
              object-cover
              transition-transform duration-500
              ${
                isPicked
                  ? "scale-[1.035]"
                  : "group-hover:scale-[1.02]"
              }
            `}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span
              className={`font-display text-5xl font-black ${accentText}`}
            >
              {player.name.charAt(0)}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />

        {/* Team indicator */}
        <div
          className={`
            absolute bottom-3 left-3
            font-mono text-[8px] font-bold
            tracking-[0.14em]
            ${accentText}
          `}
        >
          {isYoung ? "YOUNGKNIGHTS" : "ALUMKNIGHTS"}
        </div>
      </div>

      {/* Main card content */}
      <div className="p-4">
        {/* Player name */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-black uppercase tracking-tight text-bone">
              {player.name}
            </h3>

            <div className="mt-1 font-mono text-[8px] font-bold tracking-[0.14em] text-bone/35">
              {props.length}{" "}
              {props.length === 1 ? "PROP" : "PROPS"}
            </div>
          </div>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="
                shrink-0
                font-mono text-[8px] font-bold
                tracking-[0.12em]
                text-bone/35
                transition-colors
                hover:text-bone
              "
            >
              VIEW
            </button>
          )}
        </div>

        {/* Primary stat */}
        <div className="mt-5 text-center">
          <div
            className={`
              font-mono text-[9px] font-bold
              tracking-[0.16em]
              ${accentText}
            `}
          >
            {STAT_LABELS[primary.stat_type] ??
              primary.stat_type}
          </div>

          <div
            className={`
              mt-1
              font-display text-4xl font-black
              leading-none text-bone
              transition-transform duration-200
              ${
                feedback === "over" ||
                feedback === "under"
                  ? "scale-110"
                  : ""
              }
            `}
          >
            {primary.line}
          </div>
        </div>

        {/* More / Less */}
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          <SelectButton
            label="MORE"
            active={selected === "over"}
            disabled={primary.locked}
            activeBg={accentBg}
            accentText={accentText}
            pulse={feedback === "over"}
            onClick={() =>
              handleSelect(primary, "over")
            }
          />

          <SelectButton
            label="LESS"
            active={selected === "under"}
            disabled={primary.locked}
            activeBg={accentBg}
            accentText={accentText}
            pulse={feedback === "under"}
            onClick={() =>
              handleSelect(primary, "under")
            }
          />
        </div>

        {/* Your Pick */}
        {selected && (
          <div
            className={`
              mt-2
              flex items-center justify-between
              border px-3 py-2
              ${
                isYoung
                  ? "border-young/20 bg-young/5"
                  : "border-alum/20 bg-alum/5"
              }
              animate-[yourPickIn_240ms_ease-out]
            `}
          >
            <span className="font-mono text-[8px] font-bold tracking-[0.12em] text-bone/40">
              YOUR PICK
            </span>

            <span
              className={`
                font-mono text-[9px] font-bold
                tracking-[0.12em]
                ${accentText}
              `}
            >
              {selected === "over"
                ? "MORE"
                : "LESS"}{" "}
              ✓
            </span>
          </div>
        )}

        {/* Additional props */}
        {otherProps.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[8px] font-bold tracking-[0.12em] text-bone/25">
                MORE PROPS
              </span>

              {otherProps.length > 3 && (
                <span
                  className={`font-mono text-[8px] font-bold ${accentText}`}
                >
                  +{otherProps.length}
                </span>
              )}
            </div>

            <div className="space-y-1">
              {otherProps.slice(0, 3).map((prop) => {
                const propSelection =
                  getSelection(prop.id);

                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => {
                      if (!prop.locked) {
                        onSelect(
                          prop,
                          propSelection === "over"
                            ? "under"
                            : "over"
                        );
                      }
                    }}
                    className={`
                      flex w-full items-center
                      justify-between
                      border px-3 py-2
                      text-left
                      transition-all duration-200
                      ${
                        propSelection
                          ? isYoung
                            ? "border-young/50 bg-young/10"
                            : "border-alum/50 bg-alum/10"
                          : "border-white/5 bg-white/[0.02] hover:border-white/10"
                      }
                    `}
                  >
                    <span className="font-mono text-[8px] font-bold tracking-[0.08em] text-bone/45">
                      {STAT_LABELS[prop.stat_type] ??
                        prop.stat_type}
                    </span>

                    <span
                      className={`
                        font-mono text-[10px] font-bold
                        ${
                          propSelection
                            ? accentText
                            : "text-bone/70"
                        }
                      `}
                    >
                      {prop.line}
                      {propSelection
                        ? ` · ${
                            propSelection === "over"
                              ? "MORE"
                              : "LESS"
                          }`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View all */}
        {otherProps.length > 3 && onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className={`
              mt-3 w-full
              border-t border-white/5
              pt-3
              text-center
              font-mono text-[8px] font-bold
              tracking-[0.14em]
              transition-colors
              ${accentText}
              hover:text-bone
            `}
          >
            VIEW ALL {otherProps.length} MORE PROPS →
          </button>
        )}
      </div>
    </article>
  );
}

function SelectButton({
  label,
  active,
  disabled,
  activeBg,
  accentText,
  pulse,
  onClick,
}: {
  label: "MORE" | "LESS";
  active: boolean;
  disabled?: boolean;
  activeBg: string;
  accentText: string;
  pulse?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        relative
        flex h-11 items-center justify-center
        overflow-hidden
        border
        font-mono text-[10px] font-black
        tracking-[0.14em]
        transition-all duration-200
        active:scale-[0.96]
        ${
          disabled
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-bone/15"
            : active
              ? `${activeBg} border-transparent text-white shadow-lg`
              : "border-white/10 bg-white/[0.03] text-bone/50 hover:border-white/20 hover:bg-white/[0.06] hover:text-bone"
        }
        ${
          pulse
            ? "scale-[1.035] shadow-[0_0_22px_rgba(255,255,255,0.18)]"
            : ""
        }
      `}
    >
      {/* Selection sweep */}
      {pulse && (
        <span
          className={`
            pointer-events-none
            absolute inset-0
            ${accentText}
            animate-[buttonSweep_420ms_ease-out]
          `}
        />
      )}

      <span className="relative z-10 flex items-center gap-1.5">
        {active && (
          <span className="text-[11px] leading-none animate-[checkIn_220ms_ease-out]">
            ✓
          </span>
        )}

        <span>{label}</span>
      </span>
    </button>
  );
}
