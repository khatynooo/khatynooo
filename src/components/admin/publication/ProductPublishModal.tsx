import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Image,
  Hash,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Layers,
} from 'lucide-react';
import { Product, PublicationProvider } from '../../../types';
import { api } from '../../../lib/api';

interface Props {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AVAILABLE_CHANNELS: Array<{
  id: PublicationProvider;
  name: string;
  badge: string;
  color: string;
}> = [
  { id: 'website', name: 'وب‌سایت خطی‌نو', badge: 'سایت', color: 'border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
  { id: 'eitaa', name: 'پیام‌رسان ایتا', badge: 'ایتا', color: 'border-orange-500/40 text-orange-600 bg-orange-50 dark:bg-orange-950/20' },
  { id: 'bale', name: 'پیام‌رسان بله', badge: 'بله', color: 'border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
  { id: 'telegram', name: 'کانال تلگرام', badge: 'تلگرام', color: 'border-sky-500/40 text-sky-600 bg-sky-50 dark:bg-sky-950/20' },
  { id: 'instagram', name: 'اینستاگرام', badge: 'اینستاگرام', color: 'border-pink-500/40 text-pink-600 bg-pink-50 dark:bg-pink-950/20' },
];

export const ProductPublishModal: React.FC<Props> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedProviders, setSelectedProviders] = useState<PublicationProvider[]>([
    'website',
    'eitaa',
    'bale',
    'telegram',
  ]);
  const [sendImage, setSendImage] = useState<boolean>(true);
  const [generateHashtags, setGenerateHashtags] = useState<boolean>(true);
  const [customText, setCustomText] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const toggleProvider = (provider: PublicationProvider) => {
    setSelectedProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    );
  };

  const handlePublish = async () => {
    if (selectedProviders.length === 0) {
      alert('لطفاً حداقل یک درگاه یا شبکه برای انتشار انتخاب کنید.');
      return;
    }

    setPublishing(true);
    setResultMessage(null);

    try {
      const res = await api.publishProduct(product.id, {
        providers: selectedProviders,
        customText: customText.trim() || undefined,
        sendImage,
        generateHashtags,
      });

      setResultMessage({
        success: true,
        text: res.message || 'وظایف انتشار در صف پردازش قرار گرفت.',
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setResultMessage({
        success: false,
        text: err.message || 'خطا در ثبت درخواست انتشار',
      });
    } finally {
      setPublishing(false);
    }
  };

  // پیش‌نمایش متنی سریع
  const previewPrice = product.salePrice ? `${product.salePrice.toLocaleString('fa-IR')} تومان` : 'تماس بگیرید';
  const previewStock = product.stock > 0 ? `${product.stock} ${product.unit}` : 'ناموجود';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#28282D] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* سربرگ */}
        <div className="p-5 border-b border-slate-100 dark:border-[#222226] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                انتشار چندکاناله محصول
              </h3>
              <p className="text-[11px] text-slate-500">
                ارسال آنی مشخصات کالا به وب‌سایت و شبکه‌های اجتماعی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* محتوای مدال */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* کارت خلاصه کالا */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#19191D] border border-slate-200 dark:border-[#28282E]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-[#333] shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-[#222] flex items-center justify-center text-slate-400 shrink-0 font-bold">
                تصویر
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-slate-900 dark:text-white text-sm truncate">
                {product.name}
              </h4>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                <span>کد: <strong className="font-mono text-slate-700 dark:text-slate-300">{product.code}</strong></span>
                <span>قیمت: <strong className="text-emerald-600 dark:text-emerald-400">{previewPrice}</strong></span>
                <span>موجودی: <strong className="text-slate-700 dark:text-slate-300">{previewStock}</strong></span>
              </div>
            </div>
          </div>

          {/* انتخاب کانال‌ها */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              انتخاب کانال‌های مقصد برای ارسال:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_CHANNELS.map(ch => {
                const isSelected = selectedProviders.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleProvider(ch.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? `${ch.color} font-bold shadow-xs`
                        : 'border-slate-200 dark:border-[#28282E] text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-[#18181B]'
                    }`}
                  >
                    <span>{ch.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-3.5 h-3.5 accent-amber-500 rounded pointer-events-none"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* گزینه‌های تکمیلی */}
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendImage}
                onChange={e => setSendImage(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                ضمیمه تصویر محصول
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateHashtags}
                onChange={e => setGenerateHashtags(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                تولید خودکار هشتگ‌ها
              </span>
            </label>
          </div>

          {/* متن سفارشی (اختیاری) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#222226]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                متن دلخواه یا توضیحات اختصاصی پست (اختیاری):
              </span>
              <span className="text-[10px] text-slate-400">در صورت خالی بودن، از قالب پیش‌فرض استفاده می‌شود</span>
            </div>
            <textarea
              rows={3}
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="مثال: تخفیف ویژه به مدت محدود برای اعضای محترم کانال..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              dir="rtl"
            />
          </div>

          {/* پیام نتیجه */}
          {resultMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                resultMessage.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {resultMessage.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}
        </div>

        {/* دکمه‌های اقدام */}
        <div className="p-4 border-t border-slate-100 dark:border-[#222226] bg-slate-50 dark:bg-[#101012] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C1C20] transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || selectedProviders.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#C9A227] to-[#A28018] text-slate-950 font-black shadow-md shadow-amber-500/20 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            <Send className={`w-3.5 h-3.5 ${publishing ? 'animate-bounce' : ''}`} />
            {publishing ? 'در حال ثبت در صف انتشار...' : 'ارسال به شبکه‌های انتخاب‌شده'}
          </button>
        </div>
      </div>
    </div>
  );
};
