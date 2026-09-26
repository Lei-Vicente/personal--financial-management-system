import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Sparkles, Building2, Landmark, Smartphone, Banknote, Coins, Wallet, CreditCard, PiggyBank, Shield, Zap } from 'lucide-react';
import { Account } from '../types.ts';
import { apiFetch, CURRENCY_MAP, formatMoney, getAccountIcon } from '../utils.tsx';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedAccount?: Account | null, action?: 'created' | 'updated' | 'deleted') => void;
  accountToEdit?: Account | null;
  currency: string;
}

const PHILIPPINE_PRESETS = [
  { name: 'Landbank', type: 'BANK', color: '#007B3E', icon: 'Building2', label: 'Landbank' },
  { name: 'GoTyme Bank', type: 'BANK', color: '#00D2C4', icon: 'CreditCard', label: 'GoTyme' },
  { name: 'GCash', type: 'WALLET', color: '#007DFE', icon: 'Smartphone', label: 'GCash' },
  { name: 'Cash on-hand', type: 'CASH', color: '#10B981', icon: 'Banknote', label: 'Cash on-hand' },
  { name: 'Maya', type: 'WALLET', color: '#00D66E', icon: 'Smartphone', label: 'Maya' },
  { name: 'BPI', type: 'BANK', color: '#B5121B', icon: 'Building2', label: 'BPI' },
  { name: 'BDO', type: 'BANK', color: '#0038A8', icon: 'Landmark', label: 'BDO' },
  { name: 'Seabank', type: 'BANK', color: '#FF5E1E', icon: 'Smartphone', label: 'Seabank' },
  { name: 'UnionBank', type: 'BANK', color: '#FF8300', icon: 'Building2', label: 'UnionBank' },
];

const COLOR_OPTIONS = [
  '#007B3E', // Landbank Green
  '#00D2C4', // GoTyme Turquoise
  '#007DFE', // GCash Blue
  '#10B981', // Emerald Cash
  '#00D66E', // Maya Neon Green
  '#B5121B', // BPI Deep Red
  '#0038A8', // BDO Navy
  '#FF5E1E', // Seabank Orange
  '#8B5CF6', // Purple
  '#111111', // Onyx Minimalist
];

