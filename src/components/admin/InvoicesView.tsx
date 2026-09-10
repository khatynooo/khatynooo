import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShoppingBag,
  Truck,
  Warehouse as WarehouseIcon,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  User,
  DollarSign,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Check,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Tag,
  Calendar,
  Percent,
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Camera,
  Barcode,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber, toEnglishDigits, findProductByBarcodeOrCode } from '../../lib/utils';
import { SalesInvoice, PurchaseInvoice, ReturnInvoice, ReturnInvoiceItem, Customer, Supplier, Product, Warehouse, Category, ChequeInfo, PaymentMethod } from '../../types';
import { useToast } from '../common/Toast';
import { ReceiptModal } from './ReceiptModal';
import { QuickAddProductModal } from './QuickAddProductModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { ProductScanQuantityModal } from './ProductScanQuantityModal';
import { UnknownBarcodeModal } from './UnknownBarcodeModal';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';

export const InvoicesView: React.FC = () => {
  const { showToast } = useToast();
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'sales' | 'purchase' | 'returns'>('sales');
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [returnInvoices, setReturnInvoices] = useState<ReturnInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseWarehouseId, setPurchaseWarehouseId] = useState<string>('wh_central');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // New Purchase Invoice Modal States
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [purchaseDraftBanner, setPurchaseDraftBanner] = useState<any>(null); // payload پیش‌نویس پیداشده، یا null
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState(
    new Date().toLocaleDateString('fa-IR')
  );
  const [purchaseDiscount, setPurchaseDiscount] = useState<number | ''>(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'cash' | 'cheque' | 'mixed' | 'credit'>('cash');
  const [purchaseCashAmount, setPurchaseCashAmount] = useState<number | ''>(0);
  const [purchaseCheques, setPurchaseCheques] = useState<ChequeInfo[]>([]);
  const [purchaseReceiptImages, setPurchaseReceiptImages] = useState<string[]>([]);
  const [viewingReceiptUrls, setViewingReceiptUrls] = useState<string[]>([]);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState<number>(0);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; buyPrice: number; total: number }>
  >([]);

  // Search & Quick Add states in New Purchase Modal
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState('');
  const [checkingMarketProductId, setCheckingMarketProductId] = useState<string | null>(null);

  // Barcode Scanner & Quantity Workflow in New Purchase Modal
  const [isPurchaseScannerOpen, setIsPurchaseScannerOpen] = useState(false);
  const [isPurchaseScannerPaused, setIsPurchaseScannerPaused] = useState(false);
  const [purchaseQuantityModal, setPurchaseQuantityModal] = useState<{
    product: Product;
    mode: 'unit' | 'box';
    currentQtyInInvoice: number;
  } | null>(null);
  const [purchaseUnknownBarcode, setPurchaseUnknownBarcode] = useState<string | null>(null);
  const [purchaseQuickAddBarcode, setPurchaseQuickAddBarcode] = useState<string>('');

  // New Return Invoice Modal
  const [showNewReturnModal, setShowNewReturnModal] = useState(false);
  const [returnCustomerId, setReturnCustomerId] = useState('');
  const [returnCustomerName, setReturnCustomerName] = useState('');
  const [returnCustomerMobile, setReturnCustomerMobile] = useState('');
  const [returnReasonCategory, setReturnReasonCategory] = useState<'defective' | 'unwanted'>('defective');
  const [returnReasonNote, setReturnReasonNote] = useState('');
  const [returnRefundMethod, setReturnRefundMethod] = useState<'cash' | 'customer_credit' | 'bank_transfer' | 'none'>('cash');
  const [returnWarehouseId, setReturnWarehouseId] = useState('wh_central');
  const [returnItems, setReturnItems] = useState<ReturnInvoiceItem[]>([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Edit Sales Invoice Modal States
  const [editingSalesInvoice, setEditingSalesInvoice] = useState<SalesInvoice | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerMobile, setEditCustomerMobile] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');
  const [editPaidAmount, setEditPaidAmount] = useState<number | ''>(0);
  const [editDiscount, setEditDiscount] = useState<number | ''>(0);
  const [editTaxRate, setEditTaxRate] = useState<number | ''>(0);
  const [editWarehouseId, setEditWarehouseId] = useState('wh_central');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; unitPrice: number; total: number; isService?: boolean }>
  >([]);
  const [editProductSearchTerm, setEditProductSearchTerm] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Edit Purchase Invoice Modal States
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseInvoice | null>(null);
  const [editPurchaseSupplierId, setEditPurchaseSupplierId] = useState('');
  const [editPurchaseInvoiceNumber, setEditPurchaseInvoiceNumber] = useState('');
  const [editPurchaseInvoiceDate, setEditPurchaseInvoiceDate] = useState('');
  const [editPurchaseWarehouseId, setEditPurchaseWarehouseId] = useState('wh_central');
  const [editPurchaseDiscount, setEditPurchaseDiscount] = useState<number | ''>(0);
  const [editPurchasePaymentMethod, setEditPurchasePaymentMethod] = useState<'cash' | 'cheque' | 'mixed' | 'credit'>('cash');
  const [editPurchaseCashAmount, setEditPurchaseCashAmount] = useState<number | ''>(0);
  const [editPurchasePaidAmount, setEditPurchasePaidAmount] = useState<number | ''>(0);
  const [editPurchaseCheques, setEditPurchaseCheques] = useState<ChequeInfo[]>([]);
  const [editPurchaseNotes, setEditPurchaseNotes] = useState('');
  const [editPurchaseReceiptImages, setEditPurchaseReceiptImages] = useState<string[]>([]);
  const [editPurchaseItems, setEditPurchaseItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; buyPrice: number; total: number }>
  >([]);
  const [editPurchaseProductSearch, setEditPurchaseProductSearch] = useState('');
  const [isSubmittingEditPurchase, setIsSubmittingEditPurchase] = useState(false);
  const [isDeletingPurchaseInvoice, setIsDeletingPurchaseInvoice] = useState(false);
  const [deletingPurchaseInvoiceTarget, setDeletingPurchaseInvoiceTarget] = useState<PurchaseInvoice | null>(null);
  const [isUploadingEditReceipt, setIsUploadingEditReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [salesRes, purRes, rtnRes, custRes, supRes, prodRes, whRes, catRes] = await Promise.all([
        api.getSalesInvoices(),
        api.getPurchaseInvoices(),
        api.getReturnInvoices().catch(() => ({ returnInvoices: [] })),
        api.getCustomers().catch(() => ({ customers: [] })),
        api.getSuppliers().catch(() => ({ suppliers: [] })),
        api.getProducts().catch(() => ({ products: [] })),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
      ]);
      setSalesInvoices(salesRes.invoices || []);
      setPurchaseInvoices(purRes.invoices || []);
      setReturnInvoices(rtnRes.returnInvoices || []);
      setCustomers(custRes.customers || []);
      setSuppliers(supRes.suppliers || []);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      const whList = whRes.warehouses || [];
      setWarehouses(whList);
      if (whList.length > 0) {
        setPurchaseWarehouseId(whList[0].id);
      }
      if (supRes.suppliers?.length) setPurchaseSupplierId(supRes.suppliers[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  // ۱. بررسی و بارگذاری پیش‌نویس ذخیره‌شده هنگام باز شدن مودال فاکتور خرید
  useEffect(() => {
    if (!showNewPurchaseModal) return;
    api.getPurchaseDraft()
      .then((res) => {
        if (res?.draft?.payload && Object.keys(res.draft.payload).length > 0) {
          setPurchaseDraftBanner(res.draft.payload);
        }
      })
      .catch(() => {});
  }, [showNewPurchaseModal]);

  // ۲. ذخیره خودکار پیش‌نویس فاکتور خرید در پس‌زمینه با Debounce
  useEffect(() => {
    if (!showNewPurchaseModal || purchaseDraftBanner) return;
    const isDirty = purchaseItems.length > 0 || Boolean(purchaseSupplierId);
    if (!isDirty) return;

    const payload = {
      purchaseSupplierId,
      purchaseInvoiceNumber,
      purchaseInvoiceDate,
      purchaseDiscount,
      purchasePaymentMethod,
      purchaseCashAmount,
      purchaseCheques,
      purchaseReceiptImages,
      purchaseItems,
      purchaseWarehouseId,
    };
    const t = setTimeout(() => {
      api.savePurchaseDraft(payload).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [
    showNewPurchaseModal,
    purchaseDraftBanner,
    purchaseSupplierId,
    purchaseInvoiceNumber,
    purchaseInvoiceDate,
    purchaseDiscount,
    purchasePaymentMethod,
    purchaseCashAmount,
    purchaseCheques,
    purchaseReceiptImages,
    purchaseItems,
    purchaseWarehouseId,
  ]);

  const handleReceiptFilesUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setIsUploadingReceipt(true);
    let successCount = 0;
    try {
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) continue;
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const res = await api.uploadFile({
                dataUrl: reader.result as string,
                filename: file.name,
                category: 'receipts',
                title: `رسید فاکتور خرید ${purchaseInvoiceNumber || ''}`,
              });
              const url = res.url || res.fileUrl || (reader.result as string);
              setPurchaseReceiptImages((prev) => [...prev, url]);
              successCount++;
            } catch {
              setPurchaseReceiptImages((prev) => [...prev, reader.result as string]);
              successCount++;
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      if (successCount > 0) {
        showToast(`${successCount} تصویر پیوست فاکتور با موفقیت افزوده شد.`, 'success');
      }
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleCheckMarketPrice = async (productId: string, productName: string) => {
    setCheckingMarketProductId(productId);
    try {
      const res = await fetch(`/api/torob/multi-market?query=${encodeURIComponent(productName)}`).then((r) => r.json());
      const minPrice = res?.result?.minPrice;
      if (minPrice && minPrice > 0) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, lastMarketPrice: minPrice, lastMarketCheckedAt: new Date().toISOString() }
              : p
          )
        );
        api.updateProduct(productId, { lastMarketPrice: minPrice }).catch(() => {});
        showToast(`کف قیمت بازار برای «${productName}»: ${formatToman(minPrice)}`, 'success');
      } else {
        showToast('قیمتی در بازار آنلاین یافت نشد.', 'info');
      }
    } catch {
      showToast('خطا در استعلام قیمت بازار', 'error');
    } finally {
      setCheckingMarketProductId(null);
    }
  };

  const handleAddPurchaseItem = (product: Product) => {
    setPurchaseItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.buyPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          buyPrice: product.buyPrice,
          total: product.buyPrice,
        },
      ];
    });
  };

  const processPurchaseBarcodeScan = (scannedCode: string) => {
    const clean = toEnglishDigits(scannedCode).replace(/[\r\n\t]/g, '').trim();
    if (!clean) return;

    setIsPurchaseScannerPaused(true);

    const match = findProductByBarcodeOrCode<Product>(products, clean);
    if (!match) {
      setPurchaseUnknownBarcode(clean);
      return;
    }

    const cleanedQuery = clean;
    const cleanedBoxBarcode = toEnglishDigits((match as any).boxBarcode || '').trim();
    const isBox = Boolean(cleanedBoxBarcode) && cleanedBoxBarcode === cleanedQuery;

    const existing = purchaseItems.find((i) => i.productId === match.id);
    const currentQty = existing ? existing.quantity : 0;

    setPurchaseQuantityModal({
      product: match,
      mode: isBox ? 'box' : 'unit',
      currentQtyInInvoice: currentQty,
    });
  };

  const handleConfirmPurchaseQuantity = (qty: number) => {
    if (!purchaseQuantityModal) return;
    const { product } = purchaseQuantityModal;

    setPurchaseItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.buyPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: qty,
          buyPrice: product.buyPrice,
          total: qty * product.buyPrice,
        },
      ];
    });

    showToast(`«${product.name}» (${toPersianDigits(qty)} ${product.unit || 'عدد'}) به فاکتور خرید اضافه شد.`, 'success');
    setPurchaseQuantityModal(null);

    if (isPurchaseScannerOpen) {
      setIsPurchaseScannerPaused(false);
    }
  };

  const handleCancelPurchaseQuantity = () => {
    setPurchaseQuantityModal(null);
    if (isPurchaseScannerOpen) {
      setIsPurchaseScannerPaused(false);
    }
  };

  const handleRetryPurchaseUnknownBarcode = () => {
    setPurchaseUnknownBarcode(null);
    if (isPurchaseScannerOpen) {
      setIsPurchaseScannerPaused(false);
    }
  };

  const handleQuickAddPurchaseUnknownBarcode = () => {
    const code = purchaseUnknownBarcode || '';
    setPurchaseQuickAddBarcode(code);
    setPurchaseUnknownBarcode(null);
    setShowQuickAddModal(true);
  };

  const handleCancelPurchaseUnknownBarcode = () => {
    setPurchaseUnknownBarcode(null);
    if (isPurchaseScannerOpen) {
      setIsPurchaseScannerPaused(false);
    }
  };

  // Hardware scanner listener for Purchase Invoice
  useHardwareBarcodeScanner({
    onScan: (scannedCode) => {
      if (showNewPurchaseModal) {
        processPurchaseBarcodeScan(scannedCode);
      }
    },
    enabled:
      showNewPurchaseModal &&
      !purchaseQuantityModal &&
      !purchaseUnknownBarcode &&
      !showQuickAddModal,
  });

  const handleProductCreatedFromModal = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    setShowQuickAddModal(false);
    showToast(`کالای «${newProd.name}» با موفقیت تعریف شد.`, 'success');
    setPurchaseQuantityModal({
      product: newProd,
      mode: 'unit',
      currentQtyInInvoice: 0,
    });
  };

  const handleAddReturnItem = (product: Product) => {
    setReturnItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unit: product.unit || 'عدد',
          quantity: 1,
          unitPrice: product.salePrice,
          totalPrice: product.salePrice,
          reasonCategory: returnReasonCategory,
        },
      ];
    });
  };

  const handleSavePurchaseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseItems.length) {
      showToast('اقلام فاکتور خرید خالی است.', 'warning');
      return;
    }

    const grossTotal = purchaseItems.reduce((s, i) => s + (i.total || i.quantity * i.buyPrice), 0);
    const discountVal = Number(purchaseDiscount) || 0;
    const finalPayable = Math.max(0, grossTotal - discountVal);

    const cashPart = (purchasePaymentMethod === 'cash' || purchasePaymentMethod === 'mixed')
      ? (Number(purchaseCashAmount) || 0)
      : 0;
    const chequeTotal = (purchasePaymentMethod === 'cheque' || purchasePaymentMethod === 'mixed')
      ? purchaseCheques.reduce((s, c) => s + (Number(c.amount) || 0), 0)
      : 0;
    const totalPaid = cashPart + chequeTotal;

    // ۱. اعتبارسنجی: مجموع مبالغ پرداختی نمی‌تواند بیشتر از مبلغ نهایی فاکتور باشد
    if (totalPaid > finalPayable) {
      showToast(
        `مجموع مبالغ پرداختی (${formatToman(totalPaid)}) بیشتر از مبلغ نهایی فاکتور (${formatToman(finalPayable)}) است.`,
        'warning'
      );
      return;
    }

    // ۲. اعتبارسنجی فیلدهای چک و شماره شبا
    if (purchasePaymentMethod === 'cheque' || purchasePaymentMethod === 'mixed') {
      if (purchasePaymentMethod === 'cheque' && purchaseCheques.length === 0) {
        showToast('لطفاً حداقل یک فقره چک برای تسویه فاکتور ثبت کنید.', 'warning');
        return;
      }
      for (let idx = 0; idx < purchaseCheques.length; idx++) {
        const c = purchaseCheques[idx];
        if (!c.chequeNumber?.trim() || !c.dueDate || !c.amount || Number(c.amount) <= 0) {
          showToast(`اطلاعات چک ردیف ${idx + 1} (شماره چک، تاریخ سررسید، مبلغ معتبر) ناقص است.`, 'warning');
          return;
        }
        if (c.shebaNumber) {
          const cleanSheba = c.shebaNumber.replace(/^IR/i, '').replace(/\s+/g, '');
          if (cleanSheba.length !== 24 || !/^\d{24}$/.test(cleanSheba)) {
            showToast(`شماره شبای چک ردیف ${idx + 1} باید دقیقاً ۲۴ رقم باشد.`, 'warning');
            return;
          }
        }
      }
    }

    try {
      const invoiceResult = await api.createPurchaseInvoice({
        supplierId: purchaseSupplierId,
        warehouseId: purchaseWarehouseId,
        items: purchaseItems,
        totalAmount: grossTotal,
        discount: discountVal,
        paidAmount: totalPaid,
        cashAmount: cashPart,
        chequeAmount: chequeTotal,
        cheques: purchaseCheques,
        paymentMethod: purchasePaymentMethod,
        receiptImageUrls: purchaseReceiptImages,
        receiptImageUrl: purchaseReceiptImages[0] || undefined,
        invoiceNumber: purchaseInvoiceNumber.trim() || undefined,
        invoiceDate: purchaseInvoiceDate.trim() || undefined,
      });

      // ۳. ثبت خودکار چک‌ها در ماژول چک‌ها (نوع: پرداختی به پخش/تامین‌کننده)
      if (purchasePaymentMethod === 'cheque' || purchasePaymentMethod === 'mixed') {
        const supObj = suppliers.find((s) => s.id === purchaseSupplierId);
        const supName = supObj?.name || 'تامین‌کننده';
        const invNumber = invoiceResult?.invoice?.invoiceNumber || purchaseInvoiceNumber.trim() || '';
        const invId = invoiceResult?.invoice?.id;

        for (const chq of purchaseCheques) {
          try {
            const cleanSheba = chq.shebaNumber ? chq.shebaNumber.replace(/^IR/i, '').replace(/\s+/g, '') : undefined;
            await api.createCheque({
              chequeNumber: chq.chequeNumber.trim(),
              sayadId: chq.sayadId?.trim() || '0000000000000000',
              type: 'paid', // چک صادرشده توسط ما به تامین‌کننده
              bankName: chq.bankName.trim() || 'بانک',
              amount: Number(chq.amount),
              dueDate: chq.dueDate,
              shebaNumber: cleanSheba,
              entityId: purchaseSupplierId,
              entityName: supName,
              invoiceId: invId,
              invoiceNumber: invNumber,
              notes: `بابت فاکتور خرید ${invNumber}${cleanSheba ? ` — شبا: IR${cleanSheba}` : ''}`,
              status: 'pending',
            });
          } catch (chequeErr) {
            console.warn('ثبت خودکار چک در ماژول چک‌ها ناموفق بود:', chequeErr);
          }
        }
      }

      showToast(
        'فاکتور خرید با موفقیت ثبت، موجودی انبار به‌روزرسانی، و چک‌های مربوطه در ماژول چک‌ها درج شدند.',
        'success'
      );
      api.deletePurchaseDraft().catch(() => {});
      setShowNewPurchaseModal(false);
      setPurchaseItems([]);
      setPurchaseCashAmount(0);
      setPurchaseCheques([]);
      setPurchaseReceiptImages([]);
      setPurchaseInvoiceNumber('');
      setPurchaseInvoiceDate(new Date().toLocaleDateString('fa-IR'));
      setPurchaseDiscount(0);
      setPurchasePaymentMethod('cash');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت فاکتور خرید', 'error');
    }
  };

  const handleSaveReturnInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnItems.length) {
      showToast('لطفاً حداقل یک قلم کالا را به عنوان مرجوعی اضافه کنید.', 'warning');
      return;
    }
    const finalCustName = returnCustomerName.trim() || 'مشتری حضوری';

    const totalRefund = returnItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    setIsSubmittingReturn(true);
    try {
      const res = await api.createReturnInvoice({
        customerId: returnCustomerId || undefined,
        customerName: finalCustName,
        customerMobile: returnCustomerMobile.trim() || undefined,
        type: 'sales_return',
        reasonCategory: returnReasonCategory,
        reasonNote: returnReasonNote,
        items: returnItems,
        totalRefundAmount: totalRefund,
        refundMethod: returnRefundMethod,
        warehouseId: returnWarehouseId,
      });

      showToast(res.message || 'سند مرجوعی با موفقیت ثبت و انبار مربوطه به‌روز شد.', 'success');
      setShowNewReturnModal(false);
      setReturnItems([]);
      setReturnReasonNote('');
      setReturnCustomerName('');
      setReturnCustomerMobile('');
      setReturnCustomerId('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت فاکتور مرجوعی', 'error');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleOpenEditSalesInvoice = (inv: SalesInvoice) => {
    setEditingSalesInvoice(inv);
    setEditCustomerId(inv.customerId || '');
    setEditCustomerName(inv.customerName || 'مشتری نقدی حضوری');
    setEditCustomerMobile(inv.customerMobile || '');
    setEditPaymentMethod(inv.paymentMethod || 'cash');
    setEditPaidAmount(inv.paidAmount ?? inv.finalAmount);
    setEditDiscount(inv.discount || 0);
    const calculatedTaxRate =
      inv.tax && inv.subtotal
        ? Math.round((inv.tax / Math.max(1, inv.subtotal - (inv.discount || 0))) * 100)
        : 0;
    setEditTaxRate(calculatedTaxRate);
    setEditWarehouseId(inv.warehouseId || 'wh_central');
    setEditNotes(inv.notes || '');
    setEditProductSearchTerm('');
    setEditItems(
      (inv.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)),
        isService: (it as any).isService,
      }))
    );
  };

  const handleEditItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setEditItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, quantity: newQty, total: newQty * it.unitPrice } : it
      )
    );
  };

  const handleEditItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setEditItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, unitPrice: newPrice, total: it.quantity * newPrice } : it
      )
    );
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProductToEdit = (prod: Product) => {
    const existingIndex = editItems.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      handleEditItemQuantity(existingIndex, editItems[existingIndex].quantity + 1);
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.salePrice,
          total: prod.salePrice,
        },
      ]);
    }
    setEditProductSearchTerm('');
  };

  const handleSaveEditSalesInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalesInvoice) return;
    if (editItems.length === 0) {
      showToast('حداقل باید یک کالا در فاکتور فروش وجود داشته باشد.', 'warning');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await api.updateSalesInvoice(editingSalesInvoice.id, {
        items: editItems,
        customerId: editCustomerId || undefined,
        customerName: editCustomerName.trim() || 'مشتری نقدی حضوری',
        customerMobile: editCustomerMobile.trim() || undefined,
        paymentMethod: editPaymentMethod,
        paidAmount: Number(editPaidAmount) || 0,
        discount: Number(editDiscount) || 0,
        taxRate: Number(editTaxRate) || 0,
        warehouseId: editWarehouseId,
        notes: editNotes,
      });

      showToast(res.message || 'فاکتور فروش با موفقیت ویرایش شد و انبار و حساب‌ها به‌روزرسانی شدند.', 'success');
      setEditingSalesInvoice(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ویرایش فاکتور فروش', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenEditPurchaseInvoice = (inv: PurchaseInvoice) => {
    setEditingPurchaseInvoice(inv);
    setEditPurchaseSupplierId(inv.supplierId || '');
    setEditPurchaseInvoiceNumber(inv.invoiceNumber || '');
    setEditPurchaseInvoiceDate(inv.invoiceDate || new Date(inv.createdAt).toLocaleDateString('fa-IR'));
    setEditPurchaseWarehouseId(inv.warehouseId || 'wh_central');
    setEditPurchaseDiscount(inv.discount || 0);
    setEditPurchasePaymentMethod((inv.paymentMethod as any) || 'cash');
    setEditPurchaseCashAmount(inv.cashAmount || 0);
    setEditPurchasePaidAmount(inv.paidAmount ?? inv.totalAmount);
    
    // Normalize cheques (support both array and legacy chequeInfo)
    const existingCheques: ChequeInfo[] = Array.isArray(inv.cheques) && inv.cheques.length > 0
      ? inv.cheques
      : inv.chequeInfo
      ? [inv.chequeInfo]
      : [];
    setEditPurchaseCheques(existingCheques);

    setEditPurchaseNotes(inv.notes || '');
    setEditPurchaseReceiptImages(
      inv.receiptImageUrls && inv.receiptImageUrls.length > 0
        ? inv.receiptImageUrls
        : inv.receiptImageUrl
        ? [inv.receiptImageUrl]
        : []
    );
    setEditPurchaseItems(
      (inv.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: Number(it.quantity) || 1,
        buyPrice: Number(it.buyPrice) || 0,
        total: Number(it.total) || (Number(it.quantity) * Number(it.buyPrice)),
      }))
    );
    setEditPurchaseProductSearch('');
  };

  const handleEditPurchaseItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setEditPurchaseItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, quantity: newQty, total: newQty * it.buyPrice } : it
      )
    );
  };

  const handleEditPurchaseItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setEditPurchaseItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, buyPrice: newPrice, total: it.quantity * newPrice } : it
      )
    );
  };

  const handleRemoveEditPurchaseItem = (index: number) => {
    setEditPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddEditPurchaseItem = (product: Product) => {
    const existingIndex = editPurchaseItems.findIndex((it) => it.productId === product.id);
    if (existingIndex >= 0) {
      handleEditPurchaseItemQuantity(existingIndex, editPurchaseItems[existingIndex].quantity + 1);
    } else {
      const defaultBuyPrice = product.buyPrice || 0;
      setEditPurchaseItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          buyPrice: defaultBuyPrice,
          total: defaultBuyPrice,
        },
      ]);
    }
    setEditPurchaseProductSearch('');
  };

  const handleAddEditPurchaseCheque = () => {
    setEditPurchaseCheques((prev) => [
      ...prev,
      {
        chequeNumber: '',
        bankName: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0,
        sayadId: '',
        shebaNumber: '',
      },
    ]);
  };

  const handleRemoveEditPurchaseCheque = (idx: number) => {
    setEditPurchaseCheques((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditReceiptFilesUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setIsUploadingEditReceipt(true);
    let successCount = 0;
    try {
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) continue;
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const res = await api.uploadFile({
                dataUrl: reader.result as string,
                filename: file.name,
                category: 'receipts',
                title: `رسید ویرایش فاکتور خرید ${editPurchaseInvoiceNumber || ''}`,
              });
              const url = res.url || res.fileUrl || (reader.result as string);
              setEditPurchaseReceiptImages((prev) => [...prev, url]);
              successCount++;
            } catch {
              setEditPurchaseReceiptImages((prev) => [...prev, reader.result as string]);
              successCount++;
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      if (successCount > 0) {
        showToast(`${successCount} تصویر پیوست فاکتور با موفقیت افزوده شد.`, 'success');
      }
    } finally {
      setIsUploadingEditReceipt(false);
    }
  };

  const handleConfirmDeletePurchaseInvoice = async () => {
    if (!deletingPurchaseInvoiceTarget) return;
    setIsDeletingPurchaseInvoice(true);
    try {
      const res = await api.deletePurchaseInvoice(deletingPurchaseInvoiceTarget.id);
      showToast(res.message || 'فاکتور خرید با موفقیت حذف شد و انبار و اسناد مالی برگشت داده شدند.', 'success');
      setDeletingPurchaseInvoiceTarget(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف فاکتور خرید', 'error');
    } finally {
      setIsDeletingPurchaseInvoice(false);
    }
  };

  const handleSaveEditPurchaseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchaseInvoice) return;
    if (editPurchaseItems.length === 0) {
      showToast('حداقل یک قلم کالا در فاکتور خرید الزامی است.', 'warning');
      return;
    }
    const sup = suppliers.find((s) => s.id === editPurchaseSupplierId);

    setIsSubmittingEditPurchase(true);
    try {
      const subtotal = editPurchaseItems.reduce((acc, it) => acc + (it.total || it.quantity * it.buyPrice), 0);
      const disc = Number(editPurchaseDiscount) || 0;
      const finalAmount = Math.max(0, subtotal - disc);

      let computedPaid = 0;
      let computedCash = 0;
      let computedCheque = 0;

      if (editPurchasePaymentMethod === 'cash') {
        computedPaid = Number(editPurchasePaidAmount) || finalAmount;
        computedCash = computedPaid;
      } else if (editPurchasePaymentMethod === 'cheque') {
        computedCheque = editPurchaseCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
        computedPaid = computedCheque;
      } else if (editPurchasePaymentMethod === 'mixed') {
        computedCash = Number(editPurchaseCashAmount) || 0;
        computedCheque = editPurchaseCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
        computedPaid = computedCash + computedCheque;
      } else if (editPurchasePaymentMethod === 'credit') {
        computedPaid = 0;
      }

      const res = await api.updatePurchaseInvoice(editingPurchaseInvoice.id, {
        supplierId: editPurchaseSupplierId,
        supplierName: sup?.name || editingPurchaseInvoice.supplierName,
        items: editPurchaseItems,
        totalAmount: finalAmount,
        paidAmount: computedPaid,
        cashAmount: computedCash,
        chequeAmount: computedCheque,
        cheques: editPurchaseCheques,
        receiptImageUrls: editPurchaseReceiptImages,
        paymentMethod: editPurchasePaymentMethod,
        notes: editPurchaseNotes,
        warehouseId: editPurchaseWarehouseId,
        invoiceNumber: editPurchaseInvoiceNumber,
        invoiceDate: editPurchaseInvoiceDate,
        discount: disc,
      });

      showToast(res.message || 'فاکتور خرید با موفقیت ویرایش شد و تغییرات انبار و اسناد مالی اعمال گردید.', 'success');
      setEditingPurchaseInvoice(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ویرایش فاکتور خرید', 'error');
    } finally {
      setIsSubmittingEditPurchase(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Tabs & Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            فاکتورهای فروشگاهی (Sales)
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'purchase' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            فاکتورهای خرید انبار (Purchase)
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'returns' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مرجوعی کالا (خرابی / انصراف)</span>
          </button>
        </div>

        {activeTab === 'purchase' && (
          <button
            onClick={() => setShowNewPurchaseModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت فاکتور خرید جدید (ورود به انبار)</span>
          </button>
        )}

        {activeTab === 'returns' && (
          <button
            onClick={() => setShowNewReturnModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت سند مرجوعی کالا</span>
          </button>
        )}
      </div>

      {/* Sales Invoices List */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">شماره فاکتور</th>
                  <th className="p-3.5">نام مشتری / خریدار</th>
                  <th className="p-3.5">تاریخ ثبت</th>
                  <th className="p-3.5">مبلغ کل فاکتور</th>
                  <th className="p-3.5">شیوه تسویه</th>
                  <th className="p-3.5">صندوقدار</th>
                  <th className="p-3.5 text-center">عملیات و چاپ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900">{inv.customerName}</td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {new Date(inv.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 font-mono">{formatToman(inv.finalAmount)}</td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                        {inv.paymentMethod === 'pos_pasargad'
                          ? 'کارتخوان پاسارگاد'
                          : inv.paymentMethod === 'cash'
                          ? 'نقدی'
                          : (inv.paymentMethod as string) === 'cheque'
                          ? 'چک صیادی'
                          : 'نسیه / اعتباری'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">{inv.createdByName || 'فروشنده'}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowReceipt(true);
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                          title="چاپ فیش"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>چاپ فیش</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSalesInvoice(inv)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                          title="ویرایش فاکتور فروش"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Invoices List */}
      {activeTab === 'purchase' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">شماره فاکتور</th>
                  <th className="p-3.5">تامین‌کننده / شرکت پخش</th>
                  <th className="p-3.5">تاریخ فاکتور</th>
                  <th className="p-3.5">مبلغ کل فاکتور</th>
                  <th className="p-3.5">تخفیف</th>
                  <th className="p-3.5">مبلغ پرداخت شده</th>
                  <th className="p-3.5">باقی‌مانده (بدهی ما)</th>
                  <th className="p-3.5 text-center">برگه فاکتور / رسید</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{inv.supplierName}</td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {inv.invoiceDate || new Date(inv.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{formatToman(inv.totalAmount)}</td>
                    <td className="p-3.5 font-mono text-emerald-600">
                      {inv.discount && inv.discount > 0 ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[11px]">
                          {formatToman(inv.discount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-emerald-600 font-mono font-bold">
                      <div>{formatToman(inv.paidAmount)}</div>
                      {inv.paymentMethod === 'mixed' && (
                        <div className="text-[10px] font-normal mt-0.5 space-y-0.5">
                          {Boolean(inv.cashAmount && inv.cashAmount > 0) && (
                            <span className="block text-indigo-700">نقد: {formatToman(inv.cashAmount)}</span>
                          )}
                          {Boolean(inv.cheques && inv.cheques.length > 0) && (
                            <span className="block text-amber-700 font-bold">
                              {inv.cheques.length} فقره چک ({formatToman(inv.chequeAmount || inv.cheques.reduce((s, c) => s + (c.amount || 0), 0))})
                            </span>
                          )}
                        </div>
                      )}
                      {inv.paymentMethod === 'cheque' && (
                        <div className="text-[10px] text-amber-700 font-normal mt-0.5 font-bold">
                          {inv.cheques && inv.cheques.length > 0
                            ? `${inv.cheques.length} فقره چک (${formatToman(inv.chequeAmount || inv.paidAmount)})`
                            : (inv.chequeInfo ? `چک: ${inv.chequeInfo.chequeNumber}` : 'تسویه با چک')}
                        </div>
                      )}
                      {inv.paymentMethod === 'credit' && (
                        <div className="text-[10px] text-rose-600 font-normal mt-0.5">نسیه (دفتری)</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-rose-600">
                      {inv.remainingAmount > 0 ? (
                        formatToman(inv.remainingAmount)
                      ) : (
                        <span className="text-emerald-600 font-normal">تسویه کامل</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {(() => {
                        const receipts = (inv.receiptImageUrls && inv.receiptImageUrls.length > 0)
                          ? inv.receiptImageUrls
                          : (inv.receiptImageUrl ? [inv.receiptImageUrl] : []);
                        if (receipts.length === 0) {
                          return <span className="text-slate-400 text-[11px]">ندارد</span>;
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingReceiptUrls(receipts);
                              setActiveReceiptIndex(0);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                            title="مشاهده تصویر فاکتور/رسید"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهده برگه {receipts.length > 1 ? `(${receipts.length} عکس)` : ''}</span>
                          </button>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPurchaseInvoice(inv)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                          title="ویرایش فاکتور خرید"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPurchaseInvoiceTarget(inv)}
                          disabled={isDeletingPurchaseInvoice}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                          title="حذف کامل فاکتور خرید"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Invoices List */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {returnInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-3">
              <RotateCcw className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <div className="font-bold text-slate-700">هنوز هیچ فاکتور مرجوعی ثبت نشده است.</div>
              <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                در صورت عیب و نقص کالای مشتری (انتقال به انبار ضایعات) یا انصراف از خرید (بازگشت به انبار سالم)، با دکمه «ثبت سند مرجوعی کالا» فرآیند را ثبت کنید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">شماره مرجوعی</th>
                    <th className="p-3.5">نام مشتری / خریدار</th>
                    <th className="p-3.5">علت مرجوعی و مقصد انبار</th>
                    <th className="p-3.5">تاریخ ثبت</th>
                    <th className="p-3.5">اقلام مرجوعی</th>
                    <th className="p-3.5">مبلغ استرداد</th>
                    <th className="p-3.5">شیوه استرداد وجه</th>
                    <th className="p-3.5">ثبت‌کننده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnInvoices.map((rtn) => {
                    const isDefective = rtn.reasonCategory === 'defective';
                    return (
                      <tr key={rtn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-rose-600">{rtn.returnNumber}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{rtn.customerName}</div>
                          {rtn.customerMobile && (
                            <div className="text-[11px] text-slate-500 font-mono">{toPersianDigits(rtn.customerMobile)}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {isDefective ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 font-bold px-2 py-0.5 rounded-md text-[11px] w-fit">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                🔴 خرابی و عیب کالا
                              </span>
                              <span className="text-[10px] text-slate-500">انتقال به: <strong>انبار ضایعات و قرنطینه</strong></span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-md text-[11px] w-fit">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                🟢 انصراف / نخواستن مشتری
                              </span>
                              <span className="text-[10px] text-slate-500">انتقال به: <strong>انبار سالم فروشگاه</strong></span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono">
                          {new Date(rtn.createdAt).toLocaleDateString('fa-IR')}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            {rtn.items.map((it, i) => (
                              <div key={i} className="text-slate-800 text-[11px]">
                                • <strong>{it.productName}</strong> ({toPersianDigits(it.quantity)} {it.unit || 'عدد'})
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold font-mono text-rose-600">
                          {formatToman(rtn.totalRefundAmount)}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            {rtn.refundMethod === 'customer_credit'
                              ? 'شارژ بستانکاری حساب مشتری'
                              : rtn.refundMethod === 'cash'
                              ? 'نقدی از صندوق'
                              : rtn.refundMethod === 'bank_transfer'
                              ? 'انتقال بانکی / کارت به کارت'
                              : 'بدون استرداد'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 text-[11px]">{rtn.createdByUserName || 'مدیر سیستم'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Purchase Modal */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">ثبت فاکتور خرید و ورود کالا به انبار</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    کنترل هوشمند قیمت خرید با بازار، ثبت تخفیف، و الصاق تصویر برگه فاکتور تامین‌کننده
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* بنر بازیابی پیش‌نویس فاکتور خرید */}
            {purchaseDraftBanner && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs shrink-0">
                <span className="font-bold text-amber-800">
                  یک فاکتور خرید نیمه‌کاره از قبل ذخیره شده است. ادامه می‌دهید یا فاکتور جدید شروع می‌کنید؟
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const d = purchaseDraftBanner;
                      if (d.purchaseSupplierId !== undefined) setPurchaseSupplierId(d.purchaseSupplierId);
                      if (d.purchaseInvoiceNumber !== undefined) setPurchaseInvoiceNumber(d.purchaseInvoiceNumber);
                      if (d.purchaseInvoiceDate !== undefined) setPurchaseInvoiceDate(d.purchaseInvoiceDate);
                      if (d.purchaseDiscount !== undefined) setPurchaseDiscount(d.purchaseDiscount);
                      if (d.purchasePaymentMethod !== undefined) setPurchasePaymentMethod(d.purchasePaymentMethod);
                      if (d.purchaseCashAmount !== undefined) setPurchaseCashAmount(d.purchaseCashAmount);
                      if (d.purchaseCheques !== undefined) setPurchaseCheques(d.purchaseCheques);
                      if (d.purchaseReceiptImages !== undefined) setPurchaseReceiptImages(d.purchaseReceiptImages);
                      if (d.purchaseItems !== undefined) setPurchaseItems(d.purchaseItems);
                      if (d.purchaseWarehouseId !== undefined) setPurchaseWarehouseId(d.purchaseWarehouseId);
                      setPurchaseDraftBanner(null);
                      showToast('پیش‌نویس فاکتور خرید بازیابی شد.', 'success');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    ادامه بده
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      api.deletePurchaseDraft().catch(() => {});
                      setPurchaseDraftBanner(null);
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    فاکتور جدید
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSavePurchaseInvoice} className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Top metadata grid: Supplier, Warehouse, Invoice Number, Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">انتخاب تامین‌کننده / توزیع‌کننده:</label>
                  <select
                    value={purchaseSupplierId}
                    onChange={(e) => setPurchaseSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.mobile}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <WarehouseIcon className="w-3.5 h-3.5 text-indigo-600" />
                    ورود به انبار / شعبه:
                  </label>
                  <select
                    value={purchaseWarehouseId}
                    onChange={(e) => setPurchaseWarehouseId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type === 'central_warehouse' ? 'انبار مرکزی' : 'فروشگاه'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">شماره فاکتور تامین‌کننده (اختیاری):</label>
                  <input
                    type="text"
                    value={purchaseInvoiceNumber}
                    onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                    placeholder="مثال: ۱۲۴۴۰ یا INV-981"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    تاریخ فاکتور تامین‌کننده:
                  </label>
                  <input
                    type="text"
                    value={purchaseInvoiceDate}
                    onChange={(e) => setPurchaseInvoiceDate(e.target.value)}
                    placeholder="مثال: ۱۴۰۳/۰۶/۱۵"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold font-mono"
                  />
                </div>
              </div>

              {/* Searchable Product Selector Box */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-indigo-600" />
                    <span>جستجو و انتخاب کالا برای فاکتور خرید:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPurchaseScannerOpen(true);
                        setIsPurchaseScannerPaused(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-colors"
                      title="اسکن بارکد با دوربین برای افزودن به فاکتور خرید"
                    >
                      <Camera className="w-4 h-4" />
                      <span>[ 📷 اسکن بارکد ]</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddInitialName(productSearchTerm);
                        setPurchaseQuickAddBarcode('');
                        setShowQuickAddModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ تعریف کالای جدید</span>
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="جستجوی نام کالا، کد، یا بارکد (مثال: خودکار کیان، کلاسور، زونکن، پاک‌کن...)"
                    className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 pr-9 text-xs outline-none transition-colors"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  {productSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setProductSearchTerm('')}
                      className="absolute left-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown / Panel */}
                {productSearchTerm.trim() !== '' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {(() => {
                      const q = productSearchTerm.toLowerCase();
                      const matched = products.filter(
                        (p) =>
                          p.name.toLowerCase().includes(q) ||
                          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                          (p.code && p.code.toLowerCase().includes(q))
                      );

                      if (matched.length > 0) {
                        return matched.slice(0, 8).map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs truncate">{p.name}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span>موجودی: {toPersianDigits(p.stock)} {p.unit || 'عدد'}</span>
                                  <span>•</span>
                                  <span>آخرین خرید: {formatToman(p.buyPrice)}</span>
                                  {p.lastMarketPrice && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-600 font-bold">کف بازار: {formatToman(p.lastMarketPrice)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleAddPurchaseItem(p);
                                setProductSearchTerm('');
                              }}
                              className="shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              + افزودن به فاکتور
                            </button>
                          </div>
                        ));
                      }

                      return (
                        <div className="p-4 text-center space-y-2">
                          <div className="text-slate-500 text-xs">
                            کالایی با عنوان «<span className="font-bold text-slate-800">{productSearchTerm}</span>» در سیستم یافت نشد.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddInitialName(productSearchTerm);
                              setShowQuickAddModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>تعریف سریع «{productSearchTerm}» با استعلام بازار و افزودن به فاکتور</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Quick suggestion tags if search term is empty */}
                {productSearchTerm.trim() === '' && (
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-500 font-medium">اقلام پرکاربرد (کلیک جهت افزودن سریع):</div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {products.slice(0, 10).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddPurchaseItem(p)}
                          className="bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          + {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Selected */}
              {purchaseItems.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5">نام کالا و کنترل قیمت بازار</th>
                        <th className="p-2.5 text-center w-24">تعداد خرید</th>
                        <th className="p-2.5 text-center w-32">قیمت خرید فی (تومان)</th>
                        <th className="p-2.5 text-left w-28">جمع</th>
                        <th className="p-2.5 text-center w-12">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseItems.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        const marketPrice = prod?.lastMarketPrice;
                        const hasMarket = Boolean(marketPrice && marketPrice > 0);
                        const isMoreExpensive = hasMarket && item.buyPrice > (marketPrice || 0);
                        const diff = isMoreExpensive ? item.buyPrice - (marketPrice || 0) : 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">{item.productName}</div>
                              {/* Market Price Alert Badge */}
                              {hasMarket ? (
                                isMoreExpensive ? (
                                  <div className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md font-bold mt-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>
                                      ⚠️ {formatToman(diff)} گران‌تر از کف بازار ({formatToman(marketPrice!)})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md font-bold mt-1">
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>✅ قیمت عالی (کف بازار: {formatToman(marketPrice!)})</span>
                                  </div>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCheckMarketPrice(item.productId, item.productName)}
                                  disabled={checkingMarketProductId === item.productId}
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md font-bold mt-1 transition-colors cursor-pointer"
                                >
                                  {checkingMarketProductId === item.productId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  <span>استعلام زنده بازار</span>
                                </button>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const q = Number(e.target.value);
                                  setPurchaseItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, quantity: q, total: q * it.buyPrice } : it))
                                  );
                                }}
                                className="w-16 bg-slate-100 border border-slate-200 rounded-lg p-1.5 font-mono text-center outline-none focus:bg-white focus:border-indigo-500 font-bold"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                step={500}
                                value={item.buyPrice}
                                onChange={(e) => {
                                  const bp = Number(e.target.value);
                                  setPurchaseItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, buyPrice: bp, total: it.quantity * bp } : it))
                                  );
                                }}
                                className="w-28 bg-slate-100 border border-slate-200 rounded-lg p-1.5 font-mono text-center outline-none focus:bg-white focus:border-indigo-500 font-bold"
                              />
                            </td>
                            <td className="p-2.5 font-bold font-mono text-slate-900 text-left">
                              {formatToman(item.total)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setPurchaseItems((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف ردیف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Calculation & Settlement System */}
              {(() => {
                const grossTotal = purchaseItems.reduce((s, i) => s + i.total, 0);
                const discountVal = Number(purchaseDiscount) || 0;
                const finalPayable = Math.max(0, grossTotal - discountVal);
                const cashPart = (purchasePaymentMethod === 'cash' || purchasePaymentMethod === 'mixed')
                  ? (Number(purchaseCashAmount) || 0)
                  : 0;
                const chequeTotal = (purchasePaymentMethod === 'cheque' || purchasePaymentMethod === 'mixed')
                  ? purchaseCheques.reduce((s, c) => s + (Number(c.amount) || 0), 0)
                  : 0;
                const totalPaid = cashPart + chequeTotal;
                const remainingDebt = Math.max(0, finalPayable - totalPaid);

                return (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                    {/* Top Row: Gross, Discount, Final Payable */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-600 font-medium block mb-1 text-xs">جمع ناخالص اقلام:</label>
                        <div className="font-mono font-bold text-slate-800 text-sm bg-white p-2.5 rounded-xl border border-slate-200">
                          {formatToman(grossTotal)}
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1 text-xs flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تخفیف فاکتور (تومان):</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={purchaseDiscount}
                          onChange={(e) =>
                            setPurchaseDiscount(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder="۰"
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl p-2 font-mono font-bold text-emerald-700 outline-none text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-slate-800 font-black block mb-1 text-xs">مبلغ نهایی فاکتور خرید:</label>
                        <div className="font-mono font-black text-indigo-700 text-sm bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200">
                          {formatToman(finalPayable)}
                        </div>
                      </div>
                    </div>

                    {/* Settlement Method Selector */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <label className="font-bold text-slate-700 block text-xs">روش تسویه با تامین‌کننده:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { v: 'cash', l: 'نقدی کامل' },
                          { v: 'cheque', l: 'چک کامل' },
                          { v: 'mixed', l: 'ترکیبی (نقد + چک)' },
                          { v: 'credit', l: 'نسیه (بدون پرداخت)' },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setPurchasePaymentMethod(opt.v as any)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              purchasePaymentMethod === opt.v
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>

                      {/* Cash Input (Visible if cash or mixed) */}
                      {(purchasePaymentMethod === 'cash' || purchasePaymentMethod === 'mixed') && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">
                            مبلغ نقدی پرداختی (تومان):
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={10000}
                            value={purchaseCashAmount}
                            onChange={(e) =>
                              setPurchaseCashAmount(e.target.value === '' ? '' : Number(e.target.value))
                            }
                            placeholder="۰"
                            className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl p-2 font-mono outline-none font-bold text-xs"
                          />
                        </div>
                      )}

                      {/* Cheques Input (Visible if cheque or mixed) */}
                      {(purchasePaymentMethod === 'cheque' || purchasePaymentMethod === 'mixed') && (
                        <div className="space-y-3 bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5">
                          <div className="flex items-center justify-between">
                            <label className="font-black text-amber-900 text-xs flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-amber-700" />
                              <span>چک‌های تحویلی به تامین‌کننده / پخش:</span>
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setPurchaseCheques((prev) => [
                                  ...prev,
                                  {
                                    chequeNumber: '',
                                    bankName: 'بانک ملت',
                                    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                                    sayadId: '',
                                    shebaNumber: '',
                                    amount: 0,
                                  },
                                ])
                              }
                              className="text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>افزودن چک</span>
                            </button>
                          </div>

                          {purchaseCheques.map((cheque, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-amber-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs"
                            >
                              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <span className="font-bold text-[11px] text-amber-900">
                                  فقره چک شماره {toPersianDigits(idx + 1)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPurchaseCheques((prev) => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  حذف چک
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">شماره چک (سریال)</label>
                                  <input
                                    type="text"
                                    placeholder="مثال: 123456"
                                    value={cheque.chequeNumber}
                                    onChange={(e) =>
                                      setPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, chequeNumber: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">نام بانک صادرکننده</label>
                                  <input
                                    type="text"
                                    placeholder="مثال: بانک ملی / ملت / صادرات"
                                    value={cheque.bankName}
                                    onChange={(e) =>
                                      setPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, bankName: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">تاریخ سررسید چک</label>
                                  <input
                                    type="date"
                                    value={cheque.dueDate}
                                    onChange={(e) =>
                                      setPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, dueDate: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">مبلغ چک (تومان)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={10000}
                                    placeholder="۰"
                                    value={cheque.amount || ''}
                                    onChange={(e) =>
                                      setPurchaseCheques((prev) =>
                                        prev.map((c, i) =>
                                          i === idx ? { ...c, amount: Number(e.target.value) } : c
                                        )
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold outline-none focus:border-amber-500 text-indigo-900"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">
                                    شناسه ۱۶ رقمی صیاد (اختیاری)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="16 رقم صیادی"
                                    maxLength={16}
                                    value={cheque.sayadId || ''}
                                    onChange={(e) =>
                                      setPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, sayadId: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono outline-none focus:border-amber-500"
                                    dir="ltr"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">
                                    شماره شبا حساب صادرکننده (۲۴ رقم - اختیاری)
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2 text-[11px] font-mono text-slate-400 select-none">
                                      IR
                                    </span>
                                    <input
                                      type="text"
                                      placeholder="۲۴ رقم بدون IR"
                                      maxLength={26}
                                      value={cheque.shebaNumber || ''}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/^IR/i, '').replace(/\s+/g, '');
                                        setPurchaseCheques((prev) =>
                                          prev.map((c, i) => (i === idx ? { ...c, shebaNumber: clean } : c))
                                        );
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-8 text-xs font-mono outline-none focus:border-amber-500 text-slate-800"
                                      dir="ltr"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {purchaseCheques.length === 0 && (
                            <p className="text-[11px] text-amber-700 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200">
                              هنوز چکی اضافه نشده — برای درج چک‌های فاکتور، دکمهٔ «+ افزودن چک» را بزنید.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Summary Badges: Total Paid & Remaining Debt */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 font-bold flex items-center justify-between shadow-2xs">
                          <span className="text-slate-600">مجموع پرداختی (نقد + چک):</span>
                          <span className="font-mono text-indigo-700 font-black text-sm">
                            {formatToman(totalPaid)}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-xl border font-bold flex items-center justify-between shadow-2xs ${
                            remainingDebt > 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span>باقی‌مانده بدهی فاکتور:</span>
                          <span className="font-mono font-black text-sm">
                            {remainingDebt > 0 ? formatToman(remainingDebt) : 'تسویه کامل'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Multi-Image Receipt & Invoice Attachment */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>پیوست تصاویر فاکتور / فیش واریزی / برگه کاغذی (چند عکس مجاز):</span>
                  </div>
                  {purchaseReceiptImages.length > 0 && (
                    <span className="text-[11px] text-indigo-600 font-bold">
                      {purchaseReceiptImages.length} تصویر پیوست شده
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {purchaseReceiptImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 group shadow-xs bg-white"
                    >
                      <img
                        src={url}
                        alt={`رسید ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          setViewingReceiptUrls(purchaseReceiptImages);
                          setActiveReceiptIndex(idx);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setPurchaseReceiptImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 left-1 bg-black/70 hover:bg-rose-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                        title="حذف این تصویر"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[9px] text-white text-center py-0.5 font-mono">
                        {idx + 1}
                      </div>
                    </div>
                  ))}

                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600 transition-all group shadow-2xs">
                    {isUploadingReceipt ? (
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] mt-1 font-bold">افزودن عکس</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleReceiptFilesUpload(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ثبت فاکتور و اعمال در موجودی انبار
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      <QuickAddProductModal
        isOpen={showQuickAddModal}
        onClose={() => {
          setShowQuickAddModal(false);
          if (isPurchaseScannerOpen) setIsPurchaseScannerPaused(false);
        }}
        onProductCreated={handleProductCreatedFromModal}
        categories={categories}
        initialName={quickAddInitialName}
        initialBarcode={purchaseQuickAddBarcode}
      />

      {/* Purchase Invoice Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isPurchaseScannerOpen}
        onClose={() => {
          setIsPurchaseScannerOpen(false);
          setIsPurchaseScannerPaused(false);
          setPurchaseQuantityModal(null);
          setPurchaseUnknownBarcode(null);
        }}
        onScan={(scannedCode) => {
          processPurchaseBarcodeScan(scannedCode);
        }}
        continuousWorkflow={true}
        isPaused={isPurchaseScannerPaused}
        title="اسکنر سریع بارکد در فاکتور خرید"
        subtitle="برای ثبت اقلام فاکتور خرید، بارکد را اسکن کنید، سپس تعداد را تایید کنید تا اسکنر خودکار برای قلم بعدی فعال شود."
      />

      {/* Purchase Product Scan Quantity Modal */}
      {purchaseQuantityModal && (
        <ProductScanQuantityModal
          product={purchaseQuantityModal.product}
          mode={purchaseQuantityModal.mode}
          targetType="purchase"
          currentQtyInInvoice={purchaseQuantityModal.currentQtyInInvoice}
          confirmButtonText="تأیید و اسکن بعدی"
          onCancel={handleCancelPurchaseQuantity}
          onConfirm={handleConfirmPurchaseQuantity}
        />
      )}

      {/* Purchase Unknown Barcode Modal */}
      {purchaseUnknownBarcode && (
        <UnknownBarcodeModal
          barcode={purchaseUnknownBarcode}
          onRetry={handleRetryPurchaseUnknownBarcode}
          onQuickAdd={handleQuickAddPurchaseUnknownBarcode}
          onCancel={handleCancelPurchaseUnknownBarcode}
        />
      )}

      {/* Full-Screen Multi-Image Receipt Viewer Modal */}
      {viewingReceiptUrls.length > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-800">
                  تصویر برگه فاکتور / رسید تامین‌کننده ({activeReceiptIndex + 1} از {viewingReceiptUrls.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptUrls([])}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative max-h-[70vh] min-h-[250px] overflow-hidden flex items-center justify-center bg-slate-900/5 rounded-2xl p-2">
              <img
                src={viewingReceiptUrls[activeReceiptIndex]}
                alt={`تصویر فاکتور ${activeReceiptIndex + 1}`}
                className="max-h-[65vh] w-auto rounded-xl object-contain shadow-sm"
              />

              {viewingReceiptUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceiptIndex((prev) => (prev > 0 ? prev - 1 : viewingReceiptUrls.length - 1))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 cursor-pointer transition-colors shadow-md"
                    title="تصویر قبلی"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceiptIndex((prev) => (prev < viewingReceiptUrls.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 cursor-pointer transition-colors shadow-md"
                    title="تصویر بعدی"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {viewingReceiptUrls.length > 1 && (
              <div className="flex gap-2 justify-center overflow-x-auto py-1">
                {viewingReceiptUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveReceiptIndex(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      activeReceiptIndex === i
                        ? 'border-indigo-600 scale-105 shadow-xs'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`بندانگشتی ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <a
                href={viewingReceiptUrls[activeReceiptIndex]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>باز کردن در تب جدید</span>
              </a>
              <button
                type="button"
                onClick={() => setViewingReceiptUrls([])}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        invoice={selectedInvoice}
      />

      {/* New Return Invoice Modal */}
      {showNewReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  ثبت سند مرجوعی کالا (خرابی یا انصراف)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewReturnModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReturnInvoice} className="space-y-4 text-xs">
              {/* Reason Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  علت مرجوعی و تعیین مقصد کالا در انبار:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReturnReasonCategory('defective');
                      setReturnItems((prev) => prev.map((it) => ({ ...it, reasonCategory: 'defective' })));
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      returnReasonCategory === 'defective'
                        ? 'border-rose-500 bg-rose-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-rose-700">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>🔴 خرابی، شکستگی و عیب فیزیکی</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      کالا معیوب است و خودکار به <strong>«انبار ضایعات و قرنطینه»</strong> منتقل می‌شود.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReturnReasonCategory('unwanted');
                      setReturnItems((prev) => prev.map((it) => ({ ...it, reasonCategory: 'unwanted' })));
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      returnReasonCategory === 'unwanted'
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-emerald-700">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>🟢 انصراف، تغییر نظر یا کادویی (سالم)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      کالا کاملاً سالم است و به <strong>«انبار اصلی فروشگاه»</strong> جهت فروش بازمی‌گردد.
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">انتخاب مشتری ثبت شده (اختیاری):</label>
                  <select
                    value={returnCustomerId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setReturnCustomerId(cid);
                      const c = customers.find((x) => x.id === cid);
                      if (c) {
                        setReturnCustomerName(c.name);
                        setReturnCustomerMobile(c.mobile || '');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  >
                    <option value="">-- مشتری آزاد / ثبت دستی --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile || 'بدون همراه'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">نام یا عنوان خریدار مرجوعی:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: آقای حسینی / مشتری حضوری"
                    value={returnCustomerName}
                    onChange={(e) => setReturnCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  />
                </div>
              </div>

              {/* Select items for return */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-700">انتخاب کالا جهت افزودن به لیست مرجوعی:</div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddReturnItem(p)}
                      className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 px-2.5 py-1 rounded-lg text-slate-800 text-[11px] font-medium cursor-pointer transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Selected for Return */}
              {returnItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2">نام کالا</th>
                        <th className="p-2 text-center w-20">تعداد</th>
                        <th className="p-2 text-center w-28">قیمت واحد</th>
                        <th className="p-2">جمع استرداد</th>
                        <th className="p-2 text-center w-12">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold">{item.productName}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, Number(e.target.value));
                                setReturnItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantity: q, totalPrice: q * it.unitPrice } : it))
                                );
                              }}
                              className="w-16 mx-auto bg-slate-100 border border-slate-200 rounded p-1 font-mono text-center block"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const up = Number(e.target.value);
                                setReturnItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, unitPrice: up, totalPrice: it.quantity * up } : it))
                                );
                              }}
                              className="w-24 mx-auto bg-slate-100 border border-slate-200 rounded p-1 font-mono text-center block"
                            />
                          </td>
                          <td className="p-2 font-bold font-mono text-rose-600">
                            {formatToman(item.totalPrice)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setReturnItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 font-bold"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total & Refund Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نحوه استرداد وجه به خریدار:</label>
                  <select
                    value={returnRefundMethod}
                    onChange={(e) => setReturnRefundMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  >
                    <option value="cash">نقدی از صندوق مرکزی</option>
                    <option value="customer_credit">شارژ بستانکاری در حساب مشتری (کیف پول)</option>
                    <option value="bank_transfer">انتقال بانکی / کارت به کارت</option>
                    <option value="none">تعویض کالا (بدون استرداد وجه)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center items-end text-right">
                  <span className="text-slate-600 font-medium text-[11px]">مبلغ کل قابل استرداد:</span>
                  <span className="font-mono text-rose-600 font-black text-base mt-0.5">
                    {formatToman(returnItems.reduce((s, i) => s + i.totalPrice, 0))}
                  </span>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">توضیحات و شرح عیب (اختیاری):</label>
                <input
                  type="text"
                  placeholder="مثال: مغزی خودکار شکسته بود / رنگ نامناسب بود و باز نشده است"
                  value={returnReasonNote}
                  onChange={(e) => setReturnReasonNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReturn ? 'در حال ثبت مرجوعی...' : 'ثبت سند مرجوعی و به‌روزرسانی انبار'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewReturnModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sales Invoice Modal */}
      {editingSalesInvoice && (() => {
        const subtotal = editItems.reduce(
          (acc, curr) => acc + (Number(curr.quantity) * Number(curr.unitPrice)),
          0
        );
        const discountNum = Number(editDiscount) || 0;
        const taxableAmount = Math.max(0, subtotal - discountNum);
        const taxNum = Math.round((taxableAmount * (Number(editTaxRate) || 0)) / 100);
        const finalAmount = taxableAmount + taxNum;
        const paidNum = Number(editPaidAmount) || 0;
        const remainingDebt = Math.max(0, finalAmount - paidNum);

        const filteredProducts = editProductSearchTerm.trim()
          ? products.filter(
              (p) =>
                p.name.toLowerCase().includes(editProductSearchTerm.toLowerCase()) ||
                (p.barcode && p.barcode.includes(editProductSearchTerm)) ||
                (p.sku && p.sku.toLowerCase().includes(editProductSearchTerm.toLowerCase()))
            ).slice(0, 5)
          : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>ویرایش فاکتور فروش</span>
                      <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                        {editingSalesInvoice.invoiceNumber}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      تاریخ ثبت اولیه: {new Date(editingSalesInvoice.createdAt).toLocaleDateString('fa-IR')} | انبار و اسناد مالی خودکار همگام می‌شوند
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSalesInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditSalesInvoice} className="space-y-4 text-xs">
                {/* 1. Customer and Warehouse Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">مشتری ثبت شده:</label>
                    <select
                      value={editCustomerId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setEditCustomerId(cid);
                        const c = customers.find((x) => x.id === cid);
                        if (c) {
                          setEditCustomerName(c.name);
                          setEditCustomerMobile(c.mobile || '');
                        } else if (!cid) {
                          setEditCustomerName('مشتری نقدی حضوری');
                          setEditCustomerMobile('');
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none"
                    >
                      <option value="">-- مشتری آزاد / عمومی --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.mobile || 'بدون همراه'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">نام خریدار:</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      placeholder="نام خریدار"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">موبایل خریدار:</label>
                    <input
                      type="text"
                      value={editCustomerMobile}
                      onChange={(e) => setEditCustomerMobile(e.target.value)}
                      placeholder="۰۹۱۲..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 pt-1">
                    <label className="font-bold text-slate-700 block mb-1">انبار مبدا (کسر موجودی):</label>
                    <select
                      value={editWarehouseId}
                      onChange={(e) => setEditWarehouseId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.isCentral ? 'انبار مرکزی' : w.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      ⚠️ با ذخیره ویرایش، موجودی اقلام قبلی به انبار بازگشته و موجودی اقلام جدید از این انبار کسر خواهد شد.
                    </p>
                  </div>
                </div>

                {/* 2. Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <span>اقلام و کالاهای فاکتور ({editItems.length} قلم):</span>
                    </label>
                  </div>

                  {/* Add Product Search Bar */}
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="جستجوی نام یا بارکد کالا برای افزودن به فاکتور..."
                        value={editProductSearchTerm}
                        onChange={(e) => setEditProductSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-xs font-medium"
                      />
                      {editProductSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setEditProductSearchTerm('')}
                          className="text-slate-400 hover:text-slate-600 text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Search results dropdown */}
                    {filteredProducts.length > 0 && (
                      <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                        {filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleAddProductToEdit(p)}
                            className="p-2.5 hover:bg-indigo-50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                بارکد: {p.barcode || '—'} | قیمت فروش: {formatToman(p.salePrice)}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px]"
                            >
                              + افزودن
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">نام کالا</th>
                          <th className="p-2.5 w-32">قیمت واحد (تومان)</th>
                          <th className="p-2.5 w-28 text-center">تعداد</th>
                          <th className="p-2.5 w-32">جمع کل</th>
                          <th className="p-2.5 w-12 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-900">
                              {item.productName}
                              {item.isService && (
                                <span className="mr-1.5 text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-sm">
                                  خدمت
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleEditItemPrice(idx, Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs outline-none"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItemQuantity(idx, item.quantity - 1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleEditItemQuantity(idx, Math.max(1, Number(e.target.value)))}
                                  className="w-10 text-center font-mono font-bold bg-slate-50 border border-slate-200 rounded-md py-0.5 text-xs outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleEditItemQuantity(idx, item.quantity + 1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5 font-mono font-black text-slate-900">
                              {formatToman(item.quantity * item.unitPrice)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="حذف کالا"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              هیچ کالایی در فاکتور وجود ندارد. از کادر بالا کالا جستجو کرده و اضافه کنید.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Payment & Settlement Summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>شیوه پرداخت و تسویه حساب:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">شیوه پرداخت:</label>
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => {
                          const m = e.target.value as PaymentMethod;
                          setEditPaymentMethod(m);
                          if (m === 'credit') {
                            setEditPaidAmount(0);
                          } else {
                            setEditPaidAmount(finalAmount);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none"
                      >
                        <option value="cash">نقدی (صندوق)</option>
                        <option value="pos_pasargad">کارتخوان پاسارگاد</option>
                        <option value="credit">نسیه / دفتری (حساب مشتری)</option>
                        <option value="installment">اقساطی</option>
                        <option value="sms_link">لینک پرداخت پیامکی</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">مبلغ تخفیف (تومان):</label>
                      <input
                        type="number"
                        min="0"
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">درصد مالیات ارزش افزوده (%):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editTaxRate}
                        onChange={(e) => setEditTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">مبلغ پرداختی مشتری (تومان):</label>
                      <input
                        type="number"
                        min="0"
                        value={editPaidAmount}
                        onChange={(e) => setEditPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Summary Totals Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold">جمع اقلام (Subtotal)</div>
                      <div className="text-xs font-mono font-black text-slate-900 mt-0.5">{formatToman(subtotal)}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold">مالیات ({editTaxRate || 0}%)</div>
                      <div className="text-xs font-mono font-black text-slate-900 mt-0.5">{formatToman(taxNum)}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold">مبلغ نهایی فاکتور</div>
                      <div className="text-xs font-mono font-black text-indigo-700 mt-0.5">{formatToman(finalAmount)}</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${remainingDebt > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                      <div className="text-[10px] font-bold">{remainingDebt > 0 ? 'مانده بدهی (نسیه)' : 'وضعیت تسویه'}</div>
                      <div className="text-xs font-mono font-black mt-0.5">
                        {remainingDebt > 0 ? formatToman(remainingDebt) : 'تسویه کامل ✓'}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">یادداشت و توضیحات فاکتور:</label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="توضیحات اختیاری فاکتور..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره و به‌روزرسانی انبار...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ذخیره تغییرات فاکتور و اعمال در انبار و حسابداری</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSalesInvoice(null)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Edit Purchase Invoice Modal */}
      {editingPurchaseInvoice && (() => {
        const subtotal = editPurchaseItems.reduce((acc, it) => acc + (it.total || it.quantity * it.buyPrice), 0);
        const disc = Number(editPurchaseDiscount) || 0;
        const finalAmount = Math.max(0, subtotal - disc);

        let computedPaid = 0;
        if (editPurchasePaymentMethod === 'cash') {
          computedPaid = Number(editPurchasePaidAmount) || finalAmount;
        } else if (editPurchasePaymentMethod === 'cheque') {
          computedPaid = editPurchaseCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
        } else if (editPurchasePaymentMethod === 'mixed') {
          computedPaid = (Number(editPurchaseCashAmount) || 0) + editPurchaseCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
        } else if (editPurchasePaymentMethod === 'credit') {
          computedPaid = 0;
        }

        const remainingDebt = Math.max(0, finalAmount - computedPaid);

        const filteredProducts = editPurchaseProductSearch.trim()
          ? products.filter((p) =>
              p.name.toLowerCase().includes(editPurchaseProductSearch.toLowerCase()) ||
              (p.code && p.code.toLowerCase().includes(editPurchaseProductSearch.toLowerCase()))
            ).slice(0, 5)
          : [];

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-xs">
              {/* Header */}
              <div className="p-4 bg-amber-500/10 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-white">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>ویرایش فاکتور خرید شماره:</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900">
                        {editingPurchaseInvoice.invoiceNumber}
                      </span>
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      تامین‌کننده: {editingPurchaseInvoice.supplierName} | تغییرات اقلام مستقیماً در موجودی انبار و دفاتر مالی اعمال می‌گردد.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPurchaseInvoice(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEditPurchaseInvoice} className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Meta Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تامین‌کننده / شرکت پخش:
                    </label>
                    <select
                      value={editPurchaseSupplierId}
                      onChange={(e) => setEditPurchaseSupplierId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      شماره فاکتور خرید:
                    </label>
                    <input
                      type="text"
                      value={editPurchaseInvoiceNumber}
                      onChange={(e) => setEditPurchaseInvoiceNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 outline-none"
                      placeholder="INV-..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تاریخ فاکتور:
                    </label>
                    <input
                      type="text"
                      value={editPurchaseInvoiceDate}
                      onChange={(e) => setEditPurchaseInvoiceDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 outline-none"
                      placeholder="۱۴۰۳/۰۶/..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      انبار مقصد تحویل:
                    </label>
                    <select
                      value={editPurchaseWarehouseId}
                      onChange={(e) => setEditPurchaseWarehouseId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="font-bold text-slate-800 text-xs">
                      اقلام و کالاهای خریداری‌شده ({toPersianDigits(editPurchaseItems.length)} قلم):
                    </label>

                    {/* Quick Add Search */}
                    <div className="relative w-full sm:w-72">
                      <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={editPurchaseProductSearch}
                          onChange={(e) => setEditPurchaseProductSearch(e.target.value)}
                          placeholder="افزودن کالای دیگر به فاکتور..."
                          className="w-full bg-transparent text-xs outline-none text-slate-800"
                        />
                      </div>

                      {filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
                          {filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddEditPurchaseItem(p)}
                              className="w-full p-2 text-right hover:bg-amber-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-slate-800">{p.name}</span>
                              <span className="text-[11px] font-mono text-emerald-600">
                                {formatToman(p.buyPrice || 0)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">نام کالا</th>
                          <th className="p-2.5 w-36">قیمت خرید واحد (تومان)</th>
                          <th className="p-2.5 w-28 text-center">تعداد</th>
                          <th className="p-2.5 w-32">مجموع سطر</th>
                          <th className="p-2.5 w-12 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editPurchaseItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                value={item.buyPrice}
                                onChange={(e) => handleEditPurchaseItemPrice(idx, Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs outline-none"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditPurchaseItemQuantity(idx, item.quantity - 1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleEditPurchaseItemQuantity(idx, Math.max(1, Number(e.target.value)))}
                                  className="w-10 text-center font-mono font-bold bg-slate-50 border border-slate-200 rounded-md py-0.5 text-xs outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleEditPurchaseItemQuantity(idx, item.quantity + 1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5 font-bold font-mono text-slate-800">
                              {formatToman(item.total || item.quantity * item.buyPrice)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditPurchaseItem(idx)}
                                className="p-1 rounded-md text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial & Settlement Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تخفیف دریافت شده از تامین‌کننده (تومان):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editPurchaseDiscount}
                      onChange={(e) => setEditPurchaseDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      شیوه تسویه حساب:
                    </label>
                    <select
                      value={editPurchasePaymentMethod}
                      onChange={(e) => setEditPurchasePaymentMethod(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="cash">نقدی کامل (صندوق / تنخواه / کارت به کارت)</option>
                      <option value="cheque">پرداخت با چک صیادی</option>
                      <option value="mixed">ترکیبی (بخشی نقد + بخشی چک)</option>
                      <option value="credit">نسیه کامل (دفتری و امانی)</option>
                    </select>
                  </div>

                  {(editPurchasePaymentMethod === 'cash' || editPurchasePaymentMethod === 'mixed') && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        مبلغ پرداخت نقدی (تومان):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editPurchasePaymentMethod === 'mixed' ? editPurchaseCashAmount : editPurchasePaidAmount}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          if (editPurchasePaymentMethod === 'mixed') {
                            setEditPurchaseCashAmount(val);
                          } else {
                            setEditPurchasePaidAmount(val);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 outline-none"
                      />
                    </div>
                  )}

                  {/* Cheque Section for Cheque / Mixed payment */}
                  {(editPurchasePaymentMethod === 'cheque' || editPurchasePaymentMethod === 'mixed') && (
                    <div className="sm:col-span-2 space-y-2 bg-amber-500/10 p-3 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                          <Check className="w-4 h-4 text-amber-600" />
                          <span>اطلاعات چک‌های پرداختی به تامین‌کننده ({toPersianDigits(editPurchaseCheques.length)} فقره):</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddEditPurchaseCheque}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ افزودن چک</span>
                        </button>
                      </div>

                      {editPurchaseCheques.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {editPurchaseCheques.map((cheque, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-xl border border-amber-200/80 space-y-2 text-xs shadow-2xs">
                              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <span className="font-bold text-amber-900 text-[11px]">چک شماره {toPersianDigits(idx + 1)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditPurchaseCheque(idx)}
                                  className="text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                                  title="حذف این چک"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">شماره چک / شماره سریال صیاد</label>
                                  <input
                                    type="text"
                                    placeholder="مثال: ۱۲۳۴۵۶"
                                    value={cheque.chequeNumber}
                                    onChange={(e) =>
                                      setEditPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, chequeNumber: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">نام بانک صادرکننده</label>
                                  <input
                                    type="text"
                                    placeholder="مثال: بانک ملی / ملت / صادرات"
                                    value={cheque.bankName}
                                    onChange={(e) =>
                                      setEditPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, bankName: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">تاریخ سررسید چک</label>
                                  <input
                                    type="date"
                                    value={cheque.dueDate}
                                    onChange={(e) =>
                                      setEditPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, dueDate: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">مبلغ چک (تومان)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={10000}
                                    placeholder="۰"
                                    value={cheque.amount || ''}
                                    onChange={(e) =>
                                      setEditPurchaseCheques((prev) =>
                                        prev.map((c, i) =>
                                          i === idx ? { ...c, amount: Number(e.target.value) } : c
                                        )
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold outline-none focus:border-amber-500 text-indigo-900"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">
                                    شناسه ۱۶ رقمی صیاد (اختیاری)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="16 رقم صیادی"
                                    maxLength={16}
                                    value={cheque.sayadId || ''}
                                    onChange={(e) =>
                                      setEditPurchaseCheques((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, sayadId: e.target.value } : c))
                                      )
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono outline-none focus:border-amber-500"
                                    dir="ltr"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">
                                    شماره شبا حساب صادرکننده (۲۴ رقم - اختیاری)
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2 text-[11px] font-mono text-slate-400 select-none">
                                      IR
                                    </span>
                                    <input
                                      type="text"
                                      placeholder="۲۴ رقم بدون IR"
                                      maxLength={26}
                                      value={cheque.shebaNumber || ''}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/^IR/i, '').replace(/\s+/g, '');
                                        setEditPurchaseCheques((prev) =>
                                          prev.map((c, i) => (i === idx ? { ...c, shebaNumber: clean } : c))
                                        );
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-8 text-xs font-mono outline-none focus:border-amber-500 text-slate-800"
                                      dir="ltr"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 bg-white/70 p-2.5 rounded-xl border border-amber-200">
                          هنوز چکی ثبت نشده است — برای افزودن چک، دکمه «+ افزودن چک» را بزنید.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Multi-Image Receipt & Invoice Attachment */}
                  <div className="sm:col-span-2 space-y-2 bg-slate-100/60 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-slate-500" />
                        <span>تصاویر فاکتور / فیش واریزی پیوست ({toPersianDigits(editPurchaseReceiptImages.length)} تصویر):</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {editPurchaseReceiptImages.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 group shadow-2xs bg-white"
                        >
                          <img
                            src={url}
                            alt={`رسید ${idx + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              setViewingReceiptUrls(editPurchaseReceiptImages);
                              setActiveReceiptIndex(idx);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEditPurchaseReceiptImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 left-1 bg-black/70 hover:bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                            title="حذف این تصویر"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white hover:bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-amber-600 transition-all group shadow-2xs">
                        {isUploadingEditReceipt ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] mt-0.5 font-bold">عکس جدید</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleEditReceiptFilesUpload(e.target.files);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      توضیحات و یادداشت فاکتور خرید:
                    </label>
                    <textarea
                      rows={2}
                      value={editPurchaseNotes}
                      onChange={(e) => setEditPurchaseNotes(e.target.value)}
                      placeholder="یادداشت‌های داخلی..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">جمع کل اقلام:</span>
                    <span className="font-mono font-bold text-slate-800">{formatToman(subtotal)}</span>
                  </div>
                  {disc > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-700">تخفیف:</span>
                      <span className="font-mono font-bold text-emerald-700">-{formatToman(disc)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs border-t border-amber-200/80 pt-1.5">
                    <span className="font-bold text-slate-900">مبلغ نهایی فاکتور:</span>
                    <span className="font-mono font-black text-slate-900">{formatToman(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700">مبلغ پرداخت شده:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatToman(computedPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-amber-200/80 pt-1.5">
                    <span className="font-bold text-rose-700">باقی‌مانده بدهی ما به تامین‌کننده:</span>
                    <span className="font-mono font-black text-rose-700">{formatToman(remainingDebt)}</span>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingEditPurchase}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingEditPurchase ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره و به‌روزرسانی انبار...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ذخیره تغییرات فاکتور خرید و به‌روزرسانی انبار</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPurchaseInvoice(null)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Delete Purchase Invoice Confirmation Modal */}
      {deletingPurchaseInvoiceTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">تایید حذف کامل فاکتور خرید</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">عملیات برگشت انبار و تراز مالی غیرقابل بازگشت است</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingPurchaseInvoiceTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Invoice Summary Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">شماره فاکتور خرید:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {deletingPurchaseInvoiceTarget.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">تامین‌کننده / شرکت پخش:</span>
                  <span className="font-bold text-slate-800">{deletingPurchaseInvoiceTarget.supplierName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">مبلغ کل فاکتور:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatToman(deletingPurchaseInvoiceTarget.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">تعداد اقلام خریداری شده:</span>
                  <span className="font-bold text-slate-700">
                    {toPersianDigits(deletingPurchaseInvoiceTarget.items?.length || 0)} قلم کالا
                  </span>
                </div>
              </div>

              {/* Warning Info */}
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>با حذف کامل این فاکتور، رویدادهای زیر اعمال می‌شوند:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-rose-700 text-[11px] leading-relaxed pr-1">
                  <li>
                    موجودی اقلام این فاکتور دقیقاً به میزان خریداری‌شده از <strong>انبار</strong> کسر می‌گردد.
                  </li>
                  <li>
                    تراز حساب و بدهی فروشگاه به تامین‌کننده «<strong>{deletingPurchaseInvoiceTarget.supplierName}</strong>» به‌روزرسانی و کسر می‌شود.
                  </li>
                  <li>
                    تراکنش‌های نقدی خزانه یا اسناد چک مرتبط با این فاکتور باطل و معکوس می‌گردند.
                  </li>
                  <li>
                    این عملیات به همراه نام کاربر و مشخصات زمانی در دفتر لاگ‌های حسابرسی سیستم بایگانی خواهد شد.
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingPurchaseInvoice}
                  onClick={handleConfirmDeletePurchaseInvoice}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
                >
                  {isDeletingPurchaseInvoice ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال حذف و برگشت انبار...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>تایید و حذف قطعی فاکتور خرید</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isDeletingPurchaseInvoice}
                  onClick={() => setDeletingPurchaseInvoiceTarget(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
