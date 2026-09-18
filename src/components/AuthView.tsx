import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, User as UserIcon, CheckCircle2, AlertTriangle, Wallet, Sparkles } from 'lucide-react';
import { apiFetch, setStoredToken } from '../utils.tsx';
import { User } from '../types.ts';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (data.token) {
          setStoredToken(data.token);
        }
        onAuthSuccess(data.user);
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter.');
        }
        const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            confirm_password: confirmPassword,
          }),
        });
        if (data.token) {
          setStoredToken(data.token);
        }
        onAuthSuccess(data.user);
      } else if (mode === 'forgot') {
        // Password reset preview
        setSuccessMessage('A password reset link has been dispatched to your email (development preview active).');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/demo-login', {
        method: 'POST',
      });
      if (data.token) {
        setStoredToken(data.token);
      }
      onAuthSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to login with demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Container */}
      <div className="w-full max-w-md">
        {/* Logo & Headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#111111] text-white shadow-md mb-4">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
            {mode === 'login' ? 'Sign in to FinanceOS' : mode === 'register' ? 'Create your account' : 'Reset your password'}
          </h1>
          <p className="text-sm text-[#6B6B67] mt-1.5">
            {mode === 'login'
              ? 'Enter your credentials to access your financial dashboard'
              : mode === 'register'
              ? 'Multi-user personal finance ledger with private data isolation'
              : 'Enter your registered email to receive reset instructions'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Quick Demo Option */}
          <div className="mb-6 p-3.5 bg-[#EBEBE7]/60 rounded-xl border border-[#D9D9D4] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <div className="text-left">
                <p className="text-xs font-semibold text-[#111111]">Want to test instantly?</p>
                <p className="text-[11px] text-[#6B6B67]">Pre-loaded with realistic balances & budgets</p>
              </div>
            </div>
            <button
              id="demo-login-btn"
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#2563EB] text-white rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              Explore Demo
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-[#D9D9D4]"></div>
            <span className="shrink mx-3 text-xs uppercase tracking-wider text-[#6B6B67] font-semibold">Or use credentials</span>
            <div className="flex-grow border-t border-[#D9D9D4]"></div>
          </div>

          {/* Feedback banners */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-sm text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-2.5 text-sm text-[#15803D]">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B6B67]" />
                  <input
                    id="register-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Lei Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] placeholder-[#A3A3A0] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B6B67]" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] placeholder-[#A3A3A0] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111]">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setErrorMessage(null); }}
                      className="text-xs text-[#2563EB] hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B6B67]" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] placeholder-[#A3A3A0] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
                {mode === 'register' && (
                  <p className="text-[11px] text-[#6B6B67] mt-1">Must be at least 8 characters</p>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B6B67]" />
                  <input
                    id="register-confirm-password"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] placeholder-[#A3A3A0] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Instructions'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle between register and login */}
          <div className="mt-6 pt-5 border-t border-[#D9D9D4] text-center text-xs text-[#6B6B67]">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  id="switch-to-register"
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(null); setSuccessMessage(null); }}
                  className="text-[#2563EB] font-semibold hover:underline cursor-pointer"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  id="switch-to-login"
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
                  className="text-[#2563EB] font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security guarantee note */}
        <div className="mt-6 text-center text-xs text-[#6B6B67] flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-[#15803D]" />
          <span>Server-authoritative authorization & data isolation enforced</span>
        </div>
      </div>
    </div>
  );
};
