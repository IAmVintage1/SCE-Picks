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
    const { data, error } = await supabase
      .from("props")
      .select("*, players(*, teams(*))")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/PROPS] Supabase Query Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map nested PostgREST relationships ('players' and 'teams') to match expected UI object keys
    const formattedProps = data?.map((prop) => ({
      ...prop,
      player: prop.players
        ? {
            ...prop.players,
            team: prop.players.teams,
          }
        : null,
    }));

    return NextResponse.json({ props: formattedProps });
  } catch (err: any) {
    console.error("[API/PROPS] Unhandled Exception:", err);
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

    if (error) {
      console.error("[API/PROPS] Supabase Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prop: data });
  } catch (err: any) {
    console.error("[API/PROPS] POST Unhandled Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
