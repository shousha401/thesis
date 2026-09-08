import { ContentList } from '@/components/admin/content-list';
import { listEpisodes } from '@/lib/admin/queries';
import { episodeLabel, formatDateShort } from '@/lib/format';
import { deleteEpisode, restoreEpisode, togglePublished } from './actions';

export const metadata = { title: 'Episodes' };

export default async function AdminEpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; show?: string }>;
}) {
  const params = await searchParams;
  const showDeleted = params.show === 'deleted';

  const all = await listEpisodes({ includeDeleted: true });
  const visible = all.filter((e) => (showDeleted ? e.deleted_at : !e.deleted_at));

  return (
    <ContentList
      heading="Episodes"
      noun="episode"
      basePath="/admin/episodes"
      newHref="/admin/episodes/new"
      saved={Boolean(params.saved)}
      showDeleted={showDeleted}
      deletedCount={all.filter((e) => e.deleted_at).length}
      onTogglePublished={togglePublished}
      onDelete={deleteEpisode}
      onRestore={restoreEpisode}
      items={visible.map((episode) => ({
        id: episode.id,
        title: episode.title,
        editHref: `/admin/episodes/${episode.id}`,
        publicHref: episode.is_published ? `/episodes/${episode.slug}` : null,
        isPublished: episode.is_published,
        isDeleted: Boolean(episode.deleted_at),
        meta: (
          <>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              {episodeLabel(episode.episode_number, episode.season)}
            </span>
            {episode.published_at ? (
              <span className="text-xs text-cream/45">
                {formatDateShort(episode.published_at)}
              </span>
            ) : null}
          </>
        ),
      }))}
    />
  );
}
