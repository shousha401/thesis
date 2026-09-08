'use client';

import { useActionState } from 'react';
import { Field, SaveBar, TextArea, TextInput } from '@/components/admin/ui';
import type { SettingsFormState } from '@/app/admin/(protected)/settings/actions';
import type { SiteSettings } from '@/lib/types';

export function SettingsForm({
  action,
  settings,
}: {
  action: (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  settings: SiteSettings;
}) {
  const [state, formAction] = useActionState<SettingsFormState, FormData>(action, {
    status: 'idle',
  });

  const errors = state.fieldErrors ?? {};

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

      <fieldset className="mt-8 border border-plum-line p-4">
        <legend className="px-2 text-sm font-semibold text-cream">
          Where to listen
        </legend>
        <p className="text-sm text-cream/55">
          Shown in the header, the footer and on the home page. Leave one blank
          to hide it.
        </p>

        {(
          [
            ['youtube', 'YouTube channel'],
            ['spotify', 'Spotify show'],
            ['apple', 'Apple Podcasts show'],
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            htmlFor={`platform_${key}`}
            error={errors[`platform_${key}`]}
          >
            <TextInput
              id={`platform_${key}`}
              name={`platform_${key}`}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              defaultValue={settings.platform_links?.[key] ?? ''}
              aria-invalid={errors[`platform_${key}`] ? true : undefined}
            />
          </Field>
        ))}
      </fieldset>

      <fieldset className="mt-8 border border-plum-line p-4">
        <legend className="px-2 text-sm font-semibold text-cream">Social links</legend>

        {(
          [
            ['instagram', 'Instagram'],
            ['tiktok', 'TikTok'],
            ['youtube', 'YouTube'],
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            htmlFor={`social_${key}`}
            error={errors[`social_${key}`]}
          >
            <TextInput
              id={`social_${key}`}
              name={`social_${key}`}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              defaultValue={settings.social_links?.[key] ?? ''}
              aria-invalid={errors[`social_${key}`] ? true : undefined}
            />
          </Field>
        ))}

        <Field
          label="Contact email"
          htmlFor="social_email"
          hint="Shown at the bottom of every page."
          error={errors.social_email}
        >
          <TextInput
            id="social_email"
            name="social_email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            defaultValue={settings.social_links?.email ?? ''}
            aria-invalid={errors.social_email ? true : undefined}
          />
        </Field>
      </fieldset>

      <Field
        label="How we met"
        htmlFor="how_we_met"
        hint="Shown on the Hosts page and the home page. Line breaks are kept."
      >
        <TextArea
          id="how_we_met"
          name="how_we_met"
          rows={8}
          defaultValue={settings.how_we_met}
        />
      </Field>

      <Field
        label="About the show"
        htmlFor="about_body"
        hint="The whole About page. Leave a blank line between paragraphs — the first one is set larger."
      >
        <TextArea
          id="about_body"
          name="about_body"
          rows={16}
          defaultValue={settings.about_body}
        />
      </Field>

      <SaveBar label="Save settings" />
    </form>
  );
}
