/**
 * موتور تولید خودکار هشتگ‌های استاندارد برای پیام‌رسان‌ها و اینستاگرام
 * (Hashtag Generation Engine)
 */

export function generateHashtags(product: {
  name: string;
  categoryName?: string;
  subCategoryName?: string;
  code?: string;
}): string[] {
  const tags = new Set<string>();

  // هشتگ برند رسمی
  tags.add('#خطی_نو');
  tags.add('#لوازم_التحریر');

  // دسته‌بندی اصلی و زیردسته
  const sourceList = [
    product.categoryName,
    product.subCategoryName,
  ].filter((item): item is string => Boolean(item && item.trim().length > 0));

  for (const src of sourceList) {
    const clean = normalizeForHashtag(src);
    if (clean && clean.length >= 2) {
      tags.add(`#${clean}`);
    }
  }

  // استخراج کلیدواژه‌های معنادار از نام کالا
  if (product.name) {
    // تمیزسازی و حذف کاراکترهای زائد
    const cleanName = normalizeForHashtag(product.name);
    if (cleanName && cleanName.length >= 2) {
      tags.add(`#${cleanName}`);
    }

    // تک‌کلمه‌های مهم ۳ حرفی یا بیشتر (بدون کلمات ربط)
    const stopWords = new Set(['های', 'برای', 'با', 'در', 'از', 'به', 'که', 'یک', 'مدل', 'طرح', 'رنگ', 'سایز']);
    const words = product.name
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !stopWords.has(w));

    for (const w of words.slice(0, 4)) {
      const normalized = normalizeForHashtag(w);
      if (normalized && normalized.length >= 3) {
        tags.add(`#${normalized}`);
      }
    }
  }

  // اضافه کردن هشتگ خرید و ارسال آنلاین
  tags.add('#خرید_آنلاین');

  return Array.from(tags).slice(0, 12);
}

/**
 * تبدیل رشته به هشتگ استاندارد بدون کاراکترهای غیرمجاز
 */
function normalizeForHashtag(text: string): string {
  return String(text || '')
    .trim()
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[^\p{L}\p{N}\s_]+/gu, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
}
