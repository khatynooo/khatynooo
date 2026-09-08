import React from 'react';
import { Category } from '../../types';
import { ChevronLeft } from 'lucide-react';

interface CategoryShowcaseProps {
  categories: Category[];
  onSelect: (id: string) => void;
}

// رنگ‌های پس‌زمینهٔ ملایم برای هر کاشی (چرخشی، برای تنوع بصری)
const TILE_TINTS = [
  'from-[var(--coral)]/20 to-[var(--coral)]/5',
  'from-[var(--teal)]/20 to-[var(--teal)]/5',
  'from-[var(--grape)]/20 to-[var(--grape)]/5',
];

// تصاویر واقعی عکاسی حرفه‌ای نوشت‌افزار و دفاتر برای دسته‌بندی‌ها در صورت عدم آپلود تصویر اختصاصی
const DEFAULT_CATEGORY_IMAGES = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&auto=format&fit=crop&q=80', // دفاتر مشق، کلاسور و کاغذ
  'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=900&auto=format&fit=crop&q=80', // خودکار، روان‌نویس و ماژیک
  'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=900&auto=format&fit=crop&q=80', // لوازم طراحی، مهندسی و اداری
];

export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ categories, onSelect }) => {
  const top = categories.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section className="space-y-4 my-2" id="category-showcase">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] tracking-tight">
          دسته‌بندی‌های محبوب
        </h2>
      </div>

      {/* گرید نامتقارن: یک کاشی بزرگ عمودی + دو کاشی افقی شیک */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <button
          onClick={() => onSelect(top[0].id)}
          className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${TILE_TINTS[0]} min-h-[280px] sm:min-h-[320px] sm:row-span-2 flex flex-col justify-end p-7 text-right transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-xl hover:shadow-black/5 cursor-pointer border border-[var(--line-soft)] dark:border-[#222225]`}
        >
          <img
            src={top[0].image || DEFAULT_CATEGORY_IMAGES[0]}
            alt={top[0].name}
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />
          <div className="relative z-[1] space-y-1.5">
            <h3 className="text-white text-xl sm:text-2xl font-black drop-shadow-sm">{top[0].name}</h3>
            <span className="text-white/90 text-sm flex items-center gap-1 font-bold">
              مشاهدهٔ محصولات <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </span>
          </div>
        </button>

        <div className="grid grid-cols-1 sm:grid-rows-2 gap-4 sm:gap-5">
          {top.slice(1, 3).map((cat, i) => {
            const img = cat.image || DEFAULT_CATEGORY_IMAGES[i + 1] || DEFAULT_CATEGORY_IMAGES[0];
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${TILE_TINTS[i + 1]} min-h-[135px] flex items-center justify-between p-6 text-right transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-xl hover:shadow-black/5 cursor-pointer border border-[var(--line-soft)] dark:border-[#222225]`}
              >
                <img
                  src={img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />
                <h3 className="relative z-[1] text-white text-lg font-black drop-shadow-sm">{cat.name}</h3>
                <span className="relative z-[1] w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                  <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
