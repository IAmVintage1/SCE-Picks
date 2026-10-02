import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { validDeltas } from "@/lib/live";
import { getLiveSnapshot } from "@/lib/broadcast";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  try {
    const snapshot = await getLiveSnapshot();
    const stats = snapshot.players.flatMap((p) =>
      Object.entries(p.stats).map(([stat_type, value]) => ({
        player_id: p.id,
        stat_type,
        value,
      })),
    );
    return NextResponse.json(
      { players: snapshot.players, stats, statsError: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Live stats unavailable. Run the live broadcast migration in Neon.",
      },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  const b = await req.json().catch(() => null);
  const uuid = (v: unknown) =>
    typeof v === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
  if (!b || !uuid(b.eventId))
    return NextResponse.json(
      { error: "Unique action ID required" },
      { status: 400 },
    );
  try {
    if (b.undo === true)
      await query("SELECT undo_live_action($1)", [b.eventId]);
    else {
      const deltas = b.deltas ?? { [b.statType]: b.delta };
      if (!uuid(b.playerId) || !validDeltas(deltas))
        return NextResponse.json(
          { error: "Valid player and stat changes required" },
          { status: 400 },
        );
      await query("SELECT record_live_action($1,$2,$3::jsonb,$4)", [
        b.eventId,
        b.playerId,
        JSON.stringify(deltas),
        String(b.label || "Stat correction"),
      ]);
    }
    const stats = b.playerId
      ? await query(
          "SELECT stat_type,value FROM live_box_score WHERE player_id=$1",
          [b.playerId],
        )
      : [];
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 409 },
    );
  }
}
