-- ---------------------------------------------------------------------------
-- She's Got a Thesis - initial schema
-- ---------------------------------------------------------------------------

-- Helpers -------------------------------------------------------------------

-- Keeps updated_at honest without the app having to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lowercase, accent-folded, hyphenated. Accents are folded rather than dropped
-- so titles with Spanish characters still produce readable slugs.
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(
    both '-' from
    regexp_replace(
      lower(
        translate(
          coalesce(value, ''),
          'áàâäãåéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ',
          'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- BEFORE INSERT on episodes/clips: derive the slug from the title and resolve
-- collisions with a numeric suffix.
create or replace function public.assign_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  n int := 1;
  taken boolean;
begin
  base := nullif(public.slugify(coalesce(nullif(new.slug, ''), new.title)), '');
  if base is null then
    base := 'untitled';
  end if;

  candidate := base;
  loop
    execute format('select exists (select 1 from public.%I where slug = $1)', tg_table_name)
      into taken
      using candidate;
    exit when not taken;
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

-- BEFORE UPDATE: published URLs are permanent, so the slug never moves.
create or replace function public.freeze_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug := old.slug;
  return new;
end;
$$;

-- Tables --------------------------------------------------------------------

create table if not exists public.admins (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now(),
  constraint admins_email_lowercase check (email = lower(email))
);

comment on table public.admins is
  'Allow-list of emails permitted to sign in to /admin. Seeded by hand in the SQL editor.';

create table if not exists public.hosts (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  zodiac     text,
  bio        text not null default '',
  photo_path text,
  photo_alt  text,
  socials    jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Accessibility: an uploaded photo must carry alt text.
  constraint hosts_photo_alt_required check (
    photo_path is null or coalesce(btrim(photo_alt), '') <> ''
  )
);

create table if not exists public.episodes (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  episode_number int not null,
  season         int,
  title          text not null,
  description    text not null default '',
  video_url      text not null,
  video_provider text not null,
  video_id       text not null,
  thumbnail_path text,
  thumbnail_alt  text,
  listen_links   jsonb not null default '{}'::jsonb,
  published_at   timestamptz,
  is_published   boolean not null default false,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint episodes_provider_valid check (
    video_provider in ('youtube', 'instagram', 'tiktok', 'other')
  ),
  constraint episodes_thumbnail_alt_required check (
    thumbnail_path is null or coalesce(btrim(thumbnail_alt), '') <> ''
  ),
  constraint episodes_published_needs_date check (
    is_published = false or published_at is not null
  )
);

create table if not exists public.clips (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  caption        text not null default '',
  video_url      text not null,
  video_provider text not null,
  video_id       text not null,
  thumbnail_path text,
  thumbnail_alt  text,
  episode_id     uuid references public.episodes (id) on delete set null,
  published_at   timestamptz,
  is_published   boolean not null default false,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint clips_provider_valid check (
    video_provider in ('youtube', 'instagram', 'tiktok', 'other')
  ),
  constraint clips_thumbnail_alt_required check (
    thumbnail_path is null or coalesce(btrim(thumbnail_alt), '') <> ''
  ),
  constraint clips_published_needs_date check (
    is_published = false or published_at is not null
  )
);

create table if not exists public.live_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  platform     text not null,
  url          text not null,
  scheduled_at timestamptz not null,
  status       text not null default 'scheduled',
  replay_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint live_events_platform_valid check (
    platform in ('youtube', 'instagram', 'tiktok', 'other')
  ),
  constraint live_events_status_valid check (
    status in ('scheduled', 'live', 'ended')
  )
);

create table if not exists public.site_settings (
  id             int primary key default 1,
  platform_links jsonb not null default '{}'::jsonb,
  social_links   jsonb not null default '{}'::jsonb,
  how_we_met     text not null default '',
  about_body     text not null default '',
  updated_at     timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

-- Indexes -------------------------------------------------------------------

create index if not exists episodes_feed_idx
  on public.episodes (published_at desc nulls last)
  where is_published and deleted_at is null;

create index if not exists episodes_season_idx
  on public.episodes (season, episode_number desc)
  where deleted_at is null;

create index if not exists clips_feed_idx
  on public.clips (published_at desc nulls last)
  where is_published and deleted_at is null;

create index if not exists clips_episode_idx
  on public.clips (episode_id)
  where deleted_at is null;

create index if not exists live_events_schedule_idx
  on public.live_events (scheduled_at desc);

create index if not exists hosts_sort_idx
  on public.hosts (sort_order, name);

-- Triggers ------------------------------------------------------------------

create trigger hosts_set_updated_at
  before update on public.hosts
  for each row execute function public.set_updated_at();

create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

create trigger clips_set_updated_at
  before update on public.clips
  for each row execute function public.set_updated_at();

create trigger live_events_set_updated_at
  before update on public.live_events
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger episodes_assign_slug
  before insert on public.episodes
  for each row execute function public.assign_slug();

create trigger clips_assign_slug
  before insert on public.clips
  for each row execute function public.assign_slug();

-- Note: hosts are deliberately NOT frozen. Host slugs stay editable from the
-- admin so a name can be corrected before launch; /hosts/[slug] is low-traffic
-- and not the kind of URL that gets shared or indexed the way an episode is.
create trigger episodes_freeze_slug
  before update on public.episodes
  for each row execute function public.freeze_slug();

create trigger clips_freeze_slug
  before update on public.clips
  for each row execute function public.freeze_slug();
