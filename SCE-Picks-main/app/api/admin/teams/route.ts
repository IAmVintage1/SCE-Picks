import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("teams").select("*").order("name");

    if (error) throw error;
    return NextResponse.json({ teams: data || [] });
  } catch (err: any) {
    console.error("[API/TEAMS] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
