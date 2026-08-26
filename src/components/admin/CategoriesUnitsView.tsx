import React, { useState, useEffect } from 'react';
import { Layers, Plus, Tag, Scale, Check, X, Edit2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toPersianDigits } from '../../lib/utils';
import { Category, UnitDefinition } from '../../types';
import { useToast } from '../common/Toast';

export const CategoriesUnitsView: React.FC = () => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitDefinition[]>([]);

  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [subCatInput, setSubCatInput] = useState('');

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [subUnitName, setSubUnitName] = useState('');
  const [conversionFactor, setConversionFactor] = useState<number>(12);
  const [unitDesc, setUnitDesc] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [catRes, unitRes] = await Promise.all([
        api.getCategories().catch(() => ({ categories: [] })),
        api.getUnits().catch(() => ({ units: [] })),
      ]);
      setCategories(catRes.categories || []);
      setUnits(unitRes.units || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const subcategories = subCatInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.createCategory({ name: catName.trim(), subcategories });
      showToast('دسته‌بندی جدید با موفقیت ایجاد شد.', 'success');
      setShowCatModal(false);
      setCatName('');
      setSubCatInput('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد دسته‌بندی', 'error');
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName || !subUnitName) return;
    try {
      await api.createUnit({
        name: unitName,
        subUnit: subUnitName,
        conversionFactor,
        description: unitDesc,
      });
      showToast('واحد شمارش و ضریب تبدیل جدید ثبت شد.', 'success');
      setShowUnitModal(false);
      setUnitName('');
      setSubUnitName('');
      setConversionFactor(12);
      setUnitDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت واحد', 'error');
    }
  };

  return (
    <div className="space-y-6 text-[#E0E0E0]">
      {/* Categories Section */}
      <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#F3F4F6] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#C9A227]" />
              <span>دسته‌بندی‌ها و زیردسته‌های کالا</span>
            </h3>
            <p className="text-xs text-[#8E9299]">ساختار درختی دسته‌بندی اقلام برای سایت و صندوق</p>
          </div>

          <button
            onClick={() => setShowCatModal(true)}
            className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>افزودن دسته‌بندی جدید</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="p-4 rounded-2xl border border-[#2D2D33] bg-[#161619] space-y-2">
              <div className="flex items-center justify-between font-bold text-sm text-[#F3F4F6]">
                <span>{cat.name}</span>
                <span className="text-[10px] bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/30 px-2.5 py-0.5 rounded-full font-mono">
                  {toPersianDigits(cat.productCount)} کالا
                </span>
              </div>

              <div className="text-xs text-[#8E9299]">
                <div className="font-semibold text-[#8E9299] text-[11px] mb-1">زیردسته‌ها:</div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    cat.subcategories.map((sub) => (
                      <span key={sub.id} className="bg-[#111113] border border-[#2D2D33] px-2 py-0.5 rounded-lg text-[#E0E0E0]">
                        {sub.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#8E9299] italic text-[11px]">بدون زیردسته</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Units & Conversion Factors Section */}
      <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#F3F4F6] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#C9A227]" />
              <span>واحدهای شمارش و ضرایب تبدیل (کارتن، بسته، جین، عدد)</span>
            </h3>
            <p className="text-xs text-[#8E9299]">محاسبه خودکار تعداد خرد در هنگام خرید عمده و فروش تک</p>
          </div>

          <button
            onClick={() => setShowUnitModal(true)}
            className="bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] border border-[#2D2D33] font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>تعریف واحد شمارش جدید</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((u) => (
            <div key={u.id} className="p-4 rounded-2xl border border-[#2D2D33] bg-[#161619] space-y-2">
              <div className="flex items-center justify-between font-bold text-sm text-[#F3F4F6]">
                <span>{u.name}</span>
                <span className="text-xs text-[#C9A227] font-mono font-bold bg-[#111113] border border-[#C9A227]/30 px-2 py-0.5 rounded-lg">
                  ۱ {u.name} = {toPersianDigits(u.conversionFactor)} {u.subUnit}
                </span>
              </div>
              {u.description && <p className="text-xs text-[#8E9299]">{u.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#222225]">
              <h4 className="font-black text-[#F3F4F6] text-sm">افزودن دسته‌بندی جدید</h4>
              <button onClick={() => setShowCatModal(false)} className="text-[#8E9299] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">نام دسته اصلی:</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="مثال: نوشت‌افزار، اداری، هنری"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-bold text-[#E0E0E0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">زیردسته‌ها (با کاما جدا کنید):</label>
                <input
                  type="text"
                  value={subCatInput}
                  onChange={(e) => setSubCatInput(e.target.value)}
                  placeholder="خودکار, روان‌نویس, ماژیک, مداد"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  ایجاد دسته‌بندی
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#222225]">
              <h4 className="font-black text-[#F3F4F6] text-sm">تعریف واحد شمارش و ضریب تبدیل</h4>
              <button onClick={() => setShowUnitModal(false)} className="text-[#8E9299] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">واحد کلان (عمده):</label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="مثال: کارتن، جین، بسته ۵۰ تایی"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none font-bold text-[#E0E0E0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">واحد خرد (تک):</label>
                <input
                  type="text"
                  required
                  value={subUnitName}
                  onChange={(e) => setSubUnitName(e.target.value)}
                  placeholder="مثال: عدد، جلد، برگ"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">ضریب تبدیل (تعداد خرد در هر واحد کلان):</label>
                <input
                  type="number"
                  required
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(Number(e.target.value))}
                  placeholder="مثال: 12"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono outline-none text-[#E0E0E0]"
                />
              </div>

              <div>
                <label className="font-bold text-[#8E9299] block mb-1">توضیحات اختیاری:</label>
                <input
                  type="text"
                  value={unitDesc}
                  onChange={(e) => setUnitDesc(e.target.value)}
                  placeholder="مثال: هر کارتن شامل ۴۰ بسته خودکار می‌باشد"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  ثبت واحد
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
