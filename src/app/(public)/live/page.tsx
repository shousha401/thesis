import type { Metadata } from 'next';
import { Eyebrow } from '@/components/brand';
import { LazyVideo } from '@/components/video';
import { SITE_NAME } from '@/config/site';
import { getCurrentOrNextLiveEvent, getLatestReplay, getLiveEvents } from '@/lib/data';
import { formatDateTime } from '@/lib/format';
import type { LiveEvent } from '@/lib/types';
import { parseVideoUrl } from '@/lib/video';

/**
 * Live is the one page whose content can change minute to minute, so it is
 * revalidated far more often than the rest of the site.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live',
  description: `Watch ${SITE_NAME} live, or catch the replay.`,
};

export default async function LivePage() {
  const [event, replay, allEvents] = await Promise.all([
    getCurrentOrNextLiveEvent(),
    getLatestReplay(),
    getLiveEvents(),
  ]);

  // With nothing current or upcoming, fall back to the most recent thing that
  // has a replay, whatever its status.
  const fallbackReplay =
    replay ?? allEvents.find((e) => e.replay_url) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header>
        <Eyebrow>{event?.status === 'live' ? 'On air now' : 'Watch with us'}</Eyebrow>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">
          {event?.status === 'live' ? "We're live" : 'Live'}
        </h1>
      </header>

      {event ? (
        <LiveEventPanel event={event} />
      ) : (
        <NothingScheduled replay={fallbackReplay} />
      )}
    </div>
  );
}

function LiveEventPanel({ event }: { event: LiveEvent }) {
  const isLiveNow = event.status === 'live';
  const parsed = parseVideoUrl(event.url);

  // Instagram Live cannot be embedded at all, and a scheduled stream has
  // nothing to embed yet, so both get a card that sends people to the platform.
  const canEmbed = isLiveNow && parsed.ok && parsed.video.provider === 'youtube';

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl leading-snug text-cream sm:text-3xl">
        {event.title}
      </h2>
      <p className="mt-2 text-sm text-cream/65">
        <time dateTime={event.scheduled_at}>{formatDateTime(event.scheduled_at)}</time>
      </p>

      {canEmbed && parsed.ok ? (
        <div className="mt-8 border border-plum-line">
          <LazyVideo
            embedUrl={parsed.video.embedUrl}
            title={event.title}
            thumbnailUrl={parsed.video.thumbnailUrl}
            thumbnailFallbackUrl={parsed.video.thumbnailFallbackUrl}
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority
          />
        </div>
      ) : (
        <JoinCard event={event} isLiveNow={isLiveNow} />
      )}

      {event.replay_url ? (
        <p className="mt-8 text-sm text-cream/65">
          Missed the last one?{' '}
          <a
            href={event.replay_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-magenta underline underline-offset-4 transition-colors hover:text-gold"
          >
            Watch the replay
          </a>
        </p>
      ) : null}
    </section>
  );
}

const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  other: 'the stream',
};

/**
 * The fallback for anything that cannot be embedded. For a live Instagram
 * stream this is the "tap to join" deep link the brief asked for; for a
 * scheduled stream it is simply where to be when it starts.
 */
function JoinCard({ event, isLiveNow }: { event: LiveEvent; isLiveNow: boolean }) {
  const platform = PLATFORM_LABEL[event.platform] ?? PLATFORM_LABEL.other;

  return (
    <div className="mt-8 border border-plum-line bg-plum p-8 text-center sm:p-12">
      {isLiveNow ? (
        <>
          <p className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-magenta">
            <span aria-hidden="true" className="block h-2.5 w-2.5 rounded-full bg-magenta" />
            Live now
          </p>
          <p className="mt-4 font-display text-2xl leading-snug text-cream sm:text-3xl">
            We&rsquo;re live on {platform}
          </p>
          <p className="mt-3 text-sm text-cream/65">
            {platform} streams can&rsquo;t be played here. Tap through to join us.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Coming up
          </p>
          <p className="mt-4 font-display text-2xl leading-snug text-cream sm:text-3xl">
            Join us on {platform}
          </p>
          <p className="mt-3 text-sm text-cream/65">
            Set a reminder so you don&rsquo;t miss it.
          </p>
        </>
      )}

      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex items-center justify-center bg-magenta px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold"
      >
        {isLiveNow ? `Join us on ${platform}` : `Open on ${platform}`}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

function NothingScheduled({ replay }: { replay: LiveEvent | null }) {
  const parsed = replay?.replay_url ? parseVideoUrl(replay.replay_url) : null;

  return (
    <section className="mt-10">
      <p className="max-w-xl text-lg leading-relaxed text-cream/70">
        Nothing scheduled right now. We announce live shows on Instagram first,
        so follow along there and we&rsquo;ll see you next time.
      </p>

      {replay ? (
        <div className="mt-12">
          <Eyebrow>Last time</Eyebrow>
          <h2 className="mt-3 font-display text-2xl leading-snug text-cream sm:text-3xl">
            {replay.title}
          </h2>

          {parsed?.ok ? (
            <div className="mt-6 border border-plum-line">
              <LazyVideo
                embedUrl={parsed.video.embedUrl}
                title={`${replay.title} (replay)`}
                thumbnailUrl={parsed.video.thumbnailUrl}
                thumbnailFallbackUrl={parsed.video.thumbnailFallbackUrl}
                sizes="(min-width: 1024px) 1024px, 100vw"
              />
            </div>
          ) : replay.replay_url ? (
            <a
              href={replay.replay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center border border-cream/30 px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
            >
              Watch the replay
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
