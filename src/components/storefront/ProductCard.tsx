import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Eye, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Product, WebsiteSettings } from '../../types';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useToast } from '../common/Toast';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  websiteSettings?: WebsiteSettings | null;
  layoutMode?: 'grid' | 'list' | 'compact';
  large?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  websiteSettings,
  layoutMode = 'grid',
  large = false,
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

  // Dynamic ribbon assignment based on product attributes
  const getRibbonInfo = (): { text: string; color: string; textColor?: string } | null => {
    if (product.isSpecialOffer) return { text: 'پیشنهاد ویژه', color: 'var(--coral)' };
    if (discountPercent > 0) return { text: `${toPersianDigits(discountPercent)}٪ تخفیف`, color: 'var(--grape)' };
    if (product.categoryName?.includes('دفتر') || product.categoryName?.includes('مدرسه')) {
      return { text: 'تولید خطینو', color: 'var(--teal)' };
    }
    return null;
  };
  const ribbon = getRibbonInfo();
  const isSchoolItem = product.categoryName?.includes('مدرسه') || product.categoryName?.includes('کودک');

  const imagePaddingMap: Record<string, string> = {
    compact: 'p-3',
    normal: 'p-6',
    large: 'p-2',
  };
  const imagePadding = imagePaddingMap[websiteSettings?.productImageSize || 'normal'] || 'p-6';

  if (layoutMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        onClick={() => onQuickView(product)}
        className={`${isSchoolItem ? 'card-playful border-2' : 'rounded-2xl border'} group bg-white dark:bg-[#121316] border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] hover:border-[var(--teal)]/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200 cursor-pointer shadow-xs text-[var(--ink-charcoal)] dark:text-[#E2E4E9]`}
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-20 h-20 shrink-0 bg-[var(--paper)] dark:bg-[#0C0D10] rounded-xl overflow-hidden p-2 flex items-center justify-center border border-[var(--line-soft)] dark:border-[var(--line-soft-dark)]">
            <img
              src={product.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80'}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-[var(--teal)] font-bold">
              {product.categoryName} {product.subCategoryName ? `› ${product.subCategoryName}` : ''}
            </div>
            <h3 className="text-sm font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] line-clamp-1">
              {product.name}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-[#8E9299]">
              <span className="font-mono">کد: {product.code}</span>
              {isOutOfStock ? (
                <span className="text-rose-500 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> ناموجود
                </span>
              ) : (
                <span className="text-[var(--teal)] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> {toPersianDigits(product.stock)} {product.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--line-soft)] dark:border-[var(--line-soft-dark)]">
          <div className="text-left">
            {originalPrice > 0 && (
              <div className="text-[11px] text-slate-400 line-through font-mono">{formatToman(originalPrice)}</div>
            )}
            <div className="text-base font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] font-mono">{formatToman(displayPrice)}</div>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`px-4 py-2.5 rounded-full transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-100 dark:bg-[#1C1C20] text-slate-400 cursor-not-allowed'
                : inCartItem
                ? 'bg-[var(--teal)] text-white'
                : 'bg-[var(--coral)] hover:bg-[var(--coral-hover)] text-white shadow-md shadow-[var(--coral)]/25'
            }`}
          >
            {inCartItem ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>({toPersianDigits(inCartItem.quantity)})</span>
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
      className={`${isSchoolItem ? 'card-playful border-2' : 'rounded-2xl border'} group relative bg-white dark:bg-[#121316] border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer text-[var(--ink-charcoal)] dark:text-[#E2E4E9]`}
    >
      {ribbon && (
        <span className="ribbon-corner" style={{ background: ribbon.color, color: ribbon.textColor || '#ffffff' }}>
          {ribbon.text}
        </span>
      )}

      <div className={`relative w-full ${large ? 'aspect-[4/3]' : 'aspect-square'} bg-[var(--paper)] dark:bg-[#0C0D10] overflow-hidden flex items-center justify-center ${imagePadding} border-b border-[var(--line-soft)]/60 dark:border-[var(--line-soft-dark)]`}>
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
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/20 flex items-center gap-1 shadow-sm pointer-events-none">
                <ImageIcon className="w-3 h-3 text-[var(--sunshine)]" />
                <span>{toPersianDigits(count)} عکس</span>
              </div>
            );
          }
          return null;
        })()}

        <button
          onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
          className="absolute inset-x-4 bottom-3 bg-[var(--ink-charcoal)]/90 hover:bg-[var(--teal)] text-white text-xs font-bold py-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>مشاهده و بررسی</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="text-[11px] text-[var(--teal)] font-bold truncate">
            {product.categoryName} {product.subCategoryName ? `› ${product.subCategoryName}` : ''}
          </div>
          <h3 className={`${large ? 'text-lg sm:text-xl' : 'text-sm'} font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] line-clamp-2 leading-relaxed`}>
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8E9299]">
          <span className="font-mono">کد: {product.code}</span>
          {isOutOfStock ? (
            <span className="text-rose-500 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> ناموجود
            </span>
          ) : (
            <span className="text-[var(--teal)] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> {toPersianDigits(product.stock)} {product.unit}
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-[var(--line-soft)] dark:border-[var(--line-soft-dark)] flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {originalPrice > 0 && (
              <span className="text-[11px] text-slate-400 line-through font-mono">{formatToman(originalPrice)}</span>
            )}
            <span className="text-base sm:text-lg font-black text-[var(--ink-charcoal)] dark:text-[#F3F4F6] tracking-tight">
              {formatToman(displayPrice)}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-full transition-all font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-100 dark:bg-[#1C1C20] text-slate-400 cursor-not-allowed'
                : inCartItem
                ? 'bg-[var(--teal)] text-white shadow-md'
                : 'bg-[var(--coral)] hover:bg-[var(--coral-hover)] text-white shadow-md shadow-[var(--coral)]/25'
            }`}
          >
            {inCartItem ? (
              <><Check className="w-4 h-4" /><span className="hidden sm:inline font-bold">({toPersianDigits(inCartItem.quantity)})</span></>
            ) : (
              <><ShoppingBag className="w-4 h-4" /><span className="hidden sm:inline font-bold">خرید</span></>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

