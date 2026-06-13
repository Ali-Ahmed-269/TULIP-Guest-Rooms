'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <section className="section-padding">
      <div className="page-shell" style={{ minHeight: 'calc(100vh - 100px)', display: 'grid', placeItems: 'center' }}>
        <div className="panel" style={{ maxWidth: '520px', width: '100%' }}>
          <PageHeader
            eyebrow="Admin"
            title="Admin Login"
            description="Enter your admin credentials to manage bookings, rooms, and reviews."
          />
          <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="form-group">
            <span>Email</span>
            <input type="email" className="form-control" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="form-group">
            <span>Password</span>
            <input type="password" className="form-control" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <div className="error-msg">{error}</div> : null}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          </form>
        </div>
      </div>
    </section>
  );
}
