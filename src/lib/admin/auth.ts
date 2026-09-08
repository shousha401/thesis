import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Authorisation, in one place.
 *
 * Two separate questions, kept separate on purpose:
 *   - is this a signed-in user?   -> if not, send them to log in
 *   - is that user on the allow-list? -> if not, say so plainly
 *
 * The allow-list answer comes from the `is_admin()` database function rather
 * than from a table read, because a non-admin reading `admins` correctly gets
 * zero rows back and "no rows" is indistinguishable from "empty table". Asking
 * the database directly is unambiguous, and it is the same function the RLS
 * policies use, so the UI can never disagree with what the database will allow.
 */

export interface AdminSession {
  email: string;
  userId: string;
}

/** Returns the session if the user is signed in AND allow-listed, else null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return null;

  return { email: user.email, userId: user.id };
}

/**
 * For pages that must not render for anyone else. Redirects rather than
 * returning, so a caller cannot forget to check the result.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) redirect('/admin/not-authorized');

  return { email: user.email!, userId: user.id };
}
