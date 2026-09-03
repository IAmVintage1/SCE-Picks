import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const revalidate = 0;

interface PickResultRow {
  result: "pending" | "hit" | "miss" | "push";
}

interface SubmissionRow {
  id: string;
  submission_code: string;
  submitted_at: string;
  pick_count: number;
  card_status: "pending" | "perfect" | "busted";
  user: { name: string; instagram_username: string | null } | null;
  picks: PickResultRow[];
  team_picks: PickResultRow[];
}

function scoreSubmission(s: SubmissionRow) {
  const allResults = [...s.picks, ...s.team_picks];
  const graded = allResults.filter((r) => r.result !== "pending");
  const hits = allResults.filter((r) => r.result === "hit").length;

  return {
    hits,
    graded: graded.length,
    total: allResults.length,
  };
}

export default async function LeaderboardPage() {
  const supabase = createServerSupabase();

  const { data: settingsData } = await supabase
    .from("event_settings")
    .select("leaderboard_visible, event_name")
    .eq("id", 1)
    .single();

  const eventName = settingsData?.event_name ?? "SCE Picks";

  if (!settingsData?.leaderboard_visible) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-6 text-center text-bone">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bone/30">
            {eventName}
          </p>
          <h1 className="mt-3 font-display text-3xl uppercase text-bone">
            LEADERBOARD ISN&apos;T LIVE YET
          </h1>
          <p className="mt-3 text-sm text-bone/45">
            Check back once the game gets going.
          </p>
          <Link
            href="/picks"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-bone px-6 font-head text-sm font-black uppercase tracking-wider text-ink"
          >
            BACK TO PICKS
          </Link>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      submission_code,
      submitted_at,
      pick_count,
      card_status,
      user:app_users(name, instagram_username),
      picks(result),
      team_picks(result)
    `,
    )
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("[LEADERBOARD] error:", error);
  }

  const submissions = (data as unknown as SubmissionRow[]) ?? [];

  const ranked = submissions
    .map((s) => ({ submission: s, score: scoreSubmission(s) }))
    .sort((a, b) => {
      const aPerfect = a.submission.card_status === "perfect" ? 0 : 1;
      const bPerfect = b.submission.card_status === "perfect" ? 0 : 1;

      if (aPerfect !== bPerfect) return aPerfect - bPerfect;
      if (b.score.hits !== a.score.hits) return b.score.hits - a.score.hits;

      return (
        new Date(a.submission.submitted_at).getTime() -
        new Date(b.submission.submitted_at).getTime()
      );
    });

  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-bone sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-young-light">
            🏆 LEADERBOARD
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase leading-[0.9] text-bone">
            TOP CARDS
          </h1>
          <p className="mt-2 text-sm text-bone/40">
            {eventName} &middot; live results
          </p>
        </div>

        <div className="mt-8 space-y-2">
          {ranked.length === 0 && (
            <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-bone/40">
              No cards submitted yet.
            </div>
          )}

          {ranked.map(({ submission, score }, index) => {
            const isPerfect = submission.card_status === "perfect";
            const isBusted = submission.card_status === "busted";

            return (
              <div
                key={submission.id}
                className={`flex items-center gap-4 rounded-2xl border p-4 ${
                  isPerfect
                    ? "border-alum-light/50 bg-alum/10"
                    : "border-line bg-panel"
                }`}
              >
                <div className="w-8 shrink-0 text-center font-display text-2xl text-bone/30">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-head text-sm font-black uppercase text-bone">
                    {submission.user?.name ?? "Unknown"}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-bone/35">
                    {submission.user?.instagram_username
                      ? `@${submission.user.instagram_username} · `
                      : ""}
                    #{submission.submission_code}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-head text-lg font-black text-bone">
                    {score.hits}/{score.total || submission.pick_count}
                  </p>
                  <p
                    className={`font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${
                      isPerfect
                        ? "text-alum-light"
                        : isBusted
                        ? "text-young-light"
                        : "text-bone/30"
                    }`}
                  >
                    {isPerfect
                      ? "PERFECT"
                      : isBusted
                      ? "BUSTED"
                      : score.graded > 0
                      ? "IN PROGRESS"
                      : "PENDING"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/picks"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-6 font-head text-sm font-black uppercase tracking-wider text-bone/60 hover:text-bone"
          >
            BACK TO PICKS
          </Link>
        </div>
      </div>
    </main>
  );
}
