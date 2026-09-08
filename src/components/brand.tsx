import { SITE_NAME } from '@/config/site';

/**
 * The wordmark, set in type.
 *
 * The illustrated cover is a photograph-quality asset and stays an image
 * (/brand/cover.jpg). This is its typographic counterpart for the header and
 * footer, echoing the cover's structure - an italic editorial line above a
 * heavy condensed line in gold - without trying to redraw it.
 *
 * If a proper logo file arrives later, swap the innards of this one component.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  // The name is split so the two halves can be styled differently. Falls back
  // to rendering the whole name in the display face if it is ever renamed to
  // something that does not end in a single word.
  const words = SITE_NAME.split(' ');
  const lead = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];

  // No sr-only duplicate: the two spans are read in order and already say the
  // name. The last word is uppercased in CSS, not in the markup, so it stays a
  // word to a screen reader rather than being spelled out letter by letter.
  return (
    <span className={`inline-flex flex-col leading-[0.85] ${className}`}>
      {lead ? (
        <span className="font-display italic text-cream/90 text-[0.62em] tracking-tight">
          {`${lead} `}
        </span>
      ) : null}
      <span className="font-wordmark uppercase text-gold tracking-[0.02em]">
        {last}
      </span>
    </span>
  );
}

/**
 * The magenta band from the cover art, used as the divider motif between
 * sections. Decorative, so it is hidden from assistive technology.
 */
export function Band({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-[5px] w-full bg-magenta ${className}`}
    />
  );
}

/** A short gold rule used to open a section, paired with an eyebrow label. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
      <span aria-hidden="true" className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}
