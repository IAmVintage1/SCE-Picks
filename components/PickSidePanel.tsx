"use client";

import { STAT_SHORT } from "@/lib/types";
import { PickSlipItem } from "@/lib/types";

export default function PickSidePanel({
  items,
  onRemove,
  onSubmit,
  submitting,
  locked,
}: {
  items: PickSlipItem[];
  onRemove: (propId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  locked: boolean;
}) {
  return (
    <aside className="sticky top-24 hidden h-fit w-80 shrink-0 overflow-hidden rounded-2xl border border-lineBright bg-panel lg:block">
      <div className="grain-overlay opacity-20" />
      <div className="relative border-b border-line px-5 py-4">
        <p className="font-mono text-[10px] font-semibold tracking-[0.25em] text-bone/35">
          {items.length} {items.length === 1 ? "PICK" : "PICKS"}
        </p>
        <h2 className="font-head text-lg font-bold tracking-wide text-bone">
          MY PICKS
        </h2>
      </div>

      <div className="relative max-h-[50vh] overflow-y-auto px-5 py-2">
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-bone/40">
            No picks yet. Click OVER or UNDER on any player to add one.
          </p>
        )}
        {items.map((item) => {
          const isOver = item.selection === "over";
          return (
            <div
              key={item.propId}
              className="flex items-center gap-3 border-b border-line/60 py-3 last:border-none"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold ${
                  isOver
                    ? "bg-young/15 text-young-light"
                    : "bg-alum/15 text-alum-light"
                }`}
              >
                {isOver ? "OV" : "UN"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-head text-sm font-semibold text-bone">
                  {item.playerName}
                </p>
                <p className="text-xs text-bone/45">
                  {item.selection.toUpperCase()} {item.line}{" "}
                  {STAT_SHORT[item.statType]}
                </p>
              </div>
              <button
                onClick={() => onRemove(item.propId)}
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
            disabled={items.length === 0 || submitting}
            onClick={onSubmit}
            className="w-full rounded-xl bg-bone py-3.5 font-head text-sm font-bold tracking-[0.08em] text-ink shadow-[0_0_30px_-10px_rgba(245,244,241,0.5)] transition disabled:opacity-30"
          >
            {submitting ? "LOCKING IN..." : "SUBMIT PICKS"}
          </button>
        )}
        <p className="mt-3 text-center font-mono text-[9px] tracking-[0.1em] text-bone/30">
          FREE TO PLAY &middot; NO WAGERING
        </p>
      </div>
    </aside>
  );
}
