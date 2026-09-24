import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PieChart,
  PiggyBank,
  ArrowRight,
  Plus,
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { User, Category, Transaction, Budget, SavingsGoal, DashboardAnalytics, Bill } from '../types.ts';
import { apiFetch, apiFetchCached, getCachedData, formatMoney, formatDate } from '../utils.tsx';
import { BalanceCard, IncomeCard, ExpenseCard, BudgetCard, SavingsGoalCard, TransactionItem } from '../components/InteractiveCards.tsx';
import { WalletSection } from '../components/WalletSection.tsx';

interface DashboardViewProps {
  user: User;
  categories: Category[];
  onNavigate: (tab: any, filter?: { type?: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'; categoryId?: string }) => void;
  onOpenAddTransaction: (type?: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
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
  // Synchronous cache initialization for instantaneous 0ms rendering
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(() => getCachedData('/api/analytics/dashboard'));
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(() => getCachedData<any>('/api/transactions?limit=6')?.transactions || []);
  const [budgets, setBudgets] = useState<Budget[]>(() => getCachedData<any>('/api/budgets')?.budgets || []);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => getCachedData<any>('/api/savings-goals')?.goals || []);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>(() => getCachedData<any>('/api/bills?status=unpaid')?.bills || []);
  const [loading, setLoading] = useState(() => !getCachedData('/api/analytics/dashboard'));

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    try {
      const [analyticsRes, transRes, budgetsRes, savingsRes, billsRes] = await Promise.all([
        apiFetchCached<DashboardAnalytics>('/api/analytics/dashboard'),
        apiFetchCached<any>('/api/transactions?limit=6'),
        apiFetchCached<any>('/api/budgets'),
        apiFetchCached<any>('/api/savings-goals'),
        apiFetchCached<any>('/api/bills?status=unpaid').catch(() => ({ bills: [] })),
      ]);

      setAnalytics(analyticsRes);
      setRecentTransactions(transRes.transactions || []);
      setBudgets(budgetsRes.budgets || []);
      setSavingsGoals(savingsRes.goals || []);
      setUpcomingBills(billsRes.bills || []);
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
    // Optimistic UI update: instantly remove from state
    setRecentTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      loadDashboardData();
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      loadDashboardData();
    }
  };

  const handlePayBill = async (bill: Bill) => {
    if (!window.confirm(`Mark "${bill.name}" (${formatMoney(bill.amount, user.currency)}) as paid?`)) return;
    try {
      await apiFetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ create_transaction: true }),
      });
      loadDashboardData();
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to pay bill:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* 1. Header & Greeting with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
            {getGreeting()}, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#6B6B67] mt-1">
            Here’s your financial overview and real-time cashflow status.
          </p>
        </div>

        {/* Quick Actions (Section 15) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenAddTransaction('EXPENSE')}
            className="px-3.5 py-2 bg-[#111111] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => onOpenAddTransaction('INCOME')}
            className="px-3.5 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:border-[#15803D] hover:text-[#15803D] text-[#111111] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => onOpenAddTransaction('TRANSFER')}
            className="px-3.5 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:border-[#2563EB] hover:text-[#2563EB] text-[#111111] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Primary Metric Cards (Sections 11 & 12) */}
      {loading && !analytics ? (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#D9D9D4] rounded-2xl p-6 h-36 flex flex-col justify-between shadow-xs">
                <div className="h-4 w-28 bg-gray-200 rounded"></div>
                <div className="h-9 w-36 bg-gray-200 rounded"></div>
                <div className="h-3.5 w-44 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
            <div className="bg-white border border-[#D9D9D4] rounded-2xl p-6 h-64 shadow-xs">
              <div className="h-5 w-36 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-16 bg-gray-100 rounded-xl"></div>
                <div className="h-16 bg-gray-100 rounded-xl"></div>
              </div>
            </div>
            <div className="bg-white border border-[#D9D9D4] rounded-2xl p-6 h-64 shadow-xs">
              <div className="h-5 w-36 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-16 bg-gray-100 rounded-xl"></div>
                <div className="h-16 bg-gray-100 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
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

          {/* Wallets & Liquid Savings Cards (Landbank, GoTyme, GCash, Cash on-hand, etc.) */}
          <WalletSection
            user={user}
            dataVersion={dataVersion}
            onDataChanged={onDataChanged}
          />

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

      {/* 4. Upcoming Bills & Commitments */}
      {upcomingBills.length > 0 && (
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
            <div className="flex items-center space-x-2">
              <CalendarClock className="w-4 h-4 text-[#D97706]" />
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Upcoming Bills</h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {upcomingBills.length} Due Soon
              </span>
            </div>
            <button
              onClick={() => onNavigate('bills')}
              className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {upcomingBills.slice(0, 3).map((bill) => {
              const daysUntil = Math.ceil(
                (new Date(bill.due_date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
              );
              const isOverdue = daysUntil < 0;
              const isDueToday = daysUntil === 0;

              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-xl border border-[#D9D9D4]/70 bg-[#F9F9F8] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[#111111]">{bill.name}</h4>
                      <p className="text-xs text-[#6B6B67] mt-0.5">{bill.category_name || 'Bill'}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-700'
                          : isDueToday
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {isOverdue ? `${Math.abs(daysUntil)}d Overdue` : isDueToday ? 'Due Today' : `In ${daysUntil}d`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#D9D9D4]/40">
                    <span className="text-sm font-bold text-[#111111]">
                      {formatMoney(bill.amount, user.currency)}
                    </span>
                    <button
                      onClick={() => handlePayBill(bill)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pay</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Recent Transactions Ledger (Section 13) */}
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
        </>
      )}
    </div>
  );
};
