import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipForm } from '@/components/admin/clip-form';
import { episodeOptions, getClipForEdit } from '@/lib/admin/queries';
import { updateClip, type ClipFormState } from '../actions';

export const metadata = { title: 'Edit clip' };

export default async function EditClipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [clip, episodes] = await Promise.all([getClipForEdit(id), episodeOptions()]);

  if (!clip) notFound();

  async function action(state: ClipFormState, formData: FormData) {
    'use server';
    return updateClip(id, state, formData);
  }

  return (
    <div>
      <Link
        href="/admin/clips"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        <span aria-hidden="true">←</span> Clips
      </Link>

      <h1 className="mt-4 font-display text-3xl leading-tight text-cream">
        {clip.title}
      </h1>
      <p className="mt-2 text-sm text-cream/50">
        Web address: /clips/{clip.slug}
        <span className="block text-xs text-cream/40">
          This never changes, so links already shared keep working.
        </span>
      </p>

      <ClipForm
        action={action}
        clip={clip}
        episodes={episodes}
        submitLabel="Save changes"
      />
    </div>
  );
}
