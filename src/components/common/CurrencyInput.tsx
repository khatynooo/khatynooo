import React, { useState, useEffect } from 'react';
import { CurrencyUnit, getCurrencyLabel, convertToBase, convertFromBase } from '../../lib/currency';
import { toEnglishDigits, toPersianDigits } from '../../lib/utils';
import { useCurrency } from '../../context/CurrencyContext';

interface CurrencyInputProps {
  id?: string;
  value: number | string | null | undefined; // مبلغ در واحد پایه تومان
  onChange: (valueInToman: number, displayValue: number) => void;
  unit?: CurrencyUnit;
  allowUnitToggle?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  showHelperWord?: boolean; // نمایش معادل حروفی فارسی
}

// تابع تبدیل ساده عدد به حروف برای مبالغ رایج (هزار، میلیون، میلیارد)
function numberToPersianWords(num: number, unitLabel: string): string {
  if (!num || isNaN(num) || num <= 0) return '';
  if (num >= 1_000_000_000) {
    const b = (num / 1_000_000_000).toFixed(1).replace('.0', '');
    return `${toPersianDigits(b)} میلیارد ${unitLabel}`;
  }
  if (num >= 1_000_000) {
    const m = (num / 1_000_000).toFixed(1).replace('.0', '');
    return `${toPersianDigits(m)} میلیون ${unitLabel}`;
  }
  if (num >= 1_000) {
    const k = (num / 1_000).toFixed(1).replace('.0', '');
    return `${toPersianDigits(k)} هزار ${unitLabel}`;
  }
  return `${toPersianDigits(num)} ${unitLabel}`;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  value,
  onChange,
  unit: propUnit,
  allowUnitToggle = false,
  placeholder = '۰',
  className = '',
  disabled = false,
  readOnly = false,
  label,
  required = false,
  error,
  helperText,
  showHelperWord = true,
}) => {
  const { currency: globalCurrency } = useCurrency();
  const currentUnit = propUnit || globalCurrency;
  const [internalUnit, setInternalUnit] = useState<CurrencyUnit>(currentUnit);

  useEffect(() => {
    if (propUnit) {
      setInternalUnit(propUnit);
    }
  }, [propUnit]);

  // تبدیل مقدار پایه (تومان) به واحد نمایشی ورودی
  const numericToman = typeof value === 'number' ? value : Number(toEnglishDigits(value || 0).replace(/,/g, '')) || 0;
  const displayNum = convertFromBase(numericToman, internalUnit);

  const [displayString, setDisplayString] = useState<string>(() => {
    return displayNum > 0 ? toPersianDigits(displayNum.toLocaleString('en-US')) : '';
  });

  useEffect(() => {
    if (displayNum > 0) {
      setDisplayString(toPersianDigits(displayNum.toLocaleString('en-US')));
    } else if (value === 0 || value === '0') {
      setDisplayString('۰');
    } else {
      setDisplayString('');
    }
  }, [value, internalUnit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanEnglish = toEnglishDigits(rawVal).replace(/[,،_\s]/g, '');

    if (!cleanEnglish) {
      setDisplayString('');
      onChange(0, 0);
      return;
    }

    const parsed = Number(cleanEnglish);
    if (isNaN(parsed)) return;

    setDisplayString(toPersianDigits(parsed.toLocaleString('en-US')));
    const valueInToman = convertToBase(parsed, internalUnit);
    onChange(valueInToman, parsed);
  };

  const handleToggleUnit = () => {
    if (!allowUnitToggle) return;
    const newUnit: CurrencyUnit = internalUnit === 'IRT' ? 'IRR' : 'IRT';
    setInternalUnit(newUnit);
  };

  const parsedCurrentNum = Number(toEnglishDigits(displayString).replace(/,/g, '')) || 0;
  const helperWord = showHelperWord && parsedCurrentNum > 0 ? numberToPersianWords(parsedCurrentNum, getCurrencyLabel(internalUnit)) : '';

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="text-rose-500 mr-1">*</span>}
          </label>
          {allowUnitToggle && (
            <button
              type="button"
              onClick={handleToggleUnit}
              className="text-[11px] font-medium text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              تغییر به {getCurrencyLabel(internalUnit === 'IRT' ? 'IRR' : 'IRT')}
            </button>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={displayString}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full bg-slate-50 dark:bg-[#1A1A1E] border ${
            error ? 'border-rose-500 focus:border-rose-600' : 'border-slate-200 dark:border-[#2E2E33] focus:border-orange-500'
          } rounded-xl px-3 py-2 text-sm font-mono text-right text-slate-900 dark:text-white outline-hidden transition-colors pl-14 ${className}`}
        />

        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-[#2A2A2E] px-2 py-0.5 rounded-md">
            {getCurrencyLabel(internalUnit)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 px-1">
        {helperWord ? (
          <span className="text-[11px] text-orange-600 dark:text-orange-400/90 font-medium">
            «{helperWord}»
          </span>
        ) : helperText ? (
          <span className="text-[11px] text-slate-400">{helperText}</span>
        ) : null}

        {error && <span className="text-[11px] text-rose-500 font-medium">{error}</span>}
      </div>
    </div>
  );
};
