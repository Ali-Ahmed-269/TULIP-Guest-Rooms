import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import WalkInForm from '@/components/WalkInForm';
import PageHeader from '@/components/PageHeader';

async function getRooms() {
  const supabase = createServiceRoleClient();
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, room_type, price_per_night, status')
    .order('room_number', { ascending: true });
  return rooms || [];
}

export default async function AdminWalkinPage() {
  const rooms = await getRooms();

  return (
    <AdminLayout>
      <section style={{ paddingBottom: '40px' }}>
        <PageHeader
          eyebrow="Admin"
          title="Walk-in Booking"
          description="Create a fast walk-in reservation and mark payment as pay-at-hotel."
        />
        <div className="card" style={{ backgroundColor: '#fff', padding: '30px' }}>
          <WalkInForm rooms={rooms} />
        </div>
      </section>
    </AdminLayout>
  );
}
