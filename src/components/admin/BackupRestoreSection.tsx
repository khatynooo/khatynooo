import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../common/Toast';
import { toPersianDigits, formatToman } from '../../lib/utils';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FileJson,
  Package,
  FileSpreadsheet,
  Users,
  CreditCard,
  ImageIcon,
  ShieldCheck,
  Server,
  Layers,
  Info,
  HardDrive,
} from 'lucide-react';

interface BackupStats {
  totalRows: number;
  tableCounts: Record<string, number>;
  mediaCount: number;
  couponCount: number;
  reviewCount: number;
  generatedAt: string;
  jalaliDate: string;
}

export const BackupRestoreSection: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'sql' | 'json' | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);

  // File upload state for restore
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileFormat, setFileFormat] = useState<'sql' | 'json'>('sql');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getBackupStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading backup stats:', err);
      showToast(err.message || 'خطا در دریافت آمار دیتابیس', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async (format: 'sql' | 'json') => {
    setExportingFormat(format);
    try {
      const blob = await api.exportBackupBlob(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = format === 'json' ? `khatinoo_backup_${dateStr}.json` : `khatinoo_database_${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`فایل پشتیبان ${format.toUpperCase()} با موفقیت تولید و دانلود شد.`, 'success');
      fetchStats();
    } catch (err: any) {
      console.error('Export error:', err);
      showToast(err.message || 'خطا در تهیه نسخه پشتیبان', 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const isJson = file.name.endsWith('.json');
    setFileFormat(isJson ? 'json' : 'sql');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExecuteRestore = async () => {
    if (!fileContent) {
      showToast('لطفاً ابتدا فایل پشتیبان را انتخاب نمایید.', 'error');
      return;
    }

    setRestoring(true);
    setRestoreResult(null);
    setConfirmModalOpen(false);

    try {
      let payload: any;
      if (fileFormat === 'json') {
        try {
          const parsed = JSON.parse(fileContent);
          payload = { format: 'json', data: parsed };
        } catch (e) {
          throw new Error('فایل JSON معتبر نیست یا آسیب دیده است.');
        }
      } else {
        payload = { format: 'sql', content: fileContent };
      }

      const res = await api.restoreBackup(payload);
      setRestoreResult(res);
      showToast('بازیابی اطلاعات با موفقیت انجام شد.', 'success');
      fetchStats();
    } catch (err: any) {
      console.error('Restore error:', err);
      showToast(err.message || 'خطا در بازیابی اطلاعات', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const tc = stats?.tableCounts || {};
  const accountingCount = (tc['sales_invoices'] || 0) + (tc['purchase_invoices'] || 0) + (tc['customer_transactions'] || 0) + (tc['supplier_transactions'] || 0) + (tc['cheques'] || 0);
  const productsCount = tc['products'] || 0;
  const customersCount = (tc['customers'] || 0) + (tc['suppliers'] || 0);
  const warehouseCount = (tc['warehouses'] || 0) + (tc['inventory_by_location'] || 0);
  const ordersCount = tc['online_orders'] || 0;
  const mediaCount = stats?.mediaCount || 0;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#C9A227]/10 via-[#1C1C20] to-[#111113] border border-[#C9A227]/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
              <Database className="w-4 h-4" />
              <span>پایگاه داده، سیستم حسابداری و کتابخانه رسانه</span>
            </div>
            <h2 className="text-xl font-black text-[#F3F4F6]">
              پشتیبان‌گیری و بازیابی همه‌جانبه (SQL & Media Backup)
            </h2>
            <p className="text-xs text-[#8E9299] max-w-2xl leading-relaxed">
              تهیه خروجی کامل و استاندارد از کل داده‌های نرم‌افزار (شامل فاکتورها، مشتریان، چک‌های صیاد، انبارها، کالاها، تنظیمات سایت و عکس‌ها) و بازیابی در هر زمان.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loadingStats}
              className="bg-[#1C1C20] hover:bg-[#25252A] text-[#E0E0E0] border border-[#2D2D33] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-[#C9A227]' : ''}`} />
              <span>به‌روزرسانی آمار</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111113] border border-[#222225] p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-[11px] font-semibold">کل ردیف‌های داده</span>
            <Database className="w-3.5 h-3.5 text-[#C9A227]" />
          </div>
          <div className="text-lg font-black text-[#F3F4F6] font-mono">
            {stats ? toPersianDigits(stats.totalRows.toLocaleString('fa-IR')) : '...'}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">آماده پشتیبان‌گیری</div>
        </div>

        <div className="bg-[#111113] border border-[#222225] p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-[11px] font-semibold">اسناد حسابداری و چک</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-black text-[#F3F4F6] font-mono">
            {stats ? toPersianDigits(accountingCount.toLocaleString('fa-IR')) : '...'}
          </div>
          <div className="text-[10px] text-[#8E9299]">فاکتور، سند و چک</div>
        </div>

        <div className="bg-[#111113] border border-[#222225] p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-[11px] font-semibold">کالاها و محصولات</span>
            <Package className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black text-[#F3F4F6] font-mono">
            {stats ? toPersianDigits(productsCount.toLocaleString('fa-IR')) : '...'}
          </div>
          <div className="text-[10px] text-[#8E9299]">با قیمت‌های ۵ سطحی</div>
        </div>

        <div className="bg-[#111113] border border-[#222225] p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-[11px] font-semibold">اشخاص و طرف‌حساب</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-black text-[#F3F4F6] font-mono">
            {stats ? toPersianDigits(customersCount.toLocaleString('fa-IR')) : '...'}
          </div>
          <div className="text-[10px] text-[#8E9299]">مشتریان و تامین‌کنندگان</div>
        </div>

        <div className="bg-[#111113] border border-[#222225] p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-[11px] font-semibold">رسانه، عکس و مدیا</span>
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-[#F3F4F6] font-mono">
            {stats ? toPersianDigits(mediaCount.toLocaleString('fa-IR')) : '...'}
          </div>
          <div className="text-[10px] text-[#8E9299]">تصاویر WebP و لوگوها</div>
        </div>

        <div className="bg-[#111113] border border-[#222225] p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-[11px] font-semibold">سفارشات اینترنتی</span>
            <Layers className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-lg font-black text-[#F3F4F6] font-mono">
            {stats ? toPersianDigits(ordersCount.toLocaleString('fa-IR')) : '...'}
          </div>
          <div className="text-[10px] text-[#8E9299]">سفارشات سایت</div>
        </div>
      </div>

      {/* Main Two-Column Layout: Export on Right, Restore on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EXPORT CARD */}
        <div className="bg-[#111113] border border-[#222225] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#222225] pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#C9A227] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F3F4F6]">دانلود و تهیه نسخه پشتیبان کامل</h3>
              <p className="text-xs text-[#8E9299]">تولید فایل در دو فرمت استاندارد SQL و JSON</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* SQL Export Button */}
            <div className="bg-[#161619] border border-[#2D2D33] hover:border-[#C9A227]/40 rounded-xl p-4 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#F3F4F6]">
                    <FileCode className="w-4 h-4 text-[#C9A227]" />
                    <span>فایل پشتیبان استاندارد SQL Dump (.sql)</span>
                    <span className="bg-[#C9A227]/20 text-[#C9A227] text-[10px] px-2 py-0.5 rounded font-mono">پیشنهادی</span>
                  </div>
                  <p className="text-[11px] text-[#8E9299] leading-relaxed">
                    شامل دستورات کامل DDL و ردیف‌های INSERT با هندل تعارض (ON CONFLICT) برای پایگاه داده PostgreSQL و سازگار با تمام ابزارهای pg_restore / DBeaver / داکر.
                  </p>
                </div>
                <button
                  onClick={() => handleExport('sql')}
                  disabled={exportingFormat !== null}
                  className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#C9A227]/20 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {exportingFormat === 'sql' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال تولید...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* JSON Export Button */}
            <div className="bg-[#161619] border border-[#2D2D33] hover:border-blue-500/40 rounded-xl p-4 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#F3F4F6]">
                    <FileJson className="w-4 h-4 text-blue-400" />
                    <span>فایل جامع باندل ساختاریافته (.json)</span>
                  </div>
                  <p className="text-[11px] text-[#8E9299] leading-relaxed">
                    شامل آرایه تفکیک‌شده تمام جداول دیتابیس، عکس‌های کتابخانه رسانه، قالب‌های چیدمان و تنظیمات برای مهاجرت ساده بین سرورها یا بکاپ متنی سبک.
                  </p>
                </div>
                <button
                  onClick={() => handleExport('json')}
                  disabled={exportingFormat !== null}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {exportingFormat === 'json' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال تولید...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Backup Checklist Info */}
          <div className="bg-[#161619] rounded-xl p-3.5 text-xs space-y-2 border border-[#222225]">
            <div className="font-bold text-[#E0E0E0] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>محتوای بسته پشتیبان خطی‌نو شامل:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8E9299]">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>کلیه فاکتورهای فروش و خرید</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>چک‌ها و شناسه‌های صیادی</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>کالاها و سطوح قیمت ۵گانه</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>موجودی انبارها و قفسه‌ها</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>عکس‌ها و گالری محصولات و سایت</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>تنظیمات اینماد، هدر، بنر و درگاه</span>
              </div>
            </div>
          </div>
        </div>

        {/* RESTORE CARD */}
        <div className="bg-[#111113] border border-[#222225] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#222225] pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F3F4F6]">بازگردانی و بازیابی اطلاعات دیتابیس</h3>
              <p className="text-xs text-[#8E9299]">بارگذاری فایل پشتیبان (.sql یا .json) و اعمال روی سیستم</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* File Dropzone */}
            <div className="border-2 border-dashed border-[#2D2D33] hover:border-[#C9A227]/50 rounded-2xl p-6 text-center transition-all bg-[#161619] relative">
              <input
                type="file"
                accept=".sql,.json"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-xl bg-[#222225] text-[#C9A227] flex items-center justify-center mx-auto">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-[#E0E0E0]">
                  {selectedFile ? (
                    <span className="text-[#C9A227]">{selectedFile.name}</span>
                  ) : (
                    <span>برای انتخاب یا رها کردن فایل پشتیبان اینجا کلیک کنید</span>
                  )}
                </div>
                <p className="text-[10px] text-[#8E9299]">
                  {selectedFile ? (
                    <span>حجم فایل: {(selectedFile.size / 1024).toFixed(1)} کیلوبایت • نوع: {fileFormat.toUpperCase()}</span>
                  ) : (
                    <span>پشتیبانی از فایل‌های SQL Dump (.sql) و JSON Bundle (.json)</span>
                  )}
                </p>
              </div>
            </div>

            {selectedFile && fileContent && (
              <div className="space-y-3">
                <div className="bg-[#161619] border border-[#2D2D33] rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#C9A227]" />
                    <span className="font-bold text-[#E0E0E0]">فایل آماده پردازش است</span>
                  </div>
                  <span className="text-[11px] text-[#8E9299] font-mono">
                    {toPersianDigits(fileContent.length.toLocaleString('fa-IR'))} کاراکتر
                  </span>
                </div>

                <button
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={restoring}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {restoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال بازگردانی و ثبت داده‌ها...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>شروع عملیات بازگردانی اطلاعات</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Restore Results Banner */}
            {restoreResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{restoreResult.message || 'عملیات بازیابی با موفقیت کامل انجام شد.'}</span>
                </div>
                {restoreResult.restoredTables && (
                  <div className="text-[11px] text-[#8E9299] space-y-1 pt-1 border-t border-emerald-500/20">
                    <div className="font-semibold text-[#E0E0E0]">خلاصه ردیف‌های بازگردانی شده:</div>
                    <div className="grid grid-cols-2 gap-1 font-mono">
                      {Object.entries(restoreResult.restoredTables)
                        .filter(([_, count]: any) => count > 0)
                        .map(([table, count]: any) => (
                          <div key={table} className="flex items-center justify-between bg-[#111113] px-2 py-0.5 rounded">
                            <span className="text-[#8E9299] text-[10px]">{table}:</span>
                            <span className="text-emerald-400 font-bold">{toPersianDigits(count)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {restoreResult.statementsExecuted !== undefined && (
                  <div className="text-[11px] text-[#8E9299]">
                    تعداد دستورات SQL اجرا شده: <span className="text-emerald-400 font-bold font-mono">{toPersianDigits(restoreResult.statementsExecuted)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-[#161619] border border-[#2D2D33] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-black text-sm text-[#F3F4F6]">تأیید عملیات بازگردانی اطلاعات</h3>
              <p className="text-xs text-[#8E9299] leading-relaxed">
                آیا از بازگردانی داده‌های فایل <span className="text-[#C9A227] font-bold">{selectedFile?.name}</span> اطمینان دارید؟ اطلاعات موجود در دیتابیس با داده‌های این فایل به‌روزرسانی و همگام خواهند شد.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExecuteRestore}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                بله، بازگردانی انجام شود
              </button>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="bg-[#222225] hover:bg-[#2A2A2E] text-[#E0E0E0] font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
