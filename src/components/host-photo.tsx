import Image from 'next/image';
import { storageUrl } from '@/lib/data';
import type { Host } from '@/lib/types';

/**
 * A host portrait, or a branded plate with their initial when there is no photo
 * yet. Unlike a video thumbnail this image can stand alone, so it uses the alt
 * text stored with it - which the admin requires whenever a photo is uploaded.
 */
export function HostPhoto({
  host,
  sizes,
  priority = false,
}: {
  host: Host;
  sizes: string;
  priority?: boolean;
}) {
  const src = storageUrl('host-photos', host.photo_path);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden border border-plum-line bg-ink">
      {src ? (
        <Image
          src={src}
          alt={host.photo_alt ?? host.name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-display text-7xl italic text-cream/15"
        >
          {host.name.charAt(0)}
        </span>
      )}
    </div>
  );
}
