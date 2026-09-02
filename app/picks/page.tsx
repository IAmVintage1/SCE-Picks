import { createServerSupabase } from "@/lib/supabase/server";
import PicksExperience from "@/components/PicksExperience";
import { EventSettings, PropWithPlayer, Team } from "@/lib/types";

export const revalidate = 0;

export default async function PicksPage() {
  const supabase = createServerSupabase();

  const [teamsRes, propsRes, settingsRes] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("props")
      .select("*, player:players(*, team:teams!players_team_id_fkey(*))")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase.from("event_settings").select("*").eq("id", 1).single(),
  ]);

  // Log the real error server-side (visible in Vercel's Runtime Logs)
  // instead of silently falling back to an empty list. If you're
  // still seeing no props after confirming they exist in admin,
  // check Vercel -> your project -> Logs for lines starting with
  // "[PICKS PAGE]" to see the actual Supabase error.
  if (teamsRes.error) console.error("[PICKS PAGE] teams error:", teamsRes.error);
  if (propsRes.error) console.error("[PICKS PAGE] props error:", propsRes.error);
  if (settingsRes.error) console.error("[PICKS PAGE] settings error:", settingsRes.error);

  return (
    <PicksExperience
      teams={(teamsRes.data as Team[]) ?? []}
      props={(propsRes.data as unknown as PropWithPlayer[]) ?? []}
      settings={settingsRes.data as EventSettings}
    />
  );
}
