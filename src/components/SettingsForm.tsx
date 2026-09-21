'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SettingsFormProps {
  initialSettings: Record<string, string>;
}

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-[#0a1626] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#d9b571]/60 transition-colors';
const labelClass = 'block text-xs font-semibold text-[#b7c0cb] mb-1.5 uppercase tracking-wider';

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
      <div className="bg-[#16283f] border border-white/10 rounded-2xl p-6 shadow-md">
        <div className="mb-5 pb-4 border-b border-white/10">
          <h2 className="text-lg font-heading font-bold text-white">Guesthouse Configuration</h2>
          <p className="text-xs text-[#b7c0cb] mt-0.5">Update your guesthouse details and payment contact numbers.</p>
        </div>
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label>
              <span className={labelClass}>Guesthouse Name *</span>
              <input className={inputClass} value={guesthouseName} onChange={(e) => setGuesthouseName(e.target.value)} required />
            </label>
            <label>
              <span className={labelClass}>Phone *</span>
              <input className={inputClass} value={guesthousePhone} onChange={(e) => setGuesthousePhone(e.target.value)} required />
            </label>
            <label>
              <span className={labelClass}>Email *</span>
              <input type="email" className={inputClass} value={guesthouseEmail} onChange={(e) => setGuesthouseEmail(e.target.value)} required />
            </label>
          </div>

          <label>
            <span className={labelClass}>Address</span>
            <textarea className={`${inputClass} resize-none`} value={guesthouseAddress} onChange={(e) => setGuesthouseAddress(e.target.value)} rows={3} required />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label>
              <span className={labelClass}>JazzCash Number</span>
              <input className={inputClass} value={jazzcashNumber} onChange={(e) => setJazzcashNumber(e.target.value)} placeholder="03XX-XXXXXXX" />
            </label>
            <label>
              <span className={labelClass}>Easypaisa Number</span>
              <input className={inputClass} value={easypaisaNumber} onChange={(e) => setEasypaisaNumber(e.target.value)} placeholder="03XX-XXXXXXX" />
            </label>
          </div>

          {settingsError && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {settingsError}</div>}
          {settingsMessage && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {settingsMessage}</div>}

          <div>
            <button type="submit" disabled={savingSettings} className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#d9b571] text-[#0a1626] hover:bg-[#ead9ac] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Admin Password Change Card */}
      <div className="bg-[#16283f] border border-white/10 rounded-2xl p-6 shadow-md">
        <div className="mb-5 pb-4 border-b border-white/10">
          <h2 className="text-lg font-heading font-bold text-white">Change Admin Password</h2>
          <p className="text-xs text-[#b7c0cb] mt-0.5">Update your admin account password.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 max-w-[480px]">
          <label>
            <span className={labelClass}>New Password *</span>
            <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required />
          </label>
          <label>
            <span className={labelClass}>Confirm Password *</span>
            <input type="password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required />
          </label>

          {passwordError && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {passwordError}</div>}
          {passwordMessage && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {passwordMessage}</div>}

          <div>
            <button type="submit" disabled={updatingPassword} className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#d9b571] text-[#0a1626] hover:bg-[#ead9ac] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
              {updatingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
