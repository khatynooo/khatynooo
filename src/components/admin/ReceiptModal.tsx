import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, CheckCircle2, Share2, Barcode, Phone, MapPin } from 'lucide-react';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { SalesInvoice } from '../../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, invoice }) => {
  const [format, setFormat] = useState<'80mm' | '58mm' | 'a4'>('80mm');

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-[#111113] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#222225] space-y-4 my-8 text-[#E0E0E0]"
        >
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[#222225]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#8E9299]">فرمت چاپ فاکتور:</span>
              <div className="flex bg-[#161619] p-0.5 rounded-lg text-xs border border-[#2D2D33]">
                <button
                  onClick={() => setFormat('80mm')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    format === '80mm' ? 'bg-[#C9A227] text-slate-950 font-black' : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  ۸۰ میلیمتر (حرارتی)
                </button>
                <button
                  onClick={() => setFormat('58mm')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    format === '58mm' ? 'bg-[#C9A227] text-slate-950 font-black' : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  ۵۸ میلیمتر
                </button>
                <button
                  onClick={() => setFormat('a4')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    format === 'a4' ? 'bg-[#C9A227] text-slate-950 font-black' : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  A4 / A5 رسمی
                </button>
              </div>
            </div>

            <button onClick={onClose} className="p-1.5 text-[#8E9299] hover:text-[#E0E0E0] rounded-lg hover:bg-[#161619] transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Receipt Paper Container */}
          <div
            id="thermal-receipt-container"
            className={`mx-auto bg-amber-50/90 p-6 rounded-2xl border border-dashed border-slate-400 text-slate-900 text-xs font-mono shadow-md space-y-4 ${
              format === '58mm' ? 'max-w-[280px]' : format === '80mm' ? 'max-w-[340px]' : 'max-w-full bg-white'
            }`}
          >
            {/* Store Branding */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <h3 className="text-base font-black text-slate-900 font-sans">فروشگاه لوازم‌تحریر خطی‌نو</h3>
              <div className="text-[10px] text-slate-600 font-sans">تولید، توزیع و خدمات تکثیر • khatynoo.ir</div>
              <div className="text-[10px] text-slate-600 font-sans">تهران، خ انقلاب • تلفن: ۰۲۱-۸۸۸۸۸۸۸۸</div>
            </div>

            {/* Invoice Meta */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>شماره فاکتور:</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>تاریخ و ساعت:</span>
                <span>{new Date(invoice.createdAt).toLocaleDateString('fa-IR')}</span>
              </div>
              <div className="flex justify-between">
                <span>مشتری:</span>
                <span className="font-sans font-bold">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>صندوقدار:</span>
                <span className="font-sans">{invoice.createdByUserName || 'فروشنده'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-[10px]">
                <span>شرح کالا</span>
                <span>تعداد × فی</span>
                <span>مبلغ</span>
              </div>
              {invoice.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[11px] leading-tight">
                  <span className="truncate max-w-[120px] font-sans">{it.productName}</span>
                  <span>{toPersianDigits(it.quantity)} × {formatNumber(it.unitPrice)}</span>
                  <span className="font-bold">{formatNumber(it.total)}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>جمع اقلام:</span>
                <span>{formatToman(invoice.subtotal)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span>مالیات ارزش افزوده:</span>
                  <span>{formatToman(invoice.tax)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>تخفیف:</span>
                  <span>- {formatToman(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300 font-sans">
                <span>مبلغ نهایی پرداخت:</span>
                <span>{formatToman(invoice.finalAmount)}</span>
              </div>
            </div>

            {/* POS Ref / Payment Details */}
            {invoice.paymentMethod === 'pos_pasargad' && invoice.posRrn && (
              <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>شماره ارجاع پوز (RRN):</span>
                  <span>{invoice.posRrn}</span>
                </div>
                <div className="flex justify-between">
                  <span>کد پیگیری:</span>
                  <span>{invoice.posRefNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>پایانه:</span>
                  <span>پوز پاسارگاد (87654321)</span>
                </div>
              </div>
            )}

            {/* Barcode & Footer Note */}
            <div className="text-center space-y-2 pt-1 font-sans">
              <div className="w-48 h-10 mx-auto bg-slate-900 text-white rounded flex items-center justify-center font-mono text-xs tracking-widest">
                ||| | |||| | ||| | ||
              </div>
              <div className="text-[10px] text-slate-500">از خرید و اعتماد شما سپاسگزاریم.</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#C9A227]/20 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4 text-black" />
              <span>چاپ فیش فاکتور</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 bg-[#161619] hover:bg-[#1C1C20] text-[#E0E0E0] border border-[#2D2D33] font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
