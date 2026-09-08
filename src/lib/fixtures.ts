import type { Clip, Episode, Host, LiveEvent, SiteSettings } from './types';

/**
 * A mirror of supabase/seed.sql, used ONLY when Supabase is not configured, so
 * the site can be developed and reviewed before a project exists.
 *
 * This is a development convenience and nothing else. `src/lib/data.ts` refuses
 * to use it in a production build - a missing environment variable there is a
 * hard failure, not a silent fall back to fake content. Keeping the two in sync
 * matters only until the hosted project is wired up; after that this file can
 * be deleted.
 */

export const FIXTURE_SETTINGS: SiteSettings = {
  platform_links: {
    youtube: 'https://www.youtube.com/@placeholder',
    spotify: 'https://open.spotify.com/show/placeholder',
    apple: 'https://podcasts.apple.com/us/podcast/placeholder',
  },
  social_links: {
    instagram: 'https://www.instagram.com/placeholder',
    tiktok: 'https://www.tiktok.com/@placeholder',
    youtube: 'https://www.youtube.com/@placeholder',
    email: 'hello@example.com',
  },
  how_we_met:
    'We met in the first week of our doctoral program in psychology, in a fluorescent-lit seminar room in Los Angeles, and figured out within about ten minutes that we were going to be a problem for each other in the best way. The group chat started that night. The podcast started three years later, mostly because our friends kept telling us the conversations we were already having deserved an audience.',
  about_body: `This is a show about the things that actually take up space in our heads.

We are three doctoral candidates in psychology in Los Angeles, and yes, we know things - but this is not a lecture. It is what happens when three friends who happen to be deep in the research sit down and talk honestly about dating, work, friendship, family, money, the internet, and the specific experience of being a woman of color trying to build a life while finishing a degree.

Some weeks we are funny. Some weeks we are annoyed. Some weeks somebody cries. We keep it in.

Real Conversations. Real Experiences. Real Impact.`,
};

export const FIXTURE_HOSTS: Host[] = [
  {
    id: 'host-1',
    slug: 'host-one',
    name: 'Host One',
    zodiac: 'Taurus',
    bio: 'Placeholder bio. Host One is a doctoral candidate in psychology, a devoted defender of the 9pm dinner reservation, and the one most likely to send a 4-paragraph text at 1am. She researches how young adults build identity online, which is a very academic way of saying she has thoughts about your Instagram.',
    photo_path: null,
    photo_alt: null,
    socials: {
      instagram: 'https://www.instagram.com/placeholder',
      tiktok: 'https://www.tiktok.com/@placeholder',
    },
    sort_order: 1,
  },
  {
    id: 'host-2',
    slug: 'host-two',
    name: 'Host Two',
    zodiac: 'Sagittarius',
    bio: 'Placeholder bio. Host Two is a doctoral candidate in psychology and the reason this podcast exists, because she is constitutionally incapable of letting a bad take go unchallenged. Born and raised in Los Angeles. Will drive across the county for a good taco and refuses to explain herself.',
    photo_path: null,
    photo_alt: null,
    socials: {
      instagram: 'https://www.instagram.com/placeholder',
      linkedin: 'https://www.linkedin.com/in/placeholder',
    },
    sort_order: 2,
  },
  {
    id: 'host-3',
    slug: 'host-three',
    name: 'Host Three',
    zodiac: 'Gemini',
    bio: "Placeholder bio. Host Three is a doctoral candidate in psychology, the group's designated optimist, and the one who will say the thing everybody else is thinking. Her work is on friendship and social support, which she considers field research given the company she keeps.",
    photo_path: null,
    photo_alt: null,
    socials: {
      instagram: 'https://www.instagram.com/placeholder',
      tiktok: 'https://www.tiktok.com/@placeholder',
    },
    sort_order: 3,
  },
];

/** Matches supabase/seed.sql. Crops of the cover, not the test films' artwork. */
const EPISODE_THUMB_ALT: Record<number, string> = {
  1: 'The three hosts around their microphones',
  2: 'Two of the hosts mid-conversation',
  3: 'Two of the hosts laughing together',
  4: 'A host leaning in towards the microphone',
  5: 'The hosts under the neon studio sign',
};

function episode(
  n: number,
  slug: string,
  title: string,
  description: string,
  videoId: string,
  publishedAt: string,
): Episode {
  return {
    id: `episode-${n}`,
    slug,
    episode_number: n,
    season: 1,
    title,
    description,
    video_url: `https://www.youtube.com/watch?v=${videoId}`,
    video_provider: 'youtube',
    video_id: videoId,
    thumbnail_path: `/brand/episode-placeholder-${n}.jpg`,
    thumbnail_alt: EPISODE_THUMB_ALT[n],
    listen_links: {
      spotify: 'https://open.spotify.com/episode/placeholder',
      apple: 'https://podcasts.apple.com/us/podcast/placeholder',
    },
    published_at: publishedAt,
    is_published: true,
  };
}

