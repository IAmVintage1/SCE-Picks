import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("players")
    .select("*, team:teams(*)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ players: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { name, team_id } = await req.json();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ player: data });
}
