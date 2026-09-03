import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

const CONFIRM_PHRASE = "RESET GAME";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );

  const body = await req.json().catch(() => ({}));

  if (body?.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: "Confirmation phrase didn't match." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.rpc("reset_live_tracking");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
