import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PieChart,
  PiggyBank,
  ArrowRight,
  Plus
} from 'lucide-react';
import { User, Category, Transaction, Budget, SavingsGoal, DashboardAnalytics } from '../types.ts';
import { apiFetch } from '../utils.tsx';
import { BalanceCard, IncomeCard, ExpenseCard, BudgetCard, SavingsGoalCard, TransactionItem } from '../components/InteractiveCards.tsx';

interface DashboardViewProps {
  user: User;
  categories: Category[];
  onNavigate: (tab: any, filter?: { type?: 'ALL' | 'INCOME' | 'EXPENSE'; categoryId?: string }) => void;
  onOpenAddTransaction: (type?: 'INCOME' | 'EXPENSE') => void;
  onOpenAddBudget: () => void;
  onOpenAddSavings: () => void;
  onOpenAddContribution: (goal: SavingsGoal) => void;
  onEditTransaction: (trans: Transaction) => void;
  dataVersion?: number;
  onDataChanged?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  categories,
  onNavigate,
  onOpenAddTransaction,
  onOpenAddBudget,
  onOpenAddSavings,
  onOpenAddContribution,
  onEditTransaction,
  dataVersion,
  onDataChanged,
}) => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, transRes, budgetsRes, savingsRes] = await Promise.all([
        apiFetch('/api/analytics/dashboard'),
        apiFetch('/api/transactions?limit=6'),
        apiFetch('/api/budgets'),
        apiFetch('/api/savings-goals'),
      ]);

      setAnalytics(analyticsRes);
      setRecentTransactions(transRes.transactions || []);
      setBudgets(budgetsRes.budgets || []);
      setSavingsGoals(savingsRes.goals || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, dataVersion]);

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      loadDashboardData();
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* 1. Header & Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
          {getGreeting()}, {user.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-[#6B6B67] mt-1">
          Here’s your financial overview and real-time cashflow status.
        </p>
      </div>

      {/* 2. Interactive Primary Metric Cards (Sections 11 & 12) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <BalanceCard
          totalBalance={analytics?.balance?.total_balance || 0}
          changePct={analytics?.balance?.change_pct || 0}
          currentIncome={analytics?.income?.current_month || 0}
          currentExpense={analytics?.expense?.current_month || 0}
          currentNet={analytics?.balance?.current_net || 0}
          previousNet={analytics?.balance?.previous_net || 0}
          currency={user.currency}
        />

        <IncomeCard
          income={analytics?.income?.current_month || 0}
          changePct={analytics?.income?.change_pct || 0}
          currency={user.currency}
          onClick={() => onNavigate('transactions', { type: 'INCOME', categoryId: 'ALL' })}
        />

        <ExpenseCard
          expense={analytics?.expense?.current_month || 0}
          changePct={analytics?.expense?.change_pct || 0}
          largestCategory={analytics?.expense?.largest_category || null}
          currency={user.currency}
          onClick={() => onNavigate('transactions', { type: 'EXPENSE', categoryId: 'ALL' })}
        />
      </div>

      {/* 3. Two-Column Dashboard Section: Budgets & Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {/* Monthly Budgets */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-base font-bold text-[#111111] tracking-tight">Category Budgets</h2>
              </div>
              <button
                onClick={() => onNavigate('budgets')}
                className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-[#6B6B67]">
                  Create a monthly budget to understand where your money is going.
                </p>
                <button
                  onClick={onOpenAddBudget}
                  className="px-3.5 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Create First Budget
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.slice(0, 3).map((b) => (
                  <BudgetCard
                    key={b.id}
                    budget={b}
                    currency={user.currency}
                    onViewCategory={() => onNavigate('transactions')}
                  />
                ))}
              </div>
            )}
          </div>

          {budgets.length > 0 && (
            <div className="pt-4 mt-4 border-t border-[#D9D9D4]/40">
              <button
                onClick={onOpenAddBudget}
                className="w-full py-2 bg-[#EBEBE7] hover:bg-[#D9D9D4] text-[#111111] rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Category Budget</span>
              </button>
            </div>
          )}
        </div>

        {/* Savings Goals */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
              <div className="flex items-center space-x-2">
                <PiggyBank className="w-4 h-4 text-[#15803D]" />
                <h2 className="text-base font-bold text-[#111111] tracking-tight">Savings Goals</h2>
              </div>
              <button
                onClick={() => onNavigate('savings')}
                className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {savingsGoals.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-[#6B6B67]">
                  Set a target for an emergency fund, travel, or major purchase.
                </p>
                <button
                  onClick={onOpenAddSavings}
                  className="px-3.5 py-2 bg-[#15803D] hover:bg-[#111111] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Create Savings Goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savingsGoals.slice(0, 2).map((g) => (
                  <SavingsGoalCard
                    key={g.id}
                    goal={g}
                    currency={user.currency}
                    onAddContribution={onOpenAddContribution}
                  />
                ))}
              </div>
            )}
          </div>

          {savingsGoals.length > 0 && (
            <div className="pt-4 mt-4 border-t border-[#D9D9D4]/40">
              <button
                onClick={onOpenAddSavings}
                className="w-full py-2 bg-[#EBEBE7] hover:bg-[#D9D9D4] text-[#111111] rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Goal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Recent Transactions Ledger (Section 13) */}
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#111111] tracking-tight flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-[#2563EB]" />
              <span>Recent Transactions</span>
            </h2>
            <p className="text-xs text-[#6B6B67] mt-0.5">
              Click any item to inspect details, notes, or modify
            </p>
          </div>

          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>View full ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-[#111111]">No transactions yet.</p>
            <p className="text-xs text-[#6B6B67] max-w-sm mx-auto">
              Add your first income or expense to start tracking your finances with precision.
            </p>
            <button
              onClick={() => onOpenAddTransaction('EXPENSE')}
              className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Record First Transaction
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                currency={user.currency}
                onEdit={onEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
