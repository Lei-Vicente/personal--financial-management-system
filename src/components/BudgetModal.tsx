import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Category } from '../types.ts';
import { apiFetch, CURRENCY_MAP } from '../utils.tsx';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  currency: string;
  defaultMonth: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  currency,
  defaultMonth,
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const selectableCategories = expenseCategories.length > 0 ? expenseCategories : categories;

  useEffect(() => {
    if (isOpen) {
      const available = categories.filter((c) => c.type === 'EXPENSE');
      const list = available.length > 0 ? available : categories;
      if (list.length > 0) {
        setCategoryId(list[0].id);
      } else {
        setCategoryId('');
      }
      setAmount('');
      const curMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      setMonth(defaultMonth || curMonth);
      setError(null);
    }
  }, [isOpen, defaultMonth, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a budget amount greater than zero.');
      return;
    }

    if (!categoryId) {
      setError('Please select an expense category.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category_id: categoryId,
          amount: numAmount,
          month,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#D9D9D4] flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-[#111111] tracking-tight">Set Monthly Category Budget</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B6B67] hover:text-[#111111] rounded-lg hover:bg-[#EBEBE7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-[#B91C1C] shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Expense Category
            </label>
            <select
              id="budget-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            >
              {selectableCategories.length === 0 ? (
                <option value="">No categories available</option>
              ) : (
                selectableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.type === 'INCOME' ? '(Income)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Monthly Budget Limit ({CURRENCY_MAP[currency]?.symbol || '₱'})
            </label>
            <input
              id="budget-amount-input"
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Month (YYYY-MM)
            </label>
            <input
              id="budget-month-input"
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[#D9D9D4]">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-xs font-semibold text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-budget-btn"
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
