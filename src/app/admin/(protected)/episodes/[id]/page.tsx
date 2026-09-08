import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EpisodeForm } from '@/components/admin/episode-form';
import { getEpisodeForEdit } from '@/lib/admin/queries';
import { episodeLabel } from '@/lib/format';
import { updateEpisode, type EpisodeFormState } from '../actions';

export const metadata = { title: 'Edit episode' };

export default async function EditEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await getEpisodeForEdit(id);

  if (!episode) notFound();

  // Binds the row id to the action without exposing it as a form field that
  // could be tampered with.
  async function action(state: EpisodeFormState, formData: FormData) {
    'use server';
    return updateEpisode(id, state, formData);
  }

  return (
    <div>
      <Link
        href="/admin/episodes"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        ← Episodes
      </Link>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
        {episodeLabel(episode.episode_number, episode.season)}
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-cream">
        {episode.title}
      </h1>
      <p className="mt-2 text-sm text-cream/50">
        Web address: /episodes/{episode.slug}
        <span className="block text-xs text-cream/40">
          This never changes, even if you rename the episode, so old links keep working.
        </span>
      </p>

      <EpisodeForm action={action} episode={episode} submitLabel="Save changes" />
    </div>
  );
}
