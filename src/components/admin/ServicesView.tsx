import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Calculator,
  ShoppingBag,
  X,
  Globe,
  Building,
  DollarSign,
  Layers,
  Sparkles,
  Search,
  Filter,
  Check,
  AlertTriangle,
  FileText,
  Bookmark,
  Share2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { CopyPrintService, ServiceOrder, ServiceVisibility } from '../../types';
import { useToast } from '../common/Toast';
import { CurrencyInput } from '../common/CurrencyInput';

export const ServicesView: React.FC = () => {
  const { showToast } = useToast();

  const [services, setServices] = useState<CopyPrintService[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | ServiceVisibility>('all');

  // Quick Counter Calculator State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [priceTierMode, setPriceTierMode] = useState<'auto' | 'tier1' | 'tier2'>('auto');
  const [pagesCount, setPagesCount] = useState(20);
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [bindingType, setBindingType] = useState<'none' | 'spiral' | 'hardcover' | 'cellophane'>('none');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  // Service Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'copy_print' as any,
    unit: 'صفحه',
    // یک‌رو دو قیمت
    priceSingle1: 2000,
    priceSingle2: 1600,
    // دورو دو قیمت
    priceDouble1: 3500,
    priceDouble2: 2800,
    // خدمات صحافی و تکمیلی
    bindingSpiralPrice: 35000,
    bindingHardcoverPrice: 85000,
    bindingCellophanePrice: 15000,
    // قوانین تیراژ
    volumeDiscountThreshold: 50,
    volumeDiscountPercent: 10,
    // انتشار و دسترسی کانال (فقط حسابداری، فقط سایت، هر دو)
    visibility: 'both' as ServiceVisibility,
    description: '',
  });

  // Delete confirmation modal state
  const [serviceToDelete, setServiceToDelete] = useState<CopyPrintService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [srvRes, ordRes] = await Promise.all([api.getServices(), api.getServiceOrders()]);
      const srvList = srvRes.services || srvRes.presets || [];
      setServices(srvList);
      setOrders(ordRes.records || ordRes.orders || []);
      if (srvList.length && !selectedServiceId) {
        setSelectedServiceId(srvList[0].id);
      }
    } catch (err: any) {
      console.error('Error loading service data:', err);
      showToast('خطا در دریافت اطلاعات خدمات و تعرفه‌ها', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Selected Service for the counter calculator
  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];

  // Counter calculation logic
  const calculationResult = useMemo(() => {
    if (!selectedService) {
      return {
        unitRate: 0,
        rateLabel: '',
        pagesTotal: 0,
        bindingCost: 0,
        volumeDiscountAmount: 0,
        finalTotal: 0,
        isTier2: false,
      };
    }

    const single1 = Number(selectedService.priceSingle1 || selectedService.basePriceSingle || selectedService.price || 0);
    const single2 = Number(selectedService.priceSingle2 || Math.round(single1 * 0.85));
    const double1 = Number(selectedService.priceDouble1 || selectedService.basePriceDouble || Math.round(single1 * 1.6));
    const double2 = Number(selectedService.priceDouble2 || Math.round(single1 * 1.35));

    const threshold = Number(selectedService.volumeDiscountThreshold || 50);

    let useTier2 = false;
    if (priceTierMode === 'tier2') {
      useTier2 = true;
    } else if (priceTierMode === 'auto' && pagesCount >= threshold) {
      useTier2 = true;
    }

    let unitRate = 0;
    let rateLabel = '';

    if (isDoubleSided) {
      unitRate = useTier2 ? double2 : double1;
      rateLabel = useTier2 ? 'دورو (نرخ ۲ - تیراژ/همکار)' : 'دورو (نرخ ۱ - عادی)';
    } else {
      unitRate = useTier2 ? single2 : single1;
      rateLabel = useTier2 ? 'یک‌رو (نرخ ۲ - تیراژ/همکار)' : 'یک‌رو (نرخ ۱ - عادی)';
    }

    let pagesTotal = unitRate * pagesCount;
    let volumeDiscountAmount = 0;

    // اگر تخفیف مازاد درصدی نیز برای تیراژ تعیین شده بود
    const discountPercent = Number(selectedService.volumeDiscountPercent || 0);
    if (pagesCount >= threshold && discountPercent > 0 && priceTierMode !== 'tier2') {
      volumeDiscountAmount = Math.round((pagesTotal * discountPercent) / 100);
      pagesTotal -= volumeDiscountAmount;
    }

    let bindingCost = 0;
    if (bindingType === 'spiral') {
      bindingCost = Number(selectedService.bindingSpiralPrice || 35000);
    } else if (bindingType === 'hardcover') {
      bindingCost = Number(selectedService.bindingHardcoverPrice || 85000);
    } else if (bindingType === 'cellophane') {
      bindingCost = Number(selectedService.bindingCellophanePrice || 15000);
    }

    const finalTotal = Math.max(0, pagesTotal + bindingCost);

    return {
      unitRate,
      rateLabel,
      pagesTotal,
      bindingCost,
      volumeDiscountAmount,
      finalTotal,
      isTier2: useTier2,
    };
  }, [selectedService, pagesCount, isDoubleSided, priceTierMode, bindingType]);

  // Open modal in Create mode
  const handleOpenAddModal = () => {
    setEditingServiceId(null);
    setServiceForm({
      name: '',
      category: 'copy_print',
      unit: 'صفحه',
      priceSingle1: 2000,
      priceSingle2: 1600,
      priceDouble1: 3500,
      priceDouble2: 2800,
      bindingSpiralPrice: 35000,
      bindingHardcoverPrice: 85000,
      bindingCellophanePrice: 15000,
      volumeDiscountThreshold: 50,
      volumeDiscountPercent: 10,
      visibility: 'both',
      description: '',
    });
    setShowModal(true);
  };

  // Open modal in Edit mode
  const handleOpenEditModal = (service: CopyPrintService) => {
    setEditingServiceId(service.id);

    const single1 = Number(service.priceSingle1 || service.basePriceSingle || service.price || 2000);
    const single2 = Number(service.priceSingle2 || Math.round(single1 * 0.85));
    const double1 = Number(service.priceDouble1 || service.basePriceDouble || Math.round(single1 * 1.6));
    const double2 = Number(service.priceDouble2 || Math.round(single1 * 1.35));

    let vis: ServiceVisibility = 'both';
    if (service.visibility) {
      vis = service.visibility;
    } else if (service.onlyAccounting) {
      vis = 'only_accounting';
    } else if (service.showOnWebsite && !service.showInPos) {
      vis = 'only_website';
    }

    setServiceForm({
      name: service.name || service.title || '',
      category: service.category || 'copy_print',
      unit: service.unit || 'صفحه',
      priceSingle1: single1,
      priceSingle2: single2,
      priceDouble1: double1,
      priceDouble2: double2,
      bindingSpiralPrice: Number(service.bindingSpiralPrice || 35000),
      bindingHardcoverPrice: Number(service.bindingHardcoverPrice || 85000),
      bindingCellophanePrice: Number(service.bindingCellophanePrice || 15000),
      volumeDiscountThreshold: Number(service.volumeDiscountThreshold || 50),
      volumeDiscountPercent: Number(service.volumeDiscountPercent !== undefined ? service.volumeDiscountPercent : 10),
      visibility: vis,
      description: service.description || '',
    });
    setShowModal(true);
  };

  // Save (Create / Edit) Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      showToast('لطفاً عنوان خدمت را وارد فرمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingServiceId) {
        await api.updateService(editingServiceId, serviceForm);
        showToast('تعرفه خدمت با موفقیت ویرایش و ذخیره شد.', 'success');
      } else {
        await api.createService(serviceForm);
        showToast('تعرفه جدید خدمت با موفقیت ثبت شد.', 'success');
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Error saving service preset:', err);
      showToast(err.message || 'خطا در ذخیره‌سازی تعرفه خدمت', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Service
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    setIsSubmitting(true);
    try {
      await api.deleteService(serviceToDelete.id);
      showToast(`تعرفه «${serviceToDelete.name || serviceToDelete.title}» با موفقیت حذف گردید.`, 'success');
      setServiceToDelete(null);
      if (selectedServiceId === serviceToDelete.id) {
        setSelectedServiceId('');
      }
      await loadData();
    } catch (err: any) {
      console.error('Error deleting service preset:', err);
      showToast(err.message || 'خطا در حذف تعرفه خدمت', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register service order from counter
  const handleRegisterServiceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      const total = calculationResult.finalTotal;
      const srvTitle = selectedService.name || selectedService.title || 'خدمت تکثیر و کپی';
      const sideText = isDoubleSided ? 'دورو' : 'یک‌رو';
      const bindingText =
        bindingType === 'spiral'
          ? 'با صحافی فنری دوبل'
          : bindingType === 'hardcover'
          ? 'با جلد سخت گالینگور'
          : bindingType === 'cellophane'
          ? 'با سلفون و طلق'
          : 'بدون صحافی';

      await api.createServiceOrder({
        serviceId: selectedService.id,
        serviceName: `${srvTitle} (${pagesCount} ${selectedService.unit || 'برگ'} ${sideText} ${bindingText})`,
        customerName: customerName.trim() || 'مشتری عمومی / حضوری',
        customerMobile: customerMobile.trim() || '',
        category: selectedService.category || 'copy_print',
        quantity: pagesCount,
        unitPrice: calculationResult.unitRate,
        totalPrice: total,
        description: `سفارش پیشخوان: ${pagesCount} ${selectedService.unit || 'صفحه'} ${sideText} - ${calculationResult.rateLabel} - ${bindingText}`,
        status: 'done',
      });

      showToast(`سفارش به مبلغ ${formatToman(total)} ثبت و در دفتر معین خزانه فاکتور شد.`, 'success');
      setPagesCount(20);
      setCustomerName('');
      setCustomerMobile('');
      setBindingType('none');
      await loadData();
    } catch (err: any) {
      console.error('Error registering service order:', err);
      showToast(err.message || 'خطا در ثبت سفارش کپی', 'error');
    }
  };

  // Filtered services for display
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const nameMatch =
        (s.name || s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!nameMatch) return false;

      if (visibilityFilter === 'all') return true;

      const vis = s.visibility || (s.onlyAccounting ? 'only_accounting' : (s.showOnWebsite && !s.showInPos ? 'only_website' : 'both'));
      return vis === visibilityFilter;
    });
  }, [services, searchQuery, visibilityFilter]);

  return (
    <div className="space-y-6 text-[#E0E0E0]">
      {/* Top Header Card */}
      <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/30 flex items-center justify-center font-black shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#F3F4F6]">
                مدیریت خدمات کپی، پرینت، چند قیمتی و تعرفه‌ها
              </h2>
              <p className="text-xs text-[#8E9299]">
                تعریف تعرفه‌ها با پشتیبانی از ۴ سطح قیمت (یک‌رو ۱ و ۲، دورو ۱ و ۲)، تفکیک کانال (فقط حسابداری / فقط سایت / هر دو)، صحافی و تخفیف تیراژ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>افزودن تعرفه خدمت جدید</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Quick Counter + Tariffs List & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (5 Cols): Quick Counter Calculator */}
        <div className="lg:col-span-5 bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222225]">
            <h3 className="text-sm font-black text-[#F3F4F6] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#C9A227]" />
              <span>محاسبه‌گر سریع پیشخوان و صدور فیش</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#161619] border border-[#2D2D33] text-[#8E9299] font-mono">
              ثبت آنی در خزانه
            </span>
          </div>

          <form onSubmit={handleRegisterServiceOrder} className="space-y-4 text-xs">
            {/* Service Select */}
            <div>
              <label className="font-bold text-[#8E9299] block mb-1.5">انتخاب تعرفه خدمت:</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-bold outline-none text-[#E0E0E0] cursor-pointer"
              >
                {services.map((s) => {
                  const vis = s.visibility || (s.onlyAccounting ? 'only_accounting' : 'both');
                  const visBadge =
                    vis === 'only_accounting'
                      ? '🏢 [فقط حسابداری]'
                      : vis === 'only_website'
                      ? '🌐 [فقط سایت]'
                      : '⚡ [سایت + حسابداری]';
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name || s.title} {visBadge}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Price Tier Selection */}
            <div>
              <label className="font-bold text-[#8E9299] block mb-1.5">سطح قیمت‌گذاری:</label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#161619] p-1 rounded-xl border border-[#2D2D33]">
                <button
                  type="button"
                  onClick={() => setPriceTierMode('auto')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    priceTierMode === 'auto'
                      ? 'bg-[#C9A227] text-black shadow-xs'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  هوشمند (تیراژ)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceTierMode('tier1')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    priceTierMode === 'tier1'
                      ? 'bg-[#C9A227] text-black shadow-xs'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  نرخ ۱ (عادی)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceTierMode('tier2')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    priceTierMode === 'tier2'
                      ? 'bg-[#C9A227] text-black shadow-xs'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  نرخ ۲ (همکار/تیراژ)
                </button>
              </div>
            </div>

            {/* Quantity and Side Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#8E9299] block mb-1.5">
                  تعداد {selectedService?.unit || 'صفحه'}:
                </label>
                <input
                  type="number"
                  min={1}
                  value={pagesCount}
                  onChange={(e) => setPagesCount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono font-bold text-sm outline-none text-[#E0E0E0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1.5">حالت چاپ:</label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#161619] p-1 rounded-xl border border-[#2D2D33] h-[42px] items-center">
                  <button
                    type="button"
                    onClick={() => setIsDoubleSided(false)}
                    className={`h-full rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                      !isDoubleSided
                        ? 'bg-[#2D2D33] text-[#F3F4F6] border border-[#3E3E46]'
                        : 'text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    یک‌رو
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDoubleSided(true)}
                    className={`h-full rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                      isDoubleSided
                        ? 'bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40'
                        : 'text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    دورو
                  </button>
                </div>
              </div>
            </div>

            {/* Binding & Finishing */}
            <div>
              <label className="font-bold text-[#8E9299] block mb-1.5">نوع صحافی و جلد:</label>
              <select
                value={bindingType}
                onChange={(e: any) => setBindingType(e.target.value)}
                className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-bold text-[#E0E0E0] cursor-pointer"
              >
                <option value="none">بدون صحافی (ساده)</option>
                <option value="spiral">
                  صحافی سیمی / فنری دوبل فلزی (+{formatToman(selectedService?.bindingSpiralPrice || 35000)})
                </option>
                <option value="hardcover">
                  جلد سخت گالینگور زرکوب (+{formatToman(selectedService?.bindingHardcoverPrice || 85000)})
                </option>
                <option value="cellophane">
                  سلفون مات/براق و طلق پاپکو (+{formatToman(selectedService?.bindingCellophanePrice || 15000)})
                </option>
              </select>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="font-bold text-[#8E9299] block mb-1 text-[11px]">نام مشتری:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مشتری عمومی / حضوری"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 outline-none text-[#E0E0E0]"
                />
              </div>
              <div>
                <label className="font-bold text-[#8E9299] block mb-1 text-[11px]">شماره تماس:</label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="09..."
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2 font-mono outline-none text-[#E0E0E0]"
                />
              </div>
            </div>

            {/* Calculation Breakdown Box */}
            <div className="bg-[#161619] border border-[#2D2D33] p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs text-[#8E9299]">
                <span>نرخ پایه هر {selectedService?.unit || 'صفحه'}:</span>
                <span className="font-mono font-bold text-[#F3F4F6]">
                  {formatToman(calculationResult.unitRate)} ({calculationResult.rateLabel})
                </span>
              </div>

              {calculationResult.bindingCost > 0 && (
                <div className="flex justify-between items-center text-xs text-[#8E9299]">
                  <span>هزینه صحافی و جلد:</span>
                  <span className="font-mono font-bold text-amber-400">
                    +{formatToman(calculationResult.bindingCost)}
                  </span>
                </div>
              )}

              {calculationResult.volumeDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-400">
                  <span>تخفیف تیراژ:</span>
                  <span className="font-mono font-bold">
                    -{formatToman(calculationResult.volumeDiscountAmount)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#222225] flex justify-between items-center">
                <span className="font-bold text-[#F3F4F6]">مبلغ کل قابل پرداخت:</span>
                <span className="text-xl font-black text-[#C9A227] font-mono">
                  {formatToman(calculationResult.finalTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت سفارش کپی و صدور فیش درآمد</span>
            </button>
          </form>
        </div>

        {/* Right (7 Cols): Tariffs Management & Active Services List */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tariffs List Header & Filter Controls */}
          <div className="bg-[#111113] rounded-3xl p-5 border border-[#222225] shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222225]">
              <div>
                <h3 className="text-sm font-black text-[#F3F4F6] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#C9A227]" />
                  <span>جدول تعرفه‌ها و ماتریس ۴ قیمتی</span>
                </h3>
                <p className="text-[11px] text-[#8E9299]">
                  نمایش وضعیت انتشار (سایت / حسابداری) و تفکیک نرخ‌های یک‌رو و دورو
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8E9299] font-mono">
                  {toPersianDigits(filteredServices.length)} تعرفه تعریف‌شده
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8E9299] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در عنوان یا توضیحات تعرفه..."
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl pr-9 pl-3 py-2 text-xs outline-none text-[#E0E0E0]"
                />
              </div>

              {/* Visibility Filter Buttons */}
              <div className="flex items-center gap-1 bg-[#161619] p-1 rounded-xl border border-[#2D2D33] overflow-x-auto text-[11px] font-bold">
                <button
                  onClick={() => setVisibilityFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    visibilityFilter === 'all'
                      ? 'bg-[#C9A227] text-black'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setVisibilityFilter('both')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    visibilityFilter === 'both'
                      ? 'bg-emerald-500 text-white'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>سایت + حسابداری</span>
                </button>
                <button
                  onClick={() => setVisibilityFilter('only_accounting')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    visibilityFilter === 'only_accounting'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  <Building className="w-3 h-3" />
                  <span>فقط حسابداری</span>
                </button>
                <button
                  onClick={() => setVisibilityFilter('only_website')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    visibilityFilter === 'only_website'
                      ? 'bg-sky-500 text-white'
                      : 'text-[#8E9299] hover:text-[#E0E0E0]'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>فقط سایت</span>
                </button>
              </div>
            </div>

            {/* Tariffs Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {filteredServices.map((s) => {
                const single1 = Number(s.priceSingle1 || s.basePriceSingle || s.price || 0);
                const single2 = Number(s.priceSingle2 || Math.round(single1 * 0.85));
                const double1 = Number(s.priceDouble1 || s.basePriceDouble || Math.round(single1 * 1.6));
                const double2 = Number(s.priceDouble2 || Math.round(single1 * 1.35));

                const vis = s.visibility || (s.onlyAccounting ? 'only_accounting' : (s.showOnWebsite && !s.showInPos ? 'only_website' : 'both'));

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl border border-[#2D2D33] bg-[#161619] hover:border-[#3E3E46] transition-all space-y-3 relative group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-sm text-[#F3F4F6] flex items-center gap-1.5">
                          <span>{s.name || s.title}</span>
                        </div>
                        {s.description && (
                          <p className="text-[11px] text-[#8E9299] mt-0.5 line-clamp-1">
                            {s.description}
                          </p>
                        )}
                      </div>

                      {/* Channel Badge */}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shrink-0 flex items-center gap-1 ${
                          vis === 'only_accounting'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : vis === 'only_website'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {vis === 'only_accounting' ? (
                          <>
                            <Building className="w-2.5 h-2.5" />
                            <span>فقط حسابداری</span>
                          </>
                        ) : vis === 'only_website' ? (
                          <>
                            <Globe className="w-2.5 h-2.5" />
                            <span>فقط سایت</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-2.5 h-2.5" />
                            <span>سایت + حسابداری</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Multi-Price Matrix (4-Tier Grid) */}
                    <div className="bg-[#111113] p-2.5 rounded-xl border border-[#222225] space-y-1.5 text-xs">
                      {/* Row 1: Single sided */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex justify-between items-center bg-[#161619] px-2 py-1 rounded-lg">
                          <span className="text-[#8E9299]">یک‌رو (عادی):</span>
                          <span className="font-mono font-bold text-[#E0E0E0]">{formatToman(single1)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[#161619] px-2 py-1 rounded-lg">
                          <span className="text-[#8E9299]">یک‌رو (تیراژ/همکار):</span>
                          <span className="font-mono font-bold text-[#C9A227]">{formatToman(single2)}</span>
                        </div>
                      </div>

                      {/* Row 2: Double sided */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex justify-between items-center bg-[#161619] px-2 py-1 rounded-lg">
                          <span className="text-[#8E9299]">دورو (عادی):</span>
                          <span className="font-mono font-bold text-[#E0E0E0]">{formatToman(double1)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[#161619] px-2 py-1 rounded-lg">
                          <span className="text-[#8E9299]">دورو (تیراژ/همکار):</span>
                          <span className="font-mono font-bold text-[#C9A227]">{formatToman(double2)}</span>
                        </div>
                      </div>

                      {/* Volume condition */}
                      <div className="flex justify-between items-center text-[10px] text-[#8E9299] px-1 pt-0.5">
                        <span>
                          آستانه نرخ تیراژ: بالای{' '}
                          <strong className="text-[#E0E0E0] font-mono">
                            {toPersianDigits(s.volumeDiscountThreshold || 50)}
                          </strong>{' '}
                          {s.unit || 'برگ'}
                        </span>
                        {s.volumeDiscountPercent ? (
                          <span className="text-emerald-400 font-bold">
                            +{toPersianDigits(s.volumeDiscountPercent)}٪ تخفیف
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Action Buttons: Edit and Delete */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#222225]/80">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8E9299]">
                        <span>صحافی سیمی:</span>
                        <span className="font-mono text-[#E0E0E0]">
                          {formatToman(s.bindingSpiralPrice || 35000)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="px-2.5 py-1 rounded-lg bg-[#222225] hover:bg-[#2D2D33] text-[#C9A227] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="ویرایش تعرفه خدمت"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>

                        <button
                          onClick={() => setServiceToDelete(s)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="حذف تعرفه خدمت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredServices.length === 0 && !loading && (
                <div className="col-span-full py-8 text-center bg-[#161619] rounded-2xl border border-dashed border-[#2D2D33] space-y-2">
                  <Printer className="w-8 h-8 text-[#8E9299] mx-auto opacity-50" />
                  <p className="text-xs text-[#8E9299]">تعرفه‌ای با این مشخصات یافت نشد.</p>
                  <button
                    onClick={handleOpenAddModal}
                    className="text-xs text-[#C9A227] hover:underline font-bold"
                  >
                    افزودن اولین تعرفه
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders Log Table */}
          <div className="bg-[#111113] rounded-3xl p-5 border border-[#222225] shadow-xl space-y-3">
            <h3 className="text-sm font-black text-[#F3F4F6] pb-2 border-b border-[#222225] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A227]" />
                <span>سوابق فیش‌ها و سفارشات اخیر تکثیر و کپی</span>
              </span>
              <span className="text-xs text-[#8E9299] font-mono">
                {toPersianDigits(orders.length)} رکورد
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-[#161619] text-[#C9A227] font-bold border-b border-[#222225]">
                  <tr>
                    <th className="p-2.5">شرح خدمت</th>
                    <th className="p-2.5">مشتری</th>
                    <th className="p-2.5 text-center">تعداد / مقدار</th>
                    <th className="p-2.5">مبلغ کل</th>
                    <th className="p-2.5 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222225]">
                  {orders.slice(0, 8).map((o: any) => (
                    <tr key={o.id} className="hover:bg-[#161619]/60 transition-colors">
                      <td className="p-2.5 font-bold text-[#F3F4F6]">
                        {o.serviceName || o.serviceTitle || 'خدمت تکثیر'}
                      </td>
                      <td className="p-2.5 text-[#8E9299]">
                        {o.customerName || 'مشتری حضوری'}
                        {o.customerMobile ? (
                          <span className="block text-[10px] font-mono text-[#8E9299]">
                            {o.customerMobile}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2.5 text-center font-mono text-[#E0E0E0]">
                        {toPersianDigits(o.quantity || o.pageCount || 1)}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#C9A227]">
                        {formatToman(o.totalPrice || o.totalAmount || 0)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                          تسویه شده
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-[#8E9299]">
                        هنوز فیش یا سفارشی برای خدمات کپی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SERVICE ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#111113] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#2D2D33] space-y-5 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[#222225]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C9A227]/20 text-[#C9A227] flex items-center justify-center font-black">
                  <Printer className="w-4 h-4" />
                </div>
                <h4 className="font-black text-[#F3F4F6] text-sm">
                  {editingServiceId ? 'ویرایش تعرفه خدمت' : 'تعریف تعرفه خدمت جدید'}
                </h4>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8E9299] hover:text-white cursor-pointer p-1 rounded-lg hover:bg-[#161619]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              {/* 1. Channel Selector (۳ گزینه دقیق: فقط حسابداری، فقط سایت، هر دو) */}
              <div className="bg-[#161619] p-3.5 rounded-2xl border border-[#2D2D33] space-y-2">
                <span className="font-bold text-[#F3F4F6] block text-xs">
                  کانال انتشار و دامنه نمایش تعرفه:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Both */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      serviceForm.visibility === 'both'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-xs'
                        : 'border-[#2D2D33] bg-[#111113] text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceVisibility"
                      value="both"
                      checked={serviceForm.visibility === 'both'}
                      onChange={() => setServiceForm({ ...serviceForm, visibility: 'both' })}
                      className="accent-emerald-500"
                    />
                    <div>
                      <div className="font-black flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>سایت + حسابداری</span>
                      </div>
                      <span className="text-[10px] opacity-75">در تمام بخش‌ها</span>
                    </div>
                  </label>

                  {/* Only Accounting */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      serviceForm.visibility === 'only_accounting'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-xs'
                        : 'border-[#2D2D33] bg-[#111113] text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceVisibility"
                      value="only_accounting"
                      checked={serviceForm.visibility === 'only_accounting'}
                      onChange={() => setServiceForm({ ...serviceForm, visibility: 'only_accounting' })}
                      className="accent-amber-500"
                    />
                    <div>
                      <div className="font-black flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        <span>فقط حسابداری</span>
                      </div>
                      <span className="text-[10px] opacity-75">پیشخوان و فاکتور داخلی</span>
                    </div>
                  </label>

                  {/* Only Website */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      serviceForm.visibility === 'only_website'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300 shadow-xs'
                        : 'border-[#2D2D33] bg-[#111113] text-[#8E9299] hover:text-[#E0E0E0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceVisibility"
                      value="only_website"
                      checked={serviceForm.visibility === 'only_website'}
                      onChange={() => setServiceForm({ ...serviceForm, visibility: 'only_website' })}
                      className="accent-sky-500"
                    />
                    <div>
                      <div className="font-black flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>فقط سایت</span>
                      </div>
                      <span className="text-[10px] opacity-75">سفارش آنلاین سایت</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Basic Info (Name, Category, Unit) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-[#8E9299] block mb-1">عنوان خدمت:</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="مثال: پرینت و کپی رنگی لیزری A4"
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-bold outline-none text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">واحد اندازه‌گیری:</label>
                  <input
                    type="text"
                    value={serviceForm.unit}
                    onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })}
                    placeholder="صفحه / برگ / جلد"
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-bold outline-none text-[#E0E0E0]"
                  />
                </div>
              </div>

              {/* 3. Multi-Pricing Section (یک‌رو دو قیمت و دورو دو قیمت) */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#222225]">
                  <span className="font-black text-xs text-[#F3F4F6] flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#C9A227]" />
                    <span>ماتریس چند قیمتی (یک‌رو ۲ قیمت و دورو ۲ قیمت)</span>
                  </span>
                  <span className="text-[10px] text-[#8E9299]">مبالغ به تومان</span>
                </div>

                {/* Single sided prices */}
                <div>
                  <span className="text-[11px] font-bold text-amber-400 block mb-1.5">
                    • قیمت‌های چاپ یک‌رو:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput
                      label="قیمت یک‌رو ۱ (عادی / تک‌فروشی):"
                      value={serviceForm.priceSingle1}
                      onChange={(val) => setServiceForm({ ...serviceForm, priceSingle1: val })}
                      required
                    />
                    <CurrencyInput
                      label="قیمت یک‌رو ۲ (همکار / تیراژ / مدارس):"
                      value={serviceForm.priceSingle2}
                      onChange={(val) => setServiceForm({ ...serviceForm, priceSingle2: val })}
                      required
                    />
                  </div>
                </div>

                {/* Double sided prices */}
                <div className="pt-2 border-t border-[#222225]">
                  <span className="text-[11px] font-bold text-[#C9A227] block mb-1.5">
                    • قیمت‌های چاپ دورو:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput
                      label="قیمت دورو ۱ (عادی / تک‌فروشی):"
                      value={serviceForm.priceDouble1}
                      onChange={(val) => setServiceForm({ ...serviceForm, priceDouble1: val })}
                      required
                    />
                    <CurrencyInput
                      label="قیمت دورو ۲ (همکار / تیراژ / مدارس):"
                      value={serviceForm.priceDouble2}
                      onChange={(val) => setServiceForm({ ...serviceForm, priceDouble2: val })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. Binding & Finishing Services */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-3">
                <span className="font-black text-xs text-[#F3F4F6] block pb-1 border-b border-[#222225]">
                  تعرفه خدمات صحافی، جلد و تکمیل:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CurrencyInput
                    label="صحافی سیمی فنری:"
                    value={serviceForm.bindingSpiralPrice}
                    onChange={(val) => setServiceForm({ ...serviceForm, bindingSpiralPrice: val })}
                  />
                  <CurrencyInput
                    label="جلد سخت گالینگور:"
                    value={serviceForm.bindingHardcoverPrice}
                    onChange={(val) => setServiceForm({ ...serviceForm, bindingHardcoverPrice: val })}
                  />
                  <CurrencyInput
                    label="طلق پاپکو و سلفون:"
                    value={serviceForm.bindingCellophanePrice}
                    onChange={(val) => setServiceForm({ ...serviceForm, bindingCellophanePrice: val })}
                  />
                </div>
              </div>

              {/* 5. Volume Rules */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">
                    آستانه اعمال نرخ تیراژ ({serviceForm.unit || 'برگ'}):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={serviceForm.volumeDiscountThreshold}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        volumeDiscountThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono outline-none text-[#E0E0E0]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">
                    درصد تخفیف مازاد تیراژ (٪):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={serviceForm.volumeDiscountPercent}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        volumeDiscountPercent: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono outline-none text-[#E0E0E0]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">توضیحات و مشخصات کاغذ:</label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="مثال: کاغذ ۸۰ گرم تحریر دابل ای با کیفیت پرینت لیزری ضد آب"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0] resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-[#222225]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-[#C9A227]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingServiceId ? 'ذخیره تغییرات تعرفه' : 'ثبت تعرفه جدید'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-base text-[#F3F4F6]">حذف تعرفه خدمت</h4>
              <p className="text-xs text-[#8E9299]">
                آیا از حذف تعرفه «
                <strong className="text-white">
                  {serviceToDelete.name || serviceToDelete.title}
                </strong>
                » اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                بله، حذف شود
              </button>
              <button
                onClick={() => setServiceToDelete(null)}
                className="flex-1 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold py-2.5 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
