import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Calculator, FileText, Check, Phone } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';

interface ServicesCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServicesCalculatorModal: React.FC<ServicesCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [paperSize, setPaperSize] = useState('A4');
  const [colorType, setColorType] = useState('bw');
  const [printSide, setPrintSide] = useState('single');
  const [paperWeight, setPaperWeight] = useState('80g');
  const [pageCount, setPageCount] = useState<number>(20);
  const [copyCount, setCopyCount] = useState<number>(1);
  const [bindingType, setBindingType] = useState('none');
  const [calculation, setCalculation] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function calc() {
      try {
        const data = await api.calculatePrintCost({
          paperSize,
          colorType,
          printSide,
          paperWeight,
          pageCount,
          copyCount,
          bindingType,
        });
        setCalculation(data.calculation);
      } catch (err) {
        console.error(err);
      }
    }
    calc();
  }, [isOpen, paperSize, colorType, printSide, paperWeight, pageCount, copyCount, bindingType]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#111113] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#222225] relative my-8 text-[#E0E0E0]"
        >
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 text-[#8E9299] hover:text-[#E0E0E0] rounded-full hover:bg-[#161619] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A227] text-black flex items-center justify-center shadow-md shadow-[#C9A227]/20 font-black">
              <Printer className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#F3F4F6]">ماشین حساب آنلاین خدمات تکثیر، کپی و پرینت خطی‌نو</h3>
              <p className="text-xs text-[#8E9299]">محاسبه دقیق تعرفه کپی سیاه و سفید، رنگی، صحافی سیمی و گالینگور</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Options */}
            <div className="space-y-4 text-xs">
              {/* Paper Size */}
              <div>
                <label className="font-bold text-[#E0E0E0] block mb-1.5">قطع و سایز کاغذ:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['A4', 'A3', 'A5'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPaperSize(size)}
                      className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${
                        paperSize === size
                          ? 'border-[#C9A227] bg-[#1C1C20] text-[#C9A227] shadow-xs'
                          : 'border-[#2D2D33] bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Type */}
              <div>
                <label className="font-bold text-[#E0E0E0] block mb-1.5">نوع چاپ:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorType('bw')}
                    className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${
                      colorType === 'bw'
                        ? 'border-[#C9A227] bg-[#1C1C20] text-[#C9A227] shadow-xs'
                        : 'border-[#2D2D33] bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    سیاه و سفید (لیزری)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorType('color')}
                    className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${
                      colorType === 'color'
                        ? 'border-[#C9A227] bg-[#1C1C20] text-[#C9A227] shadow-xs'
                        : 'border-[#2D2D33] bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    تمام رنگی (کیفیت بالا)
                  </button>
                </div>
              </div>

              {/* Side */}
              <div>
                <label className="font-bold text-[#E0E0E0] block mb-1.5">نوع چاپ رو / پشت:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintSide('single')}
                    className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${
                      printSide === 'single'
                        ? 'border-[#C9A227] bg-[#1C1C20] text-[#C9A227]'
                        : 'border-[#2D2D33] bg-[#161619] text-[#8E9299]'
                    }`}
                  >
                    یک‌رو
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintSide('double')}
                    className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${
                      printSide === 'double'
                        ? 'border-[#C9A227] bg-[#1C1C20] text-[#C9A227]'
                        : 'border-[#2D2D33] bg-[#161619] text-[#8E9299]'
                    }`}
                  >
                    دورو
                  </button>
                </div>
              </div>

              {/* Paper Weight */}
              <div>
                <label className="font-bold text-[#E0E0E0] block mb-1.5">جنس و گرماژ کاغذ:</label>
                <select
                  value={paperWeight}
                  onChange={(e) => setPaperWeight(e.target.value)}
                  className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 text-[#E0E0E0] outline-none font-bold"
                >
                  <option value="80g">تحریر ۸۰ گرم استاندارد (Double A / کپی‌مکس)</option>
                  <option value="100g">تحریر ۱۰۰ گرم مرغوب</option>
                  <option value="glossy">گلاسه ۱۳۵ تا ۱۶۰ گرم براق</option>
                  <option value="card">مقوا گلاسه ۲۵0 گرم سنگین</option>
                </select>
              </div>

              {/* Binding */}
              <div>
                <label className="font-bold text-[#E0E0E0] block mb-1.5">نوع صحافی و جلد:</label>
                <select
                  value={bindingType}
                  onChange={(e) => setBindingType(e.target.value)}
                  className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 text-[#E0E0E0] outline-none font-bold"
                >
                  <option value="none">بدون صحافی (برگ آزاد)</option>
                  <option value="staple">منگنه گوشه / وسط (جزوه)</option>
                  <option value="spiral">صحافی فنر دوبل فلزی + طلق مات/شفاف</option>
                  <option value="cellophane">صحافی چسب گرم / سلفونی</option>
                  <option value="hardcover">گالینگور طلایی / نقره‌کوب (پایان‌نامه)</option>
                </select>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#E0E0E0] block mb-1">تعداد صفحات فایل:</label>
                  <input
                    type="number"
                    min={1}
                    value={pageCount}
                    onChange={(e) => setPageCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 text-[#E0E0E0] outline-none font-bold font-mono text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#E0E0E0] block mb-1">تعداد نسخه (سری):</label>
                  <input
                    type="number"
                    min={1}
                    value={copyCount}
                    onChange={(e) => setCopyCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 text-[#E0E0E0] outline-none font-bold font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Price Preview Card */}
            <div className="bg-[#161619] border border-[#222225] text-white rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#C9A227] font-bold border-b border-[#222225] pb-2">
                  <Calculator className="w-4 h-4" />
                  <span>ریز محاسبات فاکتور تکثیر</span>
                </div>

                {calculation && (
                  <div className="space-y-2 text-[#8E9299]">
                    <div className="flex justify-between">
                      <span>نرخ پایه هر صفحه:</span>
                      <span className="font-bold text-[#E0E0E0]">{formatToman(calculation.unitPagePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مجموع کل صفحات چاپ:</span>
                      <span className="font-mono font-bold text-[#E0E0E0]">{toPersianDigits(calculation.totalPages)} صفحه</span>
                    </div>
                    {calculation.bindingPrice > 0 && (
                      <div className="flex justify-between">
                        <span>هزینه صحافی ({toPersianDigits(copyCount)} جلد):</span>
                        <span className="font-bold text-[#E0E0E0]">{formatToman(calculation.bindingPrice * copyCount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#222225] space-y-3">
                <div className="text-center">
                  <div className="text-xs text-[#8E9299] mb-1">برآورد نهایی هزینه خدمات:</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#C9A227]">
                    {calculation ? formatToman(calculation.finalAmount) : '۰ تومان'}
                  </div>
                </div>

                <div className="bg-[#1C1C20] rounded-xl p-3 text-[11px] text-[#8E9299] flex items-center gap-2 border border-[#222225]">
                  <Phone className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>جهت ارسال فایل‌ها از طریق پیام‌رسان‌ها یا ثبت سفارش تیراژ بالا با شماره ۰۲۱-۸۸۸۸۸۸۸۸ تماس بگیرید.</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
