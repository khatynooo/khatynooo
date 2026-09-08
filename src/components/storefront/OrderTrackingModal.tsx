import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Package, Clock, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, getOrderStatusBadge } from '../../lib/utils';
import { OnlineOrder } from '../../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, onClose }) => {
  const [mobile, setMobile] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim() || !orderNumber.trim()) {
      setErrorMessage('لطفاً هم شماره همراه و هم شماره سفارش را جهت استعلام دقیق وارد نمایید.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.trackOrders({ mobile: mobile.trim(), orderNumber: orderNumber.trim() });
      setOrders(data.orders || []);
      setSearched(true);
    } catch (err: any) {
      setOrders([]);
      setSearched(true);
      setErrorMessage(err.message || 'سفارشی با این مشخصات در سیستم خطی‌نو یافت نشد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#111113] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[var(--line-soft)] dark:border-[#222225] relative my-8 text-[var(--ink-charcoal)] dark:text-[#E0E0E0]"
        >
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#E0E0E0] rounded-full hover:bg-slate-100 dark:hover:bg-[#161619] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[var(--coral)]/10 border border-[var(--coral)]/30 text-[var(--coral)] flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-[#F3F4F6]">سامانه رهگیری آنلاین سفارشات خطی‌نو</h3>
              <p className="text-xs text-slate-500 dark:text-[#8E9299]">جهت حفظ امنیت اطلاعات، شماره همراه ثبت‌شده و شماره سفارش خود را وارد کنید.</p>
            </div>
          </div>

          <form onSubmit={handleTrack} className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#E0E0E0] mb-1">
                  شماره همراه ثبت‌شده: <span className="text-[var(--coral)]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="09123456789"
                  className="w-full bg-[var(--paper)] dark:bg-[#161619] border border-[var(--line-soft)] dark:border-[#2D2D33] rounded-xl p-2.5 text-xs text-slate-800 dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-[#8E9299] focus:border-[var(--teal)] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#E0E0E0] mb-1">
                  شماره سفارش: <span className="text-[var(--coral)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => {
                    setOrderNumber(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="ORD-1002"
                  className="w-full bg-[var(--paper)] dark:bg-[#161619] border border-[var(--line-soft)] dark:border-[#2D2D33] rounded-xl p-2.5 text-xs text-slate-800 dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-[#8E9299] focus:border-[var(--teal)] outline-none font-mono uppercase"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--coral)] hover:brightness-110 text-white font-black py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Search className="w-4 h-4 text-white" />
              <span>{isLoading ? 'در حال جستجو...' : 'استعلام وضعیت سفارش'}</span>
            </button>
          </form>

          {/* Results */}
          {searched && (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-[#8E9299] text-xs flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 dark:text-[#8E9299]" />
                  <span>سفارشی با این مشخصات در سیستم خطی‌نو یافت نشد.</span>
                </div>
              ) : (
                orders.map((ord) => {
                  const statusInfo = getOrderStatusBadge(ord.orderStatus);
                  return (
                    <div key={ord.id} className="p-4 rounded-2xl border border-[var(--line-soft)] dark:border-[#222225] bg-[var(--paper)] dark:bg-[#161619] space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[var(--teal)]" />
                          <span className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6]">{ord.orderNumber}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="text-slate-600 dark:text-[#8E9299] leading-relaxed">
                        <div>گیرنده: <span className="font-bold text-slate-900 dark:text-[#E0E0E0]">{ord.customerName}</span> ({ord.customerMobile})</div>
                        <div>آدرس: {ord.customerAddress}</div>
                        {ord.trackingCode && (
                          <div className="mt-1 bg-[var(--teal)]/10 border border-[var(--teal)]/30 text-[var(--teal)] p-2 rounded-xl">
                            کد رهگیری پستی / بارنامه: <span className="font-mono font-bold select-all">{ord.trackingCode}</span>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="pt-2 border-t border-[var(--line-soft)] dark:border-[#222225]">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-[#8E9299] mb-1">اقلام خریداری شده:</div>
                        <div className="space-y-1">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-slate-800 dark:text-[#E0E0E0]">
                              <span>• {it.productName} ({toPersianDigits(it.quantity)} عدد)</span>
                              <span className="font-bold">{formatToman(it.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--line-soft)] dark:border-[#222225] flex justify-between font-black text-slate-900 dark:text-[#F3F4F6]">
                        <span>مبلغ نهایی:</span>
                        <span className="text-[var(--coral)]">{formatToman(ord.finalAmount)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
