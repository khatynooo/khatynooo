export function formatToman(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '۰ تومان';
  const clean = typeof amount === 'string' ? toEnglishDigits(amount).replace(/[,،_\s]/g, '') : amount;
  const num = Number(clean);
  if (isNaN(num)) return '۰ تومان';
  const rounded = Math.round(num);
  return rounded.toLocaleString('fa-IR') + ' تومان';
}

export function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return '۰';
  const clean = typeof num === 'string' ? toEnglishDigits(num).replace(/[,،_\s]/g, '') : num;
  const parsed = Number(clean);
  if (isNaN(parsed)) return '۰';
  return parsed.toLocaleString('fa-IR');
}

export function toPersianDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str)
    .replace(/[٠-٩]/g, (ch) => persianDigits[ch.charCodeAt(0) - 1632])
    .replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/[۰-۹٠-٩]/g, (ch) => {
      const code = ch.charCodeAt(0);
      return String(code >= 1776 ? code - 1776 : code - 1632);
    })
    .trim();
}

/**
 * بررسی و اعتبارسنجی دقیق رقم کنترلی بارکدهای استاندارد (EAN-13, EAN-8, UPC-A, ITF-14)
 * قانون مهم: اعتبارسنجی Checksum فقط برای فرمت‌هایی اعمال می‌شود که استاندارد ریاضی دارند (مثل EAN-13 یا UPC-A).
 * برای Code-128، Code-39، Code-93، QR Code و سایر فرمت‌هایی که رمزگشا صحت داده را بررسی کرده است، نتیجه نباید اشتباهاً رد شود.
 */
export function isValidBarcodeChecksum(code: string, format?: string): boolean {
  const clean = toEnglishDigits(code).trim();
  if (!clean) return false;

  const fmt = (format || '').toLowerCase().replace(/[-_]/g, '');

  // ۱. فرمت‌هایی که نباید با الگوریتم EAN فیلتر شوند و رمزگشا صحت آن‌ها را تضمین کرده است
  if (
    fmt.includes('128') ||
    fmt.includes('39') ||
    fmt.includes('93') ||
    fmt.includes('qr') ||
    fmt.includes('datamatrix') ||
    fmt.includes('aztec') ||
    fmt.includes('pdf417') ||
    fmt.includes('codabar') ||
    fmt.includes('upce')
  ) {
    return true;
  }

  // ۲. اگر فرمت مشخصاً EAN-13 باشد
  if (fmt.includes('ean13')) {
    if (!/^\d{13}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[12], 10);
  }

  // ۳. اگر فرمت مشخصاً EAN-8 باشد
  if (fmt.includes('ean8')) {
    if (!/^\d{8}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[7], 10);
  }

  // ۴. اگر فرمت مشخصاً UPC-A باشد
  if (fmt.includes('upca')) {
    if (!/^\d{12}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[11], 10);
  }

  // ۵. اگر فرمت مشخصاً ITF / ITF-14 باشد
  if (fmt.includes('itf')) {
    if (clean.length === 14 && /^\d{14}$/.test(clean)) {
      let sum = 0;
      for (let i = 0; i < 13; i++) {
        sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 3 : 1);
      }
      const check = (10 - (sum % 10)) % 10;
      return check === parseInt(clean[13], 10);
    }
    return true;
  }

  // ۶. در غیاب مشخصه فرمت (مانند بررسی ورودی فرم یا دیتابیس):
  // اگر شامل کاراکترهای غیر عددی باشد (مانند Code-128 یا QR الفبانومریک)، معتبر تلقی می‌شود
  if (/[^0-9]/.test(clean)) {
    return true;
  }

  // اگر فرمت اعلام نشده و طول ۱۳ رقم باشد، چک‌سام EAN-13 را بررسی می‌کنیم؛
  // اما در صورتی که ساختار عددی دیگری باشد مانع نمی‌شویم مگر اینکه ارقام مخدوش نوری باشند
  if (clean.length === 13) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[12], 10);
  }

  if (clean.length === 8) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[7], 10);
  }

  if (clean.length === 12) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[11], 10);
  }

  return true;
}

/**
 * جستجوی جامع، هوشمند و دقیق کالا بر اساس بارکد یا کد محصول در صندوق فروش (POS) و انبار
 * - پشتیبانی از اعداد فارسی، عربی و انگلیسی
 * - حذف فاصله‌های نامرئی و اضافی
 * - نگهداری و مقایسه بارکد به عنوان رشته (String) جهت جلوگیری از حذف صفرهای ابتدایی
 * - پشتیبانی دوطرفه از بارکدهای ۱۲ رقمی UPC-A و ۱۳ رقمی EAN-13 با صفر ابتدایی
 * - تطابق حساس به کد کالا (Product Code) و تنوع‌های محصول (Variants / SKU)
 */
