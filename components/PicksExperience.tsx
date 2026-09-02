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
  PropWithPlayer,
  STAT_LABELS,
  StatType,
  Team,
  TeamProp,
} from "@/lib/types";

type TeamFilter = "all" | string;
type BoardFilter = "all" | "hot" | "game";

export default function PicksExperience({
  teams,
  props,
  teamProps,
  settings,
}: {
  teams: Team[];
  props: PropWithPlayer[];
  teamProps: TeamProp[];
  settings: EventSettings | null;
}) {
  const [teamFilter, setTeamFilter] =
    useState<TeamFilter>("all");

  const [statFilter, setStatFilter] =
    useState<StatType | "all">("all");

  const [boardFilter, setBoardFilter] =
    useState<BoardFilter>("all");

  const [picks, setPicks] =
    useState<Record<string, CardLeg>>({});

  const [slipOpen, setSlipOpen] =
    useState(false);

  const [submitModalOpen, setSubmitModalOpen] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [selectedPlayer, setSelectedPlayer] =
    useState<PropWithPlayer[] | null>(null);

  const [confirmation, setConfirmation] =
    useState<{
      code: string;
      count: number;
      tier: number | null;
      prize: string | null;
    } | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [errorShake, setErrorShake] =
    useState(0);

  const [confettiTrigger, setConfettiTrigger] =
    useState(0);

  const [reachedTiers, setReachedTiers] =
    useState<Set<number>>(new Set());

  const minPicks = settings?.min_picks ?? 3;
  const picksLocked = settings?.picks_locked ?? false;

  /*
   * IMPORTANT:
   * Explicitly type this as CardLeg[].
   * This prevents the old PickSlipItem[] type
   * from being inferred here.
   */
  const pickList: CardLeg[] = Object.values(picks);

  const tierInfo = getTierInfo(
    pickList.length,
    settings
  );

  /*
   * Available stat filters
   */
  const availableStats = useMemo(() => {
    const set = new Set<StatType>();

    props.forEach((p) => {
      set.add(p.stat_type);
    });

    return Array.from(set);
  }, [props]);

  /*
   * Group all props by player.
   *
   * This is what gives us one player card
   * containing multiple props instead of
   * repeating the same player over and over.
   */
  const groupedPlayers = useMemo(() => {
    const map = new Map<
      string,
      PropWithPlayer[]
    >();

    props.forEach((prop) => {
      if (
        teamFilter !== "all" &&
        prop.player.team.slug !== teamFilter
      ) {
        return;
      }

      if (
        boardFilter === "hot" &&
        !prop.featured
      ) {
        return;
      }

      if (
        statFilter !== "all" &&
        prop.stat_type !== statFilter
      ) {
        return;
      }

      const list =
        map.get(prop.player.id) ?? [];

      list.push(prop);

      map.set(
        prop.player.id,
        list
      );
    });

    return Array.from(
      map.values()
    ).sort((a, b) => {
      const aFeatured = a.some(
        (p) => p.featured
      );

      const bFeatured = b.some(
        (p) => p.featured
      );

      if (
        aFeatured !== bFeatured
      ) {
        return aFeatured ? -1 : 1;
      }

      return a[0].player.name.localeCompare(
        b[0].player.name
      );
    });
  }, [
    props,
    teamFilter,
    statFilter,
    boardFilter,
  ]);

  /*
   * Tier celebration
   */
  function maybeTriggerTierCelebration(
    newCount: number
  ) {
    [3, 5, 10].forEach((tier) => {
      if (
        newCount >= tier &&
        !reachedTiers.has(tier)
      ) {
        setReachedTiers(
          (prev) =>
            new Set(prev).add(tier)
        );

        setConfettiTrigger(
          (count) => count + 1
        );
      }
    });
  }

  /*
   * Player prop selection
   */
  function handleSelect(
    prop: PropWithPlayer,
    selection: "over" | "under"
  ) {
    const key = `player:${prop.id}`;

    setPicks((prev) => {
      const existing = prev[key];

      /*
       * Clicking the same selection again
       * removes it.
       */
      if (
        existing?.kind === "player" &&
        existing.selection === selection
      ) {
        const next = {
          ...prev,
        };

        delete next[key];

        return next;
      }

      const next = {
        ...prev,
        [key]: {
          kind: "player" as const,
          propId: prop.id,
          playerId: prop.player.id,
          playerName: prop.player.name,
          teamName: prop.player.team.name,
          statType: prop.stat_type,
          line: prop.line,
          selection,
        },
      };

      maybeTriggerTierCelebration(
        Object.keys(next).length
      );

      return next;
    });
  }

  /*
   * Team/game prop selection
   */
  function handleSelectTeam(
    prop: TeamProp,
    selection: string
  ) {
    const key = `team:${prop.id}`;

    setPicks((prev) => {
      const existing = prev[key];

      if (
        existing?.kind === "team" &&
        existing.selection === selection
      ) {
        const next = {
          ...prev,
        };

        delete next[key];

        return next;
      }

      const next = {
        ...prev,
        [key]: {
          kind: "team" as const,
          teamPropId: prop.id,
          propType: prop.prop_type,
          label:
            prop.prop_type ===
            "winning_team"
              ? "WINNING TEAM"
              : "COMBINED POINTS",
          selection,
          line: prop.line,
        },
      };

      maybeTriggerTierCelebration(
        Object.keys(next).length
      );

      return next;
    });
  }

  /*
   * Remove pick from card
   */
  function removeLeg(key: string) {
    setPicks((prev) => {
      const next = {
        ...prev,
      };

      delete next[key];

      return next;
    });
  }

  /*
   * Find current player selection
   */
  function getPlayerSelection(
    propId: string
  ): "over" | "under" | null {
    const leg =
      picks[`player:${propId}`];

    return leg?.kind === "player"
      ? leg.selection
      : null;
  }

  /*
   * Find current team selection
   */
  function getTeamSelection(
    teamPropId: string
  ): string | null {
    const leg =
      picks[`team:${teamPropId}`];

    return leg?.kind === "team"
      ? leg.selection
      : null;
  }

  /*
   * Display temporary error
   */
  function flashError(
    message: string
  ) {
    setError(message);

    setErrorShake(
      (value) => value + 1
    );

    setTimeout(
      () => setError(null),
      3500
    );
  }

  /*
   * Submit card
   */
  async function handleConfirmSubmit(
    info: SubmitInfo
  ) {
    if (
      pickList.length < minPicks
    ) {
      flashError(
        `You need at least ${minPicks} picks.`
      );

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        "/api/picks/submit",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...info,

            playerPicks:
              pickList
                .filter(
                  (
                    leg
                  ): leg is Extract<
                    CardLeg,
                    {
                      kind: "player";
                    }
                  > =>
                    leg.kind ===
                    "player"
                )
                .map((leg) => ({
                  propId:
                    leg.propId,
                  selection:
                    leg.selection,
                })),

            teamPicks:
              pickList
                .filter(
                  (
                    leg
                  ): leg is Extract<
                    CardLeg,
                    {
                      kind: "team";
                    }
                  > =>
                    leg.kind ===
                    "team"
                )
                .map((leg) => ({
                  teamPropId:
                    leg.teamPropId,
                  selection:
                    leg.selection,
                })),
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Something went wrong."
        );
      }

      setConfirmation({
        code:
          data.submissionCode,
        count:
          pickList.length,
        tier:
          tierInfo.tier,
        prize:
          tierInfo.prize,
      });

      setSubmitModalOpen(false);
      setSlipOpen(false);
      setPicks({});
    } catch (e: any) {
      flashError(
        e.message ||
          "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * Confirmation screen
   */
  if (confirmation) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center text-bone">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-60" />

        <div className="grain-overlay" />

        <div className="relative">
          <p className="font-display text-5xl leading-none">
            CARD
            <br />
            LOCKED
          </p>

          <p className="mt-2 text-2xl">
            🔒
          </p>

          <p className="mt-6 text-bone/60">
            {confirmation.count} PICKS ·
            PERFECT CARD REQUIRED
          </p>

          {confirmation.prize && (
            <p className="mt-1 font-head text-sm font-bold tracking-wide text-young-light">
              PRIZE:{" "}
              {confirmation.prize.toUpperCase()}
            </p>
          )}

          <p className="mt-4 text-bone/60">
            Good luck. 👀
          </p>

          <p className="mt-8 inline-block border border-line bg-panel px-4 py-2 font-mono text-sm tracking-wide text-bone/70">
            #{confirmation.code}
          </p>

          <p className="mt-6 font-mono text-[10px] tracking-[0.15em] text-bone/35">
            FREE TO PLAY · NO ENTRY FEES ·
            NO WAGERING
          </p>

          <Link
            href="/"
            className="mt-10 inline-block bg-bone px-8 py-3 font-head text-sm font-bold tracking-[0.08em] text-ink"
          >
            BACK HOME
          </Link>
        </div>
      </main>
    );
  }

  /*
   * Main board
   */
  return (
    <main className="min-h-[100dvh] bg-ink pb-28 lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/92 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-5 lg:pt-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="font-display text-2xl tracking-tight text-bone sm:text-3xl">
                SCE PICKS
              </span>

              <span className="hidden h-4 w-px bg-lineBright sm:block" />

              <div className="hidden sm:block">
                <p className="font-head text-xs font-bold tracking-[0.12em] text-bone">
                  YOUNGKNIGHTS{" "}
                  <span className="text-bone/30">
                    VS
                  </span>{" "}
                  ALUMKNIGHTS
                </p>

                <p className="font-mono text-[8px] tracking-[0.15em] text-bone/35">
                  OCT 9 · 7 PM · FREE TO PLAY
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setSlipOpen(true)
              }
              className="border border-line bg-panelLight px-3 py-2 font-head text-[11px] font-bold tracking-[0.08em] text-bone transition active:scale-95"
            >
              MY CARD{" "}
              {pickList.length > 0 && (
                <span className="ml-1 text-young-light">
                  {pickList.length}
                </span>
              )}
            </button>
          </div>

          {/* Mobile matchup */}
          <div className="mt-2 flex items-center justify-between sm:hidden">
            <p className="font-head text-[11px] font-bold tracking-[0.1em] text-bone/75">
              YOUNGKNIGHTS{" "}
              <span className="text-bone/25">
                VS
              </span>{" "}
              ALUMKNIGHTS
            </p>

            <p className="font-mono text-[8px] tracking-[0.1em] text-bone/30">
              OCT 9 · 7 PM
            </p>
          </div>

          {/* Board filters */}
          <nav
            className="no-scrollbar -mx-1 mt-3 flex gap-1 overflow-x-auto pb-2"
            aria-label="Board categories"
          >
            <BoardPill
              active={
                boardFilter === "hot"
              }
              onClick={() => {
                setBoardFilter("hot");
                setStatFilter("all");
              }}
              label="🔥 HOT"
            />

            <BoardPill
              active={
                boardFilter === "all"
              }
              onClick={() => {
                setBoardFilter("all");
                setTeamFilter("all");
                setStatFilter("all");
              }}
              label="ALL"
            />

            {teams.map((team) => (
              <BoardPill
                key={team.id}
                active={
                  teamFilter ===
                    team.slug &&
                  boardFilter !==
                    "game"
                }
                onClick={() => {
                  setBoardFilter(
                    "all"
                  );

                  setTeamFilter(
                    team.slug
                  );
                }}
                label={
                  team.slug ===
                  "youngknights"
                    ? "YOUNG"
                    : "ALUM"
                }
                team={
                  team.slug ===
                  "youngknights"
                    ? "young"
                    : "alum"
                }
              />
            ))}

            {teamProps.length > 0 && (
              <BoardPill
                active={
                  boardFilter ===
                  "game"
                }
                onClick={() =>
                  setBoardFilter(
                    "game"
                  )
                }
                label="GAME"
              />
            )}
          </nav>

          {/* Stat filters */}
          <nav
            className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto pb-3"
            aria-label="Stat filters"
          >
            <StatPill
              active={
                statFilter === "all"
              }
              onClick={() =>
                setStatFilter("all")
              }
              label="ALL"
            />

            {availableStats.map(
              (stat) => (
                <StatPill
                  key={stat}
                  active={
                    statFilter ===
                    stat
                  }
                  onClick={() => {
                    setBoardFilter(
                      "all"
                    );

                    setStatFilter(
                      stat
                    );
                  }}
                  label={
                    STAT_LABELS[stat]
                  }
                />
              )
            )}
          </nav>
        </div>
      </header>

      {/* Board content */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:py-6">

        {/* GAME PROPS */}
        {boardFilter === "game" ? (
          <section>
            <BoardTitle
              eyebrow="THE MATCHUP"
              title="GAME PICKS"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {teamProps.map(
                (teamProp) => (
                  <TeamPropCard
                    key={teamProp.id}
                    prop={teamProp}
                    teams={teams}
                    selection={getTeamSelection(
                      teamProp.id
                    )}
                    onSelect={(
                      selection
                    ) =>
                      handleSelectTeam(
                        teamProp,
                        selection
                      )
                    }
                  />
                )
              )}
            </div>
          </section>
        ) : (
          /* PLAYER PROPS */
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold tracking-[0.24em] text-bone/35">
                  CALL YOUR SHOT
                </p>

                <h1 className="font-display text-3xl leading-none text-bone sm:text-4xl">
                  PLAYER PROPS
                </h1>
              </div>

              <p className="font-mono text-[9px] tracking-[0.12em] text-bone/30">
                {groupedPlayers.length}{" "}
                PLAYERS
              </p>
            </div>

            {groupedPlayers.length ===
            0 ? (
              <EmptyState
                hasAnyProps={
                  props.length > 0
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">

                {groupedPlayers.map(
                  (playerProps) => (
                    <PlayerCard
                      key={
                        playerProps[0]
                          .player.id
                      }

                      props={
                        playerProps
                      }

                      primaryPropId={
                        playerProps.find(
                          (prop) =>
                            prop.featured
                        )?.id ??
                        playerProps[0]
                          .id
                      }

                      getSelection={
                        getPlayerSelection
                      }

                      onSelect={
                        handleSelect
                      }

                      onOpenProfile={() =>
                        setSelectedPlayer(
                          props.filter(
                            (prop) =>
                              prop.player
                                .id ===
                              playerProps[0]
                                .player.id
                          )
                        )
                      }
                    />
                  )
                )}

              </div>
            )}
          </section>
        )}
      </div>

      {/* Desktop pick card */}
      <PickSidePanel
        items={pickList}
        onRemove={removeLeg}
        onSubmit={() =>
          setSubmitModalOpen(
            true
          )
        }
        submitting={submitting}
        locked={picksLocked}
        minPicks={minPicks}
        settings={settings}
        confettiTrigger={
          confettiTrigger
        }
      />

      {/* Mobile pick card */}
      <div className="lg:hidden">
        <PickSlipBar
          count={pickList.length}
          onOpen={() =>
            setSlipOpen(true)
          }
        />

        <PickSlipDrawer
          items={pickList}
          open={slipOpen}
          onClose={() =>
            setSlipOpen(false)
          }
          onRemove={removeLeg}
          onSubmit={() =>
            setSubmitModalOpen(
              true
            )
          }
          submitting={submitting}
          locked={picksLocked}
          minPicks={minPicks}
          settings={settings}
          confettiTrigger={
            confettiTrigger
          }
        />
      </div>

      {/* Submit modal */}
      <SubmitModal
        open={submitModalOpen}
        onClose={() =>
          setSubmitModalOpen(
            false
          )
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
        pickCount={
          pickList.length
        }
        tierInfo={tierInfo}
      />

      {/* Player profile */}
      {selectedPlayer && (
        <PlayerProfile
          props={
            selectedPlayer
          }
          getSelection={
            getPlayerSelection
          }
          onSelect={
            handleSelect
          }
          onClose={() =>
            setSelectedPlayer(
              null
            )
          }
        />
      )}

      {/* Error */}
      {error && (
        <div
          key={errorShake}
          className="fixed inset-x-4 bottom-24 z-50 animate-shake border border-bone/10 bg-young px-4 py-3 text-center text-sm font-semibold text-white shadow-glowRed lg:bottom-6"
        >
          {error}
        </div>
      )}
    </main>
  );
}

/*
 * Board category pill
 */
function BoardPill({
  active,
  onClick,
  label,
  team,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  team?: "young" | "alum";
}) {
  const activeClass =
    team === "young"
      ? "border-young bg-young/15 text-young-light"
      : team === "alum"
        ? "border-alum bg-alum/15 text-alum-light"
        : "border-bone bg-bone text-ink";

  return (
    <button
      onClick={onClick}
      className={`shrink-0 border px-3 py-2 font-head text-[10px] font-bold tracking-[0.1em] transition ${
        active
          ? activeClass
          : "border-line bg-panel text-bone/45 hover:text-bone"
      }`}
    >
      {label}
    </button>
  );
}

/*
 * Stat filter pill
 */
function StatPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 border px-2.5 py-1.5 font-mono text-[8px] font-bold tracking-[0.1em] transition ${
        active
          ? "border-bone/45 bg-panelLight text-bone"
          : "border-line text-bone/35 hover:text-bone/60"
      }`}
    >
      {label}
    </button>
  );
}

/*
 * Section title
 */
function BoardTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4">
      <p className="font-mono text-[9px] font-bold tracking-[0.25em] text-bone/35">
        {eyebrow}
      </p>

      <h2 className="font-display text-3xl leading-none text-bone">
        {title}
      </h2>
    </div>
  );
}

/*
 * Empty state
 */
function EmptyState({
  hasAnyProps,
}: {
  hasAnyProps: boolean;
}) {
  return (
    <div className="border border-line bg-panel px-6 py-16 text-center">
      <p className="font-display text-4xl leading-none text-bone">
        GAME DAY
        <br />
        IS COMING.
      </p>

      <p className="mt-3 font-mono text-[9px] tracking-[0.2em] text-bone/35">
        {hasAnyProps
          ? "NO PROPS MATCH THIS FILTER"
          : "PLAYER PROPS DROP SOON"}
      </p>
    </div>
  );
}

/*
 * Player profile modal
 */
function PlayerProfile({
  props,
  getSelection,
  onSelect,
  onClose,
}: {
  props: PropWithPlayer[];

  getSelection: (
    id: string
  ) => "over" | "under" | null;

  onSelect: (
    prop: PropWithPlayer,
    selection: "over" | "under"
  ) => void;

  onClose: () => void;
}) {
  const player =
    props[0].player;

  const isYoung =
    player.team.slug ===
    "youngknights";

  const accent = isYoung
    ? "text-young-light"
    : "text-alum-light";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} profile`}
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close profile"
      />

      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto border-t border-lineBright bg-panel sm:inset-6 sm:bottom-6 sm:mx-auto sm:max-w-2xl sm:border">

        {/* Player image */}
        <div className="relative h-52 overflow-hidden sm:h-64">
          {player.image_url && (
            <img
              src={
                player.image_url
              }
              alt=""
              className="h-full w-full object-cover object-top"
            />
          )}

          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              isYoung
                ? "from-young-dark"
                : "from-alum-dark"
            } via-black/25 to-transparent`}
          />

          <button
            onClick={onClose}
            className="absolute right-3 top-3 border border-white/15 bg-black/50 px-3 py-2 font-mono text-[9px] font-bold text-white backdrop-blur"
          >
            CLOSE ×
          </button>

          <div className="absolute bottom-4 left-4">
            <p className="font-display text-4xl leading-none text-white">
              {player.name}
            </p>

            <p
              className={`mt-1 font-mono text-[9px] font-bold tracking-[0.18em] ${accent}`}
            >
              {player.team.name.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Player information */}
        <div className="p-4 sm:p-6">

          <div className="mb-5">
            <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-bone/35">
              PLAYER RESEARCH
            </p>

            <p className="mt-1 text-sm leading-6 text-bone/55">
              {player.bio_tags?.length
                ? player.bio_tags.join(
                    " · "
                  )
                : "Player notes and scouting information will appear here as they are added."}
            </p>
          </div>

          {/* Props */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-head text-lg font-bold tracking-wide text-bone">
              ALL PROPS
            </h3>

            <span className="font-mono text-[9px] text-bone/30">
              {props.length}{" "}
              AVAILABLE
            </span>
          </div>

          <div className="space-y-2">
            {props.map(
              (prop) => {
                const selection =
                  getSelection(
                    prop.id
                  );

                return (
                  <div
                    key={prop.id}
                    className="border border-line bg-ink2 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">

                      <div>
                        <p className="font-mono text-[9px] font-bold tracking-[0.12em] text-bone/40">
                          {
                            STAT_LABELS[
                              prop.stat_type
                            ]
                          }
                        </p>

                        <p className="font-display text-3xl leading-none text-bone">
                          {prop.line}
                        </p>
                      </div>

                      <div className="grid w-44 grid-cols-2 gap-1.5">

                        <button
                          disabled={
                            prop.locked
                          }
                          onClick={() =>
                            onSelect(
                              prop,
                              "over"
                            )
                          }
                          className={`min-h-10 font-head text-xs font-bold ${
                            selection ===
                            "over"
                              ? `${
                                  isYoung
                                    ? "bg-young"
                                    : "bg-alum"
                                } text-white`
                              : "bg-panelLight text-bone/55"
                          }`}
                        >
                          MORE
                        </button>

                        <button
                          disabled={
                            prop.locked
                          }
                          onClick={() =>
                            onSelect(
                              prop,
                              "under"
                            )
                          }
                          className={`min-h-10 font-head text-xs font-bold ${
                            selection ===
                            "under"
                              ? `${
                                  isYoung
                                    ? "bg-young"
                                    : "bg-alum"
                                } text-white`
                              : "bg-panelLight text-bone/55"
                          }`}
                        >
                          LESS
                        </button>

                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
