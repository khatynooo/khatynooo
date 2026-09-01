// ==============================================================================
// تفکیک و انتخاب تصاویر ایمن و مرتبط با صنف نوشت‌افزار (Stationery Safe Image Resolver)
// ==============================================================================

// واژه‌های ممنوعه غیرتحریری جهت فیلتر تصاویر و محصولات نامربوط
export const BANNED_NON_STATIONERY_KEYWORDS = [
  'کفش', 'کتونی', 'کتانی', 'پوشاک', 'لباس', 'پیراهن', 'شلوار', 'تیشرت', 'کاپشن', 'پالتو',
  'صندل', 'بوت', 'نیم بوت', 'اسنیکرز', 'پوتین', 'جوراب', 'کفش مردانه', 'کفش زنانه',
  'ساعت مچی', 'گوشی موبایل', 'لپ تاپ', 'هدفون', 'هندزفری', 'عطر', 'ادکلن', 'مانتو',
  'روسری', 'شال', 'کیف مجلسی', 'کفش چرم', 'لباس مجلسی', 'پاپوش'
];

// بانک تصاویر دسته‌بندی‌شده و مطمئن نوشت‌افزار
export const STATIONERY_IMAGE_BANK = {
  // ۱. کاغذ و مقوا
  paperDoubleA: 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?w=800&auto=format&fit=crop&q=80',
  paperCopyMax: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
  paperGeneral: 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?w=800&auto=format&fit=crop&q=80',

  // ۲. دفاتر و کلاسور
  notebookSpiralKhatinoo: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
  notebookLinedJournal: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80',
  notebookPapco: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80',
  notebookClassroom: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=80',

  // ۳. خودکار و نوشت‌افزار
  penPanterSemiGel: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
  penPanterSp105: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
  penKianBox: 'https://images.unsplash.com/photo-1585336261026-4180718399b3?w=800&auto=format&fit=crop&q=80',
  penZebraSarasa: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&auto=format&fit=crop&q=80',
  penBicCrystal: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',

  // ۴. مداد رنگی و هنر
  coloredPencilsFaber: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',
  coloredPencilsArya: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=800&auto=format&fit=crop&q=80',

  // ۵. ماژیک و هایلایتر
  markerSnowmanWb: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop&q=80',
  highlighterStabilo: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80',

  // ۶. مداد نوکی و اتود
  pencilZebraDrafix: 'https://images.unsplash.com/photo-1594913785162-e678a0c23dd9?w=800&auto=format&fit=crop&q=80',
  pencilFaberGrip: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',

  // ۷. چسب، غلط‌گیر و پاک‌کن
  glueCancoStick: 'https://images.unsplash.com/photo-1606103836293-0a0bf1220556?w=800&auto=format&fit=crop&q=80',
  correctionPanterTape: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=800&auto=format&fit=crop&q=80',

  // ۸. زونکن و ملزومات اداری
  binderPapcoOffice: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80',
  officeGeneral: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop&q=80',
};

/**
 * تعیین تصویر واقعی یا استوک با بازگرداندن متادیتای صحت تصویر
 */
export function resolveStationerySafeImageWithMeta(
  title: string,
  category?: string,
  currentImage?: string
): { url: string; isGenericStockPhoto: boolean } {
  const t = (title || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // اگر تصویر واقعی از مبدا دیجی‌کالا یا ترب یا سرور دیگر معتبر وجود دارد
  if (currentImage && currentImage.startsWith('http') && !currentImage.includes('undefined') && !currentImage.includes('null')) {
    const hasBannedKw = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => t.includes(kw));
    const isRealCdn = currentImage.includes('digikala') || currentImage.includes('torob') || currentImage.includes('dkp') || currentImage.includes('media');
    if (!hasBannedKw && isRealCdn) {
      return { url: currentImage, isGenericStockPhoto: false };
    }
    if (!hasBannedKw && currentImage.includes('unsplash')) {
      return { url: currentImage, isGenericStockPhoto: true };
    }
    if (!hasBannedKw) {
      return { url: currentImage, isGenericStockPhoto: false };
    }
  }

  // انتخاب از بانک تصاویر عمومی با نشانه‌گذاری شفاف
  const fallbackUrl = resolveStationerySafeImage(title, category, undefined);
  return { url: fallbackUrl, isGenericStockPhoto: true };
}

