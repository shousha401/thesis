import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

/**
 * The admin is disallowed here, marked `noindex` in its own metadata, and
 * requires a session anyway. Three layers, because a crawler that indexes the
 * login page is a bad look even though it exposes nothing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
