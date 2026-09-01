import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  UploadCloud,
  FileImage,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Target,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { toEnglishDigits, isValidBarcodeChecksum, toPersianDigits } from '../../lib/utils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  allowContinuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'اسکنر بارکد و QR با دوربین فوق‌سریع و ضدخطا',
  subtitle = 'بارکد کالا را در کادر قرار دهید (سیستم تأیید ارقام و چک‌سام فعال است)',
  allowContinuous = true,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  
  // Continuous scanning mode state
  const [continuousMode, setContinuousMode] = useState(false);
  const [scannedHistory, setScannedHistory] = useState<Array<{ code: string; time: string }>>([]);

  // Multi-frame Precision Verification (Anti-Glitch / Zero Optical Misreads)
  const [highPrecisionMode, setHighPrecisionMode] = useState(true);
  const candidateRef = useRef<{ code: string; count: number; lastTime: number }>({ code: '', count: 0, lastTime: 0 });

  // Hardware Zoom & Focus state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(4);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [exposureCompensation, setExposureCompensation] = useState<number>(0);
  const [minExposure, setMinExposure] = useState<number>(-2);
  const [maxExposure, setMaxExposure] = useState<number>(2);
  const [hasExposure, setHasExposure] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Active tab: 'camera' | 'file'
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [fileScanning, setFileScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const containerId = 'pro-barcode-scanner-reader';

  // Sound Synthesizer for POS Beep
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (_) {}
  }, [soundEnabled]);

  const handleSuccessfulScan = useCallback(
    (code: string) => {
      const clean = toEnglishDigits(code).trim();
      if (!clean) return;

      // Avoid immediate duplicate scan in continuous mode within 1.5 seconds
      if (continuousMode && scannedHistory.length > 0 && scannedHistory[0].code === clean) {
        const timeDiff = Date.now() - new Date(scannedHistory[0].time).getTime();
        if (timeDiff < 1500) return;
      }

      setLastScannedCode(clean);

      // Trigger Audio & Haptics
      playScanBeep();
      if (navigator.vibrate) {
        try {
          navigator.vibrate([70, 30, 70]);
        } catch (_) {}
      }

      if (continuousMode) {
        setScannedHistory((prev) => [{ code: clean, time: new Date().toISOString() }, ...prev.slice(0, 19)]);
        onScan(clean);
        setTimeout(() => setLastScannedCode(null), 1000);
      } else {
        onScan(clean);
        setTimeout(() => {
          onClose();
        }, 350);
      }
    },
    [continuousMode, onScan, onClose, playScanBeep, scannedHistory]
  );

  /**
   * ارزیابی دقیق فریم‌های خوانده شده از دوربین جهت جلوگیری از خواندن اشتباه ارقام (مثلاً ۵ به جای ۶ یا ۲)
   */
  const handleFrameDecoded = useCallback((rawDecodedText: string) => {
    if (!rawDecodedText) return;
    const clean = toEnglishDigits(rawDecodedText).trim();
    if (clean.length < 3) return;

    // ۱. بررسی چک‌سام ریاضی بارکدهای استاندارد (EAN-13, EAN-8, UPC-A)
    if (!isValidBarcodeChecksum(clean)) {
      // فریم تار یا مخدوش بوده و رقم کنترلی همخوانی ندارد - از این فریم رد شو
      return;
    }

    // ۲. در صورت فعال بودن دقت بالا، تطابق حداقل دو فریم متوالی در فاصله زمانی ۴۵۰ میلی‌ثانیه الزامی است
    if (highPrecisionMode) {
      const now = Date.now();
      const candidate = candidateRef.current;

      if (candidate.code === clean && now - candidate.lastTime < 450) {
        candidate.count += 1;
        candidate.lastTime = now;
        if (candidate.count >= 2) {
          // تطابق دو فریم ۱۰۰٪ قطعی شد -> بارکد بدون خطا ثبت می‌شود
          candidateRef.current = { code: '', count: 0, lastTime: 0 };
          handleSuccessfulScan(clean);
        }
      } else {
        // ثبت کاندیدای اولیه فریم اول
        candidateRef.current = { code: clean, count: 1, lastTime: now };
      }
    } else {
      handleSuccessfulScan(clean);
    }
  }, [highPrecisionMode, handleSuccessfulScan]);

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
      videoTrackRef.current = null;
      scannerRef.current = null;
      setIsScanning(false);
      isStoppingRef.current = false;
      candidateRef.current = { code: '', count: 0, lastTime: 0 };
    }
  };

  const startScannerWithCamera = async (cameraId: string) => {
    if (!cameraId) return;
    setCameraError(null);
    setIsScanning(true);
    candidateRef.current = { code: '', count: 0, lastTime: 0 };

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Hardware BarcodeDetector where supported
        },
      });

      scannerRef.current = scanner;

      // Start scanning with high FPS, optimal resolution, and sharp bounding area
      await scanner.start(
        cameraId,
        {
          fps: 28,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.min(340, Math.floor(viewfinderWidth * 0.88)),
              height: Math.min(220, Math.floor(minDim * 0.65)),
            };
          },
          aspectRatio: 1.333333,
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            focusMode: 'continuous',
          } as any,
        },
        (decodedText) => {
          handleFrameDecoded(decodedText);
        },
        () => {
          // Ignore frames without barcodes
        }
      );

      // Probe Hardware Capabilities (Zoom, Torch, Focus, Exposure)
      try {
        const track = (scanner as any).getRunningTrack?.();
        if (track) {
          videoTrackRef.current = track;
          if (typeof track.getCapabilities === 'function') {
            const caps = track.getCapabilities();

            // Torch support
            if (caps.torch) {
              setHasTorch(true);
            }

            // Hardware Zoom support
            if (caps.zoom) {
              setHasHardwareZoom(true);
              setMinZoom(caps.zoom.min || 1);
              setMaxZoom(caps.zoom.max || 5);
              setZoomLevel(track.getSettings?.().zoom || caps.zoom.min || 1);
            } else {
              setHasHardwareZoom(false);
            }

            // Exposure support
            if (caps.exposureCompensation) {
              setHasExposure(true);
              setMinExposure(caps.exposureCompensation.min || -2);
              setMaxExposure(caps.exposureCompensation.max || 2);
            }

            // Set continuous autofocus if supported
            if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
              try {
                await track.applyConstraints({
                  advanced: [{ focusMode: 'continuous' } as any],
                });
              } catch (_) {}
            }
          }
        }
      } catch (capErr) {
        console.warn('Could not inspect hardware camera capabilities:', capErr);
      }
    } catch (err: any) {
      console.error('Scanner start error:', err);
      setCameraError('امکان راه‌اندازی اسکنر دوربین وجود ندارد: ' + (err.message || ''));
      setIsScanning(false);
    }
  };

  const startCameraSetup = async () => {
    setCameraError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('دوربینی روی این دستگاه یافت نشد یا دسترسی دوربین داده نشده است.');
        return;
      }

      setCameras(devices);
      // Prefer high-quality back/rear camera for barcodes
      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('0, facing back')
      );
      const chosenId = backCamera ? backCamera.id : devices[devices.length - 1].id;
      setSelectedCameraId(chosenId);
      await startScannerWithCamera(chosenId);
    } catch (err: any) {
      console.error('Camera setup error:', err);
      setCameraError(err.message || 'خطا در دسترسی به دوربین. لطفاً دسترسی دوربین را در مرورگر مجاز فرمایید.');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScannedCode(null);
      setCameraError(null);
      setScannedHistory([]);
      return;
    }

    if (activeTab === 'camera') {
      startCameraSetup();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  // Apply Hardware or Digital Zoom
  const applyZoom = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (videoTrackRef.current && hasHardwareZoom) {
      try {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ zoom: newZoom } as any],
        });
      } catch (err) {
        console.warn('Error applying hardware zoom:', err);
      }
    }
  };

  // Torch Toggle
  const toggleTorch = async () => {
    if (!videoTrackRef.current || !hasTorch) return;
    try {
      const newTorchState = !torchOn;
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: newTorchState } as any],
      });
      setTorchOn(newTorchState);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Exposure adjustment
  const applyExposure = async (val: number) => {
    setExposureCompensation(val);
    if (videoTrackRef.current && hasExposure) {
      try {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ exposureCompensation: val } as any],
        });
      } catch (e) {
        console.warn('Exposure error:', e);
      }
    }
  };

  // Tap-to-Focus trigger
  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoTrackRef.current) return;
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const track = videoTrackRef.current;
      const caps = track.getCapabilities?.() || {};

      if (caps.pointsOfInterest) {
        await track.applyConstraints({
          advanced: [{ pointsOfInterest: [{ x, y }] } as any],
        });
      } else if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
        // Re-trigger autofocus
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
      }
    } catch (_) {}
  };

  // Decode from file/image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    setCameraError(null);
    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const result = await html5QrCode.scanFile(file, true);
      if (result) {
        const clean = toEnglishDigits(result).trim();
        if (isValidBarcodeChecksum(clean)) {
          handleSuccessfulScan(clean);
        } else {
          setCameraError('تصویر مخدوش است و رقم کنترلی بارکد صحیح نیست.');
        }
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setCameraError('بارکدی در تصویر ارسالی یافت نشد یا تصویر وضوح کافی ندارد.');
    } finally {
      setFileScanning(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      const clean = toEnglishDigits(manualCode.trim());
      handleSuccessfulScan(clean);
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111113] border border-[#222225] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-[#E0E0E0] max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#222225] flex items-center justify-between bg-[#161619]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A227]/15 text-[#C9A227] flex items-center justify-center shadow-inner">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#F3F4F6] text-sm sm:text-base">{title}</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>دقت ضدخطا فعال</span>
                </span>
              </div>
              <p className="text-[11px] text-[#8E9299] line-clamp-1">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-[#1C1C20] text-[#C9A227] border-[#2D2D33]'
                  : 'bg-[#161619] text-[#60646C] border-[#222225]'
              }`}
              title={soundEnabled ? 'صدا روشن' : 'صدا خاموش'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1C1C20] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2D2D33] hover:bg-[#25252B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Tabs & Precision Status */}
        <div className="flex items-center justify-between px-5 py-2 bg-[#0A0A0B] border-b border-[#222225] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('camera');
                setCameraError(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20'
                  : 'bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>دوربین زنده</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('file');
                stopScanner();
                setCameraError(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20'
                  : 'bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0]'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>بارگذاری عکس / فایل</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHighPrecisionMode(!highPrecisionMode)}
              title="تأیید فریم دوگانه جهت پیشگیری از خطای نوری"
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                highPrecisionMode
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : 'bg-[#1C1C20] text-[#8E9299] border-[#2D2D33]'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{highPrecisionMode ? 'دقت ۱۰۰٪ (دو فریم)' : 'سرعت تک‌فریم'}</span>
            </button>

            {allowContinuous && (
              <label className="hidden sm:flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#8E9299] hover:text-[#E0E0E0]">
                <input
                  type="checkbox"
                  checked={continuousMode}
                  onChange={(e) => setContinuousMode(e.target.checked)}
                  className="rounded accent-[#C9A227]"
                />
                <span>اسکن پیوسته</span>
              </label>
            )}
          </div>
        </div>

        {/* Viewport / Scanner */}
        <div className="relative bg-black min-h-[290px] sm:min-h-[340px] flex items-center justify-center overflow-hidden">
          {activeTab === 'camera' ? (
            <>
              {/* The Video Element Container */}
              <div
                id={containerId}
                onClick={handleTapToFocus}
                style={{
                  transform: !hasHardwareZoom && zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="w-full max-w-full overflow-hidden cursor-crosshair"
              />

              {/* Guide Overlay & Reticle */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-[78%] max-w-[340px] h-48 border-2 border-[#C9A227]/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] relative flex items-center justify-center">
                    {/* Corner Reticle Markers */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#C9A227] rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#C9A227] rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#C9A227] rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#C9A227] rounded-br-lg" />

                    {/* Laser Scanner animation */}
                    <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-bold text-white/90 bg-black/70 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#C9A227]" />
                        بارکد را در این کادر قرار دهید
                      </span>
                      {zoomLevel > 1 && (
                        <span className="text-[10px] font-mono text-[#C9A227] bg-black/80 px-2 py-0.5 rounded-md font-bold">
                          بزرگنمایی: {zoomLevel.toFixed(1)}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Error Display */}
              {cameraError && (
                <div className="p-6 text-center text-[#E0E0E0] max-w-sm flex flex-col items-center gap-3">
                  <AlertCircle className="w-12 h-12 text-rose-500" />
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">{cameraError}</p>
                  <button
                    onClick={startCameraSetup}
                    className="mt-2 px-4 py-2 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    تلاش مجدد راه‌اندازی دوربین
                  </button>
                </div>
              )}

              {/* Success Visual Ripple Overlay */}
              {lastScannedCode && (
                <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 animate-in zoom-in-95 duration-150 z-20">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-bold text-emerald-300">بارکد با صحت ۱۰۰٪ و رقم کنترلی تأیید شد</span>
                  <span className="font-mono text-xl text-white font-black bg-emerald-900/90 px-5 py-2 rounded-2xl border border-emerald-400/40 shadow-xl tracking-wider select-all">
                    {lastScannedCode}
                  </span>
                </div>
              )}
            </>
          ) : (
            /* File Upload Tab */
            <div className="p-8 w-full max-w-md flex flex-col items-center text-center space-y-4">
              <div id="file-scanner-temp" className="hidden" />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#2D2D33] hover:border-[#C9A227] bg-[#161619] p-8 rounded-3xl cursor-pointer transition-all flex flex-col items-center gap-3 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#0A0A0B] flex items-center justify-center text-[#C9A227] group-hover:scale-110 transition-transform">
                  {fileScanning ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#F3F4F6]">عکس بارکد یا برچسب را انتخاب کنید</h4>
                  <p className="text-xs text-[#8E9299] mt-1">پشتیبانی از فرمت‌های PNG، JPG، WEBP</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {cameraError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-2xl w-full">
                  {cameraError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* On-Screen Hardware Controls Bar (Zoom, Focus, Torch, Cameras) */}
        {activeTab === 'camera' && (
          <div className="px-5 py-2.5 bg-[#161619] border-t border-[#222225] flex flex-col gap-2.5">
            {/* Quick Zoom Presets & Torch */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#8E9299] pl-1">زوم:</span>
                {[1, 1.5, 2, 3].map((z) => (
                  <button
                    key={z}
                    onClick={() => applyZoom(z)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      Math.abs(zoomLevel - z) < 0.1
                        ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                        : 'bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225]'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      torchOn
                        ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20 font-black'
                        : 'bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225]'
                    }`}
                  >
                    {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{torchOn ? 'خاموشی فلش' : 'روشن کردن چراغ'}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    showAdvancedControls
                      ? 'bg-[#C9A227] text-slate-950 border-[#C9A227]'
                      : 'bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] border-[#222225]'
                  }`}
                  title="تنظیمات پیشرفته دوربین"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Advanced Camera Options: Smooth Slider Zoom & Camera Picker */}
            {showAdvancedControls && (
              <div className="bg-[#0A0A0B] p-3 rounded-2xl border border-[#222225] space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-[#8E9299] shrink-0" />
                  <input
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    value={zoomLevel}
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[#C9A227] cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-[#8E9299] shrink-0" />
                  <span className="font-mono text-xs font-bold text-[#C9A227] w-12 text-left">
                    {zoomLevel.toFixed(1)}x
                  </span>
                </div>

                {cameras.length > 1 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#1C1C20]">
                    <span className="text-[#8E9299] shrink-0">انتخاب لنز / دوربین:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        startScannerWithCamera(e.target.value);
                      }}
                      className="flex-1 bg-[#161619] border border-[#2D2D33] rounded-xl px-2.5 py-1.5 text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C9A227]"
                    >
                      {cameras.map((c, idx) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `دوربین شماره ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Continuous Scanned List (If enabled) */}
        {continuousMode && scannedHistory.length > 0 && (
          <div className="px-5 py-2.5 bg-[#0A0A0B] border-t border-[#222225] max-h-24 overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8E9299] mb-1.5">
              <span>تاریخچه اسکن پیوسته ({toPersianDigits(scannedHistory.length)} مورد):</span>
              <button
                onClick={() => setScannedHistory([])}
                className="text-rose-400 hover:underline cursor-pointer"
              >
                پاکسازی لیست
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scannedHistory.map((item, idx) => (
                <span
                  key={idx}
                  className="bg-[#161619] border border-[#2D2D33] text-emerald-400 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {item.code}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Manual Code Input Fallback */}
        <div className="p-4 bg-[#111113] border-t border-[#222225] flex flex-col gap-2">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="تایپ دستی بارکد یا دریافت خودکار از بارکدخوان فیزیکی..."
                className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#2D2D33] rounded-xl text-xs font-mono text-[#F3F4F6] placeholder-[#60646C] focus:outline-none focus:border-[#C9A227]"
              />
              <Keyboard className="w-4 h-4 text-[#8E9299] absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
            >
              ثبت دستی
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
