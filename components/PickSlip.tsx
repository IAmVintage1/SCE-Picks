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
      onClick={onOpen}
      className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between overflow-hidden rounded-2xl bg-bone px-5 py-4 shadow-[0_10px_40px_-6px_rgba(0,0,0,0.7)] transition active:scale-[0.97]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-bone">
          {count}
        </span>
        <span className="font-head text-sm font-bold tracking-[0.05em] text-ink">
          BUILDING YOUR CARD
        </span>
      </div>
      <span className="font-head text-sm font-bold tracking-[0.05em] text-ink">
        VIEW &rarr;
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

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
      <button
        aria-label="Close pick slip"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-lineBright bg-panel">
        <div className="grain-overlay opacity-20" />
        <ConfettiBurst trigger={confettiTrigger} />

        <div className="relative flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-head text-lg font-bold tracking-wide text-bone">
            MY CARD
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-bone/50"
          >
            Close
          </button>
        </div>

        <div className="relative border-b border-line px-5 py-4">
          <TierProgress
            pickCount={items.length}
            minPicks={minPicks}
            settings={settings}
          />
        </div>

        <div className="relative max-h-[35dvh] overflow-y-auto px-5 py-2">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-bone/40">
              No picks yet. Tap MORE or LESS on any player to add one.
            </p>
          )}
          {items.map((leg) => {
            const key = legKey(leg);
            const { title, subtitle } = legLabel(leg);
            const isMore =
              leg.kind === "player"
                ? leg.selection === "over"
                : leg.selection === "more" || leg.selection === "youngknights";
            return (
              <div
                key={key}
                className="animate-slideIn flex items-center gap-3 border-b border-line/60 py-3 last:border-none"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold ${
                    isMore
                      ? "bg-young/15 text-young-light"
                      : "bg-alum/15 text-alum-light"
                  }`}
                >
                  {leg.kind === "team" ? "GM" : isMore ? "MO" : "LE"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-head text-sm font-semibold text-bone">
                    {title}
                  </p>
                  <p className="text-xs text-bone/45">{subtitle}</p>
                </div>
                <button
                  onClick={() => onRemove(key)}
                  className="shrink-0 text-xs font-medium text-bone/35 underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative border-t border-line px-5 py-4">
          {locked ? (
            <p className="text-center font-head text-sm font-bold tracking-wide text-young-light">
              PICKS ARE LOCKED &#128274;
            </p>
          ) : (
            <button
              disabled={!canSubmit || submitting}
              onClick={onSubmit}
              className="w-full rounded-xl bg-bone py-4 font-head text-base font-bold tracking-[0.08em] text-ink shadow-[0_0_40px_-10px_rgba(245,244,241,0.5)] transition disabled:opacity-30"
            >
              {submitting
                ? "LOCKING CARD..."
                : canSubmit
                ? "LOCK IN CARD"
                : `NEED ${minPicks - items.length} MORE PICK${
                    minPicks - items.length === 1 ? "" : "S"
                  }`}
            </button>
          )}
          <p className="mt-3 text-center font-mono text-[9px] tracking-[0.1em] text-bone/30">
            FREE TO PLAY &middot; NO WAGERING &middot; EVERY PICK HAS TO HIT
          </p>
        </div>
      </div>
    </div>
  );
}
