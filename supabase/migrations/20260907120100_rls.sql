-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Two rules, applied to every table:
--   1. The public (anon + signed-in non-admins) may read published content only.
--   2. A signed-in user whose email is in `admins` may do anything.
--
-- Nothing is writable by the public. No table is left with RLS off.
-- ---------------------------------------------------------------------------

-- The admin check. SECURITY DEFINER so it can read auth.users and so it does
-- not recurse through the RLS policies on public.admins.
--
-- The email is taken from auth.users rather than the JWT claim: auth.users is
-- the record the auth system actually verified, and it cannot be spoofed by a
-- hand-crafted token.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins       enable row level security;
alter table public.hosts        enable row level security;
alter table public.episodes     enable row level security;
alter table public.clips        enable row level security;
alter table public.live_events  enable row level security;
alter table public.site_settings enable row level security;

-- admins --------------------------------------------------------------------
-- Never public. Admins may read the list so the UI can show who has access;
-- rows are added by hand in the SQL editor (see supabase/seed_admins.sql).

create policy admins_read_by_admins
  on public.admins for select
  to authenticated
  using (public.is_admin());

create policy admins_write_by_admins
  on public.admins for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- hosts ---------------------------------------------------------------------

create policy hosts_public_read
  on public.hosts for select
  to anon, authenticated
  using (true);

create policy hosts_admin_write
  on public.hosts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- episodes ------------------------------------------------------------------

create policy episodes_public_read
  on public.episodes for select
  to anon, authenticated
  using (is_published and deleted_at is null);

create policy episodes_admin_all
  on public.episodes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- clips ---------------------------------------------------------------------

create policy clips_public_read
  on public.clips for select
  to anon, authenticated
  using (is_published and deleted_at is null);

create policy clips_admin_all
  on public.clips for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- live_events ---------------------------------------------------------------

create policy live_events_public_read
  on public.live_events for select
  to anon, authenticated
  using (true);

create policy live_events_admin_all
  on public.live_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- site_settings -------------------------------------------------------------

create policy site_settings_public_read
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy site_settings_admin_all
  on public.site_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
