/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider, useToast } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { api } from './lib/api';
import { Product, Category, Banner, WebsiteSettings, StoreSettings, PageBuilderBlock } from './types';
import { toPersianDigits } from './lib/utils';
import { useDeviceType } from './hooks/useDeviceType';

// Storefront Components
import { Header } from './components/storefront/Header';
import { BannerSlider } from './components/storefront/BannerSlider';
import { CategoryShowcase } from './components/storefront/CategoryShowcase';
import { ProductCard } from './components/storefront/ProductCard';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { ServicesCalculatorModal } from './components/storefront/ServicesCalculatorModal';
import { OrderTrackingModal } from './components/storefront/OrderTrackingModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { Footer } from './components/storefront/Footer';
import { DynamicBlockRenderer } from './components/storefront/DynamicBlockRenderer';

// Customer Authentication & Account Components
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';
import { CustomerAccountModal } from './components/customer/CustomerAccountModal';
import { MandatoryProfileModal } from './components/customer/MandatoryProfileModal';

// Admin POS & Accounting Components
import { AdminLayout, AdminTab } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { DashboardView } from './components/admin/DashboardView';
import { PosView } from './components/admin/PosView';
import { ProductsView } from './components/admin/ProductsView';
import { CategoriesUnitsView } from './components/admin/CategoriesUnitsView';
import { InventoryView } from './components/admin/InventoryView';
import { InvoicesView } from './components/admin/InvoicesView';
import { CustomersSuppliersView } from './components/admin/CustomersSuppliersView';
import { ChequesView } from './components/admin/ChequesView';
import { ServicesView } from './components/admin/ServicesView';
import { ProductionView } from './components/admin/ProductionView';
import { TorobMarketView } from './components/admin/TorobMarketView';
import { AiAssistantView } from './components/admin/AiAssistantView';
import { WebsiteManagerView } from './components/admin/WebsiteManagerView';
import { ReportsView } from './components/admin/ReportsView';
import { UsersView } from './components/admin/UsersView';
import { PublicationView } from './components/admin/publication/PublicationView';

// Dedicated Website Admin Portal Components
import { SiteAdminPortal } from './components/siteAdmin/SiteAdminPortal';
import { SiteAdminLogin } from './components/siteAdmin/SiteAdminLogin';

import {
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  TrendingUp,
  BookOpen,
} from 'lucide-react';

