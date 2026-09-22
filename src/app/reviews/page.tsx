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
      <div className="container" style={{ maxWidth: '1100px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-7">
            <PageHeader
              eyebrow="Community"
              title="Guest Reviews"
              description="Read recent approved guest reviews and add your own after your stay."
            />
            <div className="grid gap-4 mt-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <article key={`${review.guest_name}-${review.created_at}`} className="panel">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                      <strong className="text-[#1f4d3e] font-semibold">{review.guest_name}</strong>
                      <span className="text-[#1f4d3e] text-sm">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p className="text-[#374151] text-sm leading-relaxed mb-3">{review.review_text}</p>
                    <small className="text-[#6b7280] text-xs">{new Date(review.created_at).toLocaleDateString()}</small>
                  </article>
                ))
              ) : (
                <p className="text-muted">No reviews available yet. Be the first to share your experience.</p>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5 panel h-fit">
            <h2 className="text-xl font-bold text-[#1f4d3e] mb-4">Submit a Review</h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="form-field">
                <label htmlFor="rev-booking-id">Booking ID</label>
                <input
                  id="rev-booking-id"
                  value={bookingId}
                  onChange={(event) => setBookingId(event.target.value)}
                  className="form-control"
                  placeholder="TGR-2026-0001-X7K"
                />
              </div>
              <div className="form-field">
                <label htmlFor="rev-phone">Phone</label>
                <input
                  id="rev-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="form-control"
                  placeholder="03XX-XXXXXXX"
                />
              </div>
              <div className="form-field">
                <label htmlFor="rev-name">Your Name</label>
                <input
                  id="rev-name"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className="form-control"
                  placeholder="Guest name"
                />
              </div>
              <div className="form-field">
                <label htmlFor="rev-rating">Rating</label>
                <select
                  id="rev-rating"
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="form-control"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} stars</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="rev-text">Review</label>
                <textarea
                  id="rev-text"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  className="form-control"
                  rows={4}
                  placeholder="Tell us what you enjoyed about your stay."
                />
              </div>
              {errorMessage ? <div className="error-msg">{errorMessage}</div> : null}
              {submitMessage ? <div className="inline-message">{submitMessage}</div> : null}
              <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}

