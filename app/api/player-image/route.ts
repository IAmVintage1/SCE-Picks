import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing image URL." }, { status: 400 });
  }

  let target: URL;
  let supabaseHost: string | null = null;

  try {
    target = new URL(rawUrl);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null;
  } catch {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  if (target.protocol !== "https:" || !supabaseHost || target.host !== supabaseHost) {
    return NextResponse.json({ error: "Image host not allowed." }, { status: 403 });
  }

  try {
    const response = await fetch(target.toString(), {
      next: { revalidate: ONE_YEAR },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to load player image." },
        { status: response.status },
      );
    }

    const body = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/webp";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable`,
        "CDN-Cache-Control": `public, max-age=${ONE_YEAR}, immutable`,
      },
    });
  } catch (error) {
    console.error("Player image proxy failed:", error);
    return NextResponse.json(
      { error: "Unable to load player image." },
      { status: 500 },
    );
  }
}
