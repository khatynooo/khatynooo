import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ShieldCheck, X, ArrowRight, RefreshCw, KeyRound, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

export const CustomerAuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalPrompt,
    closeAuthModal,
    sendOtp,
    verifyOtp,
  } = useCustomerAuth();

  const { showToast } = useToast();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '']);
  const [timer, setTimer] = useState(120);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isAuthModalOpen) {
      setStep('mobile');
      setOtpCode(['', '', '', '', '']);
      setErrorMsg('');
      setIsLoading(false);
    }
  }, [isAuthModalOpen]);

  // Countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  // Handle Mobile Submission -> Send OTP
  const handleSendOtp = async (e?: React.FormEvent, customMobile?: string) => {
    if (e) e.preventDefault();
    const targetMobile = (customMobile || mobile).trim();

    const clean = targetMobile.replace(/[^0-9]/g, '');
    if (!/^09[0-9]{9}$/.test(clean)) {
      setErrorMsg('لطفاً شماره موبایل ۱۱ رقمی معتبر با فرمت ۰۹... وارد نمایید.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await sendOtp(clean);
      if (res.success) {
        setMobile(clean);
        setSimulatedCode(res.simulatedCode || null);
        setStep('otp');
        setTimer(res.expiresInSeconds || 120);
        setIsTimerActive(true);
        setOtpCode(['', '', '', '', '']);
        showToast('کد تایید پیامکی با موفقیت ارسال شد.', 'success');

        // Focus first OTP input after transition
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 200);
      } else {
        setErrorMsg(res.message || 'خطا در ارسال کد تایید');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در برقراری ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Digit Input
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal && value !== '') return;

    const newCode = [...otpCode];
    newCode[index] = cleanVal ? cleanVal.slice(-1) : '';
    setOtpCode(newCode);
    setErrorMsg('');

    // If digit entered, jump to next input
    if (cleanVal && index < 4) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // If all 5 digits are filled, automatically verify
    const joined = newCode.join('');
    if (joined.length === 5 && !newCode.includes('')) {
      handleVerifyCode(joined);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 5);
    if (pasted.length === 5) {
      const splitted = pasted.split('');
      setOtpCode(splitted);
      handleVerifyCode(pasted);
    }
  };

  // Verify OTP Code
  const handleVerifyCode = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpCode.join('');
    if (fullCode.length < 5) {
      setErrorMsg('لطفاً کد تایید ۵ رقمی را کامل وارد نمایید.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await verifyOtp(mobile, fullCode);
      if (res.success) {
        showToast(res.message || 'ورود شما با موفقیت انجام شد.', 'success');
        closeAuthModal();
      } else {
        setErrorMsg(res.message || 'کد وارد شده صحیح نیست.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'کد تایید نادرست یا منقضی شده است.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for demonstration
  const handleQuickFillDemo = (num: string) => {
    setMobile(num);
    handleSendOtp(undefined, num);
  };

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeAuthModal}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-[#111113] rounded-3xl border border-slate-200 dark:border-[#222225] shadow-2xl overflow-hidden z-10 text-slate-800 dark:text-[#E0E0E0]"
      >
        {/* Header Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-amber-400 to-[#8C6D14]" />

        {/* Close Button */}
        <button
          id="btn-close-customer-auth"
          onClick={closeAuthModal}
          className="absolute left-4 top-4 p-2 text-slate-400 dark:text-[#8E9299] hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#161619] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Brand Icon & Heading */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-[#1C1C20] border border-amber-200 dark:border-[#C9A227]/30 text-[#C9A227] flex items-center justify-center mx-auto mb-3 shadow-md">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-[#F3F4F6]">
              {step === 'mobile' ? 'ورود / ثبت‌نام مشتری' : 'تایید شماره موبایل'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8E9299] mt-1.5 max-w-xs mx-auto">
              {authModalPrompt ||
                (step === 'mobile'
                  ? 'برای پیگیری سفارشات، تاریخچه خرید و ثبت آسان فاکتور، شماره موبایل خود را وارد کنید.'
                  : `کد تایید ۵ رقمی ارسال شده به شماره ${toPersianDigits(mobile)} را وارد کنید.`)}
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Mobile Input */}
          {step === 'mobile' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-[#E0E0E0]">
                  شماره تلفن همراه:
                </label>
                <div className="relative">
                  <input
                    id="input-customer-mobile"
                    type="tel"
                    dir="ltr"
                    maxLength={11}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="09123456789"
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-4 py-3 text-slate-900 dark:text-[#F3F4F6] text-sm font-mono text-center tracking-widest outline-none transition-all"
                    autoFocus
                  />
                  <Phone className="w-4 h-4 text-slate-400 dark:text-[#8E9299] absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                id="btn-send-otp-submit"
                type="submit"
                disabled={isLoading || mobile.length < 11}
                className="w-full bg-[#C9A227] hover:bg-[#B38E1E] active:scale-[0.99] text-slate-950 font-black py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <span>دریافت کد تایید پیامکی</span>
                    <ArrowRight className="w-4 h-4 text-black rotate-180" />
                  </>
                )}
              </button>

              {/* Quick Demo Options */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#1E1E22] text-center">
                <div className="text-[11px] text-slate-400 dark:text-[#8E9299] mb-2 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#C9A227]" />
                  <span>تست سریع با شماره‌های نمونه:</span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {['09121112233', '09359876543', '09195554433'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickFillDemo(num)}
                      className="text-[11px] font-mono bg-slate-100 dark:bg-[#1C1C20] hover:bg-amber-50 dark:hover:bg-[#25252A] hover:text-[#C9A227] px-2.5 py-1 rounded-lg text-slate-600 dark:text-[#8E9299] transition-colors border border-slate-200 dark:border-[#2D2D33]"
                    >
                      {toPersianDigits(num)}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-5">
              {/* Simulated Code Helper (for AI preview / sandbox) */}
              {simulatedCode && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs text-center space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>کد شبیه‌سازی شده پیامک (محیط تست):</span>
                  </div>
                  <div className="font-mono text-base font-black text-amber-700 dark:text-[#C9A227] tracking-widest">
                    {simulatedCode}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const splitted = simulatedCode.split('');
                      setOtpCode(splitted);
                      handleVerifyCode(simulatedCode);
                    }}
                    className="text-[11px] underline text-amber-800 dark:text-amber-400 hover:text-[#C9A227] cursor-pointer"
                  >
                    درج خودکار کد تست و ورود
                  </button>
                </div>
              )}

              {/* 5-digit inputs */}
              <div className="flex justify-center gap-2.5" dir="ltr" onPaste={handleOtpPaste}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 bg-slate-50 dark:bg-[#161619] border-2 border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl text-center text-xl font-mono font-bold text-slate-900 dark:text-[#F3F4F6] outline-none transition-all shadow-xs"
                  />
                ))}
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#8E9299] px-1">
                <button
                  type="button"
                  onClick={() => setStep('mobile')}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  ویرایش شماره موبایل
                </button>

                {isTimerActive ? (
                  <span className="font-mono text-slate-700 dark:text-[#E0E0E0]">
                    ارسال مجدد تا {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp(undefined, mobile)}
                    className="text-[#C9A227] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>ارسال مجدد کد</span>
                  </button>
                )}
              </div>

              <button
                id="btn-verify-otp-submit"
                type="button"
                onClick={() => handleVerifyCode()}
                disabled={isLoading || otpCode.join('').length < 5}
                className="w-full bg-[#C9A227] hover:bg-[#B38E1E] active:scale-[0.99] text-slate-950 font-black py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>تایید کد و ورود به حساب</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Privacy Note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-slate-400 dark:text-[#8E9299]">
              ورود شما به‌منزله پذیرش قوانین و مقررات حریم خصوصی فروشگاه خطی‌نو است.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
