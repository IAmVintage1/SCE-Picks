"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import PlayerCard from "@/components/PlayerCard";
import TeamPropCard from "@/components/TeamPropCard";
import { PickSlipBar, PickSlipDrawer } from "@/components/PickSlip";
import PickSidePanel from "@/components/PickSidePanel";
import SubmitModal, { SubmitInfo } from "@/components/SubmitModal";
import { getTierInfo } from "@/lib/cardTiers";

import {
  CardLeg,
  EventSettings,
  Player,
  PropWithPlayer,
  Team,
  TeamProp,
} from "@/lib/types";

type Filter = "HOT" | "ALL" | "YOUNG" | "ALUM" | "GAME";

type StatFilter =
  | "ALL"
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

const STAT_FILTERS: { label: string; value: StatFilter }[] = [
  { label: "ALL", value: "ALL" },
  { label: "PTS", value: "PTS" },
  { label: "REB", value: "REB" },
  { label: "AST", value: "AST" },
  { label: "3PT", value: "3PT" },
  { label: "STL", value: "STL" },
  { label: "BLK", value: "BLK" },
  { label: "PRA", value: "PRA" },
  { label: "PTS+REB", value: "PTS+REB" },
  { label: "PTS+AST", value: "PTS+AST" },
  { label: "REB+BLK", value: "REB+BLK" },
];

const CATEGORY_FILTERS: { label: string; value: Filter }[] = [
  { label: "HOT", value: "HOT" },
  { label: "ALL", value: "ALL" },
  { label: "YOUNG", value: "YOUNG" },
  { label: "ALUM", value: "ALUM" },
  { label: "GAME", value: "GAME" },
];

function normalizeStat(value?: string | null): string {
  if (!value) return "";
  return value.toUpperCase().replace(/\s+/g, "");
}

