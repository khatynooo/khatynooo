import React, { useState, useEffect, useRef } from 'react';
import { Package, Hash, X, Check } from 'lucide-react';
import { Product } from '../../types';
import { toPersianDigits } from '../../lib/utils';

interface BoxScanQuantityModalProps {
  product: Product;
  mode: 'box' | 'unit'; // 'box' = بارکد جعبه اسکن شده، 'unit' = بارکد معمولی یا انتخاب دستی
  onConfirmBox?: (boxCount: number, extraUnits: number) => void;
  onConfirmUnit?: (quantity: number) => void;
  onCancel: () => void;
}

export const BoxScanQuantityModal: React.FC<BoxScanQuantityModalProps> = ({
  product,
  mode,
  onConfirmBox,
  onConfirmUnit,
  onCancel,
}) => {
  const [boxCount, setBoxCount] = useState<number | string>(1);
  const [extraUnits, setExtraUnits] = useState<number | string>(0);
  const [quantity, setQuantity] = useState<number | string>(1);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
      firstInputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const factor = Number(product.conversionFactor || 1);
  const parsedBoxCount = Math.max(0, Math.round(Number(boxCount) || 0));
  const parsedExtraUnits = Math.max(0, Math.round(Number(extraUnits) || 0));
  const parsedQuantity = Math.max(1, Math.round(Number(quantity) || 1));
  const totalUnits = parsedBoxCount * factor + parsedExtraUnits;

  const handleConfirm = () => {
    if (mode === 'box') {
      if (totalUnits <= 0) return; // حداقل باید یک چیزی اضافه شود
      onConfirmBox?.(parsedBoxCount, parsedExtraUnits);
    } else {
      onConfirmUnit?.(parsedQuantity);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2 text-indigo-700 font-black text-base">
            {mode === 'box' ? <Package className="w-5 h-5 text-indigo-600" /> : <Hash className="w-5 h-5 text-indigo-600" />}
            <span>{mode === 'box' ? 'بارکد جعبه اسکن شد' : 'تعداد کالا را وارد کنید'}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          کالا: <strong className="text-slate-900 font-bold">{product.name}</strong>
          {mode === 'box' && (
            <>
              <br />
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 inline-block">
                هر ۱ {product.unit || 'جعبه'} = {toPersianDigits(factor)} {product.subUnit || 'عدد'}
              </span>
            </>
          )}
        </p>

        {mode === 'box' ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">تعداد جعبه:</label>
              <input
                ref={firstInputRef}
                type="number"
                min={0}
                value={boxCount}
                onChange={(e) => setBoxCount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
                  if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
                }}
                className="w-full border-2 border-indigo-200 focus:border-indigo-600 rounded-xl p-3 font-mono font-black text-center text-xl outline-none text-slate-900 transition-all bg-indigo-50/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">عدد اضافه:</label>
              <input
                type="number"
                min={0}
                value={extraUnits}
                onChange={(e) => setExtraUnits(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
                  if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
                }}
                className="w-full border-2 border-slate-200 focus:border-indigo-600 rounded-xl p-3 font-mono font-black text-center text-xl outline-none text-slate-900 transition-all"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-bold text-slate-700 block">تعداد:</label>
            <input
              ref={firstInputRef}
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
                if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
              }}
              className="w-full border-2 border-indigo-200 focus:border-indigo-600 rounded-xl p-3 font-mono font-black text-center text-xl outline-none text-slate-900 transition-all bg-indigo-50/30"
            />
          </div>
        )}

        {mode === 'box' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center mb-5">
            <span className="text-xs text-slate-500 block mb-0.5">مجموع اضافه‌شونده به فاکتور:</span>
            <span className="text-lg font-black text-indigo-700 font-mono">{toPersianDigits(totalUnits)}</span>{' '}
            <span className="text-xs font-bold text-slate-700">{product.subUnit || 'عدد'}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs transition-colors cursor-pointer"
          >
            انصراف (Esc)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تایید و افزودن (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
