import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';
import { getClips, getEpisodes, getHosts } from '@/lib/data';

/**
 * Every public URL. The admin is deliberately absent - it is also disallowed in
 * robots.txt and marked noindex on the pages themselves.
 *
 * Revalidated on the same cadence as the content pages, so a new episode shows
 * up here without a deploy.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [episodes, clips, hosts] = await Promise.all([
    getEpisodes(),
    getClips(),
    getHosts(),
  ]);

  const newestEpisode = episodes[0]?.published_at;

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1, lastModified: newestEpisode ?? undefined },
    { url: `${SITE_URL}/episodes`, changeFrequency: 'weekly', priority: 0.9, lastModified: newestEpisode ?? undefined },
    { url: `${SITE_URL}/clips`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/live`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/hosts`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...episodes.map((episode) => ({
      url: `${SITE_URL}/episodes/${episode.slug}`,
      lastModified: episode.published_at ?? undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...clips.map((clip) => ({
      url: `${SITE_URL}/clips/${clip.slug}`,
      lastModified: clip.published_at ?? undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...hosts.map((host) => ({
      url: `${SITE_URL}/hosts/${host.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
