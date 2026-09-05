import React from 'react';
import { toEnglishDigits } from '../../lib/utils';

interface CurrencyInputProps {
  id?: string;
  value: number | string;
  onChange: (val: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helperText?: string;
  showRialConversion?: boolean;
}

// فرمت سه‌رقم‌سه‌رقم
function formatCommaSeparated(val: number | string): string {
  if (val === undefined || val === null || val === '') return '';
  const clean = toEnglishDigits(String(val)).replace(/[^0-9]/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('fa-IR');
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  value,
  onChange,
  label,
  placeholder = '۰',
  disabled = false,
  required = false,
  className = '',
  helperText,
  showRialConversion = true,
}) => {
  const numValue = typeof value === 'number' ? value : Number(toEnglishDigits(String(value)).replace(/[^0-9]/g, '')) || 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
    const parsed = raw ? parseInt(raw, 10) : 0;
    onChange(parsed);
  };

  const rialEquivalent = numValue * 10;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
          {numValue > 0 && showRialConversion && (
            <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              معادل: {rialEquivalent.toLocaleString('fa-IR')} ریال
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          dir="ltr"
          disabled={disabled}
          required={required}
          value={numValue > 0 ? numValue.toLocaleString('en-US') : ''}
          placeholder={placeholder}
          onChange={handleChange}
          className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-800/90 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono text-left tracking-wider text-base focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed pl-16"
        />
        <div className="absolute left-3 pointer-events-none text-xs font-bold text-stone-500 dark:text-stone-400 select-none">
          تومان
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400">{helperText}</p>
      )}
    </div>
  );
};
