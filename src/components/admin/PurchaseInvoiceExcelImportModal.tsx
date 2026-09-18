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
  Building2,
  RefreshCw,
  Search,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Hash,
  Barcode,
  Calendar,
  CreditCard,
  Edit3,
  ExternalLink,
  ChevronLeft,
  Coins,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Warehouse, Supplier, Product } from '../../types';
import { useToast } from '../common/Toast';

export interface PurchaseInvoiceExcelItem {
  name: string;
  code?: string;
  barcode?: string;
  quantity: number;
  unit: string;
  fileBuyPrice: number;
  fileSalePrice?: number;
  buyPrice: number;
  salePrice?: number;
  totalPrice?: number;
  isValid: boolean;
  validationError?: string;
}

interface PurchaseInvoiceExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  suppliers: Supplier[];
  onSuccess?: (result: any) => void;
  onEditProduct?: (product: Product) => void;
  onNavigateToProducts?: (searchQuery?: string) => void;
}

const toEnDigits = (str: any) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[,،_\s]/g, '')
    .replace(/[٫/]/g, '.')
    .trim();
};

export const PurchaseInvoiceExcelImportModal: React.FC<PurchaseInvoiceExcelImportModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  suppliers,
  onSuccess,
  onEditProduct,
  onNavigateToProducts,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toLocaleDateString('fa-IR'));
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'wh_central');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'cash' | 'cheque'>('credit');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState<'toman' | 'rial'>('toman');
  const [isAutoDetectedRial, setIsAutoDetectedRial] = useState(false);

  // Processing & Data State
  const [fileName, setFileName] = useState('');
  const [parsedItems, setParsedItems] = useState<PurchaseInvoiceExcelItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Result State
  const [importResult, setImportResult] = useState<{
    invoice: any;
    supplier: any;
    newProducts: Product[];
    updatedProducts: Product[];
    allAffectedProducts: Product[];
  } | null>(null);

  if (!isOpen) return null;

  // Generate and download comprehensive sample Excel template
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'نام شرکت': 'شرکت بازرگانی خطی‌نو',
        'شماره فاکتور': 'INV-1403-501',
        'شماره سند': 'DOC-8820',
        'تاریخ فاکتور': '1403/07/15',
        'کد کالا': 'KH-101',
        'شرح کالا یا خدمات': 'دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو',
        'مقدار': 60,
        'واحد': 'جلد',
        'قیمت کالا': 45000,
        'بارکد': '6260123456789',
        'قیمت مصرف کننده': 68000,
      },
      {
        'نام شرکت': 'شرکت بازرگانی خطی‌نو',
        'شماره فاکتور': 'INV-1403-501',
        'شماره سند': 'DOC-8820',
        'تاریخ فاکتور': '1403/07/15',
        'کد کالا': 'KH-102',
        'شرح کالا یا خدمات': 'خودکار کریستال بیک ۱.۰ میلی‌متر آبی',
        'مقدار': 200,
        'واحد': 'عدد',
        'قیمت کالا': 12000,
        'بارکد': '6260123456790',
        'قیمت مصرف کننده': 18000,
      },
      {
        'نام شرکت': 'شرکت بازرگانی خطی‌نو',
        'شماره فاکتور': 'INV-1403-501',
        'شماره سند': 'DOC-8820',
        'تاریخ فاکتور': '1403/07/15',
        'کد کالا': 'KH-103',
        'شرح کالا یا خدمات': 'کاغذ A4 کپی‌مکس ۸۰ گرم ۵۰۰ برگی',
        'مقدار': 30,
        'واحد': 'بسته',
        'قیمت کالا': 240000,
        'بارکد': '6260123456791',
        'قیمت مصرف کننده': 310000,
      },
      {
        'نام شرکت': 'شرکت بازرگانی خطی‌نو',
        'شماره فاکتور': 'INV-1403-501',
        'شماره سند': 'DOC-8820',
        'تاریخ فاکتور': '1403/07/15',
        'کد کالا': 'KH-104',
        'شرح کالا یا خدمات': 'زونکن A4 لبه فلزی ۷.۵ سانتی‌متر',
        'مقدار': 25,
        'واحد': 'عدد',
        'قیمت کالا': 85000,
        'بارکد': '6260123456792',
        'قیمت مصرف کننده': 125000,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 25 }, // نام شرکت
      { wch: 18 }, // شماره فاکتور
      { wch: 16 }, // شماره سند
      { wch: 14 }, // تاریخ فاکتور
      { wch: 14 }, // کد کالا
      { wch: 38 }, // شرح کالا یا خدمات
      { wch: 10 }, // مقدار
      { wch: 10 }, // واحد
      { wch: 16 }, // قیمت کالا
      { wch: 18 }, // بارکد
      { wch: 18 }, // قیمت مصرف کننده
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'فاکتور خرید');
    XLSX.writeFile(workbook, 'نمونه_اکسل_فاکتور_خرید_خطی_نو.xlsx');
    showToast('فایل نمونه اکسل فاکتور خرید با موفقیت دانلود شد.', 'success');
  };

  // Process File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setIsProcessingFile(true);
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          showToast('فایل اکسل انتخاب‌شده هیچ داده‌ای ندارد.', 'error');
          setIsProcessingFile(false);
          return;
        }

        const items: PurchaseInvoiceExcelItem[] = [];
        let detectedCompany = '';
        let detectedInvoiceNum = '';
        let detectedDocNum = '';
        let detectedDate = '';
        let detectedRialInHeaders = false;

        const stopWords = new Set(['کالا', 'نام', 'کد', 'فی', 'واحد', 'سند', 'فاکتور', 'قیمت', 'مبلغ', 'شرح', 'بارکد']);

        rawJson.forEach((row: any, idx: number) => {
          // Find field keys with two-pass matching (Pass 1: exact match with priority; Pass 2: fallback substring)
          const getVal = (possibleKeys: string[]): string => {
            const cleanRowKeys = Object.keys(row).map((key) => ({
              original: key,
              clean: key.trim().toLowerCase().replace(/[_\s-]/g, ''),
            }));

            // پاس اول: فقط تطبیق دقیق (بالاترین اولویت، روی همه‌ی نام‌های قابل‌قبول)
            for (const pk of possibleKeys) {
              const cleanPk = pk.trim().toLowerCase().replace(/[_\s-]/g, '');
              for (const { original, clean } of cleanRowKeys) {
                if (clean === cleanPk) {
                  const val = row[original];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }

            // پاس دوم: تطبیق تقریبی - کلمات خیلی عمومی و کوتاه فیلتر می‌شوند تا ستون اشتباه خوانده نشود
            for (const pk of possibleKeys) {
              const cleanPk = pk.trim().toLowerCase().replace(/[_\s-]/g, '');
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

          // Auto-detect currency keyword in headers
          if (idx === 0) {
            for (const key of Object.keys(row)) {
              const lk = key.toLowerCase();
              if (key.includes('ریال') || lk.includes('rial') || lk.includes('irr')) {
                detectedRialInHeaders = true;
                break;
              }
            }
          }

          // Auto-detect header metadata from first available row
          if (!detectedCompany) {
            detectedCompany = getVal(['نام شرکت', 'شرکت', 'تامین کننده', 'تأمین‌کننده', 'فروشنده', 'company', 'supplier']);
          }
          if (!detectedInvoiceNum) {
            detectedInvoiceNum = getVal(['شماره فاکتور', 'فاکتور', 'شماره برگ', 'invoice_no', 'invoiceno', 'invoice_number']);
          }
          if (!detectedDocNum) {
            detectedDocNum = getVal(['شماره سند', 'سند', 'سند انبار', 'شماره برگه سند', 'doc_number', 'document_no', 'doc_no']);
          }
          if (!detectedDate) {
            detectedDate = getVal(['تاریخ فاکتور', 'تاریخ', 'date', 'invoice_date']);
          }

          // Item-level fields (رفع باگ: حذف کلمه‌ی عمومی «کالا» از کلیدهای شرح تا با کد کالا یا قیمت اشتباه نشود)
          const name = getVal([
            'شرح کالا یا خدمات',
            'شرح کالا و خدمات',
            'شرح کالا/خدمات',
            'شرح کالا',
            'نام کالا',
            'عنوان کالا',
            'شرح اجناس',
            'شرح محصول',
            'نام محصول',
            'عنوان محصول',
            'شرح قلم',
            'نام قلم',
            'شرح خدمات',
            'شرح',
            'عنوان',
            'description',
            'item_name',
            'product_name',
            'title',
            'name',
          ]);
          const code = toEnDigits(getVal(['کد کالا', 'کد', 'کدسیستمی', 'کد محصول', 'code', 'product_code', 'item_code']));
          const barcode = toEnDigits(getVal(['بارکد', 'بارکد تک', 'بارکد کالا', 'barcode']));
          const unit = getVal(['واحد', 'واحد سنجش', 'واحد کالا', 'unit']) || 'عدد';
          const qtyStr = toEnDigits(getVal(['مقدار', 'تعداد', 'مقدار کالا', 'تعداد کالا', 'تعداد وارده', 'quantity', 'qty', 'amount']));
          const buyPriceStr = toEnDigits(getVal(['قیمت کالا', 'فی خرید', 'قیمت خرید', 'فی', 'مبلغ واحد', 'قیمت واحد', 'buy_price', 'price', 'unit_price']));
          const salePriceStr = toEnDigits(getVal(['قیمت مصرف کننده', 'قیمت فروش', 'قیمت مصرف‌کننده', 'قیمت فروش ۱', 'sale_price']));

          const quantity = Number(qtyStr) || 0;
          const fileBuyPrice = Number(buyPriceStr) || 0;
          const fileSalePrice = Number(salePriceStr) || undefined;

          let isValid = true;
          let validationError = '';

          if (!name) {
            isValid = false;
            validationError = 'شرح کالا خالی است';
          } else if (quantity <= 0) {
            isValid = false;
            validationError = 'تعداد یا مقدار کالا نامعتبر است';
          }

          items.push({
            name,
            code: code || undefined,
            barcode: barcode || undefined,
            quantity: quantity > 0 ? quantity : 1,
            unit,
            fileBuyPrice,
            fileSalePrice,
            buyPrice: fileBuyPrice,
            salePrice: fileSalePrice,
            totalPrice: (quantity > 0 ? quantity : 1) * fileBuyPrice,
            isValid,
            validationError,
          });
        });

        // Set metadata states if detected and not manually overridden
        if (detectedCompany) setSupplierName(detectedCompany);
        if (detectedInvoiceNum) setInvoiceNumber(detectedInvoiceNum);
        if (detectedDocNum) setDocumentNumber(detectedDocNum);
        if (detectedDate) setInvoiceDate(detectedDate);

        // Auto-detect Rial currency from headers or high average price (> 2,000,000)
        const nonZeroPrices = items.map((it) => it.fileBuyPrice).filter((p) => p > 0);
        const avgPrice = nonZeroPrices.length > 0 ? nonZeroPrices.reduce((a, b) => a + b, 0) / nonZeroPrices.length : 0;
        const autoDetectRial = detectedRialInHeaders || avgPrice >= 2000000;

        if (autoDetectRial) {
          setSourceCurrency('rial');
          setIsAutoDetectedRial(true);
          items.forEach((it) => {
            it.buyPrice = Math.round(it.fileBuyPrice / 10);
            it.salePrice = it.fileSalePrice ? Math.round(it.fileSalePrice / 10) : undefined;
            it.totalPrice = it.quantity * it.buyPrice;
          });
          showToast(
            `${toPersianDigits(items.length)} ردیف بازخوانی شد. واحد مبالغ فایل به‌طور خودکار «ریال» تشخیص داده شد و به تومان تبدیل گردید.`,
            'info'
          );
        } else {
          setSourceCurrency('toman');
          setIsAutoDetectedRial(false);
          showToast(`${toPersianDigits(items.length)} ردیف از فایل اکسل بازخوانی شد (واحد پایه: تومان).`, 'info');
        }

        setParsedItems(items);
      } catch (err: any) {
        console.error('Error parsing purchase invoice Excel:', err);
        showToast('خطا در پردازش فایل اکسل: ' + (err.message || 'ساختار فایل نامعتبر است.'), 'error');
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Switch source currency between Toman and Rial
  const handleCurrencyChange = (cur: 'toman' | 'rial') => {
    setSourceCurrency(cur);
    const factor = cur === 'rial' ? 0.1 : 1;
    setParsedItems((prev) =>
      prev.map((it) => {
        const buyPrice = Math.round(it.fileBuyPrice * factor);
        const salePrice = it.fileSalePrice ? Math.round(it.fileSalePrice * factor) : undefined;
        return {
          ...it,
          buyPrice,
          salePrice,
          totalPrice: it.quantity * buyPrice,
        };
      })
    );
    showToast(
      cur === 'rial'
        ? 'واحد ارقام فایل به «ریال» تغییر یافت (کلیه قیمت‌ها بر ۱۰ تقسیم و به تومان ثبت می‌شوند).'
        : 'واحد ارقام فایل به «تومان» تنظیم شد (مبالغ عیناً ثبت می‌شوند).',
      'info'
    );
  };

  // Quick manual adjustment: divide all by 10
  const handleManualDivideBy10 = () => {
    setParsedItems((prev) =>
      prev.map((it) => {
        const fileBuyPrice = Math.round(it.fileBuyPrice / 10);
        const fileSalePrice = it.fileSalePrice ? Math.round(it.fileSalePrice / 10) : undefined;
        const buyPrice = Math.round(it.buyPrice / 10);
        const salePrice = it.salePrice ? Math.round(it.salePrice / 10) : undefined;
        return {
          ...it,
          fileBuyPrice,
          fileSalePrice,
          buyPrice,
          salePrice,
          totalPrice: it.quantity * buyPrice,
        };
      })
    );
    showToast('کلیه قیمت‌های فاکتور بر ۱۰ تقسیم شدند (تبدیل دستی ریال ➔ تومان).', 'success');
  };

  // Quick manual adjustment: multiply all by 10
  const handleManualMultiplyBy10 = () => {
    setParsedItems((prev) =>
      prev.map((it) => {
        const fileBuyPrice = Math.round(it.fileBuyPrice * 10);
        const fileSalePrice = it.fileSalePrice ? Math.round(it.fileSalePrice * 10) : undefined;
        const buyPrice = Math.round(it.buyPrice * 10);
        const salePrice = it.salePrice ? Math.round(it.salePrice * 10) : undefined;
        return {
          ...it,
          fileBuyPrice,
          fileSalePrice,
          buyPrice,
          salePrice,
          totalPrice: it.quantity * buyPrice,
        };
      })
    );
    showToast('کلیه قیمت‌های فاکتور در ۱۰ ضرب شدند.', 'info');
  };

  // Submit parsed invoice to API
  const handleSubmitInvoice = async () => {
    const validItems = parsedItems.filter((it) => it.isValid);
    if (validItems.length === 0) {
      showToast('هیچ قلم کالای معتبری برای ثبت فاکتور خرید وجود ندارد.', 'error');
      return;
    }

    const finalSupplier = supplierName.trim() || 'تامین‌کننده اکسل';
    setIsSubmitting(true);

    try {
      const response = await api.importPurchaseInvoiceExcel({
        supplierName: finalSupplier,
        supplierId: selectedSupplierId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
        invoiceDate: invoiceDate.trim() || undefined,
        warehouseId,
        paymentMethod,
        paidAmount,
        notes: notes.trim() || undefined,
        sourceCurrency,
        alreadyConvertedToToman: true,
        items: validItems.map((it) => ({
          name: it.name,
          code: it.code,
          barcode: it.barcode,
          quantity: it.quantity,
          unit: it.unit,
          buyPrice: it.buyPrice,
          salePrice: it.salePrice,
        })),
      });

      setImportResult(response);
      showToast('فاکتور خرید و کالاها با موفقیت در سیستم ثبت گردیدند.', 'success');
      window.dispatchEvent(new CustomEvent('khatinoo-inventory-updated'));
      window.dispatchEvent(new CustomEvent('khatinoo-invoices-updated'));

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      console.error('Failed to import purchase invoice from Excel:', err);
      showToast(err.message || 'خطا در ثبت فاکتور خرید از اکسل', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = parsedItems.filter((it) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      (it.code && it.code.toLowerCase().includes(q)) ||
      (it.barcode && it.barcode.toLowerCase().includes(q))
    );
  });

  const validItemsCount = parsedItems.filter((i) => i.isValid).length;
  const totalCalculatedAmount = parsedItems
    .filter((i) => i.isValid)
    .reduce((acc, curr) => acc + curr.quantity * curr.buyPrice, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#121215] rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#18181D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  ورود فاکتور خرید از طریق فایل اکسل
                </h3>
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  اتصال به کالاها و انبار
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ثبت فاکتور بر اساس نام شرکت، تاریخ، شماره فاکتور، شماره سند، کد کالا، شرح کالا، مقدار، واحد و قیمت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns (Main Form 65% + Side Guide 35%) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {importResult ? (
            /* Success State with direct links to edit products and view invoice */
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-emerald-900 dark:text-emerald-200 flex items-start gap-4 shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-base font-black text-emerald-950 dark:text-emerald-100">
                    فاکتور خرید با شماره «{importResult.invoice.invoiceNumber}» با موفقیت ثبت گردید!
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    <div className="bg-white/70 dark:bg-black/20 p-2.5 rounded-xl border border-emerald-200/50">
                      <span className="text-slate-500 block mb-0.5">تامین‌کننده / شرکت:</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-bold">{importResult.supplier?.name || '-'}</strong>
                    </div>
                    <div className="bg-white/70 dark:bg-black/20 p-2.5 rounded-xl border border-emerald-200/50">
                      <span className="text-slate-500 block mb-0.5">شماره سند حسابداری:</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-bold">{importResult.invoice.documentNumber || 'فاقد سند'}</strong>
                    </div>
                    <div className="bg-white/70 dark:bg-black/20 p-2.5 rounded-xl border border-emerald-200/50">
                      <span className="text-slate-500 block mb-0.5">مبلغ کل فاکتور:</span>
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">{formatToman(importResult.invoice.totalAmount)}</strong>
                    </div>
                    <div className="bg-white/70 dark:bg-black/20 p-2.5 rounded-xl border border-emerald-200/50">
                      <span className="text-slate-500 block mb-0.5">کالاهای جدید اضافه شده:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-black">{toPersianDigits(importResult.newProducts.length)} قلم جدید</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of Affected Products with Quick Edit Button (Photo upload, barcodes, retail price) */}
              <div className="bg-white dark:bg-[#18181D] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#1E1E24] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      اقلام ثبت شده در سیستم (هم‌اکنون می‌توانید کالاها را ویرایش کنید، تصویر بارگذاری کنید یا قیمت فروش بگذارید):
                    </h5>
                  </div>
                  {onNavigateToProducts && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToProducts();
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>مشاهده همه در صفحه مدیریت کالاها</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                  {importResult.allAffectedProducts.map((p: any) => {
                    const isNew = importResult.newProducts.some((np) => np.id === p.id);
                    return (
                      <div key={p.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                                {p.name}
                              </span>
                              {isNew ? (
                                <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                                  کالای جدید
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                  به‌روزرسانی قیمت
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span>کد: <code className="font-mono text-slate-700 dark:text-slate-300">{p.code || '-'}</code></span>
                              {p.barcode && <span>بارکد: <code className="font-mono text-slate-700 dark:text-slate-300">{p.barcode}</code></span>}
                              <span>فی خرید: <strong className="text-slate-800 dark:text-slate-200">{formatToman(p.buyPrice)}</strong></span>
                              <span>قیمت فروش فعلی: <strong className="text-emerald-600 dark:text-emerald-400">{formatToman(p.salePrice || p.priceShop1)}</strong></span>
                              <span>موجودی جدید: <strong className="text-indigo-600">{toPersianDigits(p.stock)} {p.unit || 'عدد'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {onEditProduct && (
                          <button
                            onClick={() => {
                              onClose();
                              onEditProduct(p);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ویرایش و بارگذاری عکس / بارکد</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setImportResult(null);
                    setParsedItems([]);
                    setFileName('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  ثبت فاکتور خرید اکسل دیگر
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all cursor-pointer shadow-xs"
                >
                  اتمام و بازگشت
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Workspace (Columns 1 to 7 on desktop) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. File Upload Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) processSelectedFile(file);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    fileName
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-[#16161A]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  {fileName ? (
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">
                        فایل انتخاب شده: {fileName}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">
                        برای تغییر فایل، مجدداً کلیک یا فایل را به اینجا بکشید
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
                        فایل اکسل فاکتور خرید را اینجا رها کنید یا کلیک کنید
                      </span>
                      <span className="text-xs text-slate-400 mt-1 block">
                        فرمت‌های مجاز: XLSX, XLS, CSV
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Invoice Header Information Card */}
                <div className="bg-slate-50/80 dark:bg-[#18181D] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                        مشخصات فاکتور و شرکت پخش (شناسایی هوشمند از اکسل)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      در صورت خالی بودن، به صورت خودکار از اکسل بازخوانی می‌شود
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        اسم شرکت / تأمین‌کننده <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => {
                          setSupplierName(e.target.value);
                          setSelectedSupplierId('');
                        }}
                        placeholder="مثال: شرکت بازرگانی خطی‌نو"
                        className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      {suppliers.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                          <span className="text-slate-400 shrink-0">انتخاب از شرکت‌ها:</span>
                          {suppliers.slice(0, 4).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSupplierName(s.name);
                                setSelectedSupplierId(s.id);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 text-[10px] transition-colors whitespace-nowrap cursor-pointer"
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        شماره سند حسابداری / انبار
                      </label>
                      <div className="relative">
                        <Hash className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value)}
                          placeholder="مثال: DOC-8820"
                          className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        شماره فاکتور خرید
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="مثال: INV-1403-501"
                        className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        تاریخ فاکتور
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          placeholder="1403/07/15"
                          className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        انبار مقصد
                      </label>
                      <select
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                        className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        {warehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name} {wh.isDefault ? '(پیش‌فرض مرکزی)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نحوه تسویه فاکتور
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="credit">نسیه / حساب دفتری تامین‌کننده (ثبت به عنوان بستانکاری)</option>
                        <option value="cash">نقدی (تسویه کامل از صندوق/تنخواه‌گردان)</option>
                        <option value="cheque">چک / ترکیبی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        واحد پولی ارقام فایل اکسل
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleCurrencyChange('toman')}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            sourceCurrency === 'toman'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white dark:bg-[#202026] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                          }`}
                        >
                          تومان (عیناً)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCurrencyChange('rial')}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            sourceCurrency === 'rial'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white dark:bg-[#202026] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                          }`}
                        >
                          ریال (تقسیم بر ۱۰)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Parsed Items Preview Table */}
                {parsedItems.length > 0 && (
                  <div className="bg-white dark:bg-[#18181D] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    {/* Currency selection & conversion banner */}
                    <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-indigo-950 dark:text-indigo-200">
                              واحد پولی ارقام فایل اکسل:
                            </span>
                            {isAutoDetectedRial && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-300 dark:border-amber-800">
                                ⚡ تشخیص خودکار بر مبنای هدر/مبالغ: ریال
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/70 mt-0.5">
                            واحد پایه سیستم کاتینو «تومان» است. در صورت انتخاب ریال، کلیه قیمت‌ها بر ۱۰ تقسیم و به تومان ذخیره می‌شوند.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Currency Toggle Buttons */}
                        <div className="inline-flex rounded-xl p-1 bg-white dark:bg-[#1f1f26] border border-indigo-200 dark:border-indigo-800 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleCurrencyChange('toman')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                              sourceCurrency === 'toman'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            تومان (عیناً)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCurrencyChange('rial')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                              sourceCurrency === 'rial'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
                            className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-white dark:bg-[#202026] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
                          >
                            ÷۱۰ (ریال ➔ تومان)
                          </button>
                          <button
                            type="button"
                            onClick={handleManualMultiplyBy10}
                            title="ضرب دستی همه‌ی قیمت‌ها در ۱۰"
                            className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-white dark:bg-[#202026] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
                          >
                            ×۱۰ (ضرب در ۱۰)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#16161A]">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                          پیش‌نمایش اقلام فاکتور ({toPersianDigits(validItemsCount)} قلم معتبر)
                        </span>
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                          جمع کل فاکتور: {formatToman(totalCalculatedAmount)}
                        </span>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="جستجو در اقلام فایل..."
                          className="w-full bg-white dark:bg-[#202026] border border-slate-300 dark:border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 w-10">#</th>
                            <th className="p-2.5">کد کالا</th>
                            <th className="p-2.5">شرح کالا یا خدمات</th>
                            <th className="p-2.5">مقدار / تعداد</th>
                            <th className="p-2.5">واحد</th>
                            <th className="p-2.5">فی در فایل اکسل ({sourceCurrency === 'rial' ? 'ریال' : 'تومان'})</th>
                            <th className="p-2.5 text-indigo-700 dark:text-indigo-300">فی نهایی (تومان)</th>
                            <th className="p-2.5 text-emerald-700 dark:text-emerald-300">مبلغ کل (تومان)</th>
                            <th className="p-2.5">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredItems.map((item, idx) => (
                            <tr
                              key={idx}
                              className={
                                item.isValid
                                  ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                  : 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-700'
                              }
                            >
                              <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                                {toPersianDigits(idx + 1)}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {item.code || '-'}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                                {item.name}
                                {item.validationError && (
                                  <span className="block text-[10px] text-rose-500 font-normal mt-0.5">
                                    {item.validationError}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-black text-indigo-600 dark:text-indigo-400">
                                {toPersianDigits(item.quantity)}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                {item.unit}
                              </td>
                              <td className="p-2.5 text-slate-500 dark:text-slate-400 font-mono">
                                {formatToman(item.fileBuyPrice)}
                              </td>
                              <td className="p-2.5 font-black text-indigo-700 dark:text-indigo-300">
                                {formatToman(item.buyPrice)}
                              </td>
                              <td className="p-2.5 font-black text-emerald-700 dark:text-emerald-300">
                                {formatToman(item.totalPrice || item.quantity * item.buyPrice)}
                              </td>
                              <td className="p-2.5">
                                {item.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>معتبر</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-bold">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>خطا</span>
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

                {/* 4. Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleSubmitInvoice}
                    disabled={isSubmitting || parsedItems.length === 0 || validItemsCount === 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال ثبت فاکتور و ایجاد کالاها...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ثبت نهایی فاکتور خرید و افزودن کالاها به انبار</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sidebar Guide (Columns 8 to 12 on desktop) - "راهنمای اکسل بقلش باشه" */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-gradient-to-br from-indigo-50/70 to-emerald-50/70 dark:from-indigo-950/30 dark:to-emerald-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-5 text-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        راهنمای جامع ستون‌های اکسل فاکتور خرید
                      </h4>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    برای ورود فاکتور خرید کافی است فایل اکسل شما ستون‌های زیر را داشته باشد. سیستم نام ستون‌ها را به صورت هوشمند تشخیص می‌دهد:
                  </p>

                  <div className="space-y-2.5">
                    <div className="bg-white/80 dark:bg-[#18181D]/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>۱. اسم شرکت یا تأمین‌کننده</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">نام شرکت</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        نام شرکت پخش، بازرگانی یا کارخانه صادرکننده فاکتور.
                      </p>
                    </div>

                    <div className="bg-white/80 dark:bg-[#18181D]/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>۲. شماره فاکتور و شماره سند</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">شماره فاکتور / سند</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        شماره سند مالی یا برگه فاکتور جهت پیگیری حسابداری و کاردکس کالا.
                      </p>
                    </div>

                    <div className="bg-white/80 dark:bg-[#18181D]/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>۳. کد کالا یا بارکد</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">کد کالا / بارکد</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        کد اختصاصی کالا. اگر کالا قبلاً در سیستم باشد شناسایی و به‌روزرسانی می‌شود.
                      </p>
                    </div>

                    <div className="bg-white/80 dark:bg-[#18181D]/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>۴. شرح کالا یا خدمات</span>
                        <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold">الزامی</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        عنوان دقیق کالا (مثال: دفتر ۱۰۰ برگ سیمی، خودکار بیک، کاغذ کپی مکس).
                      </p>
                    </div>

                    <div className="bg-white/80 dark:bg-[#18181D]/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>۵. مقدار و واحد سنجش</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">مقدار / واحد</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        تعداد وارده به انبار همراه با واحد (عدد، جلد، بسته، جعبه، کیلوگرم).
                      </p>
                    </div>

                    <div className="bg-white/80 dark:bg-[#18181D]/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>۶. قیمت کالا (فی خرید)</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">قیمت کالا</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        بهای تمام‌شده خرید هر واحد به تومان جهت محاسبه کاردکس و بهای تمام‌شده.
                      </p>
                    </div>
                  </div>

                  {/* Smart Workflow Note */}
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                    <div className="font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>اتصال خودکار به بخش کالاها و ویرایش سریع:</span>
                    </div>
                    <p className="leading-relaxed">
                      پس از ثبت فاکتور از طریق اکسل، کالاها بلافاصله در فهرست کالاها ایجاد می‌شوند و شما می‌توانید با یک کلیک روی «ویرایش کالا» تصویر محصول را آپلود کنید، بارکد تکمیلی وارد کنید و قیمت فروش حضوری/همکار را تعیین فرمایید.
                    </p>
                  </div>

                  {/* Download Sample Button */}
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-[#202026] hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود قالب آماده فایل اکسل فاکتور خرید</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
