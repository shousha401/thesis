-- ---------------------------------------------------------------------------
-- Seed data
--
-- Purpose: the site looks finished the first time it boots. Every string here
-- is a PLACEHOLDER meant to be replaced from /admin before launch - host names,
-- bios, platform URLs and social handles especially.
--
-- The video URLs are real, public, Creative Commons films (the Blender open
-- movie project) so that embeds genuinely work in development. Replace them
-- with real episodes.
--
-- Their thumbnails, however, are crops of this show's own cover art rather than
-- the films' own artwork: a demo should not display someone else's images.
-- Generate them with `python scripts/build-placeholders.py`. A path starting
-- with "/" is served from /public rather than from Supabase storage.
--
-- Safe to run more than once: each block is skipped if that table already has
-- rows, so re-running never duplicates content.
-- ---------------------------------------------------------------------------

-- Site settings -------------------------------------------------------------

insert into public.site_settings (id, platform_links, social_links, how_we_met, about_body)
values (
  1,
  jsonb_build_object(
    'youtube', 'https://www.youtube.com/@placeholder',
    'spotify', 'https://open.spotify.com/show/placeholder',
    'apple',   'https://podcasts.apple.com/us/podcast/placeholder'
  ),
  jsonb_build_object(
    'instagram', 'https://www.instagram.com/placeholder',
    'tiktok',    'https://www.tiktok.com/@placeholder',
    'youtube',   'https://www.youtube.com/@placeholder',
    'email',     'hello@example.com'
  ),
  'We met in the first week of our doctoral program in psychology, in a fluorescent-lit seminar room in Los Angeles, and figured out within about ten minutes that we were going to be a problem for each other in the best way. The group chat started that night. The podcast started three years later, mostly because our friends kept telling us the conversations we were already having deserved an audience.',
  'This is a show about the things that actually take up space in our heads.

We are three doctoral candidates in psychology in Los Angeles, and yes, we know things - but this is not a lecture. It is what happens when three friends who happen to be deep in the research sit down and talk honestly about dating, work, friendship, family, money, the internet, and the specific experience of being a woman of color trying to build a life while finishing a degree.

Some weeks we are funny. Some weeks we are annoyed. Some weeks somebody cries. We keep it in.

Real Conversations. Real Experiences. Real Impact.'
)
on conflict (id) do nothing;

-- Hosts ---------------------------------------------------------------------
-- PLACEHOLDER NAMES. Zodiac order is fixed by the brand line
-- "3 Doctoral Candidates. 3 Zodiac Signs. 1 Mission."
--
-- Unlike episodes and clips, host slugs stay editable from /admin/hosts, so
-- these can be corrected once the real names are confirmed.

insert into public.hosts (slug, name, zodiac, bio, socials, sort_order)
select *
from (
  values (
    'host-one'::text,
    'Host One'::text,
    'Taurus'::text,
    'Placeholder bio. Host One is a doctoral candidate in psychology, a devoted defender of the 9pm dinner reservation, and the one most likely to send a 4-paragraph text at 1am. She researches how young adults build identity online, which is a very academic way of saying she has thoughts about your Instagram.'::text,
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/placeholder',
      'tiktok',    'https://www.tiktok.com/@placeholder'
    ),
    1
  ),
  (
    'host-two',
    'Host Two',
    'Sagittarius',
    'Placeholder bio. Host Two is a doctoral candidate in psychology and the reason this podcast exists, because she is constitutionally incapable of letting a bad take go unchallenged. Born and raised in Los Angeles. Will drive across the county for a good taco and refuses to explain herself.',
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/placeholder',
      'linkedin',  'https://www.linkedin.com/in/placeholder'
    ),
    2
  ),
  (
    'host-three',
    'Host Three',
    'Gemini',
    'Placeholder bio. Host Three is a doctoral candidate in psychology, the group''s designated optimist, and the one who will say the thing everybody else is thinking. Her work is on friendship and social support, which she considers field research given the company she keeps.',
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/placeholder',
      'tiktok',    'https://www.tiktok.com/@placeholder'
    ),
    3
  )
) as v(slug, name, zodiac, bio, socials, sort_order)
where not exists (select 1 from public.hosts);

