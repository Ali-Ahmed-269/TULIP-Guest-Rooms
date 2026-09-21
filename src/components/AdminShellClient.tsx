'use client';

import { usePathname } from 'next/navigation';
import AdminNav from '@/components/AdminNav';

export default function AdminShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <div className="admin-container">{children}</div>;
  }

  return (
    <>
      <AdminNav />
      <div className="admin-container">
        <main className="w-full pb-12">
          {children}
        </main>
      </div>
    </>
  );
}
