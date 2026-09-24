import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Download,
  Printer,
  Calendar,
  Tag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { User, Category, DashboardAnalytics } from '../types.ts';
import { apiFetch, apiFetchCached, getCachedData, formatMoney, getCategoryIcon, downloadCsvFile } from '../utils.tsx';
import { SpendingChart } from '../components/SpendingChart.tsx';

interface AnalyticsViewProps {
  user: User;
  categories?: Category[];
  dataVersion?: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ user, categories, dataVersion }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'statement'>('analytics');

  // Analytics data
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(() => getCachedData('/api/analytics/dashboard'));
  const [analyticsLoading, setAnalyticsLoading] = useState(() => !getCachedData('/api/analytics/dashboard'));

  // Statement report data
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  const reportUrl = `/api/reports/summary?type=${reportType}&month=${selectedMonth}&year=${selectedYear}`;
  const [statement, setStatement] = useState<any>(() => getCachedData(reportUrl));
  const [statementLoading, setStatementLoading] = useState(() => !getCachedData(reportUrl));

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await apiFetchCached<DashboardAnalytics>('/api/analytics/dashboard');
        setAnalytics(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    loadAnalytics();
  }, [user, dataVersion]);

  useEffect(() => {
    const loadStatement = async () => {
      if (!statement) setStatementLoading(true);
      try {
        const res = await apiFetchCached<any>(reportUrl);
        setStatement(res);
      } catch (err) {
        console.error('Failed to load statement report:', err);
      } finally {
        setStatementLoading(false);
      }
    };
    loadStatement();
  }, [reportType, selectedMonth, selectedYear, dataVersion]);

  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (reportType === 'monthly') {
        params.append('start_date', `${selectedMonth}-01`);
        const [y, m] = selectedMonth.split('-').map(Number);
        const days = new Date(y, m, 0).getDate();
        params.append('end_date', `${selectedMonth}-${String(days).padStart(2, '0')}`);
      } else {
        params.append('start_date', `${selectedYear}-01-01`);
        params.append('end_date', `${selectedYear}-12-31`);
      }
      await downloadCsvFile(`/api/reports/csv?${params.toString()}`, `financial_statement_${reportType}_${reportType === 'monthly' ? selectedMonth : selectedYear}.csv`);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalExpense = analytics?.expense?.current_month || 0;
  const totalIncome = analytics?.income?.current_month || 0;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header & Unified Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-sm text-[#6B6B67] mt-1">
            Cashflow analytics, spending trajectories, and structured financial statements
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {activeTab === 'statement' && (
            <>
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:bg-[#EBEBE7] text-[#111111] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="px-3.5 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          {/* Sub-view Segmented Tabs */}
          <div className="inline-flex p-1 bg-[#EBEBE7] rounded-xl">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[#FFFFFF] text-[#111111] shadow-xs'
                  : 'text-[#6B6B67] hover:text-[#111111]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Cashflow & Trends</span>
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'statement'
                  ? 'bg-[#FFFFFF] text-[#111111] shadow-xs'
                  : 'text-[#6B6B67] hover:text-[#111111]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Statements & Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CASHFLOW & TRENDS TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI Summary Cards */}
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
                Target benchmark is 20%+ for healthy financial accumulation.
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
                Average daily burn: {formatMoney(totalExpense / 30, user.currency)}/day.
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

          {/* Dynamic 6-Month Income vs Expense Chart */}
          <SpendingChart currency={user.currency} />

          {/* Category Spending Breakdown */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-5">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-base font-bold text-[#111111] tracking-tight">Category Spending Distribution</h2>
              </div>
              <span className="text-xs text-[#6B6B67] font-medium">Current Month</span>
            </div>

            {analyticsLoading ? (
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
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: cat.color || '#2563EB' }}
                        >
                          {getCategoryIcon(cat.icon, 'w-3.5 h-3.5 text-white')}
                        </div>
                        <span className="font-semibold text-[#111111]">{cat.name}</span>
                        <span className="text-[10px] text-[#6B6B67]">({cat.count} items)</span>
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
      )}

      {/* ======================================================== */}
      {/* 2. STATEMENTS & LEDGER TAB (Merged from ReportsView)   */}
      {/* ======================================================== */}
      {activeTab === 'statement' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Period Selection Control Bar */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="inline-flex p-1 bg-[#EBEBE7] rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setReportType('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  reportType === 'monthly' ? 'bg-[#FFFFFF] text-[#111111] shadow-xs' : 'text-[#6B6B67]'
                }`}
              >
                Monthly Statement
              </button>
              <button
                onClick={() => setReportType('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  reportType === 'yearly' ? 'bg-[#FFFFFF] text-[#111111] shadow-xs' : 'text-[#6B6B67]'
                }`}
              >
                Annual Statement
              </button>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {reportType === 'monthly' ? (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="py-1.5 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs font-semibold text-[#111111]"
                />
              ) : (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="py-1.5 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs font-semibold text-[#111111]"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={String(y)}>
                      Year {y}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Statement Document Sheet */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 sm:p-10 shadow-xs space-y-8 print:border-none print:shadow-none print:p-0">
            {/* Document Header */}
            <div className="flex items-start justify-between border-b border-[#D9D9D4] pb-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#2563EB]">Financial Statement</span>
                <h2 className="text-2xl font-black text-[#111111] mt-1">
                  {reportType === 'monthly' ? `Statement for ${selectedMonth}` : `Annual Statement ${selectedYear}`}
                </h2>
                <p className="text-xs text-[#6B6B67] mt-1">
                  Account Holder: {user.full_name} ({user.email})
                </p>
              </div>
              <div className="text-right text-xs text-[#6B6B67]">
                <p>Generated on</p>
                <p className="font-semibold text-[#111111]">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {statementLoading ? (
              <div className="py-16 text-center text-xs text-[#6B6B67]">Calculating statement summary...</div>
            ) : !statement ? (
              <div className="py-16 text-center text-xs text-[#6B6B67]">No data available for this period.</div>
            ) : (
              <>
                {/* High-Level Financial Summary */}
                <div className="flex flex-wrap items-stretch gap-4">
                  <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                    <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Total Inflow</span>
                    <span className="text-xl font-bold text-[#15803D] tabular-nums mt-1 block whitespace-nowrap">
                      +{formatMoney(statement.total_income || 0, user.currency)}
                    </span>
                  </div>

                  <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                    <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Total Outflow</span>
                    <span className="text-xl font-bold text-[#B91C1C] tabular-nums mt-1 block whitespace-nowrap">
                      -{formatMoney(statement.total_expense || 0, user.currency)}
                    </span>
                  </div>

                  <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                    <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Net Savings</span>
                    <span className={`text-xl font-bold tabular-nums mt-1 block whitespace-nowrap ${
                      (statement.net_savings || 0) >= 0 ? 'text-[#111111]' : 'text-[#B91C1C]'
                    }`}>
                      {formatMoney(statement.net_savings || 0, user.currency, true)}
                    </span>
                  </div>

                  <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                    <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Savings Rate</span>
                    <span className="text-xl font-bold text-[#111111] tabular-nums mt-1 block whitespace-nowrap">
                      {statement.savings_rate || 0}%
                    </span>
                  </div>
                </div>

                {/* Key Findings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider">Top Spending Category</span>
                    <p className="text-lg font-bold text-[#111111]">
                      {statement.top_category ? `${statement.top_category.name} (${formatMoney(statement.top_category.total, user.currency)})` : 'None'}
                    </p>
                  </div>

                  <div className="p-4 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider">Largest Single Outflow</span>
                    <p className="text-lg font-bold text-[#B91C1C]">
                      {statement.largest_expense ? `${statement.largest_expense.description} (-${formatMoney(statement.largest_expense.amount, user.currency)})` : 'None'}
                    </p>
                  </div>
                </div>

                {/* Category Breakdown Table */}
                <div>
                  <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-3">
                    Category Spending Ledger
                  </h3>
                  <div className="border border-[#D9D9D4] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#EBEBE7] text-[#111111] font-semibold border-b border-[#D9D9D4]">
                        <tr>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-center">Transactions</th>
                          <th className="py-2.5 px-4 text-right">Total Outflow</th>
                          <th className="py-2.5 px-4 text-right">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9D9D4]">
                        {statement.category_breakdown && statement.category_breakdown.length > 0 ? (
                          statement.category_breakdown.map((row: any) => (
                            <tr key={row.name} className="hover:bg-[#EBEBE7]/30">
                              <td className="py-2.5 px-4 font-medium text-[#111111]">{row.name}</td>
                              <td className="py-2.5 px-4 text-center text-[#6B6B67]">{row.count}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-[#B91C1C] tabular-nums">
                                -{formatMoney(row.total, user.currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right text-[#6B6B67] tabular-nums font-semibold">
                                {row.percentage}%
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-[#6B6B67] italic">
                              No category expenditures recorded in this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
