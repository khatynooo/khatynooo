import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Barcode as BarcodeIcon,
  Layers,
  Settings2,
  Check,
  Plus,
  Trash2,
  Sliders,
  Type,
  FileText,
  DollarSign,
  QrCode,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Search,
  Maximize2,
  LayoutGrid,
  RefreshCw,
  Copy,
  Eye,
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Product, PriceTier } from '../../types';
import { BarcodeSvg } from '../common/BarcodeSvg';

export type PaperFormat = 'a4' | 'a5' | 'roll_50_30' | 'roll_40_25' | 'roll_60_40' | 'roll_80_50' | 'custom_roll' | 'custom_page';

export interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const COMMON_LABEL_PRESETS: LabelPreset[] = [
  { id: '40x20', name: '۴ × ۲ سانتی‌متر (۴۰×۲۰ mm)', widthMm: 40, heightMm: 20, description: 'برچسب ریز استاندارد - حدود ۶۰ تایی در A4' },
  { id: '50x30', name: '۵ × ۳ سانتی‌متر (۵۰×۳۰ mm)', widthMm: 50, heightMm: 30, description: 'برچسب متوسط پرکاربرد - حدود ۳۰ تا ۳۶ تایی در A4' },
  { id: '60x40', name: '۶ × ۴ سانتی‌متر (۶۰×۴۰ mm)', widthMm: 60, heightMm: 40, description: 'برچسب درشت اتیکت قیمت - حدود ۱۸ تا ۲۱ تایی در A4' },
  { id: '38x21', name: '۳.۸ × ۲.۱ سانتی‌متر (۳۸×۲۱ mm)', widthMm: 38, heightMm: 21, description: 'شیت ۶۵ تایی پرکاربرد بازار' },
  { id: '70x36', name: '۷ × ۳.۶ سانتی‌متر (۷۰×۳۶ mm)', widthMm: 70, heightMm: 36, description: 'شیت ۲۴ تایی افقی استاندارد' },
  { id: '105x37', name: '۱۰.۵ × ۳.۷ سانتی‌متر (۱۰۵×۳۷ mm)', widthMm: 105, heightMm: 37, description: 'شیت ۱۶ تایی ۲ ستونه' },
  { id: '105x48', name: '۱۰.۵ × ۴.۸ سانتی‌متر (۱۰۵×۴۸ mm)', widthMm: 105, heightMm: 48, description: 'شیت ۱۲ تایی بزرگ' },
  { id: 'custom', name: 'ابعاد سفارشی دستی (سانتی‌متر / میلی‌متر)', widthMm: 40, heightMm: 25, description: 'تنظیم دقیق طول و عرض کادر توسط شما' },
];

