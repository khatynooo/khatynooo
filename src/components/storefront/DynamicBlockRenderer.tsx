import React from 'react';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  TrendingUp,
  Calculator,
  Printer,
  ChevronLeft,
  Package,
  ArrowRight,
  ShieldCheck,
  Truck,
  Percent,
  Star,
  Info,
  BookOpen,
  Gift,
  Mail,
  Send,
  ExternalLink,
} from 'lucide-react';
import { PageBuilderBlock, Product, Category, Banner, WebsiteSettings, BlockItem } from '../../types';
import { BannerSlider } from './BannerSlider';
import { ProductCard } from './ProductCard';
import { toPersianDigits, formatToman } from '../../lib/utils';

interface DynamicBlockRendererProps {
  block: PageBuilderBlock;
  categories: Category[];
  products: Product[];
  banners: Banner[];
  websiteSettings: WebsiteSettings | null;
  onSelectCategory: (categoryId: string | null) => void;
  onOpenCalculator: () => void;
  onQuickView: (product: Product) => void;
}

const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'Sparkles': return <Sparkles className="w-5 h-5" />;
    case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
    case 'Layers': return <Layers className="w-5 h-5" />;
    case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5" />;
    case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />;
    case 'Truck': return <Truck className="w-5 h-5" />;
    case 'Percent': return <Percent className="w-5 h-5" />;
    case 'Star': return <Star className="w-5 h-5" />;
    case 'Printer': return <Printer className="w-5 h-5" />;
    case 'BookOpen': return <BookOpen className="w-5 h-5" />;
    case 'Gift': return <Gift className="w-5 h-5" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};

