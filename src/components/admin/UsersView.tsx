import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  User,
  Key,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Edit2,
  Trash2,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getRoleTitle, getRoleBadgeClass, toPersianDigits } from '../../lib/utils';
import { StaffUser, UserRole } from '../../types';
import { useToast } from '../common/Toast';

export const UsersView: React.FC = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'seller' as UserRole,
  });
  const [showCreatePass, setShowCreatePass] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    role: 'seller' as UserRole,
    isActive: true,
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showEditPass, setShowEditPass] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      showToast(err.message || 'خطا در دریافت لیست پرسنل', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password || !createForm.fullName) {
      showToast('لطفاً تمامی فیلدهای الزامی را تکمیل کنید.', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showToast('کلمه عبور باید حداقل ۶ کاراکتر باشد.', 'error');
      return;
    }

    try {
      await api.createUser(createForm);
      showToast('کاربر جدید با موفقیت در سیستم ثبت و فعال شد.', 'success');
      setShowCreateModal(false);
      setCreateForm({ username: '', password: '', fullName: '', phone: '', role: 'seller' });
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت کاربر', 'error');
    }
  };

  const openEditModal = (user: StaffUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      newPassword: '',
      confirmNewPassword: '',
    });
    setShowEditPass(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editForm.newPassword) {
      if (editForm.newPassword.length < 6) {
        showToast('کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.', 'error');
        return;
      }
      if (editForm.newPassword !== editForm.confirmNewPassword) {
        showToast('کلمه عبور جدید با تکرار آن مطابقت ندارد.', 'error');
        return;
      }
    }

    try {
      const payload: any = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        role: editForm.role,
        isActive: editForm.isActive,
      };
      if (editForm.newPassword && editForm.newPassword.trim().length > 0) {
        payload.password = editForm.newPassword.trim();
      }

      await api.updateUser(editingUser.id, payload);
      showToast('اطلاعات و دسترسی‌های کاربر با موفقیت به‌روزرسانی شد.', 'success');
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'خطا در به‌روزرسانی کاربر', 'error');
    }
  };

  const handleToggleActiveStatus = async (user: StaffUser) => {
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      showToast(`وضعیت کاربر ${user.fullName} به ${!user.isActive ? 'فعال' : 'غیرفعال'} تغییر یافت.`, 'success');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت کاربر', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.deleteUser(deletingUser.id);
      showToast(`کاربر ${deletingUser.fullName} با موفقیت حذف گردید.`, 'success');
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف کاربر', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      getRoleTitle(u.role).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-[#F3F4F6] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#C9A227]" />
            <span>مدیریت پرسنل، امنیت کاربران و کنترل دسترسی (RBAC)</span>
          </h2>
          <p className="text-xs text-[#8E9299]">
            امکان تعریف پرسنل، تغییر کلمه عبور با هش ایمن BCrypt، تفکیک شماره تماس و تخصیص نقش‌های ۵ گانه سازمانی
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 bg-[#161619] hover:bg-[#202024] text-[#E0E0E0] border border-[#2D2D33] rounded-xl transition-all cursor-pointer"
            title="به‌روزرسانی لیست"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C9A227]' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>تعریف پرسنل جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111113] p-4 rounded-2xl border border-[#222225] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8E9299] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس نام، نام کاربری یا شماره همراه..."
            className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-xs text-[#E0E0E0] pr-9 pl-3 py-2 rounded-xl outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-[#8E9299]">
          <div>
            <span>تعداد کل پرسنل:</span>{' '}
            <span className="font-mono font-bold text-[#F3F4F6]">{toPersianDigits(users.length)}</span>
          </div>
          <div>
            <span>پرسنل فعال:</span>{' '}
            <span className="font-mono font-bold text-emerald-400">
              {toPersianDigits(users.filter((u) => u.isActive).length)}
            </span>
          </div>
        </div>
      </div>

      {/* Role Matrix Summary */}
      <div className="bg-[#111113] rounded-3xl p-5 border border-[#222225] shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-[#F3F4F6] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#C9A227]" />
          <span>ماتریس سطوح دسترسی پرسنل خطی‌نو:</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-[#161619] p-3 rounded-2xl border border-[#2D2D33] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F3F4F6]">مدیر کل (Admin)</span>
              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                دسترسی کامل
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">تمامی امکانات حسابداری، کارگاه، پرسنل و پنل وب‌سایت</p>
          </div>

          <div className="bg-[#161619] p-3 rounded-2xl border border-[#2D2D33] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F3F4F6]">مدیر سایت</span>
              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                سایت /adminsite
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">سفارشات اینترنتی، بنرها، ترب، هوش مصنوعی و سئو</p>
          </div>

          <div className="bg-[#161619] p-3 rounded-2xl border border-[#2D2D33] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F3F4F6]">صندوقدار حضوری</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                صندوق POS
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">فروش بارکدی، فیش پرینت، تسویه سریع پیشخوان</p>
          </div>

          <div className="bg-[#161619] p-3 rounded-2xl border border-[#2D2D33] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F3F4F6]">حسابدار</span>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                مالی و چک
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">فاکتورهای خرید/فروش، دریافت/پرداخت چک و خزانه‌داری</p>
          </div>

          <div className="bg-[#161619] p-3 rounded-2xl border border-[#2D2D33] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F3F4F6]">مدیر تولید</span>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                کارگاه خطی‌نو
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">فرمولاسیون دفاتر سیمی، بهای تمام‌شده و انبار مواد</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111113] rounded-3xl border border-[#222225] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-[#161619] text-[#C9A227] font-bold border-b border-[#222225]">
              <tr>
                <th className="p-4">نام و نام خانوادگی</th>
                <th className="p-4">نام کاربری</th>
                <th className="p-4">شماره همراه</th>
                <th className="p-4">نقش سیستمی (Role)</th>
                <th className="p-4">وضعیت حساب</th>
                <th className="p-4 text-center">عملیات و مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222225]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8E9299]">
                    هیچ کاربری با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#161619]/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1C1C20] border border-[#2D2D33] flex items-center justify-center font-bold text-[#C9A227]">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-[#F3F4F6]">{u.fullName}</div>
                          <div className="text-[10px] text-[#8E9299]">
                            ثبت: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fa-IR') : '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-[#E0E0E0]">{u.username}</td>
                    <td className="p-4 font-mono text-[#8E9299]">
                      {u.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#C9A227]" />
                          {u.phone}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold border text-[11px] ${getRoleBadgeClass(u.role)}`}>
                        {getRoleTitle(u.role)}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActiveStatus(u)}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border cursor-pointer transition-all ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                        title="کلیک جهت تغییر وضعیت فعال/غیرفعال"
                      >
                        {u.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{u.isActive ? 'فعال' : 'غیرفعال'}</span>
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 bg-[#1C1C20] hover:bg-[#25252B] text-sky-400 border border-[#2D2D33] rounded-lg transition-all cursor-pointer"
                          title="ویرایش مشخصات و تغییر کلمه عبور"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 bg-[#1C1C20] hover:bg-rose-950 text-rose-400 border border-[#2D2D33] rounded-lg transition-all cursor-pointer"
                          title="حذف پرسنل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#222225]">
              <h4 className="font-black text-[#F3F4F6] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#C9A227]" />
                <span>تعریف کاربر پرسنل جدید</span>
              </h4>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8E9299] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="مثال: علی رضایی"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">نام کاربری (لاتین):</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="seller2"
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">شماره همراه:</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="۰۹۱۲..."
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">کلمه عبور ورود:</label>
                <div className="relative">
                  <input
                    type={showCreatePass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="حداقل ۶ کاراکتر"
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 pl-9 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white cursor-pointer"
                  >
                    {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">سطح دسترسی سازمانی (Role):</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2.5 font-bold outline-none cursor-pointer"
                >
                  <option value="seller">صندوقدار و فروشنده حضوری (POS)</option>
                  <option value="site_manager">مدیر فروشگاه آنلاین و سایت (/adminsite)</option>
                  <option value="accountant">حسابدار (فاکتورها و چک‌ها)</option>
                  <option value="chief_accountant">مدیر ارشد حسابداری و کارگاه تولیدی</option>
                  <option value="admin">مدیر کل (Super Admin - دسترسی کامل)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-lg shadow-[#C9A227]/20 cursor-pointer"
                >
                  ایجاد کاربر جدید
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal & Change Password */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#222225]">
              <h4 className="font-black text-[#F3F4F6] text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>ویرایش کاربر: {editingUser.fullName}</span>
              </h4>
              <button
                onClick={() => setEditingUser(null)}
                className="text-[#8E9299] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">نام کاربری:</label>
                  <input
                    type="text"
                    disabled
                    value={editingUser.username}
                    className="w-full bg-[#1C1C20] border border-[#2D2D33] text-slate-500 rounded-xl p-2 font-mono outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">وضعیت حساب:</label>
                  <select
                    value={editForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 font-bold outline-none cursor-pointer"
                  >
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال (مسدود شده)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">شماره همراه:</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="۰۹۱۲..."
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#8E9299] block mb-1">نقش سازمانی:</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 font-bold outline-none cursor-pointer"
                  >
                    <option value="seller">صندوقدار (POS)</option>
                    <option value="site_manager">مدیر سایت (/adminsite)</option>
                    <option value="accountant">حسابدار</option>
                    <option value="chief_accountant">مدیر ارشد حسابداری و کارگاه</option>
                    <option value="admin">مدیر کل (Super Admin)</option>
                  </select>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pt-2 border-t border-[#222225] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F3F4F6] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>تغییر کلمه عبور (اختیاری):</span>
                  </span>
                  <span className="text-[10px] text-[#8E9299]">فقط در صورت نیاز به رمز جدید پر شود</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      placeholder="رمز جدید (حداقل ۶ نویسه)"
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 pl-9 font-mono outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPass(!showEditPass)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white cursor-pointer"
                    >
                      {showEditPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div>
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      value={editForm.confirmNewPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmNewPassword: e.target.value })}
                      placeholder="تکرار رمز جدید"
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-xl p-2 font-mono outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-black py-2.5 rounded-xl shadow-lg shadow-sky-600/20 cursor-pointer"
                >
                  ذخیره تغییرات کاربر
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-500/30 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-[#F3F4F6] text-sm">حذف دسترسی پرسنل</h4>
              <p className="text-xs text-[#8E9299]">
                آیا از حذف حساب کاربری <span className="font-bold text-rose-400">{deletingUser.fullName}</span> ({deletingUser.username}) اطمینان دارید؟
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer text-xs"
              >
                بله، حذف شود
              </button>
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold py-2.5 rounded-xl cursor-pointer text-xs"
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
