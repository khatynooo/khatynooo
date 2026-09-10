import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Ban,
  ExternalLink,
  Eye,
  AlertTriangle,
  Send,
  Calendar,
  Layers,
} from 'lucide-react';
import { ProductPublicationRecord, PublicationStats, PublicationStatus, PublicationProvider } from '../../../types';
import { api } from '../../../lib/api';

export const PublicationHistoryLog: React.FC = () => {
  const [history, setHistory] = useState<ProductPublicationRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<PublicationStats | null>(null);
  const [loading, setLoading] = useState(true);

  // فیلترها
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  // مدال مشاهده جزئیات پیام ارسالی
  const [selectedItem, setSelectedItem] = useState<ProductPublicationRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await api.getPublicationStats();
      if (res && res.stats) {
        setStats(res.stats);
      }
    } catch (e: any) {
      console.warn('Error fetching stats:', e.message);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getPublicationHistory({
        provider: providerFilter || undefined,
        status: statusFilter || undefined,
        eventType: eventTypeFilter || undefined,
        limit,
        offset: page * limit,
      });

      if (res && res.items) {
        setHistory(res.items);
        setTotalCount(res.total || 0);
      }
    } catch (err: any) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [providerFilter, statusFilter, eventTypeFilter, page]);

  const handleRetry = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.retryPublication(id);
      await fetchHistory();
      await fetchStats();
    } catch (err: any) {
      alert(`خطا در ارسال مجدد: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('آیا از لغو این وظیفه انتشار اطمینان دارید؟')) return;
    setActionLoadingId(id);
    try {
      await api.cancelPublication(id);
      await fetchHistory();
      await fetchStats();
    } catch (err: any) {
      alert(`خطا در لغو: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: PublicationStatus) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            منتشر شد
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            در صف ارسال
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            در حال ارسال
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            ناموفق
          </span>
        );
      case 'not_configured':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            کانال بدون توکن
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            <Ban className="w-3.5 h-3.5" />
            لغو شده
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getEventTitle = (event: string) => {
    switch (event) {
      case 'product_created':
        return 'کالای جدید';
      case 'product_updated':
        return 'ویرایش مشخصات';
      case 'price_changed':
        return 'تغییر قیمت فروش';
      case 'stock_restocked':
        return 'شارژ مجدد موجودی';
      case 'manual':
        return 'ارسال دستی';
      default:
        return event;
    }
  };

  const getProviderBadge = (provider: PublicationProvider) => {
    switch (provider) {
      case 'eitaa':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">ایتا</span>;
      case 'bale':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">بله</span>;
      case 'telegram':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">تلگرام</span>;
      case 'instagram':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-800">اینستاگرام</span>;
      case 'website':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">وب‌سایت</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">{provider}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* کارت‌های آماری شاخص کلیدی (KPIs) */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-[#222225] shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مجموع انتشار موفق</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {stats.totalSent.toLocaleString('fa-IR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">پست‌های تحویل‌شده</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-[#222225] shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">انتشارهای امروز</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {stats.todaySent.toLocaleString('fa-IR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">فعالیت ۲۴ ساعت اخیر</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-[#222225] shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">در صف ارسال (Pending)</div>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
              {stats.totalPending.toLocaleString('fa-IR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">در انتظار پردازش ورکر</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-[#222225] shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">ناموفق / نیازمند بررسی</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {stats.totalFailed.toLocaleString('fa-IR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">خطای توکن یا شبکه</div>
          </div>
        </div>
      )}

      {/* نوار فیلتر و جستجو */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-[#222225] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* فیلتر پیام‌رسان */}
          <select
            value={providerFilter}
            onChange={e => {
              setProviderFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="">همه کانال‌ها و درگاه‌ها</option>
            <option value="eitaa">پیام‌رسان ایتا</option>
            <option value="bale">پیام‌رسان بله</option>
            <option value="telegram">تلگرام</option>
            <option value="instagram">اینستاگرام</option>
            <option value="website">وب‌سایت</option>
          </select>

          {/* فیلتر وضعیت */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="sent">منتشر شده (Sent)</option>
            <option value="pending">در صف (Pending)</option>
            <option value="processing">در حال ارسال (Processing)</option>
            <option value="failed">ناموفق (Failed)</option>
            <option value="not_configured">پیکربندی نشده</option>
            <option value="cancelled">لغو شده</option>
          </select>

          {/* فیلتر رویداد */}
          <select
            value={eventTypeFilter}
            onChange={e => {
              setEventTypeFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="">همه نوع رویدادها</option>
            <option value="manual">ارسال دستی کاربر</option>
            <option value="product_created">کالای جدید</option>
            <option value="price_changed">تغییر قیمت</option>
            <option value="stock_restocked">شارژ مجدد</option>
            <option value="product_updated">به‌روزرسانی کالا</option>
          </select>
        </div>

        <button
          onClick={() => {
            fetchHistory();
            fetchStats();
          }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-[#1F1F24] hover:bg-slate-200 dark:hover:bg-[#28282E] text-slate-700 dark:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تازه‌سازی
        </button>
      </div>

      {/* جدول تاریخچه */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#222225] bg-white dark:bg-[#141416] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-[#18181C] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-[#222225] font-black">
              <tr>
                <th className="p-3.5">کالا</th>
                <th className="p-3.5">درگاه مقصد</th>
                <th className="p-3.5">نوع رویداد</th>
                <th className="p-3.5">وضعیت انتشار</th>
                <th className="p-3.5">دفعات تلاش</th>
                <th className="p-3.5">زمان ثبت / ارسال</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E1E22]">
              {loading && history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    در حال بارگذاری لاگ انتشار چندکاناله...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    رکوردی با مشخصات درخواستی در صف و تاریخچه انتشار یافت نشد.
                  </td>
                </tr>
              ) : (
                history.map(item => {
                  const isActionLoading = actionLoadingId === item.id;
                  const dateStr = item.sentAt || item.createdAt;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleString('fa-IR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#1A1A1E]/70 transition-colors"
                    >
                      {/* مشخصات کالا */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName || 'product'}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-[#2C2C32] shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#1E1E22] flex items-center justify-center text-slate-400 text-xs shrink-0">
                              کالا
                            </div>
                          )}
                          <div className="max-w-[200px] truncate">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {item.productName || 'کالای نامشخص'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              کد: {item.productCode || item.productId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* درگاه مقصد */}
                      <td className="p-3.5">{getProviderBadge(item.provider)}</td>

                      {/* نوع رویداد */}
                      <td className="p-3.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {getEventTitle(item.eventType)}
                        </span>
                      </td>

                      {/* وضعیت */}
                      <td className="p-3.5">{getStatusBadge(item.status)}</td>

                      {/* دفعات تلاش */}
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {item.attempts} از {item.maxAttempts}
                      </td>

                      {/* زمان */}
                      <td className="p-3.5 text-slate-500 text-[11px]">{formattedDate}</td>

                      {/* عملیات */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* مشاهده متن ارسالی */}
                          <button
                            onClick={() => setSelectedItem(item)}
                            title="مشاهده محتوای ارسال‌شده"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#222226]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* لینک مستقیم به پست منتشر شده در صورت وجود */}
                          {item.externalUrl && (
                            <a
                              href={item.externalUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              title="مشاهده پست در کانال"
                              className="p-1.5 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          {/* تلاش مجدد در صورت شکست */}
                          {(item.status === 'failed' || item.status === 'not_configured') && (
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={isActionLoading}
                              title="تلاش مجدد برای ارسال (Retry)"
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              <RotateCcw
                                className={`w-4 h-4 ${isActionLoading ? 'animate-spin' : ''}`}
                              />
                            </button>
                          )}

                          {/* لغو در صورت Pending بودن */}
                          {item.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(item.id)}
                              disabled={isActionLoading}
                              title="لغو انتشار از صف"
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* صفحه‌بندی */}
        {totalCount > limit && (
          <div className="p-3 border-t border-slate-100 dark:border-[#222225] flex items-center justify-between text-xs">
            <span className="text-slate-500">
              نمایش صفحه {page + 1} از {Math.ceil(totalCount / limit)} (کل رکوردها: {totalCount})
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2C2C32] disabled:opacity-40"
              >
                قبلی
              </button>
              <button
                disabled={(page + 1) * limit >= totalCount}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2C2C32] disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* مدال پیش‌نمایش جزئیات پیام ارسالی و خطای احتمالی */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#28282D] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-[#222226] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    جزئیات پست ارسالی به {getProviderBadge(selectedItem.provider)}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">Job: {selectedItem.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* وضعیت و خطا */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#19191D] border border-slate-200 dark:border-[#28282E]">
                <span>وضعیت:</span>
                {getStatusBadge(selectedItem.status)}
              </div>

              {selectedItem.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    پیام خطای دریافت شده از درگاه:
                  </div>
                  <div className="font-mono text-[11px] leading-relaxed">
                    {selectedItem.errorMessage}
                  </div>
                  {selectedItem.errorCode && (
                    <div className="text-[10px] text-rose-600 font-mono">
                      کد خطا: {selectedItem.errorCode}
                    </div>
                  )}
                </div>
              )}

              {/* تصویر در صورت وجود */}
              {selectedItem.payload?.imageUrl && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    تصویر ضمیمه:
                  </span>
                  <img
                    src={selectedItem.payload.imageUrl}
                    alt="Product"
                    className="max-h-48 rounded-xl object-contain border border-slate-200 dark:border-[#2C2C32]"
                  />
                </div>
              )}

              {/* متن ارسالی */}
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  متن و کپشن نهایی ارسال شده:
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-[#28282E] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                  {selectedItem.payload?.text || '(متنی ثبت نشده است)'}
                </div>
              </div>

              {/* هشتگ‌ها */}
              {selectedItem.payload?.hashtags && selectedItem.payload.hashtags.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    هشتگ‌های تولیدی هوشمند:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.payload.hashtags.map((h, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40 text-[11px]"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-[#222226] bg-slate-50 dark:bg-[#101012] flex items-center justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-[#202024] text-slate-800 dark:text-white"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
