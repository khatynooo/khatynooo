import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Sparkles,
  Check,
  Info,
  Radio,
} from 'lucide-react';
import { PublicationChannel, PublicationProvider } from '../../../types';
import { api } from '../../../lib/api';

interface Props {
  channels: PublicationChannel[];
  onRefresh: () => void;
  isLoading: boolean;
}

const PROVIDER_METADATA: Record<
  PublicationProvider,
  {
    name: string;
    description: string;
    iconUrl?: string;
    color: string;
    badge: string;
    tokenLabel: string;
    tokenPlaceholder: string;
    tokenHelp: string;
    channelIdLabel: string;
    channelIdPlaceholder: string;
    channelIdHelp: string;
    docsUrl?: string;
    docsLabel?: string;
  }
> = {
  eitaa: {
    name: 'پیام‌رسان ایتا (Eitaa)',
    description: 'ارسال مستقیم و آنی به کانال رسمی فروشگاه در پیام‌رسان ایتا از طریق Bot API بومی (eitaayar.ir)',
    color: 'border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400',
    badge: 'بومی ایران',
    tokenLabel: 'کلید امنیتی بات ایتا (Bot Token)',
    tokenPlaceholder: 'bot123456:abcdef... (توکن دریافتی از eitaayar.ir)',
    tokenHelp: 'توکن دریافتی از سامانه eitaayar.ir را وارد کنید (معمولاً با bot شروع می‌شود، مثلا bot12345:xxxx). این توکن به صورت امن روی دیسک و دیتابیس سرور ذخیره می‌شود.',
    channelIdLabel: 'شناسه چت یا کانال ایتا (chat_id)',
    channelIdPlaceholder: 'khatynoo یا @khatynoo یا لینک عضویت https://eitaa.com/joinchat/...',
    channelIdHelp: 'پارامتر chat_id در ایتا: برای کانال عمومی نام کاربری (با یا بدون @)، برای کانال خصوصی لینک دعوت یا عدد chat_id. بات باید ادمین کانال با حق ارسال پیام باشد.',
    docsUrl: 'https://eitaayar.ir',
    docsLabel: 'دریافت توکن از ایتا‌یار (eitaayar.ir)',
  },
  bale: {
    name: 'پیام‌رسان بله (Bale)',
    description: 'انتشار خودکار در کانال پیام‌رسان بله همراه با تصویر، هشتگ‌ها و قیمت رسمی',
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    badge: 'بومی ایران',
    tokenLabel: 'توکن بات بله (Bot Token)',
    tokenPlaceholder: '123456789:ABCdefGHI...',
    tokenHelp: 'توکن ساخته شده از طریق بازوی BotFather در پیام‌رسان بله را وارد نمایید.',
    channelIdLabel: 'شناسه کانال بله (Chat ID یا آیدی با @)',
    channelIdPlaceholder: '@khatynoo_bale یا khatynoo_bale یا -1001234567890',
    channelIdHelp: 'آیدی کانال یا شناسه عددی با پیشوند -100. بات باید ادمین کانال با حق ارسال پیام باشد.',
    docsUrl: 'https://ble.ir',
    docsLabel: 'درگاه پیام‌رسان بله',
  },
  telegram: {
    name: 'پیام‌رسان تلگرام (Telegram)',
    description: 'انتشار پست رسمی محصول با فرمت HTML در کانال تلگرامی فروشگاه خطی‌نو',
    color: 'border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400',
    badge: 'بین‌المللی',
    tokenLabel: 'توکن بات تلگرام (BotFather Token)',
    tokenPlaceholder: '1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw',
    tokenHelp: 'توکن رسمی دریافتی از @BotFather در تلگرام.',
    channelIdLabel: 'شناسه کانال عمومی یا عددی تلگرام',
    channelIdPlaceholder: '@khatynoo یا khatynoo یا -100123456789',
    channelIdHelp: 'نام کاربری کانال عمومی با @ یا شناسه عددی چت برای کانال‌های خصوصی.',
    docsUrl: 'https://core.telegram.org/bots/api',
    docsLabel: 'مستندات Bot API تلگرام',
  },
  instagram: {
    name: 'صفحه اینستاگرام (Instagram Graph API)',
    description: 'انتشار عکس محصول به همراه کپشن کامل در اکانت تجاری اینستاگرام خطی‌نو',
    color: 'border-pink-500/30 bg-pink-500/5 text-pink-600 dark:text-pink-400',
    badge: 'Meta Graph API',
    tokenLabel: 'User Access Token یا Page Token اینستاگرام',
    tokenPlaceholder: 'EAAQ...',
    tokenHelp: 'توکن دسترسی دائمی یا بلندمدت تولید شده در پنل توسعه‌دهندگان متا.',
    channelIdLabel: 'شناسه اکانت تجاری اینستاگرام (Instagram Business Account ID)',
    channelIdPlaceholder: '17841400000000000',
    channelIdHelp: 'شناسه عددی پیج متصل به فیسبوک بیزینس.',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    docsLabel: 'مستندات Meta Graph API',
  },
  website: {
    name: 'فروشگاه اینترنتی خطی‌نو (Website)',
    description: 'نمایش و همگام‌سازی لحظه‌ای در ویترین وب‌سایت عمومی khatynoo.ir',
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    badge: 'فروشگاه آنلاین',
    tokenLabel: 'شناسه وب‌سایت (داخلی)',
    tokenPlaceholder: 'khatynoo.ir (بدون نیاز به توکن)',
    tokenHelp: 'اتصال داخلی مستقیم به بانک اطلاعاتی فروشگاه اینترنتی خطی‌نو.',
    channelIdLabel: 'دامنه فروشگاه',
    channelIdPlaceholder: 'khatynoo.ir',
    channelIdHelp: 'دامنه فعال ویترین اینترنتی.',
  },
};

