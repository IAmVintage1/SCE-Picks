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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendSubmissionNotification({
  name,
  instagramUsername,
  email,
  submissionCode,
  totalPicks,
  playerPickCount,
  teamPickCount,
}: {
  name: string;
  instagramUsername: string | null;
  email: string | null;
  submissionCode: string;
  totalPicks: number;
  playerPickCount: number;
  teamPickCount: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[SCE Picks] RESEND_API_KEY is not configured; skipping submission email.");
    return;
  }

  // Resend testing mode can only deliver to the email address that owns the
  // Resend account. Keep this overrideable so production can switch back to
  // the SCE inbox later after a custom sending domain is verified.
  const to = process.env.PICKS_NOTIFICATION_EMAIL || "eazyee543@gmail.com";
  const from = process.env.PICKS_FROM_EMAIL || "SCE Picks <onboarding@resend.dev>";
  const submittedAt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const safeName = escapeHtml(name);
  const safeInstagram = escapeHtml(instagramUsername || "Not provided");
  const safeEmail = escapeHtml(email || "Not provided");
  const safeCode = escapeHtml(submissionCode);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New SCE Picks Submission — ${name} (${totalPicks} picks)`,
        text: [
          "A new SCE Picks card was submitted.",
          "",
          `Name: ${name}`,
          `Instagram: ${instagramUsername || "Not provided"}`,
          `Email: ${email || "Not provided"}`,
          `Card code: ${submissionCode}`,
          `Total picks: ${totalPicks}`,
          `Player picks: ${playerPickCount}`,
          `Game picks: ${teamPickCount}`,
          `Submitted: ${submittedAt} ET`,
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;background:#05070d;color:#f7f4ee;padding:28px;border-radius:18px;max-width:620px;margin:auto">
            <div style="font-size:12px;letter-spacing:2px;color:#7ea8ff;font-weight:700">SCE PICKS</div>
            <h1 style="margin:8px 0 6px;font-size:28px">New card submitted</h1>
            <p style="margin:0 0 24px;color:#a8adba">${totalPicks} picks locked • ${safeCode}</p>
            <table style="width:100%;border-collapse:collapse;font-size:15px">
              <tr><td style="padding:9px 0;color:#8e95a5">Name</td><td style="padding:9px 0;text-align:right;font-weight:700">${safeName}</td></tr>
              <tr><td style="padding:9px 0;color:#8e95a5">Instagram</td><td style="padding:9px 0;text-align:right">${safeInstagram}</td></tr>
              <tr><td style="padding:9px 0;color:#8e95a5">Email</td><td style="padding:9px 0;text-align:right">${safeEmail}</td></tr>
              <tr><td style="padding:9px 0;color:#8e95a5">Player picks</td><td style="padding:9px 0;text-align:right">${playerPickCount}</td></tr>
              <tr><td style="padding:9px 0;color:#8e95a5">Game picks</td><td style="padding:9px 0;text-align:right">${teamPickCount}</td></tr>
              <tr><td style="padding:9px 0;color:#8e95a5">Submitted</td><td style="padding:9px 0;text-align:right">${submittedAt} ET</td></tr>
            </table>
            <div style="margin-top:24px;padding:14px 16px;border:1px solid #25304a;border-radius:12px;background:#0a0f1c">
              <div style="font-size:11px;letter-spacing:1.5px;color:#8e95a5">CARD CODE</div>
              <div style="font-size:24px;font-weight:800;margin-top:4px">${safeCode}</div>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SCE Picks] Submission email failed:", response.status, errorText);
    } else {
      console.info(`[SCE Picks] Submission email sent to ${to}.`);
    }
  } catch (error) {
    console.error("[SCE Picks] Submission email failed:", error);
  }
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

  await sendSubmissionNotification({
    name,
    instagramUsername: instagram_username || null,
    email: email || null,
    submissionCode: submission.submission_code,
    totalPicks,
    playerPickCount: safePlayerPicks.length,
    teamPickCount: safeTeamPicks.length,
  });

  return NextResponse.json({ submissionCode: submission.submission_code });
}