/**
 * تعیین تصویر واقعی و تضمین‌شده نوشت‌افزار بر اساس عنوان و ماهیت کالا
 */
export function resolveStationerySafeImage(title: string, category?: string, currentImage?: string): string {
  const t = (title || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // اگر تصویر قبلی موجود است و مشکوک به کفش/پوشاک/خرابی نیست و فرمت معتبر دارد
  if (currentImage && currentImage.startsWith('http') && !currentImage.includes('undefined') && !currentImage.includes('null')) {
    const hasBannedKw = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => t.includes(kw));
    if (!hasBannedKw) {
      return currentImage;
    }
  }

  // ۱. دفاتر و کلاسور
  if (t.includes('دفتر') || t.includes('کلاسور') || t.includes('مشق') || t.includes('یادداشت') || cat.includes('دفتر')) {
    if (t.includes('پاپکو') || t.includes('papco')) return STATIONERY_IMAGE_BANK.notebookPapco;
    if (t.includes('خطی') || t.includes('۸۰') || t.includes('سیمی') || t.includes('80')) return STATIONERY_IMAGE_BANK.notebookSpiralKhatinoo;
    return STATIONERY_IMAGE_BANK.notebookLinedJournal;
  }

  // ۲. کاغذ و مقوا
  if (t.includes('کاغذ') || t.includes('a4') || t.includes('a3') || t.includes('دابل') || t.includes('کپی مکس') || cat.includes('کاغذ')) {
    if (t.includes('کپی') || t.includes('copy')) return STATIONERY_IMAGE_BANK.paperCopyMax;
    return STATIONERY_IMAGE_BANK.paperDoubleA;
  }

  // ۳. خودکار و روان‌نویس
  if (t.includes('خودکار') || t.includes('روان‌نویس') || t.includes('پنتر') || t.includes('کیان') || t.includes('بیک') || t.includes('ساراسا') || cat.includes('خودکار')) {
    if (t.includes('sp-105') || t.includes('sp105') || (t.includes('پنتر') && (t.includes('رنگی') || t.includes('۸') || t.includes('8')))) {
      return STATIONERY_IMAGE_BANK.penPanterSp105;
    }
    if (t.includes('کیان') || t.includes('kian')) return STATIONERY_IMAGE_BANK.penKianBox;
    if (t.includes('ساراسا') || t.includes('sarasa') || t.includes('ژله‌ای') || t.includes('کلیپ')) return STATIONERY_IMAGE_BANK.penZebraSarasa;
    if (t.includes('بیک') || t.includes('کریستال') || t.includes('bic')) return STATIONERY_IMAGE_BANK.penBicCrystal;
    return STATIONERY_IMAGE_BANK.penPanterSemiGel;
  }

  // ۴. مداد رنگی و نقاشی
  if (t.includes('مداد رنگی') || t.includes('رنگ انگشتی') || t.includes('آبرنگ') || t.includes('گواش') || cat.includes('نقاشی')) {
    if (t.includes('فابر') || t.includes('کاستل') || t.includes('پلی کروم')) return STATIONERY_IMAGE_BANK.coloredPencilsFaber;
    return STATIONERY_IMAGE_BANK.coloredPencilsArya;
  }

  // ۵. ماژیک و هایلایتر
  if (t.includes('ماژیک') || t.includes('هایلایتر') || t.includes('علامت‌گذار') || t.includes('وایت برد') || cat.includes('ماژیک')) {
    if (t.includes('استابیلو') || t.includes('stabilo') || t.includes('هایلایت')) return STATIONERY_IMAGE_BANK.highlighterStabilo;
    return STATIONERY_IMAGE_BANK.markerSnowmanWb;
  }

  // ۶. مداد نوکی و اتود
  if (t.includes('اتود') || t.includes('مداد نوکی') || t.includes('نوک اتود') || cat.includes('اتود')) {
    if (t.includes('فابر') || t.includes('گریپ')) return STATIONERY_IMAGE_BANK.pencilFaberGrip;
    return STATIONERY_IMAGE_BANK.pencilZebraDrafix;
  }

  // ۷. چسب و غلط‌گیر
  if (t.includes('چسب') || t.includes('غلط‌گیر') || t.includes('پاک‌کن') || t.includes('تراش') || cat.includes('چسب')) {
    if (t.includes('غلط گیر') || t.includes('نواری')) return STATIONERY_IMAGE_BANK.correctionPanterTape;
    return STATIONERY_IMAGE_BANK.glueCancoStick;
  }

  // ۸. زونکن و بایگانی اداری
  if (t.includes('زونکن') || t.includes('پوشه') || t.includes('کاور') || t.includes('منگنه') || t.includes('پانچ') || cat.includes('اداری')) {
    return STATIONERY_IMAGE_BANK.binderPapcoOffice;
  }

  return STATIONERY_IMAGE_BANK.paperDoubleA;
}

