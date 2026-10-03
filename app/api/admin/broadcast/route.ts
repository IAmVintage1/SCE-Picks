import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { broadcastToken, getLiveSnapshot } from "@/lib/broadcast";
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
    const events = await query(
      `SELECT e.id,e.label,e.created_at,e.reversed_at,p.name FROM live_stat_events e JOIN players p ON p.id=e.player_id ORDER BY e.created_at DESC LIMIT 40`,
    );
    return NextResponse.json(
      {
        ...snapshot,
        events,
        token: broadcastToken(snapshot.state.token_version),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Broadcast unavailable. Run migrations/20261002-live-broadcast.sql in Neon.",
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
  if (!b || !Number.isInteger(b.revision))
    return NextResponse.json({ error: "Revision required" }, { status: 400 });
  if (b.cue === "boxscore" || b.cue === "player") {
    const field = b.cue === "boxscore" ? "boxscore" : "player";
    try {
      const rows = await query(
        `UPDATE broadcast_state SET ${field}_visible=true,${field}_visible_until=now()+interval '10 seconds',revision=revision+1,updated_at=now() WHERE id=1 AND revision=$1 ${field === "player" ? "AND featured_player_id IS NOT NULL" : ""} RETURNING id`,
        [b.revision],
      );
      if (!rows.length)
        return NextResponse.json(
          { error: field === "player" ? "Select a player first, then try again." : "Controls changed; try again." },
          { status: 409 },
        );
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Could not trigger graphic" }, { status: 400 });
    }
  }
  const allowed = [
    "period",
    "clock_seconds",
    "clock_running",
    "status",
    "scoreboard_visible",
    "boxscore_visible",
    "player_visible",
    "boxscore_team",
    "featured_player_id",
  ];
  const patch = Object.entries(b).filter(([k]) => allowed.includes(k));
  if (b.rotateToken === true) patch.push(["token_version", null]);
  if (!patch.length)
    return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
  for (const [k, v] of patch) {
    const invalid =
      ([
        "scoreboard_visible",
        "boxscore_visible",
        "player_visible",
        "clock_running",
      ].includes(k) &&
        typeof v !== "boolean") ||
      (k === "period" &&
        (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 20)) ||
      (k === "clock_seconds" &&
        (!Number.isInteger(v) || Number(v) < 0 || Number(v) > 7200)) ||
      (k === "status" && !["pregame", "live", "final"].includes(String(v))) ||
      (k === "boxscore_team" &&
        !["both", "youngknights", "alumknights"].includes(String(v))) ||
      (k === "featured_player_id" &&
        v !== null &&
        !/^[a-f0-9-]{36}$/i.test(String(v)));
    if (invalid)
      return NextResponse.json({ error: `Invalid ${k}` }, { status: 400 });
  }
  // Final is reserved for the existing reviewed Results workflow.
  if (b.status === "final")
    return NextResponse.json(
      { error: "Finalize from the Results page after reviewing stats." },
      { status: 400 },
    );
  const params: unknown[] = [];
  const sets = patch.map(([k, v]) => {
    if (k === "token_version") return "token_version=token_version+1";
    params.push(v);
    return `${k}=$${params.length}`;
  });
  if ("boxscore_visible" in b) sets.push("boxscore_visible_until=null");
  if ("player_visible" in b) sets.push("player_visible_until=null");
  if ("clock_running" in b || "clock_seconds" in b) {
    if (!("clock_seconds" in b))
      sets.push(
        "clock_seconds=greatest(0,clock_seconds-case when clock_running then floor(extract(epoch from now()-clock_started_at))::int else 0 end)",
      );
    sets.push(
      `clock_started_at=${b.clock_running === false ? "null" : "now()"}`,
    );
  }
  params.push(b.revision);
  try {
    const rows = await query(
      `UPDATE broadcast_state SET ${sets.join(",")},revision=revision+1,updated_at=now() WHERE id=1 AND revision=$${params.length} RETURNING id`,
      params,
    );
    if (!rows.length)
      return NextResponse.json(
        {
          error:
            "Another operator changed the game. Reloaded latest controls; try again.",
        },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not update broadcast controls" },
      { status: 400 },
    );
  }
}
