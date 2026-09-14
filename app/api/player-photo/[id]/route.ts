import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const rows = await query<{ mime_type: string; data: Buffer }>(
    "SELECT mime_type, data FROM player_photos WHERE player_id = $1",
    [params.id],
  );

  const photo = rows[0];
  if (!photo) {
    return new NextResponse(null, { status: 404 });
  }

  const bytes =
    photo.data instanceof Buffer
      ? photo.data
      : Buffer.from(photo.data as any);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": photo.mime_type || "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
