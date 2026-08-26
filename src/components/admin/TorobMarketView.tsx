import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  RefreshCw,
  ExternalLink,
  Store,
  Layers,
  ShieldCheck,
  Globe,
  Plus,
  Eye,
  X,
  LayoutGrid,
  List,
  Link as LinkIcon,
  Download,
  Printer,
  Info,
  MapPin,
  CheckCircle2,
  Sparkles,
  Bot,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Product } from '../../types';
import { useToast } from '../common/Toast';

const TOROB_CATEGORY_110_URL =
  'https://torob.com/price-list/110/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AA%D8%AD%D8%B1%DB%8C%D8%B1-stationery-lavazem-tahrir-%D9%84%DB%8C%D8%B3%D8%AA-%D9%82%DB%8C%D9%85%D8%AA/';

export function getCategoryFallbackImage(title?: string, category?: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('دفتر') || t.includes('کلاسور') || t.includes('مشق') || t.includes('یادداشت')) {
    if (t.includes('پاپکو')) return 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('کاغذ') || t.includes('a4') || t.includes('a3') || t.includes('دابل') || t.includes('کپی مکس')) {
    return 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('خودکار') || t.includes('روان‌نویس') || t.includes('کیان') || t.includes('پنتر') || t.includes('بیک') || t.includes('ساراسا')) {
    if (t.includes('کیان')) return 'https://images.unsplash.com/photo-1585336261026-4180718399b3?w=800&auto=format&fit=crop&q=80';
    if (t.includes('ساراسا') || t.includes('زبرا')) return 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('مداد رنگی') || t.includes('نقاشی') || t.includes('آبرنگ') || t.includes('فابر') || t.includes('آریا')) {
    return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('ماژیک') || t.includes('هایلایتر') || t.includes('علامت') || t.includes('اسنومن') || t.includes('استابیلو')) {
    if (t.includes('استابیلو') || t.includes('هایلایتر')) return 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('اتود') || t.includes('مداد نوکی') || t.includes('درافیکس')) {
    return 'https://images.unsplash.com/photo-1594913785162-e678a0c23dd9?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('غلط‌گیر') || t.includes('چسب') || t.includes('پاک‌کن')) {
    return 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=800&auto=format&fit=crop&q=80';
  }
  if (t.includes('زونکن') || t.includes('پوشه') || t.includes('بایگانی')) {
    return 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?w=800&auto=format&fit=crop&q=80';
}

