-- ============================================================
-- SCE PICKS — Storage policies
-- Run this AFTER you create a PUBLIC bucket named "player-photos"
-- in Supabase Dashboard -> Storage.
-- Uploads/replaces/deletes only happen through admin API routes
-- (using the service_role key), so public write access is not
-- granted here — only public read, so player photos display.
-- ============================================================

create policy "public read player photos"
on storage.objects for select
using (bucket_id = 'player-photos');
