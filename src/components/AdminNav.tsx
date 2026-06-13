'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AdminNav() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <header className="admin-header">
      <div className="container flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/dashboard" className="logo text-primary text-2xl">
            Admin Dashboard
          </Link>
          <p className="mt-1.5 text-muted text-[0.95rem]">
            Manage rooms, bookings, payments, reviews and settings.
          </p>
        </div>

        <nav className="flex flex-wrap gap-3.5 items-center">
          {[
            { href: '/admin/dashboard', label: 'Home' },
            { href: '/admin/bookings', label: 'Bookings' },
            { href: '/admin/rooms', label: 'Rooms' },
            { href: '/admin/payments', label: 'Payments' },
            { href: '/admin/reviews', label: 'Reviews' },
            { href: '/admin/guests', label: 'Guests' },
            { href: '/admin/walkin', label: 'Walk-in' },
            { href: '/admin/settings', label: 'Settings' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="btn btn-outline min-w-[120px]">
              {item.label}
            </Link>
          ))}
          <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}
