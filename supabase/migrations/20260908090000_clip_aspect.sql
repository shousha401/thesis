-- ---------------------------------------------------------------------------
-- Clip aspect ratio
--
-- A clip's card should be framed the way the video actually is: 9:16 for a
-- Short, Reel or TikTok, 16:9 for an ordinary YouTube video. Deriving that at
-- render time would mean re-parsing the URL on every request and would still
-- guess wrong for an uploaded thumbnail, so it is stored on the row: derived
-- when the clip is saved, and editable in the admin when the guess is wrong.
--
-- Episodes are always 16:9 and do not need this.
-- ---------------------------------------------------------------------------

alter table public.clips
  add column if not exists aspect text not null default 'portrait';

alter table public.clips
  drop constraint if exists clips_aspect_valid;

alter table public.clips
  add constraint clips_aspect_valid check (aspect in ('portrait', 'landscape'));

comment on column public.clips.aspect is
  'How the card frames the thumbnail: portrait (9:16) or landscape (16:9). Derived from the video URL on save, overridable in the admin.';

-- Existing rows: anything vertical by provider or a /shorts/ URL is portrait,
-- everything else landscape.
update public.clips
set aspect = case
  when video_provider in ('instagram', 'tiktok') then 'portrait'
  when video_url like '%/shorts/%' then 'portrait'
  else 'landscape'
end;
