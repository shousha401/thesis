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
 * Catches a wrong NEXT_PUBLIC_SITE_URL before it ships.
 *
 * That variable is inlined at build time and becomes every absolute URL the
 * site emits - canonical links, og:url, og:image. A deployment once went out
 * with it pointing at a similarly-named vercel.app domain owned by somebody
 * else: og:image resolved with a 200 but returned HTML, so WhatsApp fetched it,
 * found no image, and silently showed no preview card. Nothing looked broken.
 *
 * A custom domain is the whole point of the override, so only a *.vercel.app
 * value is checked - and on Vercel we know exactly which one is ours.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

if (siteUrl && vercelProductionUrl) {
  const host = siteUrl.replace(/^https?:\/\//, '');
  if (host.endsWith('.vercel.app') && host !== vercelProductionUrl) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is set to "${siteUrl}", but this project's Vercel ` +
        `domain is "${vercelProductionUrl}". A vercel.app address that is not ` +
        'this project belongs to someone else, and every canonical URL and ' +
        'social preview image would point at their site. Set it to ' +
        `"https://${vercelProductionUrl}", or to your own custom domain.`,
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
