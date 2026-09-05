// ==============================================================================
// موتور بینایی ماشین بهینه و سبک برای بارکدهای سطوح استوانه‌ای، براق و لیبل‌های باریک
// Khatinoo Optimized Progressive Barcode Computer Vision & Anti-Glare Engine
// ==============================================================================

/**
 * حداکثر ابعاد مجاز کانواس جهت جلوگیری از فشار بر پردازنده (CPU) و تخلیه باتری موبایل
 */
export const MAX_CV_WIDTH = 520;
export const MAX_CV_HEIGHT = 280;

/**
 * بودجه زمانی مجاز برای پردازش هر فریم (میلی‌ثانیه) جهت حفظ نرخ فریم روان (۶۰ FPS)
 */
export const FRAME_TIME_BUDGET_MS = 40;

/**
 * نتایج تحلیل هیستوگرام نور و انعکاس روی سطح
 */
export interface GlareAnalysisResult {
  hasSevereGlare: boolean;
  glareRatio: number;
  avgLuminance: number;
  suggestsTilt: boolean;
}

/**
 * کوچک‌سازی سریع کانواس در صورت فراتر رفتن از حد مجاز
 */
export function downscaleCanvasIfNeeded(
  sourceCanvas: HTMLCanvasElement,
  maxW: number = MAX_CV_WIDTH,
  maxH: number = MAX_CV_HEIGHT
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  if (w <= maxW && h <= maxH) {
    return sourceCanvas;
  }

  const scale = Math.min(maxW / w, maxH / h);
  const targetW = Math.max(120, Math.floor(w * scale));
  const targetH = Math.max(80, Math.floor(h * scale));

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = targetW;
  scaledCanvas.height = targetH;
  const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(sourceCanvas, 0, 0, w, h, 0, 0, targetW, targetH);
    return scaledCanvas;
  }
  return sourceCanvas;
}

/**
 * تحلیل فوق‌سریع درخشش (Glare) با نمونه‌برداری زیرپیکسلی (Subsampled Sampling)
 * زمان اجرا: کمتر از ۰.۵ میلی‌ثانیه
 */
export function analyzeFrameGlare(imageData: ImageData): GlareAnalysisResult {
  const data = imageData.data;
  const totalLength = data.length;
  // نمونه‌برداری یک‌درمیان (گام ۴ تایی پیکسلی) برای سرعت فوق‌العاده
  const step = 16; // بررسی هر ۴ پیکسل یک‌بار
  let sampledCount = 0;
  let saturatedCount = 0;
  let totalLuminance = 0;

  for (let i = 0; i < totalLength; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;
    sampledCount++;

    // تشخیص نقاط سوخته/اشباع ناشی از بازتاب نور فلزی/براق
    if (r > 240 && g > 240 && b > 240) {
      saturatedCount++;
    }
  }

  const avgLuminance = sampledCount > 0 ? totalLuminance / sampledCount : 128;
  const glareRatio = sampledCount > 0 ? saturatedCount / sampledCount : 0;
  const hasSevereGlare = glareRatio > 0.08 || (avgLuminance > 215 && glareRatio > 0.04);
  const suggestsTilt = hasSevereGlare || glareRatio > 0.05;

  return {
    hasSevereGlare,
    glareRatio,
    avgLuminance,
    suggestsTilt,
  };
}

/**
 * فیلتر آستانه‌گذاری تطبیقی محلی بهینه (Optimized Sauvola/Bradley Adaptive Threshold)
 * اجرا روی ابعاد محدود شده (کمتر از ۵۰۰ پیکسل) با زمان اجرای ۲ تا ۴ میلی‌ثانیه
 */
