import React, { useState } from 'react';
import { Edit2, Plus, ArrowUpRight, Check, X, Shield, Wallet as WalletIcon } from 'lucide-react';
import { Account } from '../types.ts';
import { formatMoney, getAccountIcon } from '../utils.tsx';

interface WalletCardProps {
  account: Account;
  currency: string;
  totalLiquidSavings: number;
  onQuickUpdateBalance: (account: Account) => void;
  onEditAccount: (account: Account) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  account,
  currency,
  totalLiquidSavings,
  onQuickUpdateBalance,
  onEditAccount,
}) => {
  const [isHovered, setIsHovered] = useState(false);
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
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-[#FFFFFF] border border-[#D9D9D4] hover:border-[#111111]/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-sm relative overflow-hidden group min-h-[190px]"
    >
      {/* Top subtle brand accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
        style={{ backgroundColor: account.color || '#2563EB' }}
      />

      {/* Card Header: Icon, Name, Type & Edit trigger */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105"
              style={{ backgroundColor: account.color || '#2563EB' }}
            >
              {getAccountIcon(account.icon, 'w-5 h-5 text-white')}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#111111] truncate tracking-tight" title={account.name}>
                {account.name}
              </h3>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBEBE7] text-[#6B6B67]">
                  {getTypeLabel(account.type)}
                </span>
                {account.is_default === 1 && (
                  <span className="text-[9px] font-bold text-[#15803D] bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                    Primary
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action: Customize / Settings button */}
          <button
            onClick={() => onEditAccount(account)}
            title="Customize account details"
            className="p-1.5 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Balance Display */}
        <div className="mt-4">
          <span className="text-[11px] font-medium text-[#6B6B67] uppercase tracking-wider block">
            Current Savings
          </span>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-2xl sm:text-2xl lg:text-[26px] font-extrabold text-[#111111] tracking-tight tabular-nums">
              {formatMoney(currentBalance, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Portfolio Share & Fast Update Savings Button */}
      <div className="mt-4 pt-3 border-t border-[#D9D9D4]/60">
        <div className="flex items-center justify-between text-[11px] text-[#6B6B67] mb-2">
          <span>Portfolio share</span>
          <span className="font-semibold text-[#111111] tabular-nums">{percentage}%</span>
        </div>

        {/* Micro progress indicator */}
        <div className="w-full bg-[#EBEBE7] h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: account.color || '#2563EB',
            }}
          />
        </div>

        <button
          onClick={() => onQuickUpdateBalance(account)}
          className="w-full py-1.5 px-3 bg-[#F5F5F3] hover:bg-[#111111] text-[#111111] hover:text-white border border-[#D9D9D4] hover:border-[#111111] rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3 h-3" />
          <span>Input / Update Balance</span>
        </button>
      </div>
    </div>
  );
};
