export function formatToman(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '۰ تومان';
  const num = Math.round(Number(amount));
  return num.toLocaleString('fa-IR') + ' تومان';
}

export function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || isNaN(Number(num))) return '۰';
  return Number(num).toLocaleString('fa-IR');
}

export function toPersianDigits(str: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = s;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persian[i], String(i)).replaceAll(arabic[i], String(i));
  }
  return res.trim();
}

/**
 * بررسی و اعتبارسنجی دقیق رقم کنترلی بارکدهای استاندارد (EAN-13, EAN-8, UPC-A)
 * جهت جلوگیری از خطای اپتیکال دوربین یا خواندن اشتباه ارقام (مانند خواندن ۵ به جای ۶ یا ۲)
 */
export function isValidBarcodeChecksum(code: string): boolean {
  const clean = toEnglishDigits(code).replace(/[^0-9]/g, '');
  if (!clean) return true; // Barcodes with letters like CODE-128 / QR pass through

  // EAN-13
  if (clean.length === 13) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? d * 1 : d * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[12], 10);
  }

  // EAN-8
  if (clean.length === 8) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? d * 3 : d * 1;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[7], 10);
  }

  // UPC-A (12 digits)
  if (clean.length === 12) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const d = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? d * 3 : d * 1;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[11], 10);
  }

  return true; // Other formats without fixed length
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


