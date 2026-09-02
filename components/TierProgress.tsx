"use client";

import { CARD_TIERS, EventSettings } from "@/lib/types";
import { getTierInfo } from "@/lib/cardTiers";

export default function TierProgress({
  pickCount,
  minPicks,
  settings,
}: {
  pickCount: number;
  minPicks: number;
  settings: Pick<
    EventSettings,
    "prize_3" | "prize_5" | "prize_10"
  > | null;
}) {
  const info = getTierInfo(pickCount, settings);

  const maxTier = CARD_TIERS[CARD_TIERS.length - 1];

  const progressPct = Math.min(
    100,
    (pickCount / maxTier) * 100
  );

  const isMinimumReached = pickCount >= minPicks;
  const isFiveReached = pickCount >= 5;
  const isTenReached = pickCount >= 10;

  const nextMilestone =
    pickCount < minPicks
      ? minPicks
      : pickCount < 5
      ? 5
      : pickCount < 10
      ? 10
      : 10;

  const picksToNext = Math.max(
    nextMilestone - pickCount,
    0
  );

  let headline = "BUILD YOUR CARD";
  let headlineClass = "text-bone";

  if (pickCount >= 10) {
    headline = "MAX TIER UNLOCKED";
    headlineClass = "text-young-light";
  } else if (pickCount >= 5) {
    headline = "5 PICK BONUS UNLOCKED";
    headlineClass = "text-young-light";
  } else if (pickCount >= minPicks) {
    headline = "CARD READY";
    headlineClass = "text-young-light";
  } else if (pickCount > 0) {
    headline = `${picksToNext} MORE TO UNLOCK`;
  }

  return (
    <div className="relative">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`
              font-head
              text-sm
              font-bold
              tracking-wide
              transition-colors
              duration-300
              ${headlineClass}
            `}
          >
            {headline}
          </p>

          <p
            className="
              mt-1
              font-mono
              text-[8px]
              font-bold
              tracking-[0.12em]
              text-bone/30
            "
          >
            {pickCount === 0
              ? `MINIMUM ${minPicks} PICKS`
              : `${pickCount} ${
                  pickCount === 1 ? "PICK" : "PICKS"
                } SELECTED`}
          </p>
        </div>

        {/* PRIZE */}
        {info.prize && (
          <span
            className="
              shrink-0
              rounded-full
              border
              border-young/20
              bg-young/10
              px-2.5
              py-1
              font-mono
              text-[8px]
              font-bold
              tracking-[0.1em]
              text-young-light
              animate-pop
            "
          >
            {info.prize.toUpperCase()}
          </span>
        )}
      </div>

      {/* =====================================================
          PROGRESS BAR
      ===================================================== */}
      <div className="relative mt-4">
        <div
          className="
            relative
            h-2
            w-full
            overflow-hidden
            rounded-full
            bg-line
          "
        >
          {/* Animated progress */}
          <div
            className="
              h-full
              rounded-full
              bg-gradient-to-r
              from-young
              via-bone
              to-alum
              transition-all
              duration-700
              ease-out
            "
            style={{
              width: `${progressPct}%`,
            }}
          />

          {/* Moving shine */}
          {pickCount > 0 && pickCount < maxTier && (
            <div
              className="
                pointer-events-none
                absolute
                inset-y-0
                w-16
                bg-gradient-to-r
                from-transparent
                via-white/20
                to-transparent
                animate-[tierShine_1.8s_ease-in-out_infinite]
              "
            />
          )}
        </div>

        {/* =================================================
            TIER MARKERS
        ================================================= */}
        <div className="pointer-events-none absolute inset-0 top-1/2">
          {CARD_TIERS.map((tier) => {
            const reached = pickCount >= tier;
            const isCurrent =
              !reached && nextMilestone === tier;

            return (
              <div
                key={tier}
                className="absolute top-1/2"
                style={{
                  left: `${(tier / maxTier) * 100}%`,
                  transform:
                    "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`
                    h-3
                    w-3
                    rounded-full
                    border-2
                    border-ink
                    transition-all
                    duration-300
                    ${
                      reached
                        ? "bg-bone scale-110"
                        : isCurrent
                        ? "bg-young-light scale-125 shadow-[0_0_12px_rgba(255,255,255,0.35)] animate-pulse"
                        : "bg-panelLight"
                    }
                  `}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          MILESTONE LABELS
      ===================================================== */}
      <div
        className="
          mt-2
          flex
          items-center
          justify-between
          font-mono
          text-[8px]
          font-bold
          tracking-[0.08em]
        "
      >
        <span
          className={
            isMinimumReached
              ? "text-young-light"
              : "text-bone/30"
          }
        >
          {minPicks} PICK
        </span>

        <span
          className={
            isFiveReached
              ? "text-young-light"
              : "text-bone/30"
          }
        >
          5 PICK
        </span>

        <span
          className={
            isTenReached
              ? "text-young-light"
              : "text-bone/30"
          }
        >
          10 PICK
        </span>
      </div>

      {/* =====================================================
          DYNAMIC MESSAGE
      ===================================================== */}
      {pickCount === 0 && (
        <p className="mt-3 text-xs leading-relaxed text-bone/40">
          Pick at least {minPicks} props to unlock your
          card.
        </p>
      )}

      {pickCount > 0 &&
        pickCount < minPicks && (
          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              rounded-lg
              border
              border-young/10
              bg-young/5
              px-3
              py-2.5
            "
          >
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                tracking-[0.08em]
                text-bone/40
              "
            >
              KEEP BUILDING
            </span>

            <span
              className="
                font-mono
                text-[9px]
                font-bold
                text-young-light
              "
            >
              {picksToNext} MORE
            </span>
          </div>
        )}

      {pickCount >= minPicks &&
        pickCount < 5 && (
          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              rounded-lg
              border
              border-young/15
              bg-young/5
              px-3
              py-2.5
            "
          >
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                tracking-[0.08em]
                text-bone/40
              "
            >
              CARD READY
            </span>

            <span
              className="
                font-mono
                text-[9px]
                font-bold
                text-young-light
              "
            >
              {5 - pickCount} MORE → 5
            </span>
          </div>
        )}

      {pickCount >= 5 &&
        pickCount < 10 && (
          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              rounded-lg
              border
              border-alum/15
              bg-alum/5
              px-3
              py-2.5
            "
          >
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                tracking-[0.08em]
                text-bone/40
              "
            >
              BONUS TIER UNLOCKED
            </span>

            <span
              className="
                font-mono
                text-[9px]
                font-bold
                text-alum-light
              "
            >
              {10 - pickCount} MORE → 10
            </span>
          </div>
        )}

      {pickCount >= 10 && (
        <div
          className="
            mt-3
            flex
            items-center
            justify-between
            rounded-lg
            border
            border-young/20
            bg-young/5
            px-3
            py-2.5
          "
        >
          <span
            className="
              font-mono
              text-[8px]
              font-bold
              tracking-[0.08em]
              text-bone/40
            "
          >
            MAXIMUM CARD
          </span>

          <span
            className="
              font-mono
              text-[9px]
              font-bold
              text-young-light
            "
          >
            10 PICKS ✓
          </span>
        </div>
      )}
    </div>
  );
}
