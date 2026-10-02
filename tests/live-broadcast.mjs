import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
const db = new PGlite();
await db.exec(`CREATE TABLE players(id uuid PRIMARY KEY,active boolean NOT NULL DEFAULT true);
CREATE TABLE live_box_score(id uuid DEFAULT gen_random_uuid(),player_id uuid REFERENCES players(id),stat_type text,value numeric NOT NULL DEFAULT 0,updated_at timestamptz DEFAULT now(),UNIQUE(player_id,stat_type));
INSERT INTO players(id) VALUES('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`);
const migration = readFileSync(
  new URL("../migrations/20261002-live-broadcast.sql", import.meta.url),
  "utf8",
);
await db.exec(migration);
await db.exec(migration);
const p = "00000000-0000-0000-0000-000000000001";
const action = "10000000-0000-0000-0000-000000000001";
const shot = {
  points: 3,
  field_goals_made: 1,
  field_goals_attempted: 1,
  three_pt_made: 1,
  three_pt_attempted: 1,
};
async function record(id, deltas, player = p) {
  await db.query("SELECT record_live_action($1,$2,$3::jsonb,$4)", [
    id,
    player,
    JSON.stringify(deltas),
    "Made three",
  ]);
}
async function stats() {
  return Object.fromEntries(
    (
      await db.query(
        "SELECT stat_type,value FROM live_box_score WHERE player_id=$1",
        [p],
      )
    ).rows.map((r) => [r.stat_type, Number(r.value)]),
  );
}
await record(action, shot);
assert.deepEqual(await stats(), shot);
await record(action, shot);
assert.deepEqual(await stats(), shot, "retry must not duplicate");
await assert.rejects(
  record("10000000-0000-0000-0000-000000000002", { points: 2, rebounds: -1 }),
);
assert.deepEqual(await stats(), shot, "partial action must roll back");
await assert.rejects(
  record("10000000-0000-0000-0000-000000000003", { unknown: 1 }),
);
await assert.rejects(
  record("10000000-0000-0000-0000-000000000004", { points: 0.5 }),
);
await Promise.all(
  Array.from({ length: 10 }, (_, i) =>
    record(`20000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`, {
      rebounds: 1,
    }),
  ),
);
assert.equal(
  (await stats()).rebounds,
  10,
  "concurrent updates must not overwrite",
);
await db.query("SELECT undo_live_action($1)", [action]);
assert.equal((await stats()).points, 0);
await db.query("SELECT undo_live_action($1)", [action]);
assert.equal((await stats()).points, 0, "undo retry must be idempotent");
await db.exec("UPDATE broadcast_state SET status='final' WHERE id=1");
await assert.rejects(
  record("30000000-0000-0000-0000-000000000001", { points: 2 }),
);
await assert.rejects(
  db.query("SELECT undo_live_action($1)", [
    "20000000-0000-0000-0000-000000000001",
  ]),
);
await db.exec("UPDATE broadcast_state SET status='live' WHERE id=1");
await record("30000000-0000-0000-0000-000000000001", { points: 2 });
assert.equal((await stats()).points, 2);
const revision = (await db.query("SELECT revision FROM broadcast_state"))
  .rows[0].revision;
