import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Settings2,
  Smartphone,
  Tablet,
  Monitor,
  Save,
  Sparkles,
  Layers,
  CheckCircle2,
  Palette,
  Sliders,
  ExternalLink,
  ChevronRight,
  Copy,
  RotateCcw,
  Image as ImageIcon,
  Type,
  Link,
  ShieldCheck,
  Truck,
  Percent,
  Star,
  Printer,
  BookOpen,
  Gift,
  HelpCircle,
  X,
  Check,
  MousePointer,
  Grid,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PageBuilderBlock, PageTemplate, BlockItem } from '../../types';
import { useToast } from '../common/Toast';

const AVAILABLE_ICONS = [
  { name: 'Sparkles', label: 'ستاره درخشان / تولید ویژه', icon: Sparkles },
  { name: 'TrendingUp', label: 'نمودار رشد / تضمین قیمت', icon: Percent },
  { name: 'Layers', label: 'لایه‌ها / تنوع محصولات', icon: Layers },
  { name: 'CheckCircle2', label: 'تیک تایید / اصالت و تحویل', icon: CheckCircle2 },
  { name: 'ShieldCheck', label: 'سپر گارانتی / امنیت خرید', icon: ShieldCheck },
  { name: 'Truck', label: 'کامیون / ارسال سریع سراسری', icon: Truck },
  { name: 'Star', label: 'ستاره طلایی / محبوب‌ترین', icon: Star },
  { name: 'Printer', label: 'چاپگر / خدمات چاپ و تکثیر', icon: Printer },
  { name: 'BookOpen', label: 'دفتر / صحافی و کتاب', icon: BookOpen },
  { name: 'Gift', label: 'هدیه / جوایز و جشنواره', icon: Gift },
];

