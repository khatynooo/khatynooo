// ==============================================================================
// موتور هوشمند تطبیق متن و مقایسه شباهت محصولات تحریر (Persian Text Matcher & Fuzzy Scoring)
// ==============================================================================

import { ProductMatchResult } from './types';

// واژه‌های توقف و نویز عمومی در نام‌گذاری کالاهای تحریر
const PERSIAN_STATIONERY_STOP_WORDS = new Set([
  'مدل', 'طرح', 'کد', 'اصل', 'اورجینال', 'بسته', 'عددی', 'برگ', 'گرمی', 'گرم',
  'رنگ', 'نوع', 'سایز', 'پک', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت',
  'و', 'با', 'در', 'به', 'از', 'برای', 'های', 'ترین', 'دار', 'بدون',
  'میلی', 'متر', 'میلیمتر', 'میلی‌متر', 'mm'
]);

// مترادف‌ها و معادل‌های رایج برندها و دسته‌ها
export const STATIONERY_SYNONYMS: Record<string, string[]> = {
  'دابل ای': ['دابل آی', 'دابل', 'double a', 'doublea', 'دبل ای'],
  'کپی مکس': ['کپیمکس', 'کپی ماکس', 'copy max', 'copymax'],
  'پنتر': ['panter', 'پانتر'],
  'کیان': ['kian'],
  'پاپکو': ['papco', 'پاپ کو'],
  'فابر کاستل': ['فابرکاستل', 'faber castell', 'faber-castell', 'فابر'],
  'زبرا': ['zebra'],
  'ساراسا': ['sarasa'],
  'استابیلو': ['stabilo'],
  'اسنومن': ['snowman'],
  'کنکو': ['canco', 'کنکو'],
  'بیک': ['bic', 'cristal'],
  'کریستال': ['cristal'],
  'کاسیو': ['casio'],
  'استدلر': ['staedtler', 'استیدلر'],
  'اشنایدر': ['schneider'],
  'پایلوت': ['pilot'],
  'یونی بال': ['uniball', 'uni-ball', 'یونی'],
  'پیکاسو': ['picasso'],
  'سی کلاس': ['c-class', 'cclass'],
  'آریا': ['arya', 'aria'],
  'کاغذ': ['برگه', 'paper'],
  'دفتر': ['notebook', 'دفترچه', 'مشق'],
  'مشق': ['دفتر', 'دفترچه'],
  'خودکار': ['روان نویس', 'رواننویس', 'pen', 'ballpoint'],
  'اتود': ['مداد نوکی', 'مداد مکانیکی', 'mechanical pencil', 'نوکی', 'drafix', 'درافیکس'],
  'مداد نوکی': ['اتود', 'مداد مکانیکی', 'mechanical pencil', 'نوکی', 'drafix', 'درافیکس'],
  'پاک کن': ['پاککن', 'eraser'],
  'تراش': ['sharpener'],
  'منگنه': ['stapler', 'ماشین دوخت'],
  'زونکن': ['binder', 'کلاسور اداری'],
  'هایلایتر': ['علامت گذار', 'علامتگذار', 'هایلایت', 'highlighter'],
  'علامت گذار': ['هایلایتر', 'علامتگذار', 'هایلایت', 'highlighter']
};

export const KNOWN_STATIONERY_BRANDS = [
  'دابل ای', 'کپی مکس', 'پنتر', 'کیان', 'پاپکو', 'فابر کاستل', 'زبرا', 'ساراسا',
  'استابیلو', 'اسنومن', 'کنکو', 'بیک', 'کاسیو', 'استدلر', 'اشنایدر', 'پایلوت',
  'یونی بال', 'پیکاسو', 'سی کلاس', 'آریا'
];

/**
 * استخراج نام برند شاخص نوشت‌افزار از عنوان محصول
 */
export function extractStationeryBrand(normText: string): string | null {
  for (const brand of KNOWN_STATIONERY_BRANDS) {
    const brandNorm = normalizePersianText(brand);
    if (normText.includes(brandNorm)) return brand;
    const aliases = STATIONERY_SYNONYMS[brand] || [];
    for (const alias of aliases) {
      const aliasNorm = normalizePersianText(alias);
      if (normText.includes(aliasNorm)) return brand;
    }
  }
  return null;
}

/**
 * استخراج مشخصات فنی کلیدی (سایز کاغذ، تعداد برگ، ضخامت نوک)
 */
