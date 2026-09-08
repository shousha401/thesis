import Link from 'next/link';
import { episodeLabel, excerpt, formatDate } from '@/lib/format';
import { thumbnailsFor } from '@/lib/thumbnails';
import type { Clip, Episode } from '@/lib/types';
import { VideoPoster } from './video';

/**
 * Cards link through to the full page rather than playing in place, so a tap on
 * a phone never starts a video by accident.
 *
 * The poster image carries an empty alt: the accessible name comes from the
 * heading inside the same link, and repeating the title would announce it twice.
 */

export function EpisodeCard({
  episode,
  priority = false,
}: {
  episode: Episode;
  priority?: boolean;
}) {
  const { url, fallbackUrl } = thumbnailsFor(episode, 'card');

  return (
    <article className="group">
      <Link href={`/episodes/${episode.slug}`} className="block">
        <div className="overflow-hidden border border-plum-line transition-colors duration-200 group-hover:border-magenta">
          <VideoPoster
            thumbnailUrl={url}
            thumbnailFallbackUrl={fallbackUrl}
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>

        <div className="mt-4">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            <span>{episodeLabel(episode.episode_number, episode.season)}</span>
            {episode.published_at ? (
              <>
                <span aria-hidden="true" className="text-cream/30">
                  /
                </span>
                <time dateTime={episode.published_at} className="font-normal tracking-normal text-cream/55">
                  {formatDate(episode.published_at)}
                </time>
              </>
            ) : null}
          </p>

          <h3 className="mt-2 font-display text-2xl leading-tight text-cream transition-colors duration-200 group-hover:text-magenta">
            {episode.title}
          </h3>

          {episode.description ? (
            <p className="mt-2 text-sm leading-relaxed text-cream/65">
              {excerpt(episode.description)}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

export function ClipCard({ clip }: { clip: Clip }) {
  const { url, fallbackUrl } = thumbnailsFor(clip, 'card');

  return (
    <article className="group">
      <Link href={`/clips/${clip.slug}`} className="block">
        <div className="overflow-hidden border border-plum-line transition-colors duration-200 group-hover:border-magenta">
          <VideoPoster
            thumbnailUrl={url}
            thumbnailFallbackUrl={fallbackUrl}
            vertical
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 65vw"
          />
        </div>

        <h3 className="mt-3 font-display text-lg leading-snug text-cream transition-colors duration-200 group-hover:text-magenta">
          {clip.title}
        </h3>
        {clip.caption ? (
          <p className="mt-1 text-sm leading-relaxed text-cream/60">{clip.caption}</p>
        ) : null}
      </Link>
    </article>
  );
}
