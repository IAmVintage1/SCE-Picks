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
  const allowed = ["name", "team_id", "active", "image_url"];
  const payload: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("players")
    .update(payload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ player: data });
}

// Deactivate rather than hard-delete, so existing props/picks tied
// to this player stay intact for grading and history.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("players")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
