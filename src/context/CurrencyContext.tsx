import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CurrencyUnit,
  BASE_CURRENCY,
  getCurrencyLabel,
  normalizeCurrencyUnit,
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

function readStoredCurrency(): CurrencyUnit {
  try {
    return normalizeCurrencyUnit(localStorage.getItem(STORAGE_KEY), BASE_CURRENCY);
  } catch (_) {
    return BASE_CURRENCY;
  }
}

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyUnit>(readStoredCurrency);

  // سرور مرجع تنظیمات فروشگاه است؛ localStorage فقط برای جلوگیری از پرش اولیه استفاده می‌شود.
  useEffect(() => {
    let isMounted = true;
    api.getWebsiteSettings()
      .then((res: any) => {
        if (!isMounted) return;
        const serverCurrency = normalizeCurrencyUnit(res?.storeSettings?.displayCurrency, BASE_CURRENCY);
        setCurrencyState(serverCurrency);
        try {
          localStorage.setItem(STORAGE_KEY, serverCurrency);
        } catch (_) {}
        setActiveDisplayCurrency(serverCurrency);
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
    setActiveDisplayCurrency(currency);
  }, [currency]);

  const setCurrency = (unit: CurrencyUnit, syncWithServer: boolean = true) => {
    const normalized = normalizeCurrencyUnit(unit, BASE_CURRENCY);
    setCurrencyState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch (_) {}
    setActiveDisplayCurrency(normalized);

    if (syncWithServer) {
      api.updateStoreSettings({ displayCurrency: normalized }).catch((err) => {
        console.warn('خطا در ذخیره واحد ارزی در تنظیمات سرور:', err);
      });
    }
  };

  const toggleCurrency = (syncWithServer: boolean = true) => {
    setCurrency(currency === 'IRT' ? 'IRR' : 'IRT', syncWithServer);
  };

  const unitLabel = getCurrencyLabel(currency);

  const formatPrice = (amountInToman: number | string | null | undefined, showUnit: boolean = true): string =>
    formatCurrency(amountInToman, currency, { showUnit });

  const toDisplay = (amountInToman: number): number => convertFromBase(amountInToman, currency);
  const toBase = (amountInDisplay: number): number => convertToBase(amountInDisplay, currency);

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, toggleCurrency, unitLabel, formatPrice, toDisplay, toBase }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: BASE_CURRENCY,
      setCurrency: () => {},
      toggleCurrency: () => {},
      unitLabel: getCurrencyLabel(BASE_CURRENCY),
      formatPrice: (amount, showUnit = true) => formatCurrency(amount, BASE_CURRENCY, { showUnit }),
      toDisplay: (amount) => amount,
      toBase: (amount) => amount,
    };
  }
  return context;
}