export const FIXTURE_EPISODES: Episode[] = [
  episode(
    5,
    'the-algorithm-thinks-i-am-sad',
    "The Algorithm Thinks I'm Sad",
    `Your For You page knows something about you. The question is whether it is right.

We get into what social media actually does to how we see ourselves, the difference between a trend and a personality, and the week one of us deleted the app and then reinstalled it in under 48 hours.

Placeholder description. Replace this from the admin dashboard.`,
    'Y-rmzh0PI3c',
    '2026-09-02T17:00:00.000Z',
  ),
  episode(
    4,
    'broke-but-make-it-fashion',
    'Broke But Make It Fashion',
    `A stipend is not a salary. We know this. We continue to live in Los Angeles anyway.

Beauty budgets, the lash appointment that is technically a fixed cost, thrifting versus the resale app spiral, and the unglamorous math of looking like you have it together while you very much do not.

Placeholder description. Replace this from the admin dashboard.`,
    'TLkA0RELQ1g',
    '2026-08-26T17:00:00.000Z',
  ),
  episode(
    3,
    'the-only-one-in-the-room',
    'The Only One in the Room',
    `The episode we were nervous to record.

What it is actually like to be the only woman who looks like you in the seminar, the lab, the interview, the meeting. Code-switching, the tax of being "articulate," and why we stopped apologizing for taking up space.

Placeholder description. Replace this from the admin dashboard.`,
    'R6MlUcmOul8',
    '2026-08-19T17:00:00.000Z',
  ),
  episode(
    2,
    'your-group-chat-is-a-support-group',
    'Your Group Chat Is a Support Group',
    `On friendship as infrastructure.

We talk about the friends who got us through the first year of the program, what it costs to be the person everybody vents to, and how to tell the difference between a group chat and an unpaid therapy practice.

Placeholder description. Replace this from the admin dashboard.`,
    'eRsGyueVLvQ',
    '2026-08-12T17:00:00.000Z',
  ),
  episode(
    1,
    'the-audacity-of-a-first-date',
    'The Audacity of a First Date',
    `We open the show the only way we know how: by relitigating a date that one of us should never have gone on.

Somewhere in here we get into why "he's not that bad" is the most dangerous sentence in dating, what we actually mean when we say we want to be pursued, and the exact moment a first date becomes a research study.

Placeholder description. Replace this from the admin dashboard.`,
    'aqz-KE-bpKQ',
    '2026-08-05T17:00:00.000Z',
  ),
];

export const FIXTURE_CLIPS: Clip[] = [
  {
    id: 'clip-1',
    slug: 'not-articulate-just-normal',
    title: 'Not Articulate, Just Normal',
    caption: 'The compliment that is not a compliment. You know the one.',
    video_url: 'https://www.youtube.com/shorts/jNQXAC9IVRw',
    video_provider: 'youtube',
    video_id: 'jNQXAC9IVRw',
    thumbnail_path: '/brand/clip-placeholder-3.jpg',
    thumbnail_alt: 'A host laughing during the recording',
    aspect: 'portrait',
    episode_id: 'episode-3',
    published_at: '2026-08-21T18:00:00.000Z',
    is_published: true,
  },
  {
    id: 'clip-2',
    slug: 'the-friend-tax',
    title: 'The Friend Tax',
    caption: "On being everyone's free therapist and finally saying no.",
    video_url: 'https://www.youtube.com/shorts/mN0zPOpADL4',
    video_provider: 'youtube',
    video_id: 'mN0zPOpADL4',
    thumbnail_path: '/brand/clip-placeholder-2.jpg',
    thumbnail_alt: 'A host mid-sentence at the microphone',
    aspect: 'portrait',
    episode_id: 'episode-2',
    published_at: '2026-08-14T18:00:00.000Z',
    is_published: true,
  },
  {
    id: 'clip-3',
    slug: 'he-said-what',
    title: 'He Said WHAT',
    caption: 'The text message that ended the situationship, read aloud, with commentary.',
    video_url: 'https://www.youtube.com/shorts/WhWc3b3KhnY',
    video_provider: 'youtube',
    video_id: 'WhWc3b3KhnY',
    thumbnail_path: '/brand/clip-placeholder-1.jpg',
    thumbnail_alt: 'A host smiling in the studio',
    aspect: 'portrait',
    episode_id: 'episode-1',
    published_at: '2026-08-07T18:00:00.000Z',
    is_published: true,
  },
];

/** Eleven days out, matching the seed, so the upcoming-live banner is exercised. */
function upcoming(): string {
  const date = new Date();
  date.setUTCHours(19, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 11);
  return date.toISOString();
}

export const FIXTURE_LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'live-1',
    title: 'Live: Dating in LA, Unfiltered',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    scheduled_at: upcoming(),
    status: 'scheduled',
    replay_url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ',
  },
];
