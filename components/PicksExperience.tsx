"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import PlayerCard from "@/components/PlayerCard";
import TeamPropCard from "@/components/TeamPropCard";
import { PickSlipBar, PickSlipDrawer } from "@/components/PickSlip";
import PickSidePanel from "@/components/PickSidePanel";
import SubmitModal, { SubmitInfo } from "@/components/SubmitModal";
import { getTierInfo, legLabel, legKey } from "@/lib/cardTiers";

import {
  CardLeg,
  EventSettings,
  Player,
  PropWithPlayer,
  STAT_LABELS,
  Team,
  TeamProp,
} from "@/lib/types";

type Filter = "ALL" | "YOUNG" | "ALUM" | "GAME";

type StatFilter =
  | "HOT"
  | "PTS"
  | "REB"
  | "AST"
  | "3PT"
  | "STL"
  | "BLK"
  | "PRA"
  | "PTS+REB"
  | "PTS+AST"
  | "REB+BLK";

const STAT_FILTERS: {
  label: string;
  value: StatFilter;
  icon?: string;
}[] = [
  { label: "HOT", value: "HOT", icon: "🔥" },
  { label: "PTS", value: "PTS" },
  { label: "AST", value: "AST" },
  { label: "REB", value: "REB" },
  { label: "3PT", value: "3PT" },
  { label: "STL", value: "STL" },
  { label: "BLK", value: "BLK" },
  { label: "PRA", value: "PRA" },
  { label: "PTS+REB", value: "PTS+REB" },
  { label: "PTS+AST", value: "PTS+AST" },
  { label: "REB+BLK", value: "REB+BLK" },
];

const CATEGORY_FILTERS: {
  label: string;
  value: Filter;
}[] = [
  { label: "ALL", value: "ALL" },
  { label: "YOUNG", value: "YOUNG" },
  { label: "ALUM", value: "ALUM" },
  { label: "GAME", value: "GAME" },
];

const PICKS_DRAFT_KEY = "sce_picks_draft_v1";

function normalizeStat(value?: string | null): string {
  if (!value) return "";
  return value.toUpperCase().replace(/\s+/g, "");
}

function statMatches(
  statType: string | undefined,
  filter: StatFilter,
): boolean {
  const statMap: Record<string, StatFilter | undefined> = {
    points: "PTS",
    rebounds: "REB",
    assists: "AST",
    three_pt_made: "3PT",
    steals: "STL",
    blocks: "BLK",
    points_rebounds: "PTS+REB",
    points_assists: "PTS+AST",
    rebounds_blocks: "REB+BLK",
    pra: "PRA",
  };

  return statMap[statType ?? ""] === filter;
}

function getTeamName(
  player: Player | undefined,
  teams: Team[],
): string {
  if (!player) return "";

  const possiblePlayer = player as Player & {
    team_name?: string;
    team?: string | { name?: string };
    team_id?: string;
  };

  if (possiblePlayer.team_name) {
    return possiblePlayer.team_name;
  }

  if (typeof possiblePlayer.team === "string") {
    return possiblePlayer.team;
  }

  if (
    possiblePlayer.team &&
    typeof possiblePlayer.team === "object" &&
    possiblePlayer.team.name
  ) {
    return possiblePlayer.team.name;
  }

  if (possiblePlayer.team_id) {
    const team = teams.find(
      (item) => item.id === possiblePlayer.team_id,
    );

    if (team) {
      return team.name;
    }
  }

  return "";
}

function getPlayerName(player: Player | undefined): string {
  if (!player) return "Player";

  const possiblePlayer = player as Player & {
    name?: string;
    first_name?: string;
    last_name?: string;
  };

  if (possiblePlayer.name) {
    return possiblePlayer.name;
  }

  return [possiblePlayer.first_name, possiblePlayer.last_name]
    .filter(Boolean)
    .join(" ");
}

function getStatLabel(statType?: string | null): string {
  if (!statType) return "PROP";

  return (
    STAT_LABELS[statType as keyof typeof STAT_LABELS] ??
    statType.toUpperCase()
  );
}

function getAutoBio(
  playerName: string,
  teamName: string,
  playerProps: PropWithPlayer[],
): string {
  const headline =
    playerProps.find((p) => p.featured) ?? playerProps[0];

  if (!headline) {
    return `${playerName} takes the floor for ${teamName || "their squad"} on Oct 9. No line on the board yet -- check back soon.`;
  }

  const statLabel = getStatLabel(
    headline.stat_type,
  ).toLowerCase();

  return `Every card needs a number to beat. For ${playerName}, it's ${headline.line} ${statLabel}. ${teamName || "Their squad"} is counting on it.`;
}

