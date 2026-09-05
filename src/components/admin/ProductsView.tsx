import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  FileSpreadsheet,
  Download,
  AlertTriangle,
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
  Image as ImageIcon,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Boxes,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber, toEnglishDigits, isValidBarcodeChecksum } from '../../lib/utils';
import { Product, Category, SubCategory } from '../../types';
import { useToast } from '../common/Toast';
import { BarcodePrintModal } from './BarcodePrintModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { CurrencyInput } from '../common/CurrencyInput';
import { ProductGalleryManager } from '../common/ProductGalleryManager';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';

type ModalTabType = 'general' | 'pricing' | 'gallery' | 'details';

export const ProductsView: React.FC = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [filterAccountingOnly, setFilterAccountingOnly] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Barcode Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetField, setScannerTargetField] = useState<'search' | 'formBarcode'>('search');

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTabType>('general');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [extraImageInput, setExtraImageInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '',
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

  // Hardware USB/Bluetooth Barcode Scanner listener
  useHardwareBarcodeScanner({
    onScan: (scannedCode) => {
      const clean = toEnglishDigits(scannedCode).trim();
      if (showModal) {
        setFormData((prev) => ({ ...prev, barcode: clean }));
        showToast(`بارکد «${clean}» از بارکدخوان فیزیکی دریافت شد.`, 'success');
      } else {
        setSearchQuery(clean);
        showToast(`بارکد «${clean}» اسکن و در انبار جستجو شد.`, 'info');
      }
    },
    enabled: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts().catch(() => ({ products: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // تولید بارکد استاندارد EAN-13 معتبر با رقم کنترلی دقیق ریاضی
  const generateValidEan13 = () => {
    const raw12 = '626' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(raw12[i], 10);
      sum += i % 2 === 0 ? d * 1 : d * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return raw12 + check.toString();
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setExtraImageInput('');
    setModalTab('general');
    const defaultImg = 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80';
    setFormData({
      name: '',
      code: `KHAT-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: generateValidEan13(),
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
    setExtraImageInput('');
    setModalTab('general');
    
    // Collect all unique images from product (image, gallery, extraImages)
    const rawList = [
      p.image,
      ...(Array.isArray((p as any).gallery) ? (p as any).gallery : []),
      ...(Array.isArray((p as any).extraImages) ? (p as any).extraImages : []),
      ...(Array.isArray((p as any).extra_images) ? (p as any).extra_images : []),
    ].filter((x): x is string => Boolean(x && typeof x === 'string' && x.trim()));

    const uniqueImages = Array.from(new Set(rawList));
    const primary = p.image && uniqueImages.includes(p.image) ? p.image : (uniqueImages[0] || '');
    const secondaryImages = uniqueImages.filter((img) => img !== primary);

    setFormData({
      name: p.name,
      code: p.code,
      barcode: p.barcode || '',
      categoryId: p.categoryId,
      subCategoryId: p.subCategoryId || '',
      unit: p.unit,
      subUnit: p.subUnit || '',
      conversionFactor: p.conversionFactor || 1,
      buyPrice: p.buyPrice,
      salePrice: p.salePrice,
      priceShop1: p.priceShop1 || p.salePrice,
      priceShop2: p.priceShop2 || p.salePrice,
      priceShop3: p.priceShop3 || p.salePrice,
      wholesalePrice: p.wholesalePrice || p.salePrice,
      minAllowedPrice: p.minAllowedPrice || p.buyPrice,
      stock: p.stock,
      minStockAlert: p.minStockAlert,
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
      showToast(newShow ? 'کالا با موفقیت به وبسایت ارسال و منتشر شد.' : 'کالا به حالت «فقط حسابداری» تغییر یافت و از سایت حذف شد.', 'success');
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
      showToast(`بارکد «${clean}» با موفقیت در فرم کالا درج شد.`, 'success');
    } else {
      setSearchQuery(clean);
      showToast(`بارکد «${clean}» با دوربین اسکن و جستجو شد.`, 'success');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation checks with auto-switch to tab
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
      const payload = {
        ...formData,
        barcode: toEnglishDigits(formData.barcode).trim(),
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
    if (!confirm('آیا از حذف این کالا از انبار اطمینان دارید؟')) return;
    try {
      await api.deleteProduct(id);
      showToast('کالا با موفقیت از سیستم حذف شد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف کالا', 'error');
    }
  };

  const handleExportExcel = () => {
    const headers = ['کد', 'بارکد', 'نام کالا', 'دسته‌بندی', 'واحد', 'موجودی', 'قیمت خرید', 'فروشگاه ۱ (حضوری)', 'فروشگاه ۲ (آنلاین)', 'عمده', 'انتشار در سایت'];
    const rows = products.map((p) => [
      p.code,
      p.barcode,
      `"${p.name}"`,
      `"${p.categoryName || ''}"`,
      p.unit,
      p.stock,
      p.buyPrice,
      p.priceShop1,
      p.priceShop2,
      p.wholesalePrice,
      (p as any).onlyAccounting ? 'فقط حسابداری' : 'منتشر در سایت',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `khatinoo_products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('خروجی اکسل با موفقیت دانلود شد.', 'success');
  };

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
      toEnglishDigits(p.barcode || '').toLowerCase().includes(cleanSearch);
    return matchCat && matchChannel && matchQ;
  });

  const selectedCategoryObj = categories.find((c) => c.id === formData.categoryId);
  const currentSubcategories = selectedCategoryObj?.subcategories || [];

  // Live profit calculation
  const profitToman = Math.max(0, (formData.priceShop1 || formData.salePrice || 0) - (formData.buyPrice || 0));
  const profitMargin = formData.buyPrice > 0 ? Math.round((profitToman / formData.buyPrice) * 100) : 0;

  const tabList: Array<{ id: ModalTabType; title: string; icon: any }> = [
    { id: 'general', title: 'مشخصات اصلی و کدینگ', icon: Tag },
    { id: 'pricing', title: 'قیمت‌گذاری و انبار', icon: DollarSign },
    { id: 'gallery', title: 'گالری و عکس‌ها', icon: ImageIcon },
    { id: 'details', title: 'توضیحات و ویژگی‌ها', icon: SlidersHorizontal },
  ];

  const currentTabIndex = tabList.findIndex((t) => t.id === modalTab);

  return (
    <div className="space-y-4 text-[#E0E0E0]">
      {/* Top Header & Actions */}
      <div className="bg-[#111113] rounded-2xl p-4 border border-[#222225] shadow-xl flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Input with Camera Barcode Scanner Trigger */}
          <div className="relative flex-1 sm:w-80 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام، کد، یا اسکن بارکد..."
              className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl pr-9 pl-12 py-2 text-xs text-[#E0E0E0] outline-none"
            />
            <Search className="w-4 h-4 text-[#8E9299] absolute right-3 top-2.5" />
            <button
              type="button"
              onClick={() => {
                setScannerTargetField('search');
                setIsScannerOpen(true);
              }}
              title="اسکن بارکد کالا با دوربین ضدخطا"
              className="absolute left-1.5 top-1.5 p-1 rounded-lg bg-[#222226] hover:bg-[#C9A227] text-[#C9A227] hover:text-black transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 text-xs text-[#E0E0E0] font-bold outline-none cursor-pointer"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Channel Filter (Website vs Accounting) */}
          <select
            value={filterAccountingOnly}
            onChange={(e) => setFilterAccountingOnly(e.target.value)}
            className="bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 text-xs text-[#E0E0E0] font-bold outline-none cursor-pointer"
          >
            <option value="all">همه کانال‌های عرضه</option>
            <option value="website_active">🌐 فعال در سایت اینترنتی</option>
            <option value="accounting_only">🏢 فقط سیستم حسابداری</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={() => {
              const toPrint = selectedProductIds.length > 0
                ? products.filter((p) => selectedProductIds.includes(p.id))
                : filtered.slice(0, 10);
              setBatchPrintProducts(toPrint);
              setIsBatchPrintOpen(true);
            }}
            className="bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-[#C9A227]/40 shadow-xs cursor-pointer"
            title="چاپ برچسب و بارکد برای چندین محصول به صورت شبکه‌ای در A4، A5 یا رول حرارتی"
          >
            <Printer className="w-4 h-4 text-[#C9A227]" />
            <span>چاپ گروهی بارکد {selectedProductIds.length > 0 ? `(${selectedProductIds.length} کالا)` : '(A4/A5/رول)'}</span>
          </button>

          <button
            onClick={() => {
              setScannerTargetField('search');
              setIsScannerOpen(true);
            }}
            className="bg-[#161619] hover:bg-[#1F1F24] text-[#C9A227] font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-[#2D2D33] cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-[#C9A227]" />
            <span>اسکن بارکد دوربین</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-[#161619] hover:bg-[#1F1F24] text-[#E0E0E0] font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-[#2D2D33] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی اکسل (CSV)</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>تعریف کالای جدید</span>
          </button>
        </div>
      </div>

      {/* Batch Selection Action Floating Banner */}
      {selectedProductIds.length > 0 && (
        <div className="bg-[#161619] border border-[#C9A227]/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="bg-[#C9A227] text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg">
              {toPersianDigits(selectedProductIds.length)} کالا انتخاب شده
            </span>
            <span className="text-xs text-[#8E9299]">
              آماده برای چاپ دسته‌جمعی بارکد، برچسب قیمت و صدور اتیکت
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const toPrint = products.filter((p) => selectedProductIds.includes(p.id));
                setBatchPrintProducts(toPrint);
                setIsBatchPrintOpen(true);
              }}
              className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#C9A227]/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-black" />
              <span>طراحی و چاپ بارکدهای انتخابی</span>
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] text-xs px-3 py-1.5 rounded-xl border border-[#222225] cursor-pointer"
            >
              لغو انتخاب‌ها
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-[#111113] rounded-3xl border border-[#222225] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-[#161619] text-[#C9A227] font-bold border-b border-[#222225]">
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
                    className="rounded accent-[#C9A227] cursor-pointer"
                    title="انتخاب همه کالاهای فیلتر شده"
                  />
                </th>
                <th className="p-3.5">تصویر و کد</th>
                <th className="p-3.5">نام کالا و دسته‌بندی</th>
                <th className="p-3.5 text-center">کانال عرضه</th>
                <th className="p-3.5 text-center">موجودی انبار</th>
                <th className="p-3.5">قیمت خرید</th>
                <th className="p-3.5">فروشگاه ۱ (حضوری)</th>
                <th className="p-3.5">فروشگاه ۲ (آنلاین/ترب)</th>
                <th className="p-3.5">قیمت عمده</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222225]">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#8E9299]">
                    در حال دریافت فهرست کالاها...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#8E9299]">
                    کالایی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOnlyAcc = Boolean((p as any).onlyAccounting || (p as any).only_accounting);
                  const isWebActive = (p as any).showOnWebsite !== false && !isOnlyAcc;
                  const isSelected = selectedProductIds.includes(p.id);

                  return (
                    <tr key={p.id} className={`hover:bg-[#161619]/60 transition-colors ${isSelected ? 'bg-[#C9A227]/5' : ''}`}>
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
                          className="rounded accent-[#C9A227] cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=100&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-10 h-10 object-contain rounded-lg bg-[#161619] p-1 border border-[#2D2D33]"
                          />
                          <div>
                            <div className="font-mono text-[11px] font-bold text-[#8E9299]">{p.code}</div>
                            {p.barcode && <div className="font-mono text-[10px] text-stone-500">{p.barcode}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#F3F4F6] line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-[#C9A227]">{p.categoryName}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleWebsitePublish(p, e)}
                          title="برای تغییر وضعیت انتشار در سایت کلیک کنید"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                            isWebActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
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
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            p.stock <= p.minStockAlert
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {toPersianDigits(p.stock)} {p.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#8E9299] font-medium font-mono">{formatToman(p.buyPrice)}</td>
                      <td className="p-3.5 font-bold text-[#F3F4F6] font-mono">{formatToman(p.priceShop1 || p.salePrice)}</td>
                      <td className="p-3.5 font-bold text-[#C9A227] font-mono">{formatToman(p.priceShop2 || p.salePrice)}</td>
                      <td className="p-3.5 font-bold text-amber-400 font-mono">{formatToman(p.wholesalePrice || p.salePrice)}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setLabelProduct(p)}
                            className="p-1.5 rounded-lg bg-[#161619] hover:bg-[#1F1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2D2D33] transition-colors cursor-pointer"
                            title="چاپ بارکد و برچسب قیمت"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] border border-[#2D2D33] hover:border-[#C9A227]/40 transition-colors cursor-pointer"
                            title="ویرایش کالا"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border border-rose-900/40 transition-colors cursor-pointer"
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

      {/* Enhanced Product Registration & Edit Modal with Sticky Tabs & High-Contrast Layout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
          <div className="bg-[#111113] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#2D2D33] text-[#E0E0E0] overflow-hidden">
            {/* Sticky Header */}
            <div className="px-5 py-3.5 border-b border-[#222225] bg-[#161619] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#C9A227]/15 text-[#C9A227] flex items-center justify-center shadow-inner">
                  {editingProduct ? <Edit2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-[#F3F4F6] text-sm sm:text-base">
                      {editingProduct ? 'ویرایش کالا، تصاویر و سطوح قیمت' : 'تعریف و ثبت کالای جدید در سیستم'}
                    </h3>
                    <span className="hidden sm:inline-flex bg-amber-500/10 text-[#C9A227] border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      جداسازی زنده ۳ رقمی + محاسبه سود
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E9299]">
                    {formData.name ? formData.name : 'اطلاعات کامل شناسنامه کالا را در تب‌های زیر تکمیل نمایید.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-xl bg-[#1C1C20] hover:bg-[#25252B] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2D2D33] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Navigation Tabs Bar */}
            <div className="bg-[#0D0D0F] px-4 py-2 border-b border-[#222225] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
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
                        ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20 font-black'
                        : 'bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#1C1C20] border border-[#26262B]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-[#C9A227]'}`} />
                    <span>{tab.title}</span>
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                        isActive ? 'bg-black/20 text-slate-950' : 'bg-[#222226] text-[#8E9299]'
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
                  <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#F3F4F6] block text-xs">کانال و مقصد عرضه کالا:</span>
                      <span className="text-[11px] text-[#8E9299]">
                        آیا این محصول در وبسایت و فروشگاه آنلاین نیز عرضه شود یا صرفاً در سیستم حسابداری؟
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all ${
                          formData.showOnWebsite && !formData.onlyAccounting
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                            : 'bg-[#111113] border-[#2D2D33] text-[#8E9299]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="channelMode"
                          checked={formData.showOnWebsite && !formData.onlyAccounting}
                          onChange={() => setFormData({ ...formData, showOnWebsite: true, onlyAccounting: false })}
                          className="accent-[#C9A227]"
                        />
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold">ارسال به سایت و آنلاین</span>
                      </label>

                      <label
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all ${
                          formData.onlyAccounting
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                            : 'bg-[#111113] border-[#2D2D33] text-[#8E9299]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="channelMode"
                          checked={formData.onlyAccounting}
                          onChange={() => setFormData({ ...formData, showOnWebsite: false, onlyAccounting: true })}
                          className="accent-[#C9A227]"
                        />
                        <Building className="w-4 h-4 text-amber-400" />
                        <span className="font-bold">فقط حسابداری داخلی</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Product Name */}
                    <div className="sm:col-span-2">
                      <label className="font-bold text-[#C9A227] block mb-1">
                        نام کامل کالا <span className="text-rose-400">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثال: خودکار بیک کریستال ۱.۰ میلی‌متر آبی اصل فرانسه"
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-3 outline-none font-bold text-sm text-[#F3F4F6]"
                      />
                    </div>

                    {/* Product Code */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-[#8E9299]">
                          کد اختصاصی کالا <span className="text-rose-400">*</span>:
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              code: `KHAT-${Math.floor(1000 + Math.random() * 9000)}`,
                            }))
                          }
                          className="text-[10px] text-[#C9A227] hover:underline cursor-pointer flex items-center gap-1"
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
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono outline-none text-[#E0E0E0] font-bold"
                      />
                    </div>

                    {/* Barcode with Smart Scanner & Auto-generator */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-[#8E9299]">بارکد استاندارد کالا:</label>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, barcode: generateValidEan13() }))}
                          className="text-[10px] text-[#C9A227] hover:underline cursor-pointer flex items-center gap-1"
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
                          placeholder="اسکن با دوربین یا تایپ بارکد..."
                          className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 pl-20 font-mono outline-none text-[#E0E0E0] font-bold"
                        />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setScannerTargetField('formBarcode');
                              setIsScannerOpen(true);
                            }}
                            title="اسکن بارکد با دوربین گوشی یا وب‌کم"
                            className="px-2.5 py-1 rounded-lg bg-[#222226] hover:bg-[#C9A227] text-[#C9A227] hover:text-black font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>اسکن</span>
                          </button>
                        </div>
                      </div>
                      {formData.barcode && (
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          {isValidBarcodeChecksum(formData.barcode) ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              بارکد استاندارد و رقم کنترلی معتبر است
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              فرمت سفارشی / بدون چک‌سام
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Main Category */}
                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1">دسته‌بندی اصلی:</label>
                      <select
                        value={formData.categoryId || ''}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subCategoryId: '' })}
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-bold text-[#E0E0E0] cursor-pointer"
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
                      <label className="font-bold text-[#8E9299] block mb-1">زیردسته‌بندی تخصصی:</label>
                      <select
                        value={formData.subCategoryId || ''}
                        onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
                        disabled={currentSubcategories.length === 0}
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-bold text-[#E0E0E0] cursor-pointer disabled:opacity-50"
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
                      <label className="font-bold text-[#8E9299] block mb-1">واحد سنجش اصلی:</label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="مثال: عدد، بسته، جلد، کارتن"
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0] font-bold"
                      />
                    </div>

                    {/* Sub Unit & Conversion */}
                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1">واحد فرعی و ضریب تبدیل (اختیاری):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.subUnit}
                          onChange={(e) => setFormData({ ...formData, subUnit: e.target.value })}
                          placeholder="واحد فرعی (مثلاً عدد)"
                          className="w-2/3 bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0]"
                        />
                        <input
                          type="number"
                          value={formData.conversionFactor}
                          onChange={(e) => setFormData({ ...formData, conversionFactor: Number(e.target.value) || 1 })}
                          placeholder="ضریب (مثلاً ۱۲)"
                          className="w-1/3 bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-mono text-[#E0E0E0]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: 5-Tier Pricing & Inventory */}
              {modalTab === 'pricing' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Stock & Alert Card */}
                  <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-[#C9A227] block mb-1 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4" />
                        <span>موجودی اولیه انبار ({formData.unit || 'عدد'}):</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono text-sm outline-none font-bold text-[#E0E0E0]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>نقطه هشدار کسری موجودی (حداقل انبار):</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minStockAlert}
                        onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono text-sm outline-none text-[#E0E0E0]"
                      />
                    </div>
                  </div>

                  {/* 5-Tier Pricing Box with CurrencyInput */}
                  <div className="bg-[#161619] p-4 sm:p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#222228] pb-3">
                      <h4 className="font-black text-[#C9A227] text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>قیمت‌گذاری ۵ سطحی فروشگاهی و عمده (تومان):</span>
                      </h4>

                      {/* Profit Badge */}
                      {formData.buyPrice > 0 && formData.priceShop1 > 0 && (
                        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-xl flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>سود ناخالص فروش نقدی:</span>
                          <span className="font-mono font-black text-white">{formatToman(profitToman)}</span>
                          <span className="bg-emerald-500 text-black font-black text-[10px] px-1.5 py-0.5 rounded-md">
                            {profitMargin}٪
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <CurrencyInput
                        label="بهای خرید از تامین‌کننده (تومان):"
                        value={formData.buyPrice}
                        onChange={(val) => setFormData({ ...formData, buyPrice: val })}
                        required
                      />

                      <CurrencyInput
                        label="فروشگاه ۱ (نقدی / حضوری):"
                        value={formData.priceShop1}
                        onChange={(val) => setFormData({ ...formData, priceShop1: val, salePrice: val })}
                        required
                      />

                      <CurrencyInput
                        label="فروشگاه ۲ (آنلاین / ترب):"
                        value={formData.priceShop2}
                        onChange={(val) => setFormData({ ...formData, priceShop2: val })}
                      />

                      <CurrencyInput
                        label="فروشگاه ۳ (همکار / شعب):"
                        value={formData.priceShop3}
                        onChange={(val) => setFormData({ ...formData, priceShop3: val })}
                      />

                      <CurrencyInput
                        label="فروش عمده و مدارس:"
                        value={formData.wholesalePrice}
                        onChange={(val) => setFormData({ ...formData, wholesalePrice: val })}
                      />

                      <CurrencyInput
                        label="کف قیمت مجاز (حداقل تخفیف):"
                        value={formData.minAllowedPrice}
                        onChange={(val) => setFormData({ ...formData, minAllowedPrice: val })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Multi-Image Gallery */}
              {modalTab === 'gallery' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <ProductGalleryManager
                    images={formData.extraImages}
                    primaryImage={formData.image}
                    title="تصویر اصلی و گالری چند عکسه کالا (سیستم حسابداری، فروشگاه آنلاین و ترب)"
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
                    <label className="font-bold text-[#8E9299] block mb-1">
                      توضیحات و مشخصات فنی کالا (جهت نمایش در سایت):
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="توضیحات جامع درباره کیفیت، مشخصات، جنس، کاربرد و برند کالا..."
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-3 outline-none text-[#E0E0E0] leading-relaxed"
                    />
                  </div>

                  <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-3">
                    <h5 className="font-bold text-xs text-[#F3F4F6]">برچسب‌ها و نشان‌های تبلیغاتی:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-[#111113] border border-[#26262B] cursor-pointer hover:border-[#C9A227] transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.isSpecialOffer}
                          onChange={(e) => setFormData({ ...formData, isSpecialOffer: e.target.checked })}
                          className="rounded accent-[#C9A227] w-4 h-4"
                        />
                        <div>
                          <span className="font-bold text-[#E0E0E0] block">نمایش در پیشنهادهای شگفت‌انگیز و تخفیف ویژه</span>
                          <span className="text-[10px] text-[#8E9299]">قرارگیری در اسلایدر ویژه تخفیفات صفحه اول</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-[#111113] border border-[#26262B] cursor-pointer hover:border-[#C9A227] transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.featured}
                          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                          className="rounded accent-[#C9A227] w-4 h-4"
                        />
                        <div>
                          <span className="font-bold text-[#E0E0E0] block">محصول تولید اختصاصی برند خطی‌نو</span>
                          <span className="text-[10px] text-[#8E9299]">نمایش نشان تولید ملی / برند خطی‌نو روی کالا</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Sticky Bottom Bar */}
            <div className="px-5 py-3 bg-[#161619] border-t border-[#222225] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Quick Summary Pill on Desktop */}
              <div className="hidden lg:flex items-center gap-3 text-xs text-[#8E9299]">
                <span>نام: <strong className="text-[#E0E0E0]">{formData.name ? formData.name.slice(0, 24) + '...' : '---'}</strong></span>
                <span>•</span>
                <span>فروش نقدی: <strong className="text-[#C9A227] font-mono">{formatToman(formData.priceShop1 || formData.salePrice)}</strong></span>
                <span>•</span>
                <span>موجودی: <strong className="text-emerald-400 font-mono">{toPersianDigits(formData.stock)} {formData.unit}</strong></span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Previous Step Button */}
                {currentTabIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalTab(tabList[currentTabIndex - 1].id)}
                    className="px-3 py-2.5 rounded-xl bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-[#2D2D33]"
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
                    className="px-3.5 py-2.5 rounded-xl bg-[#222228] hover:bg-[#2C2C34] text-[#C9A227] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-[#3A3A44]"
                  >
                    <span>مرحله بعد</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-[#1C1C20] hover:bg-[#25252B] text-[#8E9299] hover:text-[#E0E0E0] font-bold text-xs rounded-xl cursor-pointer transition-colors border border-[#2D2D33]"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-[#C9A227]/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 text-black stroke-[3]" />
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
        title={scannerTargetField === 'formBarcode' ? 'اسکن بارکد کالا برای ثبت در فرم' : 'اسکن بارکد کالا با دوربین'}
      />

      {/* Barcode Print Modal for Single Product or Batch Selection */}
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
    </div>
  );
};
