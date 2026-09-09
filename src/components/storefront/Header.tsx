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
  Phone,
  MessageCircle,
  HelpCircle,
  Send,
  Star,
  SunMoon,
  ArrowRight,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { toPersianDigits } from '../../lib/utils';
import { Category, WebsiteSettings, StoreSettings, HeaderElement } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';
import { useDeviceType, sizeToCss } from '../../hooks/useDeviceType';

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

const CATEGORY_COLORS = ['var(--coral)', 'var(--teal)', 'var(--grape)', 'var(--sunshine)'];

const CATEGORY_ACCENTS = [
  { border: 'hover:border-[var(--coral)]', bg: 'hover:bg-[var(--coral)]/5', text: 'group-hover:text-[var(--coral)]' },
  { border: 'hover:border-[var(--teal)]', bg: 'hover:bg-[var(--teal)]/5', text: 'group-hover:text-[var(--teal)]' },
  { border: 'hover:border-[var(--sunshine)]', bg: 'hover:bg-[var(--sunshine)]/10', text: 'group-hover:text-[var(--ink-charcoal)]' },
  { border: 'hover:border-[var(--grape)]', bg: 'hover:bg-[var(--grape)]/5', text: 'group-hover:text-[var(--grape)]' },
];

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

  const device = useDeviceType();
  const responsiveOverride = websiteSettings?.responsiveLayout?.[device];
  const headerLayout = (responsiveOverride?.headerLayoutStyle as any) || websiteSettings?.headerLayout || 'standard';
  const headerPaddingX = headerLayout === 'fullwidth' ? 'px-3 sm:px-4' : 'px-4 sm:px-8 lg:px-12 2xl:px-16';
  const headerPaddingY = headerLayout === 'compact' ? 'py-2' : 'py-3.5';
  const siteTitleSizeClass = headerLayout === 'compact' ? 'text-lg sm:text-xl' : 'text-2xl';

  const logoHeightCss = sizeToCss(responsiveOverride?.logoHeight, `${websiteSettings?.logoHeight || 48}px`);
  const logoWidthCss = responsiveOverride?.logoWidth
    ? sizeToCss(responsiveOverride.logoWidth)
    : (websiteSettings?.logoWidth ? `${websiteSettings.logoWidth}px` : 'auto');

  // Dynamic header menu items from CMS settings
  const customMenuItems = websiteSettings?.headerMenuItems && websiteSettings.headerMenuItems.length > 0
    ? websiteSettings.headerMenuItems.filter(item => item.isEnabled !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : null;

  // Header Elements from CMS or Defaults
  const defaultHeaderElements: HeaderElement[] = [
    { id: 'logo', type: 'logo', title: 'لوگو و برند', enabled: true, order: 1, alignment: 'start', showOnMobile: true },
    { id: 'search', type: 'search', title: 'کادر جستجو', customText: searchPlaceholder, enabled: true, order: 2, alignment: 'center', showOnMobile: true },
    { id: 'theme_toggle', type: 'theme_toggle', title: 'حالت شب و روز', icon: 'SunMoon', enabled: true, order: 3, alignment: 'end', showOnMobile: true, buttonStyle: 'ghost' },
    { id: 'auth', type: 'auth', title: 'ورود / ثبت‌نام', customText: 'ورود / ثبت‌نام', icon: 'KeyRound', enabled: true, order: 4, alignment: 'end', showOnMobile: true, buttonStyle: 'subtle' },
    { id: 'calculator', type: 'calculator', title: 'محاسبه آنلاین چاپ', customText: calculatorButtonText, icon: 'Printer', enabled: showCalculatorButton, order: 5, alignment: 'end', showOnMobile: true, buttonStyle: 'subtle' },
    { id: 'cart', type: 'cart', title: 'سبد خرید', customText: cartButtonText, icon: 'ShoppingBag', enabled: true, order: 6, alignment: 'end', showOnMobile: true, buttonStyle: 'gold' },
  ];

  const headerElements = (websiteSettings?.headerElements && websiteSettings.headerElements.length > 0)
    ? websiteSettings.headerElements
    : defaultHeaderElements;

  const activeElements = headerElements
    .filter(item => item.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const startElements = activeElements.filter(e => (e.alignment || (e.type === 'logo' ? 'start' : e.type === 'search' ? 'center' : 'end')) === 'start');
  const centerElements = activeElements.filter(e => (e.alignment || (e.type === 'logo' ? 'start' : e.type === 'search' ? 'center' : 'end')) === 'center');
  const endElements = activeElements.filter(e => (e.alignment || (e.type === 'logo' ? 'start' : e.type === 'search' ? 'center' : 'end')) === 'end');

  const isSearchActive = activeElements.some(e => e.type === 'search');

  const renderCustomIcon = (iconName?: string, fallback?: React.ReactNode) => {
    switch (iconName) {
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
      case 'Search': return <Search className="w-4 h-4" />;
      case 'Printer': return <Printer className="w-4 h-4" />;
      case 'Truck': return <Truck className="w-4 h-4" />;
      case 'BookOpen': return <BookOpen className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'KeyRound': return <KeyRound className="w-4 h-4" />;
      case 'User': return <User className="w-4 h-4" />;
      case 'Phone': return <Phone className="w-4 h-4" />;
      case 'MessageCircle': return <MessageCircle className="w-4 h-4" />;
      case 'FileText': return <FileText className="w-4 h-4" />;
      case 'Tag': return <Tag className="w-4 h-4" />;
      case 'SunMoon': return <SunMoon className="w-4 h-4" />;
      case 'HelpCircle': return <HelpCircle className="w-4 h-4" />;
      case 'Send': return <Send className="w-4 h-4" />;
      case 'Star': return <Star className="w-4 h-4" />;
      case 'ExternalLink': return <ExternalLink className="w-4 h-4" />;
      case 'PenTool': return <PenTool className="w-4 h-4" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      case 'Palette': return <Palette className="w-4 h-4" />;
      case 'Grid': return <Grid className="w-4 h-4" />;
      case 'Layers': return <Layers className="w-4 h-4" />;
      default: return fallback || <Sparkles className="w-4 h-4" />;
    }
  };

  const renderIcon = (iconName?: string) => renderCustomIcon(iconName, <Grid className="w-3.5 h-3.5" />);

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
    } else if (url.startsWith('tel:')) {
      window.location.href = url;
    } else if (url.startsWith('#')) {
      const el = document.querySelector(url);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else onSelectCategory(null);
    } else {
      onSelectCategory(null);
    }
  };

  const handleCustomButtonClick = (elem: HeaderElement) => {
    if (!elem.customLink) {
      if (elem.type === 'calculator') onOpenCalculator();
      else if (elem.type === 'cart') setIsCartOpen(true);
      else if (elem.type === 'auth') openAuthModal();
      return;
    }
    handleMenuClick(elem.customLink);
  };

  const renderSingleElement = (elem: HeaderElement) => {
    switch (elem.type) {
      case 'logo':
        return (
          <div key={elem.id} className="flex items-center gap-3">
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
              className="cursor-pointer flex items-center gap-3 select-none py-1"
            >
              {websiteSettings?.logoUrl ? (
                <img
                  src={websiteSettings.logoUrl}
                  alt={siteTitle}
                  style={{
                    height: logoHeightCss,
                    width: logoWidthCss,
                    maxHeight: '240px',
                    objectFit: websiteSettings.logoFit || 'contain',
                  }}
                  className={`${
                    websiteSettings.logoBorderRadius === 'rounded-none'
                      ? 'rounded-none'
                      : websiteSettings.logoBorderRadius || 'rounded-none'
                  } shrink-0 ${
                    websiteSettings.logoHasBorder
                      ? 'shadow-md ring-1 ring-[var(--coral)]/40 p-1 bg-white/5'
                      : 'border-0 ring-0 shadow-none'
                  } transition-all duration-200`}
                />
              ) : (
                <div
                  style={{
                    height: logoHeightCss,
                    width: logoWidthCss === 'auto' ? logoHeightCss : logoWidthCss,
                    maxHeight: '240px',
                  }}
                  className={`${websiteSettings?.logoBorderRadius || 'rounded-xl'} bg-gradient-to-br from-[var(--coral)] to-[var(--coral-hover)] flex items-center justify-center text-white font-black shadow-lg shadow-[var(--coral)]/25 shrink-0`}
                >
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              )}
              {websiteSettings?.showLogoText !== false && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={`${siteTitleSizeClass} font-black tracking-tight text-slate-900 dark:text-[#F3F4F6]`}>{siteTitle}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 dark:bg-[#161619] text-[var(--teal)] border border-[var(--teal)]/30 px-1.5 py-0.5 rounded">
                      khatynoo.ir
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-[#8E9299] font-medium">{siteSubtitle}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'search':
        return (
          <div key={elem.id} className="hidden md:flex flex-1 max-w-2xl 2xl:max-w-3xl mx-4 lg:mx-6">
            <div className="relative w-full">
              <input
                id="header-desktop-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={elem.customText || searchPlaceholder}
                className="w-full bg-[var(--paper)] dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1A1A1E] focus:bg-white dark:focus:bg-[#161619] text-[var(--ink-charcoal)] dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-[#8E9299] text-sm rounded-full pr-10 pl-4 py-2.5 border border-[var(--line-soft)] dark:border-[#2D2D33] focus:border-[var(--teal)] transition-all outline-none"
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
        );

      case 'theme_toggle':
        return (
          <div key={elem.id} className={`shrink-0 ${elem.showOnMobile === false ? 'hidden sm:block' : 'block'}`}>
            <ThemeToggle compact />
          </div>
        );

      case 'auth':
        return (
          <div key={elem.id} className="shrink-0">
            {isAuthenticated && customer ? (
              <button
                id="btn-header-customer-account"
                onClick={onOpenCustomerAccount}
                className="flex items-center gap-2 bg-[var(--paper)] dark:bg-[#1C1C20] hover:bg-slate-100 dark:hover:bg-[#25252A] text-[var(--ink-charcoal)] dark:text-[#F3F4F6] text-xs font-bold px-3 sm:px-3.5 py-2.5 rounded-full border border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] transition-all cursor-pointer shadow-xs"
                title="مشاهده حساب کاربری و سوابق خرید"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--teal)] text-white flex items-center justify-center font-bold text-[10px]">
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
                className="flex items-center gap-2 text-xs font-bold px-3 sm:px-3.5 py-2.5 rounded-full border transition-all cursor-pointer shadow-xs bg-[var(--paper)] dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1F1F24] text-[var(--ink-charcoal)] dark:text-[#E0E0E0] hover:text-[var(--coral)] border-[var(--line-soft)] dark:border-[#2D2D33]"
              >
                {renderCustomIcon(elem.icon, <KeyRound className="w-4 h-4 text-[var(--coral)]" />)}
                <span className="hidden sm:inline">{elem.customText || 'ورود / ثبت‌نام'}</span>
                <span className="sm:hidden">ورود</span>
              </button>
            )}
          </div>
        );

      case 'calculator':
        return (
          <button
            key={elem.id}
            id="btn-header-print-calculator"
            onClick={onOpenCalculator}
            className={`items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-full border transition-all cursor-pointer shadow-xs ${
              elem.showOnMobile === false ? 'hidden sm:flex' : 'hidden sm:flex'
            } bg-[var(--paper)] dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1F1F24] text-[var(--ink-charcoal)] dark:text-[#E0E0E0] hover:text-[var(--teal)] border-[var(--line-soft)] dark:border-[#2D2D33]`}
          >
            {renderCustomIcon(elem.icon, <Printer className="w-4 h-4 text-[var(--teal)]" />)}
            <span>{elem.customText || calculatorButtonText}</span>
          </button>
        );

      case 'cart':
        return (
          <button
            key={elem.id}
            id="btn-header-cart-toggle"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 text-xs sm:text-sm font-black px-4 py-2.5 rounded-full transition-all shadow-md shadow-[var(--coral)]/20 active:scale-95 bg-[var(--coral)] hover:bg-[var(--coral-hover)] text-white cursor-pointer"
          >
            {renderCustomIcon(elem.icon, <ShoppingBag className="w-4 h-4 text-white" />)}
            <span className="hidden sm:inline">{elem.customText || cartButtonText}</span>
            {totalItems > 0 && (
              <span className="bg-white text-[var(--coral)] font-black text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                {toPersianDigits(totalItems)}
              </span>
            )}
          </button>
        );

      case 'custom_button':
      default:
        return (
          <button
            key={elem.id}
            id={`btn-header-${elem.id}`}
            onClick={() => handleCustomButtonClick(elem)}
            className={`items-center gap-2 text-xs font-bold px-3 sm:px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              elem.showOnMobile === false ? 'hidden sm:flex' : 'flex'
            } ${
              elem.buttonStyle === 'gold'
                ? 'bg-[var(--coral)] hover:bg-[var(--coral-hover)] text-white border-[var(--coral)]'
                : elem.buttonStyle === 'primary'
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                : elem.buttonStyle === 'ghost'
                ? 'bg-transparent hover:bg-slate-100 dark:hover:bg-[#161619] text-slate-700 dark:text-[#E0E0E0] border-transparent'
                : 'bg-slate-50 dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#1F1F24] text-slate-800 dark:text-[#E0E0E0] border-slate-200 dark:border-[#2D2D33]'
            }`}
          >
            {renderCustomIcon(elem.icon, <Tag className="w-4 h-4 text-[var(--coral)]" />)}
            <span>{elem.customText || elem.title}</span>
          </button>
        );
    }
  };

  return (
    <header id="site-main-header" className="sticky top-0 z-40 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222225] shadow-xs text-slate-800 dark:text-[#E0E0E0] transition-colors">
      {/* Top Notification / Advertisement Bar */}
      {showNotice && (
        <div
          id="header-top-notice-bar"
          className={`border-b text-xs py-2 px-4 sm:px-8 lg:px-12 2xl:px-16 transition-colors ${
            websiteSettings?.noticeBannerStyle === 'gold_gradient'
              ? 'bg-gradient-to-r from-[var(--sunshine)]/25 via-[var(--sunshine)]/35 to-[var(--sunshine)]/25 border-[var(--sunshine)]/50 text-[var(--ink-charcoal)] dark:text-[#F3F4F6]'
              : websiteSettings?.noticeBannerStyle === 'emerald_deals'
              ? 'bg-gradient-to-r from-emerald-600/20 via-emerald-500/25 to-teal-600/20 border-emerald-500/40 text-emerald-900 dark:text-emerald-300'
              : websiteSettings?.noticeBannerStyle === 'indigo_promo'
              ? 'bg-gradient-to-r from-indigo-600/20 via-blue-600/25 to-violet-600/20 border-indigo-500/40 text-indigo-900 dark:text-indigo-200'
              : websiteSettings?.noticeBannerStyle === 'rose_hot'
              ? 'bg-gradient-to-r from-rose-600/20 via-[var(--coral)]/25 to-[var(--coral)]/30 border-rose-500/40 text-rose-900 dark:text-rose-200'
              : websiteSettings?.noticeBannerStyle === 'dark_luxury'
              ? 'bg-[#0A0A0B] border-[#222225] text-[#E0E0E0]'
              : 'bg-slate-100 dark:bg-[#0A0A0B] border-slate-200 dark:border-[#222225] text-slate-800 dark:text-[#E0E0E0]'
          }`}
        >
          <div className="w-full flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center flex-wrap gap-2 font-medium">
              <span className="bg-[var(--coral)] text-white px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-xs shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-white" />
                <span>{noticeBadgeText}</span>
              </span>
              <span className="text-slate-800 dark:text-[#E0E0E0] font-semibold text-xs">
                {noticeText}
              </span>
              {websiteSettings?.noticeLink && (
                <button
                  type="button"
                  onClick={() => handleMenuClick(websiteSettings.noticeLink!)}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-[var(--teal)] hover:underline bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  <span>{websiteSettings.noticeLinkText || 'مشاهده و سفارش'}</span>
                  <ArrowRight className="w-3 h-3 -rotate-180" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-slate-600 dark:text-[#8E9299] text-xs">
              {showQuickTracking && (
                <button
                  id="btn-quick-tracking-header"
                  onClick={onOpenTracker}
                  className="hover:text-slate-900 dark:hover:text-[#F3F4F6] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-[var(--teal)]" />
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

      {/* Main Header Dynamic Content */}
      <div id="header-main-bar" className={`w-full ${headerPaddingX} ${headerPaddingY}`}>
        {headerLayout === 'centered' ? (
          <div className="flex flex-col items-center gap-3">
            {/* Top row: Logo centered, with mobile toggle / space on right and actions on left */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  id="btn-mobile-menu-toggle-centered"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl border border-[var(--line-soft)] dark:border-[#2D2D33] text-slate-700 dark:text-[#E0E0E0] hover:bg-slate-100 dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
                  aria-label="منوی سایت"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

              {/* Centered Logo */}
              <div className="flex justify-center">
                {startElements.map(renderSingleElement)}
              </div>

              {/* End Section Tools */}
              <div className="flex items-center gap-2 sm:gap-3">
                {endElements.map(renderSingleElement)}
              </div>
            </div>

            {/* Bottom row: Search Box Centered */}
            {centerElements.length > 0 && (
              <div className="w-full max-w-2xl 2xl:max-w-3xl mx-auto flex justify-center pb-1">
                {centerElements.map(renderSingleElement)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            {/* Start Section (e.g. Logo & Brand) */}
            <div className="flex items-center gap-3">
              {startElements.map(renderSingleElement)}
            </div>

            {/* Center Section (e.g. Search Box) */}
            {centerElements.map(renderSingleElement)}

            {/* End Section (e.g. Theme Toggle, Auth, Calculator, Cart, Custom Buttons) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {endElements.map(renderSingleElement)}
            </div>
          </div>
        )}

        {/* Mobile Search Box (If search is enabled) */}
        {isSearchActive && (
          <div className="mt-3 md:hidden">
            <div className="relative w-full">
              <input
                id="header-mobile-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-[var(--paper)] dark:bg-[#161619] text-[var(--ink-charcoal)] dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-[#8E9299] text-xs rounded-full pr-9 pl-3 py-2 border border-[var(--line-soft)] dark:border-[#2D2D33] focus:border-[var(--teal)] outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-[#8E9299] absolute right-3 top-2.5" />
            </div>
          </div>
        )}

        {/* Dynamic Categories & Header Navigation Bar */}
        <nav id="header-nav-categories" className="mt-3 pt-2.5 border-t border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-semibold text-slate-600 dark:text-[#8E9299]">
          {customMenuItems ? (
            customMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.url)}
                className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  item.highlight
                    ? 'bg-[var(--coral)] text-white border-[var(--coral)] font-bold shadow-xs'
                    : 'bg-white dark:bg-[#121316] text-[var(--ink-charcoal)] dark:text-[#E2E4E9] border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] hover:border-[var(--coral)] hover:bg-[var(--coral)]/5'
                }`}
              >
                {renderIcon(item.icon)}
                <span>{item.title}</span>
                {item.badge && (
                  <span className="bg-[var(--sunshine)] text-[var(--ink-charcoal)] text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            ))
          ) : (
            <>
              <button
                onClick={() => onSelectCategory(null)}
                className={`px-3.5 py-1.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                  selectedCategory === null
                    ? 'bg-[var(--ink-charcoal)] text-white border-[var(--ink-charcoal)] dark:bg-white dark:text-[var(--ink-charcoal)] shadow-sm font-bold'
                    : 'bg-white dark:bg-[#121316] text-[var(--ink-charcoal)] dark:text-[#E2E4E9] border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] hover:border-[var(--coral)] hover:bg-[var(--coral)]/5'
                }`}
              >
                همه محصولات
              </button>
              {categories.map((cat, index) => {
                const isSelected = selectedCategory === cat.id;
                const accent = CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`group px-3.5 py-1.5 rounded-full border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--ink-charcoal)] text-white border-[var(--ink-charcoal)] dark:bg-white dark:text-[var(--ink-charcoal)] shadow-sm font-bold'
                        : `bg-white dark:bg-[#121316] text-[var(--ink-charcoal)] dark:text-[#E2E4E9] border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] ${accent.border} ${accent.bg}`
                    }`}
                  >
                    <span className={!isSelected ? accent.text : ''}>{cat.name}</span>
                    {cat.productCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected 
                          ? 'bg-white/20 dark:bg-black/20 text-white dark:text-[var(--ink-charcoal)]' 
                          : 'bg-slate-100 dark:bg-[#1C1D22] text-slate-500 dark:text-[#8E9299]'
                      }`}>
                        {toPersianDigits(cat.productCount)}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="mr-auto flex items-center gap-2 text-[var(--teal)] font-bold">
                <BookOpen className="w-3.5 h-3.5 text-[var(--coral)]" />
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
              customMenuItems.map((item, idx) => {
                const accent = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleMenuClick(item.url);
                      setMobileMenuOpen(false);
                    }}
                    style={item.highlight ? { backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent, borderColor: `color-mix(in srgb, ${accent} 40%, transparent)` } : undefined}
                    className={`text-right p-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-1.5 ${
                      item.highlight
                        ? 'border font-bold'
                        : 'bg-slate-100 dark:bg-[#161619] text-slate-700 dark:text-[#E0E0E0]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {renderIcon(item.icon)}
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="bg-[var(--coral)] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <>
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-right p-2.5 rounded-xl text-xs font-medium ${
                    selectedCategory === null 
                      ? 'bg-[var(--ink-charcoal)] text-white dark:bg-white dark:text-[var(--ink-charcoal)] font-bold' 
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
                    className={`text-right p-2.5 rounded-xl text-xs font-medium truncate ${
                      selectedCategory === cat.id 
                        ? 'bg-[var(--ink-charcoal)] text-white dark:bg-white dark:text-[var(--ink-charcoal)] font-bold' 
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
          <div className="p-3 bg-[var(--paper)] dark:bg-[#161619] rounded-2xl border border-[var(--line-soft)] dark:border-[#2D2D33] flex items-center justify-between">
            {isAuthenticated && customer ? (
              <button
                onClick={() => {
                  if (onOpenCustomerAccount) onOpenCustomerAccount();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between text-right cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--teal)] text-white flex items-center justify-center font-black">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-xs text-[var(--ink-charcoal)] dark:text-[#F3F4F6]">
                      {customer.name || 'حساب کاربری من'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">
                      {toPersianDigits(customer.mobile)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-[var(--teal)] font-bold">مدیریت ←</span>
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
                  <KeyRound className="w-4 h-4 text-[var(--coral)]" />
                  <span className="font-bold text-xs text-[var(--ink-charcoal)] dark:text-[#F3F4F6]">
                    ورود یا ثبت‌نام با شماره موبایل
                  </span>
                </div>
                <span className="text-xs text-[var(--coral)] font-bold">ورود ←</span>
              </button>
            )}
          </div>

          {/* Dynamic Active Actions on Mobile */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#222225] space-y-2">
            {activeElements.filter(e => e.type !== 'logo' && e.type !== 'search' && e.type !== 'auth').map((elem) => (
              <button
                key={elem.id}
                onClick={() => {
                  handleCustomButtonClick(elem);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] text-slate-800 dark:text-[#E0E0E0] text-xs font-bold cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {renderCustomIcon(elem.icon, <Tag className="w-4 h-4 text-[var(--coral)]" />)}
                  {elem.customText || elem.title}
                </span>
                <span>←</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

