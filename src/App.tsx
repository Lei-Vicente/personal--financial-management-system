import React, { useState, useEffect } from 'react';
import { User, Category, Transaction, Budget, SavingsGoal, Account } from './types.ts';
import { apiFetch, setStoredToken, clearClientCache } from './utils.tsx';
import { Navigation, NavTab } from './components/Navigation.tsx';
import { AuthView } from './components/AuthView.tsx';
import { OnboardingView } from './components/OnboardingView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { TransactionsView } from './views/TransactionsView.tsx';
import { BudgetsView } from './views/BudgetsView.tsx';
import { SavingsView } from './views/SavingsView.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { BillsView } from './views/BillsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { TransactionModal } from './components/TransactionModal.tsx';
import { BudgetModal } from './components/BudgetModal.tsx';
import { AddGoalModal, AddContributionModal } from './components/SavingsModal.tsx';

export default function App() {
  // Ensure application remains in standard light mode and clean up any leftover theme data
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.removeItem('finance_theme');
    } catch {
      // ignore
    }
  }, []);

  // Authentication & User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // App navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Cross-module data synchronization
  const [dataVersion, setDataVersion] = useState(0);
  const notifyDataChanged = () => {
    setDataVersion((v: number) => v + 1);
  };

  // Cross-module filter for Transactions view
  const [transactionFilter, setTransactionFilter] = useState<{
    type?: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
    categoryId?: string;
  }>({ type: 'ALL', categoryId: 'ALL' });

  const handleNavigateToTransactions = (filter?: { type?: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'; categoryId?: string }) => {
    if (filter) {
      setTransactionFilter(filter);
    }
    setCurrentTab('transactions');
  };

  // Modal states
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transModalType, setTransModalType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetModalMonth, setBudgetModalMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [selectedGoalForContrib, setSelectedGoalForContrib] = useState<SavingsGoal | null>(null);

  const handleOpenAddBudget = (month?: string) => {
    if (month) setBudgetModalMonth(month);
    setIsBudgetModalOpen(true);
  };

  // Load user session on boot
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiFetch('/api/me');
        if (res.user) {
          setCurrentUser(res.user);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch categories whenever user is logged in
  const loadCategories = async () => {
    try {
      const res = await apiFetch('/api/categories');
      setCategories(res.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await apiFetch('/api/accounts');
      setAccounts(res.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadCategories();
      loadAccounts();
    }
  }, [currentUser, dataVersion]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setStoredToken(null);
      setCurrentUser(null);
      setCurrentTab('dashboard');
    }
  };

  // Open modal helpers
  const handleOpenAddTransaction = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE') => {
    setEditingTransaction(null);
    setTransModalType(type);
    setIsTransModalOpen(true);
  };

  const handleEditTransaction = (trans: Transaction) => {
    setEditingTransaction(trans);
    setTransModalType(trans.type);
    setIsTransModalOpen(true);
  };

  // Loading initial state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-[#6B6B67] tracking-wider uppercase">Loading FinanceOS...</p>
      </div>
    );
  }

  // Not logged in -> Show Auth View (Login / Register / Demo)
  if (!currentUser) {
    return (
      <AuthView
        onAuthSuccess={(user) => {
          clearClientCache();
          setCurrentUser(user);
        }}
      />
    );
  }

  // First time onboarding check
  if (currentUser.onboarding_completed === 0) {
    return (
      <OnboardingView
        user={currentUser}
        onComplete={(updated) => {
          clearClientCache();
          setCurrentUser(updated);
          notifyDataChanged();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col lg:flex-row text-[#111111]">
      {/* Navigation (Desktop Sidebar & Mobile Navbars) */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 min-w-0 p-4 pb-24 sm:p-6 sm:pb-28 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
        {currentTab === 'dashboard' && (
          <DashboardView
            user={currentUser}
            categories={categories}
            onNavigate={(tab, filter) => {
              if (tab === 'transactions') {
                handleNavigateToTransactions(filter);
              } else {
                setCurrentTab(tab);
              }
            }}
            onOpenAddTransaction={handleOpenAddTransaction}
            onOpenAddBudget={handleOpenAddBudget}
            onOpenAddSavings={() => setIsAddGoalModalOpen(true)}
            onOpenAddContribution={(goal) => setSelectedGoalForContrib(goal)}
            onEditTransaction={handleEditTransaction}
            dataVersion={dataVersion}
            onDataChanged={notifyDataChanged}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            user={currentUser}
            categories={categories}
            onOpenAddTransaction={handleOpenAddTransaction}
            onEditTransaction={handleEditTransaction}
            initialFilter={transactionFilter}
            dataVersion={dataVersion}
            onDataChanged={notifyDataChanged}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsView
            user={currentUser}
            categories={categories}
            onOpenAddBudget={handleOpenAddBudget}
            onNavigateToLedger={(catId) => handleNavigateToTransactions({ categoryId: catId || 'ALL', type: 'EXPENSE' })}
            dataVersion={dataVersion}
            onDataChanged={notifyDataChanged}
          />
        )}

        {currentTab === 'savings' && (
          <SavingsView
            user={currentUser}
            onOpenAddGoal={() => setIsAddGoalModalOpen(true)}
            onOpenAddContribution={(goal) => setSelectedGoalForContrib(goal)}
            dataVersion={dataVersion}
            onDataChanged={notifyDataChanged}
          />
        )}

        {currentTab === 'bills' && (
          <BillsView
            user={currentUser}
            categories={categories}
            accounts={accounts}
            dataVersion={dataVersion}
            onRefreshData={notifyDataChanged}
          />
        )}

        {(currentTab === 'analytics' || currentTab === 'reports') && (
          <AnalyticsView user={currentUser} categories={categories} dataVersion={dataVersion} />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={currentUser}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              notifyDataChanged();
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. Transaction Form Modal */}
      <TransactionModal
        isOpen={isTransModalOpen}
        onClose={() => setIsTransModalOpen(false)}
        onSuccess={() => {
          loadCategories();
          notifyDataChanged();
        }}
        categories={categories}
        currency={currentUser.currency}
        transactionToEdit={editingTransaction}
        defaultType={transModalType}
      />

      {/* 2. Budget Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSuccess={() => {
          notifyDataChanged();
        }}
        categories={categories}
        currency={currentUser.currency}
        defaultMonth={budgetModalMonth}
      />

      {/* 3. Add Savings Goal Modal */}
      <AddGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onSuccess={() => {
          notifyDataChanged();
        }}
        currency={currentUser.currency}
      />

      {/* 4. Add Contribution Modal */}
      <AddContributionModal
        isOpen={!!selectedGoalForContrib}
        onClose={() => setSelectedGoalForContrib(null)}
        onSuccess={() => {
          notifyDataChanged();
        }}
        goal={selectedGoalForContrib}
        currency={currentUser.currency}
      />
    </div>
  );
}
