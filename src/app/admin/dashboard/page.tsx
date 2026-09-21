import Image from 'next/image';
import Link from 'next/link';
import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import {
  Calendar,
  CheckCheck,
  Clock,
  Coins,
  Bed,
  TrendingUp,
  UserPlus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

async function getAdminOverview() {
  const supabase = createServiceRoleClient();

  const [bookingsRes, roomsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, room_id, booking_reference, guest_name, guest_phone, check_in_date, check_out_date, booking_status, payment_status, payment_method, total_amount, created_at, rooms(room_number, room_type)')
      .order('created_at', { ascending: false }),
    supabase
      .from('rooms')
      .select('id, room_number, room_type, price_per_night, status')
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

  // Available room count
  const availableRoomsCount = enrichedRooms.filter((r) => r.status === 'Available').length;

  // Recent bookings (last 10)
  const recentBookings = bookings.slice(0, 10);

  return {
    totalBookings,
    confirmedBookings,
    pendingPayments,
    totalRevenue,
    availableRoomsCount,
    totalRoomsCount: enrichedRooms.length,
    recentBookings,
    rooms: enrichedRooms,
  };
}

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();

  const getRoomColorStyles = (status: string) => {
    switch (status) {
      case 'Available':
        return {
          bg: '#0e1e33',
          border: 'rgba(16, 185, 129, 0.35)',
          dot: '#34d399',
          text: '#34d399',
          badgeBg: 'rgba(16, 185, 129, 0.1)',
        };
      case 'Reserved':
      case 'Pending Verification':
      case 'Pending':
        return {
          bg: '#0e1e33',
          border: 'rgba(234, 179, 8, 0.35)',
          dot: '#facc15',
          text: '#facc15',
          badgeBg: 'rgba(234, 179, 8, 0.1)',
        };
      case 'Booked':
        return {
          bg: '#0e1e33',
          border: 'rgba(239, 68, 68, 0.35)',
          dot: '#f87171',
          text: '#f87171',
          badgeBg: 'rgba(239, 68, 68, 0.1)',
        };
      case 'Maintenance':
      default:
        return {
          bg: '#0e1e33',
          border: 'rgba(245, 158, 11, 0.35)',
          dot: '#fbbf24',
          text: '#fbbf24',
          badgeBg: 'rgba(245, 158, 11, 0.1)',
        };
    }
  };

  const stats = [
    {
      label: 'Total Bookings',
      value: overview.totalBookings,
      icon: Calendar,
      trend: '+1 from last week',
      trendType: 'up',
      detail: `${overview.confirmedBookings} confirmed`,
    },
    {
      label: 'Confirmed',
      value: overview.confirmedBookings,
      icon: CheckCheck,
      trend: '+1 from last week',
      trendType: 'up',
      detail: `${Math.round((overview.confirmedBookings / (overview.totalBookings || 1)) * 100)}% conversion`,
    },
    {
      label: 'Pending Payments',
      value: overview.pendingPayments,
      icon: Clock,
      trend: 'No change',
      trendType: 'neutral',
      detail: 'Requires review',
    },
    {
      label: 'Total Revenue',
      value: `PKR ${overview.totalRevenue.toLocaleString()}`,
      icon: Coins,
      trend: 'Verified paid',
      trendType: 'neutral',
      detail: 'All verified payments',
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 pb-4">
        {/* ── 1. Overview Banner with Luxury Room Interior Blend & Quick Actions ── */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0e1e33] min-h-[220px] md:min-h-[260px] flex items-center shadow-lg">
          {/* Room Photo positioned on the right ~45% */}
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-5/12 h-full opacity-30 md:opacity-100 transition-opacity">
            <Image
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80"
              alt="Luxury hotel room interior"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
            {/* Smooth left-to-right dark navy gradient blend overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, #0e1e33 0%, rgba(14, 30, 51, 0.95) 30%, rgba(14, 30, 51, 0.6) 65%, rgba(14, 30, 51, 0.15) 100%)',
              }}
            />
          </div>

          {/* Left Banner Content */}
          <div className="relative z-10 admin-banner-content max-w-2xl flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-5 h-[2px] bg-[#d9b571]" />
              <span className="text-[11px] font-bold tracking-[0.18em] text-[#d9b571] uppercase">
                OVERVIEW
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-emerald-400 font-medium">
                {overview.availableRoomsCount} of {overview.totalRoomsCount} Rooms Available
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight leading-tight">
              Operational Overview
            </h2>

            <p className="text-xs md:text-sm text-[#b7c0cb] mt-3.5 md:mt-4 leading-relaxed max-w-lg">
              Manage room allocations, verify pending deposits, and register walk-in guests directly.
            </p>

            {/* Banner Quick Actions */}
            <div className="flex items-center gap-3 mt-6 md:mt-7 flex-wrap">
              <Link
                href="/admin/walkin"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-[#d9b571]/70 shadow-sm"
                style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px' }}
              >
                <UserPlus size={16} className="text-[#d9b571] shrink-0" />
                <span>New Walk-in Guest</span>
              </Link>
              <Link
                href="/admin/bookings"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-[#d9b571]/70 shadow-sm"
                style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px' }}
              >
                <span>View All Bookings</span>
                <ArrowRight size={16} className="shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. Stat Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {stats.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="admin-card flex flex-col justify-between hover:border-[#d9b571]/40 hover:-translate-y-0.5 transition-all duration-200 shadow-md group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Circular Icon Badge */}
                    <div className="w-10 h-10 rounded-full bg-[#0a1626] border border-[#d9b571]/40 flex items-center justify-center text-[#d9b571] shadow-inner group-hover:scale-105 transition-transform">
                      <Icon size={19} />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {card.detail}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#b7c0cb] mb-1">
                    {card.label}
                  </h3>
                  <p className="text-3xl lg:text-4xl font-bold text-white font-heading m-0 tracking-tight">
                    {card.value}
                  </p>
                </div>

                {/* Trend line */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5">
                  {card.trendType === 'up' ? (
                    <>
                      <TrendingUp size={13} className="text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">
                        {card.trend}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 text-[10px]">◆</span>
                      <span className="text-xs font-medium text-slate-400">
                        {card.trend}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. Room Status Grid ── */}
        <div className="admin-card shadow-md">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5 pb-3 border-b border-white/5">
            {/* Left Header with Bed Icon */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0a1626] border border-[#d9b571]/30 flex items-center justify-center text-[#d9b571]">
                <Bed size={18} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-heading font-bold text-white tracking-tight">
                  Room Status Grid
                </h3>
                <p className="text-xs text-[#b7c0cb]">Live room occupancy & availability state</p>
              </div>
            </div>

            {/* Right Color-Key Legend & Action */}
            <div className="flex items-center gap-5 text-xs font-medium text-[#b7c0cb] flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
                  <span className="text-slate-200">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm" />
                  <span className="text-slate-200">Booked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  <span className="text-slate-200">Maintenance</span>
                </div>
              </div>

              <Link
                href="/admin/rooms"
                className="text-xs font-semibold text-[#d9b571] hover:underline flex items-center gap-1 pl-2 border-l border-white/10"
              >
                <span>Manage Rooms</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Restyled Room Chips Grid with Tier Label */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-11 gap-4">
            {overview.rooms.map((room) => {
              const styles = getRoomColorStyles(room.status);
              return (
                <div
                  key={room.room_number}
                  className="rounded-xl p-4 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] shadow-sm hover:border-white/30"
                  style={{
                    backgroundColor: styles.bg,
                    border: `1px solid ${styles.border}`,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: styles.dot }}
                        />
                        <span className="text-sm font-bold text-white tracking-tight">
                          Room {room.room_number}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {room.room_type || 'Standard'}
                    </span>
                  </div>

                  <span
                    className="text-[10px] font-bold uppercase tracking-wider mt-2.5 px-2 py-0.5 rounded-md w-fit"
                    style={{ color: styles.text, backgroundColor: styles.badgeBg }}
                  >
                    {room.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Recent Bookings Section (Last 10) ── */}
        <div className="admin-card shadow-md">
          <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-lg md:text-xl font-heading font-bold text-white tracking-tight">
                Recent Bookings (Last 10)
              </h3>
              <p className="text-xs text-[#b7c0cb]">Latest guest reservations and payment audit statuses</p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-[#d9b571] hover:underline flex items-center gap-1"
            >
              <span>View All Bookings</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {overview.recentBookings.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full border-collapse min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-[#0e1e33] text-left text-xs font-semibold text-[#b7c0cb] uppercase tracking-wider">
                    {['Reference', 'Guest Name', 'Room', 'Check-in', 'Check-out', 'Booking Status', 'Payment Status', 'Action'].map((heading) => (
                      <th key={heading} className="px-4 py-3.5 border-b border-white/10">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-[#16283f]">
                  {overview.recentBookings.map((booking: any) => (
                    <tr key={booking.booking_reference} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-white font-mono text-xs">
                        {booking.booking_reference}
                      </td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium">
                        {booking.guest_name}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        Room {booking.rooms?.room_number || 'N/A'}{' '}
                        {booking.rooms?.room_type ? (
                          <span className="text-[11px] text-slate-400">({booking.rooms.room_type})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{booking.check_in_date}</td>
                      <td className="px-4 py-3.5 text-slate-300">{booking.check_out_date}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${booking.booking_status === 'Confirmed'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : booking.booking_status === 'Cancelled'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${booking.booking_status === 'Confirmed'
                                ? 'bg-emerald-400'
                                : booking.booking_status === 'Cancelled'
                                  ? 'bg-rose-400'
                                  : 'bg-amber-400'
                              }`}
                          />
                          {booking.booking_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${booking.payment_status === 'Paid'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : booking.payment_status === 'Failed'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${booking.payment_status === 'Paid'
                                ? 'bg-emerald-400'
                                : booking.payment_status === 'Failed'
                                  ? 'bg-rose-400'
                                  : 'bg-amber-400'
                              }`}
                          />
                          {booking.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href="/admin/bookings"
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:border-[#d9b571]/50 text-slate-200 hover:text-white transition-colors"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[#b7c0cb] text-sm py-4">No recent bookings found.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
