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
    channelIdLabel?: string;
    channelIdPlaceholder?: string;
    docsUrl?: string;
  }
> = {
  eitaa: {
    name: 'پیام‌رسان ایتا (Eitaa)',
    description: 'ارسال مستقیم و آنی به کانال رسمی فروشگاه در پیام‌رسان ایتا از طریق Bot API بومی',
    color: 'border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400',
    badge: 'بومی ایران',
    tokenLabel: 'توکن بات ایتا (Bot Token)',
    tokenPlaceholder: 'bot123456:abcdef...',
    channelIdLabel: 'شناسه کانال (Chat ID یا آیدی با @)',
    channelIdPlaceholder: 'khatynoo_channel یا @khatynoo_channel',
    docsUrl: 'https://eitaa.com/faq',
  },
  bale: {
    name: 'پیام‌رسان بله (Bale)',
    description: 'انتشار خودکار در کانال پیام‌رسان بله همراه با تصویر، هشتگ‌ها و قیمت رسمی',
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    badge: 'بومی ایران',
    tokenLabel: 'توکن بات بله (Bot Token)',
    tokenPlaceholder: '123456789:ABCdefGHI...',
    channelIdLabel: 'شناسه کانال بله (Chat ID یا آیدی با @)',
    channelIdPlaceholder: '@khatynoo_bale یا -1001234567890',
    docsUrl: 'https://ble.ir',
  },
  telegram: {
    name: 'پیام‌رسان تلگرام (Telegram)',
    description: 'انتشار پست رسمی محصول با فرمت HTML در کانال تلگرامی فروشگاه خطی‌نو',
    color: 'border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400',
    badge: 'بین‌المللی',
    tokenLabel: 'توکن بات تلگرام (BotFather Token)',
    tokenPlaceholder: '1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw',
    channelIdLabel: 'شناسه کانال عمومی یا عددی تلگرام',
    channelIdPlaceholder: '@khatynoo یا -100123456789',
    docsUrl: 'https://core.telegram.org/bots/api',
  },
  instagram: {
    name: 'صفحه اینستاگرام (Instagram Graph API)',
    description: 'انتشار عکس محصول به همراه کپشن کامل در اکانت تجاری اینستاگرام خطی‌نو',
    color: 'border-pink-500/30 bg-pink-500/5 text-pink-600 dark:text-pink-400',
    badge: 'Meta Graph API',
    tokenLabel: 'User Access Token یا Page Token اینستاگرام',
    tokenPlaceholder: 'EAAQ...',
    channelIdLabel: 'شناسه اکانت تجاری اینستاگرام (Instagram Business Account ID)',
    channelIdPlaceholder: '17841400000000000',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
  },
  website: {
    name: 'فروشگاه اینترنتی خطی‌نو (Website)',
    description: 'نمایش و همگام‌سازی لحظه‌ای در ویترین وب‌سایت عمومی khatynoo.ir',
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    badge: 'فروشگاه آنلاین',
    tokenLabel: 'شناسه وب‌سایت (داخلی)',
    tokenPlaceholder: 'khatynoo.ir (بدون نیاز به توکن)',
  },
};

