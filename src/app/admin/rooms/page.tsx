import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import RoomStatusManager from '@/components/RoomStatusManager';

async function getRooms() {
  const supabase = createServiceRoleClient();
  const [roomsRes, bookingsRes] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, room_type, status, price_per_night')
      .order('room_number', { ascending: true }),
    supabase
      .from('bookings')
      .select('room_id, check_in_date, check_out_date, booking_status, payment_status, payment_method')
      .neq('booking_status', 'Cancelled'),
  ]);

  const rooms = roomsRes.data || [];
  const bookings = bookingsRes.data || [];
  const today = new Date().toISOString().split('T')[0];

  const bookingsByRoom = bookings.reduce((map: Record<number, any[]>, booking) => {
    if (!map[booking.room_id]) map[booking.room_id] = [];
    map[booking.room_id].push(booking);
    return map;
  }, {} as Record<number, any[]>);

  const deriveRoomStatus = (room: any) => {
    if (room.status === 'Maintenance') {
      return 'Maintenance';
    }

    const roomBookings = bookingsByRoom[room.id] || [];
    const activeBookings = roomBookings.filter((booking) => booking.check_out_date >= today);

    const hasConfirmed = activeBookings.some((booking) =>
      booking.booking_status === 'Confirmed' || booking.payment_status === 'Paid' || booking.payment_method === 'pay_at_hotel'
    );
    if (hasConfirmed) return 'Booked';

    const hasPending = activeBookings.some((booking) =>
      booking.booking_status === 'Pending' || booking.payment_status === 'Pending Verification'
    );
    if (hasPending) return 'Reserved';

    return room.status;
  };

  return rooms.map((room) => ({
    ...room,
    status: deriveRoomStatus(room),
  }));
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
