import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eyebrow } from '@/components/brand';
import { HostPhoto } from '@/components/host-photo';
import { JsonLd } from '@/components/json-ld';
import { BRAND_OG, SITE_NAME, SITE_URL } from '@/config/site';
import { getHostBySlug, getHosts, getSiteSettings } from '@/lib/data';
import { storageUrl } from '@/lib/data';
import { excerpt } from '@/lib/format';
import { personSchema } from '@/lib/structured-data';
import { HostSocials } from '@/components/host-socials';

export const revalidate = 300;

export async function generateStaticParams() {
  const hosts = await getHosts();
  return hosts.map((host) => ({ slug: host.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const host = await getHostBySlug(slug);
  if (!host) return { title: 'Host not found' };

  const description = excerpt(host.bio, 200) || `${host.name}, a host of ${SITE_NAME}.`;
  const photo = storageUrl('host-photos', host.photo_path);
  const canonical = `${SITE_URL}/hosts/${host.slug}`;

  return {
    title: host.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      title: `${host.name} — ${SITE_NAME}`,
      description,
      url: canonical,
      images: [{ url: photo ?? BRAND_OG, alt: host.photo_alt ?? host.name }],
    },
  };
}

export default async function HostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [host, hosts, settings] = await Promise.all([
    getHostBySlug(slug),
    getHosts(),
    getSiteSettings(),
  ]);

  if (!host) notFound();

  const others = hosts.filter((h) => h.slug !== host.slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <JsonLd data={personSchema(host)} />

      <Link
        href="/hosts"
        className="text-sm font-semibold text-cream/60 transition-colors hover:text-magenta"
      >
        <span aria-hidden="true">←</span> All hosts
      </Link>

      <article className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,320px)_1fr] sm:gap-10">
        <HostPhoto host={host} priority sizes="(min-width: 640px) 320px, 100vw" />

        <div>
          {host.zodiac ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              {host.zodiac}
            </p>
          ) : null}

          <h1 className="mt-2 font-display text-4xl leading-tight text-cream sm:text-5xl">
            {host.name}
          </h1>

          {host.bio ? (
            <p className="prose-breaks mt-6 text-lg leading-relaxed text-cream/80">
              {host.bio}
            </p>
          ) : null}

          <HostSocials host={host} />
        </div>
      </article>

      {settings.how_we_met ? (
        <section aria-labelledby="how-we-met" className="mt-16 border-t border-plum-line pt-10">
          <Eyebrow>The origin story</Eyebrow>
          <h2 id="how-we-met" className="mt-3 font-display text-2xl text-cream sm:text-3xl">
            How we met
          </h2>
          <p className="prose-breaks mt-5 max-w-2xl text-base leading-relaxed text-cream/75">
            {settings.how_we_met}
          </p>
        </section>
      ) : null}

      {others.length > 0 ? (
        <nav aria-label="Other hosts" className="mt-14 border-t border-plum-line pt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            The others
          </h2>
          <ul className="mt-5 flex flex-wrap gap-3">
            {others.map((other) => (
              <li key={other.id}>
                <Link
                  href={`/hosts/${other.slug}`}
                  className="inline-block border border-plum-line px-5 py-3 font-display text-lg text-cream transition-colors hover:border-magenta hover:text-magenta"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
