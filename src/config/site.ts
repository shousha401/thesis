/**
 * The single source of truth for brand facts.
 *
 * The podcast name is not contractually final, so it is never hardcoded in a
 * component. Import SITE_NAME from here and nowhere else. If the name changes,
 * this file is the only edit.
 *
 * Editorial copy that the hosts should be able to change without a developer
 * (about page body, "how we met", platform and social URLs) does NOT live here
 * - it lives in the site_settings table and is edited at /admin/settings.
 */

export const SITE_NAME = "She's Got a Thesis";

/** Used in <title> suffixes and structured data. */
export const SITE_SHORT_NAME = 'SGAT';

export const TAGLINES = {
  /** Hero, OG descriptions. */
  primary: 'Real Conversations. Real Experiences. Real Impact.',
  /** Footer sign-off. */
  secondary: 'Listen. Learn. Level Up.',
  /** Hosts section eyebrow. */
  identity: '3 Doctoral Candidates. 3 Zodiac Signs. 1 Mission.',
} as const;

/** Home page topic strip. Order is intentional. */
export const TOPICS = [
  'Education',
  'Psychology',
  'Culture',
  'Current Events',
  'Real Talk',
] as const;

export const SITE_DESCRIPTION =
  `${TAGLINES.primary} Three doctoral candidates in Los Angeles on pop culture, ` +
  'dating, friendship, careers and what it actually takes to build a life while ' +
  'finishing the degree.';

/**
 * The cover art. Doubles as the default OpenGraph image and the fallback
 * thumbnail for any episode or clip without one.
 */
export const BRAND_COVER = '/brand/cover.jpg';
export const BRAND_COVER_ALT = `${SITE_NAME} cover art`;

/**
 * Link previews are 1.91:1. The cover is square, and a platform centre-cropping
 * it would cut the wordmark off the top and the platform strip off the bottom,
 * so this is the same art framed on the plum base at 1200x630. Regenerate both with
 * `python scripts/build-cover.py <source-image>` if the cover art changes.
 */
export const BRAND_OG = '/brand/cover-og.jpg';

/**
 * Canonical origin, used for absolute URLs in metadata, sitemap and JSON-LD.
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL automatically on deploys; the
 * NEXT_PUBLIC_SITE_URL override is there for a custom domain.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

/**
 * The three confirmed listening platforms, in display order. URLs come from
 * site_settings.platform_links, keyed by `key`; anything missing there is
 * simply not rendered. The jsonb column stays open-ended so a fourth platform
 * can be added later without a migration.
 */
export const PLATFORMS = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'apple', label: 'Apple Podcasts' },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]['key'];

/** Social accounts rendered in the header and footer, in display order. */
export const SOCIALS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
] as const;

export const NAV_LINKS = [
  { href: '/episodes', label: 'Episodes' },
  { href: '/clips', label: 'Clips' },
  { href: '/live', label: 'Live' },
  { href: '/hosts', label: 'Hosts' },
  { href: '/about', label: 'About' },
] as const;
