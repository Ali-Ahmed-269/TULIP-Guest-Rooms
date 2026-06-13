import Link from 'next/link';

interface ConfirmationPageProps {
  searchParams: { booking_id?: string };
}

export default function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const bookingId = searchParams.booking_id;

  return (
    <section className="section-padding">
      <div className="container" style={{ maxWidth: '760px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '18px', fontSize: '2.5rem' }}>Booking Confirmed</h1>
        {bookingId ? (
          <>
            <p style={{ marginBottom: '20px', fontSize: '1.05rem', color: 'var(--text-muted)' }}>
              Thank you! Your reservation is recorded with reference <strong>{bookingId}</strong>.
            </p>
            <div style={{ display: 'grid', gap: '16px', justifyItems: 'center' }}>
              <a className="btn btn-primary" href={`/api/bookings/invoice?booking_id=${encodeURIComponent(bookingId)}`}>
                Download Invoice PDF
              </a>
              <Link href="/" className="btn btn-outline">
                Back to Home
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
              We could not locate a booking reference. Please check your link or visit the lookup page.
            </p>
            <Link href="/lookup" className="btn btn-primary">
              Find My Booking
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
