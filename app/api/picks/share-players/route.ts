import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getLocalPlayerImage } from "@/lib/playerImages";

function getCachedImageUrl(url: string | null) {
  if (!url) return null;
  return `/api/player-image?url=${encodeURIComponent(url)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const names = Array.isArray(body?.names)
      ? Array.from(
          new Set(
            body.names
              .filter((value: unknown): value is string => typeof value === "string")
              .map((value: string) => value.trim())
              .filter(Boolean),
          ),
        ).slice(0, 20)
      : [];

    if (!names.length) {
      return NextResponse.json({ players: [] });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("players")
      .select("name, image_url, team:teams(name, slug)")
      .in("name", names);

    if (error) {
      console.error("Share player lookup failed:", error);
      return NextResponse.json(
        { error: "Unable to load player images." },
        { status: 500 },
      );
    }

    const players = (data ?? []).map((player) => ({
      ...player,
      image_url:
        getLocalPlayerImage(player.name) ?? getCachedImageUrl(player.image_url),
    }));

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Share player lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load player images." },
      { status: 500 },
    );
  }
}
