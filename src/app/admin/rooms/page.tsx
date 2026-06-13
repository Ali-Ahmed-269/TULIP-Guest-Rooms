import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import RoomStatusManager from '@/components/RoomStatusManager';

async function getRooms() {
  const supabase = createServiceRoleClient();
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, room_type, status, price_per_night')
    .order('room_number', { ascending: true });

  return rooms || [];
}

export default async function AdminRoomsPage() {
  const rooms = await getRooms();

  return (
    <AdminLayout>
      <section className="pb-10">
        <div className="mb-6">
          <h1>Rooms Management</h1>
          <p className="text-muted">
            Update room statuses quickly when a property goes under maintenance or becomes available.
          </p>
        </div>
        <RoomStatusManager rooms={rooms as any} />
      </section>
    </AdminLayout>
  );
}
