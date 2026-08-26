import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Sparkles,
  Filter,
  FileCheck,
  Tag,
  Maximize2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { MediaItem } from '../../types';
import { useToast } from '../common/Toast';

export const MediaLibraryView: React.FC = () => {
  const { showToast } = useToast();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<MediaItem | null>(null);

  // New media form state
  const [newItem, setNewItem] = useState({
    title: '',
    url: '',
    category: 'banner',
    altText: '',
    dimensions: '1200x500',
    fileType: 'image/webp',
    sizeBytes: 150000,
  });

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.getMediaItems(categoryFilter === 'all' ? undefined : categoryFilter);
      setMediaList(res.media || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [categoryFilter]);

  const handleCopyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    showToast('لینک تصویر کپی شد.', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این فایل از کتابخانه رسانه اطمینان دارید؟')) return;
    try {
      await api.deleteMediaItem(id);
      setMediaList((prev) => prev.filter((m) => m.id !== id));
      showToast('فایل با موفقیت حذف شد.', 'info');
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف فایل', 'error');
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim() || !newItem.url.trim()) {
      showToast('لطفاً عنوان و آدرس تصویر را وارد نمایید.', 'warning');
      return;
    }
    try {
      const res = await api.addMediaItem({
        ...newItem,
        filename: `${newItem.title.toLowerCase().replace(/\s+/g, '-')}.webp`,
        altText: newItem.altText || newItem.title,
      });
      setMediaList((prev) => [res.item, ...prev]);
      showToast('تصویر به کتابخانه رسانه اضافه شد (با فرمت بهینه WebP).', 'success');
      setShowUploadModal(false);
      setNewItem({
        title: '',
        url: '',
        category: 'banner',
        altText: '',
        dimensions: '1200x500',
        fileType: 'image/webp',
        sizeBytes: 150000,
      });
    } catch (err: any) {
      showToast(err.message || 'خطا در افزودن فایل', 'error');
    }
  };

  const filteredMedia = mediaList.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.altText.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <ImageIcon className="w-4 h-4" />
            <span>کتابخانه رسانه و بهینه‌سازی تصاویر (Media Library & WebP Auto-Converter)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            مدیریت تصاویر، بنرها و فایل‌های چندرسانه‌ای
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            آپلود و نگهداری تصاویر در فرمت نسل جدید WebP، کاهش حجم بدون افت کیفیت، افزودن متون جایگزین (Alt Text) برای سئوی گوگل و کپی آسان لینک‌ها.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#C9A227] hover:bg-[#B38E1E] active:scale-98 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-black" />
          <span>بارگذاری رسانه جدید (WebP)</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111113] p-4 rounded-2xl border border-slate-200 dark:border-[#222225] shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'همه فایل‌ها' },
            { id: 'banner', label: 'بنرها و اسلایدر' },
            { id: 'product', label: 'محصولات' },
            { id: 'logo', label: 'لوگو و آیکون' },
            { id: 'doc', label: 'فایل‌ها و مدارک' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat.id
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
            placeholder="جستجوی نام یا تگ فایل..."
            className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            className="group bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-2xl overflow-hidden hover:border-[#C9A227] hover:shadow-xl transition-all flex flex-col justify-between"
          >
            {/* Image Preview Container */}
            <div className="relative aspect-video sm:aspect-square bg-slate-100 dark:bg-[#1A1A1E] overflow-hidden flex items-center justify-center">
              <img
                src={item.url}
                alt={item.altText || item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-amber-400 text-[9px] font-mono px-2 py-0.5 rounded-md font-bold">
                WEBP
              </span>

              {/* Action Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setSelectedPreview(item)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors cursor-pointer"
                  title="بزرگنمایی"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopyUrl(item)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors cursor-pointer"
                  title="کپی لینک"
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition-colors cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info Footer */}
            <div className="p-3 space-y-1 text-right">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#E0E0E0] truncate" title={item.title}>
                {item.title}
              </h4>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{item.dimensions || '1200x500'}</span>
                <span>{formatFileSize(item.sizeBytes)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222225]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#C9A227]" />
                <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                  بارگذاری تصویر جدید در کتابخانه (Auto WebP)
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMedia} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">عنوان تصویر:</label>
                <input
                  type="text"
                  required
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="مثلاً: بنر تخفیف مدادرنگی فابرکاستل"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">آدرس مستقیم تصویر (URL):</label>
                <input
                  type="url"
                  required
                  value={newItem.url}
                  onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">دسته‌بندی رسانه:</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  >
                    <option value="banner">بنر و اسلایدر</option>
                    <option value="product">تصویر محصول</option>
                    <option value="logo">لوگو و هویت بصری</option>
                    <option value="doc">اسناد و فایل‌ها</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">ابعاد (پیکسل):</label>
                  <input
                    type="text"
                    value={newItem.dimensions}
                    onChange={(e) => setNewItem({ ...newItem, dimensions: e.target.value })}
                    placeholder="1200x500"
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">متن جایگزین برای سئو (Alt Text):</label>
                <input
                  type="text"
                  value={newItem.altText}
                  onChange={(e) => setNewItem({ ...newItem, altText: e.target.value })}
                  placeholder="توضیح کوتاه تصویر برای موتورهای جستجو"
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-[#161619] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C9A227] text-slate-950 hover:bg-[#B38E1E] cursor-pointer"
                >
                  ذخیره در کتابخانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Full Image Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222225]">
              <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                {selectedPreview.title}
              </h3>
              <button
                onClick={() => setSelectedPreview(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img
                src={selectedPreview.url}
                alt={selectedPreview.title}
                className="max-h-[60vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#161619] rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">لینک فایل:</span>
                <span className="font-mono text-[10px] text-amber-600 dark:text-[#C9A227]">{selectedPreview.url}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">متن Alt سئو:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedPreview.altText}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
