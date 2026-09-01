import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  LogIn,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Store,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { ThemeToggle } from '../common/ThemeToggle';

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('لطفاً نام کاربری و کلمه عبور را وارد نمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedUser = await login({ username: username.trim(), password: password.trim() });
      showToast(`خوش آمدید ${loggedUser.fullName || ''}! ورود با موفقیت انجام شد.`, 'success');
      
      // Smart role-based routing
      if (loggedUser.role === 'seller') {
        navigate('/admin/pos');
      } else if (loggedUser.role === 'accountant') {
        navigate('/admin/invoices');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      showToast(err.message || 'نام کاربری یا کلمه عبور اشتباه است.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] text-slate-800 dark:text-[#E0E0E0] flex flex-col justify-center items-center p-4 selection:bg-[#C9A227] selection:text-black font-sans transition-colors relative" dir="rtl">
      {/* Top Bar for Theme Toggle and Navigation */}
      <div className="absolute top-4 inset-x-4 max-w-5xl mx-auto flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-500 dark:text-[#8E9299] hover:text-amber-600 dark:hover:text-[#C9A227] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>بازگشت به سایت فروشگاه</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/adminsite/login')}
            className="text-xs text-slate-600 dark:text-[#8E9299] hover:text-amber-600 dark:hover:text-[#C9A227] transition-colors flex items-center gap-1.5 cursor-pointer bg-white dark:bg-[#161619] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2D2D33]"
          >
            <Globe className="w-3.5 h-3.5 text-[#C9A227]" />
            <span className="hidden sm:inline">ورود به مدیریت وب‌سایت (/adminsite)</span>
            <span className="sm:hidden">پنل سایت</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 my-12">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-[#C9A227]/20 ring-1 ring-[#C9A227]/40">
            <ShieldCheck className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            ورود امن به پرتال خطی‌نو
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-xs mx-auto leading-relaxed">
            صندوق فروشگاهی، انبارداری، حسابداری و مدیریت مالی
          </p>
        </div>

        {/* Security Alert Banner */}
        <div className="p-3 bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] rounded-2xl text-[11px] text-slate-600 dark:text-[#8E9299] flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>ارتباط شما با پروتکل رمزنگاری امن TLS و کنترل احراز هویت لایه ۲ محافظت می‌شود.</span>
        </div>

        {/* Standard Secure Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-[#8E9299] font-bold mb-1.5">
              نام کاربری:
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl px-3.5 py-3 outline-none transition-colors font-sans font-medium"
                placeholder="نام کاربری خود را وارد فرمایید"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-[#8E9299] font-bold mb-1.5">
              کلمه عبور:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl px-3.5 py-3 pl-10 outline-none transition-colors font-mono font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
                aria-label={showPassword ? 'مخفی‌سازی رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C9A227]/20 cursor-pointer text-sm disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>{isSubmitting ? 'در حال بررسی دسترسی...' : 'ورود به سامانه'}</span>
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-200 dark:border-[#222225] flex items-center justify-between text-xs text-slate-500 dark:text-[#8E9299]">
          <button
            onClick={() => navigate('/adminsite/login')}
            className="hover:text-amber-600 dark:hover:text-[#C9A227] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>مدیریت وب‌سایت (/adminsite)</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="hover:text-amber-600 dark:hover:text-[#C9A227] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>مشاهده فروشگاه</span>
            <ArrowRight className="w-3.5 h-3.5 -rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
