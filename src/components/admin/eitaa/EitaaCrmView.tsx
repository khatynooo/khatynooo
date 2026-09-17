import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  User,
  Phone,
  CheckCheck,
  Clock,
  AlertCircle,
  RotateCw,
  Settings,
  X,
  ExternalLink,
  ShieldCheck,
  Filter,
  UserCheck,
  RefreshCw,
  Sparkles,
  Bot,
  Hash,
  ChevronLeft,
  ArrowRight,
  AlertTriangle,
  Copy,
  Key
} from 'lucide-react';
import { api } from '../../../lib/api';
import { formatToman, toPersianDigits } from '../../../lib/utils';
import { useToast } from '../../common/Toast';

interface EitaaContact {
  id: string;
  chatId: string;
  eitaaUserId?: string;
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  customerBalance?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  mobile?: string;
  source?: string;
  status: 'active' | 'blocked' | 'inactive' | 'pending';
  isBlocked?: boolean;
  lastSeenAt?: string;
  firstSeenAt?: string;
  receiptCodes?: string[];
  totalOrders?: number;
  totalOrdersCount?: number;
  totalSpent?: number;
  totalPurchaseAmount?: number;
  connectivityBadge?: 'can_send' | 'incomplete_chat_id' | 'failed_blocked' | 'no_interaction';
  createdAt: string;
}

interface EitaaMessage {
  id: string;
  chatId: string;
  direction: 'inbound' | 'outbound' | 'incoming' | 'outgoing';
  messageType?: 'text' | 'order_notification' | 'invoice' | 'marketing';
  messageTitle?: string;
  title?: string;
  messageText?: string;
  text?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'retrying';
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  providerMessageId?: string;
  attempts?: number;
  retryCount?: number;
  senderName?: string;
  createdAt: string;
}

interface InboxConversation {
  chatId: string;
  contactName: string;
  customerName?: string;
  customerMobile?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'sent' | 'delivered' | 'failed';
}

