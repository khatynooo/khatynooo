import React, { useState, useEffect } from 'react';
import {
  Users,
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Check,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  AlertTriangle,
  Edit,
  Trash2,
  Filter,
  Receipt,
  FileText,
  BadgeCheck,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Customer, Supplier } from '../../types';
import { useToast } from '../common/Toast';

export const CustomersSuppliersView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debtors' | 'settled'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Modal States: Customer (Create / Edit)
  const [showCustModal, setShowCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custForm, setCustForm] = useState({
    name: '',
    mobile: '',
    phone: '',
    companyName: '',
    nationalCode: '',
    creditLimit: 5000000,
    address: '',
    notes: '',
  });

  // Modal States: Supplier (Create / Edit)
  const [showSupModal, setShowSupModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supForm, setSupForm] = useState({
    name: '',
    contactPerson: '',
    mobile: '',
    phone: '',
    shaba: '',
    bankAccount: '',
    debtToSupplier: 0,
    address: '',
  });

  // Modal States: Delete Confirmation
  const [deletingEntity, setDeletingEntity] = useState<{
    type: 'customer' | 'supplier';
    id: string;
    name: string;
    balance?: number;
    debt?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal States: Payment Registration
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [custPaymentAmount, setCustPaymentAmount] = useState<number | ''>('');
  const [custPaymentMethod, setCustPaymentMethod] = useState<'cash' | 'pos_pasargad' | 'card' | 'cheque' | 'bank_transfer'>('cash');
  const [custPaymentDesc, setCustPaymentDesc] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [supPaymentAmount, setSupPaymentAmount] = useState<number | ''>('');
  const [supPaymentMethod, setSupPaymentMethod] = useState<'bank_transfer' | 'cash' | 'card' | 'cheque'>('bank_transfer');
  const [supPaymentDesc, setSupPaymentDesc] = useState('');

  // Modal States: Ledger History
  const [ledgerEntity, setLedgerEntity] = useState<{ type: 'customer' | 'supplier'; data: any } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerHistory, setLedgerHistory] = useState<{ transactions: any[]; invoices: any[] }>({ transactions: [], invoices: [] });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [custRes, supRes] = await Promise.all([api.getCustomers(), api.getSuppliers()]);
      setCustomers(custRes.customers || []);
      setSuppliers(supRes.suppliers || []);
    } catch (err) {
      console.error(err);
      showToast('خطا در بارگذاری اطلاعات مشتریان و تامین‌کنندگان', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  // Open Create Customer Modal
  const handleOpenCreateCustomer = () => {
    setEditingCustomer(null);
    setCustForm({
      name: '',
      mobile: '',
      phone: '',
      companyName: '',
      nationalCode: '',
      creditLimit: 5000000,
      address: '',
      notes: '',
    });
    setShowCustModal(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustForm({
      name: c.name || '',
      mobile: c.mobile || '',
      phone: c.phone || '',
      companyName: c.companyName || '',
      nationalCode: c.nationalCode || '',
      creditLimit: c.creditLimit !== undefined ? c.creditLimit : 5000000,
      address: c.address || c.fullAddress || '',
      notes: c.notes || '',
    });
    setShowCustModal(true);
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, custForm);
        showToast(`اطلاعات مشتری «${custForm.name}» با موفقیت به‌روزرسانی شد.`, 'success');
      } else {
        await api.createCustomer(custForm);
        showToast(`مشتری جدید «${custForm.name}» با موفقیت اضافه شد.`, 'success');
      }
      setShowCustModal(false);
      setEditingCustomer(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره اطلاعات مشتری', 'error');
    }
  };

  // Open Create Supplier Modal
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupForm({
      name: '',
      contactPerson: '',
      mobile: '',
      phone: '',
      shaba: '',
      bankAccount: '',
      debtToSupplier: 0,
      address: '',
    });
    setShowSupModal(true);
  };

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupForm({
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      mobile: s.mobile || '',
      phone: s.phone || '',
      shaba: s.shaba || '',
      bankAccount: s.bankAccount || '',
      debtToSupplier: s.debtToSupplier || (s.balance && s.balance < 0 ? Math.abs(s.balance) : 0) || 0,
      address: s.address || '',
    });
    setShowSupModal(true);
  };

  // Save Supplier (Create or Update)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, supForm);
        showToast(`اطلاعات تامین‌کننده «${supForm.name}» با موفقیت به‌روزرسانی شد.`, 'success');
      } else {
        await api.createSupplier(supForm);
        showToast(`تامین‌کننده جدید «${supForm.name}» با موفقیت اضافه شد.`, 'success');
      }
      setShowSupModal(false);
      setEditingSupplier(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره اطلاعات تامین‌کننده', 'error');
    }
  };

  // Delete Entity Handler
  const handleConfirmDelete = async () => {
    if (!deletingEntity) return;
    setIsDeleting(true);
    try {
      if (deletingEntity.type === 'customer') {
        await api.deleteCustomer(deletingEntity.id);
        showToast(`مشتری «${deletingEntity.name}» با موفقیت حذف شد.`, 'success');
      } else {
        await api.deleteSupplier(deletingEntity.id);
        showToast(`تامین‌کننده «${deletingEntity.name}» با موفقیت حذف شد.`, 'success');
      }
      setDeletingEntity(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف طرف حساب', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Customer Payment
  const handleSubmitCustomerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const amount = Number(custPaymentAmount);
    if (!amount || amount <= 0) {
      showToast('لطفاً مبلغ معتبر پرداختی را وارد کنید.', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await api.recordCustomerPayment(paymentCustomer.id, {
        amount,
        paymentMethod: custPaymentMethod,
        description: custPaymentDesc || `دریافت وجه تسویه حساب مشتری - ${paymentCustomer.name}`,
      });
      showToast(res.message || 'دریافت پرداخت مشتری با موفقیت ثبت شد.', 'success');
      setPaymentCustomer(null);
      setCustPaymentAmount('');
      setCustPaymentDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت پرداخت مشتری', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Submit Supplier Payment
  const handleSubmitSupplierPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplier) return;
    const amount = Number(supPaymentAmount);
    if (!amount || amount <= 0) {
      showToast('لطفاً مبلغ معتبر پرداختی را وارد کنید.', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await api.recordSupplierPayment(paymentSupplier.id, {
        amount,
        paymentMethod: supPaymentMethod,
        description: supPaymentDesc || `تسویه بدهی به تامین‌کننده «${paymentSupplier.name}»`,
      });
      showToast(res.message || 'پرداخت به تامین‌کننده با موفقیت ثبت و از بدهی کسر گردید.', 'success');
      setPaymentSupplier(null);
      setSupPaymentAmount('');
      setSupPaymentDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت پرداخت تامین‌کننده', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Ledger Modal
  const handleOpenLedger = async (type: 'customer' | 'supplier', entity: any) => {
    setLedgerEntity({ type, data: entity });
    setLedgerLoading(true);
    try {
      if (type === 'customer') {
        const res = await api.getCustomerLedger(entity.id);
        setLedgerHistory({
          transactions: res.transactions || [],
          invoices: res.invoices || [],
        });
      } else {
        const res = await api.getSupplierLedger(entity.id);
        setLedgerHistory({
          transactions: res.transactions || [],
          invoices: res.invoices || [],
        });
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در دریافت ریز صورتحساب', 'error');
    } finally {
      setLedgerLoading(false);
    }
  };

  const totalCustomerDebt = customers
    .filter((c) => (c.balance || 0) < 0)
    .reduce((sum, c) => sum + Math.abs(c.balance || 0), 0);

  const totalSupplierDebt = suppliers
    .reduce((sum, s) => sum + (s.debtToSupplier || (s.balance && s.balance < 0 ? Math.abs(s.balance) : 0) || 0), 0);

  // Filters
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = searchQuery.trim()
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile.includes(searchQuery) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.nationalCode && c.nationalCode.includes(searchQuery))
      : true;

    if (!matchesSearch) return false;

    if (statusFilter === 'debtors') {
      return (c.balance || 0) < 0;
    }
    if (statusFilter === 'settled') {
      return (c.balance || 0) >= 0;
    }
    return true;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch = searchQuery.trim()
      ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobile.includes(searchQuery) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(searchQuery))
      : true;

    if (!matchesSearch) return false;

    const debt = Number(s.debtToSupplier || (s.balance && s.balance < 0 ? Math.abs(s.balance) : 0) || 0);
    if (statusFilter === 'debtors') {
      return debt > 0;
    }
    if (statusFilter === 'settled') {
      return debt === 0;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="customers-suppliers-container">
      {/* Top Header & Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div id="card-customer-debt" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">طلب ما از مشتریان (مانده بدهی نسیه):</span>
            <div className="text-xl font-black text-rose-600">{formatToman(totalCustomerDebt)}</div>
            <div className="text-[11px] text-slate-400">
              {toPersianDigits(customers.length)} حساب مشتری • {toPersianDigits(customers.filter(c => (c.balance || 0) < 0).length)} بدهکار
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div id="card-supplier-debt" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">بدهی ما به شرکت‌های پخش و تامین‌کنندگان:</span>
            <div className="text-xl font-black text-amber-600">{formatToman(totalSupplierDebt)}</div>
            <div className="text-[11px] text-slate-400">
              {toPersianDigits(suppliers.length)} تامین‌کننده فعال • {toPersianDigits(suppliers.filter(s => (s.debtToSupplier || 0) > 0).length)} دارای مانده بدهی
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Switch Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full lg:w-auto">
          <button
            id="tab-btn-customers"
            onClick={() => {
              setActiveTab('customers');
              setStatusFilter('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مشتریان و خریداران ({toPersianDigits(customers.length)})</span>
          </button>
          <button
            id="tab-btn-suppliers"
            onClick={() => {
              setActiveTab('suppliers');
              setStatusFilter('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>تامین‌کنندگان و شرکت‌های پخش ({toPersianDigits(suppliers.length)})</span>
          </button>
        </div>

        {/* Filter, Search and Add Button */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setStatusFilter('debtors')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === 'debtors' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              {activeTab === 'customers' ? 'بدهکاران نسیه' : 'دارای مانده بدهی'}
            </button>
            <button
              onClick={() => setStatusFilter('settled')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === 'settled' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              تسویه کامل
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <input
              id="search-input-entities"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'customers' ? 'جستجو در نام، موبایل، سازمان...' : 'جستجو در نام تامین‌کننده، رابط...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          {/* Refresh Data Button */}
          <button
            onClick={loadData}
            title="به‌روزرسانی فهرست"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Add New Button */}
          {activeTab === 'customers' ? (
            <button
              id="btn-create-customer-modal"
              onClick={handleOpenCreateCustomer}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>مشتری جدید</span>
            </button>
          ) : (
            <button
              id="btn-create-supplier-modal"
              onClick={handleOpenCreateSupplier}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>تامین‌کننده جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="customers-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">نام و مشخصات مشتری</th>
                  <th className="p-3.5">شماره‌های تماس</th>
                  <th className="p-3.5">شرکت / سازمان</th>
                  <th className="p-3.5">سقف اعتبار نسیه</th>
                  <th className="p-3.5">وضعیت مانده حساب</th>
                  <th className="p-3.5">آدرس</th>
                  <th className="p-3.5 text-center">عملیات و مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-300" />
                        <span>هیچ مشتری مطابق با جستجو و فیلتر انتخابی یافت نشد.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isDebtor = (c.balance || 0) < 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.nationalCode && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded font-normal">
                                کدملی: {c.nationalCode}
                              </span>
                            )}
                          </div>
                          {c.notes && <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">{c.notes}</p>}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          <div>{c.mobile}</div>
                          {c.phone && <div className="text-[11px] text-slate-400 mt-0.5">{c.phone}</div>}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {c.companyName ? (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                              {c.companyName}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">{formatToman(c.creditLimit || 5000000)}</td>
                        <td className="p-3.5 font-bold">
                          {(c.balance || 0) === 0 ? (
                            <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-[11px]">تسویه (۰)</span>
                          ) : isDebtor ? (
                            <span className="text-rose-600 font-mono bg-rose-50 border border-rose-200/60 px-2 py-1 rounded-md text-[11px]">
                              بدهکار: {formatToman(Math.abs(c.balance))}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-mono bg-emerald-50 border border-emerald-200/60 px-2 py-1 rounded-md text-[11px]">
                              بستانکار: {formatToman(c.balance)}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 truncate max-w-xs">{c.address || c.fullAddress || '-'}</td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Record Payment */}
                            <button
                              id={`btn-record-cust-payment-${c.id}`}
                              onClick={() => {
                                setPaymentCustomer(c);
                                setCustPaymentAmount(isDebtor ? Math.abs(c.balance) : '');
                                setCustPaymentDesc(`تسویه حساب مشتری ${c.name}`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="ثبت دریافت وجه / تسویه بدهی"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">دریافت وجه</span>
                            </button>

                            {/* Ledger */}
                            <button
                              id={`btn-view-cust-ledger-${c.id}`}
                              onClick={() => handleOpenLedger('customer', c)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="مشاهده صورتحساب و گردش حساب"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">گردش</span>
                            </button>

                            {/* Edit Customer */}
                            <button
                              id={`btn-edit-cust-${c.id}`}
                              onClick={() => handleOpenEditCustomer(c)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="ویرایش اطلاعات مشتری"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ویرایش</span>
                            </button>

                            {/* Delete Customer */}
                            <button
                              id={`btn-delete-cust-${c.id}`}
                              onClick={() =>
                                setDeletingEntity({
                                  type: 'customer',
                                  id: c.id,
                                  name: c.name,
                                  balance: c.balance,
                                })
                              }
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="حذف مشتری"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="suppliers-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">نام شرکت / برند تامین‌کننده</th>
                  <th className="p-3.5">شماره‌های تماس</th>
                  <th className="p-3.5">مشخصات بانکی و شبا</th>
                  <th className="p-3.5">مانده بدهی ما</th>
                  <th className="p-3.5">آدرس دفتر / انبار</th>
                  <th className="p-3.5 text-center">عملیات و مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="w-8 h-8 text-slate-300" />
                        <span>هیچ تامین‌کننده‌ای مطابق با جستجو و فیلتر انتخابی یافت نشد.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const debtAmount = Number(s.debtToSupplier || (s.balance && s.balance < 0 ? Math.abs(s.balance) : 0) || 0);
                    const hasDebt = debtAmount > 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{s.name}</div>
                          {s.contactPerson && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              رابط: <span className="font-bold text-slate-700">{s.contactPerson}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          <div>{s.mobile}</div>
                          {s.phone && <div className="text-[11px] text-slate-400 mt-0.5">{s.phone}</div>}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          {s.shaba && <div>شبا: {s.shaba}</div>}
                          {s.bankAccount && <div className="text-slate-400 mt-0.5">حساب: {s.bankAccount}</div>}
                          {!s.shaba && !s.bankAccount && <span className="text-slate-300 font-sans">-</span>}
                        </td>
                        <td className="p-3.5 font-bold">
                          {!hasDebt ? (
                            <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-[11px]">تسویه (۰)</span>
                          ) : (
                            <span className="text-amber-600 font-mono bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-md text-[11px]">
                              بدهکاریم: {formatToman(debtAmount)}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 truncate max-w-xs">{s.address || '-'}</td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Record Supplier Payment */}
                            <button
                              id={`btn-record-sup-payment-${s.id}`}
                              onClick={() => {
                                setPaymentSupplier(s);
                                setSupPaymentAmount(hasDebt ? debtAmount : '');
                                setSupPaymentDesc(`تسویه بدهی به تامین‌کننده ${s.name}`);
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="ثبت پرداخت به تامین‌کننده"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">پرداخت وجه</span>
                            </button>

                            {/* Ledger */}
                            <button
                              id={`btn-view-sup-ledger-${s.id}`}
                              onClick={() => handleOpenLedger('supplier', s)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="مشاهده گردش حساب و خریدهای ثبت‌شده"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">گردش</span>
                            </button>

                            {/* Edit Supplier */}
                            <button
                              id={`btn-edit-sup-${s.id}`}
                              onClick={() => handleOpenEditSupplier(s)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="ویرایش اطلاعات تامین‌کننده"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ویرایش</span>
                            </button>

                            {/* Delete Supplier */}
                            <button
                              id={`btn-delete-sup-${s.id}`}
                              onClick={() =>
                                setDeletingEntity({
                                  type: 'supplier',
                                  id: s.id,
                                  name: s.name,
                                  debt: debtAmount,
                                })
                              }
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="حذف تامین‌کننده"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="customer-payment-modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">ثبت دریافت وجه / تسویه نسیه</h4>
                  <p className="text-[11px] text-slate-500">مشتری: {paymentCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">وضعیت حساب فعلی:</span>
              <span className={`font-mono font-bold ${(paymentCustomer.balance || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {(paymentCustomer.balance || 0) < 0
                  ? `بدهکار: ${formatToman(Math.abs(paymentCustomer.balance))}`
                  : (paymentCustomer.balance || 0) === 0
                  ? 'تسویه کامل (۰)'
                  : `بستانکار: ${formatToman(paymentCustomer.balance)}`}
              </span>
            </div>

            <form onSubmit={handleSubmitCustomerPayment} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">مبلغ دریافتی (تومان):</label>
                  {(paymentCustomer.balance || 0) < 0 && (
                    <button
                      type="button"
                      onClick={() => setCustPaymentAmount(Math.abs(paymentCustomer.balance))}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                    >
                      تسویه کل بدهی ({formatToman(Math.abs(paymentCustomer.balance))})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={custPaymentAmount}
                  onChange={(e) => setCustPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثلاً ۱,۵۰۰,۰۰۰"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
                {Number(custPaymentAmount) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-mono mt-1 font-bold">
                    معادل: {formatToman(Number(custPaymentAmount))}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">روش واریز / دریافت:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustPaymentMethod('cash')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      custPaymentMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    صندوق نقدی (نقد)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustPaymentMethod('pos_pasargad')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      custPaymentMethod === 'pos_pasargad'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    کارتخوان پاسارگاد (POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustPaymentMethod('bank_transfer')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      custPaymentMethod === 'bank_transfer'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    واریز به حساب / کارت
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustPaymentMethod('cheque')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      custPaymentMethod === 'cheque'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    چک صیادی دریافتی
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">توضیحات و بابت:</label>
                <input
                  type="text"
                  value={custPaymentDesc}
                  onChange={(e) => setCustPaymentDesc(e.target.value)}
                  placeholder="مثلاً تسویه مانده فاکتور شماره ۱۲۳۴"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingPayment ? 'در حال ثبت در حساب...' : 'ثبت قطعی دریافت و به‌روزرسانی مانده حساب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {paymentSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="supplier-payment-modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">ثبت پرداخت به تامین‌کننده</h4>
                  <p className="text-[11px] text-slate-500">تامین‌کننده: {paymentSupplier.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentSupplier(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Debt Notice */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-amber-800 font-bold">بدهی فعلی ما به تامین‌کننده:</span>
              <span className="font-mono font-bold text-amber-700">
                {formatToman(paymentSupplier.debtToSupplier || (paymentSupplier.balance && paymentSupplier.balance < 0 ? Math.abs(paymentSupplier.balance) : 0) || 0)}
              </span>
            </div>

            <form onSubmit={handleSubmitSupplierPayment} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">مبلغ پرداختی به تامین‌کننده (تومان):</label>
                  {(paymentSupplier.debtToSupplier || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setSupPaymentAmount(paymentSupplier.debtToSupplier)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                    >
                      تسویه کل بدهی ({formatToman(paymentSupplier.debtToSupplier)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={supPaymentAmount}
                  onChange={(e) => setSupPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثلاً ۵,۰۰۰,۰۰۰"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                />
                {Number(supPaymentAmount) > 0 && (
                  <p className="text-[11px] text-amber-700 font-mono mt-1 font-bold">
                    معادل: {formatToman(Number(supPaymentAmount))}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">روش پرداخت:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSupPaymentMethod('bank_transfer')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      supPaymentMethod === 'bank_transfer'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    حواله پایا / ساتنا (شبا)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupPaymentMethod('cash')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      supPaymentMethod === 'cash'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    پرداخت نقدی از صندوق
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupPaymentMethod('card')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      supPaymentMethod === 'card'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    کارت به کارت
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupPaymentMethod('cheque')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      supPaymentMethod === 'cheque'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    صدور چک صیادی
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">شرح و شماره پیگیری پرداخت:</label>
                <input
                  type="text"
                  value={supPaymentDesc}
                  onChange={(e) => setSupPaymentDesc(e.target.value)}
                  placeholder="مثلاً پیگیری ساتنا شماره ۷۸۹۲۳"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingPayment ? 'در حال ثبت در حساب...' : 'ثبت قطعی پرداخت و کسر از بدهی'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger History Modal */}
      {ledgerEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="ledger-history-modal">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    صورتحساب و ریز گردش مالی {ledgerEntity.type === 'customer' ? 'مشتری' : 'تامین‌کننده'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {ledgerEntity.data.name} • {ledgerEntity.data.mobile}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLedgerEntity(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {ledgerLoading ? (
                <div className="p-8 text-center text-slate-400">در حال بارگذاری سوابق...</div>
              ) : ledgerHistory.transactions.length === 0 && ledgerHistory.invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400">هیچ سابقه‌ای برای این طرف‌حساب ثبت نشده است.</div>
              ) : (
                <>
                  {/* Transactions Table */}
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs mb-2">ریز تراکنش‌ها و پرداخت‌های ثبت‌شده:</h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">نوع تراکنش</th>
                            <th className="p-2.5">مبلغ</th>
                            <th className="p-2.5">روش پرداخت</th>
                            <th className="p-2.5">شرح</th>
                            <th className="p-2.5">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ledgerHistory.transactions.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold">
                                {tx.type === 'payment_received' ? (
                                  <span className="text-emerald-600">دریافت وجه (تسویه)</span>
                                ) : tx.type === 'payment_made' ? (
                                  <span className="text-emerald-600">پرداخت وجه به تامین‌کننده</span>
                                ) : tx.type === 'credit_sale' ? (
                                  <span className="text-rose-600">فروش نسیه</span>
                                ) : (
                                  <span className="text-slate-700">{tx.type}</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-900">{formatToman(tx.amount)}</td>
                              <td className="p-2.5 text-slate-600">{tx.paymentMethod || 'نقدی'}</td>
                              <td className="p-2.5 text-slate-500">{tx.description || '-'}</td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-400">
                                {tx.date || tx.createdAt ? new Date(tx.date || tx.createdAt).toLocaleDateString('fa-IR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Invoices */}
                  {ledgerHistory.invoices.length > 0 && (
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs mb-2">فاکتورهای مرتبط:</h5>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">شماره فاکتور</th>
                              <th className="p-2.5">مبلغ کل</th>
                              <th className="p-2.5">پرداخت شده</th>
                              <th className="p-2.5">مانده نسیه</th>
                              <th className="p-2.5">تاریخ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ledgerHistory.invoices.map((inv: any) => (
                              <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                                <td className="p-2.5 font-mono text-slate-900">{formatToman(inv.finalAmount || inv.totalAmount)}</td>
                                <td className="p-2.5 font-mono text-emerald-600">{formatToman(inv.paidAmount || 0)}</td>
                                <td className="p-2.5 font-mono font-bold text-rose-600">{formatToman(inv.creditAmount || inv.remainingAmount || 0)}</td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-400">
                                  {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fa-IR') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Create / Edit Modal */}
      {showCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="customer-form-modal">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {editingCustomer ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {editingCustomer ? `ویرایش اطلاعات مشتری: ${editingCustomer.name}` : 'ثبت مشتری یا سازمان جدید'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {editingCustomer ? 'تغییر مشخصات فردی و سقف اعتبار' : 'افزودن خریدار جدید به سیستم حسابداری و انبار'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCustModal(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={custForm.name}
                    onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                    placeholder="مثلاً محمد رضایی"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    شماره همراه <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="tel"
                    required
                    value={custForm.mobile}
                    onChange={(e) => setCustForm({ ...custForm, mobile: e.target.value })}
                    placeholder="09123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تلفن ثابت / دفتر:</label>
                  <input
                    type="tel"
                    value={custForm.phone}
                    onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                    placeholder="02188888888"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">کد ملی / شناسه اقتصادی:</label>
                  <input
                    type="text"
                    value={custForm.nationalCode}
                    onChange={(e) => setCustForm({ ...custForm, nationalCode: e.target.value })}
                    placeholder="0012345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نام شرکت / سازمان / مدرسه:</label>
                  <input
                    type="text"
                    value={custForm.companyName}
                    onChange={(e) => setCustForm({ ...custForm, companyName: e.target.value })}
                    placeholder="دبستان شهید بهشتی / شرکت پارس"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">سقف اعتبار نسیه (تومان):</label>
                  <input
                    type="number"
                    value={custForm.creditLimit}
                    onChange={(e) => setCustForm({ ...custForm, creditLimit: Number(e.target.value) })}
                    placeholder="5000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">آدرس کامل پستی:</label>
                <textarea
                  rows={2}
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  placeholder="تهران، خیابان ولیعصر..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">یادداشت و توضیحات:</label>
                <input
                  type="text"
                  value={custForm.notes}
                  onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })}
                  placeholder="توضیحات تکمیلی یا شرایط پرداخت..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCustomer ? 'ذخیره تغییرات مشتری' : 'افزودن و ثبت مشتری جدید'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Create / Edit Modal */}
      {showSupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="supplier-form-modal">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {editingSupplier ? <Edit className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {editingSupplier ? `ویرایش تامین‌کننده: ${editingSupplier.name}` : 'ثبت شرکت تامین‌کننده یا پخش جدید'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {editingSupplier ? 'ویرایش مشخصات تماس و اطلاعات بانکی' : 'افزودن تامین‌کننده جدید به سیستم تدارکات و خرید'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSupModal(false);
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    نام شرکت / برند تامین‌کننده <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={supForm.name}
                    onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                    placeholder="پخش سراسری نوشت‌افزار پارس"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مسئول فروش / رابط:</label>
                  <input
                    type="text"
                    value={supForm.contactPerson}
                    onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })}
                    placeholder="آقای احمدی"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    شماره همراه <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="tel"
                    required
                    value={supForm.mobile}
                    onChange={(e) => setSupForm({ ...supForm, mobile: e.target.value })}
                    placeholder="09120000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تلفن دفتر / شرکت:</label>
                  <input
                    type="tel"
                    value={supForm.phone}
                    onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                    placeholder="02177777777"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">شماره شبا (IBAN):</label>
                  <input
                    type="text"
                    value={supForm.shaba}
                    onChange={(e) => setSupForm({ ...supForm, shaba: e.target.value })}
                    placeholder="IR..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none text-left focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">شماره کارت / حساب بانکی:</label>
                  <input
                    type="text"
                    value={supForm.bankAccount}
                    onChange={(e) => setSupForm({ ...supForm, bankAccount: e.target.value })}
                    placeholder="۶۰۳۷..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none text-left focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {!editingSupplier && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مانده بدهی اولیه ما به تامین‌کننده (تومان):</label>
                  <input
                    type="number"
                    value={supForm.debtToSupplier}
                    onChange={(e) => setSupForm({ ...supForm, debtToSupplier: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">آدرس دفتر / انبار مرکزی:</label>
                <textarea
                  rows={2}
                  value={supForm.address}
                  onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                  placeholder="تهران، بازار بزرگ، سرای..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingSupplier ? 'ذخیره تغییرات تامین‌کننده' : 'افزودن و ثبت تامین‌کننده جدید'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="delete-confirm-modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">
                  تایید حذف {deletingEntity.type === 'customer' ? 'مشتری' : 'تامین‌کننده'}
                </h4>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  «{deletingEntity.name}»
                </p>
              </div>
            </div>

            {/* Warning if there is balance / debt */}
            {deletingEntity.type === 'customer' && (deletingEntity.balance || 0) < 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>هشدار: این مشتری دارای مانده بدهی نسیه است!</span>
                </p>
                <p className="font-mono">
                  مانده بدهی: {formatToman(Math.abs(deletingEntity.balance || 0))}
                </p>
              </div>
            )}

            {deletingEntity.type === 'supplier' && (deletingEntity.debt || 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>هشدار: به این تامین‌کننده مانده بدهی دارید!</span>
                </p>
                <p className="font-mono">
                  مانده بدهی فروشگاه: {formatToman(deletingEntity.debt || 0)}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              آیا از حذف کامل اطلاعات این {deletingEntity.type === 'customer' ? 'مشتری' : 'تامین‌کننده'} از سامانه اطمینان دارید؟
              سوابق فاکتورها جهت حفظ آمار مالی در سیستم باقی می‌مانند اما نام شخص از لیست اصلی حذف می‌گردد.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingEntity(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'در حال حذف...' : 'بله، حذف شود'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
