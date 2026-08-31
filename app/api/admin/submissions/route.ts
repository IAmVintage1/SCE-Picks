import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const search = req.nextUrl.searchParams.get("q")?.trim();
  const supabase = createAdminSupabase();

  let query = supabase
    .from("submissions")
    .select(
      "*, user:app_users(*), picks(*, prop:props(*, player:players(*, team:teams(*))))"
    )
    .order("submitted_at", { ascending: false });

  if (search) {
    query = query.or(`submission_code.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by name/instagram in JS since those live on the joined app_users row.
  const filtered = search
    ? data?.filter(
        (s: any) =>
          s.submission_code.toLowerCase().includes(search.toLowerCase()) ||
          s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.user?.instagram_username?.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return NextResponse.json({ submissions: filtered });
}
