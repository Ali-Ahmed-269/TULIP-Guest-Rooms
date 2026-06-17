'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';

interface BookingSummary {
  booking_reference: string;
  check_in_date: string;
  check_out_date: string;
  booking_status: string;
  payment_status: string;
  room_number: string;
  room_type: string;
}

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  'Standard':     'Standard Room',
  'Premium':      'Premium Room',
  'Comfort Plus': 'Comfort Plus',
};

export default function LookupPage() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBookings([]);

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Lookup failed.');
        return;
      }

      if (data.bookings?.length === 0) {
        setMessage('No bookings were found for this phone number.');
      } else {
        setBookings(data.bookings);
      }
    } catch {
      setError('Unable to reach lookup service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-padding">
      <div className="page-shell" style={{ maxWidth: '900px' }}>
        <PageHeader
          eyebrow="Booking"
          title="Find Your Booking"
          description="Enter the phone number used during reservation to view your booking details and invoice options."
        />

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', maxWidth: '480px' }}>
          <label className="form-group">
            <span>Phone Number</span>
            <input
              type="text"
              className="form-control"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="03XX-XXXXXXX"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Looking up...' : 'Search Booking'}
          </button>
        </form>

        {error ? <p className="error-msg">{error}</p> : null}
        {message ? <p className="text-muted" style={{ marginTop: '16px' }}>{message}</p> : null}

        {bookings.length > 0 ? (
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Bookings Found</h2>
            <div style={{ display: 'grid', gap: '18px' }}>
              {bookings.map((booking) => (
                <div key={booking.booking_reference} className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>Booking ID</p>
                      <p>{booking.booking_reference}</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700 }}>Room</p>
                      <p>{booking.room_number} - {ROOM_DISPLAY_NAMES[booking.room_type] || booking.room_type}</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700 }}>Status</p>
                      <p>{booking.booking_status} / {booking.payment_status}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>Check-in</p>
                      <p>{booking.check_in_date}</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700 }}>Check-out</p>
                      <p>{booking.check_out_date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
