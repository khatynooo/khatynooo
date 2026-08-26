import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserCheck, MapPin, Mail, CreditCard, CheckCircle2, AlertTriangle, Building, X } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface MandatoryProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reasonText?: string;
  allowClose?: boolean;
}

export const MandatoryProfileModal: React.FC<MandatoryProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reasonText,
  allowClose = true,
}) => {
  const { customer, updateProfile, totalPurchaseAmount } = useCustomerAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(customer?.name || '');
  const [province, setProvince] = useState(customer?.province || 'تهران');
  const [city, setCity] = useState(customer?.city || 'تهران');
  const [postalCode, setPostalCode] = useState(customer?.postalCode || '');
  const [fullAddress, setFullAddress] = useState(customer?.fullAddress || customer?.address || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [nationalCode, setNationalCode] = useState(customer?.nationalCode || '');
  const [companyName, setCompanyName] = useState(customer?.companyName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (customer) {
      if (customer.name) setName(customer.name);
      if (customer.province) setProvince(customer.province);
      if (customer.city) setCity(customer.city);
      if (customer.postalCode) setPostalCode(customer.postalCode);
      if (customer.fullAddress || customer.address) setFullAddress(customer.fullAddress || customer.address || '');
      if (customer.email) setEmail(customer.email);
      if (customer.nationalCode) setNationalCode(customer.nationalCode);
      if (customer.companyName) setCompanyName(customer.companyName);
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('لطفاً نام و نام خانوادگی خود را کامل وارد نمایید.');
      return;
    }

    if (!fullAddress.trim() || fullAddress.trim().length < 8) {
      setErrorMsg('لطفاً نشانی پستی دقیق خود را وارد فرمایید.');
      return;
    }

    const cleanPostal = postalCode.replace(/[^0-9]/g, '');
    if (!cleanPostal || cleanPostal.length !== 10) {
      setErrorMsg('کد پستی ۱۰ رقمی معتبر الزامی است.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      await updateProfile({
        name: name.trim(),
        province: province.trim(),
        city: city.trim(),
        postalCode: cleanPostal,
        fullAddress: fullAddress.trim(),
        email: email.trim() || undefined,
        nationalCode: nationalCode.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });

      showToast('مشخصات حساب کاربری با موفقیت تکمیل و ثبت گردید.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={allowClose ? onClose : undefined}
        className="fixed inset-0 bg-black/85 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#111113] rounded-3xl border border-slate-200 dark:border-[#222225] shadow-2xl overflow-hidden z-10 text-slate-800 dark:text-[#E0E0E0]"
      >
        {/* Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#C9A227] via-amber-400 to-[#8C6D14]" />

        {allowClose && (
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 text-slate-400 dark:text-[#8E9299] hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#161619] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6 sm:p-8">
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-[#1C1C20] border border-amber-200 dark:border-[#C9A227]/30 text-[#C9A227] flex items-center justify-center mx-auto mb-3 shadow-md">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-[#F3F4F6]">
              تکمیل مشخصات و آدرس دریافت سفارش
            </h3>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs px-3 py-1 rounded-full font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>
                {reasonText ||
                  `سقف خرید بالای ۱۰۰ هزار تومان (${formatToman(totalPurchaseAmount || 100000)}) مستلزم درج آدرس پستی دقیق است.`}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#E0E0E0]">
                  نام و نام خانوادگی <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: علی حسینی"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#E0E0E0]">شماره تلفن همراه:</label>
                <input
                  type="text"
                  disabled
                  value={customer?.mobile ? toPersianDigits(customer.mobile) : ''}
                  className="w-full bg-slate-100 dark:bg-[#1C1C20] border border-slate-200 dark:border-[#2D2D33] rounded-xl p-2.5 text-slate-500 dark:text-[#8E9299] outline-none font-mono cursor-not-allowed"
                />
              </div>
            </div>

            {/* Province, City & Postal Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#E0E0E0]">
                  استان <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="مثال: تهران"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#E0E0E0]">
                  شهر <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: تهران"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#E0E0E0]">
                  کد پستی (۱۰ رقم) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  dir="ltr"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="1234567890"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none font-mono text-center"
                />
              </div>
            </div>

            {/* Exact Full Address */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-[#E0E0E0]">
                نشانی دقیق پستی تحویل‌گیرنده <span className="text-rose-500">*</span>:
              </label>
              <textarea
                required
                rows={2}
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="خیابان، کوچه، پلاک، طبقه، واحد..."
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none"
              />
            </div>

            {/* Email & National Code (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-[#8E9299]">پست الکترونیکی (اختیاری):</label>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-[#8E9299]">کد ملی یا شناسه شرکت (اختیاری):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value)}
                  placeholder="جهت فاکتور رسمی یا خرید عمده"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 text-slate-900 dark:text-[#F3F4F6] outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end gap-2">
              {allowClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2D2D33] text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] active:scale-[0.99] text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>{isLoading ? 'در حال ذخیره...' : 'ذخیره و تایید مشخصات'}</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
