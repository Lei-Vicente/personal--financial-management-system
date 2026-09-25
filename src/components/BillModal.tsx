import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Building2, Tag } from 'lucide-react';
import { Category, Account, Bill } from '../types.ts';
import { apiFetch, CURRENCY_MAP, formatMoney } from '../utils.tsx';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  accounts: Account[];
  currency: string;
  billToEdit?: Bill | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  accounts,
  currency,
  billToEdit,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<'ONCE' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts);

  useEffect(() => {
    if (accounts.length > 0) {
      setLocalAccounts(accounts);
    } else if (isOpen) {
      apiFetch('/api/accounts')
        .then(res => {
          if (res.accounts) setLocalAccounts(res.accounts);
        })
        .catch(() => {});
    }
  }, [accounts, isOpen]);

  useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setAmount(String(billToEdit.amount));
      setDueDate(billToEdit.due_date);
      setFrequency(billToEdit.frequency);
      setCategoryId(billToEdit.category_id || '');
      setAccountId(billToEdit.account_id || '');
      setNotes(billToEdit.notes || '');
    } else {
      setName('');
      setAmount('');
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 7);
      setDueDate(defaultDue.toISOString().split('T')[0]);
      const expenseCats = categories.filter(c => c.type === 'EXPENSE');
      if (expenseCats.length > 0) {
        setCategoryId(expenseCats[0].id);
      } else if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }
      const accs = localAccounts.length > 0 ? localAccounts : accounts;
      if (accs.length > 0) {
        const def = accs.find(a => a.is_default === 1) || accs[0];
        setAccountId(def.id);
      }
      setNotes('');
    }
    setError(null);
  }, [billToEdit, isOpen, categories, accounts, localAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid bill amount greater than 0.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a bill name (e.g. Electricity, Fiber Internet).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        amount: numAmount,
        due_date: dueDate,
        frequency,
        category_id: categoryId || null,
        account_id: accountId || null,
        notes: notes.trim(),
      };

      if (billToEdit) {
        await apiFetch(`/api/bills/${billToEdit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/bills', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save bill.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9D9D4] flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-[#111111] tracking-tight">
            {billToEdit ? 'Edit Bill / Obligation' : 'Add Bill / Obligation'}
          </h2>
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
          {/* Bill Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Bill Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meralco Electric, PLDT Home Fiber, Studio Rent"
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Amount and Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Amount ({CURRENCY_MAP[currency]?.symbol || '₱'})
              </label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500.00"
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Frequency & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="ONCE">One-time</option>
                <option value="WEEKLY">Weekly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">No specific category</option>
                {(categories.some(c => c.type === 'EXPENSE') ? categories.filter(c => c.type === 'EXPENSE') : categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paying Wallet / Account */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Default Payment Wallet / Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">No specific account</option>
              {(localAccounts.length > 0 ? localAccounts : accounts).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatMoney(acc.current_balance ?? acc.balance ?? 0, currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Notes (Account Number, Reference, etc.)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Account # 0123-4567-89, due every 15th"
              className="w-full py-2 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[#D9D9D4]">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-semibold text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-2 cursor-pointer shadow-xs"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{billToEdit ? 'Save Changes' : 'Save Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