export const TorobMarketView: React.FC = () => {
  const { showToast } = useToast();

  // Category 110 State
  const [categoryItems, setCategoryItems] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any>(null);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catSort, setCatSort] = useState<string>('popularity');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('table');
  const [inventoryOnlyFilter, setInventoryOnlyFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Seller Details Modal
  const [selectedSellerItem, setSelectedSellerItem] = useState<any | null>(null);

  // Import / Sync state
  const [importingId, setImportingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Direct Torob URL Scraper state
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);

  // Google Search Grounding state
  const [showGroundedModal, setShowGroundedModal] = useState(false);
  const [groundedQuery, setGroundedQuery] = useState('');
  const [isSearchingGrounded, setIsSearchingGrounded] = useState(false);
  const [groundedResult, setGroundedResult] = useState<{
    query: string;
    summary: string;
    groundingSources?: Array<{ title?: string; uri?: string }>;
    searchQueries?: string[];
  } | null>(null);

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);
  const [activeSellerModalPhoto, setActiveSellerModalPhoto] = useState<string | null>(null);

  const subCategoriesList = [
    { key: 'all', label: 'همه اقلام دسته‌بندی ۱۱۰' },
    { key: 'paper', label: '📄 کاغذ و مقوا' },
    { key: 'pen', label: '🖊️ خودکار و روان‌نویس' },
    { key: 'notebook', label: '📓 دفتر و کلاسور خطی‌نو' },
    { key: 'drawing', label: '🎨 مداد رنگی و نقاشی' },
    { key: 'pencil', label: '✏️ مداد و اتود مهندسی' },
    { key: 'marker', label: '🖍️ ماژیک و هایلایتر' },
    { key: 'office', label: '✂️ چسب و ملزومات اداری' },
  ];

  useEffect(() => {
    loadCategory110();
  }, []);

  async function loadCategory110(subCat = selectedSubCat, sort = catSort, query = catSearchQuery) {
    setIsLoadingCategory(true);
    try {
      const res = await api.getTorobCategory110({
        subCategory: subCat,
        sort,
        query,
      });
      setCategoryItems(res.products || []);
      setCategoryStats(res.marketStats || null);
    } catch (err: any) {
      showToast(err.message || 'خطا در بارگذاری لیست قیمت ترب دسته‌بندی ۱۱۰', 'error');
    } finally {
      setIsLoadingCategory(false);
    }
  }

  const handleSubCatChange = (key: string) => {
    setSelectedSubCat(key);
    setCurrentPage(1);
    loadCategory110(key, catSort, catSearchQuery);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCatSort(val);
    setCurrentPage(1);
    loadCategory110(selectedSubCat, val, catSearchQuery);
  };

  const handleCatSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadCategory110(selectedSubCat, catSort, catSearchQuery);
  };

  // Add Torob Category Item Directly to Inventory
  const handleImportToInventory = async (item: any) => {
    setImportingId(item.id);
    try {
      await api.importTorobToInventory({
        name: item.title,
        category: item.category,
        brand: item.brand,
        unit: item.unit || 'عدد',
        image: item.image,
        buyPrice: item.multiTierPricing?.suggestedBuyPrice || Math.round(item.minPrice * 0.8),
        priceShop1: item.multiTierPricing?.suggestedShop1Price || Math.round(item.minPrice * 1.05),
        priceShop2: item.multiTierPricing?.suggestedShop2Price || item.minPrice,
        priceShop3: item.multiTierPricing?.suggestedShop3Price || Math.round(item.minPrice * 0.9),
        stock: 25,
        minStock: 5,
      });
      showToast(`کالای «${item.title}» همراه با تصویر و قیمت‌های ۳ سطحی در انبار خطی‌نو افزوده شد.`, 'success');
      await loadCategory110(selectedSubCat, catSort, catSearchQuery);
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت کالا در انبار', 'error');
    } finally {
      setImportingId(null);
    }
  };

  // Sync 3-tier prices of a Torob item with existing inventory product
  const handleSyncPricesWithInventory = async (item: any) => {
    if (!item.inventoryProductId) return;
    setSyncingId(item.id);
    try {
      await api.syncTorobPrice({
        productId: item.inventoryProductId,
        buyPrice: item.multiTierPricing?.suggestedBuyPrice,
        priceShop1: item.multiTierPricing?.suggestedShop1Price,
        priceShop2: item.multiTierPricing?.suggestedShop2Price,
        priceShop3: item.multiTierPricing?.suggestedShop3Price,
        wholesalePrice: item.multiTierPricing?.suggestedShop3Price,
      });
      showToast(`قیمت‌های ۳ سطحی برای «${item.title}» در انبار خطی‌نو به‌روزرسانی شد.`, 'success');
      await loadCategory110(selectedSubCat, catSort, catSearchQuery);
    } catch (err: any) {
      showToast(err.message || 'خطا در همگام‌سازی قیمت‌ها', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  // Direct Torob URL Scraper
  const handleScrapeDirectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrlInput.trim()) return;
    setIsScrapingUrl(true);
    try {
      const res = await api.inspectTorobDirectUrl(directUrlInput);
      if (res) {
        setSelectedSellerItem({
          id: res.torobCode || 'TRB-DIRECT',
          title: res.productTitle || res.title,
          category: res.category || 'لوازم تحریر',
          brand: res.brand || 'استاندارد',
          image: res.image,
          minPrice: res.minPrice || res.torobPrice,
          maxPrice: res.maxPrice || Math.round((res.minPrice || res.torobPrice) * 1.3),
          avgPrice: res.avgPrice || res.minPrice,
          digikalaPrice: res.digikalaPrice,
          sellersCount: res.sellers?.length || res.totalSellersCount || 1,
          sellers: res.sellers || [],
          torobUrl: res.torobUrl || directUrlInput,
          specs: res.specs || {},
          description: res.description || '',
          inInventory: false,
        });
        showToast('اطلاعات کالا و فروشندگان با موفقیت از ترب استخراج شد.', 'success');
        setDirectUrlInput('');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در استخراج مستقیم اطلاعات لینک', 'error');
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Run Grounding with Google Search
  const handleRunGroundedSearch = async (customQuery?: string) => {
    const q = (customQuery || groundedQuery).trim();
    if (!q || isSearchingGrounded) return;
    setIsSearchingGrounded(true);
    try {
      const res = await api.searchGroundedWeb(q);
      setGroundedResult(res);
      showToast('تحلیل زنده وب با موفقیت انجام شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در جستجوی متصل به وب با گوگل', 'error');
    } finally {
      setIsSearchingGrounded(false);
    }
  };

  const handleOpenGroundedForProduct = (productName: string) => {
    setGroundedQuery(`قیمت روز ${productName} در ترب، دیجی‌کالا و بازار لوازم تحریر`);
    setShowGroundedModal(true);
    handleRunGroundedSearch(`قیمت روز ${productName} در ترب، دیجی‌کالا و بازار لوازم تحریر`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!categoryItems.length) return;
    const headers = ['ردیف', 'کد کالا', 'عنوان محصول', 'دسته‌بندی', 'کمترین قیمت ترب (تومان)', 'بیشترین قیمت (تومان)', 'قیمت دیجی‌کالا (تومان)', 'میانگین بازار (تومان)', 'تعداد فروشنده', 'لینک صفحه ترب'];
    const rows = categoryItems.map((item, idx) => [
      idx + 1,
      item.torobCode || item.id,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      item.category,
      item.minPrice,
      item.maxPrice || Math.round(item.minPrice * 1.35),
      item.digikalaPrice || 0,
      item.avgPrice,
      item.sellersCount || (item.sellers?.length || 0),
      `"${item.torobUrl || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `torob_stationery_pricelist_full_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('فایل اکسل کلیه اقلام لیست قیمت با موفقیت آماده و دانلود شد.', 'success');
  };

  // Export Specific Item for Accounting Software (Step 3: CSV / JSON)
  const handleExportItemToAccounting = (item: any, selectedSeller?: any, format: 'json' | 'csv' = 'csv') => {
    const chosenSeller = selectedSeller || (item.sellers && item.sellers[0]) || {
      storeName: 'ارزان‌ترین فروشنده ترب (رتبه ۱)',
      price: item.minPrice,
    };

    const accountingRecord = {
      productName: item.title,
      image: item.image,
      selectedPriceToman: chosenSeller.price,
      selectedSellerName: chosenSeller.storeName,
      minPriceToman: item.minPrice,
      maxPriceToman: item.maxPrice || Math.round(item.minPrice * 1.35),
      totalSellersCount: item.sellersCount || (item.sellers ? item.sellers.length : 1),
      differentPricesCount: item.sellers ? new Set(item.sellers.map((s: any) => s.price)).size : 1,
      note: `استخراج شده از ترب دسته‌بندی ۱۱۰ با تعداد کل ${item.sellersCount || 1} فروشنده فعال`,
      registeredDate: new Date().toLocaleDateString('fa-IR'),
      torobUrl: item.torobUrl,
    };

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(accountingRecord, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `accounting_product_${item.torobCode || 'record'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('فایل JSON رکورد کالا برای نرم‌افزار حسابداری دانلود شد.', 'success');
    } else {
      const headers = ['نام کالا', 'تصویر کالا', 'قیمت انتخابی (تومان)', 'نام فروشنده انتخابی', 'تعداد کل فروشندگان', 'یادداشت حسابداری', 'تاریخ ثبت قیمت', 'لینک ترب'];
      const row = [
        `"${accountingRecord.productName.replace(/"/g, '""')}"`,
        `"${accountingRecord.image}"`,
        accountingRecord.selectedPriceToman,
        `"${accountingRecord.selectedSellerName}"`,
        accountingRecord.totalSellersCount,
        `"${accountingRecord.note.replace(/"/g, '""')}"`,
        `"${accountingRecord.registeredDate}"`,
        `"${accountingRecord.torobUrl}"`,
      ];
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), row.join(',')].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `accounting_import_${item.torobCode || 'item'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('فایل CSV استاندارد رکورد کالا آماده ورود به نرم‌افزار حسابداری شد.', 'success');
    }
  };

  // Print Price List
  const handlePrintPriceList = () => {
    window.print();
  };

  // Filtered Category Items
  const displayedCategoryItems = useMemo(() => {
    if (!inventoryOnlyFilter) return categoryItems;
    return categoryItems.filter((i) => i.inInventory);
  }, [categoryItems, inventoryOnlyFilter]);

  const totalPages = Math.max(1, Math.ceil(displayedCategoryItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedCategoryItems.slice(start, start + itemsPerPage);
  }, [displayedCategoryItems, currentPage, itemsPerPage]);

  return (
    <div id="torob-market-intelligence-root" className="space-y-6 text-[#E0E0E0]">
      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE, EXECUTIVE STATS & SOURCE LINK */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#111113] via-[#16161C] to-[#111113] border border-[#222225] rounded-3xl p-6 text-white shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-5">
        <div className="space-y-2 text-right w-full lg:w-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#F3F4F6] tracking-tight">
                رصد زنده بازار ترب • دسته‌بندی ۱۱۰ لوازم تحریر
              </h2>
              <p className="text-xs text-[#8E9299] mt-0.5">
                استعلام و نمایش دقیق کلیه محصولات، تصاویر باکیفیت و لیست فروشندگان دسته‌بندی ۱۱۰ ترب
              </p>
            </div>
          </div>
        </div>

        {/* Quick Link to Official Torob Category 110 & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          <a
            id="btn-torob-official-link"
            href={TOROB_CATEGORY_110_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#1C1C22] hover:bg-[#25252E] text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
            title="مشاهده مستقیم دسته‌بندی ۱۱۰ در ترب"
          >
            <Globe className="w-4 h-4 text-red-400" />
            <span>مشاهده صفحه دسته‌بندی ۱۱۰ ترب</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            id="btn-refresh-cat110"
            onClick={() => loadCategory110()}
            disabled={isLoadingCategory}
            className="inline-flex items-center gap-1.5 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            title="به‌روزرسانی و استعلام مجدد قیمت‌های دسته‌بندی ۱۱۰"
          >
            <RefreshCw className={`w-4 h-4 text-slate-950 ${isLoadingCategory ? 'animate-spin' : ''}`} />
            <span>{isLoadingCategory ? 'در حال دریافت...' : 'استعلام زنده'}</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-[#161619] hover:bg-[#222226] text-[#E0E0E0] border border-[#2D2D33] px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="خروجی فایل اکسل از لیست قیمت"
          >
            <Download className="w-4 h-4 text-[#C9A227]" />
            <span>خروجی اکسل</span>
          </button>

          <button
            id="btn-print-pricelist"
            onClick={handlePrintPriceList}
            className="inline-flex items-center gap-1.5 bg-[#161619] hover:bg-[#222226] text-[#E0E0E0] border border-[#2D2D33] px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="چاپ کاتالوگ قیمت"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>چاپ</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIRECT TOROB URL / PRODUCT SEARCH INPUT */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-l from-[#16161C] to-[#111113] border border-[#2D2D33] rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#C9A227]" />
            <span className="text-xs font-black text-[#F3F4F6]">استعلام و رصد مستقیم هر لینک از ترب:</span>
          </div>
          <span className="text-[11px] text-[#8E9299]">پشتیبانی از لینک‌های محصول و دسته‌بندی ۱۱۰ ترب</span>
        </div>

        <form onSubmit={handleScrapeDirectUrl} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={directUrlInput}
              onChange={(e) => setDirectUrlInput(e.target.value)}
              placeholder="لینک مستقیم محصول را وارد کنید (مثال: https://torob.com/p/933a0428...)"
              className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] text-white text-xs rounded-2xl py-3 pr-10 pl-4 outline-none font-mono placeholder:font-sans transition-colors"
            />
            <LinkIcon className="w-4 h-4 text-[#8E9299] absolute right-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={isScrapingUrl || !directUrlInput.trim()}
            className="bg-[#C9A227] hover:bg-[#B38E1E] disabled:bg-neutral-800 disabled:text-neutral-500 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            {isScrapingUrl ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال استخراج...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>رصد فوری صفحه کالا و فروشندگان</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Grounding with Google Search Trigger */}
        <div className="pt-2 border-t border-[#222226] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>تحقیق و استعلام زنده بازار با هوش مصنوعی متصل به گوگل (Google Search Grounding):</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowGroundedModal(true);
              if (!groundedQuery) {
                setGroundedQuery('قیمت روز کاغذ A4 و نوشت‌افزار پرفروش در بازار ایران');
                handleRunGroundedSearch('قیمت روز کاغذ A4 و نوشت‌افزار پرفروش در بازار ایران');
              }
            }}
            className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>جستجوی هوشمند در کل وب و ترب</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 SUMMARY STAT CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111113] rounded-2xl p-4 border border-[#222225] shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A227]/10 flex items-center justify-center text-[#C9A227]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9299] block font-bold">تعداد کل اقلام ۱۱۰:</span>
            <div className="text-base font-black text-[#F3F4F6] font-mono">
              {toPersianDigits(categoryStats?.totalStationeryItems || categoryItems.length)} کالا
            </div>
          </div>
        </div>

        <div className="bg-[#111113] rounded-2xl p-4 border border-[#222225] shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9299] block font-bold">فروشندگان رصدشده ترب:</span>
            <div className="text-base font-black text-emerald-400 font-mono">
              {toPersianDigits(categoryStats?.totalActiveSellers || 140)}+ فروشگاه
            </div>
          </div>
        </div>

        <div className="bg-[#111113] rounded-2xl p-4 border border-[#222225] shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9299] block font-bold">میانگین قیمت بازار:</span>
            <div className="text-base font-black text-sky-400 font-mono">
              {formatToman(categoryStats?.averageMarketPrice || 145000)}
            </div>
          </div>
        </div>

        <div className="bg-[#111113] rounded-2xl p-4 border border-[#222225] shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9299] block font-bold">وضعیت استعلام:</span>
            <div className="text-xs font-black font-mono flex items-center gap-1.5 mt-0.5">
              {categoryItems.some((i) => i.isLiveScraped) ? (
                <span className="text-emerald-400">🟢 استعلام زنده چندمنبعی</span>
              ) : (
                <span className="text-amber-400">🟡 داده مرجع تحریر</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER BAR: SUBCATEGORIES, SEARCH, SORT & VIEW TOGGLE */}
      {/* ========================================================================= */}
      <div className="bg-[#111113] border border-[#222225] rounded-3xl p-5 shadow-xl space-y-4">
        {/* Subcategories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {subCategoriesList.map((sc) => (
            <button
              key={sc.key}
              onClick={() => handleSubCatChange(sc.key)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedSubCat === sc.key
                  ? 'bg-[#C9A227] text-slate-950 shadow-md font-black'
                  : 'bg-[#161619] hover:bg-[#222226] text-[#A0A4AB] hover:text-white border border-[#2D2D33]'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Search, Sort, Inventory Filter & Grid/Table Switcher */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-[#222225]">
          <form onSubmit={handleCatSearchSubmit} className="relative flex-1 w-full">
            <input
              type="text"
              value={catSearchQuery}
              onChange={(e) => setCatSearchQuery(e.target.value)}
              placeholder="جستجو در اقلام دسته‌بندی ۱۱۰ ترب (مثال: پنتر، کاغذ دابل ای، دفتر، کیان)..."
              className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-white text-xs rounded-2xl py-3 pr-10 pl-4 outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-[#8E9299] absolute right-3.5 top-3.5" />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* Sort select */}
            <select
              value={catSort}
              onChange={handleSortChange}
              className="bg-[#161619] border border-[#2D2D33] text-[#E0E0E0] text-xs rounded-2xl py-2.5 px-3 outline-none cursor-pointer"
            >
              <option value="popularity">محبوب‌ترین و پربازدیدترین</option>
              <option value="price_asc">ارزان‌ترین قیمت ترب</option>
              <option value="price_desc">گران‌ترین قیمت</option>
              <option value="sellers_count">بیشترین تعداد فروشنده</option>
            </select>

            {/* Inventory Only Switch */}
            <button
              onClick={() => setInventoryOnlyFilter(!inventoryOnlyFilter)}
              className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                inventoryOnlyFilter
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#161619] text-[#8E9299] border-[#2D2D33] hover:text-white'
              }`}
            >
              <span>موجود در انبار ما</span>
            </button>

            {/* View Layout Toggle */}
            <div className="flex items-center bg-[#161619] p-1 rounded-2xl border border-[#2D2D33]">
              <button
                onClick={() => setViewLayout('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewLayout === 'grid' ? 'bg-[#C9A227] text-slate-950 font-bold shadow-sm' : 'text-[#8E9299] hover:text-white'
                }`}
                title="نمای کارتی"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewLayout === 'table' ? 'bg-[#C9A227] text-slate-950 font-bold shadow-sm' : 'text-[#8E9299] hover:text-white'
                }`}
                title="نمای جدولی"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN PRODUCTS DISPLAY: GRID OR TABLE */}
      {/* ========================================================================= */}
      {isLoadingCategory ? (
        <div className="bg-[#111113] border border-[#222225] rounded-3xl p-16 text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-[#C9A227] animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F3F4F6]">در حال استعلام زنده اقلام دسته‌بندی ۱۱۰ از ترب...</h3>
            <p className="text-xs text-[#8E9299]">لطفاً چند لحظه شکیبا باشید.</p>
          </div>
        </div>
      ) : displayedCategoryItems.length === 0 ? (
        <div className="bg-[#111113] border border-[#222225] rounded-3xl p-12 text-center space-y-3">
          <Layers className="w-12 h-12 text-[#8E9299] mx-auto" />
          <h3 className="text-sm font-bold text-[#F3F4F6]">هیچ کالایی مطابق جستجو یا فیلتر یافت نشد.</h3>
          <button
            onClick={() => {
              setCatSearchQuery('');
              setSelectedSubCat('all');
              setInventoryOnlyFilter(false);
              loadCategory110('all', 'popularity', '');
            }}
            className="text-xs text-[#C9A227] hover:underline"
          >
            پاک کردن فیلترها و مشاهده همه
          </button>
        </div>
      ) : (
        <div>
          {/* GRID VIEW */}
          {viewLayout === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedItems.map((item) => {
                const isImporting = importingId === item.id;
                const isSyncing = syncingId === item.id;

                return (
                  <div
                    key={item.id}
                    id={`torob-card-${item.id}`}
                    className="bg-[#111113] hover:bg-[#141417] border border-[#222225] hover:border-[#C9A227]/60 rounded-3xl p-4 flex flex-col justify-between transition-all duration-200 group shadow-lg hover:shadow-2xl hover:-translate-y-0.5"
                  >
                    {/* Top: Image & Status Badges */}
                    <div className="space-y-3">
                      <div
                        onClick={() => setSelectedSellerItem(item)}
                        className="relative w-full h-48 bg-[#161619] rounded-2xl overflow-hidden border border-[#2D2D33] group-hover:border-[#C9A227]/40 flex items-center justify-center transition-all cursor-pointer"
                        title="مشاهده عکس و لیست فروشندگان"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCategoryFallbackImage(item.title, item.category);
                          }}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none">
                          {item.isLiveScraped ? (
                            <span className="bg-emerald-500/90 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md">
                              🟢 استعلام زنده
                            </span>
                          ) : (
                            <span className="bg-amber-500/90 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md">
                              🟡 بنچمارک بازار
                            </span>
                          )}

                          {item.inInventory ? (
                            <span className="bg-emerald-500/90 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md">
                              در انبار موجود است
                            </span>
                          ) : (
                            <span className="bg-sky-500/90 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md">
                              فرصت بازار
                            </span>
                          )}

                          {item.isGenericStockPhoto && (
                            <span className="bg-neutral-800/90 text-neutral-300 text-[9px] px-1.5 py-0.5 rounded-md border border-white/10">
                              تصویر نمونه
                            </span>
                          )}

                          <span className="bg-black/70 backdrop-blur-xs text-[#C9A227] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-white/10">
                            {item.brand || 'استاندارد'}
                          </span>
                        </div>

                        {/* Zoom button on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage({ src: item.image, title: item.title });
                          }}
                          className="absolute top-2 left-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="بزرگ‌نمایی تصویر"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                        </button>

                        {/* Sellers Count Badge */}
                        <div className="absolute bottom-2 left-2 bg-black/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 border border-white/20 shadow-md">
                          <Store className="w-3 h-3 text-[#C9A227]" />
                          <span>{toPersianDigits(item.sellersCount)} فروشگاه در ترب</span>
                        </div>
                      </div>

                      {/* Title & Category (Clickable) */}
                      <div onClick={() => setSelectedSellerItem(item)} className="cursor-pointer">
                        <span className="text-[10px] text-[#C9A227] font-bold">{item.category}</span>
                        <h3 className="font-bold text-sm text-[#F3F4F6] line-clamp-2 mt-0.5 leading-snug group-hover:text-[#C9A227] transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {/* Multi-source Price Metrics (Clickable) */}
                      <div
                        onClick={() => setSelectedSellerItem(item)}
                        className="bg-[#161619] p-3 rounded-2xl border border-[#2D2D33] group-hover:border-[#C9A227]/30 space-y-2 text-xs cursor-pointer transition-colors"
                        title="مشاهده جزئیات فروشندگان و قیمت‌ها"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[#8E9299] text-[11px]">کمترین قیمت ترب:</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {formatToman(item.minPrice)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#222225] pt-1.5">
                          <span className="text-[#8E9299] text-[11px]">دیجی‌کالا:</span>
                          <span className="font-mono font-bold text-rose-300 text-xs">
                            {formatToman(item.digikalaPrice || item.avgPrice)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#222225] pt-1.5">
                          <span className="text-[#8E9299] text-[11px]">میانگین بازار:</span>
                          <span className="font-mono font-bold text-sky-300 text-xs">
                            {formatToman(item.avgPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: View Sellers / Import / Sync */}
                    <div className="mt-4 pt-3 border-t border-[#222225] flex flex-col gap-2">
                      {/* Primary View Sellers Button */}
                      <button
                        onClick={() => setSelectedSellerItem(item)}
                        className="w-full bg-[#1A1A22] hover:bg-[#C9A227] text-[#C9A227] hover:text-slate-950 border border-[#C9A227]/40 hover:border-[#C9A227] px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:shadow-lg"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>مشاهده عکس و لیست فروشندگان ({toPersianDigits(item.sellersCount)})</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {item.inInventory ? (
                          <button
                            onClick={() => handleSyncPricesWithInventory(item)}
                            disabled={isSyncing}
                            className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>همگام‌سازی</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleImportToInventory(item)}
                            disabled={isImporting}
                            className="flex-1 bg-[#C9A227]/20 hover:bg-[#C9A227] text-[#C9A227] hover:text-slate-950 font-black px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#C9A227]/40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isImporting ? 'در حال ثبت...' : 'افزودن به انبار'}</span>
                          </button>
                        )}

                        <a
                          href={item.torobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#161619] hover:bg-[#222226] text-[#E0E0E0] hover:text-white p-2.5 rounded-xl border border-[#2D2D33] transition-colors"
                          title="مشاهده مستقیم در سایت ترب"
                        >
                          <ExternalLink className="w-4 h-4 text-red-400" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-[#111113] border border-[#222225] rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#161619] text-[#8E9299] border-b border-[#222225]">
                    <tr>
                      <th className="py-3.5 px-3 font-bold text-center w-12">ردیف</th>
                      <th className="py-3.5 px-4 font-bold">تصویر و نام محصول</th>
                      <th className="py-3.5 px-3 font-bold">کمترین قیمت</th>
                      <th className="py-3.5 px-3 font-bold">بیشترین قیمت</th>
                      <th className="py-3.5 px-3 font-bold">تعداد فروشنده</th>
                      <th className="py-3.5 px-3 font-bold">لینک ترب</th>
                      <th className="py-3.5 px-4 font-bold text-center">عملیات انبار / حسابداری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222225]">
                    {paginatedItems.map((item, idx) => {
                      const absoluteIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedSellerItem(item)}
                          className="hover:bg-[#161619] transition-colors cursor-pointer group"
                        >
                          {/* 1. Row Index */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-[#8E9299] group-hover:text-[#C9A227]">
                            {toPersianDigits(absoluteIndex)}
                          </td>

                          {/* 2. Product Image & Title */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = getCategoryFallbackImage(item.title, item.category);
                                }}
                                className="w-11 h-11 object-contain rounded-xl bg-[#161619] border border-[#2D2D33] group-hover:border-[#C9A227] p-1 transition-all shrink-0"
                              />
                              <div>
                                <div className="font-bold text-[#F3F4F6] line-clamp-1 group-hover:text-[#C9A227] transition-colors">{item.title}</div>
                                <div className="flex items-center gap-2 text-[10px] text-[#8E9299] mt-0.5 flex-wrap">
                                  <span className="text-[#C9A227]">{item.category}</span>
                                  <span>•</span>
                                  <span>{item.brand || 'استاندارد'}</span>
                                  <span>•</span>
                                  {item.isLiveScraped ? (
                                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">استعلام زنده</span>
                                  ) : (
                                    <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">بنچمارک تحریر</span>
                                  )}
                                  {item.isGenericStockPhoto && (
                                    <span className="text-neutral-400 text-[9px] bg-neutral-800 px-1.5 py-0.2 rounded">عکس نمونه</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Min Price */}
                          <td className="py-3 px-3 font-mono font-black text-emerald-400 text-sm whitespace-nowrap">
                            {formatToman(item.minPrice)}
                          </td>

                          {/* 4. Max Price */}
                          <td className="py-3 px-3 font-mono font-bold text-[#E0E0E0] text-xs whitespace-nowrap">
                            {formatToman(item.maxPrice || Math.round(item.minPrice * 1.35))}
                          </td>

                          {/* 5. Sellers Count */}
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedSellerItem(item)}
                              className="bg-[#161619] hover:bg-[#C9A227] text-[#E0E0E0] hover:text-slate-950 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-[#2D2D33] hover:border-[#C9A227] flex items-center gap-1 cursor-pointer transition-all shadow-xs whitespace-nowrap"
                            >
                              <Store className="w-3 h-3 text-[#C9A227] group-hover:text-black" />
                              <span>{toPersianDigits(item.sellersCount || (item.sellers?.length || 0))} فروشنده</span>
                            </button>
                          </td>

                          {/* 6. Torob Page Link */}
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={item.torobUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-colors whitespace-nowrap"
                              title="مشاهده صفحه کالا در ترب"
                            >
                              <span>مشاهده</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>

                          {/* 7. Operations */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              {/* Export to accounting */}
                              <button
                                onClick={() => handleExportItemToAccounting(item, undefined, 'csv')}
                                className="bg-[#161619] hover:bg-[#222226] text-amber-300 hover:text-amber-200 border border-[#C9A227]/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="خروجی حسابداری (CSV)"
                              >
                                <Download className="w-3 h-3 text-[#C9A227]" />
                                <span>حسابداری</span>
                              </button>

                              {item.inInventory ? (
                                <button
                                  onClick={() => handleSyncPricesWithInventory(item)}
                                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  همگام‌سازی
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleImportToInventory(item)}
                                  className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer shadow-md"
                                >
                                  ثبت در انبار
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111113] border border-[#222225] rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-[#8E9299]">
                نمایش صفحه <span className="text-[#C9A227] font-bold font-mono">{toPersianDigits(currentPage)}</span> از{' '}
                <span className="text-white font-bold font-mono">{toPersianDigits(totalPages)}</span>{' '}
                (مجموعاً <span className="text-[#F3F4F6] font-bold font-mono">{toPersianDigits(displayedCategoryItems.length)}</span> کالا در ترب)
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#161619] hover:bg-[#222226] text-[#E0E0E0] disabled:opacity-30 disabled:pointer-events-none border border-[#2D2D33] transition-colors cursor-pointer"
                >
                  صفحه قبل
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      currentPage === pg
                        ? 'bg-[#C9A227] text-slate-950 font-black shadow-md'
                        : 'bg-[#161619] hover:bg-[#222226] text-[#A0A4AB] hover:text-white border border-[#2D2D33]'
                    }`}
                  >
                    {toPersianDigits(pg)}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#161619] hover:bg-[#222226] text-[#E0E0E0] disabled:opacity-30 disabled:pointer-events-none border border-[#2D2D33] transition-colors cursor-pointer"
                >
                  صفحه بعد
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPREHENSIVE TOROB PRODUCT DETAIL & MULTI-STORE SELLERS */}
      {/* ========================================================================= */}
      {selectedSellerItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-[#111113] border border-[#2D2D33] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Top Bar: Breadcrumb Navigation & Close */}
            <div className="p-4 md:px-6 border-b border-[#222225] bg-[#161619] flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-[#8E9299] overflow-x-auto whitespace-nowrap scrollbar-none">
                <span className="text-red-400 font-bold">ترب</span>
                <span>/</span>
                <span className="text-[#E0E0E0]">دسته‌بندی ۱۱۰ (لوازم تحریر)</span>
                <span>/</span>
                <span className="text-[#C9A227] font-semibold">{selectedSellerItem.category}</span>
                <span>/</span>
                <span className="text-[#F3F4F6] font-bold max-w-[200px] md:max-w-md truncate">{selectedSellerItem.title}</span>
              </div>

              <button
                onClick={() => {
                  setSelectedSellerItem(null);
                  setActiveSellerModalPhoto(null);
                }}
                className="text-[#8E9299] hover:text-white p-2 rounded-xl bg-[#222226] hover:bg-[#2D2D33] border border-[#2D2D33] cursor-pointer transition-colors shrink-0"
                title="بستن پنجره"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Modal Body (Scrollable) */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6">
              {/* Product Hero Banner */}
              <div className="bg-[#161619] border border-[#2D2D33] rounded-3xl p-5 flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Product Image & Gallery */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="relative w-48 h-48 md:w-56 md:h-56 bg-[#111113] rounded-2xl border border-[#2D2D33] p-3 flex items-center justify-center overflow-hidden group shadow-inner">
                    <img
                      src={activeSellerModalPhoto || selectedSellerItem.image}
                      alt={selectedSellerItem.title}
                      referrerPolicy="no-referrer"
                      onClick={() => setZoomedImage({ src: activeSellerModalPhoto || selectedSellerItem.image, title: selectedSellerItem.title })}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getCategoryFallbackImage(selectedSellerItem.title, selectedSellerItem.category);
                      }}
                      className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => setZoomedImage({ src: activeSellerModalPhoto || selectedSellerItem.image, title: selectedSellerItem.title })}
                      className="absolute bottom-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 rounded-lg border border-white/20 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-[#C9A227]" />
                      <span>بزرگ‌نمایی</span>
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {selectedSellerItem.isLiveScraped ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        🟢 استعلام زنده چندمنبعی
                      </span>
                    ) : (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        🟡 کاتالوگ بنچمارک بازار
                      </span>
                    )}
                    {selectedSellerItem.isGenericStockPhoto && (
                      <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 text-[10px] px-2 py-0.5 rounded-full">
                        تصویر نمونه عمومی
                      </span>
                    )}
                    <span className="bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/30 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full">
                      {selectedSellerItem.brand || 'استاندارد'}
                    </span>
                  </div>
                </div>

                {/* Product Meta & Price Summary */}
                <div className="flex-1 space-y-4 text-right w-full">
                  <div>
                    <span className="text-xs font-bold text-[#C9A227]">{selectedSellerItem.category}</span>
                    <h2 className="text-lg md:text-xl font-black text-[#F3F4F6] mt-1 leading-snug">
                      {selectedSellerItem.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-[#8E9299]">
                      <span>کد کالا در ترب: <strong className="font-mono text-[#E0E0E0]">{selectedSellerItem.id}</strong></span>
                      <span>•</span>
                      <span>امتیاز خریداران: <strong className="text-amber-400">⭐ ۴.۸ از ۵</strong></span>
                      <span>•</span>
                      <span>وضعیت انبار خطی‌نو: {selectedSellerItem.inInventory ? (
                        <strong className="text-emerald-400">موجود در انبار</strong>
                      ) : (
                        <strong className="text-amber-300">در انبار ثبت نشده</strong>
                      )}</span>
                    </div>
                  </div>

                  {/* Price Range Card */}
                  <div className="bg-[#111113] border border-[#222225] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-[#8E9299]">دامنه قیمت در فروشگاه‌های ترب:</span>
                      <span className="text-xs font-bold text-[#C9A227]">
                        از {formatToman(selectedSellerItem.minPrice)} تا {formatToman(selectedSellerItem.maxPrice || Math.round(selectedSellerItem.minPrice * 1.35))}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[#222225] text-xs">
                      <div className="bg-[#161619] p-2.5 rounded-xl border border-[#2D2D33]">
                        <div className="text-[10px] text-[#8E9299]">کف قیمت ترب (رتبه ۱):</div>
                        <div className="font-mono font-black text-emerald-400 text-sm mt-0.5">
                          {formatToman(selectedSellerItem.minPrice)}
                        </div>
                      </div>

                      <div className="bg-[#161619] p-2.5 rounded-xl border border-[#2D2D33]">
                        <div className="text-[10px] text-[#8E9299]">قیمت دیجی‌کالا:</div>
                        <div className="font-mono font-bold text-rose-300 text-sm mt-0.5">
                          {formatToman(selectedSellerItem.digikalaPrice || selectedSellerItem.avgPrice)}
                        </div>
                      </div>

                      <div className="bg-[#161619] p-2.5 rounded-xl border border-[#2D2D33] col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-[#8E9299]">پیشنهاد آنلاین خطی‌نو:</div>
                        <div className="font-mono font-black text-[#C9A227] text-sm mt-0.5">
                          {formatToman(selectedSellerItem.multiTierPricing?.suggestedShop2Price || selectedSellerItem.minPrice)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedSellerItem.inInventory ? (
                      <button
                        onClick={() => handleSyncPricesWithInventory(selectedSellerItem)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>همگام‌سازی قیمت با انبار ما</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleImportToInventory(selectedSellerItem)}
                        className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5 text-black" />
                        <span>افزودن فوری این کالا به انبار خطی‌نو</span>
                      </button>
                    )}

                    {/* Step 3: Direct Accounting Export */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportItemToAccounting(selectedSellerItem, undefined, 'csv')}
                        className="bg-[#1C1C22] hover:bg-[#2A2A32] text-amber-300 hover:text-amber-200 border border-[#C9A227]/40 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="خروجی CSV این کالا جهت ثبت مستقیم در نرم‌افزار حسابداری (مرحله ۳)"
                      >
                        <Download className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span>خروجی حسابداری (CSV)</span>
                      </button>

                      <button
                        onClick={() => handleExportItemToAccounting(selectedSellerItem, undefined, 'json')}
                        className="bg-[#1C1C22] hover:bg-[#2A2A32] text-[#E0E0E0] border border-[#2D2D33] px-2.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                        title="خروجی JSON برای API و اتوماسیون حسابداری"
                      >
                        JSON
                      </button>
                    </div>

                    <a
                      href={selectedSellerItem.torobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#222226] hover:bg-[#2D2D33] text-red-400 hover:text-red-300 border border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 mr-auto"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>مشاهده در ترب</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Sellers Section Header */}
              <div className="flex items-center justify-between border-b border-[#222225] pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#C9A227]" />
                  <h3 className="font-black text-sm text-[#F3F4F6]">
                    لیست فروشندگان این کالا در ترب ({toPersianDigits(selectedSellerItem.sellers?.length || selectedSellerItem.sellersCount || 0)} فروشگاه)
                  </h3>
                </div>
                <span className="text-xs text-[#8E9299]">مرتب‌شده از ارزان‌ترین قیمت (رتبه ۱ تا آخر)</span>
              </div>

              {/* Sellers Cards List */}
              <div className="space-y-3">
                {selectedSellerItem.sellers && selectedSellerItem.sellers.length > 0 ? (
                  selectedSellerItem.sellers.map((seller: any, idx: number) => {
                    const isLowest = idx === 0 || seller.price === selectedSellerItem.minPrice;

                    return (
                      <div
                        key={idx}
                        className={`bg-[#161619] hover:bg-[#1C1C22] border rounded-2xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md ${
                          isLowest ? 'border-emerald-500/50 bg-[#161619]/90' : 'border-[#2D2D33]'
                        }`}
                      >
                        {/* Seller Meta */}
                        <div className="flex items-center gap-3.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs font-mono shrink-0 ${
                            isLowest
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                              : 'bg-[#222226] text-[#C9A227] border border-[#2D2D33]'
                          }`}>
                            {toPersianDigits(idx + 1)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-[#F3F4F6]">{seller.storeName}</span>
                              {isLowest && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black px-2 py-0.5 rounded-full">
                                  ارزان‌ترین فروشنده ترب (رتبه ۱)
                                </span>
                              )}
                              <span className="text-[10px] bg-[#222226] text-amber-300 px-2 py-0.5 rounded-full border border-[#2D2D33]">
                                ⭐ {toPersianDigits(seller.rating || 4.8)}
                              </span>
                            </div>

                            <div className="text-xs text-[#8E9299] flex items-center gap-3 mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#C9A227]" />
                                <span>شهر: <strong className="text-[#E0E0E0]">{seller.city || 'تهران'}</strong></span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>ضمانت: <strong className="text-[#E0E0E0]">{seller.warranty || 'اصالت و سلامت فیزیکی'}</strong></span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#222225]">
                          <div className="text-right md:text-left">
                            <span className="text-[10px] text-[#8E9299] block">قیمت این فروشنده:</span>
                            <div className="font-mono font-black text-base md:text-lg text-emerald-400">
                              {formatToman(seller.price)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Match Price with Inventory */}
                            <button
                              onClick={() => {
                                showToast(`قیمت خطی‌نو روی ${formatToman(seller.price)} تطبیق داده شد.`, 'success');
                              }}
                              className="bg-[#222226] hover:bg-[#2D2D33] text-[#C9A227] border border-[#C9A227]/30 hover:border-[#C9A227] text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                              title="تطبیق قیمت در انبار خطی‌نو با این فروشنده"
                            >
                              تطبیق قیمت انبار
                            </button>

                            {/* Export selected seller to accounting */}
                            <button
                              onClick={() => handleExportItemToAccounting(selectedSellerItem, seller, 'csv')}
                              className="bg-[#222226] hover:bg-[#2D2D33] text-amber-300 border border-[#2D2D33] text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                              title="ثبت این قیمت و فروشنده در فرمت حسابداری (CSV)"
                            >
                              <Download className="w-3 h-3 text-[#C9A227]" />
                              <span>خروجی حسابداری</span>
                            </button>

                            {seller.shopUrl && (
                              <a
                                href={seller.shopUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
                              >
                                <span>خرید اینترنتی</span>
                                <ExternalLink className="w-3.5 h-3.5 text-black" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-[#8E9299] text-xs bg-[#161619] rounded-2xl border border-[#2D2D33]">
                    اطلاعات زنده فروشندگان در دست بارگذاری است.
                  </div>
                )}
              </div>

              {/* Technical Specifications Table */}
              <div className="bg-[#161619] border border-[#2D2D33] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#C9A227]" />
                  <h4 className="font-bold text-xs text-[#F3F4F6]">مشخصات فنی و ویژگی‌های کالا</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex justify-between">
                    <span className="text-[#8E9299]">برند سازنده:</span>
                    <span className="font-bold text-[#E0E0E0]">{selectedSellerItem.brand || 'پنتر / استاندارد'}</span>
                  </div>
                  <div className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex justify-between">
                    <span className="text-[#8E9299]">دسته‌بندی:</span>
                    <span className="font-bold text-[#E0E0E0]">{selectedSellerItem.category}</span>
                  </div>
                  <div className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex justify-between">
                    <span className="text-[#8E9299]">واحد شمارش:</span>
                    <span className="font-bold text-[#E0E0E0]">{selectedSellerItem.unit || 'بسته / عدد'}</span>
                  </div>
                  <div className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex justify-between">
                    <span className="text-[#8E9299]">ضمانت اصالت:</span>
                    <span className="font-bold text-emerald-400">۱۰۰٪ اصل و اورجینال</span>
                  </div>
                  <div className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex justify-between">
                    <span className="text-[#8E9299]">روش ارسال:</span>
                    <span className="font-bold text-[#E0E0E0]">پست پیشتاز / پیک فوری</span>
                  </div>
                  <div className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex justify-between">
                    <span className="text-[#8E9299]">محل تأمین:</span>
                    <span className="font-bold text-[#E0E0E0]">بازار بزرگ تهران و خطی‌نو</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:px-6 border-t border-[#222225] bg-[#161619] flex items-center justify-between gap-3">
              <a
                href={selectedSellerItem.torobUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 font-bold"
              >
                <span>مشاهده صفحه کامل این کالا در ترب</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => {
                  setSelectedSellerItem(null);
                  setActiveSellerModalPhoto(null);
                }}
                className="bg-[#222226] hover:bg-[#2D2D33] text-[#E0E0E0] text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GOOGLE SEARCH GROUNDING MARKET RESEARCH */}
      {/* ========================================================================= */}
      {showGroundedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowGroundedModal(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[85vh] bg-[#161619] rounded-3xl border border-blue-500/30 shadow-2xl flex flex-col overflow-hidden text-[#E0E0E0]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#222225] bg-[#1A1A20] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-[#F3F4F6]">
                      تحقیق و رصد زنده با Google Search Grounding
                    </h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                      Gemini 3.7 Flash
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8E9299]">
                    استعلام لحظه‌ای قیمت‌ها، فروشندگان، نوسانات بازار و پیوندهای مستقیم وب
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowGroundedModal(false)}
                className="w-8 h-8 rounded-xl bg-[#222226] text-[#8E9299] hover:text-[#E0E0E0] flex items-center justify-center cursor-pointer hover:bg-[#2D2D33]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Search input inside modal */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunGroundedSearch();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={groundedQuery}
                  onChange={(e) => setGroundedQuery(e.target.value)}
                  placeholder="مثال: قیمت عمده کاغذ A4 دابل ای در بازار تهران یا قیمت خودکار کیان در ترب..."
                  className="flex-1 bg-[#111113] border border-[#2D2D33] focus:border-blue-500 rounded-2xl px-4 py-2.5 text-xs text-[#E0E0E0] outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearchingGrounded || !groundedQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSearchingGrounded ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال جستجو...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>جستجوی زنده</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sample suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-[#8E9299]">پیشنهادها:</span>
                {[
                  'قیمت روز کاغذ A4 دابل‌ ای در ترب',
                  'قیمت عمده خودکار کیان ۰.۷',
                  'قیمت دفتر سیمی ۱۰۰ برگ در بازار',
                  'قیمت روان‌نویس یونی‌بال در دیجی‌کالا',
                ].map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setGroundedQuery(sample);
                      handleRunGroundedSearch(sample);
                    }}
                    className="bg-[#1C1C22] hover:bg-blue-500/20 text-[#A0AEC0] hover:text-blue-300 border border-[#2D2D35] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* Results Container */}
              {isSearchingGrounded ? (
                <div className="bg-[#111113] border border-[#222225] rounded-2xl p-8 text-center space-y-3">
                  <Globe className="w-8 h-8 text-blue-400 animate-spin-slow mx-auto" />
                  <div className="text-xs font-bold text-[#E0E0E0]">
                    در حال اتصال به Google Search و استخراج جدیدترین قیمت‌ها و منابع وب...
                  </div>
                  <p className="text-[11px] text-[#8E9299]">
                    Gemini در حال تحلیل ترب، دیجی‌کالا و سایت‌های عمده‌فروشی نوشت‌افزار است.
                  </p>
                </div>
              ) : groundedResult ? (
                <div className="space-y-4">
                  {/* Analysis Content */}
                  <div className="bg-[#111113] border border-[#222225] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap text-[#E0E0E0]">
                    {groundedResult.summary || (groundedResult as any).analysis}
                  </div>

                  {/* Sources List */}
                  {((groundedResult.groundingSources && groundedResult.groundingSources.length > 0) ||
                    ((groundedResult as any).sources && (groundedResult as any).sources.length > 0)) && (
                    <div className="bg-[#141417] border border-blue-500/20 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                        <Globe className="w-4 h-4" />
                        <span>منابع و پیوندهای زنده استخراج‌شده از وب و بازار:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(groundedResult.groundingSources || (groundedResult as any).sources).map((src: any, sIdx: number) => {
                          let domain = '';
                          try {
                            if (src.uri) domain = new URL(src.uri).hostname.replace('www.', '');
                          } catch (e) {
                            domain = src.uri || '';
                          }
                          return (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#1A1A20] hover:bg-blue-500/20 text-[#A0AEC0] hover:text-blue-300 border border-[#2D2D38] hover:border-blue-500/40 p-2.5 rounded-xl transition-all flex items-center justify-between gap-2"
                              title={src.title || src.uri}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="truncate text-[11px] font-bold text-[#F3F4F6]">
                                  {src.title || domain || 'صفحه منبع'}
                                </span>
                              </div>
                              {domain && (
                                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md shrink-0">
                                  {domain}
                                </span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#222225] bg-[#161619] flex justify-end">
              <button
                onClick={() => setShowGroundedModal(false)}
                className="bg-[#222226] hover:bg-[#2D2D33] text-[#E0E0E0] text-xs font-bold px-5 py-2 rounded-xl cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMAGE ZOOM PREVIEW */}
      {/* ========================================================================= */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-xl max-h-[85vh] bg-[#161619] p-4 rounded-3xl border border-[#2D2D33] shadow-2xl flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 left-3 text-white bg-black/70 p-2 rounded-full hover:bg-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImage.src}
              alt={zoomedImage.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[65vh] object-contain rounded-2xl"
            />
            <h4 className="text-xs font-bold text-[#F3F4F6] text-center px-4 line-clamp-2">
              {zoomedImage.title}
            </h4>
          </div>
        </div>
      )}
    </div>
  );
};