-- Episodes ------------------------------------------------------------------

insert into public.episodes (
  slug, episode_number, season, title, description,
  video_url, video_provider, video_id, thumbnail_path, thumbnail_alt,
  listen_links, published_at, is_published
)
select *
from (
  values (
    'the-audacity-of-a-first-date'::text,
    1,
    1,
    'The Audacity of a First Date'::text,
    'We open the show the only way we know how: by relitigating a date that one of us should never have gone on.

Somewhere in here we get into why "he''s not that bad" is the most dangerous sentence in dating, what we actually mean when we say we want to be pursued, and the exact moment a first date becomes a research study.

Placeholder description. Replace this from the admin dashboard.'::text,
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ'::text,
    'youtube'::text,
    'aqz-KE-bpKQ'::text,
    '/brand/episode-placeholder-1.jpg'::text,
    'The three hosts around their microphones'::text,
    jsonb_build_object(
      'spotify', 'https://open.spotify.com/episode/placeholder',
      'apple',   'https://podcasts.apple.com/us/podcast/placeholder'
    ),
    '2026-08-05 17:00:00+00'::timestamptz,
    true
  ),
  (
    'your-group-chat-is-a-support-group',
    2,
    1,
    'Your Group Chat Is a Support Group',
    'On friendship as infrastructure.

We talk about the friends who got us through the first year of the program, what it costs to be the person everybody vents to, and how to tell the difference between a group chat and an unpaid therapy practice.

Placeholder description. Replace this from the admin dashboard.',
    'https://www.youtube.com/watch?v=eRsGyueVLvQ',
    'youtube',
    'eRsGyueVLvQ',
    '/brand/episode-placeholder-2.jpg',
    'Two of the hosts mid-conversation',
    jsonb_build_object(
      'spotify', 'https://open.spotify.com/episode/placeholder',
      'apple',   'https://podcasts.apple.com/us/podcast/placeholder'
    ),
    '2026-08-12 17:00:00+00'::timestamptz,
    true
  ),
  (
    'the-only-one-in-the-room',
    3,
    1,
    'The Only One in the Room',
    'The episode we were nervous to record.

What it is actually like to be the only woman who looks like you in the seminar, the lab, the interview, the meeting. Code-switching, the tax of being "articulate," and why we stopped apologizing for taking up space.

Placeholder description. Replace this from the admin dashboard.',
    'https://www.youtube.com/watch?v=R6MlUcmOul8',
    'youtube',
    'R6MlUcmOul8',
    '/brand/episode-placeholder-3.jpg',
    'Two of the hosts laughing together',
    jsonb_build_object(
      'spotify', 'https://open.spotify.com/episode/placeholder',
      'apple',   'https://podcasts.apple.com/us/podcast/placeholder'
    ),
    '2026-08-19 17:00:00+00'::timestamptz,
    true
  ),
  (
    'broke-but-make-it-fashion',
    4,
    1,
    'Broke But Make It Fashion',
    'A stipend is not a salary. We know this. We continue to live in Los Angeles anyway.

Beauty budgets, the lash appointment that is technically a fixed cost, thrifting versus the resale app spiral, and the unglamorous math of looking like you have it together while you very much do not.

Placeholder description. Replace this from the admin dashboard.',
    'https://www.youtube.com/watch?v=TLkA0RELQ1g',
    'youtube',
    'TLkA0RELQ1g',
    '/brand/episode-placeholder-4.jpg',
    'A host leaning in towards the microphone',
    jsonb_build_object(
      'spotify', 'https://open.spotify.com/episode/placeholder',
      'apple',   'https://podcasts.apple.com/us/podcast/placeholder'
    ),
    '2026-08-26 17:00:00+00'::timestamptz,
    true
  ),
  (
    'the-algorithm-thinks-i-am-sad',
    5,
    1,
    'The Algorithm Thinks I''m Sad',
    'Your For You page knows something about you. The question is whether it is right.

We get into what social media actually does to how we see ourselves, the difference between a trend and a personality, and the week one of us deleted the app and then reinstalled it in under 48 hours.

Placeholder description. Replace this from the admin dashboard.',
    'https://www.youtube.com/watch?v=Y-rmzh0PI3c',
    'youtube',
    'Y-rmzh0PI3c',
    '/brand/episode-placeholder-5.jpg',
    'The hosts under the neon studio sign',
    jsonb_build_object(
      'spotify', 'https://open.spotify.com/episode/placeholder',
      'apple',   'https://podcasts.apple.com/us/podcast/placeholder'
    ),
    '2026-09-02 17:00:00+00'::timestamptz,
    true
  )
) as v(
  slug, episode_number, season, title, description,
  video_url, video_provider, video_id, thumbnail_path, thumbnail_alt,
  listen_links, published_at, is_published
)
where not exists (select 1 from public.episodes);

