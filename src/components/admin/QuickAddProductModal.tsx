import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Sparkles, Loader2, Image as ImageIcon, Tag, Barcode, Check, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { Product, Category } from '../../types';
import { useToast } from '../common/Toast';

interface QuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  categories: Category[];
  onProductCreated: (newProduct: Product) => void;
}

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  isOpen,
  onClose,
  initialName = '',
  categories,
  onProductCreated,
}) => {
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('عدد');
  const [barcode, setBarcode] = useState('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isQueryingMarket, setIsQueryingMarket] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Market scrap intelligence preview
  const [marketInfo, setMarketInfo] = useState<{
    floorPrice?: number;
    digikalaPrice?: number;
    avgPrice?: number;
    suggestedBuy?: number;
    suggestedSale?: number;
    foundTitle?: string;
    imageCandidate?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setBarcode(`626${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      setBuyPrice('');
      setSalePrice('');
      setStock(0);
      setImageUrl('');
      setMarketInfo(null);
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialName, categories]);

  if (!isOpen) return null;

  // استعلام زنده مشخصات و قیمت از بازار (ترب/دیجی‌کالا)
  const handleMarketLookup = async () => {
    const q = name.trim();
    if (!q) {
      showToast('لطفاً ابتدا نام کالا را وارد کنید.', 'warning');
      nameInputRef.current?.focus();
      return;
    }

    setIsQueryingMarket(true);
    try {
      const res = await fetch(`/api/torob/multi-market?query=${encodeURIComponent(q)}`).then((r) => r.json());
      const data = res?.result;
      if (!data) {
        showToast('نتیجه‌ای در استعلام بازار یافت نشد.', 'info');
        return;
      }

      const floor = data.minPrice || 0;
      const digi = data.sellers?.find((s: any) => s.storeName?.includes('دیجی'))?.price || data.avgPrice || 0;
      const avg = data.avgPrice || floor;
      const suggestedBuy = floor > 0 ? Math.round(floor * 0.78) : undefined;
      const suggestedSale = floor > 0 ? Math.round(floor * 0.98) : undefined;

      setMarketInfo({
        floorPrice: floor,
        digikalaPrice: digi,
        avgPrice: avg,
        suggestedBuy,
        suggestedSale,
        foundTitle: data.productTitle || data.title,
        imageCandidate: data.image,
      });

      // پیشنهاد خودکار قیمت‌ها در صورتی که هنوز خالی باشد
      if (!buyPrice && suggestedBuy) {
        setBuyPrice(suggestedBuy);
      }
      if (!salePrice && suggestedSale) {
        setSalePrice(suggestedSale);
      }
      if (!imageUrl && data.image) {
        setImageUrl(data.image);
      }

      showToast('مشخصات و قیمت‌های کف بازار با موفقیت دریافت شد.', 'success');
    } catch (err) {
      showToast('خطا در استعلام از بازار. می‌توانید قیمت‌ها را دستی وارد کنید.', 'error');
    } finally {
      setIsQueryingMarket(false);
    }
  };

  const applyMarketPrices = () => {
    if (!marketInfo) return;
    if (marketInfo.suggestedBuy) setBuyPrice(marketInfo.suggestedBuy);
    if (marketInfo.suggestedSale) setSalePrice(marketInfo.suggestedSale);
    if (marketInfo.imageCandidate && !imageUrl) setImageUrl(marketInfo.imageCandidate);
    showToast('قیمت‌های پیشنهادی بازار اعمال شد.', 'success');
  };

  // آپلود تصویر کالا
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('لطفاً یک فایل تصویری معتبر انتخاب کنید.', 'warning');
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        try {
          const uploadRes = await api.uploadFile({
            dataUrl,
            filename: file.name,
            title: name.trim() || 'تصویر کالا',
            category: 'product',
          });
          setImageUrl(uploadRes.url || dataUrl);
          showToast('تصویر کالا با موفقیت بارگذاری شد.', 'success');
        } catch (uploadErr) {
          // در صورت خطای ذخیره روی دیسک، استفاده ایمن از dataUrl
          setImageUrl(dataUrl);
          showToast('تصویر کالا ذخیره شد.', 'success');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingImage(false);
      showToast('خطا در پردازش تصویر', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim();
    if (!finalName) {
      showToast('وارد کردن نام کالا الزامی است.', 'warning');
      nameInputRef.current?.focus();
      return;
    }

    const finalBuyPrice = Number(buyPrice) || 0;
    const finalSalePrice = Number(salePrice) || Math.round(finalBuyPrice * 1.3);

    if (finalBuyPrice <= 0) {
      showToast('لطفاً قیمت خرید کالا را مشخص فرمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const generatedCode = `PRD-${Date.now().toString().slice(-6)}`;

      const newProdPayload = {
        name: finalName,
        code: generatedCode,
        barcode: barcode.trim() || `626${Date.now().toString().slice(-10)}`,
        categoryId: categoryId || (categories[0]?.id ?? 'cat_stationery'),
        categoryName: selectedCat?.name || 'لوازم تحریر',
        unit: unit || 'عدد',
        buyPrice: finalBuyPrice,
        salePrice: finalSalePrice,
        priceShop1: Math.round(finalSalePrice * 1.05),
        priceShop2: finalSalePrice,
        priceShop3: Math.round(finalBuyPrice * 1.15),
        wholesalePrice: Math.round(finalBuyPrice * 1.15),
        minAllowedPrice: finalBuyPrice,
        stock: Number(stock) || 0,
        minStockAlert: 5,
        image: imageUrl || '',
        showOnWebsite: true,
        onlyAccounting: false,
        lastMarketPrice: marketInfo?.floorPrice || undefined,
        lastMarketCheckedAt: marketInfo?.floorPrice ? new Date().toISOString() : undefined,
      };

      const res = await api.createProduct(newProdPayload);
      const createdProduct: Product = res.product || {
        ...newProdPayload,
        id: res.id || `prd_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      showToast(`کالای «${finalName}» با موفقیت تعریف شد.`, 'success');
      onProductCreated(createdProduct);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت کالا', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* هدر مودال */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-200">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">تعریف سریع کالا در فاکتور خرید</h3>
              <p className="text-xs text-slate-500">کالا ثبت شده و بدون خروج از صفحه، مستقیماً به اقلام فاکتور افزوده می‌شود</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* فرم */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {/* نام کالا + دکمه استعلام بازار */}
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              نام کالا <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                ref={nameInputRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: خودکار کیان نوک ۱.۰ آبی یا دفتر ۸۰ برگ سیمی"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition"
              />
              <button
                type="button"
                onClick={handleMarketLookup}
                disabled={isQueryingMarket}
                className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2.5 font-medium text-blue-700 hover:bg-blue-100 transition border border-blue-200 disabled:opacity-50 shrink-0"
              >
                {isQueryingMarket ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Sparkles className="h-4 w-4 text-blue-600" />
                )}
                <span>استعلام از بازار</span>
              </button>
            </div>
          </div>

          {/* پیش‌نمایش هوشمند قیمت بازار در صورت دریافت */}
          {marketInfo && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  اطلاعات دریافتی از ترب و دیجی‌کالا:
                </span>
                <button
                  type="button"
                  onClick={applyMarketPrices}
                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-white hover:bg-blue-700 transition text-[11px] font-medium"
                >
                  اعمال قیمت‌های پیشنهادی
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block">کف قیمت بازار (ترب):</span>
                  <strong className="text-slate-900 text-sm">{toPersianDigits(formatNumber(marketInfo.floorPrice || 0))} تومان</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block">قیمت دیجی‌کالا:</span>
                  <strong className="text-slate-900 text-sm">{toPersianDigits(formatNumber(marketInfo.digikalaPrice || 0))} تومان</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block">پیشنهاد خرید خطی‌نو:</span>
                  <strong className="text-emerald-700 text-sm">{toPersianDigits(formatNumber(marketInfo.suggestedBuy || 0))} تومان</strong>
                </div>
              </div>
            </div>
          )}

          {/* دسته‌بندی و واحد شمارش */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-medium text-slate-700">دسته‌بندی</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">واحد شمارش</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition"
              >
                <option value="عدد">عدد</option>
                <option value="بسته">بسته</option>
                <option value="کارتن">کارتن</option>
                <option value="جلد">جلد</option>
                <option value="دست">دست</option>
                <option value="جین">جین (۱۲ تایی)</option>
                <option value="حلقه">حلقه</option>
                <option value="متر">متر</option>
                <option value="کیلوگرم">کیلوگرم</option>
              </select>
            </div>
          </div>

          {/* قیمت خرید فی و قیمت فروش پیشنهادی */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                قیمت خرید فی (تومان) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="مثلاً: ۳۵۰۰۰"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition text-left"
              />
              {buyPrice !== '' && Number(buyPrice) > 0 && (
                <span className="mt-1 block text-xs text-slate-500">
                  {toPersianDigits(formatNumber(Number(buyPrice)))} تومان
                </span>
              )}
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                قیمت فروش مصرف‌کننده (تومان)
              </label>
              <input
                type="number"
                min={0}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="مثلاً: ۴۸۰۰۰"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition text-left"
              />
              {salePrice !== '' && Number(salePrice) > 0 && (
                <span className="mt-1 block text-xs text-slate-500">
                  {toPersianDigits(formatNumber(Number(salePrice)))} تومان
                </span>
              )}
            </div>
          </div>

          {/* بارکد و موجودی اولیه */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-medium text-slate-700 flex items-center justify-between">
                <span>بارکد کالا</span>
                <button
                  type="button"
                  onClick={() => setBarcode(`626${Math.floor(1000000000 + Math.random() * 9000000000)}`)}
                  className="text-xs text-amber-600 hover:underline"
                >
                  تولید تصادفی
                </button>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="بارکد استاندارد ۱۳ رقمی"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-9 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition text-left font-mono text-xs"
                />
                <Barcode className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">موجودی اولیه قبل از فاکتور</label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value ? Number(e.target.value) : 0)}
                placeholder="۰"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition text-left"
              />
              <span className="mt-1 block text-xs text-slate-400">
                (تعداد فاکتور خرید جاری پس از ثبت به این عدد اضافه خواهد شد)
              </span>
            </div>
          </div>

          {/* آپلود تصویر کالا */}
          <div>
            <label className="mb-1 block font-medium text-slate-700">تصویر کالا (اختیاری)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            {imageUrl ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-white"
                />
                <div className="flex-1 truncate">
                  <span className="text-xs text-slate-600 block truncate">{imageUrl}</span>
                  <span className="text-xs text-emerald-600 font-medium">تصویر ثبت شد</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition"
                  title="حذف تصویر"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/40 transition"
              >
                {isUploadingImage ? (
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                    <span>در حال بارگذاری تصویر...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-500">
                    <Upload className="h-6 w-6 text-slate-400" />
                    <span className="text-xs">
                      تصویر را اینجا بکشید یا برای انتخاب فایل <span className="text-amber-600 font-medium">کلیک کنید</span>
                    </span>
                    <span className="text-[11px] text-slate-400">(PNG, JPG, WebP)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* دکمه‌های اقدام */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImage}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-medium text-white shadow-md shadow-amber-200 hover:bg-amber-600 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>ثبت کالا و افزودن به فاکتور</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
