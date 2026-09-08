import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Band, Eyebrow } from '@/components/brand';
import { ClipGrid } from '@/components/clip-grid';
import { ShareButtons } from '@/components/share';
import { LazyVideo } from '@/components/video';
import { BRAND_OG, SITE_NAME, SITE_URL } from '@/config/site';
import { getClipBySlug, getClips, getEpisodeById } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { embedUrlFor, thumbnailsFor } from '@/lib/thumbnails';

export const revalidate = 300;

/**
 * Every clip gets its own indexable URL. This page exists as much for search
 * and social traffic as for people browsing the site, which is why it carries
 * full metadata and a link back into the episode it came from.
 */
export async function generateStaticParams() {
  const clips = await getClips();
  return clips.map((clip) => ({ slug: clip.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const clip = await getClipBySlug(slug);
  if (!clip) return { title: 'Clip not found' };

  const description = clip.caption || SITE_NAME;
  const { url: thumbnail } = thumbnailsFor(clip);
  const image = thumbnail ?? BRAND_OG;
  const canonical = `${SITE_URL}/clips/${clip.slug}`;

  return {
    title: clip.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'video.other',
      title: clip.title,
      description,
      url: canonical,
      images: [{ url: image, alt: clip.thumbnail_alt ?? clip.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: clip.title,
      description,
      images: [image],
    },
  };
}

export default async function ClipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clip = await getClipBySlug(slug);
  if (!clip) notFound();

  const [episode, allClips] = await Promise.all([
    getEpisodeById(clip.episode_id),
    getClips(),
  ]);

  const { url: thumbnailUrl, fallbackUrl } = thumbnailsFor(clip);
  const isPortrait = clip.aspect === 'portrait';
  const canonical = `${SITE_URL}/clips/${clip.slug}`;
  const more = allClips.filter((c) => c.slug !== clip.slug).slice(0, 4);

  return (
    <article>
      <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <Link
          href="/clips"
          className="text-sm font-semibold text-cream/60 transition-colors hover:text-magenta"
        >
          <span aria-hidden="true">←</span> All clips
        </Link>

        <div
          className={`mt-8 grid gap-8 lg:gap-12 ${
            isPortrait ? 'lg:grid-cols-[minmax(0,380px)_1fr]' : 'lg:grid-cols-[1.4fr_1fr]'
          }`}
        >
          {/* A vertical video is capped rather than stretched across a desktop
              column; a landscape one is free to fill it. */}
          <div
            className={`w-full border border-plum-line ${
              isPortrait ? 'mx-auto max-w-[380px] lg:mx-0' : ''
            }`}
          >
            <LazyVideo
              embedUrl={embedUrlFor(clip)}
              title={clip.title}
              thumbnailUrl={thumbnailUrl}
              thumbnailFallbackUrl={fallbackUrl}
              vertical
              sizes="(min-width: 1024px) 380px, 100vw"
              priority
            />
          </div>

          <div>
            {clip.published_at ? (
              <time
                dateTime={clip.published_at}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-gold"
              >
                {formatDate(clip.published_at)}
              </time>
            ) : null}

            <h1 className="mt-3 font-display text-3xl leading-[1.08] text-cream sm:text-5xl">
              {clip.title}
            </h1>

            {clip.caption ? (
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/75">
                {clip.caption}
              </p>
            ) : null}

            {episode ? (
              <div className="mt-8 border border-plum-line p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                  From the episode
                </p>
                <Link
                  href={`/episodes/${episode.slug}`}
                  className="group mt-2 inline-block font-display text-xl leading-snug text-cream transition-colors hover:text-magenta"
                >
                  {episode.title}
                  <span aria-hidden="true" className="ml-1.5">→</span>
                </Link>
              </div>
            ) : null}

            <div className="mt-8">
              <ShareButtons title={`${clip.title} — ${SITE_NAME}`} url={canonical} />
            </div>
          </div>
        </div>
      </div>

      {more.length > 0 ? (
        <>
          <Band className="mt-16" />
          <section
            aria-labelledby="more-clips"
            className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"
          >
            <Eyebrow>Keep going</Eyebrow>
            <h2 id="more-clips" className="mt-3 font-display text-3xl text-cream">
              More clips
            </h2>
            <div className="mt-8">
              <ClipGrid clips={more} />
            </div>
          </section>
        </>
      ) : null}
    </article>
  );
}
