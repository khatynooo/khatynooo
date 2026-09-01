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

export type PaperFormat = 'a4' | 'a5' | 'roll_50_30' | 'roll_40_25' | 'roll_60_40' | 'roll_80_50' | 'custom_roll';

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
  const [gridColumns, setGridColumns] = useState<number>(3); // for A4
  const [gridRows, setGridRows] = useState<number>(8); // for A4
  const [labelsPerPage, setLabelsPerPage] = useState<number>(24);

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
  const [barcodeHeight, setBarcodeHeight] = useState<number>(32); // in px
  const [barcodeLineWidth, setBarcodeLineWidth] = useState<number>(1.4);

  // Typography & Font Sizes
  const [nameFontSize, setNameFontSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('sm');
  const [nameFontWeight, setNameFontWeight] = useState<'normal' | 'bold' | 'black'>('bold');
  const [priceFontSize, setPriceFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [priceTier, setPriceTier] = useState<PriceTier | 'manual'>('shop1');

  // Styling & Border Lines
  const [borderStyle, setBorderStyle] = useState<'dashed' | 'solid' | 'none'>('dashed');
  const [labelPadding, setLabelPadding] = useState<'tight' | 'normal' | 'relaxed'>('normal');

  // Active Tab in modal: 'settings' | 'products'
  const [activeTab, setActiveTab] = useState<'preview' | 'products' | 'settings'>('preview');
  const [productSearch, setProductSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(1);

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

  const getPaddingClass = () => {
    switch (labelPadding) {
      case 'tight':
        return 'p-1.5 gap-0.5';
      case 'relaxed':
        return 'p-3.5 gap-2';
      case 'normal':
      default:
        return 'p-2.5 gap-1';
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
                      ? 'w-[210mm] min-h-[297mm] p-[8mm]'
                      : paperFormat === 'a5'
                      ? 'w-[148mm] min-h-[210mm] p-[6mm]'
                      : 'w-[90mm] p-[3mm]'
                  }`}
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Grid Layout of Labels */}
                  <div
                    className="grid gap-2 print:gap-2.5 h-full"
                    style={{
                      gridTemplateColumns:
                        paperFormat === 'a4'
                          ? `repeat(${gridColumns}, minmax(0, 1fr))`
                          : paperFormat === 'a5'
                          ? `repeat(${gridColumns}, minmax(0, 1fr))`
                          : '1fr',
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
                          className={`bg-white rounded-lg flex flex-col justify-between items-center text-center overflow-hidden transition-all break-inside-avoid ${getPaddingClass()} ${
                            borderStyle === 'dashed'
                              ? 'border border-dashed border-slate-400'
                              : borderStyle === 'solid'
                              ? 'border border-slate-300'
                              : ''
                          }`}
                        >
                          {/* Top: Store Name / Brand */}
                          {includeStoreName && (
                            <div className="text-[9px] font-bold text-slate-500 font-sans tracking-wide">
                              {storeNameText}
                            </div>
                          )}

                          {/* Middle: Product Name */}
                          {includeName && (
                            <div
                              className={`text-slate-950 font-sans line-clamp-2 w-full px-1 ${getNameFontClass()} ${
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
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                              {includeProductCode && <span>کد: {p.code}</span>}
                              {includeProductCode && includeUnit && <span>•</span>}
                              {includeUnit && <span>واحد: {p.unit}</span>}
                            </div>
                          )}

                          {/* Barcode / QR Code Vector Svg */}
                          <div className="w-full flex justify-center items-center py-0.5 overflow-hidden">
                            <BarcodeSvg
                              value={barcodeVal}
                              type={barcodeType}
                              height={barcodeHeight}
                              width={barcodeLineWidth}
                              displayValue={includeBarcodeDigits}
                              fontSize={9}
                              qrSize={barcodeType === 'qrcode' ? 64 : 45}
                            />
                          </div>

                          {/* Bottom: Price in Tomans */}
                          {includePrice && (
                            <div className="w-full pt-1 border-t border-slate-100 flex items-center justify-center gap-1 font-sans">
                              <span className={`text-slate-950 font-mono ${getPriceFontClass()}`}>
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

          {/* Tab 3: Detailed Typography, Label Layout & Grid Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[56vh] pr-1 text-xs print:hidden">
              {/* Paper & Grid Size */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[#C9A227]" />
                  ابعاد کاغذ و چیدمان شبکه (Grid)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">قطع کاغذ:</label>
                    <select
                      value={paperFormat}
                      onChange={(e) => setPaperFormat(e.target.value as PaperFormat)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="a4">A4 (210×297 mm)</option>
                      <option value="a5">A5 (148×210 mm)</option>
                      <option value="roll_50_30">رول ۵۰×۳۰ میلی‌متر (حرارتی)</option>
                      <option value="roll_40_25">رول ۴۰×۲۵ میلی‌متر</option>
                      <option value="roll_60_40">رول ۶۰×۴۰ میلی‌متر</option>
                      <option value="roll_80_50">رول ۸۰×۵۰ میلی‌متر</option>
                    </select>
                  </div>

                  {paperFormat === 'a4' && (
                    <>
                      <div>
                        <label className="font-bold text-[#8E9299] block mb-1">تعداد ستون در صفحه:</label>
                        <select
                          value={gridColumns}
                          onChange={(e) => {
                            const cols = Number(e.target.value);
                            setGridColumns(cols);
                            setLabelsPerPage(cols * gridRows);
                          }}
                          className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                        >
                          <option value={2}>۲ ستونه (برچسب‌های پهن)</option>
                          <option value={3}>۳ ستونه (استاندارد ۲۴ تایی ۶۵×۳۷ mm)</option>
                          <option value={4}>۴ ستونه (فشرده ۴۰ تایی ۵۲×۳۰ mm)</option>
                          <option value={5}>۵ ستونه (ریز ۶۵ تایی ۳۸×۲۱ mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-[#8E9299] block mb-1">تعداد ردیف در صفحه:</label>
                        <select
                          value={gridRows}
                          onChange={(e) => {
                            const rows = Number(e.target.value);
                            setGridRows(rows);
                            setLabelsPerPage(gridColumns * rows);
                          }}
                          className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                        >
                          <option value={6}>۶ ردیف</option>
                          <option value={7}>۷ ردیف</option>
                          <option value={8}>۸ ردیف (استاندارد)</option>
                          <option value={10}>۱۰ ردیف</option>
                          <option value={13}>۱۳ ردیف</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Typography & Font Scaling */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#C9A227]" />
                  تنظیمات فونت، اندازه متن و قیمت
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">اندازه فونت نام کالا:</label>
                    <select
                      value={nameFontSize}
                      onChange={(e) => setNameFontSize(e.target.value as any)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="xs">بسیار ریز (8px)</option>
                      <option value="sm">ریز (10px - استاندارد)</option>
                      <option value="md">متوسط (12px)</option>
                      <option value="lg">درشت (14px)</option>
                      <option value="xl">بسیار درشت (16px)</option>
                    </select>
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
                      <option value="black">خیلی ضخیم (Black)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">اندازه فونت قیمت:</label>
                    <select
                      value={priceFontSize}
                      onChange={(e) => setPriceFontSize(e.target.value as any)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="sm">ریز</option>
                      <option value="md">متوسط</option>
                      <option value="lg">درشت</option>
                      <option value="xl">بسیار درشت</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">متن نام فروشگاه / برند:</label>
                    <input
                      type="text"
                      value={storeNameText}
                      onChange={(e) => setStoreNameText(e.target.value)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 text-xs font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">کادر دور هر برچسب:</label>
                    <select
                      value={borderStyle}
                      onChange={(e) => setBorderStyle(e.target.value as any)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="dashed">خط‌چین راهنمای برش با قیچی (Dashed)</option>
                      <option value="solid">کادر خط ممتد نازک (Solid)</option>
                      <option value="none">بدون کادر (مناسب لیبل‌های آماده برش‌خورده)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Barcode Vector Geometry Settings */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#222225] space-y-3">
                <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C9A227]" />
                  تنظیمات ابعاد و مشخصات خطوط بارکد
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">ارتفاع خطوط بارکد:</label>
                    <select
                      value={barcodeHeight}
                      onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value={22}>کوچک (22px)</option>
                      <option value={30}>استاندارد (30px)</option>
                      <option value={42}>درشت (42px)</option>
                      <option value={55}>بسیار درشت (55px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">ضخامت خطوط بارکد:</label>
                    <select
                      value={barcodeLineWidth}
                      onChange={(e) => setBarcodeLineWidth(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value={1.2}>فشرده و ظریف</option>
                      <option value={1.5}>متوسط (استاندارد)</option>
                      <option value={1.8}>ضخیم (اسکن آسان‌تر)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">فاصله و پدینگ برچسب:</label>
                    <select
                      value={labelPadding}
                      onChange={(e) => setLabelPadding(e.target.value as any)}
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-bold text-[#E0E0E0] focus:border-[#C9A227] outline-none"
                    >
                      <option value="tight">فشرده (Tight)</option>
                      <option value="normal">معمولی (Normal)</option>
                      <option value="relaxed">باز و جادار (Relaxed)</option>
                    </select>
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
