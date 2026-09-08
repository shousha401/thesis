/**
 * Dates are formatted in a fixed locale and time zone on purpose.
 *
 * These pages are server-rendered and cached, so a format that depended on the
 * viewer's locale would either hydrate differently than it rendered or be
 * wrong for whoever got the cached copy. One canonical format, chosen for the
 * show's Los Angeles audience.
 */

const DATE = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'America/Los_Angeles',
});

const DATE_SHORT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Los_Angeles',
});

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: 'America/Los_Angeles',
});

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return DATE.format(new Date(iso));
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '';
  return DATE_SHORT.format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  return DATE_TIME.format(new Date(iso));
}

/** "S1 · E4", or "Episode 4" when the show is not using seasons. */
export function episodeLabel(episodeNumber: number, season: number | null): string {
  return season === null ? `Episode ${episodeNumber}` : `S${season} · E${episodeNumber}`;
}

/** First paragraph, trimmed to a length that fits a card without clipping mid-word. */
export function excerpt(text: string, maxLength = 160): string {
  const firstParagraph = text.trim().split(/\n\s*\n/)[0] ?? '';
  if (firstParagraph.length <= maxLength) return firstParagraph;

  const cut = firstParagraph.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}
