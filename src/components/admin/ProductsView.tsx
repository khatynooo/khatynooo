import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  Download,
  Check,
  X,
  Printer,
  Sparkles,
  DollarSign,
  Tag,
  CheckCircle2,
  Camera,
  ScanLine,
  Globe,
  Building,
  Building2,
  Store,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Boxes,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Send,
  ArrowUpDown,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, toEnglishDigits, isValidBarcodeChecksum, generateValidEan13 } from '../../lib/utils';
import { Product, Category, UnitDefinition, Warehouse, Supplier } from '../../types';
import { useToast } from '../common/Toast';
import { InventoryExcelImportModal } from './InventoryExcelImportModal';
import { PurchaseInvoiceExcelImportModal } from './PurchaseInvoiceExcelImportModal';
import { BulkPriceAdjustmentModal } from './BulkPriceAdjustmentModal';
import { BarcodePrintModal } from './BarcodePrintModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { DirectPhoneScannerButton } from '../common/DirectPhoneScannerButton';
import { InlineCategoryCreator } from '../common/InlineCategoryCreator';
import { ProductGalleryManager } from '../common/ProductGalleryManager';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { ProductPublishModal } from './publication/ProductPublishModal';
import { ProductTierPricingForm } from './ProductTierPricingForm';

type ModalTabType = 'general' | 'pricing' | 'gallery' | 'details';
type PriceTierFilter = 'all' | 'shop1' | 'shop2' | 'shop3' | 'wholesale' | 'minAllowed';

