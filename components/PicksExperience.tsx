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
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [statFilter, setStatFilter] = useState<StatType | "all">("all");
  const [picks, setPicks] = useState<Record<string, CardLeg>>({});
  const [slipOpen, setSlipOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    code: string;
    count: number;
    tier: number | null;
    prize: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorShake, setErrorShake] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [reachedTiers, setReachedTiers] = useState<Set<number>>(new Set());

  const minPicks = settings?.min_picks ?? 3;
  const picksLocked = settings?.picks_locked ?? false;

  const pickList = Object.values(picks);
  const tierInfo = getTierInfo(pickList.length, settings);

  const featuredProps = props.filter((p) => p.featured);
  const featuredTeamProps = teamProps.filter((t) => t.featured);

  const availableStats = useMemo(() => {
    const set = new Set<StatType>();
    props.forEach((p) => set.add(p.stat_type));
    return Array.from(set);
  }, [props]);

  const filteredProps = props.filter((p) => {
    if (teamFilter !== "all" && p.player.team.slug !== teamFilter) return false;
    if (statFilter !== "all" && p.stat_type !== statFilter) return false;
    return true;
  });

  function maybeTriggerTierCelebration(newCount: number) {
    [3, 5, 10].forEach((t) => {
      if (newCount >= t && !reachedTiers.has(t)) {
        setReachedTiers((prev) => new Set(prev).add(t));
        setConfettiTrigger((c) => c + 1);
      }
    });
  }

  function handleSelect(prop: PropWithPlayer, selection: "over" | "under") {
    const key = `player:${prop.id}`;
    setPicks((prev) => {
      const existing = prev[key];
      if (existing && existing.kind === "player" && existing.selection === selection) {
        const next = { ...prev };
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
      maybeTriggerTierCelebration(Object.keys(next).length);
      return next;
    });
  }

  function handleSelectTeam(prop: TeamProp, selection: string) {
    const key = `team:${prop.id}`;
    setPicks((prev) => {
      const existing = prev[key];
      if (existing && existing.kind === "team" && existing.selection === selection) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const next = {
        ...prev,
        [key]: {
          kind: "team" as const,
          teamPropId: prop.id,
          propType: prop.prop_type,
          label: prop.prop_type === "winning_team" ? "WINNING TEAM" : "COMBINED POINTS",
          selection,
          line: prop.line,
        },
      };
      maybeTriggerTierCelebration(Object.keys(next).length);
      return next;
    });
  }

  function removeLeg(key: string) {
    setPicks((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function getPlayerSelection(propId: string): "over" | "under" | null {
    const leg = picks[`player:${propId}`];
    return leg && leg.kind === "player" ? leg.selection : null;
  }

  function getTeamSelection(teamPropId: string): string | null {
    const leg = picks[`team:${teamPropId}`];
    return leg && leg.kind === "team" ? leg.selection : null;
  }

  function flashError(message: string) {
    setError(message);
    setErrorShake((s) => s + 1);
    setTimeout(() => setError(null), 3500);
  }

  async function handleConfirmSubmit(info: SubmitInfo) {
    if (pickList.length < minPicks) {
      flashError(`You need at least ${minPicks} picks.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/picks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...info,
          playerPicks: pickList
            .filter((l): l is Extract<CardLeg, { kind: "player" }> => l.kind === "player")
            .map((l) => ({ propId: l.propId, selection: l.selection })),
          teamPicks: pickList
            .filter((l): l is Extract<CardLeg, { kind: "team" }> => l.kind === "team")
            .map((l) => ({ teamPropId: l.teamPropId, selection: l.selection })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setConfirmation({
        code: data.submissionCode,
        count: pickList.length,
        tier: tierInfo.tier,
        prize: tierInfo.prize,
      });
      setSubmitModalOpen(false);
      setSlipOpen(false);
      setPicks({});
    } catch (e: any) {
      flashError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-60" />
        <div className="grain-overlay" />
        <div className="relative">
          <p className="font-display text-5xl leading-none tracking-tight text-bone">
            CARD
            <br />
            LOCKED
          </p>
          <p className="mt-2 text-2xl">&#128274;</p>
          <p className="mt-6 text-bone/60">
            {confirmation.count} PICKS &middot; PERFECT CARD REQUIRED
          </p>
          {confirmation.prize && (
            <p className="mt-1 font-head text-sm font-bold tracking-wide text-young-light">
              PRIZE ON THE LINE: {confirmation.prize.toUpperCase()}
            </p>
          )}
          <p className="mt-4 text-bone/60">Good luck. &#128064;</p>
          <p className="mt-8 inline-block rounded-lg border border-line bg-panel px-4 py-2 font-mono text-sm tracking-wide text-bone/70">
            #{confirmation.code}
          </p>
          <p className="mt-6 font-mono text-[10px] tracking-[0.15em] text-bone/35">
            FREE TO PLAY &middot; NO ENTRY FEES &middot; NO WAGERING
          </p>
          <div>
            <Link
              href="/"
              className="mt-10 inline-block rounded-xl bg-bone px-8 py-3 font-head text-sm font-bold tracking-[0.08em] text-ink"
            >
              BACK HOME
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-ink pb-28 lg:pb-10">
      <div className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 pt-5 lg:mx-auto lg:max-w-6xl">
          <span className="font-head text-sm font-bold tracking-[0.2em] text-bone">
            SCE PICKS
          </span>
          <button
            onClick={() => setSlipOpen(true)}
            className="font-mono text-[10px] font-semibold tracking-[0.15em] text-bone/40 lg:hidden"
          >
            MY CARD {pickList.length > 0 && `(${pickList.length})`}
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 px-5 pb-3 pt-3">
          <span className="font-display text-xl leading-none text-young-light sm:text-2xl">
            YOUNGKNIGHTS
          </span>
          <span className="font-mono text-[10px] font-bold text-bone/30">
            VS
          </span>
          <span className="font-display text-xl leading-none text-alum-light sm:text-2xl">
            ALUMKNIGHTS
          </span>
        </div>
        <p className="pb-3 text-center font-mono text-[9px] tracking-[0.15em] text-bone/30">
          FREE TO PLAY &middot; NO WAGERING &middot; EVERY PICK HAS TO HIT
        </p>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3 lg:mx-auto lg:max-w-6xl">
          <TeamPill
            active={teamFilter === "all"}
            onClick={() => setTeamFilter("all")}
            label="ALL"
          />
          {teams.map((t) => (
            <TeamPill
              key={t.id}
              active={teamFilter === t.slug}
              onClick={() => setTeamFilter(t.slug)}
              label={t.name.toUpperCase()}
              team={t.slug === "youngknights" ? "young" : "alum"}
            />
          ))}
        </div>

        {availableStats.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3 lg:mx-auto lg:max-w-6xl">
            <StatPill
              active={statFilter === "all"}
              onClick={() => setStatFilter("all")}
              label="ALL STATS"
            />
            {availableStats.map((s) => (
              <StatPill
                key={s}
                active={statFilter === s}
                onClick={() => setStatFilter(s)}
                label={STAT_LABELS[s]}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-5 lg:mx-auto lg:flex lg:max-w-6xl lg:items-start lg:gap-6 lg:px-5">
        <div className="space-y-8 lg:flex-1">
          {/* FEATURED */}
          {(featuredProps.length > 0 || featuredTeamProps.length > 0) && (
            <section>
              <SectionHeader eyebrow="DON'T MISS" title="FEATURED PROPS" />
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {featuredTeamProps.map((tp) => (
                  <div key={tp.id} className="w-64 shrink-0">
                    <TeamPropCard
                      prop={tp}
                      teams={teams}
                      selection={getTeamSelection(tp.id)}
                      onSelect={(sel) => handleSelectTeam(tp, sel)}
                    />
                  </div>
                ))}
                {featuredProps.map((prop) => (
                  <div key={prop.id} className="w-64 shrink-0">
                    <PlayerCard
                      prop={prop}
                      selection={getPlayerSelection(prop.id)}
                      onSelect={(sel) => handleSelect(prop, sel)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* GAME PROPS */}
          {teamProps.length > 0 && (
            <section>
              <SectionHeader eyebrow="THE GAME" title="GAME PROPS" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {teamProps.map((tp) => (
                  <TeamPropCard
                    key={tp.id}
                    prop={tp}
                    teams={teams}
                    selection={getTeamSelection(tp.id)}
                    onSelect={(sel) => handleSelectTeam(tp, sel)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* BROWSE PLAYERS */}
          <section>
            <SectionHeader eyebrow="ALL PLAYERS" title="BROWSE PLAYERS" />
            <div className="space-y-3 transition-opacity duration-200">
              {filteredProps.length === 0 ? (
                <EmptyState hasAnyProps={props.length > 0} />
              ) : (
                filteredProps.map((prop) => (
                  <PlayerCard
                    key={prop.id}
                    prop={prop}
                    selection={getPlayerSelection(prop.id)}
                    onSelect={(sel) => handleSelect(prop, sel)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <PickSidePanel
          items={pickList}
          onRemove={removeLeg}
          onSubmit={() => setSubmitModalOpen(true)}
          submitting={submitting}
          locked={picksLocked}
          minPicks={minPicks}
          settings={settings}
          confettiTrigger={confettiTrigger}
        />
      </div>

      <div className="lg:hidden">
        <PickSlipBar count={pickList.length} onOpen={() => setSlipOpen(true)} />
        <PickSlipDrawer
          items={pickList}
          open={slipOpen}
          onClose={() => setSlipOpen(false)}
          onRemove={removeLeg}
          onSubmit={() => setSubmitModalOpen(true)}
          submitting={submitting}
          locked={picksLocked}
          minPicks={minPicks}
          settings={settings}
          confettiTrigger={confettiTrigger}
        />
      </div>

      <SubmitModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        submitting={submitting}
        emailRequired={settings?.email_required ?? true}
        instagramRequired={settings?.instagram_required ?? true}
        pickCount={pickList.length}
        tierInfo={tierInfo}
      />

      {error && (
        <div
          key={errorShake}
          className="fixed inset-x-4 bottom-24 z-50 animate-shake rounded-lg bg-young px-4 py-3 text-center text-sm font-semibold text-white shadow-glowRed lg:bottom-6"
        >
          {error}
        </div>
      )}
    </main>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3">
      <p className="font-mono text-[10px] font-semibold tracking-[0.3em] text-bone/35">
        {eyebrow}
      </p>
      <h2 className="font-head text-xl font-bold tracking-wide text-bone">
        {title}
      </h2>
    </div>
  );
}

function TeamPill({
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
  const activeClasses =
    team === "young"
      ? "border-young bg-young/15 text-young-light shadow-glowRed"
      : team === "alum"
      ? "border-alum bg-alum/15 text-alum-light shadow-glowBlue"
      : "border-bone bg-bone text-ink";

  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-2 font-head text-xs font-bold tracking-[0.06em] transition ${
        active ? activeClasses : "border-line text-bone/50 active:border-lineBright"
      }`}
    >
      {label}
    </button>
  );
}

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
      className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] transition ${
        active
          ? "border-bone/60 bg-panelLight text-bone"
          : "border-line text-bone/40 active:border-lineBright"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ hasAnyProps }: { hasAnyProps: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel px-6 py-16 text-center">
      <div className="grain-overlay opacity-40" />
      <p className="relative font-display text-3xl leading-tight text-bone">
        GAME DAY
        <br />
        IS COMING.
      </p>
      <p className="relative mt-3 font-mono text-xs tracking-[0.2em] text-bone/40">
        {hasAnyProps
          ? "NO PROPS MATCH THIS FILTER"
          : "PLAYER PROPS DROP SOON"}
      </p>
      <div className="relative mt-8 flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 w-20 animate-pulseGlow rounded-xl border border-line bg-panelLight"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}
