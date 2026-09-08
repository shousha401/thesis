import Link from 'next/link';
import { Eyebrow, Wordmark } from '@/components/brand';
import { NAV_LINKS } from '@/config/site';

/**
 * 404. In the show's voice rather than an apology, and it always offers a way
 * onward - most people who land here followed an old link from a social post.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
      {/* The root 404 sits outside the public layout, so it carries its own
          wordmark rather than rendering with no branding at all. */}
      <Link href="/" className="text-2xl">
        <Wordmark />
      </Link>

      <div className="mt-10">
        <Eyebrow>404</Eyebrow>
      </div>

      <h1 className="mt-5 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">
        We can&rsquo;t find that one
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
        The link might be old, or we might have moved something. Either way,
        it&rsquo;s on us. Here&rsquo;s where everything lives:
      </p>

      <ul className="mt-8 flex flex-wrap gap-3">
        <li>
          <Link
            href="/"
            className="inline-block bg-magenta px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold"
          >
            Home
          </Link>
        </li>
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block border border-plum-line px-5 py-3 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
