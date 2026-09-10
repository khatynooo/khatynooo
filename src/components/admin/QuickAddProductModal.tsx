import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Tag,
  Barcode,
  Check,
  AlertTriangle,
  DollarSign,
  Package,
  TrendingUp,
  Boxes,
  RefreshCw,
  ScanLine,
  Boxes as BoxesIcon,
  Globe,
  Building,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber, toEnglishDigits, isValidBarcodeChecksum, generateValidEan13 } from '../../lib/utils';
import { Product, Category, SubCategory, UnitDefinition } from '../../types';
import { useToast } from '../common/Toast';
import { CurrencyInput } from '../common/CurrencyInput';
import { ProductGalleryManager } from '../common/ProductGalleryManager';
import { DirectPhoneScannerButton } from '../common/DirectPhoneScannerButton';
import { InlineCategoryCreator } from '../common/InlineCategoryCreator';

type ModalTabType = 'general' | 'pricing' | 'gallery' | 'details';

interface QuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialBarcode?: string;
  categories: Category[];
  unitDefs?: UnitDefinition[];
  onProductCreated: (newProduct: Product) => void;
}

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  isOpen,
  onClose,
  initialName = '',
  initialBarcode = '',
  categories,
  unitDefs: propUnitDefs,
  onProductCreated,
}) => {
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // تب فعال در مودال
  const [modalTab, setModalTab] = useState<ModalTabType>('general');

  // دسته‌بندی‌های محلی برای پشتیبانی از افزودن سریع
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
    }
  }, [categories]);

  // واحدهای سنجش سیستم
  const [unitDefs, setUnitDefs] = useState<UnitDefinition[]>(propUnitDefs || []);

  // وضعیت‌های بارگذاری و استعلام
  const [isQueryingMarket, setIsQueryingMarket] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // پیش‌نمایش استعلام هوشمند از ترب و دیجی‌کالا
  const [marketInfo, setMarketInfo] = useState<{
    floorPrice?: number;
    digikalaPrice?: number;
    avgPrice?: number;
    suggestedBuy?: number;
    suggestedSale?: number;
    foundTitle?: string;
    imageCandidate?: string;
  } | null>(null);

  // وضعیت فرم کالا
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '',
    boxBarcode: '',
    categoryId: '',
    subCategoryId: '',
    unit: 'عدد',
    subUnit: '',
    conversionFactor: 1,
    buyPrice: 0,
    salePrice: 0,
    priceShop1: 0,
    priceShop2: 0,
    priceShop3: 0,
    wholesalePrice: 0,
    minAllowedPrice: 0,
    stock: 0,
    minStockAlert: 5,
    description: '',
    image: '',
    extraImages: [] as string[],
    isSpecialOffer: false,
    featured: false,
    showOnWebsite: true,
    onlyAccounting: false,
  });

  // تولید کد استاندارد کالا
  const generateProductCode = () => `KHAT-${Math.floor(1000 + Math.random() * 9000)}`;

  // بارگذاری واحدها در صورت عدم ارسال در پراپ
  useEffect(() => {
    if (propUnitDefs && propUnitDefs.length > 0) {
      setUnitDefs(propUnitDefs);
    } else if (isOpen) {
      api.getUnits().then((res) => {
        if (res?.units) setUnitDefs(res.units);
      }).catch(() => {});
    }
  }, [isOpen, propUnitDefs]);

  // مقداردهی اولیه فرم هنگام باز شدن مودال
  useEffect(() => {
    if (isOpen) {
      setModalTab('general');
      setMarketInfo(null);
      const defaultImg = 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80';
      const initialCatId = categories[0]?.id || '';
      
      setFormData({
        name: initialName,
        code: generateProductCode(),
        barcode: initialBarcode ? toEnglishDigits(initialBarcode).trim() : generateValidEan13(),
        boxBarcode: '',
        categoryId: initialCatId,
        subCategoryId: '',
        unit: 'عدد',
        subUnit: '',
        conversionFactor: 1,
        buyPrice: 0,
        salePrice: 0,
        priceShop1: 0,
        priceShop2: 0,
        priceShop3: 0,
        wholesalePrice: 0,
        minAllowedPrice: 0,
        stock: 0,
        minStockAlert: 5,
        description: '',
        image: defaultImg,
        extraImages: [],
        isSpecialOffer: false,
        featured: false,
        showOnWebsite: true,
        onlyAccounting: false,
      });

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, initialName, categories]);

  if (!isOpen) return null;

  // زیردسته‌های مربوط به دسته‌بندی انتخاب‌شده
  const currentCategory = localCategories.find((c) => c.id === formData.categoryId);
  const currentSubcategories: SubCategory[] = currentCategory?.subcategories || [];

  // محاسبه هوشمند قیمت‌های سطوح ۵گانه بر اساس بهای خرید
  const calculateSmartTierPrices = (buy: number) => {
    if (!buy || buy <= 0) {
      return {
        priceShop1: 0,
        priceShop2: 0,
        priceShop3: 0,
        wholesalePrice: 0,
        minAllowedPrice: 0,
        salePrice: 0,
      };
    }
    const shop1 = Math.round(buy * 1.35); // سود ۳۵٪ حضوری/نقدی
    const shop2 = Math.round(buy * 1.30); // سود ۳۰٪ آنلاین
    const shop3 = Math.round(buy * 1.15); // سود ۱۵٪ همکار
    const wholesale = Math.round(buy * 1.15); // سود ۱۵٪ عمده
    const minAllowed = buy; // کف قیمت خرید
    return {
      priceShop1: shop1,
      priceShop2: shop2,
      priceShop3: shop3,
      wholesalePrice: wholesale,
      minAllowedPrice: minAllowed,
      salePrice: shop1,
    };
  };

  // تغییر بهای خرید و پیشنهاد خودکار در سطوح قیمت در صورت دست‌نخورده بودن
  const handleBuyPriceChange = (val: number) => {
    const isOtherZero =
      formData.priceShop1 === 0 &&
      formData.priceShop2 === 0 &&
      formData.priceShop3 === 0 &&
      formData.wholesalePrice === 0;

    if (isOtherZero && val > 0) {
      const smart = calculateSmartTierPrices(val);
      setFormData((prev) => ({
        ...prev,
        buyPrice: val,
        ...smart,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        buyPrice: val,
      }));
    }
  };

  // اعمال فرمول هوشمند روی سطوح قیمت به صورت دستی توسط کاربر
  const applySmartFormulas = () => {
    if (formData.buyPrice <= 0) {
      showToast('لطفاً ابتدا بهای خرید از تامین‌کننده را وارد کنید.', 'warning');
      return;
    }
    const smart = calculateSmartTierPrices(formData.buyPrice);
    setFormData((prev) => ({
      ...prev,
      ...smart,
    }));
    showToast('سطوح قیمت ۵گانه با فرمول استاندارد سود خطی‌نو محاسبه و جایگذاری شدند.', 'success');
  };

  // استعلام زنده مشخصات و قیمت از بازار (ترب/دیجی‌کالا)
  const handleMarketLookup = async () => {
    const q = formData.name.trim();
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

      // در صورتی که قیمت خرید هنوز ثبت نشده، پیشنهاد هوشمند بازار اعمال شود
      if (suggestedBuy && (!formData.buyPrice || formData.buyPrice === 0)) {
        const smart = calculateSmartTierPrices(suggestedBuy);
        setFormData((prev) => ({
          ...prev,
          buyPrice: suggestedBuy,
          ...smart,
          image: data.image || prev.image,
        }));
      }

      showToast('مشخصات و قیمت‌های کف بازار با موفقیت دریافت شد.', 'success');
    } catch (err) {
      showToast('خطا در استعلام از بازار. می‌توانید قیمت‌ها را دستی وارد کنید.', 'error');
    } finally {
      setIsQueryingMarket(false);
    }
  };

  // اعمال قیمت‌های پیشنهادی بازار
  const applyMarketPrices = () => {
    if (!marketInfo) return;
    const bPrice = marketInfo.suggestedBuy || Math.round((marketInfo.floorPrice || 0) * 0.78);
    if (bPrice > 0) {
      const smart = calculateSmartTierPrices(bPrice);
      setFormData((prev) => ({
        ...prev,
        buyPrice: bPrice,
        ...smart,
        priceShop2: marketInfo.floorPrice || smart.priceShop2, // قیمت ترب به عنوان قیمت آنلاین
        image: marketInfo.imageCandidate || prev.image,
      }));
      showToast('قیمت‌های بازار با موفقیت اعمال شدند.', 'success');
    }
  };

  // محاسبه سود ناخالص فروش نقدی
  const profitToman = (formData.priceShop1 || formData.salePrice || 0) - (formData.buyPrice || 0);
  const profitMargin =
    formData.buyPrice > 0 ? ((profitToman / formData.buyPrice) * 100).toFixed(1) : '۰';

  // ارسال نهایی فرم و ثبت در دیتابیس
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = formData.name.trim();
    if (!finalName) {
      showToast('وارد کردن نام کالا الزامی است.', 'warning');
      setModalTab('general');
      setTimeout(() => nameInputRef.current?.focus(), 100);
      return;
    }

    if (formData.buyPrice <= 0) {
      showToast('لطفاً بهای خرید کالا از تامین‌کننده را مشخص فرمایید.', 'warning');
      setModalTab('pricing');
      return;
    }

    const finalSalePrice = formData.priceShop1 || formData.salePrice || Math.round(formData.buyPrice * 1.35);

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === formData.categoryId);
      const selectedSubCat = selectedCat?.subcategories?.find((s) => s.id === formData.subCategoryId);

      const newProdPayload = {
        name: finalName,
        code: formData.code.trim() || generateProductCode(),
        barcode: formData.barcode.trim() || generateValidEan13(),
        boxBarcode: formData.boxBarcode.trim() || undefined,
        categoryId: formData.categoryId || (categories[0]?.id ?? 'cat_stationery'),
        categoryName: selectedCat?.name || 'لوازم تحریر',
        subCategoryId: formData.subCategoryId || undefined,
        subCategoryName: selectedSubCat?.name || undefined,
        unit: formData.unit || 'عدد',
        subUnit: formData.subUnit || undefined,
        conversionFactor: Number(formData.conversionFactor) || 1,
        buyPrice: Number(formData.buyPrice) || 0,
        salePrice: finalSalePrice,
        priceShop1: Number(formData.priceShop1) || finalSalePrice,
        priceShop2: Number(formData.priceShop2) || finalSalePrice,
        priceShop3: Number(formData.priceShop3) || finalSalePrice,
        wholesalePrice: Number(formData.wholesalePrice) || finalSalePrice,
        minAllowedPrice: Number(formData.minAllowedPrice) || Number(formData.buyPrice) || 0,
        stock: Number(formData.stock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 5,
        description: formData.description.trim() || undefined,
        image: formData.image || '',
        gallery: [formData.image, ...formData.extraImages].filter((x): x is string => Boolean(x && x.trim())),
        extraImages: formData.extraImages || [],
        isSpecialOffer: Boolean(formData.isSpecialOffer),
        featured: Boolean(formData.featured),
        showOnWebsite: Boolean(formData.showOnWebsite && !formData.onlyAccounting),
        onlyAccounting: Boolean(formData.onlyAccounting),
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

      showToast(`کالای «${finalName}» با موفقیت ثبت شد و به اقلام فاکتور خرید افزوده گردید.`, 'success');
      onProductCreated(createdProduct);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت کالا', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabList: { id: ModalTabType; title: string; icon: React.ComponentType<any> }[] = [
    { id: 'general', title: 'اطلاعات پایه و دسته‌بندی', icon: Package },
    { id: 'pricing', title: 'قیمت‌گذاری ۵ سطحی و انبار', icon: DollarSign },
    { id: 'gallery', title: 'گالری و تصاویر کالا', icon: ImageIcon },
    { id: 'details', title: 'توضیحات و نشان‌های تبلیغاتی', icon: Tag },
  ];

  const currentTabIndex = tabList.findIndex((t) => t.id === modalTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[94vh]"
        dir="rtl"
      >
        {/* هدر مودال */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 sm:px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-200">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  تعریف جامع کالا در فاکتور خرید
                </h3>
                <span className="hidden sm:inline-flex bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  قیمت‌گذاری ۵ سطحی + استعلام ترب
                </span>
              </div>
              <p className="text-xs text-slate-500">
                مشخصات و قیمت‌های کالا را ثبت کنید؛ پس از ثبت، مستقیماً به اقلام فاکتور خرید جاری افزوده خواهد شد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* نوار تب‌بندی ناوبری */}
        <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {tabList.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = modalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200 font-black'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                <span>{tab.title}</span>
                <span
                  className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                    isActive ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {toPersianDigits(idx + 1)}
                </span>
              </button>
            );
          })}
        </div>

        {/* فرم اسکرول‌شونده */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* تب ۱: اطلاعات پایه، کدگذاری و دسته‌بندی */}
          {modalTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* انتخاب کانال عرضه: سایت در برابر فقط حسابداری */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">کانال و مقصد عرضه کالا:</span>
                  <span className="text-[11px] text-slate-500">
                    آیا این محصول در فروشگاه آنلاین نیز عرضه شود یا صرفاً در انبارداری و حسابداری داخلی؟
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all text-xs ${
                      formData.showOnWebsite && !formData.onlyAccounting
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="channelMode"
                      checked={formData.showOnWebsite && !formData.onlyAccounting}
                      onChange={() => setFormData({ ...formData, showOnWebsite: true, onlyAccounting: false })}
                      className="accent-amber-500"
                    />
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>ارسال به سایت و آنلاین</span>
                  </label>

                  <label
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all text-xs ${
                      formData.onlyAccounting
                        ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="channelMode"
                      checked={formData.onlyAccounting}
                      onChange={() => setFormData({ ...formData, showOnWebsite: false, onlyAccounting: true })}
                      className="accent-amber-500"
                    />
                    <Building className="w-4 h-4 text-amber-600" />
                    <span>فقط حسابداری داخلی</span>
                  </label>
                </div>
              </div>

              {/* نام کالا + دکمه استعلام بازار */}
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  نام کامل کالا <span className="text-rose-500">*</span>:
                </label>
                <div className="flex gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثلاً: خودکار کیان نوک ۱.۰ میلی‌متر آبی اصل یا کلاسور ۲۶ حلقه پاپکو"
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 font-bold focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition"
                  />
                  <button
                    type="button"
                    onClick={handleMarketLookup}
                    disabled={isQueryingMarket}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2.5 font-bold text-blue-700 hover:bg-blue-100 transition border border-blue-200 disabled:opacity-50 shrink-0 cursor-pointer text-xs sm:text-sm"
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

              {/* پیش‌نمایش هوشمند استعلام بازار */}
              {marketInfo && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3.5 space-y-2.5 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      قیمت‌های استخراج‌شده از ترب و دیجی‌کالا:
                    </span>
                    <button
                      type="button"
                      onClick={applyMarketPrices}
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 transition text-xs font-bold cursor-pointer shadow-xs"
                    >
                      اعمال قیمت‌های بازار در ۵ سطح
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                    <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">کف قیمت بازار (ترب):</span>
                      <strong className="text-slate-900 text-sm font-mono">
                        {toPersianDigits(formatNumber(marketInfo.floorPrice || 0))} تومان
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">قیمت دیجی‌کالا:</span>
                      <strong className="text-slate-900 text-sm font-mono">
                        {toPersianDigits(formatNumber(marketInfo.digikalaPrice || 0))} تومان
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">پیشنهاد خرید از بنکدار:</span>
                      <strong className="text-emerald-700 text-sm font-mono">
                        {toPersianDigits(formatNumber(marketInfo.suggestedBuy || 0))} تومان
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* کد کالا و بارکدها */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* کد اختصاصی */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 text-xs">کد کالا <span className="text-rose-500">*</span>:</label>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, code: generateProductCode() }))}
                      className="text-[10px] text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      تولید خودکار
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 font-mono text-xs font-bold focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* بارکد استاندارد کالا */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 text-xs">بارکد کالا:</label>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, barcode: generateValidEan13() }))}
                      className="text-[10px] text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      EAN-13
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: toEnglishDigits(e.target.value) })}
                      placeholder="بارکد ۱۳ رقمی"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-24 text-slate-800 font-mono text-xs font-bold focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 text-left"
                    />
                    <div className="absolute left-1 flex items-center gap-1">
                      <DirectPhoneScannerButton
                        onScan={(code) => {
                          const clean = toEnglishDigits(code).trim();
                          setFormData((prev) => ({ ...prev, barcode: clean }));
                          showToast(`بارکد «${clean}» اسکن شد.`, 'success');
                        }}
                        label="اسکن"
                        variant="gold"
                      />
                    </div>
                  </div>
                  {formData.barcode && (
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      {isValidBarcodeChecksum(formData.barcode) ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> بارکد استاندارد معتبر
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> فرمت سفارشی
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* بارکد جعبه / کارتن (اختیاری) */}
                <div>
                  <label className="font-bold text-slate-700 text-xs block mb-1 flex items-center gap-1">
                    <BoxesIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>بارکد کارتن/جعبه (اختیاری):</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={formData.boxBarcode}
                      onChange={(e) => setFormData({ ...formData, boxBarcode: toEnglishDigits(e.target.value) })}
                      placeholder="بارکد کارتن مادر..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-24 text-slate-800 font-mono text-xs focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 text-left"
                    />
                    <div className="absolute left-1 flex items-center gap-1">
                      <DirectPhoneScannerButton
                        onScan={(code) => {
                          const clean = toEnglishDigits(code).trim();
                          setFormData((prev) => ({ ...prev, boxBarcode: clean }));
                          showToast(`بارکد کارتن «${clean}» اسکن شد.`, 'success');
                        }}
                        label="اسکن"
                        variant="gold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* دسته‌بندی اصلی و زیردسته‌بندی */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 text-xs">دسته‌بندی اصلی:</label>
                    <InlineCategoryCreator
                      mode="category"
                      theme="light"
                      onCreated={(res) => {
                        if (res.category) {
                          setLocalCategories((prev) => {
                            const exists = prev.some((c) => c.id === res.category!.id);
                            return exists ? prev : [...prev, res.category!];
                          });
                          setFormData((prev) => ({
                            ...prev,
                            categoryId: res.category!.id,
                            subCategoryId: '',
                          }));
                        }
                      }}
                    />
                  </div>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subCategoryId: '' })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 font-bold focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition bg-white"
                  >
                    <option value="">-- بدون دسته‌بندی / عمومی --</option>
                    {localCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 text-xs">زیردسته‌بندی تخصصی:</label>
                    <InlineCategoryCreator
                      mode="subcategory"
                      parentCategoryId={formData.categoryId}
                      disabled={!formData.categoryId}
                      disabledReason="ابتدا دسته‌بندی اصلی را انتخاب کنید"
                      theme="light"
                      onCreated={(res) => {
                        if (res.subcategory && formData.categoryId) {
                          setLocalCategories((prev) =>
                            prev.map((c) => {
                              if (c.id === formData.categoryId) {
                                const subs = c.subcategories || [];
                                const exists = subs.some((s) => s.id === res.subcategory!.id);
                                return {
                                  ...c,
                                  subcategories: exists ? subs : [...subs, res.subcategory!],
                                };
                              }
                              return c;
                            })
                          );
                          setFormData((prev) => ({
                            ...prev,
                            subCategoryId: res.subcategory!.id,
                          }));
                        }
                      }}
                    />
                  </div>
                  <select
                    value={formData.subCategoryId || ''}
                    onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
                    disabled={currentSubcategories.length === 0}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 font-bold focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition bg-white disabled:opacity-50"
                  >
                    <option value="">
                      {currentSubcategories.length === 0 ? '-- زیردسته‌ای تعریف نشده --' : '-- انتخاب زیردسته --'}
                    </option>
                    {currentSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* واحد سنجش اصلی و واحد فرعی با ضریب تبدیل */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">واحد سنجش اصلی:</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matchedDef = unitDefs.find((u) => u.name === selectedName);
                      setFormData((prev) => ({
                        ...prev,
                        unit: selectedName,
                        subUnit: matchedDef ? matchedDef.subUnit : prev.subUnit,
                        conversionFactor: matchedDef ? matchedDef.conversionFactor : prev.conversionFactor,
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 font-bold focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition bg-white"
                  >
                    <option value="عدد">عدد</option>
                    {Array.from(new Set(unitDefs.map((u) => u.name)))
                      .filter((name) => name !== 'عدد')
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    {formData.unit && formData.unit !== 'عدد' && !unitDefs.some((u) => u.name === formData.unit) && (
                      <option value={formData.unit}>{formData.unit}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    واحد فرعی و ضریب تبدیل (اختیاری):
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.subUnit || ''}
                      onChange={(e) => setFormData({ ...formData, subUnit: e.target.value })}
                      className="w-2/3 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 transition bg-white text-xs"
                    >
                      <option value="">— بدون واحد فرعی —</option>
                      {Array.from(
                        new Set([
                          ...unitDefs.map((u) => u.subUnit).filter(Boolean),
                          ...(formData.subUnit ? [formData.subUnit] : []),
                        ])
                      ).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={formData.conversionFactor}
                      onChange={(e) =>
                        setFormData({ ...formData, conversionFactor: Number(e.target.value) || 1 })
                      }
                      placeholder="ضریب (مثلاً ۱۲)"
                      className="w-1/3 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 font-mono text-xs focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* تب ۲: قیمت‌گذاری ۵ سطحی و انبار */}
          {modalTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* بخش موجودی اولیه و نقطه هشدار */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5 text-xs">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>موجودی اولیه قبل از فاکتور ({formData.unit || 'عدد'}):</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    placeholder="۰"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    (تعداد خریداری شده در فاکتور جاری پس از ثبت، به این عدد اضافه خواهد شد)
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>نقطه هشدار کسری موجودی (حداقل انبار):</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockAlert}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockAlert: Number(e.target.value) || 0 })
                    }
                    placeholder="۵"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    هنگام رسیدن موجودی به این عدد، سیستم هشدار سفارش کالا صادر می‌کند
                  </span>
                </div>
              </div>

              {/* جعبه قیمت‌گذاری ۵ سطحی با کامپوننت CurrencyInput */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">
                        قیمت‌گذاری ۵ سطحی فروشگاهی و عمده (تومان):
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        قیمت‌ها به صورت هوشمند پیشنهاد شده‌اند و هر کدام کاملاً قابل ویرایش دستی هستند
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applySmartFormulas}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="محاسبه مجدد سطوح قیمت بر مبنای حاشیه سود استاندارد"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>محاسبه هوشمند سطوح</span>
                    </button>

                    {/* بج سود ناخالص فروش نقدی */}
                    {formData.buyPrice > 0 && formData.priceShop1 > 0 && (
                      <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>سود فروش نقدی:</span>
                        <span className="font-mono font-black text-emerald-900">{formatToman(profitToman)}</span>
                        <span className="bg-emerald-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-md">
                          {profitMargin}٪
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <CurrencyInput
                    label="بهای خرید از تامین‌کننده (فی فاکتور):"
                    value={formData.buyPrice}
                    onChange={handleBuyPriceChange}
                    required
                  />

                  <CurrencyInput
                    label="فروشگاه ۱ (نقدی / حضوری مصرف‌کننده):"
                    value={formData.priceShop1}
                    onChange={(val) => setFormData({ ...formData, priceShop1: val, salePrice: val })}
                    required
                  />

                  <CurrencyInput
                    label="فروشگاه ۲ (آنلاین / ترب / سایت):"
                    value={formData.priceShop2}
                    onChange={(val) => setFormData({ ...formData, priceShop2: val })}
                  />

                  <CurrencyInput
                    label="فروشگاه ۳ (همکار / شعبه ۲):"
                    value={formData.priceShop3}
                    onChange={(val) => setFormData({ ...formData, priceShop3: val })}
                  />

                  <CurrencyInput
                    label="فروش عمده و مدارس:"
                    value={formData.wholesalePrice}
                    onChange={(val) => setFormData({ ...formData, wholesalePrice: val })}
                  />

                  <CurrencyInput
                    label="کف قیمت مجاز (حداقل تخفیف صندوق):"
                    value={formData.minAllowedPrice}
                    onChange={(val) => setFormData({ ...formData, minAllowedPrice: val })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* تب ۳: تصاویر و گالری چند عکسه */}
          {modalTab === 'gallery' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <ProductGalleryManager
                images={formData.extraImages}
                primaryImage={formData.image}
                title="گالری تصاویر کالا (سیستم حسابداری، فروشگاه آنلاین و سایت)"
                onChange={(allImgs, primary) => {
                  setFormData((prev) => ({
                    ...prev,
                    image: primary,
                    extraImages: allImgs.filter((img) => img !== primary),
                  }));
                }}
              />
            </div>
          )}

          {/* تب ۴: توضیحات و نشان‌های تبلیغاتی */}
          {modalTab === 'details' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  توضیحات و مشخصات فنی کالا (جهت نمایش در فاکتور و سایت):
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="مشخصات محصول، جنس بدنه، کشور سازنده، کاربرد، نوع نوک خودکار یا نوع کاغذ و ویژگی‌های فنی..."
                  className="w-full rounded-2xl border border-slate-300 p-3.5 text-slate-800 text-xs sm:text-sm focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 leading-relaxed bg-white"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="font-bold text-xs text-slate-800">برچسب‌ها و نشان‌های تبلیغاتی:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-amber-500 transition-colors shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.isSpecialOffer}
                      onChange={(e) => setFormData({ ...formData, isSpecialOffer: e.target.checked })}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        نمایش در پیشنهادهای شگفت‌انگیز و تخفیف ویژه
                      </span>
                      <span className="text-[10px] text-slate-500">قرارگیری در اسلایدر ویژه تخفیفات صفحه اول</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-amber-500 transition-colors shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        محصول تولید اختصاصی برند خطی‌نو
                      </span>
                      <span className="text-[10px] text-slate-500">نمایش نشان تولید اختصاصی / برند خطی‌نو روی کالا</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* نوار فوتر با دکمه‌های ناوبری و ثبت */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* خلاصه سریع اطلاعات کلیدی کالا */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>
                کالا: <strong className="text-slate-800">{formData.name ? formData.name.slice(0, 25) + '...' : '---'}</strong>
              </span>
              <span>•</span>
              <span>
                خرید:{' '}
                <strong className="text-slate-900 font-mono">
                  {formData.buyPrice > 0 ? formatToman(formData.buyPrice) : '۰'}
                </strong>
              </span>
              <span>•</span>
              <span>
                فروش نقدی:{' '}
                <strong className="text-amber-600 font-mono">
                  {formData.priceShop1 > 0 ? formatToman(formData.priceShop1) : '۰'}
                </strong>
              </span>
            </div>

            {/* کلیدهای ناوبری بین تب‌ها و ثبت نهایی */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {currentTabIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setModalTab(tabList[currentTabIndex - 1].id)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>
              )}

              {currentTabIndex < tabList.length - 1 && (
                <button
                  type="button"
                  onClick={() => setModalTab(tabList[currentTabIndex + 1].id)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>مرحله بعد</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 font-bold text-xs text-slate-600 hover:bg-slate-100 transition border border-slate-200 cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 sm:px-6 py-2.5 font-bold text-xs sm:text-sm text-white shadow-md shadow-amber-200 hover:bg-amber-600 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>ثبت کالا و افزودن به فاکتور</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