-- Clips ---------------------------------------------------------------------
-- Parent episodes are resolved by slug so this block does not depend on ids.

insert into public.clips (
  slug, title, caption, video_url, video_provider, video_id,
  thumbnail_path, thumbnail_alt, aspect,
  episode_id, published_at, is_published
)
select
  v.slug, v.title, v.caption, v.video_url, v.video_provider, v.video_id,
  v.thumbnail_path, v.thumbnail_alt, v.aspect,
  (select e.id from public.episodes e where e.slug = v.episode_slug),
  v.published_at, v.is_published
from (
  values (
    'he-said-what'::text,
    'He Said WHAT'::text,
    'The text message that ended the situationship, read aloud, with commentary.'::text,
    'https://www.youtube.com/shorts/WhWc3b3KhnY'::text,
    'youtube'::text,
    'WhWc3b3KhnY'::text,
    '/brand/clip-placeholder-1.jpg'::text,
    'A host smiling in the studio'::text,
    'portrait'::text,
    'the-audacity-of-a-first-date'::text,
    '2026-08-07 18:00:00+00'::timestamptz,
    true
  ),
  (
    'the-friend-tax',
    'The Friend Tax',
    'On being everyone''s free therapist and finally saying no.',
    'https://www.youtube.com/shorts/mN0zPOpADL4',
    'youtube',
    'mN0zPOpADL4',
    '/brand/clip-placeholder-2.jpg',
    'A host mid-sentence at the microphone',
    'portrait',
    'your-group-chat-is-a-support-group',
    '2026-08-14 18:00:00+00'::timestamptz,
    true
  ),
  (
    'not-articulate-just-normal',
    'Not Articulate, Just Normal',
    'The compliment that is not a compliment. You know the one.',
    'https://www.youtube.com/shorts/jNQXAC9IVRw',
    'youtube',
    'jNQXAC9IVRw',
    '/brand/clip-placeholder-3.jpg',
    'A host laughing during the recording',
    'portrait',
    'the-only-one-in-the-room',
    '2026-08-21 18:00:00+00'::timestamptz,
    true
  )
) as v(
  slug, title, caption, video_url, video_provider, video_id,
  thumbnail_path, thumbnail_alt, aspect,
  episode_slug, published_at, is_published
)
where not exists (select 1 from public.clips);

-- Live events ---------------------------------------------------------------
-- One scheduled event in the future so /live renders its primary state, plus a
-- replay URL so the "nothing scheduled" fallback has something to show later.

insert into public.live_events (title, platform, url, scheduled_at, status, replay_url)
select *
from (
  values (
    'Live: Dating in LA, Unfiltered'::text,
    'youtube'::text,
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ'::text,
    (date_trunc('day', now()) + interval '11 days' + interval '19 hours')::timestamptz,
    'scheduled'::text,
    'https://www.youtube.com/watch?v=eRsGyueVLvQ'::text
  )
) as v(title, platform, url, scheduled_at, status, replay_url)
where not exists (select 1 from public.live_events);
