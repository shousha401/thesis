import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getSiteSettings } from '@/lib/data';

/**
 * Chrome for the public site only.
 *
 * The admin lives outside this group so it does not inherit the marketing
 * header and footer - the hosts editing an episode on a phone do not need a
 * "Listen on Spotify" row above the form.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="skip-link bg-magenta px-4 py-2 text-sm font-semibold text-ink"
      >
        Skip to content
      </a>
      <SiteHeader platformLinks={settings.platform_links} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
