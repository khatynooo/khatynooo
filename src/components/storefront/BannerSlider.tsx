import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles, ArrowLeft } from 'lucide-react';
import { Banner } from '../../types';

interface BannerSliderProps {
  banners: Banner[];
  onBannerClick?: (banner: Banner) => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ banners, onBannerClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeBanners = banners.filter((b) => b.isActive);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  if (!activeBanners.length) return null;

  const current = activeBanners[currentIndex];

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-slate-900 dark:bg-[#0E0F12] border border-slate-200/80 dark:border-[#22232A] aspect-[21/9] sm:aspect-[28/9] min-h-[220px] max-h-[440px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={current.imageUrl}
            alt={current.title}
            className="w-full h-full object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent flex items-center">
            <div className="p-6 sm:p-10 lg:p-14 max-w-2xl text-right space-y-3.5">
              <div className="inline-flex items-center gap-1.5 bg-[#C9A227]/25 text-[#DFB738] border border-[#C9A227]/40 text-[11px] sm:text-xs font-black px-3 py-1 rounded-full backdrop-blur-md shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#DFB738]" />
                <span>پیشنهاد ویژه و جشنواره خطی‌نو</span>
              </div>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-md tracking-tight">
                {current.title}
              </h2>
              {current.subtitle && (
                <p className="text-xs sm:text-sm text-slate-300 dark:text-[#A0A4AB] line-clamp-2 leading-relaxed font-normal">
                  {current.subtitle}
                </p>
              )}
              {current.link && (
                <button
                  onClick={() => onBannerClick && onBannerClick(current)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#DFB738] to-[#C9A227] hover:from-[#C9A227] hover:to-[#B38E1E] text-slate-950 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#C9A227]/25 active:scale-95 cursor-pointer mt-2"
                >
                  <span>مشاهده و خرید آنلاین</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/15 cursor-pointer hover:scale-105 active:scale-95 shadow-md"
            aria-label="بنر قبلی"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % activeBanners.length)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/15 cursor-pointer hover:scale-105 active:scale-95 shadow-md"
            aria-label="بنر بعدی"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {activeBanners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`اسلاید ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx ? 'w-7 bg-[#C9A227] shadow-sm shadow-[#C9A227]/50' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
