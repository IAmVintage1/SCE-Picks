"use client";

import { STAT_SHORT } from "@/lib/types";
import { PickSlipItem } from "@/lib/types";

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
      className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-2xl bg-bone px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition active:scale-[0.98]"
    >
      <span className="font-display text-sm font-semibold tracking-wide text-ink">
        MY PICKS &middot; {count} PICK{count === 1 ? "" : "S"}
      </span>
      <span className="font-display text-sm font-semibold text-ink">
        VIEW PICKS &rarr;
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
}: {
  items: PickSlipItem[];
  open: boolean;
  onClose: () => void;
  onRemove: (propId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  locked: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60">
      <button
        aria-label="Close pick slip"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[80dvh] rounded-t-3xl border-t border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-wide text-bone">
            MY PICKS
          </h2>
          <button
            onClick={onClose}
            className="text-sm font-medium text-bone/50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[45dvh] overflow-y-auto px-5 py-2">
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-bone/40">
              No picks yet. Tap OVER or UNDER on any player to add one.
            </p>
          )}
          {items.map((item) => (
            <div
              key={item.propId}
              className="flex items-center justify-between border-b border-line/60 py-3 last:border-none"
            >
              <div>
                <p className="font-display text-sm font-semibold text-bone">
                  {item.playerName}
                </p>
                <p className="text-xs text-bone/50">
                  {item.selection.toUpperCase()} {item.line}{" "}
                  {STAT_SHORT[item.statType]}
                </p>
              </div>
              <button
                onClick={() => onRemove(item.propId)}
                className="text-xs font-medium text-bone/40 underline underline-offset-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-5 py-4">
          {locked ? (
            <p className="text-center text-sm font-semibold tracking-wide text-young-light">
              PICKS ARE LOCKED 🔒
            </p>
          ) : (
            <button
              disabled={items.length === 0 || submitting}
              onClick={onSubmit}
              className="w-full rounded-xl bg-bone py-4 font-display text-base font-semibold tracking-wide text-ink transition disabled:opacity-40"
            >
              {submitting ? "LOCKING IN..." : "LOCK IN PICKS"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
