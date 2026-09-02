"use client";

import { CardLeg, EventSettings } from "@/lib/types";
import { legLabel, legKey, meetsMinimum } from "@/lib/cardTiers";
import TierProgress from "@/components/TierProgress";
import ConfettiBurst from "@/components/ConfettiBurst";

export function PickSlipBar({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="
        fixed inset-x-3 bottom-3 z-30
        flex items-center justify-between
        overflow-hidden
        rounded-2xl
        border border-ink/10
        bg-bone
        px-4 py-3.5
        shadow-[0_10px_40px_-6px_rgba(0,0,0,0.7)]
        transition
        active:scale-[0.97]
        sm:inset-x-5 sm:bottom-5 sm:px-5 sm:py-4
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* COUNT */}
        <span
          className="
            flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-full
            bg-ink
            font-mono
            text-xs
            font-bold
            text-bone
          "
        >
          {count}
        </span>

        <div className="min-w-0 text-left">
          <p
            className="
              truncate
              font-head
              text-sm
              font-bold
              tracking-[0.05em]
              text-ink
            "
          >
            MY CARD
          </p>

          <p
            className="
              mt-0.5
              font-mono
              text-[8px]
              font-bold
              tracking-[0.12em]
              text-ink/40
            "
          >
            {count === 1 ? "1 PICK" : `${count} PICKS`}
          </p>
        </div>
      </div>

      <span
        className="
          shrink-0
          font-head
          text-sm
          font-bold
          tracking-[0.05em]
          text-ink
        "
      >
        VIEW →
      </span>
    </button>
  );
}

