import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const updates = await req.json();
  const allowed = ["line", "active", "locked", "stat_type"];
  const payload: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("props")
    .update(payload)
    .eq("id", params.id)
    .select("*, player:players(*, team:teams!players_team_id_fkey(*))")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prop: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("props")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
