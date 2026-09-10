/**
 * فرمت‌کننده متن پست و پیام‌های انتشار در کانال‌ها بر اساس قالب و متغیرها
 * (Publication Text & Caption Formatter)
 */

import { PublicationProduct } from './publicationTypes';

export const DEFAULT_PUBLICATION_TEMPLATE = `📦 {{name}}
💰 قیمت: {{salePrice}} تومان
📦 موجودی: {{stock}} {{unit}}
🏷 دسته: {{category}}

📝 {{description}}

{{hashtags}}

{{productUrl}}`;

export function buildProductPublicationText(
  product: PublicationProduct,
  hashtags: string[] = [],
  template?: string,
  customText?: string
): string {
  // اگر کاربر متن سفارشی کامل وارد کرده باشد، همان را برگردان
  if (customText && customText.trim().length > 0) {
    return customText.trim();
  }

  const selectedTemplate = template && template.trim().length > 0 ? template : DEFAULT_PUBLICATION_TEMPLATE;

  const faPrice = product.salePrice !== undefined && product.salePrice !== null
    ? Number(product.salePrice).toLocaleString('fa-IR')
    : 'تماس بگیرید';

  const faStock = product.stock !== undefined && product.stock !== null
    ? Number(product.stock).toLocaleString('fa-IR')
    : 'موجود';

  const hashtagsText = hashtags.length > 0 ? hashtags.join(' ') : '';
  const productUrlText = product.productUrl || '';

  let text = selectedTemplate
    .replace(/\{\{name\}\}/g, product.name || '')
    .replace(/\{\{code\}\}/g, product.code || '')
    .replace(/\{\{barcode\}\}/g, product.barcode || '')
    .replace(/\{\{category\}\}/g, product.categoryName || 'عمومی')
    .replace(/\{\{subCategory\}\}/g, product.subCategoryName || '')
    .replace(/\{\{unit\}\}/g, product.unit || 'عدد')
    .replace(/\{\{salePrice\}\}/g, faPrice)
    .replace(/\{\{stock\}\}/g, faStock)
    .replace(/\{\{description\}\}/g, product.description || '')
    .replace(/\{\{hashtags\}\}/g, hashtagsText)
    .replace(/\{\{productUrl\}\}/g, productUrlText);

  // پاک‌سازی خطوط متوالی خالی
  text = text
    .split('\n')
    .map(l => l.trimEnd())
    .filter((line, idx, arr) => {
      // جلوگیری از ۳ خط خالی پشت سر هم
      if (!line && idx > 0 && !arr[idx - 1] && !arr[idx - 2]) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();

  return text;
}
