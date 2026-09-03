"use client";

import { useState } from "react";
import { TierInfo } from "@/lib/cardTiers";

export interface SubmitInfo {
  name: string;
  instagram_username: string;
  email: string;
}

export default function SubmitModal({
  open,
  onClose,
  onConfirm,
  submitting,
  emailRequired,
  instagramRequired,
  pickCount,
  tierInfo,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (info: SubmitInfo) => void;
  submitting: boolean;
  emailRequired: boolean;
  instagramRequired: boolean;
  pickCount: number;
  tierInfo: TierInfo;
}) {
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");

  if (!open) return null;

  const canSubmit =
    name.trim().length > 0 &&
    (!instagramRequired || instagram.trim().length > 0) &&
    (!emailRequired || email.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-lineBright bg-panel p-6 sm:rounded-3xl">
        <div className="grain-overlay opacity-20" />
        <div className="relative">
          <p className="font-mono text-[10px] font-semibold tracking-[0.25em] text-bone/35">
            LOCK YOUR CARD?
          </p>
          <h2 className="mt-1 font-display text-2xl leading-none tracking-tight text-bone">
            WHO'S CALLING IT?
          </h2>
          <p className="mt-2 text-xs text-bone/45">
            Once submitted, your picks cannot be changed.
          </p>

          <div className="mt-4 rounded-xl border border-line bg-panelLight px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-head text-sm font-bold text-bone">
                {pickCount} PICKS
              </span>
              <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-bone/40">
                PERFECT CARD REQUIRED
              </span>
            </div>
            {tierInfo.prize && (
              <p className="mt-1 font-mono text-[11px] font-bold tracking-[0.1em] text-young-light">
                PRIZE: {tierInfo.prize.toUpperCase()}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <Field
              label="NAME"
              value={name}
              onChange={setName}
              placeholder="Your name"
            />
            <Field
              label={`INSTAGRAM ${instagramRequired ? "" : "(OPTIONAL)"}`}
              value={instagram}
              onChange={setInstagram}
              placeholder="@yourusername"
            />
            <Field
              label={`EMAIL ${emailRequired ? "" : "(OPTIONAL)"}`}
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              type="email"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-bone/60"
            >
              Back
            </button>
            <button
              disabled={!canSubmit || submitting}
              onClick={() =>
                onConfirm({ name, instagram_username: instagram, email })
              }
              className="flex-1 rounded-xl bg-bone py-3 font-head text-sm font-bold tracking-[0.06em] text-ink shadow-[0_0_30px_-10px_rgba(245,244,241,0.5)] disabled:opacity-30"
            >
              {submitting ? "LOCKING..." : "LOCK IN CARD"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] font-semibold tracking-[0.15em] text-bone/40">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="mt-1.5 w-full rounded-lg border border-line bg-panelLight px-3 py-3 text-sm text-bone placeholder:text-bone/25 focus:border-bone/40"
      />
    </div>
  );
}
