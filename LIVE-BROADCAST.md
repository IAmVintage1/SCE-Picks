# Live broadcast integration

The existing `/admin/tracker` now records whole shots in a single atomic database action. Its `live_box_score` totals feed the existing box score, provisional Results view, and three new transparent OBS sources. `/admin/live` manages period, clock, graphics and action history. The Results page explicitly finalizes and grades the reviewed game, then locks stat entry. Reopening allows corrections; finalize again after review.

## Activation

1. Test `migrations/20261002-live-broadcast.sql` on a branch of the existing Neon **SCE Picks → production → scepicks** database, then apply the same migration to production. It is additive and preserves current players, stats, results and predictions. It replaces the legacy `bump_live_stat` function so live entry no longer grades cards prematurely. Existing graded results are preserved; use the existing explicitly confirmed Reset Game workflow if clearing practice data is desired.
2. Deploy this branch with the existing `DATABASE_URL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. No extra paid service or environment secret is required. A plain code deployment without the migration cannot use the tracker or finalization routes.
3. Sign in at `/admin/login`, open **Live Broadcast**, and copy the three OBS URLs. They use signed read-only tokens in URL fragments, never admin credentials. Links expire in 30 days; revocation issues a new version and requires replacing links in OBS.
4. Add three OBS Browser Sources at **1920 × 1080**. Leave **Shutdown source when not visible** off. Set the clock to the official gym clock and assign one clock operator. Other staff can enter player stats concurrently.
5. Enter stats in Live Tracker. A make updates points, makes and attempts together. Misses update attempts. Action history provides traceable undo. For an interrupted save, use **Retry previous action**; reusing its ID prevents double counting. Official score corrections can adjust a selected player’s points through a dedicated correction control and are included in action history. One unresolved action blocks more entry in that tab and survives a refresh in session storage. The system does not pretend offline actions have saved.
6. During breaks, select team box scores or a featured player and show the graphic. OBS visibility controls still work independently.
7. Review the box score, then use **Results → Finalize**. This locks stats and publishes final grading in one transaction. Only reopen for corrections and finalize again afterward.

## Recovery and clock behavior

Overlays poll every 1.5 seconds, with request timeouts and retry backoff up to 10 seconds. They keep the last confirmed totals on connection failure and cache the snapshot for refresh recovery. A running clock is anchored to a server timestamp and rendered locally between polls. Connection warnings do not cover the video once a snapshot exists. The staff panel shows connection status. Tokens expire or revoke without exposing a staff sign-in screen.

The original older OBS HTML source was not located. These new SCE red/blue overlays can later accept that design without changing the stats data source. Sample previews at `/overlay/scoreboard?demo=1`, `/overlay/boxscore?demo=1` and `/overlay/player?demo=1` do not touch the database and are labeled as sample data.

## Verification

- `npm run test:live`: PostgreSQL-compatible PGlite executes the migration twice and checks atomic bundled shots, duplicate retries, rollback of partial/invalid actions, concurrent increments, idempotent undo, final-game locking, reopen and stale control revisions.
- Route tests also verify consistent scores, missing/revoked token rejection, omission of control secrets, and rejected unauthenticated stat writes.
- `npx tsc --noEmit` and `npm run build` check the app and new routes.
- Real Neon branch verification passed: repeatable migration, atomic shot entry, retry deduplication, undo, simultaneous trackers, live overlay data, clock/graphic controls, reviewed finalization transaction, final-game locking, reopen/correction and token revocation. Normal reads and atomic writes use Neon HTTP; multi-statement finalization uses a pooled connection.
- Browser verification is pending: the browser automation daemon failed to start and the alternative browser service timed out. Sample previews exist, but visual layout and interactive recovery have not been verified in a running browser.

Remaining production verification: apply and validate on a branch of the actual Neon database, verify deployed staff entry reaches all OBS sources, and rehearse clock sync and Wi-Fi loss at the venue. A local PostgreSQL test does not establish production connectivity or free-tier usage limits.