export function PickSlipDrawer({
  items,
  open,
  onClose,
  onRemove,
  onSubmit,
  submitting,
  locked,
  minPicks,
  settings,
  confettiTrigger,
}: {
  items: CardLeg[];
  open: boolean;
  onClose: () => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  locked: boolean;
  minPicks: number;
  settings: EventSettings | null;
  confettiTrigger: number;
}) {
  if (!open) return null;

  const canSubmit = meetsMinimum(items.length, minPicks);
  const remaining = Math.max(minPicks - items.length, 0);

  return (
    <div
      className="
        fixed inset-0 z-40
        flex flex-col justify-end
        bg-black/70
        backdrop-blur-sm
      "
    >
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close pick slip"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      {/* DRAWER */}
      <div
        className="
          relative
          max-h-[88dvh]
          overflow-hidden
          rounded-t-[28px]
          border-t
          border-lineBright
          bg-panel
          shadow-[0_-20px_80px_-30px_rgba(0,0,0,0.9)]
        "
      >
        <div className="grain-overlay opacity-20" />

        <ConfettiBurst trigger={confettiTrigger} />

        {/* =================================================
            MOBILE HANDLE
        ================================================= */}

        <div className="relative flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-bone/15" />
        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            relative
            flex
            items-center
            justify-between
            border-b
            border-line
            px-5
            py-4
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="
                  font-head
                  text-lg
                  font-bold
                  tracking-wide
                  text-bone
                "
              >
                MY CARD
              </h2>

              <span
                className="
                  flex h-6 min-w-6
                  items-center justify-center
                  rounded-full
                  bg-bone
                  px-1.5
                  font-mono
                  text-[9px]
                  font-bold
                  text-ink
                "
              >
                {items.length}
              </span>
            </div>

            <p
              className="
                mt-0.5
                font-mono
                text-[8px]
                font-bold
                tracking-[0.12em]
                text-bone/30
              "
            >
              YOUR PICKS
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-full
              border
              border-line
              px-3
              py-1.5
              text-xs
              font-semibold
              text-bone/50
              transition
              hover:border-lineBright
              hover:text-bone
            "
          >
            Close
          </button>
        </div>

        {/* =================================================
            TIER PROGRESS
        ================================================= */}

        <div className="relative border-b border-line px-5 py-4">
          <TierProgress
            pickCount={items.length}
            minPicks={minPicks}
            settings={settings}
          />
        </div>

        {/* =================================================
            PICKS
        ================================================= */}

        <div
          className="
            relative
            max-h-[40dvh]
            overflow-y-auto
            px-5
            py-2
          "
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="
                  flex h-12 w-12
                  items-center justify-center
                  rounded-2xl
                  border border-line
                  bg-panelLight
                "
              >
                <span className="font-display text-xl text-bone/25">
                  +
                </span>
              </div>

              <p
                className="
                  mt-4
                  font-head
                  text-sm
                  font-bold
                  tracking-wide
                  text-bone/60
                "
              >
                BUILD YOUR CARD
              </p>

              <p
                className="
                  mt-1.5
                  max-w-[260px]
                  text-xs
                  leading-relaxed
                  text-bone/30
                "
              >
                Tap MORE or LESS on any player to
                start building your predictions.
              </p>
            </div>
          ) : (
            items.map((leg) => (
              <PickRow
                key={legKey(leg)}
                leg={leg}
                onRemove={onRemove}
              />
            ))
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="relative border-t border-line px-5 py-4">
          {locked ? (
            <div className="rounded-xl border border-young/20 bg-young/5 px-4 py-4 text-center">
              <p
                className="
                  font-head
                  text-sm
                  font-bold
                  tracking-wide
                  text-young-light
                "
              >
                PICKS ARE LOCKED 🔒
              </p>

              <p className="mt-1 font-mono text-[8px] tracking-[0.1em] text-bone/30">
                GOOD LUCK!
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={onSubmit}
                className={`
                  w-full
                  rounded-xl
                  py-4
                  font-head
                  text-base
                  font-bold
                  tracking-[0.08em]
                  transition
                  active:scale-[0.98]
                  ${
                    canSubmit
                      ? "bg-bone text-ink shadow-[0_0_40px_-10px_rgba(245,244,241,0.5)]"
                      : "bg-panelLight text-bone/35"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                {submitting
                  ? "LOCKING CARD..."
                  : canSubmit
                  ? "LOCK IN CARD"
                  : `NEED ${remaining} MORE ${
                      remaining === 1 ? "PICK" : "PICKS"
                    }`}
              </button>

              {/* STATUS */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className={`
                    h-1.5
                    w-1.5
                    rounded-full
                    ${
                      canSubmit
                        ? "bg-young-light"
                        : "bg-bone/20"
                    }
                  `}
                />

                <p
                  className="
                    font-mono
                    text-[8px]
                    font-bold
                    tracking-[0.1em]
                    text-bone/30
                  "
                >
                  {canSubmit
                    ? "CARD READY"
                    : `${remaining} MORE TO PLAY`}
                </p>
              </div>
            </>
          )}

          <p
            className="
              mt-3
              text-center
              font-mono
              text-[9px]
              tracking-[0.1em]
              text-bone/25
            "
          >
            FREE TO PLAY · NO WAGERING · EVERY PICK HAS TO HIT
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PICK ROW
========================================================= */

function PickRow({
  leg,
  onRemove,
}: {
  leg: CardLeg;
  onRemove: (key: string) => void;
}) {
  const key = legKey(leg);
  const { title, subtitle } = legLabel(leg);

  const isMore =
    leg.kind === "player"
      ? leg.selection === "over"
      : leg.selection === "more" ||
        leg.selection === "youngknights";

  const badgeLabel =
    leg.kind === "team"
      ? "GAME"
      : isMore
      ? "MORE"
      : "LESS";

  return (
    <div
      className="
        animate-slideIn
        flex
        items-center
        gap-3
        border-b
        border-line/60
        py-3
        last:border-none
      "
    >
      {/* BADGE */}
      <div
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          border
          font-mono
          text-[8px]
          font-bold
          tracking-[0.05em]
          ${
            isMore
              ? "border-young/20 bg-young/10 text-young-light"
              : "border-alum/20 bg-alum/10 text-alum-light"
          }
        `}
      >
        {badgeLabel}
      </div>

      {/* INFO */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-head text-sm font-semibold text-bone">
          {title}
        </p>

        <p className="truncate text-xs text-bone/40">
          {subtitle}
        </p>
      </div>

      {/* REMOVE */}
      <button
        type="button"
        aria-label={`Remove ${title}`}
        onClick={() => onRemove(key)}
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-full
          text-lg
          font-light
          text-bone/25
          transition
          hover:bg-bone/5
          hover:text-bone/70
        "
      >
        ×
      </button>
    </div>
  );
}
