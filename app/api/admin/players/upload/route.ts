import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";

const MAX_UPLOAD_BYTES = 3_500_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const form = await req.formData();
  const playerId = String(form.get("playerId") ?? "");
  const file = form.get("file");

  if (!playerId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "playerId and image file are required." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large after compression. Keep it under 3.5 MB." },
      { status: 413 },
    );
  }

  const exists = await query<{ id: string }>(
    "SELECT id FROM players WHERE id = $1",
    [playerId],
  );
  if (!exists[0]) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const version = Date.now();
  const imageUrl = `/api/player-photo/${playerId}?v=${version}`;

  await query(
    `INSERT INTO player_photos (player_id, mime_type, data, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (player_id)
     DO UPDATE SET mime_type = EXCLUDED.mime_type,
                   data = EXCLUDED.data,
                   updated_at = now()`,
    [playerId, file.type, bytes],
  );

  const rows = await query(
    `UPDATE players
     SET image_url = $2, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [playerId, imageUrl],
  );

  return NextResponse.json({ player: rows[0] });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const { playerId } = await req.json();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
  }

  await query("DELETE FROM player_photos WHERE player_id = $1", [playerId]);
  await query(
    "UPDATE players SET image_url = NULL, updated_at = now() WHERE id = $1",
    [playerId],
  );

  return NextResponse.json({ ok: true });
}
