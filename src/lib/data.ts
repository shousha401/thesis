import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  FIXTURE_CLIPS,
  FIXTURE_EPISODES,
  FIXTURE_HOSTS,
  FIXTURE_LIVE_EVENTS,
  FIXTURE_SETTINGS,
} from './fixtures';
import type { Clip, Episode, Host, LiveEvent, SiteSettings } from './types';

/**
 * Every public read goes through this module.
 *
 * Reads use the anon key with no session, so Row Level Security decides what
 * comes back. The `is_published`/`deleted_at` filters below are therefore
 * belt-and-braces: the database already refuses to return a draft. They stay
 * because they document the intent at the call site and keep the queries honest
 * if a policy is ever loosened.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes('your-project-ref'),
  );
}

/**
 * Development-only fallback to the seed fixtures.
 *
 * In production a missing environment variable is a hard failure. Serving
 * placeholder bios and fake episodes from a real domain because someone forgot
 * to set a key would be far worse than a build that refuses to start.
 */
function fixtureMode(): boolean {
  // Explicit opt-in, checked first so it also works when Supabase IS configured
  // but the schema has not been applied yet - which is exactly the state a
  // project is in between "create the project" and "run the migrations".
  //
  // It has to be asked for by name: the danger is a real deployment quietly
  // serving placeholder bios because a key went missing, and a named flag
  // cannot happen by accident the way an absent variable can.
  if (process.env.ALLOW_FIXTURE_CONTENT === 'true') {
    warnOnce();
    return true;
  }

  if (isConfigured()) return false;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY. (Refusing to serve placeholder ' +
        'content from a production build. To build a preview from the seed ' +
        'fixtures on purpose, set ALLOW_FIXTURE_CONTENT=true.)',
    );
  }

  warnOnce();
  return true;
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  const reason =
    process.env.ALLOW_FIXTURE_CONTENT === 'true'
      ? 'ALLOW_FIXTURE_CONTENT=true is set'
      : 'Supabase is not configured';
  console.warn(
    `\n  ${reason} - rendering from the supabase/seed.sql fixtures.\n` +
      '  Real content requires NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY and the\n' +
      '  migrations in supabase/migrations applied to that project.\n',
  );
}

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

/** Newest first, with nulls last, matching the episodes_feed_idx ordering. */
function byPublishedDesc<T extends { published_at: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (!a.published_at) return 1;
    if (!b.published_at) return -1;
    return b.published_at.localeCompare(a.published_at);
  });
}

// --- Settings --------------------------------------------------------------

export async function getSiteSettings(): Promise<SiteSettings> {
  if (fixtureMode()) return FIXTURE_SETTINGS;

  const { data, error } = await db()
    .from('site_settings')
    .select('platform_links, social_links, how_we_met, about_body')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;

  // The row is created by the migration, but the site must not 500 if someone
  // deletes it.
  return (
    data ?? {
      platform_links: {},
      social_links: {},
      how_we_met: '',
      about_body: '',
    }
  );
}

// --- Episodes --------------------------------------------------------------

const EPISODE_FIELDS =
  'id, slug, episode_number, season, title, description, video_url, video_provider, video_id, thumbnail_path, thumbnail_alt, listen_links, published_at, is_published' as const;

export async function getEpisodes(options?: { season?: number }): Promise<Episode[]> {
  if (fixtureMode()) {
    const rows = options?.season
      ? FIXTURE_EPISODES.filter((e) => e.season === options.season)
      : FIXTURE_EPISODES;
    return byPublishedDesc(rows);
  }

  let query = db()
    .from('episodes')
    .select(EPISODE_FIELDS)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false });

  if (options?.season !== undefined) query = query.eq('season', options.season);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Episode[];
}

export async function getLatestEpisode(): Promise<Episode | null> {
  const episodes = await getEpisodes();
  return episodes[0] ?? null;
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  if (fixtureMode()) {
    return FIXTURE_EPISODES.find((e) => e.slug === slug) ?? null;
  }

  const { data, error } = await db()
    .from('episodes')
    .select(EPISODE_FIELDS)
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return (data as Episode) ?? null;
}

