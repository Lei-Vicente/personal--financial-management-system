import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state
    if (typeof document !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isCurrentlyDark = root.classList.contains('dark');
    
    if (isCurrentlyDark) {
      root.classList.remove('dark');
      localStorage.setItem('finance_theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('finance_theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleTheme();
      }}
      className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#111111] dark:text-[#E8E8E6] hover:bg-[#EBEBE7]/70 dark:hover:bg-[#2A2A28] transition-colors cursor-pointer w-full ${className || ''}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
};
