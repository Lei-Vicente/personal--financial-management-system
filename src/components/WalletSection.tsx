import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowRight, ShieldCheck, Sparkles, Check, X } from 'lucide-react';
import { User, Account } from '../types.ts';
import { apiFetchFresh, apiFetchCached, getCachedData, formatMoney } from '../utils.tsx';
import { WalletCard } from './WalletCard.tsx';
import { QuickBalanceModal } from './QuickBalanceModal.tsx';
import { AccountModal } from './AccountModal.tsx';

interface WalletSectionProps {
  user: User;
  dataVersion?: number;
  onDataChanged?: () => void;
  onOpenAddWallet?: () => void;
  accounts?: Account[];
  highlightedAccountId?: string | null;
}

export const WalletSection: React.FC<WalletSectionProps> = ({
  user,
  dataVersion,
  onDataChanged,
  onOpenAddWallet,
  accounts: propAccounts,
  highlightedAccountId,
}) => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    if (propAccounts && propAccounts.length > 0) return propAccounts;
    return getCachedData<any>('/api/accounts')?.accounts || [];
  });
  const [loading, setLoading] = useState(() => !propAccounts && !getCachedData('/api/accounts'));
  const [justAddedId, setJustAddedId] = useState<string | null>(highlightedAccountId || null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Sync with prop accounts whenever parent updates
  useEffect(() => {
    if (propAccounts && propAccounts.length > 0) {
      setAccounts(propAccounts);
    }
  }, [propAccounts]);

  // Sync external highlighted account if supplied
  useEffect(() => {
    if (highlightedAccountId) {
      setJustAddedId(highlightedAccountId);
      const timer = setTimeout(() => setJustAddedId(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [highlightedAccountId]);

  // Modals state
  const [quickBalanceAccount, setQuickBalanceAccount] = useState<Account | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const loadAccounts = async () => {
    try {
      const res = await apiFetchFresh<any>('/api/accounts');
      if (res?.accounts) {
        setAccounts(res.accounts);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user, dataVersion]);

  const handleSuccess = (savedAccount?: Account | null, action?: 'created' | 'updated' | 'deleted') => {
    if (savedAccount) {
      if (action === 'created' || !action) {
        setAccounts((prev) => {
          const exists = prev.some((a) => a.id === savedAccount.id);
          if (exists) {
            return prev.map((a) => (a.id === savedAccount.id ? savedAccount : a));
          }
          return [...prev, savedAccount];
        });
        setJustAddedId(savedAccount.id);
        const bal = formatMoney(savedAccount.current_balance ?? savedAccount.balance ?? 0, user.currency);
        setActionFeedback({
          message: `Wallet "${savedAccount.name}" added successfully with starting balance ${bal}!`,
          type: 'success',
        });
        setTimeout(() => setJustAddedId(null), 6000);
        setTimeout(() => setActionFeedback(null), 6000);
      } else if (action === 'updated') {
        setAccounts((prev) => prev.map((a) => (a.id === savedAccount.id ? savedAccount : a)));
        setJustAddedId(savedAccount.id);
        setActionFeedback({
          message: `Wallet "${savedAccount.name}" updated successfully.`,
          type: 'success',
        });
        setTimeout(() => setJustAddedId(null), 5000);
        setTimeout(() => setActionFeedback(null), 5000);
      } else if (action === 'deleted') {
        setAccounts((prev) => prev.filter((a) => a.id !== savedAccount.id));
        setActionFeedback({
          message: `Wallet removed from your liquid accounts.`,
          type: 'info',
        });
        setTimeout(() => setActionFeedback(null), 4000);
      }
    }
    loadAccounts();
    onDataChanged?.();
  };

  const totalLiquidSavings = accounts.reduce((acc, a) => {
    return acc + Number(a.current_balance ?? a.balance ?? 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-lg font-bold text-[#111111] tracking-tight">
              Wallets & Liquid Savings
            </h2>
          </div>
          <p className="text-xs text-[#6B6B67] mt-0.5">
            Your real-time balances on Landbank, GoTyme, GCash, Cash on-hand, and other accounts
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Total Liquid Funds Banner */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl px-3.5 py-1.5 flex items-center space-x-2 shadow-2xs">
            <span className="text-[11px] font-medium text-[#6B6B67]">Total Liquid:</span>
            <span className="text-xs font-extrabold text-[#15803D] tabular-nums">
              {formatMoney(totalLiquidSavings, user.currency)}
            </span>
          </div>

          <button
            id="add-wallet-btn"
            onClick={() => {
              if (onOpenAddWallet) {
                onOpenAddWallet();
              } else {
                setAccountToEdit(null);
                setIsAccountModalOpen(true);
              }
            }}
            className="px-3 py-1.5 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Wallet</span>
          </button>
        </div>
      </div>

      {/* Visual Feedback Confirmation Banner */}
      {actionFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-fadeIn shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-3 h-3" />
            </div>
            <div>
              <span className="font-bold">{actionFeedback.message}</span>
              <span className="block text-[11px] text-emerald-700 font-normal">
                Reflected instantaneously in your total liquid portfolio and balance counter.
              </span>
            </div>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 text-emerald-700 hover:text-emerald-950 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid of Wallet Cards */}
      {loading && accounts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#D9D9D4] rounded-2xl p-5 h-44 shadow-xs flex flex-col justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-200 rounded w-24" />
                  <div className="h-2.5 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-28 my-2" />
              <div className="h-7 bg-gray-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EBEBE7] flex items-center justify-center mx-auto text-[#6B6B67]">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111111]">No Wallets or Accounts Found</h3>
            <p className="text-xs text-[#6B6B67] mt-1 max-w-sm mx-auto">
              Add your Landbank, GoTyme, GCash, and Cash on-hand accounts to track your liquid savings in one place.
            </p>
          </div>
          <button
            onClick={() => {
              if (onOpenAddWallet) {
                onOpenAddWallet();
              } else {
                setAccountToEdit(null);
                setIsAccountModalOpen(true);
              }
            }}
            className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Setup First Wallet</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => (
            <WalletCard
              key={acc.id}
              account={acc}
              currency={user.currency}
              totalLiquidSavings={totalLiquidSavings}
              isNew={acc.id === justAddedId}
              onQuickUpdateBalance={(a) => setQuickBalanceAccount(a)}
              onEditAccount={(a) => {
                setAccountToEdit(a);
                setIsAccountModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Quick Balance Input Modal */}
      {quickBalanceAccount && (
        <QuickBalanceModal
          isOpen={!!quickBalanceAccount}
          onClose={() => setQuickBalanceAccount(null)}
          onSuccess={handleSuccess}
          account={quickBalanceAccount}
          currency={user.currency}
        />
      )}

      {/* Full Customization Account Modal */}
      {isAccountModalOpen && (
        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onSuccess={handleSuccess}
          accountToEdit={accountToEdit}
          currency={user.currency}
        />
      )}
    </div>
  );
};
