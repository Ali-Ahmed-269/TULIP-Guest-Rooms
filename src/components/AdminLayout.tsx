import AdminNav from '@/components/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell bg-[#faf7f4] min-h-screen">
      <AdminNav />
      <main className="pt-[100px] pb-10 w-full">
        <div className="page-shell">{children}</div>
      </main>
    </div>
  );
}