const ICON_OPTIONS = [
  { name: 'Wallet', icon: Wallet, label: 'Wallet' },
  { name: 'Building2', icon: Building2, label: 'Bank' },
  { name: 'Landmark', icon: Landmark, label: 'Landmark' },
  { name: 'CreditCard', icon: CreditCard, label: 'Card' },
  { name: 'Smartphone', icon: Smartphone, label: 'E-Wallet' },
  { name: 'Banknote', icon: Banknote, label: 'Cash' },
  { name: 'Coins', icon: Coins, label: 'Coins' },
  { name: 'PiggyBank', icon: PiggyBank, label: 'Savings' },
  { name: 'Shield', icon: Shield, label: 'Emergency' },
  { name: 'Zap', icon: Zap, label: 'Digital' },
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountToEdit,
  currency,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'BANK' | 'WALLET' | 'CASH' | 'INVESTMENT' | 'OTHER'>('BANK');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#007B3E');
  const [icon, setIcon] = useState('Building2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type as any);
      const current = Number(accountToEdit.current_balance ?? accountToEdit.balance ?? 0);
      setBalance(String(current));
      setColor(accountToEdit.color || '#2563EB');
      setIcon(accountToEdit.icon || 'Building2');
    } else {
      // Default to empty name with 0 balance
      setName('');
      setType('BANK');
      setBalance('0');
      setColor('#007B3E');
      setIcon('Building2');
    }
    setError(null);
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const currencySymbol = CURRENCY_MAP[currency]?.symbol || '₱';

  const applyPreset = (preset: typeof PHILIPPINE_PRESETS[0]) => {
    setName(preset.name);
    setType(preset.type as any);
    setColor(preset.color);
    setIcon(preset.icon);
    // Auto-focus and highlight balance input so user can easily enter starting balance
    setTimeout(() => {
      const balanceEl = document.getElementById('account-balance-input') as HTMLInputElement | null;
      if (balanceEl) {
        balanceEl.focus();
        balanceEl.select();
      }
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide an account or wallet name.');
      return;
    }

    const numBalance = Number(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance (0 or greater).');
      return;
    }

    setLoading(true);
    try {
      let savedAccount: Account | null = null;
      let action: 'created' | 'updated' = 'created';

      if (accountToEdit) {
        const res = await apiFetch(`/api/accounts/${accountToEdit.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            type,
            current_balance: numBalance,
            color,
            icon,
          }),
        });
        savedAccount = res?.account || {
          ...accountToEdit,
          name: name.trim(),
          type,
          current_balance: numBalance,
          balance: numBalance,
          color,
          icon,
        };
        action = 'updated';
      } else {
        const res = await apiFetch('/api/accounts', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            type,
            balance: numBalance,
            currency,
            color,
            icon,
          }),
        });
        savedAccount = res?.account || null;
        action = 'created';
      }

      onSuccess(savedAccount, action);
      onClose();
    } catch (err: any) {
      console.error('Failed to save account:', err);
      setError(err?.message || 'Failed to save account details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToEdit) return;
    if (!window.confirm(`Delete wallet "${accountToEdit.name}"? Transactions linked to this account will remain in your ledger.`)) {
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/accounts/${accountToEdit.id}`, {
        method: 'DELETE',
      });
      onSuccess(accountToEdit, 'deleted');
      onClose();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      setError(err?.message || 'Failed to delete account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#D9D9D4] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111111] tracking-tight">
              {accountToEdit ? `Customize ${accountToEdit.name}` : 'Add New Wallet / Savings Account'}
            </h2>
            <p className="text-xs text-[#6B6B67]">
              Configure your bank, digital wallet, or cash on-hand card
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          {/* Quick Philippine Presets */}
          {!accountToEdit && (
            <div>
              <div className="flex items-center space-x-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider">
                  Popular Philippine Presets
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PHILIPPINE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#D9D9D4] hover:border-[#111111] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer bg-[#F5F5F3] hover:bg-[#EBEBE7]"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1.5">
              Account / Wallet Name
            </label>
            <input
              id="account-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Landbank Savings, GoTyme, GCash, Cash on-hand"
              required
              className="w-full px-3.5 py-2 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] placeholder-[#A3A3A0] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Institution / Account Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1.5">
                Account Type
              </label>
              <select
                id="account-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="BANK">Bank Account / Savings</option>
                <option value="WALLET">Digital E-Wallet (GCash, Maya)</option>
                <option value="CASH">Cash on-hand (Physical)</option>
                <option value="INVESTMENT">Investment / MP2 / Stocks</option>
                <option value="OTHER">Other Custom Account</option>
              </select>
            </div>

            {/* Current Balance Input */}
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1.5">
                Current Balance ({currencySymbol})
              </label>
              <input
                id="account-balance-input"
                type="number"
                step="any"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB]"
              />
              <p className="text-[11px] text-[#6B6B67] mt-1.5 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#2563EB] shrink-0" />
                <span>Enter liquid amount on-hand or in account. Leave 0 if empty.</span>
              </p>
            </div>
          </div>

          {/* Theme Color Picker */}
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1.5">
              Theme / Brand Accent Color
            </label>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border flex items-center justify-center ${
                    color === c ? 'scale-110 border-[#111111] ring-2 ring-[#2563EB]/40' : 'border-black/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-[#D9D9D4] p-0 bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1.5">
              Card Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] font-bold'
                        : 'border-[#D9D9D4] hover:bg-[#EBEBE7] text-[#6B6B67]'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3 bg-[#F5F5F3] border border-[#D9D9D4] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs" style={{ backgroundColor: color }}>
                {getAccountIcon(icon, 'w-4 h-4 text-white')}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#111111] truncate block">{name.trim() || 'Wallet Name'}</span>
                <span className="text-[10px] text-[#6B6B67] uppercase font-semibold">{type}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-[#6B6B67] block uppercase font-medium">Starting Liquid</span>
              <span className="text-xs font-extrabold text-[#15803D] tabular-nums">
                {formatMoney(Number(balance) || 0, currency)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#D9D9D4] flex items-center justify-between">
            {accountToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-2 text-[#B91C1C] hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:bg-[#EBEBE7] text-[#111111] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-account-btn"
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : (accountToEdit ? 'Save Changes' : 'Create Account')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
