import React, { useState, useEffect } from 'react';
import { SpendingChartPoint } from '../types.ts';
import { apiFetch, formatMoney } from '../utils.tsx';
import { ArrowUpRight, ArrowDownRight, Calendar, BarChart2 } from 'lucide-react';

interface SpendingChartProps {
  currency: string;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ currency }) => {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [data, setData] = useState<SpendingChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<SpendingChartPoint | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/analytics/spending-overview?range=${range}`);
        if (isMounted) {
          setData(res.data || []);
          if (res.data && res.data.length > 0) {
            setHoveredPoint(res.data[res.data.length - 1]);
          }
        }
      } catch (err) {
        console.error('Failed to load spending overview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [range]);

  // Compute maximum for chart scaling
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1000);
  const totalIncome = data.reduce((acc, d) => acc + d.income, 0);
  const totalExpense = data.reduce((acc, d) => acc + d.expense, 0);

  return (
    <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 shadow-xs">
      {/* Header with Title & Range Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9D9D4]/60">
        <div>
          <h2 className="text-base font-bold text-[#111111] tracking-tight flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-[#2563EB]" />
            <span>Spending Overview</span>
          </h2>
          <p className="text-xs text-[#6B6B67] mt-0.5">
            Cashflow dynamics across {range} time intervals
          </p>
        </div>

        {/* Range Buttons */}
        <div className="inline-flex p-1 bg-[#EBEBE7] rounded-xl self-start sm:self-auto">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
            <button
              key={r}
              id={`range-btn-${r}`}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                range === r
                  ? 'bg-[#FFFFFF] text-[#111111] shadow-xs'
                  : 'text-[#6B6B67] hover:text-[#111111]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Sub-header */}
      <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-[#D9D9D4]/40">
        <div>
          <span className="text-[11px] text-[#6B6B67] font-medium block">Period Inflow</span>
          <span className="text-sm sm:text-base font-bold text-[#15803D] tabular-nums block">
            +{formatMoney(totalIncome, currency)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#6B6B67] font-medium block">Period Outflow</span>
          <span className="text-sm sm:text-base font-bold text-[#B91C1C] tabular-nums block">
            -{formatMoney(totalExpense, currency)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[11px] text-[#6B6B67] font-medium block">Net Cashflow</span>
          <span className={`text-sm sm:text-base font-bold tabular-nums block ${
            totalIncome - totalExpense >= 0 ? 'text-[#111111]' : 'text-[#B91C1C]'
          }`}>
            {formatMoney(totalIncome - totalExpense, currency, true)}
          </span>
        </div>
      </div>

      {/* Interactive Chart Visualizer */}
      <div className="mt-6">
        {loading ? (
          <div className="h-56 flex items-center justify-center text-xs text-[#6B6B67]">
            Loading spending analytics...
          </div>
        ) : data.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-xs text-[#6B6B67] italic">
            No transactions found for this time period.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active inspection banner */}
            {hoveredPoint && (
              <div className="p-3 bg-[#EBEBE7]/50 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                <span className="font-semibold text-[#111111] flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{hoveredPoint.label}</span>
                </span>
                <div className="flex items-center space-x-4">
                  <span className="text-[#15803D] font-bold tabular-nums">
                    Income: +{formatMoney(hoveredPoint.income, currency)}
                  </span>
                  <span className="text-[#B91C1C] font-bold tabular-nums">
                    Expense: -{formatMoney(hoveredPoint.expense, currency)}
                  </span>
                  <span className="text-[#111111] font-bold tabular-nums">
                    Net: {formatMoney(hoveredPoint.net, currency, true)}
                  </span>
                </div>
              </div>
            )}

            {/* Custom Bar Visualization */}
            <div className="h-48 flex items-end justify-between gap-2 pt-6 px-1">
              {data.map((point, index) => {
                const incomeH = maxVal > 0 ? (point.income / maxVal) * 100 : 0;
                const expenseH = maxVal > 0 ? (point.expense / maxVal) * 100 : 0;
                const isSelected = hoveredPoint?.label === point.label;

                return (
                  <div
                    key={index}
                    tabIndex={0}
                    role="button"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onClick={() => setHoveredPoint(point)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div className="w-full flex items-end justify-center space-x-1 h-36">
                      {/* Income Bar */}
                      <div
                        className={`w-1/2 max-w-[14px] rounded-t transition-all duration-200 ${
                          isSelected ? 'bg-[#15803D]' : 'bg-[#15803D]/70 group-hover:bg-[#15803D]'
                        }`}
                        style={{ height: `${Math.max(4, incomeH)}%` }}
                        title={`Income: +${point.income}`}
                      />
                      {/* Expense Bar */}
                      <div
                        className={`w-1/2 max-w-[14px] rounded-t transition-all duration-200 ${
                          isSelected ? 'bg-[#B91C1C]' : 'bg-[#B91C1C]/70 group-hover:bg-[#B91C1C]'
                        }`}
                        style={{ height: `${Math.max(4, expenseH)}%` }}
                        title={`Expense: -${point.expense}`}
                      />
                    </div>

                    <span className={`text-[10px] mt-2 block truncate max-w-full text-center ${
                      isSelected ? 'font-bold text-[#111111]' : 'text-[#6B6B67]'
                    }`}>
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 text-xs text-[#6B6B67] pt-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#15803D]" />
                <span>Income</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#B91C1C]" />
                <span>Expense</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
