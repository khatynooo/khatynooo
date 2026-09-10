import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  User,
  Copy,
  Check,
  Zap,
  Calculator,
  Printer,
  TrendingUp,
  Package,
  Globe,
  ExternalLink,
  AlertTriangle,
  Database,
  DollarSign,
  ShieldCheck,
  Cpu,
  RotateCcw,
  Square,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../common/Toast';

interface GroundingSource {
  title?: string;
  uri?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
  groundingEnabled?: boolean;
  failedPrompt?: string;
}

interface AiStatusState {
  configured: boolean;
  model: string;
  searchGroundingAvailable: boolean;
  tools: string[];
}

export const AiAssistantView: React.FC = () => {
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [aiStatus, setAiStatus] = useState<AiStatusState | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [enableGrounding, setEnableGrounding] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `### سلام! من دستیار هوشمند، تحلیلگر ارشد مالی و انبار خطی‌نو هستم.
من مستقیماً به مدل رسمی **Google Gemini** و پایگاه‌داده حسابداری و انبارداری خطی‌نو متصل هستم.

#### قابلیت‌های فعال و متصل:
* 📊 **تحلیل زنده مالی و سود (Function Calling):** استعلام فروش امروز، حاشیه سود، گردش نقدینگی و مانده حساب مشتریان مستقیماً از دیتابیس.
* 📦 **دیده‌بان کسری و انبارداری:** بررسی کالاهای زیر نقطه سفارش مجدد و کالاهای ناموجود جهت سفارش‌گذاری.
* 🌐 **جستجوی زنده وب (Google Search Grounding):** استعلام قیمت لحظه‌ای کالاها در ترب، دیجی‌کالا و بازار آنلاین با استناد به منابع وب.
* 📋 **فرمولاسیون کارگاهی (BOM):** بهای تمام‌شده و آنالیز سود دفاتر سیمی، یادداشت و خدمات چاپ و تکثیر.

می‌توانید از دکمه‌های پرسش‌های آماده زیر استفاده کنید یا هر پرسش محاسباتی و تجاری را بنویسید.`,
      groundingEnabled: true,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      showToast('پردازش توسط کاربر متوقف گردید.', 'info');
    }
  };

  const quickPrompts = [
    {
      title: 'تحلیل مالی و سود امروز فروشگاه',
      prompt: 'با بررسی دیتابیس مالی، وضعیت فروش امروز، سود تقریبی، مانده بدهی مشتریان و گردش نقدینگی صندوق را تحلیل و گزارش کن.',
      icon: DollarSign,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30',
    },
    {
      title: 'کسری موجودی و کالاهای بحرانی انبار',
      prompt: 'کالاهایی که در انبار به حداقل نقطه سفارش مجدد رسیده‌اند یا موجودی صفر دارند را لیست کن و اولویت‌های تامین را مشخص نما.',
      icon: Package,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30',
    },
    {
      title: 'پرفروش‌ترین کالاها و استراتژی فروش',
      prompt: 'لیست پرفروش‌ترین کالاهای فروشگاه را بررسی کن و استراتژی افزایش فروش و پکیج‌های ترکیبی (Bundle) را پیشنهاد بده.',
      icon: TrendingUp,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
    },
    {
      title: 'استعلام زنده کاغذ A4 در ترب و وب',
      prompt: 'با جستجوی زنده در وب و ترب (Google Search)، قیمت روز یک بسته و کارتن کاغذ A4 دابل‌ ای (Double A) را استعلام و تحلیل کن.',
      icon: Globe,
      color: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30',
    },
    {
      title: 'فرمولاسیون و سود تولید دفتر ۸۰ برگ سیمی',
      prompt: 'فرمولاسیون بهای تمام‌شده (BOM) برای تولید یک جلد دفتر ۸۰ برگ سیمی در کارگاه خطی‌نو را بر اساس نرخ کاغذ و فنر محاسبه کن.',
      icon: Calculator,
      color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30',
    },
    {
      title: 'تحلیل سودآوری خدمات چاپ و کپی',
      prompt: 'جدول بهای تمام‌شده و نرخ‌گذاری پیشنهادی هر برگ پرینت و فتوکپی A4 سیاه و سفید و رنگی را ارائه بده.',
      icon: Printer,
      color: 'from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30',
    },
  ];

  // بارگذاری وضعیت اولیه هوش مصنوعی از سرور
  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await api.getAiStatus();
        if (mounted) {
          setAiStatus(res);
        }
      } catch (e: any) {
        console.warn('Failed to load AI status from server', e);
      } finally {
        if (mounted) setStatusLoading(false);
      }
    }
    checkStatus();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputText).trim();
    if (!promptToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: promptToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // آماده‌سازی تاریخچه پیام‌ها بدون پیام‌های خطای نمایشی قبلی
      const validHistory = updatedMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          text: m.content,
        }));

      const res = await api.askAiAssistant(
        validHistory,
        'فروشگاه و کارگاه تولیدی نوشت‌افزار و خدمات چاپ خطی‌نو (سامانه متمرکز مالی و انبار)',
        enableGrounding,
        controller.signal
      );

      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: res.reply,
          groundingSources: res.groundingSources,
          searchQueries: res.searchQueries,
          groundingEnabled: res.groundingEnabled,
        },
      ]);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        return;
      }
      const errorMessage =
        err?.message ||
        'متاسفانه در برقراری ارتباط با مدل Gemini یا واکشی اطلاعات خطایی رخ داد.';

      showToast(errorMessage, 'error');

      // ثبت خطای شفاف و واقعی در چت با امکان تلاش مجدد
      setMessages([
        ...updatedMessages,
        {
          role: 'error',
          content: errorMessage,
          failedPrompt: promptToSend,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showToast('متن پاسخ با موفقیت کپی شد', 'success');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'گفتگوی جدید آغاز شد. چه تحلیل مالی، محاسبات کارگاهی یا استعلام قیمتی مد نظر شماست؟',
        groundingEnabled: enableGrounding,
      },
    ]);
  };

  return (
    <div className="bg-[#111113] rounded-3xl border border-[#222225] shadow-2xl flex flex-col h-[calc(100vh-140px)] min-h-[560px] text-[#E0E0E0] overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#222225] flex flex-wrap items-center justify-between gap-3 bg-[#161619] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C9A227] text-slate-950 flex items-center justify-center shadow-lg shadow-[#C9A227]/20 font-black shrink-0">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-[#F3F4F6]">
                دستیار هوش مصنوعی و مشاور مالی خطی‌نو
              </h3>
              
              {/* نشانگر مدل و وضعیت واقعی */}
              {statusLoading ? (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                  <span>در حال بررسی اتصال...</span>
                </span>
              ) : aiStatus?.configured ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Google Gemini {aiStatus.model ? aiStatus.model.replace('gemini-', '') : '2.5 Flash'} (فعال و متصل)</span>
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>نیازمند تنظیم کلید هوش مصنوعی در سرور</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#8E9299] mt-0.5">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-[#C9A227]" />
                <span>متصل به پایگاه‌داده حسابداری، انبار و فروش</span>
              </span>
              <span className="hidden md:inline text-[#333338]">•</span>
              <span className="hidden md:flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>پردازش ایمن در Backend (بدون ریسک افشای کلید)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* سوئیچ Google Search Grounding */}
          <button
            type="button"
            onClick={() => {
              const next = !enableGrounding;
              setEnableGrounding(next);
              showToast(
                next
                  ? 'اتصال به وب فعال شد (Grounding with Google Search)'
                  : 'جستجوی زنده وب غیرفعال شد (حالت تحلیل داخلی و Function Calling)',
                'info'
              );
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              enableGrounding
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/10'
                : 'bg-[#1C1C20] border-[#2D2D33] text-[#8E9299] hover:text-[#E0E0E0]'
            }`}
            title="فعال‌سازی یا غیرفعال‌سازی استعلام زنده وب با گوگل"
          >
            <Globe className={`w-3.5 h-3.5 ${enableGrounding ? 'text-blue-400' : ''}`} />
            <span>Google Search Grounding:</span>
            <span className={enableGrounding ? 'text-blue-300 font-black' : 'text-slate-500'}>
              {enableGrounding ? 'روشن' : 'خاموش'}
            </span>
          </button>

          <button
            onClick={handleClearChat}
            className="text-xs text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#222225] px-3 py-1.5 rounded-xl border border-transparent hover:border-[#2D2D33] transition-all flex items-center gap-1.5 cursor-pointer"
            title="پاکسازی چت و شروع گفتگوی نو"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>گفتگوی جدید</span>
          </button>
        </div>
      </div>

      {/* بنر هشدار در صورت عدم وجود کلید API */}
      {!statusLoading && aiStatus && !aiStatus.configured && (
        <div className="bg-amber-950/40 border-b border-amber-600/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>توجه:</strong> کلید هوش مصنوعی در فایل تنظیمات محیطی سرور وارد نشده است. برای فعال‌سازی گفتگوی زنده، لطفاً کلید معتبر Google Gemini را در متغیرهای محیطی سرور وارد فرمایید.
            </span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isError = m.role === 'error';

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-[#C9A227] text-slate-950 font-bold'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-[#1C1C20] text-[#C9A227] border border-[#2D2D33]'
                }`}
              >
                {isUser ? (
                  <User className="w-4 h-4 text-black" />
                ) : isError ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              <div className="group relative max-w-3xl space-y-2 w-full">
                {/* بدنه پیام */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#C9A227] text-slate-950 font-bold rounded-tr-none shadow-md shadow-[#C9A227]/10 ml-auto'
                      : isError
                      ? 'bg-rose-950/30 border border-rose-600/30 text-rose-200 rounded-tl-none shadow-lg'
                      : 'bg-[#161619] border border-[#222225] text-[#E0E0E0] rounded-tl-none shadow-lg'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : isError ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 font-bold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>خطا در دریافت پاسخ از هوش مصنوعی:</span>
                      </div>
                      <p className="text-xs leading-relaxed text-rose-200/90 bg-black/20 p-2.5 rounded-xl border border-rose-900/30">
                        {m.content}
                      </p>
                      {m.failedPrompt && (
                        <button
                          type="button"
                          onClick={() => handleRetry(m.failedPrompt!)}
                          className="mt-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>تلاش مجدد</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-3 font-normal">
                      <Markdown
                        components={{
                          h1: ({ ...props }) => <h1 className="text-base font-black text-[#F3F4F6] border-b border-[#2D2D33] pb-1.5 mt-3 mb-2" {...props} />,
                          h2: ({ ...props }) => <h2 className="text-sm font-black text-[#F3F4F6] mt-3 mb-1.5" {...props} />,
                          h3: ({ ...props }) => <h3 className="text-xs font-black text-[#C9A227] mt-2 mb-1" {...props} />,
                          h4: ({ ...props }) => <h4 className="text-xs font-bold text-slate-300 mt-2 mb-1" {...props} />,
                          p: ({ ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                          ul: ({ ...props }) => <ul className="list-disc list-inside space-y-1 my-2 text-[#D1D5DB]" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[#D1D5DB]" {...props} />,
                          li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                          strong: ({ ...props }) => <strong className="font-black text-[#F3F4F6]" {...props} />,
                          table: ({ ...props }) => (
                            <div className="overflow-x-auto my-3 border border-[#2D2D35] rounded-xl">
                              <table className="min-w-full text-right divide-y divide-[#2D2D35] text-[11px]" {...props} />
                            </div>
                          ),
                          thead: ({ ...props }) => <thead className="bg-[#1C1C22] text-[#F3F4F6] font-bold" {...props} />,
                          tbody: ({ ...props }) => <tbody className="divide-y divide-[#222228] bg-[#141418]" {...props} />,
                          th: ({ ...props }) => <th className="p-2 text-[#C9A227]" {...props} />,
                          td: ({ ...props }) => <td className="p-2" {...props} />,
                          blockquote: ({ ...props }) => (
                            <blockquote className="border-r-2 border-[#C9A227] pr-3 my-2 text-slate-300 italic bg-amber-500/5 py-1 rounded-l" {...props} />
                          ),
                          code: ({ ...props }) => (
                            <code className="bg-[#1E1E24] text-[#C9A227] px-1.5 py-0.5 rounded text-[11px] font-mono" {...props} />
                          ),
                        }}
                      >
                        {m.content}
                      </Markdown>
                    </div>
                  )}
                </div>

                {/* پیوندهای استناد به وب (Google Search Grounding Sources) */}
                {!isUser && !isError && m.groundingSources && m.groundingSources.length > 0 && (
                  <div className="bg-[#141417] border border-blue-500/20 rounded-2xl p-3.5 space-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>منابع و پیوندهای استخراج‌شده زنده از وب (Google Search Grounding):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.groundingSources.map((source, sIdx) => {
                        let domain = '';
                        try {
                          if (source.uri) domain = new URL(source.uri).hostname.replace('www.', '');
                        } catch (e) {
                          domain = source.uri || '';
                        }
                        return (
                          <a
                            key={sIdx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#1C1C22] hover:bg-blue-500/20 text-[#A0AEC0] hover:text-blue-300 border border-[#2D2D38] hover:border-blue-500/40 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 max-w-[320px] truncate"
                            title={source.title || source.uri}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0 text-blue-400" />
                            <span className="truncate">{source.title || domain || 'منبع وب'}</span>
                            {domain && (
                              <span className="text-[9px] text-[#6B7280] shrink-0 font-mono">({domain})</span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* دکمه کپی پاسخ */}
                {!isUser && !isError && (
                  <button
                    onClick={() => handleCopyMessage(m.content, idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#8E9299] hover:text-[#E0E0E0] flex items-center gap-1 bg-[#161619] px-2.5 py-1 rounded-lg border border-[#222225] mt-1 cursor-pointer"
                    title="کپی متن"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>کپی پاسخ</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* وضعیت لودینگ */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1C1C20] text-[#C9A227] flex items-center justify-center border border-[#2D2D33] shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#161619] border border-[#222225] text-[#8E9299] rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-3">
              <Sparkles className="w-4 h-4 animate-pulse text-[#C9A227] shrink-0" />
              <div className="space-y-1">
                <div className="text-[#F3F4F6] font-bold">
                  مدل Gemini در حال پردازش و واکشی اطلاعات است...
                </div>
                <div className="text-[11px] text-[#8E9299]">
                  {enableGrounding
                    ? 'اتصال زنده به Google Search Grounding و بررسی پایگاه‌داده خطی‌نو'
                    : 'فراخوانی توابع حسابداری، تحلیل انبار و فرمولاسیون کارگاهی'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* پرسش‌های آماده (Quick Action Prompts) */}
      <div className="px-4 py-3 bg-[#141417] border-t border-[#222225] flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
        <span className="text-[#8E9299] shrink-0 font-bold flex items-center gap-1 pl-1">
          <Zap className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>پیشنهادها:</span>
        </span>
        {quickPrompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              className={`px-3 py-1.5 rounded-xl border bg-gradient-to-r ${item.color} hover:brightness-125 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer font-bold`}
              title={item.prompt}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* فیلد ورودی متن پیشرفته */}
      <div className="p-3 sm:p-4 bg-[#161619] border-t border-[#222225] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputText.trim() && !isLoading) {
              handleSendMessage();
            }
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim() && !isLoading) {
                    handleSendMessage();
                  }
                }
              }}
              rows={Math.min(Math.max(inputText.split('\n').length, 1), 4)}
              placeholder="پرسش مالی، استعلام قیمت، تحلیل کسری انبار یا فرمولاسیون تولید را بنویسید..."
              disabled={isLoading}
              className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] text-[#F3F4F6] placeholder-[#6B7280] text-xs sm:text-sm rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50 transition-all disabled:opacity-50 resize-none max-h-32"
            />
          </div>

          {isLoading ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="w-11 h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer shrink-0 mb-0.5"
              title="توقف تولید پاسخ (Stop Generation)"
              aria-label="توقف تولید"
            >
              <Square className="w-4 h-4 fill-white text-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="w-11 h-11 rounded-2xl bg-[#C9A227] hover:bg-[#b59020] text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-[#C9A227]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 mb-0.5"
              title="ارسال پیام (Enter)"
              aria-label="ارسال پیام"
            >
              <Send className="w-4 h-4 text-black -rotate-90" />
            </button>
          )}
        </form>
        <div className="mt-2 text-[10px] text-[#6B7280] flex items-center justify-between px-1">
          <span className="hidden sm:inline">پردازش داده‌های واقعی حسابداری با Google Gemini</span>
          <span className="text-right sm:text-left">Enter برای ارسال • Shift+Enter برای خط جدید</span>
        </div>
      </div>
    </div>
  );
};
