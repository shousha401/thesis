import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HostForm } from '@/components/admin/host-form';
import { getHostForEdit } from '@/lib/admin/queries';
import { storageUrl } from '@/lib/data';
import { updateHost, type HostFormState } from '../actions';

export const metadata = { title: 'Edit host' };

export default async function EditHostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const host = await getHostForEdit(id);

  if (!host) notFound();

  async function action(state: HostFormState, formData: FormData) {
    'use server';
    return updateHost(id, state, formData);
  }

  return (
    <div>
      <Link
        href="/admin/hosts"
        className="text-sm text-cream/60 transition-colors hover:text-magenta"
      >
        <span aria-hidden="true">←</span> Hosts
      </Link>

      <h1 className="mt-4 font-display text-3xl leading-tight text-cream">
        {host.name}
      </h1>

      <HostForm
        action={action}
        host={host}
        photoUrl={storageUrl('host-photos', host.photo_path)}
      />
    </div>
  );
}
