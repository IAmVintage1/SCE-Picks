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
  settings: Pick<EventSettings, "prize_3" | "prize_5" | "prize_10"> | null;
}) {
  const info = getTierInfo(pickCount, settings);
  const maxTier = CARD_TIERS[CARD_TIERS.length - 1];
  const progressPct = Math.min(100, (pickCount / maxTier) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-head text-sm font-bold tracking-wide text-bone">
          {pickCount === 0
            ? "BUILD YOUR CARD"
            : info.tier
            ? `${info.tier} PICK CARD`
            : `${pickCount} PICK${pickCount === 1 ? "" : "S"}`}
        </p>
        {info.prize && (
          <span className="animate-pop font-mono text-[10px] font-bold tracking-[0.1em] text-young-light">
            {info.prize.toUpperCase()}
          </span>
        )}
      </div>

      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-gradient-to-r from-young via-bone to-alum transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
        {CARD_TIERS.map((t) => (
          <div
            key={t}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-ink"
            style={{
              left: `${(t / maxTier) * 100}%`,
              backgroundColor: pickCount >= t ? "#F5F4F1" : "#26262C",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between font-mono text-[9px] tracking-[0.08em] text-bone/35">
        <span>MIN {minPicks}</span>
        <span>5</span>
        <span>10 · GIFT CARD</span>
      </div>

      {pickCount === 0 && (
        <p className="mt-3 text-xs text-bone/45">
          Pick at least {minPicks} props to play. Every pick has to hit.
        </p>
      )}
      {pickCount > 0 && pickCount < minPicks && (
        <p className="mt-3 text-xs text-young-light">
          You need at least {minPicks} picks to submit.
        </p>
      )}
      {info.nextTier && pickCount >= minPicks && (
        <p className="mt-3 text-xs text-bone/45">
          {info.picksToNextTier} more pick
          {info.picksToNextTier === 1 ? "" : "s"} for the {info.nextTier}-pick
          tier.
        </p>
      )}
      {pickCount >= maxTier && (
        <p className="mt-3 text-xs text-bone/45">
          Max tier reached. One wrong pick still breaks the whole card.
        </p>
      )}
    </div>
  );
}
