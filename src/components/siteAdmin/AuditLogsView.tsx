import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Key,
  Clock,
  User,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AdminAuditLog } from '../../types';
import { useToast } from '../common/Toast';

export const AuditLogsView: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(60);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <Shield className="w-4 h-4" />
            <span>امنیت، لاگ حسابرسی و احراز هویت دو مرحله‌ای (Security Audit Logs & 2FA)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            گزارش فعالیت‌های مدیریتی و امنیت سیستم
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            ثبت تمامی تغییرات قیمت، فعال‌سازی ماژول‌ها، ورود ادمین‌ها، آی‌پی دستگاه و تنظیم احراز هویت دو مرحله‌ای ۲FA با پیامک و Google Authenticator.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="bg-white dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] text-slate-700 dark:text-[#E0E0E0] hover:border-[#C9A227] text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-[#C9A227]" />
          <span>بروزرسانی لاگ‌ها</span>
        </button>
      </div>

      {/* Security Policies Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-[#C9A227]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                  احراز هویت دومرحله‌ای (2FA SMS / TOTP)
                </h3>
                <span className="text-[10px] text-slate-400">الزام ورود با کد پیامکی برای ادمین‌ها</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => {
                setTwoFactorEnabled(e.target.checked);
                showToast(`احراز هویت دو مرحله‌ای ${e.target.checked ? 'فعال' : 'غیرفعال'} شد.`, 'info');
              }}
              className="w-4 h-4 accent-[#C9A227] cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1A1A1E] flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                  مدت زمان انقضای سشن (Session Timeout)
                </h3>
                <span className="text-[10px] text-slate-400">خروج خودکار پس از عدم فعالیت</span>
              </div>
            </div>
            <select
              value={sessionTimeoutMins}
              onChange={(e) => {
                setSessionTimeoutMins(Number(e.target.value));
                showToast('مدت انقضای سشن به‌روزرسانی شد.', 'info');
              }}
              className="bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-[#E0E0E0] outline-none"
            >
              <option value={15}>۱۵ دقیقه</option>
              <option value={30}>۳۰ دقیقه</option>
              <option value={60}>۱ ساعت</option>
              <option value={240}>۴ ساعت</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
        <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6] flex items-center gap-2">
          <Key className="w-4 h-4 text-[#C9A227]" />
          <span>جدول تاریخچه لاگ‌های امنیتی و رویدادهای مدیریتی</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#222225] text-slate-400 text-[11px]">
                <th className="pb-3 pr-2">کاربر مدیر</th>
                <th className="pb-3">عملیات انجام شده</th>
                <th className="pb-3">آدرس IP</th>
                <th className="pb-3">دستگاه / کلاینت</th>
                <th className="pb-3 pl-2 text-left">زمان رویداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E1E22]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-[#161619]/40 transition-colors">
                  <td className="py-3.5 pr-2 font-bold text-slate-900 dark:text-[#F3F4F6] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-[#222225] flex items-center justify-center text-[10px]">
                      <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span>{log.username}</span>
                  </td>
                  <td className="py-3.5 text-slate-700 dark:text-[#D1D5DB]">{log.action}</td>
                  <td className="py-3.5 font-mono text-[11px] text-slate-500">{log.ipAddress}</td>
                  <td className="py-3.5 text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>{log.userAgent}</span>
                  </td>
                  <td className="py-3.5 pl-2 text-left font-mono text-[11px] text-slate-400">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
