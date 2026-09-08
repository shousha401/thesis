import Image from 'next/image';
import Link from 'next/link';
import { Band, Eyebrow, Wordmark } from '@/components/brand';
import { ClipCard } from '@/components/cards';
import { JsonLd } from '@/components/json-ld';
import { iconFor } from '@/components/icons';
import { LazyVideo } from '@/components/video';
import { BRAND_COVER, PLATFORMS, SITE_NAME, TAGLINES, TOPICS } from '@/config/site';
import {
  getClips,
  getCurrentOrNextLiveEvent,
  getHosts,
  getLatestEpisode,
  getSiteSettings,
} from '@/lib/data';
import { episodeLabel, formatDate, formatDateTime } from '@/lib/format';
import { podcastSeriesSchema } from '@/lib/structured-data';
import { embedUrlFor, thumbnailsFor } from '@/lib/thumbnails';

export const revalidate = 300;

export default async function HomePage() {
  const [latest, clips, hosts, settings, liveEvent] = await Promise.all([
    getLatestEpisode(),
    getClips({ limit: 4 }),
    getHosts(),
    getSiteSettings(),
    getCurrentOrNextLiveEvent(),
  ]);

  const platforms = PLATFORMS.filter((p) => settings.platform_links[p.key]);

  return (
    <>
      <JsonLd data={podcastSeriesSchema(hosts, settings)} />

      {liveEvent ? <LiveBanner event={liveEvent} /> : null}

      <Hero hasEpisode={Boolean(latest)} />

      {latest ? (
        <section
          id="latest"
          aria-labelledby="latest-heading"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <Eyebrow>Latest Episode</Eyebrow>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-12">
            <div className="border border-plum-line">
              <LazyVideo
                embedUrl={embedUrlFor(latest)}
                title={latest.title}
                thumbnailUrl={thumbnailsFor(latest).url}
                thumbnailFallbackUrl={thumbnailsFor(latest).fallbackUrl}
                sizes="(min-width: 1024px) 62vw, 100vw"
                priority
              />
            </div>

            <div>
              <p className="flex flex-wrap items-center gap-x-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                <span>{episodeLabel(latest.episode_number, latest.season)}</span>
                {latest.published_at ? (
                  <>
                    <span aria-hidden="true" className="text-cream/30">/</span>
                    <time
                      dateTime={latest.published_at}
                      className="font-normal tracking-normal text-cream/55"
                    >
                      {formatDate(latest.published_at)}
                    </time>
                  </>
                ) : null}
              </p>

              <h2
                id="latest-heading"
                className="mt-3 font-display text-3xl leading-[1.1] text-cream sm:text-4xl"
              >
                {latest.title}
              </h2>

              {latest.description ? (
                <p className="prose-breaks mt-4 line-clamp-6 text-base leading-relaxed text-cream/70">
                  {latest.description}
                </p>
              ) : null}

              <Link
                href={`/episodes/${latest.slug}`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-magenta transition-colors hover:text-gold"
              >
                Full episode notes
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <Band />

      {clips.length > 0 ? (
        <section
          aria-labelledby="clips-heading"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Clips</Eyebrow>
              <h2
                id="clips-heading"
                className="mt-3 font-display text-3xl leading-tight text-cream sm:text-4xl"
              >
                The moments that got out of hand
              </h2>
            </div>
            <Link
              href="/clips"
              className="text-sm font-semibold text-magenta transition-colors hover:text-gold"
            >
              All clips <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            {clips.map((clip) => (
              <li key={clip.id}>
                <ClipCard clip={clip} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hosts.length > 0 ? (
        <section
          aria-labelledby="hosts-heading"
          className="bg-plum"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Eyebrow>{TAGLINES.identity}</Eyebrow>
            <h2
              id="hosts-heading"
              className="mt-3 max-w-2xl font-display text-3xl leading-[1.1] text-cream sm:text-4xl"
            >
              Who we are
            </h2>

            <ul className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {hosts.map((host) => (
                <li key={host.id}>
                  <Link href={`/hosts#${host.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden border border-plum-line bg-ink transition-colors duration-200 group-hover:border-magenta">
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center font-display text-7xl italic text-cream/15"
                      >
                        {host.name.charAt(0)}
                      </span>
                    </div>
                    {host.zodiac ? (
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                        {host.zodiac}
                      </p>
                    ) : null}
                    <h3 className="mt-1.5 font-display text-2xl text-cream transition-colors duration-200 group-hover:text-magenta">
                      {host.name}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>

            {settings.how_we_met ? (
              <p className="prose-breaks mt-10 max-w-2xl text-base leading-relaxed text-cream/70">
                {settings.how_we_met}
              </p>
            ) : null}

            <Link
              href="/hosts"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-magenta transition-colors hover:text-gold"
            >
              Meet the hosts <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : null}

      {platforms.length > 0 ? (
        <section
          id="listen"
          aria-labelledby="listen-heading"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <Eyebrow>Listen</Eyebrow>
          <h2
            id="listen-heading"
            className="mt-3 max-w-2xl font-display text-3xl leading-[1.1] text-cream sm:text-4xl"
          >
            {TAGLINES.secondary}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/65">
            New episodes wherever you already listen.
          </p>

          <ul className="mt-8 flex flex-wrap gap-3">
            {platforms.map((platform) => {
              const Icon = iconFor(platform.key);
              return (
                <li key={platform.key}>
                  <a
                    href={settings.platform_links[platform.key]}
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
    </>
  );
}

/**
 * The crop. The cover is square and the interesting band is the hosts' faces
 * and shoulders - the wordmark sits above it and the desk props below.
 *
 * Expressed as a percentage rather than pixels on purpose: a higher-resolution
 * replacement will land at the same path, and a percentage keeps framing the
 * same part of the picture whatever its dimensions.
 */
const COVER_FOCUS = 'center 49%';

/**
 * object-fit: cover alone only trims the overflow, which still leaves the neon
 * wordmark in frame. Scaling up zooms past it so the visible band is the faces
 * and shoulders. A unitless scale, like the focus point above, survives a
 * higher-resolution replacement unchanged.
 */
const COVER_ZOOM = 'scale-[1.6]';

/**
 * The same `sizes` on both hero images on purpose.
 *
 * They are the same file rendered twice - once for the desktop column, once
 * stacked for mobile - and only one is visible at a time. Different `sizes`
 * made the browser choose different srcset candidates, so a phone downloaded
 * the desktop crop (44KB) as well as the one it actually showed. Matching them
 * means the hidden element resolves to a URL that is already in cache.
 */
const COVER_SIZES = '(min-width: 1024px) 58vw, 100vw';

function Hero({ hasEpisode }: { hasEpisode: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-plum-line bg-plum">
      {/*
        Desktop: the art bleeds off the right edge and fills the hero, with the
        plum gradient carrying it back under the type so nothing sits on a busy
        background. Hidden from assistive tech here because the mobile copy
        below carries the description.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] overflow-hidden lg:block"
      >
        <Image
          src={BRAND_COVER}
          alt=""
          fill
          priority
          sizes={COVER_SIZES}
          className={`object-cover ${COVER_ZOOM}`}
          style={{ objectPosition: COVER_FOCUS }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-plum via-plum/75 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20 lg:pb-16">
        <div className="lg:max-w-[52%]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            {TAGLINES.identity}
          </p>

          {/*
            The logo slot. Set in type today; when a logo file lands, swap the
            Wordmark component's internals and every instance updates.
          */}
          <h1 className="mt-5 text-[clamp(2.75rem,9vw,5.75rem)]">
            <Wordmark variant="hero" />
          </h1>

          <p className="mt-6 max-w-xl font-display text-xl leading-snug italic text-cream/90 sm:text-2xl">
            {TAGLINES.primary}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {hasEpisode ? (
              <a
                href="#latest"
                className="inline-flex items-center justify-center bg-magenta px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold"
              >
                Watch the latest episode
              </a>
            ) : null}
            <a
              href="#listen"
              className="inline-flex items-center justify-center border border-cream/30 px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
            >
              Listen to the podcast
            </a>
          </div>
        </div>

        {/*
          Mobile: the same crop, stacked under the buttons at full width and
          with no gradient - there is no type over it to protect.
        */}
        <div className="relative mt-10 aspect-[16/10] w-full overflow-hidden lg:hidden">
          <Image
            src={BRAND_COVER}
            alt={`${SITE_NAME}: the three hosts around their microphones`}
            fill
            priority
            sizes={COVER_SIZES}
            className={`object-cover ${COVER_ZOOM}`}
            style={{ objectPosition: COVER_FOCUS }}
          />
        </div>
      </div>

      <TopicMarquee />
    </section>
  );
}

/**
 * A slow horizontal run of the topics, separated by gold dots.
 *
 * The track holds the list twice and slides by half its width, so it loops
 * without a seam. The second copy is aria-hidden so the topics are announced
 * once. Under prefers-reduced-motion the animation is off and it reads as a
 * static row (see globals.css).
 */
function TopicMarquee() {
  const run = (
    <ul className="flex shrink-0 items-center">
      {TOPICS.map((topic) => (
        <li key={topic} className="flex items-center whitespace-nowrap">
          <span className="px-5 text-xs font-medium uppercase tracking-[0.2em] text-cream/75 sm:px-7 sm:text-sm">
            {topic}
          </span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative z-10 border-t border-plum-line/70 bg-plum py-3.5">
      <div className="overflow-hidden">
        <div className="topic-marquee-track flex w-max">
          {run}
          <div aria-hidden="true" className="flex">
            {run}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveBanner({
  event,
}: {
  event: { title: string; scheduled_at: string; status: string };
}) {
  const isLiveNow = event.status === 'live';

  return (
    <aside className="bg-magenta text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-6 lg:px-8">
        <span className="font-semibold uppercase tracking-[0.14em]">
          {isLiveNow ? 'Live now' : 'Upcoming live'}
        </span>
        <span className="font-medium">{event.title}</span>
        {!isLiveNow ? (
          <time dateTime={event.scheduled_at} className="text-ink">
            {formatDateTime(event.scheduled_at)}
          </time>
        ) : null}
        <Link href="/live" className="ml-auto font-semibold underline underline-offset-4">
          {isLiveNow ? 'Watch now' : 'Details'}
          <span className="sr-only"> about {SITE_NAME} live</span>
        </Link>
      </div>
    </aside>
  );
}