export const ProductsView: React.FC = () => {
  const { showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unitDefs, setUnitDefs] = useState<UnitDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [filterAccountingOnly, setFilterAccountingOnly] = useState<string>('all');
  const [activeTierFilter, setActiveTierFilter] = useState<PriceTierFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isPurchaseExcelOpen, setIsPurchaseExcelOpen] = useState(false);
  const [isBulkAdjustmentOpen, setIsBulkAdjustmentOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Barcode Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetField, setScannerTargetField] = useState<'search' | 'formBarcode' | 'formBoxBarcode'>('search');

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTabType>('general');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

  // Print Label Modal
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [batchPrintProducts, setBatchPrintProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Multi-Channel Publication Modal
  const [publishProduct, setPublishProduct] = useState<Product | null>(null);

  // Hardware USB/Bluetooth Barcode Scanner listener
  useHardwareBarcodeScanner({
    onScan: (scannedCode) => {
      const clean = toEnglishDigits(scannedCode).trim();
      if (showModal) {
        setFormData((prev) => ({ ...prev, barcode: clean }));
        showToast(`بارکد «${clean}» از بارکدخوان فیزیکی در فرم درج شد.`, 'success');
      } else {
        setSearchQuery(clean);
        showToast(`بارکد «${clean}» اسکن و در انبار فیلتر شد.`, 'info');
      }
    },
    enabled: true,
  });

  // Keyboard Shortcuts (F1: Focus Search, F3: Cycle Tier, F8: Camera Scanner)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        showToast('جستجو فعال شد (F1)', 'info');
      } else if (e.key === 'F3') {
        e.preventDefault();
        const tiers: PriceTierFilter[] = ['all', 'shop1', 'shop2', 'shop3', 'wholesale', 'minAllowed'];
        setActiveTierFilter((curr) => {
          const nextIdx = (tiers.indexOf(curr) + 1) % tiers.length;
          const nextTier = tiers[nextIdx];
          showToast(`نمایش سطح قیمت به: ${getTierLabel(nextTier)} تغییر یافت.`, 'info');
          return nextTier;
        });
      } else if (e.key === 'F8') {
        e.preventDefault();
        setScannerTargetField('search');
        setIsScannerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [prodRes, catRes, unitRes, whRes, supRes] = await Promise.all([
        api.getProducts().catch(() => ({ products: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
        api.getUnits().catch(() => ({ units: [] })),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
        api.getSuppliers().catch(() => ({ suppliers: [] })),
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setUnitDefs(unitRes.units || []);
      setWarehouses(whRes.warehouses || []);
      setSuppliers(supRes.suppliers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle pending product edit or search from purchase invoice Excel import
  useEffect(() => {
    if (products.length === 0) return;
    const pendingSearch = sessionStorage.getItem('khatinoo_product_search');
    if (pendingSearch) {
      sessionStorage.removeItem('khatinoo_product_search');
      setSearchQuery(pendingSearch);
    }
    const pendingEditId = sessionStorage.getItem('khatinoo_edit_product_id');
    if (pendingEditId) {
      sessionStorage.removeItem('khatinoo_edit_product_id');
      const targetProd = products.find((p) => p.id === pendingEditId);
      if (targetProd) {
        handleOpenEdit(targetProd);
      }
    }
  }, [products]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setModalTab('general');
    const defaultImg = 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80';
    setFormData({
      name: '',
      code: `KHAT-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: generateValidEan13(),
      boxBarcode: '',
      categoryId: categories[0]?.id || '',
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
      stock: 10,
      minStockAlert: 5,
      description: '',
      image: defaultImg,
      extraImages: [],
      isSpecialOffer: false,
      featured: false,
      showOnWebsite: true,
      onlyAccounting: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setModalTab('general');

    const rawList = [
      p.image,
      ...(Array.isArray((p as any).gallery) ? (p as any).gallery : []),
      ...(Array.isArray((p as any).extraImages) ? (p as any).extraImages : []),
      ...(Array.isArray((p as any).extra_images) ? (p as any).extra_images : []),
    ].filter((x): x is string => Boolean(x && typeof x === 'string' && x.trim()));

    const uniqueImages = Array.from(new Set(rawList));
    const primary = p.image && uniqueImages.includes(p.image) ? p.image : (uniqueImages[0] || '');
    const secondaryImages = uniqueImages.filter((img) => img !== primary);

    const baseSale = Number(p.salePrice) || 0;
    const s1 = Number(p.priceShop1) || baseSale;
    const s2 = Number(p.priceShop2) || baseSale;
    const s3 = Number(p.priceShop3) || baseSale;
    const sW = Number(p.wholesalePrice) || baseSale;
    const sMin = Number(p.minAllowedPrice) || Number(p.buyPrice) || 0;

    setFormData({
      name: p.name,
      code: p.code,
      barcode: p.barcode || '',
      boxBarcode: (p as any).boxBarcode || '',
      categoryId: p.categoryId,
      subCategoryId: p.subCategoryId || '',
      unit: p.unit || 'عدد',
      subUnit: p.subUnit || '',
      conversionFactor: p.conversionFactor || 1,
      buyPrice: Number(p.buyPrice) || 0,
      salePrice: s1,
      priceShop1: s1,
      priceShop2: s2,
      priceShop3: s3,
      wholesalePrice: sW,
      minAllowedPrice: sMin,
      stock: Number(p.stock) || 0,
      minStockAlert: Number(p.minStockAlert) || 5,
      description: p.description || '',
      image: primary,
      extraImages: secondaryImages,
      isSpecialOffer: Boolean(p.isSpecialOffer),
      featured: Boolean(p.featured),
      showOnWebsite: (p as any).showOnWebsite !== undefined ? (p as any).showOnWebsite : (p as any).show_on_website !== false,
      onlyAccounting: Boolean((p as any).onlyAccounting || (p as any).only_accounting),
    });
    setShowModal(true);
  };

  const handleToggleWebsitePublish = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const currentShow = (p as any).showOnWebsite !== false && !(p as any).onlyAccounting;
      const newShow = !currentShow;
      await api.updateProduct(p.id, {
        showOnWebsite: newShow,
        onlyAccounting: !newShow,
      });
      showToast(newShow ? 'کالا به وبسایت ارسال و منتشر شد.' : 'کالا به حالت «فقط حسابداری» تغییر یافت.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت انتشار کالا', 'error');
    }
  };

  const handleCameraScanSuccess = (code: string) => {
    setIsScannerOpen(false);
    const clean = toEnglishDigits(code).trim();
    if (scannerTargetField === 'formBarcode') {
      setFormData((prev) => ({ ...prev, barcode: clean }));
      showToast(`بارکد «${clean}» در فرم کالا درج شد.`, 'success');
    } else if (scannerTargetField === 'formBoxBarcode') {
      setFormData((prev) => ({ ...prev, boxBarcode: clean }));
      showToast(`بارکد جعبه «${clean}» در فرم کالا درج شد.`, 'success');
    } else {
      setSearchQuery(clean);
      showToast(`بارکد «${clean}» با دوربین اسکن و جستجو شد.`, 'success');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      setModalTab('general');
      showToast('لطفاً نام کامل کالا را وارد فرمایید.', 'error');
      return;
    }
    if (!formData.code.trim()) {
      setModalTab('general');
      showToast('لطفاً کد اختصاصی کالا را مشخص فرمایید.', 'error');
      return;
    }

    try {
      const allGallery = Array.from(new Set([formData.image, ...formData.extraImages].filter(Boolean)));
      const baseSale = Number(formData.priceShop1) || Number(formData.salePrice) || 0;

      const payload = {
        ...formData,
        salePrice: baseSale,
        priceShop1: baseSale,
        priceShop2: Number(formData.priceShop2) || baseSale,
        priceShop3: Number(formData.priceShop3) || baseSale,
        wholesalePrice: Number(formData.wholesalePrice) || baseSale,
        minAllowedPrice: Number(formData.minAllowedPrice) || Number(formData.buyPrice) || 0,
        buyPrice: Number(formData.buyPrice) || 0,
        stock: Number(formData.stock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 5,
        conversionFactor: Number(formData.conversionFactor) || 1,
        barcode: toEnglishDigits(formData.barcode).trim(),
        boxBarcode: toEnglishDigits(formData.boxBarcode).trim(),
        gallery: allGallery,
        extraImages: formData.extraImages,
        categoryId: formData.categoryId && formData.categoryId !== 'all' && formData.categoryId !== 'none' ? formData.categoryId : undefined,
        subCategoryId: formData.subCategoryId && formData.subCategoryId !== 'all' ? formData.subCategoryId : undefined,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showToast('اطلاعات کالا با موفقیت به‌روزرسانی شد.', 'success');
      } else {
        await api.createProduct(payload);
        showToast('کالای جدید با موفقیت به انبار افزوده شد.', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره کالا', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کالا از سیستم و انبار اطمینان دارید؟')) return;
    try {
      await api.deleteProduct(id);
      showToast('کالا با موفقیت از سیستم حذف شد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف کالا', 'error');
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'کد کالا',
      'بارکد تک',
      'بارکد کارتن/جعبه',
      'نام کالا',
      'دسته‌بندی',
      'واحد سنجش',
      'موجودی انبار',
      'حداقل هشدار',
      'بهای خرید (سرمایه)',
      'فروشگاه ۱ (نقدی/حضوری)',
      'فروشگاه ۲ (آنلاین/ترب)',
      'فروشگاه ۳ (همکار)',
      'فروش عمده و مدارس',
      'کف قیمت مجاز',
      'سود ناخالص حضوری',
      'درصد سود حضوری',
      'کانال عرضه',
    ];

    const rows = products.map((p) => {
      const s1 = p.priceShop1 || p.salePrice || 0;
      const profit = Math.max(0, s1 - (p.buyPrice || 0));
      const margin = p.buyPrice > 0 ? Math.round((profit / p.buyPrice) * 100) : 0;
      return [
        p.code,
        p.barcode,
        (p as any).boxBarcode || '',
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.categoryName || '').replace(/"/g, '""')}"`,
        p.unit || 'عدد',
        p.stock,
        p.minStockAlert,
        p.buyPrice,
        s1,
        p.priceShop2 || s1,
        p.priceShop3 || s1,
        p.wholesalePrice || s1,
        p.minAllowedPrice || p.buyPrice,
        profit,
        `${margin}%`,
        (p as any).onlyAccounting ? 'فقط حسابداری' : 'منتشر در وبسایت',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `khatinoo_products_5tiers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('خروجی کامل اکسل با سطوح ۵ گانه قیمت دانلود شد.', 'success');
  };

  // Filtered Products
  const filtered = products.filter((p) => {
    const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
    const isOnlyAcc = Boolean((p as any).onlyAccounting || (p as any).only_accounting);
    const matchChannel =
      filterAccountingOnly === 'all' ||
      (filterAccountingOnly === 'accounting_only' && isOnlyAcc) ||
      (filterAccountingOnly === 'website_active' && !isOnlyAcc);

    const cleanSearch = toEnglishDigits(searchQuery).trim().toLowerCase();
    const matchQ =
      !cleanSearch ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(cleanSearch) ||
      toEnglishDigits(p.barcode || '').toLowerCase().includes(cleanSearch) ||
      toEnglishDigits((p as any).boxBarcode || '').toLowerCase().includes(cleanSearch);
    return matchCat && matchChannel && matchQ;
  });

  const selectedCategoryObj = categories.find((c) => c.id === formData.categoryId);
  const currentSubcategories = selectedCategoryObj?.subcategories || [];

  const tabList: Array<{ id: ModalTabType; title: string; icon: any }> = [
    { id: 'general', title: 'مشخصات اصلی و کدینگ', icon: Tag },
    { id: 'pricing', title: 'قیمت‌گذاری ۵ سطحی و انبار', icon: DollarSign },
    { id: 'gallery', title: 'گالری و آلبوم تصاویر', icon: ImageIcon },
    { id: 'details', title: 'توضیحات و نشان‌ها', icon: SlidersHorizontal },
  ];

  const currentTabIndex = tabList.findIndex((t) => t.id === modalTab);

  function getTierLabel(tier: PriceTierFilter): string {
    switch (tier) {
      case 'all':
        return 'همه سطوح ۵‌گانه';
      case 'shop1':
        return 'فروشگاه ۱ (حضوری)';
      case 'shop2':
        return 'فروشگاه ۲ (آنلاین/ترب)';
      case 'shop3':
        return 'فروشگاه ۳ (همکار)';
      case 'wholesale':
        return 'عمده‌فروشی و مدارس';
      case 'minAllowed':
        return 'کف قیمت مجاز';
    }
  }

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* 1. UNIFIED SUPER CONTROL BAR (Matching POS Design Language) */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-[#222225] shadow-xs space-y-3">
        {/* Top Row: Search Input & Direct Scanner Triggers */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Smart Search Field with F1 shortcut */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام کالا، کد، یا اسکن بارکد (F1)..."
              className="w-full bg-slate-50 dark:bg-[#161619] border-2 border-indigo-200/80 dark:border-indigo-900/60 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1A1E] rounded-xl pr-11 pl-28 py-2.5 text-sm font-sans text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-xs"
            />
            <div className="absolute right-3.5 top-3 flex items-center pointer-events-none">
              <Barcode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            {/* Quick Actions inside Input: Clear / F1 / Mobile Camera / Webcam */}
            <div className="absolute left-2 top-2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#25252A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-[#25252A] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                  F1
                </span>
              )}

              <DirectPhoneScannerButton
                onScan={(scannedCode) => {
                  const clean = toEnglishDigits(scannedCode).trim();
                  setSearchQuery(clean);
                  showToast(`بارکد «${clean}» با دوربین گوشی خوانده و فیلتر شد.`, 'success');
                }}
                label=""
                variant="compact"
                title="اسکن مستقیم بارکد با دوربین گوشی"
              />

              <button
                type="button"
                onClick={() => {
                  setScannerTargetField('search');
                  setIsScannerOpen(true);
                }}
                title="اسکن زنده بارکد با دوربین لپ‌تاپ / وبکم (F8)"
                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Batch Print Barcodes Button */}
            <button
              onClick={() => {
                const toPrint = selectedProductIds.length > 0
                  ? products.filter((p) => selectedProductIds.includes(p.id))
                  : filtered.slice(0, 10);
                setBatchPrintProducts(toPrint);
                setIsBatchPrintOpen(true);
              }}
              className="bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#202026] text-slate-700 dark:text-[#E0E0E0] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-[#2D2D33] cursor-pointer shadow-xs"
              title="چاپ دسته‌جمعی بارکد و لیبل قیمت"
            >
              <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>چاپ بارکد {selectedProductIds.length > 0 ? `(${toPersianDigits(selectedProductIds.length)})` : ''}</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#202026] text-slate-700 dark:text-[#E0E0E0] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-[#2D2D33] cursor-pointer shadow-xs"
              title="خروجی کامل اکسل کالاها همراه با ۵ سطح قیمت"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">خروجی اکسل</span>
            </button>

            {/* Import Purchase Invoice Excel Button */}
            <button
              onClick={() => setIsPurchaseExcelOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="ورود فاکتور خرید شرکت پخش/تامین‌کننده از اکسل با شماره سند و ثبت در انبار و کالاها"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span className="hidden sm:inline">ورود فاکتور خرید با اکسل</span>
            </button>

            {/* Import Excel Button */}
            <button
              onClick={() => setIsExcelImportOpen(true)}
              className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer shadow-xs"
              title="ورود اطلاعات کالا و موجودی انبار از طریق فایل اکسل با راهنمای جامع"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">ورودی اکسل موجودی</span>
            </button>

            {/* Bulk Price Adjustment Button */}
            <button
              onClick={() => setIsBulkAdjustmentOpen(true)}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-amber-500/30 cursor-pointer shadow-xs"
              title="اصلاح دسته‌جمعی قیمت‌ها و تبدیل ریال به تومان برای رفع خطای ورود اکسل"
            >
              <ArrowUpDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">اصلاح ریال/تومان</span>
            </button>

            {/* Create Product Button (Primary Indigo) */}
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>تعریف کالای جدید</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Category Filter, Channel Filter, and 5-Tier Segmented Switcher (F3) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#222225]">
          {/* Category and Channel Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#161619] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-[#2D2D33]">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="bg-transparent text-xs text-slate-700 dark:text-[#E0E0E0] font-bold outline-none cursor-pointer py-1"
              >
                <option value="all">همه دسته‌بندی‌ها ({toPersianDigits(products.length)})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#161619] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-[#2D2D33]">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterAccountingOnly}
                onChange={(e) => setFilterAccountingOnly(e.target.value)}
                className="bg-transparent text-xs text-slate-700 dark:text-[#E0E0E0] font-bold outline-none cursor-pointer py-1"
              >
                <option value="all">همه کانال‌های عرضه</option>
                <option value="website_active">🌐 فعال در وبسایت</option>
                <option value="accounting_only">🏢 فقط حسابداری</option>
              </select>
            </div>
          </div>

          {/* 5-Tier Segmented Switcher (F3) - Matching POS Style */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#161619] p-1 rounded-xl border border-slate-200 dark:border-[#2D2D33] overflow-x-auto max-w-full">
            <div className="text-[11px] font-bold text-slate-500 dark:text-[#8E9299] px-2 whitespace-nowrap flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>سطح قیمت (F3):</span>
            </div>
            {[
              { id: 'all', label: 'همه سطوح', icon: Layers, color: 'text-slate-700 dark:text-slate-300' },
              { id: 'shop1', label: 'فروشگاه ۱ (حضوری)', icon: Store, color: 'text-indigo-600' },
              { id: 'shop2', label: 'فروشگاه ۲ (آنلاین)', icon: Globe, color: 'text-blue-600' },
              { id: 'shop3', label: 'فروشگاه ۳ (همکار)', icon: Building2, color: 'text-purple-600' },
              { id: 'wholesale', label: 'عمده‌فروشی', icon: Layers, color: 'text-amber-600' },
              { id: 'minAllowed', label: 'کف قیمت', icon: ShieldAlert, color: 'text-rose-600' },
            ].map((tier) => {
              const isActive = activeTierFilter === tier.id;
              const Icon = tier.icon;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setActiveTierFilter(tier.id as PriceTierFilter)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#25252A] text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-500/30'
                      : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#222226]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : tier.color}`} />
                  <span>{tier.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Selection Banner for Bulk Printing */}
      {selectedProductIds.length > 0 && (
        <div className="bg-white dark:bg-[#161619] border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-xs">
              {toPersianDigits(selectedProductIds.length)} کالا انتخاب شده
            </span>
            <span className="text-xs text-slate-600 dark:text-[#8E9299]">
              آماده برای چاپ دسته‌جمعی بارکد و برچسب قیمت با چیدمان A4، A5 یا رول حرارتی
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const toPrint = products.filter((p) => selectedProductIds.includes(p.id));
                setBatchPrintProducts(toPrint);
                setIsBatchPrintOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طراحی و چاپ بارکدهای انتخابی</span>
            </button>
            <button
              onClick={() => setIsBulkAdjustmentOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="اصلاح دسته‌جمعی واحد ریال/تومان برای اقلام انتخابی"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>اصلاح قیمت اقلام انتخابی</span>
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="bg-slate-100 dark:bg-[#222226] text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2D2D33] cursor-pointer"
            >
              لغو انتخاب‌ها
            </button>
          </div>
        </div>
      )}

      {/* 2. PRODUCTS TABLE WITH DYNAMIC 5-TIER PRICING VIEW */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-200 dark:border-[#222225] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-[#161619] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-[#222225]">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedProductIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(filtered.map((p) => p.id));
                      } else {
                        setSelectedProductIds([]);
                      }
                    }}
                    className="rounded accent-indigo-600 cursor-pointer"
                    title="انتخاب همه"
                  />
                </th>
                <th className="p-3.5">تصویر و کد</th>
                <th className="p-3.5">نام کالا و دسته‌بندی</th>
                <th className="p-3.5 text-center">کانال عرضه</th>
                <th className="p-3.5 text-center">موجودی</th>
                <th className="p-3.5">بهای خرید (سرمایه)</th>

                {/* Dynamic Price Columns depending on activeTierFilter */}
                {activeTierFilter === 'all' ? (
                  <>
                    <th className="p-3.5 text-indigo-700 dark:text-indigo-400">فروشگاه ۱ (حضوری)</th>
                    <th className="p-3.5 text-blue-700 dark:text-blue-400">فروشگاه ۲ (آنلاین)</th>
                    <th className="p-3.5 text-purple-700 dark:text-purple-400">فروشگاه ۳ (همکار)</th>
                    <th className="p-3.5 text-amber-700 dark:text-amber-400">عمده‌فروشی</th>
                    <th className="p-3.5 text-emerald-700 dark:text-emerald-400 text-center">سود حضوری</th>
                  </>
                ) : (
                  <>
                    <th className="p-3.5 text-indigo-700 dark:text-indigo-400 font-black">
                      قیمت {getTierLabel(activeTierFilter)}
                    </th>
                    <th className="p-3.5 text-emerald-700 dark:text-emerald-400">سود ناخالص</th>
                    <th className="p-3.5 text-emerald-700 dark:text-emerald-400 text-center">درصد حاشیه سود</th>
                  </>
                )}

                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#222225]">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    در حال بارگذاری فهرست کالاها و سطوح قیمت...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    کالایی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOnlyAcc = Boolean((p as any).onlyAccounting || (p as any).only_accounting);
                  const isWebActive = (p as any).showOnWebsite !== false && !isOnlyAcc;
                  const isSelected = selectedProductIds.includes(p.id);

                  const s1 = p.priceShop1 || p.salePrice || 0;
                  const s2 = p.priceShop2 || s1;
                  const s3 = p.priceShop3 || s1;
                  const sW = p.wholesalePrice || s1;
                  const sMin = p.minAllowedPrice || p.buyPrice || 0;

                  // Selected tier price calculation
                  let activePrice = s1;
                  if (activeTierFilter === 'shop2') activePrice = s2;
                  else if (activeTierFilter === 'shop3') activePrice = s3;
                  else if (activeTierFilter === 'wholesale') activePrice = sW;
                  else if (activeTierFilter === 'minAllowed') activePrice = sMin;

                  const profit = activePrice - (p.buyPrice || 0);
                  const margin = p.buyPrice > 0 ? Math.round((profit / p.buyPrice) * 100) : 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-[#161619]/60 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds((prev) => [...prev, p.id]);
                            } else {
                              setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded accent-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* Image & Code */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=100&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-10 h-10 object-contain rounded-xl bg-slate-50 dark:bg-[#161619] p-1 border border-slate-200 dark:border-[#2D2D33]"
                          />
                          <div>
                            <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{p.code}</div>
                            {p.barcode && <div className="font-mono text-[11px] text-slate-400">{p.barcode}</div>}
                            {(p as any).boxBarcode && (
                              <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                                📦 {(p as any).boxBarcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Name & Category */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</div>
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">{p.categoryName || 'عمومی'}</div>
                      </td>

                      {/* Channel Badge */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleWebsitePublish(p, e)}
                          title="برای تغییر کانال عرضه کلیک کنید"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                            isWebActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          {isWebActive ? (
                            <>
                              <Globe className="w-3 h-3" />
                              <span>در سایت فعال</span>
                            </>
                          ) : (
                            <>
                              <Building className="w-3 h-3" />
                              <span>فقط حسابداری</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Stock Badge */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-xs border ${
                            p.stock <= p.minStockAlert
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {toPersianDigits(p.stock)} {p.unit || 'عدد'}
                        </span>
                      </td>

                      {/* Purchasing Price */}
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono font-medium">
                        {formatToman(p.buyPrice)}
                      </td>

                      {/* Dynamic Price Cells */}
                      {activeTierFilter === 'all' ? (
                        <>
                          {/* Shop 1: Cash/In-store */}
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                              {formatToman(s1)}
                            </span>
                          </td>

                          {/* Shop 2: Online */}
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                              {formatToman(s2)}
                            </span>
                          </td>

                          {/* Shop 3: Partner */}
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                              {formatToman(s3)}
                            </span>
                          </td>

                          {/* Wholesale */}
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                              {formatToman(sW)}
                            </span>
                          </td>

                          {/* Profit Cash Margin */}
                          <td className="p-3.5 text-center">
                            {p.buyPrice > 0 ? (
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  s1 >= p.buyPrice
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {toPersianDigits(Math.round(((s1 - p.buyPrice) / p.buyPrice) * 100))}٪
                              </span>
                            ) : (
                              <span className="text-slate-400">---</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Single Tier Active Price */}
                          <td className="p-3.5">
                            <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              {formatToman(activePrice)}
                            </span>
                          </td>

                          {/* Profit Toman */}
                          <td className="p-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {formatToman(profit)}
                          </td>

                          {/* Profit Margin % */}
                          <td className="p-3.5 text-center">
                            {p.buyPrice > 0 ? (
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  profit >= 0
                                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {toPersianDigits(margin)}٪
                              </span>
                            ) : (
                              <span className="text-slate-400">---</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Action Buttons */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPublishProduct(p)}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                            title="انتشار چندکاناله در ایتا، بله، تلگرام، اینستاگرام و سایت"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setLabelProduct(p)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#202026] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2D2D33] transition-colors cursor-pointer"
                            title="طراحی و چاپ بارکد و اتیکت قیمت"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                            title="ویرایش کالا و تنظیم ۵ سطح قیمت"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            title="حذف کالا"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PRODUCT REGISTRATION & EDIT MODAL (POS Design Standard) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111113] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-[#2D2D33] text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#161619] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-xs">
                  {editingProduct ? <Edit2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                      {editingProduct ? 'ویرایش کالا و تنظیم ۵ سطح قیمت' : 'تعریف و ثبت کالای جدید در سیستم'}
                    </h3>
                    <span className="hidden sm:inline-flex bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      سیستم ۵ سطحی قیمت + فرمول‌ساز هوشمند
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#8E9299]">
                    {formData.name ? formData.name : 'اطلاعات شناسنامه کالا را در تب‌های زیر تکمیل نمایید.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1C1C20] hover:bg-slate-200 dark:hover:bg-[#25252B] text-slate-500 dark:text-[#8E9299] hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-[#2D2D33] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Navigation Tabs */}
            <div className="bg-slate-100/70 dark:bg-[#0D0D0F] px-4 py-2 border-b border-slate-200 dark:border-[#222225] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
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
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-white dark:bg-[#161619] text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 border border-slate-200 dark:border-[#26262B]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    <span>{tab.title}</span>
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#222226] text-slate-600 dark:text-[#8E9299]'
                      }`}
                    >
                      {toPersianDigits(idx + 1)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              {/* Tab 1: General Info & Coding */}
              {modalTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Channel Selector: Website vs Accounting */}
                  <div className="bg-slate-50 dark:bg-[#161619] p-4 rounded-2xl border border-slate-200 dark:border-[#2D2D33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block text-xs">کانال عرضه محصول:</span>
                      <span className="text-[11px] text-slate-500 dark:text-[#8E9299]">
                        آیا این محصول در وبسایت و فروشگاه آنلاین نیز به فروش برسد یا فقط در نرم‌افزار صندوق؟
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all ${
                          formData.showOnWebsite && !formData.onlyAccounting
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'bg-white dark:bg-[#111113] border-slate-300 dark:border-[#2D2D33] text-slate-600 dark:text-[#8E9299]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="channelMode"
                          checked={formData.showOnWebsite && !formData.onlyAccounting}
                          onChange={() => setFormData({ ...formData, showOnWebsite: true, onlyAccounting: false })}
                          className="accent-indigo-600"
                        />
                        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>ارسال به سایت و آنلاین</span>
                      </label>

                      <label
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all ${
                          formData.onlyAccounting
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-300 font-bold'
                            : 'bg-white dark:bg-[#111113] border-slate-300 dark:border-[#2D2D33] text-slate-600 dark:text-[#8E9299]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="channelMode"
                          checked={formData.onlyAccounting}
                          onChange={() => setFormData({ ...formData, showOnWebsite: false, onlyAccounting: true })}
                          className="accent-indigo-600"
                        />
                        <Building className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>فقط حسابداری و صندوق</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Product Name */}
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        نام کامل کالا <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثال: خودکار بیک کریستال ۱.۰ میلی‌متر آبی اصل فرانسه"
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-3 outline-none font-bold text-sm text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Product Code */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          کد اختصاصی کالا <span className="text-rose-500">*</span>:
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              code: `KHAT-${Math.floor(1000 + Math.random() * 9000)}`,
                            }))
                          }
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          تولید خودکار کد
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 font-mono outline-none text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    {/* Standard Barcode */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">بارکد استاندارد کالا:</label>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, barcode: generateValidEan13() }))}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          تولید بارکد EAN-13 معتبر
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: toEnglishDigits(e.target.value) })}
                          placeholder="اسکن بارکد یا درج دستی..."
                          className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 pl-44 font-mono outline-none text-slate-900 dark:text-white font-bold"
                        />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
                          <DirectPhoneScannerButton
                            onScan={(scannedCode) => {
                              const clean = toEnglishDigits(scannedCode).trim();
                              setFormData((prev) => ({ ...prev, barcode: clean }));
                              showToast(`بارکد «${clean}» دریافت شد.`, 'success');
                            }}
                            label="دوربین گوشی"
                            variant="gold"
                            title="اسکن مستقیم با دوربین گوشی"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScannerTargetField('formBarcode');
                              setIsScannerOpen(true);
                            }}
                            title="اسکنر وبکم"
                            className="px-2 py-1.5 rounded-xl bg-slate-200 dark:bg-[#222226] hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">وبکم</span>
                          </button>
                        </div>
                      </div>
                      {formData.barcode && (
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          {isValidBarcodeChecksum(formData.barcode) ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              بارکد استاندارد و رقم کنترلی معتبر است
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              فرمت سفارشی / بدون چک‌سام
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Box/Carton Barcode (Optional) */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        بارکد جعبه/کارتن (اختیاری):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.boxBarcode}
                          onChange={(e) => setFormData({ ...formData, boxBarcode: toEnglishDigits(e.target.value) })}
                          placeholder="در صورتی که کارتن کالا بارکد متفاوتی دارد..."
                          className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 pl-44 font-mono outline-none text-slate-900 dark:text-white font-bold"
                        />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
                          <DirectPhoneScannerButton
                            onScan={(scannedCode) => {
                              const clean = toEnglishDigits(scannedCode).trim();
                              setFormData((prev) => ({ ...prev, boxBarcode: clean }));
                              showToast(`بارکد جعبه «${clean}» دریافت شد.`, 'success');
                            }}
                            label="دوربین گوشی"
                            variant="gold"
                            title="اسکن مستقیم بارکد جعبه با گوشی"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScannerTargetField('formBoxBarcode');
                              setIsScannerOpen(true);
                            }}
                            className="px-2 py-1.5 rounded-xl bg-slate-200 dark:bg-[#222226] hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">وبکم</span>
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-[#8E9299]">
                        اسکن هر دو بارکد (تک یا کارتن) در صندوق فروش، این کالا را پیدا می‌کند.
                      </p>
                    </div>

                    {/* Main Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">دسته‌بندی اصلی:</label>
                        <InlineCategoryCreator
                          mode="category"
                          theme="dark"
                          onCreated={(res) => {
                            if (res.category) {
                              setCategories((prev) => {
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
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="">-- بدون دسته‌بندی / عمومی --</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sub Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">زیردسته‌بندی تخصصی:</label>
                        <InlineCategoryCreator
                          mode="subcategory"
                          parentCategoryId={formData.categoryId}
                          disabled={!formData.categoryId}
                          disabledReason="ابتدا دسته‌بندی اصلی را انتخاب کنید"
                          theme="dark"
                          onCreated={(res) => {
                            if (res.subcategory && formData.categoryId) {
                              setCategories((prev) =>
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
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none font-bold text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50"
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

                    {/* Primary Unit */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">واحد سنجش اصلی:</label>
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
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
                      >
                        <option value="عدد">عدد</option>
                        {Array.from(new Set(unitDefs.map((u) => u.name)))
                          .filter((name) => name !== 'عدد')
                          .map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Sub Unit & Conversion Factor */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        واحد فرعی و ضریب تبدیل (اختیاری):
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={formData.subUnit || ''}
                          onChange={(e) => setFormData({ ...formData, subUnit: e.target.value })}
                          className="w-2/3 bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
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
                          value={formData.conversionFactor}
                          onChange={(e) => setFormData({ ...formData, conversionFactor: Number(e.target.value) || 1 })}
                          placeholder="ضریب (مثلاً ۱۲)"
                          className="w-1/3 bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none font-mono text-slate-800 dark:text-slate-100 font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: 5-Tier Pricing and Inventory (Professional Modular Form) */}
              {modalTab === 'pricing' && (
                <div className="animate-in fade-in duration-150">
                  <ProductTierPricingForm
                    data={{
                      buyPrice: formData.buyPrice,
                      salePrice: formData.salePrice,
                      priceShop1: formData.priceShop1,
                      priceShop2: formData.priceShop2,
                      priceShop3: formData.priceShop3,
                      wholesalePrice: formData.wholesalePrice,
                      minAllowedPrice: formData.minAllowedPrice,
                      stock: formData.stock,
                      minStockAlert: formData.minStockAlert,
                      unit: formData.unit,
                    }}
                    onChange={(updated) => {
                      setFormData((prev) => ({
                        ...prev,
                        ...updated,
                        ...(updated.priceShop1 !== undefined ? { salePrice: updated.priceShop1 } : {}),
                      }));
                    }}
                  />
                </div>
              )}

              {/* Tab 3: Multi-Image Gallery */}
              {modalTab === 'gallery' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <ProductGalleryManager
                    images={formData.extraImages}
                    primaryImage={formData.image}
                    title="تصویر اصلی و گالری چند عکسه کالا (وبسایت و شبکه‌های اجتماعی)"
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

              {/* Tab 4: Details & Advanced Attributes */}
              {modalTab === 'details' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      توضیحات و ویژگی‌های فنی کالا (جهت نمایش در سایت):
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="توضیحات جامع درباره کیفیت، مشخصات، جنس، کاربرد و برند کالا..."
                      className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-3 outline-none text-slate-800 dark:text-slate-100 leading-relaxed"
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-[#161619] p-4 rounded-2xl border border-slate-200 dark:border-[#2D2D33] space-y-3">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-white">برچسب‌ها و نشان‌های تبلیغاتی:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#26262B] cursor-pointer hover:border-indigo-500 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.isSpecialOffer}
                          onChange={(e) => setFormData({ ...formData, isSpecialOffer: e.target.checked })}
                          className="rounded accent-indigo-600 w-4 h-4"
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">نمایش در پیشنهادهای ویژه و شگفت‌انگیز</span>
                          <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">قرارگیری در اسلایدر تخفیفات ویژه صفحه اول سایت</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#26262B] cursor-pointer hover:border-indigo-500 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.featured}
                          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                          className="rounded accent-indigo-600 w-4 h-4"
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">محصول تولید اختصاصی برند خطی‌نو</span>
                          <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">نمایش نشان تولید اختصاصی / برند خطی‌نو</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Sticky Bottom Bar */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#161619] border-t border-slate-200 dark:border-[#222225] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Quick Summary Pill on Desktop */}
              <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 dark:text-[#8E9299]">
                <span>
                  نام: <strong className="text-slate-800 dark:text-slate-200">{formData.name ? formData.name.slice(0, 24) + '...' : '---'}</strong>
                </span>
                <span>•</span>
                <span>
                  فروشگاه ۱ (حضوری):{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {formatToman(formData.priceShop1 || formData.salePrice)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  موجودی انبار:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {toPersianDigits(formData.stock)} {formData.unit}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Previous Step Button */}
                {currentTabIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalTab(tabList[currentTabIndex - 1].id)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1C1C20] hover:bg-slate-200 dark:hover:bg-[#25252B] text-slate-700 dark:text-[#E0E0E0] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 dark:border-[#2D2D33]"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>مرحله قبل</span>
                  </button>
                )}

                {/* Next Step Button */}
                {currentTabIndex < tabList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setModalTab(tabList[currentTabIndex + 1].id)}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-indigo-200 dark:border-indigo-800"
                  >
                    <span>مرحله بعد</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-[#1C1C20] hover:bg-slate-200 dark:hover:bg-[#25252B] text-slate-600 dark:text-[#8E9299] hover:text-slate-900 font-bold text-xs rounded-xl cursor-pointer transition-colors border border-slate-200 dark:border-[#2D2D33]"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>ذخیره اطلاعات کالا</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleCameraScanSuccess}
        title={scannerTargetField === 'formBarcode' ? 'اسکن بارکد کالا برای فرم' : 'اسکن بارکد کالا با دوربین'}
      />

      {/* Barcode Print Modal */}
      {(labelProduct || isBatchPrintOpen) && (
        <BarcodePrintModal
          isOpen={Boolean(labelProduct || isBatchPrintOpen)}
          onClose={() => {
            setLabelProduct(null);
            setIsBatchPrintOpen(false);
          }}
          product={labelProduct}
          productsList={batchPrintProducts}
          allAvailableProducts={products}
        />
      )}

      {/* Multi-Channel Publication Modal */}
      {publishProduct && (
        <ProductPublishModal
          product={publishProduct}
          isOpen={Boolean(publishProduct)}
          onClose={() => setPublishProduct(null)}
          onSuccess={() => {
            showToast('کالا با موفقیت در صف انتشار چندکاناله قرار گرفت.', 'success');
          }}
        />
      )}

      {/* Keyboard Shortcut Indicator Bar (Ergonomic like POS) */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-[#8E9299]">
        <div className="flex items-center gap-1.5 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>کلیدهای میانبر سریع مدیریت کالاها:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#202025] rounded border border-slate-300 dark:border-[#333] font-mono text-[10px] font-bold">
              F1
            </kbd>
            <span>جستجو و اسکن بارکد</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#202025] rounded border border-slate-300 dark:border-[#333] font-mono text-[10px] font-bold">
              F3
            </kbd>
            <span>سوئیچ سریع سطوح قیمت</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#202025] rounded border border-slate-300 dark:border-[#333] font-mono text-[10px] font-bold">
              F8
            </kbd>
            <span>اسکنر دوربین زنده</span>
          </span>
        </div>
      </div>
      {/* Excel Import Modal */}
      <InventoryExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        warehouses={warehouses}
        onSuccess={() => {
          loadData();
          setIsExcelImportOpen(false);
        }}
      />

      {/* Purchase Invoice Excel Import Modal */}
      <PurchaseInvoiceExcelImportModal
        isOpen={isPurchaseExcelOpen}
        onClose={() => setIsPurchaseExcelOpen(false)}
        warehouses={warehouses}
        suppliers={suppliers}
        onSuccess={() => {
          loadData();
        }}
        onEditProduct={(p) => {
          setIsPurchaseExcelOpen(false);
          const target = products.find((prod) => prod.id === p.id) || p;
          handleOpenEdit(target as Product);
        }}
        onNavigateToProducts={(query) => {
          setIsPurchaseExcelOpen(false);
          if (query) {
            setSearchQuery(query);
          }
        }}
      />

      {/* Bulk Price Adjustment Modal */}
      <BulkPriceAdjustmentModal
        isOpen={isBulkAdjustmentOpen}
        onClose={() => setIsBulkAdjustmentOpen(false)}
        selectedProductIds={selectedProductIds}
        products={products}
        onSuccess={() => {
          loadData();
          setSelectedProductIds([]);
        }}
      />
    </div>
  );
};
