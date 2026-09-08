import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

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

    return NextResponse.json({ players: data ?? [] });
  } catch (error) {
    console.error("Share player lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load player images." },
      { status: 500 },
    );
  }
}
