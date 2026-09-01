import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ShoppingBag,
  Image as ImageIcon,
  CreditCard,
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  Trash2,
  Edit2,
  ExternalLink,
  X,
  Phone,
  MessageCircle,
  Instagram,
  ShieldCheck,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Upload,
  Search,
  Calculator,
  Layers,
  ArrowUp,
  ArrowDown,
  BookOpen,
  HelpCircle,
  Palette,
  LayoutGrid,
  Check,
  Tag,
  Link as LinkIcon,
  SunMoon,
  KeyRound,
  User,
  RotateCcw,
  Sliders,
  Settings2,
  MapPin,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, getStatusBadgeClass, getStatusTitle } from '../../lib/utils';
import { OnlineOrder, Banner, PaymentGatewayConfig, ShippingMethod, WebsiteSettings, HeaderMenuItem, CustomSymbol, CustomBadge, HeaderElement, HeaderElementType } from '../../types';
import { useToast } from '../common/Toast';

export const WebsiteManagerView: React.FC<{ initialTab?: 'orders' | 'banners' | 'gateways' | 'shipping' | 'settings' }> = ({
  initialTab = 'orders',
}) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'banners' | 'gateways' | 'shipping' | 'settings'>(initialTab);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [webSettings, setWebSettings] = useState<WebsiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tracking Modal
  const [trackingModalOrder, setTrackingModalOrder] = useState<OnlineOrder | null>(null);
  const [trackingCodeInput, setTrackingCodeInput] = useState('');

  const [settingsSubTab, setSettingsSubTab] = useState<'appearance' | 'header' | 'branding' | 'contact'>('appearance');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingEnamad, setIsUploadingEnamad] = useState(false);
  const [isUploadingSamandehi, setIsUploadingSamandehi] = useState(false);
  const [isUploadingCustomSymbol, setIsUploadingCustomSymbol] = useState(false);

  // New Custom Symbol Form
  const [newSymbol, setNewSymbol] = useState<CustomSymbol>({
    id: '',
    title: '',
    imageUrl: '',
    linkUrl: '',
    code: '',
    type: 'custom',
    isEnabled: true,
    sortOrder: 1,
  });

  // New Custom Badge Form
  const [newBadge, setNewBadge] = useState<CustomBadge>({
    id: '',
    title: '',
    color: '#E11D48',
    textColor: '#ffffff',
    isEnabled: true,
  });

  const [newMenuItem, setNewMenuItem] = useState<HeaderMenuItem>({
    id: '',
    title: '',
    link: '#',
    iconName: 'Sparkles',
    isEnabled: true,
  });

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'enamadImageUrl' | 'samandehiImageUrl' | 'faviconUrl',
    setLoadingState: (loading: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file || !webSettings) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('حجم فایل نمی‌تواند بیشتر از ۱۰ مگابایت باشد.', 'error');
      return;
    }

    setLoadingState(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const uploadRes = await api.uploadFile({
          dataUrl: base64,
          filename: file.name,
          category: 'branding',
        });
        const updated = {
          ...webSettings,
          [field]: uploadRes.url,
        };
        setWebSettings(updated);
        await api.updateWebsiteSettings(updated);
        showToast('تصویر با موفقیت روی سرور بارگذاری و ذخیره شد.', 'success');
        window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
        setLoadingState(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast(err.message || 'خطا در بارگذاری فایل روی سرور', 'error');
      setLoadingState(false);
    }
  };

  const handleUploadNewSymbolImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('حجم فایل نمی‌تواند بیشتر از ۱۰ مگابایت باشد.', 'error');
      return;
    }
    setIsUploadingCustomSymbol(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const uploadRes = await api.uploadFile({
          dataUrl: base64,
          filename: file.name,
          category: 'branding',
        });
        setNewSymbol((prev) => ({ ...prev, imageUrl: uploadRes.url }));
        showToast('تصویر نماد جدید با موفقیت روی سرور ذخیره شد.', 'success');
      } catch (err: any) {
        showToast(err.message || 'خطا در آپلود تصویر نماد', 'error');
      } finally {
        setIsUploadingCustomSymbol(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomSymbol = () => {
    if (!newSymbol.title.trim() || !newSymbol.imageUrl || !webSettings) {
      showToast('لطفاً عنوان و تصویر نماد را وارد نمایید.', 'error');
      return;
    }
    const symbolItem: CustomSymbol = {
      ...newSymbol,
      id: 'sym-' + Date.now(),
      sortOrder: (webSettings.customSymbols?.length || 0) + 1,
    };
    const updatedSymbols = [...(webSettings.customSymbols || []), symbolItem];
    const updatedSettings = {
      ...webSettings,
      customSymbols: updatedSymbols,
    };
    setWebSettings(updatedSettings);
    setNewSymbol({
      id: '',
      title: '',
      imageUrl: '',
      linkUrl: '',
      code: '',
      type: 'custom',
      isEnabled: true,
      sortOrder: 1,
    });
    showToast('نماد جدید با موفقیت اضافه شد.', 'success');
  };

  const handleRemoveCustomSymbol = (id: string) => {
    if (!webSettings) return;
    const filtered = (webSettings.customSymbols || []).filter((s) => s.id !== id);
    setWebSettings({
      ...webSettings,
      customSymbols: filtered,
    });
    showToast('نماد حذف شد.', 'success');
  };

  const handleToggleCustomSymbol = (id: string) => {
    if (!webSettings) return;
    const updated = (webSettings.customSymbols || []).map((s) =>
      s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
    );
    setWebSettings({
      ...webSettings,
      customSymbols: updated,
    });
  };

  const handleAddCustomBadge = () => {
    if (!newBadge.title.trim() || !webSettings) {
      showToast('عنوان برچسب نمی‌تواند خالی باشد.', 'error');
      return;
    }
    const badgeItem: CustomBadge = {
      ...newBadge,
      id: 'badge-' + Date.now(),
    };
    const updatedBadges = [...(webSettings.customBadges || []), badgeItem];
    setWebSettings({
      ...webSettings,
      customBadges: updatedBadges,
    });
    setNewBadge({
      id: '',
      title: '',
      color: '#E11D48',
      textColor: '#ffffff',
      isEnabled: true,
    });
    showToast('برچسب جدید اضافه شد.', 'success');
  };

  const handleRemoveCustomBadge = (id: string) => {
    if (!webSettings) return;
    const filtered = (webSettings.customBadges || []).filter((b) => b.id !== id);
    setWebSettings({
      ...webSettings,
      customBadges: filtered,
    });
  };

  const handleToggleCustomBadge = (id: string) => {
    if (!webSettings) return;
    const updated = (webSettings.customBadges || []).map((b) =>
      b.id === id ? { ...b, isEnabled: !b.isEnabled } : b
    );
    setWebSettings({
      ...webSettings,
      customBadges: updated,
    });
  };

  const handleAddMenuItem = () => {
    if (!newMenuItem.title.trim() || !webSettings) return;
    const item: HeaderMenuItem = {
      ...newMenuItem,
      id: 'menu-' + Date.now(),
    };
    const currentMenu = webSettings.headerMenuItems || [];
    const updated = {
      ...webSettings,
      headerMenuItems: [...currentMenu, item],
    };
    setWebSettings(updated);
    setNewMenuItem({
      id: '',
      title: '',
      link: '#',
      iconName: 'Sparkles',
      isEnabled: true,
    });
    showToast('آیتم جدید به منوی هدر اضافه شد.', 'success');
  };

  const handleRemoveMenuItem = (id: string) => {
    if (!webSettings) return;
    const currentMenu = webSettings.headerMenuItems || [];
    setWebSettings({
      ...webSettings,
      headerMenuItems: currentMenu.filter((m) => m.id !== id),
    });
  };

  const handleMoveMenuItem = (index: number, direction: 'up' | 'down') => {
    if (!webSettings) return;
    const items = [...(webSettings.headerMenuItems || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    setWebSettings({
      ...webSettings,
      headerMenuItems: items,
    });
  };

  const handleToggleMenuItem = (id: string) => {
    if (!webSettings) return;
    const items = (webSettings.headerMenuItems || []).map((m) =>
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    );
    setWebSettings({
      ...webSettings,
      headerMenuItems: items,
    });
  };

  // Header Elements Configuration
  const [editingHeaderElementId, setEditingHeaderElementId] = useState<string | null>(null);
  const [newHeaderElement, setNewHeaderElement] = useState<{
    type: HeaderElementType;
    title: string;
    customText: string;
    icon: string;
    alignment: 'start' | 'center' | 'end';
    buttonStyle: 'gold' | 'subtle' | 'outline' | 'ghost' | 'primary';
    showOnMobile: boolean;
    customLink: string;
  }>({
    type: 'custom_button',
    title: '',
    customText: '',
    icon: 'Sparkles',
    alignment: 'end',
    buttonStyle: 'gold',
    showOnMobile: true,
    customLink: '#',
  });

  const defaultHeaderElements: HeaderElement[] = [
    { id: 'logo', type: 'logo', title: 'لوگو و برند خطی‌نو', enabled: true, order: 1, alignment: 'start', showOnMobile: true },
    { id: 'search', type: 'search', title: 'کادر جستجو', customText: 'جستجوی خودکار در میان صدها قلم کالا...', enabled: true, order: 2, alignment: 'center', showOnMobile: true },
    { id: 'theme_toggle', type: 'theme_toggle', title: 'حالت شب و روز (تاریک / روشن)', icon: 'SunMoon', enabled: true, order: 3, alignment: 'end', showOnMobile: true, buttonStyle: 'ghost' },
    { id: 'auth', type: 'auth', title: 'ورود / ثبت‌نام مشتری', customText: 'ورود / ثبت‌نام', icon: 'KeyRound', enabled: true, order: 4, alignment: 'end', showOnMobile: true, buttonStyle: 'subtle' },
    { id: 'calculator', type: 'calculator', title: 'محاسبه هزینه کپی و پرینت', customText: 'محاسبه هزینه کپی و پرینت', icon: 'Printer', enabled: true, order: 5, alignment: 'end', showOnMobile: true, buttonStyle: 'subtle' },
    { id: 'cart', type: 'cart', title: 'سبد خرید', customText: 'سبد خرید', icon: 'ShoppingBag', enabled: true, order: 6, alignment: 'end', showOnMobile: true, buttonStyle: 'gold' },
  ];

  const getActiveHeaderElements = (): HeaderElement[] => {
    if (webSettings?.headerElements && webSettings.headerElements.length > 0) {
      return [...webSettings.headerElements].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return defaultHeaderElements;
  };

  const handleMoveHeaderElement = (index: number, direction: 'up' | 'down') => {
    if (!webSettings) return;
    const list = getActiveHeaderElements();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setWebSettings({
      ...webSettings,
      headerElements: updated,
    });
  };

  const handleToggleHeaderElement = (id: string) => {
    if (!webSettings) return;
    const list = getActiveHeaderElements();
    const updated = list.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setWebSettings({
      ...webSettings,
      headerElements: updated,
    });
  };

  const handleUpdateHeaderElement = (id: string, updates: Partial<HeaderElement>) => {
    if (!webSettings) return;
    const list = getActiveHeaderElements();
    const updated = list.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setWebSettings({
      ...webSettings,
      headerElements: updated,
    });
  };

  const handleRemoveHeaderElement = (id: string) => {
    if (!webSettings) return;
    const list = getActiveHeaderElements();
    const updated = list.filter((item) => item.id !== id).map((item, idx) => ({ ...item, order: idx + 1 }));
    setWebSettings({
      ...webSettings,
      headerElements: updated,
    });
    showToast('المان از هدر حذف شد.', 'success');
  };

  const handleResetHeaderElements = () => {
    if (!webSettings) return;
    setWebSettings({
      ...webSettings,
      headerElements: defaultHeaderElements,
    });
    showToast('چیدمان و المان‌های هدر به حالت اولیه بازگردانی شد.', 'success');
  };

  const handleAddHeaderElement = () => {
    if (!newHeaderElement.title?.trim() || !webSettings) {
      showToast('لطفاً عنوان المان را وارد نمایید.', 'error');
      return;
    }
    const list = getActiveHeaderElements();
    const newElem: HeaderElement = {
      id: 'elem-' + Date.now(),
      type: newHeaderElement.type || 'custom_button',
      title: newHeaderElement.title || 'دکمه جدید',
      customText: newHeaderElement.customText || newHeaderElement.title,
      icon: newHeaderElement.icon || 'Sparkles',
      alignment: newHeaderElement.alignment || 'end',
      buttonStyle: newHeaderElement.buttonStyle || 'gold',
      enabled: true,
      order: list.length + 1,
      showOnMobile: newHeaderElement.showOnMobile !== false,
      customLink: newHeaderElement.customLink || '#',
    };
    setWebSettings({
      ...webSettings,
      headerElements: [...list, newElem],
    });
    setNewHeaderElement({
      type: 'custom_button',
      title: '',
      customText: '',
      icon: 'Sparkles',
      alignment: 'end',
      buttonStyle: 'gold',
      showOnMobile: true,
      customLink: '#',
    });
    showToast('المان جدید با موفقیت به هدر اضافه شد.', 'success');
  };

  // Banner Modal
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    badge: 'تولید اختصاصی',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
    link: '#',
    buttonText: 'مشاهده محصولات',
    backgroundColor: '#1E1B4B',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [ordRes, banRes, gateRes, shipRes, setRes] = await Promise.all([
        api.getOnlineOrders().catch(() => ({ orders: [] })),
        api.getBanners().catch(() => ({ banners: [] })),
        api.getGateways().catch(() => ({ gateways: [] })),
        api.getShippingMethods().catch(() => ({ shippingMethods: [] })),
        api.getWebsiteSettings().catch(() => ({ settings: null })),
      ]);
      setOrders(ordRes.orders || []);
      setBanners(banRes.banners || []);
      setGateways(gateRes.gateways || []);
      setShippingMethods(shipRes.shippingMethods || []);
      if (setRes.settings) {
        setWebSettings(setRes.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: any) => {
    try {
      await api.updateOnlineOrderStatus(orderId, newStatus);
      showToast('وضعیت سفارش آنلاین به‌روزرسانی شد.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر وضعیت', 'error');
    }
  };

  const handleSaveTrackingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder || !trackingCodeInput.trim()) return;
    try {
      await api.updateOnlineOrderStatus(trackingModalOrder.id, 'shipped', trackingCodeInput.trim());
      showToast('کد رهگیری پستی ثبت و سفارش به وضعیت ارسال شد تغییر یافت.', 'success');
      setTrackingModalOrder(null);
      setTrackingCodeInput('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت کد رهگیری', 'error');
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBanner(bannerForm);
      showToast('بنر تبلیغاتی جدید با موفقیت ثبت شد.', 'success');
      window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
      setShowBannerModal(false);
      setBannerForm({
        title: '',
        subtitle: '',
        badge: 'تولید اختصاصی',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
        link: '#',
        buttonText: 'مشاهده محصولات',
        backgroundColor: '#1E1B4B',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت بنر', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('آیا از حذف این بنر اطمینان دارید؟')) return;
    try {
      await api.deleteBanner(id);
      showToast('بنر با موفقیت حذف گردید.', 'success');
      window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف بنر', 'error');
    }
  };

  const handleToggleGateway = async (id: string, active: boolean) => {
    try {
      await api.updateGateway(id, { isActive: active });
      showToast('وضعیت درگاه پرداخت تغییر یافت.', 'success');
      window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر درگاه', 'error');
    }
  };

  const handleSaveWebSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webSettings) return;
    try {
      await api.updateWebsiteSettings(webSettings);
      showToast('تنظیمات وب‌سایت با موفقیت ذخیره شد.', 'success');
      window.dispatchEvent(new CustomEvent('khatinoo-settings-updated'));
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره تنظیمات', 'error');
    }
  };

  return (
    <div className="space-y-6 text-[#E0E0E0]">
      {/* Top Tabs */}
      <div className="bg-[#111113] rounded-2xl p-3 border border-[#222225] shadow-xs flex flex-wrap gap-2 text-xs">
        {[
          { id: 'orders', label: `سفارشات اینترنتی (${toPersianDigits(orders.length)})`, icon: ShoppingBag },
          { id: 'banners', label: `اسلایدر و بنرها (${toPersianDigits(banners.length)})`, icon: ImageIcon },
          { id: 'gateways', label: 'درگاه‌های پرداخت آنلاین', icon: CreditCard },
          { id: 'shipping', label: 'روش‌های ارسال و باربری', icon: Truck },
          { id: 'settings', label: 'تنظیمات و اینماد سایت', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#1C1C20] border border-[#C9A227]/40 text-[#C9A227] shadow-md shadow-black/40 font-black'
                  : 'bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2D2D33]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9A227]' : 'text-[#8E9299]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Online Orders Management */}
      {activeTab === 'orders' && (
        <div className="bg-[#111113] rounded-3xl border border-[#222225] shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#222225] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-black text-[#F3F4F6]">مدیریت و ارسال سفارشات ثبت‌شده در سایت</h3>
              <p className="text-xs text-[#8E9299] mt-0.5">تغییر وضعیت، صدور کد رهگیری پستی و ارسال پیامک خودکار</p>
            </div>
            <div className="bg-[#161619] text-[#C9A227] border border-[#C9A227]/30 px-3 py-1.5 rounded-xl text-xs font-bold">
              مجموع: {toPersianDigits(orders.length)} سفارش
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-[#161619] text-[#C9A227] font-bold border-b border-[#222225]">
                <tr>
                  <th className="p-3.5">کد سفارش</th>
                  <th className="p-3.5">نام خریدار و همراه</th>
                  <th className="p-3.5">شهر و آدرس تحویل</th>
                  <th className="p-3.5">مبلغ کل پرداختی</th>
                  <th className="p-3.5">روش ارسال</th>
                  <th className="p-3.5">وضعیت و رهگیری</th>
                  <th className="p-3.5 text-center">عملیات و وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222225]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#8E9299]">
                      هنوز هیچ سفارش آنلاینی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#161619]/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#C9A227]">{o.orderNumber}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#F3F4F6]">{o.customerName}</div>
                        <div className="text-[10px] text-[#8E9299] font-mono">{o.customerMobile}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#E0E0E0]">{o.city}</div>
                        <div className="text-[10px] text-[#8E9299] truncate max-w-[180px]">{o.shippingAddress}</div>
                      </td>
                      <td className="p-3.5 font-mono font-black text-emerald-400">{formatToman(o.totalAmount)}</td>
                      <td className="p-3.5 font-bold text-[#E0E0E0]">{o.shippingMethodName}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${getStatusBadgeClass(o.status)}`}>
                          {getStatusTitle(o.status)}
                        </span>
                        {o.trackingCode && (
                          <div className="text-[10px] font-mono text-[#C9A227] mt-1">کد رهگیری: {o.trackingCode}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className="bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-lg p-1.5 text-[11px] font-bold text-[#E0E0E0] outline-none"
                          >
                            <option value="pending">در انتظار پرداخت</option>
                            <option value="processing">در حال پردازش انبار</option>
                            <option value="confirmed">تایید سفارش</option>
                            <option value="shipped">ارسال شده (پست/پیک)</option>
                            <option value="delivered">تحویل به مشتری</option>
                            <option value="cancelled">لغو شده</option>
                          </select>

                          <button
                            onClick={() => {
                              setTrackingModalOrder(o);
                              setTrackingCodeInput(o.trackingCode || '');
                            }}
                            className="p-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] border border-[#2D2D33] hover:border-[#C9A227]/40 transition-colors cursor-pointer"
                            title="ثبت کد رهگیری پستی"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Banners Manager */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#111113] p-4 rounded-2xl border border-[#222225]">
            <div>
              <h3 className="text-sm font-black text-[#F3F4F6]">بنرهای فعال در اسلایدر صفحه نخست</h3>
              <p className="text-xs text-[#8E9299]">مدیریت پویا، تنظیم رنگ‌بندی، نشان و لینک هدایت کالاها</p>
            </div>
            <button
              onClick={() => setShowBannerModal(true)}
              className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C9A227]/20"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>افزودن بنر جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="bg-[#111113] rounded-3xl p-4 border border-[#222225] shadow-lg space-y-3">
                <div
                  className="h-40 rounded-2xl p-4 flex flex-col justify-between text-white relative overflow-hidden bg-cover bg-center ring-1 ring-white/10"
                  style={{ backgroundImage: `url(${b.imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />
                  <div className="relative z-10 space-y-1">
                    <span className="text-[10px] bg-[#C9A227] text-slate-950 font-black px-2.5 py-0.5 rounded-full inline-block">
                      {b.badge}
                    </span>
                    <h4 className="font-black text-base text-white mt-1">{b.title}</h4>
                    <p className="text-xs text-slate-200 line-clamp-2">{b.subtitle}</p>
                  </div>

                  <div className="relative z-10 flex justify-between items-center text-xs">
                    <span className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/20 text-[#C9A227] font-bold text-[11px]">
                      {b.buttonText || 'مشاهده محصولات'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">ترتیب: {toPersianDigits(b.sortOrder || 1)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#222225]">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{b.isActive ? 'فعال و نمایان در اسلایدر' : 'غیرفعال'}</span>
                  </span>

                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="p-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border border-rose-900/40 cursor-pointer transition-colors"
                    title="حذف بنر"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Gateways Config */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {gateways.map((g) => (
            <div key={g.id} className="bg-[#111113] rounded-3xl p-5 border border-[#222225] shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between font-bold text-sm text-[#F3F4F6]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#C9A227]/10 text-[#C9A227] flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span>{g.title}</span>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    g.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-[#1C1C20] text-[#8E9299] border-[#2D2D33]'
                  }`}
                >
                  {g.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>

              <div className="space-y-1 text-[#8E9299] font-mono text-[11px] bg-[#161619] p-3 rounded-xl border border-[#2D2D33]">
                <div>Merchant ID: <span className="text-[#E0E0E0]">{g.merchantId || 'کد مرچنت شاپرک'}</span></div>
                <div>حالت تست (Sandbox): <span className="text-[#E0E0E0]">{g.isTestMode ? 'فعال (آزمایشی)' : 'محیط واقعی تولید'}</span></div>
              </div>

              <button
                onClick={() => handleToggleGateway(g.id, !g.isActive)}
                className={`w-full py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  g.isActive
                    ? 'bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-900/40'
                    : 'bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-900/40'
                }`}
              >
                {g.isActive ? 'غیرفعال‌سازی درگاه' : 'فعال‌سازی درگاه'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Shipping Methods */}
      {activeTab === 'shipping' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shippingMethods.map((s) => (
            <div key={s.id} className="bg-[#111113] rounded-3xl p-5 border border-[#222225] shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between font-bold text-sm text-[#F3F4F6]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span>{s.title}</span>
                </div>
              </div>
              <div className="space-y-2 text-[#8E9299] bg-[#161619] p-3.5 rounded-2xl border border-[#2D2D33]">
                <div className="flex justify-between items-center">
                  <span>هزینه پایه ارسال:</span>
                  <span className="font-black text-[#F3F4F6] font-mono">{formatToman(s.baseCost)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-emerald-400 font-bold border-t border-[#222225] pt-1.5">
                  <span>ارسال رایگان سفارش‌های بالای:</span>
                  <span className="font-mono">{formatToman(s.freeThreshold)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Website Comprehensive Settings */}
      {activeTab === 'settings' && webSettings && (
        <form onSubmit={handleSaveWebSettings} className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl space-y-6 text-xs">
          {/* Sub-tabs for Settings */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222225] pb-4">
            <div>
              <h3 className="text-sm font-black text-[#F3F4F6]">مدیریت و پیکربندی ظاهر، دکمه‌ها، نمادها و اطلاعات فروشگاه</h3>
              <p className="text-xs text-[#8E9299] mt-0.5">تغییر رنگ تم دکمه‌ها، نحوه نمایش کاتالوگ، آپلود انواع نمادها و مجوزها، مدیریت برچسب‌ها و منوها</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-[#161619] p-1 rounded-xl border border-[#2D2D33]">
              <button
                type="button"
                onClick={() => setSettingsSubTab('appearance')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsSubTab === 'appearance'
                    ? 'bg-[#1C1C20] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>رنگ، دکمه‌ها و چیدمان</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('header')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'header'
                    ? 'bg-[#1C1C20] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                هدر، اعلان و منوها
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('branding')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'branding'
                    ? 'bg-[#1C1C20] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                لوگو، اینماد و نمادهای مجوز
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('contact')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'contact'
                    ? 'bg-[#1C1C20] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                    : 'text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                اطلاعات تماس و فوتر
              </button>
            </div>
          </div>

          {/* SUB-TAB 0: APPEARANCE & THEME & BADGES */}
          {settingsSubTab === 'appearance' && (
            <div className="space-y-6">
              {/* Button and Colors */}
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                  <Palette className="w-4 h-4" />
                  <span>تغییر رنگ دکمه‌ها، گردی گوشه‌ها و حالت نمایش محصولات</span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  رنگ دکمه‌های خرید و عملیاتی سایت، گردی لبه‌ها (Border Radius) و نحوه چیدمان پیش‌فرض محصولات را تنظیم کنید.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* Button Color Theme */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#8E9299] block">تم رنگی دکمه‌های خرید و اصلی:</label>
                    <select
                      value={webSettings.buttonColorTheme || 'gold'}
                      onChange={(e) => setWebSettings({ ...webSettings, buttonColorTheme: e.target.value as any })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2.5 font-bold text-[#E0E0E0] outline-none"
                    >
                      <option value="gold">طلایی خطی‌نو (Gold / Default)</option>
                      <option value="amber">کهربایی / نارنجی گرم (Amber)</option>
                      <option value="emerald">سبز زمردی فروشگاهی (Emerald)</option>
                      <option value="indigo">نیلی / بنفش مدرن (Indigo)</option>
                      <option value="rose">قرمز رزگیلاس (Rose)</option>
                      <option value="slate">مشکی ذغالی مینیمال (Dark Slate)</option>
                    </select>
                  </div>

                  {/* Button Border Radius */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#8E9299] block">میزان گردی گوشه دکمه‌ها و کارت‌ها:</label>
                    <select
                      value={webSettings.buttonBorderRadius || 'rounded-xl'}
                      onChange={(e) => setWebSettings({ ...webSettings, buttonBorderRadius: e.target.value as any })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2.5 font-bold text-[#E0E0E0] outline-none"
                    >
                      <option value="rounded-lg">کم (Rounded Small - 8px)</option>
                      <option value="rounded-xl">متوسط و استاندارد (Rounded Medium - 12px)</option>
                      <option value="rounded-2xl">بزرگ (Rounded Large - 16px)</option>
                      <option value="rounded-3xl">فوق‌العاده نرم (Rounded Extra - 24px)</option>
                      <option value="rounded-full">کپسولی کامل (Pill Rounded)</option>
                    </select>
                  </div>

                  {/* Catalog Layout Mode */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#8E9299] block">نحوه نمایش پیش‌فرض محصولات (Layout):</label>
                    <select
                      value={webSettings.catalogLayoutMode || 'grid'}
                      onChange={(e) => setWebSettings({ ...webSettings, catalogLayoutMode: e.target.value as any })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2.5 font-bold text-[#E0E0E0] outline-none"
                    >
                      <option value="grid">شبکه‌ای استاندارد (Grid)</option>
                      <option value="compact">شبکه‌ای متراکم و فشرده (Compact Grid)</option>
                      <option value="list">سطری و لیستی (List View)</option>
                    </select>
                  </div>
                </div>

                {/* Extended Layout Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#222225]">
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#8E9299] block text-xs">تعداد ستون‌های چیدمان محصولات در دسکتاپ:</label>
                    <select
                      value={webSettings.layoutColumns || 5}
                      onChange={(e) => setWebSettings({ ...webSettings, layoutColumns: Number(e.target.value) })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2.5 font-bold text-[#E0E0E0] outline-none text-xs"
                    >
                      <option value={3}>۳ ستونه (تصاویر بزرگ و ویژه)</option>
                      <option value={4}>۴ ستونه (متعادل و خوانا)</option>
                      <option value={5}>۵ ستونه (استاندارد فروشگاه خطی‌نو)</option>
                      <option value={6}>۶ ستونه (تراکم بالا ویژه مانیتورهای عریض)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[#8E9299] block text-xs">سبک چیدمان هدر (Header Layout):</label>
                    <select
                      value={webSettings.headerLayout || 'standard'}
                      onChange={(e) => setWebSettings({ ...webSettings, headerLayout: e.target.value as any })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2.5 font-bold text-[#E0E0E0] outline-none text-xs"
                    >
                      <option value="standard">استاندارد تجاری (لوگو راست، سرچ وسط، ابزارها چپ)</option>
                      <option value="compact">فشرده و مینیمال (Compact)</option>
                      <option value="centered">لوگو در مرکز (Centered Logo)</option>
                      <option value="fullwidth">عرض کامل با منوی مجزا (Full Width)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[#8E9299] block text-xs">سبک چیدمان فوتر و پاورقی (Footer Layout):</label>
                    <select
                      value={webSettings.footerLayout || 'multi_column'}
                      onChange={(e) => setWebSettings({ ...webSettings, footerLayout: e.target.value as any })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2.5 font-bold text-[#E0E0E0] outline-none text-xs"
                    >
                      <option value="multi_column">چندستونه کامل (شامل مجوزها، نقشه، لینک‌ها و تماس)</option>
                      <option value="card">کارت‌های شیشه‌ای مجزا (Card Based)</option>
                      <option value="simple">مینیمال ساده و خلاصه (Minimal Simple)</option>
                    </select>
                  </div>
                </div>

                {/* Badges Display Switch */}
                <div className="flex items-center justify-between p-3.5 bg-[#111113] rounded-xl border border-[#222225] mt-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#E0E0E0] text-xs">نمایش بج‌ها و برچسب‌های روی تصویر محصول</span>
                    <p className="text-[10px] text-[#8E9299]">فعال یا غیرفعال کردن نشان‌های تخفیف، ویژه و بج‌های سفارشی</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebSettings({ ...webSettings, showProductBadges: webSettings.showProductBadges === false ? true : false })}
                    className="text-[#C9A227] cursor-pointer"
                  >
                    {webSettings.showProductBadges !== false ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[#8E9299]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Badges Management */}
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                    <Tag className="w-4 h-4" />
                    <span>مدیریت برچسب‌های سفارشی روی محصولات (Custom Badges)</span>
                  </div>
                  <span className="text-[11px] text-[#8E9299]">
                    تعداد: {toPersianDigits(webSettings.customBadges?.length || 0)}
                  </span>
                </div>

                {/* Badges List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {webSettings.customBadges?.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-[#111113] p-3 rounded-xl border border-[#222225] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: badge.color, color: badge.textColor || '#ffffff' }}
                          className="px-2.5 py-0.5 rounded-full font-black text-[10px] shadow-xs"
                        >
                          {badge.title}
                        </span>
                        <span className="text-[10px] text-[#8E9299]">
                          {badge.isEnabled ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleCustomBadge(badge.id)}
                          className="p-1 text-[#8E9299] hover:text-[#C9A227]"
                          title="تغییر وضعیت"
                        >
                          {badge.isEnabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-[#666]" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomBadge(badge.id)}
                          className="p-1 text-[#8E9299] hover:text-rose-400"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!webSettings.customBadges || webSettings.customBadges.length === 0) && (
                    <div className="col-span-full text-center py-4 text-[#8E9299] bg-[#111113] rounded-xl border border-[#222225]">
                      هنوز برچسب سفارشی تعریف نشده است.
                    </div>
                  )}
                </div>

                {/* Add Badge Form */}
                <div className="bg-[#111113] p-3.5 rounded-xl border border-[#222225] space-y-3">
                  <span className="font-bold text-[#E0E0E0] text-[11px] block">افزودن برچسب جدید:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
                    <input
                      type="text"
                      value={newBadge.title}
                      onChange={(e) => setNewBadge({ ...newBadge, title: e.target.value })}
                      placeholder="عنوان برچسب (مثلاً: اصل خطی‌نو، پرفروش، ارگانیک)"
                      className="sm:col-span-2 bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none"
                    />
                    <div className="flex items-center gap-2 bg-[#161619] border border-[#2D2D33] rounded-xl px-3 py-1.5">
                      <span className="text-[10px] text-[#8E9299]">رنگ زمینه:</span>
                      <input
                        type="color"
                        value={newBadge.color}
                        onChange={(e) => setNewBadge({ ...newBadge, color: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomBadge}
                      className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-black" />
                      <span>افزودن برچسب</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 1: HEADER & MENUS */}
          {settingsSubTab === 'header' && (
            <div className="space-y-6">
              {/* Header Elements Interactive Manager */}
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                      <Sliders className="w-4 h-4" />
                      <span>مدیریت کامل و چیدمان المان‌های هدر (لوگو، سبد خرید، محاسبه، ورود، جستجو، تم و دکمه‌های سفارشی)</span>
                    </div>
                    <p className="text-[11px] text-[#8E9299] mt-0.5">
                      امکان جابجایی، فعال/غیرفعال کردن، ویرایش عنوان، آیکون، استایل دکمه، موقعیت (راست/وسط/چپ) و افزودن دکمه‌های دلخواه
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetHeaderElements}
                    className="px-3 py-1.5 rounded-xl bg-[#111113] hover:bg-[#1E1E22] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2D2D33] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازگردانی به چیدمان پیش‌فرض</span>
                  </button>
                </div>

                {/* Elements List */}
                <div className="space-y-3 pt-2">
                  {getActiveHeaderElements().map((elem, index) => {
                    const isEditing = editingHeaderElementId === elem.id;
                    return (
                      <div
                        key={elem.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          elem.enabled
                            ? 'bg-[#111113] border-[#2D2D33] shadow-xs'
                            : 'bg-[#111113]/40 border-dashed border-[#222225] opacity-60'
                        }`}
                      >
                        {/* Summary Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveHeaderElement(index, 'up')}
                                className="p-1 rounded-md text-[#8E9299] hover:text-[#C9A227] hover:bg-[#1E1E22] disabled:opacity-20 cursor-pointer transition-colors"
                                title="انتقال به بالا"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === getActiveHeaderElements().length - 1}
                                onClick={() => handleMoveHeaderElement(index, 'down')}
                                className="p-1 rounded-md text-[#8E9299] hover:text-[#C9A227] hover:bg-[#1E1E22] disabled:opacity-20 cursor-pointer transition-colors"
                                title="انتقال به پایین"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Badge & Info */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#1C1C20] border border-[#2D2D33] flex items-center justify-center text-[#C9A227] shrink-0">
                                {elem.type === 'logo' && <BookOpen className="w-4 h-4" />}
                                {elem.type === 'search' && <Search className="w-4 h-4" />}
                                {elem.type === 'theme_toggle' && <SunMoon className="w-4 h-4" />}
                                {elem.type === 'auth' && <KeyRound className="w-4 h-4" />}
                                {elem.type === 'calculator' && <Calculator className="w-4 h-4" />}
                                {elem.type === 'cart' && <ShoppingBag className="w-4 h-4" />}
                                {elem.type === 'custom_button' && <Sparkles className="w-4 h-4" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#F3F4F6] text-xs">
                                    {elem.title || elem.customText || elem.type}
                                  </span>
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#1C1C20] text-[#C9A227] font-mono border border-[#2D2D33]">
                                    {elem.type === 'logo' ? 'لوگو و برند' :
                                     elem.type === 'search' ? 'باکس جستجو' :
                                     elem.type === 'theme_toggle' ? 'تغییر تم' :
                                     elem.type === 'auth' ? 'ورود و حساب' :
                                     elem.type === 'calculator' ? 'محاسبه چاپ' :
                                     elem.type === 'cart' ? 'سبد خرید' : 'دکمه سفارشی'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#8E9299] mt-0.5 flex items-center gap-3">
                                  <span>
                                    موقعیت: {elem.alignment === 'start' ? 'راست (ابتدای هدر)' : elem.alignment === 'center' ? 'وسط' : 'چپ (انتهای هدر)'}
                                  </span>
                                  <span>•</span>
                                  <span>استایل: {elem.buttonStyle || 'پیش‌فرض'}</span>
                                  {elem.customText && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[140px]">متن دکمه: {elem.customText}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingHeaderElementId(isEditing ? null : elem.id)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                isEditing
                                  ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                                  : 'bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] border border-[#2D2D33]'
                              }`}
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{isEditing ? 'بستن ویرایش' : 'ویرایش مشخصات'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleHeaderElement(elem.id)}
                              className={`p-1 text-[#8E9299] hover:text-[#C9A227] cursor-pointer`}
                              title="فعال/غیرفعال"
                            >
                              {elem.enabled ? (
                                <ToggleRight className="w-7 h-7 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 text-[#666]" />
                              )}
                            </button>

                            {elem.type === 'custom_button' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveHeaderElement(elem.id)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                title="حذف دکمه"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Edit Panel */}
                        {isEditing && (
                          <div className="mt-3.5 pt-3.5 border-t border-[#222225] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-[#161619]/60 p-3 rounded-xl">
                            <div>
                              <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">عنوان المان:</label>
                              <input
                                type="text"
                                value={elem.title || ''}
                                onChange={(e) => handleUpdateHeaderElement(elem.id, { title: e.target.value })}
                                className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[#E0E0E0] outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">متن نمایشی روی دکمه:</label>
                              <input
                                type="text"
                                value={elem.customText || ''}
                                onChange={(e) => handleUpdateHeaderElement(elem.id, { customText: e.target.value })}
                                placeholder="اختیاری (مثلاً: سبد خرید یا ورود)"
                                className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[#E0E0E0] outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">موقعیت چیدمان در هدر:</label>
                              <select
                                value={elem.alignment || 'end'}
                                onChange={(e) => handleUpdateHeaderElement(elem.id, { alignment: e.target.value as any })}
                                className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[#E0E0E0] outline-none"
                              >
                                <option value="start">راست هدر (کنار لوگو)</option>
                                <option value="center">وسط هدر</option>
                                <option value="end">چپ هدر (ناحیه ابزارها و دکمه‌ها)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">استایل رنگی دکمه:</label>
                              <select
                                value={elem.buttonStyle || 'gold'}
                                onChange={(e) => handleUpdateHeaderElement(elem.id, { buttonStyle: e.target.value as any })}
                                className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[#E0E0E0] outline-none"
                              >
                                <option value="gold">طلایی خطی‌نو (Gold / Glow)</option>
                                <option value="subtle">طوسی ملایم با حاشیه (Subtle)</option>
                                <option value="outline">خط دور بدون پس‌زمینه (Outline)</option>
                                <option value="ghost">ساده و کمینه (Ghost)</option>
                                <option value="primary">آبی روشن (Primary)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">آیکون:</label>
                              <select
                                value={elem.icon || 'Sparkles'}
                                onChange={(e) => handleUpdateHeaderElement(elem.id, { icon: e.target.value })}
                                className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[#E0E0E0] outline-none"
                              >
                                <option value="ShoppingBag">ShoppingBag (سبد خرید)</option>
                                <option value="Search">Search (ذره‌بین جستجو)</option>
                                <option value="Printer">Printer (چاپ و پرینت)</option>
                                <option value="SunMoon">SunMoon (تاریک / روشن)</option>
                                <option value="KeyRound">KeyRound (کلید ورود)</option>
                                <option value="User">User (کاربر / پروفایل)</option>
                                <option value="Truck">Truck (کامیون ارسال)</option>
                                <option value="BookOpen">BookOpen (کتاب / دفتر)</option>
                                <option value="Sparkles">Sparkles (درخشش و تولید اختصاصی)</option>
                                <option value="Phone">Phone (تلفن و تماس)</option>
                                <option value="MessageCircle">MessageCircle (پیام و واتساپ)</option>
                                <option value="Tag">Tag (برچسب و تخفیف)</option>
                                <option value="HelpCircle">HelpCircle (راهنما و سوالات)</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">لینک هدایت (اختیاری یا برای دکمه سفارشی):</label>
                              <input
                                type="text"
                                value={elem.customLink || ''}
                                onChange={(e) => handleUpdateHeaderElement(elem.id, { customLink: e.target.value })}
                                placeholder="مثلاً: /calculator یا tel:0912... یا https://..."
                                className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[#E0E0E0] outline-none font-mono text-left"
                              />
                            </div>

                            <div className="flex items-center pt-5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={elem.showOnMobile !== false}
                                  onChange={(e) => handleUpdateHeaderElement(elem.id, { showOnMobile: e.target.checked })}
                                  className="accent-[#C9A227] w-4 h-4 rounded"
                                />
                                <span className="text-[11px] text-[#E0E0E0] font-bold">نمایش در نسخه موبایل</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add New Header Element Box */}
                <div className="bg-[#111113] p-4 rounded-2xl border border-[#2D2D33] space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-[#E0E0E0] font-bold text-xs">
                    <Plus className="w-4 h-4 text-[#C9A227]" />
                    <span>افزودن دکمه یا المان جدید به هدر:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">نوع المان:</label>
                      <select
                        value={newHeaderElement.type}
                        onChange={(e) => setNewHeaderElement({ ...newHeaderElement, type: e.target.value as any })}
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                      >
                        <option value="custom_button">دکمه اختصاصی سفارشی</option>
                        <option value="cart">دکمه سبد خرید</option>
                        <option value="calculator">دکمه محاسبه چاپ</option>
                        <option value="auth">دکمه ورود / ثبت‌نام</option>
                        <option value="theme_toggle">تغییر تم (شب / روز)</option>
                        <option value="search">باکس جستجو</option>
                        <option value="logo">لوگو و برند</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">عنوان دکمه:</label>
                      <input
                        type="text"
                        value={newHeaderElement.title}
                        onChange={(e) => setNewHeaderElement({ ...newHeaderElement, title: e.target.value })}
                        placeholder="مثال: تماس فوری، پیگیری سریع، تخفیف‌ها"
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">آیکون:</label>
                      <select
                        value={newHeaderElement.icon || 'Sparkles'}
                        onChange={(e) => setNewHeaderElement({ ...newHeaderElement, icon: e.target.value })}
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                      >
                        <option value="Sparkles">Sparkles (تولیدات و ستاره)</option>
                        <option value="ShoppingBag">ShoppingBag (سبد خرید)</option>
                        <option value="Search">Search (جستجو)</option>
                        <option value="Printer">Printer (محاسبه و چاپ)</option>
                        <option value="SunMoon">SunMoon (تاریک / روشن)</option>
                        <option value="KeyRound">KeyRound (ورود / کلید)</option>
                        <option value="User">User (کاربر)</option>
                        <option value="Phone">Phone (تماس تلفنی)</option>
                        <option value="MessageCircle">MessageCircle (واتساپ و پیام)</option>
                        <option value="Truck">Truck (ارسال باربری)</option>
                        <option value="BookOpen">BookOpen (دفتر و کتاب)</option>
                        <option value="Tag">Tag (برچسب ویژه)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">موقعیت:</label>
                      <select
                        value={newHeaderElement.alignment || 'end'}
                        onChange={(e) => setNewHeaderElement({ ...newHeaderElement, alignment: e.target.value as any })}
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                      >
                        <option value="end">چپ هدر (بخش ابزارها)</option>
                        <option value="center">وسط هدر</option>
                        <option value="start">راست هدر (کنار لوگو)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">استایل دکمه:</label>
                      <select
                        value={newHeaderElement.buttonStyle || 'gold'}
                        onChange={(e) => setNewHeaderElement({ ...newHeaderElement, buttonStyle: e.target.value as any })}
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                      >
                        <option value="gold">طلایی خطی‌نو (Gold Glow)</option>
                        <option value="subtle">طوسی ملایم با بوردر (Subtle)</option>
                        <option value="outline">خط دور بدون پس‌زمینه (Outline)</option>
                        <option value="ghost">ساده و فلت (Ghost)</option>
                        <option value="primary">آبی کلاسیک (Primary)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-[#8E9299] block mb-1 font-bold">لینک یا مسیر مقصد:</label>
                      <input
                        type="text"
                        value={newHeaderElement.customLink || ''}
                        onChange={(e) => setNewHeaderElement({ ...newHeaderElement, customLink: e.target.value })}
                        placeholder="مثال: /calculator یا tel:09121234567 یا #..."
                        className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs font-mono text-left"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddHeaderElement}
                        className="w-full bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#C9A227]/20 text-xs"
                      >
                        <Plus className="w-4 h-4 text-black" />
                        <span>افزودن دکمه به هدر</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Notification & Advertisement Bar */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>نوار اعلان، تبلیغات و بنر بالای سایت (Notice & Advertisement Bar)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webSettings.showNotice !== false}
                      onChange={(e) => setWebSettings({ ...webSettings, showNotice: e.target.checked })}
                      className="accent-[#C9A227] w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs text-[#E0E0E0] font-bold">نمایش نوار تبلیغات/اعلان</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">نشان تبلیغ یا اعلان (Badge):</label>
                    <input
                      type="text"
                      value={webSettings.noticeBadgeText || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, noticeBadgeText: e.target.value })}
                      placeholder="مثال: تبلیغات ویژه یا تخفیف روز"
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-bold text-[#8E9299] block mb-1">متن تبلیغ یا پیام اطلاعیه:</label>
                    <input
                      type="text"
                      value={webSettings.noticeText || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, noticeText: e.target.value })}
                      placeholder="🎉 جشنواره تخفیف ویژه لوازم‌تحریر و دفاتر اختصاصی خطی‌نو با کد تخفیف KHATINOO"
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1 text-[11px]">طرح و تم بنر تبلیغاتی:</label>
                    <select
                      value={webSettings.noticeBannerStyle || 'default'}
                      onChange={(e) => setWebSettings({ ...webSettings, noticeBannerStyle: e.target.value as any })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                    >
                      <option value="default">ساده و کلاسیک (پیش‌فرض)</option>
                      <option value="gold_gradient">طلایی جذاب و درخشان (Gold Gradient)</option>
                      <option value="emerald_deals">سبز زمردی و تخفیف ویژه (Emerald)</option>
                      <option value="indigo_promo">آبی و سرمه‌ای پروموشن (Indigo Promo)</option>
                      <option value="rose_hot">قرمز آتشین و پیشنهاد داغ (Rose Hot)</option>
                      <option value="dark_luxury">مشکی کربن و لوکس (Dark Luxury)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1 text-[11px]">لینک یا مقصد تبلیغ (اختیاری):</label>
                    <input
                      type="text"
                      value={webSettings.noticeLink || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, noticeLink: e.target.value })}
                      placeholder="مثال: /category/cat_notebooks یا #calculator"
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1 text-[11px]">متن دکمه عمل تبلیغ:</label>
                    <input
                      type="text"
                      value={webSettings.noticeLinkText || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, noticeLinkText: e.target.value })}
                      placeholder="مثال: مشاهده و خرید"
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Header Search Placeholder */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                  <Search className="w-4 h-4" />
                  <span>متن راهنمای جستجو و پیگیری سریع</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">متن راهنمای باکس جستجو (Search Placeholder):</label>
                    <input
                      type="text"
                      value={webSettings.searchPlaceholder || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, searchPlaceholder: e.target.value })}
                      placeholder="جستجوی خودکار در میان صدها قلم کالا، خودکار، دفتر، ماژیک، زونکن..."
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">عنوان دکمه پیگیری سفارشات:</label>
                    <input
                      type="text"
                      value={webSettings.quickTrackingText || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, quickTrackingText: e.target.value })}
                      placeholder="پیگیری سریع سفارشات"
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Header Menu Items */}
              <div className="bg-[#161619] p-4 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                    <Layers className="w-4 h-4" />
                    <span>آیتم‌های منوی دسته‌بندی بالای سایت (Header Navigation Menu)</span>
                  </div>
                  <span className="text-[11px] text-[#8E9299]">
                    تعداد آیتم‌ها: {toPersianDigits(webSettings.headerMenuItems?.length || 0)}
                  </span>
                </div>

                {/* Existing Menu Items */}
                <div className="space-y-2">
                  {(webSettings.headerMenuItems || []).map((item, index) => (
                    <div
                      key={item.id || index}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors ${
                        item.isEnabled !== false
                          ? 'bg-[#111113] border-[#2D2D33]'
                          : 'bg-[#111113]/40 border-dashed border-[#222225] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveMenuItem(index, 'up')}
                            className="p-0.5 text-[#8E9299] hover:text-[#C9A227] disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === (webSettings.headerMenuItems?.length || 0) - 1}
                            onClick={() => handleMoveMenuItem(index, 'down')}
                            className="p-0.5 text-[#8E9299] hover:text-[#C9A227] disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <div className="font-bold text-[#F3F4F6] flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="text-[9px] bg-[#C9A227]/20 text-[#C9A227] px-1.5 py-0.5 rounded font-mono">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#8E9299] font-mono mt-0.5">
                            آیکون: {item.iconName || 'Sparkles'} | پیوند: {item.link || '#'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleMenuItem(item.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                            item.isEnabled !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.isEnabled !== false ? 'فعال' : 'غیرفعال'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMenuItem(item.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="حذف آیتم منو"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Menu Item */}
                <div className="pt-3 border-t border-[#222225] grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newMenuItem.title}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, title: e.target.value })}
                    placeholder="عنوان آیتم (مثال: دفاتر و کاغذ)"
                    className="bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none"
                  />
                  <select
                    value={newMenuItem.iconName || 'Sparkles'}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, iconName: e.target.value })}
                    className="bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none"
                  >
                    <option value="Layers">Layers (دسته‌بندی و لایه‌ها)</option>
                    <option value="PenTool">PenTool (نوشت‌افزار و خودکار)</option>
                    <option value="BookOpen">BookOpen (دفاتر و کاغذ)</option>
                    <option value="Briefcase">Briefcase (لوازم اداری و بایگانی)</option>
                    <option value="Palette">Palette (هنری و مهندسی)</option>
                    <option value="Printer">Printer (چاپ و کپی)</option>
                    <option value="Sparkles">Sparkles (تولیدات اختصاصی)</option>
                    <option value="Gift">Gift (هدایا و جوایز)</option>
                  </select>
                  <input
                    type="text"
                    value={newMenuItem.badge || ''}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, badge: e.target.value })}
                    placeholder="برچسب اختیاری (مثلاً: ویژه)"
                    className="bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMenuItem}
                    className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-black" />
                    <span>افزودن به منو</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: BRANDING & SYMBOLS UPLOAD */}
          {settingsSubTab === 'branding' && (
            <div className="space-y-6">
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                  <Upload className="w-4 h-4" />
                  <span>آپلود مستقیم لوگوی فروشگاه و نمادهای مجوز روی سرور</span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  فایل‌های تصویری پس از انتخاب بلافاصله روی سرور خطی‌نو ذخیره و آدرس دائمی آن‌ها تنظیم می‌شود.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                  {/* Store Logo & Size Controls */}
                  <div className="bg-[#111113] p-4 rounded-2xl border border-[#2D2D33] flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F3F4F6] text-xs">لوگوی اصلی فروشگاه</span>
                      <span className="text-[10px] text-[#C9A227] font-mono font-bold">
                        {webSettings.logoHeight || 48}px
                      </span>
                    </div>

                    <div className="w-full h-36 rounded-2xl bg-[#161619] border border-[#2D2D33] flex items-center justify-center overflow-hidden relative shadow-inner p-2">
                      {webSettings.logoUrl ? (
                        <img
                          src={webSettings.logoUrl}
                          alt="لوگوی فروشگاه"
                          style={{
                            height: `${Math.min(Math.max(webSettings.logoHeight || 48, 24), 130)}px`,
                            width: webSettings.logoWidth ? `${Math.min(webSettings.logoWidth, 240)}px` : 'auto',
                            maxHeight: '100%',
                            maxWidth: '100%',
                            objectFit: (webSettings.logoFit as any) || 'contain',
                          }}
                          className={`${
                            webSettings.logoBorderRadius === 'rounded-none'
                              ? 'rounded-none'
                              : webSettings.logoBorderRadius || 'rounded-none'
                          } ${
                            webSettings.logoHasBorder
                              ? 'ring-1 ring-[#C9A227]/40 p-1 bg-white/5'
                              : 'ring-0 border-0 shadow-none'
                          } transition-all duration-200`}
                        />
                      ) : (
                        <div className="text-center p-2 text-[#8E9299]">
                          <BookOpen className="w-8 h-8 mx-auto text-[#C9A227] mb-1" />
                          <span className="text-[10px]">بدون تصویر لوگو</span>
                        </div>
                      )}
                    </div>

                    <label className="w-full bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] border border-[#C9A227]/30 font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-[11px]">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingLogo ? 'در حال آپلود...' : 'انتخاب و آپلود تصویر خام لوگو'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingLogo}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logoUrl', setIsUploadingLogo)}
                      />
                    </label>

                    <input
                      type="text"
                      value={webSettings.logoUrl || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, logoUrl: e.target.value })}
                      placeholder="یا لینک مستقیم اینترنتی عکس لوگو"
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2.5 py-1.5 text-[10px] text-center font-mono outline-none text-[#E0E0E0]"
                    />

                    {/* Logo Size Presets & Slider */}
                    <div className="pt-2 border-t border-[#222225] space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#8E9299] font-bold">اندازه و ارتفاع آرم (پیکسل):</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="20"
                              max="240"
                              value={webSettings.logoHeight || 48}
                              onChange={(e) => setWebSettings({ ...webSettings, logoHeight: Number(e.target.value) })}
                              className="w-14 bg-[#161619] border border-[#2D2D33] text-[#C9A227] font-mono font-bold text-center text-xs rounded px-1 py-0.5 outline-none"
                            />
                            <span className="text-[10px] text-[#8E9299]">px</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {[
                            { label: 'کوچک', size: 36 },
                            { label: 'عادی', size: 48 },
                            { label: 'بزرگ', size: 72 },
                            { label: 'خیلی‌بزرگ', size: 100 },
                            { label: 'ماکزیمم', size: 140 },
                            { label: 'غول‌آسا', size: 180 },
                          ].map((preset) => (
                            <button
                              key={preset.size}
                              type="button"
                              onClick={() => setWebSettings({ ...webSettings, logoHeight: preset.size })}
                              className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                (webSettings.logoHeight || 48) === preset.size
                                  ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                                  : 'bg-[#161619] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2D2D33]'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="240"
                          step="2"
                          value={webSettings.logoHeight || 48}
                          onChange={(e) => setWebSettings({ ...webSettings, logoHeight: Number(e.target.value) })}
                          className="w-full accent-[#C9A227] cursor-pointer h-1.5 bg-[#222225] rounded-lg"
                        />
                      </div>

                      {/* Frame / Border Toggle & Corner Rounding */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-[#8E9299] block mb-1 font-bold">حاشیه و قاب کادر:</label>
                          <select
                            value={webSettings.logoHasBorder ? 'framed' : 'borderless'}
                            onChange={(e) => setWebSettings({ ...webSettings, logoHasBorder: e.target.value === 'framed' })}
                            className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-lg p-1.5 outline-none font-sans"
                          >
                            <option value="borderless">بدون کادر (شفاف و دقیق خود عکس)</option>
                            <option value="framed">دارای کادر و قاب طلایی</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[#8E9299] block mb-1 font-bold">گردی گوشه‌ها:</label>
                          <select
                            value={webSettings.logoBorderRadius || 'rounded-none'}
                            onChange={(e) => setWebSettings({ ...webSettings, logoBorderRadius: e.target.value as any })}
                            className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-lg p-1.5 outline-none font-sans"
                          >
                            <option value="rounded-none">بدون گردی (مستطیل و شکل طبیعی عکس)</option>
                            <option value="rounded-lg">گردی ملایم (8px)</option>
                            <option value="rounded-xl">گردی متوسط (12px)</option>
                            <option value="rounded-2xl">گردی مدرن (16px)</option>
                            <option value="rounded-3xl">گردی زیاد (24px)</option>
                            <option value="rounded-full">دایره کامل (Full Circle)</option>
                          </select>
                        </div>
                      </div>

                      {/* Display Mode (Object Fit) */}
                      <div className="text-[10px]">
                        <label className="text-[#8E9299] block mb-1 font-bold">نحوه نمایش و مقیاس تصویر:</label>
                        <select
                          value={webSettings.logoFit || 'contain'}
                          onChange={(e) => setWebSettings({ ...webSettings, logoFit: e.target.value as any })}
                          className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] text-[#E0E0E0] rounded-lg p-1.5 outline-none font-sans"
                        >
                          <option value="contain">طبیعی و حفظ تناسب ابعاد (Contain)</option>
                          <option value="cover">برش و پوشش کامل کادر (Cover)</option>
                          <option value="fill">کشیدگی عرضی و طولی (Fill)</option>
                        </select>
                      </div>

                      {/* Show / Hide Site Name Text */}
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={webSettings.showLogoText !== false}
                          onChange={(e) => setWebSettings({ ...webSettings, showLogoText: e.target.checked })}
                          className="accent-[#C9A227] w-3.5 h-3.5 rounded"
                        />
                        <span className="text-[11px] text-[#8E9299] select-none font-medium">
                          نمایش عنوان متنی خطی‌نو در کنار لوگو
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Enamad Symbol */}
                  <div className="bg-[#111113] p-4 rounded-2xl border border-[#2D2D33] flex flex-col items-center text-center space-y-3">
                    <span className="font-bold text-[#F3F4F6] text-xs">تصویر نماد اعتماد الکترونیکی (اینماد)</span>
                    <div className="w-24 h-24 rounded-2xl bg-[#161619] border border-[#2D2D33] flex items-center justify-center overflow-hidden relative shadow-inner">
                      {webSettings.enamadImageUrl ? (
                        <img src={webSettings.enamadImageUrl} alt="نماد اعتماد" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="text-center p-2 text-[#8E9299]">
                          <ShieldCheck className="w-8 h-8 mx-auto text-[#C9A227] mb-1" />
                          <span className="text-[10px]">بدون تصویر اینماد</span>
                        </div>
                      )}
                    </div>
                    <label className="w-full bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] border border-[#C9A227]/30 font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-[11px]">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingEnamad ? 'در حال آپلود...' : 'آپلود تصویر اینماد'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingEnamad}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'enamadImageUrl', setIsUploadingEnamad)}
                      />
                    </label>
                    <input
                      type="text"
                      value={webSettings.enamadCode || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, enamadCode: e.target.value })}
                      placeholder="کد اینماد (مثال: ENM-987654)"
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2 py-1 text-[10px] text-center font-mono outline-none"
                    />
                  </div>

                  {/* Samandehi Symbol */}
                  <div className="bg-[#111113] p-4 rounded-2xl border border-[#2D2D33] flex flex-col items-center text-center space-y-3">
                    <span className="font-bold text-[#F3F4F6] text-xs">تصویر نماد ساماندهی وزارت ارشاد</span>
                    <div className="w-24 h-24 rounded-2xl bg-[#161619] border border-[#2D2D33] flex items-center justify-center overflow-hidden relative shadow-inner">
                      {webSettings.samandehiImageUrl ? (
                        <img src={webSettings.samandehiImageUrl} alt="نماد ساماندهی" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="text-center p-2 text-[#8E9299]">
                          <BookOpen className="w-8 h-8 mx-auto text-[#C9A227] mb-1" />
                          <span className="text-[10px]">بدون تصویر ساماندهی</span>
                        </div>
                      )}
                    </div>
                    <label className="w-full bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] border border-[#C9A227]/30 font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-[11px]">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingSamandehi ? 'در حال آپلود...' : 'آپلود تصویر ساماندهی'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingSamandehi}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'samandehiImageUrl', setIsUploadingSamandehi)}
                      />
                    </label>
                    <input
                      type="text"
                      value={webSettings.samandehiCode || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, samandehiCode: e.target.value })}
                      placeholder="کد ساماندهی (مثال: SMD-123456)"
                      className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2 py-1 text-[10px] text-center font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Custom Uploaded Trust Symbols & Badges */}
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>آپلود و ذخیره سایر نشان‌ها، مجوزها و نمادهای اختصاصی در فوتر</span>
                  </div>
                  <span className="text-[11px] text-[#8E9299]">
                    تعداد نشان‌های سفارشی: {toPersianDigits(webSettings.customSymbols?.length || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  می‌توانید هر نوع لوگو یا نشان اختصاصی دیگر (مانند گواهی استاندارد، پروانه کسب، نشان پرداخت امن، نشان اتحادیه و...) را با تصویر و لینک دلخواه بارگذاری و ذخیره کنید.
                </p>

                {/* Symbols Grid List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {webSettings.customSymbols?.map((sym) => (
                    <div
                      key={sym.id}
                      className="bg-[#111113] p-4 rounded-2xl border border-[#2D2D33] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-[#161619] rounded-xl border border-[#2D2D33] flex items-center justify-center p-1 overflow-hidden shrink-0">
                          <img src={sym.imageUrl} alt={sym.title} className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-[#F3F4F6] text-xs line-clamp-1">{sym.title}</div>
                          {sym.linkUrl && (
                            <a href={sym.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-500 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[120px]">{sym.linkUrl}</span>
                            </a>
                          )}
                          <div className="text-[9px] text-[#8E9299]">
                            {sym.isEnabled ? 'نمایش در فوتر: فعال' : 'نمایش در فوتر: غیرفعال'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCustomSymbol(sym.id)}
                          className="text-[#8E9299] hover:text-[#C9A227] cursor-pointer"
                          title="فعال/غیرفعال"
                        >
                          {sym.isEnabled ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-[#666]" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSymbol(sym.id)}
                          className="text-[#8E9299] hover:text-rose-400 p-1 cursor-pointer"
                          title="حذف نماد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!webSettings.customSymbols || webSettings.customSymbols.length === 0) && (
                    <div className="col-span-full text-center py-6 text-[#8E9299] bg-[#111113] rounded-2xl border border-[#222225]">
                      هنوز نماد سفارشی دیگری تعریف نشده است. می‌توانید با فرم زیر نشان جدید اضافه فرمایید.
                    </div>
                  )}
                </div>

                {/* Add Symbol Form */}
                <div className="bg-[#111113] p-4 rounded-2xl border border-[#2D2D33] space-y-3">
                  <span className="font-bold text-[#E0E0E0] text-xs block">افزودن و بارگذاری نشان / نماد جدید:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newSymbol.title}
                      onChange={(e) => setNewSymbol({ ...newSymbol, title: e.target.value })}
                      placeholder="عنوان نماد (مثلاً: نشان پرداخت امن، پروانه صنف)"
                      className="bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                    />
                    <input
                      type="text"
                      value={newSymbol.linkUrl || ''}
                      onChange={(e) => setNewSymbol({ ...newSymbol, linkUrl: e.target.value })}
                      placeholder="لینک اعتبارسنجی URL (اختیاری)"
                      className="bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs font-mono text-left"
                    />
                    <label className="bg-[#1C1C20] hover:bg-[#25252B] text-[#C9A227] border border-[#C9A227]/30 font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingCustomSymbol ? 'در حال آپلود...' : 'انتخاب تصویر نماد از سیستم'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingCustomSymbol}
                        className="hidden"
                        onChange={handleUploadNewSymbolImage}
                      />
                    </label>
                  </div>

                  {newSymbol.imageUrl && (
                    <div className="flex items-center gap-3 bg-[#161619] p-2.5 rounded-xl border border-[#2D2D33]">
                      <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0 overflow-hidden flex items-center justify-center">
                        <img src={newSymbol.imageUrl} alt="پیش‌نمایش" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[11px] text-[#8E9299] truncate flex-1 font-mono">{newSymbol.imageUrl}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddCustomSymbol}
                      className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-black" />
                      <span>ذخیره و افزودن به لیست نمادها</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: CONTACT, ADDRESS & LOCATION INFO */}
          {settingsSubTab === 'contact' && (
            <div className="space-y-6">
              {/* General Contact Info */}
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                  <Phone className="w-4 h-4" />
                  <span>مشخصات اصلی تماس، پشتیبانی و شبکه‌های اجتماعی</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">عنوان سایت:</label>
                    <input
                      type="text"
                      value={webSettings.siteTitle || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, siteTitle: e.target.value })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3.5 py-2.5 font-bold text-[#E0E0E0] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">زیرعنوان و توضیحات فوتر:</label>
                    <input
                      type="text"
                      value={webSettings.siteSubtitle || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, siteSubtitle: e.target.value })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3.5 py-2.5 text-[#E0E0E0] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">تلفن پشتیبانی و سفارشات:</label>
                    <input
                      type="text"
                      value={webSettings.supportPhone || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, supportPhone: e.target.value })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3.5 py-2.5 font-mono text-[#E0E0E0] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">شماره واتساپ:</label>
                    <input
                      type="text"
                      value={webSettings.whatsapp || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, whatsapp: e.target.value })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3.5 py-2.5 font-mono text-[#E0E0E0] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">آی‌دی اینستاگرام:</label>
                    <input
                      type="text"
                      value={webSettings.instagram || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, instagram: e.target.value })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3.5 py-2.5 font-mono text-[#E0E0E0] outline-none text-left"
                      placeholder="@khatynoo"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">ساعات کاری و پاسخگویی:</label>
                    <input
                      type="text"
                      value={webSettings.workingHours || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, workingHours: e.target.value })}
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3.5 py-2.5 text-[#E0E0E0] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Address & Map / Routing Location Settings */}
              <div className="bg-[#161619] p-5 rounded-2xl border border-[#2D2D33] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>آدرس پستی دقیق، نقشه و لینک‌های مسیریابی فروشگاه و کارگاه</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webSettings.showLocationMap !== false}
                      onChange={(e) => setWebSettings({ ...webSettings, showLocationMap: e.target.checked })}
                      className="accent-[#C9A227] w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs text-[#E0E0E0] font-bold">نمایش دکمه‌های مسیریابی و آدرس در فوتر</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-[#8E9299] block mb-1">نشانی و آدرس پستی کامل:</label>
                    <textarea
                      rows={2}
                      value={webSettings.address || ''}
                      onChange={(e) => setWebSettings({ ...webSettings, address: e.target.value })}
                      placeholder="تهران، بازار بزرگ، خیابان ۱۵ خرداد، بازار آهنگران، کوچه مروی، پلاک ۱۲، فروشگاه و چاپ مرکزی خطی‌نو"
                      className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-3 text-xs leading-relaxed text-[#E0E0E0] outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1">شهر / استان:</label>
                      <input
                        type="text"
                        value={webSettings.city || ''}
                        onChange={(e) => setWebSettings({ ...webSettings, city: e.target.value })}
                        placeholder="تهران"
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1">کد پستی ۱۰ رقمی:</label>
                      <input
                        type="text"
                        value={webSettings.postalCode || ''}
                        onChange={(e) => setWebSettings({ ...webSettings, postalCode: e.target.value })}
                        placeholder="۱۱۶۸۷۳۴۵۹۱"
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 font-mono text-center text-[#E0E0E0] outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1">مختصات جغرافیایی (Lat, Lng):</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={webSettings.mapLatitude || ''}
                          onChange={(e) => setWebSettings({ ...webSettings, mapLatitude: e.target.value })}
                          placeholder="35.6892"
                          className="bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2 py-2 font-mono text-center text-[#E0E0E0] outline-none text-[11px]"
                          title="Latitude (عرض جغرافیایی)"
                        />
                        <input
                          type="text"
                          value={webSettings.mapLongitude || ''}
                          onChange={(e) => setWebSettings({ ...webSettings, mapLongitude: e.target.value })}
                          placeholder="51.3890"
                          className="bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-2 py-2 font-mono text-center text-[#E0E0E0] outline-none text-[11px]"
                          title="Longitude (طول جغرافیایی)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Routing Links */}
                  <div className="pt-2 border-t border-[#222225] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1 text-[11px] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>لینک گوگل‌مپ (Google Maps):</span>
                      </label>
                      <input
                        type="text"
                        value={webSettings.googleMapsUrl || ''}
                        onChange={(e) => setWebSettings({ ...webSettings, googleMapsUrl: e.target.value })}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 font-mono text-left text-[#E0E0E0] outline-none text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1 text-[11px] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>لینک مسیریابی در نشان (Neshan):</span>
                      </label>
                      <input
                        type="text"
                        value={webSettings.neshanUrl || ''}
                        onChange={(e) => setWebSettings({ ...webSettings, neshanUrl: e.target.value })}
                        placeholder="https://nshn.ir/..."
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 font-mono text-left text-[#E0E0E0] outline-none text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#8E9299] block mb-1 text-[11px] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>لینک مسیریابی در بلد (Balad):</span>
                      </label>
                      <input
                        type="text"
                        value={webSettings.baladUrl || ''}
                        onChange={(e) => setWebSettings({ ...webSettings, baladUrl: e.target.value })}
                        placeholder="https://balad.ir/..."
                        className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 font-mono text-left text-[#E0E0E0] outline-none text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-[#222225] flex justify-end">
            <button
              type="submit"
              className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg shadow-[#C9A227]/20 flex items-center gap-2 cursor-pointer text-xs"
            >
              <Save className="w-4 h-4 text-black" />
              <span>ذخیره تغییرات وب‌سایت</span>
            </button>
          </div>
        </form>
      )}

      {/* Tracking Code Modal */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4">
            <h4 className="font-black text-[#F3F4F6] text-sm">ثبت کد رهگیری پستی مرسوله</h4>
            <form onSubmit={handleSaveTrackingCode} className="space-y-3 text-xs">
              <div className="font-bold text-[#C9A227]">سفارش: {trackingModalOrder.orderNumber}</div>
              <input
                type="text"
                required
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                placeholder="مثال: کد ۲۴ رقمی پست یا بارنامه تیپاکس"
                className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono text-center outline-none text-[#E0E0E0]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  ثبت و تغییر به «ارسال شد»
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-3 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner Create Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111113] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2D2D33] space-y-4">
            <h4 className="font-black text-[#F3F4F6] text-sm">افزودن بنر اسلایدر صفحه نخست</h4>
            <form onSubmit={handleCreateBanner} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">عنوان اصلی بنر:</label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="دفاتر سیمی ۱۰۰ برگ خطی‌نو"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-bold outline-none text-[#E0E0E0]"
                />
              </div>
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">زیرعنوان توضیحی:</label>
                <input
                  type="text"
                  required
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="کاغذ ۸۰ گرم اندونزی با جلد مقاوم ضدآب"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0]"
                />
              </div>
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">نشان بنر (Badge):</label>
                <input
                  type="text"
                  required
                  value={bannerForm.badge}
                  onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value })}
                  placeholder="تولید اختصاصی یا ۵۰٪ تخفیف"
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 outline-none text-[#E0E0E0]"
                />
              </div>
              <div>
                <label className="font-bold text-[#8E9299] block mb-1">آدرس تصویر (URL):</label>
                <input
                  type="text"
                  required
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                  className="w-full bg-[#161619] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl p-2.5 font-mono outline-none text-left text-[#E0E0E0]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  ذخیره و انتشار بنر
                </button>
                <button
                  type="button"
                  onClick={() => setShowBannerModal(false)}
                  className="px-4 bg-[#1C1C20] hover:bg-[#25252B] text-[#E0E0E0] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
