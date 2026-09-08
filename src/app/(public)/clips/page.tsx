import type { Metadata } from 'next';
import { Eyebrow } from '@/components/brand';
import { ClipCard } from '@/components/cards';
import { SITE_NAME } from '@/config/site';
import { getClips } from '@/lib/data';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Clips',
  description: `Short clips, quotes and the moments that got out of hand, from ${SITE_NAME}.`,
};

export default async function ClipsPage() {
  const clips = await getClips();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header>
        <Eyebrow>Short and Loud</Eyebrow>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">
          Clips
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/65">
          The bits that ended up on your For You page.
        </p>
      </header>

      {clips.length === 0 ? (
        <p className="mt-16 text-base text-cream/60">No clips yet.</p>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
          {clips.map((clip) => (
            <li key={clip.id}>
              <ClipCard clip={clip} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
