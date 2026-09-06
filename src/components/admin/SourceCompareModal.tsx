import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Search,
  RefreshCw,
  ExternalLink,
  Store,
  Layers,
  Eye,
  X,
  Check,
  CheckCircle2,
  CheckSquare,
  Square,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Download,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

export interface SourceCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery: string;
  targetItem?: any;
  onImportSuccess?: () => void;
  onApplyToSellerItem?: (updates: {
    digikalaPrice?: number;
    emallsPrice?: number;
    majdmarketPrice?: number;
    tahrir20Price?: number;
    timetahrirePrice?: number;
    sellers?: any[];
    gallery?: string[];
  }) => void;
}

export const SourceCompareModal: React.FC<SourceCompareModalProps> = ({
  isOpen,
  onClose,
  initialQuery,
  targetItem,
  onImportSuccess,
  onApplyToSellerItem,
}) => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'torob' | 'digikala' | 'emalls' | 'majdmarket' | 'tahrir20'>('all');

  const [compareData, setCompareData] = useState<{
    query: string;
    torob: any[];
    digikala: any[];
    emalls: any[];
    majdmarket: any[];
    tahrir20: any[];
    generatedAt: string;
  } | null>(null);

  // Selected candidates from each source
  const [selectedTorob, setSelectedTorob] = useState<any | null>(null);
  const [selectedDigikala, setSelectedDigikala] = useState<any | null>(null);
  const [selectedEmalls, setSelectedEmalls] = useState<any | null>(null);
  const [selectedMajdmarket, setSelectedMajdmarket] = useState<any | null>(null);
  const [selectedTahrir20, setSelectedTahrir20] = useState<any | null>(null);

  // Gallery image selection
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [primaryCoverImage, setPrimaryCoverImage] = useState<string>('');
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);

  // Import configurations
  const [storageDestination, setStorageDestination] = useState<'both' | 'site_only' | 'accounting_only'>('both');
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [priceShop1, setPriceShop1] = useState<number>(0);
  const [priceShop2, setPriceShop2] = useState<number>(0);
  const [priceShop3, setPriceShop3] = useState<number>(0);
  const [stock, setStock] = useState<number>(25);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data whenever modal opens or query changes
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || targetItem?.title || '';
      setSearchQuery(q);
      loadComparison(q, false);
    }
  }, [isOpen, initialQuery, targetItem]);

  const loadComparison = async (q: string, refresh = false) => {
    const cleanQ = q.trim();
    if (!cleanQ) return;
    setIsLoading(true);
    try {
      const res = await api.compareSources(cleanQ, 6, refresh);
      setCompareData(res);

      // Auto-select first item from each source
      const firstTorob = res.torob?.[0] || null;
      const firstDigi = res.digikala?.[0] || null;
      const firstEmalls = res.emalls?.[0] || null;
      const firstMajd = res.majdmarket?.[0] || null;
      const firstTahrir = res.tahrir20?.[0] || null;

      setSelectedTorob(firstTorob);
      setSelectedDigikala(firstDigi);
      setSelectedEmalls(firstEmalls);
      setSelectedMajdmarket(firstMajd);
      setSelectedTahrir20(firstTahrir);

      // Collect initial gallery images
      const initialPool: string[] = [];
      [firstTorob, firstDigi, firstEmalls, firstMajd, firstTahrir].forEach((item) => {
        if (!item) return;
        if (item.image) initialPool.push(item.image);
        if (Array.isArray(item.images)) initialPool.push(...item.images);
      });
      if (targetItem?.image) initialPool.push(targetItem.image);
      if (Array.isArray(targetItem?.gallery)) initialPool.push(...targetItem.gallery);

      const uniqueImgs = Array.from(new Set(initialPool.filter(Boolean)));
      setSelectedImages(uniqueImgs);
      setPrimaryCoverImage(uniqueImgs[0] || targetItem?.image || '');

      // Calculate initial pricing
      const validPrices = [
        firstTorob?.price,
        firstDigi?.price,
        firstEmalls?.price,
        firstMajd?.price,
        firstTahrir?.price,
      ].filter((p): p is number => typeof p === 'number' && p > 0);

      const baseMin = validPrices.length > 0 ? Math.min(...validPrices) : (targetItem?.minPrice || 0);

      if (baseMin > 0) {
        setBuyPrice(Math.round(baseMin * 0.8));
        setPriceShop1(Math.round(baseMin * 1.05));
        setPriceShop2(baseMin);
        setPriceShop3(Math.round(baseMin * 0.9));
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در دریافت مقایسه چندمنبعی بازار', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComparison(searchQuery, false);
  };

  const handleRefresh = () => {
    loadComparison(searchQuery, true);
    showToast('در حال استعلام تازه بدون کش از ۵ منبع بازار...', 'info');
  };

  // When user clicks to select/unselect an offer from a source
  const handleSelectOffer = (source: 'torob' | 'digikala' | 'emalls' | 'majdmarket' | 'tahrir20', offer: any) => {
    let nextTorob = selectedTorob;
    let nextDigi = selectedDigikala;
    let nextEmalls = selectedEmalls;
    let nextMajd = selectedMajdmarket;
    let nextTahrir = selectedTahrir20;

    if (source === 'torob') {
      nextTorob = selectedTorob?.id === offer.id ? null : offer;
      setSelectedTorob(nextTorob);
    } else if (source === 'digikala') {
      nextDigi = selectedDigikala?.id === offer.id ? null : offer;
      setSelectedDigikala(nextDigi);
    } else if (source === 'emalls') {
      nextEmalls = selectedEmalls?.id === offer.id ? null : offer;
      setSelectedEmalls(nextEmalls);
    } else if (source === 'majdmarket') {
      nextMajd = selectedMajdmarket?.id === offer.id ? null : offer;
      setSelectedMajdmarket(nextMajd);
    } else if (source === 'tahrir20') {
      nextTahrir = selectedTahrir20?.id === offer.id ? null : offer;
      setSelectedTahrir20(nextTahrir);
    }

    // Refresh image pool
    const newPool: string[] = [];
    [nextTorob, nextDigi, nextEmalls, nextMajd, nextTahrir].forEach((item) => {
      if (!item) return;
      if (item.image) newPool.push(item.image);
      if (Array.isArray(item.images)) newPool.push(...item.images);
    });
    if (targetItem?.image) newPool.push(targetItem.image);
    if (Array.isArray(targetItem?.gallery)) newPool.push(...targetItem.gallery);

    const unique = Array.from(new Set(newPool.filter(Boolean)));
    setSelectedImages(unique);
    if (!primaryCoverImage || !unique.includes(primaryCoverImage)) {
      setPrimaryCoverImage(unique[0] || '');
    }

    // Update prices
    const validPrices = [
      nextTorob?.price,
      nextDigi?.price,
      nextEmalls?.price,
      nextMajd?.price,
      nextTahrir?.price,
    ].filter((p): p is number => typeof p === 'number' && p > 0);

    if (validPrices.length > 0) {
      const minP = Math.min(...validPrices);
      setBuyPrice(Math.round(minP * 0.8));
      setPriceShop1(Math.round(minP * 1.05));
      setPriceShop2(minP);
      setPriceShop3(Math.round(minP * 0.9));
    }
  };

  // Image toggle in the gallery
  const toggleImageSelection = (imgUrl: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imgUrl)) {
        if (prev.length <= 1) {
          showToast('حداقل یک تصویر باید برای کالا انتخاب شده باشد.', 'warning');
          return prev;
        }
        const filtered = prev.filter((u) => u !== imgUrl);
        if (primaryCoverImage === imgUrl) {
          setPrimaryCoverImage(filtered[0] || '');
        }
        return filtered;
      } else {
        return [...prev, imgUrl];
      }
    });
  };

  // Calculate pricing metrics across selected offers
  const priceMetrics = useMemo(() => {
    const list: Array<{ source: string; price: number; title: string }> = [];
    if (selectedTorob && selectedTorob.price > 0) {
      list.push({ source: 'ترب', price: selectedTorob.price, title: selectedTorob.title });
    }
    if (selectedDigikala && selectedDigikala.price > 0) {
      list.push({ source: 'دیجی‌کالا', price: selectedDigikala.price, title: selectedDigikala.title });
    }
    if (selectedEmalls && selectedEmalls.price > 0) {
      list.push({ source: 'ایمالز', price: selectedEmalls.price, title: selectedEmalls.title });
    }
    if (selectedMajdmarket && selectedMajdmarket.price > 0) {
      list.push({ source: 'مجدمارکت', price: selectedMajdmarket.price, title: selectedMajdmarket.title });
    }
    if (selectedTahrir20 && selectedTahrir20.price > 0) {
      list.push({ source: 'تحریر۲۰', price: selectedTahrir20.price, title: selectedTahrir20.title });
    }

    if (list.length === 0) return null;

    const prices = list.map((i) => i.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const spread = maxPrice - minPrice;
    const spreadPercent = minPrice > 0 ? Math.round((spread / minPrice) * 100) : 0;

    return {
      list,
      minPrice,
      maxPrice,
      avgPrice,
      spread,
      spreadPercent,
    };
  }, [selectedTorob, selectedDigikala, selectedEmalls, selectedMajdmarket, selectedTahrir20]);

  // Apply to active seller item modal
  const handleApplyToActiveItem = () => {
    if (!onApplyToSellerItem) return;

    const customSellers: any[] = [];
    if (selectedTorob) {
      customSellers.push({
        storeName: `ترب (${selectedTorob.seller || 'فروشگاه برگزیده'})`,
        city: 'انبار ترب',
        score: 4.8,
        price: selectedTorob.price,
        inStock: true,
        lastUpdated: 'انتخاب دستی کاربر',
        updatedRecently: true,
        warranty: 'تضمین اصالت ترب',
        shopUrl: selectedTorob.url,
      });
    }
    if (selectedDigikala) {
      customSellers.push({
        storeName: `دیجی‌کالا (${selectedDigikala.seller || 'انبار رسمی'})`,
        city: 'ارسال از انبار دیجی‌کالا',
        score: 4.9,
        price: selectedDigikala.price,
        inStock: true,
        lastUpdated: 'انتخاب دستی کاربر',
        updatedRecently: true,
        warranty: 'ضمانت اصالت فیزیکی دیجی‌کالا',
        shopUrl: selectedDigikala.url,
      });
    }
    if (selectedEmalls) {
      customSellers.push({
        storeName: `ایمالز (${selectedEmalls.seller || 'فروشنده همکار'})`,
        city: 'تهران',
        score: 4.7,
        price: selectedEmalls.price,
        inStock: true,
        lastUpdated: 'انتخاب دستی کاربر',
        updatedRecently: true,
        warranty: 'ضمانت ایمالز',
        shopUrl: selectedEmalls.url,
      });
    }
    if (selectedMajdmarket) {
      customSellers.push({
        storeName: `مجدمارکت (${selectedMajdmarket.seller || 'فروشگاه تخصصی تحریر'})`,
        city: 'تهران - بازار بزرگ',
        score: 4.8,
        price: selectedMajdmarket.price,
        inStock: selectedMajdmarket.inStock !== false,
        lastUpdated: 'انتخاب دستی کاربر',
        updatedRecently: true,
        warranty: 'تضمین اصالت مجدمارکت',
        shopUrl: selectedMajdmarket.url,
      });
    }
    if (selectedTahrir20) {
      customSellers.push({
        storeName: `تحریر۲۰ (${selectedTahrir20.seller || 'فروشگاه تخصصی تحریر'})`,
        city: 'تهران / ارسال سراسری',
        score: 4.8,
        price: selectedTahrir20.price,
        inStock: selectedTahrir20.inStock !== false,
        lastUpdated: 'انتخاب دستی کاربر',
        updatedRecently: true,
        warranty: 'ضمانت تحریر۲۰',
        shopUrl: selectedTahrir20.url,
      });
    }

    onApplyToSellerItem({
      digikalaPrice: selectedDigikala?.price,
      emallsPrice: selectedEmalls?.price,
      majdmarketPrice: selectedMajdmarket?.price,
      tahrir20Price: selectedTahrir20?.price,
      sellers: customSellers,
      gallery: selectedImages,
    });

    showToast('اطلاعات منابع و قیمت‌های انتخابی روی پیش‌نمایش کالا اعمال شد.', 'success');
  };

  // Submit and save to Khatinoo Inventory
  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImages.length === 0) {
      showToast('لطفاً حداقل یک تصویر برای کالا انتخاب فرمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const showOnWebsite = storageDestination === 'both' || storageDestination === 'site_only';
      const onlyAccounting = storageDestination === 'accounting_only';

      const finalTitle =
        selectedTorob?.title ||
        selectedDigikala?.title ||
        selectedEmalls?.title ||
        selectedMajdmarket?.title ||
        selectedTahrir20?.title ||
        targetItem?.title ||
        searchQuery;

      const mainImg = primaryCoverImage || selectedImages[0] || targetItem?.image || '';

      await api.importTorobToInventory({
        name: finalTitle,
        category: targetItem?.category || 'لوازم تحریر و نوشت‌افزار',
        brand: targetItem?.brand || 'استاندارد',
        unit: targetItem?.unit || 'عدد',
        image: mainImg,
        gallery: selectedImages,
        extraImages: selectedImages,
        buyPrice,
        priceShop1,
        priceShop2,
        priceShop3,
        stock,
        minStock: 5,
        showOnWebsite,
        onlyAccounting,
      });

      const destLabel =
        storageDestination === 'both'
          ? 'سایت آنلاین و نرم‌افزار حسابداری'
          : storageDestination === 'site_only'
          ? 'فقط وب‌سایت آنلاین'
          : 'فقط سیستم حسابداری و انبارداری داخلی';

      showToast(
        `کالای «${finalTitle}» همراه با تمام ${toPersianDigits(selectedImages.length)} تصویر و با مقایسه ۵ منبع در (${destLabel}) ذخیره گردید.`,
        'success'
      );

      if (onImportSuccess) {
        onImportSuccess();
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت نهایی کالا در انبار', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-multi-source-compare"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="relative w-full max-w-6xl bg-[#111114] border border-[#C9A227]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#E0E0E0] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================== */}
        {/* MODAL HEADER */}
        {/* ===================================================================== */}
        <div className="p-4 sm:p-5 border-b border-[#222225] bg-gradient-to-r from-[#17171E] via-[#1A1A22] to-[#17171E] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C9A227]/20 to-purple-500/20 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shrink-0 shadow-inner">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-[#F3F4F6] tracking-tight">
                  رصد و مقایسه چندمنبعی بازار تحریر
                </h3>
                <span className="text-[10px] bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 px-2 py-0.5 rounded-full font-bold">
                  ترب • دیجی‌کالا • ایمالز • مجدمارکت • تحریر۲۰
                </span>
              </div>
              <p className="text-xs text-[#8E9299] line-clamp-1 mt-0.5">
                تطبیق دستی کاندیداها، تجمیع گالری تصاویر بدون تکرار و استعلام همزمان ۵ منبع برتر بازار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#1E1E26] hover:bg-[#282834] text-[#C9A227] border border-[#33333F] transition-all cursor-pointer"
              title="استعلام زنده بدون کش"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1E1E26] hover:bg-[#282834] text-[#8E9299] hover:text-white transition-all cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SEARCH BAR & SOURCE TABS */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-4 border-b border-[#222225] bg-[#141418] flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8E9299] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو یا ویرایش نام کالا برای تطبیق در ۵ منبع..."
                className="w-full bg-[#1A1A20] border border-[#2D2D35] focus:border-[#C9A227] rounded-xl pr-10 pl-3 py-2 text-xs text-white placeholder-[#666] outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>جستجو در ۵ منبع</span>
            </button>
          </form>

          {/* Tab buttons for mobile or filtering */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-[#1A1A20] rounded-xl border border-[#2D2D35] text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#C9A227] text-slate-950 shadow-sm'
                  : 'text-[#8E9299] hover:text-white'
              }`}
            >
              همه منابع (۵ ستونه)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('torob')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'torob'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[#8E9299] hover:text-white'
              }`}
            >
              🟣 ترب ({toPersianDigits(compareData?.torob?.length || 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('digikala')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'digikala'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[#8E9299] hover:text-white'
              }`}
            >
              🔴 دیجی‌کالا ({toPersianDigits(compareData?.digikala?.length || 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('emalls')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'emalls'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#8E9299] hover:text-white'
              }`}
            >
              🔵 ایمالز ({toPersianDigits(compareData?.emalls?.length || 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('majdmarket')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'majdmarket'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-[#8E9299] hover:text-white'
              }`}
            >
              🟠 مجدمارکت ({toPersianDigits(compareData?.majdmarket?.length || 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tahrir20')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'tahrir20'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[#8E9299] hover:text-white'
              }`}
            >
              🟢 تحریر۲۰ ({toPersianDigits(compareData?.tahrir20?.length || 0)})
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* MAIN BODY: 5-COLUMN CARDS + PRICE SUMMARY + UNIFIED GALLERY */}
        {/* ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#C9A227] animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#F3F4F6]">
                  در حال استعلام همزمان از ترب، دیجی‌کالا، ایمالز، مجدمارکت و تحریر۲۰...
                </h4>
                <p className="text-xs text-[#8E9299]">
                  در حال واکشی اطلاعات قیمت، گالری تصاویر و فروشندگان معتبر
                </p>
              </div>
            </div>
          ) : !compareData ? (
            <div className="py-20 text-center space-y-2">
              <Layers className="w-10 h-10 text-[#555] mx-auto" />
              <p className="text-xs text-[#8E9299]">برای شروع مقایسه، نام کالا را جستجو نمایید.</p>
            </div>
          ) : (
            <>
              {/* --- 1. THE 5 COLUMNS OF OFFERS --- */}
              <div
                className={`grid gap-4 ${
                  activeTab === 'all'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {/* SOURCE 1: TOROB */}
                {(activeTab === 'all' || activeTab === 'torob') && (
                  <div className="bg-[#141418] border border-purple-500/30 rounded-2xl p-3 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#252530]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                        <span className="font-black text-xs text-purple-300">ترب (Torob)</span>
                      </div>
                      <span className="text-[10px] text-[#8E9299]">
                        {toPersianDigits(compareData.torob.length)} کاندید
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 max-h-[380px] overflow-y-auto pr-0.5">
                      {compareData.torob.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#666]">
                          موردی در ترب یافت نشد
                        </div>
                      ) : (
                        compareData.torob.map((item: any) => {
                          const isSelected = selectedTorob?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectOffer('torob', item)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                                  : 'bg-[#181820] border-[#2B2B35] hover:border-purple-500/40'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="relative w-12 h-12 rounded-lg bg-black/40 border border-[#333] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-[#555]" />
                                  )}
                                  {item.images && item.images.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-[#C9A227] px-1 font-mono">
                                      {toPersianDigits(item.images.length)}📷
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <h5 className="text-[11px] font-bold text-[#F3F4F6] line-clamp-2 leading-tight">
                                    {item.title}
                                  </h5>
                                  <div className="text-[10px] text-[#8E9299] mt-1 line-clamp-1">
                                    {item.seller || 'فروشنده ترب'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[#252530] text-[11px]">
                                <div className="font-mono font-black text-purple-300">
                                  {formatToman(item.price)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded-md text-[#8E9299] hover:text-white"
                                      title="مشاهده در ترب"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isSelected
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-[#22222C] text-[#8E9299]'
                                    }`}
                                  >
                                    {isSelected ? '✓ انتخاب شد' : 'انتخاب'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* SOURCE 2: DIGIKALA */}
                {(activeTab === 'all' || activeTab === 'digikala') && (
                  <div className="bg-[#141418] border border-rose-500/30 rounded-2xl p-3 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#252530]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-black text-xs text-rose-300">دیجی‌کالا (Digikala)</span>
                      </div>
                      <span className="text-[10px] text-[#8E9299]">
                        {toPersianDigits(compareData.digikala.length)} کاندید
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 max-h-[380px] overflow-y-auto pr-0.5">
                      {compareData.digikala.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#666]">
                          موردی در دیجی‌کالا یافت نشد
                        </div>
                      ) : (
                        compareData.digikala.map((item: any) => {
                          const isSelected = selectedDigikala?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectOffer('digikala', item)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                                  : 'bg-[#181820] border-[#2B2B35] hover:border-rose-500/40'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="relative w-12 h-12 rounded-lg bg-black/40 border border-[#333] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-[#555]" />
                                  )}
                                  {item.images && item.images.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-[#C9A227] px-1 font-mono">
                                      {toPersianDigits(item.images.length)}📷
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <h5 className="text-[11px] font-bold text-[#F3F4F6] line-clamp-2 leading-tight">
                                    {item.title}
                                  </h5>
                                  <div className="text-[10px] text-[#8E9299] mt-1 line-clamp-1">
                                    {item.seller || 'انبار رسمی دیجی‌کالا'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[#252530] text-[11px]">
                                <div className="font-mono font-black text-rose-300">
                                  {formatToman(item.price)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded-md text-[#8E9299] hover:text-white"
                                      title="مشاهده در دیجی‌کالا"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isSelected
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-[#22222C] text-[#8E9299]'
                                    }`}
                                  >
                                    {isSelected ? '✓ انتخاب شد' : 'انتخاب'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* SOURCE 3: EMALLS */}
                {(activeTab === 'all' || activeTab === 'emalls') && (
                  <div className="bg-[#141418] border border-blue-500/30 rounded-2xl p-3 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#252530]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-black text-xs text-blue-300">ایمالز (Emalls)</span>
                      </div>
                      <span className="text-[10px] text-[#8E9299]">
                        {toPersianDigits(compareData.emalls.length)} کاندید
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 max-h-[380px] overflow-y-auto pr-0.5">
                      {compareData.emalls.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#666]">
                          موردی در ایمالز یافت نشد
                        </div>
                      ) : (
                        compareData.emalls.map((item: any) => {
                          const isSelected = selectedEmalls?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectOffer('emalls', item)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                                  : 'bg-[#181820] border-[#2B2B35] hover:border-blue-500/40'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="relative w-12 h-12 rounded-lg bg-black/40 border border-[#333] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-[#555]" />
                                  )}
                                  {item.images && item.images.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-[#C9A227] px-1 font-mono">
                                      {toPersianDigits(item.images.length)}📷
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <h5 className="text-[11px] font-bold text-[#F3F4F6] line-clamp-2 leading-tight">
                                    {item.title}
                                  </h5>
                                  <div className="text-[10px] text-[#8E9299] mt-1 line-clamp-1">
                                    {item.seller || 'فروشنده ایمالز'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[#252530] text-[11px]">
                                <div className="font-mono font-black text-blue-300">
                                  {formatToman(item.price)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded-md text-[#8E9299] hover:text-white"
                                      title="مشاهده در ایمالز"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[#22222C] text-[#8E9299]'
                                    }`}
                                  >
                                    {isSelected ? '✓ انتخاب شد' : 'انتخاب'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* SOURCE 4: MAJDMARKET */}
                {(activeTab === 'all' || activeTab === 'majdmarket') && (
                  <div className="bg-[#141418] border border-amber-500/30 rounded-2xl p-3 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#252530]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-black text-xs text-amber-400">مجدمارکت (تخصصی تحریر)</span>
                      </div>
                      <span className="text-[10px] text-[#8E9299]">
                        {toPersianDigits(compareData.majdmarket.length)} کاندید
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 max-h-[380px] overflow-y-auto pr-0.5">
                      {compareData.majdmarket.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#666]">
                          موردی در مجدمارکت یافت نشد
                        </div>
                      ) : (
                        compareData.majdmarket.map((item: any) => {
                          const isSelected = selectedMajdmarket?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectOffer('majdmarket', item)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                                  : 'bg-[#181820] border-[#2B2B35] hover:border-amber-500/40'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="relative w-12 h-12 rounded-lg bg-black/40 border border-[#333] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-[#555]" />
                                  )}
                                  {item.images && item.images.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-[#C9A227] px-1 font-mono">
                                      {toPersianDigits(item.images.length)}📷
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <h5 className="text-[11px] font-bold text-[#F3F4F6] line-clamp-2 leading-tight">
                                    {item.title}
                                  </h5>
                                  <div className="text-[10px] text-[#8E9299] mt-1 line-clamp-1">
                                    {item.seller || 'فروشگاه مجدمارکت'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[#252530] text-[11px]">
                                <div className="font-mono font-black text-amber-300">
                                  {formatToman(item.price)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded-md text-[#8E9299] hover:text-white"
                                      title="مشاهده در مجدمارکت"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isSelected
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-[#22222C] text-[#8E9299]'
                                    }`}
                                  >
                                    {isSelected ? '✓ انتخاب شد' : 'انتخاب'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* SOURCE 5: TAHRIR20 */}
                {(activeTab === 'all' || activeTab === 'tahrir20') && (
                  <div className="bg-[#141418] border border-emerald-500/30 rounded-2xl p-3 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#252530]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-black text-xs text-emerald-400">تحریر۲۰ (تخصصی تحریر)</span>
                      </div>
                      <span className="text-[10px] text-[#8E9299]">
                        {toPersianDigits(compareData.tahrir20.length)} کاندید
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 max-h-[380px] overflow-y-auto pr-0.5">
                      {compareData.tahrir20.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#666]">
                          موردی در تحریر۲۰ یافت نشد
                        </div>
                      ) : (
                        compareData.tahrir20.map((item: any) => {
                          const isSelected = selectedTahrir20?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectOffer('tahrir20', item)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                                  : 'bg-[#181820] border-[#2B2B35] hover:border-emerald-500/40'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="relative w-12 h-12 rounded-lg bg-black/40 border border-[#333] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-[#555]" />
                                  )}
                                  {item.images && item.images.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-[#C9A227] px-1 font-mono">
                                      {toPersianDigits(item.images.length)}📷
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <h5 className="text-[11px] font-bold text-[#F3F4F6] line-clamp-2 leading-tight">
                                    {item.title}
                                  </h5>
                                  <div className="text-[10px] text-[#8E9299] mt-1 line-clamp-1">
                                    {item.seller || 'فروشگاه تخصصی تحریر۲۰'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[#252530] text-[11px]">
                                <div className="font-mono font-black text-emerald-300">
                                  {formatToman(item.price)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded-md text-[#8E9299] hover:text-white"
                                      title="مشاهده در تحریر۲۰"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isSelected
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-[#22222C] text-[#8E9299]'
                                    }`}
                                  >
                                    {isSelected ? '✓ انتخاب شد' : 'انتخاب'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* --- 2. LIVE PRICE BENCHMARK & MARGIN SUMMARY --- */}
              {priceMetrics && (
                <div className="bg-gradient-to-r from-[#171720] via-[#1B1B25] to-[#171720] border border-[#2B2B38] rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#282835]">
                    <div className="flex items-center gap-2 text-xs font-black text-[#F3F4F6]">
                      <Sparkles className="w-4 h-4 text-[#C9A227]" />
                      <span>تحلیل هوشمند و تراز قیمت منابع انتخابی:</span>
                    </div>
                    {onApplyToSellerItem && (
                      <button
                        type="button"
                        onClick={handleApplyToActiveItem}
                        className="text-[11px] font-bold bg-[#C9A227]/20 hover:bg-[#C9A227]/30 text-[#C9A227] border border-[#C9A227]/40 px-3 py-1 rounded-xl transition-all cursor-pointer"
                      >
                        اعمال این منابع روی کارد پیش‌نمایش ترب
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#121216] p-2.5 rounded-xl border border-[#242430]">
                      <div className="text-[10px] text-[#8E9299]">کمترین قیمت بازار:</div>
                      <div className="font-mono font-black text-emerald-400 text-sm mt-0.5">
                        {formatToman(priceMetrics.minPrice)}
                      </div>
                    </div>

                    <div className="bg-[#121216] p-2.5 rounded-xl border border-[#242430]">
                      <div className="text-[10px] text-[#8E9299]">بیشترین قیمت بازار:</div>
                      <div className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                        {formatToman(priceMetrics.maxPrice)}
                      </div>
                    </div>

                    <div className="bg-[#121216] p-2.5 rounded-xl border border-[#242430]">
                      <div className="text-[10px] text-[#8E9299]">دامنه نوسان رقبا:</div>
                      <div className="font-mono font-bold text-[#C9A227] text-sm mt-0.5">
                        {toPersianDigits(priceMetrics.spreadPercent)}٪ ({formatToman(priceMetrics.spread)})
                      </div>
                    </div>

                    <div className="bg-[#121216] p-2.5 rounded-xl border border-[#242430]">
                      <div className="text-[10px] text-[#8E9299]">میانگین قیمت ۵ منبع:</div>
                      <div className="font-mono font-bold text-sky-300 text-sm mt-0.5">
                        {formatToman(priceMetrics.avgPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 3. UNIFIED MULTI-SOURCE IMAGE GALLERY --- */}
              <div className="bg-[#141419] border border-[#2A2A35] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F3F4F6]">
                    <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                    <span>گالری عکس‌های کالا (استخراج‌شده از منابع منتخب):</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {toPersianDigits(selectedImages.length)} تصویر انتخاب‌شده برای انبار
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allImgs: string[] = [];
                        [selectedTorob, selectedDigikala, selectedEmalls, selectedMajdmarket, selectedTahrir20].forEach((o) => {
                          if (!o) return;
                          if (o.image) allImgs.push(o.image);
                          if (Array.isArray(o.images)) allImgs.push(...o.images);
                        });
                        setSelectedImages(Array.from(new Set(allImgs.filter(Boolean))));
                      }}
                      className="text-[#8E9299] hover:text-white underline cursor-pointer"
                    >
                      انتخاب همه
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 pt-1">
                  {selectedImages.map((imgUrl, idx) => {
                    const isCover = primaryCoverImage === imgUrl;
                    return (
                      <div
                        key={idx}
                        className={`relative group rounded-xl overflow-hidden bg-[#1A1A22] border p-1 aspect-square flex items-center justify-center transition-all ${
                          isCover
                            ? 'border-[#C9A227] ring-2 ring-[#C9A227]/40 shadow-lg'
                            : 'border-[#2D2D38] hover:border-[#555]'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`تصویر ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain cursor-pointer"
                          onClick={() => setZoomedImage({ src: imgUrl, title: `تصویر ${idx + 1}` })}
                        />

                        {/* Cover image label & button */}
                        <button
                          type="button"
                          onClick={() => setPrimaryCoverImage(imgUrl)}
                          className={`absolute bottom-1 inset-x-1 text-[8px] font-bold py-0.5 rounded text-center transition-all cursor-pointer ${
                            isCover
                              ? 'bg-[#C9A227] text-slate-950 font-black'
                              : 'bg-black/80 text-[#8E9299] opacity-0 group-hover:opacity-100 hover:text-white'
                          }`}
                        >
                          {isCover ? '⭐ تصویر اصلی' : 'تنظیم به عنوان اصلی'}
                        </button>

                        {/* Checkbox toggle */}
                        <button
                          type="button"
                          onClick={() => toggleImageSelection(imgUrl)}
                          className="absolute top-1 left-1 p-0.5 rounded bg-black/80 text-white cursor-pointer"
                          title="حذف یا بازگرداندن این تصویر از ثبت نهایی"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* --- 4. DESTINATION & INVENTORY SYNC FORM --- */}
              <form onSubmit={handleConfirmImport} className="space-y-4 pt-2">
                <div className="bg-[#141419] border border-[#2A2A35] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#F3F4F6]">
                    <Store className="w-4 h-4 text-[#C9A227]" />
                    <span>تعیین محل ذخیره‌سازی، موجودی و قیمت‌گذاری چندسطحی:</span>
                  </div>

                  {/* Destination Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setStorageDestination('both')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                        storageDestination === 'both'
                          ? 'bg-[#C9A227]/15 border-[#C9A227] text-white shadow-md'
                          : 'bg-[#181820] border-[#2A2A35] hover:border-[#444] text-[#8E9299]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🌐 + 📊</span>
                        <input
                          type="radio"
                          name="compareDest"
                          checked={storageDestination === 'both'}
                          onChange={() => setStorageDestination('both')}
                          className="accent-[#C9A227]"
                        />
                      </div>
                      <div>
                        <strong
                          className={`block text-xs ${
                            storageDestination === 'both' ? 'text-[#C9A227]' : 'text-[#E0E0E0]'
                          }`}
                        >
                          هم در وب‌سایت هم در حسابداری
                        </strong>
                        <span className="text-[10px] text-[#8E9299] block mt-0.5">
                          توزیع جامع کالا در کل سامانه خطی‌نو
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setStorageDestination('site_only')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                        storageDestination === 'site_only'
                          ? 'bg-sky-500/15 border-sky-500 text-white shadow-md'
                          : 'bg-[#181820] border-[#2A2A35] hover:border-[#444] text-[#8E9299]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🌐</span>
                        <input
                          type="radio"
                          name="compareDest"
                          checked={storageDestination === 'site_only'}
                          onChange={() => setStorageDestination('site_only')}
                          className="accent-sky-500"
                        />
                      </div>
                      <div>
                        <strong
                          className={`block text-xs ${
                            storageDestination === 'site_only' ? 'text-sky-400' : 'text-[#E0E0E0]'
                          }`}
                        >
                          فقط در وب‌سایت آنلاین
                        </strong>
                        <span className="text-[10px] text-[#8E9299] block mt-0.5">
                          نمایش در فروشگاه آنلاین خطی‌نو
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setStorageDestination('accounting_only')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                        storageDestination === 'accounting_only'
                          ? 'bg-purple-500/15 border-purple-500 text-white shadow-md'
                          : 'bg-[#181820] border-[#2A2A35] hover:border-[#444] text-[#8E9299]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">📊</span>
                        <input
                          type="radio"
                          name="compareDest"
                          checked={storageDestination === 'accounting_only'}
                          onChange={() => setStorageDestination('accounting_only')}
                          className="accent-purple-500"
                        />
                      </div>
                      <div>
                        <strong
                          className={`block text-xs ${
                            storageDestination === 'accounting_only'
                              ? 'text-purple-400'
                              : 'text-[#E0E0E0]'
                          }`}
                        >
                          فقط در حسابداری (مخفی از سایت)
                        </strong>
                        <span className="text-[10px] text-[#8E9299] block mt-0.5">
                          انبارداری داخلی و فاکتورهای شرکتی
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock and Price Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">
                        موجودی انبار (عدد):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={stock}
                        onChange={(e) => setStock(Number(e.target.value) || 0)}
                        className="w-full bg-[#1A1A22] border border-[#2D2D38] rounded-xl px-3 py-2 text-white font-mono text-center focus:border-[#C9A227] outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">
                        قیمت خرید برآوردی (تومان):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(Number(e.target.value) || 0)}
                        className="w-full bg-[#1A1A22] border border-[#2D2D38] rounded-xl px-3 py-2 text-emerald-400 font-mono text-center focus:border-[#C9A227] outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">
                        قیمت فروش آنلاین رقابتی (تومان):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={priceShop2}
                        onChange={(e) => setPriceShop2(Number(e.target.value) || 0)}
                        className="w-full bg-[#1A1A22] border border-[#2D2D38] rounded-xl px-3 py-2 text-[#C9A227] font-mono text-center focus:border-[#C9A227] outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">
                        قیمت عمده / همکار (تومان):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={priceShop3}
                        onChange={(e) => setPriceShop3(Number(e.target.value) || 0)}
                        className="w-full bg-[#1A1A22] border border-[#2D2D38] rounded-xl px-3 py-2 text-blue-400 font-mono text-center focus:border-[#C9A227] outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-[#222228] hover:bg-[#2C2C34] text-[#8E9299] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] to-amber-500 hover:from-[#B38E1E] hover:to-amber-600 text-slate-950 text-xs font-black transition-all shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting ? (
                      <span>در حال ثبت در سیستم...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-black" />
                        <span>ثبت در انبار با تصاویر و منابع منتخب</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* ===================================================================== */}
        {/* IMAGE ZOOM OVERLAY */}
        {/* ===================================================================== */}
        {zoomedImage && (
          <div
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] p-2 bg-[#1A1A20] rounded-2xl border border-[#333] flex flex-col items-center gap-3">
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-3 right-3 bg-black/80 text-white p-1.5 rounded-xl hover:bg-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={zoomedImage.src}
                alt={zoomedImage.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
              <span className="text-xs text-[#8E9299]">{zoomedImage.title}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
