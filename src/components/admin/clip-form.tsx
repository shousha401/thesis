'use client';

import { useActionState } from 'react';
import { MediaFields, PublishToggle } from '@/components/admin/media-fields';
import { Field, SaveBar, Select, TextArea, TextInput } from '@/components/admin/ui';
import type { ClipFormState } from '@/app/admin/(protected)/clips/actions';
import type { Clip } from '@/lib/types';

export interface EpisodeOption {
  id: string;
  title: string;
  label: string;
}

export function ClipForm({
  action,
  clip,
  episodes,
  submitLabel,
}: {
  action: (state: ClipFormState, formData: FormData) => Promise<ClipFormState>;
  clip?: Clip;
  episodes: EpisodeOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ClipFormState, FormData>(action, {
    status: 'idle',
  });

  const errors = state.fieldErrors ?? {};
  const echoed = state.values ?? {};
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
        values={(key) =>
          value(key, key === 'video_url' ? clip?.video_url : clip?.thumbnail_alt)
        }
        errors={errors}
        hasExistingThumbnail={Boolean(clip?.thumbnail_path)}
        videoHint="A Short, Reel or TikTok. Share-sheet links work too."
      />

      <Field label="Title" htmlFor="title" required error={errors.title}>
        <TextInput
          id="title"
          name="title"
          required
          defaultValue={value('title', clip?.title)}
          aria-invalid={errors.title ? true : undefined}
        />
      </Field>

      <Field
        label="Caption"
        htmlFor="caption"
        hint="One line, shown under the title."
        error={errors.caption}
      >
        <TextArea
          id="caption"
          name="caption"
          rows={3}
          defaultValue={value('caption', clip?.caption)}
        />
      </Field>

      <Field
        label="From which episode?"
        htmlFor="episode_id"
        hint="Links the clip back to the full episode. Leave blank if it is a standalone."
      >
        <Select id="episode_id" name="episode_id" defaultValue={value('episode_id', clip?.episode_id)}>
          <option value="">Not from an episode</option>
          {episodes.map((episode) => (
            <option key={episode.id} value={episode.id}>
              {episode.label}
            </option>
          ))}
        </Select>
      </Field>

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
            (clip?.published_at ? clip.published_at.slice(0, 10) : '')
          }
        />
      </Field>

      <PublishToggle
        noun="clip"
        defaultChecked={
          echoed.is_published !== undefined
            ? echoed.is_published === 'on'
            : (clip?.is_published ?? false)
        }
      />

      <SaveBar label={submitLabel} />
    </form>
  );
}
