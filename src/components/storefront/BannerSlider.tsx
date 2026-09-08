import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Banner, WebsiteSettings } from '../../types';

interface BannerSliderProps {
  banners: Banner[];
  onBannerClick?: (banner: Banner) => void;
  websiteSettings?: WebsiteSettings | null;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ banners, onBannerClick, websiteSettings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeBanners = banners.filter((b) => b.isActive);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => setCurrentIndex((p) => (p + 1) % activeBanners.length), 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  if (!activeBanners.length) return null;
  const current = activeBanners[currentIndex];
  const bannerImage = current.imageUrl || (current as any).image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1600';
  const eyebrowText = (current as any).eyebrow || current.tag || 'خطی‌نو';

  const heightMap: Record<string, string> = {
    compact: 'min-h-[200px] sm:min-h-[260px]',
    normal: 'min-h-[280px] sm:min-h-[360px]',
    tall: 'min-h-[360px] sm:min-h-[460px]',
  };
  const heroHeightClass = heightMap[websiteSettings?.heroHeight || 'normal'] || heightMap.normal;

  return (
    <div className={`hero-blob-bg relative w-full rounded-[28px] overflow-hidden border border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] bg-[var(--paper)] dark:bg-[#0F1116] ${heroHeightClass} grid grid-cols-1 sm:grid-cols-2`}>
      <div className="relative z-[1] flex flex-col justify-center gap-4 p-8 sm:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <span className="inline-block text-xs font-black text-[var(--coral)] bg-[var(--coral)]/10 px-3 py-1 rounded-full w-fit">
              {eyebrowText}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] leading-[1.25] tracking-tight max-w-md">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="text-sm text-slate-600 dark:text-[#A0A4AB] leading-relaxed max-w-sm">
                {current.subtitle}
              </p>
            )}
            <div className="flex items-center gap-3 pt-1">
              {current.link && (
                <button
                  onClick={() => onBannerClick && onBannerClick(current)}
                  className="bg-[var(--coral)] hover:bg-[var(--coral-hover)] text-white font-bold text-sm px-6 py-3 rounded-full transition-all shadow-lg shadow-[var(--coral)]/25 cursor-pointer active:scale-95"
                >
                  مشاهده و خرید
                </button>
              )}
              <button
                onClick={() => {
                  const el = document.getElementById('storefront-products-section') || document.getElementById('header-nav-categories');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-sm font-bold text-[var(--teal)] hover:underline underline-offset-4 cursor-pointer"
              >
                همهٔ محصولات
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="hidden sm:block relative z-[1] p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/10"
          >
            <img src={bannerImage} alt={current.title} className="w-full h-full object-cover" />
          </motion.div>
        </AnimatePresence>
      </div>

      {activeBanners.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0 flex gap-1.5 z-[2]">
          {activeBanners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setCurrentIndex(i)}
              aria-label={`اسلاید ${i + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === currentIndex ? 'w-6 bg-[var(--coral)]' : 'w-1.5 bg-[var(--line-soft)] dark:bg-[var(--line-soft-dark)]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
