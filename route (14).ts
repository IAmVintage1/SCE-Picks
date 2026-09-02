import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("props")
    .select("*, player:players(*, team:teams(*))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ props: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { player_id, stat_type, line } = await req.json();
  if (!player_id || !stat_type || line === undefined || line === null) {
    return NextResponse.json(
      { error: "Player, stat type, and line are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("props")
    .insert({ player_id, stat_type, line })
    .select("*, player:players(*, team:teams(*))")
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "This player already has a prop for that stat. Edit the existing one instead."
        : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ prop: data });
}
