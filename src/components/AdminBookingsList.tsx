'use client';

import { useState } from 'react';

interface Booking {
  id: number;
  booking_reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_cnic: string;
  guest_address: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  payment_proof: string | null;
  booking_status: string;
  special_requests: string | null;
  created_at: string;
  rooms: {
    id: number;
    room_number: string;
    room_type: string;
  }[] | {
    id: number;
    room_number: string;
    room_type: string;
  } | null;
}

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  Standard: 'Standard Room',
  Premium: 'Premium Room',
  'Comfort Plus': 'Comfort Plus',
};

interface AdminBookingsListProps {
  initialBookings: Booking[];
}

export default function AdminBookingsList({ initialBookings }: AdminBookingsListProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (bookingId: number, action: 'verify' | 'cancel') => {
    if (!confirm(`Are you sure you want to ${action === 'verify' ? 'verify the payment for' : 'cancel'} this booking?`)) return;
    setActionLoading(bookingId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/bookings/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, action }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.message || `Failed to perform ${action} action.`);
      } else {
        setMessage(result.message || 'Action completed successfully.');
        setBookings((prev) =>
          prev.map((b) => {
            if (b.id !== bookingId) return b;
            if (action === 'verify') return { ...b, payment_status: 'Paid', booking_status: 'Confirmed' };
            return { ...b, booking_status: 'Cancelled' };
          })
        );
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) => {
            if (!prev) return null;
            if (action === 'verify') return { ...prev, payment_status: 'Paid', booking_status: 'Confirmed' };
            return { ...prev, booking_status: 'Cancelled' };
          });
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.guest_phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || b.booking_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRoom = (booking: Booking) => {
    if (Array.isArray(booking.rooms)) return booking.rooms[0] || null;
    return booking.rooms;
  };

  const bsStyle = (s: string) =>
    s === 'Confirmed'
      ? { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)', dot: '#34d399' }
      : s === 'Cancelled'
      ? { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', dot: '#f87171' }
      : { bg: 'rgba(234,179,8,0.12)', text: '#facc15', border: 'rgba(234,179,8,0.3)', dot: '#facc15' };

  const psStyle = (s: string) =>
    s === 'Paid'
      ? { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)', dot: '#34d399' }
      : s === 'Failed'
      ? { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', dot: '#f87171' }
      : { bg: 'rgba(234,179,8,0.12)', text: '#facc15', border: 'rgba(234,179,8,0.3)', dot: '#facc15' };

  return (
    <div className="flex flex-col gap-4">
      {message && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {message}</div>}
      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {error}</div>}

      {/* Search & Filter Bar */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl p-4 flex gap-3 flex-wrap items-center shadow-md">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by name, reference, or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2.5 rounded-xl bg-[#0e1e33] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#d9b571]/60 transition-colors"
          />
        </div>
        <div className="relative min-w-[160px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1e33] border border-white/10 text-white text-sm focus:outline-none focus:border-[#d9b571]/60 transition-colors appearance-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <span className="text-xs text-slate-400 ml-auto shrink-0">{filteredBookings.length} of {bookings.length} bookings</span>
      </div>

      {/* Bookings Table */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px] text-sm">
            <thead>
              <tr className="bg-[#0e1e33] text-left text-xs font-semibold text-[#b7c0cb] uppercase tracking-wider">
                {['Reference', 'Guest', 'Phone', 'Room', 'Check-in', 'Check-out', 'Status', 'Payment', 'Amount', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3.5 border-b border-white/10 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => {
                  const bs = bsStyle(b.booking_status);
                  const ps = psStyle(b.payment_status);
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-white whitespace-nowrap">{b.booking_reference}</td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium whitespace-nowrap">{b.guest_name}</td>
                      <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{b.guest_phone}</td>
                      <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                        {getRoom(b) ? `Room ${getRoom(b)?.room_number} (${ROOM_DISPLAY_NAMES[getRoom(b)?.room_type || ''] || getRoom(b)?.room_type})` : 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{b.check_in_date}</td>
                      <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{b.check_out_date}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border" style={{ background: bs.bg, color: bs.text, borderColor: bs.border }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bs.dot }} />{b.booking_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border" style={{ background: ps.bg, color: ps.text, borderColor: ps.border }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ps.dot }} />{b.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium whitespace-nowrap">PKR {Number(b.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setSelectedBooking(b)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/15 text-slate-200 hover:border-[#d9b571]/50 hover:text-white transition-colors">Details</button>
                          {b.payment_status !== 'Paid' && b.booking_status !== 'Cancelled' && (
                            <button type="button" onClick={() => handleAction(b.id, 'verify')} disabled={actionLoading === b.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">Verify</button>
                          )}
                          {b.booking_status !== 'Cancelled' && b.booking_status !== 'Completed' && (
                            <button type="button" onClick={() => handleAction(b.id, 'cancel')} disabled={actionLoading === b.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-colors disabled:opacity-50">Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-sm">No bookings match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[2000] p-5" onClick={(e) => { if (e.target === e.currentTarget) setSelectedBooking(null); }}>
          <div className="bg-[#16283f] border border-white/15 rounded-2xl max-w-[680px] w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="font-heading font-bold text-lg text-white">Booking Details</h2>
                <p className="text-xs text-[#d9b571] font-mono mt-0.5">{selectedBooking.booking_reference}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-lg font-bold">×</button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0e1e33] rounded-xl p-4 border border-white/5 flex flex-col gap-2">
                  <p className="text-[10px] text-[#d9b571] font-bold uppercase tracking-widest mb-1">Guest Info</p>
                  <InfoRow label="Name" value={selectedBooking.guest_name} />
                  <InfoRow label="Email" value={selectedBooking.guest_email} />
                  <InfoRow label="Phone" value={selectedBooking.guest_phone} />
                  <InfoRow label="CNIC" value={selectedBooking.guest_cnic || '—'} />
                  <InfoRow label="Address" value={selectedBooking.guest_address || '—'} />
                </div>
                <div className="bg-[#0e1e33] rounded-xl p-4 border border-white/5 flex flex-col gap-2">
                  <p className="text-[10px] text-[#d9b571] font-bold uppercase tracking-widest mb-1">Booking Info</p>
                  <InfoRow label="Room" value={getRoom(selectedBooking) ? `Room ${getRoom(selectedBooking)?.room_number} (${ROOM_DISPLAY_NAMES[getRoom(selectedBooking)?.room_type || ''] || getRoom(selectedBooking)?.room_type})` : 'N/A'} />
                  <InfoRow label="Check-in" value={selectedBooking.check_in_date} />
                  <InfoRow label="Check-out" value={selectedBooking.check_out_date} />
                  <InfoRow label="Guests" value={String(selectedBooking.guests_count)} />
                  <InfoRow label="Amount" value={`PKR ${Number(selectedBooking.total_amount).toLocaleString()}`} />
                </div>
              </div>
              <div className="bg-[#0e1e33] rounded-xl p-4 border border-white/5 flex flex-col gap-2.5">
                <p className="text-[10px] text-[#d9b571] font-bold uppercase tracking-widest mb-1">Payment & Status</p>
                <InfoRow label="Method" value={selectedBooking.payment_method} />
                <InfoRow label="Created" value={new Date(selectedBooking.created_at).toLocaleString()} />
                {selectedBooking.special_requests && <InfoRow label="Requests" value={selectedBooking.special_requests} />}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {(() => { const bs = bsStyle(selectedBooking.booking_status); return <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Booking:</span><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border" style={{ background: bs.bg, color: bs.text, borderColor: bs.border }}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bs.dot }} />{selectedBooking.booking_status}</span></div>; })()}
                  {(() => { const ps = psStyle(selectedBooking.payment_status); return <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Payment:</span><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border" style={{ background: ps.bg, color: ps.text, borderColor: ps.border }}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ps.dot }} />{selectedBooking.payment_status}</span></div>; })()}
                </div>
              </div>
              {selectedBooking.payment_proof && (
                <div className="bg-[#0e1e33] rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-[#d9b571] font-bold uppercase tracking-widest mb-3">Payment Proof</p>
                  <img src={selectedBooking.payment_proof} alt="Payment Proof" className="max-w-full max-h-[240px] object-contain border border-white/10 rounded-xl" />
                </div>
              )}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                {selectedBooking.payment_status !== 'Paid' && selectedBooking.booking_status !== 'Cancelled' && (
                  <button type="button" onClick={() => handleAction(selectedBooking.id, 'verify')} disabled={actionLoading === selectedBooking.id} className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">Verify Payment</button>
                )}
                {selectedBooking.booking_status !== 'Cancelled' && selectedBooking.booking_status !== 'Completed' && (
                  <button type="button" onClick={() => handleAction(selectedBooking.id, 'cancel')} disabled={actionLoading === selectedBooking.id} className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-colors disabled:opacity-50">Cancel Booking</button>
                )}
                <button type="button" onClick={() => setSelectedBooking(null)} className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-slate-400 shrink-0 w-20">{label}:</span>
      <span className="text-xs text-slate-200 break-all">{value}</span>
    </div>
  );
}
