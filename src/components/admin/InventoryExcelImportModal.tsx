import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  FileText,
  Search,
  Building2,
  RefreshCw,
  Layers,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Hash,
  Barcode,
  Package,
  Coins,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Warehouse } from '../../types';
import { useToast } from '../common/Toast';

interface ParsedRowItem {
  name: string;
  code?: string;
  barcode?: string;
  boxBarcode?: string;
  category?: string;
  unit?: string;
  stock: number;
  minStockAlert?: number;
  fileBuyPrice: number;
  filePriceShop1: number;
  filePriceShop2?: number;
  filePriceShop3?: number;
  fileWholesalePrice?: number;
  fileMinAllowedPrice?: number;
  buyPrice: number;
  priceShop1: number;
  priceShop2?: number;
  priceShop3?: number;
  wholesalePrice?: number;
  minAllowedPrice?: number;
  description?: string;
  isValid: boolean;
  validationError?: string;
}

interface InventoryExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onSuccess: () => void;
}

const toEnDigits = (str: any) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/,/g, '')
    .trim();
};

export const InventoryExcelImportModal: React.FC<InventoryExcelImportModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.id || 'wh_central'
  );
  const [conflictMode, setConflictMode] = useState<'increase_stock' | 'update_all' | 'skip_existing'>(
    'increase_stock'
  );

  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRowItem[]>([]);
  const [sourceCurrency, setSourceCurrency] = useState<'toman' | 'rial'>('toman');
  const [isAutoDetectedRial, setIsAutoDetectedRial] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'نام کالا': 'دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو',
        'کد کالا': 'KH-101',
        'بارکد تک': '6260123456789',
        'بارکد کارتن': '6260123459999',
        'دسته‌بندی': 'دفاتر و کاغذ',
        'واحد سنجش': 'جلد',
        'تعداد ورودی انبار': 50,
        'حداقل موجودی هشدار': 10,
        'بهای خرید': 45000,
        'قیمت فروش ۱ (حضوری)': 68000,
        'قیمت فروش ۲ (آنلاین)': 65000,
        'قیمت فروش ۳ (همکار)': 55000,
        'قیمت عمده': 52000,
        'کف قیمت مجاز': 48000,
        'توضیحات': 'کاغذ ۸۰ گرم سفید، صحافی سیمی دوبل مقاوم',
      },
      {
        'نام کالا': 'خودکار کریستال بیک ۱.۰ میلی‌متر آبی',
        'کد کالا': 'KH-102',
        'بارکد تک': '6260123456790',
        'بارکد کارتن': '6260123458888',
        'دسته‌بندی': 'نوشت‌افزار و خودکار',
        'واحد سنجش': 'عدد',
        'تعداد ورودی انبار': 200,
        'حداقل موجودی هشدار': 30,
        'بهای خرید': 12000,
        'قیمت فروش ۱ (حضوری)': 18000,
        'قیمت فروش ۲ (آنلاین)': 17500,
        'قیمت فروش ۳ (همکار)': 14500,
        'قیمت عمده': 13800,
        'کف قیمت مجاز': 13000,
        'توضیحات': 'نوک ساچمه‌ای روان، ساخت فرانسه اصلی',
      },
      {
        'نام کالا': 'زونکن A4 عریض کتان ۸ سانتیمتری',
        'کد کالا': 'KH-103',
        'بارکد تک': '6260123456791',
        'بارکد کارتن': '',
        'دسته‌بندی': 'لوازم اداری و بایگانی',
        'واحد سنجش': 'عدد',
        'تعداد ورودی انبار': 40,
        'حداقل موجودی هشدار': 8,
        'بهای خرید': 85000,
        'قیمت فروش ۱ (حضوری)': 125000,
        'قیمت فروش ۲ (آنلاین)': 120000,
        'قیمت فروش ۳ (همکار)': 105000,
        'قیمت عمده': 98000,
        'کف قیمت مجاز': 90000,
        'توضیحات': 'روکش لبه فلزی ضدزنگ، عطف ۸ سانت، گیره اهرمی',
      },
      {
        'نام کالا': 'ماژیک هایلایتر فسفری ۴ رنگ استابیلو',
        'کد کالا': 'KH-104',
        'بارکد تک': '6260123456792',
        'بارکد کارتن': '',
        'دسته‌بندی': 'نوشت‌افزار و خودکار',
        'واحد سنجش': 'بسته',
        'تعداد ورودی انبار': 25,
        'حداقل موجودی هشدار': 5,
        'بهای خرید': 95000,
        'قیمت فروش ۱ (حضوری)': 140000,
        'قیمت فروش ۲ (آنلاین)': 135000,
        'قیمت فروش ۳ (همکار)': 120000,
        'قیمت عمده': 115000,
        'کف قیمت مجاز': 105000,
        'توضیحات': 'جوهر بر پایه آب، نوک تخت کج ۴ ساعته ضدخشک',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ورودی انبار');
    XLSX.writeFile(wb, 'khatinoo_inventory_import_template.xlsx');
    showToast('فایل اکسل نمونه با موفقیت دانلود شد.', 'success');
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      'نام کالا,کد کالا,بارکد تک,بارکد کارتن,دسته‌بندی,واحد سنجش,تعداد ورودی انبار,حداقل موجودی هشدار,بهای خرید,قیمت فروش ۱ (حضوری),قیمت فروش ۲ (آنلاین),قیمت فروش ۳ (همکار),قیمت عمده,کف قیمت مجاز,توضیحات\n' +
      'دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو,KH-101,6260123456789,6260123459999,دفاتر و کاغذ,جلد,50,10,45000,68000,65000,55000,52000,48000,کاغذ ۸۰ گرم سفید\n' +
      'خودکار کریستال بیک ۱.۰ میلی‌متر آبی,KH-102,6260123456790,6260123458888,نوشت‌افزار و خودکار,عدد,200,30,12000,18000,17500,14500,13800,13000,نوک ساچمه‌ای روان\n' +
      'زونکن A4 عریض کتان ۸ سانتیمتری,KH-103,6260123456791,,لوازم اداری و بایگانی,عدد,40,8,85000,125000,120000,105000,98000,90000,روکش لبه فلزی';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'khatinoo_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('فایل CSV نمونه با موفقیت دانلود شد.', 'success');
  };

  const parseFile = (file: File) => {
    setIsProcessingFile(true);
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          showToast('فایل انتخابی هیچ سطری برای پردازش ندارد.', 'warning');
          setIsProcessingFile(false);
          return;
        }

        let detectedRialInHeaders = false;
        const stopWords = new Set(['کالا', 'نام', 'کد', 'فی', 'واحد', 'قیمت', 'مبلغ', 'شرح', 'بارکد']);

        const parsed: ParsedRowItem[] = rawJson.map((row, index) => {
          const cleanRowKeys = Object.keys(row).map((k) => ({
            original: k,
            clean: k.trim().toLowerCase().replace(/[\s_()\-–/]+/g, ''),
          }));

          // Pass 1: exact match
          const getValExact = (...keys: string[]) => {
            for (const k of keys) {
              const cleanPk = k.trim().toLowerCase().replace(/[\s_()\-–/]+/g, '');
              for (const { original, clean } of cleanRowKeys) {
                if (clean === cleanPk) {
                  const val = row[original];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }
            return '';
          };

          // Pass 2: substring match (skipping stop words and short keys)
          const getValFuzzy = (...keys: string[]) => {
            for (const k of keys) {
              const cleanPk = k.trim().toLowerCase().replace(/[\s_()\-–/]+/g, '');
              if (stopWords.has(cleanPk) || cleanPk.length < 3) continue;
              for (const { original, clean } of cleanRowKeys) {
                if (clean.includes(cleanPk)) {
                  const val = row[original];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }
            return '';
          };

          const getVal = (...keys: string[]) => {
            const exact = getValExact(...keys);
            if (exact) return exact;
            return getValFuzzy(...keys);
          };

          if (index === 0) {
            for (const key of Object.keys(row)) {
              const lk = key.toLowerCase();
              if (key.includes('ریال') || lk.includes('rial') || lk.includes('irr')) {
                detectedRialInHeaders = true;
                break;
              }
            }
          }

          const name = String(getVal('نام کالا', 'شرح کالا یا خدمات', 'شرح کالا', 'عنوان کالا', 'عنوان محصول', 'نام محصول', 'description', 'title', 'product_name', 'name')).trim();
          const code = String(getVal('کد کالا', 'کد', 'شناسه کالا', 'شناسه', 'code', 'sku', 'product_code')).trim();
          const barcode = String(getVal('بارکد تک', 'بارکد', 'بارکد کالا', 'barcode', 'ean', 'upc')).trim();
          const boxBarcode = String(getVal('بارکد کارتن', 'بارکد کارتن/جعبه', 'بارکد جعبه', 'boxBarcode', 'cartonBarcode')).trim();
          const category = String(getVal('دسته‌بندی', 'دسته بندی', 'دسته', 'گروه کالا', 'category', 'categoryName')).trim();
          const unit = String(getVal('واحد سنجش', 'واحد', 'واحد کالا', 'unit')).trim() || 'عدد';
          const stock = Number(toEnDigits(getVal('تعداد ورودی انبار', 'تعداد ورودی', 'تعداد', 'موجودی', 'موجودی انبار', 'ورودی انبار', 'stock', 'quantity', 'qty'))) || 0;
          const minStockAlert = Number(toEnDigits(getVal('حداقل موجودی هشدار', 'حداقل موجودی', 'حداقل هشدار', 'نقطه سفارش', 'minStockAlert'))) || 5;
          const fileBuyPrice = Number(toEnDigits(getVal('بهای خرید (سرمایه)', 'بهای خرید', 'قیمت خرید', 'فی خرید', 'قیمت کالا', 'buyPrice', 'cost'))) || 0;
          const filePriceShop1 = Number(toEnDigits(getVal('قیمت فروش ۱ (حضوری)', 'فروشگاه ۱ (نقدی/حضوری)', 'فروشگاه ۱', 'قیمت فروش ۱', 'قیمت فروش', 'قیمت نقدی', 'priceShop1', 'salePrice'))) || 0;
          const filePriceShop2 = Number(toEnDigits(getVal('قیمت فروش ۲ (آنلاین)', 'فروشگاه ۲ (آنلاین/ترب)', 'فروشگاه ۲', 'قیمت فروش ۲', 'قیمت آنلاین', 'قیمت ترب', 'priceShop2'))) || filePriceShop1;
          const filePriceShop3 = Number(toEnDigits(getVal('قیمت فروش ۳ (همکار)', 'فروشگاه ۳ (همکار)', 'فروشگاه ۳', 'قیمت فروش ۳', 'قیمت همکار', 'priceShop3'))) || filePriceShop1;
          const fileWholesalePrice = Number(toEnDigits(getVal('قیمت عمده', 'فروش عمده و مدارس', 'قیمت عمده و مدارس', 'فروش عمده', 'عمده', 'wholesalePrice'))) || filePriceShop1;
          const fileMinAllowedPrice = Number(toEnDigits(getVal('کف قیمت مجاز', 'کف قیمت', 'حداقل قیمت', 'minAllowedPrice'))) || fileBuyPrice;
          const description = String(getVal('توضیحات', 'شرح کالا', 'توضیحات کالا', 'description', 'desc', 'notes')).trim();

          const isValid = Boolean(name);
          const validationError = !name ? `سطر ${index + 1}: فاقد نام کالا` : undefined;

          return {
            name,
            code,
            barcode,
            boxBarcode,
            category,
            unit,
            stock,
            minStockAlert,
            fileBuyPrice,
            filePriceShop1,
            filePriceShop2,
            filePriceShop3,
            fileWholesalePrice,
            fileMinAllowedPrice,
            buyPrice: fileBuyPrice,
            priceShop1: filePriceShop1,
            priceShop2: filePriceShop2,
            priceShop3: filePriceShop3,
            wholesalePrice: fileWholesalePrice,
            minAllowedPrice: fileMinAllowedPrice,
            description,
            isValid,
            validationError,
          };
        });

        // Auto-detect Rial currency from headers or high prices (> 2,000,000)
        const nonZeroPrices = parsed.map((r) => r.fileBuyPrice).filter((p) => p > 0);
        const avgPrice = nonZeroPrices.length > 0 ? nonZeroPrices.reduce((a, b) => a + b, 0) / nonZeroPrices.length : 0;
        const autoDetectRial = detectedRialInHeaders || avgPrice >= 2000000;

        if (autoDetectRial) {
          setSourceCurrency('rial');
          setIsAutoDetectedRial(true);
          parsed.forEach((r) => {
            r.buyPrice = Math.round(r.fileBuyPrice / 10);
            r.priceShop1 = Math.round(r.filePriceShop1 / 10);
            r.priceShop2 = r.filePriceShop2 ? Math.round(r.filePriceShop2 / 10) : undefined;
            r.priceShop3 = r.filePriceShop3 ? Math.round(r.filePriceShop3 / 10) : undefined;
            r.wholesalePrice = r.fileWholesalePrice ? Math.round(r.fileWholesalePrice / 10) : undefined;
            r.minAllowedPrice = r.fileMinAllowedPrice ? Math.round(r.fileMinAllowedPrice / 10) : undefined;
          });
          showToast(
            `${toPersianDigits(parsed.length)} ردیف کالا بازخوانی شد. واحد مبالغ به‌طور خودکار «ریال» تشخیص داده شد و به تومان تبدیل گردید.`,
            'info'
          );
        } else {
          setSourceCurrency('toman');
          setIsAutoDetectedRial(false);
          showToast(`${toPersianDigits(parsed.length)} ردیف کالا از فایل اکسل بازخوانی شد (واحد پایه: تومان).`, 'info');
        }

        setParsedRows(parsed);
      } catch (err: any) {
        console.error('Failed to parse spreadsheet:', err);
        showToast('خطا در خواندن فایل اکسل. لطفاً فرمت فایل را بررسی کنید.', 'error');
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.onerror = () => {
      showToast('خطا در بارگذاری فایل از حافظه.', 'error');
      setIsProcessingFile(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Switch source currency between Toman and Rial
  const handleCurrencyChange = (cur: 'toman' | 'rial') => {
    setSourceCurrency(cur);
    const factor = cur === 'rial' ? 0.1 : 1;
    setParsedRows((prev) =>
      prev.map((r) => ({
        ...r,
        buyPrice: Math.round(r.fileBuyPrice * factor),
        priceShop1: Math.round(r.filePriceShop1 * factor),
        priceShop2: r.filePriceShop2 ? Math.round(r.filePriceShop2 * factor) : undefined,
        priceShop3: r.filePriceShop3 ? Math.round(r.filePriceShop3 * factor) : undefined,
        wholesalePrice: r.fileWholesalePrice ? Math.round(r.fileWholesalePrice * factor) : undefined,
        minAllowedPrice: r.fileMinAllowedPrice ? Math.round(r.fileMinAllowedPrice * factor) : undefined,
      }))
    );
    showToast(
      cur === 'rial'
        ? 'واحد ارقام فایل به «ریال» تنظیم شد (مبالغ بر ۱۰ تقسیم و به تومان ذخیره می‌شوند).'
        : 'واحد ارقام فایل به «تومان» تنظیم شد (مبالغ عیناً ثبت می‌شوند).',
      'info'
    );
  };

  // Quick manual adjustment: divide all by 10
  const handleManualDivideBy10 = () => {
    setParsedRows((prev) =>
      prev.map((r) => ({
        ...r,
        fileBuyPrice: Math.round(r.fileBuyPrice / 10),
        filePriceShop1: Math.round(r.filePriceShop1 / 10),
        filePriceShop2: r.filePriceShop2 ? Math.round(r.filePriceShop2 / 10) : undefined,
        filePriceShop3: r.filePriceShop3 ? Math.round(r.filePriceShop3 / 10) : undefined,
        fileWholesalePrice: r.fileWholesalePrice ? Math.round(r.fileWholesalePrice / 10) : undefined,
        fileMinAllowedPrice: r.fileMinAllowedPrice ? Math.round(r.fileMinAllowedPrice / 10) : undefined,
        buyPrice: Math.round(r.buyPrice / 10),
        priceShop1: Math.round(r.priceShop1 / 10),
        priceShop2: r.priceShop2 ? Math.round(r.priceShop2 / 10) : undefined,
        priceShop3: r.priceShop3 ? Math.round(r.priceShop3 / 10) : undefined,
        wholesalePrice: r.wholesalePrice ? Math.round(r.wholesalePrice / 10) : undefined,
        minAllowedPrice: r.minAllowedPrice ? Math.round(r.minAllowedPrice / 10) : undefined,
      }))
    );
    showToast('کلیه قیمت‌ها بر ۱۰ تقسیم شدند (تبدیل دستی ریال ➔ تومان).', 'success');
  };

  // Quick manual adjustment: multiply all by 10
  const handleManualMultiplyBy10 = () => {
    setParsedRows((prev) =>
      prev.map((r) => ({
        ...r,
        fileBuyPrice: Math.round(r.fileBuyPrice * 10),
        filePriceShop1: Math.round(r.filePriceShop1 * 10),
        filePriceShop2: r.filePriceShop2 ? Math.round(r.filePriceShop2 * 10) : undefined,
        filePriceShop3: r.filePriceShop3 ? Math.round(r.filePriceShop3 * 10) : undefined,
        fileWholesalePrice: r.fileWholesalePrice ? Math.round(r.fileWholesalePrice * 10) : undefined,
        fileMinAllowedPrice: r.fileMinAllowedPrice ? Math.round(r.fileMinAllowedPrice * 10) : undefined,
        buyPrice: Math.round(r.buyPrice * 10),
        priceShop1: Math.round(r.priceShop1 * 10),
        priceShop2: r.priceShop2 ? Math.round(r.priceShop2 * 10) : undefined,
        priceShop3: r.priceShop3 ? Math.round(r.priceShop3 * 10) : undefined,
        wholesalePrice: r.wholesalePrice ? Math.round(r.wholesalePrice * 10) : undefined,
        minAllowedPrice: r.minAllowedPrice ? Math.round(r.minAllowedPrice * 10) : undefined,
      }))
    );
    showToast('کلیه قیمت‌ها در ۱۰ ضرب شدند.', 'info');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleImportSubmit = async () => {
    const validItems = parsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) {
      showToast('هیچ کالای معتبری برای ورود وجود ندارد.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.importExcelInventory({
        items: validItems.map((r) => ({
          ...r,
          buyPrice: r.buyPrice,
          priceShop1: r.priceShop1,
          priceShop2: r.priceShop2,
          priceShop3: r.priceShop3,
          wholesalePrice: r.wholesalePrice,
          minAllowedPrice: r.minAllowedPrice,
        })),
        warehouseId: selectedWarehouseId,
        conflictMode,
        sourceCurrency: 'toman',
      });

      setImportResult({
        total: res.total || validItems.length,
        createdCount: res.createdCount || 0,
        updatedCount: res.updatedCount || 0,
        skippedCount: res.skippedCount || 0,
        errors: res.errors || [],
      });

      showToast(
        res.message ||
          `ورودی انبار با موفقیت ثبت شد: ${toPersianDigits(res.createdCount || 0)} کالای جدید و ${toPersianDigits(res.updatedCount || 0)} به‌روزرسانی.`,
        'success'
      );
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'خطا در ثبت اطلاعات اکسل در انبار', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPreview = parsedRows.filter((row) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      row.name.toLowerCase().includes(q) ||
      (row.code && row.code.toLowerCase().includes(q)) ||
      (row.barcode && row.barcode.includes(q)) ||
      (row.category && row.category.toLowerCase().includes(q))
    );
  });

  const totalValid = parsedRows.filter((r) => r.isValid).length;
  const totalInvalid = parsedRows.filter((r) => !r.isValid).length;
  const totalIncomingStock = parsedRows
    .filter((r) => r.isValid)
    .reduce((acc, curr) => acc + (curr.stock || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#111113] border border-[#2D2D33] rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right text-[#E0E0E0]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#222225] flex items-center justify-between bg-[#161619]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#F3F4F6] flex items-center gap-2">
                <span>ورودی انبار و ثبت دسته‌ای کالا از طریق اکسل (Excel & CSV)</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  هوشمند و دوطرفه
                </span>
              </h3>
              <p className="text-[11px] text-[#8E9299] mt-0.5">
                افزایش موجودی کالاها، ورود اجناس جدید فاکتور خرید و به‌روزرسانی قیمت‌های ۵ گانه با فایل اکسل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#202026] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Two Column Split View */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-[#222225]">
          {/* Main Working Panel (7 Cols) */}
          <div className="lg:col-span-8 p-4 sm:p-6 space-y-5">
            {/* Warehouse & Conflict Mode Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#161619] p-4 rounded-2xl border border-[#222225]">
              <div>
                <label className="block text-[11px] font-bold text-[#8E9299] mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>انبار مقصد جهت ثبت موجودی:</span>
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.type === 'central_warehouse' ? '(انبار مرکزی)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8E9299] mb-1.5 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>نحوه برخورد با کالاهای تکراری:</span>
                </label>
                <select
                  value={conflictMode}
                  onChange={(e) => setConflictMode(e.target.value as any)}
                  className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none"
                >
                  <option value="increase_stock">افزایش موجودی انبار (جمع تعداد جدید با موجودی فعلی)</option>
                  <option value="update_all">جایگزینی کامل موجودی و به‌روزرسانی مشخصات و قیمت‌ها</option>
                  <option value="skip_existing">صرف‌نظر از اقلام تکراری (فقط ثبت کالاهای کاملاً جدید)</option>
                </select>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2D2D33] hover:border-[#C9A227] bg-[#161619]/60 hover:bg-[#161619] rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#C9A227]/10 group-hover:bg-[#C9A227]/20 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227] transition-all">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#F3F4F6]">
                برای انتخاب فایل اکسل کلیک کنید یا فایل را به اینجا بکشید
              </p>
              <p className="text-[11px] text-[#8E9299] mt-1">
                فرمت‌های پشتیبانی‌شده: <span className="font-mono text-[#C9A227]">.XLSX</span> ،{' '}
                <span className="font-mono text-[#C9A227]">.XLS</span> و{' '}
                <span className="font-mono text-[#C9A227]">.CSV</span>
              </p>

              {fileName && (
                <div className="mt-3 inline-flex items-center gap-2 bg-[#1C1C20] border border-[#2D2D33] px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#C9A227]">
                  <FileText className="w-4 h-4" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>

            {/* Summary Stat Badges (if rows parsed) */}
            {parsedRows.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#161619] p-3 rounded-xl border border-[#222225] text-center">
                  <span className="text-[10px] text-[#8E9299] block font-bold">کل ردیف‌ها</span>
                  <span className="text-sm font-black text-[#F3F4F6] font-mono">
                    {toPersianDigits(parsedRows.length)}
                  </span>
                </div>
                <div className="bg-[#161619] p-3 rounded-xl border border-[#222225] text-center">
                  <span className="text-[10px] text-emerald-400 block font-bold">ردیف‌های معتبر</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {toPersianDigits(totalValid)}
                  </span>
                </div>
                <div className="bg-[#161619] p-3 rounded-xl border border-[#222225] text-center">
                  <span className="text-[10px] text-amber-400 block font-bold">هشدار / نامعتبر</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {toPersianDigits(totalInvalid)}
                  </span>
                </div>
                <div className="bg-[#161619] p-3 rounded-xl border border-[#222225] text-center">
                  <span className="text-[10px] text-[#C9A227] block font-bold">جمع تعداد ورودی</span>
                  <span className="text-sm font-black text-[#C9A227] font-mono">
                    {toPersianDigits(totalIncomingStock)}
                  </span>
                </div>
              </div>
            )}

            {/* Search Filter and Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                {/* Currency Selection & Scale Conversion Banner */}
                <div className="p-3.5 bg-[#18181D] border border-[#2D2D33] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#C9A227] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-[#F3F4F6]">
                          واحد پولی ارقام فایل اکسل:
                        </span>
                        {isAutoDetectedRial && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                            ⚡ تشخیص خودکار: ریال
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8E9299] mt-0.5">
                        واحد پایه انبار کاتینو «تومان» است. در صورت انتخاب ریال، ارقام بر ۱۰ تقسیم شده و به تومان در انبار ذخیره می‌شوند.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Currency Toggle */}
                    <div className="inline-flex rounded-xl p-1 bg-[#111113] border border-[#2D2D33]">
                      <button
                        type="button"
                        onClick={() => handleCurrencyChange('toman')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                          sourceCurrency === 'toman'
                            ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                            : 'text-[#8E9299] hover:text-[#F3F4F6]'
                        }`}
                      >
                        تومان (عیناً)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCurrencyChange('rial')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                          sourceCurrency === 'rial'
                            ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                            : 'text-[#8E9299] hover:text-[#F3F4F6]'
                        }`}
                      >
                        ریال (تقسیم بر ۱۰)
                      </button>
                    </div>

                    {/* Quick Math action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleManualDivideBy10}
                        title="تقسیم دستی همه‌ی قیمت‌ها بر ۱۰"
                        className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-[#202026] text-[#E0E0E0] border border-[#2D2D33] hover:bg-[#2A2A32] transition-colors"
                      >
                        ÷۱۰ (ریال ➔ تومان)
                      </button>
                      <button
                        type="button"
                        onClick={handleManualMultiplyBy10}
                        title="ضرب دستی همه‌ی قیمت‌ها در ۱۰"
                        className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-[#202026] text-[#E0E0E0] border border-[#2D2D33] hover:bg-[#2A2A32] transition-colors"
                      >
                        ×۱۰ (ضرب در ۱۰)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-[#F3F4F6] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>پیش‌نمایش اقلام بازخوانی‌شده ({toPersianDigits(filteredPreview.length)} قلم)</span>
                  </h4>
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#8E9299] absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="جستجو در اقلام فایل..."
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl pr-8 pl-3 py-1.5 text-xs text-[#E0E0E0] outline-none focus:border-[#C9A227]"
                    />
                  </div>
                </div>

                <div className="border border-[#222225] rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#161619] text-[#8E9299] border-b border-[#222225] sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 font-bold">#</th>
                        <th className="p-2.5 font-bold">نام کالا</th>
                        <th className="p-2.5 font-bold">کد / بارکد</th>
                        <th className="p-2.5 font-bold text-center">تعداد ورودی</th>
                        <th className="p-2.5 font-bold">فی در فایل ({sourceCurrency === 'rial' ? 'ریال' : 'تومان'})</th>
                        <th className="p-2.5 font-bold text-[#C9A227]">قیمت خرید (تومان)</th>
                        <th className="p-2.5 font-bold text-emerald-400">قیمت فروش ۱ (تومان)</th>
                        <th className="p-2.5 font-bold text-center">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222225]">
                      {filteredPreview.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-[#161619]/40 transition-colors ${
                            !row.isValid ? 'bg-rose-500/5 text-rose-300' : ''
                          }`}
                        >
                          <td className="p-2.5 font-mono text-[#8E9299]">{toPersianDigits(idx + 1)}</td>
                          <td className="p-2.5 font-bold text-[#F3F4F6] max-w-[200px] truncate">
                            {row.name || <span className="text-rose-400 italic font-normal">فاقد نام کالا</span>}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-[#8E9299]">
                            {row.barcode || row.code || '—'}
                          </td>
                          <td className="p-2.5 text-center font-bold font-mono text-[#C9A227]">
                            {toPersianDigits(row.stock)} {row.unit}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-[#8E9299]">
                            {row.fileBuyPrice > 0 ? `${formatToman(row.fileBuyPrice)}` : '—'}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] font-bold text-[#C9A227]">
                            {row.buyPrice > 0 ? `${formatToman(row.buyPrice)} تومان` : '—'}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] font-bold text-emerald-400">
                            {row.priceShop1 > 0 ? `${formatToman(row.priceShop1)} تومان` : '—'}
                          </td>
                          <td className="p-2.5 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>معتبر</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                <span>نامعتبر</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Result Notification */}
            {importResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>گزارش اتمام پردازش فایل اکسل:</span>
                </div>
                <div className="text-xs text-[#E0E0E0] space-y-1">
                  <p>
                    • کل اقلام پردازش‌شده: <b>{toPersianDigits(importResult.total)}</b> سطر
                  </p>
                  <p>
                    • کالاهای جدید ایجاد شده در سیستم: <b>{toPersianDigits(importResult.createdCount)}</b> قلم
                  </p>
                  <p>
                    • کالاهای دارای افزایش موجودی و به‌روزرسانی: <b>{toPersianDigits(importResult.updatedCount)}</b> قلم
                  </p>
                  {importResult.skippedCount > 0 && (
                    <p className="text-[#8E9299]">
                      • موارد رد شده یا تکراری: {toPersianDigits(importResult.skippedCount)} سطر
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side Guide & Help Panel (5 Cols - راهنما در کنار) */}
          <div className="lg:col-span-4 p-4 sm:p-6 bg-[#141416] space-y-5">
            {/* Guide Header */}
            <div>
              <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                <HelpCircle className="w-4 h-4" />
                <span>راهنمای جامع ستون‌های فایل اکسل</span>
              </div>
              <p className="text-[11px] text-[#8E9299] mt-1">
                برای جلوگیری از هرگونه خطا، فایل اکسل خود را با ستون‌های زیر تنظیم کنید. همچنین می‌توانید قالب آماده را دریافت و پر کنید.
              </p>
            </div>

            {/* Quick Template Download Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleDownloadSampleExcel}
                className="w-full bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#C9A227]/20"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>دانلود قالب آماده اکسل (.XLSX)</span>
              </button>
              <button
                onClick={handleDownloadSampleCsv}
                className="w-full bg-[#1C1C20] hover:bg-[#25252B] border border-[#2D2D33] text-[#E0E0E0] font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#8E9299]" />
                <span>دانلود قالب متنی (.CSV)</span>
              </button>
            </div>

            {/* Column Guide Cards */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-[#18181C] border border-[#222225] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#F3F4F6]">نام کالا</span>
                  <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-mono">
                    الزامی
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  عنوان فارسی کالا (مثلاً: دفتر ۱۰۰ برگ سیمی یا خودکار بیک کریستال).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#18181C] border border-[#222225] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#F3F4F6]">کد کالا & بارکد تک</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                    اختیاری / هوشمند
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  کد اختصاصی یا بارکد بین‌المللی EAN-13. در صورت خالی بودن، سیستم خودکار کد استاندارد تولید می‌کند.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#18181C] border border-[#222225] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#F3F4F6]">بارکد کارتن / جعبه</span>
                  <span className="text-[10px] text-[#8E9299] bg-[#222225] px-1.5 py-0.5 rounded font-mono">
                    اختیاری
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  بارکد بسته‌بندی عمده جهت اسکن سریع در انبار و انبارگردانی بسته‌ای.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#18181C] border border-[#222225] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#F3F4F6]">تعداد ورودی انبار</span>
                  <span className="text-[10px] text-[#C9A227] bg-[#C9A227]/10 px-1.5 py-0.5 rounded font-mono">
                    مهم
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  میزان موجودی خریداری‌شده که به انبار انتخابی افزوده می‌شود.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#18181C] border border-[#222225] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#F3F4F6]">بهای خرید و سطوح ۵ گانه قیمت</span>
                  <span className="text-[10px] text-[#8E9299] bg-[#222225] px-1.5 py-0.5 rounded font-mono">
                    اختیاری
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  شامل ستون‌های: <b>بهای خرید</b>، <b>فروشگاه ۱ (حضوری)</b>، <b>فروشگاه ۲ (آنلاین)</b>،{' '}
                  <b>فروشگاه ۳ (همکار)</b>، <b>قیمت عمده</b> و <b>کف قیمت</b>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#18181C] border border-[#222225] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#F3F4F6]">دسته‌بندی و واحد سنجش</span>
                  <span className="text-[10px] text-[#8E9299] bg-[#222225] px-1.5 py-0.5 rounded font-mono">
                    اختیاری
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  دسته‌بندی (دفاتر، نوشت‌افزار، اداری و...) و واحد (عدد، جلد، بسته، کارتن).
                </p>
              </div>
            </div>

            {/* Important Notes */}
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>نکته مهم انبارداری:</span>
              </div>
              <p>
                تمامی اعداد فارسی و کاماهای جداکننده قیمت‌ها به طور خودکار پاکسازی و اصلاح می‌شوند.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#222225] flex items-center justify-between bg-[#161619]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#202026] cursor-pointer transition-colors"
          >
            انصراف و بستن
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImportSubmit}
              disabled={isSubmitting || isProcessingFile || totalValid === 0}
              className="bg-[#C9A227] hover:bg-[#B38E1E] disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C9A227]/20"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>در حال ذخیره و ورود اطلاعات به انبار...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>تأیید و اجرای ورود {toPersianDigits(totalValid)} قلم به انبار</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
