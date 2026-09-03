import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );

  const supabase = createAdminSupabase();

  const [playersRes, statsRes] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, team:teams!players_team_id_fkey(id, name, slug)")
      .eq("active", true)
      .order("name"),
    supabase
      .from("live_box_score")
      .select("player_id, stat_type, value"),
  ]);

  if (playersRes.error) {
    console.error(
      "[LIVE STATS] players error:",
      playersRes.error,
    );
    return NextResponse.json(
      { error: playersRes.error.message },
      { status: 500 },
    );
  }

  // Don't let a missing `live_box_score` table (the migration
  // hasn't been run yet) blank out the whole player picker --
  // log it and just return everyone at 0, so the picker still
  // works and it's obvious from the logs what's actually wrong.
  if (statsRes.error) {
    console.error(
      "[LIVE STATS] stats error (migration 10 may not be run yet):",
      statsRes.error,
    );
  }

  return NextResponse.json({
    players: playersRes.data ?? [],
    stats: statsRes.data ?? [],
    statsError: statsRes.error
      ? "Live stat tracking isn't set up yet in the database (run migration 10-live-stat-tracking.sql in Supabase)."
      : null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );

  const body = await req.json();
  const { playerId, statType, delta } = body as {
    playerId: string;
    statType: string;
    delta: number;
  };

  if (!playerId || !statType || typeof delta !== "number") {
    return NextResponse.json(
      { error: "playerId, statType, and delta are required." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabase();

  const { error: rpcError } = await supabase.rpc("bump_live_stat", {
    p_player_id: playerId,
    p_stat_type: statType,
    p_delta: delta,
  });

  if (rpcError) {
    console.error("[LIVE STATS] bump_live_stat error:", rpcError);
    return NextResponse.json(
      {
        error: `${rpcError.message} (if this mentions a missing function or table, run migration 10-live-stat-tracking.sql in Supabase first)`,
      },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("live_box_score")
    .select("stat_type, value")
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ stats: data ?? [] });
}
