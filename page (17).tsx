import Link from "next/link";
import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import { EventSettings } from "@/lib/types";

export const revalidate = 30;

async function getSettings(): Promise<EventSettings | null> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("event_settings")
    .select("*")
    .eq("id", 1)
    .single();
  return data as EventSettings | null;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "OCTOBER 9";
  const d = new Date(dateStr + "T00:00:00");
  return d
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
}

export default async function HomePage() {
  const settings = await getSettings();

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink">
      {/* signature diagonal team-color split, quiet in the background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "linear-gradient(160deg, #A8231A 0%, #0A0A0C 42%, #0A0A0C 58%, #12309C 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-ink/40 to-ink" />

      <div className="relative flex flex-1 flex-col justify-between px-6 py-10 sm:px-10">
        <header className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold tracking-wide text-bone">
            SCE
          </span>
          <span className="rounded-full border border-bone/25 px-3 py-1 text-[11px] font-semibold tracking-wide text-bone/80">
            FREE TO PLAY
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight text-bone sm:text-8xl">
            SCE
            <br />
            PICKS
          </h1>
          <p className="mt-4 font-display text-xl font-medium tracking-[0.08em] text-bone/90 sm:text-2xl">
            CALL YOUR SHOT.
          </p>

          <div className="mt-12 flex items-center gap-4 sm:gap-6">
            <span className="font-display text-2xl font-bold text-young-light sm:text-3xl">
              YOUNGKNIGHTS
            </span>
            <span className="font-display text-lg text-bone/50">VS</span>
            <span className="font-display text-2xl font-bold text-alum-light sm:text-3xl">
              ALUMKNIGHTS
            </span>
          </div>

          <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-bone/60">
            {formatDate(settings?.event_date ?? null)} &middot;{" "}
            {settings?.venue?.toUpperCase() ?? "UCF"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 pb-4">
          <Link
            href="/picks"
            className="w-full max-w-sm rounded-xl bg-bone py-4 text-center font-display text-lg font-semibold tracking-wide text-ink shadow-[0_0_0_1px_rgba(244,243,240,0.1)] transition active:scale-[0.98]"
          >
            MAKE YOUR PICKS
          </Link>
          <p className="max-w-xs text-center text-xs leading-relaxed text-bone/40">
            No entry fees. No wagering. Predict player stats for fun and
            bragging rights only.
          </p>
        </div>
      </div>
    </main>
  );
}
