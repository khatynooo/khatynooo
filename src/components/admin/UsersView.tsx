import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Shield, User, Key, Check, X, Lock, Eye, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { getRoleTitle, getRoleBadgeClass } from '../../lib/utils';
import { StaffUser, UserRole } from '../../types';
import { useToast } from '../common/Toast';

export const UsersView: React.FC = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'seller' as UserRole,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.fullName) return;

    try {
      await api.createUser(form);
      showToast('کاربر و دسترسی‌های جدید با موفقیت ثبت شد.', 'success');
      setShowModal(false);
      setForm({ username: '', password: '', fullName: '', role: 'seller' });
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت کاربر', 'error');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#111113] rounded-3xl p-6 border border-slate-200 dark:border-[#222225] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-900 dark:text-[#F3F4F6] flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600 dark:text-[#C9A227]" />
            <span>مدیریت کاربران و سطوح دسترسی ۵ گانه (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8E9299]">
            تفکیک دقیق دسترسی‌های مدیر کل، مدیر سایت (/adminsite)، صندوقدار/فروشنده، حسابدار و مدیر ارشد مالی
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#C9A227]/20 flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>افزودن پرسنل جدید</span>
        </button>
      </div>

      {/* Role Matrix Summary */}
      <div className="bg-white dark:bg-[#111113] rounded-3xl p-5 border border-slate-200 dark:border-[#222225] shadow-xs space-y-3 transition-colors">
        <h3 className="text-xs font-bold text-slate-900 dark:text-[#F3F4F6] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-600 dark:text-[#C9A227]" />
          <span>ماتریس مجوزهای دسترسی سیستم:</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-[#161619] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">مدیر کل (Super Admin)</span>
              <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold">دسترسی ۱۰۰٪</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8E9299] leading-relaxed">
              دسترسی نامحدود به تمامی ماژول‌های حسابداری، صندوق، کارگاه تولیدی، کاربران و پنل مدیریت سایت (/adminsite).
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161619] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">مدیر سایت (Site Manager)</span>
              <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-[#C9A227] text-[10px] px-2 py-0.5 rounded-full font-bold">مدیریت آنلاین</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8E9299] leading-relaxed">
              دسترسی به پنل `/adminsite`، سفارشات اینترنتی و رهگیری، اسلایدرها، نرخ‌گذاری و ترب، تولید محتوای هوش مصنوعی.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161619] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">صندوقدار حضوری (Cashier/POS)</span>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">صندوق POS</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8E9299] leading-relaxed">
              دسترسی به صندوق فروش سریع بارکدی، محاسبه خدمات کپی و پرینت و بررسی موجودی کالاها در فروشگاه.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161619] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">حسابدار (Accountant)</span>
              <span className="bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-bold">مالی و چک</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8E9299] leading-relaxed">
              ثبت و ویرایش فاکتورهای خرید/فروش، مدیریت چک‌های دریافتی/پرداختی، حساب مشتریان و تامین‌کنندگان.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161619] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-[#F3F4F6]">مدیر ارشد مالی و تولید</span>
              <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 text-[10px] px-2 py-0.5 rounded-full font-bold">تولید و کارگاه</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8E9299] leading-relaxed">
              گزارشات سود/زیان، فرمولاسیون و تولید دفاتر سیمی خطی‌نو، قیمت‌گذاری و رصد بهای تمام‌شده.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#111113] rounded-3xl border border-slate-200 dark:border-[#222225] shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100/80 dark:bg-[#161619] text-slate-700 dark:text-[#8E9299] font-bold border-b border-slate-200 dark:border-[#222225]">
              <tr>
                <th className="p-4">نام و نام خانوادگی</th>
                <th className="p-4">نام کاربری</th>
                <th className="p-4">نقش سیستمی (Role)</th>
                <th className="p-4">مسیرهای مجاز ورود</th>
                <th className="p-4">وضعیت حساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222225]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#161619]/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-[#F3F4F6]">{u.fullName}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-[#8E9299]">{u.username}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold border text-[11px] ${getRoleBadgeClass(u.role)}`}>
                      {getRoleTitle(u.role)}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-[#8E9299] text-[11px]">
                    {u.role === 'admin' && <span className="text-amber-600 dark:text-[#C9A227] font-bold">هر دو پرتال (/admin و /adminsite)</span>}
                    {u.role === 'site_manager' && <span className="text-sky-600 dark:text-sky-400 font-bold">پرتال مدیریت سایت (/adminsite)</span>}
                    {u.role === 'seller' && <span className="text-emerald-600 dark:text-emerald-400 font-bold">صندوق فروش سریع (/admin/pos)</span>}
                    {u.role === 'accountant' && <span className="text-indigo-600 dark:text-indigo-400 font-bold">حسابداری و چک‌ها (/admin)</span>}
                    {u.role === 'chief_accountant' && <span className="text-purple-600 dark:text-purple-400 font-bold">حسابداری و کارگاه (/admin)</span>}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-300 dark:border-emerald-800">
                      فعال
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111113] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#222225] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#222225]">
              <h4 className="font-black text-slate-900 dark:text-[#F3F4F6] text-sm">تعریف کاربر پرسنل جدید</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-[#8E9299] block mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="مثال: علی رضایی"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-[#8E9299] block mb-1">نام کاربری (لاتین):</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="seller2"
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-[#8E9299] block mb-1">کلمه عبور:</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="******"
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-[#8E9299] block mb-1">سطح دسترسی (Role):</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] rounded-xl p-2.5 font-bold outline-none cursor-pointer"
                >
                  <option value="seller">صندوقدار و فروشنده حضوری (POS)</option>
                  <option value="site_manager">مدیر فروشگاه آنلاین و سایت (/adminsite)</option>
                  <option value="accountant">حسابدار (فاکتورها و چک‌ها)</option>
                  <option value="chief_accountant">مدیر ارشد حسابداری و کارگاه تولیدی</option>
                  <option value="admin">مدیر کل (Super Admin - دسترسی کامل)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
              >
                ذخیره و ایجاد کاربر پرسنل
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
