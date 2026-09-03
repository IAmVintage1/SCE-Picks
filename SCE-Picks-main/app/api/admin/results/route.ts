import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const supabase = createAdminSupabase();
  const [propsRes, teamPropsRes, resultsRes, teamResultsRes] = await Promise.all([
    supabase
      .from("props")
      .select("*, player:players(*, team:teams!players_team_id_fkey(*))")
      .order("created_at", { ascending: false }),
    supabase.from("team_props").select("*"),
    supabase.from("results").select("*"),
    supabase.from("team_prop_results").select("*"),
  ]);

  if (propsRes.error) return NextResponse.json({ error: propsRes.error.message }, { status: 500 });
  if (teamPropsRes.error) return NextResponse.json({ error: teamPropsRes.error.message }, { status: 500 });

  return NextResponse.json({
    props: propsRes.data ?? [],
    teamProps: teamPropsRes.data ?? [],
    results: resultsRes.data ?? [],
    teamResults: teamResultsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const body = await req.json();
  const supabase = createAdminSupabase();

  if (body.kind === "player") {
    const { propId, actualValue } = body as { propId: string; actualValue: number };
    const { data: prop } = await supabase
      .from("props")
      .select("line")
      .eq("id", propId)
      .single();

    const resultLabel =
      actualValue === prop?.line ? "push" : actualValue > (prop?.line ?? 0) ? "hit" : "miss";

    // This insert/update is what fires the auto-grading trigger
    // (trg_grade_picks in schema.sql), which grades every pick on
    // this prop and recomputes each affected card's status.
    const { error } = await supabase
      .from("results")
      .upsert(
        { prop_id: propId, actual_value: actualValue, result: resultLabel },
        { onConflict: "prop_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "team") {
    const { teamPropId, actualValue, winningTeamSlug } = body as {
      teamPropId: string;
      actualValue?: number;
      winningTeamSlug?: string;
    };

    // This insert/update fires trg_grade_team_picks, grading every
    // team pick on this prop and recomputing affected card statuses.
    const { error } = await supabase.from("team_prop_results").upsert(
      {
        team_prop_id: teamPropId,
        actual_value: actualValue ?? null,
        winning_team_slug: winningTeamSlug ?? null,
      },
      { onConflict: "team_prop_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown result kind." }, { status: 400 });
}
