import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, CheckCircle2, Share2, Barcode, Phone, MapPin } from 'lucide-react';
import { formatToman, toPersianDigits, formatNumber, getUnitBreakdownLabel } from '../../lib/utils';
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
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #thermal-receipt-container, #thermal-receipt-container * {
              visibility: visible !important;
            }
            #thermal-receipt-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 8px !important;
              border: none !important;
              box-shadow: none !important;
              background: #fff !important;
              color: #000 !important;
            }
          }
        ` }} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 text-slate-800"
        >
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">فرمت فیش:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormat('80mm')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    format === '80mm' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ۸۰ میلیمتر (استاندارد)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('58mm')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    format === '58mm' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ۵۸ میلیمتر
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('a4')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    format === 'a4' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 / A5 رسمی
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Receipt Paper Container */}
          <div
            id="thermal-receipt-container"
            className={`mx-auto bg-slate-50/90 p-5 rounded-2xl border border-slate-300 text-slate-900 text-xs font-mono shadow-xs space-y-3.5 ${
              format === '58mm' ? 'max-w-[280px]' : format === '80mm' ? 'max-w-[340px]' : 'max-w-full bg-white'
            }`}
          >
            {/* Store Branding */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h3 className="text-sm font-black text-slate-900 font-sans">فروشگاه لوازم‌التحریر و چاپ خطی‌نو</h3>
              <div className="text-[10px] text-slate-600 font-sans">تولید، توزیع و خدمات صحافی • khatynoo.ir</div>
              <div className="text-[10px] text-slate-500 font-sans">تهران، خ انقلاب • تلفن: ۰۲۱-۶۶۴۴۲۲۰۰</div>
            </div>

            {/* Invoice Meta */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">شماره فاکتور:</span>
                <span className="font-bold font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاریخ و ساعت:</span>
                <span>{new Date(invoice.createdAt).toLocaleDateString('fa-IR')} - {new Date(invoice.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مشتری:</span>
                <span className="font-sans font-bold">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">صندوقدار:</span>
                <span className="font-sans">{invoice.createdByUserName || 'کاربر سیستم'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[10px] text-slate-600">
                <span>شرح کالا</span>
                <span>تعداد × فی</span>
                <span>مبلغ</span>
              </div>
              {invoice.items.map((it, idx) => {
                const breakdown = getUnitBreakdownLabel(it.quantity, (it as any).conversionFactor, it.unit, (it as any).subUnit);
                return (
                  <div key={idx} className="text-[11px] leading-tight">
                    <div className="flex justify-between items-baseline">
                      <span className="truncate max-w-[130px] font-sans font-medium text-slate-900">{it.productName}</span>
                      <span className="text-slate-600 font-mono">{toPersianDigits(it.quantity)} × {formatNumber(it.unitPrice)}</span>
                      <span className="font-bold text-slate-900 font-mono">{formatNumber(it.total)}</span>
                    </div>
                    {breakdown && (
                      <div className="text-[9px] text-slate-500 text-left font-sans">({breakdown})</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>جمع اقلام:</span>
                <span className="font-mono font-medium">{formatToman(invoice.subtotal)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>مالیات ارزش افزوده:</span>
                  <span className="font-mono">{formatToman(invoice.tax)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>تخفیف:</span>
                  <span className="font-mono">- {formatToman(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1.5 border-t border-slate-300 font-sans text-slate-900">
                <span>مبلغ نهایی پرداخت:</span>
                <span className="text-sm font-mono text-blue-700">{formatToman(invoice.finalAmount)}</span>
              </div>
            </div>

            {/* POS Ref / Payment Details */}
            {invoice.paymentMethod === 'pos_pasargad' && invoice.posRrn && (
              <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-300 text-slate-600">
                <div className="flex justify-between">
                  <span>شماره ارجاع پوز (RRN):</span>
                  <span className="font-mono">{invoice.posRrn}</span>
                </div>
                {invoice.posRefNumber && (
                  <div className="flex justify-between">
                    <span>کد پیگیری:</span>
                    <span className="font-mono">{invoice.posRefNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>پایانه:</span>
                  <span className="font-sans">پوز پاسارگاد</span>
                </div>
              </div>
            )}

            {/* Barcode & Footer Note */}
            <div className="text-center space-y-1.5 pt-1 font-sans">
              <div className="w-40 h-8 mx-auto bg-slate-100 border border-slate-300 text-slate-800 rounded flex items-center justify-center font-mono text-xs tracking-widest">
                ||| | |||| | ||| | ||
              </div>
              <div className="text-[10px] text-slate-500">از خرید و اعتماد شما صمیمانه سپاسگزاریم.</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-98"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>چاپ فیش فاکتور</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
