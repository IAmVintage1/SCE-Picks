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

const STAT_LABELS: Record<string, string> = {
  points: "POINTS",
  rebounds: "REBOUNDS",
  assists: "ASSISTS",
  three_pt_made: "3-PT MADE",
  steals: "STEALS",
  blocks: "BLOCKS",
  turnovers: "TURNOVERS",
  points_rebounds: "PTS + REB",
  points_assists: "PTS + AST",
  rebounds_assists: "REB + AST",
  rebounds_blocks: "REB + BLK",
  pra: "PTS + REB + AST",
};

type NotificationPick = {
  title: string;
  subtitle: string;
  selection: string;
  teamSlug: string | null;
};

function renderPickCard(pick: NotificationPick) {
  const isYoung = pick.teamSlug === "youngknights";
  const isAlum = pick.teamSlug === "alumknights";
  const accent = isYoung ? "#ff594f" : isAlum ? "#5d8dff" : "#8fa6d8";
  const glow = isYoung
    ? "rgba(255,89,79,.16)"
    : isAlum
      ? "rgba(93,141,255,.16)"
      : "rgba(143,166,216,.12)";

  return `
    <div style="margin:0 0 10px;border:1px solid #252a36;border-radius:14px;background:#0d1017;overflow:hidden">
      <div style="height:3px;background:${accent}"></div>
      <div style="padding:15px 16px;background:linear-gradient(135deg,${glow},rgba(13,16,23,0) 60%)">
        <div style="font-size:15px;line-height:20px;font-weight:800;color:#f7f4ee;letter-spacing:.2px">${escapeHtml(pick.title)}</div>
        <div style="margin-top:4px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.4px;color:#7f8797">${escapeHtml(pick.subtitle)}</div>
        <div style="margin-top:11px;display:inline-block;padding:7px 10px;border:1px solid ${accent};border-radius:999px;background:${glow};font-size:11px;line-height:11px;font-weight:900;letter-spacing:1.2px;color:${accent}">${escapeHtml(pick.selection)}</div>
      </div>
    </div>
  `;
}

