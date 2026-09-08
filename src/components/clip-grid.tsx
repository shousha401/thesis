import type { Clip } from '@/lib/types';
import { ClipCard } from './cards';

/**
 * The clip grid.
 *
 * Clips mix portrait and landscape, so the grid packs densely: a portrait card
 * spans two rows and two landscape cards stack alongside it, rather than every
 * row being as tall as its tallest card. `grid-flow-row-dense` lets a later
 * landscape card backfill a gap a portrait card left above it.
 *
 * Every card reserves its space through an aspect-ratio box before its image
 * loads, so nothing reflows as the thumbnails arrive.
 */
export function ClipGrid({
  clips,
  headingLevel = 3,
}: {
  clips: Clip[];
  headingLevel?: 2 | 3;
}) {
  return (
    <ul className="grid grid-flow-row-dense grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
      {clips.map((clip) => (
        <li
          key={clip.id}
          className={clip.aspect === 'portrait' ? 'row-span-2' : 'row-span-1'}
        >
          <ClipCard clip={clip} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
