import { createServerSupabase } from "@/lib/supabase/server";
import PicksExperience from "@/components/PicksExperience";
import { EventSettings, PropWithPlayer, Team } from "@/lib/types";

export const revalidate = 0;

export default async function PicksPage() {
  const supabase = createServerSupabase();

  const [{ data: teams }, { data: props }, { data: settings }] =
    await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("props")
        .select(
          "*, player:players(*, team:teams(*))"
        )
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase.from("event_settings").select("*").eq("id", 1).single(),
    ]);

  return (
    <PicksExperience
      teams={(teams as Team[]) ?? []}
      props={(props as unknown as PropWithPlayer[]) ?? []}
      settings={settings as EventSettings}
    />
  );
}
