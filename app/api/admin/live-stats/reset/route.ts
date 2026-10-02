import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query, transaction } from "@/lib/db";

export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "RESET GAME";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );

  const body = await req.json().catch(() => ({}));

  const normalizedConfirm =
    typeof body?.confirm === "string" ? body.confirm.trim().toUpperCase() : "";

  if (normalizedConfirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: "Confirmation phrase didn't match." },
      { status: 400 },
    );
  }

  try {
    await transaction(async () => {
      await query("SELECT id FROM broadcast_state WHERE id=1 FOR UPDATE");
      await query("SELECT reset_live_tracking()");
      await query(
        "UPDATE live_stat_events SET reversed_at=coalesce(reversed_at,now())",
      );
      await query(
        "UPDATE broadcast_state SET status='pregame',period=1,clock_seconds=600,clock_running=false,clock_started_at=null,boxscore_visible=false,player_visible=false,revision=revision+1,updated_at=now() WHERE id=1",
      );
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Reset failed. No changes were saved." },
      { status: 500 },
    );
  }
}
