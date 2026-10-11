import { useEffect, useRef } from 'react';
import { toEnglishDigits } from '../lib/utils';

type ScannerCallback = (barcode: string) => void;
interface ScannerOptions {
  onScan?: (barcode: string) => void;
  enabled?: boolean;
  /** Only this input is allowed to receive scanner keystrokes while an input has focus. */
  inputRef?: { current: HTMLInputElement | null };
}

/**
 * Listens for USB/Bluetooth keyboard-wedge barcode scanners.
 * Scanner input is accepted only when no text field is focused or when the
 * explicitly designated barcode field is focused. This avoids intercepting
 * ordinary typing in customer/search/form fields.
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
  const inputRef =
    typeof callbackOrOptions === 'object' ? callbackOrOptions?.inputRef : undefined;
  const isEnabled =
    typeof callbackOrOptions === 'object' && callbackOrOptions?.enabled !== undefined
      ? callbackOrOptions.enabled
      : enabledParam;

  useEffect(() => {
    if (!isEnabled || !onScan) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);
      const isBarcodeInput = !!inputRef?.current && activeEl === inputRef.current;

      // Do not hijack normal typing in any other field.
      if (isEditable && !isBarcodeInput) {
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
        return;
      }

      const now = performance.now();
      const elapsed = now - lastKeyTimeRef.current;
      if (elapsed > 160) bufferRef.current = '';
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const raw = bufferRef.current.trim();
        const code = toEnglishDigits(raw);
        bufferRef.current = '';

        // Only a rapid keyboard-wedge sequence is handled here. Slower manual
        // typing remains the responsibility of the input's normal form submit.
        if (code.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          onScan(code);
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Tab') {
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      bufferRef.current = '';
      lastKeyTimeRef.current = 0;
    };
  }, [onScan, isEnabled, inputRef]);
}
