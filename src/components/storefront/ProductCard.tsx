import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Eye, Check, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Product, WebsiteSettings } from '../../types';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useToast } from '../common/Toast';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  websiteSettings?: WebsiteSettings | null;
  layoutMode?: 'grid' | 'list' | 'compact';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  websiteSettings,
  layoutMode = 'grid',
}) => {
  const { addToCart, cart } = useCart();
  const { showToast } = useToast();

  const isOutOfStock = product.stock <= 0;
  const inCartItem = cart.find((i) => i.product.id === product.id);

  // Online display price: use priceShop2 (Torob/Online) or salePrice
  const displayPrice = product.priceShop2 || product.salePrice;
  const originalPrice = product.salePrice > displayPrice ? product.salePrice : 0;
  const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    showToast(`«${product.name}» به سبد خرید افزوده شد.`, 'success');
  };

  // Button Color Theme Styles
  const theme = websiteSettings?.buttonColorTheme || 'gold';
  const borderRadius = websiteSettings?.buttonBorderRadius || 'rounded-xl';

  const getThemeButtonClasses = () => {
    if (isOutOfStock) {
      return 'bg-slate-100 dark:bg-[#1C1C20] text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-[#26262B]';
    }
    if (inCartItem) {
      return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-95';
    }
    switch (theme) {
      case 'amber':
        return 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/25 active:scale-95';
      case 'emerald':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 active:scale-95';
      case 'indigo':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 active:scale-95';
      case 'rose':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 active:scale-95';
      case 'slate':
        return 'bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-900/25 active:scale-95';
      case 'gold':
      default:
        return 'bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 shadow-md shadow-[#C9A227]/25 active:scale-95';
    }
  };

  if (layoutMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        onClick={() => onQuickView(product)}
        className={`group bg-white dark:bg-[#121316] ${borderRadius} border border-slate-200/80 dark:border-[#22232A] hover:border-[#C9A227]/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200 cursor-pointer shadow-xs`}
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-20 h-20 shrink-0 bg-slate-50 dark:bg-[#0C0D10] rounded-xl overflow-hidden p-2 flex items-center justify-center border border-slate-100 dark:border-[#1E1F26]">
            <img
              src={product.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80'}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-amber-700 dark:text-[#C9A227] font-semibold">
              {product.categoryName}
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6] line-clamp-1">
              {product.name}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-[#8E9299]">
              <span className="font-mono">کد: {product.code}</span>
              <span>{isOutOfStock ? '❌ ناموجود' : `موجودی: ${toPersianDigits(product.stock)} ${product.unit}`}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-[#1E1F26]">
          <div className="text-left">
            {originalPrice > 0 && (
              <div className="text-[11px] text-slate-400 line-through font-mono">{formatToman(originalPrice)}</div>
            )}
            <div className="text-base font-black text-slate-900 dark:text-[#F3F4F6] font-mono">{formatToman(displayPrice)}</div>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`px-4 py-2.5 ${borderRadius} font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${getThemeButtonClasses()}`}
          >
            {inCartItem ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>سبد ({toPersianDigits(inCartItem.quantity)})</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>خرید</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={() => onQuickView(product)}
      className={`group bg-white dark:bg-[#121316] ${borderRadius} border border-slate-200/80 dark:border-[#22232A] hover:border-[#C9A227]/60 dark:hover:border-[#C9A227]/50 hover:shadow-xl hover:shadow-[#C9A227]/5 dark:hover:shadow-black/60 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative text-slate-800 dark:text-[#E2E4E9]`}
    >
      {/* Badges */}
      {websiteSettings?.showProductBadges !== false && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
          {product.isSpecialOffer && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md shadow-rose-500/20 backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>تخفیف ویژه</span>
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-gradient-to-r from-[#DFB738] to-[#C9A227] text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md shadow-[#C9A227]/20">
              %{toPersianDigits(discountPercent)} تخفیف
            </span>
          )}
          {product.categoryName?.includes('دفتر') && (
            <span className="bg-amber-50 dark:bg-[#1A1A22] border border-[#C9A227]/30 text-amber-800 dark:text-[#C9A227] text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              تولید خطی‌نو
            </span>
          )}
          {/* Custom user-defined badges if applicable */}
          {websiteSettings?.customBadges?.filter(b => b.isEnabled).map((badge) => (
            <span
              key={badge.id}
              style={{ backgroundColor: badge.color, color: badge.textColor || '#ffffff' }}
              className="text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs"
            >
              {badge.title}
            </span>
          ))}
        </div>
      )}

      {/* Image container */}
      <div className="relative w-full aspect-square bg-slate-50/80 dark:bg-[#0C0D10] overflow-hidden flex items-center justify-center p-5 border-b border-slate-100 dark:border-[#1E1F26]">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
          loading="lazy"
        />

        {/* Multi-image gallery badge */}
        {(() => {
          const count = Array.from(new Set([product.image, ...(product.gallery || []), ...(product.extraImages || []), ...((product as any).extra_images || [])].filter(Boolean))).length;
          if (count > 1) {
            return (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-[#C9A227] text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#C9A227]/30 flex items-center gap-1 shadow-sm pointer-events-none">
                <ImageIcon className="w-3 h-3" />
                <span>{toPersianDigits(count)} عکس</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Quick view overlay button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className={`absolute inset-x-4 bottom-3.5 bg-white/95 dark:bg-[#18191E]/95 hover:bg-[#C9A227] hover:text-slate-950 dark:hover:bg-[#C9A227] dark:hover:text-slate-950 text-slate-900 dark:text-[#F3F4F6] text-xs font-bold py-2.5 ${borderRadius} backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg border border-slate-200/80 dark:border-[#2D2D35] cursor-pointer`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>مشاهده و بررسی</span>
        </button>
      </div>

      {/* Product info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="text-[11px] text-amber-700 dark:text-[#C9A227] font-semibold truncate">
            {product.categoryName} {product.subCategoryName ? `› ${product.subCategoryName}` : ''}
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6] line-clamp-2 leading-relaxed group-hover:text-amber-600 dark:group-hover:text-[#DFB738] transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Stock & Code */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8E9299]">
          <span className="font-mono">کد: {product.code}</span>
          {isOutOfStock ? (
            <span className="text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> ناموجود
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> {toPersianDigits(product.stock)} {product.unit} در انبار
            </span>
          )}
        </div>

        {/* Price and Cart button */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#1E1F26] flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {originalPrice > 0 && (
              <span className="text-[11px] text-slate-400 dark:text-[#8E9299] line-through font-mono">
                {formatToman(originalPrice)}
              </span>
            )}
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F3F4F6] tracking-tight">
              {formatToman(displayPrice)}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`p-2.5 sm:px-3.5 sm:py-2.5 ${borderRadius} transition-all font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${getThemeButtonClasses()}`}
            title={isOutOfStock ? 'ناموجود' : inCartItem ? 'در سبد موجود است (افزودن مجدد)' : 'افزودن به سبد خرید'}
          >
            {inCartItem ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span className="hidden sm:inline font-bold">({toPersianDigits(inCartItem.quantity)})</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline font-black">خرید</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

