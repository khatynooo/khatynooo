import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Calendar, AlertCircle, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { Cheque, Customer } from '../../types';
import { useToast } from '../common/Toast';

export const ChequesView: React.FC = () => {
  const { showToast } = useToast();

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'paid'>('all');

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

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      await api.updateChequeStatus(id, newStatus);
      showToast('وضعیت چک با موفقیت تغییر کرد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت چک', 'error');
    }
  };

  const handleSaveCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chequeNumber || !form.sayadId) return;
    try {
      await api.createCheque(form);
      showToast('چک جدید با موفقیت ثبت شد.', 'success');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت چک', 'error');
    }
  };

  const totalPendingReceived = cheques
    .filter((c) => c.type === 'received' && c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const totalPendingPaid = cheques
    .filter((c) => c.type === 'paid' && c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const filtered = cheques.filter((c) => (typeFilter === 'all' ? true : c.type === typeFilter));

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
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
                <th className="p-3.5">بانک عامل</th>
                <th className="p-3.5">مبلغ چک</th>
                <th className="p-3.5">تاریخ سررسید</th>
                <th className="p-3.5">وضعیت وصول</th>
                <th className="p-3.5 text-center">تغییر وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        c.type === 'received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.type === 'received' ? 'دریافتی' : 'پرداختی'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-slate-900">{c.chequeNumber}</div>
                    <div className="text-[10px] text-slate-400 font-mono">صیاد: {c.sayadId}</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{c.issuerName || c.customerName || '-'}</td>
                  <td className="p-3.5 text-slate-600">{c.bankName}</td>
                  <td className="p-3.5 font-mono font-black text-slate-900">{formatToman(c.amount)}</td>
                  <td className="p-3.5 font-mono text-slate-600">{c.dueDate}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.status === 'cleared'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'bounced'
                          ? 'bg-rose-100 text-rose-800'
                          : c.status === 'cancelled'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
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
                      className="bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-bold text-slate-700 outline-none"
                    >
                      <option value="pending">در انتظار</option>
                      <option value="cleared">پاس‌شده (وصول)</option>
                      <option value="bounced">برگشت خورده</option>
                      <option value="cancelled">باطل‌شده</option>
                    </select>
                  </td>
                </tr>
              ))}
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
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono outline-none"
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مبلغ چک (تومان):</label>
                  <input
                    type="number"
                    required
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
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
