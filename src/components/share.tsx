'use client';

import { useState } from 'react';

/**
 * Share controls.
 *
 * Uses the native share sheet where the browser has one - which is most phones,
 * and this audience arrives from Instagram and TikTok - and falls back to
 * copy-to-clipboard everywhere else. Both are real buttons with live status
 * announced politely, so a screen reader hears the copy confirmation.
 */
export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // The visitor dismissed the sheet, or it is unavailable. Fall through
        // to copying rather than showing an error for a deliberate cancel.
      }
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-2 border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M13 3a1 1 0 0 0-1.7-.7l-4 4a1 1 0 0 0 1.4 1.4L11 5.4V15a1 1 0 1 0 2 0Z" />
          <path d="M5 10a1 1 0 0 1 1 1v8h12v-8a1 1 0 1 1 2 0v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
        </svg>
        Share
      </button>

      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 border border-plum-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M9 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6.4a2 2 0 0 0-.6-1.4l-2.4-2.4A2 2 0 0 0 15.6 2Zm0 2h6v3a1 1 0 0 0 1 1h2v6H9Z" />
          <path d="M5 7a1 1 0 0 1 1 1v11h9a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
        </svg>
        Copy link
      </button>

      <p aria-live="polite" className="text-sm text-cream/60">
        {status === 'copied' ? 'Link copied' : null}
        {status === 'failed' ? 'Could not copy — select the address bar instead' : null}
      </p>
    </div>
  );
}