export const PageBuilderView: React.FC = () => {
  const { showToast } = useToast();
  const [blocks, setBlocks] = useState<PageBuilderBlock[]>([]);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'settings' | 'items'>('blocks');

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const fetchPageBlocks = async () => {
    setLoading(true);
    try {
      const [blocksRes, tplsRes] = await Promise.all([
        api.getPageBlocks().catch(() => ({ blocks: [] })),
        api.getPageTemplates().catch(() => ({ templates: [] })),
      ]);
      setBlocks(blocksRes.blocks || []);
      setTemplates(tplsRes.templates || []);
      if (blocksRes.blocks?.length > 0 && !selectedBlockId) {
        setSelectedBlockId(blocksRes.blocks[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در دریافت اطلاعات چیدمان و قالب‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageBlocks();
  }, []);

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);

    const updated = newBlocks.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    setBlocks(updated);
    showToast(`موقعیت «${moved.title}» تغییر یافت.`, 'info');
  };

  const handleToggleBlock = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, isEnabled: !b.isEnabled } : b))
    );
  };

  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      showToast('حداقل یک بلوک باید در صفحه باقی بماند.', 'warning');
      return;
    }
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    setBlocks(newBlocks);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(newBlocks[0]?.id || null);
    }
    showToast('بلوک با موفقیت حذف گردید.', 'info');
  };

  const handleDuplicateBlock = (block: PageBuilderBlock) => {
    const newBlock: PageBuilderBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: `blk_${Date.now()}`,
      title: `${block.title} (کپی)`,
      sortOrder: block.sortOrder + 1,
    };
    const newBlocks = [...blocks, newBlock].map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    setBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
    showToast(`بلوک «${block.title}» تکثیر شد.`, 'success');
  };

  const handleAddBlock = (type: string, title: string) => {
    const newBlock: PageBuilderBlock = {
      id: `blk_${Date.now()}`,
      type: type as any,
      title,
      isEnabled: true,
      sortOrder: blocks.length + 1,
      settings: {
        layout: 'grid',
        columns: 4,
        paddingY: 'medium',
        headingText: title,
        subheadingText: 'توضیحات و خلاصه معرفی این بخش',
        buttonText: 'مشاهده همه و خرید',
        buttonPosition: 'center',
        buttonLink: '#products',
        items:
          type === 'features_badges'
            ? [
                { id: `item_1`, title: 'عنوان ویژگی اول', subtitle: 'توضیحات کوتاه', icon: 'Sparkles', highlight: true },
                { id: `item_2`, title: 'عنوان ویژگی دوم', subtitle: 'توضیحات کوتاه', icon: 'TrendingUp' },
                { id: `item_3`, title: 'عنوان ویژگی سوم', subtitle: 'توضیحات کوتاه', icon: 'Layers' },
                { id: `item_4`, title: 'عنوان ویژگی چهارم', subtitle: 'توضیحات کوتاه', icon: 'CheckCircle2' },
              ]
            : type === 'banner_slider'
            ? [
                {
                  id: `sld_1`,
                  title: 'بنر اسلایدر اول',
                  subtitle: 'تخفیف ویژه و ارسال سریع',
                  imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1600',
                  badge: 'تخفیف ویژه',
                  linkUrl: '#products',
                },
              ]
            : [],
      },
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowAddBlockModal(false);
    showToast(`بلوک جدید «${title}» به چیدمان اضافه شد.`, 'success');
  };

  const handleSaveBlocks = async () => {
    setIsSaving(true);
    try {
      await api.savePageBlocks(blocks);
      window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
      localStorage.setItem('khatinoo_last_sync', Date.now().toString());
      showToast('چیدمان صفحه اصلی با موفقیت در ویترین فروشگاه منتشر گردید و بر روی سایت اعمال شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در انتشار چیدمان', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const res = await api.applyPageTemplate(templateId);
      setBlocks(res.blocks || []);
      if (res.blocks?.length > 0) {
        setSelectedBlockId(res.blocks[0].id);
      }
      window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
      localStorage.setItem('khatinoo_last_sync', Date.now().toString());
      showToast('قالب با موفقیت اعمال و در سایت منتشر گردید.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در اعمال قالب', 'error');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      showToast('لطفاً نام قالب را وارد نمایید.', 'warning');
      return;
    }
    try {
      await api.savePageTemplate(templateName.trim(), templateDesc.trim(), blocks);
      showToast(`قالب «${templateName}» با موفقیت ذخیره شد.`, 'success');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDesc('');
      fetchPageBlocks();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره قالب', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId: string, name: string) => {
    if (!confirm(`آیا از حذف قالب سفارشی «${name}» اطمینان دارید؟`)) return;
    try {
      await api.deletePageTemplate(templateId);
      showToast('قالب سفارشی حذف شد.', 'info');
      fetchPageBlocks();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف قالب', 'error');
    }
  };

  const updateSelectedBlock = (updates: Partial<PageBuilderBlock>) => {
    if (!selectedBlockId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedBlockId ? { ...b, ...updates } : b))
    );
  };

  const updateSelectedBlockSettings = (key: string, value: any) => {
    if (!selectedBlockId) return;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== selectedBlockId) return b;
        return {
          ...b,
          settings: {
            ...b.settings,
            [key]: value,
          },
        };
      })
    );
  };

  // Sub-items management for selected block
  const handleAddItemToBlock = () => {
    if (!selectedBlock) return;
    const currentItems = selectedBlock.settings?.items || [];
    const newItem: BlockItem = {
      id: `it_${Date.now()}`,
      title: `آیتم جدید ${currentItems.length + 1}`,
      subtitle: 'توضیحات یا ویژگی تکمیلی',
      icon: 'Sparkles',
      badge: '',
      linkUrl: '#',
      highlight: false,
    };
    updateSelectedBlockSettings('items', [...currentItems, newItem]);
    showToast('آیتم جدید به بلوک اضافه شد.', 'success');
  };

  const handleUpdateItem = (itemId: string, updates: Partial<BlockItem>) => {
    if (!selectedBlock) return;
    const currentItems = selectedBlock.settings?.items || [];
    const newItems = currentItems.map((it) => (it.id === itemId ? { ...it, ...updates } : it));
    updateSelectedBlockSettings('items', newItems);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedBlock) return;
    const currentItems = selectedBlock.settings?.items || [];
    const newItems = currentItems.filter((it) => it.id !== itemId);
    updateSelectedBlockSettings('items', newItems);
    showToast('آیتم از بلوک حذف شد.', 'info');
  };

  return (
    <div className="space-y-6 text-right w-full" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/15 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <LayoutTemplate className="w-4 h-4" />
            <span>مدیریت چیدمان بصری و صفحه ساز حرفه‌ای (Visual Page & Block Builder)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            طراحی و سفارشی‌سازی چیدمان، بلوک‌ها و آیتم‌های صفحه اصلی
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] leading-relaxed">
            امکان مرتب‌سازی بلوک‌ها، ویرایش محتوای متنی، تنظیمات دکمه‌ها و لینک‌ها، ویرایش جزئیات آیتم‌ها و اسلایدها و ذخیره قالب‌های چیدمان با اعمال آنی در فروشگاه.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSaveTemplateModal(true)}
            className="bg-white dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] text-slate-700 dark:text-[#E0E0E0] hover:border-[#C9A227] text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Layers className="w-4 h-4 text-[#C9A227]" />
            <span>ذخیره به عنوان قالب جدید</span>
          </button>

          <button
            onClick={handleSaveBlocks}
            disabled={isSaving}
            className="bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#C9A227]/25 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-black" />
            <span>{isSaving ? 'در حال انتشار در سایت...' : 'انتشار و اعمال نهایی در سایت'}</span>
          </button>
        </div>
      </div>

      {/* Templates Switcher Toolbar */}
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
          <Sparkles className="w-4 h-4 text-[#C9A227]" />
          <span>قالب‌های آماده چیدمان:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-2.5 py-1 text-xs"
            >
              <button
                onClick={() => handleApplyTemplate(tpl.id)}
                className="font-bold text-slate-700 dark:text-[#D1D5DB] hover:text-amber-600 dark:hover:text-[#C9A227] cursor-pointer"
                title={`اعمال قالب: ${tpl.description || tpl.name}`}
              >
                {tpl.name}
              </button>
              {!tpl.isDefault && (
                <button
                  onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                  className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                  title="حذف این قالب سفارشی"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Builder Grid: Left Inspector & Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Builder Controller & Granular Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tabs: Blocks List / Block Settings / Items Editor */}
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222225] pb-3">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#161619] p-1 rounded-2xl">
                <button
                  onClick={() => setActiveTab('blocks')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'blocks'
                      ? 'bg-white dark:bg-[#222225] text-amber-600 dark:text-[#C9A227] shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  لیست بلوک‌ها ({blocks.length})
                </button>

                {selectedBlock && (
                  <>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'settings'
                          ? 'bg-white dark:bg-[#222225] text-amber-600 dark:text-[#C9A227] shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      تنظیمات بلوک
                    </button>

                    <button
                      onClick={() => setActiveTab('items')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'items'
                          ? 'bg-white dark:bg-[#222225] text-amber-600 dark:text-[#C9A227] shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      ویرایش آیتم‌ها ({selectedBlock.settings?.items?.length || 0})
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowAddBlockModal(true)}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-[#C9A227] text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن بلوک</span>
              </button>
            </div>

            {/* TAB 1: BLOCKS LIST */}
            {activeTab === 'blocks' && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  جهت جابجایی ترتیب نمایش هر بلوک در صفحه، از دکمه‌های بالا/پایین استفاده کنید.
                </p>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {blocks.map((block, idx) => {
                    const isSelected = selectedBlockId === block.id;
                    return (
                      <div
                        key={block.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-[#C9A227] ring-2 ring-[#C9A227]/20 bg-amber-50/40 dark:bg-[#1C1A14]'
                            : block.isEnabled
                            ? 'border-slate-200 dark:border-[#222225] bg-slate-50/60 dark:bg-[#161619]/60 hover:border-slate-300'
                            : 'border-dashed border-slate-300 dark:border-[#333338] opacity-50 bg-slate-100 dark:bg-[#111113]'
                        }`}
                      >
                        <div
                          onClick={() => {
                            setSelectedBlockId(block.id);
                            setActiveTab('settings');
                          }}
                          className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
                        >
                          <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-[#222225] text-slate-700 dark:text-[#E0E0E0] text-[11px] font-mono flex items-center justify-center font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-[#F3F4F6] truncate">
                              {block.title}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <span>{block.type}</span>
                              {block.settings?.items && (
                                <span>• {block.settings.items.length} آیتم</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            onClick={() => handleMoveBlock(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                            title="انتقال به بالا"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Move Down */}
                          <button
                            onClick={() => handleMoveBlock(idx, 'down')}
                            disabled={idx === blocks.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                            title="انتقال به پایین"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          {/* Visibility Toggle */}
                          <button
                            onClick={() => handleToggleBlock(block.id)}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-[#C9A227] cursor-pointer"
                            title={block.isEnabled ? 'مخفی کردن' : 'نمایش دادن'}
                          >
                            {block.isEnabled ? (
                              <Eye className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateBlock(block)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="تکثیر بلوک"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="حذف بلوک"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: BLOCK SETTINGS INSPECTOR */}
            {activeTab === 'settings' && selectedBlock && (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-50/50 dark:bg-[#1A1813] border border-[#C9A227]/30 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-700 dark:text-[#C9A227] font-bold block">
                      بلوک انتخاب شده:
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {selectedBlock.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-white dark:bg-[#111113] px-2 py-1 rounded-lg border border-slate-200 dark:border-[#222225] text-slate-500">
                    {selectedBlock.type}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1 font-bold">نام نمایشی بلوک:</label>
                    <input
                      type="text"
                      value={selectedBlock.title}
                      onChange={(e) => updateSelectedBlock({ title: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1 font-bold">تیتر اصلی بخش (Heading):</label>
                    <input
                      type="text"
                      value={selectedBlock.settings?.headingText || ''}
                      onChange={(e) => updateSelectedBlockSettings('headingText', e.target.value)}
                      placeholder="عنوان اصلی که در بالای بخش نمایش داده می‌شود"
                      className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1 font-bold">زیرعنوان و توضیحات (Subheading):</label>
                    <input
                      type="text"
                      value={selectedBlock.settings?.subheadingText || ''}
                      onChange={(e) => updateSelectedBlockSettings('subheadingText', e.target.value)}
                      placeholder="توضیح کوتاه زیر عنوان بخش"
                      className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1 font-bold">برچسب ویژه (Badge):</label>
                      <input
                        type="text"
                        value={selectedBlock.settings?.badgeText || ''}
                        onChange={(e) => updateSelectedBlockSettings('badgeText', e.target.value)}
                        placeholder="مثلاً: جدید یا تخفیف"
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1 font-bold">فاصله عمودی (Padding):</label>
                      <select
                        value={selectedBlock.settings?.paddingY || 'medium'}
                        onChange={(e) => updateSelectedBlockSettings('paddingY', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      >
                        <option value="none">بدون فاصله (None)</option>
                        <option value="small">فشرده و کم (Small)</option>
                        <option value="medium">استاندارد (Medium)</option>
                        <option value="large">بزرگ و جادار (Large)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1 font-bold">نوع چیدمان (Layout):</label>
                      <select
                        value={selectedBlock.settings?.layout || 'grid'}
                        onChange={(e) => updateSelectedBlockSettings('layout', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      >
                        <option value="grid">شبکه‌ای (Grid)</option>
                        <option value="carousel">اسلایدر افقی (Carousel)</option>
                        <option value="compact">فشرده (Compact)</option>
                        <option value="fullwidth">تمام‌عرض (Full-Width)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1 font-bold">تعداد ستون‌ها در دسکتاپ:</label>
                      <select
                        value={selectedBlock.settings?.columns || 4}
                        onChange={(e) => updateSelectedBlockSettings('columns', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      >
                        <option value={2}>۲ ستون</option>
                        <option value={3}>۳ ستون</option>
                        <option value={4}>۴ ستون</option>
                        <option value={5}>۵ ستون</option>
                        <option value={6}>۶ ستون</option>
                      </select>
                    </div>
                  </div>

                  {/* Button CTA Settings */}
                  <div className="pt-2 border-t border-slate-100 dark:border-[#222225] space-y-2">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      تنظیمات دکمه فراخوان (CTA Button):
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">متن دکمه:</label>
                        <input
                          type="text"
                          value={selectedBlock.settings?.buttonText || ''}
                          onChange={(e) => updateSelectedBlockSettings('buttonText', e.target.value)}
                          placeholder="مثلاً: مشاهده همه کالاها"
                          className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">موقعیت دکمه:</label>
                        <select
                          value={selectedBlock.settings?.buttonPosition || 'center'}
                          onChange={(e) => updateSelectedBlockSettings('buttonPosition', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                        >
                          <option value="right">راست‌چین</option>
                          <option value="center">وسط‌چین</option>
                          <option value="left">چپ‌چین</option>
                          <option value="hidden">مخفی (بدون دکمه)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">لینک یا مسیر دکمه:</label>
                      <input
                        type="text"
                        value={selectedBlock.settings?.buttonLink || ''}
                        onChange={(e) => updateSelectedBlockSettings('buttonLink', e.target.value)}
                        placeholder="مثلاً: #products یا /services"
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      />
                    </div>
                  </div>

                  {/* Banner / Text specifics */}
                  {selectedBlock.type === 'custom_banner' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-[#222225] space-y-2">
                      <label className="block text-slate-500 text-[11px] mb-1 font-bold">آدرس تصویر پس‌زمینه بنر:</label>
                      <input
                        type="text"
                        value={selectedBlock.settings?.bannerImageUrl || ''}
                        onChange={(e) => updateSelectedBlockSettings('bannerImageUrl', e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      />
                    </div>
                  )}

                  {selectedBlock.type === 'custom_text_html' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-[#222225] space-y-2">
                      <label className="block text-slate-500 text-[11px] mb-1 font-bold">محتوای متنی یا کدهای HTML:</label>
                      <textarea
                        rows={4}
                        value={selectedBlock.settings?.customHtml || ''}
                        onChange={(e) => updateSelectedBlockSettings('customHtml', e.target.value)}
                        placeholder="متن دلخواه، توضیحات معرفی فروشگاه یا اطلاعیه..."
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GRANULAR ITEMS MANAGER */}
            {activeTab === 'items' && selectedBlock && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      آیتم‌ها و اسلایدهای بلوک «{selectedBlock.title}»
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      مدیریت تک‌تک کارت‌ها، نمادها، اسلایدها و لینک‌های داخلی این بلوک.
                    </p>
                  </div>
                  <button
                    onClick={handleAddItemToBlock}
                    className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن آیتم جدید</span>
                  </button>
                </div>

                {(!selectedBlock.settings?.items || selectedBlock.settings.items.length === 0) ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 dark:border-[#222225] rounded-2xl p-6 space-y-3">
                    <Sliders className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-slate-500 text-xs">
                      هنوز هیچ آیتم اختصاصی برای این بلوک اضافه نشده است (از موارد پیش‌فرض سامانه استفاده می‌شود).
                    </p>
                    <button
                      onClick={handleAddItemToBlock}
                      className="bg-amber-500/10 text-amber-700 dark:text-[#C9A227] font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-500/20 transition-all cursor-pointer"
                    >
                      افزودن اولین آیتم سفارشی
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {selectedBlock.settings.items.map((item, itIdx) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-2xl p-3.5 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-[#222225]">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#C9A227]/20 text-[#C9A227] text-[10px] font-bold flex items-center justify-center">
                              {itIdx + 1}
                            </span>
                            <span className="font-black text-slate-800 dark:text-slate-200">
                              {item.title || `آیتم ${itIdx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateItem(item.id, { highlight: !item.highlight })}
                              className={`p-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                item.highlight
                                  ? 'bg-[#C9A227] text-slate-950'
                                  : 'bg-slate-200 dark:bg-[#222225] text-slate-500'
                              }`}
                              title="برجسته‌سازی ویژه آیتم"
                            >
                              ویژه / هایلایت
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="حذف این آیتم"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-500 text-[10px] mb-0.5">عنوان آیتم:</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                              className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-500 text-[10px] mb-0.5">زیرعنوان / توضیح:</label>
                            <input
                              type="text"
                              value={item.subtitle || ''}
                              onChange={(e) => handleUpdateItem(item.id, { subtitle: e.target.value })}
                              className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-500 text-[10px] mb-0.5">آیکون نمادین:</label>
                            <select
                              value={item.icon || 'Sparkles'}
                              onChange={(e) => handleUpdateItem(item.id, { icon: e.target.value })}
                              className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                            >
                              {AVAILABLE_ICONS.map((ic) => (
                                <option key={ic.name} value={ic.name}>
                                  {ic.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-500 text-[10px] mb-0.5">برچسب کوچک (Badge):</label>
                            <input
                              type="text"
                              value={item.badge || ''}
                              onChange={(e) => handleUpdateItem(item.id, { badge: e.target.value })}
                              placeholder="مثلاً: تخفیف یا اعلا"
                              className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-500 text-[10px] mb-0.5">لینک مقصد (URL / Target):</label>
                            <input
                              type="text"
                              value={item.linkUrl || ''}
                              onChange={(e) => handleUpdateItem(item.id, { linkUrl: e.target.value })}
                              placeholder="مثلاً: #products یا /services"
                              className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-500 text-[10px] mb-0.5">آدرس تصویر (برای اسلاید/بنر):</label>
                            <input
                              type="text"
                              value={item.imageUrl || ''}
                              onChange={(e) => handleUpdateItem(item.id, { imageUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Interactive Full Viewport Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Device & Zoom Switcher */}
          <div className="flex items-center justify-between bg-white dark:bg-[#111113] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-[#D1D5DB]">پیش‌نمایش زنده چیدمان ویترین:</span>
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#161619] p-1 rounded-xl">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'desktop'
                    ? 'bg-white dark:bg-[#222225] text-amber-600 dark:text-[#C9A227] shadow-sm'
                    : 'text-slate-500'
                }`}
                title="نمای دسکتاپ (تمام عرض)"
              >
                <Monitor className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">دسکتاپ (100%)</span>
              </button>

              <button
                onClick={() => setPreviewMode('tablet')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'tablet'
                    ? 'bg-white dark:bg-[#222225] text-amber-600 dark:text-[#C9A227] shadow-sm'
                    : 'text-slate-500'
                }`}
                title="نمای تبلت (768px)"
              >
                <Tablet className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">تبلت (768px)</span>
              </button>

              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'mobile'
                    ? 'bg-white dark:bg-[#222225] text-amber-600 dark:text-[#C9A227] shadow-sm'
                    : 'text-slate-500'
                }`}
                title="نمای موبایل (375px)"
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">موبایل (375px)</span>
              </button>
            </div>
          </div>

          {/* Interactive Preview Canvas Container */}
          <div className="bg-slate-100 dark:bg-[#0A0A0B] border border-slate-200 dark:border-[#222225] rounded-3xl p-4 flex justify-center overflow-x-auto min-h-[600px] shadow-inner">
            <div
              className={`bg-white dark:bg-[#111113] border border-slate-300 dark:border-[#2A2A30] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
                previewMode === 'mobile'
                  ? 'w-[375px]'
                  : previewMode === 'tablet'
                  ? 'w-[768px]'
                  : 'w-full'
              }`}
            >
              {/* Simulated Browser Bar */}
              <div className="bg-slate-200 dark:bg-[#161619] px-4 py-2.5 flex items-center justify-between border-b border-slate-300 dark:border-[#222225]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  https://khatynoo.ir (ویترین فروشگاه خطی‌نو)
                </span>
                <span className="text-[10px] text-[#C9A227] font-bold">
                  {previewMode === 'mobile' ? 'Mobile' : previewMode === 'tablet' ? 'Tablet' : 'Desktop Full'}
                </span>
              </div>

              {/* Render Blocks in Layout Order */}
              <div className="p-4 sm:p-6 space-y-6 text-right">
                {blocks
                  .filter((b) => b.isEnabled)
                  .map((block) => {
                    const isSelected = selectedBlockId === block.id;
                    const items = block.settings?.items || [];
                    return (
                      <div
                        key={block.id}
                        onClick={() => {
                          setSelectedBlockId(block.id);
                          setActiveTab('settings');
                        }}
                        className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'border-[#C9A227] ring-2 ring-[#C9A227]/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-md'
                            : 'border-slate-200 dark:border-[#222225] hover:border-amber-400/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-[#C9A227] font-bold px-2 py-0.5 rounded-md">
                              {block.title}
                            </span>
                            {block.settings?.badgeText && (
                              <span className="text-[9px] bg-[#C9A227] text-slate-950 font-black px-2 py-0.5 rounded-md">
                                {block.settings.badgeText}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {block.settings?.layout || 'grid'} • {block.settings?.columns || 4} Cols
                          </span>
                        </div>

                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {block.settings?.headingText || block.title}
                        </h4>

                        {block.settings?.subheadingText && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {block.settings.subheadingText}
                          </p>
                        )}

                        {/* Items Visual Preview */}
                        {items.length > 0 ? (
                          <div
                            className={`mt-3.5 grid gap-2.5 ${
                              previewMode === 'mobile'
                                ? 'grid-cols-1 sm:grid-cols-2'
                                : block.settings?.columns === 2
                                ? 'grid-cols-2'
                                : block.settings?.columns === 3
                                ? 'grid-cols-3'
                                : 'grid-cols-2 sm:grid-cols-4'
                            }`}
                          >
                            {items.map((it) => (
                              <div
                                key={it.id}
                                className={`p-3 rounded-xl border ${
                                  it.highlight
                                    ? 'border-[#C9A227]/60 bg-amber-500/5'
                                    : 'border-slate-200 dark:border-[#222225] bg-slate-50 dark:bg-[#161619]'
                                } flex items-center gap-2.5`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-[#C9A227] flex items-center justify-center font-bold text-xs shrink-0">
                                  <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {it.title}
                                  </div>
                                  {it.subtitle && (
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {it.subtitle}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className={`mt-3.5 grid gap-2.5 ${
                              previewMode === 'mobile'
                                ? 'grid-cols-2'
                                : block.settings?.columns === 5
                                ? 'grid-cols-5'
                                : block.settings?.columns === 4
                                ? 'grid-cols-4'
                                : 'grid-cols-3'
                            }`}
                          >
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="h-16 rounded-xl bg-slate-100 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] flex flex-col items-center justify-center text-[10px] text-slate-400 gap-1"
                              >
                                <Grid className="w-4 h-4 text-slate-300" />
                                <span>کارت آیتم {i}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Button CTA preview */}
                        {block.settings?.buttonPosition !== 'hidden' && (
                          <div
                            className={`mt-3.5 flex ${
                              block.settings?.buttonPosition === 'right'
                                ? 'justify-start'
                                : block.settings?.buttonPosition === 'left'
                                ? 'justify-end'
                                : 'justify-center'
                            }`}
                          >
                            <span className="text-[11px] font-black bg-[#C9A227] text-slate-950 px-4 py-1.5 rounded-xl shadow-sm">
                              {block.settings?.buttonText || 'مشاهده و خرید'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD NEW BLOCK */}
      {showAddBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222225]">
              <h3 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6]">
                انتخاب نوع بلوک جدید برای افزودن به صفحه
              </h3>
              <button
                onClick={() => setShowAddBlockModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => handleAddBlock('custom_banner', 'بنر تبلیغاتی اختصاصی')}
                className="p-3 bg-slate-50 dark:bg-[#161619] hover:bg-amber-50/50 dark:hover:bg-[#1A1A1E] border border-slate-200 dark:border-[#2D2D33] hover:border-[#C9A227] rounded-2xl text-right transition-all flex items-center gap-3 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[#C9A227] flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">بنر تبلیغاتی</div>
                  <div className="text-[10px] text-slate-400">تصویر عریض و دکمه لینک</div>
                </div>
              </button>

              <button
                onClick={() => handleAddBlock('features_badges', 'نوار ویژگی‌ها و مزایای برتر')}
                className="p-3 bg-slate-50 dark:bg-[#161619] hover:bg-amber-50/50 dark:hover:bg-[#1A1A1E] border border-slate-200 dark:border-[#2D2D33] hover:border-[#C9A227] rounded-2xl text-right transition-all flex items-center gap-3 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">نوار مزایا و ویژگی‌ها</div>
                  <div className="text-[10px] text-slate-400">آیکون و متن‌های مزیت فروش</div>
                </div>
              </button>

              <button
                onClick={() => handleAddBlock('custom_text_html', 'بخش محتوای متنی و اطلاعیه')}
                className="p-3 bg-slate-50 dark:bg-[#161619] hover:bg-amber-50/50 dark:hover:bg-[#1A1A1E] border border-slate-200 dark:border-[#2D2D33] hover:border-[#C9A227] rounded-2xl text-right transition-all flex items-center gap-3 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">متن / HTML سفارشی</div>
                  <div className="text-[10px] text-slate-400">اطلاعیه، ساعت کاری یا درباره ما</div>
                </div>
              </button>

              <button
                onClick={() => handleAddBlock('newsletter', 'عضویت در باشگاه مشتریان و خبرنامه')}
                className="p-3 bg-slate-50 dark:bg-[#161619] hover:bg-amber-50/50 dark:hover:bg-[#1A1A1E] border border-slate-200 dark:border-[#2D2D33] hover:border-[#C9A227] rounded-2xl text-right transition-all flex items-center gap-3 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">باشگاه مشتریان</div>
                  <div className="text-[10px] text-slate-400">فرم دریافت شماره همراه</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAVE AS TEMPLATE */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <h3 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6]">
              ذخیره چیدمان فعلی به عنوان قالب جدید
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8E9299]">
              با ذخیره این چیدمان، می‌توانید در آینده در مناسبت‌ها و جشنواره‌های مختلف با یک کلیک به آن سوئیچ نمایید:
            </p>
            <div className="space-y-2">
              <label className="block text-slate-500 text-[11px]">نام قالب:</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="مثال: قالب جشنواره بهاره و تخفیف ویژه"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-slate-500 text-[11px]">توضیحات مختصر قالب (اختیاری):</label>
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="مثال: چیدمان با تاکید بر خدمات چاپ و تخفیف‌های ویژه"
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-[#161619] cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C9A227] text-slate-950 hover:bg-[#B38E1E] cursor-pointer shadow-sm"
              >
                ذخیره قالب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
