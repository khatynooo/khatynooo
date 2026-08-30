/**
 * تفکیک‌کننده هوشمند و امن دستورات SQL برای PostgreSQL
 * پشتیبانی کامل از بلوک‌های PL/pgSQL ($$...$$ و $tag$...$tag$)،
 * رشته‌های نقل‌قولی ('...'), شناسه‌ها ("...") و کامنت‌های خطی و چندخطی.
 */

export function splitSqlStatements(sqlText: string): string[] {
  if (!sqlText || typeof sqlText !== 'string') {
    return [];
  }

  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarQuoteTag: string | null = null;

  const len = sqlText.length;
  let i = 0;

  while (i < len) {
    const char = sqlText[i];
    const nextChar = i + 1 < len ? sqlText[i + 1] : '';

    // ۱. درون کامنت تک‌خطی (-- ...)
    if (inLineComment) {
      current += char;
      if (char === '\n' || char === '\r') {
        inLineComment = false;
      }
      i++;
      continue;
    }

    // ۲. درون کامنت چندخطی (/* ... */)
    if (inBlockComment) {
      current += char;
      if (char === '*' && nextChar === '/') {
        current += nextChar;
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // ۳. درون رشته متنی ('...')
    if (inSingleQuote) {
      current += char;
      if (char === "'") {
        if (nextChar === "'") {
          // کاراکتر Escape شده تک‌کوت ('')
          current += nextChar;
          i += 2;
          continue;
        } else {
          inSingleQuote = false;
        }
      }
      i++;
      continue;
    }

    // ۴. درون شناسه ("...")
    if (inDoubleQuote) {
      current += char;
      if (char === '"') {
        if (nextChar === '"') {
          // کاراکتر Escape شده دابل‌کوت ("")
          current += nextChar;
          i += 2;
          continue;
        } else {
          inDoubleQuote = false;
        }
      }
      i++;
      continue;
    }

    // ۵. درون بلوک نقل‌قول دلاری ($$...$$ یا $tag$...$tag$) مخصوص توابع و کدهای PL/pgSQL
    if (dollarQuoteTag !== null) {
      current += char;
      if (char === '$') {
        const closingTag = `$${dollarQuoteTag}$`;
        if (sqlText.substring(i, i + closingTag.length) === closingTag) {
          current += sqlText.substring(i + 1, i + closingTag.length);
          i += closingTag.length;
          dollarQuoteTag = null;
          continue;
        }
      }
      i++;
      continue;
    }

    // ۶. شروع کامنت تک‌خطی (--)
    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      current += char + nextChar;
      i += 2;
      continue;
    }

    // ۷. شروع کامنت چندخطی (/*)
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      current += char + nextChar;
      i += 2;
      continue;
    }

    // ۸. شروع رشته متنی تک‌کوت (')
    if (char === "'") {
      inSingleQuote = true;
      current += char;
      i++;
      continue;
    }

    // ۹. شروع شناسه دابل‌کوت (")
    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      i++;
      continue;
    }

    // ۱۰. شروع بلوک دلاری ($$...$$ یا $tag$...$tag$)
    if (char === '$') {
      const match = sqlText.substring(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        dollarQuoteTag = match[1];
        current += match[0];
        i += match[0].length;
        continue;
      }
    }

    // ۱۱. کاراکتر جداکننده پایان دستور (;)
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    // کاراکتر معمولی
    current += char;
    i++;
  }

  // اضافه کردن آخرین دستور در صورت عدم وجود ; در انتهای فایل
  const lastTrimmed = current.trim();
  if (lastTrimmed.length > 0) {
    statements.push(lastTrimmed);
  }

  return statements;
}
