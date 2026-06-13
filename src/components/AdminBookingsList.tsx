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
    if (!confirm(`Are you sure you want to ${action === 'verify' ? 'verify the payment for' : 'cancel'} this booking?`)) {
      return;
    }

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
        // Update local state
        setBookings((prev) =>
          prev.map((b) => {
            if (b.id === bookingId) {
              if (action === 'verify') {
                return { ...b, payment_status: 'Paid', booking_status: 'Confirmed' };
              } else {
                return { ...b, booking_status: 'Cancelled' };
              }
            }
            return b;
          })
        );
        // If the updated booking is currently open in details modal, update it there too
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) => {
            if (!prev) return null;
            if (action === 'verify') {
              return { ...prev, payment_status: 'Paid', booking_status: 'Confirmed' };
            } else {
              return { ...prev, booking_status: 'Cancelled' };
            }
          });
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtering Logic
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.guest_phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'All' || b.booking_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRoom = (booking: Booking) => {
    if (Array.isArray(booking.rooms)) {
      return booking.rooms[0] || null;
    }
    return booking.rooms;
  };

  return (
    <div className="grid gap-4">
      {/* Messages */}
      {message && <div className="p-3.5 rounded-[12px] bg-[#e9f7ef] text-[#175d30] font-semibold">{message}</div>}
      {error && <div className="error-msg p-3.5 rounded-[12px] bg-[#fdf2f2] text-[#9b1c1c] font-semibold">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="card p-[18px] bg-surface flex gap-4 flex-wrap items-center justify-between">
        <div className="form-group mb-0 flex-1 min-w-[260px]">
          <input
            className="form-control"
            placeholder="Search by Guest Name, Reference, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="form-group mb-0 min-w-[180px]">
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-background text-left">
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Reference</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Guest</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Phone</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Room</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Check-in</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Check-out</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Status</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Payment</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Amount</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="bg-surface">
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-bold">{b.booking_reference}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.guest_name}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.guest_phone}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      {getRoom(b) ? `Room ${getRoom(b)?.room_number} (${getRoom(b)?.room_type})` : 'N/A'}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.check_in_date}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.check_out_date}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <span className={`badge ${
                        b.booking_status === 'Confirmed' ? 'badge-green' :
                        b.booking_status === 'Cancelled' ? 'badge-red' : 'badge-yellow'
                      }`}>
                        {b.booking_status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <span className={`badge ${
                        b.payment_status === 'Paid' ? 'badge-green' :
                        b.payment_status === 'Failed' ? 'badge-red' : 'badge-yellow'
                      }`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">PKR {b.total_amount}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          className="btn btn-outline px-3 py-1.5 min-h-[32px] text-[0.85rem]"
                          onClick={() => setSelectedBooking(b)}
                        >
                          Details
                        </button>
                        
                        {b.payment_status !== 'Paid' && b.booking_status !== 'Cancelled' && (
                          <button
                            type="button"
                            className="btn btn-primary px-3 py-1.5 min-h-[32px] text-[0.85rem] !bg-sage"
                            onClick={() => handleAction(b.id, 'verify')}
                            disabled={actionLoading === b.id}
                          >
                            Verify
                          </button>
                        )}

                        {b.booking_status !== 'Cancelled' && b.booking_status !== 'Completed' && (
                          <button
                            type="button"
                            className="btn btn-primary px-3 py-1.5 min-h-[32px] text-[0.85rem]"
                            onClick={() => handleAction(b.id, 'cancel')}
                            disabled={actionLoading === b.id}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-muted">
                    No bookings match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal overlay */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[2000] p-5">
          <div className="card bg-surface max-w-[680px] w-full max-h-[90vh] overflow-y-auto p-[30px] relative">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-5 right-5 border-none bg-transparent text-[1.5rem] cursor-pointer text-muted"
            >
              &times;
            </button>
            
            <h2 className="mb-4 border-b border-[rgba(0,0,0,0.05)] pb-2.5 text-[1.5rem]">
              Booking Details: {selectedBooking.booking_reference}
            </h2>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-6">
              <div>
                <p className="my-1"><strong>Guest Name:</strong> {selectedBooking.guest_name}</p>
                <p className="my-1"><strong>Email:</strong> {selectedBooking.guest_email}</p>
                <p className="my-1"><strong>Phone:</strong> {selectedBooking.guest_phone}</p>
                <p className="my-1"><strong>CNIC:</strong> {selectedBooking.guest_cnic}</p>
                <p className="my-1"><strong>Address:</strong> {selectedBooking.guest_address}</p>
              </div>
              <div>
                <p className="my-1"><strong>Room:</strong> {getRoom(selectedBooking) ? `Room ${getRoom(selectedBooking)?.room_number} (${getRoom(selectedBooking)?.room_type})` : 'N/A'}</p>
                <p className="my-1"><strong>Check-in:</strong> {selectedBooking.check_in_date}</p>
                <p className="my-1"><strong>Check-out:</strong> {selectedBooking.check_out_date}</p>
                <p className="my-1"><strong>Guests:</strong> {selectedBooking.guests_count}</p>
                <p className="my-1"><strong>Amount:</strong> PKR {selectedBooking.total_amount}</p>
              </div>
            </div>

            <div className="border-t border-[rgba(0,0,0,0.05)] pt-4 mb-6">
              <p className="my-1"><strong>Payment Method:</strong> {selectedBooking.payment_method}</p>
              <p className="my-1"><strong>Payment Status:</strong> {selectedBooking.payment_status}</p>
              <p className="my-1"><strong>Booking Status:</strong> {selectedBooking.booking_status}</p>
              <p className="my-1"><strong>Special Requests:</strong> {selectedBooking.special_requests || 'None'}</p>
              <p className="my-1"><strong>Created At:</strong> {new Date(selectedBooking.created_at).toLocaleString()}</p>
            </div>

            {selectedBooking.payment_proof && (
              <div className="border-t border-[rgba(0,0,0,0.05)] pt-4 mb-6">
                <p className="mb-2.5"><strong>Payment Proof Screenshot:</strong></p>
                <img
                  src={selectedBooking.payment_proof}
                  alt="Payment Proof"
                  className="max-w-full max-h-[260px] object-contain border border-[rgba(0,0,0,0.1)] rounded-lg"
                />
              </div>
            )}

            <div className="flex gap-2.5 justify-end">
              {selectedBooking.payment_status !== 'Paid' && selectedBooking.booking_status !== 'Cancelled' && (
                <button
                  type="button"
                  className="btn btn-primary !bg-sage"
                  onClick={() => handleAction(selectedBooking.id, 'verify')}
                  disabled={actionLoading === selectedBooking.id}
                >
                  Verify Payment
                </button>
              )}
              {selectedBooking.booking_status !== 'Cancelled' && selectedBooking.booking_status !== 'Completed' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAction(selectedBooking.id, 'cancel')}
                  disabled={actionLoading === selectedBooking.id}
                >
                  Cancel Booking
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary border border-[#ccc] text-[#666]"
                onClick={() => setSelectedBooking(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