export const PublicationChannelsManager: React.FC<Props> = ({ channels, onRefresh, isLoading }) => {
  const [editingChannel, setEditingChannel] = useState<PublicationChannel | null>(null);
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
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleOpenEdit = (channel: PublicationChannel) => {
    setEditingChannel(channel);
    setFormData({
      token: channel.config.token || '',
      channelId: channel.config.channelId || '',
      baseUrl: channel.config.baseUrl || '',
      businessAccountId: channel.config.businessAccountId || '',
      accessToken: channel.config.accessToken || '',
      autoPublish: channel.config.autoPublish !== false,
    });
    setShowSecret(false);
  };

  const handleSave = async () => {
    if (!editingChannel) return;
    setSaving(true);
    try {
      const updatedConfig = {
        ...editingChannel.config,
        token: formData.token.trim() || undefined,
        channelId: formData.channelId.trim() || undefined,
        baseUrl: formData.baseUrl.trim() || undefined,
        businessAccountId: formData.businessAccountId.trim() || undefined,
        accessToken: formData.accessToken.trim() || undefined,
        autoPublish: formData.autoPublish,
      };

      await api.updatePublicationChannel(editingChannel.id, {
        enabled: editingChannel.enabled,
        config: updatedConfig,
      });

      setEditingChannel(null);
      onRefresh();
    } catch (err: any) {
      alert(`خطا در ذخیره کانال: ${err.message}`);
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
      alert(`خطا در تغییر وضعیت کانال: ${err.message}`);
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
        [channel.id]: { success: false, message: err.message || 'خطای شبکه' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            درگاه‌ها و کانال‌های انتشار محصول
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            پیکربندی کلیدهای API و اتصال به پیام‌رسان‌های ایرانی و بین‌المللی با پروتکل‌های امن و عدم افشای توکن‌ها
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#222225] bg-white dark:bg-[#161619] hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          به‌روزرسانی وضعیت
        </button>
      </div>

      {/* لیست کارت‌های کانال‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(channel => {
          const meta = PROVIDER_METADATA[channel.provider] || {
            name: channel.name,
            description: '',
            color: 'border-slate-500/30 bg-slate-500/5 text-slate-600',
            badge: channel.provider,
            tokenLabel: 'توکن',
            tokenPlaceholder: '',
          };

          const isTesting = testingId === channel.id;
          const testRes = testResults[channel.id];

          return (
            <div
              key={channel.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white dark:bg-[#121214] p-5 shadow-xs transition-all hover:shadow-md ${
                channel.enabled
                  ? 'border-slate-200 dark:border-[#28282D]'
                  : 'border-dashed border-slate-200 dark:border-[#222225] opacity-75'
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

                  {/* سوییچ فعال/غیرفعال */}
                  <button
                    onClick={() => handleToggleEnable(channel)}
                    title={channel.enabled ? 'غیرفعال‌سازی کانال' : 'فعال‌سازی کانال'}
                    className="cursor-pointer transition-transform active:scale-90"
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

                {/* وضعیت پیکربندی توکن */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E1E22] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">وضعیت احراز هویت:</span>
                    {channel.tokenConfigured ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        پیکربندی شده
                      </span>
                    ) : channel.provider === 'website' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        آماده اتصال
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        نیاز به تنظیم
                      </span>
                    )}
                  </div>

                  {channel.tokenMasked && (
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <span>کلید امنیتی:</span>
                      <span className="bg-slate-100 dark:bg-[#1B1B1F] px-2 py-0.5 rounded border border-slate-200 dark:border-[#2C2C32]">
                        {channel.tokenMasked}
                      </span>
                    </div>
                  )}

                  {channel.config.channelId && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>شناسه کانال:</span>
                      <span className="font-mono dir-ltr">{channel.config.channelId}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>انتشار خودکار:</span>
                    <span
                      className={`font-bold ${
                        channel.config.autoPublish !== false
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {channel.config.autoPublish !== false ? 'فعال' : 'غیرفعال (تنها دستی)'}
                    </span>
                  </div>
                </div>

                {/* نتیجه تست اتصال در صورت انجام */}
                {testRes && (
                  <div
                    className={`mt-3 p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                      testRes.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {testRes.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="leading-snug">{testRes.message}</span>
                  </div>
                )}
              </div>

              {/* دکمه‌های عملیات */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-[#1E1E22] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestConnection(channel)}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#2C2C32] hover:bg-slate-50 dark:hover:bg-[#1A1A1E] text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Send className={`w-3 h-3 ${isTesting ? 'animate-bounce' : ''}`} />
                  {isTesting ? 'در حال تست...' : 'تست اتصال'}
                </button>

                <button
                  onClick={() => handleOpenEdit(channel)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  تنظیمات
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* مدال ویرایش تنظیمات و توکن‌های یک کانال */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#28282D] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* سربرگ مدال */}
            <div className="p-5 border-b border-slate-100 dark:border-[#222226] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    پیکربندی اتصال به {editingChannel.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Provider: {editingChannel.provider}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingChannel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* فیلدهای فرم */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {editingChannel.provider !== 'website' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {PROVIDER_METADATA[editingChannel.provider]?.tokenLabel || 'توکن احراز هویت (Token)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={formData.token}
                      onChange={e => setFormData({ ...formData, token: e.target.value })}
                      placeholder={
                        editingChannel.tokenConfigured && !formData.token
                          ? 'توکن از قبل ذخیره است (برای تغییر، مقدار جدید وارد کنید)'
                          : PROVIDER_METADATA[editingChannel.provider]?.tokenPlaceholder
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    توکن‌ها به صورت محرمانه در پایگاه داده سرور ذخیره می‌شوند و هرگز در فرانت‌اند افشا نخواهند شد.
                  </p>
                </div>
              )}

              {/* شناسه کانال یا پیج */}
              {editingChannel.provider !== 'website' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {PROVIDER_METADATA[editingChannel.provider]?.channelIdLabel || 'شناسه کانال (Chat ID)'}
                  </label>
                  <input
                    type="text"
                    value={formData.channelId}
                    onChange={e => setFormData({ ...formData, channelId: e.target.value })}
                    placeholder={
                      PROVIDER_METADATA[editingChannel.provider]?.channelIdPlaceholder || '@channel_id'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2C2C32] bg-slate-50 dark:bg-[#1A1A1E] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    برای کانال‌های عمومی می‌توانید از نام کاربری کانال با علامت @ و برای کانال‌های خصوصی از شناسه عددی استفاده نمایید. بات باید ادمین کانال با دسترسی ارسال پیام باشد.
                  </p>
                </div>
              )}

              {/* آدرس پایه اختصاصی (در صورت نیاز به پراکسی یا سرور محلی ایتا/تلگرام) */}
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

              {/* سوییچ انتشار خودکار برای این کانال */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#222226]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    مشارکت در انتشار خودکار رویدادها
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.autoPublish}
                    onChange={e => setFormData({ ...formData, autoPublish: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  با غیرفعال کردن این گزینه، کالاها تنها در صورت انتشار دستی به این کانال ارسال خواهند شد.
                </p>
              </div>
            </div>

            {/* پاورقی دکمه‌ها */}
            <div className="p-4 border-t border-slate-100 dark:border-[#222226] bg-slate-50 dark:bg-[#101012] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingChannel(null)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C1C20] transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#C9A227] to-[#A28018] text-slate-950 font-black shadow-md shadow-amber-500/20 hover:opacity-90 transition-opacity"
              >
                {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات کانال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
