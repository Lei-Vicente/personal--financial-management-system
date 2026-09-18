import React, { useState, useEffect } from 'react';
import { PieChart, Plus, AlertCircle, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import { User, Category, Budget } from '../types.ts';
import { apiFetch, formatMoney } from '../utils.tsx';
import { BudgetCard } from '../components/InteractiveCards.tsx';

interface BudgetsViewProps {
  user: User;
  categories: Category[];
  onOpenAddBudget: () => void;
  onNavigateToLedger: (categoryId?: string) => void;
  dataVersion?: number;
  onDataChanged?: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  user,
  categories,
  onOpenAddBudget,
  onNavigateToLedger,
  dataVersion,
  onDataChanged,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/budgets?month=${currentMonth}`);
      setBudgets(res.budgets || []);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [currentMonth, dataVersion]);

  const handleDeleteBudget = async (id: string, name: string) => {
    if (!window.confirm(`Delete monthly budget for ${name}?`)) return;
    try {
      await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' });
      loadBudgets();
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  // Aggregated totals
  const totalBudgeted = budgets.reduce((acc, b) => acc + b.budget_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  const warnings = budgets.filter((b) => b.status === 'WARNING' || b.status === 'CRITICAL' || b.status === 'EXCEEDED');

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Category Budgets</h1>
          <p className="text-sm text-[#6B6B67] mt-1">
            Monitor spending limits, pace your expenses, and avoid end-of-month surprises
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-[#6B6B67]" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="text-xs font-semibold text-[#111111] bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={onOpenAddBudget}
            className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Threshold Alert Notification Banners */}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#B45309]">
            <AlertCircle className="w-4 h-4" />
            <span>Budget Threshold Alerts ({warnings.length} categories need attention)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#111111]">
            {warnings.map((w) => (
              <div key={w.id} className="p-2 bg-white/80 rounded-lg flex items-center justify-between">
                <span className="font-semibold">{w.category_name}</span>
                <span className={`font-bold tabular-nums ${w.percentage >= 100 ? 'text-[#B91C1C]' : 'text-[#EA580C]'}`}>
                  {w.percentage}% spent ({formatMoney(w.spent, user.currency)} / {formatMoney(w.budget_amount, user.currency)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Budget Capacity Meter */}
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67]">
              Total Monthly Budget Utilization
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] tabular-nums">
                {formatMoney(totalSpent, user.currency)}
              </span>
              <span className="text-sm font-semibold text-[#6B6B67]">
                of {formatMoney(totalBudgeted, user.currency)} budgeted
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-xl font-bold tabular-nums ${
              overallPercentage >= 100 ? 'text-[#B91C1C]' : overallPercentage >= 85 ? 'text-[#EA580C]' : 'text-[#15803D]'
            }`}>
              {overallPercentage}%
            </span>
            <span className="text-xs text-[#6B6B67] block">
              {totalRemaining >= 0 ? `${formatMoney(totalRemaining, user.currency)} remaining` : `${formatMoney(Math.abs(totalRemaining), user.currency)} over budget`}
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-[#EBEBE7] rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overallPercentage >= 100 ? 'bg-[#B91C1C]' : overallPercentage >= 85 ? 'bg-[#EA580C]' : 'bg-[#15803D]'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>
      </div>

      {/* Grid of Category Budgets */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B6B67] mb-3">
          Category Allocations
        </h2>

        {loading ? (
          <div className="py-16 text-center text-xs text-[#6B6B67]">Loading budget allocations...</div>
        ) : budgets.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-[#111111]">No category budgets set for this month.</p>
            <p className="text-xs text-[#6B6B67]">
              Define spending limits for food, transport, bills, and entertainment to track budget adherence.
            </p>
            <button
              onClick={onOpenAddBudget}
              className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Set First Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            {budgets.map((b) => (
              <div key={b.id} className="relative group">
                <BudgetCard
                  budget={b}
                  currency={user.currency}
                  onViewCategory={onNavigateToLedger}
                />
                <button
                  type="button"
                  title="Delete budget"
                  onClick={() => handleDeleteBudget(b.id, b.category_name)}
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
