import { iconFor } from '@/components/icons';
import type { Host } from '@/lib/types';

/**
 * A host's social links. Each carries a screen-reader suffix naming whose
 * account it is, because "Instagram" repeated three times down the page tells
 * a screen-reader user nothing about which host it belongs to.
 */
export function HostSocials({ host }: { host: Host }) {
  const entries = Object.entries(host.socials ?? {}).filter(([, url]) => url);
  if (entries.length === 0) return null;

  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {entries.map(([key, url]) => {
        const Icon = iconFor(key);
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-plum-line px-4 py-2 text-sm text-cream/80 transition-colors hover:border-magenta hover:text-magenta"
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {label}
              <span className="sr-only">
                : {host.name} on {label} (opens in a new tab)
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
