/**
 * ماژول واحد و استاندارد برای پاکسازی و اعتبارسنجی شماره‌های تلفن همراه در ایران
 */

/**
 * تبدیل ارقام فارسی و عربی به ارقام انگلیسی
 */
export function toEnglishDigits(str?: string | number | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .trim();
}

/**
 * پاکسازی و نرمال‌سازی شماره تلفن همراه ایران (خروجی استاندارد: 09xxxxxxxxx)
 * در صورت نامعتبر بودن یا ساختگی بودن (مانند eitaa_ یا temp_)، رشته خالی برمی‌گرداند.
 */
export function normalizeIranianMobile(input?: string | null): string {
  if (!input) return '';
  let cleaned = String(input).trim();

  // فیلتر کردن پیشوندهای ساختگی و زباله
  if (cleaned.startsWith('eitaa_') || cleaned.startsWith('temp_') || cleaned.startsWith('cst_')) {
    return '';
  }

  // ۱. تبدیل ارقام فارسی و عربی به انگلیسی
  cleaned = toEnglishDigits(cleaned);

  // ۲. حذف تمامی کاراکترهای غیر عددی
  cleaned = cleaned.replace(/\D/g, '');

  // ۳. تبدیل کدهای بین‌المللی ایران (+98 یا 0098 یا 98) به 0
  if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }

  // ۴. اگر شماره بدون صفر اول شروع شده باشد (مثلاً 9123456789)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }

  // ۵. اعتبارسنجی قطعی: باید دقیقاً ۱۱ رقم و با 09 شروع شود
  if (/^09\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  return '';
}

export const normalizeMobileNumber = normalizeIranianMobile;

export function isValidIranianMobile(input?: string | null): boolean {
  return Boolean(normalizeIranianMobile(input));
}
