import React from 'react';
import { Edit2, Plus } from 'lucide-react';
import { Account } from '../types.ts';
import { formatMoney, getAccountIcon } from '../utils.tsx';
import { motion } from 'motion/react';

interface WalletCardProps {
  account: Account;
  currency: string;
  totalLiquidSavings: number;
  onQuickUpdateBalance: (account: Account) => void;
  onEditAccount: (account: Account) => void;
  isNew?: boolean;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  account,
  currency,
  totalLiquidSavings,
  onQuickUpdateBalance,
  onEditAccount,
  isNew = false,
}) => {
  const currentBalance = Number(account.current_balance ?? account.balance ?? 0);
  const percentage = totalLiquidSavings > 0
    ? Math.max(0, Math.min(100, Math.round((currentBalance / totalLiquidSavings) * 100)))
    : 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'BANK': return 'Bank Savings';
      case 'WALLET': return 'E-Wallet';
      case 'CASH': return 'Cash on-hand';
      case 'INVESTMENT': return 'Investment';
      case 'CREDIT': return 'Credit Line';
      default: return 'Account';
    }
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      className="group relative bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#EBEBE7] dark:border-[#333330] rounded-[24px] p-5 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl transition-shadow duration-300 min-h-[220px]"
    >
      {/* Background ambient glow based on account color */}
      <div
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none"
        style={{ backgroundColor: account.color || '#2563EB' }}
      />

      {/* Top Section */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0"
              style={{ backgroundColor: account.color || '#2563EB' }}
            >
              {getAccountIcon(account.icon, 'w-5 h-5 stroke-[2]')}
            </div>
            <div className="min-w-0 pr-2">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#F5F5F3] tracking-tight truncate">
                {account.name}
              </h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B67] dark:text-[#A1A19D]">
                  {getTypeLabel(account.type)}
                </span>
                {account.is_default === 1 && (
                  <div className="flex items-center space-x-1" title="Primary Account">
                    <span className="w-1 h-1 rounded-full bg-[#D9D9D4] dark:bg-[#333330]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] shadow-[0_0_8px_rgba(21,128,61,0.6)]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onEditAccount(account)}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] dark:hover:text-white dark:hover:bg-[#2A2A28] transition-colors cursor-pointer"
            title="Edit Wallet"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <p className="text-[10px] font-bold text-[#6B6B67] dark:text-[#A1A19D] uppercase tracking-widest mb-1">
            Available Balance
          </p>
          <p className="text-3xl font-extrabold text-[#111111] dark:text-white tracking-tighter tabular-nums leading-none">
            {formatMoney(currentBalance, currency)}
          </p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="relative z-10 mt-6 space-y-4">
        {/* Progress bar area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-[#6B6B67] dark:text-[#A1A19D]">Portfolio Share</span>
            <span className="text-[#111111] dark:text-white tabular-nums">{percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#EBEBE7] dark:bg-[#2A2A28] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full"
              style={{ backgroundColor: account.color || '#2563EB' }}
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onQuickUpdateBalance(account)}
          className="w-full group/btn relative overflow-hidden rounded-xl bg-[#F5F5F3] dark:bg-[#2A2A28] border border-[#D9D9D4] dark:border-[#333330] px-4 py-2.5 transition-all hover:bg-[#111111] dark:hover:bg-white hover:border-[#111111] dark:hover:border-white cursor-pointer"
        >
          <div className="relative z-10 flex items-center justify-center space-x-2 text-[#111111] dark:text-[#F5F5F3] group-hover/btn:text-white dark:group-hover/btn:text-[#111111]">
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Update Balance</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
