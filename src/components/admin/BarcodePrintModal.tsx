import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Barcode, Layers } from 'lucide-react';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Product } from '../../types';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ isOpen, onClose, product }) => {
  const [printCount, setPrintCount] = useState(12);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeStoreName, setIncludeStoreName] = useState(true);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const labels = Array.from({ length: printCount });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-[#111113] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#222225] space-y-4 my-8 text-[#E0E0E0]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#222225]">
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-[#C9A227]" />
              <h3 className="text-sm font-black text-[#F3F4F6]">چاپ لیبل بارکد و اتیکت قیمت قفسه</h3>
            </div>
            <button onClick={onClose} className="p-1 text-[#8E9299] hover:text-[#E0E0E0] rounded-lg hover:bg-[#161619] transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#161619] p-3.5 rounded-2xl border border-[#222225]">
            <div>
              <label className="font-bold text-[#E0E0E0] block mb-1">تعداد برچسب چاپ:</label>
              <input
                type="number"
                min={1}
                max={100}
                value={printCount}
                onChange={(e) => setPrintCount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#0A0A0B] border border-[#2D2D33] rounded-xl p-2 font-mono font-bold text-center text-[#E0E0E0] focus:border-[#C9A227] outline-none"
              />
            </div>
            <div className="flex flex-col justify-center space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  className="rounded accent-[#C9A227]"
                />
                <span className="font-bold text-[#E0E0E0]">درج قیمت فروش</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStoreName}
                  onChange={(e) => setIncludeStoreName(e.target.checked)}
                  className="rounded accent-[#C9A227]"
                />
                <span className="font-bold text-[#E0E0E0]">درج عنوان «خطی‌نو»</span>
              </label>
            </div>
            <div className="flex items-center">
              <button
                onClick={handlePrint}
                className="w-full bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-black" />
                <span>ارسال به چاپگر لیبل</span>
              </button>
            </div>
          </div>

          {/* Preview Sheet */}
          <div className="p-4 bg-[#0A0A0B] rounded-2xl max-h-[350px] overflow-y-auto border border-[#222225]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {labels.map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs text-center space-y-1 font-mono text-[10px] text-slate-900"
                >
                  {includeStoreName && <div className="text-[9px] font-bold text-slate-600 font-sans">فروشگاه خطی‌نو</div>}
                  <div className="font-bold text-slate-900 line-clamp-1 font-sans text-xs">{product.name}</div>
                  <div className="w-full h-8 bg-slate-900 text-white rounded flex items-center justify-center font-mono tracking-widest text-[11px] select-none my-1">
                    ||| | |||| || | |||
                  </div>
                  <div className="text-[10px] text-slate-700 font-mono">{product.barcode || product.code}</div>
                  {includePrice && (
                    <div className="font-black text-slate-900 text-xs font-sans pt-0.5">
                      {formatToman(product.priceShop1 || product.salePrice)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