export const EitaaCrmView: React.FC = () => {
  const { showToast } = useToast();

  // تب فعال در صفحه CRM
  const [activeTab, setActiveTab] = useState<'inbox' | 'contacts' | 'settings'>('inbox');

  // داده‌های اینباکس و مکالمات
  const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<EitaaContact | null>(null);
  const [messages, setMessages] = useState<EitaaMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyTitle, setReplyTitle] = useState('');
  const [isSending, setIsSending] = useState(false);

  // داده‌های لیست کل مخاطبین
  const [contacts, setContacts] = useState<EitaaContact[]>([]);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsStatusFilter, setContactsStatusFilter] = useState('all');
  const [contactsHasChatIdFilter, setContactsHasChatIdFilter] = useState('all');
  const [contactsIsCustomerFilter, setContactsIsCustomerFilter] = useState('all');
  const [contactsSourceFilter, setContactsSourceFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // پروفایل کامل مخاطب جهت نمایش در مودال
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // تنظیمات بات
  const [botSettings, setBotSettings] = useState<{
    token: string;
    botUsername: string;
    appUrl: string;
    webhookSecret?: string;
  }>({
    token: '',
    botUsername: '',
    appUrl: '',
    webhookSecret: '',
  });

  // مودال افزودن / ویرایش مخاطب
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    chatId: '',
    firstName: '',
    lastName: '',
    username: '',
    mobile: '',
    status: 'active' as 'active' | 'blocked' | 'pending',
  });

  // بارگذاری داده‌ها
  const loadInbox = async () => {
    try {
      const res = await api.getEitaaInbox();
      const rawList = res.inbox || res.conversations || [];
      const convs = rawList.map((item: any) => ({
        chatId: item.chat_id || item.chatId,
        contactName: item.contactName || item.first_name || item.name || item.chat_id || item.chatId,
        customerName: item.customer_name || item.customerName,
        customerMobile: item.customer_mobile || item.customerMobile,
        lastMessage: item.text || item.lastMessage || item.lastMessageText || 'پیام ثبت شده',
        lastMessageAt: item.created_at || item.lastMessageAt || item.lastMessageTime || new Date().toISOString(),
        unreadCount: Number(item.unreadCount || item.unread_count || 0),
        status: item.status || item.lastMessageStatus || 'sent',
      }));
      setInboxConversations(convs);

      // اگر مکالمه‌ای انتخاب نشده، اولین مورد انتخاب شود
      if (!selectedChatId && convs.length > 0) {
        setSelectedChatId(convs[0].chatId);
      }
    } catch (err) {
      console.error('Error loading eitaa inbox:', err);
    }
  };

  const loadContacts = async () => {
    try {
      const res = await api.getEitaaContacts({
        query: contactsSearch,
        status: contactsStatusFilter !== 'all' ? contactsStatusFilter : undefined,
        hasChatId: contactsHasChatIdFilter !== 'all' ? contactsHasChatIdFilter : undefined,
        isCustomer: contactsIsCustomerFilter !== 'all' ? contactsIsCustomerFilter : undefined,
        source: contactsSourceFilter !== 'all' ? contactsSourceFilter : undefined,
      });
      setContacts(res.contacts || []);
    } catch (err) {
      console.error('Error loading eitaa contacts:', err);
    }
  };

  const openContactProfile = async (chatId: string) => {
    setIsProfileLoading(true);
    try {
      const data = await api.getEitaaContactProfile(chatId);
      setViewingProfile(data);
    } catch (err: any) {
      showToast('خطا در دریافت پروفایل مخاطب: ' + (err.message || ''), 'error');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const loadBotSettings = async () => {
    try {
      const res = await api.getEitaaBotSettings();
      if (res) {
        const s = res.settings || res;
        setBotSettings({
          token: s.token || '',
          botUsername: s.botUsername || '',
          appUrl: s.appUrl || '',
          webhookSecret: s.webhookSecret || '',
        });
      }
    } catch (err) {
      console.error('Error loading bot settings:', err);
    }
  };

  const handleGenerateWebhookSecret = async () => {
    if (!confirm('آیا از تولید رمز عبور جدید برای وب‌هوک ایتا اطمینان دارید؟ در صورت تغییر، باید این رمز را در هدر درخواست‌های ارسالی تنظیم فرمایید.')) {
      return;
    }
    try {
      const res = await api.generateEitaaWebhookSecret();
      if (res.secret) {
        setBotSettings((prev) => ({ ...prev, webhookSecret: res.secret }));
        showToast('رمز وب‌هوک جدید با موفقیت تولید و ذخیره شد.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در تولید رمز جدید', 'error');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadInbox(), loadContacts(), loadBotSettings()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // وقتی چت آیدی انتخاب شده تغییر کرد، پیام‌ها و پروفایلش لود شود
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchThread = async () => {
      try {
        const [msgsRes, profileRes] = await Promise.all([
          api.getEitaaMessages({ chatId: selectedChatId }),
          api.getEitaaContactProfile(selectedChatId).catch(() => ({ contact: null })),
        ]);
        setMessages(msgsRes.messages || []);
        if (profileRes.contact) {
          setSelectedContact(profileRes.contact);
        } else {
          setSelectedContact(null);
        }
      } catch (err) {
        console.error('Error fetching chat messages:', err);
      }
    };

    fetchThread();
  }, [selectedChatId]);

  // ارسال پیام مستقیم
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !replyText.trim()) return;

    setIsSending(true);
    try {
      await api.sendEitaaDirectMessage({
        chatId: selectedChatId,
        text: replyText.trim(),
        title: replyTitle.trim() || undefined,
        identityId: selectedContact?.id,
        customerId: selectedContact?.customerId,
      });

      showToast('پیام به صف ارسال ایتا فرستاده شد.', 'success');
      setReplyText('');
      setReplyTitle('');

      // رفرش پیام‌ها
      const msgsRes = await api.getEitaaMessages({ chatId: selectedChatId });
      setMessages(msgsRes.messages || []);
      loadInbox();
    } catch (err: any) {
      showToast(err.message || 'خطا در ارسال پیام', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // تلاش مجدد برای پیام ناموفق
  const handleRetryMessage = async (msgId: string) => {
    try {
      await api.retryEitaaMessage(msgId);
      showToast('تلاش مجدد برای ارسال پیام آغاز شد.', 'info');
      if (selectedChatId) {
        const msgsRes = await api.getEitaaMessages({ chatId: selectedChatId });
        setMessages(msgsRes.messages || []);
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در تلاش مجدد', 'error');
    }
  };

  // ذخیره مخاطب
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.chatId.trim()) {
      showToast('شناسه چت ایتا (Chat ID) الزامی است.', 'warning');
      return;
    }

    try {
      await api.saveEitaaContact(contactForm);
      showToast('مشخصات مخاطب ایتا با موفقیت ثبت و با حساب مشتری تطبیق داده شد.', 'success');
      setShowContactModal(false);
      loadContacts();
      loadInbox();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره مخاطب', 'error');
    }
  };

  // ذخیره تنظیمات بات
  const handleSaveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateEitaaBotSettings(botSettings);
      showToast('تنظیمات ربات ایتا با موفقیت ذخیره شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره تنظیمات ربات', 'error');
    }
  };

  // نشانگر وضعیت پیام
  const getMessageStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return <span className="inline-flex items-center text-[10px] text-emerald-500 font-bold"><CheckCheck className="w-3.5 h-3.5 mr-0.5" /> ارسال شد</span>;
      case 'failed':
        return (
          <span className="inline-flex items-center text-[10px] text-rose-500 font-bold" title={error}>
            <AlertCircle className="w-3.5 h-3.5 mr-0.5" /> خطا در ارسال
          </span>
        );
      default:
        return <span className="inline-flex items-center text-[10px] text-amber-500 font-bold"><Clock className="w-3.5 h-3.5 mr-0.5" /> در صف</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه و تب‌ها */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111113] p-5 rounded-2xl border border-slate-200 dark:border-[#222225] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-[#F3F4F6]">
                صندوق پیام و مخاطبین پیام‌رسان ایتا (Eitaa CRM)
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8E9299]">
                اتصال مستقیم با چت‌آیدی اختصاصی مشتری، ارسال پیام‌های سفارش، رهگیری گفتگوها و تنظیمات بات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-[#1A1A1E] p-1 rounded-xl border border-slate-200 dark:border-[#2E2E33]">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-white dark:bg-[#252529] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              صندوق پیام‌ها ({toPersianDigits(inboxConversations.length)})
            </button>
            <button
              onClick={() => {
                setActiveTab('contacts');
                loadContacts();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'contacts'
                  ? 'bg-white dark:bg-[#252529] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              مخاطبین ایتا ({toPersianDigits(contacts.length)})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-[#252529] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              تنظیمات بات
            </button>
          </div>

          <button
            onClick={() => {
              setContactForm({
                chatId: '',
                firstName: '',
                lastName: '',
                username: '',
                mobile: '',
                status: 'active',
              });
              setShowContactModal(true);
            }}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            افزودن مخاطب
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* تب ۱: صندوق پیام‌ها (Inbox & Chat Window) */}
      {/* ======================================================== */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[680px]">
          {/* لیست گفتگوها (مکالمات اخیر) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111113] rounded-2xl border border-slate-200 dark:border-[#222225] flex flex-col overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                گفتگوهای اخیر
              </span>
              <button
                onClick={loadInbox}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                title="تازه سازی"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1A1A1E]">
              {inboxConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  هیچ پیامی در صندوق ایتا یافت نشد.
                </div>
              ) : (
                inboxConversations.map((conv) => {
                  const isSelected = selectedChatId === conv.chatId;
                  return (
                    <button
                      key={conv.chatId}
                      onClick={() => setSelectedChatId(conv.chatId)}
                      className={`w-full p-3.5 text-right transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/70 dark:bg-orange-950/20 border-r-4 border-orange-500'
                          : 'hover:bg-slate-50 dark:hover:bg-[#161619]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#1F1F23] text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {conv.contactName.slice(0, 1) || 'ع'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {conv.contactName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {conv.chatId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.customerName && (
                          <span className="inline-block text-[9px] bg-slate-100 dark:bg-[#222226] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded mt-1 font-bold">
                            مشتری: {conv.customerName}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* پنل مکالمه فعال و ارسال پیام */}
          <div className="lg:col-span-8 bg-white dark:bg-[#111113] rounded-2xl border border-slate-200 dark:border-[#222225] flex flex-col overflow-hidden shadow-xs">
            {selectedChatId ? (
              <>
                {/* هدر چت انتخاب شده */}
                <div className="p-4 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between bg-slate-50/50 dark:bg-[#141417]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white">
                          {selectedContact?.firstName || selectedContact?.customerName || 'کاربر ایتا'}
                        </h3>
                        <span className="text-[10px] bg-orange-100 dark:bg-orange-950/40 text-orange-600 px-2 py-0.5 rounded-full font-mono font-bold">
                          چت‌آیدی: {selectedChatId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {selectedContact?.customerMobile && (
                          <span>موبایل: {toPersianDigits(selectedContact.customerMobile)}</span>
                        )}
                        {selectedContact?.customerName && (
                          <span>حساب: {selectedContact.customerName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedContact?.customerId && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> مشتری تایید شده سیستم
                      </span>
                    )}
                  </div>
                </div>

                {/* حباب‌های پیام */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-[#0E0E10]">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      هنوز پیامی با این چت‌آیدی مبادله نشده است.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOutbound = msg.direction === 'outbound';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isOutbound
                                ? 'bg-orange-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-[#1E1E22] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#2C2C30] rounded-bl-none'
                            }`}
                          >
                            {msg.title && (
                              <div className="font-bold border-b border-white/20 pb-1 mb-1.5 text-xs">
                                {msg.title}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>

                          <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                            <span>{new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOutbound && (
                              <>
                                <span>•</span>
                                {getMessageStatusBadge(msg.status, msg.errorMessage)}
                                {msg.status === 'failed' && (
                                  <button
                                    onClick={() => handleRetryMessage(msg.id)}
                                    className="text-rose-500 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                                  >
                                    <RotateCw className="w-3 h-3" /> تلاش مجدد
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* فرم ارسال پاسخ یا پیام مستقیم */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-[#222225] bg-white dark:bg-[#111113]">
                  <div className="mb-2">
                    <input
                      type="text"
                      value={replyTitle}
                      onChange={(e) => setReplyTitle(e.target.value)}
                      placeholder="عنوان پیام (اختیاری - مثلاً: اطلاع‌رسانی سفارش #۱۲۳)"
                      className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="متن پیام به مشتری در ایتا را بنویسید (Enter برای ارسال)..."
                      className="flex-1 bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-orange-500 resize-none"
                      rows={2}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="h-14 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <Send className="w-4 h-4 rotate-180" />
                      <span>ارسال</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  یک گفتگو را برای مشاهده یا ارسال پیام انتخاب کنید
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  شما می‌توانید با ثبت چت‌آیدی مشتری یا اتصال سفارشات فنرزنی، پیام‌ها و پیش‌فاکتورها را بدون نیاز به لاگین مجدد مستقیماً به حساب ایتا بفرستید.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* تب ۲: دفترچه مخاطبین و هویت‌های ایتا */}
      {/* ======================================================== */}
      {activeTab === 'contacts' && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-200 dark:border-[#222225] overflow-hidden shadow-xs">
          {/* نوار جستجو و فیلترهای پیشرفته */}
          <div className="p-4 border-b border-slate-200 dark:border-[#222225] space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadContacts()}
                  placeholder="جستجو با نام، موبایل، نام کاربری، chat_id، کد قبض یا سفارش..."
                  className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={loadContacts}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>اعمال جستجو</span>
                </button>
                <button
                  onClick={loadContacts}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1A1A1E] dark:hover:bg-[#252529] rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="تازه‌سازی"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ردیف فیلترهای چندگانه */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-[#1C1C1F]">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>فیلترها:</span>
              </div>

              {/* فیلتر وضعیت حساب */}
              <select
                value={contactsStatusFilter}
                onChange={(e) => {
                  setContactsStatusFilter(e.target.value);
                  setTimeout(loadContacts, 50);
                }}
                className="bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">وضعیت: همه</option>
                <option value="active">فعال</option>
                <option value="blocked">مسدود</option>
              </select>

              {/* فیلتر Chat ID */}
              <select
                value={contactsHasChatIdFilter}
                onChange={(e) => {
                  setContactsHasChatIdFilter(e.target.value);
                  setTimeout(loadContacts, 50);
                }}
                className="bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">شناسه چت: همه</option>
                <option value="yes">دارای Chat ID</option>
                <option value="no">بدون Chat ID</option>
              </select>

              {/* فیلتر حساب مشتری متصل */}
              <select
                value={contactsIsCustomerFilter}
                onChange={(e) => {
                  setContactsIsCustomerFilter(e.target.value);
                  setTimeout(loadContacts, 50);
                }}
                className="bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">مشتری: همه</option>
                <option value="yes">مشتری ثبت‌شده</option>
                <option value="no">کاربر متصل‌نشده</option>
              </select>

              {/* فیلتر منبع ورودی */}
              <select
                value={contactsSourceFilter}
                onChange={(e) => {
                  setContactsSourceFilter(e.target.value);
                  setTimeout(loadContacts, 50);
                }}
                className="bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">منبع: همه</option>
                <option value="mini_app">برنامک ایتا</option>
                <option value="bot_interaction">تعامل با بات</option>
                <option value="order_checkout">ثبت در سفارش</option>
                <option value="admin_manual">ثبت دستی ادمین</option>
              </select>
            </div>
          </div>

          {/* جدول مخاطبین */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-[#161619] text-slate-500 dark:text-[#8E9299] border-b border-slate-200 dark:border-[#222225]">
                <tr>
                  <th className="py-3 px-3 font-bold">نام مخاطب</th>
                  <th className="py-3 px-3 font-bold">نام کاربری</th>
                  <th className="py-3 px-3 font-bold">شماره همراه</th>
                  <th className="py-3 px-3 font-bold">شناسه چت (Chat ID)</th>
                  <th className="py-3 px-3 font-bold">وضعیت حساب</th>
                  <th className="py-3 px-3 font-bold">آخرین فعالیت</th>
                  <th className="py-3 px-3 font-bold">منبع ورود</th>
                  <th className="py-3 px-3 font-bold text-center">وضعیت ارتباط</th>
                  <th className="py-3 px-3 font-bold text-center">اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F1F23]">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      هیچ مخاطبی با مشخصات فوق یافت نشد.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const badge = c.connectivityBadge || (c.chatId ? (c.status === 'blocked' ? 'failed_blocked' : 'can_send') : 'incomplete_chat_id');
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-[#161619]/50 transition-colors">
                        {/* نام مخاطب و لینک به مشتری */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : 'بدون نام'}</span>
                            {c.customerId && (
                              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                                مشتری
                              </span>
                            )}
                          </div>
                          {c.customerName && c.customerName !== c.firstName && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                              حساب: {c.customerName}
                            </span>
                          )}
                        </td>

                        {/* نام کاربری */}
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                          {c.username ? `@${c.username}` : '-'}
                        </td>

                        {/* موبایل */}
                        <td className="py-3 px-3 font-mono">
                          {c.mobile || c.customerMobile ? toPersianDigits(c.mobile || c.customerMobile || '') : '-'}
                        </td>

                        {/* Chat ID */}
                        <td className="py-3 px-3 font-mono font-bold text-orange-600">
                          {c.chatId || <span className="text-amber-500 font-normal">ندارد</span>}
                        </td>

                        {/* وضعیت حساب */}
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {c.status === 'active' ? 'فعال' : 'مسدود'}
                          </span>
                        </td>

                        {/* آخرین فعالیت */}
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleDateString('fa-IR') : '-'}
                        </td>

                        {/* منبع */}
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {c.source === 'mini_app' && 'برنامک ایتا'}
                          {c.source === 'bot_interaction' && 'تعامل بات'}
                          {c.source === 'order_checkout' && 'ثبت سفارش'}
                          {c.source === 'admin_manual' && 'ثبت دستی'}
                          {!['mini_app', 'bot_interaction', 'order_checkout', 'admin_manual'].includes(c.source || '') && (c.source || 'نامشخص')}
                        </td>

                        {/* نشان وضعیت ارتباط (۴ حالت درخواستی) */}
                        <td className="py-3 px-3 text-center">
                          {badge === 'can_send' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              🟢 قابل ارسال
                            </span>
                          )}
                          {badge === 'incomplete_chat_id' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                              🟡 شناسه ناقص
                            </span>
                          )}
                          {badge === 'failed_blocked' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                              🔴 مسدود / ناموفق
                            </span>
                          )}
                          {badge === 'no_interaction' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              ⚪ عدم تعامل با بات
                            </span>
                          )}
                        </td>

                        {/* اقدامات */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openContactProfile(c.chatId || c.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E1E22] dark:hover:bg-[#2A2A30] text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title="مشاهده پروفایل کامل"
                            >
                              پروفایل
                            </button>
                            {c.chatId && (
                              <button
                                onClick={() => {
                                  setSelectedChatId(c.chatId);
                                  setActiveTab('inbox');
                                }}
                                className="px-2 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                title="ارسال پیام مستقیم در اینباکس"
                              >
                                ارسال پیام
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* مودال پروفایل کامل مخاطب ایتا و مشتری متصل */}
      {/* ======================================================== */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#222225]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  پروفایل هویت ایتا و مشتری متصل
                </h3>
              </div>
              <button
                onClick={() => setViewingProfile(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* خلاصه هویت و نشان دسترسی */}
              <div className="p-4 bg-slate-50 dark:bg-[#161619] rounded-2xl border border-slate-200 dark:border-[#252529] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {viewingProfile.identity?.firstName || ''} {viewingProfile.identity?.lastName || ''}
                    {viewingProfile.identity?.username && (
                      <span className="font-mono text-xs text-orange-600 mr-2">@{viewingProfile.identity.username}</span>
                    )}
                  </h4>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Chat ID: {viewingProfile.identity?.chatId || 'ثبت نشده'}
                    {viewingProfile.identity?.eitaaUserId && (
                      <span className="mr-3">User ID: {viewingProfile.identity.eitaaUserId}</span>
                    )}
                  </div>
                </div>

                <div>
                  {viewingProfile.identity?.connectivityBadge === 'can_send' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      🟢 قابل ارسال مستقیم
                    </span>
                  )}
                  {viewingProfile.identity?.connectivityBadge === 'incomplete_chat_id' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200">
                      🟡 شناسه چت ناقص
                    </span>
                  )}
                  {viewingProfile.identity?.connectivityBadge === 'failed_blocked' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200">
                      🔴 مسدود یا ارسال ناموفق
                    </span>
                  )}
                  {viewingProfile.identity?.connectivityBadge === 'no_interaction' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
                      ⚪ کاربر هنوز با بات تعامل نکرده است
                    </span>
                  )}
                </div>
              </div>

              {/* کارت اطلاعات مشتری متصل */}
              <div className="p-4 bg-white dark:bg-[#1A1A1E] rounded-2xl border border-slate-200 dark:border-[#2E2E33]">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>اطلاعات حساب مشتری در سیستم</span>
                </h5>
                {viewingProfile.customer ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">نام حساب:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{viewingProfile.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">موبایل:</span>
                      <span className="font-mono text-slate-800 dark:text-white">{toPersianDigits(viewingProfile.customer.mobile || '-')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">مجموع خرید:</span>
                      <span className="font-bold text-emerald-600">{formatToman(viewingProfile.customer.totalPurchaseAmount || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">تعداد سفارشات فنرزنی:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{toPersianDigits(viewingProfile.bindingOrders?.length || 0)} سفارش</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    این هویت هنوز به هیچ حساب مشتری متصل نشده است. سیستم به محض دریافت شماره همراه یا اولین سفارش به طور خودکار تطبیق را انجام می‌دهد.
                  </div>
                )}
              </div>

              {/* کدهای رسید و سفارشات مرتبط */}
              {viewingProfile.identity?.receiptCodes && viewingProfile.identity.receiptCodes.length > 0 && (
                <div className="p-4 bg-white dark:bg-[#1A1A1E] rounded-2xl border border-slate-200 dark:border-[#2E2E33]">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    کدهای قبض و پیگیری متصل به این کاربر:
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProfile.identity.receiptCodes.map((code: string, idx: number) => (
                      <span key={idx} className="font-mono text-xs font-bold px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-lg">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* سوابق سفارشات فنرزنی اخیر */}
              {viewingProfile.bindingOrders && viewingProfile.bindingOrders.length > 0 && (
                <div className="p-4 bg-white dark:bg-[#1A1A1E] rounded-2xl border border-slate-200 dark:border-[#2E2E33]">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    سفارشات فنرزنی اخیر این کاربر:
                  </h5>
                  <div className="space-y-2">
                    {viewingProfile.bindingOrders.slice(0, 3).map((bo: any) => (
                      <div key={bo.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-[#141416] rounded-xl">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-white font-mono">{bo.receiptCode}</span>
                          <span className="text-slate-400 mr-2">({toPersianDigits(bo.bookCount)} جلد)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">{formatToman(bo.totalPrice)}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                            {bo.workStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* دکمه‌های اقدام در مودال */}
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-[#222225]">
                <button
                  type="button"
                  onClick={() => setViewingProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A1A1E] cursor-pointer"
                >
                  بستن
                </button>
                {viewingProfile.identity?.chatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChatId(viewingProfile.identity.chatId);
                      setViewingProfile(null);
                      setActiveTab('inbox');
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 rotate-180" />
                    <span>ارسال پیام در اینباکس</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* تب ۳: پیکربندی و تنظیمات بات ایتا */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white dark:bg-[#111113] p-6 rounded-2xl border border-slate-200 dark:border-[#222225] shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-[#222225]">
            <Bot className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              تنظیمات توکن و اتصال بات رسمی ایتا
            </h3>
          </div>

          <form onSubmit={handleSaveBotSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                توکن اختصاصی بات ایتا (Bot Token)
              </label>
              <input
                type="password"
                value={botSettings.token}
                onChange={(e) => setBotSettings({ ...botSettings, token: e.target.value })}
                placeholder="bot123456:abcdef..."
                className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                توکن را از بات @BotFather در ایتا دریافت نمایید.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام کاربری بات در ایتا (Username)
              </label>
              <input
                type="text"
                value={botSettings.botUsername}
                onChange={(e) => setBotSettings({ ...botSettings, botUsername: e.target.value })}
                placeholder="khatynoo_bot"
                className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                آدرس وب‌اپلیکیشن خطی‌نو (Mini-App Webview URL)
              </label>
              <input
                type="text"
                value={botSettings.appUrl}
                onChange={(e) => setBotSettings({ ...botSettings, appUrl: e.target.value })}
                placeholder="https://khatynoo.ir"
                className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            {/* پیکربندی وب‌هوک و رمز اختصاصی */}
            <div className="p-3 bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Key className="w-4 h-4 text-orange-500" />
                <span>پیکربندی وب‌هوک و امنیت دریافت پیام (Webhook Security)</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  آدرس اختصاصی وب‌هوک سامانه خطی‌نو
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/eitaa/webhook` : '/api/eitaa/webhook'}
                    className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/api/eitaa/webhook`);
                        showToast('آدرس وب‌هوک در کلیپ‌بورد کپی شد.', 'success');
                      }
                    }}
                    className="p-2 border border-slate-200 dark:border-[#2E2E33] hover:bg-slate-100 dark:hover:bg-[#222225] rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="کپی آدرس وب‌هوک"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  رمز محرمانه وب‌هوک (X-Eitaa-Secret)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={botSettings.webhookSecret || ''}
                    onChange={(e) => setBotSettings({ ...botSettings, webhookSecret: e.target.value })}
                    placeholder="رمز عبور محرمانه هدر وب‌هوک..."
                    className="w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (botSettings.webhookSecret) {
                        navigator.clipboard.writeText(botSettings.webhookSecret);
                        showToast('رمز وب‌هوک کپی شد.', 'success');
                      }
                    }}
                    className="p-2 border border-slate-200 dark:border-[#2E2E33] hover:bg-slate-100 dark:hover:bg-[#222225] rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="کپی رمز محرمانه"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateWebhookSecret}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-[#2E2E33] hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium cursor-pointer shrink-0 transition-colors"
                  >
                    تولید رمز جدید
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  ارسال این رمز در هدر <code className="font-mono text-orange-500">X-Eitaa-Secret</code> برای کلیه درخواست‌های وب‌هوک ورودی الزامی است.
                </span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                ذخیره تنظیمات بات ایتا
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* مودال افزودن مخاطب ایتا */}
      {/* ======================================================== */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#222225]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ثبت شناسه چت و هویت ایتا
                </h3>
              </div>
              <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شناسه چت ایتا (Chat ID) - کلید اصلی ارتباط
                </label>
                <input
                  type="text"
                  value={contactForm.chatId}
                  onChange={(e) => setContactForm({ ...contactForm, chatId: e.target.value })}
                  placeholder="مثلاً: 12345678 یا eitaa_chat_..."
                  className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام مخاطب
                  </label>
                  <input
                    type="text"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره همراه (اختیاری جهت تطبیق)
                  </label>
                  <input
                    type="text"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    placeholder="0912..."
                    className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    آیدی کاربری ایتا
                  </label>
                  <input
                    type="text"
                    value={contactForm.username}
                    onChange={(e) => setContactForm({ ...contactForm, username: e.target.value })}
                    placeholder="username"
                    className="w-full bg-slate-50 dark:bg-[#1A1A1E] border border-slate-200 dark:border-[#2E2E33] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-[#222225]">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A1A1E]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  ذخیره و تطبیق با مشتری
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
