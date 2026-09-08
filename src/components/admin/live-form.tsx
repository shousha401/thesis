'use client';

import { useActionState } from 'react';
import { Field, SaveBar, Select, TextInput } from '@/components/admin/ui';
import type { LiveFormState } from '@/app/admin/(protected)/live/actions';
import type { LiveEvent } from '@/lib/types';

/** Converts an ISO timestamp to the value a datetime-local input expects. */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function LiveForm({
  action,
  event,
  submitLabel,
}: {
  action: (state: LiveFormState, formData: FormData) => Promise<LiveFormState>;
  event?: LiveEvent;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<LiveFormState, FormData>(action, {
    status: 'idle',
  });

  const errors = state.fieldErrors ?? {};
  const echoed = state.values ?? {};
  const value = (key: string, fallback: string | null | undefined) =>
    echoed[key] ?? fallback ?? '';

  return (
    <form action={formAction} noValidate>
      {state.status === 'error' && state.message ? (
        <p
          role="alert"
          className="border border-magenta bg-magenta/10 px-4 py-3 text-sm text-cream"
        >
          {state.message}
        </p>
      ) : null}

      <Field label="Title" htmlFor="title" required error={errors.title}>
        <TextInput
          id="title"
          name="title"
          required
          defaultValue={value('title', event?.title)}
          aria-invalid={errors.title ? true : undefined}
          placeholder="Live: Dating in LA, Unfiltered"
        />
      </Field>

      <Field label="Where is it?" htmlFor="platform" required error={errors.platform}>
        <Select
          id="platform"
          name="platform"
          defaultValue={value('platform', event?.platform) || 'youtube'}
        >
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="other">Somewhere else</option>
        </Select>
      </Field>

      <Field
        label="Link"
        htmlFor="url"
        required
        hint="Where people should go to watch. YouTube streams play on the page; Instagram and TikTok open in their app."
        error={errors.url}
      >
        <TextInput
          id="url"
          name="url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          required
          defaultValue={value('url', event?.url)}
          aria-invalid={errors.url ? true : undefined}
        />
      </Field>

      <Field
        label="Date and time"
        htmlFor="scheduled_at"
        required
        hint="Your local time."
        error={errors.scheduled_at}
      >
        <TextInput
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          required
          defaultValue={echoed.scheduled_at ?? toLocalInputValue(event?.scheduled_at)}
          aria-invalid={errors.scheduled_at ? true : undefined}
        />
      </Field>

      <Field
        label="Status"
        htmlFor="status"
        required
        hint="Set this to Live when you go on air — the site updates straight away."
        error={errors.status}
      >
        <Select
          id="status"
          name="status"
          defaultValue={value('status', event?.status) || 'scheduled'}
        >
          <option value="scheduled">Scheduled — coming up</option>
          <option value="live">Live now — on air</option>
          <option value="ended">Ended — finished</option>
        </Select>
      </Field>

      <Field
        label="Replay link"
        htmlFor="replay_url"
        hint="Add this afterwards so people who missed it can still watch."
        error={errors.replay_url}
      >
        <TextInput
          id="replay_url"
          name="replay_url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          defaultValue={value('replay_url', event?.replay_url)}
        />
      </Field>

      <SaveBar label={submitLabel} />
    </form>
  );
}
