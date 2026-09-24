import React, { useState, useEffect } from 'react';
import { X, Plus, Check, AlertCircle } from 'lucide-react';
import { Category, Transaction, Account } from '../types.ts';
import { apiFetch, apiFetchCached, CURRENCY_MAP, getCategoryIcon, formatMoney } from '../utils.tsx';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  currency: string;
  transactionToEdit?: Transaction | null;
  defaultType?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  currency,
  transactionToEdit,
  defaultType = 'EXPENSE',
}) => {
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>(defaultType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open/edit
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount));
      setCategoryId(transactionToEdit.category_id || '');
      setAccountId(transactionToEdit.account_id || '');
      setToAccountId(transactionToEdit.to_account_id || '');
      setDate(transactionToEdit.date);
      setDescription(transactionToEdit.description);
      setPaymentMethod(transactionToEdit.payment_method || 'Cash');
      setNotes(transactionToEdit.notes || '');
    } else {
      setType(defaultType);
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setPaymentMethod(defaultType === 'INCOME' ? 'Bank Transfer' : defaultType === 'TRANSFER' ? 'Transfer' : 'Credit Card');
      setNotes('');
      // Preselect first matching category
      const filtered = categories.filter(c => c.type === (defaultType === 'TRANSFER' ? 'EXPENSE' : defaultType));
      if (filtered.length > 0) {
        setCategoryId(filtered[0].id);
      }
    }
    setError(null);
  }, [transactionToEdit, isOpen, defaultType, categories]);

  // Load available accounts
  useEffect(() => {
    if (isOpen) {
      apiFetchCached<any>('/api/accounts').then((res) => {
        const list = res.accounts || [];
        setAccounts(list);
        if (!transactionToEdit && list.length > 0) {
          if (!accountId) {
            const def = list.find((a: Account) => a.is_default === 1) || list[0];
            setAccountId(def.id);
            handleAccountChange(def.id);
          }
          if (!toAccountId && list.length > 1) {
            const second = list.find((a: Account) => a.id !== (accountId || list[0].id)) || list[1];
            setToAccountId(second.id);
          }
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  const [showAdvancedMethod, setShowAdvancedMethod] = useState(false);

  // Auto-sync payment method when account changes
  const handleAccountChange = (accId: string) => {
    setAccountId(accId);
    if (type === 'TRANSFER') {
      setPaymentMethod('Transfer');
      return;
    }
    const selected = accounts.find((a: Account) => a.id === accId);
    if (selected) {
      const lower = selected.name.toLowerCase();
      if (lower.includes('gcash')) setPaymentMethod('GCash');
      else if (lower.includes('maya')) setPaymentMethod('Maya');
      else if (selected.type === 'CASH') setPaymentMethod('Cash');
      else if (selected.type === 'BANK') setPaymentMethod('Bank Transfer');
      else if (selected.type === 'CREDIT') setPaymentMethod('Credit Card');
      else setPaymentMethod(selected.name);
    }
  };

  // When type toggles, choose appropriate category
  const handleTypeChange = (newType: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    setType(newType);
    if (newType === 'TRANSFER') {
      setPaymentMethod('Transfer');
      if (!description || description.startsWith('Transfer to')) {
        const target = accounts.find(a => a.id === toAccountId);
        setDescription(target ? `Transfer to ${target.name}` : 'Wallet Transfer');
      }
    } else {
      const filtered = categories.filter(c => c.type === newType);
      if (filtered.length > 0 && !filtered.some(c => c.id === categoryId)) {
        setCategoryId(filtered[0].id);
      }
      if (description.startsWith('Transfer to') || description === 'Wallet Transfer') {
        setDescription('');
      }
    }
  };

  const filteredCategories = categories.filter(c => c.type === (type === 'TRANSFER' ? 'EXPENSE' : type));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a brief description.');
      return;
    }

    if (type === 'TRANSFER') {
      if (!accountId || !toAccountId) {
        setError('Please select both source and destination accounts for the transfer.');
        return;
      }
      if (accountId === toAccountId) {
        setError('Source and destination accounts must be different.');
        return;
      }
    } else if (!categoryId) {
      setError('Please choose a category.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        type,
        amount: numAmount,
        category_id: categoryId || (categories.length > 0 ? categories[0].id : null),
        account_id: accountId || null,
        date,
        description: description.trim(),
        payment_method: paymentMethod,
        notes: notes.trim(),
      };

      if (type === 'TRANSFER') {
        payload.to_account_id = toAccountId;
      }

      if (transactionToEdit) {
        await apiFetch(`/api/transactions/${transactionToEdit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction.');
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
            {transactionToEdit ? 'Edit Transaction' : 'Record Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B6B67] hover:text-[#111111] rounded-lg hover:bg-[#EBEBE7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-[#B91C1C] shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#EBEBE7] rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'bg-[#B91C1C] text-white shadow-xs'
                    : 'text-[#6B6B67] hover:text-[#111111]'
                }`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'INCOME'
                    ? 'bg-[#15803D] text-white shadow-xs'
                    : 'text-[#6B6B67] hover:text-[#111111]'
                }`}
              >
                Income (+)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('TRANSFER')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'TRANSFER'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#6B6B67] hover:text-[#111111]'
                }`}
              >
                Transfer (⇄)
              </button>
            </div>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Amount ({CURRENCY_MAP[currency]?.symbol || '₱'})
              </label>
              <input
                id="trans-amount-input"
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250.00"
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Date
              </label>
              <input
                id="trans-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Description
            </label>
            <input
              id="trans-desc-input"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'TRANSFER' ? 'e.g. Move money from GCash to GoTyme' : 'e.g. SM Supermarket Groceries or Client Invoice'}
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {type === 'TRANSFER' ? (
            /* Source & Destination Wallet Selectors for Transfer */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  From Wallet (Source)
                </label>
                <select
                  id="trans-account-select"
                  value={accountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Select source wallet</option>
                  {accounts.map((acc: Account) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(acc.current_balance ?? acc.balance ?? 0, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  To Wallet (Destination)
                </label>
                <select
                  id="trans-to-account-select"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Select destination wallet</option>
                  {accounts.map((acc: Account) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                      {acc.name} ({formatMoney(acc.current_balance ?? acc.balance ?? 0, currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Category & Wallet / Account (Auto-syncs payment method) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Category
                </label>
                <select
                  id="trans-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Wallet / Account
                </label>
                <select
                  id="trans-account-select"
                  value={accountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">No specific account</option>
                  {accounts.map((acc: Account) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(acc.current_balance ?? acc.balance ?? 0, currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Optional Payment Method Label Override */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#6B6B67]">
                Payment Method: <span className="font-semibold text-[#111111]">{paymentMethod}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedMethod(!showAdvancedMethod)}
                className="text-[11px] text-[#2563EB] hover:underline font-semibold cursor-pointer"
              >
                {showAdvancedMethod ? 'Hide method override' : 'Change method label'}
              </button>
            </div>
            {showAdvancedMethod && (
              <select
                id="trans-payment-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2563EB] animate-fadeIn mt-1"
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Other">Other</option>
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              id="trans-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details, tax deduction note, etc."
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
              id="submit-transaction-btn"
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Saving...' : transactionToEdit ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
