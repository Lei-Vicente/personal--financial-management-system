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
import { User, Category, Transaction, Budget, SavingsGoal, DashboardAnalytics, Bill, Account } from '../types.ts';
import { apiFetch, apiFetchFresh, apiFetchCached, getCachedData, formatMoney, formatDate , useDataVersion, notifyDataChanged } from '../utils.tsx';
import { BalanceCard, IncomeCard, ExpenseCard, BudgetCard, SavingsGoalCard, TransactionItem } from '../components/InteractiveCards.tsx';
import { CashFlowChart } from '../components/CashFlowChart.tsx';
import { WalletSection } from '../components/WalletSection.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { MetricCardSkeleton, ChartSkeleton, SectionSkeleton } from '../components/Skeletons.tsx';
import { motion } from 'motion/react';

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "tween", ease: "easeOut", duration: 0.4 } }
};

interface DashboardViewProps {
  user: User;
  categories: Category[];
  accounts?: Account[];
  highlightedAccountId?: string | null;
  onNavigate: (tab: any, filter?: { type?: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'; categoryId?: string }) => void;
  onOpenAddTransaction: (type?: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
  onOpenAddBudget: () => void;
  onOpenAddSavings: () => void;
  onOpenAddContribution: (goal: SavingsGoal) => void;
  onOpenAddBill?: () => void;
  onOpenAddWallet?: () => void;
  onEditTransaction: (trans: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  categories,
  accounts,
  highlightedAccountId,
  onNavigate,
  onOpenAddTransaction,
  onOpenAddBudget,
  onOpenAddSavings,
  onOpenAddContribution,
  onOpenAddBill,
  onOpenAddWallet,
  onEditTransaction,
}) => {
  // Synchronous cache initialization for instantaneous 0ms rendering
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(() => getCachedData('/api/analytics/dashboard'));
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(() => getCachedData<any>('/api/transactions?limit=30')?.transactions || []);
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
        apiFetchFresh<DashboardAnalytics>('/api/analytics/dashboard').catch(err => {
          console.error('Failed to load dashboard analytics:', err);
          return null;
        }),
        apiFetchFresh<any>('/api/transactions?limit=30').catch(() => ({ transactions: [] })),
        apiFetchFresh<any>('/api/budgets').catch(() => ({ budgets: [] })),
        apiFetchFresh<any>('/api/savings-goals').catch(() => ({ goals: [] })),
        apiFetchFresh<any>('/api/bills?status=unpaid').catch(() => ({ bills: [] })),
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (transRes?.transactions) setRecentTransactions(transRes.transactions);
      if (budgetsRes?.budgets) setBudgets(budgetsRes.budgets);
      if (savingsRes?.goals) setSavingsGoals(savingsRes.goals);
      if (billsRes?.bills) setUpcomingBills(billsRes.bills);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const dataVersion = useDataVersion();

  useEffect(() => {
    loadDashboardData();
  }, [user, dataVersion]);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleDeleteTransaction = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction permanently? This action cannot be undone.',
      confirmLabel: 'Delete Transaction',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        // Optimistic UI update: instantly remove from state
        setRecentTransactions(prev => prev.filter(t => t.id !== id));
        try {
          await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
          loadDashboardData();
          notifyDataChanged();
        } catch (err) {
          console.error('Failed to delete transaction:', err);
          loadDashboardData();
        }
      },
    });
  };

  const handlePayBill = (bill: Bill) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Bill Payment',
      message: `Mark "${bill.name}" (${formatMoney(bill.amount, user.currency)}) as paid and generate a corresponding expense entry?`,
      confirmLabel: 'Pay Bill',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiFetch(`/api/bills/${bill.id}/pay`, {
            method: 'POST',
            body: JSON.stringify({ create_transaction: true }),
          });
          loadDashboardData();
          notifyDataChanged();
        } catch (err) {
          console.error('Failed to pay bill:', err);
        }
      },
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Greeting with Intentional Action Hierarchy */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
            {getGreeting()}, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#6B6B67] mt-1">
            Here’s your financial overview and real-time cashflow status.
          </p>
        </div>
      </motion.div>

      {/* 2. Interactive Primary Metric Cards (Sections 11 & 12) */}
      {loading && !analytics ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
          <ChartSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
            <SectionSkeleton count={3} />
            <SectionSkeleton count={3} />
          </div>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <BalanceCard
              totalBalance={analytics?.balance?.total_balance || 0}
              changePct={analytics?.balance?.change_pct || 0}
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
          </motion.div>

          {/* Wallets & Liquid Savings Cards (Landbank, GoTyme, GCash, Cash on-hand, etc.) */}
          <motion.div variants={itemVariants}>
            <WalletSection
            user={user}
            
            
            onOpenAddWallet={onOpenAddWallet}
            accounts={accounts}
            highlightedAccountId={highlightedAccountId}
          />
          </motion.div>

          {/* Cash Flow Chart */}
          <motion.div variants={itemVariants} className="w-full">
            <CashFlowChart transactions={recentTransactions} currency={user.currency} />
          </motion.div>

          {/* 3. Two-Column Dashboard Section: Budgets & Savings Goals */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {/* Monthly Budgets */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
                  <PieChart className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-base font-bold text-[#111111] tracking-tight">Category Budgets</h2>
              </div>
              <div className="flex items-center space-x-2">

                <button
                  onClick={() => onNavigate('budgets')}
                  className="text-xs text-[#111111] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {budgets.length === 0 ? (
              <EmptyState
                icon={PieChart}
                title="No budgets created yet"
                description="Create a monthly budget to understand where your money is going."
                actionLabel="Create First Budget"
                onAction={onOpenAddBudget}
                className="shadow-none border-none bg-transparent py-6"
              />
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
                className="w-full group/btn relative overflow-hidden py-2.5 bg-[#F5F5F3] dark:bg-[#2A2A28] border border-[#D9D9D4] dark:border-[#333330] rounded-xl transition-all hover:bg-[#111111] dark:hover:bg-white hover:border-[#111111] dark:hover:border-white cursor-pointer active:scale-[0.98]"
              >
                <div className="relative z-10 flex items-center justify-center space-x-1.5 text-[#111111] dark:text-[#F5F5F3] group-hover/btn:text-white dark:group-hover/btn:text-[#111111]">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Add Another Category Budget</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Savings Goals */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
                  <PiggyBank className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-base font-bold text-[#111111] tracking-tight">Savings Goals</h2>
              </div>
              <button
                onClick={() => onNavigate('savings')}
                className="text-xs text-[#111111] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {savingsGoals.length === 0 ? (
              <EmptyState
                icon={PiggyBank}
                title="No savings goals yet"
                description="Set a target for an emergency fund, travel, or major purchase."
                actionLabel="Create Savings Goal"
                onAction={onOpenAddSavings}
                className="shadow-none border-none bg-transparent py-6"
              />
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
                className="w-full group/btn relative overflow-hidden py-2.5 bg-[#F5F5F3] dark:bg-[#2A2A28] border border-[#D9D9D4] dark:border-[#333330] rounded-xl transition-all hover:bg-[#111111] dark:hover:bg-white hover:border-[#111111] dark:hover:border-white cursor-pointer active:scale-[0.98]"
              >
                <div className="relative z-10 flex items-center justify-center space-x-1.5 text-[#111111] dark:text-[#F5F5F3] group-hover/btn:text-white dark:group-hover/btn:text-[#111111]">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Create New Goal</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* 4. Upcoming Bills & Commitments */}
      <motion.div variants={itemVariants} className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Upcoming Bills</h2>
              {upcomingBills.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {upcomingBills.length} Due Soon
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">

            <button
              onClick={() => onNavigate('bills')}
              className="text-xs text-[#111111] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>{upcomingBills.length > 0 ? 'Manage bills' : 'View bills'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {upcomingBills.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="All Caught Up"
            description="No pending bills or obligations due soon. Add your recurring subscriptions or utilities."
            actionLabel="Add Bill"
            onAction={onOpenAddBill || (() => onNavigate('bills'))}
            className="shadow-none border-none bg-transparent py-6"
          />
        ) : (
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
                          : 'bg-[#F5F5F3] text-[#111111]'
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
        )}
      </motion.div>

      {/* 5. Recent Transactions Ledger (Section 13) */}
      <motion.div variants={itemVariants} className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                Recent Transactions
              </h2>
            </div>
            <p className="text-xs text-[#6B6B67] mt-1.5">
              Click any item to inspect details, notes, or modify
            </p>
          </div>

          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-[#111111] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>View full ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No transactions yet"
            description="Add your first income or expense to start tracking your finances with precision."
            actionLabel="Record First Transaction"
            onAction={() => onOpenAddTransaction('EXPENSE')}
            className="shadow-none border-none bg-transparent py-6"
          />
        ) : (
          <div className="space-y-2">
            {recentTransactions.slice(0, 6).map((t) => (
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
      </motion.div>
        </motion.div>
      )}
      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
