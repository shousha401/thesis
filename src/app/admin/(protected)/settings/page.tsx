import { SettingsForm } from '@/components/admin/settings-form';
import { getSettingsForEdit } from '@/lib/admin/queries';
import { updateSettings } from './actions';

export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettingsForEdit();

  return (
    <div>
      {params.saved ? (
        <p
          role="status"
          className="mb-6 border border-gold bg-gold/10 px-4 py-3 text-sm text-cream"
        >
          Saved. The site is already updated.
        </p>
      ) : null}

      <h1 className="font-display text-3xl text-cream">Links &amp; about</h1>
      <p className="mt-2 text-sm text-cream/60">
        The links in the header and footer, and the words on the About page.
      </p>

      <SettingsForm action={updateSettings} settings={settings} />
    </div>
  );
}
