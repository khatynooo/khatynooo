import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        title={isDark ? 'تغییر به حالت روشن (Light Mode)' : 'تغییر به حالت تاریک (Dark Mode)'}
        aria-label={isDark ? 'حالت روشن' : 'حالت تاریک'}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-[#161619] hover:bg-[#222226] border-[#2D2D33] text-[#C9A227] hover:text-amber-300'
            : 'bg-white hover:bg-slate-100 border-slate-200 text-amber-600 hover:text-amber-700 shadow-xs'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'تغییر به پوسته روشن' : 'تغییر به پوسته تاریک'}
      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
        isDark
          ? 'bg-[#161619] hover:bg-[#222226] border-[#2D2D33] text-[#E0E0E0] hover:text-[#C9A227]'
          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-amber-600 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="hidden sm:inline">حالت روشن</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">حالت شب</span>
        </>
      )}
    </button>
  );
};