function getSortValue(
  playerProps: PropWithPlayer[],
  statFilter: StatFilter,
): number {
  if (statFilter === "HOT") return 0;

  const match = playerProps.find((prop) =>
    statMatches(prop.stat_type, statFilter),
  );

  return match ? match.line : 0;
}

function legIsYoung(leg: LegWithSide): boolean {
  if (leg.kind === "player") {
    return (
      leg.teamName?.toLowerCase().includes("young") ?? false
    );
  }

  if (leg.kind === "team" && leg.propType === "winning_team") {
    return leg.selection === "youngknights";
  }

  return false;
}

type PicksExperienceProps = {
  teams: Team[];
  players?: Player[];
  props: PropWithPlayer[];
  teamProps: TeamProp[];
  settings: EventSettings | null;
};

type LegWithSide = CardLeg & {
  side?: "more" | "less";
};

export default function PicksExperience({
  teams,
  players: _players,
  props,
  teamProps,
  settings,
}: PicksExperienceProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [statFilter, setStatFilter] =
    useState<StatFilter>("HOT");
  const [searchTerm, setSearchTerm] = useState("");

  const [picks, setPicks] = useState<
    Record<string, LegWithSide>
  >({});

  // Restore an in-progress card from this device so a refresh
  // or a dropped connection at the event doesn't wipe it out.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PICKS_DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        setPicks(parsed);
      }
    } catch {
      // Ignore -- worst case they just start with an empty card.
    }
  }, []);

  // Keep the draft saved as picks change.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        PICKS_DRAFT_KEY,
        JSON.stringify(picks),
      );
    } catch {
      // Ignore -- storage may be unavailable (private mode, etc).
    }
  }, [picks]);

  // Whenever the category or stat tab changes, bring the results
  // back into view. Without this, switching tabs while scrolled
  // down can look like nothing happened.
  const resultsAnchorRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  // Random tiebreaker per player, assigned once and cached for
  // the lifetime of this page load. Used so multiple HOT picks
  // shuffle their order each time the page loads, instead of
  // always showing in the same order.
  const shuffleWeightsRef = useRef<Map<string, number>>(
    new Map(),
  );

  const getShuffleWeight = (playerId: string): number => {
    const cache = shuffleWeightsRef.current;

    if (!cache.has(playerId)) {
      cache.set(playerId, Math.random());
    }

    return cache.get(playerId)!;
  };

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    resultsAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [filter, statFilter]);

  const [selectedPlayer, setSelectedPlayer] = useState<
    PropWithPlayer[] | null
  >(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);

  const pickList = useMemo<LegWithSide[]>(
    () => Object.values(picks),
    [picks],
  );

  const pickCount = pickList.length;
  const minPicks = settings?.min_picks ?? 3;
  const locked = Boolean(settings?.picks_locked);

  const tierInfo = useMemo(
    () => getTierInfo(pickCount, settings),
    [pickCount, settings],
  );

  /*
   * Every player's props are shown in the same order,
   * no matter which player: points, assists, and
   * rebounds always lead, everything else follows in
   * whatever order it came in.
   */
  const STAT_PRIORITY: Record<string, number> = {
    points: 0,
    assists: 1,
    rebounds: 2,
  };

  const sortByStatPriority = (
    a: PropWithPlayer,
    b: PropWithPlayer,
  ) =>
    (STAT_PRIORITY[a.stat_type] ?? 99) -
    (STAT_PRIORITY[b.stat_type] ?? 99);

  /*
   * Group all props by player.
   */
  const groupedPlayers = useMemo(() => {
    const map = new Map<string, PropWithPlayer[]>();

    for (const prop of props) {
      if (!prop.player) continue;

      const playerId = prop.player.id;

      if (!map.has(playerId)) {
        map.set(playerId, []);
      }

      map.get(playerId)!.push(prop);
    }

    return Array.from(map.entries()).map(
      ([playerId, playerProps]) => ({
        playerId,
        player: playerProps[0].player,
        props: [...playerProps].sort(
          sortByStatPriority,
        ),
      }),
    );
  }, [props]);

  /*
   * Filter players.
   */
  const visiblePlayers = useMemo(() => {
    const filtered = groupedPlayers.filter(
      ({ player, props: playerProps }) => {
        const teamName = getTeamName(
          player,
          teams,
        ).toUpperCase();

const isYoung =
  player.team.slug === "youngknights";

const isAlum =
  player.team.slug === "alumknights";
        
        const hasFeatured = playerProps.some(
          (prop) => Boolean(prop.featured),
        );

        const hasStat =
          statFilter === "HOT"
            ? hasFeatured
            : playerProps.some((prop) =>
                statMatches(
                  prop.stat_type,
                  statFilter,
                ),
              );

        if (!hasStat) {
          return false;
        }

        if (
          searchTerm.trim() &&
          !player.name
            .toLowerCase()
            .includes(searchTerm.trim().toLowerCase())
        ) {
          return false;
        }

        switch (filter) {
          case "YOUNG":
            return isYoung;

          case "ALUM":
            return isAlum;

          case "ALL":
          default:
            return true;
        }
      },
    );

    /*
     * HOT picks float to the top no matter which tab is active.
     * If there are several, their order shuffles each time the
     * page loads. Everyone else is sorted by the active stat,
     * highest to lowest.
     */
    return [...filtered].sort((a, b) => {
      const aHot = a.props.some((p) => Boolean(p.featured))
        ? 0
        : 1;
      const bHot = b.props.some((p) => Boolean(p.featured))
        ? 0
        : 1;

      if (aHot !== bHot) {
        return aHot - bHot;
      }

      if (aHot === 0) {
        // Both HOT -- shuffled order.
        return (
          getShuffleWeight(a.playerId) -
          getShuffleWeight(b.playerId)
        );
      }

      // Both not HOT -- highest to lowest on the active stat.
      return (
        getSortValue(b.props, statFilter) -
        getSortValue(a.props, statFilter)
      );
    });
  }, [
    groupedPlayers,
    filter,
    statFilter,
    searchTerm,
    teams,
  ]);

  /*
   * Game props.
   */
  const visibleTeamProps = useMemo(() => {
    if (filter !== "GAME") {
      return [];
    }

    return teamProps.filter(
      (prop) => prop.active !== false,
    );
  }, [filter, teamProps]);

  /*
   * Get selection for a player prop.
   */
  const getPlayerSelection = (
    propId: string,
  ): "over" | "under" | null => {
    const pick = picks[`player:${propId}`];

    if (!pick || pick.kind !== "player") {
      return null;
    }

    return pick.selection;
  };

  /*
   * Get selection for a team prop.
   *
   * Winning team:
   *   "youngknights" | "alumknights"
   *
   * Combined points:
   *   "more" | "less"
   */
  const getTeamSelection = (
    teamProp: TeamProp,
  ): string | null => {
    const pick = picks[`team:${teamProp.id}`];

    if (!pick || pick.kind !== "team") {
      return null;
    }

    return pick.selection;
  };

  /*
   * Select MORE / LESS for player props.
   */
  const handleSelect = (
    prop: PropWithPlayer,
    side: "more" | "less",
  ) => {
    if (locked || prop.locked) {
      return;
    }

    const key = `player:${prop.id}`;

    setPicks((current) => {
      const next = { ...current };

      /*
       * Multiple props on the same player are allowed
       * (e.g. MORE points AND LESS rebounds for one
       * player). Each prop has its own key, so nothing
       * needs to be cleared here -- only the exact same
       * prop/side toggles off below.
       */

      const currentPick = next[key];

      /*
       * Clicking the same side again removes it.
       */
      if (
        currentPick?.kind === "player" &&
        currentPick.propId === prop.id &&
        currentPick.side === side
      ) {
        delete next[key];
        return next;
      }

      next[key] = {
        kind: "player",
        propId: prop.id,
        playerId: prop.player?.id ?? "",
        playerName: prop.player?.name ?? "",
        teamName:
          prop.player?.team?.name ?? "",
        statType: prop.stat_type,
        line: prop.line,
        selection:
          side === "more"
            ? "over"
            : "under",
        side,
      };

      return next;
    });

    setConfettiTrigger(
      (value) => value + 1,
    );
  };

  /*
   * Select a game prop.
   */
  const handleSelectTeam = (
    teamProp: TeamProp,
    selection: string,
  ) => {
    if (
      locked ||
      teamProp.locked
    ) {
      return;
    }

    const key = `team:${teamProp.id}`;

    setPicks((current) => {
      const next = { ...current };
      const currentPick = next[key];

      /*
       * Clicking the same selection removes it.
       */
      if (
        currentPick?.kind === "team" &&
        currentPick.selection === selection
      ) {
        delete next[key];
        return next;
      }

      next[key] = {
        kind: "team",
        teamPropId: teamProp.id,
        propType: teamProp.prop_type,
        label:
          teamProp.prop_type ===
          "winning_team"
            ? "WINNING TEAM"
            : "COMBINED POINTS",
        selection,
        line: teamProp.line,
        side:
          teamProp.prop_type ===
          "combined_points"
            ? selection === "more"
              ? "more"
              : "less"
            : undefined,
      };

      return next;
    });

    setConfettiTrigger(
      (value) => value + 1,
    );
  };

  /*
   * Remove a pick.
   */
  const removeLeg = (key: string) => {
    setPicks((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });
  };

  /*
   * Clear the whole card.
   */
  const clearAllPicks = () => {
    if (pickCount === 0) return;

    const confirmed = window.confirm(
      "Clear all picks from your card?",
    );

    if (confirmed) {
      setPicks({});
    }
  };

  /*
   * Player profile.
   */
  const openPlayerProfile = (
    playerProps: PropWithPlayer[],
  ) => {
    setSelectedPlayer(playerProps);
  };

  const closePlayerProfile = () => {
    setSelectedPlayer(null);
  };

  /*
   * Open submit modal.
   */
  const handleSubmit = () => {
    if (locked) return;
    if (pickCount < minPicks) return;

    setSubmitOpen(true);
  };

  /*
   * Submit card.
   */
  const handleConfirmSubmit = async (
  info: SubmitInfo,
) => {
  if (submitting) return;

  setSubmitting(true);

  try {
    const playerPicks = pickList
      .filter(
        (leg): leg is LegWithSide & {
          kind: "player";
        } => leg.kind === "player",
      )
      .map((leg) => ({
        propId: leg.propId,
        selection: leg.selection,
      }));

    const teamPicks = pickList
      .filter(
        (leg): leg is LegWithSide & {
          kind: "team";
        } => leg.kind === "team",
      )
      .map((leg) => ({
        teamPropId: leg.teamPropId,
        selection: leg.selection,
      }));

    const response = await fetch(
      "/api/picks/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: info.name,
          instagram_username:
            info.instagram_username,
          email: info.email,
          playerPicks,
          teamPicks,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Unable to submit picks.",
      );
    }

    setSubmitOpen(false);
    setSubmitted(true);

    try {
      window.localStorage.removeItem(PICKS_DRAFT_KEY);
    } catch {
      // Ignore.
    }
  } catch (error) {
    console.error(
      "Pick submission failed:",
      error,
    );

    alert(
      error instanceof Error
        ? error.message
        : "Something went wrong submitting your card.",
    );
  } finally {
    setSubmitting(false);
  }
};
  /*
   * Submission confirmation.
   */
  /*
   * Share the locked card (native share sheet on mobile,
   * clipboard copy as a fallback everywhere else).
   */
  const handleShareCard = async () => {
    const lines = pickList.map((leg) => {
      const { title, subtitle } = legLabel(leg);
      return `${title} — ${subtitle}`;
    });

    const shareText = [
      "My SCE Picks card 🔥",
      "YoungKnights vs AlumKnights",
      "",
      ...lines,
      "",
      "Make your own free card:",
      typeof window !== "undefined"
        ? `${window.location.origin}/picks`
        : "",
    ].join("\n");

    if (
      typeof navigator !== "undefined" &&
      navigator.share
    ) {
      try {
        await navigator.share({
          title: "SCE Picks",
          text: shareText,
        });
        return;
      } catch {
        // Fall through to clipboard copy below.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      alert(
        "Copied! Paste your card anywhere to share it.",
      );
    } catch {
      // Nothing more we can do -- the screenshot still works.
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-ink px-4 py-10 text-bone sm:px-6">
        <div className="mx-auto max-w-md">
          {/* =====================================================
              SHAREABLE FLEX CARD -- this is the part meant to be
              screenshotted and posted.
          ===================================================== */}
          <div className="flex-card-in overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-panel via-ink to-ink shadow-2xl">
            {/* Header */}
            <div className="relative border-b border-line bg-hero-glow px-6 pb-6 pt-7 text-center">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-young-light">
                🔒 CARD LOCKED
              </p>

              <h1 className="mt-2 font-display text-4xl uppercase leading-[0.9] tracking-tight text-bone">
                YOU&apos;RE IN.
              </h1>

              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-bone/40">
                {settings?.event_name ?? "SCE PICKS"} &middot;{" "}
                YOUNGKNIGHTS VS ALUMKNIGHTS
              </p>
            </div>

            {/* Tier / stakes */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-bone/35">
                  PICKS ON THE CARD
                </p>
                <p className="mt-0.5 font-head text-2xl font-black text-bone">
                  {pickCount}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-bone/35">
                  {tierInfo.tier ? "TIER REACHED" : "NEXT TIER"}
                </p>
                <p className="mt-0.5 font-head text-sm font-black uppercase text-young-light">
                  {tierInfo.tier
                    ? tierInfo.label
                    : `${tierInfo.picksToNextTier} MORE TO ${tierInfo.nextTier}`}
                </p>
              </div>
            </div>

            {/* The actual picks list */}
            <div className="max-h-[45vh] space-y-2 overflow-y-auto px-4 py-4">
              {pickList.map((leg) => {
                const key = legKey(leg);
                const { title, subtitle } = legLabel(leg);
                const isYoung = legIsYoung(leg);

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                      isYoung
                        ? "border-young/25 bg-young/[0.06]"
                        : "border-alum/25 bg-alum/[0.06]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-head text-sm font-bold text-bone">
                        {title}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.1em] ${
                        isYoung
                          ? "text-young-light"
                          : "text-alum-light"
                      }`}
                    >
                      {subtitle}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer branding */}
            <div className="border-t border-line px-6 py-4 text-center">
              <p className="font-head text-xs font-black uppercase tracking-[0.15em] text-bone">
                SCE{" "}
                <span className="text-young-light">PICKS</span>
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-bone/30">
                CALL YOUR SHOT &middot; FREE TO PLAY
              </p>
            </div>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-bone/35">
            📸 Screenshot this card and post your picks.
          </p>

          {/* Actions -- outside the shareable card on purpose */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleShareCard}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-young-light/40 bg-young/10 px-6 font-head text-sm font-black uppercase tracking-wider text-young-light transition hover:bg-young/15 active:scale-[0.98]"
            >
              📤 SHARE MY CARD
            </button>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-bone px-6 font-head text-sm font-black uppercase tracking-wider text-ink transition hover:scale-[1.02] active:scale-[0.98]"
            >
              BACK TO PICKS
            </button>

            <Link
              href="/"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line px-6 font-head text-sm font-black uppercase tracking-wider text-bone/60 transition hover:border-bone/30 hover:text-bone"
            >
              HOME
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink text-bone">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/picks"
              className="font-head text-xl font-black tracking-tight text-bone"
            >
              SCE{" "}
              <span className="text-young-light">
                PICKS
              </span>
            </Link>

            <div className="hidden font-mono text-[8px] uppercase tracking-[0.18em] text-bone/35 sm:block">
              YOUNGKNIGHTS VS ALUMKNIGHTS
            </div>
          </div>

          <div className="hidden text-center sm:block">
            <div className="font-head text-xs font-bold uppercase tracking-wider text-bone/80">
              OCT 9 · UCF
            </div>

            <div className="font-mono text-[8px] uppercase tracking-[0.15em] text-bone/30">
              CHARITY BASKETBALL GAME
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileSlipOpen(true)
            }
            className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 transition hover:border-bone/30"
          >
            <span className="font-head text-[10px] font-black uppercase tracking-wider">
              MY CARD
            </span>

            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-bone px-1 font-mono text-[10px] font-bold text-ink">
              {pickCount}
            </span>
          </button>
        </div>
      </header>

      {/* MATCHUP */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-bone/30">
                MAKE YOUR PICKS
              </p>

              <h1 className="mt-1 font-head text-3xl font-black uppercase tracking-tight sm:text-4xl">
                BUILD YOUR CARD.
              </h1>

              <p className="mt-2 max-w-xl text-sm text-bone/45">
                Pick more or less on player props.
                Every pick has to hit.
              </p>

              {/* SEARCH */}
              <div className="relative mt-4 max-w-xs">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-bone/25">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  placeholder="Search players..."
                  className="w-full rounded-full border border-line bg-panel py-2.5 pl-9 pr-4 font-head text-sm text-bone placeholder:text-bone/30 focus:border-bone/30 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/30 hover:text-bone/70"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="hidden text-right md:block">
              <div className="font-head text-lg font-black">
                {pickCount}{" "}
                <span className="font-mono text-[9px] font-bold tracking-widest text-bone/30">
                  PICKS
                </span>
              </div>

              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-bone/30">
                MIN {minPicks}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY FILTER */}
      <div
        ref={resultsAnchorRef}
        style={{ scrollMarginTop: "64px" }}
        className="border-b border-line"
      >
        <div className="mx-auto max-w-[1600px] overflow-x-auto px-4 sm:px-6 lg:px-8">
          <div className="no-scrollbar flex min-w-max gap-2 py-3.5">
            {CATEGORY_FILTERS.map(
              (item) => {
                const active =
                  filter === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setFilter(item.value)
                    }
                    className={[
                      "rounded-full border px-5 py-2.5 font-head text-sm font-bold uppercase tracking-[0.06em] transition active:scale-[0.96]",
                      active
                        ? "border-bone bg-bone text-ink shadow-md"
                        : "border-line text-bone/45 hover:border-bone/30 hover:bg-panel hover:text-bone",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>

      {/* STAT FILTER */}
      {filter !== "GAME" && (
        <div className="border-b border-line/70">
          <div className="mx-auto max-w-[1600px] overflow-x-auto px-4 sm:px-6 lg:px-8">
            <div className="no-scrollbar flex min-w-max gap-2 py-3">
              {STAT_FILTERS.map(
                (item) => {
                  const active =
                    statFilter ===
                    item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setStatFilter(
                          item.value,
                        )
                      }
                      className={[
                        "flex items-center gap-1 rounded-full border px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition active:scale-[0.95]",
                        active
                          ? "border-bone/70 bg-bone/10 text-bone"
                          : "border-line/70 text-bone/40 hover:border-bone/25 hover:text-bone/70",
                      ].join(" ")}
                    >
                      {item.icon && (
                        <span
                          className={
                            active
                              ? "hot-badge-flame text-[11px] leading-none"
                              : "text-[11px] leading-none"
                          }
                        >
                          {item.icon}
                        </span>
                      )}
                      {item.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <section className="mx-auto max-w-[1600px] px-4 py-6 pb-32 sm:px-6 lg:px-8 lg:pb-12">
        {filter === "GAME" ? (
          <div>
            <div className="mb-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-bone/30">
                GAME PROPS
              </p>

              <h2 className="mt-1 font-head text-2xl font-black uppercase">
                THE GAME.
              </h2>
            </div>

            {visibleTeamProps.length === 0 ? (
              <div className="rounded-2xl border border-line bg-panel p-8 text-center">
                <p className="font-head text-lg font-bold uppercase text-bone/60">
                  NO GAME PROPS
                </p>
              </div>
            ) : (
              <div
                key={`game-${filter}`}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleTeamProps.map(
                  (teamProp, index) => (
                    <div
                      key={teamProp.id}
                      className="category-card-in"
                      style={{
                        animationDelay: `${Math.min(index, 10) * 40}ms`,
                      }}
                    >
                      <TeamPropCard
                        prop={teamProp}
                        teams={teams}
                        selection={getTeamSelection(
                          teamProp,
                        )}
                        onSelect={(selection) =>
                          handleSelectTeam(
                            teamProp,
                            selection,
                          )
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {visiblePlayers.length === 0 ? (
              <div className="rounded-2xl border border-line bg-panel p-10 text-center">
                <p className="font-head text-xl font-black uppercase text-bone/60">
                  NOTHING HERE YET
                </p>

                <p className="mt-2 text-sm text-bone/35">
                  Try another category or stat.
                </p>
              </div>
            ) : (
              <div
                key={`players-${filter}-${statFilter}-${searchTerm}`}
                className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
              >
                {visiblePlayers.map(
                  ({
                    playerId,
                    player,
                    props: playerProps,
                  }, index) => {
                    const primaryProp =
                      playerProps.find(
                        (prop) =>
                          statMatches(
                            prop.stat_type,
                            statFilter,
                          ),
                      ) ??
                      playerProps.find(
                        (prop) =>
                          Boolean(
                            prop.featured,
                          ),
                      ) ??
                      playerProps[0];

                    return (
                      <div
                        key={playerId}
                        className="category-card-in"
                        style={{
                          animationDelay: `${
                            Math.min(index, 10) * 40
                          }ms`,
                        }}
                      >
                        <PlayerCard
                          props={playerProps}
                          primaryPropId={
                            primaryProp?.id
                          }
                          getSelection={
                            getPlayerSelection
                          }
                          onSelect={(
                            prop,
                            selection,
                          ) =>
                            handleSelect(
                              prop,
                              selection ===
                                "over"
                                ? "more"
                                : "less",
                            )
                          }
                          onOpenProfile={() =>
                            openPlayerProfile(
                              playerProps,
                            )
                          }
                        />
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* DESKTOP PICK PANEL */}
      <div className="hidden lg:block">
        <PickSidePanel
          items={pickList}
          onRemove={removeLeg}
          onClearAll={clearAllPicks}
          onSubmit={handleSubmit}
          submitting={submitting}
          locked={locked}
          minPicks={minPicks}
          settings={settings}
          confettiTrigger={
            confettiTrigger
          }
        />
      </div>

      {/* MOBILE PICK SLIP */}
      <div className="lg:hidden">
<PickSlipBar
  count={pickCount}
  onOpen={() =>
    setMobileSlipOpen(true)
  }
/>

<PickSlipDrawer
  items={pickList}
  open={mobileSlipOpen}
  onClose={() =>
    setMobileSlipOpen(false)
  }
  onRemove={removeLeg}
  onClearAll={clearAllPicks}
  onSubmit={handleSubmit}
  submitting={submitting}
  locked={locked}
  minPicks={minPicks}
  settings={settings}
  confettiTrigger={confettiTrigger}
/>
      </div>

      {/* PLAYER PROFILE */}
      {selectedPlayer && (
        <PlayerProfile
          playerProps={selectedPlayer}
          teams={teams}
          picks={picks}
          locked={locked}
          onClose={
            closePlayerProfile
          }
          onSelect={handleSelect}
        />
      )}

      {/* SUBMIT MODAL */}
      <SubmitModal
        open={submitOpen}
        onClose={() =>
          setSubmitOpen(false)
        }
        onConfirm={
          handleConfirmSubmit
        }
        submitting={submitting}
        emailRequired={
          settings?.email_required ??
          true
        }
        instagramRequired={
          settings?.instagram_required ??
          true
        }
        pickCount={pickCount}
        tierInfo={tierInfo}
      />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* PLAYER PROFILE                                                             */
/* -------------------------------------------------------------------------- */

function PlayerProfile({
  playerProps,
  teams,
  picks,
  locked,
  onClose,
  onSelect,
}: {
  playerProps: PropWithPlayer[];
  teams: Team[];
  picks: Record<
    string,
    LegWithSide
  >;
  locked: boolean;
  onClose: () => void;
  onSelect: (
    prop: PropWithPlayer,
    side: "more" | "less",
  ) => void;
}) {
  const player =
    playerProps[0]?.player;

  if (!player) return null;

  const playerName =
    getPlayerName(player);

  const teamName =
    getTeamName(player, teams);

  const imageUrl =
    player.image_url;

  const isYoung =
    player.team?.slug === "youngknights";

  const heroGradient = isYoung
    ? "from-young/50 via-young-dark/20 to-ink"
    : "from-alum/50 via-alum-dark/20 to-ink";

  const selectedProps =
    playerProps.filter(
      (prop) =>
        Boolean(
          picks[`player:${prop.id}`],
        ),
    );

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto min-h-screen w-full max-w-3xl">
        {/* TOP BAR */}
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-bone/50 transition hover:text-bone"
          >
            <span className="text-lg">
              ←
            </span>
            BACK
          </button>

          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-bone/25">
            PLAYER PROPS
          </span>

          <div className="w-12" />
        </div>

        {/* HERO */}
        <div className="relative overflow-hidden border-b border-line">
          <div
            className={`absolute inset-0 bg-gradient-to-b ${heroGradient}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />

          {imageUrl ? (
            <div className="relative h-[340px] w-full sm:h-[420px]">
              <img
                src={imageUrl}
                alt={playerName}
                className="h-full w-full object-contain object-bottom"
              />
            </div>
          ) : (
            <div className="h-[260px] w-full bg-panel sm:h-[320px]" />
          )}

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="mb-3 inline-flex rounded-full border border-bone/15 bg-ink/70 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-bone/60 backdrop-blur">
              {teamName || "TEAM"}
            </div>

            <h1 className="max-w-2xl font-head text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">
              {playerName}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-line bg-panel/80 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-bone/45">
                {playerProps.length} PROPS
              </span>

              {selectedProps.length > 0 && (
                <span className="rounded-full border border-young-light/30 bg-young/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-young-light">
                  {selectedProps.length} SELECTED
                </span>
              )}

              {playerProps.some((p) => p.featured) && (
                <span className="hot-badge flex items-center gap-1 rounded-full border border-orange-400/40 bg-ink/70 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-orange-300">
                  <span className="hot-badge-flame">🔥</span>
                  HOT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SCOUTING REPORT (bio) */}
        <div className="border-b border-line px-5 py-5 sm:px-8">
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-bone/25">
            SCOUTING REPORT
          </p>

          {player.bio ? (
            <p className="max-w-2xl text-sm leading-relaxed text-bone/75">
              {player.bio}
            </p>
          ) : (
            <p className="max-w-2xl text-sm italic leading-relaxed text-bone/40">
              {getAutoBio(
                playerName,
                teamName,
                playerProps,
              )}
            </p>
          )}
        </div>

        {/* PLAYER NOTES */}
        {player.bio_tags &&
          player.bio_tags.length > 0 && (
            <div className="border-b border-line px-5 py-5 sm:px-8">
              <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-bone/25">
                PLAYER NOTES
              </p>

              <div className="flex flex-wrap gap-2">
                {player.bio_tags.map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-medium text-bone/60"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

        {/* PROPS */}
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-bone/25">
                AVAILABLE PROPS
              </p>

              <h2 className="mt-1 font-head text-2xl font-black uppercase">
                MAKE YOUR PICKS
              </h2>
            </div>

            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-bone/25">
              {selectedProps.length}/
              {playerProps.length}
            </div>
          </div>

          <div className="space-y-3">
            {playerProps.map(
              (prop) => {
                const selected =
                  picks[
                    `player:${prop.id}`
                  ];

                return (
                  <ProfileProp
                    key={prop.id}
                    prop={prop}
                    isYoung={isYoung}
                    selectedSide={
                      selected?.side
                    }
                    locked={locked}
                    onSelect={
                      onSelect
                    }
                  />
                );
              },
            )}
          </div>
        </div>

        {/* CLOSE */}
        <div className="px-5 pb-12 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-line bg-panel py-4 font-head text-xs font-black uppercase tracking-wider text-bone/70 transition hover:border-bone/30 hover:text-bone"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PROFILE PROP                                                               */
/* -------------------------------------------------------------------------- */

function ProfileProp({
  prop,
  isYoung,
  selectedSide,
  locked,
  onSelect,
}: {
  prop: PropWithPlayer;
  isYoung: boolean;
  selectedSide?: "more" | "less";
  locked: boolean;
  onSelect: (
    prop: PropWithPlayer,
    side: "more" | "less",
  ) => void;
}) {
  const statLabel =
    getStatLabel(
      prop.stat_type,
    );

  const accentText = isYoung
    ? "text-young-light"
    : "text-alum-light";

  const accentBorder = isYoung
    ? "border-young/50"
    : "border-alum/50";

  const accentBg = isYoung
    ? "bg-young/10"
    : "bg-alum/10";

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border-2 bg-panel transition sm:p-0",
        selectedSide
          ? `${accentBorder} shadow-[0_0_30px_rgba(255,255,255,0.06)]`
          : "border-line",
      ].join(" ")}
    >
      <div
        className={`flex items-center justify-between gap-4 px-4 pt-4 sm:px-5 sm:pt-5 ${accentBg}`}
      >
        <div>
          <p
            className={`flex items-center gap-1.5 font-head text-sm font-black uppercase tracking-[0.06em] ${accentText}`}
          >
            {statLabel}
            {prop.featured && (
              <span className="hot-badge-flame">🔥</span>
            )}
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none text-bone">
              {prop.line}
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-bone/35">
              THE LINE
            </span>
          </div>
        </div>

        {selectedSide && (
          <div className="rounded-full bg-bone px-3 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-ink">
            {selectedSide === "more" ? "MORE ✓" : "LESS ✓"}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="grid grid-cols-2 gap-2">
          <ProfileSelectButton
            label="MORE"
            active={
              selectedSide === "more"
            }
            disabled={
              locked || prop.locked
            }
            onClick={() =>
              onSelect(
                prop,
                "more",
              )
            }
          />

          <ProfileSelectButton
            label="LESS"
            active={
              selectedSide === "less"
            }
            disabled={
              locked || prop.locked
            }
            onClick={() =>
              onSelect(
                prop,
                "less",
              )
            }
          />
        </div>

        {(locked || prop.locked) && (
          <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-bone/25">
            PICKS ARE LOCKED
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PROFILE SELECT BUTTON                                                      */
/* -------------------------------------------------------------------------- */

function ProfileSelectButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "min-h-11 rounded-xl border font-head text-xs font-black uppercase tracking-wider transition",
        active
          ? "border-bone bg-bone text-ink shadow-lg"
          : "border-line bg-ink text-bone/50 hover:border-bone/30 hover:text-bone",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "active:scale-[0.98]",
      ].join(" ")}
    >
      {active && (
        <span className="mr-1">
          ✓
        </span>
      )}

      {label}
    </button>
  );
}
