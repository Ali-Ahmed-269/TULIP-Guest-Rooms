import Link from 'next/link';
import DownloadInvoiceButton from '@/components/DownloadInvoiceButton';

interface ConfirmationPageProps {
  searchParams: Promise<{ booking_id?: string; email?: string; phone?: string }>;
}

export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const resolvedParams = await searchParams;
  const bookingId = resolvedParams.booking_id;
  const email = resolvedParams.email;
  const phone = resolvedParams.phone;

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
              <DownloadInvoiceButton
                bookingId={bookingId}
                email={email}
                phone={phone}
              />
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
