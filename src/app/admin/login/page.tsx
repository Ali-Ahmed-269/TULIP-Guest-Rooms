'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

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
    <div className="login-page">
      {/* Top Right Corner Home Button */}
      <div className="fixed top-5 right-5 sm:top-8 sm:right-8 z-50">
        <Link
          href="/"
          className="login-home-btn inline-flex items-center gap-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xl transition-all duration-200 group"
          style={{ padding: '12px 24px' }}
        >
          <Home size={18} className="login-home-icon group-hover:scale-110 transition-transform" />
          <span className="tracking-wide">Home</span>
        </Link>
      </div>

      <div className="login-center">
        <div className="login-card">

          {/* Header */}
          <div className="login-header">
            <div className="login-eyebrow">
              <span className="login-eyebrow-line" />
              <span>Admin</span>
            </div>
            <h1 className="login-title">Admin Login</h1>
            <p className="login-description">
              Enter your admin credentials to manage bookings, rooms, and reviews.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span className="login-label">Email</span>
              <input
                type="email"
                className="login-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="admin@example.com"
              />
            </label>

            <label className="login-field">
              <span className="login-label">Password</span>
              <input
                type="password"
                className="login-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
              />
            </label>

            {error ? (
              <div className="login-error" role="alert">{error}</div>
            ) : null}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
