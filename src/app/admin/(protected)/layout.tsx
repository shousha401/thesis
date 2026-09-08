import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
};

/**
 * Nothing inside this group renders for anyone who is not signed in and on the
 * allow-list. The check is here rather than in each page so a new screen cannot
 * be added without it.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-plum-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="text-xl">
            <Wordmark />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream/60 transition-colors hover:text-magenta"
            >
              View site
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-semibold text-cream/60 transition-colors hover:text-magenta"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="Admin sections" className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Scrolls sideways on a narrow phone rather than wrapping to two rows. */}
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {ADMIN_NAV.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="block whitespace-nowrap px-3 py-2 text-sm font-medium text-cream/70 transition-colors hover:text-magenta"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <p className="border-t border-plum-line pt-5 text-xs text-cream/40">
          Signed in as {session.email}
        </p>
      </footer>
    </div>
  );
}

const ADMIN_NAV = [
  { href: '/admin/episodes', label: 'Episodes' },
  { href: '/admin/clips', label: 'Clips' },
  { href: '/admin/live', label: 'Live' },
  { href: '/admin/hosts', label: 'Hosts' },
  { href: '/admin/settings', label: 'Settings' },
];

async function signOut() {
  'use server';
  const supabase = await createAdminClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
