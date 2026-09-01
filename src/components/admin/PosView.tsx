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
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber, toEnglishDigits } from '../../lib/utils';
import { Product, Customer, PriceTier, Warehouse, ServicePreset } from '../../types';
import { useToast } from '../common/Toast';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';

export const PosView: React.FC = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServicePreset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('wh_central');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cst_walkin');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filter between all items, products only, and services only
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'products' | 'services'>('all');

  // Cart & POS state
  const [cartItems, setCartItems] = useState<
    Array<{
      product: Product;
      quantity: number;
      selectedPrice: number;
      priceTier: PriceTier;
      unit: string;
      discount: number;
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

  // Camera Barcode Scanner Modal (Supports high-speed continuous scan)
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Hardware USB / Bluetooth Barcode Reader Listener
  useHardwareBarcodeScanner({
    onScan: (scannedCode) => {
      const clean = toEnglishDigits(scannedCode).trim();
      const match = products.find(
        (p) => (p.barcode && toEnglishDigits(p.barcode) === clean) || p.code.toLowerCase() === clean.toLowerCase()
      );
      if (match) {
        addToPosCart(match);
        showToast(`«${match.name}» با اسکنر سخت‌افزاری اضافه شد.`, 'success');
      } else {
        showToast(`کالایی با بارکد «${clean}» یافت نشد.`, 'error');
      }
    },
    enabled: true,
  });

  useEffect(() => {
    loadData();
    barcodeRef.current?.focus();
  }, []);

  async function loadData() {
    try {
      const [prodRes, custRes, whRes, srvRes] = await Promise.all([
        api.getProducts(),
        api.getCustomers(),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
        api.getServices().catch(() => ({ services: [] })),
      ]);
      setProducts(prodRes.products || []);
      setCustomers(custRes.customers || []);
      setServices(srvRes.services || srvRes.presets || []);
      
      const whList: Warehouse[] = whRes.warehouses || [];
      setWarehouses(whList);
      if (whList.length > 0 && !selectedWarehouseId) {
        const def = whList.find((w) => w.isDefault) || whList[0];
        setSelectedWarehouseId(def.id);
      }

      const walkin = custRes.customers?.find((c: Customer) => c.id === 'cst_walkin');
      setSelectedCustomer(walkin || custRes.customers?.[0] || null);
    } catch (err) {
      console.error(err);
    }
  }

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    setSelectedCustomer(found || null);
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

  const addToPosCart = (product: Product) => {
    const unitPrice = getPriceByTier(product, activeTier);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedPrice: unitPrice,
          priceTier: activeTier,
          unit: product.unit,
          discount: 0,
        },
      ];
    });
    setBarcodeInput('');
    setSearchQuery('');
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const code = toEnglishDigits(barcodeInput.trim());
    const match = products.find((p) => (p.barcode && toEnglishDigits(p.barcode) === code) || p.code.toLowerCase() === code.toLowerCase());
    if (match) {
      addToPosCart(match);
      showToast(`«${match.name}» اضافه شد.`, 'success');
    } else {
      showToast('کالایی با این بارکد یافت نشد.', 'error');
    }
    setBarcodeInput('');
  };

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

  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.selectedPrice * item.quantity - item.discount, 0);
  const tax = Math.round((subtotal * 10) / 100); // 10% VAT
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
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name || 'مشتری نقدی حضوری',
            customerMobile: selectedCustomer?.mobile,
            items: cartItems.map((i) => ({
              productId: i.product.id,
              productName: i.product.name,
              code: i.product.code,
              barcode: i.product.barcode,
              unit: i.unit,
              quantity: i.quantity,
              buyPrice: i.product.buyPrice,
              salePrice: i.selectedPrice,
              discount: i.discount,
              priceTier: i.priceTier,
              total: i.selectedPrice * i.quantity - i.discount,
            })),
            discount: overallDiscount,
            paymentMethod: 'pos_pasargad',
            paidAmount: finalAmount,
            posResult: posRes,
            warehouseId: selectedWarehouseId,
          });

          if (checkoutRes.success) {
            setCompletedInvoice(checkoutRes.invoice);
            setTimeout(() => {
              setIsPosProcessing(false);
              setShowReceiptModal(true);
              setCartItems([]);
              setOverallDiscount(0);
              loadData(); // reload product stocks
              showToast('تراکنش کارتخوان تایید و فاکتور فروش صادر شد.', 'success');
            }, 1200);
          }
        } else {
          setPosStep('failed');
        }
      } catch (err: any) {
        setPosStep('failed');
        showToast(err.message || 'خطا در ارتباط با کارتخوان', 'error');
      }
    } else {
      // Cash / Credit / Cheque checkout
      try {
        const checkoutRes = await api.posCheckout({
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name || 'مشتری نقدی حضوری',
          customerMobile: selectedCustomer?.mobile,
          items: cartItems.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            code: i.product.code,
            barcode: i.product.barcode,
            unit: i.unit,
            quantity: i.quantity,
            buyPrice: i.product.buyPrice,
            salePrice: i.selectedPrice,
            discount: i.discount,
            priceTier: i.priceTier,
            total: i.selectedPrice * i.quantity - i.discount,
          })),
          discount: overallDiscount,
          paymentMethod,
          paidAmount: paymentMethod === 'credit' ? 0 : finalAmount,
          chequeAmount: paymentMethod === 'cheque' ? finalAmount : 0,
          chequeInfo:
            paymentMethod === 'cheque'
              ? { chequeNumber, sayadId, dueDate: chequeDueDate, bankName }
              : undefined,
          warehouseId: selectedWarehouseId,
        });

        if (checkoutRes.success) {
          setCompletedInvoice(checkoutRes.invoice);
          setShowReceiptModal(true);
          setCartItems([]);
          setOverallDiscount(0);
          loadData();
          showToast('فاکتور با موفقیت ثبت گردید.', 'success');
        }
      } catch (err: any) {
        showToast(err.message || 'خطا در ثبت فاکتور', 'error');
      }
    }
  };

  // Combined Goods & Services for POS
  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode.includes(searchQuery)
      )
    : [];

  const filteredServices = searchQuery.trim()
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Top Bar: Barcode Input + Warehouse Selector + 5 Price Tier Selector */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Fast Barcode Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="بارکدخوان فعال است... (بارکد کالا را اسکن کنید یا کد دستی بزنید)"
              className="w-full bg-slate-50 border-2 border-indigo-200 focus:border-indigo-600 focus:bg-white rounded-xl pr-10 pl-4 py-2.5 text-sm font-mono text-slate-900 outline-none transition-all"
            />
            <Barcode className="w-5 h-5 text-indigo-600 absolute right-3 top-3" />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs cursor-pointer"
          >
            ثبت بارکد
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Warehouse Selector */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-900">
            <WarehouseIcon className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] font-bold text-amber-800 shrink-0">کسر از انبار:</span>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent font-bold text-xs text-amber-950 outline-none cursor-pointer"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="text-slate-900 bg-white">
                  {w.name} ({w.type === 'central_warehouse' ? 'مرکزی' : w.type === 'online' ? 'سایت' : 'مغازه'})
                </option>
              ))}
            </select>
          </div>

          {/* 5 Price Tier Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 shrink-0">سطح قیمت:</span>
            {[
              { id: 'shop1', label: 'فروشگاه ۱ (نقدی/حضوری)' },
              { id: 'shop2', label: 'فروشگاه ۲ (آنلاین/ترب)' },
              { id: 'shop3', label: 'فروشگاه ۳ (همکار/شعبه)' },
              { id: 'wholesale', label: 'عمده‌فروشی / مدارس' },
              { id: 'manual', label: 'دستی / پایه' },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => setActiveTier(tier.id as PriceTier)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTier === tier.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main POS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left / Center: Search Catalog & Cart Items (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Product & Service Catalog / Live Search */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            {/* Category Filter Tabs */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setItemTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    itemTypeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه اقلام ({toPersianDigits(products.length + services.length)})
                </button>
                <button
                  onClick={() => setItemTypeFilter('products')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    itemTypeFilter === 'products'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  کالاها و محصولات ({toPersianDigits(products.length)})
                </button>
                <button
                  onClick={() => setItemTypeFilter('services')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    itemTypeFilter === 'services'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  خدمات چاپ و صحافی ({toPersianDigits(services.length)})
                </button>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">انتخاب سریع یا جستجو</span>
            </div>

            {/* Search & Barcode Input Row */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام، کد کالا یا خدمت (خودکار، دفتر، پرینت، فنرزنی...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-800 focus:bg-white outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>

              {/* Barcode Quick Form */}
              <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <input
                    ref={barcodeRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="بارکد کالا..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-2 py-2 text-xs font-mono text-slate-800 focus:bg-white outline-none"
                  />
                  <Barcode className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  افزودن
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="اسکن فوق‌سریع با دوربین یا بارکدخوان فیزیکی"
                >
                  <ScanLine className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">دوربین</span>
                </button>
              </form>
            </div>

            {/* Live Search Results OR Quick Pick Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {/* If search query is active */}
              {searchQuery.trim() ? (
                <>
                  {(itemTypeFilter === 'all' || itemTypeFilter === 'products') &&
                    filteredProducts.map((p) => (
                      <button
                        key={`p_${p.id}`}
                        onClick={() => addToPosCart(p)}
                        className="p-2 bg-white hover:bg-indigo-50 hover:border-indigo-300 rounded-xl border border-slate-200 text-right text-xs transition-colors flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-bold text-slate-800 line-clamp-1">{p.name}</div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold shrink-0">کالا</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[11px]">
                          <span className="text-slate-400">موجودی: {toPersianDigits(p.stock)}</span>
                          <span className="font-black text-indigo-700">{formatToman(getPriceByTier(p, activeTier))}</span>
                        </div>
                      </button>
                    ))}

                  {(itemTypeFilter === 'all' || itemTypeFilter === 'services') &&
                    filteredServices.map((s) => (
                      <button
                        key={`s_${s.id}`}
                        onClick={() => addServiceToPosCart(s)}
                        className="p-2 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 rounded-xl border border-amber-200 text-right text-xs transition-colors flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-bold text-amber-950 line-clamp-1">{s.name || s.title}</div>
                          <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold shrink-0">خدمت</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[11px]">
                          <span className="text-amber-700">{s.unit || 'مورد'}</span>
                          <span className="font-black text-amber-800">{formatToman(s.price || s.priceSingle1 || 0)}</span>
                        </div>
                      </button>
                    ))}

                  {filteredProducts.length === 0 && filteredServices.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400">
                      موردی مطابق با جستجوی شما یافت نشد.
                    </div>
                  )}
                </>
              ) : (
                /* Default quick-pick grid when no query */
                <>
                  {(itemTypeFilter === 'all' || itemTypeFilter === 'products') &&
                    products.slice(0, itemTypeFilter === 'products' ? 12 : 6).map((p) => (
                      <button
                        key={`p_quick_${p.id}`}
                        onClick={() => addToPosCart(p)}
                        className="p-2 bg-white hover:bg-indigo-50 hover:border-indigo-300 rounded-xl border border-slate-200 text-right text-xs transition-colors flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-bold text-slate-800 line-clamp-1">{p.name}</div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold shrink-0">کالا</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[11px]">
                          <span className="text-slate-400">موجودی: {toPersianDigits(p.stock)}</span>
                          <span className="font-black text-indigo-700">{formatToman(getPriceByTier(p, activeTier))}</span>
                        </div>
                      </button>
                    ))}

                  {(itemTypeFilter === 'all' || itemTypeFilter === 'services') &&
                    services.slice(0, itemTypeFilter === 'services' ? 12 : 6).map((s) => (
                      <button
                        key={`s_quick_${s.id}`}
                        onClick={() => addServiceToPosCart(s)}
                        className="p-2 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 rounded-xl border border-amber-200 text-right text-xs transition-colors flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-bold text-amber-950 line-clamp-1">{s.name || s.title}</div>
                          <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold shrink-0">خدمت</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[11px]">
                          <span className="text-amber-700">{s.unit || 'مورد'}</span>
                          <span className="font-black text-amber-800">{formatToman(s.price || s.priceSingle1 || 0)}</span>
                        </div>
                      </button>
                    ))}
                </>
              )}
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <span>اقلام فاکتور جاری ({toPersianDigits(cartItems.length)} ردیف)</span>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                >
                  پاک کردن همه
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <Barcode className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p>هنوز کالا یا خدمتی به فاکتور افزوده نشده است. بارکد را اسکن یا از کاتالوگ بالا انتخاب نمایید.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">ردیف</th>
                      <th className="p-3">نوع و شرح قلم</th>
                      <th className="p-3 text-center">تعداد / واحد</th>
                      <th className="p-3">قیمت واحد</th>
                      <th className="p-3">جمع کل</th>
                      <th className="p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item, idx) => (
                      <tr key={item.product.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              item.product.isService ? 'bg-amber-100 text-amber-900' : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              {item.product.isService ? 'خدمت' : 'کالا'}
                            </span>
                            <div className="font-bold text-slate-900">{item.product.name}</div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.product.code}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200 max-w-[100px] mx-auto">
                            <button
                              onClick={() => updateItemQty(item.product.id, -1)}
                              className="w-5 h-5 rounded bg-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold">{toPersianDigits(item.quantity)}</span>
                            <button
                              onClick={() => updateItemQty(item.product.id, 1)}
                              className="w-5 h-5 rounded bg-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{formatToman(item.selectedPrice)}</td>
                        <td className="p-3 font-black text-indigo-700">
                          {formatToman(item.selectedPrice * item.quantity)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer & Checkout Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Customer Selection Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">مشتری و طرف‌حساب:</label>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ مشتری جدید</span>
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.mobile}
                </option>
              ))}
            </select>

            {selectedCustomer && selectedCustomer.id !== 'cst_walkin' && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-500">وضعیت حساب / بدهی:</span>
                <span className={`font-bold ${selectedCustomer.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selectedCustomer.balance === 0
                    ? 'تسویه کامل'
                    : selectedCustomer.balance < 0
                    ? `بدهکار: ${formatToman(Math.abs(selectedCustomer.balance))}`
                    : `بستانکار: ${formatToman(selectedCustomer.balance)}`}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 text-xs">
            <label className="font-bold text-slate-700 block">نحوه تسویه فاکتور:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pos_pasargad')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'pos_pasargad'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 border-2'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>کارتخوان پاسارگاد</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 border-2'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>نقدی / اسکناس</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'credit'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 border-2'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>نسیه / حساب دفتری</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cheque')}
                className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  paymentMethod === 'cheque'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 border-2'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>چک صیادی</span>
              </button>
            </div>

            {/* Cheque Details Form if Cheque selected */}
            {paymentMethod === 'cheque' && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2 mt-2">
                <div className="font-bold text-purple-900 text-[11px]">اطلاعات چک دریافتی:</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="شماره چک"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="bg-white border border-purple-200 rounded-lg p-1.5 text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="شناسه ۱۶ رقمی صیاد"
                    value={sayadId}
                    onChange={(e) => setSayadId(e.target.value)}
                    className="bg-white border border-purple-200 rounded-lg p-1.5 text-xs font-mono"
                  />
                  <input
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    className="bg-white border border-purple-200 rounded-lg p-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="نام بانک"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-white border border-purple-200 rounded-lg p-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Checkout Summary Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>جمع کل اقلام:</span>
                <span>{formatToman(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>مالیات ارزش افزوده (۱۰٪):</span>
                <span>{formatToman(tax)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>تخفیف کلی فاکتور:</span>
                <input
                  type="number"
                  min={0}
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(Number(e.target.value))}
                  placeholder="مبلغ تخفیف"
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg p-1 text-left font-mono text-white text-xs outline-none"
                />
              </div>
              <div className="flex justify-between text-white font-black text-sm pt-3 border-t border-slate-800">
                <span>مبلغ قابل دریافت:</span>
                <span className="text-amber-400 text-lg sm:text-xl font-mono">{formatToman(finalAmount)}</span>
              </div>
            </div>

            <button
              onClick={handleExecuteCheckout}
              disabled={cartItems.length === 0}
              className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                cartItems.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : paymentMethod === 'pos_pasargad'
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white shadow-indigo-600/30'
              }`}
            >
              {paymentMethod === 'pos_pasargad' ? (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>ارسال مبلغ به کارتخوان پاسارگاد ({formatToman(finalAmount)})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ثبت نهایی و صدور فاکتور</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* POS Terminal Interaction Modal (TCP/IP Simulation & Live Status) */}
      <AnimatePresence>
        {isPosProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700 text-center space-y-5"
            >
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">پوز بانک پاسارگاد (TCP/IP)</h3>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  IP: 192.168.1.150:7000 • ترمینال: 87654321
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">مبلغ ارسالی به پوز:</div>
                <div className="text-2xl font-black text-amber-400 font-mono">{formatToman(finalAmount)}</div>
              </div>

              {/* Dynamic Step Indicator */}
              <div className="space-y-3 text-xs">
                {posStep === 'connecting' && (
                  <div className="flex items-center justify-center gap-2 text-indigo-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>برقراری سوکت TCP با پایانه فروشگاهی...</span>
                  </div>
                )}
                {posStep === 'swipe_card' && (
                  <div className="text-amber-300 font-bold animate-pulse">
                    لطفاً کارت بانکی را بکشید یا نزدیک دستگاه بگیرید...
                  </div>
                )}
                {posStep === 'pin_entry' && (
                  <div className="text-sky-300 font-bold">
                    مشتری در حال ورود رمز ۴ رقمی کارت...
                  </div>
                )}
                {posStep === 'approved' && (
                  <div className="text-emerald-400 font-black flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تراکنش با موفقیت انجام شد و رسید چاپ شد.</span>
                  </div>
                )}
                {posStep === 'failed' && (
                  <div className="text-rose-400 font-bold flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>خطا در تراکنش یا انصراف کاربر.</span>
                  </div>
                )}
              </div>

              {/* Hex Frame Monitor */}
              {posHexLog.request && (
                <div className="text-[10px] font-mono text-left bg-black/50 p-2.5 rounded-xl border border-slate-800 text-slate-400 space-y-1 overflow-x-auto">
                  <div className="text-indigo-400">TX [STX 0x02]: {posHexLog.request}</div>
                  <div className="text-emerald-400">RX [LRC XOR]: {posHexLog.response}</div>
                  {posHexLog.rrn && <div>RRN: {posHexLog.rrn} | REF: {posHexLog.ref}</div>}
                </div>
              )}

              {posStep === 'failed' && (
                <button
                  onClick={() => setIsPosProcessing(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs"
                >
                  بستن
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

      {/* High Performance Camera Barcode Scanner Modal with continuous mode */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(scannedCode) => {
          const match = products.find(
            (p) => p.barcode === scannedCode || p.code.toLowerCase() === scannedCode.toLowerCase()
          );
          if (match) {
            addToPosCart(match);
            showToast(`«${match.name}» به فاکتور اضافه شد.`, 'success');
          } else {
            showToast(`کالایی با بارکد «${scannedCode}» پیدا نشد.`, 'error');
          }
        }}
        title="اسکن سریع بارکد در صندوق فروش"
      />
    </div>
  );
};
