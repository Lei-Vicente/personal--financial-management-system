import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, TrendingUp, Trash2, Calendar, Target } from 'lucide-react';
import { User, SavingsGoal } from '../types.ts';
import { apiFetch, formatMoney } from '../utils.tsx';
import { SavingsGoalCard } from '../components/InteractiveCards.tsx';

interface SavingsViewProps {
  user: User;
  onOpenAddGoal: () => void;
  onOpenAddContribution: (goal: SavingsGoal) => void;
  dataVersion?: number;
  onDataChanged?: () => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  user,
  onOpenAddGoal,
  onOpenAddContribution,
  dataVersion,
  onDataChanged,
}) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/savings-goals');
      setGoals(res.goals || []);
    } catch (err) {
      console.error('Failed to load savings goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user, dataVersion]);

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!window.confirm(`Delete savings goal "${name}"?`)) return;
    try {
      await apiFetch(`/api/savings-goals/${id}`, { method: 'DELETE' });
      loadGoals();
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  // Metrics
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalRemaining = totalTarget - totalSaved;
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Savings Goals</h1>
          <p className="text-sm text-[#6B6B67] mt-1">
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

        {loading ? (
          <div className="py-16 text-center text-xs text-[#6B6B67]">Loading savings targets...</div>
        ) : goals.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-[#111111]">No savings goals created yet.</p>
            <p className="text-xs text-[#6B6B67]">
              Build your financial resilience by creating an emergency fund or milestone target.
            </p>
            <button
              onClick={onOpenAddGoal}
              className="px-4 py-2 bg-[#15803D] hover:bg-[#111111] text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Create First Goal
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
                />
                <button
                  type="button"
                  title="Delete goal"
                  onClick={() => handleDeleteGoal(g.id, g.name)}
                  className="absolute top-4 right-10 p-1 text-[#6B6B67] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
