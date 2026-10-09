import { createServerSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import PicksExperience from "@/components/PicksExperience";
import MvpVoting from "@/components/MvpVoting";
import { getEventPhase } from "@/lib/eventPhase";
import { EventSettings, Player, PropWithPlayer, Team, TeamProp } from "@/lib/types";
import { getAdminCookieName, isAdminSessionValid } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function PicksPage({
  searchParams,
}: {
  searchParams?: { preview?: string };
}) {
  const supabase = createServerSupabase();
  const cookieStore = await cookies();
  const previewMvp =
    searchParams?.preview === "mvp" &&
    (await isAdminSessionValid(cookieStore.get(getAdminCookieName())?.value));

  const [teamsRes, playersRes, propsRes, teamPropsRes, settingsRes] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("players").select("*, team:teams!players_team_id_fkey(*)").eq("active", true).order("name"),
    supabase
      .from("props")
      .select("*, player:players(*, team:teams!players_team_id_fkey(*))")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase.from("team_props").select("*").eq("active", true),
    supabase.from("event_settings").select("*").eq("id", 1).single(),
  ]);

  // Log the real error server-side (visible in Vercel's Runtime Logs)
  // instead of silently falling back to an empty list. If you're
  // still seeing no props after confirming they exist in admin,
  // check Vercel -> your project -> Logs for lines starting with
  // "[PICKS PAGE]" to see the actual Supabase error.
  if (teamsRes.error) console.error("[PICKS PAGE] teams error:", teamsRes.error);
  if (propsRes.error) console.error("[PICKS PAGE] props error:", propsRes.error);
  if (teamPropsRes.error) console.error("[PICKS PAGE] team_props error:", teamPropsRes.error);
  if (settingsRes.error) console.error("[PICKS PAGE] settings error:", settingsRes.error);

  const settings = settingsRes.data as EventSettings;
  const phase = getEventPhase(settings);

  if (previewMvp || phase !== "picks") {
    return (
      <MvpVoting
        players={(playersRes.data as unknown as (Player & { team: Team })[]) ?? []}
        opensAt={settings?.mvp_open_time ?? null}
        initiallyOpen={previewMvp || phase === "mvp"}
        closed={!previewMvp && phase === "closed"}
        preview={previewMvp}
      />
    );
  }

  return (
    <PicksExperience
      teams={(teamsRes.data as Team[]) ?? []}
      props={(propsRes.data as unknown as PropWithPlayer[]) ?? []}
      teamProps={(teamPropsRes.data as TeamProp[]) ?? []}
      settings={settings}
    />
  );
}
