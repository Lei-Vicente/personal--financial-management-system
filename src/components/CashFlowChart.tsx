import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { Transaction } from '../types.ts';
import { formatMoney } from '../utils.tsx';

interface CashFlowChartProps {
  transactions: Transaction[];
  currency: string;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions, currency }) => {
  const data = useMemo(() => {
    // 1. Group by date string (YYYY-MM-DD)
    const grouped = transactions.reduce((acc, t) => {
      const date = t.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') acc[date].income += t.amount;
      if (t.type === 'EXPENSE') acc[date].expense += t.amount;
      return acc;
    }, {} as Record<string, { date: string, income: number, expense: number }>);

    // 2. Sort chronologically
    const sorted = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    
    // 3. Format for recharts
    return sorted.map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="h-64 bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl flex items-center justify-center text-xs text-[#6B6B67] shadow-xs">
        Not enough transaction data to generate chart.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111111] text-white p-3 rounded-xl shadow-xl text-xs font-semibold border border-white/10 z-50 font-sans">
          <p className="text-[#A3A3A0] mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="flex justify-between items-center gap-6 mt-1.5">
              <span className="text-[#D9D9D4] capitalize flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }}></span>
                {p.name}
              </span>
              <span className="tabular-nums">{formatMoney(p.value, currency)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs premium-card h-full flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D4]/60 mb-5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#111111] text-white flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base font-bold text-[#111111] tracking-tight">Cash Flow Overview</h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-[#6B6B67] uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#111111]"></span> Income</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#A3A3A0]"></span> Expenses</div>
        </div>
      </div>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%" className="absolute inset-0">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111111" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A3A3A0" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#A3A3A0" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEBE7" />
            <XAxis 
              dataKey="displayDate" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B6B67', fontSize: 10, fontWeight: 500, fontFamily: 'inherit' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B6B67', fontSize: 10, fontWeight: 500, fontFamily: 'inherit' }}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : value}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: '#D9D9D4', strokeWidth: 1, strokeDasharray: '4 4' }} 
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="income" 
              name="Income"
              stroke="#111111" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorIncome)" 
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              name="Expense"
              stroke="#A3A3A0" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorExpense)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
