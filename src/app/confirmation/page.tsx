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
    <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 min-h-[75vh] flex flex-col justify-center">
      <div className="container" style={{ maxWidth: '760px', textAlign: 'center' }}>
        <h1 className="text-2xl sm:text-4xl font-heading font-bold text-white mb-4 leading-tight">
          Booking Confirmed
        </h1>
        {bookingId ? (
          <>
            <p className="text-slate-200 text-sm sm:text-base mb-6 max-w-lg mx-auto leading-relaxed">
              Thank you! Your reservation is recorded with reference <strong className="text-[#d9b571] font-bold block sm:inline mt-1 sm:mt-0">{bookingId}</strong>.
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
