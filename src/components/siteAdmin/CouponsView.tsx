import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  TrendingDown,
  ShoppingBag,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DiscountCoupon } from '../../types';
import { useToast } from '../common/Toast';
import { formatToman } from '../../lib/utils';

export const CouponsView: React.FC = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New coupon form state
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount',
    discountValue: 15,
    minOrderAmount: 200000,
    maxDiscountAmount: 100000,
    maxUsageCount: 50,
    expiresAt: '1405/06/31',
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.getCoupons();
      setCoupons(res.coupons || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`کد تخفیف ${code} کپی شد.`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کد تخفیف اطمینان دارید؟')) return;
    try {
      await api.deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast('کد تخفیف با موفقیت حذف شد.', 'info');
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف کوپن', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      showToast('لطفاً کد تخفیف را وارد نمایید.', 'warning');
      return;
    }
    try {
      const res = await api.createCoupon(newCoupon);
      setCoupons((prev) => [res.coupon, ...prev]);
      showToast('کد تخفیف جدید با موفقیت ایجاد شد.', 'success');
      setShowAddModal(false);
      setNewCoupon({
        code: '',
        discountType: 'percentage',
        discountValue: 15,
        minOrderAmount: 200000,
        maxDiscountAmount: 100000,
        maxUsageCount: 50,
        expiresAt: '1405/06/31',
      });
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد کد تخفیف', 'error');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <Tag className="w-4 h-4" />
            <span>مدیریت جشنواره‌های تخفیف و کوپن‌ها (Discount Coupons Engine)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            کدهای تخفیف درصدی و ریالی فروشگاه
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            تعریف کدهای تخفیف مناسبتی، حداقل مبلغ سبد خرید برای اعمال تخفیف، سقف تخفیف، محدودیت تعداد دفعات استفاده و تاریخ انقضا.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>تعریف کد تخفیف جدید</span>
        </button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => {
          const usagePercent = Math.min(100, Math.round((c.usedCount / c.maxUsageCount) * 100));
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-5 space-y-4 shadow-md hover:border-[#C9A227] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-amber-600 dark:text-[#C9A227] bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 tracking-wider">
                      {c.code}
                    </span>
                    <button
                      onClick={() => handleCopy(c.code)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      title="کپی کد"
                    >
                      {copiedCode === c.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold ${
                      c.isEnabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-[#222225] text-slate-500'
                    }`}
                  >
                    {c.isEnabled ? 'فعال' : 'منقضی/غیرفعال'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#161619] rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">میزان تخفیف:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {c.discountType === 'percentage' ? `${c.discountValue} درصد` : `${formatToman(c.discountValue)} تومان`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">حداقل خرید:</span>
                    <span className="font-mono text-slate-700 dark:text-[#D1D5DB]">
                      {formatToman(c.minOrderAmount)} تومان
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">انقضا:</span>
                    <span className="font-mono text-slate-700 dark:text-[#D1D5DB]">{c.expiresAt}</span>
                  </div>
                </div>

                {/* Usage Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>مصرف‌شده:</span>
                    <span>{c.usedCount} از {c.maxUsageCount} ({usagePercent}٪)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#222225] overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#222225] flex justify-end">
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف کوپن</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222225]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#C9A227]" />
                <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                  تعریف کد تخفیف جدید
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">کد کوپن (حروف انگلیسی یا عدد):</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: MEHR1405"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#C9A227] font-mono font-bold text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">نوع تخفیف:</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  >
                    <option value="percentage">درصدی (٪)</option>
                    <option value="fixed_amount">مبلغ ثابت (تومان)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">مقدار تخفیف:</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.discountValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">حداقل مبلغ خرید (تومان):</label>
                  <input
                    type="number"
                    value={newCoupon.minOrderAmount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">سقف مصرف (تعداد):</label>
                  <input
                    type="number"
                    value={newCoupon.maxUsageCount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxUsageCount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">تاریخ انقضا:</label>
                <input
                  type="text"
                  value={newCoupon.expiresAt}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                  placeholder="1405/06/31"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-[#161619] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C9A227] text-slate-950 hover:bg-[#B38E1E] cursor-pointer"
                >
                  ایجاد کوپن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
