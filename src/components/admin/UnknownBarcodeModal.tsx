import React from 'react';
import { AlertTriangle, RefreshCw, PlusCircle, X } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

interface UnknownBarcodeModalProps {
  barcode: string;
  onRetry: () => void;
  onQuickAdd: () => void;
  onCancel: () => void;
}

export const UnknownBarcodeModal: React.FC<UnknownBarcodeModalProps> = ({
  barcode,
  onRetry,
  onQuickAdd,
  onCancel,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-150 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
          <div className="flex items-center gap-2 text-amber-600 font-black text-base">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>بارکد ناشناخته</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="بستن"
            className="text-[#64748B] hover:text-[#111827] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#111827] mb-2 leading-relaxed">
          کالایی با بارکد زیر در سیستم یافت نشد:
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center mb-5">
          <span className="text-base font-black text-amber-900 font-mono tracking-wider">
            {barcode}
          </span>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onQuickAdd}
            className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ثبت محصول جدید با این بارکد</span>
          </button>

          <button
            type="button"
            onClick={onRetry}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#64748B]" />
            <span>تلاش مجدد و اسکن دوباره</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 rounded-xl text-[#64748B] hover:text-[#111827] font-bold text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};
