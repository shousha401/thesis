'use server';

import { revalidateSiteSettings } from '@/lib/admin/revalidate';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Site settings: the links and long-form copy the hosts should be able to
 * change without a developer.
 *
 * These appear in the header and footer of every page, so a save refreshes the
 * whole public site rather than a single route.
 */

export interface SettingsFormState {
  status: 'idle' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

const PLATFORM_KEYS = ['youtube', 'spotify', 'apple'] as const;
const SOCIAL_KEYS = ['instagram', 'tiktok', 'youtube'] as const;

function isUrl(value: string): boolean {
  return /^https?:\/\/\S+\.\S+/.test(value);
}

export async function updateSettings(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();

  const fieldErrors: Record<string, string> = {};

  const platformLinks: Record<string, string> = {};
  for (const key of PLATFORM_KEYS) {
    const value = text(formData, `platform_${key}`);
    if (!value) continue;
    if (!isUrl(value)) {
      fieldErrors[`platform_${key}`] = 'That does not look like a link.';
    } else {
      platformLinks[key] = value;
    }
  }

  const socialLinks: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const value = text(formData, `social_${key}`);
    if (!value) continue;
    if (!isUrl(value)) {
      fieldErrors[`social_${key}`] = 'That does not look like a link.';
    } else {
      socialLinks[key] = value;
    }
  }

  const email = text(formData, 'social_email');
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.social_email = 'That does not look like an email address.';
    } else {
      socialLinks.email = email;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: 'Nothing was saved. Please fix the highlighted fields.',
      fieldErrors,
    };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({
      platform_links: platformLinks,
      social_links: socialLinks,
      how_we_met: text(formData, 'how_we_met'),
      about_body: text(formData, 'about_body'),
    })
    .eq('id', 1);

  if (error) {
    return { status: 'error', message: `It could not be saved: ${error.message}` };
  }

  revalidateSiteSettings();

  redirect('/admin/settings?saved=1');
}
