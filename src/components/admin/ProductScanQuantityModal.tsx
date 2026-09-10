import React, { useState, useEffect, useRef } from 'react';
import { Package, Hash, X, Check, Plus, Minus, AlertCircle, ShoppingCart } from 'lucide-react';
import { Product } from '../../types';
import { toPersianDigits, formatToman, toEnglishDigits } from '../../lib/utils';

export interface ProductScanQuantityModalProps {
  product: Product;
  mode?: 'unit' | 'box';
  targetType?: 'sales' | 'purchase';
  currentQtyInInvoice?: number;
  onConfirm: (quantity: number, boxInfo?: { boxCount: number; unitsPerBox: number }) => void;
  onCancel: () => void;
  confirmButtonText?: string;
}

export const ProductScanQuantityModal: React.FC<ProductScanQuantityModalProps> = ({
  product,
  mode: initialMode = 'unit',
  targetType = 'sales',
  currentQtyInInvoice = 0,
  onConfirm,
  onCancel,
  confirmButtonText = 'تأیید و اسکن بعدی',
}) => {
  const [mode, setMode] = useState<'unit' | 'box'>(initialMode);
  const [quantity, setQuantity] = useState<string>('1');
  const [boxCount, setBoxCount] = useState<string>('1');
  const [extraUnits, setExtraUnits] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxInputRef = useRef<HTMLInputElement>(null);

  const factor = Number(product.conversionFactor || 1);
  const hasBoxSupport = factor > 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'box') {
        boxInputRef.current?.focus();
        boxInputRef.current?.select();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [mode]);

  const handleStep = (delta: number) => {
    setError(null);
    const current = Math.max(1, Math.round(Number(toEnglishDigits(quantity)) || 1));
    const next = Math.max(1, current + delta);
    setQuantity(String(next));
  };

  const handleConfirm = () => {
    if (isSubmitting) return;

    if (mode === 'box') {
      const parsedBoxes = Math.max(0, Math.round(Number(toEnglishDigits(boxCount)) || 0));
      const parsedExtra = Math.max(0, Math.round(Number(toEnglishDigits(extraUnits)) || 0));
      const totalUnits = parsedBoxes * factor + parsedExtra;

      if (totalUnits <= 0) {
        setError('حداقل باید ۱ جعبه یا ۱ عدد وارد کنید.');
        return;
      }

      setIsSubmitting(true);
      onConfirm(totalUnits, { boxCount: parsedBoxes, unitsPerBox: factor });
    } else {
      const cleanVal = toEnglishDigits(quantity).trim();
      const parsedQty = Math.round(Number(cleanVal));

      if (!cleanVal || isNaN(parsedQty) || parsedQty <= 0) {
        setError('تعداد باید یک عدد معتبر بزرگتر از صفر باشد.');
        inputRef.current?.focus();
        return;
      }

      setIsSubmitting(true);
      onConfirm(parsedQty);
    }
  };

  // Keyboard navigation: Enter to confirm, Escape to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const displayPrice = targetType === 'purchase' ? product.buyPrice : (product.priceShop1 || product.salePrice);
  const priceLabel = targetType === 'purchase' ? 'قیمت خرید:' : 'قیمت فروش:';

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-quantity-title"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-150 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
          <div className="flex items-center gap-2 text-[#2563EB] font-black text-base" id="modal-quantity-title">
            <Hash className="w-5 h-5 text-[#2563EB]" />
            <span>ثبت تعداد کالا</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="بستن پنجره"
            className="text-[#64748B] hover:text-[#111827] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Information Card */}
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3.5 mb-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-[#111827] leading-snug">
                {product.name}
              </h4>
              <div className="text-xs text-[#64748B] font-mono">
                بارکد: {product.barcode || product.code}
              </div>
            </div>
            {hasBoxSupport && (
              <div className="flex gap-1 shrink-0 bg-white p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setMode('unit')}
                  className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    mode === 'unit' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  تکی ({product.unit || 'عدد'})
                </button>
                <button
                  type="button"
                  onClick={() => setMode('box')}
                  className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    mode === 'box' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  جعبه ({toPersianDigits(factor)} تایی)
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
            <div>
              <span className="text-[#64748B]">{priceLabel} </span>
              <span className="font-bold text-[#111827]">{formatToman(displayPrice)}</span>
            </div>
            <div className="text-left">
              <span className="text-[#64748B]">موجودی انبار: </span>
              <span className={`font-bold ${product.stock <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {toPersianDigits(product.stock)} {product.unit || 'عدد'}
              </span>
            </div>
          </div>

          {currentQtyInInvoice > 0 && (
            <div className="text-[11px] bg-blue-50 text-[#2563EB] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>
                در فاکتور فعلی: {toPersianDigits(currentQtyInInvoice)} {product.unit || 'عدد'} موجود است (تعداد جدید به آن اضافه خواهد شد).
              </span>
            </div>
          )}
        </div>

        {/* Input Controls */}
        {mode === 'box' ? (
          <div className="space-y-3 mb-4" onKeyDown={handleKeyDown}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111827] block">تعداد جعبه:</label>
                <input
                  ref={boxInputRef}
                  type="number"
                  min={0}
                  value={boxCount}
                  onChange={(e) => {
                    setError(null);
                    setBoxCount(e.target.value);
                  }}
                  className="w-full border-2 border-blue-200 focus:border-blue-600 rounded-xl p-3 font-mono font-black text-center text-xl outline-none text-[#111827] transition-all bg-blue-50/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111827] block">عدد اضافه:</label>
                <input
                  type="number"
                  min={0}
                  value={extraUnits}
                  onChange={(e) => {
                    setError(null);
                    setExtraUnits(e.target.value);
                  }}
                  className="w-full border-2 border-[#E2E8F0] focus:border-blue-600 rounded-xl p-3 font-mono font-black text-center text-xl outline-none text-[#111827] transition-all"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-2.5 text-center text-xs">
              <span className="text-[#64748B]">مجموع اضافه‌شونده: </span>
              <strong className="text-blue-700 font-mono font-black text-base">
                {toPersianDigits(
                  Math.max(0, Math.round(Number(toEnglishDigits(boxCount)) || 0)) * factor +
                  Math.max(0, Math.round(Number(toEnglishDigits(extraUnits)) || 0))
                )}
              </strong>{' '}
              <span className="font-bold text-[#111827]">{product.subUnit || 'عدد'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-4" onKeyDown={handleKeyDown}>
            <label className="text-xs font-bold text-[#111827] block text-center">
              تعداد مورد نظر ({product.unit || 'عدد'}):
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="کاهش تعداد"
              >
                <Minus className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={(e) => {
                  setError(null);
                  setQuantity(e.target.value);
                }}
                className="flex-1 border-2 border-blue-200 focus:border-blue-600 rounded-xl py-2.5 font-mono font-black text-center text-2xl outline-none text-[#111827] transition-all bg-blue-50/20 shadow-xs"
              />

              <button
                type="button"
                onClick={() => handleStep(1)}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="افزایش تعداد"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Validation Error */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-4 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-[#111827] text-xs transition-colors cursor-pointer"
          >
            انصراف (Esc)
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="flex-2 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-blue-300 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{confirmButtonText} (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
