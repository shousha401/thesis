import Link from 'next/link';
import { ClipForm } from '@/components/admin/clip-form';
import { episodeOptions } from '@/lib/admin/queries';
import { createClip } from '../actions';

export const metadata = { title: 'New clip' };

export default async function NewClipPage() {
  const episodes = await episodeOptions();

  return (
    <div>
      <Link
        href="/admin/clips"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        <span aria-hidden="true">←</span> Clips
      </Link>

      <h1 className="mt-4 font-display text-3xl text-cream">New clip</h1>
      <p className="mt-2 text-sm text-cream/60">
        Paste the Short, Reel or TikTok link and give it a title.
      </p>

      <ClipForm action={createClip} episodes={episodes} submitLabel="Save clip" />
    </div>
  );
}
