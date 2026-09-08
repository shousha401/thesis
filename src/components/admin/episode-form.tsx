'use client';

import { useActionState } from 'react';
import { Field, SaveBar, TextArea, TextInput } from '@/components/admin/ui';
import { MediaFields, PublishToggle } from '@/components/admin/media-fields';
import type { EpisodeFormState } from '@/app/admin/(protected)/episodes/actions';
import type { AdminEpisode } from '@/lib/admin/queries';

/**
 * The create/edit form.
 *
 * The one flow the client described is "log in, paste a link, add a
 * description, and have it appear", so the video URL and title sit at the top
 * and everything else can be left alone. Season, listen links and the
 * thumbnail all have working defaults.
 */
export function EpisodeForm({
  action,
  episode,
  defaultEpisodeNumber,
  submitLabel,
  secondaryAction,
}: {
  action: (state: EpisodeFormState, formData: FormData) => Promise<EpisodeFormState>;
  episode?: AdminEpisode;
  defaultEpisodeNumber?: number;
  submitLabel: string;
  secondaryAction?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<EpisodeFormState, FormData>(action, {
    status: 'idle',
  });

  const errors = state.fieldErrors ?? {};
  const echoed = state.values ?? {};

  // Prefer what the host just typed (so a rejected save loses nothing), then
  // the saved row, then a sensible default.
  const value = (key: string, fallback: string | number | null | undefined) =>
    echoed[key] ?? (fallback === null || fallback === undefined ? '' : String(fallback));

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

      <MediaFields
        values={(key) => value(key, key === 'video_url' ? episode?.video_url : episode?.thumbnail_alt)}
        errors={errors}
        hasExistingThumbnail={Boolean(episode?.thumbnail_path)}
      />

      <Field label="Title" htmlFor="title" required error={errors.title}>
        <TextInput
          id="title"
          name="title"
          required
          defaultValue={value('title', episode?.title)}
          aria-invalid={errors.title ? true : undefined}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        hint="Line breaks are kept exactly as you type them."
        error={errors.description}
      >
        <TextArea
          id="description"
          name="description"
          rows={8}
          defaultValue={value('description', episode?.description)}
        />
      </Field>

      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <Field
          label="Episode number"
          htmlFor="episode_number"
          required
          error={errors.episode_number}
        >
          <TextInput
            id="episode_number"
            name="episode_number"
            type="number"
            inputMode="numeric"
            min={0}
            required
            defaultValue={value(
              'episode_number',
              episode?.episode_number ?? defaultEpisodeNumber,
            )}
            aria-invalid={errors.episode_number ? true : undefined}
          />
        </Field>

        <Field label="Season" htmlFor="season" error={errors.season}>
          <TextInput
            id="season"
            name="season"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={value('season', episode?.season)}
          />
        </Field>
      </div>

      <Field
        label="Publish date"
        htmlFor="published_at"
        hint="Leave blank and today's date is used when you publish."
        error={errors.published_at}
      >
        <TextInput
          id="published_at"
          name="published_at"
          type="date"
          defaultValue={
            echoed.published_at ??
            (episode?.published_at ? episode.published_at.slice(0, 10) : '')
          }
        />
      </Field>

      <fieldset className="mt-8 border border-plum-line p-4">
        <legend className="px-2 text-sm font-semibold text-cream">Listen links</legend>
        <p className="text-sm text-cream/55">
          Optional. Shown as buttons on the episode page.
        </p>

        <Field label="Spotify" htmlFor="listen_spotify">
          <TextInput
            id="listen_spotify"
            name="listen_spotify"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            defaultValue={value('listen_spotify', episode?.listen_links?.spotify)}
          />
        </Field>

        <Field label="Apple Podcasts" htmlFor="listen_apple">
          <TextInput
            id="listen_apple"
            name="listen_apple"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            defaultValue={value('listen_apple', episode?.listen_links?.apple)}
          />
        </Field>
      </fieldset>

      <PublishToggle
        noun="episode"
        defaultChecked={
          echoed.is_published !== undefined
            ? echoed.is_published === 'on'
            : (episode?.is_published ?? false)
        }
      />

      <SaveBar label={submitLabel} secondary={secondaryAction} />
    </form>
  );
}
