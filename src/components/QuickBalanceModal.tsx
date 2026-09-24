import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';
import { Account } from '../types.ts';
import { apiFetch, CURRENCY_MAP, formatMoney, getAccountIcon } from '../utils.tsx';

interface QuickBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: Account | null;
  currency: string;
}

export const QuickBalanceModal: React.FC<QuickBalanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  account,
  currency,
}) => {
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      const current = Number(account.current_balance ?? account.balance ?? 0);
      setBalance(String(current));
      setError(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const currencySymbol = CURRENCY_MAP[currency]?.symbol || '₱';
  const currentVal = Number(account.current_balance ?? account.balance ?? 0);
  const enteredVal = Number(balance) || 0;
  const diff = enteredVal - currentVal;

  const handleAddAmount = (amountToAdd: number) => {
    const current = Number(balance) || 0;
    setBalance(String(Math.max(0, current + amountToAdd)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numBalance = Number(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance amount (0 or greater).');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_balance: numBalance,
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update account balance:', err);
      setError(err?.message || 'Failed to update balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scaleUp">
        {/* Top Header */}
        <div className="p-5 border-b border-[#D9D9D4] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: account.color || '#2563EB' }}
            >
              {getAccountIcon(account.icon, 'w-5 h-5 text-white')}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                Update {account.name} Savings
              </h2>
              <p className="text-xs text-[#6B6B67]">
                Input your current savings on this account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          {/* Current balance indicator */}
          <div className="bg-[#F5F5F3] p-3.5 rounded-xl flex items-center justify-between">
            <span className="text-xs text-[#6B6B67] font-medium">Previous Recorded Balance</span>
            <span className="text-sm font-bold text-[#111111] tabular-nums">
              {formatMoney(currentVal, currency)}
            </span>
          </div>

          {/* Balance Input Field */}
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1.5">
              New Savings / Balance Amount ({currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-[#6B6B67]">
                {currencySymbol}
              </span>
              <input
                id="quick-balance-input"
                type="number"
                step="any"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                autoFocus
                required
                className="w-full pl-9 pr-4 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Quick Adjustment Shortcuts */}
          <div>
            <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block mb-2">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddAmount(amt)}
                  className="py-1.5 px-2 bg-[#EBEBE7] hover:bg-[#D9D9D4] text-[#111111] rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Balance change differential preview */}
          {diff !== 0 && (
            <div className="pt-2 text-xs flex items-center justify-between text-[#6B6B67]">
              <span>Net Adjustment:</span>
              <span className={`font-bold tabular-nums ${diff > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                {diff > 0 ? `+${formatMoney(diff, currency)}` : `-${formatMoney(Math.abs(diff), currency)}`}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-[#D9D9D4] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:bg-[#EBEBE7] text-[#111111] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-quick-balance-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? 'Updating...' : 'Save Savings Balance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
