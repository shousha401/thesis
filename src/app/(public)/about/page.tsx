import type { Metadata } from 'next';
import Link from 'next/link';
import { Band, Eyebrow } from '@/components/brand';
import { iconFor } from '@/components/icons';
import { PLATFORMS, SITE_DESCRIPTION, SITE_NAME, TAGLINES, TOPICS } from '@/config/site';
import { getHosts, getSiteSettings } from '@/lib/data';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'About',
  description: SITE_DESCRIPTION,
};

/**
 * Long-form editorial layout. The body copy comes from site_settings.about_body
 * so the hosts can rewrite their own story from the admin without a deploy;
 * paragraphs are split on blank lines the way they typed them.
 */
export default async function AboutPage() {
  const [settings, hosts] = await Promise.all([getSiteSettings(), getHosts()]);

  const paragraphs = settings.about_body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const platforms = PLATFORMS.filter((p) => settings.platform_links[p.key]);

  return (
    <div>
      <header className="border-b border-plum-line bg-plum">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Eyebrow>{TAGLINES.identity}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">
            About the show
          </h1>
          <p className="mt-6 font-display text-xl italic leading-snug text-cream/85 sm:text-2xl">
            {TAGLINES.primary}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {paragraphs.length > 0 ? (
          <div className="space-y-6">
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className={
                  index === 0
                    ? 'font-display text-2xl leading-snug text-cream sm:text-3xl'
                    : 'text-lg leading-relaxed text-cream/80'
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-lg text-cream/60">
            The story of {SITE_NAME} is being written. Check back soon.
          </p>
        )}

        <section aria-labelledby="topics" className="mt-14 border-t border-plum-line pt-10">
          <h2 id="topics" className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            What we talk about
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <li
                key={topic}
                className="border border-plum-line px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-cream/70"
              >
                {topic}
              </li>
            ))}
          </ul>
        </section>

        {settings.how_we_met ? (
          <section aria-labelledby="how-we-met" className="mt-12">
            <h2
              id="how-we-met"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-gold"
            >
              How we met
            </h2>
            <p className="prose-breaks mt-5 text-lg leading-relaxed text-cream/80">
              {settings.how_we_met}
            </p>
          </section>
        ) : null}

        {hosts.length > 0 ? (
          <p className="mt-12">
            <Link
              href="/hosts"
              className="inline-flex items-center gap-2 text-sm font-semibold text-magenta transition-colors hover:text-gold"
            >
              Meet {hosts.length === 3 ? 'all three of us' : 'the hosts'}{' '}
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        ) : null}
      </div>

      {platforms.length > 0 ? (
        <>
          <Band />
          <section aria-labelledby="about-listen" className="bg-plum">
            <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
              <h2
                id="about-listen"
                className="font-display text-3xl leading-tight text-cream sm:text-4xl"
              >
                {TAGLINES.secondary}
              </h2>
              <ul className="mt-7 flex flex-wrap gap-3">
                {platforms.map((platform) => {
                  const Icon = iconFor(platform.key);
                  return (
                    <li key={platform.key}>
                      <a
                        href={settings.platform_links[platform.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 border border-cream/25 px-5 py-3 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
                      >
                        {Icon ? <Icon /> : null}
                        {platform.label}
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
