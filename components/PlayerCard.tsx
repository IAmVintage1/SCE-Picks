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

  const handleCardClick = () => {
    if (onOpenProfile) {
      onOpenProfile();
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`
        group relative overflow-hidden
        border bg-ink
        cursor-pointer
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
      {(feedback === "over" || feedback === "under") && (
        <div
          className={`
            pointer-events-none
            absolute inset-0 z-40
            ${
              isYoung
                ? "bg-young/10"
                : "bg-alum/10"
            }
            animate-[selectionFlash_420ms_ease-out]
          `}
        />
      )}

      {/* PICKED badge */}
      {isPicked && (
        <div
          className={`
            absolute right-3 top-3 z-30
            flex items-center gap-1.5
            border border-white/15
            bg-ink/90
            px-2.5 py-1.5
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

      {/* =====================================================
          PLAYER IMAGE
      ===================================================== */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        {player.image_url ? (
          <Image
            src={player.image_url}
            alt={player.name}
            fill
            priority={false}
            className={`
              object-cover object-top
              transition-transform duration-500
              ${
                isPicked
                  ? "scale-[1.01]"
                  : "group-hover:scale-[1.015]"
              }
            `}
            sizes="
              (max-width: 640px) 50vw,
              (max-width: 1024px) 33vw,
              25vw
            "
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span
              className={`
                font-display text-6xl font-black
                ${accentText}
              `}
            >
              {player.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Subtle image gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />

        {/* Subtle team gradient */}
        <div
          className={`
            absolute inset-x-0 bottom-0 h-1/4
            bg-gradient-to-t
            ${
              isYoung
                ? "from-young/20"
                : "from-alum/20"
            }
            to-transparent
            opacity-60
          `}
        />

        {/* Team label */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <span
            className={`
              font-mono text-[8px]
              font-bold tracking-[0.14em]
              ${accentText}
            `}
          >
            {isYoung
              ? "YOUNGKNIGHTS"
              : "ALUMKNIGHTS"}
          </span>
        </div>
      </div>

      {/* =====================================================
          CARD CONTENT
      ===================================================== */}
      <div className="p-3">

        {/* Player name */}
        <div className="min-w-0 text-center">
          <h3
            className="
              font-display
              text-[clamp(1rem,3.5vw,1.35rem)]
              font-black
              uppercase
              leading-[0.95]
              tracking-tight
              text-bone
              whitespace-normal
              break-words
            "
          >
            {player.name}
          </h3>
        </div>

        {/* Primary prop */}
        <div className="mt-3 text-center">

          <div
            className={`
              font-mono
              text-[9px]
              font-bold
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
              font-display
              text-4xl
              font-black
              leading-none
              text-bone
              transition-transform
              duration-200
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

        {/* =====================================================
            MORE / LESS
        ===================================================== */}
        <div
          className="mt-3 grid grid-cols-2 gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <SelectButton
            label="MORE"
            active={selected === "over"}
            disabled={primary.locked}
            activeBg={accentBg}
            accentText={accentText}
            pulse={feedback === "over"}
            onClick={() =>
              onSelect(primary, "over")
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
              onSelect(primary, "under")
            }
          />
        </div>

        {/* =====================================================
            YOUR PICK
        ===================================================== */}
        {selected && (
          <div
            className={`
              mt-2
              flex items-center justify-between
              border px-3 py-1.5
              ${
                isYoung
                  ? "border-young/20 bg-young/5"
                  : "border-alum/20 bg-alum/5"
              }
              animate-[yourPickIn_240ms_ease-out]
            `}
          >
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                tracking-[0.12em]
                text-bone/40
              "
            >
              YOUR PICK
            </span>

            <span
              className={`
                font-mono
                text-[9px]
                font-bold
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

        {/* =====================================================
            OTHER PROPS TEASER
        ===================================================== */}
        {props.length > 1 && (
          <div
            className="
              mt-2.5
              flex
              items-center
              justify-between
              border-t
              border-white/5
              pt-2.5
            "
          >
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                tracking-[0.12em]
                text-bone/30
              "
            >
              {props.length - 1}{" "}
              {props.length - 1 === 1
                ? "MORE PROP"
                : "MORE PROPS"}
            </span>

            <span
              className={`
                font-mono
                text-[8px]
                font-bold
                tracking-[0.12em]
                ${accentText}
                transition-transform
                duration-200
                group-hover:translate-x-0.5
              `}
            >
              VIEW →
            </span>
          </div>
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
        flex h-10
        items-center
        justify-center
        overflow-hidden
        border
        font-mono
        text-[10px]
        font-black
        tracking-[0.14em]
        transition-all
        duration-200
        active:scale-[0.96]

        ${
          disabled
            ? `
              cursor-not-allowed
              border-white/5
              bg-white/[0.02]
              text-bone/15
            `
            : active
              ? `
                ${activeBg}
                border-transparent
                text-white
                shadow-lg
              `
              : `
                border-white/10
                bg-white/[0.03]
                text-bone/50
                hover:border-white/20
                hover:bg-white/[0.06]
                hover:text-bone
              `
        }

        ${
          pulse
            ? `
              scale-[1.035]
              shadow-[0_0_22px_rgba(255,255,255,0.18)]
            `
            : ""
        }
      `}
    >
      {/* Selection sweep */}
      {pulse && (
        <span
          className={`
            pointer-events-none
            absolute
            inset-0
            ${accentText}
            animate-[buttonSweep_420ms_ease-out]
          `}
        />
      )}

      <span
        className="
          relative
          z-10
          flex
          items-center
          gap-1.5
        "
      >
        {active && (
          <span
            className="
              text-[11px]
              leading-none
              animate-[checkIn_220ms_ease-out]
            "
          >
            ✓
          </span>
        )}

        <span>{label}</span>
      </span>
    </button>
  );
}
