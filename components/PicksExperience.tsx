"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PlayerCard from "@/components/PlayerCard";
import { PickSlipBar, PickSlipDrawer } from "@/components/PickSlip";
import PickSidePanel from "@/components/PickSidePanel";
import SubmitModal, { SubmitInfo } from "@/components/SubmitModal";
import {
  EventSettings,
  PickSlipItem,
  PropWithPlayer,
  STAT_LABELS,
  StatType,
  Team,
} from "@/lib/types";

type TeamFilter = "all" | string;

export default function PicksExperience({
  teams,
  props,
  settings,
}: {
  teams: Team[];
  props: PropWithPlayer[];
  settings: EventSettings | null;
}) {
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [statFilter, setStatFilter] = useState<StatType | "all">("all");
  const [picks, setPicks] = useState<Record<string, PickSlipItem>>({});
  const [slipOpen, setSlipOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const picksLocked = settings?.picks_locked ?? false;

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

  function handleSelect(prop: PropWithPlayer, selection: "over" | "under") {
    setPicks((prev) => {
      const existing = prev[prop.id];
      if (existing && existing.selection === selection) {
        const next = { ...prev };
        delete next[prop.id];
        return next;
      }
      return {
        ...prev,
        [prop.id]: {
          propId: prop.id,
          playerId: prop.player.id,
          playerName: prop.player.name,
          teamName: prop.player.team.name,
          statType: prop.stat_type,
          line: prop.line,
          selection,
        },
      };
    });
  }

  function removePick(propId: string) {
    setPicks((prev) => {
      const next = { ...prev };
      delete next[propId];
      return next;
    });
  }

  const pickList = Object.values(picks);

  async function handleConfirmSubmit(info: SubmitInfo) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/picks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...info,
          picks: pickList.map((p) => ({
            propId: p.propId,
            selection: p.selection,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setConfirmation(data.submissionCode);
      setSubmitModalOpen(false);
      setSlipOpen(false);
      setPicks({});
    } catch (e: any) {
      setError(e.message);
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
            PICKS
            <br />
            LOCKED
          </p>
          <p className="mt-2 text-2xl">&#128274;</p>
          <p className="mt-6 text-bone/60">
            Your predictions have been submitted.
          </p>
          <p className="text-bone/60">Good luck. &#128064;</p>
          <p className="mt-8 inline-block rounded-lg border border-line bg-panel px-4 py-2 font-mono text-sm tracking-wide text-bone/70">
            #{confirmation}
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
            MY PICKS {pickList.length > 0 && `(${pickList.length})`}
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 px-5 pb-4 pt-3">
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
        <div className="space-y-3 lg:flex-1">
          {filteredProps.length === 0 ? (
            <EmptyState hasAnyProps={props.length > 0} />
          ) : (
            filteredProps.map((prop) => (
              <PlayerCard
                key={prop.id}
                prop={prop}
                selection={picks[prop.id]?.selection ?? null}
                onSelect={(sel) => handleSelect(prop, sel)}
              />
            ))
          )}
        </div>

        <PickSidePanel
          items={pickList}
          onRemove={removePick}
          onSubmit={() => setSubmitModalOpen(true)}
          submitting={submitting}
          locked={picksLocked}
        />
      </div>

      <div className="lg:hidden">
        <PickSlipBar count={pickList.length} onOpen={() => setSlipOpen(true)} />
        <PickSlipDrawer
          items={pickList}
          open={slipOpen}
          onClose={() => setSlipOpen(false)}
          onRemove={removePick}
          onSubmit={() => setSubmitModalOpen(true)}
          submitting={submitting}
          locked={picksLocked}
        />
      </div>
      <SubmitModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        submitting={submitting}
        emailRequired={settings?.email_required ?? true}
        instagramRequired={settings?.instagram_required ?? true}
      />
      {error && (
        <div className="fixed inset-x-4 bottom-24 z-50 rounded-lg bg-young px-4 py-3 text-center text-sm font-semibold text-white shadow-glowRed">
          {error}
        </div>
      )}
    </main>
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
