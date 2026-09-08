import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { SITE_NAME } from '@/config/site';

export const metadata: Metadata = {
  title: 'Not authorized',
  robots: { index: false, follow: false },
};

/**
 * Shown when someone signs in successfully with an email that is not on the
 * allow-list. The tone is friendly and the page is a dead end by design: it
 * says what happened, offers the way back to the public site, and does not hint
 * at which addresses would work.
 */
export default function NotAuthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <div className="text-3xl">
        <Wordmark />
      </div>

      <h1 className="mt-8 font-display text-3xl leading-tight text-cream">
        This account can&rsquo;t get in
      </h1>

      <p className="mt-4 text-base leading-relaxed text-cream/75">
        Your email checked out, but it isn&rsquo;t on the list of people who can
        edit {SITE_NAME}. If you think it should be, ask one of the hosts to add
        you.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/"
          className="w-full bg-magenta px-6 py-3.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-gold"
        >
          Back to the site
        </Link>
        <Link
          href="/admin/login"
          className="w-full border border-plum-line px-6 py-3.5 text-center text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
        >
          Try a different email
        </Link>
      </div>
    </main>
  );
}
