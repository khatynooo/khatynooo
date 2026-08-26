import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  LogOut,
  X,
  CreditCard,
  FileText,
  Sparkles,
  ShoppingBag,
  ChevronLeft,
  Calendar,
  Phone,
  Mail,
  Building,
  Printer,
  Award,
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { OnlineOrder } from '../../types';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileCompletion?: () => void;
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  onClose,
  onOpenProfileCompletion,
}) => {
  const { customer, logout, isProfileCompleted, totalPurchaseAmount, refreshCustomer } = useCustomerAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'club'>('orders');
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      loadOrders();
      refreshCustomer();
    }
  }, [isOpen, customer]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await api.getCustomerOrders();
      if (res.orders) {
        setOrders(res.orders);
      }
    } catch (err: any) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    showToast('شما با موفقیت از حساب کاربری خود خارج شدید.', 'info');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">تحویل شده</span>;
      case 'shipped':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">ارسال شده (در مسیر)</span>;
      case 'confirmed':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">تایید شده</span>;
      case 'cancelled':
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">لغو شده</span>;
      case 'processing':
      default:
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">در حال پردازش و بسته‌بندی</span>;
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl bg-white dark:bg-[#111113] rounded-3xl border border-slate-200 dark:border-[#222225] shadow-2xl overflow-hidden z-10 text-slate-800 dark:text-[#E0E0E0] max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-[#0A0A0B] border-b border-slate-200 dark:border-[#222225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-[#1C1C20] border border-amber-200 dark:border-[#C9A227]/30 text-[#C9A227] flex items-center justify-center font-black shadow-xs">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
                  {customer.name || 'مشتری گرامی'}
                </h3>
                {isProfileCompleted ? (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>پروفایل تکمیل‌شده</span>
                  </span>
                ) : (
                  <button
                    onClick={onOpenProfileCompletion}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                  >
                    <span>تکمیل اجباری مشخصات</span>
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-[#8E9299] flex items-center gap-2 mt-0.5">
                <span>شماره همراه: {toPersianDigits(customer.mobile)}</span>
                <span>•</span>
                <span>مجموع خرید: {formatToman(totalPurchaseAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="خروج از حساب"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 dark:text-[#8E9299] hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#161619] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-[#222225] bg-white dark:bg-[#111113] px-6 text-xs font-bold text-slate-600 dark:text-[#8E9299]">
          <button
            onClick={() => {
              setActiveTab('orders');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <Package className="w-4 h-4 text-[#C9A227]" />
            <span>تاریخچه سفارش‌های من ({toPersianDigits(orders.length)})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <MapPin className="w-4 h-4 text-[#C9A227]" />
            <span>اطلاعات پستی و آدرس‌ها</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('club');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'club'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <Award className="w-4 h-4 text-[#C9A227]" />
            <span>باشگاه مشتریان و تخفیف‌ها</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <>
              {selectedOrder ? (
                /* Order Details View */
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#222225] pb-3">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-[#C9A227] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                      <span>بازگشت به لیست سفارش‌ها</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 dark:text-[#8E9299]">
                        شماره سفارش: {selectedOrder.orderNumber}
                      </span>
                      {getStatusBadge(selectedOrder.orderStatus)}
                    </div>
                  </div>

                  {/* Order Overview Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">کد پیگیری مرسوله:</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1 select-all">
                        {selectedOrder.trackingCode || 'در انتظار صدور'}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">روش ارسال:</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                        {selectedOrder.shippingMethod}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">مبلغ کل پرداخت‌شده:</div>
                      <div className="font-bold text-[#C9A227] text-sm mt-1">
                        {formatToman(selectedOrder.finalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                    <div className="font-bold text-slate-700 dark:text-[#E0E0E0] mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>نشانی تحویل گیرنده:</span>
                    </div>
                    <p className="text-slate-600 dark:text-[#8E9299]">{selectedOrder.customerAddress}</p>
                  </div>

                  {/* Items List */}
                  <div>
                    <div className="font-bold text-slate-700 dark:text-[#E0E0E0] mb-2">اقلام فاکتور شده:</div>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=200&auto=format&fit=crop&q=80'}
                              alt={item.productName}
                              className="w-12 h-12 object-contain rounded-lg bg-white dark:bg-black p-1 border border-slate-200 dark:border-[#222225]"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-[#F3F4F6]">{item.productName}</div>
                              <div className="text-slate-500 dark:text-[#8E9299] mt-0.5">
                                تعداد: {toPersianDigits(item.quantity)} {item.unit || 'عدد'} × {formatToman(item.unitPrice)}
                              </div>
                            </div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-[#F3F4F6]">
                            {formatToman(item.total || item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Orders List */
                <>
                  {isLoadingOrders ? (
                    <div className="py-12 text-center text-xs text-slate-400 dark:text-[#8E9299]">
                      در حال بارگذاری سوابق سفارشات...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] flex items-center justify-center mx-auto text-[#8E9299]">
                        <ShoppingBag className="w-8 h-8 text-[#C9A227]" />
                      </div>
                      <div className="text-slate-800 dark:text-[#F3F4F6] font-bold text-sm">
                        هنوز سفارشی برای این حساب ثبت نشده است
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-xs mx-auto">
                        سفارش‌های جدید شما بلافاصله پس از پرداخت در این بخش ذخیره و قابل رهگیری خواهند بود.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((ord) => (
                        <div
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#161619] hover:border-[#C9A227]/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6]">
                                {ord.orderNumber}
                              </span>
                              {getStatusBadge(ord.orderStatus)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-[#8E9299] flex items-center gap-3">
                              <span>
                                {toPersianDigits(ord.items?.length || 0)} قلم کالا
                              </span>
                              <span>•</span>
                              <span>روش ارسال: {ord.shippingMethod}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#222225]">
                            <div className="text-left sm:text-right">
                              <div className="text-[11px] text-slate-400 dark:text-[#8E9299]">مبلغ کل:</div>
                              <div className="text-sm font-black text-[#C9A227]">
                                {formatToman(ord.finalAmount)}
                              </div>
                            </div>
                            <ChevronLeft className="w-5 h-5 text-slate-400 dark:text-[#8E9299]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB 2: PROFILE & ADDRESSES */}
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">
                    اطلاعات پستی و هویتی مشتری
                  </h4>
                  <button
                    onClick={onOpenProfileCompletion}
                    className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    ویرایش مشخصات
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                    <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>نام و نام خانوادگی:</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                      {customer.name || 'ثبت نشده'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                    <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>تلفن همراه (نام کاربری):</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                      {toPersianDigits(customer.mobile)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                    <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>استان و شهر:</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                      {customer.province || '—'} / {customer.city || '—'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                    <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>کد پستی ۱۰ رقمی:</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                      {customer.postalCode ? toPersianDigits(customer.postalCode) : 'ثبت نشده'}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                  <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>نشانی کامل پستی:</span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-[#E0E0E0] mt-1">
                    {customer.fullAddress || customer.address || 'آدرس هنوز ثبت نشده است.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLUB & STATS */}
          {activeTab === 'club' && (
            <div className="space-y-4 text-xs">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-[#C9A227]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-[#F3F4F6] text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#C9A227]" />
                      <span>وضعیت عضویت در باشگاه مشتریان خطی‌نو</span>
                    </h4>
                    <p className="text-slate-500 dark:text-[#8E9299] text-xs mt-1">
                      با هر خرید از فروشگاه و سفارش دفاتر سیمی، اعتبار و کدهای تخفیف اختصاصی دریافت کنید.
                    </p>
                  </div>
                  <span className="bg-[#C9A227] text-slate-950 text-xs font-black px-3 py-1 rounded-full">
                    مشتری وفادار
                  </span>
                </div>

                {/* Progress bar towards 100,000 Toman threshold */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between font-bold">
                    <span>مجموع خرید ثبت‌شده: {formatToman(totalPurchaseAmount)}</span>
                    <span>سقف آستانه: ۱۰۰,۰۰۰ تومان</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-[#1E1E22] h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C9A227] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalPurchaseAmount / 100000) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#8E9299]">
                    {totalPurchaseAmount >= 100000
                      ? '✨ شما به سقف خرید طلایی رسیده‌اید و اولویت ارسال فوری به حساب شما تعلق گرفته است.'
                      : `تنها ${formatToman(100000 - totalPurchaseAmount)} تا دستیابی به مزایای عضویت طلایی فاصله دارید.`}
                  </div>
                </div>
              </div>

              {/* Coupons available */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6]">کدهای تخفیف فعال:</h4>
                <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-dashed border-[#C9A227]/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#C9A227]">کد تخفیف ۱۰٪ خطی‌نو: KHATINOO</div>
                    <div className="text-slate-500 dark:text-[#8E9299] text-[11px] mt-0.5">
                      قابل استفاده در تمام خریدهای بالای ۲۰۰ هزار تومان
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText('KHATINOO');
                      showToast('کد تخفیف کپی شد.', 'success');
                    }}
                    className="bg-amber-50 dark:bg-[#1C1C20] hover:bg-amber-100 dark:hover:bg-[#25252A] text-amber-700 dark:text-[#C9A227] px-3 py-1.5 rounded-lg border border-amber-200 dark:border-[#C9A227]/40 font-bold cursor-pointer"
                  >
                    کپی کد
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
