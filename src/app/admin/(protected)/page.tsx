import Link from 'next/link';
import { listEpisodes } from '@/lib/admin/queries';

export const metadata = { title: 'Dashboard' };

/**
 * Deliberately thin. The client's flow is "log in, add an episode", so the
 * landing screen puts that one button first and gets out of the way.
 */
export default async function AdminHome() {
  const episodes = await listEpisodes();
  const drafts = episodes.filter((e) => !e.is_published).length;

  return (
    <div>
      <h1 className="font-display text-3xl text-cream">Hey</h1>
      <p className="mt-2 text-sm text-cream/60">
        {episodes.length} episode{episodes.length === 1 ? '' : 's'}
        {drafts > 0 ? `, ${drafts} still a draft` : ''}.
      </p>

      <Link
        href="/admin/episodes/new"
        className="mt-8 block bg-magenta px-6 py-4 text-center text-base font-semibold text-ink transition-colors hover:bg-gold"
      >
        Add a new episode
      </Link>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { href: '/admin/episodes', label: 'All episodes' },
          { href: '/admin/clips', label: 'Clips' },
          { href: '/admin/live', label: 'Live events' },
          { href: '/admin/hosts', label: 'Your bios' },
          { href: '/admin/settings', label: 'Links & about' },
        ].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block border border-plum-line px-5 py-4 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
