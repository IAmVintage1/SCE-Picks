import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { actionLogCsv, type ActionLogRow } from "@/lib/actionLogExport";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  try {
    const actions = await query<ActionLogRow>(`
      SELECT e.id, e.player_id, p.name AS player_name, t.name AS team_name,
             e.label, e.deltas, e.created_at, e.reversed_at
      FROM live_stat_events e
      LEFT JOIN players p ON p.id = e.player_id
      LEFT JOIN teams t ON t.id = p.team_id
      ORDER BY e.created_at ASC, e.id ASC
    `);
    return new Response(actionLogCsv(actions), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sce-picks-action-logs.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Action logs could not be exported. Please try again." }, { status: 503 });
  }
}
