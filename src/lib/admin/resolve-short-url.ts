import { parseVideoUrl, type ParseVideoResult } from '@/lib/video';

/**
 * Turns a share-sheet short link into something parseVideoUrl can read.
 *
 * `vm.tiktok.com/ZMxxxx/` is what the TikTok share sheet actually puts on the
 * clipboard, so hosts will paste it constantly. It is an opaque redirect that
 * carries no video id, which is why `parseVideoUrl` - which is pure and
 * network-free by design - refuses it.
 *
 * This runs BEFORE the parser, in the server action, and follows exactly one
 * redirect hop. The parser itself stays synchronous and untouched.
 *
 * Fails soft: if the redirect times out or misbehaves, the original URL is
 * handed to the parser unchanged and the host sees the parser's own
 * "paste the full link" message rather than a network error.
 */

const SHORT_LINK_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
const TIMEOUT_MS = 5000;

export function isShortVideoUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    if (SHORT_LINK_HOSTS.has(url.hostname.toLowerCase())) return true;
    // tiktok.com/t/CODE is the same redirect served from the main domain.
    return (
      url.hostname.toLowerCase().replace(/^www\./, '') === 'tiktok.com' &&
      url.pathname.startsWith('/t/')
    );
  } catch {
    return false;
  }
}

export interface ResolutionLog {
  from: string;
  to: string | null;
  outcome: 'resolved' | 'not-a-short-link' | 'failed';
  detail?: string;
}

/**
 * Resolves a short link and parses the result. Returns the parse outcome plus a
 * log line describing what the redirect did, so a save that fails is
 * explainable after the fact.
 */
export async function parseVideoUrlResolvingShortLinks(
  input: string,
): Promise<{ result: ParseVideoResult; log: ResolutionLog }> {
  const trimmed = typeof input === 'string' ? input.trim() : '';

  if (!isShortVideoUrl(trimmed)) {
    return {
      result: parseVideoUrl(trimmed),
      log: { from: trimmed, to: null, outcome: 'not-a-short-link' },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(trimmed, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      // TikTok serves a redirect only to something that looks like a browser.
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    });

    const resolved = response.url;

    if (!resolved || resolved === trimmed) {
      return {
        result: parseVideoUrl(trimmed),
        log: { from: trimmed, to: null, outcome: 'failed', detail: 'no redirect followed' },
      };
    }

    return {
      result: parseVideoUrl(resolved),
      log: { from: trimmed, to: resolved, outcome: 'resolved' },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      result: parseVideoUrl(trimmed),
      log: { from: trimmed, to: null, outcome: 'failed', detail },
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Written to the server log so a support question has an answer. */
export function logResolution(log: ResolutionLog) {
  if (log.outcome === 'not-a-short-link') return;
  if (log.outcome === 'resolved') {
    console.info(`[video] resolved short link ${log.from} -> ${log.to}`);
  } else {
    console.warn(`[video] could not resolve short link ${log.from}: ${log.detail}`);
  }
}
