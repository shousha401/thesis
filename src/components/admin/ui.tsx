'use client';

import { useFormStatus } from 'react-dom';

/**
 * Form primitives for the admin.
 *
 * Phone-first: every control is at least 44px tall, labels sit above inputs
 * rather than beside them, and the font size is 16px so iOS does not zoom the
 * viewport when a field is focused.
 */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="mt-6">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-cream">
        {label}
        {required ? (
          <span className="ml-1 text-magenta" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-cream/45">optional</span>
        )}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-sm leading-relaxed text-cream/55">
          {hint}
        </p>
      ) : null}

      <div className="mt-2">{children}</div>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-magenta">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  'block w-full border border-plum-line bg-ink px-4 py-3 text-base text-cream ' +
  'placeholder:text-cream/30 focus:border-magenta focus:outline-none ' +
  'aria-[invalid=true]:border-magenta';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-[9rem] resize-y`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

/**
 * A sticky footer bar so Save is always reachable with a thumb, however long
 * the form is. `pending` disables it and says so, which matters on a phone
 * where a slow upload otherwise looks like nothing happened.
 */
export function SaveBar({
  label = 'Save',
  secondary,
}: {
  label?: string;
  secondary?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-plum-line bg-ink/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-magenta px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : label}
        </button>
        {secondary}
      </div>
      <p aria-live="polite" className="sr-only">
        {pending ? 'Saving, please wait' : ''}
      </p>
    </div>
  );
}

export function DangerButton({
  children,
  confirm,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirm: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className="border border-plum-line px-5 py-3.5 text-sm font-semibold text-cream/80 transition-colors hover:border-magenta hover:text-magenta disabled:opacity-60"
    >
      {children}
    </button>
  );
}
