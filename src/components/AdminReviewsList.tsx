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
        setMessage(result.message || `Review status updated successfully.`);
        // Update local state
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r))
        );
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    return statusFilter === 'All' || r.status === statusFilter;
  });

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="grid gap-4">
      {/* Messages */}
      {message && <div className="p-3.5 rounded-[12px] bg-[#e9f7ef] text-[#175d30] font-semibold">{message}</div>}
      {error && <div className="error-msg p-3.5 rounded-[12px] bg-[#fdf2f2] text-[#9b1c1c] font-semibold">{error}</div>}

      {/* Filter Options */}
      <div className="card p-[18px] bg-surface flex gap-4 flex-wrap items-center justify-between">
        <h3 className="m-0 text-[1.1rem]">Filter Reviews by Status</h3>
        <div className="form-group mb-0 min-w-[180px]">
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-background text-left">
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Booking Ref</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Guest</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Rating</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Review Message</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Status</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold">Date</th>
                <th className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length > 0 ? (
                filteredReviews.map((r) => (
                  <tr key={r.id} className="bg-surface">
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-bold">
                      {r.bookings?.booking_reference || 'N/A'}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">{r.guest_name}</td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] text-gold tracking-widest text-[1.1rem]">
                      {renderStars(r.rating)}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] max-w-[300px] whitespace-normal break-all">
                      {r.review_text}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <span className={`badge ${
                        r.status === 'Approved' ? 'badge-green' :
                        r.status === 'Rejected' ? 'badge-red' : 'badge-yellow'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <div className="flex gap-2 justify-center">
                        {r.status !== 'Approved' && (
                          <button
                            type="button"
                            className="btn btn-primary px-3 py-1.5 min-h-[32px] text-[0.85rem] !bg-sage"
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={actionLoading === r.id}
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== 'Rejected' && (
                          <button
                            type="button"
                            className="btn btn-primary px-3 py-1.5 min-h-[32px] text-[0.85rem]"
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={actionLoading === r.id}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No reviews found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
