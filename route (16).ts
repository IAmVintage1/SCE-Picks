import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

function generateSubmissionCode() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `SCE-${random}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, instagram_username, email, picks } = body as {
    name: string;
    instagram_username: string;
    email: string;
    picks: { propId: string; selection: "over" | "under" }[];
  };

  if (!name || !Array.isArray(picks) || picks.length === 0) {
    return NextResponse.json(
      { error: "Name and at least one pick are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();

  // Respect the admin's global lock switch.
  const { data: settings } = await supabase
    .from("event_settings")
    .select("picks_locked")
    .eq("id", 1)
    .single();

  if (settings?.picks_locked) {
    return NextResponse.json(
      { error: "Picks are locked for this event." },
      { status: 403 }
    );
  }

  // Make sure none of the submitted props are individually locked.
  const propIds = picks.map((p) => p.propId);
  const { data: propRows, error: propsError } = await supabase
    .from("props")
    .select("id, locked, active")
    .in("id", propIds);

  if (propsError) {
    return NextResponse.json({ error: propsError.message }, { status: 500 });
  }

  const lockedOrInactive = propRows?.some((p) => p.locked || !p.active);
  if (lockedOrInactive) {
    return NextResponse.json(
      { error: "One or more of your picks is no longer available." },
      { status: 409 }
    );
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
      .insert({ user_id: user.id, submission_code: submissionCode })
      .select()
      .single();
    if (!subError) {
      submission = data;
    } else if (subError.code === "23505") {
      // unique violation on submission_code, try again
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

  const pickRows = picks.map((p) => ({
    submission_id: submission.id,
    prop_id: p.propId,
    selection: p.selection,
  }));

  const { error: picksError } = await supabase.from("picks").insert(pickRows);
  if (picksError) {
    return NextResponse.json({ error: picksError.message }, { status: 500 });
  }

  return NextResponse.json({ submissionCode: submission.submission_code });
}
