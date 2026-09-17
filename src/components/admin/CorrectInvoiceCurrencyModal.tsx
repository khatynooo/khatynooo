import React, { useState } from 'react';
import {
  X,
  Coins,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  HelpCircle,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { PurchaseInvoice } from '../../types';
import { useToast } from '../common/Toast';

interface CorrectInvoiceCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PurchaseInvoice | null;
  onSuccess: () => void;
}

export const CorrectInvoiceCurrencyModal: React.FC<CorrectInvoiceCurrencyModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [operation, setOperation] = useState<'divide_10' | 'multiply_10'>('divide_10');
  const [updateProductCosts, setUpdateProductCosts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !invoice) return null;

  const factor = operation === 'divide_10' ? 0.1 : 10;
  const newTotalAmount = Math.round((invoice.totalAmount || 0) * factor);
  const newPaidAmount = Math.round((invoice.paidAmount || 0) * factor);
  const newRemainingAmount = Math.max(0, newTotalAmount - newPaidAmount);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.correctPurchaseInvoiceCurrency(invoice.id, {
        operation,
        updateProductCosts,
      });

      showToast(
        `واحد پول فاکتور شماره ${invoice.invoiceNumber} با موفقیت ${
          operation === 'divide_10' ? 'از ریال به تومان (تقسیم بر ۱۰)' : 'از تومان به ریال (ضرب در ۱۰)'
        } اصلاح و مانده حساب تامین‌کننده هماهنگ شد.`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error correcting invoice currency:', err);
      showToast(err.message || 'خطا در اصلاح واحد پول فاکتور خرید.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">اصلاح واحد پول فاکتور خرید (ریال ⇄ تومان)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                فاکتور شماره: <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</span> | تامین‌کننده: <span className="font-bold text-slate-800">{invoice.supplierName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-right">
          {/* Warning Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>راهنمای اصلاح اشتباه واحد پول فاکتور</span>
            </div>
            <p className="text-xs text-amber-800/90">
              این ابزار برای شرایطی طراحی شده است که فاکتور خرید دریافتی از پخش یا فایل اکسل به <strong>ریال</strong> بوده و ارقام با یک صفر اضافی ثبت شده‌اند. با اجرای این عملیات، مانده‌حساب بدهی تامین‌کننده، فاکتور و اقلام در یک تراکنش دقیق مجدداً محاسبه و همگام‌سازی می‌شوند.
            </p>
          </div>

          {/* Operation Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">نوع عملیات تصحیح:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  operation === 'divide_10'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="currency_op"
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  checked={operation === 'divide_10'}
                  onChange={() => setOperation('divide_10')}
                />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                    <span>تبدیل ریال به تومان (تقسیم بر ۱۰)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    ارقام فاکتور به ریال ثبت شده بودند و یک صفر اضافه دارند.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  operation === 'multiply_10'
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="currency_op"
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  checked={operation === 'multiply_10'}
                  onChange={() => setOperation('multiply_10')}
                />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تبدیل تومان به ریال (ضرب در ۱۰)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    ارقام به اشتباه تقسیم شده بودند یا نیاز به افزایش ۱۰ برابری دارند.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Before & After Comparison Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-500">وضعیت فعلی در سیستم:</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-600">
                  <span>مبلغ کل فاکتور:</span>
                  <span className="font-mono font-bold text-slate-900">{formatToman(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>پرداخت شده:</span>
                  <span className="font-mono text-emerald-600">{formatToman(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>مانده بدهی به تامین‌کننده:</span>
                  <span className="font-mono font-bold text-rose-600">{formatToman(invoice.remainingAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
              <div className="text-[11px] font-bold text-amber-800">وضعیت جدید پس از تصحیح:</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-700">
                  <span>مبلغ کل فاکتور:</span>
                  <span className="font-mono font-bold text-amber-900">{formatToman(newTotalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>پرداخت شده:</span>
                  <span className="font-mono text-emerald-700 font-bold">{formatToman(newPaidAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>مانده بدهی به تامین‌کننده:</span>
                  <span className="font-mono font-bold text-rose-700">{formatToman(newRemainingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Preview Table */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">اقلام فاکتور و بهای خرید ({toPersianDigits(invoice.items?.length || 0)} قلم):</span>
              <span className="text-[11px] text-slate-400">پیش‌نمایش تغییر فی خرید هر کالا</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-[11px] text-right">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2">نام کالا</th>
                    <th className="p-2 text-center">تعداد</th>
                    <th className="p-2">فی فعلی</th>
                    <th className="p-2 text-amber-700 font-black">فی جدید ({operation === 'divide_10' ? 'تقسیم ۱۰' : 'ضرب ۱۰'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(invoice.items || []).map((it, idx) => {
                    const newBuy = Math.round(Number(it.buyPrice || 0) * factor);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-medium text-slate-800">{it.productName || 'کالا'}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{toPersianDigits(it.quantity)}</td>
                        <td className="p-2 font-mono text-slate-500 line-through">{formatToman(it.buyPrice)}</td>
                        <td className="p-2 font-mono font-bold text-amber-700 bg-amber-50/40">{formatToman(newBuy)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Catalog Update Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                checked={updateProductCosts}
                onChange={(e) => setUpdateProductCosts(e.target.checked)}
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 text-xs">
                  بهای خرید کالاها در کاردکس انبار و بخش انبارداری نیز به‌روزرسانی شود؟
                </span>
                <p className="text-[11px] text-slate-500 leading-normal">
                  در صورت فعال بودن، قیمت خرید پایه (سرمایه) هر یک از اقلام این فاکتور در جدول کالاها نیز {operation === 'divide_10' ? 'بر ۱۰ تقسیم' : 'در ۱۰ ضرب'} می‌شود تا گزارش‌های سود و موجودی دقیق بماند.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال اعمال تغییرات...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تایید و اصلاح قطعی مبالغ فاکتور</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
