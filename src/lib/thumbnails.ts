import { storageUrl } from './data';

/**
 * Where a thumbnail comes from, in priority order:
 *   1. an image the hosts uploaded (always wins - it is a deliberate choice),
 *   2. YouTube's generated thumbnail, if the video is on YouTube,
 *   3. nothing, and the poster renders the branded plate.
 *
 * Instagram and TikTok never reach step 2, which is why the admin requires an
 * upload for those providers.
 *
 * YouTube size, and why it depends on where the image is used:
 *
 *   maxresdefault (1280x720) does not exist for every video - older or
 *   low-resolution uploads have no such file, and requesting it 404s. The
 *   component recovers by falling back, so nothing breaks, but the failed
 *   request is still logged as a console error.
 *
 *   hqdefault (480x360) always exists. It is more than enough for a card in a
 *   grid, so cards ask for it directly and never 404. Only the large hero
 *   players, where the difference is visible, gamble on maxresdefault.
 */
export function thumbnailsFor(
  item: {
    thumbnail_path: string | null;
    video_provider: string;
    video_id: string;
  },
  size: 'card' | 'hero' = 'hero',
): { url: string | null; fallbackUrl: string | null } {
  const uploaded = storageUrl('thumbnails', item.thumbnail_path);
  if (uploaded) return { url: uploaded, fallbackUrl: null };

  if (item.video_provider === 'youtube') {
    const hq = `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`;
    if (size === 'card') return { url: hq, fallbackUrl: null };

    return {
      url: `https://i.ytimg.com/vi/${item.video_id}/maxresdefault.jpg`,
      fallbackUrl: hq,
    };
  }

  return { url: null, fallbackUrl: null };
}

/** The embed URL for a stored row, without re-parsing the original link. */
export function embedUrlFor(item: { video_provider: string; video_id: string }): string {
  switch (item.video_provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${item.video_id}`;
    case 'instagram':
      return `https://www.instagram.com/reel/${item.video_id}/embed`;
    case 'tiktok':
      return `https://www.tiktok.com/embed/v2/${item.video_id}`;
    default:
      return '';
  }
}
