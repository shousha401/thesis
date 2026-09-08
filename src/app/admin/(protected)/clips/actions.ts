'use server';

import { revalidateClip } from '@/lib/admin/revalidate';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { applyPendingUpload, validateMedia } from '@/lib/admin/media';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Clip mutations. Same shape as episodes minus the numbering, plus an optional
 * link to the episode the clip came from.
 */

export interface ClipFormState {
  status: 'idle' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of [
    'title',
    'caption',
    'video_url',
    'published_at',
    'thumbnail_alt',
    'episode_id',
  ]) {
    values[key] = text(formData, key);
  }
  values.is_published = formData.get('is_published') ? 'on' : '';
  return values;
}

async function validate(
  formData: FormData,
  existing?: { thumbnail_path: string | null; slug: string },
): Promise<
  { ok: false; state: ClipFormState } | { ok: true; row: Record<string, unknown> }
> {
  const fieldErrors: Record<string, string> = {};

  const title = text(formData, 'title');
  if (!title) fieldErrors.title = 'Give the clip a title.';

  const media = await validateMedia(formData, {
    existingThumbnailPath: existing?.thumbnail_path ?? null,
    nameHint: existing?.slug ?? title,
  });
  if (!media.ok) Object.assign(fieldErrors, media.fieldErrors);

  const isPublished = Boolean(formData.get('is_published'));
  const publishedAtRaw = text(formData, 'published_at');
  let publishedAt: string | null = null;

  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.published_at = 'That date is not valid.';
    } else {
      publishedAt = parsed.toISOString();
    }
  }
  if (isPublished && !publishedAt) publishedAt = new Date().toISOString();

  if (Object.keys(fieldErrors).length > 0 || !media.ok) {
    return {
      ok: false,
      state: {
        status: 'error',
        message: 'Nothing was saved. Please fix the highlighted fields.',
        fieldErrors,
        values: echo(formData),
      },
    };
  }

  const uploaded = await applyPendingUpload(
    media.fields,
    media.pendingUpload,
    formData,
    existing?.slug ?? title,
  );
  if (!uploaded.ok) {
    return {
      ok: false,
      state: {
        status: 'error',
        message: uploaded.error,
        fieldErrors: { thumbnail: uploaded.error },
        values: echo(formData),
      },
    };
  }

  const episodeId = text(formData, 'episode_id');

  return {
    ok: true,
    row: {
      title,
      caption: text(formData, 'caption'),
      video_url: uploaded.fields.canonicalUrl,
      video_provider: uploaded.fields.provider,
      video_id: uploaded.fields.videoId,
      thumbnail_path: uploaded.fields.thumbnailPath,
      thumbnail_alt: uploaded.fields.thumbnailAlt,
      episode_id: episodeId === '' ? null : episodeId,
      published_at: publishedAt,
      is_published: isPublished,
    },
  };
}

export async function createClip(
  _previous: ClipFormState,
  formData: FormData,
): Promise<ClipFormState> {
  await requireAdmin();

  const validated = await validate(formData);
  if (!validated.ok) return validated.state;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('clips')
    .insert(validated.row)
    .select('slug')
    .single();

  if (error) {
    return {
      status: 'error',
      message: `The clip could not be saved: ${error.message}`,
      values: echo(formData),
    };
  }

  revalidateClip(data?.slug);
  redirect('/admin/clips?saved=1');
}

export async function updateClip(
  id: string,
  _previous: ClipFormState,
  formData: FormData,
): Promise<ClipFormState> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('clips')
    .select('thumbnail_path, slug')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return { status: 'error', message: 'That clip no longer exists.' };

  const validated = await validate(formData, existing);
  if (!validated.ok) return validated.state;

  const { error } = await supabase.from('clips').update(validated.row).eq('id', id);

  if (error) {
    return {
      status: 'error',
      message: `The clip could not be saved: ${error.message}`,
      values: echo(formData),
    };
  }

  revalidateClip(existing.slug);
  redirect('/admin/clips?saved=1');
}

export async function toggleClipPublished(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const publish = formData.get('publish') === 'true';

  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('clips')
    .select('slug, published_at')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return;

  await supabase
    .from('clips')
    .update({
      is_published: publish,
      published_at: publish
        ? (existing.published_at ?? new Date().toISOString())
        : existing.published_at,
    })
    .eq('id', id);

  revalidateClip(existing.slug);
}

export async function deleteClip(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from('clips')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  await supabase
    .from('clips')
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq('id', id);

  revalidateClip(existing?.slug);
}

export async function restoreClip(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from('clips')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  await supabase.from('clips').update({ deleted_at: null }).eq('id', id);

  revalidateClip(existing?.slug);
}
