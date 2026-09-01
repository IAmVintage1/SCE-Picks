import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // 1. Check admin authentication
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }

    // 2. Query Supabase using standard relational syntax
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("players")
      .select("*, teams(*)")
      .order("name");

    // 3. Handle database errors and map response key to 'team'
    if (error) {
      console.error("[API/PLAYERS] Supabase Query Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map 'teams' object to 'team' key to match UI expectations
    const formattedPlayers = data?.map((player) => ({
      ...player,
      team: player.teams,
    }));

    return NextResponse.json({ players: formattedPlayers });
  } catch (err: any) {
    console.error("[API/PLAYERS] Unhandled Exception:", err);
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

    const body = await req.json();
    const { name, team_id } = body;

    if (!name || !team_id) {
      return NextResponse.json(
        { error: "Name and team are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("players")
      .insert({ name, team_id })
      .select()
      .single();

    if (error) {
      console.error("[API/PLAYERS] Supabase Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ player: data });
  } catch (err: any) {
    console.error("[API/PLAYERS] POST Unhandled Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
