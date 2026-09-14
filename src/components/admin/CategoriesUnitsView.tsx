import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Plus,
  Tag,
  Scale,
  Check,
  X,
  Edit2,
  Trash2,
  Search,
  ArrowRightLeft,
  Calculator,
  Sparkles,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  FolderPlus,
  FolderTree,
  Boxes,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { toPersianDigits, formatToman, formatNumber } from '../../lib/utils';
import { Category, UnitDefinition, SubCategory } from '../../types';
import { useToast } from '../common/Toast';

type ViewMode = 'all' | 'categories' | 'units' | 'replacement' | 'calculator';

const DEFAULT_RETAIL_UNITS = [
  { name: 'کارتن', subUnit: 'بسته', conversionFactor: 12, description: 'هر کارتن شامل ۱۲ بسته' },
  { name: 'بسته', subUnit: 'عدد', conversionFactor: 12, description: 'هر بسته شامل ۱۲ عدد (دوجین)' },
  { name: 'بسته خودکار', subUnit: 'عدد', conversionFactor: 50, description: 'بسته‌های ۵۰ عددی خودکار اداری' },
  { name: 'کارتن مادر', subUnit: 'عدد', conversionFactor: 240, description: 'کارتن عمده نوشت‌افزار (۲۰ جین)' },
  { name: 'بند', subUnit: 'برگ', conversionFactor: 500, description: 'بند کاغذ A4 و کپی‌مکس (۵۰۰ برگ)' },
  { name: 'دست', subUnit: 'عدد', conversionFactor: 6, description: 'ست‌های ۶ عددی مدادرنگی و روان‌نویس' },
  { name: 'جلد', subUnit: 'عدد', conversionFactor: 1, description: 'کتاب، دفتر، سررسید و سالنامه' },
  { name: 'حلقه', subUnit: 'عدد', conversionFactor: 1, description: 'انواع چسب نواری و چسب پهن' },
  { name: 'طاقه / رول', subUnit: 'متر', conversionFactor: 50, description: 'کاغذ کادو، طلق، سلفون و رول صحافی' },
  { name: 'کیلوگرم', subUnit: 'گرم', conversionFactor: 1000, description: 'اقلام فله، خمیر، مقوا و چسب مایع' },
];

