import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  Building2,
  Calendar,
  Sparkles,
  Play
} from 'lucide-react';
import { User, Category, Account, Bill, RecurringTransaction } from '../types.ts';
import { apiFetch, apiFetchCached, getCachedData, formatMoney, formatDate, getCategoryIcon } from '../utils.tsx';
import { BillModal } from '../components/BillModal.tsx';
import { RecurringModal } from '../components/RecurringModal.tsx';

interface BillsViewProps {
  user: User;
  categories: Category[];
  accounts: Account[];
  dataVersion?: number;
  onRefreshData?: () => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  user,
  categories,
  accounts,
  dataVersion,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'bills' | 'recurring'>('bills');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Bills state
  const [bills, setBills] = useState<Bill[]>(() => getCachedData('/api/bills')?.bills || []);
  const [billSummary, setBillSummary] = useState<any>(() => getCachedData('/api/bills')?.summary || null);
  const [billsLoading, setBillsLoading] = useState(() => !getCachedData('/api/bills'));

  // Recurring state
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>(() => getCachedData('/api/recurring-transactions')?.recurring_transactions || []);
  const [recurringLoading, setRecurringLoading] = useState(() => !getCachedData('/api/recurring-transactions'));

  // Modals state
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<RecurringTransaction | null>(null);

  const [processingRecurring, setProcessingRecurring] = useState(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);

  const loadBills = async () => {
    try {
      const res = await apiFetchCached<any>(`/api/bills?status=${statusFilter}`);
      setBills(res.bills || []);
      setBillSummary(res.summary || null);
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setBillsLoading(false);
    }
  };