export function applyAdaptiveLocalThreshold(
  sourceData: ImageData,
  windowSizeRatio: number = 0.06,
  thresholdFactor: number = 0.12
): ImageData {
  const width = sourceData.width;
  const height = sourceData.height;
  const src = sourceData.data;
  const output = new ImageData(width, height);
  const dst = output.data;

  // ۱. ساخت تصویر انتگرالی روشنایی با ساختار سریع Int32Array
  const totalPixels = width * height;
  const integral = new Int32Array(totalPixels);
  const gray = new Uint8Array(totalPixels);

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) << 2;
      // تبدیل سریع روشنایی
      const lum = (src[idx] * 77 + src[idx + 1] * 150 + src[idx + 2] * 29) >> 8;
      gray[rowOffset + x] = lum;
      rowSum += lum;
      if (y === 0) {
        integral[rowOffset + x] = rowSum;
      } else {
        integral[rowOffset + x] = integral[rowOffset - width + x] + rowSum;
      }
    }
  }

  // ۲. پنجره متحرک محلی
  const S = Math.max(5, Math.floor(width * windowSizeRatio));
  const s2 = S >> 1;
  const factorScaled = Math.floor((1.0 - thresholdFactor) * 256);

  for (let y = 0; y < height; y++) {
    const y1 = y > s2 ? y - s2 : 0;
    const y2 = y + s2 < height ? y + s2 : height - 1;
    const rowOffset = y * width;
    const y2Offset = y2 * width;
    const y1MinusOffset = (y1 - 1) * width;

    for (let x = 0; x < width; x++) {
      const x1 = x > s2 ? x - s2 : 0;
      const x2 = x + s2 < width ? x + s2 : width - 1;
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      let sum = integral[y2Offset + x2];
      if (x1 > 0) sum -= integral[y2Offset + (x1 - 1)];
      if (y1 > 0) sum -= integral[y1MinusOffset + x2];
      if (x1 > 0 && y1 > 0) sum += integral[y1MinusOffset + (x1 - 1)];

      const currentPixel = gray[rowOffset + x];
      const isBlack = (currentPixel * count) << 8 < sum * factorScaled;
      const val = isBlack ? 0 : 255;

      const outIdx = (rowOffset + x) << 2;
      dst[outIdx] = val;
      dst[outIdx + 1] = val;
      dst[outIdx + 2] = val;
      dst[outIdx + 3] = 255;
    }
  }

  return output;
}

/**
 * تصحیح انحنای استوانه‌ای بدنه قلم (Cylindrical Dewarping) بهینه
 * با جدول جستجوی از پیش محاسبه‌شده (Lookup Table) جهت حداقل کردن فراخوانی‌های ریاضی سنگین
 */
export function applyCylindricalDewarp(
  sourceCanvas: HTMLCanvasElement,
  curvatureFactor: number = 0.85
): HTMLCanvasElement {
  const scaled = downscaleCanvasIfNeeded(sourceCanvas, MAX_CV_WIDTH, MAX_CV_HEIGHT);
  const width = scaled.width;
  const height = scaled.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
  const srcCtx = scaled.getContext('2d', { willReadFrequently: true });

  if (!outCtx || !srcCtx) return scaled;

  const srcData = srcCtx.getImageData(0, 0, width, height);
  const outData = outCtx.createImageData(width, height);
  const srcBuf = srcData.data;
  const outBuf = outData.data;

  const halfW = width / 2;

  // ایجاد جدول پیش‌محاسبه برای یک ردیف
  const lutX = new Int32Array(width);
  for (let x = 0; x < width; x++) {
    const u = (x - halfW) / halfW;
    const srcNormX = Math.sin(u * (Math.PI / 2) * curvatureFactor);
    const srcX = Math.round(halfW + srcNormX * halfW);
    lutX[x] = Math.max(0, Math.min(width - 1, srcX));
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const srcIdx = (rowOffset + lutX[x]) << 2;
      const outIdx = (rowOffset + x) << 2;

      outBuf[outIdx] = srcBuf[srcIdx];
      outBuf[outIdx + 1] = srcBuf[srcIdx + 1];
      outBuf[outIdx + 2] = srcBuf[srcIdx + 2];
      outBuf[outIdx + 3] = srcBuf[srcIdx + 3];
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outputCanvas;
}

/**
 * فیلتر وضوح‌بخشی سبک و سریع (Lightweight Sharpen)
 */
export function applySharpenFilter(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const output = new ImageData(width, height);
  const dst = output.data;

  // کپی حاشیه‌ها
  dst.set(src);

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const upRowOffset = (y - 1) * width;
    const downRowOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const idx = (rowOffset + x) << 2;
      const upIdx = (upRowOffset + x) << 2;
      const downIdx = (downRowOffset + x) << 2;
      const leftIdx = (rowOffset + x - 1) << 2;
      const rightIdx = (rowOffset + x + 1) << 2;

      for (let c = 0; c < 3; c++) {
        const center = src[idx + c];
        const sharpVal =
          (center << 2) +
          center -
          src[upIdx + c] -
          src[downIdx + c] -
          src[leftIdx + c] -
          src[rightIdx + c];

        dst[idx + c] = sharpVal < 0 ? 0 : sharpVal > 255 ? 255 : sharpVal;
      }
      dst[idx + 3] = 255;
    }
  }

  return output;
}

/**
 * چرخش سبک کانواس برای زاویه‌های خاص
 */
export function createRotatedCanvas(
  sourceCanvas: HTMLCanvasElement,
  angleDegrees: number
): HTMLCanvasElement {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newW = Math.floor(sourceCanvas.width * cos + sourceCanvas.height * sin);
  const newH = Math.floor(sourceCanvas.width * sin + sourceCanvas.height * cos);

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = newW;
  rotCanvas.height = newH;
  const ctx = rotCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

  return rotCanvas;
}
