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

  return (
    <aside className="sticky top-24 hidden h-fit w-80 shrink-0 overflow-hidden rounded-2xl border border-lineBright bg-panel lg:block">
      <div className="grain-overlay opacity-20" />
      <ConfettiBurst trigger={confettiTrigger} />

      <div className="relative border-b border-line px-5 py-4">
        <h2 className="font-head text-lg font-bold tracking-wide text-bone">
          MY CARD
        </h2>
      </div>

      <div className="relative border-b border-line px-5 py-4">
        <TierProgress
          pickCount={items.length}
          minPicks={minPicks}
          settings={settings}
        />
      </div>

      <div className="relative max-h-[35vh] overflow-y-auto px-5 py-2">
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-bone/40">
            No picks yet. Click MORE or LESS on any player to add one.
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
            className="w-full rounded-xl bg-bone py-3.5 font-head text-sm font-bold tracking-[0.08em] text-ink shadow-[0_0_30px_-10px_rgba(245,244,241,0.5)] transition disabled:opacity-30"
          >
            {submitting
              ? "LOCKING CARD..."
              : canSubmit
              ? "LOCK IN CARD"
              : `NEED ${minPicks - items.length} MORE`}
          </button>
        )}
        <p className="mt-3 text-center font-mono text-[9px] tracking-[0.1em] text-bone/30">
          FREE TO PLAY &middot; NO WAGERING &middot; EVERY PICK HAS TO HIT
        </p>
      </div>
    </aside>
  );
}
