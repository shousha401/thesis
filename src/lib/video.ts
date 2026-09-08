/**
 * One place that understands video URLs.
 *
 * A host pastes whatever their phone gave them - a share sheet link with
 * tracking parameters, a timestamped link, a Shorts link, a youtu.be link - and
 * this turns it into the four things the site needs: which platform, the id,
 * a URL we can put in an iframe, and a thumbnail if the platform gives us one
 * for free.
 *
 * It fails closed. There is no partial success: either you get a fully usable
 * ParsedVideo, or you get an error message written for the person pasting the
 * link. Nothing half-parsed ever reaches the database, because a row that
 * cannot be embedded is worse than a form that refused to save.
 *
 * It is deliberately synchronous and network-free, which is what makes it
 * unit-testable and safe to call on every keystroke in the admin form.
 */

export type VideoProvider = 'youtube' | 'instagram' | 'tiktok';

export interface ParsedVideo {
  provider: VideoProvider;
  /** The platform's own id: a YouTube video id, an Instagram shortcode, a TikTok numeric id. */
  id: string;
  /** Safe to use as an iframe src. Never carries autoplay - the player adds that after a click. */
  embedUrl: string;
  /** Null when the platform does not expose a thumbnail without an API token. */
  thumbnailUrl: string | null;
  /**
   * YouTube only. maxresdefault does not exist for every video (older or
   * low-resolution uploads), so the image component falls back to this.
   */
  thumbnailFallbackUrl: string | null;
  /** The input with tracking parameters and timestamps stripped. Store this, not the raw paste. */
  canonicalUrl: string;
}

export type ParseVideoResult =
  | { ok: true; video: ParsedVideo }
  | { ok: false; error: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,32}$/;
const TIKTOK_ID = /^\d{6,32}$/;

function fail(error: string): ParseVideoResult {
  return { ok: false, error };
}

function ok(video: ParsedVideo): ParseVideoResult {
  return { ok: true, video };
}

/**
 * Accepts a bare domain ("youtube.com/watch?v=...") as well as a full URL,
 * because that is what you get when you copy from some mobile browsers.
 */
function toUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  // `new URL` happily accepts things that are not web addresses.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname.includes('.')) return null;

  return url;
}

/** Strips www./m./mobile. so host matching stays readable. */
function bareHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
}

function pathSegments(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

// --- YouTube ---------------------------------------------------------------

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'music.youtube.com',
  'gaming.youtube.com',
]);

function parseYouTube(url: URL): ParseVideoResult {
  const segments = pathSegments(url);
  const host = bareHost(url);
  let id: string | null = null;

  if (host === 'youtu.be') {
    // https://youtu.be/ID?t=42
    id = segments[0] ?? null;
  } else if (segments[0] === 'watch') {
    // https://www.youtube.com/watch?v=ID&list=...&t=90s
    id = url.searchParams.get('v');
  } else if (
    segments.length >= 2 &&
    (segments[0] === 'shorts' ||
      segments[0] === 'live' ||
      segments[0] === 'embed' ||
      segments[0] === 'v')
  ) {
    // /shorts/ID, /live/ID, /embed/ID, /v/ID
    id = segments[1];
  }

  if (!id) {
    return fail(
      'That looks like a YouTube link, but there is no video in it. Open the ' +
        'video itself and copy the link from the address bar or the Share button.',
    );
  }

  if (!YOUTUBE_ID.test(id)) {
    return fail(
      `"${id}" is not a valid YouTube video id. If you copied a channel or ` +
        'playlist link, open a single video and copy that link instead.',
    );
  }

  return ok({
    provider: 'youtube',
    id,
    // youtube-nocookie keeps YouTube from setting tracking cookies until the
    // visitor actually presses play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    thumbnailFallbackUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
  });
}

// --- Instagram -------------------------------------------------------------

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'instagr.am', 'ddinstagram.com']);

const INSTAGRAM_KINDS = new Set(['p', 'reel', 'reels', 'tv']);

/** Path segments that follow a kind but are not a post id. */
const INSTAGRAM_NON_IDS = new Set(['audio', 'tagged', 'explore']);

