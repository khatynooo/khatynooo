import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Key,
  ShieldCheck,
  Save,
  Sliders,
  Settings,
  HelpCircle,
  ExternalLink,
  Lock,
  Radio,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PaymentGatewayConfig } from '../../types';
import { useToast } from '../common/Toast';

export const PaymentGatewaysView: React.FC = () => {
  const { showToast } = useToast();
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const res = await api.getPaymentGateways();
      setGateways(res.gateways || []);
      if (res.gateways?.length > 0 && !selectedGateway) {
        setSelectedGateway(res.gateways[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGateway) return;
    setIsSaving(true);
    try {
      await api.updatePaymentGateway(selectedGateway.code, selectedGateway);
      setGateways((prev) =>
        prev.map((g) => (g.code === selectedGateway.code ? selectedGateway : g))
      );
      showToast(`تنظیمات درگاه «${selectedGateway.name}» ذخیره شد.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره درگاه', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <CreditCard className="w-4 h-4" />
            <span>درگاه‌های پرداخت بانکی و تسویه‌حساب شاپرک (Payment Gateway Hub)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            مدیریت درگاه‌های پرداخت آنلاین و پرداخت در محل
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            پشتیبانی از زرین‌پال، آیدی‌پی، به‌پرداخت ملت، زیبال و پرداخت نقدی هنگام تحویل. قابلیت تغییر به حالت تستی (Sandbox) و تعریف درگاه پیش‌فرض.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Gateways List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6] pb-1">
            درگاه‌های پرداخت تعریف‌شده
          </h3>

          <div className="space-y-3">
            {gateways.map((gw) => {
              const isSelected = selectedGateway?.code === gw.code;
              return (
                <div
                  key={gw.code}
                  onClick={() => setSelectedGateway(gw)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#C9A227] ring-2 ring-[#C9A227]/20 bg-amber-50/30 dark:bg-[#1C1A14]'
                      : 'border-slate-200 dark:border-[#222225] bg-white dark:bg-[#111113] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1A1A1E] flex items-center justify-center text-amber-600 dark:text-[#C9A227]">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                        {gw.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">{gw.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {gw.sandbox && (
                      <span className="text-[9px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-md font-mono">
                        Sandbox
                      </span>
                    )}
                    {gw.isEnabled ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        فعال
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 dark:bg-[#222225] text-slate-500 px-2 py-0.5 rounded-md">
                        غیرفعال
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Gateway Settings Form (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedGateway && (
            <form
              onSubmit={handleSaveGateway}
              className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-5 shadow-md"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222225]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                    پیکربندی درگاه: {selectedGateway.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#D1D5DB] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGateway.isEnabled}
                      onChange={(e) =>
                        setSelectedGateway({ ...selectedGateway, isEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#C9A227]"
                    />
                    <span>فعال در صفحه تسویه‌حساب</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">نام نمایشی درگاه برای مشتری:</label>
                  <input
                    type="text"
                    value={selectedGateway.name}
                    onChange={(e) => setSelectedGateway({ ...selectedGateway, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">کد مرچنت / شناسه پذیرنده (Merchant ID / API Key):</label>
                  <input
                    type="password"
                    value={selectedGateway.merchantId}
                    onChange={(e) => setSelectedGateway({ ...selectedGateway, merchantId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>

                {selectedGateway.terminalId !== undefined && (
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">شناسه ترمینال (Terminal ID - ویژه ملت):</label>
                    <input
                      type="text"
                      value={selectedGateway.terminalId}
                      onChange={(e) => setSelectedGateway({ ...selectedGateway, terminalId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] font-mono text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>
                )}

                <div className="p-4 bg-slate-50 dark:bg-[#161619] rounded-2xl border border-slate-200 dark:border-[#2D2D33] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">حالت آزمایشی (Sandbox Test Mode):</span>
                    <p className="text-[11px] text-slate-400">بدون کسر وجه واقعی تراکنش‌های شبیه‌سازی‌شده تست شوند</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedGateway.sandbox}
                    onChange={(e) => setSelectedGateway({ ...selectedGateway, sandbox: e.target.checked })}
                    className="w-4 h-4 accent-[#C9A227] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره درگاه پرداخت'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
