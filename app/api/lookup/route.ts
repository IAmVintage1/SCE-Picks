import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json(
      { error: "Enter your card code." },
      { status: 400 },
    );
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      submission_code,
      submitted_at,
      pick_count,
      prize_tier,
      card_status,
      user:app_users(name, instagram_username),
      picks(
        id, selection, result,
        prop:props(line, stat_type, player:players(name, team:teams(name)))
      ),
      team_picks(
        id, selection, result,
        team_prop:team_props(prop_type, line)
      )
    `,
    )
    .eq("submission_code", code)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No card found with that code." },
      { status: 404 },
    );
  }

  return NextResponse.json({ submission: data });
}
