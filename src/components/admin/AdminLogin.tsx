import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  LogIn,
  ArrowRight,
  ShoppingCart,
  FileSpreadsheet,
  Factory,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Lock,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { ThemeToggle } from '../common/ThemeToggle';
import { UserRole } from '../../types';

interface RoleOption {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: any;
  defaultUsername: string;
  colorClass: string;
  activeBorder: string;
  badge: string;
  description: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'seller',
    title: 'صندوقدار و فروشنده حضوری (POS)',
    subtitle: 'پایانه فروش سریع بارکدی، فاکتور مشتری و خدمات کپی',
    icon: ShoppingCart,
    defaultUsername: 'cashier',
    colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30',
    badge: 'پایانه POS',
    description: 'دسترسی سریع به صدور فاکتور، بارکدخوان، موجودی کالا و محاسبه خدمات کپی',
  },
  {
    role: 'accountant',
    title: 'حسابدار و امور مالی',
    subtitle: 'فاکتورهای خرید و فروش، چک‌ها و مانده حساب اشخاص',
    icon: FileSpreadsheet,
    defaultUsername: 'accountant',
    colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    activeBorder: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/50 dark:bg-sky-950/30',
    badge: 'حسابداری و چک',
    description: 'مدیریت فاکتورهای رسمی، سررسید چک‌های صیادی و گردش حساب مشتریان و تامین‌کنندگان',
  },
  {
    role: 'chief_accountant',
    title: 'مدیر ارشد مالی و کارگاه',
    subtitle: 'فرمولاسیون تولید دفاتر سیمی، بهای تمام‌شده و سود/زیان',
    icon: Factory,
    defaultUsername: 'accountant',
    colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/50 dark:bg-purple-950/30',
    badge: 'تولید و سود/زیان',
    description: 'نظارت بر تولید دفاتر خطی‌نو، مصرف مواد اولیه، آنالیز سود و ترازنامه مالی',
  },
  {
    role: 'admin',
    title: 'مدیر کل سیستم (Super Admin)',
    subtitle: 'دسترسی نامحدود به تمامی ماژول‌ها، صندوق، انبار و سایت',
    icon: ShieldCheck,
    defaultUsername: 'admin',
    colorClass: 'text-amber-600 dark:text-[#C9A227] bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-[#C9A227]/40',
    activeBorder: 'border-[#C9A227] ring-2 ring-[#C9A227]/30 bg-amber-50/50 dark:bg-amber-950/30',
    badge: 'دسترسی کامل ۱۰۰٪',
    description: 'مدیریت جامع صندوق، قیمت‌گذاری ۵ سطحی، دسترسی کاربران و اتصال به ترب و فروشگاه آنلاین',
  },
];

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>('seller');
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectRole = (roleOption: RoleOption) => {
    setSelectedRole(roleOption.role);
    setUsername(roleOption.defaultUsername);
    // Focus or keep password
  };

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
      showToast(err.message || 'نام کاربری یا رمز عبور اشتباه است.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleInfo = ROLES.find((r) => r.role === selectedRole) || ROLES[0];

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
            <span className="hidden sm:inline">ورود به مدیریت فروشگاه اینترنتی (/adminsite)</span>
            <span className="sm:hidden">مدیریت سایت</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-xl w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 my-12">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-[#C9A227]/20 ring-1 ring-[#C9A227]/40">
            <Cpu className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            پرتال صندوق، انبارداری و حسابداری
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-md mx-auto leading-relaxed">
            ورود ایمن پرسنل خطی‌نو بر اساس سطح دسترسی و نام کاربری اختصاصی (/admin)
          </p>
        </div>

        {/* Access Level Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-[#8E9299] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-[#C9A227]" />
              <span>انتخاب سطح دسترسی مورد نظر:</span>
            </span>
            <span className="text-[11px] text-slate-400 dark:text-[#8E9299]">
              {currentRoleInfo.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLES.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleSelectRole(item)}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? item.activeBorder
                      : 'border-slate-200 dark:border-[#222225] hover:border-slate-300 dark:hover:border-[#333338] bg-slate-50/50 dark:bg-[#161619]/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${item.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-black ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-[#D1D5DB]'}`}>
                        {item.title}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#8E9299] line-clamp-1">
                    {item.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Role Description Callout */}
          <div className="p-3 bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] rounded-2xl text-[11px] text-slate-600 dark:text-[#8E9299] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-[#C9A227] shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-[#F3F4F6] font-bold">مجوزهای سطح انتخابی: </strong>
              {currentRoleInfo.description}
            </div>
          </div>
        </div>

        {/* Standard Secure Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-[#8E9299] font-bold mb-1.5">
              نام کاربری پرسنل:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl px-3.5 py-3 outline-none transition-colors font-mono font-medium"
              placeholder="مثال: cashier, accountant, admin"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-[#8E9299] font-bold">
                کلمه عبور:
              </label>
              <span className="text-[10px] text-slate-400 dark:text-[#8E9299]">
                (پیش‌فرض تست: admin123456 / seller123 / acc123456)
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl px-3.5 py-3 pl-10 outline-none transition-colors font-mono font-medium"
                placeholder="رمز عبور حساب کاربری"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C9A227]/20 cursor-pointer text-sm"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>{isSubmitting ? 'در حال تایید اعتبار...' : `ورود به عنوان ${currentRoleInfo.title}`}</span>
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
            <span>مشاهده ویترین فروشگاه</span>
            <ArrowRight className="w-3.5 h-3.5 -rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
