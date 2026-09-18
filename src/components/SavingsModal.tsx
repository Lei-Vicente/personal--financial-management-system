import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { SavingsGoal } from '../types.ts';
import { apiFetch, CURRENCY_MAP } from '../utils.tsx';

// ==========================================
// 1. ADD GOAL MODAL
// ==========================================
interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currency: string;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currency,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numTarget = Number(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      setError('Please enter a target amount greater than zero.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide a goal name.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/savings-goals', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          target_amount: numTarget,
          initial_amount: Number(initialAmount) || 0,
          target_date: targetDate || null,
          description: description.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create savings goal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D9D9D4] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111111] tracking-tight">Create Savings Goal</h2>
          <button onClick={onClose} className="p-1.5 text-[#6B6B67] hover:text-[#111111] rounded-lg hover:bg-[#EBEBE7] transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-[#B91C1C]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Goal Name
            </label>
            <input
              id="goal-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Laptop, Travel"
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Target ({CURRENCY_MAP[currency]?.symbol || '₱'})
              </label>
              <input
                id="goal-target-input"
                type="number"
                step="any"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="60000"
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                Initial Deposit
              </label>
              <input
                id="goal-initial-input"
                type="number"
                step="any"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0"
                className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB] tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Target Completion Date (Optional)
            </label>
            <input
              id="goal-date-input"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Description / Motivation
            </label>
            <textarea
              id="goal-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are you saving for this?"
              className="w-full py-2 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
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
              id="submit-goal-btn"
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. ADD CONTRIBUTION MODAL
// ==========================================
interface AddContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal: SavingsGoal | null;
  currency: string;
}

export const AddContributionModal: React.FC<AddContributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  goal,
  currency,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('Monthly savings allocation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid deposit amount greater than zero.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/savings-goals/${goal.id}/contributions`, {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          date,
          note: note.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record contribution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#D9D9D4] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111111] tracking-tight">Deposit into Savings</h2>
            <p className="text-xs text-[#6B6B67]">{goal.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6B6B67] hover:text-[#111111] rounded-lg hover:bg-[#EBEBE7] transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-[#B91C1C]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Deposit Amount ({CURRENCY_MAP[currency]?.symbol || '₱'})
            </label>
            <input
              id="contrib-amount-input"
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
              Deposit Date
            </label>
            <input
              id="contrib-date-input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
              Note
            </label>
            <input
              id="contrib-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Salary allocation, bonus, side gig"
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
              id="submit-contrib-btn"
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-[#15803D] hover:bg-[#111111] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Depositing...' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