export function findProductByBarcodeOrCode<T extends Record<string, any>>(
  products: T[],
  rawQuery: string | null | undefined
): T | undefined {
  if (!rawQuery || !products || !Array.isArray(products) || products.length === 0) {
    return undefined;
  }

  const query = toEnglishDigits(rawQuery).trim();
  if (!query) return undefined;

  const queryLower = query.toLowerCase();
  const queryNoZeros = query.replace(/^0+/, '');

  // ۱. اولویت نخست: تطابق مستقیم و عین به عین رشته بارکد (با حفظ صفرهای ابتدایی)
  for (const p of products) {
    if (!p) continue;
    const pBarcode = toEnglishDigits(p.barcode || '').trim();
    if (pBarcode && pBarcode === query) {
      return p;
    }
  }

  // ۲. اولویت دوم: تطابق مستقیم کد کالا (Product Code)
  for (const p of products) {
    if (!p) continue;
    const pCode = toEnglishDigits(p.code || '').trim().toLowerCase();
    if (pCode && pCode === queryLower) {
      return p;
    }
  }

  // ۳. اولویت سوم: سازگاری بارکدهای UPC-A و EAN-13 (پیشوند صفر ابتدایی)
  for (const p of products) {
    if (!p) continue;
    const pBarcode = toEnglishDigits(p.barcode || '').trim();
    if (!pBarcode) continue;

    // بارکد اسکن شده ۱۲ رقم و در سیستم ۱۳ رقم با صفر باشد، یا برعکس
    if (query.length === 12 && pBarcode === '0' + query) return p;
    if (query.length === 13 && query.startsWith('0') && pBarcode === query.slice(1)) return p;
    if (pBarcode.length === 12 && query === '0' + pBarcode) return p;
    if (pBarcode.length === 13 && pBarcode.startsWith('0') && query === pBarcode.slice(1)) return p;
  }

  // ۴. اولویت چهارم: تطابق ارقام بدون صفرهای غیرضروری (در صورتی که حداقل ۴ رقم باشد)
  if (queryNoZeros.length >= 4) {
    for (const p of products) {
      if (!p) continue;
      const pBarcode = toEnglishDigits(p.barcode || '').trim();
      if (!pBarcode) continue;
      const pNoZeros = pBarcode.replace(/^0+/, '');
      if (pNoZeros.length >= 4 && pNoZeros === queryNoZeros) {
        return p;
      }
    }
  }

  // ۵. اولویت پنجم: بررسی تنوع‌ها (Variants) بر اساس SKU یا بارکد اختصاصی تنوع
  for (const p of products) {
    if (!p || !Array.isArray(p.variants)) continue;
    for (const v of p.variants) {
      if (!v) continue;
      const vSku = toEnglishDigits(v.sku || '').trim().toLowerCase();
      const vBarcode = toEnglishDigits((v as any).barcode || '').trim();
      if ((vBarcode && vBarcode === query) || (vSku && vSku === queryLower)) {
        return p;
      }
    }
  }

  return undefined;
}

export function getRoleTitle(role: string): string {
  const map: Record<string, string> = {
    admin: 'مدیر کل',
    site_manager: 'مدیر سایت',
    seller: 'صندوقدار / فروشنده',
    accountant: 'حسابدار',
    chief_accountant: 'مدیر حسابداری',
  };
  return map[role] || role;
}

export function getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
    site_manager: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    seller: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accountant: 'bg-amber-100 text-amber-800 border-amber-200',
    chief_accountant: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return map[role] || 'bg-slate-100 text-slate-800 border-slate-200';
}

export function getOrderStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'processing':
      return { label: 'در حال پردازش', className: 'bg-amber-100 text-amber-800' };
    case 'confirmed':
      return { label: 'تایید شده', className: 'bg-blue-100 text-blue-800' };
    case 'shipped':
      return { label: 'ارسال شده', className: 'bg-purple-100 text-purple-800' };
    case 'delivered':
      return { label: 'تحویل داده شده', className: 'bg-emerald-100 text-emerald-800' };
    case 'cancelled':
      return { label: 'لغو شده', className: 'bg-rose-100 text-rose-800' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-800' };
  }
}

export function getStatusTitle(status: string): string {
  return getOrderStatusBadge(status).label;
}

export function getStatusBadgeClass(status: string): string {
  return getOrderStatusBadge(status).className;
}

export function formatPersianDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}


