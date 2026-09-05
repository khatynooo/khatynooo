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
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Target,
  ScanLine,
  ShieldCheck,
  FileImage,
  UploadCloud,
  Layers,
  SunMedium,
  Compass,
} from 'lucide-react';
import { toEnglishDigits, toPersianDigits } from '../../lib/utils';
import {
  analyzeFrameGlare,
  applyAdaptiveLocalThreshold,
  applyCylindricalDewarp,
  applySharpenFilter,
  createRotatedCanvas,
  MAX_CV_WIDTH,
  MAX_CV_HEIGHT,
  FRAME_TIME_BUDGET_MS,
} from '../../lib/barcodeVisionEngine';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  allowContinuous?: boolean;
  defaultCurvedSurfaceMode?: boolean;
}

const ALL_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'اسکنر بارکد با خط لیزر قرمز',
  subtitle = 'تشخیص خودکار و فوق‌سریع انواع بارکدهای خطی، جعبه، سطوح استوانه‌ای و برچسب‌های ریز',
  allowContinuous = true,
  defaultCurvedSurfaceMode = true,
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

  // Laser aiming line toggle & visual effect state
  const [showLaserBeam, setShowLaserBeam] = useState(true);
  const [laserScanSuccessFlash, setLaserScanSuccessFlash] = useState(false);

  // Continuous scanning mode
  const [continuousMode, setContinuousMode] = useState(false);
  const [scannedHistory, setScannedHistory] = useState<Array<{ code: string; time: string }>>([]);

  // Curved surface / Cylindrical mode
  const [curvedSurfaceMode, setCurvedSurfaceMode] = useState(defaultCurvedSurfaceMode);
  const [isGlareDetected, setIsGlareDetected] = useState(false);
  const [glareRatioPercent, setGlareRatioPercent] = useState<number>(0);
  const lastGlareCheckTimeRef = useRef<number>(0);

  // Zoom & Hardware capabilities
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
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Scanner & Video References
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const isStoppingRef = useRef(false);
  const isProcessingScanRef = useRef(false);
  const containerId = 'pro-barcode-scanner-reader';

  // Vision Pipeline & Concurrent Native Detector
  const nativeBarcodeDetectorRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const consecutiveMissesRef = useRef<number>(0);
  const progressivePassIndexRef = useRef<number>(0);

  // Initialize Native BarcodeDetector if available in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'code_93',
          'itf',
          'codabar',
          'qr_code',
          'data_matrix',
        ];
        nativeBarcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats });
      } catch (e) {
        nativeBarcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Audio Synthesizer for POS Beep
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2200, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (_) {}
  }, [soundEnabled]);

  const handleSuccessfulScan = useCallback(
    (code: string) => {
      const clean = toEnglishDigits(code).replace(/[\r\n\t]/g, '').trim();
      if (!clean || clean.length < 2) return;

      // In non-continuous mode, prevent multiple firings while closing
      if (isProcessingScanRef.current && !continuousMode) return;

      // In continuous mode, avoid duplicate scan of the SAME code within 1.8 seconds
      if (continuousMode && scannedHistory.length > 0 && scannedHistory[0].code === clean) {
        const timeDiff = Date.now() - new Date(scannedHistory[0].time).getTime();
        if (timeDiff < 1800) return;
      }

      isProcessingScanRef.current = true;
      consecutiveMissesRef.current = 0;
      setLastScannedCode(clean);

      // Trigger Laser Green Flash
      setLaserScanSuccessFlash(true);
      setTimeout(() => setLaserScanSuccessFlash(false), 300);

      // Trigger instant Audio & Haptics
      playScanBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(70);
        } catch (_) {}
      }

      if (continuousMode) {
        setScannedHistory((prev) => [
          { code: clean, time: new Date().toISOString() },
          ...prev.slice(0, 24),
        ]);
        onScan(clean);
        setTimeout(() => {
          setLastScannedCode(null);
          isProcessingScanRef.current = false;
        }, 900);
      } else {
        // Immediately notify parent / POS
        onScan(clean);
        // Show brief visual confirmation (250ms) then close
        setTimeout(() => {
          onClose();
        }, 250);
      }
    },
    [continuousMode, onScan, onClose, playScanBeep, scannedHistory]
  );

  const handleFrameDecoded = useCallback(
    (rawDecodedText: string, _format?: string) => {
      if (!rawDecodedText) return;
      if (isProcessingScanRef.current && !continuousMode) return;

      const clean = toEnglishDigits(rawDecodedText).replace(/[\r\n\t]/g, '').trim();
      if (clean.length < 2) return;

      handleSuccessfulScan(clean);
    },
    [handleSuccessfulScan, continuousMode]
  );

  // Apply Hardware or Digital Zoom
  const applyZoom = useCallback(async (newZoom: number) => {
    setZoomLevel(newZoom);
    const track = videoTrackRef.current;
    if (track) {
      try {
        if (typeof track.getCapabilities === 'function') {
          const caps = (track.getCapabilities() || {}) as any;
          if (caps?.zoom) {
            const clamped = Math.max(caps.zoom.min || 1, Math.min(caps.zoom.max || 5, newZoom));
            await track.applyConstraints({
              advanced: [{ zoom: clamped } as any],
            });
          }
        }
      } catch (_) {}
    }
  }, []);

  // Stop scanner and release hardware resources cleanly
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    // Cancel vision animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    try {
      if (scannerInstanceRef.current) {
        const scanner = scannerInstanceRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
        scannerInstanceRef.current = null;
      }

      if (videoTrackRef.current) {
        try {
          videoTrackRef.current.stop();
        } catch (_) {}
        videoTrackRef.current = null;
      }
    } catch (e) {
      console.warn('Scanner cleanup note:', e);
    } finally {
      setIsScanning(false);
      isStoppingRef.current = false;
      isProcessingScanRef.current = false;
      consecutiveMissesRef.current = 0;
    }
  }, []);

  /**
   * Start Html5Qrcode Scanner on container
   */
  const startScannerWithCamera = async (cameraId: string) => {
    setCameraError(null);
    setIsScanning(true);
    isProcessingScanRef.current = false;

    try {
      await stopScanner();

      // Check for HTTPS / secure context
      if (
        typeof window !== 'undefined' &&
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setCameraError('دسترسی به دوربین در مرورگرها فقط روی بستر امن HTTPS مجاز است.');
        setIsScanning(false);
        return;
      }

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: ALL_FORMATS,
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      scannerInstanceRef.current = scanner;

      const scanConfig = {
        fps: 22,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // A wide rectangular scan window aligned with the red laser line
          const width = Math.min(Math.floor(viewfinderWidth * 0.94), 480);
          const height = Math.min(Math.floor(viewfinderHeight * 0.65), 240);
          return { width, height };
        },
        videoConstraints: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          facingMode: cameraId ? undefined : { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      };

      await scanner.start(
        cameraId || { facingMode: 'environment' },
        scanConfig,
        (decodedText, result) => {
          const formatName = (result as any)?.result?.format?.formatName;
          handleFrameDecoded(decodedText, formatName);
        },
        () => {
          // Frame missed, continuous scanning
        }
      );

      // Extract running video track for Torch, Zoom & Advanced Hardware Control
      try {
        const track = (scanner as any).getRunningTrack?.();
        if (track) {
          videoTrackRef.current = track;
          if (typeof track.getCapabilities === 'function') {
            const caps = (track.getCapabilities() || {}) as any;
            if (caps?.torch) setHasTorch(true);
            if (caps?.zoom) {
              setHasHardwareZoom(true);
              setMinZoom(caps.zoom.min || 1);
              setMaxZoom(caps.zoom.max || 5);
              const currentZ = (track.getSettings?.() as any)?.zoom;
              setZoomLevel(currentZ || caps.zoom.min || 1);
            }
            if (caps?.exposureCompensation) {
              setHasExposure(true);
              setMinExposure(caps.exposureCompensation.min || -2);
              setMaxExposure(caps.exposureCompensation.max || 2);
            }

            // Continuous auto focus & exposure
            const advancedConstraints: any[] = [];
            if (caps?.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
              advancedConstraints.push({ focusMode: 'continuous' });
            }
            if (caps?.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
              advancedConstraints.push({ exposureMode: 'continuous' });
            }
            if (advancedConstraints.length > 0) {
              try {
                await track.applyConstraints({ advanced: advancedConstraints });
              } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // Start Concurrent Hardware & Cylindrical Vision Loop on the active video element
      startAuxiliaryVisionLoop();
    } catch (err: any) {
      console.error('Scanner start error:', err);
      let msg = 'امکان راه‌اندازی دوربین وجود ندارد.';
      const errName = err.name || '';
      const errMsg = err.message || '';

      if (errName === 'NotAllowedError' || errMsg.includes('Permission')) {
        msg = 'دسترسی به دوربین توسط مرورگر مسدود شده است. لطفاً دسترسی دوربین را فعال کنید.';
      } else if (errName === 'NotFoundError' || errMsg.includes('device not found')) {
        msg = 'دوربینی روی این دستگاه یافت نشد.';
      } else if (errName === 'NotReadableError' || errMsg.includes('busy') || errMsg.includes('in use')) {
        msg = 'دوربین در حال حاضر توسط برنامه دیگری در حال استفاده است.';
      } else if (errMsg) {
        msg += ' ' + errMsg;
      }

      setCameraError(msg);
      setIsScanning(false);
    }
  };

  /**
   * Auxiliary Vision Loop:
   * Uses BarcodeDetector or Dewarping / Sharpening directly on the video element
   * to catch curved barcodes (pens/markers) even faster
   */
  const startAuxiliaryVisionLoop = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    let isRunning = true;
    let isDetecting = false;
    let processCanvas: HTMLCanvasElement | null = null;
    let processCtx: CanvasRenderingContext2D | null = null;

    const runAuxCycle = async () => {
      if (!isRunning) return;

      const video = document.querySelector<HTMLVideoElement>(`#${containerId} video`);
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.paused) {
        animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
        return;
      }

      if (isDetecting || isProcessingScanRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
        return;
      }

      isDetecting = true;
      const frameStartTime = performance.now();

      try {
        const detector = nativeBarcodeDetectorRef.current;
        if (detector) {
          // Native Detector Fast-Path on raw video frame
          const detectedCodes = await detector.detect(video);
          if (detectedCodes && detectedCodes.length > 0 && detectedCodes[0].rawValue) {
            handleFrameDecoded(detectedCodes[0].rawValue, detectedCodes[0].format);
            isDetecting = false;
            animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
            return;
          }

          consecutiveMissesRef.current += 1;

          // Cylindrical / Dewarping pass for curved pens or shiny surfaces
          if (curvedSurfaceMode && consecutiveMissesRef.current >= 8) {
            if (!processCanvas) {
              processCanvas = document.createElement('canvas');
              processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
            }

            const vW = video.videoWidth;
            const vH = video.videoHeight;
            const targetW = Math.min(MAX_CV_WIDTH, Math.floor(vW * 0.85));
            const targetH = Math.min(MAX_CV_HEIGHT, Math.floor(vH * 0.5));

            processCanvas.width = targetW;
            processCanvas.height = targetH;

            if (processCtx) {
              const startX = Math.floor((vW - targetW) / 2);
              const startY = Math.floor((vH - targetH) / 2);
              processCtx.drawImage(video, startX, startY, targetW, targetH, 0, 0, targetW, targetH);

              // Glare check
              const now = Date.now();
              if (now - lastGlareCheckTimeRef.current > 800) {
                lastGlareCheckTimeRef.current = now;
                const sampleImgData = processCtx.getImageData(0, 0, targetW, targetH);
                const glare = analyzeFrameGlare(sampleImgData);
                setGlareRatioPercent(Math.round(glare.glareRatio * 100));
                setIsGlareDetected(glare.hasSevereGlare);
              }

              const passType = progressivePassIndexRef.current % 4;
              progressivePassIndexRef.current += 1;

              if (passType === 0) {
                // Pass 1: Cylindrical Dewarp
                const dewarped = applyCylindricalDewarp(processCanvas, 0.85);
                const codes = await detector.detect(dewarped);
                if (codes && codes.length > 0 && codes[0].rawValue) {
                  handleFrameDecoded(codes[0].rawValue, codes[0].format);
                  isDetecting = false;
                  animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
                  return;
                }
              } else if (passType === 1) {
                // Pass 2: Adaptive Local Threshold
                const imgData = processCtx.getImageData(0, 0, targetW, targetH);
                const threshData = applyAdaptiveLocalThreshold(imgData, 0.06, 0.12);
                const threshCanvas = document.createElement('canvas');
                threshCanvas.width = targetW;
                threshCanvas.height = targetH;
                const threshCtx = threshCanvas.getContext('2d');
                if (threshCtx) {
                  threshCtx.putImageData(threshData, 0, 0);
                  const codes = await detector.detect(threshCanvas);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    handleFrameDecoded(codes[0].rawValue, codes[0].format);
                    isDetecting = false;
                    animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
                    return;
                  }
                }
              } else if (passType === 2) {
                // Pass 3: Sharpen Filter
                const imgData = processCtx.getImageData(0, 0, targetW, targetH);
                const sharpData = applySharpenFilter(imgData);
                const sharpCanvas = document.createElement('canvas');
                sharpCanvas.width = targetW;
                sharpCanvas.height = targetH;
                const sharpCtx = sharpCanvas.getContext('2d');
                if (sharpCtx) {
                  sharpCtx.putImageData(sharpData, 0, 0);
                  const codes = await detector.detect(sharpCanvas);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    handleFrameDecoded(codes[0].rawValue, codes[0].format);
                    isDetecting = false;
                    animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
                    return;
                  }
                }
              } else if (passType === 3) {
                // Pass 4: Tilt angles
                const rotAngles = [15, -15];
                for (const ang of rotAngles) {
                  if (performance.now() - frameStartTime > FRAME_TIME_BUDGET_MS) break;
                  const rotCanvas = createRotatedCanvas(processCanvas, ang);
                  const codes = await detector.detect(rotCanvas);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    handleFrameDecoded(codes[0].rawValue, codes[0].format);
                    isDetecting = false;
                    animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
                    return;
                  }
                }
              }
            }
          }
        }
      } catch (_) {
        // Frame transient catch
      } finally {
        isDetecting = false;
        animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(runAuxCycle);
  };

  const startCameraSetup = async () => {
    setCameraError(null);
    try {
      let devices: Array<{ id: string; label: string }> = [];

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const allDevs = await navigator.mediaDevices.enumerateDevices();
        devices = allDevs
          .filter((d) => d.kind === 'videoinput')
          .map((d, idx) => ({
            id: d.deviceId,
            label: d.label || `دوربین شماره ${idx + 1}`,
          }));
      }

      if (devices.length === 0) {
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (_) {}
      }

      if (!devices || devices.length === 0) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach((t) => t.stop());
          const allDevs = await navigator.mediaDevices.enumerateDevices();
          devices = allDevs
            .filter((d) => d.kind === 'videoinput')
            .map((d, idx) => ({
              id: d.deviceId,
              label: d.label || `دوربین شماره ${idx + 1}`,
            }));
        } catch (_) {}
      }

      setCameras(devices);

      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('عقب')
      );
      const chosenId = backCamera ? backCamera.id : devices[0]?.id || '';
      setSelectedCameraId(chosenId);
      await startScannerWithCamera(chosenId);
    } catch (err: any) {
      console.error('Camera setup error:', err);
      setCameraError(err.message || 'خطا در دسترسی به دوربین.');
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
  }, [isOpen, activeTab, stopScanner]);

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
      const caps = (typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}) as any;

      if (caps?.pointsOfInterest) {
        await track.applyConstraints({
          advanced: [{ pointsOfInterest: [{ x, y }] } as any],
        });
      } else if (caps?.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
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
      const result = await html5QrCode.scanFileV2(file, true);
      if (result && result.decodedText) {
        const clean = toEnglishDigits(result.decodedText).replace(/[\r\n\t]/g, '').trim();
        if (clean.length >= 2) {
          handleSuccessfulScan(clean);
        } else {
          setCameraError('بارکد معتبری در تصویر یافت نشد.');
        }
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setCameraError('بارکدی در تصویر ارسالی یافت نشد یا تصویر تار است.');
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

  const focusManualInput = () => {
    setTimeout(() => {
      manualInputRef.current?.focus();
      manualInputRef.current?.select();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111113] border border-[#26262B] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-[#E0E0E0] max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#222225] flex items-center justify-between bg-[#161619]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center shadow-inner border border-red-500/20">
              <ScanLine className="w-5 h-5 animate-pulse text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-[#F3F4F6] text-sm sm:text-base">{title}</h3>
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                  <span>خط لیزر قرمز فعال</span>
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

        {/* Mode Tabs & Features Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0A0A0B] border-b border-[#222225] text-xs gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setActiveTab('camera');
                setCameraError(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20 font-black'
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
                  ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20 font-black'
                  : 'bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0]'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>بارگذاری عکس</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Laser Line Toggle */}
            <button
              type="button"
              onClick={() => setShowLaserBeam(!showLaserBeam)}
              title="نمایش یا پنهان‌سازی خط لیزر قرمز"
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                showLaserBeam
                  ? 'bg-red-950/70 text-red-300 border-red-500/50 shadow-xs'
                  : 'bg-[#1C1C20] text-[#8E9299] border-[#2D2D33]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>{showLaserBeam ? 'خط لیزر قرمز: روشن' : 'خط لیزر: خاموش'}</span>
            </button>

            {/* Curved Surface & Anti-Glare Mode Toggle */}
            <button
              type="button"
              onClick={() => setCurvedSurfaceMode(!curvedSurfaceMode)}
              title="حالت بهینه جهت خوانش سطوح استوانه‌ای (خودکار/ماژیک) و سطوح بازتابنده نور"
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                curvedSurfaceMode
                  ? 'bg-indigo-950/70 text-indigo-300 border-indigo-500/50 shadow-xs'
                  : 'bg-[#1C1C20] text-[#8E9299] border-[#2D2D33]'
              }`}
            >
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>{curvedSurfaceMode ? 'حالت استوانه‌ای فعال' : 'حالت عادی'}</span>
            </button>

            {allowContinuous && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#8E9299] hover:text-[#E0E0E0] mr-1">
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

        {/* Viewport / Scanner Area */}
        <div className="relative bg-black min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
          {activeTab === 'camera' ? (
            <>
              {/* Html5Qrcode Scanner Target Container */}
              <div
                id={containerId}
                onClick={handleTapToFocus}
                style={{
                  transform: !hasHardwareZoom && zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
                className="w-full max-w-full overflow-hidden cursor-crosshair flex items-center justify-center min-h-[300px]"
              />

              {/* Guide Overlay with RED LASER AIMING LINE */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3.5 z-10">
                  {/* Top Floating Status Pill */}
                  <div className="w-full flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-white/90 bg-black/80 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-sm">
                        <Target className="w-3 h-3 text-red-500" />
                        <span>اسکنر فعال با راهنمای لیزری</span>
                      </span>

                      {isGlareDetected && (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/85 px-2.5 py-1 rounded-full backdrop-blur-md border border-amber-500/40 flex items-center gap-1 animate-pulse">
                          <SunMedium className="w-3 h-3 text-amber-400" />
                          <span>بازتاب نور ({toPersianDigits(glareRatioPercent)}٪)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {zoomLevel > 1 && (
                        <span className="text-[10px] font-mono text-[#C9A227] bg-black/85 px-2.5 py-0.5 rounded-full border border-[#C9A227]/30 font-black">
                          {zoomLevel.toFixed(1)}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Centered Reticle with Laser Beam Line */}
                  <div className="w-[92%] max-w-[460px] h-[155px] sm:h-[185px] border-2 border-red-500/50 rounded-2xl relative flex flex-col items-center justify-between p-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.50)] transition-all">
                    {/* Reticle Corner Brackets (Red Diode Framing) */}
                    <div className="absolute -top-1 -left-1 w-7 h-7 border-t-3 border-l-3 border-red-500 rounded-tl-xl shadow-[0_0_8px_#ef4444]" />
                    <div className="absolute -top-1 -right-1 w-7 h-7 border-t-3 border-r-3 border-red-500 rounded-tr-xl shadow-[0_0_8px_#ef4444]" />
                    <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-3 border-l-3 border-red-500 rounded-bl-xl shadow-[0_0_8px_#ef4444]" />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-3 border-r-3 border-red-500 rounded-br-xl shadow-[0_0_8px_#ef4444]" />

                    {/* Top Helper */}
                    <div className="w-full flex items-center justify-between text-[10px] text-red-300/90 font-bold px-2">
                      <span className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-lg border border-red-500/30">
                        <ScanLine className="w-3 h-3 text-red-400" />
                        محدوده بارکدخوان
                      </span>
                      {curvedSurfaceMode && (
                        <span className="bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                          قلم و استوانه
                        </span>
                      )}
                    </div>

                    {/* THE RED LASER AIMING LINE (خط قرمز لیزری درخشان) */}
                    {showLaserBeam && (
                      <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex items-center justify-center pointer-events-none z-20">
                        <div
                          className={`w-full transition-all duration-150 relative flex items-center justify-center ${
                            laserScanSuccessFlash
                              ? 'h-1.5 bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_40px_#34d399]'
                              : 'h-1 bg-red-600 shadow-[0_0_12px_#ff0000,0_0_25px_#ef4444]'
                          }`}
                        >
                          {/* Inner white-hot glowing laser core */}
                          <div
                            className={`w-full h-0.5 ${
                              laserScanSuccessFlash
                                ? 'bg-white'
                                : 'bg-gradient-to-r from-red-600 via-rose-100 to-red-600'
                            }`}
                          />
                          {/* Center diode optic dot */}
                          <div
                            className={`absolute w-3 h-3 rounded-full ${
                              laserScanSuccessFlash
                                ? 'bg-white shadow-[0_0_12px_#10b981]'
                                : 'bg-white shadow-[0_0_10px_#ff0000]'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Moving Laser Sweep Animation */}
                    {showLaserBeam && (
                      <div className="absolute inset-x-2 top-2 bottom-2 pointer-events-none overflow-hidden rounded-xl">
                        <div className="w-full h-10 bg-gradient-to-b from-transparent via-red-500/20 to-transparent relative animate-laser-sweep">
                          <div className="w-full h-0.5 bg-red-500/90 shadow-[0_0_8px_#ef4444]" />
                        </div>
                      </div>
                    )}

                    {/* Center guidance badge */}
                    <div className="text-center z-10">
                      <span className="text-[10px] sm:text-[11px] font-black text-white bg-black/85 px-3 py-1 rounded-xl backdrop-blur-md border border-red-500/40 shadow-lg flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                        <span>خط قرمز لیزری را در راستای خطوط بارکد بگیرید</span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom Tip Overlay */}
                  <div className="text-center w-full max-w-md">
                    <span className="text-[10px] font-bold text-slate-200 bg-black/85 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 block leading-tight">
                      {curvedSurfaceMode
                        ? 'برای بارکدهای براق یا خودکار، کمی زاویه دادن به گوشی خوانایی را چندبرابر می‌کند'
                        : 'کافیست خط قرمز از وسط بارکد عبور کند؛ خوانش به صورت خودکار و آنی انجام می‌شود'}
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error Display */}
              {cameraError && (
                <div className="p-6 text-center text-[#E0E0E0] max-w-sm flex flex-col items-center gap-3 z-30">
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

              {/* Success Visual Overlay */}
              {lastScannedCode && (
                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 animate-in zoom-in-95 duration-150 z-30">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-bold text-emerald-300">بارکد با موفقیت اسکن شد</span>
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

        {/* Controls Bar */}
        {activeTab === 'camera' && (
          <div className="px-4 py-2.5 bg-[#161619] border-t border-[#222225] flex flex-col gap-2">
            {/* Quick Zoom Presets, Mode Toggle & Torch */}
            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              {/* Distance Zoom Chips */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] font-bold text-[#8E9299] pl-1">بزرگ‌نمایی:</span>
                {[
                  { z: 1, label: '1x عادی' },
                  { z: 1.5, label: '1.5x' },
                  { z: 2, label: '2x فاصله' },
                  { z: 3, label: '3x برچسب ریز' },
                ].map(({ z, label }) => (
                  <button
                    key={z}
                    onClick={() => applyZoom(z)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      Math.abs(zoomLevel - z) < 0.15
                        ? 'bg-[#C9A227] text-slate-950 shadow-xs font-black'
                        : 'bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      torchOn
                        ? 'bg-[#C9A227] text-slate-950 shadow-md shadow-[#C9A227]/20 font-black'
                        : 'bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225]'
                    }`}
                  >
                    {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{torchOn ? 'خاموش' : 'فلش'}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    showAdvancedControls
                      ? 'bg-[#C9A227] text-slate-950 border-[#C9A227]'
                      : 'bg-[#0A0A0B] text-[#8E9299] hover:text-[#E0E0E0] border-[#222225]'
                  }`}
                  title="تنظیمات پیشرفته لنز و نور"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Advanced Controls */}
            {showAdvancedControls && (
              <div className="bg-[#0A0A0B] p-3 rounded-2xl border border-[#222225] space-y-3 animate-in fade-in duration-150 text-xs">
                {/* Zoom Slider */}
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

                {/* Exposure Compensation */}
                {hasExposure && (
                  <div className="flex items-center gap-3 pt-2 border-t border-[#1C1C20]">
                    <SunMedium className="w-4 h-4 text-[#8E9299] shrink-0" />
                    <span className="text-[#8E9299] shrink-0">تنظیم نور / اکسپوژر:</span>
                    <input
                      type="range"
                      min={minExposure}
                      max={maxExposure}
                      step={0.5}
                      value={exposureCompensation}
                      onChange={(e) => applyExposure(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-400 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-amber-400 w-12 text-left">
                      {exposureCompensation > 0 ? `+${exposureCompensation}` : exposureCompensation} EV
                    </span>
                  </div>
                )}

                {cameras.length > 1 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1C1C20]">
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

        {/* Continuous Scanned List */}
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

        {/* Footer: Manual Barcode Input */}
        <div className="p-3.5 sm:p-4 bg-[#111113] border-t border-[#222225] flex flex-col gap-2">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="تایپ یا اسکن دستی بارکد (مثلاً کدهای خیلی فشرده یا مخدوش)..."
                className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#2D2D33] rounded-xl text-xs font-mono text-[#F3F4F6] placeholder-[#60646C] focus:outline-none focus:border-[#C9A227]"
              />
              <button
                type="button"
                onClick={focusManualInput}
                title="تایپ دستی بارکد"
                className="w-6 h-6 absolute left-2 top-2 text-[#8E9299] hover:text-[#C9A227] flex items-center justify-center cursor-pointer"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-xs whitespace-nowrap"
            >
              ثبت دستی
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