function statMatches(
  statType: string | undefined,
  filter: StatFilter,
): boolean {
  if (filter === "ALL") return true;

  return normalizeStat(statType) === normalizeStat(filter);
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
      const possibleTeam = team as Team & {
        name?: string;
        team_name?: string;
      };

      return possibleTeam.name ?? possibleTeam.team_name ?? "";
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

  const labels: Record<string, string> = {
    PTS: "POINTS",
    REB: "REB",
    AST: "ASSISTS",
    "3PT": "3-POINTERS",
    STL: "STEALS",
    BLK: "BLOCKS",
    PRA: "PRA",
    "PTS+REB": "PTS + REB",
    "PTS+AST": "PTS + AST",
    "REB+BLK": "REB + BLK",
  };

  return labels[statType.toUpperCase()] ?? statType.toUpperCase();
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
  const [filter, setFilter] = useState<Filter>("HOT");
  const [statFilter, setStatFilter] =
    useState<StatFilter>("ALL");

  const [picks, setPicks] = useState<
    Record<string, LegWithSide>
  >({});

  const [selectedPlayer, setSelectedPlayer] = useState<
    PropWithPlayer[] | null
  >(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);

  const pickList = useMemo<LegWithSide[]>(
    () => Object.values(picks),
    [picks],
  );

  const pickCount = pickList.length;
  const minPicks = settings?.min_picks ?? 3;
  const locked = Boolean(settings?.picks_locked);

  /*
   * Group all props belonging to the same player.
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
        props: playerProps,
      }),
    );
  }, [props]);

  /*
   * Filter players.
   */
  const visiblePlayers = useMemo(() => {
    return groupedPlayers.filter(
      ({ player, props: playerProps }) => {
        const teamName = getTeamName(
          player,
          teams,
        ).toUpperCase();

        const isYoung =
          teamName.includes("YOUNG") ||
          teamName.includes("KNIGHT");

        const isAlum =
          teamName.includes("ALUM") ||
          teamName.includes("ALUMN");

        const hasFeatured = playerProps.some(
          (prop) => Boolean(prop.featured),
        );

        const hasStat = playerProps.some((prop) =>
          statMatches(prop.stat_type, statFilter),
        );

        if (!hasStat) {
          return false;
        }

        switch (filter) {
          case "HOT":
            return hasFeatured;

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
  }, [
    groupedPlayers,
    filter,
    statFilter,
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
   * Find current player selection.
   */
  const getPlayerSelection = (
    playerProps: PropWithPlayer[],
  ) => {
    for (const prop of playerProps) {
      const key = `player:${prop.id}`;

      if (picks[key]) {
        return picks[key];
      }
    }

    return undefined;
  };

  /*
   * Find current team selection.
   */
  const getTeamSelection = (
    teamProp: TeamProp,
  ) => {
    return picks[`team:${teamProp.id}`];
  };

  /*
   * Select MORE / LESS for player props.
   */
  const handleSelect = (
    prop: PropWithPlayer,
    side: "more" | "less",
  ) => {
    if (locked || settings?.picks_locked) {
      return;
    }

    const key = `player:${prop.id}`;

    setPicks((current) => {
      const next = { ...current };

      /*
       * Only one prop can be selected per player.
       */
      for (const existingKey of Object.keys(next)) {
        const existing = next[existingKey];

        if (
          existing.kind === "player" &&
          existing.playerId ===
            prop.player?.id &&
          existingKey !== key
        ) {
          delete next[existingKey];
        }
      }

      const currentPick = next[key];

      /*
       * Clicking the currently selected prop/side
       * removes the selection.
       */
      if (
        currentPick?.propId === prop.id &&
        currentPick.side === side
      ) {
        delete next[key];
        return next;
      }

      next[key] = {
        key,
        type: "player",
        prop,
        side,
      };

      return next;
    });

    setConfettiTrigger(
      (value) => value + 1,
    );
  };

  /*
   * Select MORE / LESS for game props.
   */
  const handleSelectTeam = (
    teamProp: TeamProp,
    side: "more" | "less",
  ) => {
    if (locked || settings?.picks_locked) {
      return;
    }

    const key = `team:${teamProp.id}`;

    setPicks((current) => {
      const next = { ...current };
      const currentPick = next[key];

      if (
        currentPick &&
        currentPick.side === side
      ) {
        delete next[key];
        return next;
      }

      next[key] = {
        key,
        type: "team",
        teamProp,
        side,
      };

      return next;
    });

    setConfettiTrigger(
      (value) => value + 1,
    );
  };

  /*
   * Remove a pick from the slip.
   */
  const removeLeg = (key: string) => {
    setPicks((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });
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
    info?: SubmitInfo,
  ) => {
    try {
      const formattedPicks = pickList.map(
        (leg) => ({
          key: leg.key,
          type: leg.type,
          side: leg.side,
          propId: leg.prop?.id ?? null,
          teamPropId:
            leg.teamProp?.id ?? null,
        }),
      );

      const response = await fetch(
        "/api/picks/submit",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            picks: formattedPicks,
            info,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to submit picks",
        );
      }

      setSubmitOpen(false);
      setSubmitted(true);
    } catch (error) {
      console.error(
        "Pick submission failed:",
        error,
      );
    }
  };

  /*
   * Submission confirmation.
   */
  if (submitted) {
    return (
      <main className="min-h-screen bg-ink text-bone">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 py-20">
          <div className="w-full rounded-3xl border border-line bg-panel p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-young-light/40 bg-young/10 text-4xl">
              ✓
            </div>

            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-young-light">
              CARD LOCKED
            </p>

            <h1 className="mt-3 font-head text-4xl font-black uppercase tracking-tight text-bone">
              YOU&apos;RE IN.
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-bone/60">
              Your card has been submitted.
              Every pick has to hit. Good luck.
            </p>

            <div className="mt-8 rounded-2xl border border-line bg-ink/60 p-5">
              <div className="font-mono text-xs uppercase tracking-[0.15em] text-bone/40">
                YOUR PICKS
              </div>

              <div className="mt-2 font-head text-3xl font-black text-bone">
                {pickCount}
              </div>

              <div className="mt-1 text-xs text-bone/40">
                selections locked in
              </div>
            </div>

            <Link
              href="/picks"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-bone px-6 font-head text-sm font-black uppercase tracking-wider text-ink transition hover:scale-[1.02]"
            >
              BACK TO PICKS
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
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1600px] overflow-x-auto px-4 sm:px-6 lg:px-8">
          <div className="no-scrollbar flex min-w-max gap-1 py-3">
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
                      "rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition",
                      active
                        ? "bg-bone text-ink"
                        : "text-bone/40 hover:bg-panel hover:text-bone",
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
            <div className="no-scrollbar flex min-w-max gap-4 py-3">
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
                        "font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition",
                        active
                          ? "text-bone"
                          : "text-bone/30 hover:text-bone/70",
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

            {visibleTeamProps.length ===
            0 ? (
              <div className="rounded-2xl border border-line bg-panel p-8 text-center">
                <p className="font-head text-lg font-bold uppercase text-bone/60">
                  NO GAME PROPS
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleTeamProps.map(
                  (teamProp) => (
                    <TeamPropCard
                      key={teamProp.id}
                      teamProp={teamProp}
                      selection={getTeamSelection(
                        teamProp,
                      )}
                      onSelect={(side) =>
                        handleSelectTeam(
                          teamProp,
                          side,
                        )
                      }
                      locked={locked}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {visiblePlayers.length ===
            0 ? (
              <div className="rounded-2xl border border-line bg-panel p-10 text-center">
                <p className="font-head text-xl font-black uppercase text-bone/60">
                  NOTHING HERE YET
                </p>

                <p className="mt-2 text-sm text-bone/35">
                  Try another category or
                  stat.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {visiblePlayers.map(
                  ({
                    playerId,
                    player,
                    props: playerProps,
                  }) => {
                    const selection =
                      getPlayerSelection(
                        playerProps,
                      );

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
                      <PlayerCard
                        key={playerId}
                        player={player}
                        props={playerProps}
                        primaryPropId={
                          primaryProp?.id
                        }
                        selection={
                          selection
                        }
                        getSelection={(
                          prop,
                        ) =>
                          picks[
                            `player:${prop.id}`
                          ]
                        }
                        onSelect={
                          handleSelect
                        }
                        onOpenProfile={() =>
                          openPlayerProfile(
                            playerProps,
                          )
                        }
                      />
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
          picks={pickList}
          minPicks={minPicks}
          settings={settings}
          locked={locked}
          onRemove={removeLeg}
          onSubmit={handleSubmit}
          confettiTrigger={
            confettiTrigger
          }
        />
      </div>

      {/* MOBILE PICK SLIP */}
      <div className="lg:hidden">
        <PickSlipBar
          picks={pickList}
          minPicks={minPicks}
          settings={settings}
          locked={locked}
          onOpen={() =>
            setMobileSlipOpen(true)
          }
          onSubmit={handleSubmit}
        />

        <PickSlipDrawer
          open={mobileSlipOpen}
          picks={pickList}
          minPicks={minPicks}
          settings={settings}
          locked={locked}
          onClose={() =>
            setMobileSlipOpen(false)
          }
          onRemove={removeLeg}
          onSubmit={handleSubmit}
          confettiTrigger={
            confettiTrigger
          }
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
      {submitOpen && (
        <SubmitModal
          picks={pickList}
          settings={settings}
          onClose={() =>
            setSubmitOpen(false)
          }
          onConfirm={
            handleConfirmSubmit
          }
        />
      )}
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

  const possiblePlayer =
    player as Player & {
      image_url?: string;
      bio_tags?: string[];
    };

  const imageUrl =
    possiblePlayer.image_url;

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
              {teamName ||
                "TEAM"}
            </div>

            <h1 className="max-w-2xl font-head text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">
              {playerName}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-line bg-panel/80 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-bone/45">
                {playerProps.length}{" "}
                PROPS
              </span>

              {selectedProps.length >
                0 && (
                <span className="rounded-full border border-young-light/30 bg-young/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-young-light">
                  {
                    selectedProps.length
                  }{" "}
                  SELECTED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* PLAYER NOTES */}
        {possiblePlayer.bio_tags &&
          possiblePlayer.bio_tags.length >
            0 && (
            <div className="border-b border-line px-5 py-5 sm:px-8">
              <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-bone/25">
                PLAYER NOTES
              </p>

              <div className="flex flex-wrap gap-2">
                {possiblePlayer.bio_tags.map(
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
              {
                selectedProps.length
              }
              /
              {
                playerProps.length
              }
            </div>
          </div>

          <div className="space-y-3">
            {playerProps.map(
              (prop) => {
                const selected =
                  picks[
                    `player:${prop.id}`
                  ];

                const side =
                  selected?.side;

                return (
                  <ProfileProp
                    key={prop.id}
                    prop={prop}
                    selectedSide={
                      side
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
  selectedSide,
  locked,
  onSelect,
}: {
  prop: PropWithPlayer;
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

  return (
    <div
      className={[
        "rounded-2xl border bg-panel p-4 transition sm:p-5",
        selectedSide
          ? "border-bone/40 shadow-[0_0_30px_rgba(255,255,255,0.06)]"
          : "border-line",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-bone/30">
            {statLabel}
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-head text-3xl font-black">
              {prop.line}
            </span>
          </div>
        </div>

        {selectedSide && (
          <div className="rounded-full bg-bone px-3 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-ink">
            {selectedSide}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ProfileSelectButton
          label="MORE"
          active={
            selectedSide ===
            "more"
          }
          disabled={locked}
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
            selectedSide ===
            "less"
          }
          disabled={locked}
          onClick={() =>
            onSelect(
              prop,
              "less",
            )
          }
        />
      </div>

      {locked && (
        <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-bone/25">
          PICKS ARE LOCKED
        </p>
      )}
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
