import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

    const supabase = createAdminSupabase();

    const [propsRes, playersRes, teamsRes] = await Promise.all([
      supabase.from("props").select("*").order("created_at", { ascending: false }),
      supabase.from("players").select("*"),
      supabase.from("teams").select("*"),
    ]);

    if (propsRes.error) throw propsRes.error;
    if (playersRes.error) throw playersRes.error;
    if (teamsRes.error) throw teamsRes.error;

    const teamMap = new Map(teamsRes.data?.map((t) => [t.id, t]));
    const playerMap = new Map(
      playersRes.data?.map((p) => [
        p.id,
        { ...p, team: teamMap.get(p.team_id) || null },
      ])
    );

    const formattedProps = propsRes.data?.map((prop) => ({
      ...prop,
      player: playerMap.get(prop.player_id) || null,
    }));

    return NextResponse.json({ props: formattedProps });
  } catch (err: any) {
    console.error("[API/PROPS] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

    const body = await req.json();
    const { player_id, stat_type, line, over_payout, under_payout } = body;

    if (!player_id || !stat_type || line === undefined) {
      return NextResponse.json(
        { error: "Player, stat type, and line are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("props")
      .insert({ player_id, stat_type, line, over_payout, under_payout })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ prop: data });
  } catch (err: any) {
    console.error("[API/PROPS] POST Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
