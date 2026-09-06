import React, { useRef, useState } from 'react';
import { Camera, Smartphone, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { decodeBarcodeFromImage } from '../../lib/nativeBarcodeScanner';
import { toEnglishDigits } from '../../lib/utils';

interface DirectPhoneScannerButtonProps {
  onScan: (barcode: string) => void;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'compact' | 'gold';
  title?: string;
}

export const DirectPhoneScannerButton: React.FC<DirectPhoneScannerButtonProps> = ({
  onScan,
  label = 'دوربین گوشی',
  className = '',
  variant = 'gold',
  title = 'اسکن مستقیم بارکد با دوربین اصلی خود گوشی',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const result = await decodeBarcodeFromImage(file);

      if (result.success && result.barcode) {
        const clean = toEnglishDigits(result.barcode).trim();
        playBeep();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(80);
          } catch (_) {}
        }
        setStatusMessage({ type: 'success', text: `بارکد «${clean}» خوانده و جایگزاری شد` });
        onScan(clean);
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({
          type: 'error',
          text: 'بارکد در تصویر خوانده نشد. لطفاً در نور مناسب و بدون لرزش عکس بگیرید.',
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Phone camera decode error:', err);
      setStatusMessage({
        type: 'error',
        text: 'خطا در پردازش تصویر دوربین گوشی.',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Base styling variants
  let btnClasses = 'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs';
  if (variant === 'gold') {
    btnClasses =
      'px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#C9A227] hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all';
  } else if (variant === 'compact') {
    btnClasses =
      'p-2 rounded-xl bg-[#222226] hover:bg-[#C9A227] text-[#C9A227] hover:text-black font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors';
  } else if (variant === 'primary') {
    btnClasses =
      'px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all';
  } else {
    btnClasses =
      'px-3 py-1.5 rounded-xl bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] border border-[#2D2D33] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors';
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Native Camera input triggering phone's own camera app */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        title={title}
        className={`${btnClasses} ${className}`}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>در حال خوانش...</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <Camera className="w-3.5 h-3.5 shrink-0 -mr-0.5" />
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`absolute bottom-full mb-2 right-0 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
              : 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-rose-950/50'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
