import type { VideoProvider } from './video';

/**
 * Application-facing shapes. These mirror the database columns but are hand
 * written rather than generated: the schema is small and stable, and a
 * generated types file is one more thing for a solo maintainer to keep in sync.
 */

export interface Host {
  id: string;
  slug: string;
  name: string;
  zodiac: string | null;
  bio: string;
  photo_path: string | null;
  photo_alt: string | null;
  socials: Record<string, string>;
  sort_order: number;
}

export interface Episode {
  id: string;
  slug: string;
  episode_number: number;
  season: number | null;
  title: string;
  description: string;
  video_url: string;
  video_provider: VideoProvider | 'other';
  video_id: string;
  thumbnail_path: string | null;
  thumbnail_alt: string | null;
  listen_links: Record<string, string>;
  published_at: string | null;
  is_published: boolean;
}

export interface Clip {
  id: string;
  slug: string;
  title: string;
  caption: string;
  video_url: string;
  video_provider: VideoProvider | 'other';
  video_id: string;
  thumbnail_path: string | null;
  thumbnail_alt: string | null;
  episode_id: string | null;
  published_at: string | null;
  is_published: boolean;
}

export type LivePlatform = 'youtube' | 'instagram' | 'tiktok' | 'other';
export type LiveStatus = 'scheduled' | 'live' | 'ended';

export interface LiveEvent {
  id: string;
  title: string;
  platform: LivePlatform;
  url: string;
  scheduled_at: string;
  status: LiveStatus;
  replay_url: string | null;
}

export interface SiteSettings {
  platform_links: Record<string, string>;
  social_links: Record<string, string>;
  how_we_met: string;
  about_body: string;
}
