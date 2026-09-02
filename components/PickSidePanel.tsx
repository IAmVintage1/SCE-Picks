"use client";

import { CardLeg, EventSettings } from "@/lib/types";
import { legLabel, legKey, meetsMinimum } from "@/lib/cardTiers";
import TierProgress from "@/components/TierProgress";
import ConfettiBurst from "@/components/ConfettiBurst";

export default function PickSidePanel({
  items,
  onRemove,
  onSubmit,
  submitting,
  locked,
  minPicks,
  settings,
  confettiTrigger,
}: {
  items: CardLeg[];
  onRemove: (key: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  locked: boolean;
  minPicks: number;
  settings: EventSettings | null;
  confettiTrigger: number;
}) {
  const canSubmit = meetsMinimum(items.length, minPicks);
  const remaining = Math.max(minPicks - items.length, 0);

  return (
    <aside
      className="
        sticky
        top-24
        hidden
        h-fit
        w-80
        shrink-0
        overflow-hidden
        rounded-2xl
        border
        border-lineBright
        bg-panel
        shadow-card
        lg:block
      "
    >
      <div className="grain-overlay opacity-20" />

      <ConfettiBurst trigger={confettiTrigger} />

      {/* =====================================================
          HEADER
      ===================================================== */}

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
                flex
                h-6
                min-w-6
                items-center
                justify-center
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

        {items.length > 0 && (
          <div className="text-right">
            <p className="font-mono text-[8px] font-bold tracking-[0.1em] text-bone/25">
              STATUS
            </p>

            <p
              className={`
                mt-0.5
                font-mono
                text-[9px]
                font-bold
                tracking-[0.08em]
                ${
                  canSubmit
                    ? "text-young-light"
                    : "text-bone/45"
                }
              `}
            >
              {canSubmit ? "READY" : "BUILDING"}
            </p>
          </div>
        )}
      </div>

      {/* =====================================================
          TIER PROGRESS
      ===================================================== */}

      <div className="relative border-b border-line px-5 py-4">
        <TierProgress
          pickCount={items.length}
          minPicks={minPicks}
          settings={settings}
        />
      </div>

      {/* =====================================================
          PICK LIST
      ===================================================== */}

      <div className="relative max-h-[38vh] overflow-y-auto px-5 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-line
                bg-panelLight
              "
            >
              <span className="font-display text-lg text-bone/25">
                +
              </span>
            </div>

            <p
              className="
                mt-3
                font-head
                text-sm
                font-bold
                tracking-wide
                text-bone/55
              "
            >
              BUILD YOUR CARD
            </p>

            <p
              className="
                mt-1.5
                max-w-[220px]
                text-xs
                leading-relaxed
                text-bone/30
              "
            >
              Click MORE or LESS on any player
              to add a prediction.
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

      {/* =====================================================
          FOOTER
      ===================================================== */}

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
              PICKS ARE LOCKED :lock:
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
                py-3.5
                font-head
                text-sm
                font-bold
                tracking-[0.08em]
                transition
                active:scale-[0.98]
                ${
                  canSubmit
                    ? "bg-bone text-ink shadow-[0_0_30px_-10px_rgba(245,244,241,0.5)]"
                    : "bg-panelLight text-bone/30"
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
    </aside>
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
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg
          border
          font-mono
          text-[7px]
          font-bold
          tracking-[0.04em]
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
        <p
          className="
            truncate
            font-head
            text-sm
            font-semibold
            text-bone
          "
        >
          {title}
        </p>

        <p
          className="
            truncate
            text-xs
            text-bone/40
          "
        >
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
          h-7
          w-7
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
