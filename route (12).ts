import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const updates = await req.json();
  const allowed = [
    "event_name",
    "event_date",
    "venue",
    "event_logo_url",
    "young_logo_url",
    "alum_logo_url",
    "pick_lock_time",
    "picks_locked",
    "leaderboard_visible",
    "email_required",
    "instagram_required",
  ];
  const payload: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("event_settings")
    .update(payload)
    .eq("id", 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
