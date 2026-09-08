-- ---------------------------------------------------------------------------
-- Storage buckets
--
-- Two public-read buckets. Public read is deliberate: these images are served
-- on the marketing site and are cached at the CDN. Writes are admin-only.
--
--   host-photos  hosts.photo_path
--   thumbnails   episodes.thumbnail_path, clips.thumbnail_path
--
-- Paths are stored in the database as bucket-relative keys, e.g. "renata.jpg".
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('host-photos', 'host-photos', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('thumbnails', 'thumbnails', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read an object in these two buckets; nothing else is exposed.
create policy site_images_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('host-photos', 'thumbnails'));

create policy site_images_admin_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('host-photos', 'thumbnails') and public.is_admin());

create policy site_images_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id in ('host-photos', 'thumbnails') and public.is_admin())
  with check (bucket_id in ('host-photos', 'thumbnails') and public.is_admin());

create policy site_images_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('host-photos', 'thumbnails') and public.is_admin());
