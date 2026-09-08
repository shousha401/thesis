import {
  BRAND_OG,
  PLATFORMS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/config/site';
import { storageUrl } from '@/lib/data';
import { excerpt } from '@/lib/format';
import { thumbnailsFor } from '@/lib/thumbnails';
import type { Episode, Host, SiteSettings } from '@/lib/types';

/**
 * Structured data, built as plain objects so each page can render one script
 * tag without string-concatenating JSON by hand.
 *
 * Everything here uses absolute URLs: a search engine reading this may never
 * have seen the page it came from.
 */

function absolute(path: string): string {
  return path.startsWith('http') ? path : `${SITE_URL}${path}`;
}

/** The show itself. Rendered on the home page. */
export function podcastSeriesSchema(hosts: Host[], settings: SiteSettings) {
  const platformUrls = PLATFORMS.map((p) => settings.platform_links?.[p.key]).filter(
    Boolean,
  );
  const socialUrls = Object.values(settings.social_links ?? {}).filter(
    (url) => typeof url === 'string' && url.startsWith('http'),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: absolute(BRAND_OG),
    inLanguage: 'en-US',
    ...(platformUrls.length || socialUrls.length
      ? { sameAs: [...platformUrls, ...socialUrls] }
      : {}),
    author: hosts.map((host) => ({
      '@type': 'Person',
      name: host.name,
      url: `${SITE_URL}/hosts/${host.slug}`,
    })),
  };
}

/** One episode. Rendered on /episodes/[slug]. */
export function podcastEpisodeSchema(episode: Episode) {
  const { url: thumbnail } = thumbnailsFor(episode);

  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: episode.title,
    url: `${SITE_URL}/episodes/${episode.slug}`,
    description: excerpt(episode.description, 300) || SITE_NAME,
    image: thumbnail ?? absolute(BRAND_OG),
    episodeNumber: episode.episode_number,
    ...(episode.published_at ? { datePublished: episode.published_at } : {}),
    ...(episode.season !== null
      ? {
          partOfSeason: {
            '@type': 'PodcastSeason',
            seasonNumber: episode.season,
          },
        }
      : {}),
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: SITE_NAME,
      url: SITE_URL,
    },
    associatedMedia: {
      '@type': 'MediaObject',
      contentUrl: episode.video_url,
    },
  };
}

/** One host. Rendered on /hosts/[slug]. */
export function personSchema(host: Host) {
  const photo = storageUrl('host-photos', host.photo_path);
  const socials = Object.values(host.socials ?? {}).filter(
    (url) => typeof url === 'string' && url.startsWith('http'),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: host.name,
    url: `${SITE_URL}/hosts/${host.slug}`,
    ...(host.bio ? { description: excerpt(host.bio, 300) } : {}),
    ...(photo ? { image: photo } : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    memberOf: {
      '@type': 'PodcastSeries',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
