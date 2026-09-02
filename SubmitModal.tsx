"use client";

import { useState } from "react";

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
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (info: SubmitInfo) => void;
  submitting: boolean;
  emailRequired: boolean;
  instagramRequired: boolean;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl border border-line bg-panel p-6 sm:rounded-3xl">
        <h2 className="font-display text-xl font-semibold tracking-wide text-bone">
          ONE LAST STEP
        </h2>
        <p className="mt-1 text-sm text-bone/50">
          Tell us who's calling their shot.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-semibold tracking-wide text-bone/50">
              NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-bone/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wide text-bone/50">
              INSTAGRAM USERNAME {instagramRequired ? "" : "(OPTIONAL)"}
            </label>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourusername"
              className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-bone/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wide text-bone/50">
              EMAIL {emailRequired ? "" : "(OPTIONAL)"}
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              type="email"
              className="mt-1 w-full rounded-lg border border-line bg-panelLight px-3 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-bone/40"
            />
          </div>
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
            className="flex-1 rounded-xl bg-bone py-3 font-display text-sm font-semibold tracking-wide text-ink disabled:opacity-40"
          >
            {submitting ? "SUBMITTING..." : "SUBMIT PICKS"}
          </button>
        </div>
      </div>
    </div>
  );
}
