'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BRAND_COVER, SITE_NAME } from '@/config/site';

/**
 * Poster + lazy embed.
 *
 * No iframe is rendered until the visitor presses play. That keeps the third
 * party's ~1MB of script off the critical path, which is most of what makes a
 * video-forward page pass a mobile performance budget, and it means nothing
 * plays on its own.
 *
 * The poster is a real <button>, so it is keyboard reachable and announces
 * itself, rather than a div with a click handler.
 */

interface PosterProps {
  src: string | null;
  /** YouTube's maxresdefault is missing for some videos; hqdefault always exists. */
  fallbackSrc?: string | null;
  alt?: string;
  sizes: string;
  priority?: boolean;
}

/**
 * Falls forward through: requested image -> lower-resolution image -> a branded
 * plate. A missing thumbnail must never render as a broken image, so the last
 * step always succeeds.
 */
function Poster({ src, fallbackSrc = null, alt = '', sizes, priority = false }: PosterProps) {
  // Last image before the plate is the cover art, per the brand direction. If
  // it has not been added to /public/brand yet it 404s and we fall through to
  // the plate, so a missing file never shows as a broken image.
  const sources = [src, fallbackSrc, BRAND_COVER].filter((s): s is string => Boolean(s));
  const [index, setIndex] = useState(0);
  const current = sources[index];

  if (!current) return <BrandPlate />;

  return (
    <Image
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

/** The deliberate empty state: branded, never blank, never broken. */
function BrandPlate() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-plum px-4 text-center"
    >
      <span className="h-[5px] w-10 bg-magenta" />
      <span className="font-display text-lg italic text-cream/70 sm:text-xl">
        {SITE_NAME}
      </span>
    </div>
  );
}

function withAutoplay(embedUrl: string): string {
  const separator = embedUrl.includes('?') ? '&' : '?';
  // Only ever appended after a real click, never on load.
  return `${embedUrl}${separator}autoplay=1`;
}

interface LazyVideoProps {
  embedUrl: string;
  title: string;
  thumbnailUrl: string | null;
  thumbnailFallbackUrl?: string | null;
  /** Clips are 9:16; episodes are 16:9. */
  vertical?: boolean;
  sizes: string;
  /** Set on the one above-the-fold image only. */
  priority?: boolean;
}

export function LazyVideo({
  embedUrl,
  title,
  thumbnailUrl,
  thumbnailFallbackUrl = null,
  vertical = false,
  sizes,
  priority = false,
}: LazyVideoProps) {
  const [playing, setPlaying] = useState(false);
  const aspect = vertical ? 'aspect-[9/16]' : 'aspect-video';

  if (playing) {
    return (
      <div className={`relative w-full overflow-hidden bg-ink ${aspect}`}>
        <iframe
          src={withAutoplay(embedUrl)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className={`group relative block w-full overflow-hidden bg-plum ${aspect}`}
    >
      <Poster
        src={thumbnailUrl}
        fallbackSrc={thumbnailFallbackUrl}
        sizes={sizes}
        priority={priority}
      />

      {/* Scrim keeps the play control legible over a bright thumbnail. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-ink/25 transition-colors duration-200 group-hover:bg-ink/10"
      />

      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-magenta shadow-lg transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-ink sm:h-8 sm:w-8">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.14-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

/**
 * The same poster treatment without a player, for cards that link through to a
 * page rather than playing in place.
 */
export function VideoPoster({
  thumbnailUrl,
  thumbnailFallbackUrl = null,
  vertical = false,
  sizes,
  priority = false,
}: Omit<LazyVideoProps, 'embedUrl' | 'title'>) {
  const aspect = vertical ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div className={`relative w-full overflow-hidden bg-plum ${aspect}`}>
      <Poster
        src={thumbnailUrl}
        fallbackSrc={thumbnailFallbackUrl}
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
