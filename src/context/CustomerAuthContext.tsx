import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, CustomerOtpResponse, CustomerAuthResponse } from '../types';
import { api } from '../lib/api';

interface CustomerAuthContextType {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileCompleted: boolean;
  totalPurchaseAmount: number;
  isAuthModalOpen: boolean;
  authModalPrompt?: string;
  openAuthModal: (optionsOrPrompt?: string | { promptReason?: string; onSuccess?: () => void }) => void;
  closeAuthModal: () => void;
  sendOtp: (mobile: string) => Promise<CustomerOtpResponse>;
  verifyOtp: (mobile: string, code: string) => Promise<CustomerAuthResponse>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
  updateProfile: (data: {
    name: string;
    email?: string;
    province?: string;
    city?: string;
    postalCode?: string;
    fullAddress?: string;
    nationalCode?: string;
    companyName?: string;
  }) => Promise<Customer>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('khatinoo_customer_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('khatinoo_customer_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);
  const [pendingSuccessCallback, setPendingSuccessCallback] = useState<(() => void) | null>(null);

  const refreshCustomer = useCallback(async () => {
    const currentToken = localStorage.getItem('khatinoo_customer_token');
    if (!currentToken) {
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getCustomerMe();
      if (res.customer) {
        setCustomer(res.customer);
        localStorage.setItem('khatinoo_customer_data', JSON.stringify(res.customer));
      }
    } catch (err) {
      console.warn('Customer session expired or invalid:', err);
      localStorage.removeItem('khatinoo_customer_token');
      localStorage.removeItem('khatinoo_customer_data');
      setToken(null);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCustomer();
  }, [refreshCustomer]);

  const sendOtp = async (mobile: string): Promise<CustomerOtpResponse> => {
    return await api.sendCustomerOtp(mobile);
  };

  const verifyOtp = async (mobile: string, code: string): Promise<CustomerAuthResponse> => {
    const res: CustomerAuthResponse = await api.verifyCustomerOtp(mobile, code);
    if (res.success && res.token && res.customer) {
      localStorage.setItem('khatinoo_customer_token', res.token);
      localStorage.setItem('khatinoo_customer_data', JSON.stringify(res.customer));
      setToken(res.token);
      setCustomer(res.customer);

      if (pendingSuccessCallback) {
        pendingSuccessCallback();
        setPendingSuccessCallback(null);
      }
    }
    return res;
  };

  const updateProfile = async (data: {
    name: string;
    email?: string;
    province?: string;
    city?: string;
    postalCode?: string;
    fullAddress?: string;
    nationalCode?: string;
    companyName?: string;
  }): Promise<Customer> => {
    const res = await api.updateCustomerProfile(data);
    if (res.customer) {
      setCustomer(res.customer);
      localStorage.setItem('khatinoo_customer_data', JSON.stringify(res.customer));
      return res.customer;
    }
    throw new Error('خطا در به‌روزرسانی اطلاعات پروفایل');
  };

  const logout = () => {
    localStorage.removeItem('khatinoo_customer_token');
    localStorage.removeItem('khatinoo_customer_data');
    setToken(null);
    setCustomer(null);
  };

  const openAuthModal = (optionsOrPrompt?: string | { promptReason?: string; onSuccess?: () => void }) => {
    if (typeof optionsOrPrompt === 'string') {
      setAuthModalPrompt(optionsOrPrompt);
      setPendingSuccessCallback(null);
    } else {
      setAuthModalPrompt(optionsOrPrompt?.promptReason);
      if (optionsOrPrompt?.onSuccess) {
        setPendingSuccessCallback(() => optionsOrPrompt.onSuccess);
      } else {
        setPendingSuccessCallback(null);
      }
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalPrompt(undefined);
    setPendingSuccessCallback(null);
  };

  // بررسی وضعیت تکمیل مشخصات
  const isProfileCompleted = Boolean(
    customer &&
      customer.name &&
      customer.name.trim().length > 1 &&
      (customer.fullAddress || customer.address) &&
      customer.postalCode &&
      customer.province &&
      customer.city
  );

  const totalPurchaseAmount = Number(customer?.totalPurchaseAmount || 0);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        isAuthenticated: Boolean(token && customer),
        isProfileCompleted,
        totalPurchaseAmount,
        isAuthModalOpen,
        authModalPrompt,
        openAuthModal,
        closeAuthModal,
        sendOtp,
        verifyOtp,
        logout,
        refreshCustomer,
        updateProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = (): CustomerAuthContextType => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
