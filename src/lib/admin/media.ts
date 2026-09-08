import {
  logResolution,
  parseVideoUrlResolvingShortLinks,
} from '@/lib/admin/resolve-short-url';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * The video-link and image rules, shared by episodes and clips.
 *
 * Both have exactly the same posture - fail closed on an unparseable link,
 * require an upload where the platform gives us no thumbnail, require alt text
 * on any stored image - so the rules live here once rather than being copied
 * and drifting apart.
 */

export interface MediaFields {
  provider: string;
  videoId: string;
  canonicalUrl: string;
  thumbnailPath: string | null;
  thumbnailAlt: string | null;
  /** True for a Short, Reel or TikTok - used to pick a 9:16 card. */
  isVertical: boolean;
  /**
   * Portrait/landscape of an uploaded thumbnail, when one was uploaded and its
   * dimensions could be read. Overrides the URL's own orientation, because the
   * picture the hosts chose is the one that gets framed.
   */
  uploadedIsPortrait: boolean | null;
}

/**
 * Reads width and height straight out of an image header.
 *
 * Only enough of each format to get the dimensions - a full decoder would be a
 * dependency for one number. Returns null for anything it does not recognise,
 * and the caller falls back to the URL's orientation.
 */
export function imageDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  // PNG: IHDR is always the first chunk.
  if (buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // GIF
  if (buffer.length > 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  // WebP (VP8X / VP8 / VP8L)
  if (
    buffer.length > 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const format = buffer.toString('ascii', 12, 16);
    if (format === 'VP8X') {
      return {
        width: 1 + (buffer.readUIntLE(24, 3) & 0xffffff),
        height: 1 + (buffer.readUIntLE(27, 3) & 0xffffff),
      };
    }
    if (format === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
  }

  // JPEG: walk the segments to the start-of-frame marker.
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 carry the dimensions.
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }

  return null;
}

/**
 * Storage keys become public URLs, so they must not contain spaces or anything
 * else that needs percent-encoding. Mirrors the database's slugify().
 */
export function safeFileStem(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // fold accents rather than dropping them
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'upload'
  );
}

export async function uploadImage(
  bucket: 'thumbnails' | 'host-photos',
  file: File,
  nameHint: string,
): Promise<{ path?: string; error?: string }> {
  const supabase = await createAdminClient();

  const extension = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension)
    ? extension
    : 'jpg';
  const path = `${safeFileStem(nameHint)}-${Date.now()}.${safeExtension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: `The image could not be uploaded: ${error.message}` };
  return { path };
}

const PROVIDER_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  other: 'That platform',
};

/**
 * Validates the video URL and the thumbnail together, because whether an upload
 * is required depends on which provider the URL turned out to be.
 *
 * Nothing is uploaded here - the caller uploads only once every other field has
 * passed, so a rejected form never leaves an orphaned file in the bucket.
 */
export async function validateMedia(
  formData: FormData,
  options: {
    existingThumbnailPath?: string | null;
    /** Used to name the uploaded file. */
    nameHint: string;
  },
): Promise<
  | { ok: false; fieldErrors: Record<string, string> }
  | { ok: true; fields: MediaFields; pendingUpload: File | null }
> {
  const fieldErrors: Record<string, string> = {};

  const videoUrlRaw = String(formData.get('video_url') ?? '').trim();
  let provider = '';
  let videoId = '';
  let canonicalUrl = '';
  let isVertical = false;

  if (!videoUrlRaw) {
    fieldErrors.video_url = 'Paste the link to the video.';
  } else {
    const { result, log } = await parseVideoUrlResolvingShortLinks(videoUrlRaw);
    logResolution(log);

    if (!result.ok) {
      fieldErrors.video_url = result.error;
    } else {
      provider = result.video.provider;
      videoId = result.video.id;
      canonicalUrl = result.video.canonicalUrl;
      isVertical = result.video.isVertical;
    }
  }

  const file = formData.get('thumbnail') as File | null;
  const hasNewFile = file instanceof File && file.size > 0;
  const removeThumbnail = Boolean(formData.get('remove_thumbnail'));
  const thumbnailAlt = String(formData.get('thumbnail_alt') ?? '').trim();

  const thumbnailPath = removeThumbnail
    ? null
    : (options.existingThumbnailPath ?? null);

  // YouTube gives us a thumbnail for free; nothing else does, so for those
  // providers an upload is the only way the card is not a blank plate.
  if (provider && provider !== 'youtube' && !hasNewFile && !thumbnailPath) {
    fieldErrors.thumbnail = `${
      PROVIDER_LABEL[provider] ?? 'That platform'
    } does not give us a thumbnail, so please upload one.`;
  }

  if (hasNewFile) {
    if (!file.type.startsWith('image/')) {
      fieldErrors.thumbnail = 'That file is not an image.';
    } else if (file.size > 5 * 1024 * 1024) {
      fieldErrors.thumbnail = 'That image is larger than 5 MB. Please use a smaller one.';
    }
  }

  // Accessibility: any image we store must describe itself.
  if ((hasNewFile || thumbnailPath) && !thumbnailAlt) {
    fieldErrors.thumbnail_alt =
      'Describe the image in a few words, for people using a screen reader.';
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  let uploadedIsPortrait: boolean | null = null;
  if (hasNewFile) {
    const dimensions = imageDimensions(Buffer.from(await file.arrayBuffer()));
    if (dimensions) uploadedIsPortrait = dimensions.height > dimensions.width;
  }

  return {
    ok: true,
    pendingUpload: hasNewFile ? file : null,
    fields: {
      provider,
      videoId,
      canonicalUrl,
      thumbnailPath,
      thumbnailAlt: thumbnailPath ? thumbnailAlt : null,
      isVertical,
      uploadedIsPortrait,
    },
  };
}

/**
 * The card shape for a clip: what the uploaded image says if there is one,
 * otherwise what the URL implies.
 */
export function deriveAspect(fields: MediaFields): 'portrait' | 'landscape' {
  if (fields.uploadedIsPortrait !== null) {
    return fields.uploadedIsPortrait ? 'portrait' : 'landscape';
  }
  return fields.isVertical ? 'portrait' : 'landscape';
}

/** Runs the deferred upload and folds the result into the media fields. */
export async function applyPendingUpload(
  fields: MediaFields,
  pendingUpload: File | null,
  formData: FormData,
  nameHint: string,
): Promise<{ ok: true; fields: MediaFields } | { ok: false; error: string }> {
  if (!pendingUpload) return { ok: true, fields };

  const upload = await uploadImage('thumbnails', pendingUpload, nameHint);
  if (upload.error) return { ok: false, error: upload.error };

  return {
    ok: true,
    fields: {
      ...fields,
      thumbnailPath: upload.path!,
      thumbnailAlt: String(formData.get('thumbnail_alt') ?? '').trim(),
    },
  };
}
