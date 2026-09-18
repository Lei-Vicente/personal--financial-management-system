import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import { User, Category } from '../types.ts';
import { apiFetch, formatMoney, downloadCsvFile } from '../utils.tsx';

interface ReportsViewProps {
  user: User;
  categories: Category[];
  dataVersion?: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ user, categories, dataVersion }) => {
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/summary?type=${reportType}&month=${selectedMonth}&year=${selectedYear}`);
      setSummary(res);
    } catch (err) {
      console.error('Failed to load report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
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
      await downloadCsvFile(`/api/reports/csv?${params.toString()}`, `report_${reportType}_${reportType === 'monthly' ? selectedMonth : selectedYear}.csv`);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Financial Reports</h1>
          <p className="text-sm text-[#6B6B67] mt-1">
            Structured financial statements, expense analysis, and printable ledger summaries
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:bg-[#EBEBE7] text-[#111111] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Period Selection Bar */}
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

      {/* Report Document Sheet (Print-optimized) */}
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

        {loading ? (
          <div className="py-16 text-center text-xs text-[#6B6B67]">Calculating statement summary...</div>
        ) : !summary ? (
          <div className="py-16 text-center text-xs text-[#6B6B67]">No data available for this period.</div>
        ) : (
          <>
            {/* High-Level Financial Summary */}
            <div className="flex flex-wrap items-stretch gap-4">
              <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Total Inflow</span>
                <span className="text-xl font-bold text-[#15803D] tabular-nums mt-1 block whitespace-nowrap">
                  +{formatMoney(summary.total_income || 0, user.currency)}
                </span>
              </div>

              <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Total Outflow</span>
                <span className="text-xl font-bold text-[#B91C1C] tabular-nums mt-1 block whitespace-nowrap">
                  -{formatMoney(summary.total_expense || 0, user.currency)}
                </span>
              </div>

              <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Net Savings</span>
                <span className={`text-xl font-bold tabular-nums mt-1 block whitespace-nowrap ${
                  (summary.net_savings || 0) >= 0 ? 'text-[#111111]' : 'text-[#B91C1C]'
                }`}>
                  {formatMoney(summary.net_savings || 0, user.currency, true)}
                </span>
              </div>

              <div className="p-4 bg-[#EBEBE7]/40 rounded-xl border border-[#D9D9D4]/60 flex-1 min-w-[140px]">
                <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Savings Rate</span>
                <span className="text-xl font-bold text-[#111111] tabular-nums mt-1 block whitespace-nowrap">
                  {summary.savings_rate || 0}%
                </span>
              </div>
            </div>

            {/* Key Findings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl space-y-1">
                <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider">Top Spending Category</span>
                <p className="text-lg font-bold text-[#111111]">
                  {summary.top_category ? `${summary.top_category.name} (${formatMoney(summary.top_category.total, user.currency)})` : 'None'}
                </p>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl space-y-1">
                <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider">Largest Single Outflow</span>
                <p className="text-lg font-bold text-[#B91C1C]">
                  {summary.largest_expense ? `${summary.largest_expense.description} (-${formatMoney(summary.largest_expense.amount, user.currency)})` : 'None'}
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
                    {summary.category_breakdown && summary.category_breakdown.length > 0 ? (
                      summary.category_breakdown.map((row: any) => (
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
  );
};
