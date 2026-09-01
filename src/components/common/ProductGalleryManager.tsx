import React, { useState, useRef } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Star,
  ArrowRight,
  ArrowLeft,
  Eye,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from './Toast';
import { toPersianDigits } from '../../lib/utils';

interface ProductGalleryManagerProps {
  images: string[];
  primaryImage?: string;
  onChange: (images: string[], primaryImage: string) => void;
  title?: string;
}

export const ProductGalleryManager: React.FC<ProductGalleryManagerProps> = ({
  images = [],
  primaryImage = '',
  onChange,
  title = 'گالری و مدیریت تصاویر چندگانه کالا',
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  // Unify and clean images list
  const allImages = Array.from(
    new Set([primaryImage, ...images].filter((img): img is string => Boolean(img && img.trim())))
  );

  const currentPrimary = primaryImage && allImages.includes(primaryImage)
    ? primaryImage
    : (allImages[0] || '');

  const updateImages = (newImages: string[], newPrimary?: string) => {
    const cleanList = Array.from(new Set(newImages.filter((img): img is string => Boolean(img && img.trim()))));
    const finalPrimary = newPrimary && cleanList.includes(newPrimary)
      ? newPrimary
      : (cleanList[0] || '');
    onChange(cleanList, finalPrimary);
  };

  // 1. Upload from local system / computer
  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        showToast(`فایل «${file.name}» تصویر معتبر نیست.`, 'error');
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast(`فایل «${file.name}» بزرگتر از ۱۵ مگابایت است.`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of validFiles) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await api.uploadFile({
          dataUrl: base64,
          filename: file.name,
          category: 'product',
          title: file.name.replace(/\.[^/.]+$/, ''),
        });

        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const newMerged = [...allImages, ...uploadedUrls];
        const newPrimary = currentPrimary || uploadedUrls[0];
        updateImages(newMerged, newPrimary);
        showToast(`${toPersianDigits(uploadedUrls.length)} تصویر با موفقیت از سیستم آپلود و ذخیره شد.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در آپلود تصاویر از سیستم', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 2. Add from URL / link
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      showToast('لطفاً آدرس لینک تصویر را وارد نمایید.', 'error');
      return;
    }

    if (allImages.includes(trimmed)) {
      showToast('این تصویر قبلاً در گالری ثبت شده است.', 'info');
      setUrlInput('');
      return;
    }

    const newMerged = [...allImages, trimmed];
    const newPrimary = currentPrimary || trimmed;
    updateImages(newMerged, newPrimary);
    setUrlInput('');
    showToast('تصویر با موفقیت به گالری اضافه شد.', 'success');
  };

  // 3. Set Primary Cover Image
  const handleSetPrimary = (img: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateImages(allImages, img);
    showToast('تصویر به عنوان عکس شاخص کالا تنظیم شد.', 'info');
  };

  // 4. Remove Image
  const handleRemoveImage = (imgToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = allImages.filter((img) => img !== imgToRemove);
    let nextPrimary = currentPrimary;
    if (currentPrimary === imgToRemove) {
      nextPrimary = filtered[0] || '';
    }
    updateImages(filtered, nextPrimary);
    showToast('تصویر از گالری حذف شد.', 'info');
  };

  // 5. Move Image Position (Reorder)
  const handleMove = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const newIndex = direction === 'left' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= allImages.length) return;

    const listCopy = [...allImages];
    const temp = listCopy[index];
    listCopy[index] = listCopy[newIndex];
    listCopy[newIndex] = temp;

    updateImages(listCopy, currentPrimary);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-[#141417] p-4 sm:p-5 rounded-2xl border border-[#2A2A30] space-y-4 text-[#E0E0E0]">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#25252B] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-sm text-[#F3F4F6] flex items-center gap-1.5">
              <span>{title}</span>
              <span className="bg-[#222228] text-[#C9A227] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#33333C]">
                {toPersianDigits(allImages.length)} تصویر
              </span>
            </h4>
            <p className="text-[11px] text-[#8E9299]">
              امکان بارگذاری همزمان چندین عکس از سیستم، افزودن با لینک اینترنتی و انتخاب تصویر شاخص
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone & Action Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Drag & Drop / File Selector Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`md:col-span-7 border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#C9A227] bg-[#C9A227]/10'
              : 'border-[#2F2F37] hover:border-[#C9A227]/60 bg-[#19191E] hover:bg-[#1C1C22]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFilesUpload(e.target.files)}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 text-[#C9A227] animate-spin" />
              <span className="text-xs font-bold text-[#C9A227]">در حال آپلود و بهینه‌سازی تصاویر روی سرور...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-[#22222A] flex items-center justify-center text-[#C9A227] shadow-inner">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#F3F4F6]">
                  انتخاب عکس از کامپیوتر یا سیستم
                </div>
                <div className="text-[11px] text-[#8E9299]">
                  فایل‌ها را به اینجا بکشید یا برای انتخاب کلیک کنید (چند انتخابی)
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md font-mono">
                JPG, PNG, WebP, SVG (حداکثر ۱۵ مگابایت)
              </span>
            </>
          )}
        </div>

        {/* URL Input Box */}
        <div className="md:col-span-5 bg-[#19191E] border border-[#2F2F37] rounded-2xl p-3.5 flex flex-col justify-between space-y-2">
          <div>
            <label className="text-xs font-bold text-[#8E9299] block mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>افزودن با آدرس اینترنتی (URL):</span>
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-[#111114] border border-[#2F2F37] focus:border-[#C9A227] rounded-xl p-2.5 font-mono text-left text-xs outline-none text-[#E0E0E0]"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            className="w-full bg-[#22222A] hover:bg-[#C9A227] text-[#C9A227] hover:text-slate-950 border border-[#33333E] hover:border-[#C9A227] font-bold text-xs py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت و افزودن عکس از لینک</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid Display */}
      {allImages.length > 0 ? (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-[#8E9299]">
            <span className="font-bold text-[#E0E0E0]">تصاویر ثبت‌شده کالا (روی ستاره کلیک کنید تا تصویر شاخص شود):</span>
            <span className="text-[11px]">مجموع: {toPersianDigits(allImages.length)} تصویر</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {allImages.map((imgUrl, idx) => {
              const isPrimary = imgUrl === currentPrimary;
              return (
                <div
                  key={idx}
                  className={`group relative rounded-2xl overflow-hidden bg-[#111114] border-2 transition-all duration-200 flex flex-col justify-between ${
                    isPrimary
                      ? 'border-[#C9A227] shadow-lg shadow-[#C9A227]/10 ring-2 ring-[#C9A227]/30'
                      : 'border-[#27272F] hover:border-[#3E3E49]'
                  }`}
                >
                  {/* Primary Badge */}
                  {isPrimary && (
                    <div className="absolute top-1.5 right-1.5 z-10 bg-[#C9A227] text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>تصویر شاخص</span>
                    </div>
                  )}

                  {/* Order Index */}
                  <div className="absolute top-1.5 left-1.5 z-10 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                    {toPersianDigits(idx + 1)}
                  </div>

                  {/* Image Thumbnail */}
                  <div
                    onClick={() => setPreviewModalImg(imgUrl)}
                    className="w-full aspect-square p-2 flex items-center justify-center overflow-hidden cursor-pointer"
                  >
                    <img
                      src={imgUrl}
                      alt={`تصویر ${idx + 1}`}
                      className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  {/* Action Bar at Bottom of Item */}
                  <div className="bg-[#18181D] border-t border-[#25252D] p-1.5 flex items-center justify-between gap-1">
                    {/* Make Primary Button */}
                    <button
                      type="button"
                      onClick={(e) => handleSetPrimary(imgUrl, e)}
                      title={isPrimary ? 'این تصویر شاخص است' : 'انتخاب به عنوان عکس شاخص کالا'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                        isPrimary
                          ? 'bg-[#C9A227] text-slate-950 font-bold'
                          : 'bg-[#222229] hover:bg-[#C9A227]/20 text-[#8E9299] hover:text-[#C9A227]'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isPrimary ? 'fill-current' : ''}`} />
                    </button>

                    {/* Move Controls */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => handleMove(idx, 'right', e)}
                        title="انتقال به ابتدا"
                        className="p-1 rounded-md bg-[#222229] hover:bg-[#2F2F3A] disabled:opacity-30 disabled:cursor-not-allowed text-[#8E9299] hover:text-white cursor-pointer"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === allImages.length - 1}
                        onClick={(e) => handleMove(idx, 'left', e)}
                        title="انتقال به انتها"
                        className="p-1 rounded-md bg-[#222229] hover:bg-[#2F2F3A] disabled:opacity-30 disabled:cursor-not-allowed text-[#8E9299] hover:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(imgUrl)}
                      title="بزرگنمایی و پیش‌نمایش"
                      className="p-1.5 rounded-lg bg-[#222229] hover:bg-slate-700 text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveImage(imgUrl, e)}
                      title="حذف تصویر از گالری"
                      className="p-1.5 rounded-lg bg-[#222229] hover:bg-rose-950/60 text-[#8E9299] hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center bg-[#17171C] rounded-2xl border border-dashed border-[#2B2B33] text-[#8E9299] text-xs">
          هنوز تصویری برای این کالا ثبت نشده است. با دکمه‌های بالا عکس‌های محصول را اضافه فرمایید.
        </div>
      )}

      {/* Large Preview Modal */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141417] border border-[#2D2D35] rounded-3xl p-4 max-w-2xl w-full max-h-[90vh] flex flex-col items-center gap-4 relative shadow-2xl"
          >
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute left-4 top-4 w-9 h-9 rounded-full bg-[#222229] text-[#8E9299] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full flex-1 max-h-[70vh] flex items-center justify-center p-2">
              <img
                src={previewModalImg}
                alt="پیش‌نمایش تصویر"
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>

            <div className="w-full flex items-center justify-between pt-2 border-t border-[#25252D] text-xs">
              <span className="font-mono text-[#8E9299] truncate max-w-md">{previewModalImg}</span>
              <button
                onClick={(e) => {
                  handleSetPrimary(previewModalImg, e);
                  setPreviewModalImg(null);
                }}
                className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Star className="w-4 h-4 fill-current" />
                <span>تنظیم به عنوان عکس شاخص کالا</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