export const DynamicBlockRenderer: React.FC<DynamicBlockRendererProps> = ({
  block,
  categories,
  products,
  banners,
  websiteSettings,
  onSelectCategory,
  onOpenCalculator,
  onQuickView,
}) => {
  if (!block.isEnabled) return null;

  const { settings } = block;
  const heading = settings?.headingText || block.title;
  const subheading = settings?.subheadingText;
  const buttonText = settings?.buttonText || 'مشاهده و بررسی';
  const buttonPos = settings?.buttonPosition || 'center';
  const columns = settings?.columns || 4;
  const customItems = settings?.items && settings.items.length > 0 ? settings.items : null;

  const paddingClass =
    settings?.paddingY === 'none'
      ? 'py-0'
      : settings?.paddingY === 'small'
      ? 'py-2 sm:py-3'
      : settings?.paddingY === 'large'
      ? 'py-6 sm:py-8'
      : 'py-3 sm:py-4';

  switch (block.type) {
    // -------------------------------------------------------------------------
    // ۱. اسلایدر و بنرهای تبلیغاتی اصلی
    // -------------------------------------------------------------------------
    case 'banner_slider': {
      // If custom items are configured for the slider, use them as banners
      const activeBanners: Banner[] = customItems
        ? customItems.map((it, idx) => ({
            id: it.id || `sld_${idx}`,
            title: it.title,
            subtitle: it.subtitle || '',
            tag: it.badge || 'ویژه',
            image: it.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1600',
            link: it.linkUrl || '#products',
            isActive: true,
            sortOrder: idx + 1,
          }))
        : banners;

      if (activeBanners.length === 0) return null;

      return (
        <section key={block.id} className={`space-y-3 ${paddingClass}`}>
          {heading && heading !== 'اسلایدر و بنرهای تبلیغاتی اصلی' && (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
                  {heading}
                </h3>
                {subheading && (
                  <p className="text-xs text-slate-500 dark:text-[#8E9299] mt-0.5">{subheading}</p>
                )}
              </div>
            </div>
          )}
          <BannerSlider
            banners={activeBanners}
            onBannerClick={(b) => {
              if (b.link?.includes('category')) {
                const cat = categories.find((c) => b.link?.includes(c.id));
                if (cat) onSelectCategory(cat.id);
              } else if (b.link?.includes('service') || b.link?.includes('calculator')) {
                onOpenCalculator();
              }
            }}
          />
        </section>
      );
    }

    // -------------------------------------------------------------------------
    // ۲. نوار ویژگی‌ها و مزایای برتر
    // -------------------------------------------------------------------------
    case 'features_badges': {
      const defaultFeatures: BlockItem[] = [
        { id: 'f1', title: 'تولید اختصاصی خطی‌نو', subtitle: 'دفاتر مشق، سیمی و طراحی', icon: 'Sparkles', highlight: true },
        { id: 'f2', title: 'تضمین مناسب‌ترین قیمت', subtitle: 'همگام با بازار و قیمت ترب', icon: 'TrendingUp' },
        { id: 'f3', title: 'تنوع ۵۰۰۰+ قلم کالا', subtitle: 'برترین برندهای داخلی و وارداتی', icon: 'Layers' },
        { id: 'f4', title: 'ارسال سریع کشوری', subtitle: 'پیک روزانه و پست پیشتاز', icon: 'CheckCircle2' },
      ];
      const itemsToRender = customItems || defaultFeatures;

      return (
        <section key={block.id} className={`space-y-3 ${paddingClass}`}>
          {heading && heading !== 'نوار مزایا و ویژگی‌های برتر خطی‌نو' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#D1D5DB]">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>{heading}</span>
            </div>
          )}
          <div
            className={`grid gap-3 text-xs ${
              columns === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : columns === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {itemsToRender.map((feat) => (
              <div
                key={feat.id}
                className={`bg-white dark:bg-[#111113] border ${
                  feat.highlight
                    ? 'border-[#C9A227]/60 shadow-sm bg-gradient-to-l from-amber-500/5 to-transparent'
                    : 'border-slate-200 dark:border-[#222225]'
                } p-3.5 rounded-2xl flex items-center gap-3 shadow-xs hover:border-[#C9A227]/40 transition-colors`}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${
                    feat.highlight
                      ? 'bg-amber-500/20 text-amber-600 dark:text-[#C9A227]'
                      : 'bg-slate-100 dark:bg-[#1A1A1E] text-slate-700 dark:text-slate-300'
                  } flex items-center justify-center font-bold shrink-0`}
                >
                  {getIconComponent(feat.icon)}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 dark:text-[#F3F4F6] truncate flex items-center gap-1.5">
                    <span>{feat.title}</span>
                    {feat.badge && (
                      <span className="text-[9px] font-bold bg-[#C9A227]/20 text-amber-800 dark:text-[#C9A227] px-1.5 py-0.5 rounded-md shrink-0">
                        {feat.badge}
                      </span>
                    )}
                  </div>
                  {feat.subtitle && (
                    <div className="text-[11px] text-slate-500 dark:text-[#8E9299] truncate mt-0.5">
                      {feat.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    // -------------------------------------------------------------------------
    // ۳. شبکه دسته‌بندی‌های محبوب کالاها
    // -------------------------------------------------------------------------
    case 'category_grid':
      return (
        <section key={block.id} className={`space-y-4 ${paddingClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
                {heading || 'دسته‌بندی‌های محبوب کالاها'}
              </h3>
              {subheading && (
                <p className="text-xs text-slate-500 dark:text-[#8E9299] mt-0.5">{subheading}</p>
              )}
            </div>
            {buttonPos !== 'hidden' && (
              <button
                onClick={() => onSelectCategory(null)}
                className="text-xs font-bold text-amber-600 dark:text-[#C9A227] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{buttonText || 'مشاهده همه'}</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className={`grid gap-3 sm:gap-4 ${
              columns === 5
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6'
                : columns === 3
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : columns === 2
                ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6'
            }`}
          >
            {categories.slice(0, settings?.limitCount || 12).map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="p-4 bg-white dark:bg-[#111113] hover:bg-amber-50/50 dark:hover:bg-[#161619] border border-slate-200 dark:border-[#222225] hover:border-[#C9A227] rounded-2xl text-right transition-all flex flex-col justify-between gap-3 group cursor-pointer shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#C9A227] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#F3F4F6] group-hover:text-amber-600 dark:group-hover:text-[#C9A227] transition-colors">
                      {cat.name}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-[#8E9299] mt-0.5 font-mono">
                      {toPersianDigits(count)} قلم کالا
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      );

    // -------------------------------------------------------------------------
    // ۴. ویترین محصولات تولید اختصاصی خطی‌نو
    // -------------------------------------------------------------------------
    case 'featured_products': {
      const featuredList = products
        .filter((p) => {
          if (settings?.categoryId) return p.categoryId === settings.categoryId;
          return p.isFeatured || p.categoryName?.includes('دفتر') || p.categoryName?.includes('خطی‌نو');
        })
        .slice(0, settings?.limitCount || 12);

      if (featuredList.length === 0) return null;

      return (
        <section key={block.id} className={`space-y-4 ${paddingClass} border-t border-slate-200 dark:border-[#222225]`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-[#F3F4F6]">
                  {heading || 'تولیدات اختصاصی خطی‌نو'}
                </h3>
                {settings?.badgeText && (
                  <span className="text-[10px] font-bold bg-[#C9A227] text-black px-2 py-0.5 rounded-full">
                    {settings.badgeText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8E9299] mt-0.5">
                {subheading || 'دفاتر سیمی، یادداشت و طراحی تولیدشده با کاغذ اعلای ۸۰ گرم'}
              </p>
            </div>

            {buttonPos !== 'hidden' && (
              <div
                className={`flex ${
                  buttonPos === 'right'
                    ? 'justify-start'
                    : buttonPos === 'center'
                    ? 'justify-center'
                    : 'justify-end'
                }`}
              >
                <button
                  onClick={() => {
                    if (settings?.categoryId) {
                      onSelectCategory(settings.categoryId);
                    } else {
                      const notebookCat = categories.find((c) => c.name.includes('دفتر'));
                      if (notebookCat) onSelectCategory(notebookCat.id);
                    }
                  }}
                  className="bg-amber-50 dark:bg-[#1C1C20] hover:bg-amber-100 dark:hover:bg-[#25252B] text-amber-800 dark:text-[#C9A227] text-xs font-bold px-3.5 py-1.5 rounded-xl border border-[#C9A227]/30 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{buttonText || 'مشاهده همه تولیدات'}</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div
            className={`grid gap-4 sm:gap-6 ${
              columns === 2
                ? 'grid-cols-2'
                : columns === 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
            }`}
          >
            {featuredList.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
            ))}
          </div>
        </section>
      );
    }

    // -------------------------------------------------------------------------
    // ۵. پیشنهادات شگفت‌انگیز و تخفیف‌دار
    // -------------------------------------------------------------------------
    case 'special_offers': {
      const specialList = products
        .filter((p) => p.isSpecialOffer || (p.discountPercent && p.discountPercent > 0))
        .slice(0, settings?.limitCount || 12);

      if (specialList.length === 0) return null;

      return (
        <section
          key={block.id}
          className={`p-5 sm:p-6 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/30 rounded-3xl space-y-4 shadow-sm ${paddingClass}`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shadow-md">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-[#F3F4F6]">
                  {heading || 'تخفیف‌های ویژه و شگفت‌انگیز'}
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                  {subheading || 'فرصت محدود خرید لوازم‌تحریر با بیشترین تخفیف'}
                </p>
              </div>
            </div>

            {settings?.badgeText && (
              <span className="text-xs font-black bg-rose-500 text-white px-3 py-1 rounded-full animate-pulse">
                {settings.badgeText}
              </span>
            )}
          </div>

          <div
            className={`grid gap-4 ${
              columns === 2
                ? 'grid-cols-2'
                : columns === 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
            }`}
          >
            {specialList.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
            ))}
          </div>
        </section>
      );
    }

    // -------------------------------------------------------------------------
    // ۶. باکس محاسبه آنلاین قیمت خدمات چاپ، کپی و صحافی (CTA)
    // -------------------------------------------------------------------------
    case 'services_cta': {
      const defaultServiceItems: BlockItem[] = [
        { id: 's1', title: 'پرینت دیجیتال با دقت بالا', subtitle: 'سیاه سفید و رنگی انواع سایزها', icon: 'Printer' },
        { id: 's2', title: 'صحافی سیمی دوبل فلزی اعلا', subtitle: 'با طلق کریستالی ضخیم', icon: 'BookOpen' },
        { id: 's3', title: 'تخفیف دانشجویی و تیراژ بالا', subtitle: 'ارسال سریع به تمام دانشگاه‌ها', icon: 'Percent' },
      ];
      const serviceItems = customItems || defaultServiceItems;

      return (
        <section
          key={block.id}
          className={`bg-gradient-to-l from-slate-900 via-[#1C1C20] to-[#111113] text-white rounded-3xl p-6 sm:p-8 border border-[#C9A227]/40 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6 ${paddingClass}`}
        >
          <div className="space-y-3 z-10 text-right w-full lg:max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-[#C9A227]/20 border border-[#C9A227]/40 text-[#C9A227] px-3 py-1 rounded-full text-xs font-bold">
              <Printer className="w-3.5 h-3.5" />
              <span>{settings?.badgeText || 'مرکز تخصصی کپی و چاپ دیجیتال خطی‌نو'}</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white">
              {heading || 'محاسبه آنلاین قیمت چاپ جزوات، کتاب، کپی و فنرزنی'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {subheading ||
                'محاسبه دقیق هزینه پرینت سیاه و سفید و رنگی، انواع کاغذ ۷۰ و ۸۰ گرم، سیمی کردن دوبل و طلق در لحظه و ثبت سفارش بدون معطلی.'}
            </p>

            {/* Sub-items features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              {serviceItems.map((it) => (
                <div key={it.id} className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
                  <div className="text-[#C9A227] shrink-0">
                    {getIconComponent(it.icon)}
                  </div>
                  <div className="text-[11px] leading-tight">
                    <div className="font-bold text-white">{it.title}</div>
                    {it.subtitle && <div className="text-slate-400 text-[10px] mt-0.5">{it.subtitle}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`z-10 w-full lg:w-auto flex shrink-0 ${
              buttonPos === 'right'
                ? 'justify-start'
                : buttonPos === 'left'
                ? 'justify-end'
                : 'justify-center'
            }`}
          >
            <button
              onClick={onOpenCalculator}
              className="w-full lg:w-auto bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-[#C9A227]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-black" />
              <span>{buttonText || 'شروع محاسبه آنلاین قیمت کپی'}</span>
            </button>
          </div>
        </section>
      );
    }

    // -------------------------------------------------------------------------
    // ۷. بنر تبلیغاتی اختصاصی (Custom Promotional Banner)
    // -------------------------------------------------------------------------
    case 'custom_banner':
      return (
        <section
          key={block.id}
          className={`rounded-3xl overflow-hidden border border-slate-200 dark:border-[#222225] shadow-md relative min-h-[180px] sm:min-h-[240px] flex items-center justify-between p-6 sm:p-10 bg-cover bg-center ${paddingClass}`}
          style={{
            backgroundImage: settings?.bannerImageUrl
              ? `url(${settings.bannerImageUrl})`
              : 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
            backgroundColor: settings?.backgroundColor || undefined,
          }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
          <div className="relative z-10 space-y-2.5 text-right text-white max-w-xl">
            {settings?.badgeText && (
              <span className="text-[10px] font-bold bg-[#C9A227] text-slate-950 px-2.5 py-1 rounded-full inline-block">
                {settings.badgeText}
              </span>
            )}
            <h3 className="text-lg sm:text-2xl font-black text-white">{heading}</h3>
            {subheading && <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{subheading}</p>}

            {buttonPos !== 'hidden' && (
              <div className="pt-2">
                <a
                  href={settings?.buttonLink || '#products'}
                  className="inline-flex items-center gap-2 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-md"
                >
                  <span>{buttonText || 'مشاهده و خرید'}</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </section>
      );

    // -------------------------------------------------------------------------
    // ۸. بلوک متن خلاصه / توضیحات فروشگاه یا اطلاعیه سفارشی (Custom Text / HTML)
    // -------------------------------------------------------------------------
    case 'custom_text_html':
      return (
        <section
          key={block.id}
          className={`bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm text-right ${paddingClass}`}
          style={{
            backgroundColor: settings?.backgroundColor || undefined,
            color: settings?.textColor || undefined,
          }}
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[#C9A227]" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
              {heading || 'درباره و معرفی خطی‌نو'}
            </h3>
          </div>
          {subheading && (
            <p className="text-xs font-bold text-amber-700 dark:text-[#C9A227]">{subheading}</p>
          )}
          <div className="text-xs sm:text-sm text-slate-600 dark:text-[#B0B3B8] leading-relaxed">
            {settings?.customHtml ? (
              <div dangerouslySetInnerHTML={{ __html: settings.customHtml }} />
            ) : (
              <p>
                فروشگاه اینترنتی و حضوری خطی‌نو، مرجع تخصصی تامین لوازم‌تحریر، ملزومات اداری و مهندسی،
                تولید انواع دفاتر سیمی اختصاصی و ارائه خدمات دیجیتال چاپ و تکثیر در اصفهان و سراسر ایران.
              </p>
            )}
          </div>
          {buttonPos !== 'hidden' && settings?.buttonLink && (
            <div className="pt-2">
              <a
                href={settings.buttonLink}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#C9A227] hover:underline"
              >
                <span>{buttonText || 'اطلاعات بیشتر'}</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </section>
      );

    // -------------------------------------------------------------------------
    // ۹. بلوک عضویت در خبرنامه و باشگاه مشتریان (Newsletter)
    // -------------------------------------------------------------------------
    case 'newsletter':
      return (
        <section
          key={block.id}
          className={`bg-gradient-to-r from-amber-500/10 via-slate-900 to-[#111113] border border-[#C9A227]/30 rounded-3xl p-6 sm:p-8 text-white text-right space-y-4 shadow-lg ${paddingClass}`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-[#C9A227] text-xs font-bold">
                <Gift className="w-4 h-4" />
                <span>{settings?.badgeText || 'باشگاه مشتریان خطی‌نو'}</span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white">{heading || 'عضویت در خبرنامه تخفیف‌ها'}</h3>
              <p className="text-xs text-slate-300">{subheading || 'با ثبت شماره موبایل از جشنواره‌های فروش و کدهای تخفیف ویژه زودتر از همه باخبر شوید.'}</p>
            </div>

            <div className="w-full md:w-auto flex items-center gap-2">
              <input
                type="tel"
                placeholder="شماره موبایل (مثال: 0913...)"
                className="bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs px-4 py-2.5 rounded-xl w-full sm:w-64 focus:outline-none focus:border-[#C9A227]"
              />
              <button
                type="button"
                className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{buttonText || 'عضویت'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
};
