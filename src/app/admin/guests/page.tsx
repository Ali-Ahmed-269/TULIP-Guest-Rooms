import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';

async function getUniqueGuests() {
  const supabase = createServiceRoleClient();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('guest_name, guest_phone, guest_cnic')
    .order('created_at', { ascending: false });

  const guestsMap = new Map<string, { name: string; phone: string; cnic: string; count: number }>();

  bookings?.forEach((b) => {
    const key = (b.guest_cnic || b.guest_phone || '').trim();
    if (!key) return;

    if (guestsMap.has(key)) {
      guestsMap.get(key)!.count += 1;
    } else {
      guestsMap.set(key, {
        name: b.guest_name,
        phone: b.guest_phone,
        cnic: b.guest_cnic,
        count: 1,
      });
    }
  });

  return Array.from(guestsMap.values());
}

export default async function AdminGuestsPage() {
  const guests = await getUniqueGuests();

  return (
    <AdminLayout>
      <section className="pb-10">
        <PageHeader
          eyebrow="Admin"
          title="Guests Directory"
          description="List of unique guests who have reserved rooms, grouped by CNIC/Phone, and their total bookings count."
        />

        <div style={{ marginTop: '28px' }}>
          <div className="bg-[#16283f] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-[#0e1e33] text-left text-xs font-semibold text-[#b7c0cb] uppercase tracking-wider">
                    {['Guest Name', 'Phone Number', 'CNIC', 'Total Bookings'].map((heading) => (
                      <th key={heading} className="border-b border-white/10 whitespace-nowrap" style={{ padding: '18px 22px' }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {guests.length > 0 ? (
                    guests.map((guest, index) => (
                      <tr key={`${guest.phone}-${index}`} className="hover:bg-white/[0.025] transition-colors">
                        <td className="text-slate-200 font-semibold whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{guest.name}</td>
                        <td className="text-slate-300 whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{guest.phone}</td>
                        <td className="text-slate-300 whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{guest.cnic || '—'}</td>
                        <td className="whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>
                          <span className="inline-flex items-center justify-center rounded-lg text-xs font-bold bg-[#d9b571]/20 border border-[#d9b571]/40 text-[#d9b571] min-w-[36px]" style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '6px', paddingBottom: '6px' }}>
                            {guest.count}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">
                        No guests registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
