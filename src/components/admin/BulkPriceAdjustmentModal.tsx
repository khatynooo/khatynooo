import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  DollarSign,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Product } from '../../types';
import { useToast } from '../common/Toast';

interface BulkPriceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  products: Product[];
  onSuccess: () => void;
}

interface PriceAdjustmentRecord {
  id: string;
  operation: string;
  applied_fields: string[];
  reason: string;
  created_by: string;
  created_at: string;
  undone_at: string | null;
  undone_by: string | null;
  affected_count: number;
}

const PRICE_FIELDS = [
  { id: 'buy_price', label: 'بهای خرید (سرمایه)', key: 'buyPrice' },
  { id: 'price_shop1', label: 'فروشگاه ۱ (حضوری)', key: 'priceShop1' },
  { id: 'price_shop2', label: 'فروشگاه ۲ (آنلاین/ترب)', key: 'priceShop2' },
  { id: 'price_shop3', label: 'فروشگاه ۳ (همکار)', key: 'priceShop3' },
  { id: 'wholesale_price', label: 'فروش عمده و مدارس', key: 'wholesalePrice' },
  { id: 'min_allowed_price', label: 'کف قیمت مجاز', key: 'minAllowedPrice' },
];

export const BulkPriceAdjustmentModal: React.FC<BulkPriceAdjustmentModalProps> = ({
  isOpen,
  onClose,
  selectedProductIds,
  products,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'adjust' | 'history'>('adjust');
  const [targetMode, setTargetMode] = useState<'selected' | 'all'>(
    selectedProductIds.length > 0 ? 'selected' : 'all'
  );
  const [operation, setOperation] = useState<'divide_10' | 'multiply_10'>('divide_10');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    PRICE_FIELDS.map((f) => f.id)
  );
  const [reason, setReason] = useState('اصلاح اشتباه واحد ریال به تومان');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState<PriceAdjustmentRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProductIds.length > 0) {
      setTargetMode('selected');
    } else {
      setTargetMode('all');
    }
  }, [selectedProductIds]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadHistory();
    }
  }, [isOpen, activeTab]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.getBulkPriceAdjustments();
      setHistoryList(res.adjustments || []);
    } catch (err: any) {
      console.error('Failed to load adjustments history:', err);
      showToast('خطا در دریافت تاریخچه تغییرات قیمت', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const targetProducts = targetMode === 'selected'
    ? products.filter((p) => selectedProductIds.includes(p.id))
    : products;

  const factor = operation === 'divide_10' ? 0.1 : 10;

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAllFields = () => {
    if (selectedFields.length === PRICE_FIELDS.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(PRICE_FIELDS.map((f) => f.id));
    }
  };

  const handleApply = async () => {
    if (targetProducts.length === 0) {
      showToast('هیچ کالایی برای اعمال تغییرات قیمت وجود ندارد.', 'warning');
      return;
    }
    if (selectedFields.length === 0) {
      showToast('حداقل یک فیلد قیمت را برای اصلاح انتخاب نمایید.', 'warning');
      return;
    }

    const confirmMsg = operation === 'divide_10'
      ? `آیا از تقسیم قیمت ${toPersianDigits(targetProducts.length)} کالا بر ۱۰ (تبدیل ریال به تومان) اطمینان دارید؟`
      : `آیا از ضرب قیمت ${toPersianDigits(targetProducts.length)} کالا در ۱۰ اطمینان دارید؟`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        operation,
        factor,
        productIds: targetMode === 'selected' ? selectedProductIds : undefined,
        fields: selectedFields,
        reason: reason.trim() || undefined,
      };

      const res = await api.bulkPriceAdjustment(payload);
      showToast(res.message || 'قیمت کالاها با موفقیت به‌روزرسانی شد.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error applying bulk price adjustment:', err);
      showToast(err.message || 'خطا در اعمال تغییرات دسته‌جمعی قیمت', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async (recordId: string) => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این تغییر قیمت را به حالت قبل بازگردانید؟')) {
      return;
    }

    setUndoingId(recordId);
    try {
      const res = await api.undoBulkPriceAdjustment(recordId);
      showToast(res.message || 'تغییرات با موفقیت به حالت قبل بازگردانی شد.', 'success');
      await loadHistory();
      onSuccess();
    } catch (err: any) {
      console.error('Error undoing adjustment:', err);
      showToast(err.message || 'خطا در بازگردانی تغییرات', 'error');
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between bg-slate-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                ابزار اصلاح دسته‌جمعی قیمت و تبدیل ریال به تومان
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                اصلاح مبالغی که اشتباهاً به ریال وارد شده‌اند همراه با قابلیت بازگردانی کامل (Undo)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#222226] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#161619] px-4 pt-2">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`pb-2.5 px-4 font-bold text-xs transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'adjust'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>اعمال تغییرات جدید</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-4 font-bold text-xs transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سوابق و بازگردانی (Undo)</span>
          </button>
        </div>

        {/* Tab 1: Adjust */}
        {activeTab === 'adjust' ? (
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Target Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                محدوده اعمال کالاها:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetMode('selected')}
                  disabled={selectedProductIds.length === 0}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    targetMode === 'selected'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  } ${selectedProductIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>فقط کالاهای انتخابی جدول</span>
                    <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                      {toPersianDigits(selectedProductIds.length)} کالا
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {selectedProductIds.length > 0
                      ? 'تغییر فقط روی کالاهایی که چک‌باکس آن‌ها در جدول زده شده اعمال می‌شود.'
                      : 'هیچ کالایی در جدول انتخاب نشده است.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode('all')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    targetMode === 'all'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>تمام کالاهای موجود در سیستم</span>
                    <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                      {toPersianDigits(products.length)} کالا
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    اصلاح روی کل کاتالوگ و پایگاه داده سیستم اعمال می‌گردد.
                  </p>
                </button>
              </div>
            </div>

            {/* Operation Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                نوع عملیات تبدیل واحد:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOperation('divide_10');
                    setReason('اصلاح اشتباه واحد ریال به تومان (تقسیم بر ۱۰)');
                  }}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    operation === 'divide_10'
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تقسیم بر ۱۰ (تبدیل ریال ➔ تومان)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    برای مواردی که قیمت فایل اکسل یا کاربر به اشتباه به ریال وارد شده و ۱۰ برابر است.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOperation('multiply_10');
                    setReason('ضرب در ۱۰ (بازگردانی تومان به ریال)');
                  }}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    operation === 'multiply_10'
                      ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4" />
                    <span>ضرب در ۱۰ (تبدیل تومان ➔ ریال)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    در صورتی که قیمت‌ها اشتباهاً قبلاً تقسیم شده باشند.
                  </p>
                </button>
              </div>
            </div>

            {/* Field Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  فیلدهای قیمتی مشمول تغییر:
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllFields}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                >
                  {selectedFields.length === PRICE_FIELDS.length ? 'لغو انتخاب همه' : 'انتخاب همه فیلدها'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-[#161619] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {PRICE_FIELDS.map((f) => {
                  const isChecked = selectedFields.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleField(f.id)}
                        className="rounded accent-indigo-600 cursor-pointer"
                      />
                      <span>{f.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                علت ثبت این تغییر (جهت حسابرسی و سابقه):
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثلاً: اصلاح قیمت‌های اکسل پخش که به ریال بود"
                className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Preview of Calculation */}
            {targetProducts.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>پیش‌نمایش تغییر قیمت ۳ نمونه کالا:</span>
                  <span className="text-[11px] text-slate-500">
                    ضریب محاسباتی: {operation === 'divide_10' ? '÷ ۱۰' : '× ۱۰'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {targetProducts.slice(0, 3).map((p) => {
                    const currentBuy = p.buyPrice || 0;
                    const newBuy = Math.round(currentBuy * factor);
                    const currentSale = p.salePrice || p.priceShop1 || 0;
                    const newSale = Math.round(currentSale * factor);
                    return (
                      <div key={p.id} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="truncate max-w-[200px]">
                          <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{p.code || p.barcode}</span>
                        </div>
                        <div className="flex items-center gap-3 text-right shrink-0">
                          <div>
                            <span className="text-[10px] text-slate-400 block">بهای خرید:</span>
                            <span className="text-slate-500 line-through ml-1">{formatToman(currentBuy)}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">➔ {formatToman(newBuy)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">فروش حضوری:</span>
                            <span className="text-slate-500 line-through ml-1">{formatToman(currentSale)}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">➔ {formatToman(newSale)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: History */
          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            {isLoadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-500">در حال بارگذاری سوابق تغییرات...</div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">هیچ سابقه تغییر دسته‌جمعی ثبت نشده است.</div>
            ) : (
              historyList.map((rec) => {
                const isUndone = Boolean(rec.undone_at);
                const isDivide = rec.operation === 'divide_10';
                return (
                  <div
                    key={rec.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isUndone
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-75'
                        : 'border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-[#1B1B20] shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            isDivide
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isDivide ? 'تقسیم بر ۱۰ (ریال به تومان)' : 'ضرب در ۱۰ (تومان به ریال)'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {toPersianDigits(rec.affected_count || 0)} کالا
                        </span>
                      </div>

                      {isUndone ? (
                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                          بازگردانی شده در {new Date(rec.undone_at!).toLocaleDateString('fa-IR')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUndo(rec.id)}
                          disabled={undoingId === rec.id}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{undoingId === rec.id ? 'در حال بازگردانی...' : 'بازگردانی به قبل (Undo)'}</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                      <span>علت: {rec.reason || 'بدون توضیح'}</span>
                      <span className="text-[11px] text-slate-400">
                        توسط {rec.created_by} در {new Date(rec.created_at).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#141416] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            بستن
          </button>

          {activeTab === 'adjust' && (
            <button
              onClick={handleApply}
              disabled={isSubmitting || targetProducts.length === 0}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>در حال اعمال تغییرات...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    اعمال تغییرات روی {toPersianDigits(targetProducts.length)} کالا
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
