-- ============================================================
-- STEP 8 — adds a free-text "bio" field per player so a full
-- hype writeup can live on the profile screen, alongside the
-- existing short storyline tags (bio_tags). Safe to re-run.
--
-- After running this, go to Admin -> Players to type or paste
-- a bio for each player. Until you do, the profile screen shows
-- a short auto-generated line built from that player's own
-- featured prop line instead, so it never looks empty.
-- ============================================================

alter table players add column if not exists bio text;
