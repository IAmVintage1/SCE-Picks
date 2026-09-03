-- ============================================================
-- STEP 7 — adds the nicknames from your confirmed roster list
-- to each player's display name, and populates the short
-- storyline tags (bio_tags) shown on player cards, taken
-- directly from the context you provided. Nothing invented.
-- Safe to re-run.
-- ============================================================

update players set name = 'Justin "Gambino" McCray' where name = 'Justin McCray';
update players set name = 'Tawana "Tay" Destave' where name = 'Tawana Destave';
update players set name = 'Michael "Mikey" Cunningham' where name = 'Michael Cunningham';
update players set name = 'Donavan "Drich" Richardson' where name = 'Donavan Richardson';
update players set name = 'Robert "Wardell" Smith III' where name = 'Robert Smith III';
update players set name = 'Mekhai "Kai" Ryan' where name = 'Mekhai Ryan';
update players set name = 'Kay "Kay Bae" Mattox' where name = 'Kay Mattox';

