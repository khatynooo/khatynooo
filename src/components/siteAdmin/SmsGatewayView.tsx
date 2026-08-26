import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Save,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  PhoneCall,
  Key,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { SmsGatewayConfig, SmsLog } from '../../types';
import { useToast } from '../common/Toast';

export const SmsGatewayView: React.FC = () => {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SmsGatewayConfig | null>(null);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Test SMS form state
  const [testMobile, setTestMobile] = useState('');
  const [testMessage, setTestMessage] = useState('سلام! این یک پیامک تست از وب‌سایت لوازم‌التحریر خطی‌نو است.');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fetchSmsData = async () => {
    setLoading(true);
    try {
      const [cfgRes, logsRes] = await Promise.all([
        api.getSmsConfig().catch(() => ({ config: null })),
        api.getSmsLogs().catch(() => ({ logs: [] })),
      ]);
      setConfig(cfgRes.config);
      setLogs(logsRes.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmsData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setIsSaving(true);
    try {
      await api.updateSmsConfig(config);
      showToast('تنظیمات درگاه پیامک با موفقیت ذخیره شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره تنظیمات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMobile.trim()) {
      showToast('لطفاً شماره موبایل گیرنده را وارد نمایید.', 'warning');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await api.sendTestSms(testMobile, testMessage);
      showToast(res.message || 'پیامک با موفقیت به صف ارسال فرستاده شد.', 'success');
      // Refresh logs
      const logsRes = await api.getSmsLogs().catch(() => ({ logs: [] }));
      setLogs(logsRes.logs || []);
    } catch (err: any) {
      showToast(err.message || 'خطا در ارسال پیامک تست', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <MessageSquare className="w-4 h-4" />
            <span>یکپارچه‌سازی درگاه پیامک و الگوهای خدماتی (SMS Provider & OTP Gateway)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            تنظیمات پنل پیامک و اطلاع‌رسانی سفارشات
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            اتصال به وب‌سرویس‌های کاوه‌نگار، ملی‌پیامک، فراز اس‌ام‌اس و قاصدک، ارسال خودکار کد رهگیری پستی به مشتریان و احراز هویت دو مرحله‌ای OTP.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Configuration Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {config && (
            <form onSubmit={handleSaveConfig} className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-5 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222225]">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                    تنظیمات وب‌سرویس و اعتبارنامه درگاه
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">وضعیت درگاه:</span>
                  <input
                    type="checkbox"
                    checked={config.isEnabled}
                    onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#C9A227] cursor-pointer"
                  />
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="block text-slate-600 dark:text-[#D1D5DB] text-xs font-bold">
                  انتخاب ارائه‌دهنده پیامک (SMS Provider):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'kavenegar', name: 'کاوه‌نگار (Kavenegar)' },
                    { id: 'melipayamak', name: 'ملی پیامک (MeliPayamak)' },
                    { id: 'farazsms', name: 'فراز اس‌ام‌اس (FarazSMS)' },
                    { id: 'ghasedak', name: 'قاصدک (Ghasedak)' },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setConfig({ ...config, provider: p.id as any })}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        config.provider === p.id
                          ? 'border-[#C9A227] bg-[#C9A227]/10 text-amber-700 dark:text-[#C9A227] shadow-sm'
                          : 'border-slate-200 dark:border-[#2D2D33] text-slate-600 dark:text-[#8E9299] hover:bg-slate-50'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">کلید دسترسی API (API Key / Token):</label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">شماره خط فرستنده (Sender Line Number):</label>
                  <input
                    type="text"
                    value={config.senderNumber}
                    onChange={(e) => setConfig({ ...config, senderNumber: e.target.value })}
                    placeholder="مثلاً: 3000505"
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>
              </div>

              {/* Pattern Codes for OTP & Automated Triggers */}
              <div className="p-4 bg-slate-50 dark:bg-[#161619] rounded-2xl space-y-3 border border-slate-200 dark:border-[#2D2D33]">
                <h4 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>الگوهای ارسال سریع وب‌سرویس خدماتی (Pattern / Lookup Templates)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1">کد الگوی ثبت سفارش:</label>
                    <input
                      type="text"
                      value={config.orderCreatedPattern}
                      onChange={(e) => setConfig({ ...config, orderCreatedPattern: e.target.value })}
                      placeholder="order-success-tpl"
                      className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1">کد الگوی ارسال رهگیری پست:</label>
                    <input
                      type="text"
                      value={config.orderShippedPattern}
                      onChange={(e) => setConfig({ ...config, orderShippedPattern: e.target.value })}
                      placeholder="tracking-code-tpl"
                      className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1">کد الگوی رمز یکبارمصرف OTP:</label>
                    <input
                      type="text"
                      value={config.otpPattern}
                      onChange={(e) => setConfig({ ...config, otpPattern: e.target.value })}
                      placeholder="otp-auth-tpl"
                      className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات درگاه'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Test SMS Sender Sandbox */}
          <form onSubmit={handleSendTestSms} className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 shadow-md">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#222225]">
              <Send className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                تست زنده ارسال پیامک (SMS Sandbox Tester)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-1">
                <label className="block text-slate-500 text-[11px] mb-1">شماره موبایل دریافت‌کننده:</label>
                <input
                  type="text"
                  required
                  placeholder="09121234567"
                  value={testMobile}
                  onChange={(e) => setTestMobile(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 text-[11px] mb-1">متن پیامک ارسالی:</label>
                <input
                  type="text"
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingTest}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-800"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'در حال ارسال تست...' : 'ارسال پیامک تستی'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: SMS Transaction Logs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222225]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-[#C9A227]" />
                <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                  گزارشات و لاگ‌های اخیر پیامک
                </h3>
              </div>
              <button
                onClick={fetchSmsData}
                className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>بروزرسانی</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-[#161619] rounded-2xl border border-slate-200 dark:border-[#222225] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {log.recipient}
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {log.status === 'delivered' ? 'تحویل شده' : 'ارسال شده'}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-[#8E9299] text-[11px] leading-relaxed">
                    {log.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                    <span>{log.sentAt}</span>
                    <span>هزینه: {log.costRials} ریال</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
