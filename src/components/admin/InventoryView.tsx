import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  RefreshCw,
  Check,
  ArrowDownUp,
  Building2,
  ArrowLeftRight,
  ClipboardList,
  ShieldAlert,
  History,
  FileSpreadsheet,
  Layers,
  MapPin,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber, formatPersianDate } from '../../lib/utils';
import { Product, Warehouse, InventoryByLocation, InventoryTransfer, InventoryAdjustment, SystemAuditLog } from '../../types';
import { useToast } from '../common/Toast';

export const InventoryView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'warehouses' | 'transfers' | 'adjustments' | 'audit_logs'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryByLocation, setInventoryByLocation] = useState<InventoryByLocation[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Quick edit stock state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromWh, setTransferFromWh] = useState('wh_central');
  const [transferToWh, setTransferToWh] = useState('wh_store_1');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('wh_central');
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('انبارگردانی دوره‌ای');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Add Warehouse Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [newWhCode, setNewWhCode] = useState('');
  const [newWhType, setNewWhType] = useState<'central_warehouse' | 'store' | 'online'>('store');
  const [newWhAddress, setNewWhAddress] = useState('');
  const [newWhPhone, setNewWhPhone] = useState('');
  const [isSubmittingWh, setIsSubmittingWh] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setIsLoading(true);
    try {
      const [prodRes, whRes, invRes, trfRes, adjRes, logsRes] = await Promise.all([
        api.getProducts(),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
        api.getInventoryByLocation().catch(() => ({ inventory: [] })),
        api.getInventoryTransfers().catch(() => ({ transfers: [] })),
        api.getInventoryAdjustments().catch(() => ({ adjustments: [] })),
        api.getAuditLogs({ limit: 50 }).catch(() => ({ logs: [] })),
      ]);

      setProducts(prodRes.products || []);
      const whList: Warehouse[] = whRes.warehouses || [];
      setWarehouses(whList);
      setInventoryByLocation(invRes.inventory || []);
      setTransfers(trfRes.transfers || []);
      setAdjustments(adjRes.adjustments || []);
      setAuditLogs(logsRes.logs || []);

      if (whList.length > 0) {
        const fromId = whList[0].id;
        setTransferFromWh(fromId);
        const otherWh = whList.find((w) => w.id !== fromId);
        if (otherWh) {
          setTransferToWh(otherWh.id);
        }
        setAdjustWarehouseId(fromId);
      }

      if (prodRes.products?.length > 0 && !transferProductId) {
        setTransferProductId(prodRes.products[0].id);
        setAdjustProductId(prodRes.products[0].id);
        setAdjustNewStock(prodRes.products[0].stock);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenTransferModal = (productId?: string, fromWhId?: string) => {
    const fromId = fromWhId || transferFromWh || (warehouses.length > 0 ? warehouses[0].id : 'wh_central');
    setTransferFromWh(fromId);

    const otherWh = warehouses.find((w) => w.id !== fromId);
    if (otherWh) {
      setTransferToWh(otherWh.id);
    }

    if (productId) {
      setTransferProductId(productId);
    } else if (products.length > 0 && !transferProductId) {
      setTransferProductId(products[0].id);
    }

    setIsTransferModalOpen(true);
  };

  const handleUpdateStock = async (product: Product) => {
    try {
      await api.updateProduct(product.id, { stock: newStockValue });
      showToast(`موجودی «${product.name}» به‌روزرسانی و در لاگ ثبت شد.`, 'success');
      setEditingStockId(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت موجودی', 'error');
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId) {
      showToast('لطفاً کالا را انتخاب کنید.', 'error');
      return;
    }
    if (transferFromWh === transferToWh) {
      showToast('انبار مبدا و مقصد نمی‌توانند یکی باشند.', 'error');
      return;
    }
    if (transferQuantity <= 0) {
      showToast('تعداد انتقال باید بزرگتر از صفر باشد.', 'error');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const res = await api.transferStock({
        fromWarehouseId: transferFromWh,
        toWarehouseId: transferToWh,
        productId: transferProductId,
        quantity: transferQuantity,
        notes: transferNotes,
      });

      showToast(res.message || 'حواله انتقال با موفقیت ثبت شد.', 'success');
      setIsTransferModalOpen(false);
      setTransferNotes('');
      setTransferQuantity(1);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'خطا در انتقال کالا', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId) {
      showToast('لطفاً کالا را انتخاب کنید.', 'error');
      return;
    }
    if (adjustNewStock < 0) {
      showToast('موجودی جدید نمی‌تواند منفی باشد.', 'error');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await api.adjustProductStock({
        productId: adjustProductId,
        warehouseId: adjustWarehouseId,
        newStock: adjustNewStock,
        reason: adjustReason,
        notes: adjustNotes,
      });

      showToast(res.message || 'موجودی با موفقیت اصلاح شد.', 'success');
      setIsAdjustModalOpen(false);
      setAdjustNotes('');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'خطا در اصلاح موجودی', 'error');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim() || !newWhCode.trim()) {
      showToast('نام و کد انبار الزامی است.', 'error');
      return;
    }

    setIsSubmittingWh(true);
    try {
      const res = await api.createWarehouse({
        name: newWhName.trim(),
        code: newWhCode.trim(),
        type: newWhType,
        address: newWhAddress.trim(),
        phone: newWhPhone.trim(),
      });

      showToast(res.message || 'انبار جدید با موفقیت ایجاد شد.', 'success');
      setIsWarehouseModalOpen(false);
      setNewWhName('');
      setNewWhCode('');
      setNewWhAddress('');
      setNewWhPhone('');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد انبار', 'error');
    } finally {
      setIsSubmittingWh(false);
    }
  };

  const totalStockCount = products.reduce((sum, p) => sum + p.stock, 0);
  const totalValuation = products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  const filtered = products.filter((p) => {
    if (filterType === 'low') {
      if (p.stock > p.minStockAlert || p.stock <= 0) return false;
    }
    if (filterType === 'out') {
      if (p.stock > 0) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredInventoryByLocation = inventoryByLocation.filter((inv) => {
    if (selectedWarehouseFilter !== 'all' && inv.warehouseId !== selectedWarehouseFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.productName?.toLowerCase().includes(q) ||
        inv.productCode?.toLowerCase().includes(q) ||
        inv.warehouseName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedProductForAdjust = products.find((p) => p.id === adjustProductId);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            سامانه انبارداری پیشرفته و مدیریت چند انباره خطی‌نو
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            کنترل دقیق موجودی به تفکیک انبار مرکزی و فروشگاه‌ها، انتقال بین شعب با قفل تراکنش، و ثبت سوابق انبارگردانی
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenTransferModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            حواله انتقال بین انبارها
          </button>
          <button
            onClick={() => {
              if (products.length > 0) {
                setAdjustProductId(products[0].id);
                setAdjustNewStock(products[0].stock);
              }
              setIsAdjustModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            اصلاح و انبارگردانی
          </button>
          <button
            onClick={() => setIsWarehouseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            تعریف انبار جدید
          </button>
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="بروزرسانی اطلاعات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">ارزش کل موجودی انبارها:</span>
            <div className="text-xl font-black text-slate-900">{formatToman(totalValuation)}</div>
            <div className="text-[11px] text-slate-400 font-medium">{toPersianDigits(warehouses.length)} انبار و شعبه فعال</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">تعداد کل اقلام در گردش:</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {toPersianDigits(totalStockCount)} <span className="text-xs font-normal text-slate-500">عدد/واحد</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">{toPersianDigits(products.length)} ردیف کالایی</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('overview');
            setFilterType('low');
          }}
          className={`bg-white rounded-2xl p-5 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            filterType === 'low' && activeTab === 'overview' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">کالاهای در آستانه کسری:</span>
            <div className="text-xl font-black text-amber-600 font-mono">
              {toPersianDigits(lowStockCount)} <span className="text-xs font-normal text-slate-500">قلم</span>
            </div>
            <div className="text-[11px] text-amber-700 font-semibold">کمتر از حد هشدار تعریف‌شده</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('overview');
            setFilterType('out');
          }}
          className={`bg-white rounded-2xl p-5 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            filterType === 'out' && activeTab === 'overview' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">کالاهای کاملاً ناموجود (صفر):</span>
            <div className="text-xl font-black text-rose-600 font-mono">
              {toPersianDigits(outOfStockCount)} <span className="text-xs font-normal text-slate-500">قلم</span>
            </div>
            <div className="text-[11px] text-rose-700 font-semibold">نیاز به سفارش یا انتقال از انبار مرکزی</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Minus className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          موجودی کل و اصلاح سریع
        </button>

        <button
          onClick={() => setActiveTab('warehouses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'warehouses'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          موجودی به تفکیک انبارها ({toPersianDigits(warehouses.length)})
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          سوابق حواله‌های انتقال ({toPersianDigits(transfers.length)})
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'adjustments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          سوابق اصلاحات و انبارگردانی ({toPersianDigits(adjustments.length)})
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          لاگ‌های حسابرسی و امنیت سیستم
        </button>
      </div>

      {/* TAB 1: OVERVIEW & QUICK EDIT */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Filter Tabs & Search */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام کالا یا کد..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-800 focus:bg-white outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                همه کالاها ({toPersianDigits(products.length)})
              </button>
              <button
                onClick={() => setFilterType('low')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterType === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                رو به اتمام ({toPersianDigits(lowStockCount)})
              </button>
              <button
                onClick={() => setFilterType('out')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterType === 'out' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                ناموجود ({toPersianDigits(outOfStockCount)})
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">کد</th>
                    <th className="p-3.5">نام کالا و دسته</th>
                    <th className="p-3.5 text-center">موجودی تجمیعی</th>
                    <th className="p-3.5 text-center">حد هشدار کسری</th>
                    <th className="p-3.5">بهای خرید فی</th>
                    <th className="p-3.5">ارزش کل موجودی</th>
                    <th className="p-3.5 text-center">اصلاح سریع موجودی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const isEditing = editingStockId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500">{p.code}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.categoryName}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-xs font-mono ${
                              p.stock <= 0
                                ? 'bg-rose-100 text-rose-800'
                                : p.stock <= p.minStockAlert
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {toPersianDigits(p.stock)} {p.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-center text-slate-500 font-mono">
                          {toPersianDigits(p.minStockAlert)} {p.unit}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{formatToman(p.buyPrice)}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{formatToman(p.stock * p.buyPrice)}</td>
                        <td className="p-3.5 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                value={newStockValue}
                                onChange={(e) => setNewStockValue(Number(e.target.value))}
                                className="w-16 bg-white border border-indigo-400 rounded-lg p-1 text-center font-mono font-bold text-xs"
                              />
                              <button
                                onClick={() => handleUpdateStock(p)}
                                className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                title="تایید"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingStockId(null)}
                                className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                                title="انصراف"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStockId(p.id);
                                setNewStockValue(p.stock);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors font-bold text-[11px] cursor-pointer"
                            >
                              تغییر موجودی
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY BY WAREHOUSE */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">فیلتر انبار:</span>
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-bold"
              >
                <option value="all">همه انبارها و شعب</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.type === 'central_warehouse' ? 'مرکزی' : wh.type === 'store' ? 'فروشگاه' : 'آنلاین'})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی کالا در انبارها..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-800 focus:bg-white outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">نام انبار / شعبه</th>
                    <th className="p-3.5">کد کالا</th>
                    <th className="p-3.5">نام کالا</th>
                    <th className="p-3.5 text-center">موجودی در این مکان</th>
                    <th className="p-3.5">محل استقرار در قفسه</th>
                    <th className="p-3.5 text-center">عملیات انتقال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventoryByLocation.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          {inv.warehouseName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">کد: {inv.warehouseCode}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{inv.productCode}</td>
                      <td className="p-3.5 font-bold text-slate-900">{inv.productName}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-xs font-mono ${
                            inv.stock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : inv.stock <= inv.minStockAlert
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {toPersianDigits(inv.stock)} {inv.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {inv.aisleShelf || 'قفسه عمومی'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleOpenTransferModal(inv.productId, inv.warehouseId)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          انتقال به انبار دیگر
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInventoryByLocation.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        موردی برای نمایش یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERS HISTORY */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                دفتر ثبت حواله‌های انتقال بین انبارها
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">{toPersianDigits(transfers.length)} رکورد ثبت‌شده</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">شماره حواله</th>
                    <th className="p-3.5">کالا</th>
                    <th className="p-3.5">انبار مبدا</th>
                    <th className="p-3.5">انبار مقصد</th>
                    <th className="p-3.5 text-center">تعداد منتقل‌شده</th>
                    <th className="p-3.5">کاربر ثبت‌کننده</th>
                    <th className="p-3.5">تاریخ و زمان</th>
                    <th className="p-3.5">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((trf) => (
                    <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-indigo-600">{trf.transferNumber}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{trf.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{trf.productCode}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{trf.fromWarehouseName}</td>
                      <td className="p-3.5 font-medium text-slate-700">{trf.toWarehouseName}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                        {toPersianDigits(trf.quantity)} {trf.unit}
                      </td>
                      <td className="p-3.5 text-slate-600">{trf.userName || 'مدیر انبار'}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{formatPersianDate(trf.createdAt)}</td>
                      <td className="p-3.5">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          انجام‌شده
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        هنوز حواله انتقالی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ADJUSTMENTS HISTORY */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                دفتر سوابق کسری، اضافی و اصلاحات انبارگردانی
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">{toPersianDigits(adjustments.length)} رکورد ثبت‌شده</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">نام کالا</th>
                    <th className="p-3.5">انبار</th>
                    <th className="p-3.5 text-center">موجودی قبلی</th>
                    <th className="p-3.5 text-center">موجودی جدید</th>
                    <th className="p-3.5 text-center">تغییر (دلتا)</th>
                    <th className="p-3.5">دلیل اصلاح</th>
                    <th className="p-3.5">کاربر</th>
                    <th className="p-3.5">تاریخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{adj.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{adj.productCode}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{adj.warehouseName || 'انبار مرکزی'}</td>
                      <td className="p-3.5 text-center font-mono text-slate-600">{toPersianDigits(adj.previousStock)}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900">{toPersianDigits(adj.newStock)}</td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className={adj.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {adj.delta >= 0 ? `+${toPersianDigits(adj.delta)}` : toPersianDigits(adj.delta)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{adj.reason}</div>
                        {adj.notes && <div className="text-[10px] text-slate-400">{adj.notes}</div>}
                      </td>
                      <td className="p-3.5 text-slate-600">{adj.userName || 'مدیر سیستم'}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{formatPersianDate(adj.createdAt)}</td>
                    </tr>
                  ))}
                  {adjustments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        هنوز رکوردی در سوابق انبارگردانی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                لاگ‌های حسابرسی، تغییرات موجودی و وقایع حساس مدیریتی
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">{toPersianDigits(auditLogs.length)} رویداد ثبت‌شده</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">کاربر</th>
                    <th className="p-3.5">ماژول</th>
                    <th className="p-3.5">شرح رویداد</th>
                    <th className="p-3.5">آدرس IP</th>
                    <th className="p-3.5">تاریخ و زمان</th>
                    <th className="p-3.5 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{log.username}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          {log.module}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800 font-medium">{log.action}</td>
                      <td className="p-3.5 font-mono text-slate-500">{log.ip}</td>
                      <td className="p-3.5 font-mono text-slate-500">{formatPersianDate(log.createdAt)}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status === 'success' ? 'موفق' : log.status === 'warning' ? 'هشدار' : 'خطا'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        هیچ لاگی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INTER-WAREHOUSE TRANSFER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                صدور حواله انتقال کالا بین انبارها
              </h2>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب کالا برای انتقال</label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (کد: {p.code}) - موجودی کل: {toPersianDigits(p.stock)} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">انبار مبدا (کاهش موجودی)</label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setTransferFromWh(newFrom);
                      if (newFrom === transferToWh) {
                        const otherWh = warehouses.find((w) => w.id !== newFrom);
                        if (otherWh) setTransferToWh(otherWh.id);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">انبار مقصد (افزایش موجودی)</label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تعداد انتقال</label>
                <input
                  type="number"
                  min="1"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و یادداشت حواله</label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="مثال: تامین کسری شعبه انقلاب یا جابجایی فصلی..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingTransfer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  ثبت و صدور حواله انتقال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                ثبت اصلاحیه و انبارگردانی کالا
              </h2>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب کالا</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => {
                    setAdjustProductId(e.target.value);
                    const sel = products.find((p) => p.id === e.target.value);
                    if (sel) setAdjustNewStock(sel.stock);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (کد: {p.code}) - موجودی فعلی: {toPersianDigits(p.stock)} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">انبار مربوطه</label>
                  <select
                    value={adjustWarehouseId}
                    onChange={(e) => setAdjustWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">موجودی شمارش‌شده جدید</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustNewStock}
                    onChange={(e) => setAdjustNewStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
                    required
                  />
                </div>
              </div>

              {selectedProductForAdjust && (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200 flex items-center justify-between">
                  <span>میزان اختلاف (دلتا):</span>
                  <span className="font-mono font-black">
                    {adjustNewStock - selectedProductForAdjust.stock >= 0 ? '+' : ''}
                    {toPersianDigits(adjustNewStock - selectedProductForAdjust.stock)} {selectedProductForAdjust.unit}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">دلیل اصلاحیه</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                >
                  <option value="انبارگردانی دوره‌ای">انبارگردانی دوره‌ای و تطبیق فیزیکی</option>
                  <option value="کسری و مغایرت شمارش">کسری و مغایرت شمارش</option>
                  <option value="ضایعات و شکستگی">ضایعات و شکستگی</option>
                  <option value="اهدایی و نمونه">اهدایی و نمونه بازاریابی</option>
                  <option value="اصلاح فاکتور قبلی">اصلاح فاکتور یا خطای کاربر</option>
                  <option value="سایر">سایر دلایل</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">یادداشت و شماره صورت‌جلسه</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="شماره صورت‌جلسه انبارگردانی یا توضیحات مدیر..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAdjust ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  ثبت اصلاحیه و لاگ حسابرسی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW WAREHOUSE */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                تعریف انبار یا شعبه جدید
              </h2>
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نام انبار / شعبه</label>
                  <input
                    type="text"
                    value={newWhName}
                    onChange={(e) => setNewWhName(e.target.value)}
                    placeholder="مثال: شعبه ولیعصر"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">کد انبار</label>
                  <input
                    type="text"
                    value={newWhCode}
                    onChange={(e) => setNewWhCode(e.target.value)}
                    placeholder="مثال: WH-VALI"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع انبار</label>
                <select
                  value={newWhType}
                  onChange={(e) => setNewWhType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white"
                >
                  <option value="store">فروشگاه فیزیکی (POS)</option>
                  <option value="central_warehouse">انبار مرکزی</option>
                  <option value="online">انبار فروش آنلاین</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس</label>
                <input
                  type="text"
                  value={newWhAddress}
                  onChange={(e) => setNewWhAddress(e.target.value)}
                  placeholder="تهران، خیابان..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره تماس انبار</label>
                <input
                  type="text"
                  value={newWhPhone}
                  onChange={(e) => setNewWhPhone(e.target.value)}
                  placeholder="۰۲۱-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWh}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingWh ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  ایجاد انبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
