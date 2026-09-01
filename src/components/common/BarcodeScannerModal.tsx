import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Zap, ZapOff, CheckCircle2, AlertCircle, Search, Keyboard } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'اسکن بارکد با دوربین / بارکدخوان',
  subtitle = 'دوربین گوشی را مقابل بارکد استاندارد محصول (EAN-13، UPC یا Code-128) قرار دهید',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScannedCode(null);
      setCameraError(null);
      return;
    }

    startCameraSetup();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  async function startCameraSetup() {
    setCameraError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('دوربینی روی این دستگاه یافت نشد یا دسترسی دوربین داده نشده است.');
        return;
      }

      setCameras(devices);
      // ترجیح دوربین پشت (Environment / Back)
      const backCamera = devices.find(
        (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
      );
      const chosenId = backCamera ? backCamera.id : devices[devices.length - 1].id;
      setSelectedCameraId(chosenId);
      await startScannerWithCamera(chosenId);
    } catch (err: any) {
      console.error('Camera setup error:', err);
      setCameraError(err.message || 'خطا در دسترسی به دوربین. لطفاً دسترسی دوربین را در مرورگر فعال نمایید.');
    }
  }

  async function startScannerWithCamera(cameraId: string) {
    if (!cameraId) return;
    setCameraError(null);
    setIsScanning(true);

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode('barcode-scanner-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.3333,
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Ignore failed scan attempts
        }
      );

      // بررسی قابلیت فلش / چراغ قوه
      try {
        const track = (scanner as any).getRunningTrack?.();
        if (track && typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities();
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        }
      } catch (_) {}
    } catch (err: any) {
      console.error('Scanner start error:', err);
      setCameraError('امکان راه‌اندازی اسکنر دوربین وجود ندارد: ' + (err.message || ''));
      setIsScanning(false);
    }
  }

  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (e) {
      console.warn('Scanner stop warning:', e);
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
      isStoppingRef.current = false;
    }
  };

  const handleSuccessfulScan = (code: string) => {
    if (!code || code === lastScannedCode) return;
    setLastScannedCode(code);

    // بازخورد صوتی و ویبره
    try {
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
      playScanBeep();
    } catch (_) {}

    onScan(code);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const track = (scannerRef.current as any).getRunningTrack?.();
      if (track) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      }
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const handleCameraSwitch = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    await startScannerWithCamera(cameraId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm md:text-base">{title}</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/80 dark:bg-stone-700/80 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport / Scanner */}
        <div className="relative bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          <div id="barcode-scanner-reader" className="w-full max-w-full overflow-hidden" />

          {/* Guide Overlay & Reticle */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-40 border-2 border-amber-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative flex items-center justify-center">
                {/* Scan line laser effect */}
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                <span className="text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                  بارکد را در این کادر نگه دارید
                </span>
              </div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-6 text-center text-stone-300 max-w-sm flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm">{cameraError}</p>
              <button
                onClick={startCameraSetup}
                className="mt-2 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-amber-400 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تلاش مجدد اتصال به دوربین
              </button>
            </div>
          )}

          {/* Success Overlay */}
          {lastScannedCode && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-white gap-2 animate-in zoom-in-90 duration-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <span className="text-sm font-bold text-emerald-200">بارکد با موفقیت اسکن شد!</span>
              <span className="font-mono text-lg text-white font-bold bg-emerald-900/60 px-4 py-1.5 rounded-xl border border-emerald-500/30">
                {lastScannedCode}
              </span>
            </div>
          )}
        </div>

        {/* Controls & Quick Actions */}
        <div className="p-4 bg-stone-50 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => handleCameraSwitch(e.target.value)}
                className="text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-2.5 py-2 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[200px]"
              >
                {cameras.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `دوربین شماره ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  torchOn
                    ? 'bg-amber-500 text-stone-950 border-amber-500'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                }`}
              >
                {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {torchOn ? 'خاموشی فلش' : 'روشن کردن چراغ'}
              </button>
            )}

            <div className="text-[11px] text-stone-500 dark:text-stone-400 mr-auto flex items-center gap-1">
              <span>دستگاه بارکدخوان USB/بلوتوث نیز پشتیبانی می‌شود.</span>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="یا بارکد را به صورت دستی تایپ کنید..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <Keyboard className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-bold rounded-xl text-xs transition-colors disabled:opacity-40"
            >
              ثبت بارکد
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