export const CategoriesUnitsView: React.FC = () => {
  const { showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search and view filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('all');

  // Category Modals & Forms
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [subCatInput, setSubCatInput] = useState('');

  // Subcategory Modals & Inline Quick Add
  const [subCatModal, setSubCatModal] = useState<{ categoryId: string; subCategoryId?: string; name: string } | null>(null);
  const [inlineSubCat, setInlineSubCat] = useState<{ [catId: string]: string }>({});

  // Unit Modals & Forms
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState('');
  const [subUnitName, setSubUnitName] = useState('');
  const [conversionFactor, setConversionFactor] = useState<number>(12);
  const [unitDesc, setUnitDesc] = useState('');

  // Category Deletion with Smart Replacement Modal
  const [deleteCatModal, setDeleteCatModal] = useState<{
    category: Category;
    replacementCategoryId: string;
  } | null>(null);

  // Smart Replacement Tool State
  const [replaceCatSource, setReplaceCatSource] = useState<string>('');
  const [replaceCatTarget, setReplaceCatTarget] = useState<string>('');
  const [replaceCatTargetSub, setReplaceCatTargetSub] = useState<string>('');
  const [isReplacingCat, setIsReplacingCat] = useState(false);

  const [replaceUnitSource, setReplaceUnitSource] = useState<string>('');
  const [replaceUnitTarget, setReplaceUnitTarget] = useState<string>('');
  const [replaceUnitSubUnit, setReplaceUnitSubUnit] = useState<string>('');
  const [replaceUnitFactor, setReplaceUnitFactor] = useState<number | ''>('');
  const [isReplacingUnit, setIsReplacingUnit] = useState(false);

  // Live Unit Conversion & Price Calculator State
  const [calcSelectedUnitId, setCalcSelectedUnitId] = useState<string>('');
  const [calcWholesalePrice, setCalcWholesalePrice] = useState<number | ''>(120000);
  const [calcBulkQuantity, setCalcBulkQuantity] = useState<number | ''>(1);
  const [calcProfitMargin, setCalcProfitMargin] = useState<number>(20);

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard shortcut F1 to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        showToast('جستجوی دسته‌بندی‌ها و واحدها فعال شد (F1)', 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [catRes, unitRes] = await Promise.all([
        api.getCategories().catch(() => ({ categories: [] })),
        api.getUnits().catch(() => ({ units: [] })),
      ]);
      const cats: Category[] = catRes.categories || [];
      const unts: UnitDefinition[] = unitRes.units || [];
      setCategories(cats);
      setUnits(unts);
      if (unts.length > 0 && !calcSelectedUnitId) {
        setCalcSelectedUnitId(unts[0].id);
      }
    } catch (err: any) {
      console.error(err);
      showToast('خطا در بارگذاری اطلاعات دسته‌بندی‌ها و واحدها', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  // --- Category Actions ---
  const openCreateCategoryModal = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatImage('');
    setCatIcon('Tag');
    setSubCatInput('');
    setShowCatModal(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatImage(cat.image || '');
    setCatIcon(cat.icon || 'Tag');
    setSubCatInput('');
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showToast('نام دسته‌بندی الزامی است.', 'error');
      return;
    }
    try {
      if (editingCategoryId) {
        await api.updateCategory(editingCategoryId, {
          name: catName.trim(),
          image: catImage.trim() || undefined,
          icon: catIcon,
        });
        showToast('دسته‌بندی با موفقیت ویرایش شد.', 'success');
      } else {
        const subcategories = subCatInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        await api.createCategory({
          name: catName.trim(),
          image: catImage.trim() || undefined,
          icon: catIcon,
          subcategories,
        });
        showToast('دسته‌بندی جدید با موفقیت ایجاد شد.', 'success');
      }
      setShowCatModal(false);
      setEditingCategoryId(null);
      setCatName('');
      setCatImage('');
      setSubCatInput('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره دسته‌بندی', 'error');
    }
  };

  const handleInitiateDeleteCategory = (cat: Category) => {
    const pCount = cat.productCount || 0;
    if (pCount > 0) {
      // Find another category as default replacement
      const otherCat = categories.find((c) => c.id !== cat.id);
      setDeleteCatModal({
        category: cat,
        replacementCategoryId: otherCat?.id || '',
      });
    } else {
      if (confirm(`آیا از حذف دسته‌بندی «${cat.name}» اطمینان دارید؟`)) {
        executeDeleteCategory(cat.id);
      }
    }
  };

  const executeDeleteCategory = async (categoryId: string, replacementCategoryId?: string) => {
    try {
      await api.deleteCategory(categoryId, replacementCategoryId);
      showToast(
        replacementCategoryId
          ? 'دسته‌بندی با موفقیت حذف شد و کالاها به دسته جایگزین منتقل شدند.'
          : 'دسته‌بندی با موفقیت حذف شد.',
        'success'
      );
      setDeleteCatModal(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف دسته‌بندی', 'error');
    }
  };

  // --- Subcategory Inline & Modal Actions ---
  const handleInlineAddSubcategory = async (categoryId: string) => {
    const name = (inlineSubCat[categoryId] || '').trim();
    if (!name) return;
    try {
      await api.createSubcategory(categoryId, { name });
      showToast(`زیردسته «${name}» اضافه شد.`, 'success');
      setInlineSubCat((prev) => ({ ...prev, [categoryId]: '' }));
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در افزودن زیردسته', 'error');
    }
  };

  const openAddSubcategoryModal = (categoryId: string) => {
    setSubCatModal({ categoryId, name: '' });
  };

  const openEditSubcategoryModal = (categoryId: string, sub: SubCategory) => {
    setSubCatModal({ categoryId, subCategoryId: sub.id, name: sub.name });
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatModal || !subCatModal.name.trim()) return;
    try {
      if (subCatModal.subCategoryId) {
        await api.updateSubcategory(subCatModal.subCategoryId, { name: subCatModal.name.trim() });
        showToast('زیردسته با موفقیت ویرایش شد.', 'success');
      } else {
        await api.createSubcategory(subCatModal.categoryId, { name: subCatModal.name.trim() });
        showToast('زیردسته جدید اضافه شد.', 'success');
      }
      setSubCatModal(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره زیردسته', 'error');
    }
  };

  const handleDeleteSubcategory = async (sub: SubCategory) => {
    if (!confirm(`آیا از حذف زیردسته «${sub.name}» اطمینان دارید؟`)) return;
    try {
      await api.deleteSubcategory(sub.id);
      showToast('زیردسته با موفقیت حذف شد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف زیردسته', 'error');
    }
  };

  // --- Unit Actions ---
  const openCreateUnitModal = () => {
    setEditingUnitId(null);
    setUnitName('');
    setSubUnitName('');
    setConversionFactor(12);
    setUnitDesc('');
    setShowUnitModal(true);
  };

  const openEditUnitModal = (u: UnitDefinition) => {
    setEditingUnitId(u.id);
    setUnitName(u.name);
    setSubUnitName(u.subUnit);
    setConversionFactor(u.conversionFactor);
    setUnitDesc(u.description || '');
    setShowUnitModal(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !subUnitName.trim()) {
      showToast('نام واحد کلان و واحد خرد الزامی است.', 'error');
      return;
    }
    try {
      if (editingUnitId) {
        await api.updateUnit(editingUnitId, {
          name: unitName.trim(),
          subUnit: subUnitName.trim(),
          conversionFactor: Number(conversionFactor) || 1,
          description: unitDesc.trim() || undefined,
        });
        showToast('واحد شمارش با موفقیت به‌روزرسانی شد.', 'success');
      } else {
        await api.createUnit({
          name: unitName.trim(),
          subUnit: subUnitName.trim(),
          conversionFactor: Number(conversionFactor) || 1,
          description: unitDesc.trim() || undefined,
        });
        showToast('واحد شمارش و ضریب تبدیل جدید ثبت شد.', 'success');
      }
      setShowUnitModal(false);
      setEditingUnitId(null);
      setUnitName('');
      setSubUnitName('');
      setConversionFactor(12);
      setUnitDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره واحد شمارش', 'error');
    }
  };

  const handleDeleteUnit = async (u: UnitDefinition) => {
    if (!confirm(`آیا از حذف واحد «${u.name}» اطمینان دارید؟`)) return;
    try {
      await api.deleteUnit(u.id);
      showToast('واحد شمارش با موفقیت حذف شد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف واحد', 'error');
    }
  };

  // --- Load Default Retail & Stationery Presets ---
  const handleLoadRetailPresets = async () => {
    if (!confirm('آیا مایلید پکیج واحدهای پیش‌فرض استاندارد صنف نوشت‌افزار و کتاب (کارتن، جین، بسته، بند، دست، جلد) به سیستم اضافه شوند؟')) {
      return;
    }
    let addedCount = 0;
    try {
      for (const preset of DEFAULT_RETAIL_UNITS) {
        const exists = units.some((u) => u.name === preset.name && u.subUnit === preset.subUnit);
        if (!exists) {
          await api.createUnit(preset);
          addedCount++;
        }
      }
      showToast(
        addedCount > 0
          ? `${toPersianDigits(addedCount)} واحد استاندارد جدید به سیستم افزوده شد.`
          : 'واحدهای استاندارد از قبل در سیستم موجود بودند.',
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast('خطا در افزودن واحدهای استاندارد', 'error');
    }
  };

  // --- Smart Migration & Replacement Actions ---
  const handleExecuteCategoryReplacement = async () => {
    if (!replaceCatSource || !replaceCatTarget) {
      showToast('لطفاً دسته‌بندی مبدا و مقصد را انتخاب فرمایید.', 'error');
      return;
    }
    if (replaceCatSource === replaceCatTarget) {
      showToast('دسته‌بندی مبدا و مقصد نمی‌توانند یکسان باشند.', 'error');
      return;
    }

    const srcCat = categories.find((c) => c.id === replaceCatSource);
    const tgtCat = categories.find((c) => c.id === replaceCatTarget);

    if (!confirm(`آیا مطمئن هستید که کالاهای دسته «${srcCat?.name}» به دسته «${tgtCat?.name}» منتقل و جایگزین شوند؟`)) {
      return;
    }

    setIsReplacingCat(true);
    try {
      const res = await api.replaceCategory({
        sourceCategoryId: replaceCatSource,
        targetCategoryId: replaceCatTarget,
        targetSubCategoryId: replaceCatTargetSub || undefined,
      });
      showToast(res.message || 'انتقال و جایگزینی دسته‌بندی کالاها با موفقیت انجام شد.', 'success');
      setReplaceCatSource('');
      setReplaceCatTarget('');
      setReplaceCatTargetSub('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در جایگزینی دسته‌بندی کالاها', 'error');
    } finally {
      setIsReplacingCat(false);
    }
  };

  const handleExecuteUnitReplacement = async () => {
    if (!replaceUnitSource.trim() || !replaceUnitTarget.trim()) {
      showToast('لطفاً واحد مبدا و واحد جدید مقصد را وارد فرمایید.', 'error');
      return;
    }

    if (!confirm(`آیا از جایگزینی واحد «${replaceUnitSource}» با «${replaceUnitTarget}» در تمام کالاهای انبار اطمینان دارید؟`)) {
      return;
    }

    setIsReplacingUnit(true);
    try {
      const res = await api.replaceUnit({
        sourceUnit: replaceUnitSource.trim(),
        targetUnit: replaceUnitTarget.trim(),
        subUnit: replaceUnitSubUnit.trim() || undefined,
        conversionFactor: replaceUnitFactor ? Number(replaceUnitFactor) : undefined,
      });
      showToast(res.message || 'جایگزینی واحد کالاها با موفقیت اعمال شد.', 'success');
      setReplaceUnitSource('');
      setReplaceUnitTarget('');
      setReplaceUnitSubUnit('');
      setReplaceUnitFactor('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در جایگزینی واحد کالاها', 'error');
    } finally {
      setIsReplacingUnit(false);
    }
  };

  // --- Filtered Categories & Units ---
  const cleanSearch = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!cleanSearch) return categories;
    return categories.filter((c) => {
      const matchName = c.name.toLowerCase().includes(cleanSearch);
      const matchSub = (c.subcategories || []).some((s) => s.name.toLowerCase().includes(cleanSearch));
      return matchName || matchSub;
    });
  }, [categories, cleanSearch]);

  const filteredUnits = useMemo(() => {
    if (!cleanSearch) return units;
    return units.filter((u) => {
      const matchName = u.name.toLowerCase().includes(cleanSearch);
      const matchSub = u.subUnit.toLowerCase().includes(cleanSearch);
      const matchDesc = (u.description || '').toLowerCase().includes(cleanSearch);
      return matchName || matchSub || matchDesc;
    });
  }, [units, cleanSearch]);

  // Total summary calculations
  const totalSubcategoriesCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0);
  }, [categories]);

  const totalCategorizedProducts = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
  }, [categories]);

  // Selected Unit for Calculator
  const calcUnit = useMemo(() => {
    return units.find((u) => u.id === calcSelectedUnitId) || units[0];
  }, [units, calcSelectedUnitId]);

  const calcConversionFactor = calcUnit?.conversionFactor || 1;
  const numWholesale = typeof calcWholesalePrice === 'number' ? calcWholesalePrice : 0;
  const numBulkQty = typeof calcBulkQuantity === 'number' ? calcBulkQuantity : 1;
  const singleRetailCost = calcConversionFactor > 0 ? Math.round(numWholesale / calcConversionFactor) : numWholesale;
  const suggestedRetailSale = Math.round(singleRetailCost * (1 + calcProfitMargin / 100));
  const totalSubUnitsCount = Math.round(numBulkQty * calcConversionFactor);

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* 1. UNIFIED SUPER CONTROL BAR (Matching POS Design Language) */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-[#222225] shadow-xs space-y-3">
        {/* Top Row: Smart Search Input & Quick Action Triggers */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Smart Search Field with F1 shortcut */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در دسته‌بندی‌ها، زیردسته‌ها، یا واحدهای شمارش (F1)..."
              className="w-full bg-slate-50 dark:bg-[#161619] border-2 border-indigo-200/80 dark:border-indigo-900/60 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1A1E] rounded-xl pr-11 pl-20 py-2.5 text-sm font-sans text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-xs"
            />
            <div className="absolute right-3.5 top-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            {/* Quick Actions inside Input: Clear / F1 */}
            <div className="absolute left-2 top-2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#25252A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-[#25252A] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                  F1
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Standard Retail Presets Button */}
            <button
              onClick={handleLoadRetailPresets}
              className="bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#202026] text-slate-700 dark:text-[#E0E0E0] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-[#2D2D33] cursor-pointer shadow-xs"
              title="بارگذاری پکیج پیش‌فرض واحدهای پرکاربرد نوشت‌افزار، کتاب و کارتن"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>واحدهای پیش‌فرض صنف</span>
            </button>

            {/* Create Unit Button */}
            <button
              onClick={openCreateUnitModal}
              className="bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 dark:hover:bg-[#202026] text-slate-700 dark:text-[#E0E0E0] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-[#2D2D33] cursor-pointer shadow-xs"
              title="تعریف واحد کلان، واحد خرد و ضریب تبدیل جدید"
            >
              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>تعریف واحد جدید</span>
            </button>

            {/* Create Category Button (Primary Indigo) */}
            <button
              onClick={openCreateCategoryModal}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="ایجاد دسته‌بندی اصلی جدید برای کالاها"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>افزودن دسته‌بندی جدید</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Segmented View Switcher & Live Stat Counters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#222225]">
          {/* Segmented View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#161619] p-1 rounded-xl border border-slate-200 dark:border-[#2D2D33] overflow-x-auto">
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'all'
                  ? 'bg-white dark:bg-[#25252A] text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>همه بخش‌ها</span>
            </button>

            <button
              onClick={() => setActiveView('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'categories'
                  ? 'bg-white dark:bg-[#25252A] text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>دسته‌بندی‌ها</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                {toPersianDigits(categories.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveView('units')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'units'
                  ? 'bg-white dark:bg-[#25252A] text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>واحدهای شمارش</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono">
                {toPersianDigits(units.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveView('replacement')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'replacement'
                  ? 'bg-white dark:bg-[#25252A] text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="ابزار هوشمند جایگزینی و ادغام دسته‌ها و واحدهای کالا"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>ابزار جایگزینی و ادغام</span>
            </button>

            <button
              onClick={() => setActiveView('calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'calculator'
                  ? 'bg-white dark:bg-[#25252A] text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="ماشین‌حساب زنده تبدیل واحد کلان و خرد و قیمت‌گذاری"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>ماشین‌حساب تبدیل</span>
            </button>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="self-end sm:self-center p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#161619] transition-colors cursor-pointer"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. STAT SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#111113] p-3.5 rounded-2xl border border-slate-200 dark:border-[#222225] flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">دسته‌بندی‌های اصلی</div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(categories.length)}{' '}
              <span className="text-[11px] font-normal text-slate-400">دسته</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] p-3.5 rounded-2xl border border-slate-200 dark:border-[#222225] flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تنوع زیردسته‌ها</div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(totalSubcategoriesCount)}{' '}
              <span className="text-[11px] font-normal text-slate-400">زیردسته</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] p-3.5 rounded-2xl border border-slate-200 dark:border-[#222225] flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">واحدهای شمارش و ضرایب</div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(units.length)}{' '}
              <span className="text-[11px] font-normal text-slate-400">واحد</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111113] p-3.5 rounded-2xl border border-slate-200 dark:border-[#222225] flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">کالاهای دسته‌بندی‌شده</div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(totalCategorizedProducts)}{' '}
              <span className="text-[11px] font-normal text-slate-400">قلم کالا</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SMART REPLACEMENT & MIGRATION TOOL TAB */}
      {(activeView === 'replacement' || activeView === 'all') && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl p-5 border border-slate-200 dark:border-[#222225] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>ابزار هوشمند جایگزینی و ادغام کالاها (Migration & Replacement Engine)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                انتقال یکباره تمام کالاهای یک دسته‌بندی به دسته‌ای دیگر، یا جایگزینی نام واحد کالاها در کل سیستم
              </p>
            </div>
            <span className="text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2.5 py-1 rounded-full">
              جایگزینی سرتاسری
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Section A: Category Replacement */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-[#25252A]">
                <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>۱. ادغام و انتقال کالاهای دسته‌بندی</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">دسته‌بندی مبدا (انتقال از):</label>
                  <select
                    value={replaceCatSource}
                    onChange={(e) => setReplaceCatSource(e.target.value)}
                    className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600"
                  >
                    <option value="">-- انتخاب دسته مبدا --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({toPersianDigits(c.productCount || 0)} کالا)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">دسته‌بندی مقصد (انتقال به):</label>
                  <select
                    value={replaceCatTarget}
                    onChange={(e) => {
                      setReplaceCatTarget(e.target.value);
                      setReplaceCatTargetSub('');
                    }}
                    className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600"
                  >
                    <option value="">-- انتخاب دسته مقصد --</option>
                    {categories
                      .filter((c) => c.id !== replaceCatSource)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {replaceCatTarget && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">زیردسته مقصد (اختیاری):</label>
                    <select
                      value={replaceCatTargetSub}
                      onChange={(e) => setReplaceCatTargetSub(e.target.value)}
                      className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600"
                    >
                      <option value="">-- بدون تعیین زیردسته خاص --</option>
                      {(categories.find((c) => c.id === replaceCatTarget)?.subcategories || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExecuteCategoryReplacement}
                  disabled={!replaceCatSource || !replaceCatTarget || isReplacingCat}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>
                    {isReplacingCat ? 'در حال انتقال کالاها...' : 'انتقال و جایگزینی دسته‌بندی کالاها'}
                  </span>
                </button>
              </div>
            </div>

            {/* Section B: Unit Replacement */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-[#25252A]">
                <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>۲. جایگزینی نام یا واحد شمارش کالاها</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">واحد فعلی در کالاها (مبدا):</label>
                  <input
                    type="text"
                    value={replaceUnitSource}
                    onChange={(e) => setReplaceUnitSource(e.target.value)}
                    placeholder="مثال: دانه، کارتن، جعبه، جین"
                    className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">واحد جدید جایگزین (مقصد):</label>
                  <input
                    type="text"
                    value={replaceUnitTarget}
                    onChange={(e) => setReplaceUnitTarget(e.target.value)}
                    placeholder="مثال: عدد، بسته، کارتن استاندارد"
                    className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">واحد خرد (اختیاری):</label>
                    <input
                      type="text"
                      value={replaceUnitSubUnit}
                      onChange={(e) => setReplaceUnitSubUnit(e.target.value)}
                      placeholder="مثال: عدد"
                      className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">ضریب جدید (اختیاری):</label>
                    <input
                      type="number"
                      value={replaceUnitFactor}
                      onChange={(e) => setReplaceUnitFactor(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 12"
                      className="w-full bg-white dark:bg-[#1C1C20] border border-slate-300 dark:border-[#33333A] rounded-xl p-2 font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteUnitReplacement}
                  disabled={!replaceUnitSource.trim() || !replaceUnitTarget.trim() || isReplacingUnit}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>
                    {isReplacingUnit ? 'در حال جایگزینی...' : 'جایگزینی سراسری واحد در کالاها'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. INTERACTIVE UNIT & PRICE CALCULATOR TAB */}
      {(activeView === 'calculator' || activeView === 'all') && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl p-5 border border-slate-200 dark:border-[#222225] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ماشین‌حساب زنده تبدیل واحد کلان و خرد و قیمت‌گذاری خودکار</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                محاسبه فوری بهای تمام‌شده خرد، قیمت فروش، و تبدیل مقادیر عمده به تک
              </p>
            </div>
            <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full">
              محاسبه‌گر زنده
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">انتخاب واحد شمارش:</label>
              <select
                value={calcSelectedUnitId}
                onChange={(e) => setCalcSelectedUnitId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] rounded-xl p-2.5 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    ۱ {u.name} = {toPersianDigits(u.conversionFactor)} {u.subUnit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                قیمت خرید هر {calcUnit?.name || 'واحد کلان'} (تومان):
              </label>
              <input
                type="number"
                value={calcWholesalePrice}
                onChange={(e) => setCalcWholesalePrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="مثال: 120000"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] rounded-xl p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                تعداد {calcUnit?.name || 'کارتن/بسته'}:
              </label>
              <input
                type="number"
                step="any"
                value={calcBulkQuantity}
                onChange={(e) => setCalcBulkQuantity(e.target.value ? Number(e.target.value) : '')}
                placeholder="مثال: 2.5"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] rounded-xl p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">درصد سود خرده‌فروشی پیشنهادی (%):</label>
              <input
                type="number"
                value={calcProfitMargin}
                onChange={(e) => setCalcProfitMargin(Number(e.target.value) || 0)}
                placeholder="مثال: 20"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] rounded-xl p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Results Display Strip */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">بهای تمام‌شده هر {calcUnit?.subUnit || 'عدد'}:</span>
              <div className="text-base font-black text-emerald-900 dark:text-emerald-200 font-mono">
                {formatToman(singleRetailCost)}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                قیمت فروش پیشنهادی ({toPersianDigits(calcProfitMargin)}٪ سود):
              </span>
              <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {formatToman(suggestedRetailSale)}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">معادل تعداد خرد:</span>
              <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                {toPersianDigits(totalSubUnitsCount)} {calcUnit?.subUnit || 'عدد'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CATEGORIES & SUBCATEGORIES SECTION */}
      {(activeView === 'categories' || activeView === 'all') && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl p-5 border border-slate-200 dark:border-[#222225] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>دسته‌بندی‌ها و زیردسته‌های کالا</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                دسته‌بندی درختی کالاها جهت استفاده در فروشگاه آنلاین، منوی لمسی صندوق (POS) و انبارداری
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {toPersianDigits(filteredCategories.length)} دسته‌بندی
              </span>
              <button
                onClick={openCreateCategoryModal}
                className="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-900/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن دسته</span>
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => {
              const pCount = cat.productCount || 0;
              const currentInlineValue = inlineSubCat[cat.id] || '';

              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-3 shadow-xs"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-[#222225]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-[#33333A] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Tag className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Product Count Pill */}
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full font-mono font-bold">
                        {toPersianDigits(pCount)} کالا
                      </span>

                      {/* Edit Category Button */}
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        title="ویرایش دسته‌بندی"
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-[#202025] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Category Button */}
                      <button
                        onClick={() => handleInitiateDeleteCategory(cat)}
                        title="حذف دسته‌بندی"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-[#202025] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Container */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>زیردسته‌ها ({toPersianDigits(cat.subcategories?.length || 0)}):</span>
                      <button
                        onClick={() => openAddSubcategoryModal(cat.id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer text-[10px]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>فرم پیشرفته</span>
                      </button>
                    </div>

                    {/* Subcategory Badges */}
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {cat.subcategories && cat.subcategories.length > 0 ? (
                        cat.subcategories.map((sub) => (
                          <span
                            key={sub.id}
                            className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#2D2D33] px-2 py-1 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 group"
                          >
                            <span>{sub.name}</span>
                            {sub.productCount !== undefined && sub.productCount > 0 && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                ({toPersianDigits(sub.productCount)})
                              </span>
                            )}
                            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditSubcategoryModal(cat.id, sub)}
                                title="ویرایش زیردسته"
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubcategory(sub)}
                                title="حذف زیردسته"
                                className="hover:text-rose-500 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">بدون زیردسته</span>
                      )}
                    </div>

                    {/* Inline Quick-Add Subcategory Input */}
                    <div className="flex items-center gap-1 pt-1">
                      <input
                        type="text"
                        value={currentInlineValue}
                        onChange={(e) =>
                          setInlineSubCat((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInlineAddSubcategory(cat.id);
                          }
                        }}
                        placeholder="افزودن سریع زیردسته (اینتر بزنید)..."
                        className="flex-1 bg-white dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2D2D33] focus:border-indigo-600 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleInlineAddSubcategory(cat.id)}
                        disabled={!currentInlineValue.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title="ثبت زیردسته"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Tag className="w-8 h-8 mx-auto opacity-30" />
              <div className="text-xs font-bold">دسته‌بندی با مشخصات وارد شده یافت نشد.</div>
            </div>
          )}
        </div>
      )}

      {/* 6. UNITS & CONVERSION FACTORS SECTION */}
      {(activeView === 'units' || activeView === 'all') && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl p-5 border border-slate-200 dark:border-[#222225] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>واحدهای شمارش و ضرایب تبدیل (کارتن، بسته، جین، بند، عدد)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                محاسبه خودکار تعداد خرد، بهای تمام‌شده و تبدیل هوشمند در فاکتورهای عمده و تک
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {toPersianDigits(filteredUnits.length)} واحد تعریف‌شده
              </span>
              <button
                onClick={openCreateUnitModal}
                className="bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-600 hover:text-white text-amber-600 dark:text-amber-400 font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-amber-200 dark:border-amber-900/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تعریف واحد</span>
              </button>
            </div>
          </div>

          {/* Units Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUnits.map((u) => {
              const pCount = u.productCount || 0;
              return (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-[#2D2D33] bg-slate-50 dark:bg-[#161619] hover:border-amber-300 dark:hover:border-amber-800 transition-all space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        <Scale className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {pCount > 0 && (
                        <span className="text-[10px] bg-slate-200 dark:bg-[#25252A] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono">
                          {toPersianDigits(pCount)} کالا
                        </span>
                      )}
                      <button
                        onClick={() => openEditUnitModal(u)}
                        title="ویرایش واحد"
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-[#202025] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(u)}
                        title="حذف واحد"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-[#202025] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Formula Banner */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111113] border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">فرمول تبدیل:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-mono font-black text-sm">
                      ۱ {u.name} = {toPersianDigits(u.conversionFactor)} {u.subUnit}
                    </span>
                  </div>

                  {u.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {u.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {filteredUnits.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Scale className="w-8 h-8 mx-auto opacity-30" />
              <div className="text-xs font-bold">واحد شمارش با این مشخصات یافت نشد.</div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create / Edit Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111113] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#222225]">
              <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>{editingCategoryId ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}</span>
              </h4>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">نام دسته اصلی:</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="مثال: نوشت‌افزار، اداری، کتاب و کمک‌آموزشی، هنری"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  تصویر یا کاشی دسته‌بندی (اختیاری):
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={catImage}
                    onChange={(e) => setCatImage(e.target.value)}
                    placeholder="https://... یا آپلود مستقیم عکس"
                    className="flex-1 bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none text-slate-900 dark:text-white dir-ltr text-left text-xs font-mono"
                  />
                  <label className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1F1F24] dark:hover:bg-[#2A2A32] text-xs font-bold text-slate-800 dark:text-white rounded-xl cursor-pointer border border-slate-300 dark:border-[#33333A] shrink-0">
                    آپلود عکس
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setCatImage(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {catImage && (
                  <div className="mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-[#33333A]">
                    <img src={catImage} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCatImage('')}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-md"
                    >
                      حذف عکس
                    </button>
                  </div>
                )}
              </div>

              {!editingCategoryId && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    زیردسته‌ها (با کاما جدا کنید):
                  </label>
                  <input
                    type="text"
                    value={subCatInput}
                    onChange={(e) => setSubCatInput(e.target.value)}
                    placeholder="خودکار, روان‌نویس, ماژیک, مداد"
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCategoryId ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#1C1C20] dark:hover:bg-[#25252B] text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Subcategory Modal */}
      {subCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111113] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#222225]">
              <h4 className="font-black text-slate-900 dark:text-white text-sm">
                {subCatModal.subCategoryId ? 'ویرایش زیردسته' : 'افزودن زیردسته جدید'}
              </h4>
              <button
                onClick={() => setSubCatModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">نام زیردسته:</label>
                <input
                  type="text"
                  required
                  value={subCatModal.name}
                  onChange={(e) => setSubCatModal({ ...subCatModal, name: e.target.value })}
                  placeholder="مثال: خودکار و روان‌نویس، ماژیک فسفری، زونکن"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-indigo-600 rounded-xl p-2.5 outline-none font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  {subCatModal.subCategoryId ? 'ذخیره تغییرات' : 'افزودن زیردسته'}
                </button>
                <button
                  type="button"
                  onClick={() => setSubCatModal(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#1C1C20] dark:hover:bg-[#25252B] text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create / Edit Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111113] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#2D2D33] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#222225]">
              <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-500" />
                <span>{editingUnitId ? 'ویرایش واحد شمارش' : 'تعریف واحد شمارش و ضریب تبدیل'}</span>
              </h4>
              <button
                onClick={() => setShowUnitModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">واحد کلان (عمده):</label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="مثال: کارتن، جین، بسته ۵۰ تایی، بند"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-amber-500 rounded-xl p-2.5 outline-none font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">واحد خرد (تک):</label>
                <input
                  type="text"
                  required
                  value={subUnitName}
                  onChange={(e) => setSubUnitName(e.target.value)}
                  placeholder="مثال: عدد، جلد، برگ، بسته"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-amber-500 rounded-xl p-2.5 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ضریب تبدیل (تعداد خرد در هر واحد کلان):
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(Number(e.target.value))}
                  placeholder="مثال: 12 یا 24 یا 50 یا 500"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-amber-500 rounded-xl p-2.5 font-mono outline-none text-slate-900 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  فرمول: ۱ {unitName || 'واحد کلان'} = {toPersianDigits(conversionFactor || 1)} {subUnitName || 'واحد خرد'}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">توضیحات اختیاری:</label>
                <input
                  type="text"
                  value={unitDesc}
                  onChange={(e) => setUnitDesc(e.target.value)}
                  placeholder="مثال: هر کارتن شامل ۴۰ بسته خودکار می‌باشد"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] focus:border-amber-500 rounded-xl p-2.5 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUnitId ? 'ذخیره تغییرات' : 'ثبت واحد شمارش'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#1C1C20] dark:hover:bg-[#25252B] text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Smart Delete Category with Replacement Warning */}
      {deleteCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111113] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#222225]">
              <h4 className="font-black text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>حذف دسته‌بندی و تعیین تکلیف کالاها</span>
              </h4>
              <button
                onClick={() => setDeleteCatModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                دسته‌بندی <strong className="text-rose-600">«{deleteCatModal.category.name}»</strong> دارای{' '}
                <strong className="text-rose-600 font-mono font-bold">
                  {toPersianDigits(deleteCatModal.category.productCount || 0)}
                </strong>{' '}
                کالای فعال است. جهت جلوگیری از بلاتکلیف ماندن کالاها، لطفاً دسته‌بندی جایگزین برای آن‌ها انتخاب فرمایید:
              </p>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  انتقال کالاها به دسته‌بندی جایگزین:
                </label>
                <select
                  value={deleteCatModal.replacementCategoryId}
                  onChange={(e) =>
                    setDeleteCatModal({
                      ...deleteCatModal,
                      replacementCategoryId: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-300 dark:border-[#2D2D33] rounded-xl p-2.5 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600"
                >
                  <option value="">-- بدون جایگزین (کالاها بدون دسته شوند) --</option>
                  {categories
                    .filter((c) => c.id !== deleteCatModal.category.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    executeDeleteCategory(
                      deleteCatModal.category.id,
                      deleteCatModal.replacementCategoryId || undefined
                    )
                  }
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  تایید و حذف دسته‌بندی
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCatModal(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#1C1C20] dark:hover:bg-[#25252B] text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
