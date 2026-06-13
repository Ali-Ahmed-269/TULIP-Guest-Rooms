'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SettingsFormProps {
  initialSettings: Record<string, string>;
}

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
    } catch (err) {
      setSettingsError('An error occurred while saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!newPassword) {
      setPasswordError('Password cannot be empty.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

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
    } catch (err) {
      setPasswordError('An unexpected error occurred while updating the password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Site Settings Card */}
      <div className="card bg-surface">
        <h2 className="mb-4 border-b border-[rgba(0,0,0,0.05)] pb-2">
          Guesthouse Configuration
        </h2>
        <form onSubmit={handleSaveSettings} className="grid gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <label className="form-group">
              <span>Guesthouse Name</span>
              <input
                className="form-control"
                value={guesthouseName}
                onChange={(e) => setGuesthouseName(e.target.value)}
                required
              />
            </label>
            <label className="form-group">
              <span>Guesthouse Phone</span>
              <input
                className="form-control"
                value={guesthousePhone}
                onChange={(e) => setGuesthousePhone(e.target.value)}
                required
              />
            </label>
            <label className="form-group">
              <span>Guesthouse Email</span>
              <input
                type="email"
                className="form-control"
                value={guesthouseEmail}
                onChange={(e) => setGuesthouseEmail(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="form-group">
            <span>Guesthouse Address</span>
            <textarea
              className="form-control"
              value={guesthouseAddress}
              onChange={(e) => setGuesthouseAddress(e.target.value)}
              rows={3}
              required
            />
          </label>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <label className="form-group">
              <span>JazzCash Number</span>
              <input
                className="form-control"
                value={jazzcashNumber}
                onChange={(e) => setJazzcashNumber(e.target.value)}
              />
            </label>
            <label className="form-group">
              <span>Easypaisa Number</span>
              <input
                className="form-control"
                value={easypaisaNumber}
                onChange={(e) => setEasypaisaNumber(e.target.value)}
              />
            </label>
          </div>

          {settingsError && <div className="error-msg">{settingsError}</div>}
          {settingsMessage && <div className="text-sage font-semibold">{settingsMessage}</div>}

          <button type="submit" className="btn btn-primary w-fit" disabled={savingSettings}>
            {savingSettings ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Admin Password Change Card */}
      <div className="card bg-surface">
        <h2 className="mb-4 border-b border-[rgba(0,0,0,0.05)] pb-2">
          Change Admin Password
        </h2>
        <form onSubmit={handleUpdatePassword} className="grid gap-4 max-w-[480px]">
          <label className="form-group">
            <span>New Password</span>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
            />
          </label>
          <label className="form-group">
            <span>Confirm Password</span>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </label>

          {passwordError && <div className="error-msg">{passwordError}</div>}
          {passwordMessage && <div className="text-sage font-semibold">{passwordMessage}</div>}

          <button type="submit" className="btn btn-primary w-fit" disabled={updatingPassword}>
            {updatingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
