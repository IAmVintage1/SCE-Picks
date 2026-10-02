import { NextRequest, NextResponse } from "next/server";
import { getLiveSnapshot, validBroadcastToken } from "@/lib/broadcast";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  // Verify signature before hitting the database; version then supports revocation.
  const version = Number(token.split(".")[0]);
  if (!Number.isInteger(version) || !validBroadcastToken(token, version))
    return NextResponse.json(
      { error: "Invalid broadcast access" },
      { status: 401 },
    );
  try {
    const snapshot = await getLiveSnapshot();
    if (!validBroadcastToken(token, snapshot.state.token_version))
      return NextResponse.json(
        { error: "Broadcast access was revoked" },
        { status: 401 },
      );
    const { token_version, ...state } = snapshot.state;
    return NextResponse.json(
      { ...snapshot, state },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Broadcast temporarily unavailable" },
      { status: 503 },
    );
  }
}
