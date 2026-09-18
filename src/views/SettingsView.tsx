import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Laptop, Globe, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { User as UserType } from '../types.ts';
import { apiFetch, CURRENCY_MAP } from '../utils.tsx';

interface SettingsViewProps {
  user: UserType;
  onUpdateUser: (updated: UserType) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile fields
  const [fullName, setFullName] = useState(user.full_name);
  const [currency, setCurrency] = useState(user.currency || 'PHP');
  const [monthlyIncome, setMonthlyIncome] = useState(String(user.monthly_income || 0));
  const [timezone, setTimezone] = useState(user.timezone || 'Asia/Manila');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await apiFetch('/api/auth/sessions');
      setSessions(res.sessions || []);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      loadSessions();
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      const res = await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName.trim(),
          currency,
          monthly_income: Number(monthlyIncome) || 0,
          timezone,
        }),
      });
      onUpdateUser(res.user);
      setFeedback({ type: 'success', message: 'Profile settings updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password changed successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      loadSessions();
      setFeedback({ type: 'success', message: 'Session revoked successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke session.' });
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const res = await apiFetch('/api/auth/verify-email', { method: 'POST' });
      onUpdateUser({ ...user, is_verified: 1 });
      setFeedback({ type: 'success', message: 'Email verified successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Verification failed.' });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Settings & Security</h1>
        <p className="text-sm text-[#6B6B67] mt-1">
          Manage your personal profile, baseline currency parameters, password, and active login sessions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#D9D9D4] pb-2">
        <button
          onClick={() => { setActiveTab('profile'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile' ? 'bg-[#111111] text-white shadow-xs' : 'text-[#6B6B67] hover:bg-[#EBEBE7]'
          }`}
        >
          Profile & Money
        </button>
        <button
          onClick={() => { setActiveTab('security'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security' ? 'bg-[#111111] text-white shadow-xs' : 'text-[#6B6B67] hover:bg-[#EBEBE7]'
          }`}
        >
          Security & Sessions
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-green-50 text-[#15803D] border-green-200'
              : 'bg-red-50 text-[#B91C1C] border-red-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: Profile & Money */}
      {activeTab === 'profile' && (
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Email Address
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="flex-1 py-2.5 px-3.5 bg-[#EBEBE7]/50 border border-[#D9D9D4] rounded-xl text-sm text-[#6B6B67] cursor-not-allowed"
                />
                {user.is_verified ? (
                  <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-[#15803D] rounded-lg text-xs font-semibold shrink-0 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-semibold shrink-0 hover:bg-[#1D4ED8] cursor-pointer"
                  >
                    Verify Email
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Base Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                >
                  {Object.entries(CURRENCY_MAP).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.label} ({meta.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Estimated Monthly Income
                </label>
                <input
                  type="number"
                  step="any"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="UTC">Universal Coordinated Time (UTC)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-[#D9D9D4]">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          {/* Change Password */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-[#111111] tracking-tight mb-1 flex items-center space-x-2">
              <Key className="w-4 h-4 text-[#2563EB]" />
              <span>Change Password</span>
            </h2>
            <p className="text-xs text-[#6B6B67] mb-5">
              Ensure your account is protected with a secure password of at least 8 characters.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Updating password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Sessions List */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-[#111111] tracking-tight mb-1 flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-[#2563EB]" />
              <span>Active Browser Sessions</span>
            </h2>
            <p className="text-xs text-[#6B6B67] mb-5">
              Devices and network locations currently authenticated to this account.
            </p>

            {loadingSessions ? (
              <div className="py-4 text-xs text-[#6B6B67]">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="py-4 text-xs text-[#6B6B67]">No active sessions found.</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 bg-[#EBEBE7]/40 border border-[#D9D9D4] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[#EBEBE7] flex items-center justify-center text-[#111111]">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#111111] truncate max-w-[200px] sm:max-w-xs">
                          {sess.user_agent ? sess.user_agent.slice(0, 50) : 'Browser Client'}
                        </p>
                        <p className="text-[11px] text-[#6B6B67]">
                          IP: {sess.ip_address || '127.0.0.1'} &bull; Started {new Date(sess.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#B91C1C] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
