import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getEventPhase } from "@/lib/eventPhase";

export const dynamic = "force-dynamic";
const VOTER_COOKIE = "sce_mvp_voter";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const playerId = typeof body?.playerId === "string" ? body.playerId : "";
  if (!/^[0-9a-f-]{36}$/i.test(playerId)) {
    return NextResponse.json({ error: "Select a player first." }, { status: 400 });
  }

  const [settings] = await query<{
    picks_locked: boolean;
    pick_lock_time: string | null;
    mvp_open_time: string | null;
    mvp_voting_closed: boolean;
  }>("SELECT picks_locked,pick_lock_time,mvp_open_time,mvp_voting_closed FROM event_settings WHERE id=1");

  const phase = getEventPhase(settings);
  if (phase !== "mvp") {
    return NextResponse.json(
      { error: phase === "closed" ? "MVP voting is closed." : "MVP voting opens at 8 PM ET." },
      { status: 403 },
    );
  }

  const [player] = await query<{ id: string; name: string }>(
    "SELECT id,name FROM players WHERE id=$1 AND active=true",
    [playerId],
  );
  if (!player) return NextResponse.json({ error: "That player is not available." }, { status: 404 });

  const cookieStore = await cookies();
  const voterToken = cookieStore.get(VOTER_COOKIE)?.value || randomUUID();
  const voterHash = createHash("sha256").update(voterToken).digest("hex");

  try {
    await query(
      "INSERT INTO mvp_votes(player_id,voter_token_hash) VALUES($1,$2)",
      [playerId, voterHash],
    );
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "This device has already voted." }, { status: 409 });
    }
    console.error("[MVP VOTE]", error);
    return NextResponse.json({ error: "Vote could not be saved. Try again." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, playerName: player.name });
  response.cookies.set(VOTER_COOKIE, voterToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return response;
}
