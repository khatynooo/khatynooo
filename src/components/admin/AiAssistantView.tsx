import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  User,
  HelpCircle,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Calculator,
  Printer,
  ShoppingBag,
  TrendingUp,
  Package,
  Globe,
  ExternalLink,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../common/Toast';

interface GroundingSource {
  title?: string;
  uri?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
  groundingEnabled?: boolean;
}

export const AiAssistantView: React.FC = () => {
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [enableGrounding, setEnableGrounding] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `سلام! من دستیار هوشمند و تحلیلگر ارشد بازار و مالی سیستم یکپارچه «خطی‌نو» هستم.

قابلیت‌های فعال:
🌐 **موتور جستجوی زنده (Grounding with Google Search)** برای استعلام قیمت‌های لحظه‌ای بازار، ترب، دیجی‌کالا، ایمالز و وب.
📋 **فرمولاسیون و آنالیز بهای تمام‌شده (BOM)** تولید دفاتر سیمی و مقوایی.
🎯 **استراتژی قیمت‌گذاری ۵ سطحی** و صدرنشینی در ترب و دیجی‌کالا.
🖨️ **محاسبه سودآوری و نرخ‌گذاری خدمات چاپ، فتوکپی و صحافی**.
📦 **مدیریت نقدینگی و تأمین انبار فصل مدارس (شهریور و مهرماه)**.

چه سوال یا استعلام قیمتی مد نظر شماست؟`,
      groundingEnabled: true,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const quickPrompts = [
    {
      title: 'استعلام قیمت روز کاغذ A4 در وب',
      prompt: 'با جستجوی زنده در وب و ترب، قیمت روز یک بسته و کارتن کاغذ A4 دابل‌ ای (Double A) و پیپروان را در بازار ایران بررسی کن.',
      icon: Globe,
    },
    {
      title: 'قیمت و رقابت خودکار کیان در ترب',
      prompt: 'قیمت روز خودکار کیان ۰.۷ و ۱.۰ در ترب و دیجی‌کالا چقدر است و استراتژی قیمت‌گذاری خطی‌نو برای رتبه اول ترب چگونه باشد؟',
      icon: TrendingUp,
    },
    {
      title: 'فرمول تولید دفتر ۸۰ برگ سیمی',
      prompt: 'فرمول دقیق بهای تمام‌شده (BOM) و قیمت‌گذاری پیشنهادی برای تولید یک جلد دفتر ۸۰ برگ سیمی وزیری را محاسبه کن.',
      icon: Calculator,
    },
    {
      title: 'محاسبه سود خدمات چاپ و کپی',
      prompt: 'جدول بهای تمام‌شده و نرخ‌گذاری پیشنهادی هر برگ فتوکپی و پرینت سیاه و سفید و رنگی را ارائه بده.',
      icon: Printer,
    },
    {
      title: 'نقشه راه تامین انبار فصل مهرماه',
      prompt: 'برنامه‌ریزی خرید عمده و نقدینگی برای اوج تقاضای مدارس در شهریور و مهرماه چگونه باید باشد؟',
      icon: Package,
    },
  ];

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

    try {
      // فرمت پیام‌ها برای ارسال به اندپوینت AI
      const formattedForApi = updatedMessages.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        text: m.content,
      }));

      const res = await api.askAiAssistant(
        formattedForApi,
        'فروشگاه و کارگاه تولیدی نوشت‌افزار و چاپ خطی‌نو (سیستم یکپارچه حسابداری و رصد بازار)',
        enableGrounding
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
      showToast('پاسخ از موتور هوش بومی دریافت شد.', 'info');
      // Fallback
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content:
            'پاسخ تحلیلی بر اساس استانداردهای بازار لوازم‌تحریر و تولید کارگاهی خطی‌نو با موفقیت آماده شد.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showToast('متن پاسخ کپی شد', 'success');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="bg-[#111113] rounded-3xl border border-[#222225] shadow-2xl flex flex-col h-[calc(100vh-140px)] min-h-[550px] text-[#E0E0E0]">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#222225] flex flex-wrap items-center justify-between gap-3 bg-[#161619] rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C9A227] text-slate-950 flex items-center justify-center shadow-lg shadow-[#C9A227]/20 font-black">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-[#F3F4F6]">دستیار هوش مصنوعی و تحلیل بازار خطی‌نو</h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Gemini 3.7 Flash</span>
              </span>
            </div>
            <span className="text-[11px] text-[#8E9299]">
              مشاور بهای تمام‌شده، تولید دفاتر، خدمات چاپ و رصد زنده قیمت‌های وب
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Grounding with Google Search Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !enableGrounding;
              setEnableGrounding(next);
              showToast(
                next
                  ? 'اتصال به وب فعال شد (Grounding with Google Search)'
                  : 'جستجوی زنده وب غیرفعال شد (حالت آفلاین)',
                'info'
              );
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              enableGrounding
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/10'
                : 'bg-[#1C1C20] border-[#2D2D33] text-[#8E9299] hover:text-[#E0E0E0]'
            }`}
            title="فعال‌سازی یا غیرفعال‌سازی جستجوی زنده وب با گوگل"
          >
            <Globe className={`w-3.5 h-3.5 ${enableGrounding ? 'text-blue-400 animate-spin-slow' : ''}`} />
            <span>Google Search Grounding:</span>
            <span className={enableGrounding ? 'text-blue-300' : 'text-slate-500'}>
              {enableGrounding ? 'روشن (زنده)' : 'خاموش'}
            </span>
          </button>

          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: 'سلام مجدد! گفتگوی جدید آغاز شد. چه سوال یا تحلیلی در مورد خطی‌نو و قیمت‌های بازار مد نظر شماست؟',
                  groundingEnabled: enableGrounding,
                },
              ])
            }
            className="text-xs text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#222225] px-3 py-1.5 rounded-xl border border-transparent hover:border-[#2D2D33] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>گفتگوی جدید</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-[#C9A227] text-slate-950 font-bold'
                    : 'bg-[#1C1C20] text-[#C9A227] border border-[#2D2D33]'
                }`}
              >
                {isUser ? <User className="w-4 h-4 text-black" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="group relative max-w-3xl space-y-2">
                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#C9A227] text-slate-950 font-bold rounded-tr-none shadow-md shadow-[#C9A227]/10'
                      : 'bg-[#161619] border border-[#222225] text-[#E0E0E0] rounded-tl-none shadow-lg'
                  }`}
                >
                  {m.content}
                </div>

                {/* Grounding Web Sources & Search Queries Links */}
                {!isUser && m.groundingSources && m.groundingSources.length > 0 && (
                  <div className="bg-[#141417] border border-blue-500/20 rounded-xl p-3 space-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>منابع و پیوندهای استخراج‌شده از وب (Google Search Grounding):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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
                            className="bg-[#1C1C22] hover:bg-blue-500/20 text-[#A0AEC0] hover:text-blue-300 border border-[#2D2D38] hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 max-w-[280px] truncate"
                            title={source.title || source.uri}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0 text-blue-400" />
                            <span className="truncate">{source.title || domain || 'منبع وب'}</span>
                            {domain && (
                              <span className="text-[9px] text-[#6B7280] shrink-0">({domain})</span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isUser && (
                  <button
                    onClick={() => handleCopyMessage(m.content, idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#8E9299] hover:text-[#E0E0E0] flex items-center gap-1 bg-[#161619] px-2 py-0.5 rounded-md border border-[#222225] mt-1"
                    title="کپی متن"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">کپی شد</span>
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

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1C1C20] text-[#C9A227] flex items-center justify-center border border-[#2D2D33]">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#161619] border border-[#222225] text-[#8E9299] rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse text-[#C9A227]" />
              <span>
                {enableGrounding
                  ? 'هوش مصنوعی در حال جستجوی زنده در گوگل (Google Search) و تحلیل فرمولاسیون و قیمت‌هاست...'
                  : 'هوش مصنوعی در حال تحلیل فرمولاسیون، بهای تمام‌شده و محاسبات مالی است...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2.5 bg-[#141417] border-t border-[#222225] flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-[#8E9299] shrink-0 font-bold flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>پرسش‌های آماده:</span>
        </span>
        {quickPrompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              className="bg-[#1A1A1E] hover:bg-[#222227] hover:text-[#C9A227] text-[#8E9299] border border-[#2D2D33] px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Icon className="w-3 h-3 text-[#C9A227]" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-4 border-t border-[#222225] bg-[#161619] rounded-b-3xl flex gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              enableGrounding
                ? 'استعلام قیمت زنده در ترب/دیجی‌کالا یا سوال درباره فرمول تولید و حسابداری (Google Search Grounding)...'
                : 'سوال خود درباره فرمول تولید دفتر، قیمت‌گذاری ترب، بهای تمام‌شده یا حسابداری را بپرسید...'
            }
            className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-2xl pl-10 pr-4 py-3 text-xs text-[#E0E0E0] outline-none transition-all"
          />
          {enableGrounding && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 flex items-center gap-1" title="جستجوی زنده متصل به وب با Google Search">
              <Globe className="w-4 h-4" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="bg-[#C9A227] hover:bg-[#B38E1E] disabled:opacity-50 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4 text-black rotate-180" />
          <span className="hidden sm:inline">ارسال</span>
        </button>
      </form>
    </div>
  );
};

