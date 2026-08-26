import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Search, Eye, Printer, CheckCircle2, Clock, AlertCircle, ShoppingBag, Truck, Warehouse as WarehouseIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { SalesInvoice, PurchaseInvoice, Supplier, Product, Warehouse } from '../../types';
import { useToast } from '../common/Toast';
import { ReceiptModal } from './ReceiptModal';

export const InvoicesView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseWarehouseId, setPurchaseWarehouseId] = useState<string>('wh_central');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // New Purchase Invoice Modal
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; buyPrice: number; total: number }>
  >([]);
  const [purchasePaidAmount, setPurchasePaidAmount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [salesRes, purRes, supRes, prodRes, whRes] = await Promise.all([
        api.getSalesInvoices(),
        api.getPurchaseInvoices(),
        api.getSuppliers(),
        api.getProducts(),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
      ]);
      setSalesInvoices(salesRes.invoices || []);
      setPurchaseInvoices(purRes.invoices || []);
      setSuppliers(supRes.suppliers || []);
      setProducts(prodRes.products || []);
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
      });
      showToast('فاکتور خرید ثبت و موجودی انبار به‌روزرسانی شد.', 'success');
      setShowNewPurchaseModal(false);
      setPurchaseItems([]);
      setPurchasePaidAmount(0);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت فاکتور خرید', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Tabs & Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            فاکتورهای فروشگاهی (Sales)
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'purchase' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            فاکتورهای خرید انبار (Purchase)
          </button>
        </div>

        {activeTab === 'purchase' && (
          <button
            onClick={() => setShowNewPurchaseModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت فاکتور خرید جدید (ورود به انبار)</span>
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
                  <th className="p-3.5">تاریخ ثبت</th>
                  <th className="p-3.5">مبلغ کل فاکتور</th>
                  <th className="p-3.5">مبلغ پرداخت شده</th>
                  <th className="p-3.5">باقی‌مانده (بدهی ما)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900">{inv.supplierName}</td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {new Date(inv.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{formatToman(inv.totalAmount)}</td>
                    <td className="p-3.5 text-emerald-600 font-mono font-bold">{formatToman(inv.paidAmount)}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-600">
                      {formatToman(inv.remainingAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Purchase Modal */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <h3 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-200">
              ثبت فاکتور خرید و افزایش موجودی انبار
            </h3>

            <form onSubmit={handleSavePurchaseInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">انتخاب تامین‌کننده / توزیع‌کننده:</label>
                  <select
                    value={purchaseSupplierId}
                    onChange={(e) => setPurchaseSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type === 'central_warehouse' ? 'انبار مرکزی' : 'فروشگاه'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add Items Box */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-700">انتخاب کالا جهت اضافه به فاکتور خرید:</div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddPurchaseItem(p)}
                      className="bg-white hover:bg-indigo-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 text-[11px] font-medium"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Selected */}
              {purchaseItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2">نام کالا</th>
                        <th className="p-2">تعداد خرید</th>
                        <th className="p-2">قیمت خرید فی</th>
                        <th className="p-2">جمع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold">{item.productName}</td>
                          <td className="p-2">
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
                              className="w-16 bg-slate-100 border border-slate-200 rounded p-1 font-mono text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.buyPrice}
                              onChange={(e) => {
                                const bp = Number(e.target.value);
                                setPurchaseItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, buyPrice: bp, total: it.quantity * bp } : it))
                                );
                              }}
                              className="w-24 bg-slate-100 border border-slate-200 rounded p-1 font-mono text-center"
                            />
                          </td>
                          <td className="p-2 font-bold font-mono">{formatToman(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl font-bold">
                <span>جمع کل فاکتور خرید:</span>
                <span className="font-mono text-indigo-700 text-sm">
                  {formatToman(purchaseItems.reduce((s, i) => s + i.total, 0))}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">مبلغ پرداختی نقدی فعلی:</label>
                <input
                  type="number"
                  value={purchasePaidAmount}
                  onChange={(e) => setPurchasePaidAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
                >
                  ثبت فاکتور و اعمال در موجودی انبار
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
};
