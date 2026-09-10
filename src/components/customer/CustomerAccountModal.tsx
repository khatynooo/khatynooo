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
  Activity,
  History,
  Pencil,
  Check,
  Loader2,
  ShieldCheck,
  Receipt,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { OnlineOrder, SalesInvoice } from '../../types';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface CustomerActivity {
  id: string;
  customerId: string;
  activityType: string;
  title: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

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
  const { customer, logout, isProfileCompleted, totalPurchaseAmount, refreshCustomer, updateProfile } = useCustomerAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'invoices' | 'activities' | 'profile' | 'club'>('orders');

  // Online Orders state
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);

  // Sales Invoices state
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Customer Activities state
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState(customer?.name || '');
  const [editNationalCode, setEditNationalCode] = useState(customer?.nationalCode || '');
  const [editEmail, setEditEmail] = useState(customer?.email || '');
  const [editCompanyName, setEditCompanyName] = useState(customer?.companyName || '');
  const [editProvince, setEditProvince] = useState(customer?.province || '');
  const [editCity, setEditCity] = useState(customer?.city || '');
  const [editPostalCode, setEditPostalCode] = useState(customer?.postalCode || '');
  const [editAddress, setEditAddress] = useState(customer?.fullAddress || customer?.address || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && customer) {
      loadAllCustomerData();
      refreshCustomer();

      // Synchronize form fields
      setEditName(customer.name || '');
      setEditNationalCode(customer.nationalCode || '');
      setEditEmail(customer.email || '');
      setEditCompanyName(customer.companyName || '');
      setEditProvince(customer.province || '');
      setEditCity(customer.city || '');
      setEditPostalCode(customer.postalCode || '');
      setEditAddress(customer.fullAddress || customer.address || '');
    }
  }, [isOpen, customer?.id]);

  const loadAllCustomerData = async () => {
    setIsLoadingOrders(true);
    setIsLoadingInvoices(true);
    setIsLoadingActivities(true);

    try {
      const [ordRes, invRes, actRes] = await Promise.allSettled([
        api.getCustomerOrders(),
        api.getCustomerSalesInvoices(),
        api.getCustomerActivities(),
      ]);

      if (ordRes.status === 'fulfilled' && ordRes.value?.orders) {
        setOrders(ordRes.value.orders);
      }
      if (invRes.status === 'fulfilled' && invRes.value?.invoices) {
        setSalesInvoices(invRes.value.invoices);
      }
      if (actRes.status === 'fulfilled' && actRes.value?.activities) {
        setActivities(actRes.value.activities);
      }
    } catch (err: any) {
      console.error('Error fetching customer account data:', err);
    } finally {
      setIsLoadingOrders(false);
      setIsLoadingInvoices(false);
      setIsLoadingActivities(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    showToast('شما با موفقیت از حساب کاربری خود خارج شدید.', 'info');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('لطفاً نام و نام خانوادگی خود را وارد نمایید.', 'warning');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: editName.trim(),
        nationalCode: editNationalCode.trim() || undefined,
        email: editEmail.trim() || undefined,
        companyName: editCompanyName.trim() || undefined,
        province: editProvince.trim() || undefined,
        city: editCity.trim() || undefined,
        postalCode: editPostalCode.trim() || undefined,
        fullAddress: editAddress.trim() || undefined,
      });

      showToast('مشخصات شما با موفقیت ذخیره شد.', 'success');
      setIsEditingProfile(false);
      // Reload activities so that the profile update log appears
      api.getCustomerActivities().then((res) => {
        if (res.activities) setActivities(res.activities);
      });
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره مشخصات', 'error');
    } finally {
      setIsSavingProfile(false);
    }
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'auth_otp_login':
      case 'login':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'order_created':
        return <ShoppingBag className="w-4 h-4 text-[#C9A227]" />;
      case 'sales_invoice_created':
      case 'invoice':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'payment_recorded':
      case 'payment':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'profile_updated':
        return <Pencil className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
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
        className="relative w-full max-w-5xl bg-white dark:bg-[#111113] rounded-3xl border border-slate-200 dark:border-[#222225] shadow-2xl overflow-hidden z-10 text-slate-800 dark:text-[#E0E0E0] max-h-[92vh] flex flex-col"
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
                    <span>پروفایل کامل</span>
                  </span>
                ) : (
                  <button
                    onClick={onOpenProfileCompletion}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                  >
                    <span>تکمیل مشخصات</span>
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-[#8E9299] flex flex-wrap items-center gap-2 mt-0.5">
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
        <div className="flex items-center border-b border-slate-200 dark:border-[#222225] bg-white dark:bg-[#111113] px-4 sm:px-6 text-xs font-bold text-slate-600 dark:text-[#8E9299] overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('orders');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <Package className="w-4 h-4 text-[#C9A227]" />
            <span>سفارشات آنلاین ({toPersianDigits(orders.length)})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('invoices');
              setSelectedInvoice(null);
            }}
            className={`py-3.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#C9A227]" />
            <span>فاکتورهای فروش ({toPersianDigits(salesInvoices.length)})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('activities');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'activities'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <History className="w-4 h-4 text-[#C9A227]" />
            <span>تاریخچه فعالیت‌ها ({toPersianDigits(activities.length)})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <MapPin className="w-4 h-4 text-[#C9A227]" />
            <span>مشخصات و آدرس‌ها</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('club');
              setSelectedOrder(null);
            }}
            className={`py-3.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'club'
                ? 'border-[#C9A227] text-slate-900 dark:text-[#F3F4F6] font-black'
                : 'border-transparent hover:text-slate-900 dark:hover:text-[#E0E0E0]'
            }`}
          >
            <Award className="w-4 h-4 text-[#C9A227]" />
            <span>باشگاه مشتریان</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: ONLINE ORDERS */}
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
                      <div className="font-bold text-[#C9A227] text-sm mt-1 font-mono">
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
                    <div className="font-bold text-slate-700 dark:text-[#E0E0E0] mb-2">اقلام سفارش:</div>
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
                              <div className="text-slate-500 dark:text-[#8E9299] mt-0.5 font-mono">
                                تعداد: {toPersianDigits(item.quantity)} {item.unit || 'عدد'} × {formatToman(item.unitPrice)}
                              </div>
                            </div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-[#F3F4F6] font-mono">
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
                    <div className="py-12 text-center text-xs text-slate-400 dark:text-[#8E9299] flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                      <span>در حال بارگذاری سوابق سفارشات آنلاین...</span>
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
                        سفارش‌های جدید شما بلافاصله پس از ثبت در فروشگاه در این بخش ذخیره و قابل رهگیری خواهند بود.
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
                              <span>•</span>
                              <span className="font-mono">
                                {new Date(ord.createdAt).toLocaleDateString('fa-IR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#222225]">
                            <div className="text-left sm:text-right">
                              <div className="text-[11px] text-slate-400 dark:text-[#8E9299]">مبلغ کل:</div>
                              <div className="text-sm font-black text-[#C9A227] font-mono">
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

          {/* TAB 2: SALES INVOICES */}
          {activeTab === 'invoices' && (
            <>
              {selectedInvoice ? (
                /* Invoice Details View */
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#222225] pb-3">
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="text-[#C9A227] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                      <span>بازگشت به لیست فاکتورها</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 dark:text-[#8E9299]">
                        شماره فاکتور: {selectedInvoice.invoiceNumber}
                      </span>
                      <button
                        onClick={() => window.print()}
                        className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>چاپ فیش</span>
                      </button>
                    </div>
                  </div>

                  {/* Invoice Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">مبلغ کل فاکتور:</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                        {formatToman(selectedInvoice.finalAmount || selectedInvoice.totalAmount)}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">مبلغ پرداخت شده:</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatToman(selectedInvoice.paidAmount || 0)}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">مانده بدهی:</div>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                        {(selectedInvoice.remainingAmount || 0) > 0
                          ? formatToman(selectedInvoice.remainingAmount || 0)
                          : 'تسویه کامل'}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-500 dark:text-[#8E9299]">روش پرداخت:</div>
                      <div className="font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                        {(selectedInvoice.paymentMethod as string) === 'pos' || selectedInvoice.paymentMethod === 'pos_pasargad'
                          ? 'کارتخوان پاسارگاد'
                          : selectedInvoice.paymentMethod === 'cash'
                          ? 'نقدی'
                          : (selectedInvoice.paymentMethod as string) === 'cheque'
                          ? 'چک صیادی'
                          : 'نسیه / اعتباری'}
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 dark:border-[#222225] rounded-xl overflow-hidden bg-white dark:bg-[#111113]">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 dark:bg-[#161619] text-slate-700 dark:text-[#E0E0E0] font-bold border-b border-slate-200 dark:border-[#222225]">
                        <tr>
                          <th className="p-3">نام کالا / خدمت</th>
                          <th className="p-3 text-center">تعداد</th>
                          <th className="p-3">قیمت واحد</th>
                          <th className="p-3 text-left">مبلغ کل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#222225]">
                        {selectedInvoice.items?.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 font-bold text-slate-900 dark:text-[#F3F4F6]">
                              {item.productName}
                            </td>
                            <td className="p-3 text-center font-mono">
                              {toPersianDigits(item.quantity)}
                            </td>
                            <td className="p-3 font-mono text-slate-600 dark:text-[#8E9299]">
                              {formatToman(item.unitPrice)}
                            </td>
                            <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-[#F3F4F6]">
                              {formatToman(item.total || item.quantity * item.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Invoices List */
                <>
                  {isLoadingInvoices ? (
                    <div className="py-12 text-center text-xs text-slate-400 dark:text-[#8E9299] flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                      <span>در حال بارگذاری فاکتورهای فروشگاهی...</span>
                    </div>
                  ) : salesInvoices.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] flex items-center justify-center mx-auto text-[#8E9299]">
                        <Receipt className="w-8 h-8 text-[#C9A227]" />
                      </div>
                      <div className="text-slate-800 dark:text-[#F3F4F6] font-bold text-sm">
                        هنوز فاکتور اداری یا حضوری برای این مشتری صادر نشده است
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-xs mx-auto">
                        فاکتورهای صادرشده توسط انبارداری و حسابداری حضوری در این بخش درج خواهند شد.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {salesInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#161619] hover:border-[#C9A227]/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6]">
                                {inv.invoiceNumber}
                              </span>
                              {(inv.remainingAmount || 0) <= 0 ? (
                                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  تسویه شده
                                </span>
                              ) : (
                                <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  مانده بدهی: {formatToman(inv.remainingAmount || 0)}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-[#8E9299] flex items-center gap-3">
                              <span>{toPersianDigits(inv.items?.length || 0)} قلم</span>
                              <span>•</span>
                              <span className="font-mono">
                                {new Date(inv.createdAt).toLocaleDateString('fa-IR')}
                              </span>
                              <span>•</span>
                              <span>
                                {(inv.paymentMethod as string) === 'pos' || inv.paymentMethod === 'pos_pasargad'
                                  ? 'کارتخوان'
                                  : inv.paymentMethod === 'cash'
                                  ? 'نقدی'
                                  : (inv.paymentMethod as string) === 'cheque'
                                  ? 'چک'
                                  : 'نسیه'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#222225]">
                            <div className="text-left sm:text-right">
                              <div className="text-[11px] text-slate-400 dark:text-[#8E9299]">مبلغ فاکتور:</div>
                              <div className="text-sm font-black text-[#C9A227] font-mono">
                                {formatToman(inv.finalAmount || inv.totalAmount)}
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

          {/* TAB 3: ACTIVITIES & ACTION LOGS */}
          {activeTab === 'activities' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-[#C9A227]" />
                    <span>تاریخچه تمامی فعالیت‌ها، ورودها و رویدادهای حساب</span>
                  </h4>
                  <p className="text-slate-500 dark:text-[#8E9299] text-xs mt-0.5">
                    هرگونه ورود به سامانه، ثبت سفارش، صدور فاکتور یا ویرایش مشخصات در این بخش ثبت می‌شود.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAllCustomerData}
                  className="p-2 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] text-slate-600 dark:text-[#8E9299] hover:text-[#C9A227] transition-colors cursor-pointer"
                  title="به‌روزرسانی وقایع"
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>

              {isLoadingActivities ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-[#8E9299] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                  <span>در حال دریافت رویدادها و فعالیت‌های حساب...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-slate-500 dark:text-[#8E9299]">
                  <Activity className="w-8 h-8 mx-auto text-slate-400 stroke-1" />
                  <div className="font-bold">هنوز رویدادی در تاریخچه این حساب ثبت نشده است.</div>
                </div>
              ) : (
                <div className="relative border-r-2 border-slate-200 dark:border-[#222225] mr-3 pr-4 space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -right-[23px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-[#111113] border-2 border-[#C9A227] group-hover:scale-125 transition-transform" />

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#F3F4F6]">
                            {getActivityIcon(act.activityType)}
                            <span>{act.title}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 dark:text-[#8E9299]">
                            {new Date(act.createdAt).toLocaleDateString('fa-IR')} ساعت {new Date(act.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {act.description && (
                          <p className="text-slate-600 dark:text-[#8E9299] text-xs leading-relaxed">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE & ADDRESSES (WITH DIRECT EDITING) */}
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">
                      مشخصات فردی، هویتی و نشانی پستی
                    </h4>
                    <p className="text-slate-500 dark:text-[#8E9299] text-xs mt-0.5">
                      اطلاعات شما برای ارسال دقیق سفارش‌ها و صدور فاکتور رسمی استفاده می‌شود.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingProfile ? 'لغو ویرایش' : 'ویرایش مشخصات'}</span>
                  </button>
                </div>

                {isEditingProfile ? (
                  /* Inline Edit Form */
                  <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          نام و نام خانوادگی: *
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs outline-none focus:border-[#C9A227]"
                          placeholder="علی رضایی"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          شماره همراه (غیرقابل تغییر):
                        </label>
                        <input
                          type="text"
                          disabled
                          value={toPersianDigits(customer.mobile)}
                          className="w-full bg-slate-100 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs font-mono text-slate-500 outline-none cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          کد ملی (۱۰ رقم):
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={editNationalCode}
                          onChange={(e) => setEditNationalCode(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[#C9A227]"
                          placeholder="۰۰۱۲۳۴۵۶۷۸"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          پست الکترونیک (ایمیل):
                        </label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[#C9A227]"
                          placeholder="example@gmail.com"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          استان:
                        </label>
                        <input
                          type="text"
                          value={editProvince}
                          onChange={(e) => setEditProvince(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs outline-none focus:border-[#C9A227]"
                          placeholder="تهران"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          شهر:
                        </label>
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs outline-none focus:border-[#C9A227]"
                          placeholder="تهران"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          کد پستی (۱۰ رقم):
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={editPostalCode}
                          onChange={(e) => setEditPostalCode(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[#C9A227]"
                          placeholder="۱۲۳۴۵۶۷۸۹۰"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          نام شرکت / سازمان (اختیاری):
                        </label>
                        <input
                          type="text"
                          value={editCompanyName}
                          onChange={(e) => setEditCompanyName(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs outline-none focus:border-[#C9A227]"
                          placeholder="شرکت خصوصی / فروشگاه"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 dark:text-[#E0E0E0] font-bold mb-1">
                          نشانی کامل پستی تحویل:
                        </label>
                        <textarea
                          rows={3}
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl p-2.5 text-xs outline-none focus:border-[#C9A227]"
                          placeholder="خیابان، کوچه، پلاک، واحد..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>در حال ذخیره اطلاعات...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>ذخیره تغییرات مشخصات</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#222225] text-slate-700 dark:text-[#E0E0E0] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Profile View Mode */
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
                        <span>تلفن همراه (شناسه ورود):</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                        {toPersianDigits(customer.mobile)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>کد ملی:</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                        {customer.nationalCode ? toPersianDigits(customer.nationalCode) : 'ثبت نشده'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225]">
                      <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>پست الکترونیک (ایمیل):</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#F3F4F6] mt-1">
                        {customer.email || 'ثبت نشده'}
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

                    <div className="p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] sm:col-span-2">
                      <div className="text-slate-400 dark:text-[#8E9299] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>نشانی کامل پستی تحویل:</span>
                      </div>
                      <div className="font-medium text-slate-800 dark:text-[#E0E0E0] mt-1">
                        {customer.fullAddress || customer.address || 'نشانی پستی هنوز ثبت نشده است.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CLUB & REWARDS */}
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
                    <span>سقف آستانه طلایی: ۱۰۰,۰۰۰ تومان</span>
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
                <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6]">کدهای تخفیف فعال شما:</h4>
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
