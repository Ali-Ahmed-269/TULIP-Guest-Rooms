'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SettingsFormProps {
  initialSettings: Record<string, string>;
}

const inputClass =
  'w-full rounded-xl bg-[#0a1626] border border-white/15 text-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#d9b571] transition-colors shadow-inner';
const inputStyle = { paddingLeft: '18px', paddingRight: '18px', paddingTop: '13px', paddingBottom: '13px' };
const labelClass = 'block text-xs font-bold text-[#b7c0cb] mb-2 uppercase tracking-widest';

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [guesthouseName, setGuesthouseName] = useState(initialSettings['guesthouse_name'] || '');
  const [guesthouseAddress, setGuesthouseAddress] = useState(initialSettings['guesthouse_address'] || '');
  const [guesthousePhone, setGuesthousePhone] = useState(initialSettings['guesthouse_phone'] || '');
  const [guesthouseEmail, setGuesthouseEmail] = useState(initialSettings['guesthouse_email'] || '');
  const [jazzcashNumber, setJazzcashNumber] = useState(initialSettings['jazzcash_number'] || '');
  const [easypaisaNumber, setEasypaisaNumber] = useState(initialSettings['easypaisa_number'] || '');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    setSettingsError(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guesthouse_name: guesthouseName,
          guesthouse_address: guesthouseAddress,
          guesthouse_phone: guesthousePhone,
          guesthouse_email: guesthouseEmail,
          jazzcash_number: jazzcashNumber,
          easypaisa_number: easypaisaNumber,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setSettingsError(result.message || 'Failed to update settings.');
      } else {
        setSettingsMessage(result.message || 'Settings saved successfully.');
      }
    } catch {
      setSettingsError('An error occurred while saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!newPassword) { setPasswordError('Password cannot be empty.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }

    setUpdatingPassword(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordMessage('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError('An unexpected error occurred while updating the password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Site Settings Card */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl shadow-lg" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', paddingBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-xl font-heading font-bold text-white">Guesthouse Configuration</h2>
          <p className="text-sm text-[#b7c0cb] mt-1.5">Update your guesthouse details and payment contact numbers.</p>
        </div>
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <label>
              <span className={labelClass}>Guesthouse Name *</span>
              <input className={inputClass} style={inputStyle} value={guesthouseName} onChange={(e) => setGuesthouseName(e.target.value)} required />
            </label>
            <label>
              <span className={labelClass}>Phone *</span>
              <input className={inputClass} style={inputStyle} value={guesthousePhone} onChange={(e) => setGuesthousePhone(e.target.value)} required />
            </label>
            <label>
              <span className={labelClass}>Email *</span>
              <input type="email" className={inputClass} style={inputStyle} value={guesthouseEmail} onChange={(e) => setGuesthouseEmail(e.target.value)} required />
            </label>
          </div>

          <label>
            <span className={labelClass}>Address</span>
            <textarea className={`${inputClass} resize-none`} style={inputStyle} value={guesthouseAddress} onChange={(e) => setGuesthouseAddress(e.target.value)} rows={3} required />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label>
              <span className={labelClass}>JazzCash Number</span>
              <input className={inputClass} style={inputStyle} value={jazzcashNumber} onChange={(e) => setJazzcashNumber(e.target.value)} placeholder="03XX-XXXXXXX" />
            </label>
            <label>
              <span className={labelClass}>Easypaisa Number</span>
              <input className={inputClass} style={inputStyle} value={easypaisaNumber} onChange={(e) => setEasypaisaNumber(e.target.value)} placeholder="03XX-XXXXXXX" />
            </label>
          </div>

          {settingsError && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {settingsError}</div>}
          {settingsMessage && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {settingsMessage}</div>}

          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={savingSettings}
              className="rounded-xl font-bold text-sm bg-[#d9b571] text-[#0a1626] hover:bg-[#ead9ac] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ paddingLeft: '28px', paddingRight: '28px', paddingTop: '13px', paddingBottom: '13px' }}
            >
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Admin Password Change Card */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl shadow-lg" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', paddingBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-xl font-heading font-bold text-white">Change Admin Password</h2>
          <p className="text-sm text-[#b7c0cb] mt-1.5">Update your admin account password.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5 max-w-[480px]">
          <label>
            <span className={labelClass}>New Password *</span>
            <input type="password" className={inputClass} style={inputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required />
          </label>
          <label>
            <span className={labelClass}>Confirm Password *</span>
            <input type="password" className={inputClass} style={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required />
          </label>

          {passwordError && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {passwordError}</div>}
          {passwordMessage && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {passwordMessage}</div>}

          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={updatingPassword}
              className="rounded-xl font-bold text-sm bg-[#d9b571] text-[#0a1626] hover:bg-[#ead9ac] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ paddingLeft: '28px', paddingRight: '28px', paddingTop: '13px', paddingBottom: '13px' }}
            >
              {updatingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