/**
 * استخراج و تمیزکاری خودکار شناسه کانال بر اساس پلتفرم
 */
function cleanChannelIdentifier(provider: PublicationProvider, rawInput: string): string {
  if (!rawInput) return '';
  let cleaned = rawInput.trim();

  if (provider === 'eitaa') {
    cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?(?:eitaa\.com|eitaayar\.ir)\//i, '');
    cleaned = cleaned.replace(/^(?:www\.)?(?:eitaa\.com|eitaayar\.ir)\//i, '');
    cleaned = cleaned.replace(/^[@/]+/, '');
    cleaned = cleaned.replace(/[/?#].*$/, '');
    return cleaned.trim();
  }

  if (provider === 'telegram') {
    cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, '');
    cleaned = cleaned.replace(/^(?:www\.)?(?:t\.me|telegram\.me)\//i, '');
    cleaned = cleaned.replace(/[/?#].*$/, '');
    if (!cleaned.startsWith('@') && !cleaned.startsWith('-')) {
      cleaned = `@${cleaned}`;
    }
    return cleaned.trim();
  }

  if (provider === 'bale') {
    cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?(?:ble\.ir|bale\.ai)\//i, '');
    cleaned = cleaned.replace(/^(?:www\.)?(?:ble\.ir|bale\.ai)\//i, '');
    cleaned = cleaned.replace(/[/?#].*$/, '');
    if (!cleaned.startsWith('@') && !cleaned.startsWith('-')) {
      cleaned = `@${cleaned}`;
    }
    return cleaned.trim();
  }

  return cleaned.trim();
}

export const PublicationChannelsManager: React.FC<Props> = ({ channels, onRefresh, isLoading }) => {
  const [editingChannel, setEditingChannel] = useState<PublicationChannel | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [formData, setFormData] = useState<{
    token: string;
    channelId: string;
    baseUrl: string;
    businessAccountId: string;
    accessToken: string;
    autoPublish: boolean;
  }>({
    token: '',
    channelId: '',
    baseUrl: '',
    businessAccountId: '',
    accessToken: '',
    autoPublish: true,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // وضعیت تست و ارسال پیام
  const [testingId, setTestingId] = useState<string | null>(null);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; externalUrl?: string }>>({});
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string; externalUrl?: string } | null>(null);

  const handleOpenEdit = (channel: PublicationChannel) => {
    setEditingChannel(channel);
    setFormName(channel.name || '');
    setFormEnabled(Boolean(channel.enabled));
    setFormData({
      token: '', // عمداً خالی می‌ماند تا توکن ماسک‌شده قبلی در صورت عدم تمایل کاربر رونویسی نشود
      channelId: channel.config?.channelId || channel.config?.chat_id || '',
      baseUrl: channel.config?.baseUrl || '',
      businessAccountId: channel.config?.businessAccountId || channel.config?.igUserId || '',
      accessToken: channel.config?.accessToken || '',
      autoPublish: channel.config?.autoPublish !== false,
    });
    setModalTestResult(null);
    setShowSecret(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingChannel) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const sanitizedChannelId = cleanChannelIdentifier(editingChannel.provider, formData.channelId);

      const updatedConfig: any = {
        ...(editingChannel.config || {}),
        channelId: sanitizedChannelId || undefined,
        chat_id: sanitizedChannelId || undefined,
        baseUrl: formData.baseUrl.trim() || undefined,
        businessAccountId: formData.businessAccountId.trim() || undefined,
        igUserId: formData.businessAccountId.trim() || undefined,
        autoPublish: formData.autoPublish,
      };

      // فقط در صورتی که کاربر مقدار جدیدی در فیلد توکن تایپ کرده باشد، آن را ارسال می‌کنیم
      if (formData.token.trim()) {
        updatedConfig.token = formData.token.trim();
      }

      if (formData.accessToken.trim()) {
        updatedConfig.accessToken = formData.accessToken.trim();
      }

      const saveRes = await api.updatePublicationChannel(editingChannel.id, {
        name: formName.trim() || editingChannel.name,
        enabled: formEnabled,
        config: updatedConfig,
      });

      if (saveRes?.channel) {
        setEditingChannel(saveRes.channel);
        setFormData(prev => ({ ...prev, token: '' }));
      }

      setSaveSuccess(true);
      onRefresh();

      setTimeout(() => {
        setEditingChannel(null);
        setSaveSuccess(false);
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'خطا در ذخیره‌سازی تنظیمات کانال');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnable = async (channel: PublicationChannel) => {
    try {
      await api.updatePublicationChannel(channel.id, {
        enabled: !channel.enabled,
      });
      onRefresh();
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [channel.id]: { success: false, message: `خطا در تغییر وضعیت: ${err.message}` },
      }));
    }
  };

  const handleTestConnection = async (channel: PublicationChannel) => {
    setTestingId(channel.id);
    try {
      const res = await api.testPublicationChannel(channel.id);
      setTestResults(prev => ({ ...prev, [channel.id]: res }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [channel.id]: { success: false, message: err.message || 'خطای شبکه در تست اتصال' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSendTestMessage = async (channel: PublicationChannel) => {
    setSendingTestId(channel.id);
    try {
      const res = await api.sendPublicationChannelTestMessage(channel.id);
      setTestResults(prev => ({
        ...prev,
        [channel.id]: {
          success: res.success,
          message: res.message,
          externalUrl: res.externalUrl,
        },
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [channel.id]: { success: false, message: err.message || 'خطا در ارسال پیام تستی به کانال' },
      }));
    } finally {
      setSendingTestId(null);
    }
  };

  const handleModalTestConnection = async () => {
    if (!editingChannel) return;
    setSaving(true);
    setModalTestResult(null);
    try {
      // ذخیره و به‌روزرسانی تنظیمات جدید کانال قبل از اجرای آزمون
      const sanitizedChannelId = cleanChannelIdentifier(editingChannel.provider, formData.channelId);
      const updatedConfig: any = {
        ...(editingChannel.config || {}),
        channelId: sanitizedChannelId || undefined,
        chat_id: sanitizedChannelId || undefined,
        baseUrl: formData.baseUrl.trim() || undefined,
        autoPublish: formData.autoPublish,
      };
      if (formData.token.trim()) {
        updatedConfig.token = formData.token.trim();
      }
      const updateRes = await api.updatePublicationChannel(editingChannel.id, {
        name: formName.trim() || editingChannel.name,
        enabled: formEnabled,
        config: updatedConfig,
      });
      if (updateRes?.channel) {
        setEditingChannel(updateRes.channel);
        if (formData.token.trim()) {
          setFormData(prev => ({ ...prev, token: '' }));
        }
      }
      onRefresh();

      const res = await api.testPublicationChannel(editingChannel.id);
      setModalTestResult(res);
    } catch (err: any) {
      setModalTestResult({ success: false, message: err.message || 'خطا در تست اتصال' });
    } finally {
      setSaving(false);
    }
  };

  const handleModalSendTestMessage = async () => {
    if (!editingChannel) return;
    setSaving(true);
    setModalTestResult(null);
    try {
      const sanitizedChannelId = cleanChannelIdentifier(editingChannel.provider, formData.channelId);
      const updatedConfig: any = {
        ...(editingChannel.config || {}),
        channelId: sanitizedChannelId || undefined,
        chat_id: sanitizedChannelId || undefined,
        baseUrl: formData.baseUrl.trim() || undefined,
        autoPublish: formData.autoPublish,
      };
      if (formData.token.trim()) {
        updatedConfig.token = formData.token.trim();
      }
      const updateRes = await api.updatePublicationChannel(editingChannel.id, {
        name: formName.trim() || editingChannel.name,
        enabled: formEnabled,
        config: updatedConfig,
      });
      if (updateRes?.channel) {
        setEditingChannel(updateRes.channel);
        if (formData.token.trim()) {
          setFormData(prev => ({ ...prev, token: '' }));
        }
      }
      onRefresh();

      const res = await api.sendPublicationChannelTestMessage(editingChannel.id);
      setModalTestResult(res);
    } catch (err: any) {
      setModalTestResult({ success: false, message: err.message || 'خطا در ارسال پیام تستی' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* عنوان و دکمه تازه‌سازی */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500" />
            درگاه‌ها و کانال‌های انتشار محصول
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تنظیمات اتصال، توکن‌ها و کانال‌های پیام‌رسان‌های ایرانی و بین‌المللی با ذخیره‌سازی امن در پایگاه داده
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#222225] bg-white dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          به‌روزرسانی وضعیت
        </button>
      </div>

      {/* شبکه کارت‌های کانال‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(channel => {
          const meta = PROVIDER_METADATA[channel.provider] || {
            name: channel.name,
            description: '',
            color: 'border-slate-500/30 bg-slate-500/5 text-slate-600',
            badge: channel.provider,
            tokenLabel: 'توکن',
            tokenPlaceholder: '',
            tokenHelp: '',
            channelIdLabel: 'شناسه',
            channelIdPlaceholder: '',
            channelIdHelp: '',
          };

          const isTesting = testingId === channel.id;
          const isSendingTest = sendingTestId === channel.id;
          const testRes = testResults[channel.id];
          const hasSavedToken = Boolean(channel.tokenConfigured);

          return (
            <div
              key={channel.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white dark:bg-[#121214] p-5 shadow-xs transition-all hover:shadow-md ${
                channel.enabled
                  ? 'border-slate-200 dark:border-[#28282D]'
                  : 'border-dashed border-slate-300 dark:border-[#222225] opacity-80'
              }`}
            >
              <div>
                {/* سربرگ کارت */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border mb-2 ${meta.color}`}
                    >
                      {meta.badge}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {channel.name || meta.name}
                    </h3>
                  </div>

                  {/* سوییچ فعال/غیرفعال سریع */}
                  <button
                    onClick={() => handleToggleEnable(channel)}
                    title={channel.enabled ? 'کلیک کنید تا کانال غیرفعال شود' : 'کلیک کنید تا کانال فعال شود'}
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    {channel.enabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {meta.description}
                </p>

                {/* وضعیت و مشخصات کانال */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E1E22] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">وضعیت کانال:</span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        channel.enabled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {channel.enabled ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          فعال و آماده
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" />
                          غیرفعال
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">احراز هویت:</span>
                    {hasSavedToken ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        پیکربندی شده
                      </span>
                    ) : channel.provider === 'website' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        اتصال داخلی
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        نیاز به توکن
                      </span>
                    )}
                  </div>

                  {channel.tokenMasked && (
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <span>کلید امنیتی:</span>
                      <span className="bg-slate-100 dark:bg-[#1B1B1F] px-2 py-0.5 rounded border border-slate-200 dark:border-[#2C2C32] text-slate-800 dark:text-slate-200">
                        {channel.tokenMasked}
                      </span>
                    </div>
                  )}

                  {channel.config?.channelId && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>شناسه کانال:</span>
                      <span className="font-mono dir-ltr font-bold text-slate-800 dark:text-slate-200">
                        {channel.config.channelId}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>انتشار خودکار:</span>
                    <span
                      className={`font-bold ${
                        channel.config?.autoPublish !== false
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {channel.config?.autoPublish !== false ? 'فعال (رویدادی)' : 'غیرفعال (تنها دستی)'}
                    </span>
                  </div>
                </div>

                {/* نتیجه تست اتصال در صورت انجام */}
                {testRes && (
                  <div
                    className={`mt-3 p-2.5 rounded-xl text-xs flex flex-col gap-1.5 border ${
                      testRes.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testRes.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      )}
                      <span className="leading-snug text-[11px]">{testRes.message}</span>
                    </div>
                    {testRes.externalUrl && (
                      <a
                        href={testRes.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mr-6"
                      >
                        <ExternalLink className="w-3 h-3" />
                        مشاهده پست در کانال
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* دکمه‌های عملیات روی کارت */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-[#1E1E22] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    onClick={() => handleTestConnection(channel)}
                    disabled={isTesting || isSendingTest}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2C2C32] hover:bg-slate-50 dark:hover:bg-[#1A1A1E] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    title="بررسی اعتبار توکن و سلامت ارتباط با سرور پیام‌رسان"
                  >
                    <Send className={`w-3 h-3 ${isTesting ? 'animate-bounce' : ''}`} />
                    {isTesting ? 'در حال تست...' : 'تست اتصال'}
                  </button>

                  {channel.provider !== 'website' && (
                    <button
                      onClick={() => handleSendTestMessage(channel)}
                      disabled={isTesting || isSendingTest || !hasSavedToken}
                      className={`flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                        hasSavedToken
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          : 'border-slate-200 dark:border-[#2C2C32] opacity-40 text-slate-400 cursor-not-allowed'
                      }`}
                      title="ارسال یک پیام تستی مستقیم به کانال"
                    >
                      <MessageSquare className={`w-3 h-3 ${isSendingTest ? 'animate-pulse' : ''}`} />
                      {isSendingTest ? 'ارسال...' : 'ارسال پیام تست'}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleOpenEdit(channel)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  تنظیمات
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* مدال جامع پیکربندی و تست کانال */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#28282D] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* سربرگ مدال */}
            <div className="p-5 border-b border-slate-100 dark:border-[#222226] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تنظیمات اتصال به {editingChannel.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      درگاه: {editingChannel.provider}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      ذخیره‌سازی مستقیم در پایگاه داده
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingChannel(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E1E22] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* بنرهای بازخورد خطا یا موفقیت */}
            {saveSuccess && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">تنظیمات با موفقیت ذخیره شد و درگاه به‌روزرسانی گردید.</span>
              </div>
            )}

            {saveError && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* بدنه فرم */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* نام نمایشی و وضعیت فعال/غیرفعال بودن */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-[#222226]">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    نام نمایشی کانال
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={editingChannel.name}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    وضعیت اتصال به کانال
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormEnabled(!formEnabled)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      formEnabled
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-300 dark:border-[#2C2C32] bg-slate-100 dark:bg-[#1A1A1E] text-slate-500'
                    }`}
                  >
                    <span>{formEnabled ? 'فعال (آماده دریافت پست)' : 'غیرفعال (بدون ارسال)'}</span>
                    {formEnabled ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* فیلد توکن محرمانه */}
              {editingChannel.provider !== 'website' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {PROVIDER_METADATA[editingChannel.provider]?.tokenLabel || 'کلید امنیتی بات (Token)'}
                    </label>
                    {editingChannel.tokenConfigured && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        کلید قبلاً ذخیره شده: {editingChannel.tokenMasked}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={formData.token}
                      onChange={e => setFormData({ ...formData, token: e.target.value })}
                      placeholder={
                        editingChannel.tokenConfigured
                          ? 'توکن قبلاً با موفقیت ذخیره شده است (فقط برای تعویض مقدار جدید بنویسید)'
                          : PROVIDER_METADATA[editingChannel.provider]?.tokenPlaceholder
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {PROVIDER_METADATA[editingChannel.provider]?.tokenHelp}
                  </p>
                </div>
              )}

              {/* شناسه کانال */}
              {editingChannel.provider !== 'website' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {PROVIDER_METADATA[editingChannel.provider]?.channelIdLabel || 'شناسه کانال (Chat ID)'}
                    </label>
                    {formData.channelId && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                        شناسه تمیز: {cleanChannelIdentifier(editingChannel.provider, formData.channelId)}
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={formData.channelId}
                    onChange={e => setFormData({ ...formData, channelId: e.target.value })}
                    onBlur={() => {
                      const cleaned = cleanChannelIdentifier(editingChannel.provider, formData.channelId);
                      if (cleaned && cleaned !== formData.channelId) {
                        setFormData(prev => ({ ...prev, channelId: cleaned }));
                      }
                    }}
                    placeholder={
                      PROVIDER_METADATA[editingChannel.provider]?.channelIdPlaceholder || 'khatynoo یا https://eitaa.com/khatynoo'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {PROVIDER_METADATA[editingChannel.provider]?.channelIdHelp}
                  </p>

                  {editingChannel.provider === 'eitaa' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-950 dark:text-orange-200 text-xs leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1 text-orange-700 dark:text-orange-400">
                        <span>💡 راهنمای تنظیم دقیق شناسه چت ایتا (chat_id):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <li>
                          <strong>کانال عمومی:</strong> نام کاربری ساده یا با @ یا لینک مستقیم (مثال: <code className="font-mono text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 px-1 py-0.5 rounded font-bold">khatynoo</code>)
                        </li>
                        <li>
                          <strong>کانال خصوصی یا گروه:</strong> لینک دعوت کامل (مانند <code className="font-mono text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 px-1 py-0.5 rounded">https://eitaa.com/joinchat/...</code>) یا شناسه عددی chat_id
                        </li>
                        <li className="text-amber-700 dark:text-amber-300 font-medium">
                          <strong>⚠️ پیش‌نیاز بسیار مهم:</strong> بات خود یا فرستنده سامانه را حتماً در کانال خود <strong>ادمین (مدیر با دسترسی ارسال پیام)</strong> کنید؛ در غیر این صورت ایتا اجازه ارسال پیام را نخواهد داد.
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* آدرس درگاه اختصاصی */}
              {(editingChannel.provider === 'eitaa' || editingChannel.provider === 'telegram') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    آدرس درگاه اختصاصی یا پروکسی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.baseUrl}
                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder={
                      editingChannel.provider === 'eitaa'
                        ? 'پیش‌فرض: https://eitaayar.ir/api'
                        : 'پیش‌فرض: https://api.telegram.org'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                    dir="ltr"
                  />
                </div>
              )}

              {/* سوییچ انتشار خودکار */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#222226]">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      مشارکت در انتشار خودکار رویدادها
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      هنگام ثبت کالای جدید، تغییر قیمت یا شارژ موجودی، به صورت خودکار در این کانال منتشر شود.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoPublish}
                    onChange={e => setFormData({ ...formData, autoPublish: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* بخش تست درجا درون مدال */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#222226]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    آزمایش سلامت قبل از خروج
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleModalTestConnection}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-[#2C2C32] hover:bg-slate-100 dark:hover:bg-[#1C1C20] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      تست اعتبار توکن
                    </button>
                    <button
                      type="button"
                      onClick={handleModalSendTestMessage}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                    >
                      ارسال پیام آزمایشی به کانال
                    </button>
                  </div>
                </div>

                {modalTestResult && (
                  <div
                    className={`mt-2.5 p-3 rounded-xl text-xs flex flex-col gap-1.5 border ${
                      modalTestResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {modalTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      )}
                      <span className="leading-relaxed">{modalTestResult.message}</span>
                    </div>
                    {modalTestResult.externalUrl && (
                      <a
                        href={modalTestResult.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mr-6"
                      >
                        <ExternalLink className="w-3 h-3" />
                        مشاهده پیام در پیام‌رسان
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* پاورقی دکمه‌های ذخیره */}
            <div className="p-4 border-t border-slate-100 dark:border-[#222226] bg-slate-50 dark:bg-[#101012] flex items-center justify-between gap-3">
              {PROVIDER_METADATA[editingChannel.provider]?.docsUrl && (
                <a
                  href={PROVIDER_METADATA[editingChannel.provider]?.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {PROVIDER_METADATA[editingChannel.provider]?.docsLabel || 'راهنما'}
                </a>
              )}
              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#C9A227] to-[#A28018] text-slate-950 font-black shadow-md shadow-amber-500/20 hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره قطعی تنظیمات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
