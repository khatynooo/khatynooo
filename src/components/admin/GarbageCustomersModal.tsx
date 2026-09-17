import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  UserX,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../../lib/api';
import { toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface GarbageCustomer {
  id: string;
  name: string;
  mobile: string | null;
  created_at: string;
  balance: number;
}

interface GarbageCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GarbageCustomersModal: React.FC<GarbageCustomersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customers, setCustomers] = useState<GarbageCustomer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadGarbage();
    }
  }, [isOpen]);

  const loadGarbage = async () => {
    setIsLoading(true);
    try {
      const res = await api.getGarbageCustomers();
      const list: GarbageCustomer[] = res.garbageCustomers || [];
      setCustomers(list);
      setSelectedIds(list.map((c) => c.id)); // Default: select all for quick cleanup
    } catch (err: any) {
      console.error(err);
      showToast('خطا در دریافت لیست مشتریان نامعتبر.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCleanup = async () => {
    if (selectedIds.length === 0) {
      showToast('لطفاً حداقل یک مشتری را برای حذف انتخاب نمایید.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await api.cleanupGarbageCustomers(selectedIds);
      showToast(res.message || 'پاکسازی مشتریان بدون تراکنش با موفقیت انجام شد.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'خطا در پاکسازی مشتریان.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-xs">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">پاکسازی مشتریان زباله و رکوردهای نامعتبر ایتا</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                حذف ایمن مخاطبان بدون تراکنش، فاقد شماره موبایل معتبر یا ایجاد شده به شکل آزمایشی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-right">
          {/* Safety Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-800 text-xs">ضمانت ایمنی اطلاعات حسابداری</span>
              <p className="text-[11px] text-emerald-700/90 leading-relaxed">
                این ابزار به صورت تضمینی رکوردهایی را بررسی می‌کند که <strong>هیچ‌گونه فاکتور فروش، سفارش خرید، سفارش چاپ، چک یا تراکنش مالی</strong> در سیستم به نام آنها ثبت نشده باشد. اطلاعات حسابداری فروشگاه کاملاً محافظت شده است.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
              <span className="text-xs font-bold">در حال جستجوی رکوردهای نامعتبر در پایگاه داده...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <div className="text-center space-y-1">
                <span className="text-sm font-black text-slate-800">هیچ رکورد زباله‌ای یافت نشد!</span>
                <p className="text-xs text-slate-400">
                  فهرست مشتریان شما کاملاً تمیز و دارای اطلاعات معتبر است.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  {selectedIds.length === customers.length ? (
                    <CheckSquare className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>انتخاب همه ({toPersianDigits(customers.length)} رکورد)</span>
                </button>
                <span className="text-[11px] text-slate-500">
                  {toPersianDigits(selectedIds.length)} رکورد انتخاب شده
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">نام ثبت شده</th>
                      <th className="p-2.5">شماره تماس</th>
                      <th className="p-2.5">تاریخ ایجاد</th>
                      <th className="p-2.5 text-center">وضعیت حساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c) => {
                      const isChecked = selectedIds.includes(c.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => handleToggleOne(c.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked ? 'bg-rose-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded text-rose-600 focus:ring-rose-500 pointer-events-none"
                            />
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
                          <td className="p-2.5 font-mono text-slate-600" dir="ltr">
                            {c.mobile || <span className="text-slate-400 italic">فاقد شماره</span>}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {new Date(c.created_at).toLocaleDateString('fa-IR')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              بدون تراکنش
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>
          {customers.length > 0 && (
            <button
              type="button"
              onClick={handleCleanup}
              disabled={isDeleting || selectedIds.length === 0}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-rose-500/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال پاکسازی...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>حذف و پاکسازی ({toPersianDigits(selectedIds.length)} رکورد)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
