-- Sprint B Phase 1: additive recipe asset capability foundation.

create table if not exists public.recipe_assets (
  id uuid primary key default gen_random_uuid(),
  recipe_memory_id uuid not null references public.recipe_memories(id) on delete cascade,
  asset_type text not null default 'image',
  storage_bucket text not null default 'recipe-photos',
  storage_path text not null,
  mime_type text not null,
  byte_size bigint,
  display_order integer not null default 0,
  is_cover boolean not null default false,
  processing_status text not null default 'ready',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_assets_display_order_check check (display_order >= 0),
  constraint recipe_assets_byte_size_check check (byte_size is null or byte_size >= 0),
  constraint recipe_assets_asset_type_check check (asset_type = 'image'),
  constraint recipe_assets_processing_status_check check (processing_status = 'ready'),
  constraint recipe_assets_cover_type_check check (not is_cover or asset_type = 'image'),
  constraint recipe_assets_bucket_path_unique unique (storage_bucket, storage_path),
  constraint recipe_assets_recipe_order_unique unique (recipe_memory_id, display_order)
);

create unique index if not exists recipe_assets_one_cover_per_recipe
  on public.recipe_assets (recipe_memory_id)
  where is_cover = true and asset_type = 'image';

create index if not exists recipe_assets_recipe_type_idx
  on public.recipe_assets (recipe_memory_id, asset_type);

alter table public.recipe_assets enable row level security;

drop policy if exists "recipe_assets_public_read" on public.recipe_assets;
create policy "recipe_assets_public_read"
on public.recipe_assets for select to public using (true);

drop policy if exists "recipe_assets_owner_insert" on public.recipe_assets;
create policy "recipe_assets_owner_insert"
on public.recipe_assets for insert to authenticated
with check (
  exists (
    select 1 from public.recipe_memories memory
    where memory.id = recipe_memory_id
      and memory.user_id = auth.uid()
  )
  and split_part(storage_path, '/', 1) = auth.uid()::text
);

drop policy if exists "recipe_assets_owner_update" on public.recipe_assets;
create policy "recipe_assets_owner_update"
on public.recipe_assets for update to authenticated
using (
  exists (
    select 1 from public.recipe_memories memory
    where memory.id = recipe_memory_id
      and memory.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recipe_memories memory
    where memory.id = recipe_memory_id
      and memory.user_id = auth.uid()
  )
  and split_part(storage_path, '/', 1) = auth.uid()::text
);

drop policy if exists "recipe_assets_owner_delete" on public.recipe_assets;
create policy "recipe_assets_owner_delete"
on public.recipe_assets for delete to authenticated
using (
  exists (
    select 1 from public.recipe_memories memory
    where memory.id = recipe_memory_id
      and memory.user_id = auth.uid()
  )
);

-- Only confidently shaped Supabase Storage URLs are migrated. Everything else
-- remains available through the legacy photo_url fallback.
insert into public.recipe_assets (
  recipe_memory_id, asset_type, storage_bucket, storage_path, mime_type,
  display_order, is_cover, processing_status
)
select
  memory.id,
  'image',
  'recipe-photos',
  split_part(trim(leading '/' from split_part(memory.photo_url, '/storage/v1/object/public/recipe-photos/', 2)), '/', 1)
    || '/' || split_part(trim(leading '/' from split_part(memory.photo_url, '/storage/v1/object/public/recipe-photos/', 2)), '/', 2),
  case lower(regexp_replace(split_part(split_part(trim(leading '/' from split_part(memory.photo_url, '/storage/v1/object/public/recipe-photos/', 2)), '/', 2), '?', 1), '^.*\.', ''))
    when 'jpg' then 'image/jpeg'
    when 'jpeg' then 'image/jpeg'
    when 'png' then 'image/png'
    when 'webp' then 'image/webp'
  end,
  0,
  true,
  'ready'
from public.recipe_memories memory
where memory.photo_url like '%/storage/v1/object/public/recipe-photos/%'
  and split_part(trim(leading '/' from split_part(memory.photo_url, '/storage/v1/object/public/recipe-photos/', 2)), '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and lower(regexp_replace(split_part(split_part(trim(leading '/' from split_part(memory.photo_url, '/storage/v1/object/public/recipe-photos/', 2)), '/', 2), '?', 1), '^.*\.', '')) in ('jpg', 'jpeg', 'png', 'webp')
on conflict (storage_bucket, storage_path) do nothing;

create or replace function public.replace_recipe_memory_cover_asset(
  p_recipe_memory_id uuid,
  p_asset_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_public_url text,
  p_mime_type text,
  p_byte_size bigint,
  p_recipe_title text,
  p_recipe_details text,
  p_memory_story text,
  p_author_name text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null or not exists (
    select 1 from public.recipe_memories
    where id = p_recipe_memory_id and user_id = owner_id
  ) then
    raise exception 'recipe memory ownership denied';
  end if;

  if p_storage_bucket <> 'recipe-photos'
     or split_part(p_storage_path, '/', 1) <> owner_id::text
     or split_part(p_storage_path, '/', 2) <> p_recipe_memory_id::text
     or split_part(p_storage_path, '/', 3) !~ ('^' || p_asset_id::text || '\.(jpg|png|webp)$')
     or p_public_url is null
     or position('/storage/v1/object/public/recipe-photos/' || p_storage_path in p_public_url) = 0
     or (p_mime_type = 'image/jpeg' and split_part(p_storage_path, '.', 2) <> 'jpg')
     or (p_mime_type = 'image/png' and split_part(p_storage_path, '.', 2) <> 'png')
     or (p_mime_type = 'image/webp' and split_part(p_storage_path, '.', 2) <> 'webp')
     or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'invalid recipe asset identity';
  end if;

  if exists (select 1 from public.recipe_assets where id = p_asset_id) then
    raise exception 'recipe asset id already exists';
  end if;

  update public.recipe_assets
  set is_cover = false,
      display_order = (select coalesce(max(existing.display_order) + 1, 1)
                       from public.recipe_assets existing
                       where existing.recipe_memory_id = p_recipe_memory_id),
      updated_at = now()
  where recipe_memory_id = p_recipe_memory_id and is_cover = true;

  insert into public.recipe_assets (
    id, recipe_memory_id, asset_type, storage_bucket, storage_path,
    mime_type, byte_size, display_order, is_cover, processing_status
  ) values (
    p_asset_id, p_recipe_memory_id, 'image', 'recipe-photos', p_storage_path,
    p_mime_type, p_byte_size, 0, true, 'ready'
  )
  ;

  update public.recipe_memories
  set photo_url = p_public_url,
      recipe_title = p_recipe_title,
      recipe_details = p_recipe_details,
      memory_story = p_memory_story,
      author_name = p_author_name
  where id = p_recipe_memory_id and user_id = owner_id;

  return p_recipe_memory_id;
end;
$$;

revoke all on function public.replace_recipe_memory_cover_asset(uuid, uuid, text, text, text, text, bigint, text, text, text, text) from public;
grant execute on function public.replace_recipe_memory_cover_asset(uuid, uuid, text, text, text, text, bigint, text, text, text, text) to authenticated;
