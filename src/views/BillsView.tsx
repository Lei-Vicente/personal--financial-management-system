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
import { apiFetch, apiFetchFresh, apiFetchCached, getCachedData, formatMoney, formatDate, getCategoryIcon , useDataVersion, notifyDataChanged } from '../utils.tsx';
import { BillModal } from '../components/BillModal.tsx';
import { RecurringModal } from '../components/RecurringModal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ListSkeleton } from '../components/Skeletons.tsx';
import { BillsCalendar } from '../components/BillsCalendar.tsx';

interface BillsViewProps {
  user: User;
  categories: Category[];
  accounts: Account[];
}

export const BillsView: React.FC<BillsViewProps> = ({
  user,
  categories,
  accounts,
}) => {
  const dataVersion = useDataVersion();
  const [activeTab, setActiveTab] = useState<'bills' | 'recurring'>('bills');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Bills state
  const [bills, setBills] = useState<Bill[]>(() => getCachedData('/api/bills')?.bills || []);
  const [billSummary, setBillSummary] = useState<any>(() => getCachedData('/api/bills')?.summary || null);
  const [billsLoading, setBillsLoading] = useState(() => !getCachedData('/api/bills'));

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const visibleBills = selectedDate
    ? bills.filter(b => {
        if (!b.due_date) return false;
        const d1 = new Date(b.due_date);
        const d2 = selectedDate;
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
      })
    : bills;

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
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const loadBills = async () => {
    try {
      const res = await apiFetchFresh<any>(`/api/bills?status=${statusFilter}`);
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
      const res = await apiFetchFresh<any>('/api/recurring-transactions');
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

  const handlePayBill = (bill: Bill) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Pay Bill',
      message: `Mark "${bill.name}" (${formatMoney(bill.amount, user.currency)}) as paid and record corresponding expense?`,
      confirmLabel: 'Confirm Payment',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiFetch(`/api/bills/${bill.id}/pay`, {
            method: 'POST',
            body: JSON.stringify({ record_transaction: true }),
          });
          loadBills();
          notifyDataChanged();
        } catch (err: any) {
          setErrorFeedback(err.message || 'Failed to record bill payment.');
          setTimeout(() => setErrorFeedback(null), 5000);
        }
      },
    });
  };

  const handleDeleteBill = (bill: Bill) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Bill',
      message: `Are you sure you want to delete the bill "${bill.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Bill',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiFetch(`/api/bills/${bill.id}`, { method: 'DELETE' });
          loadBills();
          notifyDataChanged();
        } catch (err: any) {
          setErrorFeedback(err.message || 'Failed to delete bill.');
          setTimeout(() => setErrorFeedback(null), 5000);
        }
      },
    });
  };

  const handleDeleteRecurring = (rec: RecurringTransaction) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Recurring Schedule',
      message: `Are you sure you want to delete the schedule "${rec.description}"? Previously generated transactions will remain intact.`,
      confirmLabel: 'Delete Schedule',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiFetch(`/api/recurring-transactions/${rec.id}`, { method: 'DELETE' });
          loadRecurring();
          notifyDataChanged();
        } catch (err: any) {
          setErrorFeedback(err.message || 'Failed to delete recurring schedule.');
          setTimeout(() => setErrorFeedback(null), 5000);
        }
      },
    });
  };

  const handleToggleRecurringActive = async (rec: RecurringTransaction) => {
    try {
      await apiFetch(`/api/recurring-transactions/${rec.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !rec.is_active }),
      });
      loadRecurring();
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to toggle status.');
      setTimeout(() => setErrorFeedback(null), 5000);
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
      if (notifyDataChanged) notifyDataChanged();
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
            Bills & Recurring Schedules
          </h1>
          <p className="text-sm text-[#6B6B67] mt-1">
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
              className="px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
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
              className="px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Feedback Banners */}
      {processMessage && (
        <div className="p-3.5 bg-[#F5F5F3] border border-[#D9D9D4] text-[#111111] rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-xs">
          <Sparkles className="w-4 h-4 shrink-0 text-[#111111]" />
          <span>{processMessage}</span>
        </div>
      )}

      {errorFeedback && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-[#B91C1C] rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
          <span>{errorFeedback}</span>
        </div>
      )}

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

          {/* Calendar & List Layout */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Calendar Sidebar */}
            <div className="w-full lg:w-1/3 shrink-0 lg:sticky lg:top-4">
              <BillsCalendar 
                bills={bills} 
                selectedDate={selectedDate} 
                onSelectDate={setSelectedDate} 
              />
            </div>

            {/* List Section */}
            <div className="w-full lg:w-2/3 space-y-4">
              {/* Filter Pills */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
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
                {selectedDate && (
                  <span className="text-[10px] font-bold text-[#B91C1C] uppercase tracking-wider bg-red-50 px-2 py-1 rounded-md">
                    {selectedDate.toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Bills List */}
              <div className="space-y-3">
                {billsLoading && visibleBills.length === 0 ? (
                  <ListSkeleton count={4} />
                ) : visibleBills.length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title={selectedDate ? 'No bills due on this date' : 'No bills found'}
                    description="Add your monthly utilities, rent, or loans to never miss a due date."
                    actionLabel="Add New Bill"
                    onAction={() => setBillModalOpen(true)}
                  />
                ) : (
                  visibleBills.map((bill) => (
                <div
                  key={bill.id}
                  className={`bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs premium-card group`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        bill.is_paid
                          ? 'bg-[#F5F5F3] border-[#D9D9D4] text-[#6B6B67]'
                          : bill.is_overdue
                          ? 'bg-[#111111] border-[#111111] text-white'
                          : 'bg-[#111111] border-[#111111] text-white'
                      }`}
                    >
                      {bill.is_paid ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : bill.is_overdue ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <CalendarClock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#111111] truncate">{bill.name}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#F5F5F3] border border-[#D9D9D4] text-[#6B6B67]">
                          {bill.frequency}
                        </span>
                        {bill.is_paid && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F5F5F3] text-[#111111] border border-[#D9D9D4]">
                            Paid on {bill.paid_date ? formatDate(bill.paid_date) : 'Record'}
                          </span>
                        )}
                        {!bill.is_paid && bill.is_overdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#111111] text-white">
                            Overdue by {Math.abs(bill.days_until_due || 0)} {Math.abs(bill.days_until_due || 0) === 1 ? 'day' : 'days'}
                          </span>
                        )}
                        {!bill.is_paid && bill.is_due_soon && !bill.is_overdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#111111] text-[#111111]">
                            Due in {bill.days_until_due} {bill.days_until_due === 1 ? 'day' : 'days'}
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

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9D9D4]/50 flex-wrap sm:flex-nowrap">
                    <span className="text-base font-bold text-[#111111] tabular-nums shrink-0">
                      {formatMoney(bill.amount, user.currency)}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!bill.is_paid && (
                        <button
                          onClick={() => handlePayBill(bill)}
                          className="px-3 py-1.5 bg-[#111111] hover:bg-[#333333] active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                          title="Pay and record transaction"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 sm:group-reveal-actions">
                        <button
                          onClick={() => {
                            setBillToEdit(bill);
                            setBillModalOpen(true);
                          }}
                          className="p-2 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl premium-interactive cursor-pointer shrink-0"
                          title="Edit Bill"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteBill(bill)}
                          className="p-2 text-[#6B6B67] hover:text-[#B91C1C] hover:bg-red-50 rounded-xl premium-interactive cursor-pointer shrink-0"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
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
                <Repeat className="w-4 h-4 text-[#111111]" />
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
            <div className="p-3 bg-[#F5F5F3] border border-[#D9D9D4] rounded-xl text-xs font-medium text-[#111111] flex items-center space-x-2 animate-fadeIn">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{processMessage}</span>
            </div>
          )}

          {/* Recurring List */}
          <div className="space-y-3">
            {recurringLoading && recurringList.length === 0 ? (
              <ListSkeleton count={4} />
            ) : recurringList.length === 0 ? (
              <EmptyState
                icon={Repeat}
                title="No recurring schedules setup"
                description="Create automated recurring rules for recurring salaries, memberships, or regular savings."
                actionLabel="Create First Rule"
                onAction={() => setRecurringModalOpen(true)}
              />
            ) : (
              recurringList.map((rec) => (
                <div
                  key={rec.id}
                  className={`bg-[#FFFFFF] border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs premium-card group ${
                    rec.is_active ? 'border-[#D9D9D4]' : 'border-[#D9D9D4]/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        rec.type === 'INCOME' ? 'bg-[#111111] border-[#111111] text-white' : 'bg-[#111111] border-[#111111] text-white'
                      }`}
                    >
                      <Repeat className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#111111] truncate">{rec.description}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#F5F5F3] border border-[#D9D9D4] text-[#6B6B67]">
                          {rec.frequency}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            rec.is_active ? 'bg-[#111111] text-white' : 'bg-[#F5F5F3] border border-[#D9D9D4] text-[#6B6B67]'
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

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9D9D4]/50 flex-wrap sm:flex-nowrap">
                    <span
                      className={`text-base font-bold tabular-nums shrink-0 ${
                        rec.type === 'INCOME' ? 'text-[#15803D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {rec.type === 'INCOME' ? '+' : '-'}{formatMoney(rec.amount, user.currency)}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleRecurringActive(rec)}
                        className="px-2.5 py-1.5 bg-[#EBEBE7] hover:bg-[#D9D9D4] text-[#111111] rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {rec.is_active ? 'Pause' : 'Resume'}
                      </button>

                      <div className="flex items-center gap-1.5 sm:group-reveal-actions">
                        <button
                          onClick={() => {
                            setRecurringToEdit(rec);
                            setRecurringModalOpen(true);
                          }}
                          className="p-2 text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl premium-interactive cursor-pointer shrink-0"
                          title="Edit Schedule"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteRecurring(rec)}
                          className="p-2 text-[#6B6B67] hover:text-[#B91C1C] hover:bg-red-50 rounded-xl premium-interactive cursor-pointer shrink-0"
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          if (notifyDataChanged) notifyDataChanged();
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
          if (notifyDataChanged) notifyDataChanged();
        }}
        categories={categories}
        accounts={accounts}
        currency={user.currency}
        recurringToEdit={recurringToEdit}
      />
      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
