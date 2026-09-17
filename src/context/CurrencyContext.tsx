import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CurrencyUnit,
  getCurrencyLabel,
  convertFromBase,
  convertToBase,
  formatCurrency,
} from '../lib/currency';
import { setActiveDisplayCurrency } from '../lib/utils';

interface CurrencyContextType {
  currency: CurrencyUnit;
  setCurrency: (unit: CurrencyUnit) => void;
  toggleCurrency: () => void;
  unitLabel: string;
  formatPrice: (amountInToman: number | string | null | undefined, showUnit?: boolean) => string;
  toDisplay: (amountInToman: number) => number;
  toBase: (amountInDisplay: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'khatynoo_display_currency';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyUnit>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'IRR' || saved === 'IRT') {
        return saved;
      }
    } catch (_) {}
    return 'IRT'; // پیش‌فرض: تومان
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch (_) {}
    // همگام‌سازی با هلپر فرمت سراسری در utils.ts
    setActiveDisplayCurrency(currency);
  }, [currency]);

  const setCurrency = (unit: CurrencyUnit) => {
    setCurrencyState(unit);
  };

  const toggleCurrency = () => {
    setCurrencyState((prev) => (prev === 'IRT' ? 'IRR' : 'IRT'));
  };

  const unitLabel = getCurrencyLabel(currency);

  const formatPrice = (amountInToman: number | string | null | undefined, showUnit: boolean = true): string => {
    return formatCurrency(amountInToman, currency, { showUnit });
  };

  const toDisplay = (amountInToman: number): number => {
    return convertFromBase(amountInToman, currency);
  };

  const toBase = (amountInDisplay: number): number => {
    return convertToBase(amountInDisplay, currency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        toggleCurrency,
        unitLabel,
        formatPrice,
        toDisplay,
        toBase,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    // بازگشت مقادیر پیش‌فرض ایمن در صورت فراخوانی خارج از Provider
    return {
      currency: 'IRT',
      setCurrency: () => {},
      toggleCurrency: () => {},
      unitLabel: 'تومان',
      formatPrice: (amount, showUnit = true) => formatCurrency(amount, 'IRT', { showUnit }),
      toDisplay: (amount) => amount,
      toBase: (amount) => amount,
    };
  }
  return context;
}
