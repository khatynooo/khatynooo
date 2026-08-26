import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Users,
  ShoppingCart,
  Printer,
  Sparkles,
  ArrowUpRight,
  Receipt,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { AdminTab } from './AdminLayout';

interface DashboardViewProps {
  onNavigate: (tab: AdminTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="py-20 text-center text-[#8E9299] text-sm">
        در حال بارگذاری شاخص‌های تحلیلی و آماری خطی‌نو...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome / Status Banner */}
      <div className="bg-[#111113] border border-[#222225] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-[#C9A227]/10 text-[#C9A227] text-xs font-bold px-3 py-1 rounded-full border border-[#C9A227]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>سیستم یکپارچه فروش حضوری + آنلاین + حسابداری و تولید</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#F3F4F6]">داشبورد جامع مدیریت خطی‌نو (Khatinoo)</h2>
          <p className="text-xs text-[#8E9299] max-w-2xl leading-relaxed">
            تمامی تراکنش‌های کارتخوان متصل به صندوق (Pasargad TCP/IP)، فاکتورهای فروشگاهی، موجودی مواد اولیه و دفاتر تولیدی به صورت لحظه‌ای و خودکار سینک هستند.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0 relative z-10">
          <button
            onClick={() => onNavigate('pos')}
            className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#C9A227]/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-black" />
            <span>صندوق فروش سریع (POS)</span>
          </button>
          <button
            onClick={() => onNavigate('torob')}
            className="bg-[#161619] hover:bg-[#1C1C20] text-[#E0E0E0] font-bold text-xs px-4 py-2.5 rounded-xl border border-[#2D2D33] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-[#C9A227]" />
            <span>رصد قیمت ترب</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="bg-[#111113] rounded-2xl p-5 border border-[#222225] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#8E9299]">فروش کل امروز:</span>
            <div className="text-xl font-black text-[#F3F4F6]">{formatToman(stats.salesToday)}</div>
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span>{toPersianDigits(stats.invoiceCountToday)} فاکتور صادر شده</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#161619] border border-[#2D2D33] text-[#C9A227] flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="bg-[#111113] rounded-2xl p-5 border border-[#222225] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#8E9299]">سود ناخالص تقریبی:</span>
            <div className="text-xl font-black text-emerald-400">{formatToman(stats.estimatedProfitToday)}</div>
            <div className="text-[11px] text-[#8E9299] font-medium">بر اساس بهای خرید ثبت‌شده</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-[#111113] rounded-2xl p-5 border border-[#222225] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#C9A227]/60 transition-colors"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#8E9299]">کالاهای رو به اتمام:</span>
            <div className="text-xl font-black text-amber-400">
              {toPersianDigits(stats.lowStockCount)} <span className="text-xs font-normal text-[#8E9299]">قلم کالا</span>
            </div>
            <div className="text-[11px] text-amber-400/80 font-medium flex items-center gap-0.5">
              <span>نیاز به شارژ موجودی</span>
              <ChevronLeft className="w-3 h-3" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Customer Debt */}
        <div
          onClick={() => onNavigate('customers_suppliers')}
          className="bg-[#111113] rounded-2xl p-5 border border-[#222225] shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-colors"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#8E9299]">مانده بدهی مشتریان (نسیه):</span>
            <div className="text-xl font-black text-rose-400">{formatToman(stats.totalCustomerDebt)}</div>
            <div className="text-[11px] text-[#8E9299] font-medium">{toPersianDigits(stats.totalCustomers)} مشتری ثبت‌شده</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-[#F3F4F6]">روند فروش هفتگی و سود ناخالص</h3>
              <p className="text-xs text-[#8E9299]">تحلیل مقایسه‌ای فروش حضوری و آنلاین در ایام هفته</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#C9A227]" />
                <span className="text-[#8E9299]">میزان فروش</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[#8E9299]">سود ناخالص</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailySales} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A227" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C9A227" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222225" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#8E9299' }} stroke="#222225" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8E9299' }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)} م`}
                  stroke="#222225"
                />
                <Tooltip
                  formatter={(val: any) => formatToman(val)}
                  contentStyle={{ backgroundColor: '#161619', borderColor: '#2D2D33', borderRadius: '12px', color: '#E0E0E0' }}
                  labelStyle={{ textAlign: 'right', fontWeight: 'bold', color: '#F3F4F6' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#C9A227" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" name="فروش" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" name="سود" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#F3F4F6] mb-1">پرفروش‌ترین کالاهای فروشگاه</h3>
            <p className="text-xs text-[#8E9299] mb-4">بیشترین حجم ریالی فروش اخیر</p>

            <div className="space-y-3">
              {stats.topProducts.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#161619] border border-[#222225] text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#C9A227]/20 text-[#C9A227] font-black flex items-center justify-center text-[10px] shrink-0 border border-[#C9A227]/30">
                      {toPersianDigits(idx + 1)}
                    </span>
                    <span className="font-bold text-[#E0E0E0] truncate">{p.name}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-black text-[#C9A227]">{formatToman(p.revenue)}</div>
                    <div className="text-[10px] text-[#8E9299]">{toPersianDigits(p.count)} عدد فروخته شده</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('products')}
            className="w-full py-2.5 rounded-xl bg-[#161619] hover:bg-[#1C1C20] text-[#E0E0E0] border border-[#2D2D33] text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>مدیریت کاتالوگ و موجودی کالاها</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

