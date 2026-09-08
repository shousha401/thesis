import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Band, Eyebrow } from '@/components/brand';
import { iconFor } from '@/components/icons';
import { JsonLd } from '@/components/json-ld';
import { ShareButtons } from '@/components/share';
import { LazyVideo } from '@/components/video';
import { BRAND_OG, PLATFORMS, SITE_NAME, SITE_URL } from '@/config/site';
import { getAdjacentEpisodes, getEpisodeBySlug, getEpisodes } from '@/lib/data';
import { episodeLabel, excerpt, formatDate } from '@/lib/format';
import { podcastEpisodeSchema } from '@/lib/structured-data';
import { embedUrlFor, thumbnailsFor } from '@/lib/thumbnails';

export const revalidate = 300;

/** Pre-renders the episodes that exist at build time; new ones render on demand. */
export async function generateStaticParams() {
  const episodes = await getEpisodes();
  return episodes.map((episode) => ({ slug: episode.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);

  if (!episode) return { title: 'Episode not found' };

  const description = excerpt(episode.description, 200) || SITE_NAME;
  const { url: thumbnail } = thumbnailsFor(episode);
  const image = thumbnail ?? BRAND_OG;
  const canonical = `${SITE_URL}/episodes/${episode.slug}`;

  return {
    title: episode.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: episode.title,
      description,
      url: canonical,
      publishedTime: episode.published_at ?? undefined,
      images: [{ url: image, alt: episode.thumbnail_alt ?? episode.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: episode.title,
      description,
      images: [image],
    },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);

  if (!episode) notFound();

  const { previous, next } = await getAdjacentEpisodes(slug);
  const { url: thumbnailUrl, fallbackUrl } = thumbnailsFor(episode);
  const listenLinks = PLATFORMS.filter((p) => episode.listen_links[p.key]);
  const canonical = `${SITE_URL}/episodes/${episode.slug}`;

  return (
    <article>
      <JsonLd data={podcastEpisodeSchema(episode)} />

      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <Link
          href="/episodes"
          className="text-sm font-semibold text-cream/60 transition-colors hover:text-magenta"
        >
          <span aria-hidden="true">←</span> All episodes
        </Link>

        <header className="mt-8">
          <p className="flex flex-wrap items-center gap-x-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            <span>{episodeLabel(episode.episode_number, episode.season)}</span>
            {episode.published_at ? (
              <>
                <span aria-hidden="true" className="text-cream/30">/</span>
                <time
                  dateTime={episode.published_at}
                  className="font-normal tracking-normal text-cream/55"
                >
                  {formatDate(episode.published_at)}
                </time>
              </>
            ) : null}
          </p>

          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-cream sm:text-5xl lg:text-6xl">
            {episode.title}
          </h1>
        </header>
      </div>

      <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="border border-plum-line">
          <LazyVideo
            embedUrl={embedUrlFor(episode)}
            title={episode.title}
            thumbnailUrl={thumbnailUrl}
            thumbnailFallbackUrl={fallbackUrl}
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority
          />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {episode.description ? (
          <div className="prose-breaks max-w-2xl text-lg leading-relaxed text-cream/80">
            {episode.description}
          </div>
        ) : null}

        {listenLinks.length > 0 ? (
          <section aria-labelledby="listen-heading" className="mt-12">
            <Eyebrow>Listen</Eyebrow>
            <h2 id="listen-heading" className="sr-only">
              Listen to this episode
            </h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {listenLinks.map((platform) => {
                const Icon = iconFor(platform.key);
                return (
                  <li key={platform.key}>
                    <a
                      href={episode.listen_links[platform.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 border border-plum-line px-5 py-3 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
                    >
                      {Icon ? <Icon /> : null}
                      {platform.label}
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="share-heading" className="mt-12">
          <Eyebrow>Share</Eyebrow>
          <h2 id="share-heading" className="sr-only">
            Share this episode
          </h2>
          <div className="mt-5">
            <ShareButtons title={`${episode.title} — ${SITE_NAME}`} url={canonical} />
          </div>
        </section>
      </div>

      <Band />

      {previous || next ? (
        <nav
          aria-label="More episodes"
          className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"
        >
          <ul className="grid gap-5 sm:grid-cols-2">
            {previous ? (
              <li>
                <AdjacentLink
                  href={`/episodes/${previous.slug}`}
                  direction="Previous"
                  title={previous.title}
                />
              </li>
            ) : null}
            {next ? (
              <li className={previous ? '' : 'sm:col-start-2'}>
                <AdjacentLink
                  href={`/episodes/${next.slug}`}
                  direction="Next"
                  title={next.title}
                  alignEnd
                />
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}

function AdjacentLink({
  href,
  direction,
  title,
  alignEnd = false,
}: {
  href: string;
  direction: string;
  title: string;
  alignEnd?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col border border-plum-line p-5 transition-colors hover:border-magenta ${
        alignEnd ? 'sm:items-end sm:text-right' : ''
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
        {direction}
      </span>
      <span className="mt-2 font-display text-xl leading-snug text-cream transition-colors group-hover:text-magenta">
        {title}
      </span>
    </Link>
  );
}
