"use client";

import { useEffect, useState } from "react";
import { EventSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function save(updates: Partial<EventSettings>) {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setSettings(data.settings);
    setSaving(false);
    setSaved(true);
  }

  if (!settings) return <p className="text-sm text-bone/40">Loading settings...</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide text-bone/70">
          EVENT DETAILS
        </h2>
        <div className="mt-4 space-y-3">
          <Field
            label="Event name"
            value={settings.event_name}
            onSave={(v) => save({ event_name: v })}
          />
          <Field
            label="Event date"
            type="date"
            value={settings.event_date ?? ""}
            onSave={(v) => save({ event_date: v })}
          />
          <Field
            label="Venue"
            value={settings.venue ?? ""}
            onSave={(v) => save({ venue: v })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide text-bone/70">
          LOGOS
        </h2>
        <p className="mt-1 text-xs text-bone/40">
          Paste public image URLs (upload to Supabase Storage first, then
          copy the public URL here). These power the splash animation on
          site open.
        </p>
        <div className="mt-4 space-y-3">
          <Field
            label="YoungKnights logo URL"
            value={settings.young_logo_url ?? ""}
            onSave={(v) => save({ young_logo_url: v })}
          />
          <Field
            label="AlumKnights logo URL"
            value={settings.alum_logo_url ?? ""}
            onSave={(v) => save({ alum_logo_url: v })}
          />
          <Field
            label="Event logo URL (optional)"
            value={settings.event_logo_url ?? ""}
            onSave={(v) => save({ event_logo_url: v })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide text-bone/70">
          PICKS
        </h2>
        <div className="mt-4 space-y-3">
          <Toggle
            label="Picks are locked (blocks all new submissions)"
            checked={settings.picks_locked}
            onChange={(v) => save({ picks_locked: v })}
          />
          <Toggle
            label="Require Instagram username"
            checked={settings.instagram_required}
            onChange={(v) => save({ instagram_required: v })}
          />
          <Toggle
            label="Require email"
            checked={settings.email_required}
            onChange={(v) => save({ email_required: v })}
          />
          <Toggle
            label="Public leaderboard visible"
            checked={settings.leaderboard_visible}
            onChange={(v) => save({ leaderboard_visible: v })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide text-bone/70">
          CARD & PRIZES
        </h2>
        <p className="mt-1 text-xs text-bone/40">
          Every pick on a card has to hit -- these tiers only pay out on a
          perfect card.
        </p>
        <div className="mt-4 space-y-3">
          <Field
            label="Minimum picks required to submit"
            type="number"
            value={String(settings.min_picks)}
            onSave={(v) => save({ min_picks: Number(v) || 3 })}
          />
          <Field
            label="3-pick tier prize"
            value={settings.prize_3}
            onSave={(v) => save({ prize_3: v })}
          />
          <Field
            label="5-pick tier prize"
            value={settings.prize_5}
            onSave={(v) => save({ prize_5: v })}
          />
          <Field
            label="10-pick tier prize"
            value={settings.prize_10}
            onSave={(v) => save({ prize_10: v })}
          />
        </div>
      </div>

      <p className="text-xs text-bone/40">
        {saving ? "Saving..." : saved ? "Saved." : ""}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div>
      <label className="text-xs font-medium text-bone/50">{label}</label>
      <input
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== value && onSave(local)}
        className="mt-1 block w-full rounded-lg border border-line bg-panelLight px-3 py-2 text-sm text-bone"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-bone/80">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-young"
      />
    </label>
  );
}