export function extractStationeryKeySpecs(text: string): { numbers: number[]; paperSizes: string[] } {
  const norm = normalizePersianText(text);
  const numbers: number[] = [];
  const numMatches = norm.match(/\b\d+(\.\d+)?\b/g);
  if (numMatches) {
    for (const m of numMatches) {
      const val = parseFloat(m);
      if (!isNaN(val)) numbers.push(val);
    }
  }

  const paperSizes: string[] = [];
  if (/\ba\s*3\b/i.test(norm)) paperSizes.push('a3');
  if (/\ba\s*4\b/i.test(norm)) paperSizes.push('a4');
  if (/\ba\s*5\b/i.test(norm)) paperSizes.push('a5');
  if (/\bb\s*5\b/i.test(norm)) paperSizes.push('b5');

  return {
    numbers: Array.from(new Set(numbers)),
    paperSizes: Array.from(new Set(paperSizes)),
  };
}

/**
 * نرمال‌سازی عمیق متن فارسی:
 * ۱. یکسان‌سازی حروف ی / ي و ک / ك
 * ۲. تبدیل ارقام فارسی و عربی به انگلیسی
 * ۳. تفکیک کلمات از ارقام (مثل A4 -> a 4)
 * ۴. حفظ نقطه اعشار در اعداد اعشاری (مثل 0.5 یا 1.0)
 * ۵. حذف اعراب و نشانه‌های نگارشی
 * ۶. تبدیل نیم‌فاصله به فاصله معمولی
 */
