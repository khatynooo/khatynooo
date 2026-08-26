import React, { useState, useEffect } from 'react';
import { Factory, Plus, Play, CheckCircle2, AlertTriangle, Layers, ArrowRight, Package, Sparkles, X, Warehouse as WarehouseIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { ProductionFormula, ProductionOrder, Product, Warehouse } from '../../types';
import { useToast } from '../common/Toast';

export const ProductionView: React.FC = () => {
  const { showToast } = useToast();

  const [formulas, setFormulas] = useState<ProductionFormula[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productionWarehouseId, setProductionWarehouseId] = useState<string>('wh_central');
  const [outputWarehouseId, setOutputWarehouseId] = useState<string>('wh_central');

  // Execute Production Modal
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<ProductionFormula | null>(null);
  const [runQty, setRunQty] = useState<number>(20);

  // Create Formula Modal
  const [showCreateFormulaModal, setShowCreateFormulaModal] = useState(false);
  const [formulaTitle, setFormulaTitle] = useState('');
  const [targetProdId, setTargetProdId] = useState('');
  const [overheadCost, setOverheadCost] = useState(3000);
  const [bomItems, setBomItems] = useState<
    Array<{ rawProductId: string; rawProductName: string; quantityNeeded: number; unit: string }>
  >([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [formRes, ordRes, prodRes, whRes] = await Promise.all([
        api.getProductionFormulas(),
        api.getProductionOrders(),
        api.getProducts(),
        api.getWarehouses().catch(() => ({ warehouses: [] })),
      ]);
      setFormulas(formRes.formulas || []);
      setOrders(ordRes.orders || []);
      setProducts(prodRes.products || []);
      const whList = whRes.warehouses || [];
      setWarehouses(whList);
      if (whList.length > 0) {
        setProductionWarehouseId(whList[0].id);
        setOutputWarehouseId(whList[0].id);
      }
      if (prodRes.products?.length) setTargetProdId(prodRes.products[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  const handleOpenRun = (f: ProductionFormula) => {
    setSelectedFormula(f);
    setRunQty(10);
    setShowRunModal(true);
  };

  const handleExecuteRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormula || runQty <= 0) return;

    try {
      const res = await api.runProduction({
        formulaId: selectedFormula.id,
        quantityToProduce: runQty,
        warehouseId: productionWarehouseId,
        outputWarehouseId: outputWarehouseId,
      });

      if (res.success) {
        showToast(
          `عملیات تولید انجام شد. ${toPersianDigits(runQty)} عدد به موجودی محصول اضافه و مواد اولیه کسر گردید.`,
          'success'
        );
        setShowRunModal(false);
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در اجرای تولید (ممکن است موجودی مواد اولیه کافی نباشد)', 'error');
    }
  };

  const handleAddBomItem = (p: Product) => {
    setBomItems((prev) => {
      if (prev.some((b) => b.rawProductId === p.id)) return prev;
      return [
        ...prev,
        {
          rawProductId: p.id,
          rawProductName: p.name,
          quantityNeeded: 1,
          unit: p.unit,
        },
      ];
    });
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaTitle || !bomItems.length || !targetProdId) {
      showToast('لطفاً عنوان فرمول، محصول نهایی و اقلام مواد اولیه را تعیین کنید.', 'warning');
      return;
    }

    try {
      const targetProd = products.find((p) => p.id === targetProdId);
      await api.createProductionFormula({
        title: formulaTitle,
        outputProductId: targetProdId,
        outputProductName: targetProd?.name || '',
        outputQuantity: 1,
        materials: bomItems,
        overheadCostPerUnit: overheadCost,
      });

      showToast('فرمولاسیون جدید تولید ثبت گردید.', 'success');
      setShowCreateFormulaModal(false);
      setFormulaTitle('');
      setBomItems([]);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت فرمول', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black flex items-center gap-2">
            <Factory className="w-5 h-5 text-indigo-400" />
            <span>مدیریت تولید کارگاهی و فرمولاسیون دفاتر خطی‌نو</span>
          </h2>
          <p className="text-xs text-slate-300">
            تراکنش اتمیک کسر خودکار مواد اولیه (کاغذ، فنر، طلق/جلد) و افزودن مستقیم دفاتر تولیدی به انبار فروشگاهی
          </p>
        </div>

        <button
          onClick={() => setShowCreateFormulaModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف فرمول ساخت جدید (BOM)</span>
        </button>
      </div>

      {/* Formulas Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>فرمول‌های فعال ساخت دفتر و اقلام تولیدی</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {formulas.map((f) => (
            <div key={f.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{f.title}</h4>
                  <div className="text-xs text-indigo-600 font-medium mt-0.5">
                    خروجی: {f.outputProductName} (۱ {f.outputUnit || 'جلد'})
                  </div>
                </div>

                <button
                  onClick={() => handleOpenRun(f)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>اجرای خط تولید</span>
                </button>
              </div>

              {/* Materials BOM */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 text-[11px]">مواد اولیه مورد نیاز برای هر واحد:</div>
                <div className="space-y-1">
                  {f.materials.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-600">
                      <span>• {m.rawProductName}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {toPersianDigits(m.quantityNeeded)} {m.unit}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-200 text-[11px]">
                  <span>هزینه سربار تولید / دستمزد:</span>
                  <span className="font-mono font-bold text-slate-800">{formatToman(f.overheadCostPerUnit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Orders Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-200">
          تاریخچه دستورات تولید و گزارش کسر مواد
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">شماره دستور</th>
                <th className="p-3">عنوان فرمولاسیون</th>
                <th className="p-3">محصول نهایی</th>
                <th className="p-3 text-center">تیراژ تولیدی</th>
                <th className="p-3">تاریخ اجرا</th>
                <th className="p-3">وضعیت تراکنش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-indigo-700">{ord.orderNumber}</td>
                  <td className="p-3 font-bold text-slate-900">{ord.formulaTitle}</td>
                  <td className="p-3 text-slate-700">{ord.outputProductName}</td>
                  <td className="p-3 text-center font-mono font-black text-slate-900">
                    {toPersianDigits(ord.quantityProduced)} جلد
                  </td>
                  <td className="p-3 font-mono text-slate-500">
                    {new Date(ord.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="p-3">
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>تولید و ثبت در انبار</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execute Run Modal */}
      {showRunModal && selectedFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="font-black text-slate-900 text-sm">اجرای بچ تولید کارگاهی</h4>
              <button onClick={() => setShowRunModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRun} className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 space-y-1">
                <div className="font-bold text-indigo-950">{selectedFormula.title}</div>
                <div className="text-[11px] text-indigo-700">محصول نهایی: {selectedFormula.outputProductName}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">کسر مواد اولیه از انبار:</label>
                  <select
                    value={productionWarehouseId}
                    onChange={(e) => setProductionWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ورود محصول تولیدی به انبار:</label>
                  <select
                    value={outputWarehouseId}
                    onChange={(e) => setOutputWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تیراژ مورد نظر برای تولید (تعداد):</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={runQty}
                  onChange={(e) => setRunQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-base outline-none text-center"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-700 text-[11px]">اقلامی که از انبار کسر خواهد شد:</div>
                {selectedFormula.materials.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>• {m.rawProductName}:</span>
                    <span className="font-mono font-bold text-rose-600">
                      - {toPersianDigits(m.quantityNeeded * runQty)} {m.unit}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" />
                  <span>تایید و آغاز تولید</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Formula Modal */}
      {showCreateFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="font-black text-slate-900 text-sm">تعریف فرمولاسیون ساخت جدید (BOM)</h4>
              <button onClick={() => setShowCreateFormulaModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormula} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان فرمول:</label>
                <input
                  type="text"
                  required
                  value={formulaTitle}
                  onChange={(e) => setFormulaTitle(e.target.value)}
                  placeholder="مثال: فرمول تولید دفتر ۱۰۰ برگ سیمی جلد طلقی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">محصول نهایی ایجاد شده در انبار:</label>
                <select
                  value={targetProdId}
                  onChange={(e) => setTargetProdId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">هزینه سربار/دستمزد هر واحد (تومان):</label>
                <input
                  type="number"
                  value={overheadCost}
                  onChange={(e) => setOverheadCost(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
                />
              </div>

              {/* Add Material Section */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-700">انتخاب ماده اولیه از انبار:</div>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddBomItem(p)}
                      className="bg-white hover:bg-indigo-50 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px]"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected BOM Materials */}
              {bomItems.length > 0 && (
                <div className="space-y-2 border border-slate-200 rounded-xl p-3">
                  <div className="font-bold text-slate-700">مقدار مصرف برای هر ۱ واحد محصول نهایی:</div>
                  {bomItems.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="font-bold truncate max-w-xs">{b.rawProductName}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={b.quantityNeeded}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBomItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, quantityNeeded: val } : item))
                            );
                          }}
                          className="w-16 bg-slate-100 border border-slate-200 rounded p-1 font-mono text-center"
                        />
                        <span className="text-slate-500 text-[11px]">{b.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
              >
                ذخیره فرمولاسیون
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
