import { createServerSupabase } from "@/lib/supabase/server";
import PicksExperience from "@/components/PicksExperience";
import { EventSettings, PropWithPlayer, Team, TeamProp } from "@/lib/types";
import { getLocalPlayerImageUrl } from "@/lib/playerImages";

export const revalidate = 0;

export default async function PicksPage() {
  const supabase = createServerSupabase();

  const [teamsRes, propsRes, teamPropsRes, settingsRes] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("props")
      .select("*, player:players(*, team:teams!players_team_id_fkey(*))")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase.from("team_props").select("*").eq("active", true),
    supabase.from("event_settings").select("*").eq("id", 1).single(),
  ]);

  if (teamsRes.error) console.error("[PICKS PAGE] teams error:", teamsRes.error);
  if (propsRes.error) console.error("[PICKS PAGE] props error:", propsRes.error);
  if (teamPropsRes.error) console.error("[PICKS PAGE] team_props error:", teamPropsRes.error);
  if (settingsRes.error) console.error("[PICKS PAGE] settings error:", settingsRes.error);

  // Never send Supabase Storage player-photo URLs into the public picks UI.
  // Every active roster player uses a static same-origin asset instead, which
  // keeps normal card/profile traffic off both Supabase Storage and the
  // /api/player-image Vercel Compute proxy.
  const props = ((propsRes.data as unknown as PropWithPlayer[]) ?? []).map((prop) => ({
    ...prop,
    player: {
      ...prop.player,
      image_url: getLocalPlayerImageUrl(prop.player?.name),
    },
  }));

  return (
    <PicksExperience
      teams={(teamsRes.data as Team[]) ?? []}
      props={props}
      teamProps={(teamPropsRes.data as TeamProp[]) ?? []}
      settings={settingsRes.data as EventSettings}
    />
  );
}
