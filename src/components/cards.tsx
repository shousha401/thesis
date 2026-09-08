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
  headingLevel = 3,
}: {
  episode: Episode;
  priority?: boolean;
  /**
   * Cards sit under a section heading on the home page (so h3), but directly
   * under the page title on /episodes (so h2). Skipping a level is a real
   * accessibility failure, not a style preference.
   */
  headingLevel?: 2 | 3;
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

          <CardHeading
            level={headingLevel}
            className="mt-2 font-display text-2xl leading-tight text-cream transition-colors duration-200 group-hover:text-magenta"
          >
            {episode.title}
          </CardHeading>

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

/**
 * Clip cards are framed the way the video is, not the way the thumbnail
 * happens to arrive.
 *
 * A YouTube Short only has a 16:9 thumbnail - YouTube generates nothing else -
 * so a portrait card crops its sides with object-fit: cover. That is fine for a
 * Short, where the subject is centred, and much better than the black
 * letterbox bars a 16:9 image left in a 9:16 frame.
 */
export function ClipCard({
  clip,
  headingLevel = 3,
}: {
  clip: Clip;
  headingLevel?: 2 | 3;
}) {
  const { url, fallbackUrl } = thumbnailsFor(clip, 'card');
  const isPortrait = clip.aspect === 'portrait';

  return (
    <article className="group">
      <Link href={`/clips/${clip.slug}`} className="block">
        <div className="overflow-hidden border border-plum-line transition-colors duration-200 group-hover:border-magenta">
          <VideoPoster
            thumbnailUrl={url}
            thumbnailFallbackUrl={fallbackUrl}
            vertical={isPortrait}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 50vw"
          />
        </div>

        <CardHeading
          level={headingLevel}
          className="mt-3 font-display text-lg leading-snug text-cream transition-colors duration-200 group-hover:text-magenta"
        >
          {clip.title}
        </CardHeading>
        {clip.caption ? (
          <p className="mt-1 text-sm leading-relaxed text-cream/60">{clip.caption}</p>
        ) : null}
      </Link>
    </article>
  );
}

/** Renders the right heading level so the document outline never skips one. */
function CardHeading({
  level,
  className,
  children,
}: {
  level: 2 | 3;
  className: string;
  children: React.ReactNode;
}) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return <Tag className={className}>{children}</Tag>;
}