async function sendSubmissionNotification({
  name,
  instagramUsername,
  email,
  submissionCode,
  totalPicks,
  playerPickCount,
  teamPickCount,
  picks,
}: {
  name: string;
  instagramUsername: string | null;
  email: string | null;
  submissionCode: string;
  totalPicks: number;
  playerPickCount: number;
  teamPickCount: number;
  picks: NotificationPick[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[SCE Picks] RESEND_API_KEY is not configured; skipping submission email.");
    return;
  }

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
  const pickCards = picks.map(renderPickCard).join("");
  const pickText = picks.length
    ? picks.map((pick) => `${pick.title} — ${pick.subtitle} — ${pick.selection}`).join("\n")
    : "Pick details unavailable.";

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
        subject: `SCE Picks — ${name} locked a ${totalPicks}-pick card`,
        text: [
          "NEW SCE PICKS SUBMISSION",
          "",
          `${totalPicks} PICKS LOCKED`,
          `Card code: ${submissionCode}`,
          "",
          `Name: ${name}`,
          `Instagram: ${instagramUsername || "Not provided"}`,
          `Email: ${email || "Not provided"}`,
          `Submitted: ${submittedAt} ET`,
          "",
          "PICKS",
          pickText,
          "",
          `${playerPickCount} player picks • ${teamPickCount} game picks`,
        ].join("\n"),
        html: `
          <div style="margin:0;padding:0;background:#05070d;font-family:Arial,Helvetica,sans-serif;color:#f7f4ee">
            <div style="max-width:620px;margin:0 auto;padding:24px 14px">
              <div style="overflow:hidden;border:1px solid #1d2230;border-radius:22px;background:#090c12;box-shadow:0 18px 60px rgba(0,0,0,.35)">
                <div style="padding:28px 24px 24px;background:radial-gradient(circle at top right,rgba(72,111,255,.18),transparent 42%),#090c12">
                  <div style="font-size:12px;line-height:16px;font-weight:900;letter-spacing:3px;color:#7197ef">SCE PICKS</div>
                  <div style="margin-top:20px;font-size:10px;line-height:14px;font-weight:900;letter-spacing:2px;color:#707889">NEW SUBMISSION</div>
                  <div style="margin-top:6px;font-size:34px;line-height:38px;font-weight:900;letter-spacing:-1px;color:#f7f4ee">${totalPicks} PICKS LOCKED</div>
                  <div style="margin-top:10px;display:inline-block;padding:8px 11px;border:1px solid #33405f;border-radius:999px;background:#101625;font-size:12px;line-height:12px;font-weight:900;letter-spacing:1.4px;color:#9bb7ff">${safeCode}</div>
                </div>

                <div style="padding:0 24px 24px">
                  <div style="margin-top:2px;padding:16px;border:1px solid #202633;border-radius:14px;background:#0d1119">
                    <div style="font-size:17px;line-height:22px;font-weight:900;color:#f7f4ee">${safeName}</div>
                    <div style="margin-top:5px;font-size:13px;line-height:19px;color:#8e96a7">${safeInstagram}</div>
                    <div style="font-size:13px;line-height:19px;color:#8e96a7">${safeEmail}</div>
                    <div style="margin-top:9px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:.7px;color:#656d7d">${submittedAt} ET</div>
                  </div>

                  <div style="margin:24px 0 10px;font-size:10px;line-height:14px;font-weight:900;letter-spacing:2px;color:#6f7787">LOCKED PICKS</div>
                  ${pickCards || `<div style="padding:16px;border:1px solid #202633;border-radius:14px;background:#0d1119;color:#818999;font-size:13px">Pick details unavailable.</div>`}

                  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1c2230;text-align:center;font-size:10px;line-height:16px;font-weight:800;letter-spacing:1.2px;color:#646d7d">
                    ${playerPickCount} PLAYER PICKS &nbsp;•&nbsp; ${teamPickCount} GAME PICKS
                  </div>
                </div>
              </div>
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

  let playerPropRows: any[] = [];
  if (safePlayerPicks.length > 0) {
    const propIds = safePlayerPicks.map((p) => p.propId);
    const { data: propRows, error: propsError } = await supabase
      .from("props")
      .select("id, locked, active, stat_type, line, player:players(name, team:teams(name, slug))")
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
    playerPropRows = propRows ?? [];
  }

  let teamPropRows: any[] = [];
  if (safeTeamPicks.length > 0) {
    const teamPropIds = safeTeamPicks.map((p) => p.teamPropId);
    const { data: rows, error: teamPropsError } = await supabase
      .from("team_props")
      .select("id, locked, active, prop_type, line")
      .in("id", teamPropIds);

    if (teamPropsError) {
      return NextResponse.json({ error: teamPropsError.message }, { status: 500 });
    }
    if (rows?.some((p) => p.locked || !p.active)) {
      return NextResponse.json(
        { error: "One or more of your picks is no longer available." },
        { status: 409 }
      );
    }
    teamPropRows = rows ?? [];
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

  const notificationPicks: NotificationPick[] = [];

  for (const pick of safePlayerPicks) {
    const prop = playerPropRows.find((row) => row.id === pick.propId);
    if (!prop) continue;
    const player = Array.isArray(prop.player) ? prop.player[0] : prop.player;
    const team = player ? (Array.isArray(player.team) ? player.team[0] : player.team) : null;
    notificationPicks.push({
      title: player?.name || "PLAYER PROP",
      subtitle: `${STAT_LABELS[prop.stat_type] || String(prop.stat_type).replace(/_/g, " ").toUpperCase()} · ${prop.line}`,
      selection: pick.selection === "over" ? "MORE" : "LESS",
      teamSlug: team?.slug || null,
    });
  }

  for (const pick of safeTeamPicks) {
    const prop = teamPropRows.find((row) => row.id === pick.teamPropId);
    if (!prop) continue;
    if (prop.prop_type === "winning_team") {
      const winner = pick.selection === "youngknights" ? "YOUNGKNIGHTS" : "ALUMKNIGHTS";
      notificationPicks.push({
        title: "WINNING TEAM",
        subtitle: "GAME PROP",
        selection: winner,
        teamSlug: pick.selection === "youngknights" || pick.selection === "alumknights" ? pick.selection : null,
      });
    } else {
      notificationPicks.push({
        title: "COMBINED POINTS",
        subtitle: `TOTAL · ${prop.line}`,
        selection: pick.selection.toUpperCase(),
        teamSlug: null,
      });
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
    picks: notificationPicks,
  });

  return NextResponse.json({ submissionCode: submission.submission_code });
}
