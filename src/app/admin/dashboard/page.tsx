import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';

async function getAdminOverview() {
  const supabase = createServiceRoleClient();

  const [bookingsRes, roomsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, room_id, booking_reference, guest_name, guest_phone, check_in_date, check_out_date, booking_status, payment_status, payment_method, total_amount, created_at, rooms(room_number)')
      .order('created_at', { ascending: false }),
    supabase
      .from('rooms')
      .select('id, room_number, status')
      .order('room_number', { ascending: true }),
  ]);

  const bookings = bookingsRes.data || [];
  const rooms = roomsRes.data || [];
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
    const activeBookings = roomBookings.filter((booking) => booking.booking_status !== 'Cancelled' && booking.check_out_date >= today);

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

  const enrichedRooms = rooms.map((room) => ({
    ...room,
    status: deriveRoomStatus(room),
  }));

  // Compute stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.booking_status === 'Confirmed').length;
  const pendingPayments = bookings.filter((b) => b.payment_status === 'Pending Verification').length;
  
  // Total Revenue: sum total_amount of bookings where payment_status is 'Paid'
  const totalRevenue = bookings
    .filter((b) => b.payment_status === 'Paid')
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  // Recent bookings (last 10)
  const recentBookings = bookings.slice(0, 10);

  return {
    totalBookings,
    confirmedBookings,
    pendingPayments,
    totalRevenue,
    recentBookings,
    rooms: enrichedRooms,
  };
}

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();

  const getRoomColorStyles = (status: string) => {
    switch (status) {
      case 'Available':
        return { bg: '#e2f0d9', border: '#7a9e7e', text: '#2e5131' }; // Sage green theme
      case 'Reserved':
      case 'Pending Verification':
        return { bg: '#fff2cc', border: '#d4a853', text: '#806010' }; // Gold theme
      case 'Booked':
        return { bg: '#fce4ec', border: '#c0395a', text: '#801830' }; // Primary theme
      case 'Maintenance':
      default:
        return { bg: '#f2f2f2', border: '#7f8c8d', text: '#4f5b5c' }; // Gray theme
    }
  };

  return (
    <AdminLayout>
      <section className="pb-10">
        <div className="grid gap-6">
          <PageHeader
            eyebrow="Dashboard"
            title="Admin Dashboard"
            description="Overview of recent reservations, room availability, and pending payments."
          />

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {[
              { label: 'Total Bookings', value: overview.totalBookings },
              { label: 'Confirmed', value: overview.confirmedBookings },
              { label: 'Pending Payments', value: overview.pendingPayments },
              { label: 'Total Revenue', value: `PKR ${overview.totalRevenue.toLocaleString()}` },
            ].map((card) => (
              <div key={card.label} className="card flex flex-col justify-self-stretch">
                <h3 className="mb-2.5 text-[1.1rem] text-muted">{card.label}</h3>
                <p className="text-3xl font-bold text-primary m-0">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Room Status Grid */}
          <div className="card bg-surface">
            <h2 className="mb-4 text-[1.35rem]">Room Status Grid</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
              {overview.rooms.map((room) => {
                const styles = getRoomColorStyles(room.status);
                return (
                  <div
                    key={room.room_number}
                      className="p-4 rounded-lg border-2 text-center font-bold flex flex-col gap-1 shadow-sm"
                      style={{
                        backgroundColor: styles.bg,
                        borderColor: styles.border,
                        color: styles.text,
                      }}
                  >
                    <span className="text-[1.25rem]">Room {room.room_number}</span>
                    <span className="text-[0.8rem] font-semibold uppercase">{room.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Bookings Section */}
          <div className="card bg-surface">
            <h2 className="mb-4 text-[1.35rem]">Recent Bookings (Last 10)</h2>
            {overview.recentBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-background text-left">
                      {['Reference', 'Guest Name', 'Room', 'Check-in', 'Check-out', 'Booking Status', 'Payment Status'].map((heading) => (
                        <th key={heading} className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentBookings.map((booking: any) => (
                      <tr key={booking.booking_reference} className="bg-surface">
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">{booking.booking_reference}</td>
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{booking.guest_name}</td>
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">Room {booking.rooms?.room_number || 'N/A'}</td>
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{booking.check_in_date}</td>
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{booking.check_out_date}</td>
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                    <span className={`badge ${
                          booking.booking_status === 'Confirmed' ? 'badge-green' :
                          booking.booking_status === 'Cancelled' ? 'badge-red' : 'badge-yellow'
                        }`}>
                            {booking.booking_status}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                          <span className={`badge ${
                            booking.payment_status === 'Paid' ? 'badge-green' :
                            booking.payment_status === 'Failed' ? 'badge-red' : 'badge-yellow'
                          }`}>
                            {booking.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted m-0">No recent bookings found.</p>
            )}
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
