'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_LINKS, PLATFORMS } from '@/config/site';
import { Wordmark } from './brand';
import { iconFor } from './icons';

/**
 * Sticky header. Mobile-first: the nav collapses to a disclosure button under
 * the small breakpoint and sits inline above it.
 *
 * The menu is a plain toggle - no transition on the panel itself, so nothing a
 * visitor needs is ever mid-animation. Escape closes it, and it closes on
 * navigation.
 */
export function SiteHeader({ platformLinks }: { platformLinks: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const platforms = PLATFORMS.filter((p) => platformLinks[p.key]);

  return (
    <header className="sticky top-0 z-50 border-b border-plum-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-2xl sm:text-[1.75rem]">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm font-medium">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`transition-colors hover:text-magenta ${
                      active ? 'text-magenta' : 'text-cream/85'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 sm:flex">
            {platforms.map((platform) => {
              const Icon = iconFor(platform.key);
              if (!Icon) return null;
              return (
                <li key={platform.key}>
                  <a
                    href={platformLinks[platform.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-cream/75 transition-colors hover:bg-plum hover:text-magenta"
                  >
                    <span className="sr-only">
                      {platform.label} (opens in a new tab)
                    </span>
                    <Icon />
                  </a>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex h-10 w-10 items-center justify-center rounded-full text-cream transition-colors hover:bg-plum md:hidden"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <path d="M5 5l14 14" />
                  <path d="M19 5L5 19" />
                </>
              ) : (
                <>
                  <path d="M3.5 7h17" />
                  <path d="M3.5 12h17" />
                  <path d="M3.5 17h17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-plum-line bg-ink md:hidden"
        >
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`block border-b border-plum-line/60 py-3 text-base ${
                      active ? 'text-magenta' : 'text-cream'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="mx-auto flex max-w-6xl gap-2 px-4 pb-4 sm:px-6">
            {platforms.map((platform) => {
              const Icon = iconFor(platform.key);
              if (!Icon) return null;
              return (
                <li key={platform.key}>
                  <a
                    href={platformLinks[platform.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-plum-line px-3 py-2 text-sm text-cream/85"
                  >
                    <Icon className="h-4 w-4" />
                    {platform.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
