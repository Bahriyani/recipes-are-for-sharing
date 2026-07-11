-- Sprint 1: allow anonymous visitors to upload a photo for a public recipe memory.
-- Reads are public because the `recipe-photos` bucket itself is configured as public.

drop policy if exists "recipe_photos_v1_anonymous_insert" on storage.objects;

create policy "recipe_photos_v1_anonymous_insert"
on storage.objects
for insert
to anon
with check (bucket_id = 'recipe-photos');
