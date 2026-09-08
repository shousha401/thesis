import Link from 'next/link';
import { Tag } from '@/components/admin/content-list';
import { DangerButton } from '@/components/admin/ui';
import { listLiveEvents } from '@/lib/admin/queries';
import { formatDateTime } from '@/lib/format';
import { deleteLiveEvent, setLiveStatus } from './actions';

export const metadata = { title: 'Live events' };

const NEXT_STATUS: Record<string, { to: string; label: string } | null> = {
  scheduled: { to: 'live', label: 'Go live now' },
  live: { to: 'ended', label: 'End the stream' },
  ended: null,
};

export default async function AdminLivePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const events = await listLiveEvents();

  return (
    <div>
      {params.saved ? (
        <p
          role="status"
          className="mb-6 border border-gold bg-gold/10 px-4 py-3 text-sm text-cream"
        >
          Saved. The site is already updated.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-cream">Live events</h1>
        <Link
          href="/admin/live/new"
          className="shrink-0 bg-magenta px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold"
        >
          New event
        </Link>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-cream/60">
        The soonest scheduled event shows as a banner on the home page. Setting
        one to <strong className="text-cream/80">Live now</strong> switches the
        Live page over immediately.
      </p>

      {events.length === 0 ? (
        <p className="mt-10 text-cream/60">Nothing scheduled.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {events.map((event) => {
            const next = NEXT_STATUS[event.status];

            return (
              <li key={event.id} className="border border-plum-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {event.status === 'live' ? (
                    <Tag tone="live">Live now</Tag>
                  ) : event.status === 'scheduled' ? (
                    <Tag tone="draft">Scheduled</Tag>
                  ) : (
                    <Tag tone="muted">Ended</Tag>
                  )}
                  <span className="text-xs uppercase tracking-[0.12em] text-cream/45">
                    {event.platform}
                  </span>
                </div>

                <h2 className="mt-2 font-display text-xl leading-snug text-cream">
                  {event.title}
                </h2>
                <p className="mt-1 text-sm text-cream/55">
                  <time dateTime={event.scheduled_at}>
                    {formatDateTime(event.scheduled_at)}
                  </time>
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/live/${event.id}`}
                    className="border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
                  >
                    Edit
                  </Link>

                  {next ? (
                    <form action={setLiveStatus}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="status" value={next.to} />
                      <button
                        type="submit"
                        className="border border-magenta px-4 py-2.5 text-sm font-semibold text-magenta transition-colors hover:bg-magenta hover:text-ink"
                      >
                        {next.label}
                      </button>
                    </form>
                  ) : null}

                  <form action={deleteLiveEvent}>
                    <input type="hidden" name="id" value={event.id} />
                    {/* Live events have no public URL of their own, so this is a
                        real delete rather than a soft one. */}
                    <DangerButton
                      confirm={`Delete "${event.title}"? This one cannot be undone.`}
                    >
                      Delete
                    </DangerButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
