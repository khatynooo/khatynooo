import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Settings,
  AlertCircle,
  X,
  FileText,
  User,
  Phone,
  Layers,
  DollarSign,
  Copy,
  Trash2,
  Edit2,
  RefreshCw,
  MessageSquare,
  Scissors,
  Check,
  ExternalLink,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { BindingOrder, BindingSettings, EitaaCustomerChat, EitaaMessageStatus, BindingPaymentStatus, BindingWorkStatus } from '../../types';
import { useToast } from '../common/Toast';
import { CurrencyInput } from '../common/CurrencyInput';
import { EitaaCrmView } from './eitaa/EitaaCrmView';

export const BindingOrdersView: React.FC = () => {
  const { showToast } = useToast();

  // ناوبری بین بخش‌های سفارشات فنر خالی و ایتا
  const [mainViewMode, setMainViewMode] = useState<'orders' | 'eitaa'>('orders');

  // داده‌های اصلی
  const [orders, setOrders] = useState<BindingOrder[]>([]);
  const [settings, setSettings] = useState<BindingSettings | null>(null);
  const [eitaaChats, setEitaaChats] = useState<EitaaCustomerChat[]>([]);
  const [loading, setLoading] = useState(true);

  // جستجو و فیلترها
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | BindingPaymentStatus>('all');
  const [workFilter, setWorkFilter] = useState<'all' | BindingWorkStatus>('all');

  // مودال ثبت / ویرایش سفارش
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<BindingOrder | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerMobile: '',
    spiralCount: 1,
    spiralUnitPrice: 35000,
    stapleCount: 0,
    stapleUnitPrice: 10000,
    coverCount: 0,
    coverUnitPrice: 20000,
    bookCount: 1,
    unitPrice: 35000,
    discount: 0,
    totalPrice: 35000,
    description: '',
    paymentStatus: 'unpaid' as BindingPaymentStatus,
    workStatus: 'pending' as BindingWorkStatus,
    autoPrintAfterSave: true,
  });

  // مودال تنظیمات
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<BindingSettings>>({});

  // مودال چت‌های ایتا
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [newChatForm, setNewChatForm] = useState({ mobile: '', chatId: '', firstName: '', username: '' });

  // وضعیت رسید چاپی
  const [activePrintOrder, setActivePrintOrder] = useState<BindingOrder | null>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // لود داده‌ها
  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        api.getBindingOrders({
          query: searchQuery,
          paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
          workStatus: workFilter !== 'all' ? workFilter : undefined,
        }),
        api.getBindingSettings().catch(() => ({ settings: null })),
      ]);

      setOrders(ordersRes.orders || []);
      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
        setSettingsForm(settingsRes.settings);
        if (!editingOrder) {
          const spPrice = settingsRes.settings.defaultSpiralPrice || settingsRes.settings.defaultUnitPrice || 35000;
          const stPrice = settingsRes.settings.defaultStaplePrice || 10000;
          const cvPrice = settingsRes.settings.defaultCoverPrice || 20000;
          setFormData((prev) => ({
            ...prev,
            spiralUnitPrice: spPrice,
            stapleUnitPrice: stPrice,
            coverUnitPrice: cvPrice,
            unitPrice: spPrice,
          }));
        }
      }
    } catch (err: any) {
      showToast('خطا در دریافت اطلاعات سفارشات فنرزنی', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [paymentFilter, workFilter]);

  // لود مخاطبان ایتا هنگام باز شدن مودال آن
  const loadEitaaChats = async () => {
    try {
      const res = await api.getEitaaCustomerChats(chatSearch);
      setEitaaChats(res.chats || []);
    } catch (err) {
      console.error('Error loading Eitaa chats:', err);
    }
  };

  useEffect(() => {
    if (showChatsModal) {
      loadEitaaChats();
    }
  }, [showChatsModal, chatSearch]);

  // محاسبه خودکار مبلغ کل و تعداد کل بر اساس فنر، منگنه و جلد
  useEffect(() => {
    const spiralSum = (formData.spiralCount || 0) * (formData.spiralUnitPrice || 0);
    const stapleSum = (formData.stapleCount || 0) * (formData.stapleUnitPrice || 0);
    const coverSum = (formData.coverCount || 0) * (formData.coverUnitPrice || 0);
    const totalCount = (formData.spiralCount || 0) + (formData.stapleCount || 0) + (formData.coverCount || 0);
    const rawTotal = spiralSum + stapleSum + coverSum;
    const finalTotal = Math.max(0, rawTotal - (formData.discount || 0));

    setFormData((prev) => ({
      ...prev,
      bookCount: totalCount > 0 ? totalCount : 1,
      totalPrice: finalTotal,
    }));
  }, [
    formData.spiralCount,
    formData.spiralUnitPrice,
    formData.stapleCount,
    formData.stapleUnitPrice,
    formData.coverCount,
    formData.coverUnitPrice,
    formData.discount,
  ]);

  // باز کردن مودال برای سفارش جدید
  const handleOpenNewOrder = () => {
    setEditingOrder(null);
    const spiralPrice = settings?.defaultSpiralPrice || settings?.defaultUnitPrice || 35000;
    const staplePrice = settings?.defaultStaplePrice || 10000;
    const coverPrice = settings?.defaultCoverPrice || 20000;

    setFormData({
      customerName: '',
      customerMobile: '',
      spiralCount: 1,
      spiralUnitPrice: spiralPrice,
      stapleCount: 0,
      stapleUnitPrice: staplePrice,
      coverCount: 0,
      coverUnitPrice: coverPrice,
      bookCount: 1,
      unitPrice: spiralPrice,
      discount: 0,
      totalPrice: spiralPrice,
      description: '',
      paymentStatus: 'unpaid',
      workStatus: 'pending',
      autoPrintAfterSave: true,
    });
    setShowOrderModal(true);
  };

  // باز کردن برای ویرایش
  const handleOpenEditOrder = (order: BindingOrder) => {
    setEditingOrder(order);
    const spiralPrice = order.spiralUnitPrice ?? order.unitPrice ?? settings?.defaultSpiralPrice ?? 35000;
    const staplePrice = order.stapleUnitPrice ?? settings?.defaultStaplePrice ?? 10000;
    const coverPrice = order.coverUnitPrice ?? settings?.defaultCoverPrice ?? 20000;

    setFormData({
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      spiralCount: order.spiralCount ?? order.bookCount ?? 0,
      spiralUnitPrice: spiralPrice,
      stapleCount: order.stapleCount || 0,
      stapleUnitPrice: staplePrice,
      coverCount: order.coverCount || 0,
      coverUnitPrice: coverPrice,
      bookCount: order.bookCount,
      unitPrice: spiralPrice,
      discount: order.discount,
      totalPrice: order.totalPrice,
      description: order.description || '',
      paymentStatus: order.paymentStatus,
      workStatus: order.workStatus,
      autoPrintAfterSave: false,
    });
    setShowOrderModal(true);
  };

  // ذخیره فرم سفارش
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      showToast('نام مشتری الزامی است.', 'warning');
      return;
    }
    if (!formData.customerMobile.trim()) {
      showToast('شماره همراه مشتری الزامی است.', 'warning');
      return;
    }

    try {
      if (editingOrder) {
        const res = await api.updateBindingOrder(editingOrder.id, formData);
        showToast('سفارش فنرزنی با موفقیت به‌روزرسانی شد.', 'success');
        setShowOrderModal(false);
        loadData();
      } else {
        const res = await api.createBindingOrder(formData);
        showToast(res.message || 'سفارش فنرزنی با موفقیت ثبت شد.', 'success');
        setShowOrderModal(false);
        await loadData();

        if (formData.autoPrintAfterSave && res.order) {
          handlePrint(res.order);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره سفارش فنرزنی', 'error');
    }
  };

  // تغییر سریع وضعیت کار به done یا pending
  const handleToggleWorkStatus = async (order: BindingOrder) => {
    const newStatus: BindingWorkStatus = order.workStatus === 'done' ? 'pending' : 'done';
    try {
      const res = await api.updateBindingOrder(order.id, { workStatus: newStatus });
      showToast(
        newStatus === 'done'
          ? 'وضعیت به آماده تحویل تغییر یافت.'
          : 'وضعیت به در انتظار تغییر یافت.',
        'success'
      );
      if (res.eitaaResult?.success) {
        showToast('پیام آماده‌سازی به ایتا ارسال شد.', 'success');
      } else if (res.eitaaResult?.status === 'no_chat_id') {
        showToast('پیام ایتا ارسال نشد؛ مشتری هنوز در بات ایتا عضو نیست.', 'warning');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت کار', 'error');
    }
  };

  // تغییر وضعیت پرداخت به paid یا unpaid
  const handleTogglePaymentStatus = async (order: BindingOrder) => {
    const newStatus: BindingPaymentStatus = order.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await api.updateBindingOrder(order.id, { paymentStatus: newStatus });
      showToast(
        newStatus === 'paid' ? 'سفارش تسویه شد و در خزانه ثبت گردید.' : 'وضعیت به پرداخت نشده تغییر کرد.',
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت پرداخت', 'error');
    }
  };

  // ارسال دستی پیام ایتا
  const handleSendEitaaMessage = async (order: BindingOrder, type: 'intake' | 'ready') => {
    try {
      const res = await api.sendBindingOrderEitaa(order.id, type);
      if (res.success) {
        showToast(res.message || 'پیام با موفقیت به ایتا ارسال شد.', 'success');
      } else {
        if (res.status === 'no_chat_id') {
          showToast('مشتری هنوز در بات ایتا تعاملی نداشته است. chat_id یافت نشد.', 'warning');
        } else {
          showToast(res.error || 'خطا در ارسال پیام به ایتا', 'error');
        }
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ارسال پیام ایتا', 'error');
    }
  };

  // حذف سفارش
  const handleDeleteOrder = async (order: BindingOrder) => {
    if (!window.confirm(`آیا از حذف سفارش ${order.receiptCode} اطمینان دارید؟`)) {
      return;
    }
    try {
      await api.deleteBindingOrder(order.id);
      showToast('سفارش فنرزنی حذف شد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف سفارش', 'error');
    }
  };

  // ذخیره تنظیمات
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateBindingSettings(settingsForm);
      setSettings(res.settings);
      showToast('تنظیمات فنرزنی با موفقیت ذخیره شد.', 'success');
      setShowSettingsModal(false);
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره تنظیمات', 'error');
    }
  };

  // ثبت دستی چت آی‌دی مشتری در ایتا
  const handleAddEitaaChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatForm.chatId.trim()) {
      showToast('شناسه عددی چت ایتا (chat_id) الزامی است.', 'warning');
      return;
    }
    try {
      await api.registerEitaaCustomerChat({
        ...newChatForm,
        mobile: newChatForm.mobile.trim() || undefined,
        chatId: newChatForm.chatId.trim(),
        firstName: newChatForm.firstName.trim() || undefined,
        username: newChatForm.username.trim() || undefined,
      });
      showToast('اطلاعات حساب و نگاشت ایتا با موفقیت ذخیره شد.', 'success');
      setNewChatForm({ mobile: '', chatId: '', firstName: '', username: '' });
      loadEitaaChats();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت شناسه چت', 'error');
    }
  };

  // حذف چت آی‌دی مشتری
  const handleDeleteEitaaChat = async (identifier: string) => {
    if (!identifier) return;
    if (!window.confirm('آیا از حذف این نگاشت حساب ایتا اطمینان دارید؟')) return;
    try {
      await api.deleteEitaaCustomerChat(identifier);
      showToast('نگاشت حساب مشتری حذف شد.', 'success');
      loadEitaaChats();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف چت', 'error');
    }
  };

  // اجرای پرینت رسید دو نسخه
  const handlePrint = (order: BindingOrder) => {
    setActivePrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // آمار کلی
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.workStatus === 'pending').length;
    const doneCount = orders.filter((o) => o.workStatus === 'done').length;
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalBooks = orders.reduce((sum, o) => sum + (o.bookCount || 0), 0);
    return { totalCount, pendingCount, doneCount, totalRevenue, totalBooks };
  }, [orders]);

  // راهنمای تگ‌های قالب پیام
  const insertTemplateTag = (tag: string, field: 'intakeMessageTemplate' | 'readyMessageTemplate') => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: (prev[field] || '') + tag,
    }));
  };

  const renderEitaaStatusBadge = (status: EitaaMessageStatus, sent: boolean) => {
    if (sent || status === 'sent') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
          <Check className="w-3 h-3" />
          <span>ارسال شد</span>
        </span>
      );
    }
    if (status === 'no_chat_id') {
      return (
        <span
          title="مشتری هنوز در بات ایتا عضو نیست"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 cursor-help"
        >
          <AlertCircle className="w-3 h-3" />
          <span>فاقد چت‌بات</span>
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3 h-3" />
          <span>خطا در ارسال</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
        <span>ارسال نشده</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* استایل‌های اختصاصی پرینت A6/A7 بدون تداخل */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #binding-print-sheet, #binding-print-sheet * {
            visibility: visible;
          }
          #binding-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12px;
            background: #fff;
            color: #000;
            font-family: system-ui, -apple-system, sans-serif;
          }
          @page {
            size: ${settings?.defaultPaperSize === 'A7' ? 'A7 portrait' : 'A6 portrait'};
            margin: 6mm;
          }
        }
      `}</style>

      {/* ناوبری سراسری سفارشات فنر خالی و ایتا */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#161619] p-1.5 rounded-2xl border border-slate-200 dark:border-[#222225] w-fit">
        <button
          onClick={() => setMainViewMode('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainViewMode === 'orders'
              ? 'bg-white dark:bg-[#252529] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          سفارشات فنر خالی و صدور فیش
        </button>
        <button
          onClick={() => setMainViewMode('eitaa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainViewMode === 'eitaa'
              ? 'bg-white dark:bg-[#252529] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          صندوق پیام و مخاطبین ایتا (CRM)
        </button>
      </div>

      {mainViewMode === 'eitaa' && <EitaaCrmView />}

      {mainViewMode === 'orders' && (
        <>
          {/* ۱. هدر و دکمه‌های عملیاتی اصلی */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121215] p-5 rounded-2xl border border-slate-200 dark:border-[#222225] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-[#C9A227]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-[#F3F4F6]">
              سفارشات فنر خالی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ثبت چندگانه خدمات (فنر، منگنه، طلق/جلد)، چاپ دو نسخه فیش (A6/A7) و سامانه پیگیری ایتا
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/eitaa-app/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-emerald-500/30 cursor-pointer"
            title="مشاهده صفحه وب‌اپ مشتری و پیگیری در ایتا"
          >
            <ExternalLink className="w-4 h-4" />
            <span>وب‌اپ ایتا و پیگیری</span>
          </a>

          <button
            onClick={() => setShowChatsModal(true)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-[#1A1A1E] hover:bg-slate-200 dark:hover:bg-[#25252B] text-slate-700 dark:text-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            <Users className="w-4 h-4 text-sky-500" />
            <span>مشتریان ایتا</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-[#1A1A1E] hover:bg-slate-200 dark:hover:bg-[#25252B] text-slate-700 dark:text-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-500" />
            <span>تنظیمات و قالب پیام</span>
          </button>

          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 dark:bg-[#1A1A1E] hover:bg-slate-200 dark:hover:bg-[#25252B] text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="تازه سازی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenNewOrder}
            className="flex items-center gap-2 bg-[#C9A227] hover:bg-[#B38F20] text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-md shadow-[#C9A227]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ثبت سفارش جدید</span>
          </button>
        </div>
      </div>

      {/* ۲. کارت‌های شاخص‌های آماری */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border border-slate-200 dark:border-[#222225] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>کل سفارشات</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-[#F3F4F6] mt-2">
            {toPersianDigits(stats.totalCount)} <span className="text-xs font-normal text-slate-500">سفارش</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            مجموع جلدها: {toPersianDigits(stats.totalBooks)} جلد
          </div>
        </div>

        <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border border-slate-200 dark:border-[#222225] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>در انتظار انجام</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {toPersianDigits(stats.pendingCount)} <span className="text-xs font-normal text-slate-500">سفارش</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">نیاز به صحافی و فنرزنی</div>
        </div>

        <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border border-slate-200 dark:border-[#222225] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>آماده تحویل</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {toPersianDigits(stats.doneCount)} <span className="text-xs font-normal text-slate-500">سفارش</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">آماده تحویل به مشتری</div>
        </div>

        <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border border-slate-200 dark:border-[#222225] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>مجموع درآمد تسویه شده</span>
            <DollarSign className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-[#F3F4F6] mt-2">
            {formatToman(stats.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">ثبت شده در صندوق خدمات</div>
        </div>
      </div>

      {/* ۳. نوار جستجو و فیلترها */}
      <div className="bg-white dark:bg-[#121215] p-4 rounded-2xl border border-slate-200 dark:border-[#222225] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="جستجو بر اساس کد رسید (F-1001)، نام مشتری یا شماره موبایل..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-[#28282E] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#C9A227]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="w-full md:w-36 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-[#28282E] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C9A227]"
          >
            <option value="all">همه پرداخت‌ها</option>
            <option value="paid">تسویه شده</option>
            <option value="unpaid">پرداخت نشده</option>
          </select>

          <select
            value={workFilter}
            onChange={(e) => setWorkFilter(e.target.value as any)}
            className="w-full md:w-36 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-[#18181C] border border-slate-200 dark:border-[#28282E] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C9A227]"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار انجام</option>
            <option value="done">آماده تحویل</option>
            <option value="cancelled">لغو شده</option>
          </select>
        </div>
      </div>

      {/* ۴. جدول سفارشات */}
      <div className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-[#222225] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-[#161619] text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-[#222225]">
              <tr>
                <th className="py-3.5 px-4">کد رسید</th>
                <th className="py-3.5 px-4">نام و شماره مشتری</th>
                <th className="py-3.5 px-4">تعداد جلد</th>
                <th className="py-3.5 px-4">مبلغ کل</th>
                <th className="py-3.5 px-4">وضعیت تسویه</th>
                <th className="py-3.5 px-4">وضعیت کار</th>
                <th className="py-3.5 px-4">اطلاع‌رسانی ایتا</th>
                <th className="py-3.5 px-4">تاریخ ثبت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1C1C20]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C9A227] mb-2" />
                    <span>در حال فراخوانی سفارشات فنرزنی...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <span>هیچ سفارشی یافت نشد.</span>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isPaid = order.paymentStatus === 'paid';
                  const isDone = order.workStatus === 'done';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-[#16161A] transition-colors"
                    >
                      {/* کد رسید */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-amber-100 dark:bg-amber-950/40 text-[#C9A227] px-2 py-0.5 rounded-md font-black border border-amber-300/40">
                            {order.receiptCode}
                          </span>
                        </div>
                      </td>

                      {/* مشتری */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {order.customerName}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{order.customerMobile}</span>
                          {order.hasEitaaChat ? (
                            <span
                              title="چت فعال ایتا موجود است"
                              className="text-emerald-600 dark:text-emerald-400"
                            >
                              ●
                            </span>
                          ) : (
                            <span
                              title="فاقد سابقه چت در ایتا"
                              className="text-slate-300 dark:text-slate-600"
                            >
                              ○
                            </span>
                          )}
                        </div>
                      </td>

                      {/* تعداد جلد و تفکیک خدمات */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {(order.spiralCount ?? 0) > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                              {toPersianDigits(order.spiralCount || 0)} فنر
                            </span>
                          )}
                          {(order.stapleCount ?? 0) > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-300/40">
                              {toPersianDigits(order.stapleCount || 0)} منگنه
                            </span>
                          )}
                          {(order.coverCount ?? 0) > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-300/40">
                              {toPersianDigits(order.coverCount || 0)} جلد
                            </span>
                          )}
                          {(!order.spiralCount && !order.stapleCount && !order.coverCount) && (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {toPersianDigits(order.bookCount)} جلد
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          مجموع: {toPersianDigits(order.bookCount)} جلد
                        </div>
                        {order.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={order.description}>
                            {order.description}
                          </div>
                        )}
                      </td>

                      {/* مبلغ */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formatToman(order.totalPrice)}
                        </div>
                        {order.discount > 0 && (
                          <div className="text-[10px] text-rose-500">
                            تخفیف: {formatToman(order.discount)}
                          </div>
                        )}
                      </td>

                      {/* تسویه */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePaymentStatus(order)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {isPaid ? 'تسویه شده' : 'پرداخت نشده'}
                        </button>
                      </td>

                      {/* وضعیت کار */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleWorkStatus(order)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-emerald-50'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>آماده تحویل</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>در انتظار انجام</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* اطلاع‌رسانی ایتا */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 w-10">پذیرش:</span>
                            {renderEitaaStatusBadge(order.eitaaIntakeStatus, order.eitaaIntakeSent)}
                            {!order.eitaaIntakeSent && (
                              <button
                                onClick={() => handleSendEitaaMessage(order, 'intake')}
                                title="ارسال مجدد پیام پذیرش به ایتا"
                                className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 w-10">تحویل:</span>
                            {renderEitaaStatusBadge(order.eitaaReadyStatus, order.eitaaReadySent)}
                            {!order.eitaaReadySent && (
                              <button
                                onClick={() => handleSendEitaaMessage(order, 'ready')}
                                title="ارسال پیام آماده‌سازی به ایتا"
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* تاریخ */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {new Date(order.createdAt).toLocaleDateString('fa-IR', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* عملیات */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrint(order)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="چاپ رسید (A6/A7)"
                          >
                            <Printer className="w-4 h-4 text-amber-500" />
                          </button>

                          <button
                            onClick={() => handleOpenEditOrder(order)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="ویرایش سفارش"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="حذف سفارش"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ۵. مودال ثبت و ویرایش سفارش فنرزنی */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#141417] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#2A2A30] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#25252B]">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-[#F3F4F6]">
                <BookOpen className="w-4 h-4 text-[#C9A227]" />
                <span>{editingOrder ? `ویرایش سفارش ${editingOrder.receiptCode}` : 'ثبت سفارش فنرزنی جدید'}</span>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام و نام خانوادگی مشتری *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="مثال: علی رضایی"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره همراه مشتری *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customerMobile}
                    onChange={(e) => setFormData({ ...formData, customerMobile: e.target.value })}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-mono focus:border-[#C9A227] focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* بخش تفکیک خدمات صحافی: فنر، منگنه و جلد */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    انتخاب خدمات و تعداد سفارش
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold">
                    مجموع جلدها: {toPersianDigits(formData.bookCount)} جلد
                  </span>
                </div>

                {/* ۱. فنرزنی */}
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      فنرزنی (سیمی / فنر دوبل)
                    </span>
                    <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                      جمع: {formatToman((formData.spiralCount || 0) * (formData.spiralUnitPrice || 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        تعداد جلد فنرزنی
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, spiralCount: Math.max(0, formData.spiralCount - 1) })}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={formData.spiralCount}
                          onChange={(e) => setFormData({ ...formData, spiralCount: Math.max(0, Number(e.target.value)) })}
                          className="w-full text-center py-1.5 rounded-lg bg-white dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono focus:border-[#C9A227] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, spiralCount: formData.spiralCount + 1 })}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <CurrencyInput
                      label="نرخ هر جلد فنرزنی (تومان)"
                      value={formData.spiralUnitPrice}
                      onChange={(val) => setFormData({ ...formData, spiralUnitPrice: val })}
                    />
                  </div>
                </div>

                {/* ۲. منگنه جزوات */}
                <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      منگنه جزوات و اوراق
                    </span>
                    <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">
                      جمع: {formatToman((formData.stapleCount || 0) * (formData.stapleUnitPrice || 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        تعداد منگنه جزوه
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, stapleCount: Math.max(0, formData.stapleCount - 1) })}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={formData.stapleCount}
                          onChange={(e) => setFormData({ ...formData, stapleCount: Math.max(0, Number(e.target.value)) })}
                          className="w-full text-center py-1.5 rounded-lg bg-white dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, stapleCount: formData.stapleCount + 1 })}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <CurrencyInput
                      label="نرخ هر منگنه (تومان)"
                      value={formData.stapleUnitPrice}
                      onChange={(val) => setFormData({ ...formData, stapleUnitPrice: val })}
                    />
                  </div>
                </div>

                {/* ۳. جلد و طلق و پاپوش */}
                <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      جلد / طلق و پاپوش کتاب و جزوه
                    </span>
                    <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400">
                      جمع: {formatToman((formData.coverCount || 0) * (formData.coverUnitPrice || 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        تعداد جلد / طلق
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, coverCount: Math.max(0, formData.coverCount - 1) })}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={formData.coverCount}
                          onChange={(e) => setFormData({ ...formData, coverCount: Math.max(0, Number(e.target.value)) })}
                          className="w-full text-center py-1.5 rounded-lg bg-white dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono focus:border-teal-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, coverCount: formData.coverCount + 1 })}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <CurrencyInput
                      label="نرخ هر جلد (تومان)"
                      value={formData.coverUnitPrice}
                      onChange={(val) => setFormData({ ...formData, coverUnitPrice: val })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <CurrencyInput
                  label="تخفیف (تومان)"
                  value={formData.discount}
                  onChange={(val) => setFormData({ ...formData, discount: val })}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مبلغ قابل پرداخت نهایی (تومان)
                  </label>
                  <div className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-sm font-black font-mono">
                    {formatToman(formData.totalPrice)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وضعیت تسویه مالی
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C9A227] focus:outline-none"
                  >
                    <option value="unpaid">پرداخت نشده (هنگام تحویل)</option>
                    <option value="paid">تسویه شده نقدی / پوز</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وضعیت کارگاه
                  </label>
                  <select
                    value={formData.workStatus}
                    onChange={(e) => setFormData({ ...formData, workStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C9A227] focus:outline-none"
                  >
                    <option value="pending">در انتظار انجام (پذیرش شده)</option>
                    <option value="done">آماده تحویل (ارسال پیامک ایتا)</option>
                    <option value="cancelled">لغو سفارش</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات یا ویژگی‌های خاص سفارش
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="مثال: طلق آبی ضخیم، فنر دوبل شماره ۱۴، جلد شفاف..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              {!editingOrder && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoPrintAfterSave"
                    checked={formData.autoPrintAfterSave}
                    onChange={(e) => setFormData({ ...formData, autoPrintAfterSave: e.target.checked })}
                    className="rounded text-[#C9A227] focus:ring-[#C9A227]"
                  />
                  <label htmlFor="autoPrintAfterSave" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    چاپ خودکار رسید دو نسخه (A6/A7) بلافاصله پس از ثبت
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#25252B]">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#C9A227] hover:bg-[#B38F20] text-slate-950 transition-all shadow-md shadow-[#C9A227]/20"
                >
                  {editingOrder ? 'ذخیره تغییرات' : 'ثبت سفارش و صدور رسید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ۶. مودال تنظیمات و قالب‌های پیام ایتا */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#141417] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#2A2A30] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#25252B]">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-[#F3F4F6]">
                <Settings className="w-4 h-4 text-[#C9A227]" />
                <span>تنظیمات ماژول فنرزنی و اطلاع‌رسانی خودکار ایتا</span>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام فروشگاه روی رسید
                  </label>
                  <input
                    type="text"
                    value={settingsForm.storeName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تلفن تماس روی رسید
                  </label>
                  <input
                    type="text"
                    value={settingsForm.storePhone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storePhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-mono focus:border-[#C9A227] focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  آدرس دقیق فروشگاه روی فیش و وب‌اپ
                </label>
                <input
                  type="text"
                  value={settingsForm.storeAddress || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, storeAddress: e.target.value })}
                  placeholder="مثال: تهران، خیابان انقلاب، روبروی دانشگاه، پلاک..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              {/* ساعات کاری و اندازه کاغذ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ساعات کاری و تحویل فروشگاه
                  </label>
                  <input
                    type="text"
                    value={settingsForm.storeWorkingHours || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeWorkingHours: e.target.value })}
                    placeholder="مثال: شنبه تا چهارشنبه ۹ تا ۲۰ - پنجشنبه ۹ تا ۱۴"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اندازه پیش‌فرض کاغذ چاپ رسید
                  </label>
                  <select
                    value={settingsForm.defaultPaperSize || 'A6'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultPaperSize: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:border-[#C9A227] focus:outline-none"
                  >
                    <option value="A6">برگه A6 (۱۰۵ × ۱۴۸ میلی‌متر) - استاندارد</option>
                    <option value="A7">برگه A7 (۷۴ × ۱۰۵ میلی‌متر) - کوچک</option>
                  </select>
                </div>
              </div>

              {/* لینک‌های مسیریابی فروشگاه */}
              <div className="bg-slate-50 dark:bg-[#1A1A1E] p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  لینک‌های مسیریابی فروشگاه (جهت نمایش در وب‌اپ و پیام ایتا)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">لینک نقشه نشان</label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://nshn.ir/..."
                      value={settingsForm.storeNeshanLink || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeNeshanLink: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">لینک نقشه بلد</label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://balad.ir/..."
                      value={settingsForm.storeBaladLink || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeBaladLink: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">لینک گوگل مپ</label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://maps.google.com/..."
                      value={settingsForm.storeMapLink || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeMapLink: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* تعرفه‌های پیش‌فرض خدمات ۳ گانه */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <span className="block text-xs font-black text-amber-900 dark:text-amber-300">
                  تعرفه‌های پیش‌فرض خدمات در فرم ثبت سفارش
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CurrencyInput
                    label="نرخ فنرزنی (تومان)"
                    value={settingsForm.defaultSpiralPrice ?? settingsForm.defaultUnitPrice ?? 35000}
                    onChange={(val) => setSettingsForm({ ...settingsForm, defaultSpiralPrice: val, defaultUnitPrice: val })}
                  />
                  <CurrencyInput
                    label="نرخ منگنه جزوه (تومان)"
                    value={settingsForm.defaultStaplePrice ?? 10000}
                    onChange={(val) => setSettingsForm({ ...settingsForm, defaultStaplePrice: val })}
                  />
                  <CurrencyInput
                    label="نرخ جلد / طلق (تومان)"
                    value={settingsForm.defaultCoverPrice ?? 20000}
                    onChange={(val) => setSettingsForm({ ...settingsForm, defaultCoverPrice: val })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توکن بات اختصاصی ایتا (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="در صورت خالی بودن، از بات متصل شده به خطی‌نو استفاده می‌شود"
                  value={settingsForm.eitaaBotToken || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, eitaaBotToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-mono focus:border-[#C9A227] focus:outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    لینک برنامک ایتا (Web-App / Mini-App URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://eitaa.com/khatynoo_app/fanar"
                    value={settingsForm.eitaaBotAppUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, eitaaBotAppUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-mono focus:border-[#C9A227] focus:outline-none text-left"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">لینک وب‌اپ یا دکمه برنامک بات ایتا</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام کاربری بات ایتا (بدون @)
                  </label>
                  <input
                    type="text"
                    placeholder="khatynoo_app"
                    value={settingsForm.eitaaBotUsername || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, eitaaBotUsername: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs font-mono focus:border-[#C9A227] focus:outline-none text-left"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">مثال: khatynoo_app</p>
                </div>
              </div>

              {/* سوییچ‌های ارسال خودکار */}
              <div className="bg-slate-50 dark:bg-[#1A1A1E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    ارسال خودکار پیام پذیرش هنگام ثبت سفارش جدید
                  </label>
                  <input
                    type="checkbox"
                    checked={settingsForm.autoSendIntake !== false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoSendIntake: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C9A227] focus:ring-[#C9A227]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    ارسال خودکار پیام تحویل هنگام تغییر وضعیت به «آماده تحویل»
                  </label>
                  <input
                    type="checkbox"
                    checked={settingsForm.autoSendReady !== false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoSendReady: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C9A227] focus:ring-[#C9A227]"
                  />
                </div>
              </div>

              {/* قالب پیام پذیرش */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    قالب پیام دریافت و پذیرش سفارش در ایتا
                  </label>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{customer_name}', 'intakeMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      نام
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{receipt_code}', 'intakeMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      کد رسید
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{services_summary}', 'intakeMessageTemplate')}
                      className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-950 rounded text-amber-800 dark:text-amber-200 font-bold"
                    >
                      ریز خدمات
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{tracking_url}', 'intakeMessageTemplate')}
                      className="px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-950 rounded text-emerald-800 dark:text-emerald-200 font-bold"
                    >
                      لینک پیگیری
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{total_price}', 'intakeMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      مبلغ
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={settingsForm.intakeMessageTemplate || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, intakeMessageTemplate: e.target.value })}
                  placeholder="سلام {customer_name} عزیز 🌸 سفارش فنرزنی شما با کد {receipt_code} دریافت شد..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              {/* قالب پیام آماده‌سازی */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    قالب پیام آماده‌سازی و تحویل در ایتا
                  </label>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{customer_name}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      نام
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{receipt_code}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      کد رسید
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{services_summary}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-950 rounded text-amber-800 dark:text-amber-200 font-bold"
                    >
                      ریز خدمات
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{tracking_url}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-950 rounded text-emerald-800 dark:text-emerald-200 font-bold"
                    >
                      لینک پیگیری
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{store_address}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      آدرس
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{store_working_hours}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-sky-200 dark:bg-sky-950 rounded text-sky-800 dark:text-sky-200 font-bold"
                    >
                      ساعت کاری
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateTag('{store_phone}', 'readyMessageTemplate')}
                      className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded hover:bg-amber-200"
                    >
                      تلفن
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={settingsForm.readyMessageTemplate || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, readyMessageTemplate: e.target.value })}
                  placeholder="سلام {customer_name} گرامی 🌺 سفارش فنرزنی شما با کد {receipt_code} آماده تحویل است..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#25252B]">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#C9A227] hover:bg-[#B38F20] text-slate-950 transition-all shadow-md shadow-[#C9A227]/20"
                >
                  ذخیره تنظیمات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ۷. مودال مدیریت چت‌های ایتا (نگاشت مشتریان به chat_id) */}
      {showChatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#141417] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-[#2A2A30] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#25252B]">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-[#F3F4F6]">
                <Users className="w-5 h-5 text-sky-500" />
                <div>
                  <span>نگاشت مشتریان و هویت‌های ایتا (Eitaa Customer Mapping)</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block">
                    اتصال شناسه عددی چت (chat_id) به شماره همراه و رسیدهای کارگاهی مشتری
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChatsModal(false);
                    setMainViewMode('eitaa');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800 transition flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>باز کردن صندوق پیام و CRM</span>
                </button>
                <button
                  onClick={() => setShowChatsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-sky-50 dark:bg-sky-950/30 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>راهنمای کارکرد نگاشت و اتصال شناسه چت ایتا:</span>
                </div>
                <p>
                  در پیام‌رسان ایتا، جهت ارسال پیام اختصاصی به کاربر، لازم است شناسه چت (<code className="font-mono px-1 py-0.5 bg-sky-100 dark:bg-sky-900/60 rounded">chat_id</code>) مشتری مشخص باشد. به محض اینکه مشتری در مینی‌اپ یا بات ایتا وارد شود یا شماره تماس/کد فیش خود را پیگیری کند، شناسه چت و شماره همراه وی به صورت هوشمند و خودکار با یکدیگر پیوند می‌خورند و در این جدول نمایش داده می‌شوند.
                </p>
              </div>

              {/* فرم افزودن یا پیوند دستی چت */}
              <form onSubmit={handleAddEitaaChat} className="bg-slate-50 dark:bg-[#1A1A1E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    ثبت یا به‌روزرسانی دستی شناسه چت برای مشتری
                  </span>
                  <span className="text-[10px] text-slate-400">شناسه عددی را می‌توانید از فوروارد پیام کاربر در بات بدست آورید</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">شناسه چت در ایتا (chat_id) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 98765432"
                      value={newChatForm.chatId}
                      onChange={(e) => setNewChatForm({ ...newChatForm, chatId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">شماره همراه مشتری</label>
                    <input
                      type="tel"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      value={newChatForm.mobile}
                      onChange={(e) => setNewChatForm({ ...newChatForm, mobile: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">نام یا عنوان مشتری</label>
                    <input
                      type="text"
                      placeholder="نام مشتری"
                      value={newChatForm.firstName}
                      onChange={(e) => setNewChatForm({ ...newChatForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">نام کاربری ایتا</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="بدون @"
                        value={newChatForm.username}
                        onChange={(e) => setNewChatForm({ ...newChatForm, username: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-slate-800 text-xs font-mono text-left"
                        dir="ltr"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shrink-0"
                      >
                        ثبت نگاشت
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* جدول مخاطبین و هویت‌های موجود */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    لیست هویت‌ها و نگاشت‌های فعال ({toPersianDigits(eitaaChats.length)})
                  </div>
                  <button
                    type="button"
                    onClick={loadEitaaChats}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>بروزرسانی لیست</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="جستجو با شماره همراه، شناسه چت، نام، آیدی یا کد فیش..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full px-3 py-2 mb-2 rounded-xl bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-slate-800 text-xs"
                />

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5">نام و مشخصات ایتا</th>
                        <th className="p-2.5">شماره موبایل</th>
                        <th className="p-2.5">شناسه چت (chat_id)</th>
                        <th className="p-2.5">فیش‌های متصل</th>
                        <th className="p-2.5">منبع اتصال</th>
                        <th className="p-2.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {eitaaChats.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            مخاطب یا نگاشتی یافت نشد. به محض ارسال پیام توسط مشتری در بات یا مینی‌اپ، اطلاعات در اینجا ظاهر خواهد شد.
                          </td>
                        </tr>
                      ) : (
                        eitaaChats.map((chat) => (
                          <tr key={chat.id || chat.chatId || chat.mobile} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {chat.customerName || [chat.firstName, chat.lastName].filter(Boolean).join(' ') || 'کاربر بدون نام'}
                              </div>
                              {chat.username && (
                                <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono" dir="ltr">
                                  @{chat.username}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 font-mono">
                              {chat.mobile ? (
                                <span className="dir-ltr inline-block">{chat.mobile}</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[10px]">
                                  فاقد شماره همراه
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                <code className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                  {chat.chatId}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(chat.chatId);
                                    showToast('شناسه چت در حافظه کپی شد', 'success');
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                  title="کپی شناسه چت"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5">
                              {chat.receiptCodes && chat.receiptCodes.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {chat.receiptCodes.map((code) => (
                                    <span
                                      key={code}
                                      className="font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 rounded"
                                    >
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {chat.source === 'mini_app' || chat.source === 'mini_app_tracking' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>مینی‌اپ</span>
                                  </>
                                ) : chat.source === 'admin_manual' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    <span>ثبت دستی</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    <span>بات مستقیم</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowChatsModal(false);
                                    setMainViewMode('eitaa');
                                  }}
                                  className="text-sky-600 hover:text-sky-800 dark:hover:text-sky-300 p-1.5 rounded hover:bg-sky-50 dark:hover:bg-sky-950/50"
                                  title="ارسال پیام و گفتگو در CRM"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEitaaChat(chat.chatId || chat.mobile || chat.id || '')}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                  title="حذف نگاشت"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ۸. کامپوننت رسید چاپی دو نسخه بر روی یک برگه (Customer Copy + Workshop Copy with Cut Line) */}
      <div id="binding-print-sheet" className="hidden print:block text-black bg-white">
        {activePrintOrder && (
          <div className="space-y-4 text-right" dir="rtl">
            {/* نیمه بالا: نسخه مشتری */}
            <div className="border border-dashed border-black p-3 rounded-lg">
              <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
                <div>
                  <h1 className="text-sm font-black">{settings?.storeName || 'خطی‌نو'}</h1>
                  <span className="text-[10px]">رسید سفارش فنر خالی (نسخه مشتری)</span>
                </div>
                <div className="text-left font-mono font-black text-sm bg-black text-white px-2 py-0.5 rounded">
                  {activePrintOrder.receiptCode}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                <div>
                  <span className="font-bold">مشتری: </span>
                  <span>{activePrintOrder.customerName}</span>
                </div>
                <div>
                  <span className="font-bold">تماس: </span>
                  <span className="font-mono">{activePrintOrder.customerMobile}</span>
                </div>
                <div className="col-span-2 bg-slate-50 p-1 rounded border border-slate-200">
                  <span className="font-bold">ریز خدمات: </span>
                  <span className="font-bold text-slate-800">
                    {[
                      (activePrintOrder.spiralCount ?? 0) > 0 ? `${activePrintOrder.spiralCount} فنرزنی` : null,
                      (activePrintOrder.stapleCount ?? 0) > 0 ? `${activePrintOrder.stapleCount} منگنه` : null,
                      (activePrintOrder.coverCount ?? 0) > 0 ? `${activePrintOrder.coverCount} جلد/طلق` : null,
                    ].filter(Boolean).join(' + ') || `${activePrintOrder.bookCount} جلد فنرزنی`}
                  </span>
                  <span className="text-[10px] text-slate-500 mr-1.5">(مجموع: {activePrintOrder.bookCount} جلد)</span>
                </div>
                <div>
                  <span className="font-bold">مبلغ قابل پرداخت: </span>
                  <span className="font-bold">{activePrintOrder.totalPrice.toLocaleString('fa-IR')} تومان</span>
                </div>
                <div>
                  <span className="font-bold">وضعیت تسویه: </span>
                  <span className="font-bold">
                    {activePrintOrder.paymentStatus === 'paid' ? 'تسویه شده' : 'پرداخت نشده (هنگام تحویل)'}
                  </span>
                </div>
                <div>
                  <span className="font-bold">تاریخ پذیرش: </span>
                  <span className="font-mono">
                    {new Date(activePrintOrder.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                {settings?.storeWorkingHours && (
                  <div>
                    <span className="font-bold">ساعات تحویل: </span>
                    <span className="text-[10px]">{settings.storeWorkingHours}</span>
                  </div>
                )}
              </div>

              {activePrintOrder.description && (
                <div className="text-[10px] bg-slate-100 p-1.5 rounded mb-2">
                  <span className="font-bold">توضیحات: </span>
                  <span>{activePrintOrder.description}</span>
                </div>
              )}

              <div className="text-[9px] border-t border-dotted border-black pt-1 text-center">
                تلفن: {settings?.storePhone || '۰۲۱-۶۶۹۹۰۰۰۰'} | آدرس: {settings?.storeAddress || 'تهران'}
                <div className="mt-0.5 font-bold">
                  پیگیری آنلاین وضعیت سفارش در ایتا: khatynoo.ir/eitaa-app/index.html?track={activePrintOrder.receiptCode}
                </div>
              </div>
            </div>

            {/* خط چین برش با آیکون قیچی */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 font-mono py-1">
              <span>- - - - - - - - - - - - - - - - -</span>
              <Scissors className="w-3.5 h-3.5" />
              <span>محل برش (نسخه مشتری / نسخه کارگاه)</span>
              <span>- - - - - - - - - - - - - - - - -</span>
            </div>

            {/* نیمه پایین: نسخه فروشگاه / الصاق روی کتاب‌ها */}
            <div className="border border-dashed border-black p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
                <div>
                  <span className="text-xs font-black">برچسب الصاق به کتاب‌ها (نسخه کارگاه)</span>
                  <div className="text-[10px]">
                    مشتری: {activePrintOrder.customerName} ({activePrintOrder.customerMobile})
                  </div>
                </div>
                <div className="text-left font-mono font-black text-base bg-black text-white px-2.5 py-0.5 rounded">
                  {activePrintOrder.receiptCode}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                <div className="col-span-2 bg-white p-1.5 rounded border border-black/30 font-bold">
                  خدمات: {[
                    (activePrintOrder.spiralCount ?? 0) > 0 ? `${activePrintOrder.spiralCount} جلد فنر` : null,
                    (activePrintOrder.stapleCount ?? 0) > 0 ? `${activePrintOrder.stapleCount} منگنه` : null,
                    (activePrintOrder.coverCount ?? 0) > 0 ? `${activePrintOrder.coverCount} جلد/طلق` : null,
                  ].filter(Boolean).join(' | ') || `${activePrintOrder.bookCount} جلد`} (کل: {activePrintOrder.bookCount} جلد)
                </div>
                <div>
                  <span className="font-bold">مبلغ: </span>
                  <span>{activePrintOrder.totalPrice.toLocaleString('fa-IR')} تومان ({activePrintOrder.paymentStatus === 'paid' ? 'تسویه شده' : 'پرداخت نشده'})</span>
                </div>
                <div>
                  <span className="font-bold">تاریخ: </span>
                  <span className="font-mono">{new Date(activePrintOrder.createdAt).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>

              {activePrintOrder.description && (
                <div className="text-[10px] border border-black/20 p-1.5 rounded mb-2 bg-white font-bold">
                  ویژگی سفارش: {activePrintOrder.description}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] border-t border-black pt-1.5 mt-2">
                <div className="flex items-center gap-2">
                  <span>[  ] فنرزنی/منگنه شد</span>
                  <span>[  ] بررسی نهایی</span>
                  <span>[  ] پیام ایتا ارسال شد</span>
                  <span>[  ] تحویل شد</span>
                </div>
                <div className="font-mono text-[9px]">
                  {new Date(activePrintOrder.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
