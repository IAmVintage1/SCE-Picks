"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PlayerCard from "@/components/PlayerCard";
import TeamPropCard from "@/components/TeamPropCard";
import PickSlip from "@/components/PickSlip";
import PickSidePanel from "@/components/PickSidePanel";
import SubmitModal from "@/components/SubmitModal";

import { getTierInfo } from "@/lib/cardTiers";
import {
  EventSettings,
  Player,
  PropWithPlayer,
  Selection,
  StatType,
  TeamProp,
} from "@/lib/types";

type BoardFilter = "HOT" | "ALL" | "YOUNG" | "ALUM" | "GAME";

type CardLeg = {
  key: string;
  type: "player" | "team";
  propId: string;
  selection: Selection;
  player?: Player;
  prop?: PropWithPlayer;
  teamProp?: TeamProp;
};

type PicksExperienceProps = {
  players: Player[];
  props: PropWithPlayer[];
  teamProps: TeamProp[];
  settings: EventSettings | null;
};

const STAT_LABELS: Record<string, string> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
  steals: "STL",
  blocks: "BLK",
  threes: "3PT",
  pts_reb: "PTS+REB",
  pts_ast: "PTS+AST",
  reb_blk: "REB+BLK",
  pra: "PRA",
};

const STAT_FILTERS: {
  value: StatType | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "ALL STATS" },
  { value: "points", label: "PTS" },
  { value: "rebounds", label: "REB" },
  { value: "assists", label: "AST" },
  { value: "steals", label: "STL" },
  { value: "blocks", label: "BLK" },
  { value: "threes", label: "3PT" },
  { value: "pts_reb", label: "PTS+REB" },
  { value: "pts_ast", label: "PTS+AST" },
  { value: "reb_blk", label: "REB+BLK" },
  { value: "pra", label: "PRA" },
];

