import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import SettingsForm from '@/components/SettingsForm';
import PageHeader from '@/components/PageHeader';

async function getSettings() {
  const supabase = createServiceRoleClient();
  const { data: settings } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value');

  return settings || [];
}

export default async function AdminSettingsPage() {
  const settingsData = await getSettings();

  // Convert settings array to record mapping key -> value
  const settings: Record<string, string> = {};
  settingsData.forEach((item: { setting_key: string; setting_value: string }) => {
    settings[item.setting_key] = item.setting_value;
  });

  return (
    <AdminLayout>
      <section style={{ paddingBottom: '40px' }}>
        <PageHeader
          eyebrow="Admin"
          title="Settings"
          description="Guesthouse site settings and payment contact details."
        />
        <SettingsForm initialSettings={settings} />
      </section>
    </AdminLayout>
  );
}
