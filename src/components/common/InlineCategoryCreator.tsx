import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, Loader2, FolderPlus, Tag } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from './Toast';
import { Category, SubCategory } from '../../types';

interface InlineCategoryCreatorProps {
  mode: 'category' | 'subcategory';
  parentCategoryId?: string;
  onCreated: (result: {
    category?: Category;
    subcategory?: SubCategory;
    categoryId?: string;
    subCategoryId?: string;
  }) => void;
  disabled?: boolean;
  disabledReason?: string;
  theme?: 'dark' | 'light';
}

export const InlineCategoryCreator: React.FC<InlineCategoryCreatorProps> = ({
  mode,
  parentCategoryId,
  onCreated,
  disabled = false,
  disabledReason = 'ابتدا دسته‌بندی اصلی را انتخاب کنید',
  theme = 'dark',
}) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCategory = mode === 'category';
  const title = isCategory ? 'افزودن دسته‌بندی جدید' : 'افزودن زیردسته‌بندی جدید';
  const placeholder = isCategory ? 'مثلاً: نوشت‌افزار، دفاتر و کاغذ...' : 'مثلاً: روان‌نویس، خودکار، کلاسور...';

  // بستن پاپ‌اوور هنگام کلیک به خارج از آن
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast(isCategory ? 'نام دسته‌بندی الزامی است.' : 'نام زیردسته الزامی است.', 'error');
      inputRef.current?.focus();
      return;
    }

    if (!isCategory && !parentCategoryId) {
      showToast('شناسه دسته‌بندی اصلی نامعتبر است.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCategory) {
        const res = await api.createCategory({ name: trimmedName });
        const createdCat: Category = res.category || {
          id: `cat_${Date.now()}`,
          name: trimmedName,
          subcategories: [],
        };
        showToast(`دسته‌بندی «${trimmedName}» با موفقیت افزوده شد.`, 'success');
        onCreated({
          category: createdCat,
          categoryId: createdCat.id,
        });
      } else {
        const res = await api.createSubcategory(parentCategoryId!, { name: trimmedName });
        const createdSub: SubCategory = res.subcategory || {
          id: `sub_${Date.now()}`,
          categoryId: parentCategoryId!,
          categoryName: '',
          name: trimmedName,
        };
        showToast(`زیردسته «${trimmedName}» با موفقیت افزوده شد.`, 'success');
        onCreated({
          subcategory: createdSub,
          subCategoryId: createdSub.id,
          categoryId: parentCategoryId,
        });
      }

      setName('');
      setIsOpen(false);
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت آیتم جدید.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-right" ref={popoverRef}>
      {/* دکمه گرد افزودن سریع */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        title={disabled ? disabledReason : title}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-[#1f1f24] text-slate-400 border border-slate-300 dark:border-[#2D2D33]'
            : theme === 'dark'
            ? 'bg-[#1C1C20] hover:bg-[#C9A227] text-[#C9A227] hover:text-slate-950 border border-[#C9A227]/40 hover:border-[#C9A227] shadow-xs active:scale-95'
            : 'bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white border border-amber-300 hover:border-amber-500 shadow-xs active:scale-95'
        }`}
      >
        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
      </button>

      {/* پنجره کوچک پاپ‌اوور ثبت سریع */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 w-72 p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border ${
            theme === 'dark'
              ? 'bg-[#18181C] border-[#383842] text-[#E0E0E0] shadow-black/80'
              : 'bg-white border-slate-300 text-slate-800 shadow-slate-400/50'
          }`}
        >
          {/* هدر پاپ‌اوور */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-[#2D2D33]">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#C9A227] dark:text-[#C9A227]">
              {isCategory ? <FolderPlus className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-[#E0E0E0] p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* فیلد ورودی نام */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-[#8E9299] mb-1">
                {isCategory ? 'نام دسته‌بندی اصلی:' : 'نام زیردسته جدید:'}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSubmitting}
                className={`w-full text-xs font-bold px-3 py-2 rounded-xl outline-none transition border ${
                  theme === 'dark'
                    ? 'bg-[#101012] border-[#2D2D33] focus:border-[#C9A227] text-[#F3F4F6] placeholder-[#5A5A64]'
                    : 'bg-slate-50 border-slate-300 focus:border-amber-500 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* دکمه‌های اقدام */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#222226] hover:bg-[#2A2A30] text-[#8E9299] hover:text-[#E0E0E0]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-[#C9A227] hover:bg-[#B38F20] text-slate-950 flex items-center gap-1.5 shadow-xs cursor-pointer font-black"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    <span>ثبت و انتخاب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
