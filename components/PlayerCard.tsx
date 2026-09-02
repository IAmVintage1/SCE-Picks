"use client";

import Image from "next/image";
import {
  PropWithPlayer,
  STAT_LABELS,
} from "@/lib/types";

export default function PlayerCard({
  props,
  primaryPropId,
  getSelection,
  onSelect,
  onOpenProfile,
}: {
  props: PropWithPlayer[];
  primaryPropId?: string;
  getSelection: (
    propId: string
  ) => "over" | "under" | null;
  onSelect: (
    prop: PropWithPlayer,
    selection: "over" | "under"
  ) => void;
  onOpenProfile?: () => void;
}) {
  const primary =
    props.find(
      (p) => p.id === primaryPropId
    ) ?? props[0];

  if (!primary) return null;

  const player = primary.player;

  const isYoung =
    player.team.slug ===
    "youngknights";

  const accent = isYoung
    ? {
        border:
          "border-young/40",
        borderStrong:
          "border-young",
        text:
          "text-young-light",
        bg:
          "bg-young",
        bgSoft:
          "bg-young/15",
        glow:
          "shadow-glowRed",
        gradient:
          "from-young-dark/95",
      }
    : {
        border:
          "border-alum/40",
        borderStrong:
          "border-alum",
        text:
          "text-alum-light",
        bg:
          "bg-alum",
        bgSoft:
          "bg-alum/15",
        glow:
          "shadow-glowBlue",
        gradient:
          "from-alum-dark/95",
      };

  const selected =
    getSelection(primary.id);

  const otherProps =
    props.filter(
      (p) => p.id !== primary.id
    );

  const hasFeatured =
    props.some(
      (p) => p.featured
    );

  /*
   * Keep the card compact on mobile.
   * Only show a couple of secondary props
   * before sending the user into the profile.
   */
  const visibleOtherProps =
    otherProps.slice(0, 2);

  return (
    <article
      className={`
        group relative overflow-hidden
        rounded-[4px]
        border
        ${accent.border}
        bg-panel
        shadow-card
        transition-all
        duration-300
        hover:-translate-y-1
        hover:${accent.glow}
      `}
    >
      {/* ========================================================= */}
      {/* PLAYER IMAGE                                              */}
      {/* ========================================================= */}

      <div className="relative aspect-[4/5] overflow-hidden bg-panelLight">

        {player.image_url ? (
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label={`View ${player.name} profile`}
            className="absolute inset-0 z-10 block h-full w-full cursor-pointer text-left"
          >
            <Image
              src={player.image_url}
              alt={player.name}
              fill
              sizes="
                (max-width: 640px) 50vw,
                (max-width: 1024px) 33vw,
                280px
              "
              className="
                object-cover
                object-top
                transition-transform
                duration-700
                ease-out
                group-hover:scale-[1.045]
              "
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label={`View ${player.name} profile`}
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            <span
              className={`
                font-display
                text-8xl
                ${accent.text}
                opacity-10
              `}
            >
              {player.name.charAt(0)}
            </span>
          </button>
        )}

        {/* Image gradient */}
        <div
          className={`
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            ${accent.gradient}
            via-black/10
            to-transparent
          `}
        />

        {/* Subtle texture */}
        <div className="grain-overlay opacity-25" />

        {/* ======================================================= */}
        {/* TOP BADGES                                               */}
        {/* ======================================================= */}

        <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5">

          {primary.featured && (
            <span
              className="
                flex
                items-center
                gap-1
                border
                border-white/20
                bg-black/65
                px-2
                py-1
                font-mono
                text-[7px]
                font-bold
                tracking-[0.16em]
                text-white
                backdrop-blur-md
              "
            >
              <span className="text-[9px]">
                🔥
              </span>

              HOT
            </span>
          )}

          {!primary.featured &&
            hasFeatured && (
              <span
                className="
                  border
                  border-white/15
                  bg-black/55
                  px-2
                  py-1
                  font-mono
                  text-[7px]
                  font-bold
                  tracking-[0.16em]
                  text-white/80
                  backdrop-blur-md
                "
              >
                FEATURED PLAYER
              </span>
            )}
        </div>

        {/* ======================================================= */}
        {/* PLAYER INFO OVER IMAGE                                   */}
        {/* ======================================================= */}

        <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 sm:p-3.5">

          <button
            type="button"
            onClick={onOpenProfile}
            className="
              block
              max-w-full
              text-left
            "
          >
            <p
              className="
                truncate
                font-display
                text-[22px]
                leading-[0.9]
                tracking-tight
                text-white
                sm:text-[28px]
              "
            >
              {player.name}
            </p>

            <div className="mt-1 flex items-center gap-1.5">

              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  ${accent.bg}
                `}
              />

              <p
                className={`
                  font-mono
                  text-[7px]
                  font-bold
                  tracking-[0.18em]
                  ${accent.text}
                  sm:text-[8px]
                `}
              >
                {player.team.name.toUpperCase()}
              </p>

            </div>
          </button>

        </div>

        {/* Profile affordance */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label={`Open ${player.name} profile`}
          className="
            absolute
            bottom-3
            right-2.5
            z-30
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-full
            border
            border-white/15
            bg-black/45
            text-white/70
            backdrop-blur-md
            transition
            hover:bg-black/70
            hover:text-white
          "
        >
          <span className="text-xs">
            ↗
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* PROP AREA                                                  */}
      {/* ========================================================= */}

      <div className="p-2.5 sm:p-3.5">

        {/* Stat + line */}
        <div className="mb-2.5 flex items-end justify-between gap-2">

          <div>
            <p
              className="
                font-mono
                text-[7px]
                font-bold
                tracking-[0.16em]
                text-bone/35
                sm:text-[8px]
              "
            >
              {STAT_LABELS[
                primary.stat_type
              ]}
            </p>

            <p
              className="
                tabular
                mt-0.5
                font-display
                text-[34px]
                leading-none
                tracking-tight
                text-bone
                sm:text-[42px]
              "
            >
              {primary.line}
            </p>
          </div>

          <div className="pb-0.5 text-right">
            <p
              className="
                font-mono
                text-[7px]
                font-bold
                tracking-[0.1em]
                text-bone/25
              "
            >
              PROPS
            </p>

            <p
              className={`
                font-display
                text-lg
                leading-none
                ${accent.text}
              `}
            >
              {props.length}
            </p>
          </div>

        </div>

        {/* ======================================================= */}
        {/* MORE / LESS                                              */}
        {/* ======================================================= */}

        <div className="grid grid-cols-2 gap-1.5">

          <SelectButton
            label="MORE"
            active={
              selected === "over"
            }
            disabled={
              primary.locked
            }
            activeBg={
              accent.bg
            }
            onClick={() =>
              onSelect(
                primary,
                "over"
              )
            }
          />

          <SelectButton
            label="LESS"
            active={
              selected === "under"
            }
            disabled={
              primary.locked
            }
            activeBg={
              accent.bg
            }
            onClick={() =>
              onSelect(
                primary,
                "under"
              )
            }
          />

        </div>

        {/* ======================================================= */}
        {/* OTHER PROPS                                              */}
        {/* ======================================================= */}

        {otherProps.length > 0 && (
          <div
            className="
              mt-2.5
              border-t
              border-line
              pt-2.5
            "
          >

            <div className="mb-1.5 flex items-center justify-between">

              <span
                className="
                  font-mono
                  text-[7px]
                  font-bold
                  tracking-[0.14em]
                  text-bone/30
                "
              >
                OTHER PROPS
              </span>

              <button
                type="button"
                onClick={onOpenProfile}
                className={`
                  font-mono
                  text-[7px]
                  font-bold
                  tracking-[0.1em]
                  ${accent.text}
                `}
              >
                VIEW ALL →
              </button>

            </div>

            <div className="grid grid-cols-2 gap-1">

              {visibleOtherProps.map(
                (prop) => {
                  const selection =
                    getSelection(
                      prop.id
                    );

                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={
                        onOpenProfile
                      }
                      disabled={
                        prop.locked
                      }
                      className={`
                        relative
                        overflow-hidden
                        border
                        px-2
                        py-1.5
                        text-left
                        transition
                        active:scale-[0.98]
                        ${
                          selection
                            ? `${accent.borderStrong} ${accent.bgSoft}`
                            : "border-line bg-ink2 hover:border-lineBright"
                        }
                      `}
                    >

                      {selection && (
                        <span
                          className={`
                            absolute
                            right-1
                            top-1
                            font-mono
                            text-[7px]
                            font-bold
                            ${accent.text}
                          `}
                        >
                          ✓
                        </span>
                      )}

                      <span
                        className="
                          block
                          truncate
                          font-mono
                          text-[7px]
                          font-bold
                          text-bone/35
                        "
                      >
                        {
                          STAT_LABELS[
                            prop.stat_type
                          ]
                        }
                      </span>

                      <span
                        className="
                          tabular
                          block
                          font-display
                          text-base
                          leading-none
                          text-bone
                        "
                      >
                        {prop.line}
                      </span>

                    </button>
                  );
                }
              )}

            </div>

            {otherProps.length >
              visibleOtherProps.length && (
              <button
                type="button"
                onClick={onOpenProfile}
                className={`
                  mt-2
                  w-full
                  py-1
                  text-center
                  font-mono
                  text-[7px]
                  font-bold
                  tracking-[0.12em]
                  ${accent.text}
                  transition
                  hover:opacity-75
                `}
              >
                +{" "}
                {otherProps.length -
                  visibleOtherProps.length}{" "}
                MORE PROPS
              </button>
            )}

          </div>
        )}

      </div>
    </article>
  );
}

/* =============================================================== */
/* SELECT BUTTON                                                   */
/* =============================================================== */

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
        min-h-10
        overflow-hidden
        font-head
        text-[11px]
        font-bold
        tracking-[0.08em]
        transition-all
        duration-150
        active:scale-[0.97]
        disabled:cursor-not-allowed
        disabled:opacity-25
        sm:min-h-11
        sm:text-xs
        ${
          active
            ? `${activeBg} text-white shadow-lg`
            : "bg-panelLight text-bone/60 hover:bg-line hover:text-bone"
        }
      `}
    >
      {active && (
        <span
          className="
            absolute
            inset-0
            animate-pulse
            bg-white/10
          "
        />
      )}

      <span className="relative z-10 flex items-center justify-center gap-1">
        {active && (
          <span className="animate-pop text-[10px]">
            ✓
          </span>
        )}

        {label}
      </span>
    </button>
  );
}
