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
    const confirmMessage =
      action === 'verify'
        ? 'Are you sure you want to verify this payment? The booking will be confirmed.'
        : 'Are you sure you want to reject this payment? The booking will be cancelled.';

    if (!confirm(confirmMessage)) return;

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
        setPayments((prev) => prev.filter((p) => p.id !== bookingId));
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {message && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {message}</div>}
      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {error}</div>}

      <div className="bg-[#16283f] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px] text-sm">
            <thead>
              <tr className="bg-[#0e1e33] text-left text-xs font-semibold text-[#b7c0cb] uppercase tracking-wider">
                {['Reference', 'Guest', 'Phone', 'Room', 'Check-in', 'Amount', 'Method', 'Screenshot', 'Actions'].map((h) => (
                  <th key={h} className="border-b border-white/10 whitespace-nowrap" style={{ padding: '18px 22px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.length > 0 ? (
                payments.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="font-mono text-xs font-semibold text-white whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{b.booking_reference}</td>
                    <td className="text-slate-200 font-medium whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{b.guest_name}</td>
                    <td className="text-slate-300 whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{b.guest_phone}</td>
                    <td className="text-slate-300 whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{b.rooms ? `Room ${b.rooms.room_number}` : 'N/A'}</td>
                    <td className="text-slate-300 whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{b.check_in_date}</td>
                    <td className="text-slate-200 font-medium whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>PKR {Number(b.total_amount).toLocaleString()}</td>
                    <td className="whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>
                      <span className="text-xs font-semibold text-[#d9b571] uppercase">{b.payment_method}</span>
                    </td>
                    <td className="align-middle" style={{ padding: '18px 22px' }}>
                      {b.payment_proof ? (
                        <img
                          src={b.payment_proof}
                          alt="Screenshot"
                          className="w-12 h-12 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-[#d9b571]/50 transition-colors"
                          onClick={() => setSelectedProof(b.payment_proof)}
                          title="Click to view full image"
                        />
                      ) : (
                        <span className="text-slate-500 text-xs">None</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleAction(b.id, 'verify')}
                          disabled={actionLoading === b.id}
                          className="rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all shadow-sm disabled:opacity-50"
                          style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '7px', paddingBottom: '7px' }}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(b.id, 'reject')}
                          disabled={actionLoading === b.id}
                          className="rounded-xl text-xs font-semibold bg-rose-500/15 border border-rose-500/35 text-rose-300 hover:bg-rose-500/25 transition-all shadow-sm disabled:opacity-50"
                          style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '7px', paddingBottom: '7px' }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
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
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[3000] p-5"
          onClick={() => setSelectedProof(null)}
        >
          <div className="relative max-w-[90%] max-h-[90%]">
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute -top-10 right-0 text-white text-3xl font-bold hover:text-slate-300 transition-colors"
            >
              ×
            </button>
            <img
              src={selectedProof}
              alt="Payment Proof Full View"
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
