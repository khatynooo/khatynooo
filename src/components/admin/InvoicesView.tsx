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
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { SalesInvoice, PurchaseInvoice, ReturnInvoice, ReturnInvoiceItem, Customer, Supplier, Product, Warehouse, Category, ChequeInfo } from '../../types';
import { useToast } from '../common/Toast';
import { ReceiptModal } from './ReceiptModal';
import { QuickAddProductModal } from './QuickAddProductModal';

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
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState(
    new Date().toLocaleDateString('fa-IR')
  );
  const [purchaseDiscount, setPurchaseDiscount] = useState<number | ''>(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'cash' | 'cheque' | 'mixed' | 'credit'>('cash');
  const [purchaseCashAmount, setPurchaseCashAmount] = useState<number | ''>('');
  const [purchaseCheques, setPurchaseCheques] = useState<Array<{
    chequeNumber: string;
    bankName: string;
    dueDate: string;
    sayadId: string;
    shebaNumber: string;
    amount: number | '';
  }>>([]);
  const [purchaseReceiptImages, setPurchaseReceiptImages] = useState<string[]>([]);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; buyPrice: number; total: number }>
  >([]);

  // Search & Quick Add states in New Purchase Modal
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState('');
  const [viewingReceiptList, setViewingReceiptList] = useState<string[]>([]);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);
  const [checkingMarketProductId, setCheckingMarketProductId] = useState<string | null>(null);

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

  const handleReceiptFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('لطفاً یک فایل تصویری (رسید یا فاکتور کاغذی) انتخاب کنید.', 'warning');
      return;
    }
    setIsUploadingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        try {
          const res = await api.uploadFile({
            dataUrl,
            filename: file.name,
            title: `رسید فاکتور خرید ${purchaseInvoiceNumber || ''}`,
            category: 'receipt',
          });
          setPurchaseReceiptImageUrl(res.url || dataUrl);
          showToast('تصویر فاکتور تامین‌کننده بارگذاری شد.', 'success');
        } catch {
          setPurchaseReceiptImageUrl(dataUrl);
          showToast('تصویر فاکتور ذخیره شد.', 'success');
        } finally {
          setIsUploadingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingReceipt(false);
      showToast('خطا در پردازش فایل تصویر', 'error');
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
            ? { ...i, quantity: i.quantity + 10, total: (i.quantity + 10) * i.buyPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 10,
          buyPrice: product.buyPrice,
          total: 10 * product.buyPrice,
        },
      ];
    });
  };

  const handleProductCreatedFromModal = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    handleAddPurchaseItem(newProd);
    showToast(`کالای «${newProd.name}» تعریف شد و به اقلام فاکتور خرید افزوده گردید.`, 'success');
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

    try {
      await api.createPurchaseInvoice({
        supplierId: purchaseSupplierId,
        warehouseId: purchaseWarehouseId,
        items: purchaseItems,
        paidAmount: purchasePaidAmount,
        paymentMethod: 'cash',
        invoiceNumber: purchaseInvoiceNumber.trim() || undefined,
        invoiceDate: purchaseInvoiceDate.trim() || undefined,
        discount: Number(purchaseDiscount) || 0,
        receiptImageUrl: purchaseReceiptImageUrl || undefined,
      });
      showToast('فاکتور خرید ثبت و موجودی انبار به‌روزرسانی شد.', 'success');
      setShowNewPurchaseModal(false);
      setPurchaseItems([]);
      setPurchasePaidAmount(0);
      setPurchaseInvoiceNumber('');
      setPurchaseInvoiceDate(new Date().toLocaleDateString('fa-IR'));
      setPurchaseDiscount(0);
      setPurchaseReceiptImageUrl('');
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
                  <th className="p-3.5 text-center">چاپ و مشاهده</th>
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
                          : inv.paymentMethod === 'cheque'
                          ? 'چک صیادی'
                          : 'نسیه / اعتباری'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">{inv.createdByName || 'فروشنده'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setShowReceipt(true);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>چاپ فیش</span>
                      </button>
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
                    <td className="p-3.5 text-emerald-600 font-mono font-bold">{formatToman(inv.paidAmount)}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-600">
                      {inv.remainingAmount > 0 ? (
                        formatToman(inv.remainingAmount)
                      ) : (
                        <span className="text-emerald-600 font-normal">تسویه کامل</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {inv.receiptImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(inv.receiptImageUrl || null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                          title="مشاهده تصویر فاکتور/رسید"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده برگه</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">ندارد</span>
                      )}
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
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-indigo-600" />
                    <span>جستجو و انتخاب کالا برای فاکتور خرید:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddInitialName(productSearchTerm);
                      setShowQuickAddModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ تعریف کالای جدید</span>
                  </button>
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

              {/* Financial Calculation & Discount */}
              {(() => {
                const grossTotal = purchaseItems.reduce((s, i) => s + i.total, 0);
                const discountVal = Number(purchaseDiscount) || 0;
                const finalPayable = Math.max(0, grossTotal - discountVal);
                const remainingDebt = Math.max(0, finalPayable - purchasePaidAmount);

                return (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-600 font-medium block mb-1">جمع ناخالص اقلام:</label>
                        <div className="font-mono font-bold text-slate-800 text-sm bg-white p-2 rounded-xl border border-slate-200">
                          {formatToman(grossTotal)}
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1">
                          <Percent className="w-3 h-3 text-emerald-600" />
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
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl p-2 font-mono font-bold text-emerald-700 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-800 font-black block mb-1">مبلغ نهایی فاکتور خرید:</label>
                        <div className="font-mono font-black text-indigo-700 text-sm bg-indigo-50/80 p-2 rounded-xl border border-indigo-200">
                          {formatToman(finalPayable)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">مبلغ پرداختی نقدی فعلی (تومان):</label>
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          value={purchasePaidAmount}
                          onChange={(e) => setPurchasePaidAmount(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl p-2 font-mono outline-none font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">باقی‌مانده بدهی به تامین‌کننده:</label>
                        <div
                          className={`font-mono font-bold text-sm p-2 rounded-xl border ${
                            remainingDebt > 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {remainingDebt > 0 ? formatToman(remainingDebt) : 'تسویه کامل'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Receipt / Invoice Paper Image Upload */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>پیوست تصویر رسید / برگه فاکتور کاغذی (اختیاری):</span>
                </div>

                <input
                  type="file"
                  ref={receiptFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReceiptFileUpload(f);
                  }}
                />

                {purchaseReceiptImageUrl ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={purchaseReceiptImageUrl}
                        alt="رسید فاکتور"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer"
                        onClick={() => setViewingReceiptUrl(purchaseReceiptImageUrl)}
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تصویر برگه فاکتور ذخیره شد</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(purchaseReceiptImageUrl)}
                          className="text-[11px] text-indigo-600 hover:underline font-bold mt-0.5 cursor-pointer"
                        >
                          مشاهده بزرگنمایی
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => receiptFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        تغییر عکس
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchaseReceiptImageUrl('')}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => receiptFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    {isUploadingReceipt ? (
                      <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال بارگذاری تصویر رسید...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-slate-400" />
                        <div className="font-bold text-slate-700 text-xs">
                          برای بارگذاری عکس فاکتور کاغذی یا فیش واریزی کلیک کنید
                        </div>
                        <div className="text-[10px] text-slate-400">فرمت‌های تصویری JPG، PNG یا WEBP</div>
                      </div>
                    )}
                  </div>
                )}
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
        onClose={() => setShowQuickAddModal(false)}
        onProductCreated={handleProductCreatedFromModal}
        categories={categories}
        initialName={quickAddInitialName}
      />

      {/* Full-Screen Receipt Image Viewer Modal */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-800">تصویر برگه فاکتور / رسید تامین‌کننده</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-900/5 rounded-2xl p-2">
              <img
                src={viewingReceiptUrl}
                alt="تصویر فاکتور"
                className="max-h-[70vh] w-auto rounded-xl object-contain shadow-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <a
                href={viewingReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>باز کردن در تب جدید</span>
              </a>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
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
    </div>
  );
};
