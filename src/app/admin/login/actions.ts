'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export interface LoginState {
  status: 'idle' | 'sent' | 'error';
  email?: string;
  message?: string;
}

/**
 * Sends the magic link.
 *
 * Deliberately says "sent" for any valid-looking address, whether or not it is
 * on the allow-list. Reporting "that email is not an admin" here would let
 * anyone test whether a given address belongs to one of the hosts. The refusal
 * happens after sign-in instead, on the not-authorized page.
 */
export async function sendMagicLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const supabase = await createAdminClient();

  // Build the callback from the request so it is correct on localhost, on a
  // Vercel preview URL and on the production domain without configuration.
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? `${protocol}://${host}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/admin/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Rate limiting is the one failure worth naming precisely: it is the most
    // likely one, and the fix is simply to wait.
    const isRateLimit = /rate limit|too many/i.test(error.message);
    return {
      status: 'error',
      email,
      message: isRateLimit
        ? 'Too many emails have been sent in the last few minutes. Wait a minute and try again.'
        : `We could not send the email: ${error.message}`,
    };
  }

  return { status: 'sent', email };
}