/**
 * تجمیع، اعتبارسنجی و استخراج تمامی تصاویر باکیفیت یک کالا (عکس اصلی + تمام تصاویر گالری شرکت/ترب/دیجی‌کالا)
 */
export function resolveStationeryMultiImages(
  title: string,
  category: string,
  primaryImageUrl?: string | null,
  rawGallery?: Array<string | { url?: string; image_url?: string }> | null
): { primaryImage: string; gallery: string[]; isGenericStockPhoto: boolean } {
  const imagesSet = new Set<string>();

  // ۱. بررسی و استخراج تصاویر از آرایه خام
  if (Array.isArray(rawGallery)) {
    for (const item of rawGallery) {
      const url = typeof item === 'string' ? item : item?.url || item?.image_url;
      if (url && typeof url === 'string' && isValidStationeryImage(title, url)) {
        imagesSet.add(url);
      }
    }
  }

  // ۲. بررسی تصویر اصلی
  let primaryValid = false;
  if (primaryImageUrl && typeof primaryImageUrl === 'string' && isValidStationeryImage(title, primaryImageUrl)) {
    imagesSet.add(primaryImageUrl);
    primaryValid = true;
  }

  let isGenericStockPhoto = false;

  // ۳. در صورتی که هیچ تصویر معتبری یافت نشد، از تصاویر کاتالوگ بنچمارک متناسب با دسته‌بندی استفاده می‌شود
  if (imagesSet.size === 0) {
    const fallback = getMatchingCategoryPlaceholder(title, category);
    imagesSet.add(fallback);
    isGenericStockPhoto = true;
  }

  // ۴. افزودن تصاویر مرتبط دسته‌ای جهت ایجاد گالری کامل چندتصویره برای کالا
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('کاغذ') || titleLower.includes('a4') || titleLower.includes('کپی')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.paperDoubleA);
    imagesSet.add(STATIONERY_IMAGE_BANK.paperCopyMax);
  } else if (titleLower.includes('خودکار') || titleLower.includes('روان نویس') || titleLower.includes('پنتر') || titleLower.includes('بیک')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.penPanterSemiGel);
    imagesSet.add(STATIONERY_IMAGE_BANK.penBicCrystal);
  } else if (titleLower.includes('مداد رنگی') || titleLower.includes('فابر') || titleLower.includes('آریا')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.coloredPencilsFaber);
    imagesSet.add(STATIONERY_IMAGE_BANK.coloredPencilsArya);
  } else if (titleLower.includes('ماژیک') || titleLower.includes('هایلایتر') || titleLower.includes('استابیلو')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.highlighterStabilo);
    imagesSet.add(STATIONERY_IMAGE_BANK.markerSnowmanWb);
  } else if (titleLower.includes('اتود') || titleLower.includes('مداد نوکی') || titleLower.includes('فابر')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.pencilFaberGrip);
    imagesSet.add(STATIONERY_IMAGE_BANK.pencilZebraDrafix);
  } else if (titleLower.includes('چسب') || titleLower.includes('غلط گیر')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.correctionPanterTape);
    imagesSet.add(STATIONERY_IMAGE_BANK.glueCancoStick);
  } else if (titleLower.includes('دفتر') || titleLower.includes('کلاسور') || titleLower.includes('پاپکو')) {
    imagesSet.add(STATIONERY_IMAGE_BANK.notebookPapco100);
    imagesSet.add(STATIONERY_IMAGE_BANK.binderPapcoOffice);
  }

  const galleryList = Array.from(imagesSet);
  const primaryImage = primaryValid && primaryImageUrl ? primaryImageUrl : galleryList[0];

  return {
    primaryImage,
    gallery: galleryList,
    isGenericStockPhoto,
  };
}

