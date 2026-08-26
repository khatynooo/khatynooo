import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Printer,
  Truck,
  BookOpen,
  Menu,
  X,
  Sparkles,
  PenTool,
  Briefcase,
  Palette,
  Grid,
  ExternalLink,
  Layers,
  FileText,
  Tag,
  CheckCircle,
  User,
  KeyRound,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { toPersianDigits } from '../../lib/utils';
import { Category, WebsiteSettings, StoreSettings } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCalculator: () => void;
  onOpenTracker: () => void;
  onOpenCustomerAccount?: () => void;
  websiteSettings?: WebsiteSettings | null;
  storeSettings?: StoreSettings | null;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenCalculator,
  onOpenTracker,
  onOpenCustomerAccount,
  websiteSettings,
  storeSettings,
}) => {
  const { totalItems, setIsCartOpen } = useCart();
  const { customer, isAuthenticated, openAuthModal } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const siteTitle = websiteSettings?.siteTitle || storeSettings?.storeName || 'خطی‌نو';
  const siteSubtitle = websiteSettings?.siteSubtitle || 'مرجع تخصصی خرید آنلاین لوازم‌تحریر، دفاتر سیمی اختصاصی و خدمات چاپ و کپی';
  const noticeText = websiteSettings?.noticeText || '🎉 ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان در سراسر کشور با کد KHATINOO';
  const noticeBadgeText = websiteSettings?.noticeBadgeText || 'اطلاعیه فروشگاه';
  const showNotice = websiteSettings?.showNotice !== false;
  const quickTrackingText = websiteSettings?.quickTrackingText || 'پیگیری سریع سفارشات';
  const showQuickTracking = websiteSettings?.showQuickTracking !== false;
  const searchPlaceholder = websiteSettings?.searchPlaceholder || 'جستجوی خودکار در میان صدها قلم کالا، خودکار، دفتر، ماژیک، زونکن...';
  const calculatorButtonText = websiteSettings?.calculatorButtonText || 'محاسبه هزینه کپی و پرینت';
  const showCalculatorButton = websiteSettings?.showCalculatorButton !== false;
  const cartButtonText = websiteSettings?.cartButtonText || 'سبد خرید';

  // Dynamic header menu items from CMS settings
  const customMenuItems = websiteSettings?.headerMenuItems && websiteSettings.headerMenuItems.length > 0
    ? websiteSettings.headerMenuItems.filter(item => item.isEnabled !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : null;

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'PenTool': return <PenTool className="w-3.5 h-3.5" />;
      case 'BookOpen': return <BookOpen className="w-3.5 h-3.5" />;
      case 'Briefcase': return <Briefcase className="w-3.5 h-3.5" />;
      case 'Palette': return <Palette className="w-3.5 h-3.5" />;
      case 'Printer': return <Printer className="w-3.5 h-3.5" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5" />;
      case 'Layers': return <Layers className="w-3.5 h-3.5" />;
      case 'FileText': return <FileText className="w-3.5 h-3.5" />;
      case 'Tag': return <Tag className="w-3.5 h-3.5" />;
      case 'Grid':
      default:
        return <Grid className="w-3.5 h-3.5" />;
    }
  };

  const handleMenuClick = (url: string) => {
    if (url === '#calculator' || url === 'calculator') {
      onOpenCalculator();
    } else if (url === '#tracking' || url === 'tracking') {
      onOpenTracker();
    } else if (url === '#products' || url === '/' || url === '#') {
      onSelectCategory(null);
    } else if (url.startsWith('/category/') || url.startsWith('cat_')) {
      const catId = url.replace('/category/', '');
      onSelectCategory(catId);
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else if (url.startsWith('#')) {
      const el = document.querySelector(url);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else onSelectCategory(null);
    } else {
      onSelectCategory(null);
    }
  };

  return (
    <header id="site-main-header" className="sticky top-0 z-40 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222225] shadow-xs text-slate-800 dark:text-[#E0E0E0] transition-colors">
      {/* Top Notification Bar */}
      {showNotice && (
        <div id="header-top-notice-bar" className="bg-slate-100 dark:bg-[#0A0A0B] border-b border-slate-200 dark:border-[#222225] text-xs py-2 px-4 sm:px-8 lg:px-12 2xl:px-16 transition-colors">
          <div className="w-full flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="bg-[#C9A227] text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-xs shrink-0">
                {noticeBadgeText}
              </span>
              <span className="text-slate-700 dark:text-[#8E9299]">
                {noticeText}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-600 dark:text-[#8E9299] text-xs">
              {showQuickTracking && (
                <button
                  id="btn-quick-tracking-header"
                  onClick={onOpenTracker}
                  className="hover:text-slate-900 dark:hover:text-[#F3F4F6] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>{quickTrackingText}</span>
                </button>
              )}
              {showQuickTracking && <div className="w-px h-3 bg-slate-300 dark:bg-[#222225]" />}
              {/* Live Theme Toggle */}
              <ThemeToggle compact />
            </div>
          </div>
        </div>
      )}

      {/* Main Header Content */}
      <div id="header-main-bar" className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#161619] rounded-lg cursor-pointer"
              aria-label="باز کردن منو"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div
              id="header-brand-logo"
              onClick={() => onSelectCategory(null)}
              className="cursor-pointer flex items-center gap-3 select-none"
            >
              {websiteSettings?.logoUrl ? (
                <img
                  src={websiteSettings.logoUrl}
                  alt={siteTitle}
                  className="w-11 h-11 rounded-2xl object-cover shadow-lg shadow-[#C9A227]/20 ring-1 ring-[#C9A227]/40"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#C9A227]/20 ring-1 ring-[#C9A227]/40">
                  <BookOpen className="w-6 h-6 text-black" />
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F3F4F6]">{siteTitle}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 dark:bg-[#161619] text-[#C9A227] border border-[#C9A227]/30 px-1.5 py-0.5 rounded">
                    khatynoo.ir
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#8E9299] font-medium">{siteSubtitle}</span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="hidden md:flex flex-1 max-w-2xl 2xl:max-w-3xl mx-6">
            <div className="relative w-full">
              <input
                id="header-desktop-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-50 dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1A1A1E] focus:bg-white dark:focus:bg-[#161619] text-slate-900 dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-[#8E9299] text-sm rounded-xl pr-10 pl-4 py-2.5 border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] transition-all outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-[#8E9299] absolute right-3.5 top-3.5" />
              {searchQuery && (
                <button
                  id="btn-clear-desktop-search"
                  onClick={() => onSearchChange('')}
                  className="absolute left-3 top-3 text-xs text-slate-500 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0] bg-slate-200 dark:bg-[#222225] px-1.5 py-0.5 rounded cursor-pointer"
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Day / Night Toggle */}
            <ThemeToggle compact className="shrink-0" />

            {/* Customer Auth / Account Button */}
            {isAuthenticated && customer ? (
              <button
                id="btn-header-customer-account"
                onClick={onOpenCustomerAccount}
                className="flex items-center gap-2 bg-amber-50 dark:bg-[#1C1C20] hover:bg-amber-100 dark:hover:bg-[#25252A] text-amber-900 dark:text-[#F3F4F6] text-xs font-bold px-3 sm:px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-[#C9A227]/40 transition-all cursor-pointer shadow-xs"
                title="مشاهده حساب کاربری و سوابق خرید"
              >
                <div className="w-5 h-5 rounded-full bg-[#C9A227] text-black flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="max-w-[90px] sm:max-w-[120px] truncate">
                  {customer.name || toPersianDigits(customer.mobile)}
                </span>
              </button>
            ) : (
              <button
                id="btn-header-customer-login"
                onClick={() => openAuthModal()}
                className="flex items-center gap-2 bg-slate-50 dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1F1F24] text-slate-800 dark:text-[#E0E0E0] hover:text-[#C9A227] text-xs font-bold px-3 sm:px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#2D2D33] transition-all cursor-pointer shadow-xs"
              >
                <KeyRound className="w-4 h-4 text-[#C9A227]" />
                <span className="hidden sm:inline">ورود / ثبت‌نام</span>
                <span className="sm:hidden">ورود</span>
              </button>
            )}

            {showCalculatorButton && (
              <button
                id="btn-header-print-calculator"
                onClick={onOpenCalculator}
                className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1F1F24] text-slate-700 dark:text-[#E0E0E0] text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#2D2D33] transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-[#C9A227]" />
                <span>{calculatorButtonText}</span>
              </button>
            )}

            <button
              id="btn-header-cart-toggle"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-[#C9A227] hover:bg-[#B38E1E] active:scale-95 text-slate-950 text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#C9A227]/20 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">{cartButtonText}</span>
              {totalItems > 0 && (
                <span className="bg-black text-[#C9A227] font-black text-xs px-1.5 py-0.2 rounded-full min-w-[20px] text-center">
                  {toPersianDigits(totalItems)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-3 md:hidden">
          <div className="relative w-full">
            <input
              id="header-mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-50 dark:bg-[#161619] text-slate-900 dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-[#8E9299] text-xs rounded-xl pr-9 pl-3 py-2 border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-[#8E9299] absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Dynamic Categories & Header Navigation Bar */}
        <nav id="header-nav-categories" className="mt-3 pt-2.5 border-t border-slate-200 dark:border-[#222225] hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-semibold text-slate-600 dark:text-[#8E9299]">
          {customMenuItems ? (
            customMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.url)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  item.highlight
                    ? 'bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/40 font-bold hover:bg-[#C9A227]/20'
                    : 'hover:bg-slate-100 dark:hover:bg-[#161619] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
                }`}
              >
                {renderIcon(item.icon)}
                <span>{item.title}</span>
                {item.badge && (
                  <span className="bg-[#C9A227] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            ))
          ) : (
            <>
              <button
                onClick={() => onSelectCategory(null)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === null
                    ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/50 text-amber-700 dark:text-[#C9A227] font-bold shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-[#161619] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
                }`}
              >
                همه محصولات
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/50 text-amber-700 dark:text-[#C9A227] font-bold shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-[#161619] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.productCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedCategory === cat.id 
                        ? 'bg-[#C9A227]/20 text-amber-800 dark:text-[#C9A227]' 
                        : 'bg-slate-200 dark:bg-[#222225] text-slate-600 dark:text-[#8E9299]'
                    }`}>
                      {toPersianDigits(cat.productCount)}
                    </span>
                  )}
                </button>
              ))}
              <div className="mr-auto flex items-center gap-2 text-[#C9A227] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>تولیدات اختصاصی خطی‌نو</span>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="header-mobile-drawer" className="lg:hidden bg-white dark:bg-[#111113] border-b border-slate-200 dark:border-[#222225] p-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 dark:text-[#8E9299] mb-1">منوی دسترسی و دسته‌بندی‌ها:</div>
          <div className="grid grid-cols-2 gap-2">
            {customMenuItems ? (
              customMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleMenuClick(item.url);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-right p-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-1.5 ${
                    item.highlight
                      ? 'bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/40 font-bold'
                      : 'bg-slate-100 dark:bg-[#161619] text-slate-700 dark:text-[#E0E0E0]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {renderIcon(item.icon)}
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="bg-[#C9A227] text-black text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-right p-2 rounded-lg text-xs font-medium ${
                    selectedCategory === null 
                      ? 'bg-amber-50 dark:bg-[#1C1C20] text-amber-700 dark:text-[#C9A227] border border-[#C9A227]/50' 
                      : 'bg-slate-100 dark:bg-[#161619] text-slate-600 dark:text-[#8E9299]'
                  }`}
                >
                  همه کالاها
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`text-right p-2 rounded-lg text-xs font-medium truncate ${
                      selectedCategory === cat.id 
                        ? 'bg-amber-50 dark:bg-[#1C1C20] text-amber-700 dark:text-[#C9A227] border border-[#C9A227]/50' 
                        : 'bg-slate-100 dark:bg-[#161619] text-slate-600 dark:text-[#8E9299]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Mobile Customer Auth & Account Section */}
          <div className="p-3 bg-amber-500/10 rounded-xl border border-[#C9A227]/30 flex items-center justify-between">
            {isAuthenticated && customer ? (
              <button
                onClick={() => {
                  if (onOpenCustomerAccount) onOpenCustomerAccount();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between text-right cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#C9A227] text-black flex items-center justify-center font-black">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-xs text-slate-900 dark:text-[#F3F4F6]">
                      {customer.name || 'حساب کاربری من'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">
                      {toPersianDigits(customer.mobile)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-[#C9A227] font-bold">مدیریت ←</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  openAuthModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between text-right cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#C9A227]" />
                  <span className="font-bold text-xs text-slate-900 dark:text-[#F3F4F6]">
                    ورود یا ثبت‌نام با شماره موبایل
                  </span>
                </div>
                <span className="text-xs text-[#C9A227] font-bold">ورود ←</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-[#222225] space-y-2">
            {showCalculatorButton && (
              <button
                onClick={() => {
                  onOpenCalculator();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] text-slate-800 dark:text-[#E0E0E0] text-xs font-bold cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#C9A227]" />
                  {calculatorButtonText}
                </span>
                <span>←</span>
              </button>
            )}
            {showQuickTracking && (
              <button
                onClick={() => {
                  onOpenTracker();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] text-slate-800 dark:text-[#E0E0E0] text-xs font-bold cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-500 dark:text-[#8E9299]" />
                  {quickTrackingText}
                </span>
                <span>←</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