export interface LabelItemConfig {
  product: Product;
  count: number;
  customName?: string;
  customPrice?: number;
}

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  productsList?: Product[];
  allAvailableProducts?: Product[];
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  product,
  productsList = [],
  allAvailableProducts = [],
}) => {
  // Batch Products to print with individual count
  const [selectedItems, setSelectedItems] = useState<LabelItemConfig[]>([]);

  // Paper & Grid Layout Settings
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('a4');
  const [selectedPreset, setSelectedPreset] = useState<string>('40x20');
  const [boxWidthCm, setBoxWidthCm] = useState<number>(4); // 4 cm
  const [boxHeightCm, setBoxHeightCm] = useState<number>(2); // 2 cm
  const [boxGapXmm, setBoxGapXmm] = useState<number>(2); // 2 mm horizontal gap
  const [boxGapYmm, setBoxGapYmm] = useState<number>(2); // 2 mm vertical gap
  const [pageMarginMm, setPageMarginMm] = useState<number>(5); // 5 mm margin on A4
  const [autoCalculateGrid, setAutoCalculateGrid] = useState<boolean>(true);
  const [gridColumns, setGridColumns] = useState<number>(4);
  const [gridRows, setGridRows] = useState<number>(10);
  const [labelsPerPage, setLabelsPerPage] = useState<number>(40);

  // Content Visibility Toggles
  const [includeName, setIncludeName] = useState<boolean>(true);
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [includeStoreName, setIncludeStoreName] = useState<boolean>(true);
  const [storeNameText, setStoreNameText] = useState<string>('فروشگاه خطی‌نو');
  const [includeBarcodeDigits, setIncludeBarcodeDigits] = useState<boolean>(true);
  const [includeProductCode, setIncludeProductCode] = useState<boolean>(false);
  const [includeUnit, setIncludeUnit] = useState<boolean>(false);

  // Barcode & QR Code Format
  const [barcodeType, setBarcodeType] = useState<'barcode' | 'qrcode' | 'both'>('barcode');
  const [barcodeHeight, setBarcodeHeight] = useState<number>(24); // in px
  const [barcodeLineWidth, setBarcodeLineWidth] = useState<number>(1.2);
  const [barcodeWidthPercent, setBarcodeWidthPercent] = useState<number>(90); // 40% to 100%
  const [qrSize, setQrSize] = useState<number>(40);

  // Granular Spacings (فاصله‌های اختصاصی بین المان‌ها بر حسب پیکسل)
  const [gapStoreTop, setGapStoreTop] = useState<number>(1);
  const [gapStoreToName, setGapStoreToName] = useState<number>(2);
  const [gapNameToBarcode, setGapNameToBarcode] = useState<number>(3);
  const [gapBarcodeToPrice, setGapBarcodeToPrice] = useState<number>(3);
  const [gapPriceBottom, setGapPriceBottom] = useState<number>(1);
  const [customPaddingPx, setCustomPaddingPx] = useState<number>(4);

  // Typography & Font Sizes
  const [nameFontSize, setNameFontSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom'>('xs');
  const [customNameFontPt, setCustomNameFontPt] = useState<number>(8);
  const [nameFontWeight, setNameFontWeight] = useState<'normal' | 'bold' | 'black'>('bold');
  const [priceFontSize, setPriceFontSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'custom'>('sm');
  const [customPriceFontPt, setCustomPriceFontPt] = useState<number>(9);
  const [storeFontSizePt, setStoreFontSizePt] = useState<number>(7);
  const [priceTier, setPriceTier] = useState<PriceTier | 'manual'>('shop1');

  // Styling & Border Lines
  const [borderStyle, setBorderStyle] = useState<'dashed' | 'solid' | 'dotted' | 'none'>('dashed');
  const [borderWidthPx, setBorderWidthPx] = useState<number>(1);
  const [borderColor, setBorderColor] = useState<string>('#94a3b8');
  const [borderRadiusMm, setBorderRadiusMm] = useState<number>(1);

  // Active Tab in modal: 'settings' | 'products'
  const [activeTab, setActiveTab] = useState<'preview' | 'products' | 'settings'>('preview');
  const [productSearch, setProductSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(1);

  // Calculate box dimensions in mm
  const boxWidthMm = useMemo(() => Math.round(boxWidthCm * 10 * 10) / 10, [boxWidthCm]);
  const boxHeightMm = useMemo(() => Math.round(boxHeightCm * 10 * 10) / 10, [boxHeightCm]);

  // Compute calculated grid based on physical label box dimensions on A4/A5
  const calculatedGrid = useMemo(() => {
    let pageWidthMm = 210;
    let pageHeightMm = 297;

    if (paperFormat === 'a5') {
      pageWidthMm = 148;
      pageHeightMm = 210;
    } else if (paperFormat.startsWith('roll_')) {
      return { cols: 1, rows: 1, total: 1 };
    }

    const usableWidth = Math.max(10, pageWidthMm - (2 * pageMarginMm));
    const usableHeight = Math.max(10, pageHeightMm - (2 * pageMarginMm));

    const cols = Math.max(1, Math.floor((usableWidth + boxGapXmm) / (boxWidthMm + boxGapXmm)));
    const rows = Math.max(1, Math.floor((usableHeight + boxGapYmm) / (boxHeightMm + boxGapYmm)));

    return {
      cols,
      rows,
      total: cols * rows,
    };
  }, [paperFormat, pageMarginMm, boxWidthMm, boxHeightMm, boxGapXmm, boxGapYmm]);

  // Update effective grid when autoCalculateGrid is enabled
  useEffect(() => {
    if (paperFormat.startsWith('roll_')) {
      setGridColumns(1);
      setGridRows(1);
      setLabelsPerPage(1);
    } else if (autoCalculateGrid) {
      setGridColumns(calculatedGrid.cols);
      setGridRows(calculatedGrid.rows);
      setLabelsPerPage(calculatedGrid.total);
    }
  }, [autoCalculateGrid, calculatedGrid, paperFormat]);

  // Handler for selecting standard label presets
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = COMMON_LABEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (preset.id !== 'custom') {
      setBoxWidthCm(preset.widthMm / 10);
      setBoxHeightCm(preset.heightMm / 10);
      
      // Fine-tune barcode height & typography according to label size
      if (preset.heightMm <= 22) {
        setBarcodeHeight(18);
        setBarcodeLineWidth(1.1);
        setNameFontSize('xs');
        setCustomNameFontPt(7.5);
        setPriceFontSize('sm');
        setCustomPriceFontPt(8);
        setCustomPaddingPx(3);
      } else if (preset.heightMm <= 32) {
        setBarcodeHeight(24);
        setBarcodeLineWidth(1.2);
        setNameFontSize('sm');
        setCustomNameFontPt(8.5);
        setPriceFontSize('md');
        setCustomPriceFontPt(9.5);
        setCustomPaddingPx(5);
      } else {
        setBarcodeHeight(32);
        setBarcodeLineWidth(1.4);
        setNameFontSize('md');
        setCustomNameFontPt(10);
        setPriceFontSize('lg');
        setCustomPriceFontPt(11);
        setCustomPaddingPx(6);
      }
    }
  };

  // Initialize selected products when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setSelectedItems([
        {
          product,
          count: 12,
        },
      ]);
    } else if (productsList.length > 0) {
      setSelectedItems(
        productsList.map((p) => ({
          product: p,
          count: Math.max(1, p.stock > 0 && p.stock <= 50 ? p.stock : 6),
        }))
      );
    } else if (allAvailableProducts.length > 0) {
      // Default pick first 5 products
      setSelectedItems(
        allAvailableProducts.slice(0, 5).map((p) => ({
          product: p,
          count: 6,
        }))
      );
    }
  }, [isOpen, product, productsList]);

  // Adjust default grid when paper format changes
  useEffect(() => {
    if (paperFormat === 'a4') {
      setGridColumns(3);
      setGridRows(8);
      setLabelsPerPage(24);
      setBarcodeHeight(30);
    } else if (paperFormat === 'a5') {
      setGridColumns(2);
      setGridRows(5);
      setLabelsPerPage(10);
      setBarcodeHeight(28);
    } else if (paperFormat.startsWith('roll_')) {
      setGridColumns(1);
      setGridRows(1);
      setLabelsPerPage(1);
      setBarcodeHeight(36);
    }
  }, [paperFormat]);

  // Generate the full flat list of labels based on each item's count
  const allLabels = useMemo(() => {
    const list: Array<{
      product: Product;
      index: number;
      customName?: string;
      customPrice?: number;
    }> = [];

    selectedItems.forEach((item) => {
      for (let i = 0; i < item.count; i++) {
        list.push({
          product: item.product,
          index: list.length,
          customName: item.customName,
          customPrice: item.customPrice,
        });
      }
    });

    return list;
  }, [selectedItems]);

  const totalPages = Math.max(1, Math.ceil(allLabels.length / labelsPerPage));
  const currentPageLabels = allLabels.slice(
    (previewPage - 1) * labelsPerPage,
    previewPage * labelsPerPage
  );

  // Price resolution helper
  const getProductPrice = (item: { product: Product; customPrice?: number }): number => {
    if (item.customPrice !== undefined) return item.customPrice;
    const p = item.product;
    switch (priceTier) {
      case 'shop1':
        return p.priceShop1 || p.salePrice || 0;
      case 'shop2':
        return p.priceShop2 || p.salePrice || 0;
      case 'shop3':
        return p.priceShop3 || p.salePrice || 0;
      case 'wholesale':
        return p.wholesalePrice || p.salePrice || 0;
      default:
        return p.salePrice || 0;
    }
  };

  // Batch count modifiers
  const setAllCounts = (count: number) => {
    setSelectedItems((prev) => prev.map((item) => ({ ...item, count })));
  };

  const setCountsByStock = () => {
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        count: Math.max(1, Math.min(item.product.stock || 1, 100)),
      }))
    );
  };

  const handleAddProduct = (p: Product) => {
    if (selectedItems.some((item) => item.product.id === p.id)) return;
    setSelectedItems((prev) => [...prev, { product: p, count: 6 }]);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateCount = (productId: string, newCount: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, count: Math.max(1, newCount) } : item
      )
    );
  };

  const handleUpdateCustomName = (productId: string, name: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, customName: name } : item))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Font size classes
  const getNameFontClass = () => {
    switch (nameFontSize) {
      case 'xs':
        return 'text-[9px] leading-tight';
      case 'sm':
        return 'text-[11px] leading-snug';
      case 'md':
        return 'text-[13px] leading-normal';
      case 'lg':
        return 'text-[15px] leading-normal';
      case 'xl':
        return 'text-[17px] leading-relaxed';
      default:
        return 'text-[11px]';
    }
  };

  const getPriceFontClass = () => {
    switch (priceFontSize) {
      case 'sm':
        return 'text-[11px]';
      case 'md':
        return 'text-[13px] font-black';
      case 'lg':
        return 'text-[15px] font-black';
      case 'xl':
        return 'text-[18px] font-black';
      default:
        return 'text-[13px] font-black';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96 }}
          className="bg-[#111113] rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-[#222225] space-y-4 my-auto text-[#E0E0E0] max-h-[95vh] flex flex-col print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:bg-white print:text-black"
        >
          {/* Header (Hidden during actual print) */}
          <div className="flex items-center justify-between pb-3 border-b border-[#222225] print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C9A227]/15 text-[#C9A227] flex items-center justify-center">
                <BarcodeIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#F3F4F6]">
                    موتور چاپ حرفه‌ای بارکد، لیبل و اتیکت قیمت
                  </h3>
                  <span className="bg-[#C9A227]/10 text-[#C9A227] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#C9A227]/30">
                    A4 / A5 / رول حرارتی
                  </span>
                </div>
                <p className="text-xs text-[#8E9299]">
                  طراحی سفارشی برچسب کالا، تنظیم اندازه فونت، قیمت، بارکد خطی و QR با چاپ بدون حاشیه
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#C9A227]/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-black" />
                <span>شروع چاپ ({toPersianDigits(allLabels.length)} برچسب)</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#8E9299] hover:text-[#E0E0E0] rounded-xl hover:bg-[#161619] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Bar between Preview, Products Batch, and Settings */}
          <div className="flex items-center justify-between gap-2 bg-[#161619] p-1.5 rounded-2xl border border-[#222225] text-xs print:hidden">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>پیش‌نمایش زنده صفحه ({toPersianDigits(allLabels.length)} برچسب)</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>مدیریت کالاهای انتخابی ({toPersianDigits(selectedItems.length)} کالا)</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span>تنظیمات کاغذ، فونت و ظاهر برچسب</span>
              </button>
            </div>

            {/* Quick Paper Format Selector */}
            <div className="flex items-center gap-2 pr-2">
              <span className="text-[11px] font-bold text-[#8E9299]">قطع کاغذ:</span>
              <select
                value={paperFormat}
                onChange={(e) => setPaperFormat(e.target.value as PaperFormat)}
                className="bg-[#0A0A0B] border border-[#2D2D33] rounded-xl px-2.5 py-1 text-xs font-bold text-[#E0E0E0] focus:outline-none focus:border-[#C9A227] cursor-pointer"
              >
                <option value="a4">برگه استاندارد A4 (شبکه‌ای)</option>
                <option value="a5">برگه A5 (نصف A4)</option>
                <option value="roll_50_30">رول حرارتی 50×30 mm</option>
                <option value="roll_40_25">رول حرارتی 40×25 mm</option>
                <option value="roll_60_40">رول حرارتی 60×40 mm</option>
                <option value="roll_80_50">رول حرارتی 80×50 mm</option>
              </select>
            </div>
          </div>

          {/* Tab 1: Live Interactive Sheet Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-3 flex-1 flex flex-col min-h-0 print:space-y-0">
              {/* Toolbar Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0B] p-2.5 rounded-2xl border border-[#222225] text-xs print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Quick Toggles */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#E0E0E0]">
                    <input
                      type="checkbox"
                      checked={includeName}
                      onChange={(e) => setIncludeName(e.target.checked)}
                      className="rounded accent-[#C9A227]"
                    />
                    <span>نام کالا</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#E0E0E0]">
                    <input
                      type="checkbox"
                      checked={includePrice}
                      onChange={(e) => setIncludePrice(e.target.checked)}
                      className="rounded accent-[#C9A227]"
                    />
                    <span>قیمت</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#E0E0E0]">
                    <input
                      type="checkbox"
                      checked={includeStoreName}
                      onChange={(e) => setIncludeStoreName(e.target.checked)}
                      className="rounded accent-[#C9A227]"
                    />
                    <span>نام فروشگاه</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#E0E0E0]">
                    <input
                      type="checkbox"
                      checked={includeBarcodeDigits}
                      onChange={(e) => setIncludeBarcodeDigits(e.target.checked)}
                      className="rounded accent-[#C9A227]"
                    />
                    <span>ارقام بارکد</span>
                  </label>

                  <div className="h-4 w-px bg-[#222225]" />

                  {/* Price Tier Selector */}
                  {includePrice && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#8E9299]">سطح قیمت:</span>
                      <select
                        value={priceTier}
                        onChange={(e) => setPriceTier(e.target.value as PriceTier)}
                        className="bg-[#161619] border border-[#2D2D33] rounded-lg px-2 py-0.5 text-[11px] font-bold text-[#C9A227] focus:outline-none"
                      >
                        <option value="shop1">قیمت فروشگاه ۱ (حضوری)</option>
                        <option value="shop2">قیمت فروشگاه ۲ (آنلاین)</option>
                        <option value="wholesale">قیمت عمده / مدارس</option>
                      </select>
                    </div>
                  )}

                  {/* Barcode Type */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#8E9299]">نوع کد:</span>
                    <select
                      value={barcodeType}
                      onChange={(e) => setBarcodeType(e.target.value as any)}
                      className="bg-[#161619] border border-[#2D2D33] rounded-lg px-2 py-0.5 text-[11px] font-bold text-[#E0E0E0] focus:outline-none"
                    >
                      <option value="barcode">بارکد میله‌ای (CODE128)</option>
                      <option value="qrcode">کد دوبعدی QR</option>
                      <option value="both">ترکیب بارکد + QR</option>
                    </select>
                  </div>
                </div>

                {/* Pagination if multiple pages */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 mr-auto">
                    <button
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-lg bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-[#C9A227] font-mono">
                      صفحه {toPersianDigits(previewPage)} از {toPersianDigits(totalPages)}
                    </span>
                    <button
                      disabled={previewPage >= totalPages}
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-lg bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Real Sheet Preview Canvas Container */}
              <div className="flex-1 bg-[#0A0A0B] p-4 sm:p-6 rounded-2xl border border-[#222225] overflow-y-auto max-h-[56vh] flex justify-center print:p-0 print:m-0 print:border-none print:max-h-none print:overflow-visible print:bg-white">
                {/* Visual Paper Sheet */}
                <div
                  id="printable-barcode-sheet"
                  className={`bg-white text-slate-900 shadow-2xl rounded-sm print:shadow-none print:rounded-none transition-all ${
                    paperFormat === 'a4'
                      ? 'w-[210mm] min-h-[297mm]'
                      : paperFormat === 'a5'
                      ? 'w-[148mm] min-h-[210mm]'
                      : 'w-[90mm]'
                  }`}
                  style={{
                    boxSizing: 'border-box',
                    padding: paperFormat.startsWith('roll_') ? '3mm' : `${pageMarginMm}mm`,
                  }}
                >
                  {/* Grid Layout of Labels */}
                  <div
                    className="grid h-full"
                    style={{
                      columnGap: `${boxGapXmm}mm`,
                      rowGap: `${boxGapYmm}mm`,
                      gridTemplateColumns:
                        paperFormat === 'a4'
                          ? `repeat(${gridColumns}, ${boxWidthMm > 0 && !autoCalculateGrid ? `${boxWidthMm}mm` : 'minmax(0, 1fr)'})`
                          : paperFormat === 'a5'
                          ? `repeat(${gridColumns}, minmax(0, 1fr))`
                          : '1fr',
                      justifyContent: 'center',
                      alignContent: 'start',
                    }}
                  >
                    {currentPageLabels.map((item, idx) => {
                      const p = item.product;
                      const displayName = item.customName || p.name;
                      const priceVal = getProductPrice(item);
                      const barcodeVal = p.barcode || p.code || '00000000';

                      return (
                        <div
                          key={idx}
                          style={{
                            minWidth: `${boxWidthMm}mm`,
                            maxWidth: `${boxWidthMm}mm`,
                            minHeight: `${boxHeightMm}mm`,
                            height: `${boxHeightMm}mm`,
                            boxSizing: 'border-box',
                            padding: `${customPaddingPx}px`,
                            borderStyle: borderStyle === 'none' ? 'none' : borderStyle,
                            borderWidth: borderStyle === 'none' ? '0px' : `${borderWidthPx}px`,
                            borderColor: borderColor,
                            borderRadius: `${borderRadiusMm}mm`,
                          }}
                          className="bg-white flex flex-col justify-between items-center text-center overflow-hidden transition-all break-inside-avoid relative"
                        >
                          {/* Top: Store Name / Brand */}
                          {includeStoreName && (
                            <div
                              style={{
                                marginTop: `${gapStoreTop}px`,
                                marginBottom: `${gapStoreToName}px`,
                                fontSize: `${storeFontSizePt}pt`,
                              }}
                              className="font-bold text-slate-600 font-sans tracking-tight shrink-0 line-clamp-1 leading-none"
                            >
                              {storeNameText}
                            </div>
                          )}

                          {/* Middle: Product Name */}
                          {includeName && (
                            <div
                              style={{
                                marginBottom: `${gapNameToBarcode}px`,
                                fontSize: nameFontSize === 'custom' ? `${customNameFontPt}pt` : undefined,
                              }}
                              className={`text-slate-950 font-sans line-clamp-2 w-full px-0.5 shrink-0 ${
                                nameFontSize !== 'custom' ? getNameFontClass() : 'leading-tight'
                              } ${
                                nameFontWeight === 'black'
                                  ? 'font-black'
                                  : nameFontWeight === 'bold'
                                  ? 'font-bold'
                                  : 'font-normal'
                              }`}
                            >
                              {displayName}
                            </div>
                          )}

                          {/* Secondary info (SKU / Unit) */}
                          {(includeProductCode || includeUnit) && (
                            <div className="flex items-center gap-1 text-[8px] text-slate-500 font-mono mb-0.5 shrink-0">
                              {includeProductCode && <span>کد: {p.code}</span>}
                              {includeProductCode && includeUnit && <span>•</span>}
                              {includeUnit && <span>{p.unit}</span>}
                            </div>
                          )}

                          {/* Barcode / QR Code Vector Svg */}
                          <div
                            style={{
                              width: `${barcodeWidthPercent}%`,
                              marginBottom: `${gapBarcodeToPrice}px`,
                            }}
                            className="flex justify-center items-center py-0.5 overflow-hidden mx-auto"
                          >
                            <BarcodeSvg
                              value={barcodeVal}
                              type={barcodeType}
                              height={barcodeHeight}
                              width={barcodeLineWidth}
                              displayValue={includeBarcodeDigits}
                              fontSize={8}
                              qrSize={qrSize}
                            />
                          </div>

                          {/* Bottom: Price in Tomans */}
                          {includePrice && (
                            <div
                              style={{
                                marginBottom: `${gapPriceBottom}px`,
                              }}
                              className="w-full pt-0.5 border-t border-slate-100 flex items-center justify-center gap-1 font-sans shrink-0"
                            >
                              <span
                                style={{
                                  fontSize: priceFontSize === 'custom' ? `${customPriceFontPt}pt` : undefined,
                                }}
                                className={`text-slate-950 font-mono ${
                                  priceFontSize !== 'custom' ? getPriceFontClass() : 'font-black'
                                }`}
                              >
                                {formatToman(priceVal)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Products Batch Selection & Count Management */}
          {activeTab === 'products' && (
            <div className="space-y-4 flex-1 flex flex-col min-h-0 print:hidden">
              {/* Batch Helper Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0B] p-3 rounded-2xl border border-[#222225] text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#8E9299]">تنظیم سریع تیراژ:</span>
                  {[2, 6, 12, 24, 40].map((c) => (
                    <button
                      key={c}
                      onClick={() => setAllCounts(c)}
                      className="px-2.5 py-1 bg-[#161619] hover:bg-[#1F1F24] text-[#E0E0E0] rounded-lg border border-[#2D2D33] font-mono font-bold transition-colors cursor-pointer"
                    >
                      {c} عدد
                    </button>
                  ))}
                  <button
                    onClick={setCountsByStock}
                    className="px-3 py-1 bg-[#C9A227]/15 hover:bg-[#C9A227]/25 text-[#C9A227] rounded-lg border border-[#C9A227]/30 font-bold transition-colors cursor-pointer"
                  >
                    تطبیق با موجودی انبار
                  </button>
                </div>

                <div className="text-xs text-[#8E9299] font-bold">
                  مجموع کل برچسب‌ها:{' '}
                  <span className="font-mono text-[#C9A227] text-sm">
                    {toPersianDigits(allLabels.length)}
                  </span>{' '}
                  عدد ({toPersianDigits(totalPages)} برگه A4)
                </div>
              </div>

              {/* Table of Selected Products */}
              <div className="flex-1 bg-[#0A0A0B] rounded-2xl border border-[#222225] overflow-y-auto max-h-[38vh]">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-[#161619] text-[#8E9299] font-bold border-b border-[#222225]">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">عنوان کالا</th>
                      <th className="p-3">بارکد / کد</th>
                      <th className="p-3 text-center">موجودی انبار</th>
                      <th className="p-3 text-center w-36">تعداد برچسب چاپ</th>
                      <th className="p-3 text-center w-16">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C20]">
                    {selectedItems.map((item, idx) => (
                      <tr key={item.product.id} className="hover:bg-[#161619]/50 transition-colors">
                        <td className="p-3 text-center font-mono text-[#8E9299]">{idx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.customName || item.product.name}
                            onChange={(e) => handleUpdateCustomName(item.product.id, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-[#2D2D33] focus:border-[#C9A227] focus:bg-[#161619] rounded px-1.5 py-0.5 font-bold text-[#F3F4F6] w-full outline-none"
                          />
                        </td>
                        <td className="p-3 font-mono text-[#C9A227]">
                          {item.product.barcode || item.product.code}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-[#161619] px-2 py-0.5 rounded-md font-mono text-[#8E9299]">
                            {toPersianDigits(item.product.stock)} {item.product.unit}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleUpdateCount(item.product.id, item.count - 1)}
                              className="w-7 h-7 rounded-lg bg-[#161619] hover:bg-[#222225] text-[#E0E0E0] flex items-center justify-center font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={item.count}
                              onChange={(e) =>
                                handleUpdateCount(item.product.id, Number(e.target.value))
                              }
                              className="w-14 bg-[#161619] border border-[#2D2D33] rounded-lg py-1 font-mono font-bold text-center text-[#F3F4F6] outline-none focus:border-[#C9A227]"
                            />
                            <button
                              onClick={() => handleUpdateCount(item.product.id, item.count + 1)}
                              className="w-7 h-7 rounded-lg bg-[#161619] hover:bg-[#222225] text-[#E0E0E0] flex items-center justify-center font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveProduct(item.product.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add More Products from catalog */}
              <div className="bg-[#0A0A0B] p-3 rounded-2xl border border-[#222225] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#F3F4F6] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#C9A227]" />
                    افزودن محصولات دیگر به صف چاپ:
                  </span>
                  <div className="relative w-64">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="جستجوی کالا بر اساس نام یا بارکد..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#161619] border border-[#2D2D33] rounded-xl text-xs text-[#E0E0E0] outline-none focus:border-[#C9A227]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pt-1">
                  {allAvailableProducts
                    .filter((p) => !selectedItems.some((item) => item.product.id === p.id))
                    .filter((p) =>
                      productSearch
                        ? p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.barcode.includes(productSearch)
                        : true
                    )
                    .slice(0, 10)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddProduct(p)}
                        className="bg-[#161619] hover:bg-[#222225] border border-[#2D2D33] hover:border-[#C9A227] text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-[#E0E0E0] transition-colors cursor-pointer"
                      >
                        <span className="font-bold">{p.name}</span>
                        <span className="font-mono text-[#C9A227] text-[10px]">
                          {p.barcode || p.code}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-[#8E9299]" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Detailed Box Dimensions, Grid, Typography, and Border Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[56vh] pr-1 text-xs print:hidden">
              {/* 1. Physical Box Dimensions (ابعاد فیزیکی کادر لیبل به سانتی‌متر) */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#C9A227]" />
                    ابعاد دقیق هر کادر بارکد / لیبل (سانتی‌متر و میلی‌متر)
                  </h4>
                  <span className="bg-[#C9A227]/10 text-[#C9A227] text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-[#C9A227]/30">
                    اندازه فیزیکی کادر: {toPersianDigits(boxWidthCm)} × {toPersianDigits(boxHeightCm)} سانتی‌متر ({toPersianDigits(boxWidthMm)}×{toPersianDigits(boxHeightMm)} mm)
                  </span>
                </div>

                {/* Popular Presets */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#8E9299] block">انتخاب از ابعاد استاندارد برچسب‌های بازار:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COMMON_LABEL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                          selectedPreset === preset.id
                            ? 'bg-[#C9A227]/15 border-[#C9A227] text-[#F3F4F6] shadow-sm shadow-[#C9A227]/20'
                            : 'bg-[#161619] border-[#2D2D33] text-[#8E9299] hover:border-[#3E3E45] hover:text-[#E0E0E0]'
                        }`}
                      >
                        <div className="font-bold text-xs text-[#E0E0E0] mb-0.5">{preset.name}</div>
                        <div className="text-[10px] text-[#8E9299] leading-tight">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Box Width and Height Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 bg-[#161619] p-3 rounded-xl border border-[#2D2D33]">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">
                      عرض هر کادر (سانتی‌متر):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="21"
                        value={boxWidthCm}
                        onChange={(e) => {
                          setSelectedPreset('custom');
                          setBoxWidthCm(Math.max(0.5, Number(e.target.value)));
                        }}
                        className="w-full bg-[#0A0A0B] border border-[#2D2D33] rounded-xl p-2 font-mono font-bold text-[#C9A227] focus:border-[#C9A227] outline-none pl-8"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] text-[#8E9299] font-bold">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">
                      ارتفاع هر کادر (سانتی‌متر):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.8"
                        max="29"
                        value={boxHeightCm}
                        onChange={(e) => {
                          setSelectedPreset('custom');
                          setBoxHeightCm(Math.max(0.5, Number(e.target.value)));
                        }}
                        className="w-full bg-[#0A0A0B] border border-[#2D2D33] rounded-xl p-2 font-mono font-bold text-[#C9A227] focus:border-[#C9A227] outline-none pl-8"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] text-[#8E9299] font-bold">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">
                      فاصله افقی بین کادرها (Gap X):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={boxGapXmm}
                        onChange={(e) => setBoxGapXmm(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0A0A0B] border border-[#2D2D33] rounded-xl p-2 font-mono font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none pl-8"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] text-[#8E9299] font-bold">mm</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">
                      فاصله عمودی بین کادرها (Gap Y):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        value={boxGapYmm}
                        onChange={(e) => setBoxGapYmm(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0A0A0B] border border-[#2D2D33] rounded-xl p-2 font-mono font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none pl-8"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] text-[#8E9299] font-bold">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Paper Sheet & Smart Auto-Grid Calculation */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#C9A227]" />
                    چیدمان در صفحه کاغذ و محاسبه خودکار تعداد (Grid)
                  </h4>
                  {paperFormat === 'a4' && (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                      ظرفیت هر برگ A4 با این ابعاد: {toPersianDigits(calculatedGrid.cols)} ستون × {toPersianDigits(calculatedGrid.rows)} ردیف = {toPersianDigits(calculatedGrid.total)} عدد لیبل
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">نوع برگه / کاغذ پرینت:</label>
                    <select
                      value={paperFormat}
                      onChange={(e) => setPaperFormat(e.target.value as PaperFormat)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="a4">برگه A4 استاندارد (210×297 mm)</option>
                      <option value="a5">برگه A5 (148×210 mm)</option>
                      <option value="roll_50_30">رول ۵۰×۳۰ میلی‌متر (حرارتی تک ردیفه)</option>
                      <option value="roll_40_25">رول ۴۰×۲۵ میلی‌متر</option>
                      <option value="roll_60_40">رول ۶۰×۴۰ میلی‌متر</option>
                      <option value="roll_80_50">رول ۸۰×۵۰ میلی‌متر</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">حاشیه لبه کاغذ (Margin):</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={pageMarginMm}
                        onChange={(e) => setPageMarginMm(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-mono font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none pl-8"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] text-[#8E9299] font-bold">mm</span>
                    </div>
                  </div>

                  {paperFormat === 'a4' && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-[#8E9299]">تعداد ستون در صفحه:</label>
                          {autoCalculateGrid && <span className="text-[10px] text-emerald-400 font-bold">(خودکار)</span>}
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={gridColumns}
                          disabled={autoCalculateGrid}
                          onChange={(e) => {
                            const cols = Math.max(1, Number(e.target.value));
                            setGridColumns(cols);
                            setLabelsPerPage(cols * gridRows);
                          }}
                          className="w-full bg-[#161619] border border-[#2D2D33] disabled:opacity-75 rounded-xl p-2 font-mono font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-[#8E9299]">تعداد ردیف در صفحه:</label>
                          {autoCalculateGrid && <span className="text-[10px] text-emerald-400 font-bold">(خودکار)</span>}
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="25"
                          value={gridRows}
                          disabled={autoCalculateGrid}
                          onChange={(e) => {
                            const rows = Math.max(1, Number(e.target.value));
                            setGridRows(rows);
                            setLabelsPerPage(gridColumns * rows);
                          }}
                          className="w-full bg-[#161619] border border-[#2D2D33] disabled:opacity-75 rounded-xl p-2 font-mono font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                {paperFormat === 'a4' && (
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#E0E0E0]">
                      <input
                        type="checkbox"
                        checked={autoCalculateGrid}
                        onChange={(e) => setAutoCalculateGrid(e.target.checked)}
                        className="rounded accent-[#C9A227] w-4 h-4"
                      />
                      <span>محاسبه خودکار و هوشمند تعداد ستون و ردیف بر اساس اندازه کادر لیبل ({toPersianDigits(boxWidthCm)} × {toPersianDigits(boxHeightCm)} سانت)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 3. Border Lines, Separators & Box Radius (تنظیم کادر و خطوط جداکننده) */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C9A227]" />
                  تنظیم کادر دور هر برچسب، خطوط جداکننده و گوشه‌ها
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">نوع خط کادر دور:</label>
                    <select
                      value={borderStyle}
                      onChange={(e) => setBorderStyle(e.target.value as any)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="dashed">خط‌چین راهنمای برش قیچی (Dashed)</option>
                      <option value="solid">خط ممتد پیوسته (Solid)</option>
                      <option value="dotted">نقطه‌چین ریز (Dotted)</option>
                      <option value="none">بدون خط دور (لیبل‌های آماده برش‌خورده)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">ضخامت خط دور کادر:</label>
                    <select
                      value={borderWidthPx}
                      onChange={(e) => setBorderWidthPx(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value={0.5}>بسیار نازک و ظریف (0.5px)</option>
                      <option value={1}>استاندارد (1px)</option>
                      <option value={1.5}>ضخیم‌تر (1.5px)</option>
                      <option value={2}>پررنگ (2px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">رنگ خط دور کادر:</label>
                    <select
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="#94a3b8">خاکستری ملایم (Slate)</option>
                      <option value="#000000">مشکی خالص (Black)</option>
                      <option value="#cbd5e1">بسیار کمرنگ (Light Gray)</option>
                      <option value="#C9A227">طلایی / خردلی</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">گردی گوشه‌ها (Radius):</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(borderRadiusMm)} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.5}
                      value={borderRadiusMm}
                      onChange={(e) => setBorderRadiusMm(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Typography & Font Customizer (تنظیمات فونت نام، قیمت و برند) */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#C9A227]" />
                  تنظیمات اندازه فونت، ضخامت و عنوان‌ها
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">فونت نام کالا:</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(customNameFontPt)} pt</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={18}
                      step={0.5}
                      value={customNameFontPt}
                      onChange={(e) => {
                        setNameFontSize('custom');
                        setCustomNameFontPt(Number(e.target.value));
                      }}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">ضخامت فونت نام کالا:</label>
                    <select
                      value={nameFontWeight}
                      onChange={(e) => setNameFontWeight(e.target.value as any)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="normal">عادی (Regular)</option>
                      <option value="bold">برجسته (Bold)</option>
                      <option value="black">فوق‌العاده ضخیم (Black)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">فونت قیمت کالا:</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(customPriceFontPt)} pt</span>
                    </div>
                    <input
                      type="range"
                      min={7}
                      max={20}
                      step={0.5}
                      value={customPriceFontPt}
                      onChange={(e) => {
                        setPriceFontSize('custom');
                        setCustomPriceFontPt(Number(e.target.value));
                      }}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">فونت نام فروشگاه:</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(storeFontSizePt)} pt</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={14}
                      step={0.5}
                      value={storeFontSizePt}
                      onChange={(e) => setStoreFontSizePt(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="font-bold text-[#8E9299] block mb-1">متن نام فروشگاه / برند بالای لیبل:</label>
                  <input
                    type="text"
                    value={storeNameText}
                    onChange={(e) => setStoreNameText(e.target.value)}
                    placeholder="مثال: فروشگاه خطی‌نو"
                    className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 text-xs font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                  />
                </div>
              </div>

              {/* 5. Barcode Vector Geometry & Granular Spacings */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C9A227]" />
                    تنظیمات خطوط بارکد و فاصله‌های اختصاصی درونی (Padding & Spacings)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setGapStoreTop(1);
                      setGapStoreToName(2);
                      setGapNameToBarcode(3);
                      setGapBarcodeToPrice(3);
                      setGapPriceBottom(1);
                      setCustomPaddingPx(4);
                      setBarcodeHeight(24);
                      setBarcodeWidthPercent(90);
                    }}
                    className="text-[11px] text-[#8E9299] hover:text-[#C9A227] underline cursor-pointer"
                  >
                    بازنشانی فاصله‌ها
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">ارتفاع خطوط بارکد:</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(barcodeHeight)}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={70}
                      value={barcodeHeight}
                      onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">عرض بارکد (%):</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(barcodeWidthPercent)}٪</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={5}
                      value={barcodeWidthPercent}
                      onChange={(e) => setBarcodeWidthPercent(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">ضخامت میله‌های بارکد:</label>
                    <select
                      value={barcodeLineWidth}
                      onChange={(e) => setBarcodeLineWidth(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none text-xs"
                    >
                      <option value={1.0}>بسیار نازک (1.0)</option>
                      <option value={1.2}>استاندارد (1.2)</option>
                      <option value={1.4}>متوسط (1.4)</option>
                      <option value={1.7}>ضخیم (1.7)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#8E9299]">پدینگ درون کادر:</label>
                      <span className="font-mono text-[#C9A227]">{toPersianDigits(customPaddingPx)}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={16}
                      value={customPaddingPx}
                      onChange={(e) => setCustomPaddingPx(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Granular inner gap sliders */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 bg-[#161619] p-2.5 rounded-xl border border-[#2D2D33]">
                  <div>
                    <div className="text-[10px] font-bold text-[#8E9299] mb-0.5">بالای فروشگاه: {gapStoreTop}px</div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={gapStoreTop}
                      onChange={(e) => setGapStoreTop(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#8E9299] mb-0.5">فروشگاه تا کالا: {gapStoreToName}px</div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={gapStoreToName}
                      onChange={(e) => setGapStoreToName(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#8E9299] mb-0.5">کالا تا بارکد: {gapNameToBarcode}px</div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={gapNameToBarcode}
                      onChange={(e) => setGapNameToBarcode(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#8E9299] mb-0.5">بارکد تا قیمت: {gapBarcodeToPrice}px</div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={gapBarcodeToPrice}
                      onChange={(e) => setGapBarcodeToPrice(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#8E9299] mb-0.5">زیر قیمت: {gapPriceBottom}px</div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={gapPriceBottom}
                      onChange={(e) => setGapPriceBottom(Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
