import { useEffect, useRef } from 'react';
import { toEnglishDigits } from '../lib/utils';

type ScannerCallback = (barcode: string) => void;
interface ScannerOptions {
  onScan?: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * هوک جامع گوش دادن به دستگاه‌های بارکدخوان فیزیکی (USB و بی‌سیم/بلوتوث)
 * سازگار با ارسال مستقیم تابع یا آبجکت آپشن‌ها، همراه با تبدیل خودکار اعداد فارسی به انگلیسی
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

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // اگر فاصله دو کلید بیشتر از ۸۰ میلی‌ثانیه باشد، بافر را پاک می‌کنیم چون تایپ کند دست انسان است
      if (timeDiff > 80 && bufferRef.current.length > 0) {
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

      // تنها کاراکترهای تک‌حرفی قابل چاپ (اعداد و حروف)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, isEnabled]);
}

