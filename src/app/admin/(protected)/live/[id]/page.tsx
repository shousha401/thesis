import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LiveForm } from '@/components/admin/live-form';
import { getLiveEventForEdit } from '@/lib/admin/queries';
import { updateLiveEvent, type LiveFormState } from '../actions';

export const metadata = { title: 'Edit live event' };

export default async function EditLiveEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getLiveEventForEdit(id);

  if (!event) notFound();

  async function action(state: LiveFormState, formData: FormData) {
    'use server';
    return updateLiveEvent(id, state, formData);
  }

  return (
    <div>
      <Link
        href="/admin/live"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        <span aria-hidden="true">←</span> Live events
      </Link>

      <h1 className="mt-4 font-display text-3xl leading-tight text-cream">
        {event.title}
      </h1>

      <LiveForm action={action} event={event} submitLabel="Save changes" />
    </div>
  );
}
