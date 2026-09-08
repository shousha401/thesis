'use server';

import { revalidateEpisode } from '@/lib/admin/revalidate';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { applyPendingUpload, validateMedia } from '@/lib/admin/media';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Every episode mutation. All of them run as the signed-in host, so Row Level
 * Security has the final say - `requireAdmin()` is there to give a friendly
 * redirect, not to be the security boundary.
 */

export interface EpisodeFormState {
  status: 'idle' | 'error';
  message?: string;
  /** Keyed by field name so each input can show its own error. */
  fieldErrors?: Record<string, string>;
  /** Echoed back so a rejected form does not lose what was typed. */
  values?: Record<string, string>;
}

/** Clips that point at this episode, so their pages can be refreshed too. */
async function clipSlugsForEpisode(episodeId: string): Promise<string[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('clips')
    .select('slug')
    .eq('episode_id', episodeId)
    .is('deleted_at', null);
  return (data ?? []).map((row: { slug: string }) => row.slug);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

/** Preserves what was typed so an error never empties the form. */
function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of [
    'title',
    'episode_number',
    'season',
    'description',
    'video_url',
    'published_at',
    'thumbnail_alt',
    'listen_spotify',
    'listen_apple',
  ]) {
    values[key] = text(formData, key);
  }
  values.is_published = formData.get('is_published') ? 'on' : '';
  return values;
}

/**
 * Shared validation for create and edit.
 *
 * The video link and image rules live in lib/admin/media.ts, shared with clips.
 * Everything here is episode-specific: numbering, seasons, listen links and the
 * publish date.
 */
async function validate(
  formData: FormData,
  existing?: { thumbnail_path: string | null; slug: string },
): Promise<
  { ok: false; state: EpisodeFormState } | { ok: true; row: Record<string, unknown> }
> {
  const fieldErrors: Record<string, string> = {};

  const title = text(formData, 'title');
  if (!title) fieldErrors.title = 'Give the episode a title.';

  const episodeNumberRaw = text(formData, 'episode_number');
  const episodeNumber = Number(episodeNumberRaw);
  if (!episodeNumberRaw || !Number.isInteger(episodeNumber) || episodeNumber < 0) {
    fieldErrors.episode_number = 'Episode number must be a whole number.';
  }

  const seasonRaw = text(formData, 'season');
  const season = seasonRaw === '' ? null : Number(seasonRaw);
  if (season !== null && (!Number.isInteger(season) || season < 0)) {
    fieldErrors.season = 'Season must be a whole number, or left blank.';
  }

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

  if (isPublished && !publishedAt) {
    // Publishing with no date would be rejected by a database constraint, so
    // fill in today rather than bouncing the host back for a formality.
    publishedAt = new Date().toISOString();
  }

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

  // Uploaded only now that everything else has passed, so a rejected form never
  // leaves an orphaned file in the bucket.
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

  const listenLinks: Record<string, string> = {};
  const spotify = text(formData, 'listen_spotify');
  const apple = text(formData, 'listen_apple');
  if (spotify) listenLinks.spotify = spotify;
  if (apple) listenLinks.apple = apple;

  return {
    ok: true,
    row: {
      title,
      episode_number: episodeNumber,
      season,
      description: text(formData, 'description'),
      video_url: uploaded.fields.canonicalUrl,
      video_provider: uploaded.fields.provider,
      video_id: uploaded.fields.videoId,
      thumbnail_path: uploaded.fields.thumbnailPath,
      thumbnail_alt: uploaded.fields.thumbnailAlt,
      listen_links: listenLinks,
      published_at: publishedAt,
      is_published: isPublished,
    },
  };
}

export async function createEpisode(
  _previous: EpisodeFormState,
  formData: FormData,
): Promise<EpisodeFormState> {
  await requireAdmin();

  const validated = await validate(formData);
  if (!validated.ok) return validated.state;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('episodes')
    .insert(validated.row)
    .select('slug')
    .single();

  if (error) {
    return {
      status: 'error',
      message: `The episode could not be saved: ${error.message}`,
      values: echo(formData),
    };
  }

  // A brand-new episode has no clips pointing at it yet.
  revalidateEpisode(data?.slug);
  redirect('/admin/episodes?saved=1');
}

export async function updateEpisode(
  id: string,
  _previous: EpisodeFormState,
  formData: FormData,
): Promise<EpisodeFormState> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('episodes')
    .select('thumbnail_path, slug')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return { status: 'error', message: 'That episode no longer exists.' };
  }

  const validated = await validate(formData, existing);
  if (!validated.ok) return validated.state;

  const { error } = await supabase.from('episodes').update(validated.row).eq('id', id);

  if (error) {
    return {
      status: 'error',
      message: `The episode could not be saved: ${error.message}`,
      values: echo(formData),
    };
  }

  // The slug never changes on edit (a database trigger enforces it), so the
  // existing one is still the right page to refresh.
  revalidateEpisode(existing.slug, await clipSlugsForEpisode(id));
  redirect('/admin/episodes?saved=1');
}

/** The one-tap publish/unpublish from the list. */
export async function togglePublished(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const publish = formData.get('publish') === 'true';

  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('episodes')
    .select('slug, published_at')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return;

  await supabase
    .from('episodes')
    .update({
      is_published: publish,
      // Publishing something that never had a date needs one, or the database
      // constraint rejects it.
      published_at: publish
        ? (existing.published_at ?? new Date().toISOString())
        : existing.published_at,
    })
    .eq('id', id);

  revalidateEpisode(existing.slug, await clipSlugsForEpisode(id));
}

/** Soft delete: the row stays, hidden from the public by RLS. */
export async function deleteEpisode(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from('episodes')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  await supabase
    .from('episodes')
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq('id', id);

  revalidateEpisode(existing?.slug, await clipSlugsForEpisode(id));
}

export async function restoreEpisode(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from('episodes')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  await supabase.from('episodes').update({ deleted_at: null }).eq('id', id);

  revalidateEpisode(existing?.slug, await clipSlugsForEpisode(id));
}
