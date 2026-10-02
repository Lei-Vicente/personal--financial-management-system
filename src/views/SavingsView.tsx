import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, TrendingUp, Trash2, Calendar, Target } from 'lucide-react';
import { User, SavingsGoal, Account } from '../types.ts';
import { apiFetch, apiFetchFresh, apiFetchCached, getCachedData, formatMoney , useDataVersion, notifyDataChanged } from '../utils.tsx';
import { SavingsGoalCard } from '../components/InteractiveCards.tsx';
import { WalletSection } from '../components/WalletSection.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';

interface SavingsViewProps {
  user: User;
  onOpenAddGoal: () => void;
  onOpenAddContribution: (goal: SavingsGoal) => void;
  onOpenAddWallet?: () => void;
  accounts?: Account[];
  highlightedAccountId?: string | null;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  user,
  onOpenAddGoal,
  onOpenAddContribution,
  onOpenAddWallet,
  accounts,
  highlightedAccountId,
}) => {
  const [goals, setGoals] = useState<SavingsGoal[]>(() => getCachedData<any>('/api/savings-goals')?.goals || []);
  const [loading, setLoading] = useState(() => !getCachedData('/api/savings-goals'));

  const loadGoals = async () => {
    try {
      const res = await apiFetchFresh<any>('/api/savings-goals');
      setGoals(res.goals || []);
    } catch (err) {
      console.error('Failed to load savings goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user]);

  // Confirm dialog state
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

  const handleDeleteGoal = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Savings Target',
      message: `Are you sure you want to remove "${name}"? Existing logged deposits will remain intact in your ledger.`,
      confirmLabel: 'Delete Target',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        // Optimistic delete
        setGoals(prev => prev.filter(g => g.id !== id));
        try {
          await apiFetch(`/api/savings-goals/${id}`, { method: 'DELETE' });
          loadGoals();
          notifyDataChanged();
        } catch (err) {
          console.error('Failed to delete goal:', err);
          loadGoals();
        }
      },
    });
  };

  // Metrics
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalRemaining = totalTarget - totalSaved;
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-10 animate-fadeIn pb-16">
      {/* Wallets & Liquid Savings Accounts */}
      <WalletSection
        user={user}
        onOpenAddWallet={onOpenAddWallet}
        accounts={accounts}
        highlightedAccountId={highlightedAccountId}
        isPrimaryHeader={true}
      />

      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-lg font-bold text-[#111111] tracking-tight">
              Savings Goals
            </h2>
          </div>
          <p className="text-xs text-[#6B6B67] mt-1.5">
            Track emergency reserves, asset purchases, and long-term milestones
          </p>
        </div>

        <button
          id="create-savings-goal-btn"
          onClick={onOpenAddGoal}
          className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Savings Goal</span>
        </button>
      </div>



      {/* Aggregate Overview Banner */}
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67]">
              Total Portfolio Savings
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#15803D] tabular-nums">
                {formatMoney(totalSaved, user.currency)}
              </span>
              <span className="text-sm font-semibold text-[#6B6B67]">
                of {formatMoney(totalTarget, user.currency)} targeted
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-bold text-[#15803D] tabular-nums">
              {overallPercentage}%
            </span>
            <span className="text-xs text-[#6B6B67] block">
              {formatMoney(Math.max(0, totalRemaining), user.currency)} remaining
            </span>
          </div>
        </div>

        <div className="w-full bg-[#EBEBE7] rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#15803D] transition-all duration-300"
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>
      </div>

      {/* Grid of Goals */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B6B67] mb-3">
          Active Targets ({goals.length})
        </h2>

        {loading && goals.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-[#D9D9D4] rounded-2xl p-6 h-48 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-5 w-36 bg-gray-200 rounded"></div>
                  <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-8 w-44 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-100 rounded-full mb-3"></div>
                <div className="h-4 w-28 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-12 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EBEBE7] flex items-center justify-center mx-auto text-[#6B6B67]">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111]">No savings goals created yet</p>
              <p className="text-xs text-[#6B6B67] mt-1 max-w-sm mx-auto leading-relaxed">
                Build your financial resilience and track milestones by creating an emergency reserve, house deposit, or investment fund.
              </p>
            </div>
            <button
              onClick={onOpenAddGoal}
              className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] active:scale-[0.98] text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Goal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            {goals.map((g) => (
              <div key={g.id} className="relative group">
                <SavingsGoalCard
                  goal={g}
                  currency={user.currency}
                  onAddContribution={onOpenAddContribution}
                  onDelete={() => handleDeleteGoal(g.id, g.name)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
};
