import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow } from '@/components/brand';
import { EpisodeCard } from '@/components/cards';
import { SITE_NAME } from '@/config/site';
import { getEpisodes, getSeasons } from '@/lib/data';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Episodes',
  description: `Every episode of ${SITE_NAME}, newest first.`,
};

/**
 * Season filtering is a plain set of links with a ?season= query rather than a
 * client-side filter: each season gets a shareable, indexable URL and the page
 * needs no JavaScript to work.
 */
export default async function EpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getSeasons();

  const requested = Number(params.season);
  const activeSeason =
    Number.isInteger(requested) && seasons.includes(requested) ? requested : null;

  const episodes = await getEpisodes(
    activeSeason === null ? undefined : { season: activeSeason },
  );

  // A single season is not a filter, it is just the show.
  const showFilter = seasons.length > 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header>
        <Eyebrow>The Archive</Eyebrow>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">
          Episodes
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/65">
          Every conversation, newest first.
        </p>
      </header>

      {showFilter ? (
        <nav aria-label="Filter by season" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterLink href="/episodes" active={activeSeason === null}>
                All seasons
              </FilterLink>
            </li>
            {seasons.map((season) => (
              <li key={season}>
                <FilterLink
                  href={`/episodes?season=${season}`}
                  active={activeSeason === season}
                >
                  Season {season}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {episodes.length === 0 ? (
        <p className="mt-16 text-base text-cream/60">
          No episodes here yet. The first one is coming.
        </p>
      ) : (
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {episodes.map((episode, index) => (
            <li key={episode.id}>
              <EpisodeCard episode={episode} priority={index < 3} headingLevel={2} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`inline-block border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-magenta bg-magenta text-ink'
          : 'border-plum-line text-cream/80 hover:border-magenta hover:text-magenta'
      }`}
    >
      {children}
    </Link>
  );
}
