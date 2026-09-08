'use client';

import { useActionState, useState } from 'react';
import { Field, SaveBar, TextArea, TextInput } from '@/components/admin/ui';
import type { HostFormState } from '@/app/admin/(protected)/hosts/actions';
import type { Host } from '@/lib/types';

export function HostForm({
  action,
  host,
  photoUrl,
}: {
  action: (state: HostFormState, formData: FormData) => Promise<HostFormState>;
  host: Host;
  photoUrl: string | null;
}) {
  const [state, formAction] = useActionState<HostFormState, FormData>(action, {
    status: 'idle',
  });

  const errors = state.fieldErrors ?? {};
  const echoed = state.values ?? {};
  const value = (key: string, fallback: string | null | undefined) =>
    echoed[key] ?? fallback ?? '';

  const [hasPhoto, setHasPhoto] = useState(Boolean(host.photo_path));

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

      <Field label="Name" htmlFor="name" required error={errors.name}>
        <TextInput
          id="name"
          name="name"
          required
          defaultValue={value('name', host.name)}
          aria-invalid={errors.name ? true : undefined}
        />
      </Field>

      <Field
        label="Web address"
        htmlFor="slug"
        hint={`Your page is /hosts/${host.slug}. Changing this changes the link.`}
        error={errors.slug}
      >
        <TextInput
          id="slug"
          name="slug"
          defaultValue={value('slug', host.slug)}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={errors.slug ? true : undefined}
        />
      </Field>

      <Field
        label="Star sign"
        htmlFor="zodiac"
        hint="Shown as a small label above your name."
      >
        <TextInput id="zodiac" name="zodiac" defaultValue={value('zodiac', host.zodiac)} />
      </Field>

      <Field
        label="Bio"
        htmlFor="bio"
        hint="Line breaks are kept exactly as you type them."
        error={errors.bio}
      >
        <TextArea id="bio" name="bio" rows={9} defaultValue={value('bio', host.bio)} />
      </Field>

      <fieldset className="mt-8 border border-plum-line p-4">
        <legend className="px-2 text-sm font-semibold text-cream">Photo</legend>

        {photoUrl ? (
          // Plain img rather than next/image: it is a small admin preview, and
          // the file changes on every upload.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={host.photo_alt ?? `Current photo of ${host.name}`}
            className="mt-3 h-32 w-auto border border-plum-line object-cover"
          />
        ) : (
          <p className="mt-3 text-sm text-cream/55">
            No photo yet — your initial is shown instead.
          </p>
        )}

        {hasPhoto ? (
          <label className="mt-4 flex items-center gap-3 text-sm text-cream/80">
            <input
              type="checkbox"
              name="remove_photo"
              value="1"
              onChange={(event) => setHasPhoto(!event.target.checked)}
              className="h-5 w-5 accent-[color:var(--color-magenta)]"
            />
            Remove the current photo
          </label>
        ) : null}

        <Field label="New photo" htmlFor="photo" error={errors.photo}>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-sm text-cream/80 file:mr-4 file:border-0 file:bg-magenta file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-ink"
          />
        </Field>

        <Field
          label="Photo description"
          htmlFor="photo_alt"
          hint="Required whenever there is a photo. Describe it in a few words."
          error={errors.photo_alt}
        >
          <TextInput
            id="photo_alt"
            name="photo_alt"
            defaultValue={value('photo_alt', host.photo_alt)}
            aria-invalid={errors.photo_alt ? true : undefined}
            placeholder="Smiling, arms crossed, against a pink wall"
          />
        </Field>
      </fieldset>

      <fieldset className="mt-8 border border-plum-line p-4">
        <legend className="px-2 text-sm font-semibold text-cream">Your links</legend>
        <p className="text-sm text-cream/55">Optional. Leave blank to hide.</p>

        {(
          [
            ['instagram', 'Instagram'],
            ['tiktok', 'TikTok'],
            ['linkedin', 'LinkedIn'],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} htmlFor={`social_${key}`}>
            <TextInput
              id={`social_${key}`}
              name={`social_${key}`}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              defaultValue={value(`social_${key}`, host.socials?.[key])}
            />
          </Field>
        ))}
      </fieldset>

      <SaveBar label="Save changes" />
    </form>
  );
}
