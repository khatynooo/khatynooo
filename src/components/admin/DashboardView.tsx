import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Users,
  ShoppingCart,
  Receipt,
  Layers,
  ChevronLeft,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  Package,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  RefreshCw,
  Wallet,
  Clock,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { AdminTab } from './AdminLayout';

interface DashboardViewProps {
  onNavigate?: (tab: AdminTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleNavigate = (tab: AdminTab) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center text-slate-500 font-medium text-sm flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        <span>در حال بارگذاری شاخص‌های تحلیلی و مالی حسابداری...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header & Overview Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500">
              سیستم جامع حسابداری، انبارداری و فروشگاهی
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-400 font-mono">
              امروز: {new Date().toLocaleDateString('fa-IR')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
            داشبورد مدیریت و حسابداری خطی‌نو
          </h2>
          <p className="text-xs text-[#64748B] max-w-3xl leading-relaxed">
            گزارش آنی جریان نقدینگی، فروشگاه حضوری POS، انبار مرکزی و صورت‌حساب‌های مالی.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigate('pos')}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-98 flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span>صندوق فروش سریع (POS)</span>
          </button>
          <button
            type="button"
            onClick={loadStats}
            className="bg-slate-50 hover:bg-slate-100 text-[#64748B] hover:text-[#111827] border border-[#E2E8F0] font-bold text-xs p-3 rounded-xl transition-colors cursor-pointer"
            title="به‌روزرسانی آمار"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Key Performance Indicator (KPI) Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. فروش امروز */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B]">فروش امروز</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#111827]">
              {formatToman(stats.salesToday || 0)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {toPersianDigits(stats.invoiceCountToday || 0)} فاکتور ثبت‌شده
            </div>
          </div>
        </div>

        {/* 2. سود امروز */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B]">سود ناخالص امروز</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#16A34A]">
              {formatToman(stats.estimatedProfitToday || 0)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              بر مبنای بهای تمام‌شده
            </div>
          </div>
        </div>

        {/* 3. موجودی و کسری */}
        <div
          onClick={() => handleNavigate('inventory')}
          className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B]">کسری انبار</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#F59E0B]">
              {toPersianDigits(stats.lowStockCount || 0)}{' '}
              <span className="text-xs font-normal text-[#64748B]">قلم کالا</span>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
              <span>نیاز به سفارش‌گذاری</span>
              <ChevronLeft className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* 4. مطالبات از مشتریان */}
        <div
          onClick={() => handleNavigate('customers_suppliers')}
          className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B]">مطالبات (طلب از مشتری)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-indigo-700">
              {formatToman(stats.totalCustomerDebt || 0)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              {toPersianDigits(stats.totalCustomers || 0)} حساب مشتری فعال
            </div>
          </div>
        </div>

        {/* 5. بدهی به تامین‌کنندگان */}
        <div
          onClick={() => handleNavigate('customers_suppliers')}
          className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-rose-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B]">بدهی به تامین‌کننده</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#DC2626] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#DC2626]">
              {formatToman(stats.totalSupplierCredit || 0)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              مانده بستانکاری خرید
            </div>
          </div>
        </div>

        {/* 6. فاکتورهای امروز */}
        <div
          onClick={() => handleNavigate('invoices')}
          className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B]">فاکتورهای ثبت‌شده</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#111827]">
              {toPersianDigits(stats.invoiceCountToday || 0)}{' '}
              <span className="text-xs font-normal text-[#64748B]">عدد</span>
            </div>
            <div className="text-[11px] text-[#2563EB] font-semibold mt-0.5 flex items-center gap-1">
              <span>مشاهده و چاپ فاکتورها</span>
              <ChevronLeft className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs">
        <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">
          دسترسی و عملیات سریع
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => handleNavigate('pos')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-[#2563EB] transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-black">صندوق فروش (POS)</span>
            <span className="text-[10px] text-blue-600/70 mt-0.5">بارکدخوان و کارتخوان</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('invoices')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:bg-white hover:border-slate-300 text-[#111827] transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">فاکتور فروش</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">صدور و چاپ فاکتور</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('invoices')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:bg-white hover:border-slate-300 text-[#111827] transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">فاکتور خرید</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">ورود کالا به انبار</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('cheques')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:bg-white hover:border-slate-300 text-[#111827] transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">چک و صیاد</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">ثبت دریافتی و پرداختی</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('products')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:bg-white hover:border-slate-300 text-[#111827] transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">کالاها و بارکدها</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">قیمت‌گذاری ۵ سطحی</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('reports')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:bg-white hover:border-slate-300 text-[#111827] transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">گزارشات سود و زیان</span>
            <span className="text-[10px] text-[#64748B] mt-0.5">دفاتر و تراز مالی</span>
          </button>
        </div>
      </div>

      {/* Chart Section & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-[#111827]">
                روند فروش هفتگی و سود ناخالص
              </h3>
              <p className="text-xs text-[#64748B]">
                تحلیل مقایسه‌ای گردش مالی در طول هفته
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#2563EB]" />
                <span className="text-[#64748B]">فروش</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
                <span className="text-[#64748B]">سود ناخالص</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailySales || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)} م`}
                  stroke="#E2E8F0"
                />
                <Tooltip
                  formatter={(val: any) => formatToman(val)}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '12px',
                    color: '#111827',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ textAlign: 'right', fontWeight: 'bold', color: '#111827' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                  name="فروش"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#16A34A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                  name="سود"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#111827] mb-1">
              پرفروش‌ترین کالاهای فروشگاه
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              بیشترین حجم ریالی فروش اخیر
            </p>

            <div className="space-y-2.5">
              {(stats.topProducts || []).slice(0, 5).map((p: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-black flex items-center justify-center text-[10px] shrink-0">
                      {toPersianDigits(idx + 1)}
                    </span>
                    <span className="font-bold text-[#111827] truncate">{p.name}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-black text-[#2563EB]">
                      {formatToman(p.revenue)}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {toPersianDigits(p.count)} عدد فروخته شده
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('products')}
            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#111827] border border-[#E2E8F0] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>مدیریت کاتالوگ و قیمت کالاها</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#64748B]" />
          </button>
        </div>
      </div>
    </div>
  );
};
