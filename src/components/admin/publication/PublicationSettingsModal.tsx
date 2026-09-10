import React, { useState } from 'react';
import { Settings, Sliders, CheckCircle2, Sparkles, FileText, Info } from 'lucide-react';
import { PublicationSettings } from '../../../types';
import { api } from '../../../lib/api';

interface Props {
  settings: PublicationSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const PublicationSettingsModal: React.FC<Props> = ({
  settings,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<PublicationSettings>({ ...settings });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updatePublicationSettings(form);
      onSaved();
      onClose();
    } catch (err: any) {
      alert(`خطا در ذخیره تنظیمات انتشار: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setForm(prev => ({
      ...prev,
      defaultTemplate: (prev.defaultTemplate || '') + variable,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#28282D] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#222226] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                تنظیمات سراسری سیستم انتشار خودکار کالاها
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تعیین تریگرهای اتوماتیک، قالب متنی پیش‌فرض و تولید هشتگ‌های هوشمند
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* بخش ۱: رویدادهای انتشار خودکار */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              رویدادهای انتشار خودکار در کانال‌ها (Automatic Triggers)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50/50 dark:bg-[#19191D] cursor-pointer hover:border-amber-400/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.publishOnCreate}
                  onChange={e => setForm({ ...form, publishOnCreate: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">تعریف کالای جدید</div>
                  <div className="text-[11px] text-slate-500">انتشار آنی پس از ذخیره اولیه کالا</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50/50 dark:bg-[#19191D] cursor-pointer hover:border-amber-400/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.publishOnPriceChange}
                  onChange={e => setForm({ ...form, publishOnPriceChange: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">تغییر قیمت فروش</div>
                  <div className="text-[11px] text-slate-500">اطلاع‌رسانی تخفیف یا قیمت جدید کالا</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50/50 dark:bg-[#19191D] cursor-pointer hover:border-amber-400/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.publishOnRestock}
                  onChange={e => setForm({ ...form, publishOnRestock: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">شارژ مجدد موجودی انبار</div>
                  <div className="text-[11px] text-slate-500">اطلاع‌رسانی موجود شدن مجدد کالای ناموجود</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50/50 dark:bg-[#19191D] cursor-pointer hover:border-amber-400/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.publishOnUpdate}
                  onChange={e => setForm({ ...form, publishOnUpdate: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">ویرایش مشخصات کالا</div>
                  <div className="text-[11px] text-slate-500">ارسال در هر بار تغییر اطلاعات پایه</div>
                </div>
              </label>
            </div>
          </div>

          {/* بخش ۲: پیش‌فرض‌های محتوا */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#222226]">
            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              پیش‌فرض‌های محتوایی پست
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50/50 dark:bg-[#19191D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendImageByDefault}
                  onChange={e => setForm({ ...form, sendImageByDefault: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">ارسال عکس اصلی کالا</div>
                  <div className="text-[11px] text-slate-500">ضمیمه کردن تصویر شاخص محصول به پست</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50/50 dark:bg-[#19191D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.generateHashtagsByDefault}
                  onChange={e => setForm({ ...form, generateHashtagsByDefault: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">تولید خودکار هشتگ‌ها</div>
                  <div className="text-[11px] text-slate-500">استخراج هشتگ‌های هوشمند از نام و دسته کالا</div>
                </div>
              </label>
            </div>
          </div>

          {/* بخش ۳: قالب پیش‌فرض متن پست */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#222226]">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-500" />
                الگوی متن پیش‌فرض (Template)
              </h4>
              <span className="text-[10px] text-slate-400">امکان استفاده از متغیرهای پویا</span>
            </div>

            {/* کلیدهای درج سریع متغیر */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: '{name}', label: 'نام کالا' },
                { tag: '{price}', label: 'قیمت' },
                { tag: '{stock}', label: 'موجودی' },
                { tag: '{unit}', label: 'واحد' },
                { tag: '{code}', label: 'کد کالا' },
                { tag: '{description}', label: 'توضیحات' },
                { tag: '{url}', label: 'لینک سایت' },
                { tag: '{hashtags}', label: 'هشتگ‌ها' },
              ].map(v => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(` ${v.tag} `)}
                  className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-[10px] font-mono transition-colors cursor-pointer"
                >
                  +{v.label} ({v.tag})
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={form.defaultTemplate}
              onChange={e => setForm({ ...form, defaultTemplate: e.target.value })}
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs font-sans leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              dir="rtl"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#222226] bg-slate-50 dark:bg-[#101012] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C1C20] transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#C9A227] to-[#A28018] text-slate-950 font-black shadow-md shadow-amber-500/20 hover:opacity-90 transition-opacity"
          >
            {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </div>
    </div>
  );
};
