import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  CreditCard,
  Banknote,
  Calendar,
  Send,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
  FileText,
  Warehouse as WarehouseIcon,
  ScanLine,
  Camera,
  Sparkles,
  Plus,
  Minus,
  Tag,
  ChevronDown,
  Zap,
  Check,
  Grid,
  List,
  ShoppingBag,
  SlidersHorizontal,
  History,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber, toEnglishDigits, findProductByBarcodeOrCode, getUnitBreakdownLabel } from '../../lib/utils';
import { Product, Customer, PriceTier, Warehouse, ServicePreset, Category } from '../../types';
import { useToast } from '../common/Toast';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { DirectPhoneScannerButton } from '../common/DirectPhoneScannerButton';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { ProductScanQuantityModal } from './ProductScanQuantityModal';
import { UnknownBarcodeModal } from './UnknownBarcodeModal';
import { QuickAddProductModal } from './QuickAddProductModal';

const DEFAULT_WALKIN_CUSTOMER: Customer = {
  id: 'cst_walkin',
  name: 'مشتری نقدی حضوری',
  mobile: '09000000000',
  balance: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_WAREHOUSE: Warehouse = {
  id: 'wh_central',
  name: 'انبار مرکزی',
  code: 'WH-CENTRAL',
  type: 'central_warehouse',
  isDefault: true,
  isActive: true,
  createdAt: new Date().toISOString(),
};

export const PosView: React.FC = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServicePreset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([DEFAULT_WALKIN_CUSTOMER]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([DEFAULT_WAREHOUSE]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('wh_central');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cst_walkin');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(DEFAULT_WALKIN_CUSTOMER);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Filter between all items, products only, and services only
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'products' | 'services'>('all');
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');

  // Cart & POS state
  const [cartItems, setCartItems] = useState<
    Array<{
      product: Product;
      quantity: number;
      selectedPrice: number;
      priceTier: PriceTier;
      unit: string;
      discount: number;
      boxScans?: Array<{ boxCount: number; unitsPerBox: number }>;
    }>
  >([]);

  const [activeTier, setActiveTier] = useState<PriceTier>('shop1');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'pos_pasargad' | 'cash' | 'credit' | 'cheque' | 'sms_link'>('pos_pasargad');

  // Cheque Fields
  const [chequeNumber, setChequeNumber] = useState('');
  const [sayadId, setSayadId] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [bankName, setBankName] = useState('بانک ملت');

  // Terminal Processing Modal
  const [isPosProcessing, setIsPosProcessing] = useState(false);
  const [posStep, setPosStep] = useState<'connecting' | 'swipe_card' | 'pin_entry' | 'approved' | 'failed'>('connecting');
  const [posHexLog, setPosHexLog] = useState<{ request: string; response: string; rrn?: string; ref?: string }>({
    request: '',
    response: '',
  });

  // Completed Invoice & Receipt Modal
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Quick Customer Create Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  // Camera Barcode Scanner Modal (Continuous Workflow: Scan -> Stop -> Quantity -> Restart)
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isCameraScannerPaused, setIsCameraScannerPaused] = useState(false);

  // Quantity Modal
  const [quantityModal, setQuantityModal] = useState<{
    product: Product;
    mode: 'box' | 'unit';
    currentQtyInInvoice: number;
  } | null>(null);

  // Unknown Barcode & Quick Add Modals
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Held Invoices (فاکتورهای معلق)
  const [activeSalesDraftId, setActiveSalesDraftId] = useState<string | null>(null);
  const [heldInvoices, setHeldInvoices] = useState<Array<{ id: string; label: string | null; payload: any; updatedAt: string }>>([]);
  const [showHeldList, setShowHeldList] = useState(false);

  // Continuous Scan Mode (اسکن پیوسته)
  const [continuousScanMode, setContinuousScanMode] = useState<boolean>(true);

  // VAT rate state (0% exempt or 10% standard VAT)
  const [vatRate, setVatRate] = useState<number>(10);

  // Cash Received & Change Return
  const [cashReceived, setCashReceived] = useState<number | ''>('');

  // Cart Clear Confirmation Modal
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Scan debounce ref to prevent accidental duplicate triggers
  const lastScanRef = useRef<{ code: string; timestamp: number }>({ code: '', timestamp: 0 });

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    api.listSalesDrafts().then((res) => setHeldInvoices(res?.drafts || [])).catch(() => {});
    barcodeRef.current?.focus();
  }, []);

  async function loadData() {
    setIsLoadingData(true);
    try {
      const [prodRes, custRes, whRes, srvRes, catRes] = await Promise.all([
        api.getProducts().catch((e) => {
          console.warn('POS: getProducts error, using fallback:', e);
          return { products: [] };
        }),
        api.getCustomers().catch((e) => {
          console.warn('POS: getCustomers error, using fallback:', e);
          return { customers: [] };
        }),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
        api.getServices().catch(() => ({ services: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
      ]);

      const loadedProducts = prodRes.products || [];
      setProducts(loadedProducts);
      setCategories(catRes.categories || []);

      const rawCustList: Customer[] = custRes.customers || [];
      const hasWalkin = rawCustList.some((c) => c.id === 'cst_walkin');
      const custList: Customer[] = hasWalkin ? rawCustList : [DEFAULT_WALKIN_CUSTOMER, ...rawCustList];
      setCustomers(custList);

      setSelectedCustomer((prev) => {
        if (prev && custList.some((c) => c.id === prev.id)) return prev;
        return custList.find((c) => c.id === 'cst_walkin') || custList[0] || DEFAULT_WALKIN_CUSTOMER;
      });

      const rawWhList: Warehouse[] = whRes.warehouses || [];
      const whList: Warehouse[] = rawWhList.length > 0 ? rawWhList : [DEFAULT_WAREHOUSE];
      setWarehouses(whList);

      setSelectedWarehouseId((prev) => {
        if (prev && whList.some((w) => w.id === prev)) return prev;
        const def = whList.find((w) => w.isDefault) || whList[0];
        return def?.id || 'wh_central';
      });

      setServices(srvRes.services || srvRes.presets || []);
    } catch (err: any) {
      console.error('POS loadData caught error:', err);
    } finally {
      setIsLoadingData(false);
    }
  }

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    setSelectedCustomer(found || (id === 'cst_walkin' ? DEFAULT_WALKIN_CUSTOMER : null));
  };

  // ساخت payload استاندارد فاکتور فروش فعلی
  const buildCurrentSalesPayload = () => ({
    cartItems: cartItems.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      selectedPrice: i.selectedPrice,
      priceTier: i.priceTier,
      unit: i.unit,
      discount: i.discount,
      boxScans: i.boxScans,
    })),
    selectedCustomerId,
    selectedWarehouseId,
    overallDiscount,
    paymentMethod,
    activeTier,
  });

  // ذخیره خودکار در پس‌زمینه با Debounce (۱۵۰۰ میلی‌ثانیه)
  useEffect(() => {
    if (cartItems.length === 0) return;
    const payload = buildCurrentSalesPayload();
    const t = setTimeout(() => {
      if (activeSalesDraftId) {
        api.updateSalesDraft(activeSalesDraftId, payload).catch(() => {});
      } else {
        api.createSalesDraft(null, payload)
          .then((res) => {
            if (res?.id) setActiveSalesDraftId(res.id);
          })
          .catch(() => {});
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, selectedCustomerId, selectedWarehouseId, overallDiscount, paymentMethod, activeTier]);

  // دکمه نگهدار و فاکتور جدید
  const handleHoldAndStartNew = async () => {
    if (cartItems.length === 0) {
      showToast('سبد خالی است؛ چیزی برای نگهداری وجود ندارد.', 'warning');
      return;
    }
    const payload = buildCurrentSalesPayload();
    try {
      if (activeSalesDraftId) {
        await api.updateSalesDraft(activeSalesDraftId, payload);
      } else {
        await api.createSalesDraft(null, payload);
      }
      setCartItems([]);
      setSelectedCustomerId('cst_walkin');
      setSelectedCustomer(DEFAULT_WALKIN_CUSTOMER);
      setOverallDiscount(0);
      setActiveSalesDraftId(null);
      const res = await api.listSalesDrafts();
      setHeldInvoices(res?.drafts || []);
      showToast('فاکتور فعلی نگهداشته شد. می‌توانید فاکتور جدید بزنید.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در نگهداری فاکتور', 'error');
    }
  };

  // بازیابی یک فاکتور معلق
  const handleResumeDraft = async (draft: { id: string; payload: any }) => {
    if (cartItems.length > 0 && activeSalesDraftId !== draft.id) {
      try {
        const currentPayload = buildCurrentSalesPayload();
        if (activeSalesDraftId) {
          await api.updateSalesDraft(activeSalesDraftId, currentPayload);
        } else {
          await api.createSalesDraft(null, currentPayload);
        }
      } catch {
        // نادیده گرفتن خطا
      }
    }

    const p = draft.payload || {};
    const restoredCart = (p.cartItems || [])
      .map((ci: any) => {
        const prod = products.find((pp) => pp.id === ci.productId);
        if (!prod) return null;
        return {
          product: prod,
          quantity: ci.quantity,
          selectedPrice: ci.selectedPrice,
          priceTier: ci.priceTier,
          unit: ci.unit,
          discount: ci.discount,
          boxScans: ci.boxScans,
        };
      })
      .filter(Boolean);

    setCartItems(restoredCart);
    if (p.selectedCustomerId) {
      setSelectedCustomerId(p.selectedCustomerId);
      const foundCust = customers.find((c) => c.id === p.selectedCustomerId);
      if (foundCust) setSelectedCustomer(foundCust);
    }
    if (p.selectedWarehouseId) setSelectedWarehouseId(p.selectedWarehouseId);
    if (p.overallDiscount !== undefined) setOverallDiscount(p.overallDiscount);
    if (p.paymentMethod) setPaymentMethod(p.paymentMethod);
    if (p.activeTier) setActiveTier(p.activeTier);
    setActiveSalesDraftId(draft.id);
    setShowHeldList(false);
    showToast('فاکتور معلق بازیابی شد.', 'success');
  };

  // حذف فاکتور معلق
  const handleDeleteHeldDraft = async (id: string) => {
    try {
      await api.deleteSalesDraft(id);
      setHeldInvoices((prev) => prev.filter((d) => d.id !== id));
      if (activeSalesDraftId === id) setActiveSalesDraftId(null);
      showToast('فاکتور معلق حذف شد.', 'info');
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف فاکتور معلق', 'error');
    }
  };

  const getPriceByTier = (product: Product, tier: PriceTier): number => {
    switch (tier) {
      case 'shop1':
        return product.priceShop1 || product.salePrice;
      case 'shop2':
        return product.priceShop2 || product.salePrice;
      case 'shop3':
        return product.priceShop3 || product.salePrice;
      case 'wholesale':
        return product.wholesalePrice || product.salePrice;
      case 'manual':
      default:
        return product.salePrice;
    }
  };

  const addServiceToPosCart = (service: ServicePreset) => {
    const serviceProduct: Product = {
      id: `srv_${service.id}`,
      code: `SRV-${service.id.slice(0, 5)}`,
      name: service.name || service.title || 'خدمت',
      categoryId: service.category || 'other',
      categoryName: 'خدمات چاپ و صحافی',
      buyPrice: 0,
      salePrice: service.price || service.priceSingle1 || 0,
      priceShop1: service.priceSingle1 || service.price || 0,
      priceShop2: service.priceSingle2 || service.price || 0,
      priceShop3: service.priceDouble1 || service.price || 0,
      wholesalePrice: service.priceSingle2 || service.price || 0,
      minAllowedPrice: 0,
      stock: 999999,
      minStockAlert: 0,
      unit: service.unit || 'مورد',
      barcode: '',
      isService: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addToPosCart(serviceProduct);
  };

  const addToPosCart = (
    product: Product,
    qty: number = 1,
    boxInfo?: { boxCount: number; unitsPerBox: number }
  ) => {
    const unitPrice = getPriceByTier(product, activeTier);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                boxScans: boxInfo ? [...(item.boxScans || []), boxInfo] : item.boxScans,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: qty,
          selectedPrice: unitPrice,
          priceTier: activeTier,
          unit: product.unit,
          discount: 0,
          boxScans: boxInfo ? [boxInfo] : undefined,
        },
      ];
    });
    setBarcodeInput('');
    setSearchQuery('');
  };

  const processBarcodeScan = (scannedCode: string, successPrefix?: string) => {
    const clean = toEnglishDigits(scannedCode).replace(/[\r\n\t]/g, '').trim();
    if (!clean) return;

    // Debounce duplicate rapid scan events (e.g. within 700ms)
    const now = Date.now();
    if (clean === lastScanRef.current.code && now - lastScanRef.current.timestamp < 700) {
      return;
    }
    lastScanRef.current = { code: clean, timestamp: now };

    // Immediately pause the camera scanner to prevent duplicate frames
    setIsCameraScannerPaused(true);

    const match = findProductByBarcodeOrCode<Product>(products, clean);
    if (!match) {
      setUnknownBarcode(clean);
      setBarcodeInput('');
      return;
    }

    const cleanedQuery = clean;
    const cleanedBoxBarcode = toEnglishDigits((match as any).boxBarcode || '').trim();
    const isBoxBarcodeScan = Boolean(cleanedBoxBarcode) && cleanedBoxBarcode === cleanedQuery;

    const existingItem = cartItems.find((i) => i.product.id === match.id);
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (isBoxBarcodeScan) {
      const factor = Number((match as any).packagingFactor || match.conversionFactor || 0);
      if (!factor || factor < 2) {
        showToast(
          `برای کالای «${match.name}» ضریب تبدیل تنظیم نشده است. به حالت تکی باز شد.`,
          'warning'
        );
        setQuantityModal({ product: match, mode: 'unit', currentQtyInInvoice: currentQty });
      } else {
        setQuantityModal({ product: match, mode: 'box', currentQtyInInvoice: currentQty });
      }
    } else {
      setQuantityModal({ product: match, mode: 'unit', currentQtyInInvoice: currentQty });
    }
    setBarcodeInput('');
  };

  const handleConfirmQuantity = (qty: number, boxInfo?: { boxCount: number; unitsPerBox: number }) => {
    if (!quantityModal) return;
    const { product } = quantityModal;

    addToPosCart(product, qty, boxInfo);
    showToast(`«${product.name}» (${toPersianDigits(qty)} ${product.unit || 'عدد'}) به فاکتور اضافه شد.`, 'success');

    setQuantityModal(null);

    // Auto restart/resume scanner
    if (isCameraScannerOpen) {
      setIsCameraScannerPaused(false);
    } else {
      requestAnimationFrame(() => barcodeRef.current?.focus());
    }
  };

  const handleCancelQuantity = () => {
    setQuantityModal(null);
    if (isCameraScannerOpen) {
      setIsCameraScannerPaused(false);
    } else {
      requestAnimationFrame(() => barcodeRef.current?.focus());
    }
  };

  const handleRetryUnknownBarcode = () => {
    setUnknownBarcode(null);
    if (isCameraScannerOpen) {
      setIsCameraScannerPaused(false);
    } else {
      requestAnimationFrame(() => barcodeRef.current?.focus());
    }
  };

  const handleQuickAddUnknownBarcode = () => {
    const code = unknownBarcode || '';
    setQuickAddBarcode(code);
    setUnknownBarcode(null);
    setShowQuickAddModal(true);
  };

  const handleCancelUnknownBarcode = () => {
    setUnknownBarcode(null);
    if (isCameraScannerOpen) {
      setIsCameraScannerPaused(false);
    } else {
      requestAnimationFrame(() => barcodeRef.current?.focus());
    }
  };

  const handleProductCreated = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    setShowQuickAddModal(false);
    showToast(`کالای «${newProd.name}» ثبت شد.`, 'success');
    setQuantityModal({ product: newProd, mode: 'unit', currentQtyInInvoice: 0 });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    processBarcodeScan(barcodeInput);
  };

  // Hardware USB / Bluetooth Barcode Reader Listener
  useHardwareBarcodeScanner({
    onScan: (scannedCode) => {
      processBarcodeScan(scannedCode, 'با اسکنر سخت‌افزاری');
    },
    enabled:
      continuousScanMode &&
      !quantityModal &&
      !unknownBarcode &&
      !showAddCustomerModal &&
      !showQuickAddModal &&
      !isCheckingOut,
  });

  const updateItemQty = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const setItemQtyDirect = (productId: string, rawValue: string) => {
    const parsed = Math.floor(Number(toEnglishDigits(rawValue)) || 0);
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = parsed > 0 ? parsed : 1; // حداقل ۱
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.selectedPrice * item.quantity - item.discount, 0);
  const tax = vatRate > 0 ? Math.round((subtotal * vatRate) / 100) : 0;
  const finalAmount = Math.max(0, subtotal + tax - overallDiscount);

  // Quick Customer Add
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) return;
    try {
      const res = await api.createCustomer({ name: newCustName, mobile: newCustMobile });
      setCustomers((prev) => [...prev, res.customer]);
      setSelectedCustomerId(res.customer.id);
      setSelectedCustomer(res.customer);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustMobile('');
      showToast('مشتری جدید با موفقیت ثبت شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت مشتری', 'error');
    }
  };

  // Execute POS Checkout
  const handleExecuteCheckout = async () => {
    if (!cartItems.length) {
      showToast('سبد اقلام خالی است.', 'warning');
      return;
    }
    if (isCheckingOut) return;
    setIsCheckingOut(true);

    const activeCust = selectedCustomer || customers.find((c) => c.id === selectedCustomerId) || DEFAULT_WALKIN_CUSTOMER;
    const checkoutPayloadItems = cartItems.map((i) => ({
      productId: i.product.id,
      productName: i.product.name,
      code: i.product.code,
      barcode: i.product.barcode,
      unit: i.unit,
      subUnit: i.product.subUnit || undefined,
      conversionFactor: i.product.conversionFactor || undefined,
      quantity: i.quantity,
      buyPrice: i.product.buyPrice,
      salePrice: i.selectedPrice,
      discount: i.discount,
      priceTier: i.priceTier,
      total: i.selectedPrice * i.quantity - i.discount,
      isService: Boolean(i.product.isService || i.product.id.startsWith('srv_')),
    }));

    try {
      if (paymentMethod === 'pos_pasargad') {
        // Trigger Pasargad Terminal Flow with animated step-by-step
        setIsPosProcessing(true);
        setPosStep('connecting');

        try {
          // Send transaction in Rials (1 Toman = 10 Rials)
          const amountRials = finalAmount * 10;
          const terminalPromise = api.sendPosTransaction({ amountRials });

          setTimeout(() => setPosStep('swipe_card'), 800);
          setTimeout(() => setPosStep('pin_entry'), 1800);

          const posRes = await terminalPromise;

          if (posRes.status === 'approved') {
            setPosStep('approved');
            setPosHexLog({
              request: posRes.rawRequestHex,
              response: posRes.rawResponseHex,
              rrn: posRes.rrn,
              ref: posRes.refNumber,
            });

            // Finalize checkout in Database
            const checkoutRes = await api.posCheckout({
              customerId: activeCust.id,
              customerName: activeCust.name || 'مشتری نقدی حضوری',
              customerMobile: activeCust.mobile,
              items: checkoutPayloadItems,
              discount: overallDiscount,
              paymentMethod: 'pos_pasargad',
              paidAmount: finalAmount,
              posResult: posRes,
              warehouseId: selectedWarehouseId || 'wh_central',
              taxRate: vatRate,
            });

            if (checkoutRes.success) {
              setCompletedInvoice(checkoutRes.invoice);
              if (activeSalesDraftId) {
                api.deleteSalesDraft(activeSalesDraftId).catch(() => {});
                setActiveSalesDraftId(null);
              }
              setTimeout(() => {
                setIsPosProcessing(false);
                setShowReceiptModal(true);
                setCartItems([]);
                setOverallDiscount(0);
                setCashReceived('');
                loadData(); // reload product stocks
                showToast('تراکنش کارتخوان تایید و فاکتور فروش صادر شد.', 'success');
              }, 1200);
            } else {
              setPosStep('failed');
              showToast(checkoutRes.message || 'خطا در ثبت فاکتور', 'error');
            }
          } else {
            setPosStep('failed');
            showToast(posRes.message || 'تراکنش توسط کارتخوان لغو شد یا ناموفق بود.', 'error');
          }
        } catch (err: any) {
          setPosStep('failed');
          showToast(err.message || 'خطا در ارتباط با کارتخوان', 'error');
        }
      } else {
        // Cash / Credit / Cheque checkout
        try {
          const checkoutRes = await api.posCheckout({
            customerId: activeCust.id,
            customerName: activeCust.name || 'مشتری نقدی حضوری',
            customerMobile: activeCust.mobile,
            items: checkoutPayloadItems,
            discount: overallDiscount,
            paymentMethod,
            paidAmount: paymentMethod === 'credit' ? 0 : finalAmount,
            chequeAmount: paymentMethod === 'cheque' ? finalAmount : 0,
            chequeInfo:
              paymentMethod === 'cheque'
                ? { chequeNumber, sayadId, dueDate: chequeDueDate, bankName, amount: finalAmount }
                : undefined,
            warehouseId: selectedWarehouseId || 'wh_central',
            taxRate: vatRate,
          });

          if (checkoutRes.success) {
            setCompletedInvoice(checkoutRes.invoice);
            if (activeSalesDraftId) {
              api.deleteSalesDraft(activeSalesDraftId).catch(() => {});
              setActiveSalesDraftId(null);
            }
            setShowReceiptModal(true);
            setCartItems([]);
            setOverallDiscount(0);
            setCashReceived('');
            loadData();
            showToast('فاکتور با موفقیت ثبت گردید.', 'success');
          } else {
            showToast(checkoutRes.message || 'خطا در ثبت فاکتور فروش', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'خطا در ثبت فاکتور', 'error');
        }
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Keyboard Shortcuts Listener for High-Speed Cashier Usage (F1 - F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside a modal other than base POS
      if (
        quantityModal ||
        unknownBarcode ||
        showAddCustomerModal ||
        showQuickAddModal ||
        showReceiptModal
      ) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        barcodeRef.current?.focus();
        showToast('ورودی بارکد فعال شد (F1)', 'info');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowAddCustomerModal(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        const tiers: PriceTier[] = ['shop1', 'shop2', 'shop3', 'wholesale', 'manual'];
        setActiveTier((prev) => {
          const nextIdx = (tiers.indexOf(prev) + 1) % tiers.length;
          const newTier = tiers[nextIdx];
          showToast(`سطح قیمت به ${newTier} تغییر یافت (F3)`, 'info');
          return newTier;
        });
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleHoldAndStartNew();
      } else if (e.key === 'F5') {
        e.preventDefault();
        api.listSalesDrafts().then((res) => setHeldInvoices(res?.drafts || [])).catch(() => {});
        setShowHeldList(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowCatalog((prev) => !prev);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsCameraScannerOpen((prev) => !prev);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setShowClearConfirm(true);
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0 && !isCheckingOut) {
          handleExecuteCheckout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cartItems,
    isCheckingOut,
    quantityModal,
    unknownBarcode,
    showAddCustomerModal,
    showQuickAddModal,
    showReceiptModal,
    activeTier,
    selectedCustomerId,
    selectedWarehouseId,
    overallDiscount,
    paymentMethod,
    vatRate,
  ]);

  // Combined Goods & Services for POS
  const effectiveSearch = searchQuery || barcodeInput;
  const cleanSearch = toEnglishDigits(effectiveSearch).trim().toLowerCase();
  const filteredProducts = cleanSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
          p.code.toLowerCase().includes(cleanSearch) ||
          toEnglishDigits(p.barcode || '').toLowerCase().includes(cleanSearch)
      )
    : [];

  const filteredServices = effectiveSearch.trim()
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
          (s.title && s.title.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
          (s.category && s.category.toLowerCase().includes(effectiveSearch.toLowerCase()))
      )
    : [];

  const catalogProducts = products.filter((p) => {
    if (selectedCatalogCategory !== 'all' && p.categoryId !== selectedCatalogCategory) return false;
    if (itemTypeFilter === 'services') return false;
    return true;
  });

  const catalogServices = services.filter((s) => {
    if (itemTypeFilter === 'products') return false;
    if (selectedCatalogCategory !== 'all' && s.category !== selectedCatalogCategory) return false;
    return true;
  });

  const totalCartUnits = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* 1. TOP CONTROL BAR (هدر ابزارها، انبار، سطوح قیمت و فاکتورهای معلق) */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl p-4 border border-slate-200 dark:border-[#222225] shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Right side: POS Status & Warehouse */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-3.5 py-2 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50">
            <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-black text-sm">صندوق فروشگاهی</span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              آنلاین
            </span>
          </div>

          {/* Warehouse Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] px-3 py-1.5 rounded-xl text-xs font-bold">
            <WarehouseIcon className="w-4 h-4 text-slate-500 dark:text-[#8E9299]" />
            <span className="text-slate-500 dark:text-[#8E9299]">انبار:</span>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-[#E0E0E0] font-bold outline-none cursor-pointer"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="bg-white dark:bg-[#111113] text-slate-900 dark:text-white">
                  {w.name} {w.isDefault ? '(پیش‌فرض)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: 5-Tier Price Selector (Clean Segmented Control) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#161619] p-1 rounded-xl border border-slate-200 dark:border-[#2D2D33] overflow-x-auto max-w-full">
          <div className="text-[11px] font-bold text-slate-500 dark:text-[#8E9299] px-2 whitespace-nowrap flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            <span>سطح قیمت (F3):</span>
          </div>
          {[
            { id: 'shop1', label: 'فروشگاه ۱ (حضوری)' },
            { id: 'shop2', label: 'فروشگاه ۲ (آنلاین)' },
            { id: 'shop3', label: 'فروشگاه ۳ (همکار)' },
            { id: 'wholesale', label: 'عمده‌فروشی' },
            { id: 'manual', label: 'قیمت پایه' },
          ].map((tier) => {
            const isActive = activeTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setActiveTier(tier.id as PriceTier);
                  showToast(`سطح قیمت به ${tier.label} تغییر یافت.`, 'info');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#25252A] text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#222226]'
                }`}
              >
                {tier.label}
              </button>
            );
          })}
        </div>

        {/* Left Side: Held Invoices & Continuous Scan Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Continuous Scan Mode */}
          <button
            type="button"
            onClick={() => {
              const next = !continuousScanMode;
              setContinuousScanMode(next);
              if (next) requestAnimationFrame(() => barcodeRef.current?.focus());
              else barcodeRef.current?.blur();
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              continuousScanMode
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-[#161619] text-slate-600 dark:text-[#8E9299] border border-slate-200 dark:border-[#2D2D33] hover:bg-slate-200 dark:hover:bg-[#222226]'
            }`}
            title={continuousScanMode ? 'اسکن مداوم سخت‌افزاری فعال است' : 'اسکن سخت‌افزاری غیرفعال است'}
          >
            <span className={`w-2 h-2 rounded-full ${continuousScanMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{continuousScanMode ? 'اسکن پیوسته' : 'اسکن عادی'}</span>
          </button>

          {/* Hold Current Invoice (F4) */}
          <button
            type="button"
            onClick={handleHoldAndStartNew}
            disabled={cartItems.length === 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              cartItems.length === 0
                ? 'bg-slate-100 dark:bg-[#161619] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-[#2D2D33] cursor-not-allowed'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
            title="نگهداشتن فاکتور جاری برای مشتری دیگر و باز کردن فاکتور جدید (F4)"
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>نگهداشتن (F4)</span>
          </button>

          {/* Held List (F5) */}
          <button
            type="button"
            onClick={() => {
              api.listSalesDrafts().then((res) => setHeldInvoices(res?.drafts || [])).catch(() => {});
              setShowHeldList(true);
            }}
            className="relative px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#222226] text-slate-700 dark:text-[#E0E0E0] border border-slate-200 dark:border-[#2D2D33] transition-all flex items-center gap-1.5 cursor-pointer"
            title="مشاهده لیست فاکتورهای معلق مشتریان (F5)"
          >
            <History className="w-4 h-4 text-slate-500 dark:text-[#8E9299]" />
            <span>معلق‌ها (F5)</span>
            {heldInvoices.length > 0 && (
              <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {toPersianDigits(heldInvoices.length)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. UNIFIED SMART SEARCH & BARCODE SUPER-BAR */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-[#222225] shadow-xs space-y-3">
        <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Main Input Field */}
          <div className="relative flex-1">
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="بارکد کالا را اسکن کنید، یا نام و کد کالا/خدمت را تایپ کنید (F1)..."
              className="w-full bg-slate-50 dark:bg-[#161619] border-2 border-indigo-200/80 dark:border-indigo-900/60 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1A1E] rounded-xl pr-11 pl-20 py-3 text-sm font-sans text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-xs"
            />
            <div className="absolute right-3.5 top-3.5 flex items-center pointer-events-none">
              <Barcode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            {/* Clear Button or F1 Badge */}
            <div className="absolute left-3 top-3 flex items-center gap-1.5">
              {barcodeInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeInput('');
                    setSearchQuery('');
                    barcodeRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#25252A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-[#25252A] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                  F1
                </span>
              )}
            </div>
          </div>

          {/* Quick Scanner Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Phone Scanner Button */}
            <DirectPhoneScannerButton
              onScan={(scannedCode) => {
                processBarcodeScan(scannedCode, 'به فاکتور فروش اضافه شد.');
              }}
              label="دوربین گوشی"
              variant="gold"
              title="اتصال فوری دوربین گوشی هوشمند برای بارکد اسکن"
            />

            {/* Camera Scanner Button (F8) */}
            <button
              type="button"
              onClick={() => {
                setIsCameraScannerOpen(true);
                setIsCameraScannerPaused(false);
              }}
              title="اسکن زنده بارکد با دوربین وبکم / لپ‌تاپ (F8)"
              className="px-3.5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>دوربین (F8)</span>
            </button>

            {/* Toggle Touch Catalog (F6) */}
            <button
              type="button"
              onClick={() => setShowCatalog((prev) => !prev)}
              className={`px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                showCatalog
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#222226] text-slate-700 dark:text-[#E0E0E0] border border-slate-200 dark:border-[#2D2D33]'
              }`}
              title="نمایش یا پنهان کردن ویترین لمسی اقلام و خدمات (F6)"
            >
              <Grid className="w-4 h-4" />
              <span>ویترین لمسی (F6)</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer shadow-xs transition-all"
            >
              ثبت دستی
            </button>
          </div>
        </form>

        {/* Live Search Results Popover/Panel (When typing text) */}
        {cleanSearch.length >= 2 && (
          <div className="bg-slate-50 dark:bg-[#161619] rounded-xl p-3 border border-slate-200 dark:border-[#2D2D33] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-[#8E9299]">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>نتایج جستجوی «{barcodeInput}»:</span>
              </div>
              <span>{toPersianDigits(filteredProducts.length + filteredServices.length)} مورد یافت شد</span>
            </div>

            {filteredProducts.length === 0 && filteredServices.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                هیچ کالا یا خدمتی با این عنوان یا کد یافت نشد. برای اسکن به عنوان بارکد جدید، Enter بزنید.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {/* Products */}
                {filteredProducts.map((p) => {
                  const price = getPriceByTier(p, activeTier);
                  const inCart = cartItems.find((ci) => ci.product.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        addToPosCart(p, 1);
                        setBarcodeInput('');
                        setSearchQuery('');
                        barcodeRef.current?.focus();
                      }}
                      className="bg-white dark:bg-[#1A1A1E] p-2.5 rounded-xl border border-slate-200 dark:border-[#2D2D33] hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-white truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{p.code}</span>
                          <span>•</span>
                          <span className={p.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                            موجودی: {toPersianDigits(p.stock)} {p.unit}
                          </span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{formatToman(price)}</div>
                        {inCart && (
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                            {toPersianDigits(inCart.quantity)} در سبد
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Services */}
                {filteredServices.map((s) => {
                  const sPrice = s.price || s.priceSingle1 || 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        addServiceToPosCart(s);
                        setBarcodeInput('');
                        setSearchQuery('');
                        barcodeRef.current?.focus();
                      }}
                      className="bg-white dark:bg-[#1A1A1E] p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 hover:border-amber-400 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-white truncate">{s.name || s.title}</div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <span>خدمت چاپ/صحافی</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">{formatToman(sPrice)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. OPTIONAL TOUCH CATALOG DRAWER / PANEL (F6) */}
      <AnimatePresence>
        {showCatalog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#111113] rounded-2xl p-4 border border-slate-200 dark:border-[#222225] shadow-xs space-y-3">
              {/* Category & Type Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#222225] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Grid className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white">ویترین لمسی سریع اقلام و خدمات:</span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#161619] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      itemTypeFilter === 'all'
                        ? 'bg-white dark:bg-[#25252A] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900'
                    }`}
                  >
                    همه ({toPersianDigits(products.length + services.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('products')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      itemTypeFilter === 'products'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900'
                    }`}
                  >
                    کالاها ({toPersianDigits(products.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('services')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      itemTypeFilter === 'services'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900'
                    }`}
                  >
                    خدمات چاپ ({toPersianDigits(services.length)})
                  </button>
                </div>
              </div>

              {/* Quick Touch Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {/* Products */}
                {(itemTypeFilter === 'all' || itemTypeFilter === 'products') &&
                  catalogProducts.slice(0, 18).map((p) => {
                    const price = getPriceByTier(p, activeTier);
                    const inCart = cartItems.find((ci) => ci.product.id === p.id);
                    return (
                      <button
                        key={`cat_p_${p.id}`}
                        type="button"
                        onClick={() => {
                          setQuantityModal({ product: p, mode: 'unit', currentQtyInInvoice: inCart?.quantity || 0 });
                        }}
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between hover:shadow-xs active:scale-98 cursor-pointer relative ${
                          inCart
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800'
                            : 'bg-slate-50 dark:bg-[#161619] border-slate-200 dark:border-[#2D2D33] hover:border-indigo-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[9px] bg-slate-200 dark:bg-[#25252A] text-slate-700 dark:text-slate-300 px-1 py-0.2 rounded font-bold">
                              {p.code}
                            </span>
                            {inCart && (
                              <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                                {toPersianDigits(inCart.quantity)}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-xs text-slate-800 dark:text-white line-clamp-2 leading-tight">
                            {p.name}
                          </div>
                        </div>

                        <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-[#2D2D33] flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 text-[10px]">موجودی: {toPersianDigits(p.stock)}</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {formatToman(price)}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                {/* Services */}
                {(itemTypeFilter === 'all' || itemTypeFilter === 'services') &&
                  catalogServices.slice(0, 18).map((s) => {
                    const sPrice = s.price || s.priceSingle1 || 0;
                    return (
                      <button
                        key={`cat_s_${s.id}`}
                        type="button"
                        onClick={() => addServiceToPosCart(s)}
                        className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400 text-right transition-all flex flex-col justify-between hover:shadow-xs active:scale-98 cursor-pointer"
                      >
                        <div>
                          <span className="text-[9px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-bold">
                            خدمت چاپ
                          </span>
                          <div className="font-bold text-xs text-slate-800 dark:text-white line-clamp-2 mt-1 leading-tight">
                            {s.name || s.title}
                          </div>
                        </div>

                        <div className="mt-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[11px]">
                          <span className="text-amber-700 dark:text-amber-400 text-[10px]">{s.unit || 'مورد'}</span>
                          <span className="font-bold text-amber-800 dark:text-amber-300 font-mono">
                            {formatToman(sPrice)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MAIN POS WORKSPACE: DUAL PANE ARCHITECTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RIGHT / MAIN COLUMN: CUSTOMER BAR + CART ITEMS TABLE (7 or 8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Customer Selection Compact Strip (F2) */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-[#222225] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-[#8E9299]">مشتری و طرف‌حساب (F2):</span>
                  {selectedCustomer && selectedCustomer.id !== 'cst_walkin' && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedCustomer.balance < 0
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : selectedCustomer.balance > 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-[#25252A] dark:text-slate-400'
                      }`}
                    >
                      {selectedCustomer.balance === 0
                        ? 'حساب بی‌حساب'
                        : selectedCustomer.balance < 0
                        ? `بدهکار: ${formatToman(Math.abs(selectedCustomer.balance))}`
                        : `بستانکار: ${formatToman(selectedCustomer.balance)}`}
                    </span>
                  )}
                </div>

                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white font-bold outline-none cursor-pointer focus:border-indigo-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-[#111113]">
                      {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.mobile || 'بدون شماره'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-900/60 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ مشتری جدید (F2)</span>
            </button>
          </div>

          {/* Cart Table Container */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-200 dark:border-[#222225] shadow-xs overflow-hidden">
            {/* Table Header Action Bar */}
            <div className="p-4 bg-slate-50/70 dark:bg-[#161619] border-b border-slate-200 dark:border-[#222225] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-lg">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <span>اقلام سبد خرید فاکتور</span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 px-2 py-0.5 rounded-full font-bold">
                      {toPersianDigits(cartItems.length)} ردیف ({toPersianDigits(totalCartUnits)} واحد)
                    </span>
                  </div>
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="خالی کردن کل اقلام سبد خرید (F9)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>خالی کردن (F9)</span>
                </button>
              )}
            </div>

            {/* Table Body or Clean Empty State */}
            {cartItems.length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center mx-auto text-indigo-500 dark:text-indigo-400">
                  <Barcode className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">سبد فروشگاه خالی است</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                    با اسکن بارکدخوان فیزیکی، تایپ نام کالا (F1)، یا انتخاب از ویترین لمسی (F6)، کالا یا خدمت را اضافه کنید.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCatalog(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1A1A1E] hover:bg-slate-200 dark:hover:bg-[#25252A] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5 text-indigo-600" />
                    <span>باز کردن ویترین اقلام (F6)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => barcodeRef.current?.focus()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Barcode className="w-3.5 h-3.5" />
                    <span>اسکن یا تایپ بارکد (F1)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-[#161619] text-slate-600 dark:text-[#8E9299] font-bold border-b border-slate-200 dark:border-[#222225] select-none text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">شرح کالا یا خدمت</th>
                      <th className="py-3 px-3 text-center w-36">تعداد / مقدار</th>
                      <th className="py-3 px-3 w-28">قیمت واحد</th>
                      <th className="py-3 px-3 w-28">جمع سطر</th>
                      <th className="py-3 px-3 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1D1D21]">
                    {cartItems.map((item, idx) => {
                      const availableStock = item.product.stock ?? 0;
                      const isShortage = !item.product.isService && item.quantity > availableStock;
                      const lineTotal = item.selectedPrice * item.quantity - (item.discount || 0);

                      return (
                        <tr
                          key={item.product.id}
                          className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors"
                        >
                          {/* Row Index */}
                          <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-slate-500 font-bold">
                            {toPersianDigits(idx + 1)}
                          </td>

                          {/* Item Name & Details */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  item.product.isService
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                                }`}
                              >
                                {item.product.isService ? 'خدمت' : 'کالا'}
                              </span>
                              <div className="font-bold text-slate-800 dark:text-white leading-tight">
                                {item.product.name}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                              <span className="font-mono">{item.product.code}</span>
                              <span>•</span>
                              <span>واحد: {item.product.unit || 'عدد'}</span>
                              {isShortage && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.2 rounded font-bold">
                                  <AlertCircle className="w-3 h-3" />
                                  کسری (موجودی: {toPersianDigits(availableStock)})
                                </span>
                              )}
                            </div>

                            {/* Sub-unit / Box breakdown tags */}
                            {item.boxScans && item.boxScans.length > 0 && (
                              <div className="text-[9px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-1.5 py-0.5 mt-1 font-medium w-fit border border-amber-200/50 dark:border-amber-800/40">
                                📦 {item.boxScans.map((b) => `${toPersianDigits(b.boxCount)} ${(item.product as any).packagingUnit || 'بسته'} × ${toPersianDigits(b.unitsPerBox)}`).join(' + ')}
                              </div>
                            )}

                            {(() => {
                              const factor = Number((item.product as any).packagingFactor || item.product.conversionFactor || 0);
                              const pkgUnit = (item.product as any).packagingUnit || item.product.subUnit || 'بسته';
                              const baseUnit = item.product.unit || 'عدد';
                              const breakdown = getUnitBreakdownLabel(
                                item.quantity,
                                factor,
                                pkgUnit,
                                baseUnit
                              );
                              return breakdown ? (
                                <div className="text-[9px] text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded px-1.5 py-0.5 mt-1 font-medium w-fit border border-indigo-200/50 dark:border-indigo-800/40">
                                  {breakdown}
                                </div>
                              ) : null;
                            })()}
                          </td>

                          {/* Quantity Stepper */}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-[#161619] rounded-xl p-1 border border-slate-200 dark:border-[#2D2D33] max-w-[120px] mx-auto shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateItemQty(item.product.id, -1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-[#25252A] text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center shadow-xs hover:bg-slate-50 dark:hover:bg-[#2D2D33] active:scale-95 transition-all cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => setItemQtyDirect(item.product.id, e.target.value)}
                                className="w-11 text-center font-bold font-mono text-xs bg-transparent text-slate-900 dark:text-white outline-none border-0 p-0"
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(item.product.id, 1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-[#25252A] text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center shadow-xs hover:bg-slate-50 dark:hover:bg-[#2D2D33] active:scale-95 transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
                              {formatToman(item.selectedPrice)}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">تومان</div>
                          </td>

                          {/* Line Total */}
                          <td className="py-3 px-3">
                            <div className="font-black text-indigo-700 dark:text-indigo-400 font-mono text-xs">
                              {formatToman(lineTotal)}
                            </div>
                            {item.discount > 0 && (
                              <div className="text-[10px] text-emerald-600 font-medium">
                                تخفیف: {formatToman(item.discount)}
                              </div>
                            )}
                          </td>

                          {/* Delete Item */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.product.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="حذف قلم از فاکتور"
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
          </div>
        </div>

        {/* LEFT / CHECKOUT SIDEBAR: TOTALS + PAYMENT METHOD + FINAL SUBMIT (5 or 4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 sticky top-4">
          {/* Payment Method Card */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl p-4 border border-slate-200 dark:border-[#222225] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>روش تسویه و دریافت وجه:</span>
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">انتخاب روش پرداخت</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pos_pasargad')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'pos_pasargad'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 shadow-2xs'
                    : 'border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] text-slate-700 dark:text-[#8E9299] hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">کارتخوان پاسارگاد</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 shadow-2xs'
                    : 'border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] text-slate-700 dark:text-[#8E9299] hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">نقدی / اسکناس</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'credit'
                    ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 shadow-2xs'
                    : 'border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] text-slate-700 dark:text-[#8E9299] hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">نسیه / دفتری</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cheque')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'cheque'
                    ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 shadow-2xs'
                    : 'border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] text-slate-700 dark:text-[#8E9299] hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">چک صیادی</span>
              </button>
            </div>

            {/* Cash Calculator if Cash selected */}
            {paymentMethod === 'cash' && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-300">
                  <span>محاسبه وجه نقد مشتری:</span>
                  <span className="text-[11px] font-mono">
                    فاکتور: {formatToman(finalAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-emerald-900 dark:text-emerald-300 font-bold shrink-0">اسکناس:</label>
                  <input
                    type="number"
                    min={0}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مبلغ پرداختی به تومان..."
                    className="w-full bg-white dark:bg-[#161619] border border-emerald-300 dark:border-emerald-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-950 dark:text-emerald-200 outline-none focus:border-emerald-600"
                  />
                </div>
                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setCashReceived(finalAmount)}
                    className="px-2 py-1 bg-white dark:bg-[#161619] hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-md text-[10px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    مبلغ دقیق
                  </button>
                  {[50000, 100000, 200000, 500000].map((step) => {
                    const rounded = Math.ceil(finalAmount / step) * step;
                    if (rounded <= finalAmount && step !== 50000) return null;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setCashReceived(rounded)}
                        className="px-2 py-1 bg-white dark:bg-[#161619] hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-md text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                      >
                        {formatNumber(rounded)} ت
                      </button>
                    );
                  })}
                </div>
                {/* Change Due Display */}
                {cashReceived !== '' && (
                  <div
                    className={`p-2 rounded-lg text-xs font-bold flex justify-between items-center ${
                      Number(cashReceived) >= finalAmount
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                    }`}
                  >
                    <span>
                      {Number(cashReceived) >= finalAmount ? 'باقیمانده / پول خرد مشتری:' : 'کسری مبلغ پرداختی:'}
                    </span>
                    <span className="font-mono text-sm">
                      {Number(cashReceived) >= finalAmount
                        ? formatToman(Number(cashReceived) - finalAmount)
                        : formatToman(finalAmount - Number(cashReceived))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cheque Details Form if Cheque selected */}
            {paymentMethod === 'cheque' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900/40 space-y-2">
                <div className="font-bold text-purple-900 dark:text-purple-300 text-[11px]">اطلاعات چک دریافتی:</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="شماره چک"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="bg-white dark:bg-[#161619] border border-purple-200 dark:border-purple-800 rounded-lg p-1.5 text-xs font-mono text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="شناسه ۱۶ رقمی صیاد"
                    value={sayadId}
                    onChange={(e) => setSayadId(e.target.value)}
                    className="bg-white dark:bg-[#161619] border border-purple-200 dark:border-purple-800 rounded-lg p-1.5 text-xs font-mono text-slate-800 dark:text-white"
                  />
                  <input
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    className="bg-white dark:bg-[#161619] border border-purple-200 dark:border-purple-800 rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="نام بانک"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-white dark:bg-[#161619] border border-purple-200 dark:border-purple-800 rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Financial Summary Card */}
          <div className="bg-white dark:bg-[#111113] border-2 border-slate-200 dark:border-[#222225] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-slate-600 dark:text-[#8E9299]">
                <span>جمع ناخالص فاکتور:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {formatToman(subtotal)}
                </span>
              </div>

              {/* VAT Rate & Amount */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222225]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-[#8E9299]">ارزش افزوده:</span>
                  <div className="flex bg-slate-100 dark:bg-[#161619] p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setVatRate(10)}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        vatRate === 10
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900'
                      }`}
                    >
                      ۱۰٪
                    </button>
                    <button
                      type="button"
                      onClick={() => setVatRate(0)}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        vatRate === 0
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900'
                      }`}
                    >
                      معاف (۰٪)
                    </button>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatToman(tax)}
                </span>
              </div>

              {/* Overall Discount */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222225]">
                <span className="text-slate-600 dark:text-[#8E9299]">تخفیف کل فاکتور:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    value={overallDiscount || ''}
                    onChange={(e) => setOverallDiscount(Number(e.target.value) || 0)}
                    placeholder="۰"
                    className="w-28 bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-indigo-500 rounded-lg py-1 px-2 text-left font-mono text-slate-900 dark:text-white text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400">تومان</span>
                </div>
              </div>

              {/* Final Amount Due Display */}
              <div className="pt-3 border-t-2 border-slate-200 dark:border-[#2D2D33] flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-[#8E9299] block">مبلغ نهایی قابل پرداخت:</span>
                  <span className="text-[10px] text-slate-400">شامل مالیات و کسر تخفیف</span>
                </div>
                <div className="text-left">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight block">
                    {formatToman(finalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* BIG ACTION CHECKOUT BUTTON (F10) */}
            <button
              type="button"
              onClick={handleExecuteCheckout}
              disabled={cartItems.length === 0 || isCheckingOut}
              className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer ${
                cartItems.length === 0 || isCheckingOut
                  ? 'bg-slate-100 dark:bg-[#1A1A1E] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-[#2D2D33] cursor-not-allowed shadow-none'
                  : paymentMethod === 'pos_pasargad'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
              }`}
            >
              {isCheckingOut ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-white/80" />
                  <span>در حال ارسال و پردازش فاکتور...</span>
                </>
              ) : paymentMethod === 'pos_pasargad' ? (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>ارسال به پوز پاسارگاد ({formatToman(finalAmount)})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ثبت نهایی و صدور فاکتور (F10)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. ERGONOMIC CASHIER SHORTCUTS REFERENCE BAR */}
      <div className="bg-white dark:bg-[#111113] rounded-xl p-3 border border-slate-200 dark:border-[#222225] shadow-xs flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-[#8E9299]">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>راهنمای کلیدهای میانبر سریع کیبورد:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F1</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">بارکد/جستجو</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F2</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">مشتری جدید</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F3</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">سطح قیمت</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F4</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">نگهداشتن</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F5</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">معلق‌ها</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F6</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">ویترین لمسی</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F8</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">دوربین</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-[#25252A] border border-slate-200 dark:border-[#333338] px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">F9</kbd>
            <span className="text-slate-600 dark:text-slate-400 font-sans">خالی کردن</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <kbd className="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300 font-bold">F10</kbd>
            <span className="text-emerald-700 dark:text-emerald-400 font-sans font-bold">تسویه نهایی</span>
          </div>
        </div>
      </div>

      {/* POS Terminal Interaction Modal (TCP/IP Simulation & Live Status) */}
      <AnimatePresence>
        {isPosProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-5"
            >
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">ارتباط با پایانه کارتخوان پاسارگاد</h3>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  IP: 192.168.1.150:7000 • شناسه ترمینال: 87654321
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">مبلغ ارسالی به دستگاه کارتخوان:</div>
                <div className="text-2xl font-black text-blue-700 font-mono">{formatToman(finalAmount)}</div>
              </div>

              {/* Dynamic Step Indicator */}
              <div className="space-y-3 text-xs">
                {posStep === 'connecting' && (
                  <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>برقراری ارتباط شبکه با کارتخوان فروشگاهی...</span>
                  </div>
                )}
                {posStep === 'swipe_card' && (
                  <div className="text-amber-800 bg-amber-50 border border-amber-200 py-2 px-3 rounded-xl font-bold animate-pulse">
                    لطفاً کارت بانکی را بکشید یا نزدیک دستگاه بگیرید...
                  </div>
                )}
                {posStep === 'pin_entry' && (
                  <div className="text-blue-800 bg-blue-50 border border-blue-200 py-2 px-3 rounded-xl font-bold">
                    مشتری در حال وارد کردن رمز کارت است...
                  </div>
                )}
                {posStep === 'approved' && (
                  <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 py-2.5 px-3 rounded-xl font-black flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>تراکنش تایید شد؛ فاکتور و رسید در حال صدور است.</span>
                  </div>
                )}
                {posStep === 'failed' && (
                  <div className="text-rose-800 bg-rose-50 border border-rose-200 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>خطا در تراکنش یا انصراف خریدار از پرداخت.</span>
                  </div>
                )}
              </div>

              {/* Hex Frame Monitor */}
              {posHexLog.request && (
                <div className="text-[10px] font-mono text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600 space-y-1 overflow-x-auto">
                  <div className="text-indigo-700">TX [STX 0x02]: {posHexLog.request}</div>
                  <div className="text-emerald-700">RX [LRC XOR]: {posHexLog.response}</div>
                  {posHexLog.rrn && <div>RRN: {posHexLog.rrn} | REF: {posHexLog.ref}</div>}
                </div>
              )}

              {posStep === 'failed' && (
                <button
                  onClick={() => setIsPosProcessing(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  بستن پنجره
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add Customer Modal */}
      <AnimatePresence>
        {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-black text-slate-900 text-sm">ثبت مشتری جدید</h4>
                <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نام و نام خانوادگی:</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="مثال: محمد امینی"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">شماره موبایل:</label>
                  <input
                    type="tel"
                    required
                    value={newCustMobile}
                    onChange={(e) => setNewCustMobile(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-mono outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-xs"
                >
                  ذخیره و انتخاب مشتری
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        invoice={completedInvoice}
      />

      {/* Camera Barcode Scanner Modal with continuous workflow */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          setIsCameraScannerPaused(false);
          setQuantityModal(null);
          setUnknownBarcode(null);
        }}
        onScan={(scannedCode) => {
          processBarcodeScan(scannedCode);
        }}
        continuousWorkflow={true}
        isPaused={isCameraScannerPaused}
        title="اسکنر سریع بارکد در صندوق فروش (POS)"
        subtitle="برای ثبت هر کالا، بارکد را مقابل دوربین بگیرید؛ پس از اسکن، تعداد را تایید کنید تا اسکنر به طور خودکار برای کالای بعدی آماده شود."
      />

      {/* Unified Product Scan Quantity Modal */}
      {quantityModal && (
        <ProductScanQuantityModal
          product={quantityModal.product}
          mode={quantityModal.mode}
          targetType="sales"
          currentQtyInInvoice={quantityModal.currentQtyInInvoice}
          confirmButtonText="تأیید و اسکن بعدی"
          onCancel={handleCancelQuantity}
          onConfirm={handleConfirmQuantity}
        />
      )}

      {/* Unknown Barcode Modal */}
      {unknownBarcode && (
        <UnknownBarcodeModal
          barcode={unknownBarcode}
          onRetry={handleRetryUnknownBarcode}
          onQuickAdd={handleQuickAddUnknownBarcode}
          onCancel={handleCancelUnknownBarcode}
        />
      )}

      {/* Quick Add Product Modal for Unknown Barcode */}
      {showQuickAddModal && (
        <QuickAddProductModal
          isOpen={showQuickAddModal}
          onClose={() => {
            setShowQuickAddModal(false);
            if (isCameraScannerOpen) setIsCameraScannerPaused(false);
          }}
          initialBarcode={quickAddBarcode}
          categories={categories}
          onProductCreated={handleProductCreated}
        />
      )}

      {/* مودال لیست فاکتورهای معلق */}
      {showHeldList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">فاکتورهای معلق فروش (نگهداشته‌شده)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHeldList(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1">
              {heldInvoices.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  هیچ فاکتور معلقی وجود ندارد.
                </div>
              ) : (
                heldInvoices.map((d) => {
                  const p = d.payload || {};
                  const itemCount = p.cartItems?.length || 0;
                  const totalUnits = (p.cartItems || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
                  const isCurrent = activeSalesDraftId === d.id;
                  return (
                    <div
                      key={d.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        isCurrent
                          ? 'border-indigo-300 bg-indigo-50/50'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{d.label || 'فاکتور بدون نام'}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold">
                              در حال ویرایش
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {toPersianDigits(itemCount)} ردیف کالا ({toPersianDigits(totalUnits)} عدد) • آخرین تغییر: {new Date(d.updatedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResumeDraft(d)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          ادامه فاکتور
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldDraft(d.id)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-xl transition-colors cursor-pointer"
                          title="حذف پیش‌نویس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-base">پاکسازی اقلام فاکتور جاری؟</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا از حذف تمام {toPersianDigits(cartItems.length)} ردیف کالای موجود در سبد فروش اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartItems([]);
                  setCashReceived('');
                  setShowClearConfirm(false);
                  showToast('اقلام فاکتور جاری پاک شدند.', 'info');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                بله، پاک شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
