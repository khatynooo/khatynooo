import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
  GlobalHistogramBinarizer,
} from '@zxing/library';
import { Html5Qrcode } from 'html5-qrcode';
import { toEnglishDigits } from './utils';

// تمام فرمت‌های بارکد خطی و دوبعدی تجاری و فروشگاهی
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

let cachedNativeDetector: any = null;
let detectorChecked = false;

/**
 * دریافت یا ایجاد نمونه امن و بدون خطای BarcodeDetector بومی مرورگر
 */
export async function getNativeBarcodeDetector(): Promise<any> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }

  if (detectorChecked) {
    return cachedNativeDetector;
  }

  try {
    const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats();
    const candidateFormats = [
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'code_93',
      'itf',
      'qr_code',
      'data_matrix',
      'pdf417',
      'aztec',
    ];

    const formatsToUse = Array.isArray(supported)
      ? candidateFormats.filter((f) => supported.includes(f))
      : candidateFormats;

    if (formatsToUse.length > 0) {
      cachedNativeDetector = new (window as any).BarcodeDetector({ formats: formatsToUse });
    } else {
      cachedNativeDetector = new (window as any).BarcodeDetector();
    }
  } catch (err) {
    console.warn('BarcodeDetector format check fallback:', err);
    try {
      cachedNativeDetector = new (window as any).BarcodeDetector();
    } catch (_) {
      cachedNativeDetector = null;
    }
  }

  detectorChecked = true;
  return cachedNativeDetector;
}

/**
 * ایجاد ریدر بهینه ZXing با تمام فرمت‌ها
 */
function createZxingReader(tryHarder = true): MultiFormatReader {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
  if (tryHarder) {
    hints.set(DecodeHintType.TRY_HARDER, true);
  }
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

/**
 * تبدیل فایل عکس به HTMLImageElement
 */
function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * تقویت کنتراست و وضوح خطوط بارکد (S-Curve Contrast Stretching)
 */
function boostBarcodeContrast(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  let minL = 255;
  let maxL = 0;

  // محاسبه حداقل و حداکثر روشنایی
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    if (lum < minL) minL = lum;
    if (lum > maxL) maxL = lum;
  }

  const range = maxL - minL || 1;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const stretched = Math.min(255, Math.max(0, ((lum - minL) / range) * 255));
    // تقویت کنتراست خطوط سیاه و سفید
    const boosted =
      stretched < 128
        ? (stretched * stretched) / 128
        : 255 - ((255 - stretched) * (255 - stretched)) / 128;

    outData[i] = boosted;
    outData[i + 1] = boosted;
    outData[i + 2] = boosted;
    outData[i + 3] = 255;
  }

  return output;
}

/**
 * تبدیل تصویر به کانواس با مقیاس و زاویه چرخش دلخواه
 */
function imageToCanvas(
  img: HTMLImageElement,
  maxDimension = 1800,
  rotationDegrees = 0
): HTMLCanvasElement {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  if (rotationDegrees === 90 || rotationDegrees === 270) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  if (rotationDegrees !== 0) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationDegrees * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }

  return canvas;
}

/**
 * خوانش با استفاده از کتابخانه بومی مرورگر (Chrome / Android BarcodeDetector API)
 */
async function decodeWithNativeBarcodeDetector(
  imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap
): Promise<string | null> {
  try {
    const detector = await getNativeBarcodeDetector();
    if (!detector) return null;

    const results = await detector.detect(imageSource);
    if (results && results.length > 0 && results[0].rawValue) {
      return toEnglishDigits(results[0].rawValue).trim();
    }
  } catch (e) {
    // خطای فرمت یا فریم
  }
  return null;
}

/**
 * خوانش بارکد از روی ImageData با الگوریتم ZXing
 */
function decodeImageDataWithZxing(
  imageData: ImageData,
  useGlobalHistogram = false
): string | null {
  try {
    const { width, height, data } = imageData;
    const lumArray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      lumArray[j] = (data[i] * 306 + data[i + 1] * 601 + data[i + 2] * 117) >> 10;
    }

    const lumSource = new RGBLuminanceSource(lumArray, width, height);
    const binarizer = useGlobalHistogram
      ? new GlobalHistogramBinarizer(lumSource)
      : new HybridBinarizer(lumSource);
    const bitmap = new BinaryBitmap(binarizer);

    const reader = createZxingReader(true);
    const result = reader.decode(bitmap);
    if (result && result.getText()) {
      return toEnglishDigits(result.getText()).trim();
    }
  } catch (_) {
    // بارکد در این فاز پیدا نشد
  }
  return null;
}

