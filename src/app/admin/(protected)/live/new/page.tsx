import Link from 'next/link';
import { LiveForm } from '@/components/admin/live-form';
import { createLiveEvent } from '../actions';

export const metadata = { title: 'New live event' };

export default function NewLiveEventPage() {
  return (
    <div>
      <Link
        href="/admin/live"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        <span aria-hidden="true">←</span> Live events
      </Link>

      <h1 className="mt-4 font-display text-3xl text-cream">New live event</h1>
      <p className="mt-2 text-sm text-cream/60">
        Schedule it now and set it to Live when you go on air.
      </p>

      <LiveForm action={createLiveEvent} submitLabel="Save event" />
    </div>
  );
}
