'use client';

import { useState } from 'react';

interface Review {
  id: number;
  guest_name: string;
  rating: number;
  review_text: string;
  status: string;
  created_at: string;
  bookings: {
    booking_reference: string;
  } | null;
}

interface AdminReviewsListProps {
  initialReviews: Review[];
}

export default function AdminReviewsList({ initialReviews }: AdminReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (reviewId: number, action: 'approve' | 'reject') => {
    setActionLoading(reviewId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/reviews/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, action }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.message || `Failed to ${action} review.`);
      } else {
        setMessage(result.message || 'Review status updated successfully.');
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r))
        );
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReviews = reviews.filter((r) => statusFilter === 'All' || r.status === statusFilter);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#d9b571' : '#374151' }}>★</span>
    ));
  };

  const statusStyle = (status: string) =>
    status === 'Approved'
      ? { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)', dot: '#34d399' }
      : status === 'Rejected'
      ? { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', dot: '#f87171' }
      : { bg: 'rgba(234,179,8,0.12)', text: '#facc15', border: 'rgba(234,179,8,0.3)', dot: '#facc15' };

  return (
    <div className="flex flex-col gap-4">
      {message && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {message}</div>}
      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {error}</div>}

      {/* Filter Bar */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-md flex-wrap">
        <span className="text-sm font-medium text-slate-300">Filter by status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#0e1e33] border border-white/10 text-white text-sm focus:outline-none focus:border-[#d9b571]/60 transition-colors appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filteredReviews.length} reviews</span>
      </div>

      {/* Reviews Table */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[820px] text-sm">
            <thead>
              <tr className="bg-[#0e1e33] text-left text-xs font-semibold text-[#b7c0cb] uppercase tracking-wider">
                {['Booking Ref', 'Guest', 'Rating', 'Review', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3.5 border-b border-white/10 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((r) => {
                  const ss = statusStyle(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-white whitespace-nowrap">{r.bookings?.booking_reference || 'N/A'}</td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium whitespace-nowrap">{r.guest_name}</td>
                      <td className="px-4 py-3.5 text-base tracking-wider whitespace-nowrap">{renderStars(r.rating)}</td>
                      <td className="px-4 py-3.5 text-slate-300 max-w-[280px] whitespace-normal break-words">{r.review_text}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border" style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ss.dot }} />{r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {r.status !== 'Approved' && (
                            <button type="button" onClick={() => handleAction(r.id, 'approve')} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">Approve</button>
                          )}
                          {r.status !== 'Rejected' && (
                            <button type="button" onClick={() => handleAction(r.id, 'reject')} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-colors disabled:opacity-50">Reject</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">No reviews found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
