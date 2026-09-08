import { createAdminClient } from '@/lib/supabase/server';
import { episodeLabel } from '@/lib/format';
import type { Clip, Episode, Host, LiveEvent, SiteSettings } from '@/lib/types';

/**
 * Admin-side reads.
 *
 * Separate from src/lib/data.ts because the admin needs to see what the public
 * must not: drafts, and soft-deleted rows. It uses the signed-in user's client,
 * so RLS is what actually grants that visibility - if the session is not an
 * admin, these return nothing rather than leaking.
 */

const EPISODE_FIELDS =
  'id, slug, episode_number, season, title, description, video_url, video_provider, video_id, thumbnail_path, thumbnail_alt, listen_links, published_at, is_published, deleted_at, created_at, updated_at' as const;

export interface AdminEpisode extends Episode {
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listEpisodes(options?: {
  includeDeleted?: boolean;
}): Promise<AdminEpisode[]> {
  const supabase = await createAdminClient();

  let query = supabase
    .from('episodes')
    .select(EPISODE_FIELDS)
    // Drafts have no publish date, so ordering by published_at alone would bury
    // them. Newest activity first is what an editor actually wants.
    .order('published_at', { ascending: false, nullsFirst: true })
    .order('episode_number', { ascending: false });

  if (!options?.includeDeleted) query = query.is('deleted_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdminEpisode[];
}

export async function getEpisodeForEdit(id: string): Promise<AdminEpisode | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('episodes')
    .select(EPISODE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as AdminEpisode) ?? null;
}

/** Suggests the next episode number so the hosts do not have to remember. */
export async function nextEpisodeNumber(): Promise<number> {
  const episodes = await listEpisodes({ includeDeleted: true });
  const highest = episodes.reduce((max, e) => Math.max(max, e.episode_number), 0);
  return highest + 1;
}

// --- clips ---------------------------------------------------------------

const CLIP_FIELDS =
  'id, slug, title, caption, video_url, video_provider, video_id, thumbnail_path, thumbnail_alt, episode_id, published_at, is_published, deleted_at' as const;

export interface AdminClip extends Clip {
  deleted_at: string | null;
}

export async function listClips(options?: {
  includeDeleted?: boolean;
}): Promise<AdminClip[]> {
  const supabase = await createAdminClient();

  let query = supabase
    .from('clips')
    .select(CLIP_FIELDS)
    .order('published_at', { ascending: false, nullsFirst: true });

  if (!options?.includeDeleted) query = query.is('deleted_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdminClip[];
}

export async function getClipForEdit(id: string): Promise<AdminClip | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('clips')
    .select(CLIP_FIELDS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminClip) ?? null;
}

/** Episodes offered in the clip form's parent picker. */
export async function episodeOptions() {
  const episodes = await listEpisodes();
  return episodes.map((episode) => ({
    id: episode.id,
    title: episode.title,
    label: `${episodeLabel(episode.episode_number, episode.season)} - ${episode.title}`,
  }));
}

// --- live events ---------------------------------------------------------

export async function listLiveEvents(): Promise<LiveEvent[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('live_events')
    .select('id, title, platform, url, scheduled_at, status, replay_url')
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LiveEvent[];
}

export async function getLiveEventForEdit(id: string): Promise<LiveEvent | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('live_events')
    .select('id, title, platform, url, scheduled_at, status, replay_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as LiveEvent) ?? null;
}

// --- hosts ---------------------------------------------------------------

export async function listHostsForAdmin(): Promise<Host[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('hosts')
    .select('id, slug, name, zodiac, bio, photo_path, photo_alt, socials, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Host[];
}

export async function getHostForEdit(id: string): Promise<Host | null> {
  const hosts = await listHostsForAdmin();
  return hosts.find((h) => h.id === id) ?? null;
}

// --- settings ------------------------------------------------------------

export async function getSettingsForEdit(): Promise<SiteSettings> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('platform_links, social_links, how_we_met, about_body')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return (
    data ?? { platform_links: {}, social_links: {}, how_we_met: '', about_body: '' }
  );
}