  const loadRecurring = async () => {
    try {
      const res = await apiFetchCached<any>('/api/recurring-transactions');
      setRecurringList(res.recurring_transactions || []);
    } catch (err) {
      console.error('Failed to load recurring schedules:', err);
    } finally {
      setRecurringLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [statusFilter, dataVersion]);

  useEffect(() => {
    loadRecurring();
  }, [dataVersion]);

  const handlePayBill = async (billId: string) => {
    try {
      await apiFetch(`/api/bills/${billId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ record_transaction: true }),
      });
      loadBills();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to record bill payment.');
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    try {
      await apiFetch(`/api/bills/${billId}`, { method: 'DELETE' });
      loadBills();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete bill.');
    }
  };

  const handleDeleteRecurring = async (recId: string) => {
    if (!confirm('Are you sure you want to delete this recurring schedule?')) return;
    try {
      await apiFetch(`/api/recurring-transactions/${recId}`, { method: 'DELETE' });
      loadRecurring();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete recurring schedule.');
    }
  };

  const handleToggleRecurringActive = async (rec: RecurringTransaction) => {
    try {
      await apiFetch(`/api/recurring-transactions/${rec.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !rec.is_active }),
      });
      loadRecurring();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  const handleProcessDueRecurring = async () => {
    setProcessingRecurring(true);
    setProcessMessage(null);
    try {
      const res = await apiFetch('/api/recurring-transactions/process', { method: 'POST' });
      setProcessMessage(
        res.generated_count > 0
          ? `Successfully generated ${res.generated_count} due transactions!`
          : 'All recurring schedules are already up-to-date.'
      );
      loadRecurring();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setProcessMessage(err.message || 'Failed to process recurring transactions.');
    } finally {
      setProcessingRecurring(false);
      setTimeout(() => setProcessMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D9D9D4] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] flex items-center space-x-2">
            <CalendarClock className="w-7 h-7 text-[#2563EB]" />
            <span>Bills & Recurring Schedules</span>
          </h1>
          <p className="text-xs text-[#6B6B67] mt-1">
            Stay ahead of upcoming utilities, loans, subscriptions, and automated recurring income/expenses.
          </p>
        </div>

        {/* Tab Switcher & Action */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-[#EBEBE7] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'bills'
                  ? 'bg-[#FFFFFF] text-[#111111] shadow-xs'
                  : 'text-[#6B6B67] hover:text-[#111111]'
              }`}
            >
              Upcoming Bills
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'recurring'
                  ? 'bg-[#FFFFFF] text-[#111111] shadow-xs'
                  : 'text-[#6B6B67] hover:text-[#111111]'
              }`}
            >
              Recurring Rules
            </button>
          </div>

          {activeTab === 'bills' ? (
            <button
              onClick={() => {
                setBillToEdit(null);
                setBillModalOpen(true);
              }}
              className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bill</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setRecurringToEdit(null);
                setRecurringModalOpen(true);
              }}
              className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BILLS & OBLIGATIONS                               */}
      {/* ======================================================== */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider block">Unpaid Bills Total</span>
              <span className="text-2xl font-bold text-[#B91C1C] tabular-nums mt-1 block">
                {formatMoney(billSummary?.unpaid_total || 0, user.currency)}
              </span>
              <span className="text-xs text-[#6B6B67] mt-1 block">
                {billSummary?.unpaid_count || 0} active obligations pending
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider block">Due Soon or Overdue</span>
              <span className="text-2xl font-bold text-[#D97706] tabular-nums mt-1 block">
                {billSummary?.due_soon_count || 0}
              </span>
              <span className="text-xs text-[#6B6B67] mt-1 block">Due within the next 7 days</span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-[#6B6B67] uppercase tracking-wider block">Total Tracked Bills</span>
              <span className="text-2xl font-bold text-[#111111] tabular-nums mt-1 block">
                {billSummary?.total_count || 0}
              </span>
              <span className="text-xs text-[#6B6B67] mt-1 block">Recurring & one-off commitments</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2">
            {(['all', 'unpaid', 'paid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#FFFFFF] border border-[#D9D9D4] text-[#6B6B67] hover:text-[#111111]'
                }`}
              >
                {st === 'all' ? 'All Bills' : st === 'unpaid' ? 'Pending Unpaid' : 'Completed Paid'}
              </button>
            ))}
          </div>

          {/* Bills List */}
          <div className="space-y-3">
            {billsLoading && bills.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B6B67]">Loading bills...</div>
            ) : bills.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-12 text-center space-y-3">
                <CalendarClock className="w-10 h-10 text-[#6B6B67] mx-auto opacity-50" />
                <p className="text-sm font-semibold text-[#111111]">No bills found</p>
                <p className="text-xs text-[#6B6B67]">Add your monthly utilities, rent, or loans to never miss a due date.</p>
                <button
                  onClick={() => setBillModalOpen(true)}
                  className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Bill</span>
                </button>
              </div>
            ) : (
              bills.map((bill) => (
                <div
                  key={bill.id}
                  className={`bg-[#FFFFFF] border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all shadow-xs ${
                    bill.is_overdue
                      ? 'border-[#B91C1C]/40 bg-red-50/10'
                      : bill.is_due_soon
                      ? 'border-[#D97706]/40 bg-amber-50/10'
                      : 'border-[#D9D9D4]'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5 ${
                        bill.is_paid
                          ? 'bg-[#15803D]'
                          : bill.is_overdue
                          ? 'bg-[#B91C1C]'
                          : 'bg-[#2563EB]'
                      }`}
                    >
                      {bill.is_paid ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : bill.is_overdue ? (
                        <AlertTriangle className="w-5 h-5 text-white" />
                      ) : (
                        <CalendarClock className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#111111] truncate">{bill.name}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#EBEBE7] text-[#6B6B67]">
                          {bill.frequency}
                        </span>
                        {bill.is_paid && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-100 text-[#15803D]">
                            Paid on {bill.paid_date ? formatDate(bill.paid_date) : 'Record'}
                          </span>
                        )}
                        {!bill.is_paid && bill.is_overdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-[#B91C1C]">
                            Overdue by {Math.abs(bill.days_until_due || 0)} days
                          </span>
                        )}
                        {!bill.is_paid && bill.is_due_soon && !bill.is_overdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-[#D97706]">
                            Due in {bill.days_until_due} days
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-[#6B6B67] flex-wrap">
                        <span>Due: <strong className="text-[#111111]">{formatDate(bill.due_date)}</strong></span>
                        {bill.account_name && (
                          <>
                            <span>&bull;</span>
                            <span>Wallet: <strong className="text-[#111111]">{bill.account_name}</strong></span>
                          </>
                        )}
                        {bill.category_name && (
                          <>
                            <span>&bull;</span>
                            <span>{bill.category_name}</span>
                          </>
                        )}
                      </div>

                      {bill.notes && (
                        <p className="text-[11px] text-[#6B6B67] italic">{bill.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9D9D4]/50">
                    <span className="text-base font-bold text-[#111111] tabular-nums">
                      {formatMoney(bill.amount, user.currency)}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {!bill.is_paid && (
                        <button
                          onClick={() => handlePayBill(bill.id)}
                          className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
                          title="Pay and record transaction"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setBillToEdit(bill);
                          setBillModalOpen(true);
                        }}
                        className="p-2 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl transition-colors cursor-pointer"
                        title="Edit Bill"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        className="p-2 text-[#6B6B67] hover:text-[#B91C1C] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RECURRING TRANSACTIONS                             */}
      {/* ======================================================== */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[#111111] flex items-center space-x-2">
                <Repeat className="w-4 h-4 text-[#2563EB]" />
                <span>Automatic Transaction Processor</span>
              </h2>
              <p className="text-xs text-[#6B6B67]">
                Scheduled rules automatically generate income and expense transactions when due dates arrive.
              </p>
            </div>

            <button
              onClick={handleProcessDueRecurring}
              disabled={processingRecurring}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
            >
              {processingRecurring ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Process Due Schedules</span>
            </button>
          </div>

          {processMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-[#2563EB] flex items-center space-x-2 animate-fadeIn">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{processMessage}</span>
            </div>
          )}

          {/* Recurring List */}
          <div className="space-y-3">
            {recurringLoading && recurringList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B6B67]">Loading recurring schedules...</div>
            ) : recurringList.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-12 text-center space-y-3">
                <Repeat className="w-10 h-10 text-[#6B6B67] mx-auto opacity-50" />
                <p className="text-sm font-semibold text-[#111111]">No recurring schedules setup</p>
                <p className="text-xs text-[#6B6B67]">Create automated recurring rules for recurring salaries, memberships, or regular savings.</p>
                <button
                  onClick={() => setRecurringModalOpen(true)}
                  className="px-4 py-2 bg-[#111111] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Rule</span>
                </button>
              </div>
            ) : (
              recurringList.map((rec) => (
                <div
                  key={rec.id}
                  className={`bg-[#FFFFFF] border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all shadow-xs ${
                    rec.is_active ? 'border-[#D9D9D4]' : 'border-[#D9D9D4]/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5 ${
                        rec.type === 'INCOME' ? 'bg-[#15803D]' : 'bg-[#B91C1C]'
                      }`}
                    >
                      <Repeat className="w-5 h-5 text-white" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#111111] truncate">{rec.description}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#EBEBE7] text-[#6B6B67]">
                          {rec.frequency}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            rec.is_active ? 'bg-green-100 text-[#15803D]' : 'bg-gray-100 text-[#6B6B67]'
                          }`}
                        >
                          {rec.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-[#6B6B67] flex-wrap">
                        <span>Next Occurrence: <strong className="text-[#111111]">{formatDate(rec.next_date)}</strong></span>
                        {rec.account_name && (
                          <>
                            <span>&bull;</span>
                            <span>Wallet: <strong className="text-[#111111]">{rec.account_name}</strong></span>
                          </>
                        )}
                        {rec.category_name && (
                          <>
                            <span>&bull;</span>
                            <span>{rec.category_name}</span>
                          </>
                        )}
                      </div>

                      {rec.notes && (
                        <p className="text-[11px] text-[#6B6B67] italic">{rec.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9D9D4]/50">
                    <span
                      className={`text-base font-bold tabular-nums ${
                        rec.type === 'INCOME' ? 'text-[#15803D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {rec.type === 'INCOME' ? '+' : '-'}{formatMoney(rec.amount, user.currency)}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleToggleRecurringActive(rec)}
                        className="px-2.5 py-1.5 bg-[#EBEBE7] hover:bg-[#D9D9D4] text-[#111111] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {rec.is_active ? 'Pause' : 'Resume'}
                      </button>

                      <button
                        onClick={() => {
                          setRecurringToEdit(rec);
                          setRecurringModalOpen(true);
                        }}
                        className="p-2 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl transition-colors cursor-pointer"
                        title="Edit Schedule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteRecurring(rec.id)}
                        className="p-2 text-[#6B6B67] hover:text-[#B91C1C] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bill Modal */}
      <BillModal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        onSuccess={() => {
          loadBills();
          if (onRefreshData) onRefreshData();
        }}
        categories={categories}
        accounts={accounts}
        currency={user.currency}
        billToEdit={billToEdit}
      />

      {/* Recurring Modal */}
      <RecurringModal
        isOpen={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        onSuccess={() => {
          loadRecurring();
          if (onRefreshData) onRefreshData();
        }}
        categories={categories}
        accounts={accounts}
        currency={user.currency}
        recurringToEdit={recurringToEdit}
      />
    </div>
  );
};
