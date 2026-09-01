import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }

    const supabase = createAdminSupabase();

    // Direct selects avoid PostgREST path errors
    const [{ data: players, error: playersErr }, { data: teams, error: teamsErr }] =
      await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("teams").select("*"),
      ]);

    if (playersErr) throw playersErr;
    if (teamsErr) throw teamsErr;

    const teamMap = new Map(teams?.map((t) => [t.id, t]));
    const formattedPlayers = players?.map((p) => ({
      ...p,
      team: teamMap.get(p.team_id) || null,
    }));

    return NextResponse.json({ players: formattedPlayers });
  } catch (err: any) {
    console.error("[API/PLAYERS] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }

    const { name, team_id } = await req.json();
    if (!name || !team_id) {
      return NextResponse.json({ error: "Name and team are required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("players")
      .insert({ name, team_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ player: data });
  } catch (err: any) {
    console.error("[API/PLAYERS] POST Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
