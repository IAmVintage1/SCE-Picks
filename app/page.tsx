import Link from "next/link";
import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import { EventSettings, PropWithPlayer, STAT_SHORT } from "@/lib/types";

export const revalidate = 15;

async function getData() {
  const supabase = createServerSupabase();
  const [{ data: settings }, { data: props }] = await Promise.all([
    supabase.from("event_settings").select("*").eq("id", 1).single(),
    supabase
      .from("props")
      .select("*, player:players(*, team:teams(*))")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  return {
    settings: settings as EventSettings | null,
    props: (props as unknown as PropWithPlayer[]) ?? [],
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "OCTOBER 9";
  const d = new Date(dateStr + "T00:00:00");
  return d
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
}

export default async function HomePage() {
  const { settings, props } = await getData();

  return (
    <main className="relative min-h-[100dvh] bg-ink">
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <div className="grain-overlay" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-line to-transparent" />

        <div className="relative flex flex-1 flex-col px-5 pb-6 pt-8 sm:px-10">
          <header className="flex items-center justify-between">
            <span className="font-head text-sm font-bold tracking-[0.25em] text-bone/90">
              SCE
            </span>
            <span className="rounded-full border border-bone/20 bg-bone/5 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.15em] text-bone/70 backdrop-blur">
              FREE TO PLAY
            </span>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-mono text-[11px] font-semibold tracking-[0.35em] text-bone/40">
              {formatDate(settings?.event_date ?? null)} &nbsp;/&nbsp;{" "}
              {settings?.venue?.toUpperCase() ?? "UCF"}
            </p>

            <h1 className="mt-4 font-display text-[4.2rem] leading-[0.82] tracking-tight text-bone drop-shadow-[0_0_60px_rgba(234,42,42,0.25)] sm:text-9xl">
              SCE
              <br />
              PICKS
            </h1>

            <p className="mt-5 font-head text-lg font-medium tracking-[0.3em] text-bone/80">
              CALL YOUR SHOT.
            </p>

            <div className="mt-10 flex w-full max-w-md items-center justify-center gap-3">
              <div className="flex-1 text-right">
                <p className="font-display text-2xl leading-none text-young-light drop-shadow-[0_0_25px_rgba(234,42,42,0.55)] sm:text-4xl">
                  YOUNG
                  <br />
                  KNIGHTS
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bone/20 bg-ink2 font-mono text-[10px] font-bold text-bone/50">
                VS
              </div>
              <div className="flex-1 text-left">
                <p className="font-display text-2xl leading-none text-alum-light drop-shadow-[0_0_25px_rgba(30,95,255,0.55)] sm:text-4xl">
                  ALUM
                  <br />
                  KNIGHTS
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 pb-2">
            <Link
              href="/picks"
              className="group relative w-full max-w-sm overflow-hidden rounded-2xl bg-bone py-4 text-center shadow-[0_0_50px_-12px_rgba(245,244,241,0.4)] transition active:scale-[0.97]"
            >
              <span className="relative z-10 font-head text-lg font-bold tracking-[0.1em] text-ink">
                MAKE YOUR PICKS
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <p className="max-w-xs text-center text-[11px] leading-relaxed text-bone/35">
              No entry fees. No wagering. Predict player stats for fun and
              bragging rights only.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
      </section>

      {/* ================= PROP PREVIEW STRIP ================= */}
      <section className="relative border-t border-line px-5 py-10 sm:px-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.3em] text-bone/35">
              LIVE NOW
            </p>
            <h2 className="font-head text-xl font-bold tracking-wide text-bone">
              PLAYER PROPS
            </h2>
          </div>
          <Link
            href="/picks"
            className="font-mono text-[11px] font-semibold tracking-wide text-bone/50"
          >
            SEE ALL &rarr;
          </Link>
        </div>

        {props.length === 0 ? (
          <EmptyPreview />
        ) : (
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {props.map((prop) => (
              <PreviewCard key={prop.id} prop={prop} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PreviewCard({ prop }: { prop: PropWithPlayer }) {
  const isYoung = prop.player.team.slug === "youngknights";
  const glow = isYoung ? "shadow-glowRed" : "shadow-glowBlue";
  const accent = isYoung ? "text-young-light" : "text-alum-light";
  const ring = isYoung ? "border-young/30" : "border-alum/30";

  return (
    <div
      className={`relative w-40 shrink-0 overflow-hidden rounded-xl border ${ring} bg-panel ${glow}`}
    >
      <div className="relative h-28 w-full bg-panelLight">
        {prop.player.image_url ? (
          <Image
            src={prop.player.image_url}
            alt={prop.player.name}
            fill
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-3xl text-bone/15">
            {prop.player.name.charAt(0)}
          </div>
        )}
        <div
          className={`absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t ${
            isYoung ? "from-young-dark/80" : "from-alum-dark/80"
          } to-transparent`}
        />
      </div>
      <div className="p-2.5">
        <p className="truncate font-head text-xs font-semibold text-bone">
          {prop.player.name}
        </p>
        <p className={`text-[10px] font-semibold tracking-wide ${accent}`}>
          {STAT_SHORT[prop.stat_type]}
        </p>
        <p className="mt-1 font-display text-2xl leading-none text-bone">
          {prop.line}
        </p>
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel px-6 py-10 text-center">
      <div className="grain-overlay opacity-50" />
      <p className="relative font-display text-3xl leading-tight text-bone">
        GAME DAY
        <br />
        IS COMING.
      </p>
      <p className="relative mt-3 font-mono text-xs tracking-[0.2em] text-bone/40">
        PLAYER PROPS DROP SOON
      </p>
      <div className="relative mt-6 flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 w-16 animate-pulseGlow rounded-lg border border-line bg-panelLight"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}
