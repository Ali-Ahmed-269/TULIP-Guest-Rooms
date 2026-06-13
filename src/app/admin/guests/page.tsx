import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';

async function getUniqueGuests() {
  const supabase = createServiceRoleClient();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('guest_name, guest_phone, guest_cnic')
    .order('created_at', { ascending: false });

  const guestsMap = new Map<string, { name: string; phone: string; cnic: string; count: number }>();

  bookings?.forEach((b) => {
    // Group by CNIC first, then phone if CNIC is empty, fallback to phone
    const key = (b.guest_cnic || b.guest_phone || '').trim();
    if (!key) return;

    if (guestsMap.has(key)) {
      const existing = guestsMap.get(key)!;
      existing.count += 1;
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
        <div className="mb-6">
          <h1>Guests Directory</h1>
          <p className="text-muted">
            List of unique guests who have reserved rooms, grouped by CNIC/Phone, and their total bookings count.
          </p>
        </div>

        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-background text-left">
                  {['Guest Name', 'Phone Number', 'CNIC', 'Total Bookings'].map((heading) => (
                    <th key={heading} className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.length > 0 ? (
                  guests.map((guest, index) => (
                    <tr key={`${guest.phone}-${index}`} className="bg-surface">
                      <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">
                        {guest.name}
                      </td>
                      <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                        {guest.phone}
                      </td>
                      <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                        {guest.cnic || '—'}
                      </td>
                      <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                        <span
                          className="badge badge-blue text-[0.9rem] px-2.5 py-1 rounded-[20px] min-w-[35px] text-center"
                        >
                          {guest.count}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted">
                      No guests registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
