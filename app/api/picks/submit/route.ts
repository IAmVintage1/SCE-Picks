import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

function generateSubmissionCode() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `SCE-${random}`;
}

function tierForCount(count: number): number | null {
  if (count >= 10) return 10;
  if (count >= 5) return 5;
  if (count >= 3) return 3;
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, instagram_username, email, playerPicks, teamPicks } = body as {
    name: string;
    instagram_username: string;
    email: string;
    playerPicks: { propId: string; selection: "over" | "under" }[];
    teamPicks: { teamPropId: string; selection: string }[];
  };

  const safePlayerPicks = Array.isArray(playerPicks) ? playerPicks : [];
  const safeTeamPicks = Array.isArray(teamPicks) ? teamPicks : [];
  const totalPicks = safePlayerPicks.length + safeTeamPicks.length;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  // Respect the admin's global lock switch and configurable minimum.
  const { data: settings } = await supabase
    .from("event_settings")
    .select("picks_locked, min_picks")
    .eq("id", 1)
    .single();

  if (settings?.picks_locked) {
    return NextResponse.json(
      { error: "Picks are locked for this event." },
      { status: 403 }
    );
  }

  const minPicks = settings?.min_picks ?? 3;
  if (totalPicks < minPicks) {
    return NextResponse.json(
      { error: `You need at least ${minPicks} picks.` },
      { status: 400 }
    );
  }

  // Make sure none of the submitted player props are individually locked.
  if (safePlayerPicks.length > 0) {
    const propIds = safePlayerPicks.map((p) => p.propId);
    const { data: propRows, error: propsError } = await supabase
      .from("props")
      .select("id, locked, active")
      .in("id", propIds);

    if (propsError) {
      return NextResponse.json({ error: propsError.message }, { status: 500 });
    }
    if (propRows?.some((p) => p.locked || !p.active)) {
      return NextResponse.json(
        { error: "One or more of your picks is no longer available." },
        { status: 409 }
      );
    }
  }

  // Same check for team-level props.
  if (safeTeamPicks.length > 0) {
    const teamPropIds = safeTeamPicks.map((p) => p.teamPropId);
    const { data: teamPropRows, error: teamPropsError } = await supabase
      .from("team_props")
      .select("id, locked, active")
      .in("id", teamPropIds);

    if (teamPropsError) {
      return NextResponse.json({ error: teamPropsError.message }, { status: 500 });
    }
    if (teamPropRows?.some((p) => p.locked || !p.active)) {
      return NextResponse.json(
        { error: "One or more of your picks is no longer available." },
        { status: 409 }
      );
    }
  }

  const { data: user, error: userError } = await supabase
    .from("app_users")
    .insert({
      name,
      instagram_username: instagram_username || null,
      email: email || null,
    })
    .select()
    .single();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  let submissionCode = generateSubmissionCode();
  let submission = null;
  for (let attempt = 0; attempt < 5 && !submission; attempt++) {
    const { data, error: subError } = await supabase
      .from("submissions")
      .insert({
        user_id: user.id,
        submission_code: submissionCode,
        pick_count: totalPicks,
        prize_tier: tierForCount(totalPicks),
      })
      .select()
      .single();
    if (!subError) {
      submission = data;
    } else if (subError.code === "23505") {
      submissionCode = generateSubmissionCode();
    } else {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }
  }

  if (!submission) {
    return NextResponse.json(
      { error: "Could not generate a submission code. Try again." },
      { status: 500 }
    );
  }

  if (safePlayerPicks.length > 0) {
    const pickRows = safePlayerPicks.map((p) => ({
      submission_id: submission.id,
      prop_id: p.propId,
      selection: p.selection,
    }));
    const { error: picksError } = await supabase.from("picks").insert(pickRows);
    if (picksError) {
      return NextResponse.json({ error: picksError.message }, { status: 500 });
    }
  }

  if (safeTeamPicks.length > 0) {
    const teamPickRows = safeTeamPicks.map((p) => ({
      submission_id: submission.id,
      team_prop_id: p.teamPropId,
      selection: p.selection,
    }));
    const { error: teamPicksError } = await supabase
      .from("team_picks")
      .insert(teamPickRows);
    if (teamPicksError) {
      return NextResponse.json({ error: teamPicksError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ submissionCode: submission.submission_code });
}
