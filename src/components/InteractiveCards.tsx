import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertCircle,
  Clock,
  CreditCard,
  Trash2,
  Edit2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Budget, SavingsGoal, Transaction } from '../types.ts';
import { formatMoney, formatDate, getCategoryIcon } from '../utils.tsx';

// ==========================================
// 1. BALANCE CARD (Expandable)
// ==========================================
interface BalanceCardProps {
  totalBalance: number;
  changePct: number;
  currentIncome: number;
  currentExpense: number;
  currentNet: number;
  previousNet: number;
  currency: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalBalance,
  changePct,
  currentIncome,
  currentExpense,
  currentNet,
  previousNet,
  currency,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPositive = changePct >= 0;

  return (
    <div
      id="interactive-balance-card"
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      className={`bg-[#FFFFFF] border rounded-2xl p-6 transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
        isExpanded
          ? 'border-[#2563EB] shadow-md'
          : 'border-[#D9D9D4] hover:border-[#111111]/40 hover:-translate-y-0.5 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67]">
            Total Balance
          </span>
          <span className="text-[10px] bg-[#EBEBE7] text-[#111111] px-2 py-0.5 rounded-full font-medium">
            All Accounts
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-[#6B6B67]">
          <span>{isExpanded ? 'Collapse' : 'Details'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight tabular-nums">
          {formatMoney(totalBalance, currency)}
        </h2>

        <div className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isPositive ? 'bg-green-50 text-[#15803D]' : 'bg-red-50 text-[#B91C1C]'
        }`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{isPositive ? `+${changePct}%` : `${changePct}%`} vs prev month</span>
        </div>
      </div>

      {/* Expanded Financial Breakdown */}
      {isExpanded && (
        <div className="mt-6 pt-5 border-t border-[#D9D9D4] flex flex-wrap items-start justify-between gap-4 sm:gap-6 animate-fadeIn">
          <div className="min-w-[130px] flex-1">
            <span className="text-[11px] font-medium text-[#6B6B67] block">This Month Income</span>
            <span className="text-sm sm:text-base font-bold text-[#15803D] tabular-nums block mt-0.5 whitespace-nowrap">
              +{formatMoney(currentIncome, currency)}
            </span>
          </div>

          <div className="min-w-[130px] flex-1">
            <span className="text-[11px] font-medium text-[#6B6B67] block">This Month Expense</span>
            <span className="text-sm sm:text-base font-bold text-[#B91C1C] tabular-nums block mt-0.5 whitespace-nowrap">
              -{formatMoney(currentExpense, currency)}
            </span>
          </div>

          <div className="min-w-[110px] flex-1">
            <span className="text-[11px] font-medium text-[#6B6B67] block">Net Savings Rate</span>
            <span className="text-sm sm:text-base font-bold text-[#111111] tabular-nums block mt-0.5 whitespace-nowrap">
              {currentIncome > 0 ? `${Math.max(0, Math.round((currentNet / currentIncome) * 100))}%` : '0%'}
            </span>
          </div>

          <div className="min-w-[130px] flex-1">
            <span className="text-[11px] font-medium text-[#6B6B67] block">Prev Month Net</span>
            <span className="text-sm sm:text-base font-bold text-[#6B6B67] tabular-nums block mt-0.5 whitespace-nowrap">
              {formatMoney(previousNet, currency, true)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. INCOME CARD (Clickable to ledger)
// ==========================================
interface IncomeCardProps {
  income: number;
  changePct: number;
  currency: string;
  onClick: () => void;
}

export const IncomeCard: React.FC<IncomeCardProps> = ({ income, changePct, currency, onClick }) => {
  const isUp = changePct >= 0;

  return (
    <div
      id="interactive-income-card"
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 hover:border-[#15803D]/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#15803D]/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67]">
          Income This Month
        </span>
        <div className="w-8 h-8 rounded-xl bg-green-50 text-[#15803D] flex items-center justify-center">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight tabular-nums block">
          {formatMoney(income, currency)}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2">
          <span className={`text-xs font-semibold ${isUp ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
            {isUp ? `+${changePct}%` : `${changePct}%`} from last month
          </span>
          <span className="text-[11px] text-[#2563EB] font-medium hover:underline flex items-center">
            View income &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. EXPENSE CARD (Clickable to ledger)
// ==========================================
interface ExpenseCardProps {
  expense: number;
  changePct: number;
  largestCategory: { name: string; amount: number } | null;
  currency: string;
  onClick: () => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  changePct,
  largestCategory,
  currency,
  onClick,
}) => {
  return (
    <div
      id="interactive-expense-card"
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 hover:border-[#B91C1C]/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67]">
          Expenses This Month
        </span>
        <div className="w-8 h-8 rounded-xl bg-red-50 text-[#B91C1C] flex items-center justify-center">
          <ArrowDownRight className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight tabular-nums block">
          {formatMoney(expense, currency)}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2">
          {largestCategory ? (
            <span className="text-xs text-[#6B6B67] truncate max-w-[160px]">
              Top: <strong className="text-[#111111] font-medium">{largestCategory.name}</strong>
            </span>
          ) : (
            <span className="text-xs text-[#6B6B67]">No expenses recorded</span>
          )}
          <span className="text-[11px] text-[#2563EB] font-medium hover:underline flex items-center">
            View expenses &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. BUDGET CARD (Interactive & Expandable)
// ==========================================
interface BudgetCardProps {
  budget: Budget;
  currency: string;
  onViewCategory?: (catId: string) => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, currency, onViewCategory }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status colors
  let progressColor = 'bg-[#15803D]';
  let badgeStyle = 'bg-green-50 text-[#15803D] border-green-200';
  if (budget.percentage >= 100) {
    progressColor = 'bg-[#B91C1C]';
    badgeStyle = 'bg-red-50 text-[#B91C1C] border-red-200';
  } else if (budget.percentage >= 90) {
    progressColor = 'bg-[#EA580C]';
    badgeStyle = 'bg-orange-50 text-[#EA580C] border-orange-200';
  } else if (budget.percentage >= 75) {
    progressColor = 'bg-[#B45309]';
    badgeStyle = 'bg-amber-50 text-[#B45309] border-amber-200';
  }

  return (
    <div
      id={`budget-card-${budget.id}`}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      className={`bg-[#FFFFFF] border rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
        isExpanded ? 'border-[#2563EB] shadow-md' : 'border-[#D9D9D4] hover:border-[#111111]/40'
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: budget.category_color || '#2563EB' }}
          >
            {getCategoryIcon(budget.category_icon, 'w-4 h-4 text-white')}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#111111] truncate">{budget.category_name}</h3>
            <span className="text-[11px] text-[#6B6B67] truncate block">
              {formatMoney(budget.spent, currency)} of {formatMoney(budget.budget_amount, currency)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
            {budget.percentage}%
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6B6B67]" /> : <ChevronDown className="w-4 h-4 text-[#6B6B67]" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-full bg-[#EBEBE7] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${Math.min(100, budget.percentage)}%` }}
        />
      </div>

      {/* Contextual Warning */}
      {budget.status_warning && (
        <div className="mt-2.5 p-2 bg-amber-50 rounded-lg text-xs text-[#B45309] flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{budget.status_warning}</span>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#D9D9D4] space-y-3 animate-fadeIn">
          <div className="flex flex-wrap gap-2.5 sm:gap-3 text-xs">
            <div className="p-2.5 bg-[#EBEBE7]/50 rounded-xl flex-1 min-w-[120px]">
              <span className="text-[#6B6B67] block">Remaining Budget</span>
              <span className={`font-bold text-sm tabular-nums mt-0.5 block ${
                budget.remaining < 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'
              }`}>
                {formatMoney(budget.remaining, currency)}
              </span>
            </div>
            <div className="p-2.5 bg-[#EBEBE7]/50 rounded-xl flex-1 min-w-[120px]">
              <span className="text-[#6B6B67] block">Daily Spending Avg</span>
              <span className="font-bold text-sm text-[#111111] tabular-nums mt-0.5 block">
                {formatMoney(budget.daily_average, currency)}/day
              </span>
            </div>
          </div>

          {/* Recent Expenses List */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B67] block mb-2">
              Recent Expenses in this Category
            </span>
            {budget.recent_expenses && budget.recent_expenses.length > 0 ? (
              <div className="space-y-1.5">
                {budget.recent_expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#EBEBE7]/30 gap-2"
                  >
                    <div className="truncate min-w-0">
                      <p className="font-medium text-[#111111] truncate">{exp.description}</p>
                      <span className="text-[10px] text-[#6B6B67]">{formatDate(exp.date)}</span>
                    </div>
                    <span className="font-semibold text-[#B91C1C] tabular-nums shrink-0">
                      -{formatMoney(exp.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B6B67] italic">No expenses recorded for this month yet.</p>
            )}
          </div>

          {onViewCategory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewCategory(budget.category_id);
              }}
              className="w-full mt-1 py-1.5 text-xs text-[#2563EB] hover:text-[#111111] font-semibold text-center hover:bg-[#EBEBE7] rounded-lg transition-colors cursor-pointer"
            >
              View all transactions in {budget.category_name} &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. SAVINGS GOAL CARD (Interactive & Expandable)
// ==========================================
interface SavingsGoalCardProps {
  goal: SavingsGoal;
  currency: string;
  onAddContribution: (goal: SavingsGoal) => void;
}

export const SavingsGoalCard: React.FC<SavingsGoalCardProps> = ({ goal, currency, onAddContribution }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      id={`savings-card-${goal.id}`}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      className={`bg-[#FFFFFF] border rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
        isExpanded ? 'border-[#2563EB] shadow-md' : 'border-[#D9D9D4] hover:border-[#111111]/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#111111] truncate">{goal.name}</h3>
          <span className="text-xs text-[#6B6B67] truncate block">
            {formatMoney(goal.current_amount, currency)} of {formatMoney(goal.target_amount, currency)}
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-bold text-[#15803D] bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
            {goal.percentage}%
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6B6B67]" /> : <ChevronDown className="w-4 h-4 text-[#6B6B67]" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-full bg-[#EBEBE7] rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#15803D] transition-all duration-300"
          style={{ width: `${Math.min(100, goal.percentage)}%` }}
        />
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#D9D9D4] space-y-3 animate-fadeIn">
          <div className="flex flex-wrap gap-2.5 sm:gap-3 text-xs">
            <div className="p-2.5 bg-[#EBEBE7]/50 rounded-xl flex-1 min-w-[120px]">
              <span className="text-[#6B6B67] block">Remaining Needed</span>
              <span className="font-bold text-sm text-[#111111] tabular-nums mt-0.5 block">
                {formatMoney(goal.remaining, currency)}
              </span>
            </div>
            <div className="p-2.5 bg-[#EBEBE7]/50 rounded-xl flex-1 min-w-[120px]">
              <span className="text-[#6B6B67] block">Target Date</span>
              <span className="font-bold text-sm text-[#111111] mt-0.5 block">
                {goal.target_date ? formatDate(goal.target_date) : 'Flexible'}
              </span>
            </div>
          </div>

          {goal.description && (
            <p className="text-xs text-[#6B6B67] bg-[#EBEBE7]/30 p-2 rounded-lg">
              {goal.description}
            </p>
          )}

          {/* Contributions list */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B67] block mb-1.5">
              Recent Deposits
            </span>
            {goal.contributions && goal.contributions.length > 0 ? (
              <div className="space-y-1">
                {goal.contributions.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#EBEBE7]/20">
                    <div>
                      <span className="font-medium text-[#111111]">{c.note || 'Deposit'}</span>
                      <span className="text-[10px] text-[#6B6B67] ml-2">{formatDate(c.date)}</span>
                    </div>
                    <span className="font-semibold text-[#15803D] tabular-nums">
                      +{formatMoney(c.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B6B67] italic">No deposits recorded yet.</p>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddContribution(goal);
            }}
            className="w-full py-2 px-3 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contribution</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. TRANSACTION ITEM ROW / CARD (Interactive)
// ==========================================
interface TransactionItemProps {
  transaction: Transaction;
  currency: string;
  onEdit: (trans: Transaction) => void;
  onDelete: (transId: string) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  currency,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isIncome = transaction.type === 'INCOME';

  return (
    <div
      id={`transaction-item-${transaction.id}`}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      className={`border rounded-xl transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
        isExpanded
          ? 'bg-[#FFFFFF] border-[#2563EB] shadow-sm'
          : 'bg-[#FFFFFF] border-[#D9D9D4] hover:bg-[#EBEBE7]/40'
      }`}
    >
      <div className="p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: transaction.category_color || '#6B7280' }}
          >
            {getCategoryIcon(transaction.category_icon, 'w-4 h-4 text-white')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111111] truncate">{transaction.description}</p>
            <div className="flex items-center space-x-2 text-[11px] text-[#6B6B67]">
              <span>{transaction.category_name}</span>
              <span>&bull;</span>
              <span>{formatDate(transaction.date)}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-3">
          <span className={`text-sm font-bold tabular-nums block ${
            isIncome ? 'text-[#15803D]' : 'text-[#111111]'
          }`}>
            {isIncome ? `+${formatMoney(transaction.amount, currency)}` : `-${formatMoney(transaction.amount, currency)}`}
          </span>
          <span className="text-[10px] text-[#6B6B67] capitalize">{transaction.payment_method}</span>
        </div>
      </div>

      {/* Expanded progressive disclosure panel */}
      {isExpanded && (
        <div className="px-4 pb-3.5 pt-2 border-t border-[#D9D9D4]/60 bg-[#EBEBE7]/20 text-xs animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            <div>
              <span className="text-[10px] text-[#6B6B67] uppercase font-semibold">Payment Method</span>
              <p className="text-xs font-medium text-[#111111]">{transaction.payment_method || 'Cash'}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#6B6B67] uppercase font-semibold">Category Type</span>
              <p className="text-xs font-medium text-[#111111]">{transaction.type}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#6B6B67] uppercase font-semibold">Logged On</span>
              <p className="text-xs font-medium text-[#111111]">{formatDate(transaction.created_at.split('T')[0])}</p>
            </div>
          </div>

          {transaction.notes && (
            <div className="mb-3 p-2 bg-[#FFFFFF] rounded-lg border border-[#D9D9D4]">
              <span className="text-[10px] text-[#6B6B67] uppercase font-semibold block mb-0.5">Notes & Context</span>
              <p className="text-xs text-[#111111]">{transaction.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(transaction);
              }}
              className="px-3 py-1.5 bg-[#EBEBE7] hover:bg-[#D9D9D4] text-[#111111] rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
              }}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#B91C1C] rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