/**
 * خوانش عکس با موتور چندمرحله‌ای (Multi-Pass Decoders)
 * این تابع عکس گرفته شده توسط دوربین اصلی خود گوشی یا فایل انتخابی را با حداکثر دقت می‌خواند.
 */
export async function decodeBarcodeFromImage(
  file: File | Blob
): Promise<{ success: boolean; barcode: string; engine: string }> {
  try {
    const img = await loadImageFromFile(file);

    // ۱. پاس اول: بررسی بلادرنگ با موتور بومی مرورگر و گوگل (BarcodeDetector) روی عکس با کیفیت کامل
    try {
      const nativeCode = await decodeWithNativeBarcodeDetector(img);
      if (nativeCode && nativeCode.length >= 2) {
        return { success: true, barcode: nativeCode, engine: 'موتور بومی گوشی (Native BarcodeDetector)' };
      }
    } catch (_) {}

    // ۲. پاس دوم: بررسی در زوایای مختلف (۰، ۹۰ و ۲۷۰ درجه) برای پشتیبانی از اسکن عمودی/افقی
    const angles = [0, 90, 270];
    const scales = [1800, 1100];

    for (const maxDim of scales) {
      for (const angle of angles) {
        const canvas = imageToCanvas(img, maxDim, angle);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;

        // آزمون مجدد موتور بومی روی کانواس زاویه‌دار
        try {
          const rotNative = await decodeWithNativeBarcodeDetector(canvas);
          if (rotNative && rotNative.length >= 2) {
            return {
              success: true,
              barcode: rotNative,
              engine: `موتور بومی (${angle}° زاویه)`,
            };
          }
        } catch (_) {}

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // ۲-الف) ZXing با HybridBinarizer
        let code = decodeImageDataWithZxing(imgData, false);
        if (code && code.length >= 2) {
          return { success: true, barcode: code, engine: `ZXing Hybrid (${angle}°)` };
        }

        // ۲-ب) ZXing با تقویت کنتراست خطوط (Boosted S-Curve)
        const boosted = boostBarcodeContrast(imgData);
        code = decodeImageDataWithZxing(boosted, false);
        if (code && code.length >= 2) {
          return { success: true, barcode: code, engine: `ZXing High-Contrast (${angle}°)` };
        }

        // ۲-ج) ZXing با GlobalHistogramBinarizer
        code = decodeImageDataWithZxing(imgData, true);
        if (code && code.length >= 2) {
          return { success: true, barcode: code, engine: `ZXing GlobalHistogram (${angle}°)` };
        }

        // ۲-د) بررسی ناحیه میانی و متمرکز تصویر (محل قرارگیری بارکد)
        const cropW = Math.floor(canvas.width * 0.85);
        const cropH = Math.floor(canvas.height * 0.55);
        const startX = Math.floor((canvas.width - cropW) / 2);
        const startY = Math.floor((canvas.height - cropH) / 2);
        const cropData = ctx.getImageData(startX, startY, cropW, cropH);

        code = decodeImageDataWithZxing(cropData, false);
        if (code && code.length >= 2) {
          return { success: true, barcode: code, engine: `ZXing Center Crop (${angle}°)` };
        }

        const cropBoosted = boostBarcodeContrast(cropData);
        code = decodeImageDataWithZxing(cropBoosted, true);
        if (code && code.length >= 2) {
          return { success: true, barcode: code, engine: `ZXing Crop Contrast (${angle}°)` };
        }
      }
    }

    // ۳. پاس سوم: تلاش نهایی با موتور Html5Qrcode
    try {
      const tempId = 'temp-native-file-scanner';
      let tempEl = document.getElementById(tempId);
      if (!tempEl) {
        tempEl = document.createElement('div');
        tempEl.id = tempId;
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);
      }
      const html5Qr = new Html5Qrcode(tempId);
      const fileRes = await html5Qr.scanFileV2(file as File, false);
      if (fileRes && fileRes.decodedText) {
        const clean = toEnglishDigits(fileRes.decodedText).trim();
        if (clean.length >= 2) {
          return { success: true, barcode: clean, engine: 'موتور پشتیبان تصویر Html5Qrcode' };
        }
      }
    } catch (_) {}

    return {
      success: false,
      barcode: '',
      engine: 'هیچ بارکد مشخصی در تصویر یافت نشد',
    };
  } catch (err: any) {
    console.error('Error decoding barcode from image:', err);
    return {
      success: false,
      barcode: '',
      engine: err.message || 'خطا در پردازش تصویر',
    };
  }
}
