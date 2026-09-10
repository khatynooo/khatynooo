import React, { useState, useEffect } from 'react';
import {
  Share2,
  Radio,
  Clock,
  Settings,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { PublicationChannel, PublicationSettings } from '../../../types';
import { api } from '../../../lib/api';
import { PublicationChannelsManager } from './PublicationChannelsManager';
import { PublicationHistoryLog } from './PublicationHistoryLog';
import { PublicationSettingsModal } from './PublicationSettingsModal';

export const PublicationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'channels' | 'history'>('channels');
  const [channels, setChannels] = useState<PublicationChannel[]>([]);
  const [settings, setSettings] = useState<PublicationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chanRes, setRes] = await Promise.all([
        api.getPublicationChannels(),
        api.getPublicationSettings(),
      ]);

      if (chanRes && chanRes.channels) {
        setChannels(chanRes.channels);
      }
      if (setRes && setRes.settings) {
        setSettings(setRes.settings);
      }
    } catch (err: any) {
      console.error('Error loading publication data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const configuredCount = channels.filter(c => c.tokenConfigured || c.provider === 'website').length;

  return (
    <div className="space-y-6">
      {/* سربرگ بخش انتشار */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#222225] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#C9A227]/20">
            <Radio className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
              سیستم انتشار چندکاناله کالا (Multi-Channel Publication)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              همگام‌سازی و اطلاع‌رسانی خودکار کالاها در پیام‌رسان‌های ایتا، بله، تلگرام، اینستاگرام و وب‌سایت خطی‌نو
            </p>
          </div>
        </div>

        {/* دکمه‌های اقدام سریع */}
        <div className="flex items-center gap-2.5">
          {settings && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#28282E] bg-slate-50 dark:bg-[#1A1A1E] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222226] transition-colors"
            >
              <Sliders className="w-4 h-4 text-amber-500" />
              تنظیمات رویدادها و قالب
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1A1A1E] text-[11px] font-mono border border-slate-200 dark:border-[#28282E]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {configuredCount} از {channels.length} کانال متصل
            </span>
          </div>
        </div>
      </div>

      {/* زبانه‌های ناوبری (Tabs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#222225] pb-2">
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'channels'
              ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/50 text-amber-900 dark:text-[#F3F4F6] shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          کانال‌ها و درگاه‌های پیام‌رسان
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-50 dark:bg-[#1C1C20] border border-[#C9A227]/50 text-amber-900 dark:text-[#F3F4F6] shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          صف و تاریخچه انتشار محصولات
        </button>
      </div>

      {/* تب درگاه‌ها */}
      {activeTab === 'channels' && (
        <PublicationChannelsManager
          channels={channels}
          onRefresh={loadData}
          isLoading={loading}
        />
      )}

      {/* تب لاگ و تاریخچه */}
      {activeTab === 'history' && <PublicationHistoryLog />}

      {/* مدال تنظیمات انتشار */}
      {settings && (
        <PublicationSettingsModal
          settings={settings}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};