/** Used by a clip page to link back to the episode it came from. */
export async function getEpisodeById(id: string | null): Promise<Episode | null> {
  if (!id) return null;
  if (fixtureMode()) return FIXTURE_EPISODES.find((e) => e.id === id) ?? null;

  const { data, error } = await db()
    .from('episodes')
    .select(EPISODE_FIELDS)
    .eq('id', id)
    .eq('is_published', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return (data as Episode) ?? null;
}

/**
 * Previous/next in publication order. "Next" is the newer episode, which is
 * what a reader working forward through the archive expects.
 */
export async function getAdjacentEpisodes(
  slug: string,
): Promise<{ previous: Episode | null; next: Episode | null }> {
  const episodes = await getEpisodes();
  const index = episodes.findIndex((e) => e.slug === slug);
  if (index === -1) return { previous: null, next: null };

  return {
    next: episodes[index - 1] ?? null,
    previous: episodes[index + 1] ?? null,
  };
}

/** Distinct seasons, newest first. Empty when the show has no seasons yet. */
export async function getSeasons(): Promise<number[]> {
  const episodes = await getEpisodes();
  const seasons = new Set<number>();
  for (const episode of episodes) {
    if (episode.season !== null) seasons.add(episode.season);
  }
  return [...seasons].sort((a, b) => b - a);
}

// --- Clips -----------------------------------------------------------------

const CLIP_FIELDS =
  'id, slug, title, caption, video_url, video_provider, video_id, thumbnail_path, thumbnail_alt, episode_id, published_at, is_published' as const;

export async function getClips(options?: { limit?: number }): Promise<Clip[]> {
  if (fixtureMode()) {
    const rows = byPublishedDesc(FIXTURE_CLIPS);
    return options?.limit ? rows.slice(0, options.limit) : rows;
  }

  let query = db()
    .from('clips')
    .select(CLIP_FIELDS)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false });

  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Clip[];
}

export async function getClipBySlug(slug: string): Promise<Clip | null> {
  if (fixtureMode()) return FIXTURE_CLIPS.find((c) => c.slug === slug) ?? null;

  const { data, error } = await db()
    .from('clips')
    .select(CLIP_FIELDS)
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return (data as Clip) ?? null;
}

// --- Hosts -----------------------------------------------------------------

export async function getHosts(): Promise<Host[]> {
  if (fixtureMode()) return FIXTURE_HOSTS;

  const { data, error } = await db()
    .from('hosts')
    .select('id, slug, name, zodiac, bio, photo_path, photo_alt, socials, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Host[];
}

export async function getHostBySlug(slug: string): Promise<Host | null> {
  const hosts = await getHosts();
  return hosts.find((h) => h.slug === slug) ?? null;
}

// --- Live ------------------------------------------------------------------

export async function getLiveEvents(): Promise<LiveEvent[]> {
  if (fixtureMode()) return FIXTURE_LIVE_EVENTS;

  const { data, error } = await db()
    .from('live_events')
    .select('id, title, platform, url, scheduled_at, status, replay_url')
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as LiveEvent[];
}

/**
 * What /live and the home banner should show, in priority order:
 *   1. an event marked live right now,
 *   2. the soonest upcoming scheduled event,
 *   3. nothing, and the caller falls back to the most recent replay.
 */
export async function getCurrentOrNextLiveEvent(): Promise<LiveEvent | null> {
  const events = await getLiveEvents();

  const live = events.find((e) => e.status === 'live');
  if (live) return live;

  const now = Date.now();
  const upcoming = events
    .filter((e) => e.status === 'scheduled' && new Date(e.scheduled_at).getTime() > now)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return upcoming[0] ?? null;
}

export async function getLatestReplay(): Promise<LiveEvent | null> {
  const events = await getLiveEvents();
  return events.find((e) => e.status === 'ended' && e.replay_url) ?? null;
}

// --- Storage ---------------------------------------------------------------

/** Turns a stored bucket-relative path into a public CDN URL. */
export function storageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (!isConfigured()) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
