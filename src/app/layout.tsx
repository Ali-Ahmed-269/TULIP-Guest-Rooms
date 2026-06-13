import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Tulip Guest Rooms',
  description: 'Book comfortable guest rooms with flexible payments and admin-managed reservations.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tulipguestrooms.vercel.app'),
  openGraph: {
    title: 'Tulip Guest Rooms',
    description: 'Book comfortable guest rooms with flexible payments and admin-managed reservations.',
    url: '/',
    siteName: 'Tulip Guest Rooms',
    type: 'website',
    images: ['/og-image.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tulip Guest Rooms',
    description: 'Book comfortable guest rooms with flexible payments and admin-managed reservations.',
    images: ['/og-image.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div className="min-h-screen flex flex-col pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
