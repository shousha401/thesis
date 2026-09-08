/**
 * Simple geometric marks for the platforms and socials.
 *
 * These are recognisable stand-ins drawn from primitives, not the official
 * vector artwork. Before launch, replace them with the real marks from each
 * platform's brand/press kit so the trademark usage is correct - the shapes
 * here are close enough to read at a glance but are not the licensed assets.
 *
 * Every icon is decorative: the surrounding link carries the accessible name.
 */

type IconProps = { className?: string };

const base = 'h-5 w-5';

export function YouTubeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2Z" />
    </svg>
  );
}

export function SpotifyIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.3 14.5a.8.8 0 0 1-1.07.27c-2.94-1.8-6.63-2.2-11-1.2a.78.78 0 1 1-.35-1.52c4.75-1.08 8.84-.62 12.13 1.39a.78.78 0 0 1 .29 1.06Zm1.32-3.1a.97.97 0 0 1-1.34.32c-3.36-2.06-8.48-2.66-12.46-1.45a.98.98 0 1 1-.57-1.87c4.54-1.38 10.19-.71 14.05 1.66a.97.97 0 0 1 .32 1.34Zm.12-3.23C13.7 7.78 7.35 7.57 3.9 8.62a1.17 1.17 0 1 1-.68-2.24C7.18 5.18 14.2 5.43 18.8 8.16a1.17 1.17 0 0 1-1.06 2.01Z" />
    </svg>
  );
}

export function ApplePodcastsIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2a8 8 0 0 0-4.7 14.48.9.9 0 1 0 1.06-1.46 6.2 6.2 0 1 1 7.28 0 .9.9 0 1 0 1.06 1.46A8 8 0 0 0 12 2Z" />
      <path d="M12 5.9a4.1 4.1 0 0 0-2.2 7.56.85.85 0 1 0 .92-1.43 2.4 2.4 0 1 1 2.56 0 .85.85 0 1 0 .92 1.43A4.1 4.1 0 0 0 12 5.9Z" />
      <circle cx="12" cy="12.6" r="1.9" />
      <path d="M10.1 16.4c0-.5.4-.9.9-.9h2c.5 0 .9.4.9.9l-.5 4.1c-.1.8-.7 1.5-1.4 1.5s-1.3-.7-1.4-1.5Z" />
    </svg>
  );
}

export function InstagramIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2c-2.72 0-3.06.01-4.12.06-1.07.05-1.8.22-2.43.46a4.9 4.9 0 0 0-1.77 1.16A4.9 4.9 0 0 0 2.52 5.45c-.24.63-.41 1.36-.46 2.43C2.01 8.94 2 9.28 2 12s.01 3.06.06 4.12c.05 1.07.22 1.8.46 2.43a4.9 4.9 0 0 0 1.16 1.77 4.9 4.9 0 0 0 1.77 1.16c.63.24 1.36.41 2.43.46 1.06.05 1.4.06 4.12.06s3.06-.01 4.12-.06c1.07-.05 1.8-.22 2.43-.46a5.1 5.1 0 0 0 2.93-2.93c.24-.63.41-1.36.46-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.07-.22-1.8-.46-2.43a4.9 4.9 0 0 0-1.16-1.77 4.9 4.9 0 0 0-1.77-1.16c-.63-.24-1.36-.41-2.43-.46C15.06 2.01 14.72 2 12 2Zm0 1.8c2.67 0 2.99.01 4.04.06.97.04 1.5.21 1.86.35.47.18.8.4 1.15.74.35.35.56.68.74 1.15.14.36.3.89.35 1.86.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.97-.21 1.5-.35 1.86-.18.47-.4.8-.74 1.15-.35.35-.68.56-1.15.74-.36.14-.89.3-1.86.35-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.97-.04-1.5-.21-1.86-.35a3.1 3.1 0 0 1-1.15-.74 3.1 3.1 0 0 1-.74-1.15c-.14-.36-.3-.89-.35-1.86-.05-1.05-.06-1.37-.06-4.04s.01-2.99.06-4.04c.04-.97.21-1.5.35-1.86.18-.47.4-.8.74-1.15.35-.35.68-.56 1.15-.74.36-.14.89-.3 1.86-.35C9.01 3.81 9.33 3.8 12 3.8Z" />
      <path d="M12 7.13a4.87 4.87 0 1 0 0 9.74 4.87 4.87 0 0 0 0-9.74Zm0 8.03a3.16 3.16 0 1 1 0-6.32 3.16 3.16 0 0 1 0 6.32Z" />
      <circle cx="17.07" cy="6.93" r="1.14" />
    </svg>
  );
}

export function TikTokIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.6 2h-2.9v13.2a2.5 2.5 0 1 1-2-2.45V9.8a5.6 5.6 0 1 0 5 5.57V9.1a6.9 6.9 0 0 0 4 1.28V7.4a4 4 0 0 1-4.1-4Z" />
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  youtube: YouTubeIcon,
  spotify: SpotifyIcon,
  apple: ApplePodcastsIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
};

/** Returns the mark for a platform or social key, or null if we have none. */
export function iconFor(key: string) {
  return ICONS[key] ?? null;
}
