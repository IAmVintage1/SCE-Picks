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

  if (playersRes.error)
    return NextResponse.json(
      { error: playersRes.error.message },
      { status: 500 },
    );
  if (statsRes.error)
    return NextResponse.json(
      { error: statsRes.error.message },
      { status: 500 },
    );

  return NextResponse.json({
    players: playersRes.data ?? [],
    stats: statsRes.data ?? [],
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
    return NextResponse.json(
      { error: rpcError.message },
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