const first = await db.query(
  "UPDATE broadcast_state SET period=2,revision=revision+1 WHERE revision=$1 RETURNING id",
  [revision],
);
const stale = await db.query(
  "UPDATE broadcast_state SET period=3,revision=revision+1 WHERE revision=$1 RETURNING id",
  [revision],
);
assert.equal(first.rows.length, 1);
assert.equal(stale.rows.length, 0, "stale controls must not overwrite");
console.log(
  "PASS: repeatable migration, atomic shot, idempotent retry, rollback, invalid input, concurrent increments, undo, final lock, reopen, stale control conflict",
);
function loadTs(path, dependencies) {
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
    process: { env: { ADMIN_SESSION_SECRET: "local-test-only" } },
    Buffer,
    Date,
  });
  return exports;
}
const auth = loadTs("../lib/broadcast.ts", {
  "server-only": {},
  "node:crypto": crypto,
  "@/lib/db": {},
  "@/lib/playerImages": {},
});
const token = auth.broadcastToken(1);
assert.equal(auth.validBroadcastToken(token, 1), true);
assert.equal(auth.validBroadcastToken(token, 2), false);
assert.equal(auth.validBroadcastToken(token + "x", 1), false);
assert.equal(auth.validBroadcastToken("1.0." + "a".repeat(64), 1), false);
assert.equal(auth.validBroadcastToken("bad", 1), false);
const live = loadTs("../lib/live.ts", {});
assert.equal(live.validDeltas({ points: 3, three_pt_made: 1 }), true);
assert.equal(live.validDeltas({ points: 0.5 }), false);
assert.equal(live.validDeltas({ not_a_stat: 1 }), false);
assert.equal(live.validDeltas({ points: 101 }), false);
assert.equal(live.validDeltas([]), false);
assert.equal(
  live.clockRemaining(
    {
      clock_seconds: 60,
      clock_running: true,
      clock_started_at: new Date(1000).toISOString(),
    },
    11000,
  ),
  50,
);
assert.equal(
  live.clockRemaining(
    { clock_seconds: 60, clock_running: false, clock_started_at: null },
    11000,
  ),
  60,
);
assert.equal(live.formatClock(272), "4:32");
console.log(
  "PASS: read-only token signing, tamper rejection, expiry, revocation version, delta validation, anchored clock",
);

await db.exec(`CREATE TABLE teams(id uuid PRIMARY KEY,name text,slug text);
INSERT INTO teams VALUES('40000000-0000-0000-0000-000000000001','YoungKnights','youngknights');
ALTER TABLE players ADD COLUMN name text DEFAULT 'Sample player';
ALTER TABLE players ADD COLUMN image_url text;
ALTER TABLE players ADD COLUMN team_id uuid DEFAULT '40000000-0000-0000-0000-000000000001';`);
const database = {
  query: async (sql, params = []) => (await db.query(sql, params)).rows,
};
const realBroadcast = loadTs("../lib/broadcast.ts", {
  "server-only": {},
  "node:crypto": crypto,
  "@/lib/db": database,
  "@/lib/playerImages": { getLocalPlayerImage: () => null },
});
const publicRoute = loadTs("../app/api/broadcast/route.ts", {
  "next/server": { NextRequest, NextResponse },
  "@/lib/broadcast": realBroadcast,
});
const invalid = await publicRoute.GET(
  new NextRequest("http://localhost/api/broadcast"),
);
assert.equal(invalid.status, 401);
const readToken = realBroadcast.broadcastToken(1);
const response = await publicRoute.GET(
  new NextRequest("http://localhost/api/broadcast", {
    headers: { Authorization: `Bearer ${readToken}` },
  }),
);
assert.equal(response.status, 200);
const snapshot = await response.json();
assert.equal(snapshot.scores.youngknights, 2);
assert.equal("token_version" in snapshot.state, false);
assert.equal("token" in snapshot, false);
await db.exec("UPDATE broadcast_state SET token_version=2");
const revoked = await publicRoute.GET(
  new NextRequest("http://localhost/api/broadcast", {
    headers: { Authorization: `Bearer ${readToken}` },
  }),
);
assert.equal(revoked.status, 401);
const adminRoute = loadTs("../app/api/admin/live-stats/route.ts", {
  "next/server": { NextRequest, NextResponse },
  "@/lib/adminAuth": { requireAdmin: async () => ({ ok: false, status: 401 }) },
  "@/lib/db": database,
  "@/lib/live": live,
  "@/lib/broadcast": realBroadcast,
});
const denied = await adminRoute.POST(
  new NextRequest("http://localhost/api/admin/live-stats", {
    method: "POST",
    body: JSON.stringify({ eventId: action, undo: true }),
  }),
);
assert.equal(denied.status, 401);
console.log(
  "PASS: actual broadcast route reads consistent scores, rejects missing/revoked tokens, strips control secrets; staff API rejects unauthenticated writes",
);
await db.close();
