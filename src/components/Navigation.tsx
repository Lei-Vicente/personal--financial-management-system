import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  PieChart,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  ChevronUp,
  ChevronDown,
  CalendarClock
} from 'lucide-react';
import { User } from '../types.ts';

export type NavTab = 'dashboard' | 'transactions' | 'budgets' | 'savings' | 'bills' | 'analytics' | 'reports' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: User;
  onLogout: () => void;
  onOpenQuickAction?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  user,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-5 h-5" /> },
    { id: 'budgets', label: 'Budgets', icon: <PieChart className="w-5 h-5" /> },
    { id: 'savings', label: 'Savings & Wallets', icon: <PiggyBank className="w-5 h-5" /> },
    { id: 'bills', label: 'Bills & Recurring', icon: <CalendarClock className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab === 'reports' ? 'analytics' : tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[#D9D9D4] dark:border-[#333330] bg-[#FFFFFF] dark:bg-[#1A1A1A] h-screen sticky top-0 z-30 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#D9D9D4]/60 dark:border-[#333330] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] dark:bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F3] text-base block">FinanceOS</span>
              <span className="text-[11px] font-medium text-[#6B6B67] dark:text-[#A1A19D] uppercase tracking-wider block">Personal Ledger</span>
            </div>
          </div>
        </div>

        {/* Navigation Links (Core Modules) */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold tracking-wider uppercase text-[#6B6B67] dark:text-[#A1A19D]">
            Core Modules
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id || (item.id === 'analytics' && currentTab === 'reports');
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'text-[#6B6B67] dark:text-[#A1A19D] hover:text-[#111111] dark:hover:text-[#F5F5F3] hover:bg-[#EBEBE7]/70 dark:hover:bg-[#2A2A28]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-[#6B6B67] dark:text-[#A1A19D]'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User Area: Interactive Profile Account Menu Trigger & Popover */}
        <div ref={profileMenuRef} className="relative p-3 border-t border-[#D9D9D4] dark:border-[#333330] bg-[#FFFFFF] dark:bg-[#1A1A1A]">
          {/* Profile Account Dropdown Popover */}
          {profileMenuOpen && (
            <div
              id="profile-account-dropdown"
              role="menu"
              aria-label="Profile and account settings"
              className="absolute bottom-full left-1.5 right-1.5 mb-2.5 bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#D9D9D4] dark:border-[#333330] rounded-2xl shadow-xl p-3 z-50 animate-fadeIn"
            >
              {/* User Account Info Header */}
              <div className="px-2 py-2 mb-2 border-b border-[#D9D9D4]/60 dark:border-[#333330]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#111111] dark:bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#D9D9D4] dark:border-[#444]">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <p className="text-xs font-bold text-[#111111] dark:text-[#F5F5F3] truncate">{user.full_name}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#EBEBE7] dark:bg-[#2A2A28] text-[#6B6B67] dark:text-[#A1A19D]">
                        {user.currency || 'PHP'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B6B67] dark:text-[#A1A19D] truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Settings & Profile Nav Action */}
              <button
                id="profile-menu-settings-btn"
                role="menuitem"
                onClick={() => {
                  handleNavClick('settings');
                  setProfileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  currentTab === 'settings'
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-[#111111] dark:text-[#E8E8E6] hover:bg-[#EBEBE7]/70 dark:hover:bg-[#2A2A28]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings & Profile</span>
              </button>

              {/* Sign Out Action */}
              <button
                id="profile-menu-logout-btn"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center space-x-2.5 px-2.5 py-2 mt-0.5 rounded-xl text-xs font-medium text-[#B91C1C] dark:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Trigger Button: Profile Account card */}
          <button
            id="desktop-profile-menu-trigger"
            type="button"
            aria-expanded={profileMenuOpen}
            aria-haspopup="true"
            aria-label="User profile and account settings"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
              profileMenuOpen
                ? 'border-[#2563EB] bg-[#EBEBE7]/80 dark:bg-[#2A2A28] ring-2 ring-[#2563EB]/20'
                : 'border-[#D9D9D4] dark:border-[#333330] hover:bg-[#EBEBE7]/60 dark:hover:bg-[#252523]'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#EBEBE7] dark:bg-[#2A2A28] flex items-center justify-center font-bold text-xs text-[#111111] dark:text-[#F5F5F3] shrink-0 border border-[#D9D9D4] dark:border-[#444]">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F3] truncate">{user.full_name}</p>
                <p className="text-[11px] text-[#6B6B67] dark:text-[#A1A19D] truncate">Account & Settings</p>
              </div>
            </div>
            <div className="ml-1 text-[#6B6B67] dark:text-[#A1A19D]">
              {profileMenuOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#FFFFFF] dark:bg-[#1A1A1A] border-b border-[#D9D9D4] dark:border-[#333330] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#111111] dark:bg-[#2563EB] flex items-center justify-center text-white">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#111111] dark:text-[#F5F5F3]">FinanceOS</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="mobile-drawer-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#6B6B67] dark:text-[#A1A19D] hover:bg-[#EBEBE7] dark:hover:bg-[#2A2A28] hover:text-[#111111] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto space-y-4 border-t border-[#D9D9D4] dark:border-[#333330]">
            {/* User Profile Card in Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D4] dark:border-[#333330]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#EBEBE7] dark:bg-[#2A2A28] flex items-center justify-center font-bold text-sm text-[#111111] dark:text-[#F5F5F3] border border-[#D9D9D4] dark:border-[#444]">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F3]">{user.full_name}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EBEBE7] dark:bg-[#2A2A28] text-[#6B6B67] dark:text-[#A1A19D]">
                      {user.currency || 'PHP'}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B67] dark:text-[#A1A19D]">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#6B6B67] dark:text-[#A1A19D] hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Modules List */}
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-[#6B6B67] dark:text-[#A1A19D]">
                Core Modules
              </div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    currentTab === item.id || (item.id === 'analytics' && currentTab === 'reports')
                      ? 'bg-[#111111] text-white'
                      : 'text-[#111111] dark:text-[#E8E8E6] hover:bg-[#EBEBE7] dark:hover:bg-[#2A2A28]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Account & Preferences section */}
            <div className="pt-2 border-t border-[#D9D9D4] dark:border-[#333330] space-y-2">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-[#6B6B67] dark:text-[#A1A19D]">
                Account & Preferences
              </div>

              {/* Settings Action */}
              <button
                id="mobile-drawer-settings-btn"
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  currentTab === 'settings'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#111111] dark:text-[#E8E8E6] hover:bg-[#EBEBE7] dark:hover:bg-[#2A2A28]'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Settings & Profile</span>
              </button>

              {/* Sign Out Action */}
              <button
                id="mobile-drawer-logout-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-[#B91C1C] dark:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF]/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md border-t border-[#D9D9D4] dark:border-[#333330] flex items-center justify-around py-1.5 px-2">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium ${
            currentTab === 'dashboard' ? 'text-[#111111] dark:text-[#F5F5F3] font-semibold' : 'text-[#6B6B67] dark:text-[#A1A19D]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onTabChange('transactions')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium ${
            currentTab === 'transactions' ? 'text-[#111111] dark:text-[#F5F5F3] font-semibold' : 'text-[#6B6B67] dark:text-[#A1A19D]'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => onTabChange('budgets')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium ${
            currentTab === 'budgets' ? 'text-[#111111] dark:text-[#F5F5F3] font-semibold' : 'text-[#6B6B67] dark:text-[#A1A19D]'
          }`}
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span>Budgets</span>
        </button>

        <button
          onClick={() => onTabChange('savings')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium ${
            currentTab === 'savings' ? 'text-[#111111] dark:text-[#F5F5F3] font-semibold' : 'text-[#6B6B67] dark:text-[#A1A19D]'
          }`}
        >
          <PiggyBank className="w-5 h-5 mb-0.5" />
          <span>Savings</span>
        </button>

        <button
          onClick={() => onTabChange('analytics')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium ${
            currentTab === 'analytics' ? 'text-[#111111] dark:text-[#F5F5F3] font-semibold' : 'text-[#6B6B67] dark:text-[#A1A19D]'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>Analytics</span>
        </button>
      </nav>
    </>
  );
};
