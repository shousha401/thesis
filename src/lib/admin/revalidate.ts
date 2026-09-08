import { revalidatePath } from 'next/cache';

/**
 * Every cache invalidation the admin performs, in one file.
 *
 * Keeping them together is the point: the bugs here are all of the form "this
 * content also appears somewhere I forgot about", and that is much easier to
 * audit as a list than scattered across five action files.
 *
 * The map of what appears where:
 *
 *   episode title/date -> /, /episodes, /episodes/[slug], and every
 *                         /clips/[slug] that names it as its parent
 *   clip               -> /, /clips, /clips/[slug]
 *   host               -> /, /hosts, /hosts/[slug], /about
 *   live event         -> /, /live
 *   site settings      -> the header and footer of EVERY page
 */

/** The sitemap lists every episode, clip and host, so content changes move it. */
function revalidateSitemap() {
  revalidatePath('/sitemap.xml');
}

export function revalidateEpisode(
  slug?: string | null,
  /**
   * Slugs of clips that name this episode as their parent. A clip page shows
   * "From the episode: <title>", so retitling an episode has to reach them.
   *
   * These are passed in explicitly rather than using the route-pattern form
   * `revalidatePath('/clips/[slug]', 'page')` - that was tried first and did
   * not invalidate the pages in practice, leaving the old title visible.
   */
  affectedClipSlugs: string[] = [],
) {
  revalidatePath('/'); // home features the latest episode
  revalidatePath('/episodes');
  if (slug) revalidatePath(`/episodes/${slug}`);

  revalidatePath('/clips');
  for (const clipSlug of affectedClipSlugs) {
    revalidatePath(`/clips/${clipSlug}`);
  }

  revalidateSitemap();
  revalidatePath('/admin/episodes');
}

export function revalidateClip(slug?: string | null) {
  revalidatePath('/'); // home shows the newest clips
  revalidatePath('/clips');
  if (slug) revalidatePath(`/clips/${slug}`);
  revalidateSitemap();
  revalidatePath('/admin/clips');
}

/** Pass both the old and the new slug: a host's slug can change. */
export function revalidateHost(...slugs: (string | null | undefined)[]) {
  revalidatePath('/'); // the "who we are" block
  revalidatePath('/hosts');
  for (const slug of slugs) {
    if (slug) revalidatePath(`/hosts/${slug}`);
  }
  revalidatePath('/about'); // links to the hosts
  revalidateSitemap();
  revalidatePath('/admin/hosts');
}

export function revalidateLive() {
  revalidatePath('/'); // the upcoming-live banner
  revalidatePath('/live');
  revalidatePath('/admin/live');
}

/**
 * Settings appear in the header and footer of every page, including the detail
 * pages. Listing the top-level routes individually left
 * /episodes/[slug], /clips/[slug] and /hosts/[slug] showing a stale Spotify
 * link, so this revalidates the whole layout instead.
 */
export function revalidateSiteSettings() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
}
