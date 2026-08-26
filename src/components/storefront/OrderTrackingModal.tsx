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

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim() && !orderNumber.trim()) return;

    setIsLoading(true);
    try {
      const data = await api.trackOrders({ mobile: mobile.trim(), orderNumber: orderNumber.trim() });
      setOrders(data.orders || []);
      setSearched(true);
    } catch (err) {
      console.error(err);
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
          className="bg-[#111113] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#222225] relative my-8 text-[#E0E0E0]"
        >
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 text-[#8E9299] hover:text-[#E0E0E0] rounded-full hover:bg-[#161619] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[#161619] border border-[#222225] text-[#C9A227] flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#F3F4F6]">سامانه رهگیری آنلاین سفارشات خطی‌نو</h3>
              <p className="text-xs text-[#8E9299]">شماره موبایل یا شماره سفارش خود را جهت استعلام وضعیت وارد کنید.</p>
            </div>
          </div>

          <form onSubmit={handleTrack} className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#E0E0E0] mb-1">شماره همراه ثبت‌شده:</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-xs text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#E0E0E0] mb-1">یا شماره سفارش:</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-1002"
                  className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-xs text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none font-mono uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Search className="w-4 h-4 text-black" />
              <span>{isLoading ? 'در حال جستجو...' : 'استعلام وضعیت سفارش'}</span>
            </button>
          </form>

          {/* Results */}
          {searched && (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-[#8E9299] text-xs flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-[#8E9299]" />
                  <span>سفارشی با این مشخصات در سیستم خطی‌نو یافت نشد.</span>
                </div>
              ) : (
                orders.map((ord) => {
                  const statusInfo = getOrderStatusBadge(ord.orderStatus);
                  return (
                    <div key={ord.id} className="p-4 rounded-2xl border border-[#222225] bg-[#161619] space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#C9A227]" />
                          <span className="font-mono font-bold text-[#F3F4F6]">{ord.orderNumber}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="text-[#8E9299] leading-relaxed">
                        <div>گیرنده: <span className="font-bold text-[#E0E0E0]">{ord.customerName}</span> ({ord.customerMobile})</div>
                        <div>آدرس: {ord.customerAddress}</div>
                        {ord.trackingCode && (
                          <div className="mt-1 bg-[#1C1C20] border border-[#C9A227]/30 text-[#C9A227] p-2 rounded-xl">
                            کد رهگیری پستی / بارنامه: <span className="font-mono font-bold select-all">{ord.trackingCode}</span>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="pt-2 border-t border-[#222225]">
                        <div className="text-[11px] font-bold text-[#8E9299] mb-1">اقلام خریداری شده:</div>
                        <div className="space-y-1">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-[#E0E0E0]">
                              <span>• {it.productName} ({toPersianDigits(it.quantity)} عدد)</span>
                              <span className="font-bold">{formatToman(it.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#222225] flex justify-between font-black text-[#F3F4F6]">
                        <span>مبلغ نهایی:</span>
                        <span className="text-[#C9A227]">{formatToman(ord.finalAmount)}</span>
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
