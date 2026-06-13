'use client';

import { useState } from 'react';

interface Booking {
  id: number;
  booking_reference: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  payment_proof: string | null;
  rooms: {
    id: number;
    room_number: string;
    room_type: string;
  } | null;
}

interface AdminPaymentsListProps {
  initialPayments: Booking[];
}

export default function AdminPaymentsList({ initialPayments }: AdminPaymentsListProps) {
  const [payments, setPayments] = useState<Booking[]>(initialPayments);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (bookingId: number, action: 'verify' | 'reject') => {
    const confirmMessage = action === 'verify'
      ? 'Are you sure you want to verify this payment? The booking will be confirmed.'
      : 'Are you sure you want to reject this payment? The booking will be cancelled.';

    if (!confirm(confirmMessage)) {
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
        setMessage(result.message || 'Payment status updated successfully.');
        // Remove the booking from the pending list since its status is no longer 'Pending Verification'
        setPayments((prev) => prev.filter((p) => p.id !== bookingId));
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="grid gap-4">
      {/* Messages */}
      {message && <div className="p-3.5 rounded-[12px] bg-[#e9f7ef] text-[#175d30] font-semibold">{message}</div>}
      {error && <div className="error-msg p-3.5 rounded-[12px] bg-[#fdf2f2] text-[#9b1c1c] font-semibold">{error}</div>}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-background text-left">
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Reference</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Guest</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Phone</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Room</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Check-in</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Amount</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Method</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold text-center">Screenshot</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((b) => (
                  <tr key={b.id} className="bg-surface">
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-bold">{b.booking_reference}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.guest_name}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.guest_phone}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      {b.rooms ? `Room ${b.rooms.room_number}` : 'N/A'}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{b.check_in_date}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">PKR {b.total_amount}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <span className="uppercase text-[0.85rem] font-semibold">{b.payment_method}</span>
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] text-center">
                      {b.payment_proof ? (
                        <img
                          src={b.payment_proof}
                          alt="Screenshot"
                          className="w-[50px] h-[50px] object-cover rounded border border-[#ddd] cursor-pointer"
                          onClick={() => setSelectedProof(b.payment_proof)}
                          title="Click to view full image"
                        />
                      ) : (
                        <span className="text-muted text-[0.9rem]">None</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          className="btn btn-primary px-3 py-1.5 min-h-[32px] text-[0.85rem] !bg-sage"
                          onClick={() => handleAction(b.id, 'verify')}
                          disabled={actionLoading === b.id}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary px-3 py-1.5 min-h-[32px] text-[0.85rem]"
                          onClick={() => handleAction(b.id, 'reject')}
                          disabled={actionLoading === b.id}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted">
                    No bookings currently pending payment verification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Lightbox Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[3000] p-5" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-[90%] max-h-[90%]">
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute -top-10 right-0 border-none bg-transparent text-[2rem] cursor-pointer text-white"
            >
              &times;
            </button>
            <img
              src={selectedProof}
              alt="Payment Proof Full View"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