export default function PicksExperience({
  players,
  props,
  teamProps,
  settings,
}: PicksExperienceProps) {
  const [teamFilter, setTeamFilter] = useState<
    "ALL" | "YOUNG" | "ALUM"
  >("ALL");

  const [statFilter, setStatFilter] = useState<
    StatType | "ALL"
  >("ALL");

  const [boardFilter, setBoardFilter] =
    useState<BoardFilter>("HOT");

  const [picks, setPicks] = useState<Record<string, CardLeg>>(
    {}
  );

  const [slipOpen, setSlipOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState<
    PropWithPlayer[] | null
  >(null);

  const [confirmation, setConfirmation] = useState<{
    code: string;
    picks: CardLeg[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [reachedTiers, setReachedTiers] = useState<number[]>(
    []
  );

  const minPicks = settings?.min_picks ?? 3;
  const picksLocked = settings?.picks_locked ?? false;

  const pickList: CardLeg[] = Object.values(picks);

  /*
   * Lock background scrolling while the player profile is open.
   */
  useEffect(() => {
    if (!selectedPlayer) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPlayer(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlayer]);

  /*
   * Featured / hot props.
   */
  const hotPropIds = useMemo(() => {
    return new Set(
      props
        .filter((prop) => prop.is_featured)
        .map((prop) => prop.id)
    );
  }, [props]);

  /*
   * Group all props by player.
   */
  const groupedPlayers = useMemo(() => {
    const playerMap = new Map<
      string,
      {
        player: Player;
        props: PropWithPlayer[];
      }
    >();

    for (const prop of props) {
      if (!prop.player) continue;

      const playerId = prop.player.id;

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          player: prop.player,
          props: [],
        });
      }

      playerMap.get(playerId)!.props.push(prop);
    }

    return Array.from(playerMap.values());
  }, [props]);

  /*
   * Filter player cards.
   */
  const filteredPlayers = useMemo(() => {
    return groupedPlayers.filter(
      ({ player, props: playerProps }) => {
        const teamName =
          player.team_name?.toLowerCase() ??
          player.team?.toLowerCase() ??
          "";

        const isYoung = teamName.includes("young");
        const isAlum = teamName.includes("alum");

        if (teamFilter === "YOUNG" && !isYoung) {
          return false;
        }

        if (teamFilter === "ALUM" && !isAlum) {
          return false;
        }

        if (boardFilter === "YOUNG" && !isYoung) {
          return false;
        }

        if (boardFilter === "ALUM" && !isAlum) {
          return false;
        }

        if (boardFilter === "HOT") {
          const hasHotProp = playerProps.some((prop) =>
            hotPropIds.has(prop.id)
          );

          if (!hasHotProp) return false;
        }

        if (statFilter !== "ALL") {
          const hasStat = playerProps.some(
            (prop) => prop.stat_type === statFilter
          );

          if (!hasStat) return false;
        }

        return true;
      }
    );
  }, [
    groupedPlayers,
    teamFilter,
    statFilter,
    boardFilter,
    hotPropIds,
  ]);

  /*
   * GAME props.
   */
  const filteredTeamProps = useMemo(() => {
    if (boardFilter !== "GAME") return [];

    return teamProps.filter(
      (prop) => prop.is_active !== false
    );
  }, [boardFilter, teamProps]);

  /*
   * Trigger tier celebration when hitting 3 / 5 / 10.
   */
  const maybeTriggerTierCelebration = (
    newCount: number
  ) => {
    const celebrationTiers = [3, 5, 10];

    for (const tier of celebrationTiers) {
      if (
        newCount >= tier &&
        !reachedTiers.includes(tier)
      ) {
        setReachedTiers((current) => [
          ...current,
          tier,
        ]);

        setConfettiTrigger((current) => current + 1);
      }
    }
  };

  /*
   * Select a player prop.
   */
  const handleSelect = (
    prop: PropWithPlayer,
    selection: Selection
  ) => {
    if (picksLocked) return;

    const key = `player:${prop.id}`;

    setError(null);

    setPicks((current) => {
      const next = { ...current };

      if (next[key]?.selection === selection) {
        delete next[key];
      } else {
        next[key] = {
          key,
          type: "player",
          propId: prop.id,
          selection,
          player: prop.player,
          prop,
        };
      }

      maybeTriggerTierCelebration(
        Object.keys(next).length
      );

      return next;
    });
  };

  /*
   * Select a team prop.
   */
  const handleSelectTeam = (
    prop: TeamProp,
    selection: Selection
  ) => {
    if (picksLocked) return;

    const key = `team:${prop.id}`;

    setError(null);

    setPicks((current) => {
      const next = { ...current };

      if (next[key]?.selection === selection) {
        delete next[key];
      } else {
        next[key] = {
          key,
          type: "team",
          propId: prop.id,
          selection,
          teamProp: prop,
        };
      }

      maybeTriggerTierCelebration(
        Object.keys(next).length
      );

      return next;
    });
  };

  /*
   * Remove a pick from MY CARD.
   */
  const removeLeg = (key: string) => {
    setPicks((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  /*
   * Current player prop selection.
   */
  const getPlayerSelection = (
    propId: string
  ): Selection | null => {
    return picks[`player:${propId}`]?.selection ?? null;
  };

  /*
   * Current team prop selection.
   */
  const getTeamSelection = (
    propId: string
  ): Selection | null => {
    return picks[`team:${propId}`]?.selection ?? null;
  };

  /*
   * Open player profile.
   */
  const openPlayerProfile = (
    playerProps: PropWithPlayer[]
  ) => {
    if (!playerProps.length) return;

    setSelectedPlayer(playerProps);
  };

  /*
   * Submit card.
   */
  const handleSubmit = async () => {
    if (pickList.length < minPicks) {
      setError(
        `You need at least ${minPicks} picks to play.`
      );

      setErrorShake(true);

      window.setTimeout(() => {
        setErrorShake(false);
      }, 500);

      return;
    }

    if (picksLocked) {
      setError("Picks are locked.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/picks/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            picks: pickList.map((pick) => ({
              type: pick.type,
              propId: pick.propId,
              selection: pick.selection,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to submit your card."
        );
      }

      setSubmitModalOpen(false);

      setConfirmation({
        code: data.code,
        picks: pickList,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Confirmation screen.
   */
  if (confirmation) {
    return (
      <main className="min-h-screen bg-ink px-4 py-8 text-bone sm:px-6">
        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
          <section className="w-full rounded-3xl border border-line bg-card p-6 text-center shadow-2xl sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-young/50 bg-young/10 text-3xl">
              ✓
            </div>

            <p className="font-head text-xs font-black tracking-[0.2em] text-young-light">
              CARD SUBMITTED
            </p>

            <h1 className="mt-3 font-head text-4xl font-black tracking-tight">
              GOOD LUCK.
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-bone/55">
              Your picks are locked in. Save your card
              code so you can reference your entry later.
            </p>

            <div className="mt-8 rounded-2xl border border-line bg-ink/60 p-5">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-bone/35">
                YOUR CARD CODE
              </p>

              <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] text-bone">
                {confirmation.code}
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/picks"
                className="block rounded-xl bg-bone px-5 py-3 font-head text-sm font-black text-ink transition-transform hover:scale-[1.01]"
              >
                BACK TO PICKS
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink text-bone">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
          <div className="flex min-h-[72px] items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-head text-xl font-black tracking-tight">
                SCE PICKS
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-bone/40">
                  YOUNGKNIGHTS
                </span>

                <span className="text-bone/20">×</span>

                <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-bone/40">
                  ALUMKNIGHTS
                </span>

                <span className="hidden text-bone/15 sm:inline">
                  •
                </span>

                <span className="hidden font-mono text-[9px] font-bold tracking-[0.16em] text-bone/35 sm:inline">
                  OCT 9 · 7 PM
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSlipOpen(true)}
              className="shrink-0 rounded-xl border border-line bg-card px-4 py-2.5 font-head text-xs font-black tracking-wide transition hover:border-bone/30 hover:bg-card/80"
            >
              MY CARD

              {pickList.length > 0 && (
                <span className="ml-2 rounded-full bg-young px-2 py-0.5 text-[10px] text-bone">
                  {pickList.length}
                </span>
              )}
            </button>
          </div>

          {/* BOARD FILTERS */}
          <div className="no-scrollbar -mx-4 flex overflow-x-auto border-t border-line sm:-mx-6">
            {(
              [
                ["HOT", "HOT"],
                ["ALL", "ALL"],
                ["YOUNG", "YOUNGKNIGHTS"],
                ["ALUM", "ALUMKNIGHTS"],
                ["GAME", "GAME"],
              ] as [BoardFilter, string][]
            ).map(([value, label]) => {
              const active =
                boardFilter === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setBoardFilter(value);

                    if (value === "YOUNG") {
                      setTeamFilter("YOUNG");
                    } else if (value === "ALUM") {
                      setTeamFilter("ALUM");
                    } else if (
                      value === "ALL" ||
                      value === "HOT"
                    ) {
                      setTeamFilter("ALL");
                    }
                  }}
                  className={`shrink-0 border-r border-line px-5 py-3 font-mono text-[10px] font-bold tracking-[0.14em] transition ${
                    active
                      ? "bg-bone text-ink"
                      : "text-bone/40 hover:bg-card hover:text-bone"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* STAT FILTERS */}
          {boardFilter !== "GAME" && (
            <div className="no-scrollbar -mx-4 flex overflow-x-auto py-2 sm:-mx-6">
              {STAT_FILTERS.map((filter) => {
                const active =
                  statFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setStatFilter(filter.value)
                    }
                    className={`mr-2 shrink-0 rounded-full border px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em] transition ${
                      active
                        ? "border-bone bg-bone text-ink"
                        : "border-line text-bone/35 hover:border-bone/30 hover:text-bone"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div
          className={`mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 ${
            errorShake ? "animate-shake" : ""
          }`}
        >
          <div className="rounded-xl border border-young/30 bg-young/10 px-4 py-3 text-sm text-young-light">
            {error}
          </div>
        </div>
      )}

      {/* BOARD */}
      <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        {boardFilter === "GAME" ? (
          <div>
            <div className="mb-5">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-bone/35">
                GAME PROPS
              </p>

              <h2 className="mt-1 font-head text-2xl font-black">
                CALL THE GAME.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeamProps.map((teamProp) => (
                <TeamPropCard
                  key={teamProp.id}
                  prop={teamProp}
                  selection={getTeamSelection(
                    teamProp.id
                  )}
                  onSelect={(selection) =>
                    handleSelectTeam(
                      teamProp,
                      selection
                    )
                  }
                  locked={picksLocked}
                />
              ))}
            </div>

            {filteredTeamProps.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line p-10 text-center">
                <p className="font-head text-lg font-bold text-bone/50">
                  NO GAME PROPS AVAILABLE
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-bone/35">
                  {boardFilter === "HOT"
                    ? "FEATURED PICKS"
                    : boardFilter === "YOUNG"
                    ? "YOUNGKNIGHTS"
                    : boardFilter === "ALUM"
                    ? "ALUMKNIGHTS"
                    : "ALL PLAYERS"}
                </p>

                <h2 className="mt-1 font-head text-2xl font-black sm:text-3xl">
                  MAKE YOUR CALL.
                </h2>
              </div>

              <p className="shrink-0 font-mono text-[9px] font-bold tracking-[0.12em] text-bone/25">
                {filteredPlayers.length} PLAYERS
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlayers.map(
                ({
                  player,
                  props: playerProps,
                }) => {
                  const primary =
                    playerProps.find((prop) =>
                      hotPropIds.has(prop.id)
                    ) ?? playerProps[0];

                  if (!primary) return null;

                  return (
                    <PlayerCard
                      key={player.id}
                      props={playerProps}
                      primaryPropId={primary.id}
                      getSelection={
                        getPlayerSelection
                      }
                      onSelect={handleSelect}
                      onOpenProfile={() =>
                        openPlayerProfile(
                          playerProps
                        )
                      }
                    />
                  );
                }
              )}
            </div>

            {filteredPlayers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line p-10 text-center">
                <p className="font-head text-lg font-bold text-bone/50">
                  NO PICKS FOUND
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setBoardFilter("ALL");
                    setTeamFilter("ALL");
                    setStatFilter("ALL");
                  }}
                  className="mt-3 font-mono text-[10px] font-bold tracking-[0.12em] text-young-light"
                >
                  CLEAR FILTERS →
                </button>
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
          locked={picksLocked}
          onRemove={removeLeg}
          onSubmit={() =>
            setSubmitModalOpen(true)
          }
          confettiTrigger={confettiTrigger}
        />
      </div>

      {/* MOBILE PICK SLIP */}
      <div className="lg:hidden">
        <PickSlip
          picks={pickList}
          minPicks={minPicks}
          settings={settings}
          locked={picksLocked}
          open={slipOpen}
          onOpen={() => setSlipOpen(true)}
          onClose={() => setSlipOpen(false)}
          onRemove={removeLeg}
          onSubmit={() =>
            setSubmitModalOpen(true)
          }
          confettiTrigger={confettiTrigger}
        />
      </div>

      {/* SUBMIT MODAL */}
      <SubmitModal
        open={submitModalOpen}
        picks={pickList}
        minPicks={minPicks}
        settings={settings}
        submitting={submitting}
        onClose={() =>
          setSubmitModalOpen(false)
        }
        onSubmit={handleSubmit}
      />

      {/* PLAYER PROFILE */}
      {selectedPlayer && (
        <PlayerProfile
          props={selectedPlayer}
          locked={picksLocked}
          getSelection={getPlayerSelection}
          onSelect={handleSelect}
          onClose={() =>
            setSelectedPlayer(null)
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
  props,
  locked,
  getSelection,
  onSelect,
  onClose,
}: {
  props: PropWithPlayer[];
  locked: boolean;
  getSelection: (
    propId: string
  ) => Selection | null;
  onSelect: (
    prop: PropWithPlayer,
    selection: Selection
  ) => void;
  onClose: () => void;
}) {
  const player = props[0]?.player;

  if (!player) return null;

  const selectedProps = props.filter(
    (prop) => getSelection(prop.id) !== null
  );

  const primaryProp =
    props.find((prop) => prop.is_featured) ??
    props[0];

  const teamName =
    player.team_name?.toLowerCase() ??
    player.team?.toLowerCase() ??
    "";

  const isYoung = teamName.includes("young");

  const teamLabel = isYoung
    ? "YOUNGKNIGHTS"
    : "ALUMKNIGHTS";

  const firstName =
    player.name?.split(" ")[0] ?? "";

  const lastName =
    player.name
      ?.split(" ")
      .slice(1)
      .join(" ") ?? "";

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} player profile`}
    >
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-2 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-bone/45 transition hover:bg-card hover:text-bone"
          >
            <span className="text-lg leading-none">
              ←
            </span>
            BACK
          </button>

          <div className="font-mono text-[9px] font-bold tracking-[0.18em] text-bone/25">
            PLAYER PROFILE
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close player profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-bone/50 transition hover:border-bone/30 hover:text-bone"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6 sm:pt-8">
        {/* HERO */}
        <section
          className={`relative overflow-hidden rounded-3xl border ${
            isYoung
              ? "border-young/30"
              : "border-alum/30"
          } bg-card`}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${
              isYoung
                ? "bg-[radial-gradient(circle_at_25%_20%,rgba(226,52,40,0.28),transparent_45%)]"
                : "bg-[radial-gradient(circle_at_25%_20%,rgba(73,87,170,0.28),transparent_45%)]"
            }`}
          />

          <div className="relative grid min-h-[300px] md:grid-cols-[0.85fr_1.15fr]">
            {/* PLAYER PHOTO */}
            <div className="relative min-h-[280px] overflow-hidden md:min-h-[380px]">
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent md:bg-gradient-to-r" />

              {player.image_url ? (
                <img
                  src={player.image_url}
                  alt={player.name}
                  className="absolute inset-0 h-full w-full object-contain object-center p-4 transition-transform duration-700 md:p-6"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border border-line bg-ink/40 font-head text-5xl font-black text-bone/20">
                    {player.name?.charAt(0) ??
                      "?"}
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 font-mono text-[9px] font-black tracking-[0.14em] ${
                    isYoung
                      ? "border-young/40 bg-young/20 text-young-light"
                      : "border-alum/40 bg-alum/20 text-alum-light"
                  }`}
                >
                  {teamLabel}
                </span>
              </div>
            </div>

            {/* PLAYER INFO */}
            <div className="relative flex flex-col justify-end p-5 sm:p-7 md:p-9">
              <div className="mb-auto">
                <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-bone/30">
                  {props.length} AVAILABLE PROP
                  {props.length === 1
                    ? ""
                    : "S"}
                </p>
              </div>

              <div>
                <h1 className="font-head text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
                  {firstName}

                  {lastName && (
                    <>
                      <br />
                      <span className="text-bone/55">
                        {lastName}
                      </span>
                    </>
                  )}
                </h1>

                {player.bio_tags &&
                  player.bio_tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {player.bio_tags.map(
                        (tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-line bg-ink/50 px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.08em] text-bone/50"
                          >
                            {tag}
                          </span>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </section>

        {/* CARD STATUS */}
        <section className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-bone/30">
                YOUR CARD
              </p>

              <p className="mt-1 font-head text-lg font-black">
                {selectedProps.length === 0
                  ? "NO PICKS FROM THIS PLAYER"
                  : `${selectedProps.length} PICK${
                      selectedProps.length === 1
                        ? ""
                        : "S"
                    } SELECTED`}
              </p>
            </div>

            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-black ${
                selectedProps.length > 0
                  ? "border-young/40 bg-young/10 text-young-light"
                  : "border-line text-bone/25"
              }`}
            >
              {selectedProps.length}
            </div>
          </div>
        </section>

        {/* FEATURED PROP */}
        {primaryProp && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-bone/30">
                  FEATURED BET
                </p>

                <h2 className="mt-1 font-head text-xl font-black">
                  MAKE YOUR CALL
                </h2>
              </div>

              {primaryProp.is_featured && (
                <span className="rounded-full border border-young/30 bg-young/10 px-2.5 py-1 font-mono text-[8px] font-black tracking-[0.12em] text-young-light">
                  HOT
                </span>
              )}
            </div>

            <ProfileProp
              prop={primaryProp}
              selection={getSelection(
                primaryProp.id
              )}
              locked={locked}
              featured
              onSelect={(selection) =>
                onSelect(
                  primaryProp,
                  selection
                )
              }
            />
          </section>
        )}

        {/* ALL PROPS */}
        <section className="mt-8">
          <div className="mb-3">
            <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-bone/30">
              FULL PROP BOARD
            </p>

            <h2 className="mt-1 font-head text-xl font-black">
              ALL {player.name?.toUpperCase()} PROPS
            </h2>
          </div>

          <div className="space-y-3">
            {props.map((prop) => (
              <ProfileProp
                key={prop.id}
                prop={prop}
                selection={getSelection(prop.id)}
                locked={locked}
                featured={
                  prop.id === primaryProp?.id
                }
                onSelect={(selection) =>
                  onSelect(prop, selection)
                }
              />
            ))}
          </div>
        </section>

        {/* PROFILE FOOTER */}
        <div className="mt-8 rounded-2xl border border-line bg-card p-4 text-center sm:p-5">
          <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-bone/30">
            EVERY PICK HAS TO HIT
          </p>

          <p className="mt-2 text-xs leading-5 text-bone/40">
            Choose More or Less on any prop above.
            Your selections are added directly to MY
            CARD.
          </p>
        </div>
      </div>

      {/* MOBILE STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-ink/95 p-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] font-bold tracking-[0.12em] text-bone/30">
              {selectedProps.length === 0
                ? "NO PLAYER PICKS"
                : `${selectedProps.length} PLAYER PICK${
                    selectedProps.length === 1
                      ? ""
                      : "S"
                  }`}
            </p>

            <p className="truncate font-head text-sm font-black">
              {locked
                ? "PICKS ARE LOCKED"
                : "YOUR PICKS UPDATE LIVE"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-bone px-5 py-3 font-head text-xs font-black text-ink transition hover:scale-[1.01]"
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
  selection,
  locked,
  featured = false,
  onSelect,
}: {
  prop: PropWithPlayer;
  selection: Selection | null;
  locked: boolean;
  featured?: boolean;
  onSelect: (selection: Selection) => void;
}) {
  const statLabel =
    STAT_LABELS[prop.stat_type] ??
    prop.stat_type
      ?.replaceAll("_", " ")
      .toUpperCase();

  const isPicked = selection !== null;

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        isPicked
          ? "border-young/50 bg-young/[0.06] shadow-[0_0_30px_rgba(226,52,40,0.08)]"
          : featured
          ? "border-bone/15 bg-card"
          : "border-line bg-card"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] font-black tracking-[0.16em] text-bone/35">
                {statLabel}
              </span>

              {featured && (
                <span className="rounded-full bg-young/10 px-2 py-0.5 font-mono text-[7px] font-black tracking-[0.12em] text-young-light">
                  FEATURED
                </span>
              )}

              {isPicked && (
                <span className="animate-pop rounded-full bg-young px-2 py-0.5 font-mono text-[7px] font-black tracking-[0.12em] text-bone">
                  ✓ PICKED
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-head text-3xl font-black tracking-tight">
                {prop.line}
              </span>

              <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-bone/30">
                LINE
              </span>
            </div>
          </div>

          {isPicked && (
            <div className="shrink-0 rounded-lg border border-young/30 bg-young/10 px-2.5 py-2 text-center">
              <p className="font-mono text-[7px] font-bold tracking-[0.12em] text-bone/35">
                YOUR PICK
              </p>

              <p className="mt-0.5 font-head text-xs font-black text-young-light">
                {selection === "more"
                  ? "MORE"
                  : "LESS"}
              </p>
            </div>
          )}
        </div>

        {/* MORE / LESS */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ProfileSelectButton
            label="MORE"
            active={selection === "more"}
            disabled={locked}
            onClick={() =>
              onSelect("more")
            }
          />

          <ProfileSelectButton
            label="LESS"
            active={selection === "less"}
            disabled={locked}
            onClick={() =>
              onSelect("less")
            }
          />
        </div>

        {locked && (
          <p className="mt-3 text-center font-mono text-[8px] font-bold tracking-[0.12em] text-bone/25">
            PICKS ARE LOCKED 🔒
          </p>
        )}
      </div>
    </article>
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
  label: "MORE" | "LESS";
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border px-4 py-3 font-head text-xs font-black tracking-wide transition-all duration-200 ${
        active
          ? "border-young bg-young text-bone shadow-[0_0_20px_rgba(226,52,40,0.18)]"
          : "border-line bg-ink/50 text-bone/55 hover:border-bone/25 hover:bg-bone/[0.04] hover:text-bone"
      } ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "active:scale-[0.97]"
      }`}
    >
      {active && (
        <span className="mr-1.5">✓</span>
      )}

      {label}
    </button>
  );
}
