import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SiteAdminLayout, SiteAdminTab } from './SiteAdminLayout';
import { SiteAdminLogin } from './SiteAdminLogin';
import { WebsiteManagerView } from '../admin/WebsiteManagerView';
import { ProductsView } from '../admin/ProductsView';
import { CategoriesUnitsView } from '../admin/CategoriesUnitsView';
import { TorobMarketView } from '../admin/TorobMarketView';
import { AiAssistantView } from '../admin/AiAssistantView';
import { AccessDeniedView } from '../common/AccessDeniedView';
import { ModulesManagerView } from './ModulesManagerView';
import { PageBuilderView } from './PageBuilderView';
import { MediaLibraryView } from './MediaLibraryView';
import { SmsGatewayView } from './SmsGatewayView';
import { PaymentGatewaysView } from './PaymentGatewaysView';
import { CouponsView } from './CouponsView';
import { ReviewsView } from './ReviewsView';
import { AuditLogsView } from './AuditLogsView';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import {
  Globe,
  ShoppingBag,
  Package,
  TrendingUp,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  Bot,
  Truck,
} from 'lucide-react';

interface SiteDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
  totalProducts: number;
  totalBanners: number;
}

const SiteAdminDashboard: React.FC<{ onNavigate: (tab: SiteAdminTab) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<SiteDashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    totalProducts: 0,
    totalBanners: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [ordersRes, productsRes, bannersRes] = await Promise.all([
          api.getOnlineOrders().catch(() => ({ orders: [] })),
          api.getProducts().catch(() => ({ products: [] })),
          api.getBanners().catch(() => ({ banners: [] })),
        ]);

        const orders = ordersRes.orders || [];
        const products = productsRes.products || [];
        const banners = bannersRes.banners || [];

        const pending = orders.filter((o: any) => o.status === 'processing' || o.status === 'paid').length;
        const totalSales = orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

        setStats({
          totalOrders: orders.length,
          pendingOrders: pending,
          totalSales,
          totalProducts: products.length,
          totalBanners: banners.length,
        });
      } catch (err) {
        console.error('Error fetching site dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-50 to-white dark:from-[#1C1C20] dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-md dark:shadow-2xl transition-colors">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <Globe className="w-4 h-4" />
            <span>مرکز کنترل و مدیریت وب‌سایت khatynoo.ir</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            داشبورد فروشگاه آنلاین خطی‌نو
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-xl leading-relaxed">
            مدیریت سفارشات آنلاین مشتریان، تنظیم اسلایدرها، نرخ‌گذاری و اتصال به ترب و موتور هوش مصنوعی تولید محتوا
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            onClick={() => onNavigate('orders')}
            className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-black" />
            <span>مشاهده سفارشات آنلاین</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-5 rounded-2xl space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8E9299]">
            <span className="text-xs font-semibold">سفارشات جدید و در حال پردازش</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            {loading ? '...' : toPersianDigits(stats.pendingOrders)} <span className="text-xs text-slate-500 dark:text-[#8E9299] font-normal">سفارش</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400">نیازمند بسته‌بندی و صدور بارکد پستی</div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-5 rounded-2xl space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8E9299]">
            <span className="text-xs font-semibold">فروش کل آنلاین</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : formatToman(stats.totalSales)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-[#8E9299]">از طریق درگاه زرین‌پال و بانک ملت</div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-5 rounded-2xl space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8E9299]">
            <span className="text-xs font-semibold">کالاهای فعال در سایت</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            {loading ? '...' : toPersianDigits(stats.totalProducts)} <span className="text-xs text-slate-500 dark:text-[#8E9299] font-normal">قلم کالا</span>
          </div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400">موجودی همگام با انبار اصلی فروشگاه</div>
        </div>

        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] p-5 rounded-2xl space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8E9299]">
            <span className="text-xs font-semibold">بنرهای فعال صفحه اول</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[#C9A227] flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            {loading ? '...' : toPersianDigits(stats.totalBanners)} <span className="text-xs text-slate-500 dark:text-[#8E9299] font-normal">اسلایدر</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-[#C9A227]">کمپین‌های تخفیفی و مناسبتی</div>
        </div>
      </div>

      {/* Quick Launchpad */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-[#F3F4F6]">دسترسی‌های سریع مدیریت سایت:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('orders')}
            className="p-4 bg-white dark:bg-[#111113] hover:bg-slate-50 dark:hover:bg-[#161619] border border-slate-200 dark:border-[#222225] hover:border-[#C9A227]/40 rounded-2xl text-right transition-all flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-[#F3F4F6] group-hover:text-amber-600 dark:group-hover:text-[#C9A227] transition-colors">ثبت کد رهگیری پستی</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">ارسال پیامک بارکد به خریدار</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-[#8E9299] group-hover:text-[#C9A227] -rotate-180 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('banners')}
            className="p-4 bg-white dark:bg-[#111113] hover:bg-slate-50 dark:hover:bg-[#161619] border border-slate-200 dark:border-[#222225] hover:border-[#C9A227]/40 rounded-2xl text-right transition-all flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#C9A227] flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-[#F3F4F6] group-hover:text-amber-600 dark:group-hover:text-[#C9A227] transition-colors">افزودن اسلایدر جدید</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">تنظیم بنر تخفیف و تولیدات</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-[#8E9299] group-hover:text-[#C9A227] -rotate-180 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('torob')}
            className="p-4 bg-white dark:bg-[#111113] hover:bg-slate-50 dark:hover:bg-[#161619] border border-slate-200 dark:border-[#222225] hover:border-[#C9A227]/40 rounded-2xl text-right transition-all flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-[#F3F4F6] group-hover:text-amber-600 dark:group-hover:text-[#C9A227] transition-colors">رصد و تنظیم قیمت ترب</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">پیشنهاد هوشمند سود و رقابت</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-[#8E9299] group-hover:text-[#C9A227] -rotate-180 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('ai_content')}
            className="p-4 bg-white dark:bg-[#111113] hover:bg-slate-50 dark:hover:bg-[#161619] border border-slate-200 dark:border-[#222225] hover:border-[#C9A227]/40 rounded-2xl text-right transition-all flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-[#F3F4F6] group-hover:text-amber-600 dark:group-hover:text-[#C9A227] transition-colors">دستیار هوش مصنوعی Gemini</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8E9299]">تولید توضیحات کالا و سئو</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-[#8E9299] group-hover:text-[#C9A227] -rotate-180 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const SiteAdminPortal: React.FC = () => {
  const { user, isLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  const currentTab: SiteAdminTab = (tab as SiteAdminTab) || 'dashboard';

  const handleTabChange = (newTab: SiteAdminTab) => {
    navigate(`/adminsite/${newTab}`);
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
    return <SiteAdminLogin />;
  }

  // Role Access Control: Only admin and site_manager can access /adminsite
  const isSiteAdminAllowed = hasRole(['admin', 'site_manager']);

  if (!isSiteAdminAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] flex items-center justify-center p-4">
        <AccessDeniedView
          currentRole={user.role}
          requiredRoles={['admin', 'site_manager']}
          title="عدم دسترسی به پنل مدیریت فروشگاه آنلاین (/adminsite)"
          description="حساب کاربری شما اجازه دسترسی به تنظیمات سایت، اسلایدرها و درگاه‌ها را ندارد. لطفاً وارد پرتال صندوق و حسابداری شوید."
          redirectLabel="انتقال به پرتال صندوق و حسابداری (/admin)"
          onRedirect={() => navigate('/admin')}
        />
      </div>
    );
  }

  return (
    <SiteAdminLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      onBackToStore={() => navigate('/')}
      onGoToPosAdmin={() => navigate('/admin')}
    >
      {currentTab === 'dashboard' && <SiteAdminDashboard onNavigate={handleTabChange} />}
      {currentTab === 'modules' && <ModulesManagerView />}
      {currentTab === 'page_builder' && <PageBuilderView />}
      {currentTab === 'media_library' && <MediaLibraryView />}
      {currentTab === 'sms_gateway' && <SmsGatewayView />}
      {currentTab === 'orders' && <WebsiteManagerView initialTab="orders" />}
      {currentTab === 'products' && <ProductsView />}
      {currentTab === 'banners' && <WebsiteManagerView initialTab="banners" />}
      {currentTab === 'categories' && <CategoriesUnitsView />}
      {currentTab === 'coupons' && <CouponsView />}
      {currentTab === 'reviews' && <ReviewsView />}
      {currentTab === 'gateways_shipping' && <PaymentGatewaysView />}
      {currentTab === 'torob' && <TorobMarketView />}
      {currentTab === 'ai_content' && <AiAssistantView />}
      {currentTab === 'audit_logs' && <AuditLogsView />}
      {currentTab === 'settings' && <WebsiteManagerView initialTab="settings" />}
    </SiteAdminLayout>
  );
};
