import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  Calendar,
  Tag,
  AlertCircle
} from 'lucide-react';
import { User, Category, Transaction } from '../types.ts';
import { apiFetch, apiFetchCached, getCachedData, formatMoney, downloadCsvFile } from '../utils.tsx';
import { TransactionItem } from '../components/InteractiveCards.tsx';

interface TransactionsViewProps {
  user: User;
  categories: Category[];
  onOpenAddTransaction: (type?: 'INCOME' | 'EXPENSE') => void;
  onEditTransaction: (trans: Transaction) => void;
  initialFilter?: { type?: 'ALL' | 'INCOME' | 'EXPENSE'; categoryId?: string };
  dataVersion?: number;
  onDataChanged?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  user,
  categories,
  onOpenAddTransaction,
  onEditTransaction,
  initialFilter,
  dataVersion,
  onDataChanged,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => getCachedData<any>('/api/transactions?page=1&limit=15')?.transactions || []);
  const [loading, setLoading] = useState(() => !getCachedData('/api/transactions?page=1&limit=15'));
  const [total, setTotal] = useState<number>(() => {
    const cached = getCachedData<any>('/api/transactions?page=1&limit=15');
    return cached?.pagination?.total ?? cached?.total ?? 0;
  });

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>(initialFilter?.type || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState(initialFilter?.categoryId || 'ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 15;

  // React to initialFilter updates from other modules
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.type !== undefined) setTypeFilter(initialFilter.type);
      if (initialFilter.categoryId !== undefined) setCategoryFilter(initialFilter.categoryId);
      setPage(1);
    }
  }, [initialFilter]);

  const loadTransactions = async () => {
    if (transactions.length === 0) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (categoryFilter !== 'ALL') params.append('category_id', categoryFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const queryUrl = `/api/transactions?${params.toString()}`;
      const res = await apiFetchCached<any>(queryUrl);
      setTransactions(res.transactions || []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [search, typeFilter, categoryFilter, startDate, endDate, sortBy, sortOrder, page, dataVersion]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction permanently?')) return;
    // Optimistic UI update: instantly remove from list
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      loadTransactions();
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      loadTransactions();
    }
  };

  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (typeFilter !== 'ALL') params.append('type', typeFilter);
    if (categoryFilter !== 'ALL') params.append('category_id', categoryFilter);
    try {
      await downloadCsvFile(`/api/reports/csv?${params.toString()}`, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  // Scope summary calculation
  const scopeIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const scopeExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Financial Ledger</h1>
          <p className="text-sm text-[#6B6B67] mt-1">
            Comprehensive audit log of all income and expense items
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#FFFFFF] border border-[#D9D9D4] hover:bg-[#EBEBE7] text-[#111111] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="trans-record-btn"
            onClick={() => onOpenAddTransaction()}
            className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Scope Summary Bar */}
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-center shadow-xs">
        <div className="flex-1 min-w-[120px]">
          <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">In Scope Income</span>
          <span className="text-base font-bold text-[#15803D] tabular-nums mt-0.5 block whitespace-nowrap">
            +{formatMoney(scopeIncome, user.currency)}
          </span>
        </div>
        <div className="flex-1 min-w-[120px]">
          <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">In Scope Expense</span>
          <span className="text-base font-bold text-[#B91C1C] tabular-nums mt-0.5 block whitespace-nowrap">
            -{formatMoney(scopeExpense, user.currency)}
          </span>
        </div>
        <div className="flex-1 min-w-[120px]">
          <span className="text-[11px] font-semibold text-[#6B6B67] uppercase tracking-wider block">Net Balance</span>
          <span className="text-base font-bold text-[#111111] tabular-nums mt-0.5 block whitespace-nowrap">
            {formatMoney(scopeIncome - scopeExpense, user.currency, true)}
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#6B6B67]" />
            <input
              id="trans-search-input"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search description, payment, notes..."
              className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] placeholder-[#A3A3A0] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-3">
            <select
              id="filter-type-select"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
              className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="INCOME">Income Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-4">
            <select
              id="filter-cat-select"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range & Sorting */}
        <div className="pt-2 border-t border-[#D9D9D4]/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full py-1.5 px-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full py-1.5 px-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Sort Field</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="desc">Descending (Highest / Newest)</option>
              <option value="asc">Ascending (Lowest / Oldest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {loading && transactions.length === 0 ? (
          <div className="space-y-2.5 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-[#D9D9D4] rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-gray-200 rounded"></div>
                    <div className="h-3 w-24 bg-gray-100 rounded"></div>
                  </div>
                </div>
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-[#111111]">No matching transactions found.</p>
            <p className="text-xs text-[#6B6B67]">Try changing your search term or date filters.</p>
          </div>
        ) : (
          transactions.map((t) => (
            <TransactionItem
              key={t.id}
              transaction={t}
              currency={user.currency}
              onEdit={onEditTransaction}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-[#D9D9D4]">
          <span className="text-xs text-[#6B6B67]">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} items
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D9D9D4] text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-[#111111] px-2">{page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D9D9D4] text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
