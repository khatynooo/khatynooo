import React, { useState, useEffect } from 'react';
import { Printer, Plus, Edit2, CheckCircle2, Clock, Calculator, ShoppingBag, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { CopyPrintService, ServiceOrder } from '../../types';
import { useToast } from '../common/Toast';

export const ServicesView: React.FC = () => {
  const { showToast } = useToast();

  const [services, setServices] = useState<CopyPrintService[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  // Quick Counter Calculator
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [pagesCount, setPagesCount] = useState(20);
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [bindingType, setBindingType] = useState('none');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  // Service Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    serviceType: 'bw_a4' as any,
    basePriceSingle: 2000,
    basePriceDouble: 3500,
    volumeDiscountThreshold: 50,
    volumeDiscountPercent: 10,
    bindingSpiralPrice: 35000,
    bindingHardcoverPrice: 85000,
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [srvRes, ordRes] = await Promise.all([api.getServices(), api.getServiceOrders()]);
      setServices(srvRes.services || []);
      setOrders(ordRes.orders || []);
      if (srvRes.services?.length) setSelectedServiceId(srvRes.services[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const calculateCounterTotal = () => {
    if (!selectedService) return 0;
    const baseUnit = isDoubleSided ? selectedService.basePriceDouble : selectedService.basePriceSingle;
    let pagesTotal = baseUnit * pagesCount;
    if (pagesCount >= selectedService.volumeDiscountThreshold) {
      pagesTotal = Math.round(pagesTotal * (1 - selectedService.volumeDiscountPercent / 100));
    }
    let bindingCost = 0;
    if (bindingType === 'spiral') bindingCost = selectedService.bindingSpiralPrice;
    if (bindingType === 'hardcover') bindingCost = selectedService.bindingHardcoverPrice;
    return pagesTotal + bindingCost;
  };

  const handleRegisterServiceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    try {
      const total = calculateCounterTotal();
      await api.createServiceOrder({
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        customerName: customerName || 'مشتری حضوری کپی',
        customerMobile: customerMobile || '09000000000',
        pageCount: pagesCount,
        isDoubleSided,
        bindingType,
        totalAmount: total,
      });
      showToast('سفارش خدمات تکثیر ثبت و در سیستم فاکتور شد.', 'success');
      setPagesCount(10);
      setCustomerName('');
      setCustomerMobile('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت سفارش کپی', 'error');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createService(serviceForm);
      showToast('تعرفه جدید خدمات با موفقیت ثبت شد.', 'success');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت تعرفه', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <span>مدیریت تعرفه و سفارشات کپی، پرینت و صحافی</span>
          </h2>
          <p className="text-xs text-slate-300">
            محاسبه هوشمند بر اساس تیراژ، دورو/تک‌رو، نوع صحافی (سیمی فنری، طلق، جلد سخت) و ثبت مستقیم در صندوق
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن تعرفه جدید</span>
        </button>
      </div>

      {/* Grid: Quick Counter Calculator + Services Tariffs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Counter Calculator (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>محاسبه‌گر سریع پیشخوان (صدور فیش کپی)</span>
          </h3>

          <form onSubmit={handleRegisterServiceOrder} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">نوع خدمت پرینت / کپی:</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تعداد برگ / صفحات:</label>
              <input
                type="number"
                min={1}
                value={pagesCount}
                onChange={(e) => setPagesCount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-4 py-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isDoubleSided}
                  onChange={(e) => setIsDoubleSided(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>چاپ دورو</span>
              </label>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">نوع صحافی و جلد:</label>
              <select
                value={bindingType}
                onChange={(e) => setBindingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-bold"
              >
                <option value="none">بدون صحافی (ساده)</option>
                <option value="spiral">صحافی سیمی / فنری دوبل (+{formatToman(selectedService?.bindingSpiralPrice || 0)})</option>
                <option value="hardcover">جلد سخت گالینگور (+{formatToman(selectedService?.bindingHardcoverPrice || 0)})</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="نام مشتری (اختیاری)"
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none"
              />
              <input
                type="tel"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="شماره تماس"
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
              />
            </div>

            {/* Total Result Box */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 mt-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>مبلغ قابل پرداخت مشتری:</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {formatToman(calculateCounterTotal())}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت سفارش و ارسال به صندوق</span>
            </button>
          </form>
        </div>

        {/* Right: Active Tariffs & Orders History (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-200">
              جدول تعرفه‌های فعال سیستم
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((s) => (
                <div key={s.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="font-bold text-slate-900">{s.title}</div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span>تک‌رو:</span>
                      <span className="font-mono font-bold text-slate-900">{formatToman(s.basePriceSingle)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>دورو:</span>
                      <span className="font-mono font-bold text-slate-900">{formatToman(s.basePriceDouble)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-700">
                      <span>تخفیف تیراژ بالای {toPersianDigits(s.volumeDiscountThreshold)} برگ:</span>
                      <span className="font-bold">{toPersianDigits(s.volumeDiscountPercent)}٪</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Service Orders Log */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-200">
              سفارشات اخیر تکثیر و پرینت
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">عنوان خدمت</th>
                    <th className="p-2.5">مشتری</th>
                    <th className="p-2.5 text-center">تعداد برگ</th>
                    <th className="p-2.5">مبلغ کل</th>
                    <th className="p-2.5">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800">{o.serviceTitle}</td>
                      <td className="p-2.5">{o.customerName}</td>
                      <td className="p-2.5 text-center font-mono">{toPersianDigits(o.pageCount)}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{formatToman(o.totalAmount)}</td>
                      <td className="p-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          تحویل شده
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* New Service Tariff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="font-black text-slate-900 text-sm">تعریف تعرفه خدمت جدید</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان خدمت:</label>
                <input
                  type="text"
                  required
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  placeholder="مثال: پرینت و کپی رنگی لیزری A4"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">قیمت تک‌رو (تومان):</label>
                  <input
                    type="number"
                    required
                    value={serviceForm.basePriceSingle}
                    onChange={(e) => setServiceForm({ ...serviceForm, basePriceSingle: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">قیمت دورو (تومان):</label>
                  <input
                    type="number"
                    required
                    value={serviceForm.basePriceDouble}
                    onChange={(e) => setServiceForm({ ...serviceForm, basePriceDouble: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">آستانه تخفیف تیراژ (برگ):</label>
                  <input
                    type="number"
                    value={serviceForm.volumeDiscountThreshold}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, volumeDiscountThreshold: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">درصد تخفیف تیراژ:</label>
                  <input
                    type="number"
                    value={serviceForm.volumeDiscountPercent}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, volumeDiscountPercent: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
              >
                ذخیره تعرفه
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