function parseInstagram(url: URL): ParseVideoResult {
  const segments = pathSegments(url);

  // Either /reel/CODE or /username/reel/CODE.
  let kindIndex = segments.findIndex((s) => INSTAGRAM_KINDS.has(s));
  if (kindIndex === -1) kindIndex = 0;

  const kind = segments[kindIndex];
  const code = segments[kindIndex + 1];

  if (!kind || !INSTAGRAM_KINDS.has(kind) || !code) {
    return fail(
      'That Instagram link does not point at a specific post or reel. Open the ' +
        'reel, tap the three dots, and choose "Copy link".',
    );
  }

  // /reels/audio/123 and friends are browsing URLs, not a single reel.
  if (!INSTAGRAM_CODE.test(code) || INSTAGRAM_NON_IDS.has(code.toLowerCase())) {
    return fail(`"${code}" is not a valid Instagram post id.`);
  }

  // "reels" is the plural browsing URL; the embed and canonical form is "reel".
  const normalizedKind = kind === 'reels' ? 'reel' : kind;

  return ok({
    provider: 'instagram',
    id: code,
    embedUrl: `https://www.instagram.com/${normalizedKind}/${code}/embed`,
    // Instagram does not serve a stable public thumbnail without an API token,
    // so the admin form will require an uploaded one.
    thumbnailUrl: null,
    thumbnailFallbackUrl: null,
    canonicalUrl: `https://www.instagram.com/${normalizedKind}/${code}/`,
  });
}

// --- TikTok ----------------------------------------------------------------

const TIKTOK_HOSTS = new Set(['tiktok.com']);
const TIKTOK_SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);

function parseTikTok(url: URL): ParseVideoResult {
  const segments = pathSegments(url);
  const videoIndex = segments.indexOf('video');

  // /t/CODE is the short form served from the main domain.
  if (segments[0] === 't') {
    return fail(shortTikTokMessage);
  }

  const id = videoIndex !== -1 ? segments[videoIndex + 1] : undefined;

  if (!id) {
    return fail(
      'That TikTok link does not point at a specific video. Open the video, ' +
        'tap Share, then "Copy link".',
    );
  }

  if (!TIKTOK_ID.test(id)) {
    return fail(`"${id}" is not a valid TikTok video id.`);
  }

  // Keep the @handle when the link had one; TikTok needs it for a shareable URL.
  const handle = segments.find((s) => s.startsWith('@'));

  return ok({
    provider: 'tiktok',
    id,
    embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
    // Same as Instagram: no thumbnail without an API call.
    thumbnailUrl: null,
    thumbnailFallbackUrl: null,
    canonicalUrl: handle
      ? `https://www.tiktok.com/${handle}/video/${id}`
      : `https://www.tiktok.com/embed/v2/${id}`,
  });
}

/**
 * vm.tiktok.com links are opaque redirects. Resolving one means making a
 * network request, which would make this function async and unpredictable
 * inside a form. Refusing with a clear instruction is better than saving a row
 * that silently will not embed.
 */
const shortTikTokMessage =
  'Short TikTok links (vm.tiktok.com) do not contain the video id, so they ' +
  'cannot be embedded. Open the link in your browser, then copy the full link ' +
  'from the address bar - it looks like tiktok.com/@name/video/1234567890.';

// --- Entry point -----------------------------------------------------------

export function parseVideoUrl(input: unknown): ParseVideoResult {
  if (typeof input !== 'string') {
    return fail('Paste a video link.');
  }

  const url = toUrl(input);
  if (!url) {
    return fail(
      'That is not a link. Paste the whole address, starting with https://',
    );
  }

  const host = bareHost(url);

  if (YOUTUBE_HOSTS.has(host)) return parseYouTube(url);
  if (INSTAGRAM_HOSTS.has(host)) return parseInstagram(url);
  if (TIKTOK_HOSTS.has(host)) return parseTikTok(url);
  if (TIKTOK_SHORT_HOSTS.has(url.hostname.toLowerCase())) {
    return fail(shortTikTokMessage);
  }

  return fail(
    `${url.hostname} is not supported. This site can embed YouTube, Instagram ` +
      'and TikTok links.',
  );
}

/**
 * Convenience for callers that only want the happy path (server actions
 * validate first, then use this).
 */
export function isSupportedVideoUrl(input: unknown): boolean {
  return parseVideoUrl(input).ok;
}
