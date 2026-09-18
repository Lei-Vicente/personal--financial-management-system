import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, PieChart, Wallet, Calendar } from 'lucide-react';
import { User, DashboardAnalytics } from '../types.ts';
import { apiFetch, formatMoney, getCategoryIcon } from '../utils.tsx';
import { SpendingChart } from '../components/SpendingChart.tsx';

interface AnalyticsViewProps {
  user: User;
  dataVersion?: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ user, dataVersion }) => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/analytics/dashboard');
        setAnalytics(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [user, dataVersion]);

  const totalExpense = analytics?.expense?.current_month || 0;
  const totalIncome = analytics?.income?.current_month || 0;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Financial Intelligence</h1>
        <p className="text-sm text-[#6B6B67] mt-1">
          In-depth cashflow analytics, category distribution, and savings efficiency
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67] block">
            Net Savings Rate
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111111] tabular-nums">
              {savingsRate}%
            </span>
            <span className="text-xs text-[#15803D] font-medium">of monthly inflow</span>
          </div>
          <p className="text-[11px] text-[#6B6B67] mt-2">
            Target benchmark is 20%+ for healthy wealth accumulation.
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67] block">
            Monthly Run Rate
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111111] tabular-nums">
              {formatMoney(totalExpense, user.currency)}
            </span>
            <span className="text-xs text-[#6B6B67] font-medium">outflow</span>
          </div>
          <p className="text-[11px] text-[#6B6B67] mt-2">
            Average daily expenditure: {formatMoney(totalExpense / 30, user.currency)}/day.
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B67] block">
            Cash Inflow vs Outflow
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold tabular-nums ${netSavings >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
              {formatMoney(netSavings, user.currency, true)}
            </span>
            <span className="text-xs text-[#6B6B67] font-medium">net</span>
          </div>
          <p className="text-[11px] text-[#6B6B67] mt-2">
            Inflow: +{formatMoney(totalIncome, user.currency)} | Outflow: -{formatMoney(totalExpense, user.currency)}
          </p>
        </div>
      </div>

      {/* Spending Overview Dynamic Chart */}
      <SpendingChart currency={user.currency} />

      {/* Category Breakdown Section */}
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-5">
          <div className="flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#111111] tracking-tight">Category Spending Distribution</h2>
          </div>
          <span className="text-xs text-[#6B6B67] font-medium">Current Month</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#6B6B67]">Analyzing category metrics...</div>
        ) : !analytics?.category_breakdown || analytics.category_breakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B6B67] italic">
            No categorized expenses recorded for this month.
          </div>
        ) : (
          <div className="space-y-4">
            {analytics.category_breakdown.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color || '#2563EB' }}
                    >
                      {getCategoryIcon(cat.icon, 'w-3.5 h-3.5 text-white')}
                    </div>
                    <span className="font-semibold text-[#111111]">{cat.name}</span>
                    <span className="text-[10px] text-[#6B6B67]">({cat.count} transactions)</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-[#111111] tabular-nums">
                      {formatMoney(cat.total, user.currency)}
                    </span>
                    <span className="text-xs font-semibold text-[#6B6B67] w-10 text-right tabular-nums">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress share bar */}
                <div className="w-full bg-[#EBEBE7] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color || '#2563EB',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
