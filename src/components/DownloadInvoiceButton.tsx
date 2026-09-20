'use client';

import { useState } from 'react';

interface DownloadInvoiceButtonProps {
  bookingId: string;
  email?: string;
  phone?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function DownloadInvoiceButton({
  bookingId,
  email,
  phone,
  className = 'btn btn-primary',
  style,
}: DownloadInvoiceButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!bookingId) return;
    setDownloading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (email) headers['x-guest-email'] = email;
      if (phone) headers['x-guest-phone'] = phone;

      const response = await fetch('/api/bookings/invoice', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          booking_id: bookingId,
          email,
          phone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to download invoice.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `INV-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('An error occurred while downloading the invoice.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? 'Downloading...' : 'Download Invoice PDF'}
    </button>
  );
}
