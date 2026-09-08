import Link from 'next/link';
import { NAV_LINKS, PLATFORMS, SITE_NAME, SOCIALS, TAGLINES } from '@/config/site';
import type { SiteSettings } from '@/lib/types';
import { Band, Wordmark } from './brand';
import { iconFor } from './icons';

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const platforms = PLATFORMS.filter((p) => settings.platform_links[p.key]);
  const socials = SOCIALS.filter((s) => settings.social_links[s.key]);
  const email = settings.social_links.email;

  return (
    <footer className="mt-24 bg-plum">
      <Band />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="text-3xl">
              <Wordmark />
            </Link>
            <p className="mt-5 max-w-sm font-display text-xl italic text-cream/80">
              {TAGLINES.secondary}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/60">
              {TAGLINES.primary}
            </p>
          </div>

          <nav aria-labelledby="footer-explore">
            <h2
              id="footer-explore"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-gold"
            >
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream/75 transition-colors hover:text-magenta"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Listen
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {platforms.map((platform) => {
                const Icon = iconFor(platform.key);
                return (
                  <li key={platform.key}>
                    <a
                      href={settings.platform_links[platform.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 text-cream/75 transition-colors hover:text-magenta"
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      {platform.label}
                    </a>
                  </li>
                );
              })}
            </ul>

            {socials.length > 0 ? (
              <>
                <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                  Follow
                </h2>
                <ul className="mt-4 flex gap-2">
                  {socials.map((social) => {
                    const Icon = iconFor(social.key);
                    if (!Icon) return null;
                    return (
                      <li key={social.key}>
                        <a
                          href={settings.social_links[social.key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-plum-line text-cream/75 transition-colors hover:border-magenta hover:text-magenta"
                        >
                          <span className="sr-only">
                            {social.label} (opens in a new tab)
                          </span>
                          <Icon />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-plum-line pt-6 text-xs text-cream/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          {email ? (
            <a
              href={`mailto:${email}`}
              className="transition-colors hover:text-magenta"
            >
              {email}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
