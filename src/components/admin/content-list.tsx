import Link from 'next/link';
import { DangerButton } from '@/components/admin/ui';

/**
 * The list screen shared by episodes and clips.
 *
 * The two differ only in their labels and the extra metadata line, so the
 * publish toggle, soft-delete/restore flow, deleted-items view and the "saved"
 * banner live here once.
 */

export interface ContentListItem {
  id: string;
  title: string;
  /** Where the admin edit form lives. */
  editHref: string;
  /** The public URL, when it is published and therefore viewable. */
  publicHref: string | null;
  isPublished: boolean;
  isDeleted: boolean;
  /** Small line above the title: episode number, provider, date. */
  meta: React.ReactNode;
}

export function ContentList({
  heading,
  noun,
  items,
  basePath,
  newHref,
  saved,
  showDeleted,
  deletedCount,
  onTogglePublished,
  onDelete,
  onRestore,
}: {
  heading: string;
  /** Singular, lowercase: "episode", "clip". */
  noun: string;
  items: ContentListItem[];
  basePath: string;
  newHref: string;
  saved: boolean;
  showDeleted: boolean;
  deletedCount: number;
  onTogglePublished: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
  onRestore: (formData: FormData) => Promise<void>;
}) {
  return (
    <div>
      {saved ? (
        <p
          role="status"
          className="mb-6 border border-gold bg-gold/10 px-4 py-3 text-sm text-cream"
        >
          Saved. The site is already updated.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-cream">{heading}</h1>
        <Link
          href={newHref}
          className="shrink-0 bg-magenta px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold"
        >
          New {noun}
        </Link>
      </div>

      {deletedCount > 0 ? (
        <p className="mt-4 text-sm">
          <Link
            href={showDeleted ? basePath : `${basePath}?show=deleted`}
            className="text-cream/60 underline underline-offset-4 hover:text-magenta"
          >
            {showDeleted
              ? `← Back to active ${noun}s`
              : `View ${deletedCount} deleted ${noun}${deletedCount === 1 ? '' : 's'}`}
          </Link>
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-10 text-cream/60">
          {showDeleted ? 'Nothing deleted.' : `No ${noun}s yet.`}
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border border-plum-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                {item.isDeleted ? (
                  <Tag tone="muted">Deleted</Tag>
                ) : item.isPublished ? (
                  <Tag tone="live">Published</Tag>
                ) : (
                  <Tag tone="draft">Draft</Tag>
                )}
                {item.meta}
              </div>

              <h2 className="mt-2 font-display text-xl leading-snug text-cream">
                {item.title}
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.isDeleted ? (
                  <form action={onRestore}>
                    <input type="hidden" name="id" value={item.id} />
                    <PlainButton>Restore</PlainButton>
                  </form>
                ) : (
                  <>
                    <Link
                      href={item.editHref}
                      className="border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
                    >
                      Edit
                    </Link>

                    <form action={onTogglePublished}>
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={item.isPublished ? 'false' : 'true'}
                      />
                      <PlainButton>
                        {item.isPublished ? 'Unpublish' : 'Publish'}
                      </PlainButton>
                    </form>

                    {item.publicHref ? (
                      <a
                        href={item.publicHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream/70 transition-colors hover:border-magenta hover:text-magenta"
                      >
                        View
                        <span className="sr-only">
                          {' '}
                          {item.title} (opens in a new tab)
                        </span>
                      </a>
                    ) : null}

                    <form action={onDelete}>
                      <input type="hidden" name="id" value={item.id} />
                      {/* Confirmed because it sits one tap from Edit on a
                          phone. It is reversible, but a mis-tap should not
                          remove something from the site silently. */}
                      <DangerButton
                        confirm={`Delete "${item.title}"? It will disappear from the site. You can restore it afterwards.`}
                      >
                        Delete
                      </DangerButton>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Tag({
  tone,
  children,
}: {
  tone: 'live' | 'draft' | 'muted';
  children: React.ReactNode;
}) {
  const styles = {
    live: 'border-magenta text-magenta',
    draft: 'border-plum-line text-cream/60',
    muted: 'border-plum-line text-cream/40',
  }[tone];

  return (
    <span
      className={`border px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${styles}`}
    >
      {children}
    </span>
  );
}

function PlainButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
    >
      {children}
    </button>
  );
}
