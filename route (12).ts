import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

    const supabase = createAdminSupabase();

    const [playersRes, teamsRes] = await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase.from("teams").select("*"),
    ]);

    if (playersRes.error) throw playersRes.error;
    if (teamsRes.error) throw teamsRes.error;

    const teamMap = new Map(teamsRes.data?.map((t) => [t.id, t]));

    const formattedPlayers = playersRes.data?.map((player) => ({
      ...player,
      team: teamMap.get(player.team_id) || null,
    }));

    return NextResponse.json({ players: formattedPlayers || [] });
  } catch (err: any) {
    console.error("[API/PLAYERS] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

    const body = await req.json();
    const { name, team_id, position, number } = body;

    if (!name || !team_id) {
      return NextResponse.json({ error: "Name and team are required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("players")
      .insert({ name, team_id, position, number })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ player: data });
  } catch (err: any) {
    console.error("[API/PLAYERS] POST Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
