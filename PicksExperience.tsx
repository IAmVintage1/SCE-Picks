"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PlayerCard from "@/components/PlayerCard";
import { PickSlipBar, PickSlipDrawer } from "@/components/PickSlip";
import SubmitModal, { SubmitInfo } from "@/components/SubmitModal";
import {
  EventSettings,
  PickSlipItem,
  PropWithPlayer,
  STAT_LABELS,
  StatType,
  Team,
} from "@/lib/types";

type TeamFilter = "all" | string; // team slug

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
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-6 text-center">
        <p className="font-display text-4xl font-bold tracking-wide text-bone">
          PICKS LOCKED 🔒
        </p>
        <p className="mt-3 text-bone/60">
          Your predictions have been submitted.
        </p>
        <p className="mt-1 text-bone/60">Good luck. 👀</p>
        <p className="mt-6 rounded-lg border border-line bg-panel px-4 py-2 font-display text-sm tracking-wide text-bone/70">
          CONFIRMATION #{confirmation}
        </p>
        <Link
          href="/"
          className="mt-10 rounded-xl bg-bone px-8 py-3 font-display text-sm font-semibold tracking-wide text-ink"
        >
          BACK HOME
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-ink pb-28">
      <div className="sticky top-0 z-20 border-b border-line bg-ink/95 px-4 pb-3 pt-5 backdrop-blur">
        <h1 className="font-display text-2xl font-bold tracking-wide text-bone">
          SCE PICKS
        </h1>
        <p className="text-sm text-bone/50">YoungKnights vs AlumKnights</p>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          <FilterPill
            active={teamFilter === "all"}
            onClick={() => setTeamFilter("all")}
            label="ALL"
          />
          {teams.map((t) => (
            <FilterPill
              key={t.id}
              active={teamFilter === t.slug}
              onClick={() => setTeamFilter(t.slug)}
              label={t.name.toUpperCase()}
            />
          ))}
        </div>

        {availableStats.length > 1 && (
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            <FilterPill
              small
              active={statFilter === "all"}
              onClick={() => setStatFilter("all")}
              label="ALL STATS"
            />
            {availableStats.map((s) => (
              <FilterPill
                key={s}
                small
                active={statFilter === s}
                onClick={() => setStatFilter(s)}
                label={STAT_LABELS[s]}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 px-4 py-4">
        {filteredProps.length === 0 && (
          <p className="py-16 text-center text-sm text-bone/40">
            No props available yet for this filter. Check back closer to game
            day.
          </p>
        )}
        {filteredProps.map((prop) => (
          <PlayerCard
            key={prop.id}
            prop={prop}
            selection={picks[prop.id]?.selection ?? null}
            onSelect={(sel) => handleSelect(prop, sel)}
          />
        ))}
      </div>

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
      <SubmitModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        submitting={submitting}
        emailRequired={settings?.email_required ?? false}
        instagramRequired={settings?.instagram_required ?? true}
      />
      {error && (
        <div className="fixed inset-x-4 bottom-24 z-50 rounded-lg bg-young px-4 py-3 text-center text-sm font-semibold text-white">
          {error}
        </div>
      )}
    </main>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  small,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 font-display font-semibold tracking-wide transition ${
        small ? "py-1.5 text-[11px]" : "py-2 text-xs"
      } ${
        active
          ? "border-bone bg-bone text-ink"
          : "border-line text-bone/60 active:border-bone/40"
      }`}
    >
      {label}
    </button>
  );
}
