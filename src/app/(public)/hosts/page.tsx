import type { Metadata } from 'next';
import Link from 'next/link';
import { Band, Eyebrow } from '@/components/brand';
import { HostPhoto } from '@/components/host-photo';
import { HostSocials } from '@/components/host-socials';
import { SITE_NAME, TAGLINES } from '@/config/site';
import { getHosts, getSiteSettings } from '@/lib/data';
import type { Host } from '@/lib/types';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Hosts',
  description: `The three women behind ${SITE_NAME}. ${TAGLINES.identity}`,
};

export default async function HostsPage() {
  const [hosts, settings] = await Promise.all([getHosts(), getSiteSettings()]);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <header>
          <Eyebrow>{TAGLINES.identity}</Eyebrow>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">
            The hosts
          </h1>
        </header>

        <div className="mt-14 space-y-16 sm:space-y-20">
          {hosts.map((host, index) => (
            <HostProfile key={host.id} host={host} priority={index === 0} />
          ))}
        </div>
      </div>

      {settings.how_we_met ? (
        <>
          <Band />
          <section aria-labelledby="how-we-met" className="bg-plum">
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
              <Eyebrow>The origin story</Eyebrow>
              <h2
                id="how-we-met"
                className="mt-4 font-display text-3xl leading-[1.1] text-cream sm:text-4xl"
              >
                How we met
              </h2>
              <p className="prose-breaks mt-6 text-lg leading-relaxed text-cream/80">
                {settings.how_we_met}
              </p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

/**
 * Each profile carries an id so /hosts#slug works as an anchor target, which is
 * what the home page links to. The dedicated /hosts/[slug] page exists as well,
 * for anyone who wants a single shareable URL.
 */
function HostProfile({ host, priority }: { host: Host; priority: boolean }) {
  return (
    <article
      id={host.slug}
      className="grid scroll-mt-24 gap-6 sm:grid-cols-[minmax(0,300px)_1fr] sm:gap-10"
    >
      <HostPhoto
        host={host}
        priority={priority}
        sizes="(min-width: 640px) 300px, 100vw"
      />

      <div>
        {host.zodiac ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            {host.zodiac}
          </p>
        ) : null}

        <h2 className="mt-2 font-display text-3xl leading-tight text-cream sm:text-4xl">
          {host.name}
        </h2>

        {host.bio ? (
          <p className="prose-breaks mt-5 max-w-2xl text-base leading-relaxed text-cream/75">
            {host.bio}
          </p>
        ) : null}

        <HostSocials host={host} />

        <Link
          href={`/hosts/${host.slug}`}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-magenta transition-colors hover:text-gold"
        >
          {host.name}&rsquo;s page <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
