import AdminShellClient from '@/components/AdminShellClient';

export const dynamic = 'force-dynamic';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a1626] text-white">
      <AdminShellClient>{children}</AdminShellClient>
    </div>
  );
}

