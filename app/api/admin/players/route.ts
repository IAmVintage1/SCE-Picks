import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // 1. Verify environment variables exist at runtime
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!url || !serviceKey || !sessionSecret) {
      console.error("[API/PLAYERS] Missing Env Variables:", {
        hasUrl: !!url,
        hasServiceKey: !!serviceKey,
        hasSessionSecret: !!sessionSecret,
      });
      return NextResponse.json(
        { error: "Server Configuration Error: Missing required environment variables." },
        { status: 500 }
      );
    }

    // 2. Check admin session authentication
    const auth = await requireAdmin();
    if (!auth.ok) {
      console.warn("[API/PLAYERS] Auth failed with status:", auth.status);
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }
    
    // 3. Query Supabase
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("players")
      .select("*, teams(*)")
      .order("name");

    if (error) {
      console.error("[API/PLAYERS] Supabase Query Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ players: data });
  } catch (err: any) {
    console.error("[API/PLAYERS] Unhandled Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }

    const body = await req.json();
    const { name, team_id } = body;

    if (!name || !team_id) {
      return NextResponse.json(
        { error: "Name and team are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("players")
      .insert({ name, team_id })
      .select()
      .single();

    if (error) {
      console.error("[API/PLAYERS] Supabase Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ player: data });
  } catch (err: any) {
    console.error("[API/PLAYERS] POST Unhandled Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
