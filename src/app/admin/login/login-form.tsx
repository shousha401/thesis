'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { sendMagicLink, type LoginState } from './actions';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Magic-link login.
 *
 * The email can take up to a minute to arrive, so the "check your email" state
 * is the main screen rather than a toast: it names the exact address, says the
 * link can be slow, tells them to check spam, and offers a resend button that
 * is disabled with a visible countdown. Nothing here fails silently - a send
 * either shows the sent state or shows why it did not.
 */
export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: 'idle',
  });

  if (state.status === 'sent') {
    return <CheckYourEmail email={state.email!} formAction={formAction} />;
  }

  return (
    <form action={formAction} className="mt-8">
      <label htmlFor="email" className="block text-sm font-semibold text-cream">
        Your email address
      </label>
      <p id="email-hint" className="mt-1.5 text-sm text-cream/60">
        We&rsquo;ll email you a link that signs you in. No password.
      </p>

      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.email}
        aria-describedby="email-hint"
        aria-invalid={state.status === 'error' ? true : undefined}
        className="mt-4 block w-full border border-plum-line bg-ink px-4 py-3.5 text-base text-cream placeholder:text-cream/35 focus:border-magenta focus:outline-none"
        placeholder="you@example.com"
      />

      {state.status === 'error' ? (
        <p role="alert" className="mt-3 text-sm text-magenta">
          {state.message}
        </p>
      ) : null}

      <SubmitButton>Email me a link</SubmitButton>
    </form>
  );
}

function CheckYourEmail({
  email,
  formAction,
}: {
  email: string;
  formAction: (formData: FormData) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="mt-8">
      <div className="border border-plum-line bg-plum p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Check your email
        </p>
        <p className="mt-3 text-lg leading-relaxed text-cream">
          We sent a sign-in link to <strong className="font-semibold">{email}</strong>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-cream/70">
          It can take up to a minute to arrive. If it isn&rsquo;t there, check
          your spam or promotions folder — the link works for one hour.
        </p>
      </div>

      <form action={formAction} className="mt-6">
        <input type="hidden" name="email" value={email} />
        <ResendButton secondsLeft={secondsLeft} onResend={() => setSecondsLeft(RESEND_COOLDOWN_SECONDS)} />
      </form>

      <p className="mt-6 text-sm text-cream/60">
        Wrong address?{' '}
        <a
          href="/admin/login"
          className="font-semibold text-magenta underline underline-offset-4 hover:text-gold"
        >
          Start again
        </a>
      </p>
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full bg-magenta px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending…' : children}
      </button>
      {/* Announced to screen readers; the button label alone would not be. */}
      <p aria-live="polite" className="sr-only">
        {pending ? 'Sending your sign-in link' : ''}
      </p>
    </>
  );
}

function ResendButton({
  secondsLeft,
  onResend,
}: {
  secondsLeft: number;
  onResend: () => void;
}) {
  const { pending } = useFormStatus();
  const waiting = secondsLeft > 0;

  return (
    <>
      <button
        type="submit"
        disabled={waiting || pending}
        onClick={onResend}
        className="w-full border border-plum-line px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:border-magenta hover:text-magenta disabled:cursor-not-allowed disabled:border-plum-line disabled:text-cream/40 disabled:hover:text-cream/40"
      >
        {pending
          ? 'Sending…'
          : waiting
            ? `Resend in ${secondsLeft}s`
            : 'Resend the link'}
      </button>
      <p aria-live="polite" className="sr-only">
        {waiting ? `You can resend in ${secondsLeft} seconds` : 'You can resend now'}
      </p>
    </>
  );
}
