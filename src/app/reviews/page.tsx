'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';

interface ReviewRecord {
  guest_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [phone, setPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {
        setReviews([]);
      });
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitMessage(null);

    if (!bookingId || !phone || !guestName || !reviewText) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, phone, guest_name: guestName, rating, review_text: reviewText }),
      });
      const data = await response.json();
      if (!data.success) {
        setErrorMessage(data.message || 'Submission failed.');
      } else {
        setSubmitMessage(data.message || 'Review submitted successfully.');
        setBookingId('');
        setPhone('');
        setGuestName('');
        setRating(5);
        setReviewText('');
      }
    } catch {
      setErrorMessage('Unable to submit review. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-padding">
      <div className="page-shell" style={{ maxWidth: '1100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px' }}>
          <div>
            <PageHeader
              eyebrow="Community"
              title="Guest Reviews"
              description="Read recent approved guest reviews and add your own after your stay."
            />
            <div style={{ display: 'grid', gap: '18px' }}>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <article key={`${review.guest_name}-${review.created_at}`} className="panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                      <strong>{review.guest_name}</strong>
                      <span style={{ color: 'var(--primary)' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    <p style={{ marginBottom: '10px' }}>{review.review_text}</p>
                    <small style={{ color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</small>
                  </article>
                ))
              ) : (
                <p className="text-muted">No reviews available yet. Be the first to share your experience.</p>
              )}
            </div>
          </div>

          <aside className="panel" style={{ height: 'fit-content' }}>
            <h2 style={{ marginBottom: '16px' }}>Submit a Review</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <label className="form-group">
                <span>Booking ID</span>
                <input value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="form-control" placeholder="TGR-2026-0001" />
              </label>
              <label className="form-group">
                <span>Phone</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="form-control" placeholder="03XX-XXXXXXX" />
              </label>
              <label className="form-group">
                <span>Your Name</span>
                <input value={guestName} onChange={(event) => setGuestName(event.target.value)} className="form-control" placeholder="Guest name" />
              </label>
              <label className="form-group">
                <span>Rating</span>
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="form-control">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} stars</option>
                  ))}
                </select>
              </label>
              <label className="form-group">
                <span>Review</span>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} className="form-control" rows={5} placeholder="Tell us what you enjoyed about your stay." />
              </label>
              {errorMessage ? <div className="error-msg">{errorMessage}</div> : null}
              {submitMessage ? <div className="inline-message">{submitMessage}</div> : null}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}