export function normalizePersianText(input?: string): string {
  if (!input) return '';

  let text = input.toString().toLowerCase();

  // تبدیل حروف عربی به معادل استاندارد فارسی
  text = text.replace(/ي/g, 'ی');
  text = text.replace(/ك/g, 'ک');
  text = text.replace(/ة/g, 'ه');
  text = text.replace(/ؤ/g, 'و');
  text = text.replace(/إ|أ|آ/g, 'ا');
  text = text.replace(/ء/g, '');

  // تبدیل ارقام فارسی و عربی به انگلیسی
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    text = text.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    text = text.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }

  // تفکیک حروف انگلیسی از ارقام (مثل a4 -> a 4)
  text = text.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');

  // استانداردسازی ممیز اعشار بین ارقام به نقطه
  text = text.replace(/(\d+)[\/٫\.](\d+)/g, '$1.$2');

  // جایگزینی نیم‌فاصله (\u200c) و خط‌فاصله با فاصله
  text = text.replace(/[\u200c\u200b\u200e\u200f_\-\/\\]/g, ' ');

  // حذف اعراب
  text = text.replace(/[\u064B-\u065F\u0670]/g, '');

  // حذف نقطه غیراعشاری و سایر علائم نگارشی
  text = text.replace(/(?<!\d)\.|\.(?!\d)/g, ' ');
  text = text.replace(/[,:;!؟?()\[\]{}"'«»*#@+]/g, ' ');

  // حذف فاصله‌های چندگانه
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * توکن‌سازی متن با اعمال مترادف‌ها و حذف نویز
 */
export function tokenizeStationeryText(text: string): string[] {
  const normalized = normalizePersianText(text);
  if (!normalized) return [];

  const rawTokens = normalized.split(' ').filter(Boolean);
  const result: string[] = [];

  for (const token of rawTokens) {
    if (token.length <= 1 && !/\d/.test(token)) continue;
    if (PERSIAN_STATIONERY_STOP_WORDS.has(token)) continue;

    result.push(token);

    // افزودن مترادف‌ها به منظور افزایش دقت تطبیق
    for (const [canonical, aliases] of Object.entries(STATIONERY_SYNONYMS)) {
      if (token === canonical || aliases.includes(token)) {
        const canonicalTokens = canonical.split(' ');
        for (const ct of canonicalTokens) {
          if (!result.includes(ct)) result.push(ct);
        }
      }
    }
  }

  return Array.from(new Set(result));
}

/**
 * محاسبه فاصله لون‌اشتاین (Levenshtein Distance)
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // تعویض
          matrix[i][j - 1] + 1,     // درج
          matrix[i - 1][j] + 1      // حذف
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * محاسبه شباهت لون‌اشتاین به صورت درصد (۰.۰ تا ۱.۰)
 */
export function calculateLevenshteinSimilarity(a: string, b: string): number {
  const normA = normalizePersianText(a);
  const normB = normalizePersianText(b);
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = calculateLevenshteinDistance(normA, normB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * محاسبه ضریب شباهت اشتراک توکن‌ها (Jaccard / Weighted Token Overlap)
 */
export function calculateTokenSimilarity(textA: string, textB: string): number {
  const tokensA = tokenizeStationeryText(textA);
  const tokensB = tokenizeStationeryText(textB);

  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

/**
 * محاسبه امتیاز شباهت ترکیبی هوشمند با تفکیک برند و مشخصات فنی
 */
export function calculateStationerySimilarity(query: string, candidateTitle: string, candidateCategory?: string): number {
  const normQuery = normalizePersianText(query);
  const normTitle = normalizePersianText(candidateTitle);

  // ۱. تطابق کامل رشته
  if (normQuery === normTitle) return 1.0;

  // ۲. بررسی تضاد صریح برندها (جلوگیری از انطباق اشتباه خودکار بیک با پنتر و ...)
  const brandA = extractStationeryBrand(normQuery);
  const brandB = extractStationeryBrand(normTitle);
  if (brandA && brandB && brandA !== brandB) {
    return 0.12; // تضاد صریح برند
  }

  // ۳. بررسی سایز کاغذ (A4 vs A3 vs A5)
  const specsA = extractStationeryKeySpecs(query);
  const specsB = extractStationeryKeySpecs(candidateTitle);
  if (specsA.paperSizes.length > 0 && specsB.paperSizes.length > 0) {
    const commonSizes = specsA.paperSizes.filter((s) => specsB.paperSizes.includes(s));
    if (commonSizes.length === 0) {
      return 0.15; // تضاد سایز کاغذ
    }
  }

  // ۴. بررسی تضاد صریح مشخصات فنی (تعداد برگ یا ضخامت نوک اتود/خودکار)
  const isSheetOrTipConflict = () => {
    // ضخامت نوک اتود/خودکار (0.3, 0.38, 0.5, 0.7, 0.9, 1.0, 1.2, 1.6)
    const tipSizes = [0.3, 0.38, 0.5, 0.7, 0.9, 1.0, 1.2, 1.6];
    const tipsA = specsA.numbers.filter((n) => tipSizes.includes(n));
    const tipsB = specsB.numbers.filter((n) => tipSizes.includes(n));
    if (tipsA.length > 0 && tipsB.length > 0) {
      const commonTips = tipsA.filter((n) => tipsB.includes(n));
      if (commonTips.length === 0) return true;
    }

    // تعداد برگ دفتر (40, 50, 60, 80, 100, 160, 200)
    const sheetCounts = [40, 50, 60, 80, 100, 160, 200];
    const sheetsA = specsA.numbers.filter((n) => sheetCounts.includes(n));
    const sheetsB = specsB.numbers.filter((n) => sheetCounts.includes(n));
    if (sheetsA.length > 0 && sheetsB.length > 0) {
      const commonSheets = sheetsA.filter((n) => sheetsB.includes(n));
      if (commonSheets.length === 0) return true;
    }

    return false;
  };

  if (isSheetOrTipConflict()) {
    return 0.18; // تضاد مشخصه اصلی
  }

  // ۵. دربرگیری مستقیم
  if (normTitle.includes(normQuery) && normQuery.length > 5) {
    return 0.92;
  }
  if (normQuery.includes(normTitle) && normTitle.length > 5) {
    return 0.88;
  }

  // ۶. ترکیب توکن‌ها و لون‌اشتاین
  const tokenScore = calculateTokenSimilarity(query, candidateTitle);
  const levenshteinScore = calculateLevenshteinSimilarity(query, candidateTitle);

  // وزن‌دهی: توکن‌ها ۷۰٪ و لون‌اشتاین ۳۰٪
  let combined = tokenScore * 0.7 + levenshteinScore * 0.3;

  // پاداش یکسانی برند
  if (brandA && brandB && brandA === brandB) {
    combined = Math.min(1.0, combined + 0.15);
  }

  // بررسی هم‌پوشانی دسته‌بندی
  if (candidateCategory && normQuery.includes(normalizePersianText(candidateCategory))) {
    combined = Math.min(1.0, combined + 0.08);
  }

  return Math.round(combined * 100) / 100;
}

/**
 * یافتن بهترین تطبیق کالا از یک لیست آیتم‌های بنچمارک یا انبار
 */
export function findBestStationeryMatch<T extends { title?: string; name?: string; category?: string }>(
  query: string,
  candidates: T[],
  threshold = 0.52
): ProductMatchResult<T> | null {
  if (!query || !candidates || candidates.length === 0) return null;

  let bestItem: T | null = null;
  let maxScore = -1;
  let matchReason = '';

  for (const candidate of candidates) {
    const title = candidate.title || candidate.name || '';
    const score = calculateStationerySimilarity(query, title, candidate.category);

    if (score > maxScore) {
      maxScore = score;
      bestItem = candidate;
      matchReason = `شباهت محاسباتی ${Math.round(score * 100)}٪ با «${title}»`;
    }
  }

  if (!bestItem || maxScore < threshold) {
    return null;
  }

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (maxScore >= 0.75) confidence = 'high';
  else if (maxScore >= 0.55) confidence = 'medium';

  return {
    item: bestItem,
    score: maxScore,
    confidence,
    matchReason,
  };
}
