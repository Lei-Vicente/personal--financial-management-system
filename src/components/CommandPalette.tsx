import React, { useState, useEffect, useRef } from 'react';
import { Search, Home, ArrowLeftRight, CalendarClock, PieChart, TrendingUp, Settings, Plus, Wallet, PiggyBank } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavTab } from './Navigation.tsx';

interface CommandPaletteProps {
  onNavigate: (tab: NavTab) => void;
  onAction: (action: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <Home className="w-4 h-4" />, type: 'nav', payload: 'dashboard' },
    { id: 'nav-transactions', label: 'Go to Transactions', icon: <ArrowLeftRight className="w-4 h-4" />, type: 'nav', payload: 'transactions' },
    { id: 'nav-bills', label: 'Go to Bills & Schedules', icon: <CalendarClock className="w-4 h-4" />, type: 'nav', payload: 'bills' },
    { id: 'nav-budgets', label: 'Go to Budgets', icon: <PieChart className="w-4 h-4" />, type: 'nav', payload: 'budgets' },
    { id: 'nav-savings', label: 'Go to Savings', icon: <PiggyBank className="w-4 h-4" />, type: 'nav', payload: 'savings' },
    { id: 'nav-analytics', label: 'Go to Analytics', icon: <TrendingUp className="w-4 h-4" />, type: 'nav', payload: 'analytics' },
    { id: 'nav-settings', label: 'Go to Settings', icon: <Settings className="w-4 h-4" />, type: 'nav', payload: 'settings' },
    
    { id: 'act-transaction', label: 'Add New Transaction', icon: <Plus className="w-4 h-4" />, type: 'action', payload: 'ADD_TRANSACTION' },
    { id: 'act-bill', label: 'Add New Bill', icon: <Plus className="w-4 h-4" />, type: 'action', payload: 'ADD_BILL' },
    { id: 'act-budget', label: 'Create New Budget', icon: <Plus className="w-4 h-4" />, type: 'action', payload: 'ADD_BUDGET' },
    { id: 'act-goal', label: 'Create Savings Goal', icon: <Plus className="w-4 h-4" />, type: 'action', payload: 'ADD_GOAL' },
    { id: 'act-wallet', label: 'Add New Wallet', icon: <Wallet className="w-4 h-4" />, type: 'action', payload: 'ADD_WALLET' },
  ];

  const filteredCommands = commands.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));

  const executeCommand = (cmd: typeof commands[0]) => {
    if (cmd.type === 'nav') {
      onNavigate(cmd.payload as NavTab);
    } else {
      onAction(cmd.payload);
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 sm:px-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center px-4 py-3 border-b border-[#D9D9D4]">
              <Search className="w-5 h-5 text-[#6B6B67] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent border-none outline-none px-3 text-sm font-semibold text-[#111111] placeholder:font-normal placeholder:text-[#6B6B67]"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center space-x-1 shrink-0">
                <kbd className="px-2 py-1 bg-[#F5F5F3] border border-[#D9D9D4] rounded-lg text-[10px] font-bold text-[#6B6B67]">esc</kbd>
              </div>
            </div>

            <div className="overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B6B67]">No commands found.</div>
              ) : (
                <div className="space-y-1">
                  {filteredCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className="w-full flex items-center px-3 py-2.5 rounded-xl hover:bg-[#F5F5F3] hover:text-[#111111] text-[#6B6B67] transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#EBEBE7] group-hover:bg-[#FFFFFF] group-hover:shadow-xs flex items-center justify-center shrink-0 transition-all mr-3 text-[#111111]">
                        {cmd.icon}
                      </div>
                      <span className="text-xs font-semibold">{cmd.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
