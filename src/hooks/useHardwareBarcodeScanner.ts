import { useEffect, useRef } from 'react';
import { toEnglishDigits } from '../lib/utils';

type ScannerCallback = (barcode: string) => void;
interface ScannerOptions {
  onScan?: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * هوک گوش دادن به دستگاه‌های بارکدخوان سخت‌افزاری (USB، بی‌سیم، دانگل و بلوتوث)
 * - عملکرد فوق‌سریع و $O(1)$ بدون تأثیر بر عملکرد پردازنده
 * - تفکیک هوشمند تایپ سریع اسکنر بارکد (زیر ۸۰ میلی‌ثانیه بین کلیدها) از تایپ دست کاربر
 * - تبدیل خودکار ارقام فارسی/عربی به انگلیسی استاندارد
 */
export function useHardwareBarcodeScanner(
  callbackOrOptions: ScannerCallback | ScannerOptions,
  enabledParam: boolean = true
) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const onScan =
    typeof callbackOrOptions === 'function'
      ? callbackOrOptions
      : callbackOrOptions?.onScan;

  const isEnabled =
    typeof callbackOrOptions === 'object' && callbackOrOptions?.enabled !== undefined
      ? callbackOrOptions.enabled
      : enabledParam;

  useEffect(() => {
    if (!isEnabled || !onScan) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputOrTextarea =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // اسکنرهای سخت‌افزاری کاراکترها را با فاصله کمتر از ۵۰-۸۰ میلی‌ثانیه ارسال می‌کنند
      if (timeDiff > 90 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const raw = bufferRef.current.trim();
        const code = toEnglishDigits(raw);
        if (code.length >= 3) {
          onScan(code);
          bufferRef.current = '';
          if (!isInputOrTextarea) {
            e.preventDefault();
          }
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // تنها کاراکترهای تک‌حرفی قابل چاپ
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      bufferRef.current = '';
    };
  }, [onScan, isEnabled]);
}
