import Link from 'next/link';
import { EpisodeForm } from '@/components/admin/episode-form';
import { nextEpisodeNumber } from '@/lib/admin/queries';
import { createEpisode } from '../actions';

export const metadata = { title: 'New episode' };

export default async function NewEpisodePage() {
  const suggested = await nextEpisodeNumber();

  return (
    <div>
      <Link
        href="/admin/episodes"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        ← Episodes
      </Link>

      <h1 className="mt-4 font-display text-3xl text-cream">New episode</h1>
      <p className="mt-2 text-sm text-cream/60">
        Paste the video link, add a title, and save.
      </p>

      <EpisodeForm
        action={createEpisode}
        defaultEpisodeNumber={suggested}
        submitLabel="Save episode"
      />
    </div>
  );
}
