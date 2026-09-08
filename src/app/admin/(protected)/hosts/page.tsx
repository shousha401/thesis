import Link from 'next/link';
import { listHostsForAdmin } from '@/lib/admin/queries';

export const metadata = { title: 'Hosts' };

/**
 * List only, with no create or delete: there are three hosts and that is fixed.
 */
export default async function AdminHostsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const hosts = await listHostsForAdmin();

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

      <h1 className="font-display text-3xl text-cream">Hosts</h1>
      <p className="mt-2 text-sm text-cream/60">
        Edit your own name, bio, photo and links.
      </p>

      <ul className="mt-8 space-y-3">
        {hosts.map((host) => (
          <li key={host.id} className="border border-plum-line p-4">
            {host.zodiac ? (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                {host.zodiac}
              </p>
            ) : null}
            <h2 className="mt-1 font-display text-xl text-cream">{host.name}</h2>
            <p className="mt-1 text-xs text-cream/45">/hosts/{host.slug}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/admin/hosts/${host.id}`}
                className="border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
              >
                Edit
              </Link>
              <a
                href={`/hosts/${host.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream/70 transition-colors hover:border-magenta hover:text-magenta"
              >
                View
                <span className="sr-only"> {host.name} (opens in a new tab)</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
