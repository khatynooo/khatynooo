import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Check, ShieldCheck, Truck, RotateCcw, PackageCheck, Barcode, Layers } from 'lucide-react';
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
  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (!product) return null;

  const currentImg = activeImage || product.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80';
  const displayPrice = product.priceShop2 || product.salePrice;
  const isOutOfStock = product.stock <= 0;

  const handleAdd = () => {
    addToCart(product, selectedQty);
    showToast(`${toPersianDigits(selectedQty)} عدد «${product.name}» به سبد خرید افزوده شد.`, 'success');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#111113] rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-[#222225] relative my-8 text-[#E0E0E0]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-10 w-9 h-9 rounded-full bg-[#161619] hover:bg-[#1F1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery Section */}
            <div className="p-6 bg-[#0A0A0B] flex flex-col justify-between items-center border-b md:border-b-0 md:border-l border-[#222225]">
              <div className="w-full aspect-square bg-[#161619] rounded-2xl p-4 flex items-center justify-center shadow-inner border border-[#222225]">
                <img
                  src={currentImg}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Thumbnails */}
              {product.gallery && product.gallery.length > 0 && (
                <div className="flex items-center gap-2 mt-4 overflow-x-auto w-full pb-2">
                  <button
                    onClick={() => setActiveImage(product.image)}
                    className={`w-14 h-14 rounded-xl border-2 p-1 bg-[#161619] shrink-0 overflow-hidden ${
                      currentImg === product.image ? 'border-[#C9A227]' : 'border-[#222225]'
                    }`}
                  >
                    <img src={product.image} alt="" className="w-full h-full object-contain" />
                  </button>
                  {product.gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`w-14 h-14 rounded-xl border-2 p-1 bg-[#161619] shrink-0 overflow-hidden ${
                        currentImg === img ? 'border-[#C9A227]' : 'border-[#222225]'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Product Badges */}
              <div className="w-full grid grid-cols-3 gap-2 mt-4 text-[11px] text-[#8E9299] text-center font-medium">
                <div className="bg-[#161619] p-2 rounded-xl border border-[#222225] flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ضمانت اصالت</span>
                </div>
                <div className="bg-[#161619] p-2 rounded-xl border border-[#222225] flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-[#C9A227]" />
                  <span>ارسال سریع</span>
                </div>
                <div className="bg-[#161619] p-2 rounded-xl border border-[#222225] flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>۷ روز مهلت عودت</span>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-[#C9A227] font-bold">
                  <span>{product.categoryName}</span>
                  {product.subCategoryName && <span>› {product.subCategoryName}</span>}
                </div>

                <h2 className="text-xl font-black text-[#F3F4F6] leading-snug">
                  {product.name}
                </h2>

                <p className="text-xs text-[#8E9299] leading-relaxed">
                  {product.description || 'محصول باکیفیت و استاندارد عرضه شده در فروشگاه خطی‌نو مناسب برای مدارس، دانشگاه‌ها، دفاتر کار و امور اداری.'}
                </p>

                {/* Specs List */}
                <div className="bg-[#161619] rounded-2xl p-4 space-y-2 text-xs border border-[#222225]">
                  <div className="flex justify-between py-1 border-b border-[#222225]">
                    <span className="text-[#8E9299]">کد محصول:</span>
                    <span className="font-mono font-bold text-[#E0E0E0]">{product.code}</span>
                  </div>
                  {product.barcode && (
                    <div className="flex justify-between py-1 border-b border-[#222225]">
                      <span className="text-[#8E9299]">بارکد استاندارد:</span>
                      <span className="font-mono text-[#E0E0E0] flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-[#C9A227]" />
                        {product.barcode}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-[#222225]">
                    <span className="text-[#8E9299]">واحد سنجش:</span>
                    <span className="font-bold text-[#E0E0E0]">
                      {product.unit} {product.subUnit ? `(شامل ${toPersianDigits(product.conversionFactor)} ${product.subUnit})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8E9299]">وضعیت موجودی انبار:</span>
                    {isOutOfStock ? (
                      <span className="text-rose-400 font-bold">ناموجود</span>
                    ) : (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5" />
                        {toPersianDigits(product.stock)} {product.unit} موجود
                      </span>
                    )}
                  </div>
                </div>

                {/* Multi-tier Wholesale Info for Institutions & Schools */}
                {product.wholesalePrice > 0 && product.wholesalePrice < displayPrice && (
                  <div className="bg-[#1C1C20] border border-[#C9A227]/30 rounded-xl p-3 text-xs text-[#E0E0E0] flex items-start gap-2">
                    <Layers className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#C9A227]">تخفیف ویژه سفارش‌های تیراژ بالا / مدارس و همکاران:</div>
                      <div className="text-[#8E9299]">قیمت عمده: {formatToman(product.wholesalePrice)} (برای خرید بالای ۲۰ عدد)</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price & Quantity & Action */}
              <div className="pt-4 border-t border-[#222225] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-[#161619] rounded-xl p-1 border border-[#2D2D33]">
                    <button
                      onClick={() => setSelectedQty((prev) => Math.max(1, prev - 1))}
                      disabled={selectedQty <= 1 || isOutOfStock}
                      className="w-8 h-8 rounded-lg bg-[#1C1C20] text-[#E0E0E0] hover:bg-[#25252A] flex items-center justify-center font-bold text-sm disabled:opacity-40 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-[#F3F4F6]">
                      {toPersianDigits(selectedQty)}
                    </span>
                    <button
                      onClick={() => setSelectedQty((prev) => Math.min(product.stock, prev + 1))}
                      disabled={selectedQty >= product.stock || isOutOfStock}
                      className="w-8 h-8 rounded-lg bg-[#1C1C20] text-[#E0E0E0] hover:bg-[#25252A] flex items-center justify-center font-bold text-sm disabled:opacity-40 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-left">
                    <div className="text-xs text-[#8E9299]">قیمت واحد آنلاین:</div>
                    <div className="text-xl font-black text-[#F3F4F6]">{formatToman(displayPrice)}</div>
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    isOutOfStock
                      ? 'bg-[#1C1C20] text-[#8E9299] cursor-not-allowed'
                      : 'bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 shadow-[#C9A227]/20 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5 text-black" />
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
      </div>
    </AnimatePresence>
  );
};
