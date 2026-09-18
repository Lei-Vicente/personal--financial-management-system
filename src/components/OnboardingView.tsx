import React, { useState } from 'react';
import { Check, ArrowRight, ArrowLeft, Wallet, Shield, CheckCircle2 } from 'lucide-react';
import { User } from '../types.ts';
import { apiFetch, CURRENCY_MAP } from '../utils.tsx';

interface OnboardingViewProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [currency, setCurrency] = useState(user.currency || 'PHP');
  const [monthlyIncome, setMonthlyIncome] = useState(user.monthly_income ? String(user.monthly_income) : '35000');
  const [goalName, setGoalName] = useState('Emergency Fund');
  const [goalTarget, setGoalTarget] = useState('60000');
  const [loading, setLoading] = useState(false);

  const steps = [
    { num: 1, title: 'ACCOUNT' },
    { num: 2, title: 'MONEY' },
    { num: 3, title: 'CATEGORIES' },
    { num: 4, title: 'GOAL' },
  ];

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Update user settings
      const settingsData = await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          currency,
          monthly_income: Number(monthlyIncome) || 0,
          onboarding_completed: 1,
        }),
      });

      // 2. If goal target is filled, create default goal
      if (Number(goalTarget) > 0) {
        await apiFetch('/api/savings-goals', {
          method: 'POST',
          body: JSON.stringify({
            name: goalName || 'Emergency Fund',
            target_amount: Number(goalTarget),
            initial_amount: 0,
            description: '3-6 months essential expenses safety buffer',
          }),
        });
      }

      onComplete(settingsData.user);
    } catch (err) {
      console.error('Onboarding update failed:', err);
      // Fallback update
      onComplete({ ...user, onboarding_completed: 1, currency, monthly_income: Number(monthlyIncome) || 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Step Indicator Header */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#D9D9D4]">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.num
                        ? 'bg-[#111111] text-white shadow-sm ring-2 ring-[#2563EB]/40'
                        : step > s.num
                        ? 'bg-[#15803D] text-white'
                        : 'bg-[#EBEBE7] text-[#6B6B67]'
                    }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4 text-white" /> : s.num}
                  </div>
                  <span className={`text-[11px] font-semibold mt-1.5 tracking-wider uppercase ${
                    step === s.num ? 'text-[#111111]' : 'text-[#6B6B67]'
                  }`}>
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${
                    step > s.num ? 'bg-[#15803D]' : 'bg-[#D9D9D4]'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* STEP 1: Account Confirmation */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-blue-50 text-[#2563EB] rounded-2xl mb-1">
                  <Wallet className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#111111] tracking-tight">
                  Welcome to FinanceOS, {user.full_name.split(' ')[0]}
                </h2>
                <p className="text-sm text-[#6B6B67] max-w-md mx-auto">
                  Let’s quickly set up your financial parameters so your dashboard, budgets, and savings calculations align with your lifestyle.
                </p>
              </div>

              <div className="p-4 bg-[#EBEBE7]/50 rounded-xl border border-[#D9D9D4] space-y-2 text-xs text-[#6B6B67]">
                <div className="flex items-center space-x-2 text-[#111111] font-semibold">
                  <Shield className="w-4 h-4 text-[#15803D]" />
                  <span>Private & Isolated Tenant Environment</span>
                </div>
                <p>
                  Every record, budget, and category you record is strictly protected and isolated to your authenticated account ID.
                </p>
              </div>

              <button
                id="onboarding-step1-btn"
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 px-4 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Continue Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Money & Currency */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-[#111111] tracking-tight">Your Money Preferences</h2>
                <p className="text-sm text-[#6B6B67] mt-1">
                  Select your primary currency and estimated monthly income.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-2">
                    Primary Currency (Default: PHP)
                  </label>
                  <select
                    id="onboarding-currency-select"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-2">
                    Estimated Monthly Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-[#6B6B67]">
                      {CURRENCY_MAP[currency]?.symbol || '₱'}
                    </span>
                    <input
                      id="onboarding-monthly-income"
                      type="number"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      placeholder="35000"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] text-[#6B6B67] mt-1">
                    Used to calculate your savings rate and baseline capacity. You can change this anytime.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 border border-[#D9D9D4] text-[#111111] hover:bg-[#EBEBE7] rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  id="onboarding-step2-btn"
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 px-4 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Categories</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Categories Preview */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-[#111111] tracking-tight">Default Expense Categories</h2>
                <p className="text-sm text-[#6B6B67] mt-1">
                  We have pre-provisioned your account with standard categories. You can add or rename custom categories at any time.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: 'Food & Dining', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { name: 'Transportation', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                  { name: 'Housing & Bills', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { name: 'Shopping', color: 'bg-pink-50 text-pink-700 border-pink-200' },
                  { name: 'Entertainment', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { name: 'Healthcare', color: 'bg-red-50 text-red-700 border-red-200' },
                  { name: 'Education', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { name: 'Other', color: 'bg-gray-50 text-gray-700 border-gray-200' },
                ].map((c) => (
                  <div
                    key={c.name}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 ${c.color}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-4 border border-[#D9D9D4] text-[#111111] hover:bg-[#EBEBE7] rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  id="onboarding-step3-btn"
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 px-4 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Savings Goal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Savings Goal */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-[#111111] tracking-tight">Optional Savings Goal</h2>
                <p className="text-sm text-[#6B6B67] mt-1">
                  Start with a starter target such as an Emergency Fund or purchase fund.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-2">
                    Goal Name
                  </label>
                  <input
                    id="onboarding-goal-name"
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="Emergency Fund"
                    className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-2">
                    Target Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-[#6B6B67]">
                      {CURRENCY_MAP[currency]?.symbol || '₱'}
                    </span>
                    <input
                      id="onboarding-goal-target"
                      type="number"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      placeholder="60000"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-3 px-4 border border-[#D9D9D4] text-[#111111] hover:bg-[#EBEBE7] rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  id="onboarding-complete-btn"
                  type="button"
                  disabled={loading}
                  onClick={handleFinish}
                  className="flex-1 py-3 px-4 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? 'Finalizing Setup...' : 'Complete & Open Dashboard'}</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
