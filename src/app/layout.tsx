import type { Metadata } from 'next';
import { Playfair_Display, Inter, Manrope } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import PublicThemeWrapper from '@/components/PublicThemeWrapper';
import { INTRO_BOOT_SCRIPT } from '@/utils/intro';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${manrope.variable}`}
      suppressHydrationWarning /* data-intro is set by the boot script before hydration */
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body>
        <PublicThemeWrapper>
          <Navbar />
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </PublicThemeWrapper>
      </body>
    </html>
  );
}
