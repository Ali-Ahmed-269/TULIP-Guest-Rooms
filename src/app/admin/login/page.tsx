'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import PageHeader from '@/components/PageHeader';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
  };

  return (
    <section className="section-padding relative min-h-screen">
      {/* Top Right Corner Home Button with generous internal padding */}
      <div className="fixed top-5 right-5 sm:top-8 sm:right-8 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-xl bg-[#0b1c30]/95 backdrop-blur-md border border-[#1b3859] hover:border-[#d9b571] text-xs sm:text-sm font-bold text-slate-200 hover:text-white shadow-xl transition-all duration-200 group hover:shadow-[0_0_18px_rgba(217,181,113,0.3)]"
          style={{ padding: '12px 24px' }}
        >
          <Home size={18} className="text-[#d9b571] group-hover:scale-110 transition-transform" />
          <span className="tracking-wide">Home</span>
        </Link>
      </div>

      <div className="page-shell" style={{ minHeight: 'calc(100vh - 120px)', display: 'grid', placeItems: 'center' }}>
        <div className="panel relative" style={{ maxWidth: '520px', width: '100%', padding: '32px' }}>
          <PageHeader
            eyebrow="Admin"
            title="Admin Login"
            description="Enter your admin credentials to manage bookings, rooms, and reviews."
          />

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="form-group">
              <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">Email</span>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="admin@example.com"
              />
            </label>
            <label className="form-group">
              <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">Password</span>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
              />
            </label>
            {error ? <div className="error-msg">{error}</div> : null}
            <button type="submit" className="btn btn-primary mt-2" disabled={loading} style={{ padding: '12px 24px', fontWeight: 600 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
