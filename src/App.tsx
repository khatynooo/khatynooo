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

// Storefront Components
import { Header } from './components/storefront/Header';
import { BannerSlider } from './components/storefront/BannerSlider';
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

// Dedicated Website Admin Portal Components
import { SiteAdminPortal } from './components/siteAdmin/SiteAdminPortal';
import { SiteAdminLogin } from './components/siteAdmin/SiteAdminLogin';

import {
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  TrendingUp,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] text-slate-800 dark:text-[#E0E0E0] flex flex-col selection:bg-[#C9A227] selection:text-black font-sans transition-colors" dir="rtl">
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
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 2xl:px-16 py-6 sm:py-8 space-y-8">
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
                onBannerClick={(b) => {
                  if (b.link?.includes('category')) {
                    const cat = categories.find((c) => b.link?.includes(c.id));
                    if (cat) setSelectedCategory(cat.id);
                  }
                }}
              />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
              <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-4 rounded-2xl flex items-center gap-3.5 shadow-xs transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#C9A227] flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">تولید اختصاصی خطی‌نو</div>
                  <div className="text-xs text-slate-500 dark:text-[#8E9299]">دفاتر مشق، سیمی و طراحی</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-4 rounded-2xl flex items-center gap-3.5 shadow-xs transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">تضمین مناسب‌ترین قیمت</div>
                  <div className="text-xs text-slate-500 dark:text-[#8E9299]">همگام با بازار و قیمت ترب</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-4 rounded-2xl flex items-center gap-3.5 shadow-xs transition-colors">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">تنوع ۵۰۰۰+ قلم کالا</div>
                  <div className="text-xs text-slate-500 dark:text-[#8E9299]">برترین برندهای داخلی و وارداتی</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-4 rounded-2xl flex items-center gap-3.5 shadow-xs transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">ارسال سریع کشوری</div>
                  <div className="text-xs text-slate-500 dark:text-[#8E9299]">پیک روزانه و پست پیشتاز</div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* Storefront Section Header & Filter Tabs / Catalog */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-[#222225] transition-colors" id="catalog">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
              {selectedCategory
                ? `محصولات دسته: ${categories.find((c) => c.id === selectedCategory)?.name}`
                : 'کاتالوگ و ویترین کامل محصولات'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8E9299] mt-0.5">
              نمایش {toPersianDigits(filteredProducts.length)} کالا با قیمت مصوب و موجودی انبار لحظه‌ای
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full no-scrollbar shadow-xs">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                filterTab === 'all'
                  ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/40 text-amber-900 dark:text-[#C9A227] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              همه کالاها
            </button>
            <button
              onClick={() => setFilterTab('featured')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                filterTab === 'featured'
                  ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/40 text-amber-900 dark:text-[#C9A227] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-[#C9A227]" />
              <span>تولیدات خطی‌نو</span>
            </button>
            <button
              onClick={() => setFilterTab('special')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                filterTab === 'special'
                  ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/40 text-amber-900 dark:text-[#C9A227] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              تخفیف‌های ویژه
            </button>
            <button
              onClick={() => setFilterTab('in_stock')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                filterTab === 'in_stock'
                  ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/40 text-amber-900 dark:text-[#C9A227] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-[#E0E0E0]'
              }`}
            >
              فقط کالاهای موجود
            </button>
          </div>
        </div>

        {/* Product Grid / List - Fluid Widescreen */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 py-12">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="bg-slate-200 dark:bg-[#161619] rounded-2xl h-80 animate-pulse border border-slate-200 dark:border-[#222225]" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-12 text-center max-w-md mx-auto my-8 shadow-xs">
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
              className="bg-amber-50 dark:bg-[#1C1C20] hover:bg-amber-100 dark:hover:bg-[#222228] text-amber-800 dark:text-[#C9A227] text-xs font-bold px-4 py-2 rounded-xl border border-[#C9A227]/30 transition-colors cursor-pointer"
            >
              مشاهده تمامی محصولات
            </button>
          </div>
        ) : (
          <div className={
            websiteSettings?.catalogLayoutMode === 'list'
              ? "flex flex-col gap-3"
              : websiteSettings?.catalogLayoutMode === 'compact'
              ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3"
              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6"
          }>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                websiteSettings={websiteSettings}
                layoutMode={websiteSettings?.catalogLayoutMode || 'grid'}
                onQuickView={(p) => setSelectedProduct(p)}
              />
            ))}
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] flex items-center justify-center text-amber-600 dark:text-[#C9A227] font-bold text-sm">
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
      {currentTab === 'dashboard' && <DashboardView />}
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