// =============================================================================
// ۱. نمای ویترین و فروشگاه آنلاین خطی‌نو (Storefront View)
// =============================================================================
function Storefront({ initialAccountOpen = false }: { initialAccountOpen?: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [pageBlocks, setPageBlocks] = useState<PageBuilderBlock[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'special' | 'featured' | 'in_stock'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isCustomerAccountOpen, setIsCustomerAccountOpen] = useState(initialAccountOpen);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadStorefrontData = useCallback(async () => {
    try {
      const [catRes, prodRes, bannerRes, setRes, blocksRes] = await Promise.all([
        api.getCategories().catch(() => ({ categories: [] })),
        api.getProducts().catch(() => ({ products: [] })),
        api.getBanners().catch(() => ({ banners: [] })),
        api.getWebsiteSettings().catch(() => ({ websiteSettings: null, storeSettings: null })),
        api.getPageBlocks().catch(() => ({ blocks: [] })),
      ]);
      setCategories(catRes.categories || []);
      setProducts(prodRes.products || []);
      setBanners(bannerRes.banners || []);
      if (setRes.websiteSettings || setRes.settings) {
        setWebsiteSettings(setRes.websiteSettings || setRes.settings);
      }
      if (setRes.storeSettings) {
        setStoreSettings(setRes.storeSettings);
      }
      if (blocksRes.blocks && Array.isArray(blocksRes.blocks)) {
        setPageBlocks(blocksRes.blocks);
      }
    } catch (err) {
      console.error('Error loading storefront data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorefrontData();

    const handleSettingsUpdated = () => {
      loadStorefrontData();
    };

    window.addEventListener('khatinoo-settings-updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);

    return () => {
      window.removeEventListener('khatinoo-settings-updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, [loadStorefrontData]);

  // Strictly isolate website products (exclude accounting-only products)
  const websiteProducts = React.useMemo(() => {
    return products.filter((p) => {
      const isOnlyAcc = Boolean((p as any).onlyAccounting || (p as any).only_accounting);
      const isShowWeb = (p as any).showOnWebsite !== undefined ? Boolean((p as any).showOnWebsite) : !isOnlyAcc;
      return isShowWeb && !isOnlyAcc;
    });
  }, [products]);

  // Filter products by category, search query, and filter tab
  const filteredProducts = websiteProducts.filter((p) => {
    if (selectedCategory && p.categoryId !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCode = p.code.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.toLowerCase().includes(q);
      const matchCat = p.categoryName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchBarcode && !matchCat) {
        return false;
      }
    }
    if (filterTab === 'special' && !p.isSpecialOffer) return false;
    if (filterTab === 'featured' && !p.isFeatured && !p.categoryName?.includes('دفتر')) return false;
    if (filterTab === 'in_stock' && p.stock <= 0) return false;
    return true;
  });

  // Sorted active custom page blocks
  const activeBlocks = pageBlocks
    .filter((b) => b.isEnabled)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const isFilteringOrSearching = !!(selectedCategory || searchQuery.trim() || filterTab !== 'all');

  // Dynamic font family & scale for storefront
  const fontFamilyMap: Record<string, string> = {
    vazirmatn: 'Vazirmatn, sans-serif',
    shabnam: 'Shabnam, Vazirmatn, sans-serif',
    sahel: 'Sahel, Vazirmatn, sans-serif',
  };
  const activeFontFamily = fontFamilyMap[websiteSettings?.siteFontFamily || 'vazirmatn'] || 'Vazirmatn, sans-serif';

  const fontScaleMap: Record<string, string> = {
    sm: '0.925rem',
    base: '1rem',
    lg: '1.075rem',
  };
  const activeFontScale = fontScaleMap[websiteSettings?.siteFontScale || 'base'] || '1rem';

  const spacingMap: Record<string, string> = {
    compact: 'space-y-4 sm:space-y-6',
    normal: 'space-y-6 sm:space-y-8',
    relaxed: 'space-y-10 sm:space-y-14',
  };
  const activeSectionSpacing = spacingMap[websiteSettings?.sectionSpacing || 'normal'] || 'space-y-6 sm:space-y-8';

  const cols = websiteSettings?.layoutColumns || 5;
  const gridColsClass = cols === 3
    ? 'grid-cols-2 sm:grid-cols-3'
    : cols === 4
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    : cols === 6
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  const device = useDeviceType();
  const responsiveOverride = websiteSettings?.responsiveLayout?.[device];
  const activeCatalogLayoutMode = responsiveOverride?.catalogLayoutMode || websiteSettings?.catalogLayoutMode || 'grid';

  return (
    <div
      className="min-h-screen bg-[var(--paper)] text-[var(--ink-charcoal)] flex flex-col selection:bg-[var(--coral)] selection:text-white transition-colors"
      dir="rtl"
      style={{
        fontFamily: activeFontFamily,
        fontSize: activeFontScale,
      }}
    >
      {/* Public Header - No admin buttons displayed to customers */}
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenCustomerAccount={() => setIsCustomerAccountOpen(true)}
        websiteSettings={websiteSettings}
        storeSettings={storeSettings}
      />

      {/* Main Storefront Body - Expansive Full Screen on Desktop */}
      <main className={`flex-1 w-full px-4 sm:px-8 lg:px-12 2xl:px-16 py-6 sm:py-8 ${activeSectionSpacing}`}>
        {/* If custom Page Builder blocks are loaded and we are on standard home view, render blocks dynamically */}
        {!isFilteringOrSearching && activeBlocks.length > 0 ? (
          activeBlocks.map((block) => (
            <DynamicBlockRenderer
              key={block.id}
              block={block}
              categories={categories}
              products={websiteProducts}
              banners={banners}
              websiteSettings={websiteSettings}
              onSelectCategory={setSelectedCategory}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onQuickView={(p) => setSelectedProduct(p)}
            />
          ))
        ) : !isFilteringOrSearching ? (
          // Default fallback blocks if no custom blocks configured yet
          <>
            {banners.length > 0 && (
              <BannerSlider
                banners={banners}
                websiteSettings={websiteSettings}
                onBannerClick={(b) => {
                  if (b.link?.includes('category')) {
                    const cat = categories.find((c) => b.link?.includes(c.id));
                    if (cat) setSelectedCategory(cat.id);
                  }
                }}
              />
            )}

            {/* 1. نوار افقی ظریف اعتماد بدون بردر و کارت‌های یکنواخت */}
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-5 border-y border-[var(--line-soft)] dark:border-[#222225]">
              {[
                { icon: BookOpen, color: 'var(--coral)', title: 'تولید اختصاصی خطی‌نو', sub: 'دفاتر مشق، سیمی و طراحی' },
                { icon: TrendingUp, color: 'var(--teal)', title: 'تضمین مناسب‌ترین قیمت', sub: 'همگام با بازار و قیمت ترب' },
                { icon: Layers, color: 'var(--grape)', title: 'تنوع ۵۰۰۰+ قلم کالا', sub: 'برترین برندهای داخلی و وارداتی' },
                { icon: CheckCircle2, color: 'var(--sunshine)', title: 'ارسال سریع کشوری', sub: 'پیک روزانه و پست پیشتاز' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <item.icon className="w-6 h-6 shrink-0" style={{ color: item.color }} strokeWidth={1.75} />
                  <div>
                    <div className="font-black text-sm text-[var(--ink-charcoal)] dark:text-[#F3F4F6]">{item.title}</div>
                    <div className="text-xs text-slate-500 dark:text-[#8E9299]">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. ویترین دسته‌بندی با عکس بزرگ */}
            <CategoryShowcase categories={categories} onSelect={setSelectedCategory} />
          </>
        ) : null}

        {/* Storefront Section Header & Filter Tabs / Catalog */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-[var(--line-soft)] dark:border-[#222225] transition-colors" id="catalog">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] tracking-tight">
              {selectedCategory
                ? `محصولات دسته: ${categories.find((c) => c.id === selectedCategory)?.name}`
                : 'کاتالوگ و ویترین کامل محصولات'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8E9299] mt-1">
              نمایش {toPersianDigits(filteredProducts.length)} کالا با قیمت مصوب و موجودی انبار لحظه‌ای
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111113] border border-[var(--line-soft)] dark:border-[#222225] p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full no-scrollbar shadow-xs">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                filterTab === 'all'
                  ? 'bg-[var(--teal)] text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              همه کالاها
            </button>
            <button
              onClick={() => setFilterTab('featured')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                filterTab === 'featured'
                  ? 'bg-[var(--coral)] text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>تولیدات خطی‌نو</span>
            </button>
            <button
              onClick={() => setFilterTab('special')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                filterTab === 'special'
                  ? 'bg-[var(--sunshine)] text-[var(--ink-charcoal)] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              تخفیف‌های ویژه
            </button>
            <button
              onClick={() => setFilterTab('in_stock')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                filterTab === 'in_stock'
                  ? 'bg-[var(--teal)] text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              فقط کالاهای موجود
            </button>
          </div>
        </div>

        {/* Product Grid / List - Fluid Widescreen */}
        {isLoading ? (
          <div className={`grid ${gridColsClass} gap-4 sm:gap-6 py-12`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="bg-slate-200 dark:bg-[#161619] rounded-2xl h-80 animate-pulse border border-[var(--line-soft)] dark:border-[#222225]" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#111113] border border-[var(--line-soft)] dark:border-[#222225] rounded-3xl p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <Package className="w-12 h-12 text-slate-400 dark:text-[#8E9299] mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F3F4F6]">کالایی با این مشخصات یافت نشد</h3>
            <p className="text-xs text-slate-500 dark:text-[#8E9299] mt-1 mb-4">
              لطفاً فیلترهای جستجو را پاک کنید یا عبارت دیگری را جستجو فرمایید.
            </p>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
                setFilterTab('all');
              }}
              className="bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 text-[var(--teal)] text-xs font-bold px-4 py-2 rounded-xl border border-[var(--teal)]/30 transition-colors cursor-pointer"
            >
              مشاهده تمامی محصولات
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ردیف محصولات پیشنهادی با یک کارت بزرگ در صفحه اصلی */}
            {!selectedCategory && !isFilteringOrSearching && filteredProducts.length >= 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--coral)]" />
                    <h3 className="text-lg sm:text-xl font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6]">
                      محصولات برگزیده و پیشنهادی
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[var(--teal)]">ویژهٔ خطی‌نو</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5">
                  <div className="sm:col-span-2 sm:row-span-2">
                    <ProductCard
                      product={filteredProducts[0]}
                      websiteSettings={websiteSettings}
                      layoutMode="grid"
                      onQuickView={(p) => setSelectedProduct(p)}
                      large
                    />
                  </div>
                  {filteredProducts.slice(1, 5).map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      websiteSettings={websiteSettings}
                      layoutMode="grid"
                      onQuickView={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* گرید استاندارد محصولات کاتالوگ */}
            {(() => {
              const displayProducts = (!selectedCategory && !isFilteringOrSearching && filteredProducts.length >= 5)
                ? filteredProducts.slice(5)
                : filteredProducts;

              if (displayProducts.length === 0) return null;

              return (
                <div className={
                  activeCatalogLayoutMode === 'list'
                    ? "flex flex-col gap-3"
                    : activeCatalogLayoutMode === 'compact'
                    ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3"
                    : `grid ${gridColsClass} gap-4 sm:gap-6`
                }>
                  {displayProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      websiteSettings={websiteSettings}
                      layoutMode={activeCatalogLayoutMode}
                      onQuickView={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Quick View Product Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Print / Copy Calculator Modal */}
      <ServicesCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Customer OTP Authentication Modal */}
      <CustomerAuthModal />

      {/* Customer Account Dashboard Modal */}
      <CustomerAccountModal
        isOpen={isCustomerAccountOpen}
        onClose={() => setIsCustomerAccountOpen(false)}
        onOpenProfileCompletion={() => setIsProfileModalOpen(true)}
      />

      {/* Mandatory / Explicit Profile Completion Modal */}
      <MandatoryProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Storefront Footer */}
      <Footer
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenTracker={() => setIsTrackerOpen(true)}
        websiteSettings={websiteSettings}
        storeSettings={storeSettings}
      />
    </div>
  );
}

// =============================================================================
// ۲. نمای پنل صندوق و حسابداری حضوری (POS & Accounting Admin Portal)
// =============================================================================
function AdminPortal() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  const currentTab: AdminTab = (tab as AdminTab) || 'dashboard';

  const handleTabChange = (newTab: AdminTab) => {
    navigate(`/admin/${newTab}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] flex items-center justify-center text-[var(--coral)] font-bold text-sm">
        در حال اعتبارسنجی نشست کاربری...
      </div>
    );
  }

  // Strictly require user login
  if (!user) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      onBackToStore={() => navigate('/')}
    >
      {currentTab === 'dashboard' && <DashboardView onNavigate={handleTabChange} />}
      {currentTab === 'pos' && <PosView />}
      {currentTab === 'products' && <ProductsView />}
      {currentTab === 'categories_units' && <CategoriesUnitsView />}
      {currentTab === 'inventory' && <InventoryView />}
      {currentTab === 'invoices' && <InvoicesView />}
      {currentTab === 'customers_suppliers' && <CustomersSuppliersView />}
      {currentTab === 'cheques' && <ChequesView />}
      {currentTab === 'services' && <ServicesView />}
      {currentTab === 'production' && <ProductionView />}
      {currentTab === 'torob' && <TorobMarketView />}
      {currentTab === 'ai' && <AiAssistantView />}
      {currentTab === 'website' && <WebsiteManagerView />}
      {currentTab === 'publication' && <PublicationView />}
      {currentTab === 'reports' && <ReportsView />}
      {currentTab === 'users' && <UsersView />}
    </AdminLayout>
  );
}

// =============================================================================
// ۳. پیکربندی اصلی روت‌های برنامه (Main Root App Routing)
// =============================================================================
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Routes>
                    {/* ویترین عمومی فروشگاه آنلاین */}
                    <Route path="/" element={<Storefront />} />
                    <Route path="/store" element={<Storefront />} />
                    <Route path="/account" element={<Storefront initialAccountOpen={true} />} />
                    <Route path="/profile" element={<Storefront initialAccountOpen={true} />} />
                    <Route path="/orders" element={<Storefront initialAccountOpen={true} />} />

                    {/* پنل اختصاصی مدیریت فروشگاه آنلاین (اسلایدرها، سفارشات اینترنتی، تنظیمات سایت) */}
                    <Route path="/adminsite" element={<SiteAdminPortal />} />
                    <Route path="/adminsite/:tab" element={<SiteAdminPortal />} />
                    <Route path="/adminsite/login" element={<SiteAdminLogin />} />

                    {/* پرتال صندوق، انبارداری و حسابداری حضوری */}
                    <Route path="/admin" element={<AdminPortal />} />
                    <Route path="/admin/:tab" element={<AdminPortal />} />
                    <Route path="/admin/login" element={<AdminLogin />} />

                    {/* مسیر پیش‌فرض */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
            </CartProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
