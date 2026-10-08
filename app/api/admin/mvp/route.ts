import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const votes = await query<{
    id: string;
    name: string;
    team_name: string;
    team_slug: string;
    votes: number;
  }>(`
    SELECT p.id,p.name,t.name AS team_name,t.slug AS team_slug,count(v.id)::int AS votes
    FROM players p
    JOIN teams t ON t.id=p.team_id
    LEFT JOIN mvp_votes v ON v.player_id=p.id
    WHERE p.active=true
    GROUP BY p.id,p.name,t.name,t.slug
    ORDER BY votes DESC,p.name ASC
  `);

  const [{ total }] = await query<{ total: number }>("SELECT count(*)::int AS total FROM mvp_votes");
  return NextResponse.json({ votes, total, leader: votes[0]?.votes > 0 ? votes[0] : null });
}
