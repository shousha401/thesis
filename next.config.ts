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
