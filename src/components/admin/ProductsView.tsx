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
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { Product, Category } from '../../types';
import { useToast } from '../common/Toast';
import { BarcodePrintModal } from './BarcodePrintModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { CurrencyInput } from '../common/CurrencyInput';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';

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

  // Hardware USB/Bluetooth Barcode Scanner listener
  useHardwareBarcodeScanner({
    onScan: (scannedCode) => {
      if (showModal) {
        setFormData((prev) => ({ ...prev, barcode: scannedCode }));
        showToast(`بارکد «${scannedCode}» از بارکدخوان فیزیکی دریافت شد.`, 'success');
      } else {
        setSearchQuery(scannedCode);
        showToast(`بارکد «${scannedCode}» اسکن و در انبار جستجو شد.`, 'info');
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

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setExtraImageInput('');
    setFormData({
      name: '',
      code: `KHAT-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
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
      image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
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
    const extraImgs = Array.isArray((p as any).extraImages)
      ? (p as any).extraImages
      : Array.isArray((p as any).extra_images)
      ? (p as any).extra_images
      : [];

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
      image: p.image || '',
      extraImages: extraImgs,
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

  const handleAddExtraImage = () => {
    if (!extraImageInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      extraImages: [...prev.extraImages, extraImageInput.trim()],
    }));
    setExtraImageInput('');
  };

  const handleRemoveExtraImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      extraImages: prev.extraImages.filter((_, i) => i !== index),
    }));
  };

  const handleCameraScanSuccess = (code: string) => {
    setIsScannerOpen(false);
    if (scannerTargetField === 'formBarcode') {
      setFormData((prev) => ({ ...prev, barcode: code }));
      showToast(`بارکد «${code}» در فرم کالا جایگذاری شد.`, 'success');
    } else {
      setSearchQuery(code);
      showToast(`بارکد «${code}» با دوربین اسکن شد.`, 'success');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
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

    const matchQ =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery);
    return matchCat && matchChannel && matchQ;
  });

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
              title="اسکن بارکد کالا با دوربین"
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

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={() => {
              setScannerTargetField('search');
              setIsScannerOpen(true);
            }}
            className="bg-[#161619] hover:bg-[#1F1F24] text-[#C9A227] font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-[#2D2D33] cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-[#C9A227]" />
            <span>اسکن با دوربین</span>
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

      {/* Products Table */}
      <div className="bg-[#111113] rounded-3xl border border-[#222225] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-[#161619] text-[#C9A227] font-bold border-b border-[#222225]">
              <tr>
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
                  <td colSpan={9} className="p-8 text-center text-[#8E9299]">
                    در حال دریافت فهرست کالاها...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#8E9299]">
                    کالایی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOnlyAcc = Boolean((p as any).onlyAccounting || (p as any).only_accounting);
                  const isWebActive = (p as any).showOnWebsite !== false && !isOnlyAcc;

                  return (
                    <tr key={p.id} className="hover:bg-[#161619]/60 transition-colors">
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

      {/* Product Create / Edit Modal with 5 Price Tiers, Live Currency Separation & Multi-Image Gallery */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#111113] rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[#222225]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#F3F4F6]">
                  {editingProduct ? 'ویرایش کالا، تصاویر و سطوح قیمت' : 'تعریف کالای جدید در سیستم خطی‌نو'}
                </h3>
                <span className="text-[10px] bg-amber-500/10 text-[#C9A227] border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                  جداسازی ۳ رقمی زنده + محاسبه ریال
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#8E9299] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Channel Selector: Website vs Accounting */}
              <div className="bg-[#161619] p-3.5 rounded-2xl border border-[#2D2D33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#F3F4F6] block text-xs">انتخاب مقصد و کانال انتشار کالا:</span>
                  <span className="text-[11px] text-[#8E9299]">
                    کالا فقط در سیستم حسابداری داخلی ثبت شود یا در وبسایت فروشگاهی خطی‌نو نیز منتشر گردد؟
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 bg-[#111113] px-3 py-1.5 rounded-xl border border-[#2D2D33] cursor-pointer hover:border-[#C9A227] transition-colors">
                    <input
                      type="radio"
                      name="channelMode"
                      checked={formData.showOnWebsite && !formData.onlyAccounting}
                      onChange={() => setFormData({ ...formData, showOnWebsite: true, onlyAccounting: false })}
                      className="accent-[#C9A227]"
                    />
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-[#E0E0E0]">ارسال و نمایش در سایت</span>
                  </label>

                  <label className="flex items-center gap-1.5 bg-[#111113] px-3 py-1.5 rounded-xl border border-[#2D2D33] cursor-pointer hover:border-[#C9A227] transition-colors">
                    <input
                      type="radio"
                      name="channelMode"
                      checked={formData.onlyAccounting}
                      onChange={() => setFormData({ ...formData, showOnWebsite: false, onlyAccounting: true })}
                      className="accent-[#C9A227]"
                    />
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-[#E0E0E0]">فقط سیستم حسابداری</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-[#8E9299] block mb-1">نام کامل کالا:</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: خودکار بیک کریستال ۱.۰ میلی‌متر آبی"
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-bold text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">کد اختصاصی کالا:</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 font-mono outline-none text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">بارکد استاندارد کالا:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="اسکن یا وارد کردن بارکد..."
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 pl-9 font-mono outline-none text-[#E0E0E0]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField('formBarcode');
                        setIsScannerOpen(true);
                      }}
                      title="اسکن بارکد با دوربین"
                      className="absolute left-1.5 top-1.5 p-1 rounded-lg bg-[#222226] hover:bg-[#C9A227] text-[#C9A227] hover:text-black transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">دسته‌بندی اصلی:</label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 outline-none font-bold text-[#E0E0E0] cursor-pointer"
                  >
                    <option value="">-- بدون دسته‌بندی / عمومی --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">واحد سنجش اصلی:</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="مثال: عدد، بسته، جلد"
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 outline-none text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">موجودی انبار:</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 font-mono outline-none text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">حداقل موجودی (نقطه هشدار کسری):</label>
                  <input
                    type="number"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 font-mono outline-none text-[#E0E0E0]"
                  />
                </div>
              </div>

              {/* Gallery & Multi-Images (رصد و نگهداری چندین عکس کالا) */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#C9A227] text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>تصویر اصلی و گالری چند عکسه کالا (چندین زاویه و مشخصات):</span>
                  </h4>
                  <span className="text-[10px] text-[#8E9299]">
                    {formData.extraImages.length + (formData.image ? 1 : 0)} تصویر ثبت شده
                  </span>
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">تصویر اصلی محصول (URL):</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 font-mono text-left outline-none text-[#E0E0E0]"
                  />
                </div>

                {/* Additional Images list */}
                <div className="space-y-2">
                  <label className="font-bold text-[#8E9299] block">افزودن سایر عکس‌ها به گالری محصول:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={extraImageInput}
                      onChange={(e) => setExtraImageInput(e.target.value)}
                      placeholder="آدرس URL عکس فرعی یا وارد شده از ترب..."
                      className="flex-1 bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 font-mono text-left outline-none text-[#E0E0E0]"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraImage}
                      className="bg-[#222226] hover:bg-[#C9A227] text-[#C9A227] hover:text-black font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      + افزودن عکس
                    </button>
                  </div>

                  {formData.extraImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.extraImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-[#2D2D33] bg-[#111113]">
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraImage(idx)}
                            className="absolute inset-0 bg-black/60 text-rose-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Tier Pricing Box with CurrencyInput */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#C9A227] text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>قیمت‌گذاری ۵ سطحی (با جداسازی ۳ رقمی زنده و نمایش ریال/تومان):</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    label="فروشگاه ۳ (همکار / شعبه):"
                    value={formData.priceShop3}
                    onChange={(val) => setFormData({ ...formData, priceShop3: val })}
                  />

                  <CurrencyInput
                    label="فروش عمده / مدارس:"
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

              {/* Flags */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#E0E0E0]">
                  <input
                    type="checkbox"
                    checked={formData.isSpecialOffer}
                    onChange={(e) => setFormData({ ...formData, isSpecialOffer: e.target.checked })}
                    className="rounded accent-[#C9A227]"
                  />
                  <span>نمایش در تخفیف‌های ویژه صفحه اصلی</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#E0E0E0]">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded accent-[#C9A227]"
                  />
                  <span>محصول تولید اختصاصی خطی‌نو</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#222225]">
                <button
                  type="submit"
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-lg shadow-[#C9A227]/20 cursor-pointer"
                >
                  ذخیره اطلاعات کالا
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
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

      {/* Barcode Print Modal */}
      {labelProduct && (
        <BarcodePrintModal
          isOpen={Boolean(labelProduct)}
          onClose={() => setLabelProduct(null)}
          product={labelProduct}
        />
      )}
    </div>
  );
};

