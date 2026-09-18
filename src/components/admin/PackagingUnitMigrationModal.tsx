import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface PackagingUnitMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PackagingUnitMigrationModal: React.FC<PackagingUnitMigrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [report, setReport] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.getPackagingUnitMigrationReport();
      setReport(data);
    } catch (err: any) {
      showToast(err.message || 'خطا در واکشی گزارش مایگریشن', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen]);

  const handleExecute = async () => {
    if (!window.confirm('آیا از تبدیل واحدهای بسته‌بندی به مبنای «عدد» و به‌روزرسانی موجودی و قیمت‌ها اطمینان دارید؟')) {
      return;
    }
    setExecuting(true);
    try {
      const res = await api.executePackagingUnitMigration(true);
      showToast(res.message || 'مایگریشن با موفقیت اجرا و کالاها اصلاح شدند.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در اجرای مایگریشن', 'error');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  const totalToMigrate = report?.totalToMigrate || 0;
  const items = report?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2D2D33] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#2D2D33] flex items-center justify-between bg-slate-50 dark:bg-[#161619]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>بررسی و یکپارچه‌سازی واحد کالاها بر مبنای «عدد»</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-normal">
                  استاندارد خطی‌نو
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تبدیل کالاهایی که واحد اصلی آن‌ها بسته/جین/کارتن ثبت شده به مبنای «عدد» به همراه تفکیک ضریب بسته‌بندی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#25252A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                در حال بررسی و اسکن پایگاه داده کالاها...
              </span>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33]">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">کل کالاهای بررسی‌شده</span>
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {toPersianDigits(report?.totalProductsScanned || 0)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <span className="text-xs text-amber-700 dark:text-amber-400 block mb-1">کالاهای نیازمند اصلاح و تفکیک</span>
                  <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                    {toPersianDigits(totalToMigrate)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 block mb-1">وضعیت کلی سیستم</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-4 h-4" />
                    {totalToMigrate === 0 ? 'کاملاً همگام و منطبق' : 'آماده اعمال تغییرات ایمن'}
                  </span>
                </div>
              </div>

              {totalToMigrate === 0 ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    تمامی کالاها با استاندارد مبنای «عدد» تنظیم شده‌اند
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-lg mx-auto">
                    هیچ کالایی با واحد نامنطبق یا قیمت اشتباه بسته‌ای یافت نشد. قیمت‌گذاری و فروش سریع بر مبنای عدد انجام خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5">تحلیل قبل از اجرا (Dry-Run):</strong>
                      <span>
                        کالاهای زیر واحد اصلی غیرعددی (مانند جین، کارتن یا بسته) دارند. پس از تایید، واحد اصلی به «عدد» تبدیل شده،
                        موجودی انبار در ضریب بسته ضرب می‌شود، و بهای خرید و فروش بر ضریب تقسیم می‌شوند تا قیمت هر عدد به‌دست آید.
                      </span>
                    </div>
                  </div>

                  {/* Table of items to migrate */}
                  <div className="border border-slate-200 dark:border-[#2D2D33] rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 dark:bg-[#1F1F24] text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-[#2D2D33]">
                        <tr>
                          <th className="p-3">کد و نام کالا</th>
                          <th className="p-3">واحد فعلی و ضریب</th>
                          <th className="p-3 text-center">موجودی فعلی → جدید</th>
                          <th className="p-3 text-center">قیمت خرید فعلی → جدید</th>
                          <th className="p-3 text-center">قیمت فروش فعلی → جدید</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#26262B]">
                        {items.map((it: any) => (
                          <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-[#161619]">
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                              <div className="font-bold">{it.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{it.code}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-amber-600 dark:text-amber-400">
                                {it.currentUnit} (ضریب {toPersianDigits(it.packagingFactor)})
                              </div>
                              <div className="text-[10px] text-slate-500">
                                واحد بسته: {it.packagingUnit}
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-slate-400">{toPersianDigits(it.currentStock)} {it.currentUnit}</span>
                                <ArrowRight className="w-3 h-3 text-indigo-500" />
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {toPersianDigits(it.newStock)} عدد
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-slate-400">{formatToman(it.currentBuyPrice)}</span>
                                <ArrowRight className="w-3 h-3 text-indigo-500" />
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {formatToman(it.newBuyPrice)}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-slate-400">{formatToman(it.currentSalePrice)}</span>
                                <ArrowRight className="w-3 h-3 text-indigo-500" />
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {formatToman(it.newSalePrice)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#2D2D33] flex items-center justify-between bg-slate-50 dark:bg-[#161619]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#25252A] text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadReport}
              disabled={loading || executing}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-[#25252A] hover:bg-slate-300 dark:hover:bg-[#2F2F36] text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بررسی مجدد</span>
            </button>

            {totalToMigrate > 0 && (
              <button
                type="button"
                onClick={handleExecute}
                disabled={loading || executing}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال اعمال تغییرات...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>تایید و اعمال مایگریشن ({toPersianDigits(totalToMigrate)} کالا)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
