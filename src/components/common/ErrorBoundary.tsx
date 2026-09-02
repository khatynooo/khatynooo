import React, { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Ignore ResizeObserver loop limit exceeded and benign browser notifications
      if (
        event.message?.includes('ResizeObserver loop') ||
        event.message?.includes('Script error') ||
        !event.error
      ) {
        return;
      }
      console.warn('UI non-fatal warning:', event.error?.message || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Gracefully prevent unhandled promise noise (e.g. 3rd-party push SDKs, AbortSignals or iframe permission checks)
      const r = event.reason;
      if (
        !r ||
        r === 'undefined' ||
        r.name === 'AbortError' ||
        (r.message && (r.message.includes('aborted') || r.message.includes('ServiceWorker') || r.message.includes('AbortError'))) ||
        (typeof r === 'string' && r.includes('AbortError'))
      ) {
        event.preventDefault();
        return;
      }
      console.warn('Unhandled promise caught gracefully:', r.message || r);
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161619] border border-[#2D2D33] rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-black text-white mb-2">خطایی رخ داد</h2>
          <p className="text-xs text-[#8E9299] mb-6 leading-relaxed">
            سیستم به صورت خودکار مانع از توقف کل برنامه شد. می‌توانید صفحه را مجدداً بارگذاری کنید.
          </p>

          {errorMessage && (
            <div className="mb-6 p-3 bg-[#0A0A0B] border border-[#222225] rounded-xl text-left font-mono text-[11px] text-red-300 break-all max-h-24 overflow-y-auto">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 px-4 bg-[#C9A227] hover:bg-[#B89220] text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>بارگذاری مجدد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHasError(false);
                window.location.href = '/';
              }}
              className="py-2.5 px-4 bg-[#222225] hover:bg-[#2D2D33] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>صفحه اصلی</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
