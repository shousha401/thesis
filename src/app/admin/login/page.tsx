import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand';
import { getAdminSession } from '@/lib/admin/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  // The admin is not content; keep it out of search results entirely.
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in and allow-listed? Skip the form.
  const session = await getAdminSession();
  if (session) redirect('/admin');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <div className="text-3xl">
        <Wordmark />
      </div>

      <h1 className="mt-8 font-display text-3xl leading-tight text-cream">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-cream/60">
        For the hosts only.
      </p>

      <LoginForm />
    </main>
  );
}
