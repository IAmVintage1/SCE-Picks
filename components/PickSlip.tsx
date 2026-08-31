"use client";

import Image from "next/image";
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
      className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between overflow-hidden rounded-2xl bg-bone px-5 py-4 shadow-[0_10px_40px_-6px_rgba(0,0,0,0.7)] transition active:scale-[0.97]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-bone">
          {count}
        </span>
        <span className="font-head text-sm font-bold tracking-[0.05em] text-ink">
          {count === 1 ? "PICK" : "PICKS"} MADE
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
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
      <button
        aria-label="Close pick slip"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[82dvh] overflow-hidden rounded-t-3xl border-t border-lineBright bg-panel">
        <div className="grain-overlay opacity-20" />
        <div className="relative flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.25em] text-bone/35">
              {items.length} {items.length === 1 ? "PICK" : "PICKS"}
            </p>
            <h2 className="font-head text-lg font-bold tracking-wide text-bone">
              MY PICKS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-bone/50"
          >
            Close
          </button>
        </div>

        <div className="relative max-h-[45dvh] overflow-y-auto px-5 py-2">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-bone/40">
              No picks yet. Tap OVER or UNDER on any player to add one.
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
              className="w-full rounded-xl bg-bone py-4 font-head text-base font-bold tracking-[0.08em] text-ink shadow-[0_0_40px_-10px_rgba(245,244,241,0.5)] transition disabled:opacity-30"
            >
              {submitting ? "LOCKING IN..." : "LOCK IN PICKS"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
