import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CurrencyUnit,
  getCurrencyLabel,
  convertFromBase,
  convertToBase,
  formatCurrency,
} from '../lib/currency';
import { setActiveDisplayCurrency } from '../lib/utils';
import { api } from '../lib/api';

interface CurrencyContextType {
  currency: CurrencyUnit;
  setCurrency: (unit: CurrencyUnit, syncWithServer?: boolean) => void;
  toggleCurrency: (syncWithServer?: boolean) => void;
  unitLabel: string;
  formatPrice: (amountInToman: number | string | null | undefined, showUnit?: boolean) => string;
  toDisplay: (amountInToman: number) => number;
  toBase: (amountInDisplay: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'khatynoo_display_currency';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ۱. مقدار اولیه از localStorage برای پیشگیری از فلیکر در لود اولیه
  const [currency, setCurrencyState] = useState<CurrencyUnit>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'IRR' || saved === 'IRT') {
        return saved;
      }
    } catch (_) {}
    return 'IRT'; // پیش‌فرض: تومان
  });

  // ۲. همگام‌سازی اولیه با واحد تنظیم‌شده در پایگاه داده سرور (store_settings)
  useEffect(() => {
    let isMounted = true;
    api.getWebsiteSettings()
      .then((res: any) => {
        if (!isMounted) return;
        const serverCurrency = res?.storeSettings?.displayCurrency;
        if (serverCurrency === 'IRR' || serverCurrency === 'IRT') {
          setCurrencyState(serverCurrency);
          try {
            localStorage.setItem(STORAGE_KEY, serverCurrency);
          } catch (_) {}
          setActiveDisplayCurrency(serverCurrency);
        }
      })
      .catch((err) => {
        console.warn('عدم امکان همگام‌سازی ارز با سرور:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch (_) {}
    // همگام‌سازی با هلپر فرمت سراسری در utils.ts
    setActiveDisplayCurrency(currency);
  }, [currency]);

  const setCurrency = (unit: CurrencyUnit, syncWithServer: boolean = true) => {
    setCurrencyState(unit);
    try {
      localStorage.setItem(STORAGE_KEY, unit);
    } catch (_) {}
    setActiveDisplayCurrency(unit);

    if (syncWithServer) {
      api.updateStoreSettings({ displayCurrency: unit }).catch((err) => {
        console.warn('خطا در ذخیره واحد ارزی در تنظیمات سرور:', err);
      });
    }
  };

  const toggleCurrency = (syncWithServer: boolean = true) => {
    const nextUnit: CurrencyUnit = currency === 'IRT' ? 'IRR' : 'IRT';
    setCurrency(nextUnit, syncWithServer);
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
