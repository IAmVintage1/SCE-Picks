import { CARD_TIERS, CardLeg, EventSettings, STAT_SHORT } from "@/lib/types";

export interface TierInfo {
  tier: (typeof CARD_TIERS)[number] | null;
  label: string;
  prize: string | null;
  nextTier: (typeof CARD_TIERS)[number] | null;
  picksToNextTier: number | null;
}

// Given the number of picks currently on a card, figure out which
// prize tier it would qualify for IF every single pick hits.
// The card must be PERFECT (all legs hit) to win anything -- this
// function only ever describes what's on the line, never a result.
export function getTierInfo(
  pickCount: number,
  settings: Pick<EventSettings, "prize_3" | "prize_5" | "prize_10"> | null
): TierInfo {
  const prizes: Record<(typeof CARD_TIERS)[number], string> = {
    3: settings?.prize_3 ?? "SCE Instagram shoutout",
    5: settings?.prize_5 ?? "SCE shirt",
    10: settings?.prize_10 ?? "Gift card",
  };

  let tier: (typeof CARD_TIERS)[number] | null = null;
  for (const t of CARD_TIERS) {
    if (pickCount >= t) tier = t;
  }

  const nextTier = CARD_TIERS.find((t) => t > pickCount) ?? null;

  return {
    tier,
    label: tier ? `${tier} PICK CARD` : "BUILD YOUR CARD",
    prize: tier ? prizes[tier] : null,
    nextTier,
    picksToNextTier: nextTier ? nextTier - pickCount : null,
  };
}

export function meetsMinimum(pickCount: number, minPicks: number) {
  return pickCount >= minPicks;
}

// One consistent way to describe any leg (player prop or team
// prop) across the pick bar, drawer, side panel, and submission.
export function legLabel(leg: CardLeg): { title: string; subtitle: string } {
  if (leg.kind === "player") {
    return {
      title: leg.playerName,
      subtitle: `${leg.selection === "over" ? "MORE" : "LESS"} ${leg.line} ${
        STAT_SHORT[leg.statType]
      }`,
    };
  }
  if (leg.propType === "winning_team") {
    return {
      title: "WINNING TEAM",
      subtitle:
        leg.selection === "youngknights" ? "YOUNGKNIGHTS" : "ALUMKNIGHTS",
    };
  }
  return {
    title: "COMBINED POINTS",
    subtitle: `${leg.selection.toUpperCase()} ${leg.line}`,
  };
}

export function legKey(leg: CardLeg): string {
  return leg.kind === "player" ? `player:${leg.propId}` : `team:${leg.teamPropId}`;
}
