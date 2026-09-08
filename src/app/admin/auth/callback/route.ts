import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Where the magic link lands.
 *
 * Exchanges the one-time code for a session, then checks the allow-list. A
 * valid link for an email that is not on the list produces a signed-in session
 * with no permissions, so the session is discarded immediately rather than left
 * lying around.
 *
 * Every failure path ends somewhere that explains itself. Nothing dead-ends.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    // Expired or already-used link: Supabase says so in the query string.
    const url = new URL('/admin/login', origin);
    url.searchParams.set('error', errorDescription);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login', origin));
  }

  const supabase = await createAdminClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL('/admin/login', origin);
    url.searchParams.set(
      'error',
      'That sign-in link has expired or was already used. Here is a fresh one.',
    );
    return NextResponse.redirect(url);
  }

  const { data: isAdmin } = await supabase.rpc('is_admin');

  if (isAdmin !== true) {
    // Signed in, but not one of the hosts. Do not keep the session.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/admin/not-authorized', origin));
  }

  return NextResponse.redirect(new URL('/admin', origin));
}
