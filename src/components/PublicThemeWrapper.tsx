'use client';

import { usePathname } from 'next/navigation';
import IntroLoader from './IntroLoader';

export default function PublicThemeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="public-theme min-h-screen flex flex-col">
      <IntroLoader />
      {children}
    </div>
  );
}
