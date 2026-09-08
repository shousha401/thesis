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

  return {
    ok: true,
    pendingUpload: hasNewFile ? file : null,
    fields: {
      provider,
      videoId,
      canonicalUrl,
      thumbnailPath,
      thumbnailAlt: thumbnailPath ? thumbnailAlt : null,
    },
  };
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
