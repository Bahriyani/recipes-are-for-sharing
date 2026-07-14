-- Milestone 2.0: anonymous-auth ownership for new Recipe Memories.
-- Existing demo records retain user_id = NULL and remain publicly readable.

alter table public.recipe_memories
  alter column user_id set default auth.uid();

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'recipe_memories_user_id_fkey'
      and conrelid = 'public.recipe_memories'::regclass
  ) then
    alter table public.recipe_memories
      drop constraint recipe_memories_user_id_fkey;
  end if;

  alter table public.recipe_memories
    add constraint recipe_memories_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete set null;
end
$$;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'recipe-photos') then
    raise exception 'Expected existing storage bucket recipe-photos was not found';
  end if;
end
$$;

update storage.buckets
set public = true,
    file_size_limit = 6291456,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'recipe-photos';

drop policy if exists "recipe_memories_v1_write" on public.recipe_memories;
drop policy if exists "recipe_memories_public_read" on public.recipe_memories;
create policy "recipe_memories_public_read"
on public.recipe_memories for select to public using (true);

drop policy if exists "recipe_memories_owner_insert" on public.recipe_memories;
create policy "recipe_memories_owner_insert"
on public.recipe_memories for insert to authenticated
with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "recipe_memories_owner_update" on public.recipe_memories;
create policy "recipe_memories_owner_update"
on public.recipe_memories for update to authenticated
using (auth.uid() is not null and user_id = auth.uid())
with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "recipe_memories_owner_delete" on public.recipe_memories;
create policy "recipe_memories_owner_delete"
on public.recipe_memories for delete to authenticated
using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "recipe_photos_v1_anonymous_insert" on storage.objects;

drop policy if exists "recipe_photos_owner_insert" on storage.objects;
create policy "recipe_photos_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "recipe_photos_owner_update" on storage.objects;
create policy "recipe_photos_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "recipe_photos_owner_delete" on storage.objects;
create policy "recipe_photos_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
