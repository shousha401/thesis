import { ContentList } from '@/components/admin/content-list';
import { listClips } from '@/lib/admin/queries';
import { formatDateShort } from '@/lib/format';
import { deleteClip, restoreClip, toggleClipPublished } from './actions';

export const metadata = { title: 'Clips' };

export default async function AdminClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; show?: string }>;
}) {
  const params = await searchParams;
  const showDeleted = params.show === 'deleted';

  const all = await listClips({ includeDeleted: true });
  const visible = all.filter((c) => (showDeleted ? c.deleted_at : !c.deleted_at));

  return (
    <ContentList
      heading="Clips"
      noun="clip"
      basePath="/admin/clips"
      newHref="/admin/clips/new"
      saved={Boolean(params.saved)}
      showDeleted={showDeleted}
      deletedCount={all.filter((c) => c.deleted_at).length}
      onTogglePublished={toggleClipPublished}
      onDelete={deleteClip}
      onRestore={restoreClip}
      items={visible.map((clip) => ({
        id: clip.id,
        title: clip.title,
        editHref: `/admin/clips/${clip.id}`,
        publicHref: clip.is_published ? `/clips/${clip.slug}` : null,
        isPublished: clip.is_published,
        isDeleted: Boolean(clip.deleted_at),
        meta: (
          <>
            <span className="text-xs uppercase tracking-[0.12em] text-cream/45">
              {clip.video_provider}
            </span>
            {clip.published_at ? (
              <span className="text-xs text-cream/45">
                {formatDateShort(clip.published_at)}
              </span>
            ) : null}
          </>
        ),
      }))}
    />
  );
}
