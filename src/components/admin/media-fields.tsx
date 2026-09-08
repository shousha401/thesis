'use client';

import { useState } from 'react';
import { Field, TextInput } from '@/components/admin/ui';

/**
 * The video link + thumbnail block, shared by the episode and clip forms.
 *
 * Both have identical rules (YouTube supplies a thumbnail, the others do not;
 * any stored image needs alt text), so they share the fields as well as the
 * server-side validation in lib/admin/media.ts.
 */
export function MediaFields({
  values,
  errors,
  hasExistingThumbnail,
  videoHint,
}: {
  values: (key: string, fallback: string | number | null | undefined) => string;
  errors: Record<string, string>;
  hasExistingThumbnail: boolean;
  videoHint?: string;
}) {
  const [showRemove, setShowRemove] = useState(hasExistingThumbnail);

  return (
    <>
      <Field
        label="Video link"
        htmlFor="video_url"
        required
        hint={
          videoHint ??
          'Paste from YouTube, Instagram or TikTok. Share-sheet links work too.'
        }
        error={errors.video_url}
      >
        <TextInput
          id="video_url"
          name="video_url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={values('video_url', undefined)}
          aria-invalid={errors.video_url ? true : undefined}
          placeholder="https://youtube.com/watch?v=..."
        />
      </Field>

      <fieldset className="mt-8 border border-plum-line p-4">
        <legend className="px-2 text-sm font-semibold text-cream">Thumbnail</legend>
        <p className="text-sm leading-relaxed text-cream/55">
          YouTube videos use YouTube&rsquo;s thumbnail automatically. Upload one
          to override it — and you must upload one for Instagram and TikTok.
        </p>

        {showRemove ? (
          <label className="mt-4 flex items-center gap-3 text-sm text-cream/80">
            <input
              type="checkbox"
              name="remove_thumbnail"
              value="1"
              onChange={(event) => setShowRemove(!event.target.checked)}
              className="h-5 w-5 accent-[color:var(--color-magenta)]"
            />
            Remove the current image
          </label>
        ) : null}

        <Field label="Image file" htmlFor="thumbnail" error={errors.thumbnail}>
          <input
            id="thumbnail"
            name="thumbnail"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-sm text-cream/80 file:mr-4 file:border-0 file:bg-magenta file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-ink"
          />
        </Field>

        <Field
          label="Image description"
          htmlFor="thumbnail_alt"
          hint="Required whenever there is an image. Describe it in a few words."
          error={errors.thumbnail_alt}
        >
          <TextInput
            id="thumbnail_alt"
            name="thumbnail_alt"
            defaultValue={values('thumbnail_alt', undefined)}
            aria-invalid={errors.thumbnail_alt ? true : undefined}
            placeholder="The three of us laughing around the mics"
          />
        </Field>
      </fieldset>
    </>
  );
}

/** The publish checkbox, identical for episodes and clips. */
export function PublishToggle({
  defaultChecked,
  noun,
}: {
  defaultChecked: boolean;
  noun: string;
}) {
  return (
    <label className="mt-8 flex items-start gap-3 border border-plum-line p-4">
      <input
        type="checkbox"
        name="is_published"
        value="on"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--color-magenta)]"
      />
      <span>
        <span className="block text-sm font-semibold text-cream">
          Publish this {noun}
        </span>
        <span className="mt-1 block text-sm text-cream/55">
          Ticked, it appears on the site as soon as you save. Unticked, only you
          can see it.
        </span>
      </span>
    </label>
  );
}
