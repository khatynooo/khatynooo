import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Plus, Calendar, AlertCircle, CheckCircle2, XCircle, RefreshCw, X, AlertTriangle, Bell, Clock, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Cheque, Customer } from '../../types';
import { useToast } from '../common/Toast';

export const ChequesView: React.FC = () => {
  const { showToast } = useToast();

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'paid' | 'urgent'>('all');

  // New Cheque Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    type: 'received' as 'received' | 'paid',
    chequeNumber: '',
    sayadId: '',
    bankName: 'بانک ملت',
    amount: 1000000,
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issuerName: '',
    customerId: '',
    shebaNumber: '',
    status: 'pending' as const,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [chqRes, custRes] = await Promise.all([api.getCheques(), api.getCustomers()]);
      setCheques(chqRes.cheques || []);
      setCustomers(custRes.customers || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateChequeStatus(id, { status: newStatus });
      showToast('وضعیت چک با موفقیت تغییر کرد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت چک', 'error');
    }
  };

  const handleSaveCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chequeNumber || !form.sayadId) return;

    if (form.shebaNumber) {
      const cleanSheba = form.shebaNumber.replace(/^IR/i, '').replace(/\s+/g, '');
      if (cleanSheba.length !== 24 || !/^\d{24}$/.test(cleanSheba)) {
        showToast('شماره شبا باید دقیقاً ۲۴ رقم باشد.', 'warning');
        return;
      }
    }

    try {
      const cleanSheba = form.shebaNumber ? form.shebaNumber.replace(/^IR/i, '').replace(/\s+/g, '') : undefined;
      await api.createCheque({
        ...form,
        shebaNumber: cleanSheba,
      });
      showToast('چک جدید با موفقیت ثبت شد.', 'success');
      setShowModal(false);
      setForm({
        type: 'received',
        chequeNumber: '',
        sayadId: '',
        bankName: 'بانک ملت',
        amount: 1000000,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        issuerName: '',
        customerId: '',
        shebaNumber: '',
        status: 'pending',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت چک', 'error');
    }
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const getDaysUntilDue = (dueDateStr: string) => {
    if (!dueDateStr) return 999;
    const d = new Date(dueDateStr);
    d.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // چک‌هایی که در انتظار وصول هستند و کمتر از ۷ روز تا موعد دارند یا گذشته‌اند
  const urgentCheques = useMemo(() => {
    return cheques.filter((c) => c.status === 'pending' && getDaysUntilDue(c.dueDate) <= 7);
  }, [cheques, today]);

  const overdueCount = useMemo(() => {
    return urgentCheques.filter((c) => getDaysUntilDue(c.dueDate) < 0).length;
  }, [urgentCheques, today]);

  const approachingCount = useMemo(() => {
    return urgentCheques.filter((c) => {
      const diff = getDaysUntilDue(c.dueDate);
      return diff >= 0 && diff <= 7;
    }).length;
  }, [urgentCheques, today]);

  const totalPendingReceived = cheques
    .filter((c) => c.type === 'received' && c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const totalPendingPaid = cheques
    .filter((c) => c.type === 'paid' && c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const filtered = cheques.filter((c) => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'urgent') return c.status === 'pending' && getDaysUntilDue(c.dueDate) <= 7;
    return c.type === typeFilter;
  });

  return (
    <div className="space-y-6">
      {/* 7-Day Due Date Alarm Banner */}
      {urgentCheques.length > 0 && (
        <div className="bg-linear-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 border-2 border-amber-400/80 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                    <span>هشدار سررسید اسناد مالی (موعد ۷ روزه)</span>
                    <span className="bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                      {toPersianDigits(urgentCheques.length)} فقره چک
                    </span>
                  </h4>
                </div>
                <p className="text-xs text-amber-900 font-medium">
                  {overdueCount > 0 && (
                    <span className="text-rose-700 font-bold ml-2">
                      ⚠️ {toPersianDigits(overdueCount)} چک از تاریخ سررسید گذشته است!
                    </span>
                  )}
                  {approachingCount > 0 && (
                    <span>
                      🔔 {toPersianDigits(approachingCount)} فقره چک در ۷ روز آینده موعد سررسید دارند.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'urgent' ? 'all' : 'urgent')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs ${
                typeFilter === 'urgent'
                  ? 'bg-amber-700 text-white hover:bg-amber-800'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-300'
              }`}
            >
              {typeFilter === 'urgent' ? 'نمایش همه چک‌ها' : 'مشاهده چک‌های نیازمند پیگیری'}
            </button>
          </div>
        </div>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">چک‌های دریافتی در انتظار وصول:</span>
            <div className="text-xl font-black text-emerald-600">{formatToman(totalPendingReceived)}</div>
            <div className="text-[11px] text-slate-400">اسناد دریافتی از مشتریان</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">چک‌های پرداختی ما (تعهدات آتی):</span>
            <div className="text-xl font-black text-amber-600">{formatToman(totalPendingPaid)}</div>
            <div className="text-[11px] text-slate-400">سررسید اسناد به تامین‌کنندگان</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">سامانه صیاد و استعلام:</span>
            <div className="text-sm font-black text-indigo-700">اتصال آنلاین فعال</div>
            <div className="text-[11px] text-slate-400">ثبت و تایید چک‌های بنفش صیادی</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              typeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            همه چک‌ها
          </button>
          <button
            onClick={() => setTypeFilter('received')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              typeFilter === 'received' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            چک‌های دریافتی از مشتریان
          </button>
          <button
            onClick={() => setTypeFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              typeFilter === 'paid' ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            چک‌های پرداختی ما به پخش
          </button>
          {urgentCheques.length > 0 && (
            <button
              onClick={() => setTypeFilter('urgent')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'urgent'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>نزدیک سررسید ({toPersianDigits(urgentCheques.length)})</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت چک جدید در دفتر اسناد</span>
        </button>
      </div>

      {/* Cheques Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">نوع سند</th>
                <th className="p-3.5">شماره چک و صیاد</th>
                <th className="p-3.5">صاحب چک / طرف‌حساب</th>
                <th className="p-3.5">بانک و شبا</th>
                <th className="p-3.5">مبلغ چک</th>
                <th className="p-3.5">تاریخ سررسید</th>
                <th className="p-3.5">وضعیت و هشدار</th>
                <th className="p-3.5 text-center">تغییر وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const daysDiff = getDaysUntilDue(c.dueDate);
                const isUrgent = c.status === 'pending' && daysDiff <= 7;
                const isOverdue = c.status === 'pending' && daysDiff < 0;
                const isDueToday = c.status === 'pending' && daysDiff === 0;

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      isOverdue
                        ? 'bg-rose-50/70 hover:bg-rose-100/70 border-r-4 border-rose-500'
                        : isDueToday
                        ? 'bg-amber-100/70 hover:bg-amber-200/70 border-r-4 border-amber-500'
                        : isUrgent
                        ? 'bg-amber-50/50 hover:bg-amber-100/50 border-r-4 border-amber-400'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          c.type === 'received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.type === 'received' ? 'دریافتی' : 'پرداختی'}
                      </span>
                      {c.invoiceNumber && (
                        <span className="block text-[10px] text-slate-500 font-mono mt-1">
                          فاکتور: {c.invoiceNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">{c.chequeNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">صیاد: {c.sayadId}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{c.issuerName || c.drawerName || c.customerName || c.entityName || '-'}</div>
                      {c.notes && (
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{c.notes}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div className="font-bold text-slate-800">{c.bankName}</div>
                      {c.shebaNumber && (
                        <div className="font-mono text-[10px] text-slate-500 tracking-wider">
                          IR{c.shebaNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-black text-slate-900">{formatToman(c.amount)}</td>
                    <td className="p-3.5 font-mono text-slate-700 font-bold">
                      <div>{c.dueDate}</div>
                      {c.status === 'pending' && (
                        <div className="mt-1">
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3" />
                              <span>{toPersianDigits(Math.abs(daysDiff))} روز گذشته</span>
                            </span>
                          )}
                          {isDueToday && (
                            <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-black">
                              <Clock className="w-3 h-3" />
                              <span>سررسید امروز!</span>
                            </span>
                          )}
                          {isUrgent && !isOverdue && !isDueToday && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <Bell className="w-3 h-3" />
                              <span>{toPersianDigits(daysDiff)} روز مانده</span>
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          c.status === 'cleared'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'bounced'
                            ? 'bg-rose-100 text-rose-800'
                            : c.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-600'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-900 font-black'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {c.status === 'cleared'
                          ? 'پاس‌شده (وصول)'
                          : c.status === 'bounced'
                          ? 'برگشت خورده'
                          : c.status === 'cancelled'
                          ? 'باطل‌شده'
                          : 'در انتظار سررسید'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <select
                        value={c.status}
                        onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                        className="bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="pending">در انتظار</option>
                        <option value="cleared">پاس‌شده (وصول)</option>
                        <option value="bounced">برگشت خورده</option>
                        <option value="cancelled">باطل‌شده</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Cheque Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="font-black text-slate-900 text-sm">ثبت چک جدید در دفتر چک و اسناد</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCheque} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع چک:</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none"
                  >
                    <option value="received">دریافتی از مشتری</option>
                    <option value="paid">پرداختی ما به پخش</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">بانک عامل:</label>
                  <input
                    type="text"
                    required
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">شماره سریال چک:</label>
                  <input
                    type="text"
                    required
                    value={form.chequeNumber}
                    onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                    placeholder="123456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">شناسه ۱۶ رقمی صیاد:</label>
                  <input
                    type="text"
                    required
                    value={form.sayadId}
                    onChange={(e) => setForm({ ...form, sayadId: e.target.value })}
                    placeholder="0123456789123456"
                    maxLength={16}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">صاحب حساب / صادرکننده:</label>
                <input
                  type="text"
                  required
                  value={form.issuerName}
                  onChange={(e) => setForm({ ...form, issuerName: e.target.value })}
                  placeholder="محمد باقری"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">شماره شبا (۲۴ رقم بدون IR - اختیاری):</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 font-mono text-slate-400 select-none text-xs">IR</span>
                  <input
                    type="text"
                    maxLength={26}
                    value={form.shebaNumber}
                    onChange={(e) => setForm({ ...form, shebaNumber: e.target.value.replace(/^IR/i, '').replace(/\s+/g, '') })}
                    placeholder="۲۴ رقم شبا"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 pl-8 font-mono outline-none text-slate-800"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مبلغ چک (تومان):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10000}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاریخ سررسید:</label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                ذخیره چک
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
