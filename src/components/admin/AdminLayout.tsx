import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  FileSpreadsheet,
  Users,
  CreditCard,
  Printer,
  Factory,
  TrendingUp,
  Bot,
  Globe,
  BarChart3,
  UserCheck,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleTitle, getRoleBadgeClass } from '../../lib/utils';
import { UserRole } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';
import { AccessDeniedView } from '../common/AccessDeniedView';

export type AdminTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories_units'
  | 'inventory'
  | 'invoices'
  | 'customers_suppliers'
  | 'cheques'
  | 'services'
  | 'production'
  | 'torob'
  | 'ai'
  | 'website'
  | 'reports'
  | 'users';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onBackToStore: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onBackToStore,
  children,
}) => {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems: Array<{ id: AdminTab; label: string; icon: any; roles: UserRole[] }> = [
    { id: 'dashboard', label: 'داشبورد مدیریتی', icon: LayoutDashboard, roles: ['admin', 'site_manager', 'seller', 'accountant', 'chief_accountant'] },
    { id: 'pos', label: 'صندوق فروش سریع (POS)', icon: ShoppingCart, roles: ['admin', 'seller', 'site_manager', 'chief_accountant'] },
    { id: 'products', label: 'کالاها و قیمت‌گذاری ۵ سطحی', icon: Package, roles: ['admin', 'site_manager', 'accountant', 'chief_accountant'] },
    { id: 'categories_units', label: 'دسته‌بندی و واحدهای شمارش', icon: Layers, roles: ['admin', 'site_manager', 'chief_accountant'] },
    { id: 'inventory', label: 'موجودی و کسری انبار', icon: Package, roles: ['admin', 'seller', 'site_manager', 'accountant', 'chief_accountant'] },
    { id: 'invoices', label: 'فاکتورهای فروش و خرید', icon: FileSpreadsheet, roles: ['admin', 'seller', 'accountant', 'chief_accountant'] },
    { id: 'customers_suppliers', label: 'مشتریان و تامین‌کنندگان', icon: Users, roles: ['admin', 'seller', 'accountant', 'chief_accountant'] },
    { id: 'cheques', label: 'مدیریت چک و سامانه صیاد', icon: CreditCard, roles: ['admin', 'accountant', 'chief_accountant'] },
    { id: 'services', label: 'خدمات کپی و پرینت', icon: Printer, roles: ['admin', 'seller', 'site_manager', 'chief_accountant'] },
    { id: 'production', label: 'تولید و فرمولاسیون کارگاهی', icon: Factory, roles: ['admin', 'chief_accountant', 'accountant'] },
    { id: 'torob', label: 'هوش بازار و رصد قیمت ترب', icon: TrendingUp, roles: ['admin', 'site_manager', 'chief_accountant'] },
    { id: 'ai', label: 'دستیار هوشمند Gemini AI', icon: Bot, roles: ['admin', 'site_manager', 'chief_accountant', 'accountant'] },
    { id: 'website', label: 'مدیریت فروشگاه آنلاین و سفارشات', icon: Globe, roles: ['admin', 'site_manager', 'chief_accountant'] },
    { id: 'reports', label: 'گزارش سود/زیان و ارزش انبار', icon: BarChart3, roles: ['admin', 'chief_accountant', 'accountant'] },
    { id: 'users', label: 'مدیریت کاربران و دسترسی‌ها', icon: UserCheck, roles: ['admin'] },
  ];

  const allowedItems = menuItems.filter((item) => hasRole(item.roles));
  const currentTabDef = menuItems.find((m) => m.id === currentTab);
  const isCurrentTabAllowed = currentTabDef ? hasRole(currentTabDef.roles) : true;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] flex flex-col md:flex-row text-right text-slate-800 dark:text-[#E0E0E0] selection:bg-[#C9A227] selection:text-black font-sans transition-colors" dir="rtl">
      {/* Sidebar for Desktop & Drawer for Mobile */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-[#111113] border-l border-slate-200 dark:border-[#222225] text-slate-800 dark:text-[#E0E0E0] flex flex-col justify-between transition-transform duration-300 md:translate-x-0 shadow-lg md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#C9A227]/20">
                <Cpu className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 dark:text-[#F3F4F6] tracking-tight">پرتال جامع خطی‌نو</h1>
                <span className="text-[10px] text-[#C9A227] font-mono">khatynoo.ir / Admin</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-slate-500 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile & Access Level */}
          <div className="p-4 bg-slate-100/70 dark:bg-[#0A0A0B]/80 border-b border-slate-200 dark:border-[#222225] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-[#F3F4F6] truncate max-w-[130px]">{user?.fullName || 'کاربر سیستم'}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getRoleBadgeClass(user?.role || 'admin')}`}>
                {getRoleTitle(user?.role || 'admin')}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-right cursor-pointer ${
                    isActive
                      ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/50 text-amber-900 dark:text-[#F3F4F6] font-bold shadow-xs dark:shadow-md dark:shadow-black/40'
                      : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0] hover:bg-slate-100 dark:hover:bg-[#161619]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C9A227]' : 'text-slate-500 dark:text-[#8E9299]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-[#222225] space-y-2">
            <button
              onClick={onBackToStore}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#1F1F24] border border-slate-200 dark:border-[#2D2D33] text-slate-800 dark:text-[#E0E0E0] font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#C9A227]" />
              <span>مشاهده فروشگاه آنلاین</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
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

            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
              {menuItems.find((m) => m.id === currentTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* POS Hardware Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 dark:bg-[#161619] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>کارتخوان پاسارگاد: آنلاین (TCP/IP)</span>
            </div>

            {/* Live Theme Toggle */}
            <ThemeToggle />

            <button
              onClick={onBackToStore}
              className="bg-amber-50 dark:bg-[#1C1C20] hover:bg-amber-100 dark:hover:bg-[#25252B] text-amber-800 dark:text-[#C9A227] text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 border border-[#C9A227]/30 cursor-pointer"
            >
              <span>سایت مشتری</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body or Access Denied */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10 w-full">
          {!isCurrentTabAllowed && currentTabDef ? (
            <AccessDeniedView
              currentRole={user?.role || 'seller'}
              requiredRoles={currentTabDef.roles}
              title={`دسترسی به بخش «${currentTabDef.label}» محدود است`}
              description="حساب کاربری شما سطح دسترسی لازم برای مشاهده یا ویرایش این ماژول را ندارد."
              redirectLabel="رفتن به صندوق فروش (POS)"
              onRedirect={() => onTabChange(user?.role === 'seller' ? 'pos' : 'dashboard')}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};
