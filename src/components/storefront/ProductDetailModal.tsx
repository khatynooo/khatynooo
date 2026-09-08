import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  PackageCheck,
  Barcode,
  Layers,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  ZoomIn,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useToast } from '../common/Toast';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [selectedQty, setSelectedQty] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Extract all images safely
  const rawList = product
    ? [
        product.image,
        ...(Array.isArray((product as any).gallery) ? (product as any).gallery : []),
        ...(Array.isArray((product as any).extraImages) ? (product as any).extraImages : []),
        ...(Array.isArray((product as any).extra_images) ? (product as any).extra_images : []),
      ].filter((x): x is string => Boolean(x && typeof x === 'string' && x.trim()))
    : [];

  const allImages = Array.from(new Set(rawList));
  const activeImage = allImages[currentIndex] || product?.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80';

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedQty(1);
  }, [product?.id]);

  // Keyboard navigation for gallery & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!product) return;
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        // Next image in RTL
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
      } else if (e.key === 'ArrowLeft') {
        // Prev image in RTL
        setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, isLightboxOpen, allImages.length, onClose]);

  if (!product) return null;

  const displayPrice = product.priceShop2 || product.salePrice;
  const isOutOfStock = product.stock <= 0;

  const handleAdd = () => {
    addToCart(product, selectedQty);
    showToast(`${toPersianDigits(selectedQty)} عدد «${product.name}» به سبد خرید افزوده شد.`, 'success');
    onClose();
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#111113] rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-[var(--line-soft)] dark:border-[#26262D] relative my-6 text-[var(--ink-charcoal)] dark:text-[#E0E0E0]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-20 w-9 h-9 rounded-full bg-slate-100 dark:bg-[#1A1A20] hover:bg-slate-200 dark:hover:bg-[#25252D] text-slate-500 hover:text-slate-900 dark:text-[#8E9299] dark:hover:text-[#E0E0E0] border border-slate-200 dark:border-[#2D2D36] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Gallery Section (5 cols on md) */}
            <div className="md:col-span-6 p-6 bg-[var(--paper)] dark:bg-[#0B0B0D] flex flex-col justify-between items-center border-b md:border-b-0 md:border-l border-[var(--line-soft)] dark:border-[#222228] relative">
              {/* Main Image Stage */}
              <div className="relative w-full aspect-square bg-white dark:bg-[#151518] rounded-2xl p-4 flex items-center justify-center shadow-xs border border-[var(--line-soft)] dark:border-[#24242B] group overflow-hidden">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                  onClick={() => setIsLightboxOpen(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Lightbox / Zoom Button Overlay */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  title="مشاهده تصویر بزرگ و تمام صفحه"
                  className="absolute top-3 left-3 bg-black/60 hover:bg-[var(--coral)] text-white p-2 rounded-xl backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Image Counter Badge */}
                {allImages.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-md">
                    <ImageIcon className="w-3 h-3 text-[var(--sunshine)]" />
                    <span>
                      تصویر {toPersianDigits(currentIndex + 1)} از {toPersianDigits(allImages.length)}
                    </span>
                  </div>
                )}

                {/* Arrow Navigation (if > 1 image) */}
                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      title="تصویر قبلی"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-[var(--coral)] text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      title="تصویر بعدی"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-[var(--coral)] text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Gallery Strip */}
              {allImages.length > 1 && (
                <div className="w-full mt-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {allImages.map((img, idx) => {
                      const isSelected = idx === currentIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`relative w-14 h-14 rounded-xl border-2 p-1 bg-white dark:bg-[#151518] shrink-0 overflow-hidden transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-[var(--coral)] ring-2 ring-[var(--coral)]/30 scale-105 shadow-md shadow-[var(--coral)]/20'
                              : 'border-slate-200 dark:border-[#26262E] hover:border-slate-300 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`بندانگشتی ${idx + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80';
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Trust Badges */}
              <div className="w-full grid grid-cols-3 gap-2 mt-4 text-[11px] text-slate-500 dark:text-[#8E9299] text-center font-medium">
                <div className="bg-white dark:bg-[#151518] p-2 rounded-xl border border-[var(--line-soft)] dark:border-[#24242B] flex flex-col items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>ضمانت اصالت</span>
                </div>
                <div className="bg-white dark:bg-[#151518] p-2 rounded-xl border border-[var(--line-soft)] dark:border-[#24242B] flex flex-col items-center gap-1 shadow-xs">
                  <Truck className="w-4 h-4 text-[var(--teal)]" />
                  <span>ارسال سریع</span>
                </div>
                <div className="bg-white dark:bg-[#151518] p-2 rounded-xl border border-[var(--line-soft)] dark:border-[#24242B] flex flex-col items-center gap-1 shadow-xs">
                  <RotateCcw className="w-4 h-4 text-[var(--coral)]" />
                  <span>۷ روز مهلت عودت</span>
                </div>
              </div>
            </div>

            {/* Info Section (7 cols on md) */}
            <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-[var(--teal)] font-bold">
                  <span>{product.categoryName}</span>
                  {product.subCategoryName && <span>› {product.subCategoryName}</span>}
                </div>

                <h2 className="text-xl font-black text-slate-900 dark:text-[#F3F4F6] leading-snug">
                  {product.name}
                </h2>

                <p className="text-xs text-slate-600 dark:text-[#8E9299] leading-relaxed">
                  {product.description ||
                    'محصول باکیفیت و استاندارد عرضه شده در فروشگاه خطی‌نو مناسب برای مدارس، دانشگاه‌ها، دفاتر کار و امور اداری.'}
                </p>

                {/* Specs List */}
                <div className="bg-[var(--paper)] dark:bg-[#161619] rounded-2xl p-4 space-y-2 text-xs border border-[var(--line-soft)] dark:border-[#24242B]">
                  <div className="flex justify-between py-1 border-b border-[var(--line-soft)] dark:border-[#222228]">
                    <span className="text-slate-500 dark:text-[#8E9299]">کد محصول:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-[#E0E0E0]">{product.code}</span>
                  </div>
                  {product.barcode && (
                    <div className="flex justify-between py-1 border-b border-[var(--line-soft)] dark:border-[#222228]">
                      <span className="text-slate-500 dark:text-[#8E9299]">بارکد استاندارد:</span>
                      <span className="font-mono text-slate-800 dark:text-[#E0E0E0] flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-[var(--teal)]" />
                        {product.barcode}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-[var(--line-soft)] dark:border-[#222228]">
                    <span className="text-slate-500 dark:text-[#8E9299]">واحد سنجش:</span>
                    <span className="font-bold text-slate-800 dark:text-[#E0E0E0]">
                      {product.unit}{' '}
                      {product.subUnit
                        ? `(شامل ${toPersianDigits(product.conversionFactor)} ${product.subUnit})`
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 dark:text-[#8E9299]">وضعیت موجودی انبار:</span>
                    {isOutOfStock ? (
                      <span className="text-rose-500 font-bold">ناموجود</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5" />
                        {toPersianDigits(product.stock)} {product.unit} موجود در انبار
                      </span>
                    )}
                  </div>
                </div>

                {/* Multi-tier Wholesale Info */}
                {product.wholesalePrice > 0 && product.wholesalePrice < displayPrice && (
                  <div className="bg-[var(--teal)]/10 border border-[var(--teal)]/30 rounded-xl p-3 text-xs text-slate-800 dark:text-[#E0E0E0] flex items-start gap-2">
                    <Layers className="w-4 h-4 text-[var(--teal)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[var(--teal)]">تخفیف سفارش‌های عمده و مدارس:</div>
                      <div className="text-slate-600 dark:text-[#8E9299]">
                        قیمت عمده: {formatToman(product.wholesalePrice)} (برای خرید بالای ۲۰ عدد)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price & Quantity & Action */}
              <div className="pt-4 border-t border-[var(--line-soft)] dark:border-[#24242B] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-[var(--paper)] dark:bg-[#161619] rounded-xl p-1 border border-[var(--line-soft)] dark:border-[#2D2D33]">
                    <button
                      onClick={() => setSelectedQty((prev) => Math.max(1, prev - 1))}
                      disabled={selectedQty <= 1 || isOutOfStock}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-[#1C1C20] text-slate-700 dark:text-[#E0E0E0] hover:bg-slate-100 dark:hover:bg-[#25252A] flex items-center justify-center font-bold text-sm disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-slate-900 dark:text-[#F3F4F6]">
                      {toPersianDigits(selectedQty)}
                    </span>
                    <button
                      onClick={() => setSelectedQty((prev) => Math.min(product.stock, prev + 1))}
                      disabled={selectedQty >= product.stock || isOutOfStock}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-[#1C1C20] text-slate-700 dark:text-[#E0E0E0] hover:bg-slate-100 dark:hover:bg-[#25252A] flex items-center justify-center font-bold text-sm disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-left">
                    <div className="text-xs text-slate-500 dark:text-[#8E9299]">قیمت واحد آنلاین:</div>
                    <div className="text-xl font-black text-slate-900 dark:text-[#F3F4F6] font-mono">
                      {formatToman(displayPrice)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className={`w-full py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    isOutOfStock
                      ? 'bg-slate-200 dark:bg-[#1C1C20] text-slate-400 dark:text-[#8E9299] cursor-not-allowed'
                      : 'bg-[var(--coral)] hover:bg-[var(--coral-hover)] active:scale-98 text-white shadow-[var(--coral)]/20 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5 text-white" />
                  <span>
                    {isOutOfStock
                      ? 'در حال حاضر ناموجود است'
                      : `افزودن به سبد خرید • ${formatToman(displayPrice * selectedQty)}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fullscreen Lightbox Modal */}
        {isLightboxOpen && (
          <div
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 cursor-zoom-out"
          >
            {/* Top Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex items-center justify-between text-white border-b border-white/10 pb-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#F3F4F6]">{product.name}</span>
                {allImages.length > 1 && (
                  <span className="bg-[var(--coral)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    تصویر {toPersianDigits(currentIndex + 1)} از {toPersianDigits(allImages.length)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Canvas */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2"
            >
              <img
                src={activeImage}
                alt={product.name}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />

              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-[var(--coral)] text-white flex items-center justify-center transition-all cursor-pointer shadow-xl border border-white/10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-[var(--coral)] text-white flex items-center justify-center transition-all cursor-pointer shadow-xl border border-white/10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnails */}
            {allImages.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl flex items-center justify-center gap-2 pt-3 border-t border-white/10 overflow-x-auto pb-1"
              >
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-14 h-14 rounded-xl border-2 p-1 bg-black/50 shrink-0 overflow-hidden transition-all cursor-pointer ${
                      idx === currentIndex ? 'border-[var(--coral)] scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
