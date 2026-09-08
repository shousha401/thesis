'use server';

import { revalidateHost } from '@/lib/admin/revalidate';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { uploadImage } from '@/lib/admin/media';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Host profiles. Edit only - there are three of them and that is fixed, so
 * there is no create or delete to get wrong.
 *
 * Unlike episodes, a host slug IS editable: the seeded names are placeholders
 * and the real ones need to replace them before launch.
 */

export interface HostFormState {
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
    'name',
    'slug',
    'zodiac',
    'bio',
    'photo_alt',
    'social_instagram',
    'social_tiktok',
    'social_linkedin',
  ]) {
    values[key] = text(formData, key);
  }
  return values;
}

export async function updateHost(
  id: string,
  _previous: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('hosts')
    .select('slug, photo_path')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return { status: 'error', message: 'That host no longer exists.' };

  const fieldErrors: Record<string, string> = {};

  const name = text(formData, 'name');
  if (!name) fieldErrors.name = 'A name is required.';

  // The slug is the web address, so it is constrained rather than free text.
  const slugRaw = text(formData, 'slug') || existing.slug;
  const slug = slugRaw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) fieldErrors.slug = 'The web address needs at least one letter or number.';

  const file = formData.get('photo') as File | null;
  const hasNewFile = file instanceof File && file.size > 0;
  const removePhoto = Boolean(formData.get('remove_photo'));
  const photoAlt = text(formData, 'photo_alt');

  let photoPath: string | null = removePhoto ? null : existing.photo_path;

  if (hasNewFile) {
    if (!file.type.startsWith('image/')) {
      fieldErrors.photo = 'That file is not an image.';
    } else if (file.size > 5 * 1024 * 1024) {
      fieldErrors.photo = 'That image is larger than 5 MB. Please use a smaller one.';
    }
  }

  // Same rule as everywhere else: a stored image must describe itself.
  if ((hasNewFile || photoPath) && !photoAlt) {
    fieldErrors.photo_alt =
      'Describe the photo in a few words, for people using a screen reader.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: 'Nothing was saved. Please fix the highlighted fields.',
      fieldErrors,
      values: echo(formData),
    };
  }

  // Uploaded only once everything else has passed.
  if (hasNewFile) {
    const upload = await uploadImage('host-photos', file, slug);
    if (upload.error) {
      return {
        status: 'error',
        message: upload.error,
        fieldErrors: { photo: upload.error },
        values: echo(formData),
      };
    }
    photoPath = upload.path!;
  }

  const socials: Record<string, string> = {};
  for (const key of ['instagram', 'tiktok', 'linkedin']) {
    const value = text(formData, `social_${key}`);
    if (value) socials[key] = value;
  }

  const { error } = await supabase
    .from('hosts')
    .update({
      name,
      slug,
      zodiac: text(formData, 'zodiac') || null,
      bio: text(formData, 'bio'),
      photo_path: photoPath,
      photo_alt: photoPath ? photoAlt : null,
      socials,
    })
    .eq('id', id);

  if (error) {
    const message = /unique/i.test(error.message)
      ? 'Another host already uses that web address. Pick a different one.'
      : `It could not be saved: ${error.message}`;
    return { status: 'error', message, values: echo(formData) };
  }

  // Both the old and the new page, since the slug may have moved.
  revalidateHost(existing.slug, slug);
  redirect('/admin/hosts?saved=1');
}
