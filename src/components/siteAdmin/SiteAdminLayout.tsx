import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Image as ImageIcon,
  Layers,
  TrendingUp,
  Bot,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  ExternalLink,
  Store,
  Globe,
  Boxes,
  LayoutTemplate,
  MessageSquare,
  Tag,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleTitle, getRoleBadgeClass } from '../../lib/utils';
import { UserRole } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';
import { AccessDeniedView } from '../common/AccessDeniedView';

export type SiteAdminTab =
  | 'dashboard'
  | 'modules'
  | 'page_builder'
  | 'media_library'
  | 'sms_gateway'
  | 'orders'
  | 'products'
  | 'banners'
  | 'categories'
  | 'coupons'
  | 'reviews'
  | 'torob'
  | 'ai_content'
  | 'gateways_shipping'
  | 'audit_logs'
  | 'settings';

interface SiteAdminLayoutProps {
  currentTab: SiteAdminTab;
  onTabChange: (tab: SiteAdminTab) => void;
  onBackToStore: () => void;
  onGoToPosAdmin: () => void;
  children: React.ReactNode;
}

export const SiteAdminLayout: React.FC<SiteAdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onBackToStore,
  onGoToPosAdmin,
  children,
}) => {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems: Array<{ id: SiteAdminTab; label: string; icon: any; badge?: string; roles: UserRole[] }> = [
    { id: 'dashboard', label: 'داشبورد فروشگاه آنلاین', icon: LayoutDashboard, roles: ['admin', 'site_manager'] },
    { id: 'modules', label: 'مدیریت ماژول‌ها و هوک‌ها', icon: Boxes, badge: 'Core', roles: ['admin', 'site_manager'] },
    { id: 'page_builder', label: 'صفحه‌ساز و چیدمان دکمه‌ها', icon: LayoutTemplate, badge: 'جدید', roles: ['admin', 'site_manager'] },
    { id: 'media_library', label: 'کتابخانه رسانه (WebP)', icon: ImageIcon, roles: ['admin', 'site_manager'] },
    { id: 'orders', label: 'سفارشات اینترنتی و رهگیری', icon: ShoppingBag, roles: ['admin', 'site_manager'] },
    { id: 'products', label: 'کاتالوگ و محصولات سایت', icon: Package, roles: ['admin', 'site_manager'] },
    { id: 'categories', label: 'دسته‌بندی و منوی سایت', icon: Layers, roles: ['admin', 'site_manager'] },
    { id: 'coupons', label: 'کدهای تخفیف و جشنواره‌ها', icon: Tag, roles: ['admin', 'site_manager'] },
    { id: 'reviews', label: 'نظرات و دیدگاه کاربران', icon: MessageSquare, roles: ['admin', 'site_manager'] },
    { id: 'sms_gateway', label: 'درگاه پیامک و الگوهای OTP', icon: MessageSquare, roles: ['admin', 'site_manager'] },
    { id: 'gateways_shipping', label: 'درگاه‌های پرداخت شاپرک', icon: CreditCard, roles: ['admin', 'site_manager'] },
    { id: 'torob', label: 'هوش بازار و رصد قیمت ترب', icon: TrendingUp, roles: ['admin', 'site_manager'] },
    { id: 'ai_content', label: 'تولید محتوا و سئو با AI', icon: Bot, badge: 'Gemini', roles: ['admin', 'site_manager'] },
    { id: 'audit_logs', label: 'امنیت، ۲FA و لاگ حسابرسی', icon: Shield, roles: ['admin', 'site_manager'] },
    { id: 'settings', label: 'تنظیمات عمومی وب‌سایت', icon: Settings, roles: ['admin', 'site_manager'] },
  ];

  const allowedItems = menuItems.filter((item) => hasRole(item.roles));
  const currentTabDef = menuItems.find((m) => m.id === currentTab);
  const isCurrentTabAllowed = currentTabDef ? hasRole(currentTabDef.roles) : true;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] flex flex-col md:flex-row text-right text-slate-800 dark:text-[#E0E0E0] selection:bg-[#C9A227] selection:text-black font-sans transition-colors" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-[#111113] border-l border-slate-200 dark:border-[#222225] text-slate-800 dark:text-[#E0E0E0] flex flex-col justify-between transition-transform duration-300 md:translate-x-0 shadow-lg md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-[#C9A227] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#C9A227]/20 ring-1 ring-[#C9A227]/40">
                <Globe className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6] tracking-tight">مدیریت فروشگاه آنلاین</h1>
                <span className="text-[10px] text-[#C9A227] font-mono">khatynoo.ir / SiteAdmin</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-slate-500 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile */}
          <div className="p-4 bg-slate-100/70 dark:bg-[#0A0A0B]/80 border-b border-slate-200 dark:border-[#222225] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-[#F3F4F6] truncate max-w-[130px]">{user?.fullName || 'مدیر فروشگاه'}</div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getRoleBadgeClass(user?.role || 'site_manager')}`}>
                {getRoleTitle(user?.role || 'site_manager')}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">نام کاربری: {user?.username}</div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs no-scrollbar">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all text-right cursor-pointer ${
                    isActive
                      ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/50 text-amber-900 dark:text-[#F3F4F6] font-bold shadow-xs dark:shadow-md dark:shadow-black/40'
                      : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0] hover:bg-slate-100 dark:hover:bg-[#161619]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C9A227]' : 'text-slate-500 dark:text-[#8E9299]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-[#C9A227] text-black font-bold' : 'bg-slate-200 dark:bg-[#222225] text-slate-600 dark:text-[#8E9299]'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions & Switch to POS */}
          <div className="p-4 border-t border-slate-200 dark:border-[#222225] space-y-2">
            <button
              onClick={onGoToPosAdmin}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#1C1C20] hover:bg-amber-50 dark:hover:bg-[#25252B] border border-slate-200 dark:border-[#C9A227]/30 hover:border-[#C9A227] text-slate-800 dark:text-[#C9A227] font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <Store className="w-4 h-4 text-[#C9A227]" />
              <span>پرتال صندوق و حسابداری (/admin)</span>
            </button>

            <button
              onClick={onBackToStore}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#1F1F24] border border-slate-200 dark:border-[#2D2D33] text-slate-800 dark:text-[#E0E0E0] font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>مشاهده فروشگاه آنلاین</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج از حساب</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:mr-72 flex flex-col min-h-screen bg-slate-50 dark:bg-[#0A0A0B]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222225] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 dark:text-[#8E9299] hover:bg-slate-100 dark:hover:bg-[#161619] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#C9A227]" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
                {menuItems.find((m) => m.id === currentTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Theme Toggle */}
            <ThemeToggle />

            {/* Quick Switch to POS Admin */}
            <button
              onClick={onGoToPosAdmin}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#1F1F24] text-slate-800 dark:text-[#C9A227] text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2D2D33] hover:border-[#C9A227]/40 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>صندوق و حسابداری</span>
            </button>

            <button
              onClick={onBackToStore}
              className="bg-amber-50 dark:bg-[#1C1C20] hover:bg-amber-100 dark:hover:bg-[#25252B] text-slate-800 dark:text-[#E0E0E0] text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-[#2D2D33] cursor-pointer"
            >
              <span>ویترین سایت</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10 w-full">
          {!isCurrentTabAllowed && currentTabDef ? (
            <AccessDeniedView
              currentRole={user?.role || 'seller'}
              requiredRoles={currentTabDef.roles}
              title={`دسترسی به بخش «${currentTabDef.label}» محدود است`}
              description="حساب کاربری شما سطح دسترسی لازم برای ویرایش یا مشاهده این بخش از مدیریت وب‌سایت را ندارد."
              redirectLabel="رفتن به داشبورد سایت"
              onRedirect={() => onTabChange('dashboard')}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};
