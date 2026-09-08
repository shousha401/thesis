import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Remote images are allow-listed, not opened up with a wildcard: next/image
 * will optimise and serve anything matched here, so a broad pattern would turn
 * the site into an open image proxy.
 *
 *   i.ytimg.com  YouTube's generated thumbnails
 *   <project>.supabase.co  uploads from the two public storage buckets
 */
/**
 * Production can never be built from placeholder content.
 *
 * ALLOW_FIXTURE_CONTENT exists so a preview can be built before the database is
 * ready. If it ever leaked into the production environment on Vercel the site
 * would serve fake bios and fake episodes from the real domain, and nothing
 * would look broken enough for anyone to notice. Fail the build instead.
 */
if (
  process.env.ALLOW_FIXTURE_CONTENT === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  throw new Error(
    'ALLOW_FIXTURE_CONTENT=true is set in a VERCEL_ENV=production build. ' +
      'That would publish the seed placeholders as if they were real content. ' +
      'Remove the variable from the Production environment in the Vercel ' +
      'project settings and redeploy.',
  );
}

/**
 * Warns about a NEXT_PUBLIC_SITE_URL that looks wrong.
 *
 * That variable is inlined at build time and becomes every absolute URL the
 * site emits - canonical links, og:url, og:image. A deployment once went out
 * with it pointing at a similarly-named vercel.app domain owned by somebody
 * else: og:image resolved with a 200 but returned HTML, so WhatsApp fetched it,
 * found no image, and silently showed no preview card. Nothing looked broken.
 *
 * This warns rather than throws, deliberately. A Vercel project answers on
 * several vercel.app aliases (the generated production one, a project-and-team
 * one, per-branch ones), and VERCEL_PROJECT_PRODUCTION_URL is only one of them.
 * An earlier version of this check threw, and failed a deployment for a URL
 * that was in fact reachable. Blocking every deploy is worse than the bug being
 * guarded against, so this is loud but never fatal.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

if (siteUrl && vercelProductionUrl) {
  const host = siteUrl.replace(/^https?:\/\//, '');
  if (host.endsWith('.vercel.app') && host !== vercelProductionUrl) {
    console.warn(
      [
        '',
        `  WARNING: NEXT_PUBLIC_SITE_URL is "${siteUrl}", but this project's`,
        `  Vercel production domain is "${vercelProductionUrl}".`,
        '',
        '  If that is another alias of this same project, ignore this. If it is',
        "  a different project's domain, every canonical URL and social preview",
        '  image will point at their site - which can look like a working link',
        '  while returning HTML instead of an image, and link previews vanish.',
        `  Check https://${host}/brand/cover-og.jpg returns an image.`,
        '',
      ].join('\n'),
    );
  }
}

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, a stray package-lock.json in a parent
  // directory can make Turbopack infer the wrong root and trace the wrong files.
  turbopack: { root: path.resolve('.') },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      ...(supabaseHost
        ? ([
            {
              protocol: 'https' as const,
              hostname: supabaseHost,
              pathname: '/storage/v1/object/public/**',
            },
          ])
        : []),
    ],
  },
};

export default nextConfig;
