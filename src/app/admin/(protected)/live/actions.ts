'use server';

import { revalidateLive } from '@/lib/admin/revalidate';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { parseVideoUrl } from '@/lib/video';

/**
 * Live events.
 *
 * Unlike episodes and clips there is no thumbnail or slug: the URL points at a
 * stream, which may not exist yet. The URL is therefore validated more loosely -
 * it must be a real link, but it does not have to be an embeddable video,
 * because Instagram Live never is.
 */

export interface LiveFormState {
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
  for (const key of ['title', 'platform', 'url', 'scheduled_at', 'status', 'replay_url']) {
    values[key] = text(formData, key);
  }
  return values;
}

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'other'];
const STATUSES = ['scheduled', 'live', 'ended'];

function validate(
  formData: FormData,
): { ok: false; state: LiveFormState } | { ok: true; row: Record<string, unknown> } {
  const fieldErrors: Record<string, string> = {};

  const title = text(formData, 'title');
  if (!title) fieldErrors.title = 'Give the live show a title.';

  const platform = text(formData, 'platform');
  if (!PLATFORMS.includes(platform)) fieldErrors.platform = 'Choose a platform.';

  const status = text(formData, 'status');
  if (!STATUSES.includes(status)) fieldErrors.status = 'Choose a status.';

  const url = text(formData, 'url');
  if (!url) {
    fieldErrors.url = 'Paste the link people should open.';
  } else if (!/^https?:\/\/\S+\.\S+/.test(url)) {
    fieldErrors.url = 'That does not look like a link. It should start with https://';
  }

  // Only advisory: a YouTube link that we cannot parse simply will not embed,
  // and the page falls back to a "join us" card, which is still correct.
  if (platform === 'youtube' && url && !parseVideoUrl(url).ok) {
    fieldErrors.url =
      'That YouTube link has no video in it, so it cannot be played on the page. ' +
      'Use the link to the stream itself, or switch the platform to "Other".';
  }

  const replayUrl = text(formData, 'replay_url');
  if (replayUrl && !/^https?:\/\/\S+\.\S+/.test(replayUrl)) {
    fieldErrors.replay_url = 'That does not look like a link.';
  }

  const scheduledAtRaw = text(formData, 'scheduled_at');
  let scheduledAt: string | null = null;
  if (!scheduledAtRaw) {
    fieldErrors.scheduled_at = 'When is it?';
  } else {
    // datetime-local has no time zone; it is the host's local time.
    const parsed = new Date(scheduledAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.scheduled_at = 'That date and time is not valid.';
    } else {
      scheduledAt = parsed.toISOString();
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
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

  return {
    ok: true,
    row: {
      title,
      platform,
      url,
      scheduled_at: scheduledAt,
      status,
      replay_url: replayUrl === '' ? null : replayUrl,
    },
  };
}

export async function createLiveEvent(
  _previous: LiveFormState,
  formData: FormData,
): Promise<LiveFormState> {
  await requireAdmin();

  const validated = validate(formData);
  if (!validated.ok) return validated.state;

  const supabase = await createAdminClient();
  const { error } = await supabase.from('live_events').insert(validated.row);

  if (error) {
    return {
      status: 'error',
      message: `It could not be saved: ${error.message}`,
      values: echo(formData),
    };
  }

  revalidateLive();
  redirect('/admin/live?saved=1');
}

export async function updateLiveEvent(
  id: string,
  _previous: LiveFormState,
  formData: FormData,
): Promise<LiveFormState> {
  await requireAdmin();

  const validated = validate(formData);
  if (!validated.ok) return validated.state;

  const supabase = await createAdminClient();
  const { error } = await supabase.from('live_events').update(validated.row).eq('id', id);

  if (error) {
    return {
      status: 'error',
      message: `It could not be saved: ${error.message}`,
      values: echo(formData),
    };
  }

  revalidateLive();
  redirect('/admin/live?saved=1');
}

/** One-tap status change from the list - the thing done in a hurry. */
export async function setLiveStatus(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (!STATUSES.includes(status)) return;

  const supabase = await createAdminClient();
  await supabase.from('live_events').update({ status }).eq('id', id);

  revalidateLive();
}

/** Live events are few and have no public URL of their own, so this is a real delete. */
export async function deleteLiveEvent(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id'));
  const supabase = await createAdminClient();
  await supabase.from('live_events').delete().eq('id', id);

  revalidateLive();
}
