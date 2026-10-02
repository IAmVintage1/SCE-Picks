import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";
import { getLocalPlayerImage } from "@/lib/playerImages";
import type { BroadcastState, LivePlayer, LiveSnapshot } from "@/lib/live";
function signature(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret is not configured");
  return createHmac("sha256", secret)
    .update(`sce-broadcast:${payload}`)
    .digest("hex");
}
export function broadcastToken(version: number) {
  const payload = `${version}.${Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30}`;
  return `${payload}.${signature(payload)}`;
}
export function validBroadcastToken(token: string, version: number) {
  const [v, expiry, sig, ...extra] = token.split(".");
  if (
    extra.length ||
    Number(v) !== version ||
    !/^\d+$/.test(expiry || "") ||
    Number(expiry) < Date.now() / 1000 ||
    !/^[a-f0-9]{64}$/.test(sig || "")
  )
    return false;
  return timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(signature(`${v}.${expiry}`), "hex"),
  );
}
export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  // Single statement gives score and control data a consistent database snapshot.
  const rows = await query<{
    state: BroadcastState;
    players: LivePlayer[];
    server_time: number;
  }>(`
 SELECT row_to_json(b) AS state, extract(epoch from now())::float8*1000 AS server_time,
 coalesce((SELECT json_agg(x ORDER BY x.name) FROM (
 SELECT p.id,p.name,p.image_url,json_build_object('id',t.id,'name',t.name,'slug',t.slug) AS team,
 coalesce((SELECT jsonb_object_agg(s.stat_type,s.value) FROM live_box_score s WHERE s.player_id=p.id),'{}'::jsonb) AS stats
 FROM players p JOIN teams t ON t.id=p.team_id WHERE p.active=true AND t.slug IN ('youngknights','alumknights')
 ) x),'[]'::json) AS players FROM broadcast_state b WHERE b.id=1`);
  if (!rows[0]) throw new Error("Run the live broadcast migration first.");
  const { state, players, server_time } = rows[0];
  const scores: Record<string, number> = { youngknights: 0, alumknights: 0 };
  for (const player of players) {
    player.image_url = getLocalPlayerImage(player.name) ?? player.image_url;
    scores[player.team.slug] += Number(player.stats.points || 0);
  }
  return { state, players, scores, serverTime: server_time };
}
