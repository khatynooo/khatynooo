import React, { useState, useEffect } from 'react';
import {
  Boxes,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info,
  Radio,
  FileCode,
  Shield,
  Layers,
  Search,
  RefreshCw,
  ExternalLink,
  Code2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { CmsModule, EventHook } from '../../types';
import { useToast } from '../common/Toast';

export const ModulesManagerView: React.FC = () => {
  const { showToast } = useToast();
  const [modules, setModules] = useState<CmsModule[]>([]);
  const [eventHooks, setEventHooks] = useState<EventHook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'hooks' | 'sdk'>('modules');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<CmsModule | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const [modsRes, hooksRes] = await Promise.all([
        api.getCmsModules().catch(() => ({ modules: [] })),
        api.getCmsHooks().catch(() => ({ hooks: [] })),
      ]);
      setModules(modsRes.modules || []);
      setEventHooks(hooksRes.hooks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggle = async (module: CmsModule) => {
    if (module.isCore) {
      showToast('ماژول‌های هسته اصلی (Core) قابل غیرفعال‌سازی نیستند.', 'warning');
      return;
    }
    setTogglingId(module.id);
    try {
      const nextState = !module.isEnabled;
      await api.toggleCmsModule(module.id, nextState);
      setModules((prev) =>
        prev.map((m) => (m.id === module.id ? { ...m, isEnabled: nextState } : m))
      );
      showToast(
        `ماژول «${module.name}» با موفقیت ${nextState ? 'فعال' : 'غیرفعال'} شد.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت ماژول', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredModules = modules.filter((m) => {
    const matchesCat = filterCategory === 'all' || m.category === filterCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'core':
        return { label: 'هسته سیستم (Core)', color: 'bg-amber-500/10 text-amber-600 dark:text-[#C9A227] border-amber-500/20' };
      case 'commerce':
        return { label: 'تجارت و فروشگاه', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'marketing':
        return { label: 'بازاریابی و تعامل', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      case 'communication':
        return { label: 'پیام‌رسانی و پیامک', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
      case 'system':
      default:
        return { label: 'ابزارهای سیستمی', color: 'bg-slate-500/10 text-slate-600 dark:text-[#8E9299] border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <Boxes className="w-4 h-4" />
            <span>معماری ماژولار و توسعه‌پذیر (Core + Modules Architecture)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            مدیریت ماژول‌ها و اکوسیستم افزونه‌ها
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            تمامی قابلیت‌های سیستم به‌صورت ماژول‌های کاملاً مستقل، دارای نسخه مجزا و قابل فعال/غیرفعال‌سازی بدون تداخل در هسته طراحی شده‌اند.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-[#161619] p-1.5 rounded-2xl border border-slate-200 dark:border-[#2D2D33]">
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'modules'
                ? 'bg-[#C9A227] text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ماژول‌های فعال ({modules.length})
          </button>
          <button
            onClick={() => setActiveTab('hooks')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'hooks'
                ? 'bg-[#C9A227] text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            رویدادها و Hook Bus
          </button>
          <button
            onClick={() => setActiveTab('sdk')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sdk'
                ? 'bg-[#C9A227] text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-[#8E9299] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            راهنمای ساخت ماژول (SDK)
          </button>
        </div>
      </div>

      {activeTab === 'modules' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111113] p-4 rounded-2xl border border-slate-200 dark:border-[#222225]">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'همه ماژول‌ها' },
                { id: 'core', label: 'هسته (Core)' },
                { id: 'commerce', label: 'فروشگاه و سبد' },
                { id: 'marketing', label: 'بازاریابی و ترب' },
                { id: 'communication', label: 'پیامک' },
                { id: 'system', label: 'سیستمی' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                    filterCategory === cat.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                      : 'bg-slate-100 dark:bg-[#161619] text-slate-600 dark:text-[#8E9299] hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا شناسه ماژول..."
                className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((mod) => {
              const catBadge = getCategoryBadge(mod.category);
              return (
                <div
                  key={mod.id}
                  className={`bg-white dark:bg-[#111113] border rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-lg ${
                    mod.isEnabled
                      ? 'border-slate-200 dark:border-[#222225]'
                      : 'border-dashed border-slate-300 dark:border-[#333338] opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2A2A30] flex items-center justify-center text-amber-600 dark:text-[#C9A227] font-black">
                          <Boxes className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6]">
                            {mod.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 dark:text-[#8E9299] font-mono">
                            id: {mod.id} | v{mod.version}
                          </span>
                        </div>
                      </div>

                      {/* Enable / Disable Switch */}
                      <button
                        onClick={() => handleToggle(mod)}
                        disabled={mod.isCore || togglingId === mod.id}
                        className={`transition-all cursor-pointer ${
                          mod.isCore
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:scale-105 active:scale-95'
                        }`}
                        title={mod.isCore ? 'ماژول هسته قابل غیرفعال‌سازی نیست' : ''}
                      >
                        {mod.isEnabled ? (
                          <div className="w-12 h-6 rounded-full bg-emerald-500 flex items-center justify-end px-1 shadow-inner">
                            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                          </div>
                        ) : (
                          <div className="w-12 h-6 rounded-full bg-slate-300 dark:bg-[#2A2A30] flex items-center justify-start px-1">
                            <div className="w-4 h-4 rounded-full bg-white dark:bg-slate-400 shadow-md" />
                          </div>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-[#8E9299] leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${catBadge.color}`}>
                        {catBadge.label}
                      </span>
                      {mod.isCore && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#C9A227] font-bold border border-amber-500/20">
                          Core
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#1E1E22] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#8E9299]">
                    <span>توسعه‌دهنده: {mod.author}</span>
                    <button
                      onClick={() => setSelectedModule(mod)}
                      className="text-amber-600 dark:text-[#C9A227] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>مشخصات فنی</span>
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'hooks' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-[#F3F4F6]">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>سیستم مدیریت رویدادها و ارتباط غیرمستقیم ماژول‌ها (Event Hook Bus)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8E9299] leading-relaxed">
              مشابه ساختار هوک‌های وردپرس (Hooks & Actions)، ماژول‌ها بدون وابستگی مستقیم کدی از طریق انتشار و شنود این رویدادها با یکدیگر تعامل می‌کنند.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-[#222225] border border-slate-200 dark:border-[#222225] rounded-2xl overflow-hidden">
              {eventHooks.map((hook) => (
                <div key={hook.name} className="p-4 bg-slate-50/50 dark:bg-[#161619]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-600 dark:text-[#C9A227] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {hook.name}
                      </span>
                      <span className="text-xs text-slate-700 dark:text-[#D1D5DB] font-medium">
                        {hook.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">ماژول‌های شنونده:</span>
                    {hook.registeredModules.map((mId) => (
                      <span key={mId} className="text-[10px] bg-slate-200 dark:bg-[#222225] text-slate-700 dark:text-[#E0E0E0] px-2 py-0.5 rounded-md font-mono">
                        {mId}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sdk' && (
        <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-black text-slate-900 dark:text-[#F3F4F6] flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-600 dark:text-[#C9A227]" />
              <span>راهنمای توسعه و ساخت ماژول جدید (Module Template / Internal SDK)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8E9299] leading-relaxed">
              برنامه‌نویسان دیگر می‌توانند بدون دستکاری هسته اصلی، ماژول‌های جدید (مانند باشگاه مشتریان، درگاه ارز دیجیتال، اتصال به سپیدار) را با ساختار زیر اضافه نمایند:
            </p>
          </div>

          {/* Code Structure Sample */}
          <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto space-y-2 border border-slate-800" dir="ltr">
            <div className="text-amber-400">// /server/modules/myCustomModule/index.ts</div>
            <div>
              <span className="text-purple-400">export const</span> myCustomModule = &#123;
            </div>
            <div className="pl-4 text-emerald-400">id: <span className="text-sky-300">'my_custom_module'</span>,</div>
            <div className="pl-4 text-emerald-400">name: <span className="text-sky-300">'ماژول سفارشی من'</span>,</div>
            <div className="pl-4 text-emerald-400">version: <span className="text-sky-300">'1.0.0'</span>,</div>
            <div className="pl-4 text-emerald-400">hooks: [<span className="text-sky-300">'order:created'</span>],</div>
            <div className="pl-4">
              <span className="text-blue-400">onOrderCreated</span>(orderPayload) &#123;
            </div>
            <div className="pl-8 text-slate-400">// منطق دلخواه ماژول هنگام ثبت سفارش</div>
            <div className="pl-8 text-yellow-300">console.log('Order received in module:', orderPayload.orderNumber);</div>
            <div className="pl-4">&#125;,</div>
            <div>&#125;;</div>
          </div>
        </div>
      )}

      {/* Module Details Modal */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222225]">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600 dark:text-[#C9A227]" />
                <h3 className="text-sm font-black text-slate-900 dark:text-[#F3F4F6]">
                  {selectedModule.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                بستن ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#161619] rounded-xl space-y-1">
                <span className="text-slate-400 text-[11px]">توضیحات و کاربرد:</span>
                <p className="text-slate-700 dark:text-[#D1D5DB] leading-relaxed">
                  {selectedModule.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 dark:bg-[#161619] rounded-xl">
                  <span className="text-slate-400 block">شناسه ماژول:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedModule.id}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-[#161619] rounded-xl">
                  <span className="text-slate-400 block">نسخه:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">v{selectedModule.version}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-[#161619] rounded-xl">
                  <span className="text-slate-400 block">نوع معماری:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedModule.isCore ? 'هسته اصلی Core' : 'ماژول الحاقی مستقل'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-[#161619] rounded-xl">
                  <span className="text-slate-400 block">آخرین بروزرسانی:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedModule.lastUpdated}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">هوک‌های متصل:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModule.hooks.map((h) => (
                    <span key={h} className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-[#C9A227] px-2 py-0.5 rounded-md font-mono border border-amber-500/20">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedModule(null)}
                className="w-full bg-slate-100 dark:bg-[#161619] hover:bg-slate-200 text-slate-900 dark:text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
