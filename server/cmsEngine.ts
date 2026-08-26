// ==============================================================================
// موتور معماری ماژولار CMS اختصاصی خطی‌نو (Core + Modules & Event/Hook Bus)
// ==============================================================================

import {
  CmsModule,
  EventHook,
  PageBuilderBlock,
  PageTemplate,
  MediaItem,
  SmsProviderConfig,
  SmsLog,
  Coupon,
  ProductReview,
  PaymentGatewayConfig,
  AdminAuditLog,
} from '../src/types';

// ۱. لیست ماژول‌های اولیه استاندارد سیستم
let modules: CmsModule[] = [
  {
    id: 'products',
    name: 'ماژول محصولات و دسته‌بندی‌ها',
    description: 'مدیریت چندسطحی کالاها، بارکد، تنوع واریانت‌ها، هشدار موجودی انبار و کاتالوگ فروشگاه',
    version: '2.4.0',
    icon: 'Package',
    category: 'commerce',
    isEnabled: true,
    isCore: true,
    author: 'Khatinoo Core Dev',
    hooks: ['product:created', 'product:updated', 'product:out_of_stock'],
    lastUpdated: '1403/05/20',
  },
  {
    id: 'cart_checkout',
    name: 'ماژول سبد خرید و ثبت سفارش',
    description: 'محاسبه گر آنلاین، تخفیف‌ها، هزینه حمل پویا و اتصال به درگاه پرداخت و پایانه فروش',
    version: '2.1.0',
    icon: 'ShoppingCart',
    category: 'commerce',
    isEnabled: true,
    isCore: true,
    author: 'Khatinoo Core Dev',
    hooks: ['order:created', 'order:paid', 'order:shipped'],
    lastUpdated: '1403/05/22',
  },
  {
    id: 'page_builder',
    name: 'ماژول صفحه‌ساز بصری (Visual Page Builder)',
    description: 'ویرایشگر چیدمان بلوک‌های صفحه اصلی با جابجایی Drag & Drop، پیش‌نمایش زنده موبایل/دسکتاپ',
    version: '1.8.0',
    icon: 'LayoutTemplate',
    category: 'system',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo Design Studio',
    hooks: ['page:updated', 'template:switched'],
    lastUpdated: '1403/05/28',
  },
  {
    id: 'media_library',
    name: 'ماژول کتابخانه رسانه و مدیا',
    description: 'مدیریت متمرکز تصاویر، لوگو، فاویکون، بهینه‌سازی خودکار WebP و تغییر بنرها بدون کدنویسی',
    version: '1.5.0',
    icon: 'Image',
    category: 'system',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo Core Dev',
    hooks: ['media:uploaded', 'media:deleted'],
    lastUpdated: '1403/05/18',
  },
  {
    id: 'sms_gateway',
    name: 'ماژول پیامک و احراز هویت OTP',
    description: 'اتصال به کاوه نگار، ملی‌پیامک و فراز اس‌ام‌اس؛ ارسال پیامک تأیید سفارش و ورود سریع با کد تایید',
    version: '2.0.0',
    icon: 'MessageSquare',
    category: 'communication',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo Telemetry',
    hooks: ['sms:sent', 'otp:requested', 'order:created', 'order:shipped'],
    lastUpdated: '1403/05/25',
  },
  {
    id: 'payment_gateway',
    name: 'ماژول درگاه‌های پرداخت آنلاین',
    description: 'یکپارچه‌سازی چنددرگاهی (زرین‌پال، آیدی‌پی، به‌پرداخت ملت، زیبال) و پرداخت نقدی در محل (COD)',
    version: '2.3.0',
    icon: 'CreditCard',
    category: 'commerce',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo FinTech',
    hooks: ['payment:initiated', 'payment:verified', 'payment:failed'],
    lastUpdated: '1403/05/24',
  },
  {
    id: 'coupons',
    name: 'ماژول تخفیف‌ها و کدهای کوپن',
    description: 'ایجاد کدهای تخفیف درصدی و مبلغ ثابت با سقف خرید، تعداد مجاز استفاده و تاریخ انقضا',
    version: '1.4.0',
    icon: 'Percent',
    category: 'marketing',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo Marketing',
    hooks: ['coupon:applied', 'coupon:created'],
    lastUpdated: '1403/05/19',
  },
  {
    id: 'reviews',
    name: 'ماژول نظرات و امتیازدهی کالاها',
    description: 'ثبت دیدگاه خریداران، امتیاز ۵ ستاره، تایید محتوا توسط ادمین و پاسخ‌دهی به مشتریان',
    version: '1.2.0',
    icon: 'Star',
    category: 'marketing',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo Community',
    hooks: ['review:submitted', 'review:approved'],
    lastUpdated: '1403/05/15',
  },
  {
    id: 'torob_engine',
    name: 'ماژول هوش مصنوعی و تحلیل بازار ترب',
    description: 'رصد قیمت رقبا در ترب، قیمت‌گذاری ۵ سطحی خودکار و دستیار هوشمند تجاری با مدل Gemini',
    version: '3.0.0',
    icon: 'TrendingUp',
    category: 'marketing',
    isEnabled: true,
    isCore: false,
    author: 'Khatinoo AI Lab',
    hooks: ['price:scraped', 'price:synced'],
    lastUpdated: '1403/05/27',
  },
  {
    id: 'pos_accounting',
    name: 'ماژول صندوق POS و حسابداری یکپارچه',
    description: 'اتصال مستقیم به کارتخوان پاسارگاد، فاکتورهای رسمی، سامانه صیاد و کارگاه تولید دفاتر',
    version: '3.2.0',
    icon: 'Cpu',
    category: 'core',
    isEnabled: true,
    isCore: true,
    author: 'Khatinoo Accounting Group',
    hooks: ['pos:transaction', 'cheque:registered', 'production:executed'],
    lastUpdated: '1403/05/28',
  },
];

// ۲. سیستم رویدادها و Hook Bus (WordPress-like Event System)
let eventHooks: EventHook[] = [
  {
    name: 'order:created',
    description: 'زمان ثبت سفارش آنلاین جدید توسط مشتری',
    registeredModules: ['sms_gateway', 'cart_checkout', 'pos_accounting'],
  },
  {
    name: 'order:paid',
    description: 'زمان تایید موفق پرداخت توسط درگاه بانکی',
    registeredModules: ['sms_gateway', 'payment_gateway', 'pos_accounting'],
  },
  {
    name: 'order:shipped',
    description: 'زمان تغییر وضعیت سفارش به ارسال‌شده و صدور کد رهگیری پستی',
    registeredModules: ['sms_gateway'],
  },
  {
    name: 'product:out_of_stock',
    description: 'زمان رسیدن موجودی یک کالا به زیر حد هشدار',
    registeredModules: ['sms_gateway', 'products'],
  },
  {
    name: 'review:submitted',
    description: 'زمان ثبت دیدگاه و امتیاز جدید برای محصول',
    registeredModules: ['reviews'],
  },
];

// ۳. بلوک‌های چیدمان پیش‌فرض صفحه‌ساز (Page Builder Blocks)
let pageBlocks: PageBuilderBlock[] = [
  {
    id: 'blk_banner_slider',
    type: 'banner_slider',
    title: 'اسلایدر و بنرهای تبلیغاتی اصلی',
    isEnabled: true,
    sortOrder: 1,
    settings: {
      layout: 'carousel',
      headingText: 'جشنواره تخفیفات لوازم‌تحریر و تولیدات خطی‌نو',
      subheadingText: 'بهترین قیمت‌های بازار با ارسال سریع کشوری',
      buttonText: 'مشاهده همه محصولات',
      buttonLink: '#products',
      buttonPosition: 'center',
      buttonStyle: 'gold',
      paddingY: 'small',
      items: [
        {
          id: 'slide_1',
          title: 'دفاتر سیمی جلد سخت خطی‌نو',
          subtitle: 'تولید شده با کاغذ اعلای ۸۰ گرم بدون رد جوهر، مناسب دانشگاه و مدرسه',
          badge: 'تولید ملی',
          imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1600',
          linkUrl: '#products',
          highlight: true,
        },
        {
          id: 'slide_2',
          title: 'تخفیفات ویژه ست‌های نوشت‌افزار فانتزی و اداری',
          subtitle: 'انواع خودکار، ماژیک، روان‌نویس و اتود با ضمانت اصالت',
          badge: 'تا ۳۵٪ تخفیف',
          imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=1600',
          linkUrl: '#products',
          highlight: false,
        },
        {
          id: 'slide_3',
          title: 'خدمات آنلاین چاپ، کپی و صحافی سیمی فوری',
          subtitle: 'محاسبه آنلاین قیمت پرینت جزوات دانشجویی و ارسال به تمام نقاط کشور',
          badge: 'تحویل فوری',
          imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=1600',
          linkUrl: '#services',
          highlight: false,
        },
      ],
    },
  },
  {
    id: 'blk_features_badges',
    type: 'features_badges',
    title: 'نوار مزایا و ویژگی‌های برتر خطی‌نو',
    isEnabled: true,
    sortOrder: 2,
    settings: {
      layout: 'grid',
      columns: 4,
      headingText: 'چرا خرید از خطی‌نو؟',
      paddingY: 'small',
      items: [
        {
          id: 'feat_1',
          title: 'تولید اختصاصی خطی‌نو',
          subtitle: 'دفاتر مشق، سیمی و طراحی با کاغذ ۸۰ گرم',
          icon: 'Sparkles',
          badge: 'تولید ملی',
          highlight: true,
        },
        {
          id: 'feat_2',
          title: 'تضمین مناسب‌ترین قیمت',
          subtitle: 'همگام با بازار و قیمت ترب با تخفیف تیراژ',
          icon: 'TrendingUp',
          badge: 'تضمین قیمت',
          highlight: false,
        },
        {
          id: 'feat_3',
          title: 'تنوع ۵۰۰۰+ قلم کالا',
          subtitle: 'برترین برندهای نوشت‌افزار داخلی و وارداتی',
          icon: 'Layers',
          badge: 'تنوع بالا',
          highlight: false,
        },
        {
          id: 'feat_4',
          title: 'ارسال سریع کشوری',
          subtitle: 'پیک روزانه در اصفهان و پست پیشتاز سراسری',
          icon: 'CheckCircle2',
          badge: 'ارسال فوری',
          highlight: false,
        },
      ],
    },
  },
  {
    id: 'blk_category_grid',
    type: 'category_grid',
    title: 'شبکه دسته‌بندی‌های کالاها',
    isEnabled: true,
    sortOrder: 3,
    settings: {
      layout: 'grid',
      columns: 5,
      limitCount: 12,
      headingText: 'دسته‌بندی‌های محبوب فروشگاه',
      subheadingText: 'مشاهده و دسترسی سریع به کاتالوگ جامع محصولات',
      buttonText: 'مشاهده همه دسته‌ها',
      buttonPosition: 'left',
      paddingY: 'medium',
    },
  },
  {
    id: 'blk_featured_products',
    type: 'featured_products',
    title: 'ویترین محصولات تولید اختصاصی خطی‌نو',
    isEnabled: true,
    sortOrder: 4,
    settings: {
      layout: 'grid',
      columns: 4,
      limitCount: 8,
      headingText: 'تولیدات اختصاصی خطی‌نو (دفاتر سیمی، یادداشت و طراحی)',
      subheadingText: 'تولید شده با کاغذ اعلای ۸۰ گرم اندونزی و جلد متالیک',
      badgeText: 'تولید ملی',
      buttonText: 'مشاهده همه تولیدات',
      buttonPosition: 'left',
      buttonStyle: 'gold',
      paddingY: 'medium',
    },
  },
  {
    id: 'blk_special_offers',
    type: 'special_offers',
    title: 'پیشنهادات شگفت‌انگیز و تخفیف‌دار',
    isEnabled: true,
    sortOrder: 5,
    settings: {
      layout: 'carousel',
      columns: 4,
      limitCount: 8,
      headingText: 'تخفیف‌های شگفت‌انگیز و پیشنهادهای ویژه',
      subheadingText: 'فرصت محدود خرید با کمترین قیمت‌های ممکن',
      badgeText: 'تا ۳۵٪ تخفیف',
      buttonText: 'مشاهده همه تخفیف‌ها',
      buttonPosition: 'left',
      buttonStyle: 'amber',
      paddingY: 'medium',
    },
  },
  {
    id: 'blk_services_cta',
    type: 'services_cta',
    title: 'باکس محاسبه آنلاین خدمات چاپ، کپی و صحافی',
    isEnabled: true,
    sortOrder: 6,
    settings: {
      layout: 'compact',
      headingText: 'محاسبه آنلاین قیمت چاپ جزوات، کپی و سیمی کردن',
      subheadingText: 'تحویل فوری در اصفهان و ارسال پستی به سراسر کشور با بهترین کیفیت و تعرفه دانشجویی',
      buttonText: 'شروع محاسبه آنلاین قیمت کپی',
      buttonLink: '#calculator',
      buttonPosition: 'center',
      buttonStyle: 'gold',
      badgeText: 'محاسبه‌گر هوشمند',
      paddingY: 'medium',
      items: [
        { id: 'srv_1', title: 'پرینت سیاه سفید و رنگی با دقت بالا', subtitle: 'انواع سایز A4, A3, A5', icon: 'Printer' },
        { id: 'srv_2', title: 'صحافی سیمی فلزی و دوبل اعلا', subtitle: 'با طلق ضخیم و کریستالی', icon: 'BookOpen' },
        { id: 'srv_3', title: 'تخفیف تیراژ برای دانشگاه‌ها و اساتید', subtitle: 'قیمت همکاری ویژه', icon: 'Percent' },
      ],
    },
  },
];

// قالب‌های ذخیره‌شده صفحه‌ساز (Page Templates)
let pageTemplates: PageTemplate[] = [
  {
    id: 'tpl_default',
    name: 'قالب استاندارد فروشگاه خطی‌نو',
    description: 'چیدمان کامل شامل اسلایدر، مزایا، تولیدات خطی‌نو، دسته‌ها و تخفیف‌ها',
    blocks: [...pageBlocks],
    isDefault: true,
  },
  {
    id: 'tpl_festival',
    name: 'قالب جشنواره بازگشت به مدرسه / دانشگاه',
    description: 'تمرکز بالا بر تخفیف‌های ویژه، پک‌های نوشت‌افزار و دفاتر مشق',
    blocks: [
      { ...pageBlocks[0], title: 'بنر جشنواره بوی ماه مهر' },
      { ...pageBlocks[4], title: 'تخفیف‌های استثنایی آغاز سال تحصیلی' },
      { ...pageBlocks[3], title: 'دفاتر و ملزومات مدرسه' },
      { ...pageBlocks[1] },
      { ...pageBlocks[5] },
    ],
    isDefault: false,
  },
  {
    id: 'tpl_minimal',
    name: 'قالب مینیمال کاتالوگ و چاپ سریع',
    description: 'چیدمان سریع و ساده برای سفارشات عمده و خدمات پرینت و تکثیر',
    blocks: [
      { ...pageBlocks[1] },
      { ...pageBlocks[5] },
      { ...pageBlocks[3] },
    ],
    isDefault: false,
  },
];

// ۴. کتابخانه رسانه و مدیا (Media Library)
let mediaItems: MediaItem[] = [
  {
    id: 'med_1',
    filename: 'khatinoo-banner-special.webp',
    title: 'بنر جشنواره تخفیفات طلایی خطی‌نو',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1400&auto=format&fit=crop&q=80',
    fileType: 'image/webp',
    sizeBytes: 142500,
    dimensions: '1400x520',
    altText: 'جشنواره تخفیفات نوشت‌افزار خطی‌نو',
    category: 'banner',
    createdAt: '1403/05/20 14:30',
  },
  {
    id: 'med_2',
    filename: 'bic-crystal-blue.webp',
    title: 'عکس خودکار بیک کریستال آبی',
    url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
    fileType: 'image/webp',
    sizeBytes: 88400,
    dimensions: '800x800',
    altText: 'خودکار بیک کریستال فرانسه',
    category: 'product',
    createdAt: '1403/05/18 10:15',
  },
  {
    id: 'med_3',
    filename: 'notebook-spiral-gold.webp',
    title: 'عکس دفتر ۱۰۰ برگ سیمی جلد سخت طلایی',
    url: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80',
    fileType: 'image/webp',
    sizeBytes: 112000,
    dimensions: '800x800',
    altText: 'دفتر سیمی تولیدی خطی‌نو',
    category: 'product',
    createdAt: '1403/05/22 16:40',
  },
  {
    id: 'med_4',
    filename: 'khatinoo-official-logo.webp',
    title: 'لوگوی رسمی نشان تجاری خطی‌نو',
    url: 'https://images.unsplash.com/photo-1507842229451-7f01be7ac049?w=400&auto=format&fit=crop&q=80',
    fileType: 'image/webp',
    sizeBytes: 45200,
    dimensions: '400x400',
    altText: 'لوگوی خطی‌نو',
    category: 'logo',
    createdAt: '1403/05/10 09:00',
  },
];

// ۵. تنظیمات درگاه پیامک و OTP
let smsConfig: SmsProviderConfig = {
  provider: 'kavenegar',
  apiKey: 'khatinoo_kavenegar_live_api_key_sample',
  senderNumber: '10008585',
  isEnabled: true,
  patternOrderPlaced: 'khatinoo-order-placed',
  patternOrderShipped: 'khatinoo-order-shipped',
  patternOtp: 'khatinoo-otp-auth',
  lowStockAlertMobile: '09131234567',
  isSimulated: true, // شبیه‌ساز امن در محیط توسعه
};

let smsLogs: SmsLog[] = [
  {
    id: 'sms_1',
    recipient: '09121112233',
    message: 'خطی‌نو: سفارش KH-1403-1001 با موفقیت ثبت شد. پیگیری: https://khatynoo.ir',
    provider: 'kavenegar',
    status: 'delivered',
    sentAt: '1403/05/28 12:45',
    costRials: 1850,
  },
  {
    id: 'sms_2',
    recipient: '09355556677',
    message: 'کد تایید ورود به خطی‌نو: 849201 (اعتبار: ۲ دقیقه)',
    provider: 'kavenegar',
    status: 'delivered',
    sentAt: '1403/05/28 13:10',
    costRials: 1850,
  },
  {
    id: 'sms_3',
    recipient: '09139998877',
    message: 'سفارش KH-1403-0988 به اداره پست تحویل شد. کد رهگیری: 2948193859281729',
    provider: 'kavenegar',
    status: 'delivered',
    sentAt: '1403/05/27 16:20',
    costRials: 1850,
  },
];

// ۶. تنظیمات درگاه‌های پرداخت بانکی (Payment Gateways)
let paymentGateways: PaymentGatewayConfig[] = [
  {
    id: 'gw_zarinpal',
    name: 'درگاه پرداخت اینترنتی زرین‌پال (ZarinPal)',
    code: 'zarinpal',
    isActive: true,
    merchantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    sandbox: true,
    description: 'پرداخت امن با تمامی کارت‌های عضو شتاب از طریق درگاه پرداخت زرین‌پال',
    icon: 'Zap',
    feePercent: 0.01,
  },
  {
    id: 'gw_idpay',
    name: 'درگاه پرداخت آیدی‌پی (IDPay)',
    code: 'idpay',
    isActive: true,
    apiKey: 'sample_idpay_api_key_khatinoo',
    sandbox: true,
    description: 'درگاه واسط پرداخت آیدی‌پی با تسویه حساب سریع',
    icon: 'CreditCard',
    feePercent: 0.01,
  },
  {
    id: 'gw_behpardakht',
    name: 'به‌پرداخت ملت (درگاه مستقیم بانکی)',
    code: 'behpardakht',
    isActive: false,
    terminalId: '12345678',
    merchantId: '87654321',
    sandbox: false,
    description: 'درگاه پرداخت اینترنتی بانک ملت (مستقیم و بدون کارمزد واسط)',
    icon: 'Building2',
  },
  {
    id: 'gw_zibal',
    name: 'درگاه پرداخت زیبال (Zibal)',
    code: 'zibal',
    isActive: false,
    merchantId: 'zibal_merchant_sample',
    sandbox: true,
    description: 'درگاه پرداخت زیبال با امکان تسهیم و تسویه خودکار',
    icon: 'ShieldCheck',
  },
  {
    id: 'gw_cod',
    name: 'پرداخت در محل (Cash on Delivery / تحویل حضوری)',
    code: 'cod',
    isActive: true,
    sandbox: false,
    description: 'پرداخت نقدی یا با کارتخوان سیار هنگام دریافت کالا در اصفهان',
    icon: 'Truck',
  },
];

// ۷. کدهای تخفیف و کوپن‌ها (Coupons)
let coupons: Coupon[] = [
  {
    id: 'cpn_welcome',
    code: 'KHATINOO1403',
    type: 'percentage',
    value: 15,
    minCartAmount: 150000,
    maxDiscountAmount: 70000,
    maxUsages: 500,
    usedCount: 84,
    startDate: '1403/05/01',
    expiryDate: '1403/06/31',
    isActive: true,
    description: 'تخفیف ویژه ۱۵ درصدی افتتاحیه فروشگاه آنلاین خطی‌نو',
  },
  {
    id: 'cpn_notebook',
    code: 'DAFTAR50',
    type: 'fixed_amount',
    value: 50000,
    minCartAmount: 300000,
    maxUsages: 200,
    usedCount: 42,
    startDate: '1403/05/15',
    expiryDate: '1403/07/15',
    isActive: true,
    description: 'تخفیف ۵۰،۰۰۰ تومانی خرید دفاتر سیمی بالای ۳۰۰ هزار تومان',
  },
];

// ۸. نظرات و امتیازدهی مشتریان (Product Reviews)
let productReviews: ProductReview[] = [
  {
    id: 'rev_1',
    productId: 'prod_1',
    productName: 'خودکار بیک کریستال آبی نوک ۱.۰ میلی‌متر',
    customerName: 'رضا کمالی',
    customerMobile: '0912***4455',
    rating: 5,
    comment: 'خودکار اصلی فرانسه و بسیار روان هست. جوهر پس نمیده و بسته‌بندی عالی بود.',
    adminReply: 'سپاس از اعتماد و نظر مثبت شما جناب کمالی عزیز.',
    status: 'approved',
    createdAt: '1403/05/24 18:20',
  },
  {
    id: 'rev_2',
    productId: 'prod_2',
    productName: 'دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو (متالیک)',
    customerName: 'مهسا ابراهیمی',
    customerMobile: '0935***1122',
    rating: 5,
    comment: 'جنس کاغذها واقعاً فوق‌العاده‌ست، اتود یا خودنویس به پشت برگه رد نمیندازه. جلدش هم خیلی شیکه.',
    adminReply: 'از حسن انتخاب و رضایت شما از تولیدات کارگاه خطی‌نو بسیار خرسندیم.',
    status: 'approved',
    createdAt: '1403/05/26 11:40',
  },
  {
    id: 'rev_3',
    productId: 'prod_3',
    productName: 'کاغذ A4 دبل آ ۸۰ گرم ۵۰۰ برگی',
    customerName: 'حامد تقوی (دفتر فنی)',
    rating: 4,
    comment: 'کیفیت Double A اصلی بود، دستگاه پرینتر اصلاً گیر نکرد. فقط تحویل تیپاکس یک روز دیرتر شد.',
    status: 'approved',
    createdAt: '1403/05/27 09:15',
  },
];

// ۹. لاگ‌های امنیتی و حسابرسی ادمین (Admin Audit Logs)
let auditLogs: AdminAuditLog[] = [
  {
    id: 'log_1',
    userId: 'usr_site',
    username: 'sitemanager',
    action: 'ورود موفق به پرتال مدیریت فروشگاه آنلاین (/adminsite)',
    ip: '5.122.84.19',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0',
    timestamp: '1403/05/28 14:00',
    status: 'success',
  },
  {
    id: 'log_2',
    userId: 'usr_admin',
    username: 'admin',
    action: 'تغییر چیدمان بلوک‌های صفحه اصلی در ماژول صفحه‌ساز',
    ip: '2.188.192.4',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '1403/05/28 13:45',
    status: 'success',
  },
  {
    id: 'log_3',
    userId: 'usr_site',
    username: 'sitemanager',
    action: 'ارسال کد رهگیری پستی برای سفارش KH-1403-1001',
    ip: '5.122.84.19',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: '1403/05/28 12:50',
    status: 'success',
  },
];

// =============================================================================
// CMS API & EVENT ENGINE METHODS
// =============================================================================

export const cmsEngine = {
  // --- MODULES & HOOKS ---
  getModules: () => modules,
  toggleModule: (id: string, isEnabled: boolean) => {
    const mod = modules.find((m) => m.id === id);
    if (!mod) throw new Error('ماژول یافت نشد.');
    if (mod.isCore && !isEnabled) {
      throw new Error('ماژول‌های هسته اصلی (Core) قابل غیرفعال‌سازی نیستند.');
    }
    mod.isEnabled = isEnabled;
    cmsEngine.triggerEvent('module:toggled', { moduleId: id, isEnabled });
    return mod;
  },
  getEventHooks: () => eventHooks,
  triggerEvent: (eventName: string, payload: any) => {
    console.log(`📡 [CMS Event Triggered]: ${eventName}`, payload);
    // Execute registered module behaviors
    if (eventName === 'order:created') {
      const order = payload;
      if (smsConfig.isEnabled && order.customerMobile) {
        const msg = `خطی‌نو: سفارش ${order.orderNumber} به مبلغ ${Number(order.finalAmount || 0).toLocaleString('fa-IR')} تومان ثبت گردید. با تشکر از خرید شما.`;
        smsLogs.unshift({
          id: `sms_${Date.now()}`,
          recipient: order.customerMobile,
          message: msg,
          provider: smsConfig.provider,
          status: 'sent',
          sentAt: new Date().toLocaleTimeString('fa-IR'),
          costRials: 1850,
        });
      }
    }
  },

  // --- PAGE BUILDER ---
  getPageBlocks: () => pageBlocks,
  savePageBlocks: (newBlocks: PageBuilderBlock[]) => {
    pageBlocks = newBlocks.map((b, idx) => ({
      ...b,
      sortOrder: b.sortOrder !== undefined ? b.sortOrder : idx + 1,
      settings: b.settings || {},
    })).sort((a, b) => a.sortOrder - b.sortOrder);
    cmsEngine.triggerEvent('page:updated', { blocksCount: pageBlocks.length });
    return pageBlocks;
  },
  getTemplates: () => pageTemplates,
  applyTemplate: (templateId: string) => {
    const tpl = pageTemplates.find((t) => t.id === templateId);
    if (!tpl) throw new Error('قالب یافت نشد.');
    pageBlocks = JSON.parse(JSON.stringify(tpl.blocks));
    cmsEngine.triggerEvent('template:switched', { templateId });
    return pageBlocks;
  },
  saveAsTemplate: (name: string, description?: string, customBlocks?: PageBuilderBlock[]) => {
    const blocksToSave = customBlocks && customBlocks.length > 0
      ? JSON.parse(JSON.stringify(customBlocks))
      : JSON.parse(JSON.stringify(pageBlocks));

    const newTpl: PageTemplate = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || 'قالب سفارشی چیدمان فروشگاه',
      blocks: blocksToSave,
      isDefault: false,
    };
    pageTemplates.push(newTpl);
    cmsEngine.triggerEvent('template:saved', { templateId: newTpl.id, name: newTpl.name });
    return newTpl;
  },
  deleteTemplate: (templateId: string) => {
    const tpl = pageTemplates.find((t) => t.id === templateId);
    if (!tpl) throw new Error('قالب یافت نشد.');
    if (tpl.isDefault) throw new Error('قالب‌های پیش‌فرض سامانه قابل حذف نیستند.');
    pageTemplates = pageTemplates.filter((t) => t.id !== templateId);
    cmsEngine.triggerEvent('template:deleted', { templateId });
    return { success: true };
  },

  // --- MEDIA LIBRARY ---
  getMedia: (category?: string) => {
    if (category && category !== 'all') {
      return mediaItems.filter((m) => m.category === category);
    }
    return mediaItems;
  },
  addMediaItem: (item: Omit<MediaItem, 'id' | 'createdAt'>) => {
    const newItem: MediaItem = {
      id: `med_${Date.now()}`,
      ...item,
      createdAt: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };
    mediaItems.unshift(newItem);
    cmsEngine.triggerEvent('media:uploaded', { mediaId: newItem.id });
    return newItem;
  },
  deleteMediaItem: (id: string) => {
    mediaItems = mediaItems.filter((m) => m.id !== id);
    cmsEngine.triggerEvent('media:deleted', { mediaId: id });
    return { success: true };
  },

  // --- SMS GATEWAY ---
  getSmsConfig: () => smsConfig,
  updateSmsConfig: (newConfig: Partial<SmsProviderConfig>) => {
    smsConfig = { ...smsConfig, ...newConfig };
    return smsConfig;
  },
  sendTestSms: (mobile: string, messageText: string) => {
    const newLog: SmsLog = {
      id: `sms_${Date.now()}`,
      recipient: mobile,
      message: messageText || 'پیامک تستی از پرتال خطی‌نو',
      provider: smsConfig.provider,
      status: 'delivered',
      sentAt: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      costRials: 1850,
    };
    smsLogs.unshift(newLog);
    return { success: true, log: newLog, message: 'پیامک تستی با موفقیت ارسال و در لاگ ثبت شد.' };
  },
  getSmsLogs: () => smsLogs,

  // --- PAYMENT GATEWAYS ---
  getGateways: () => paymentGateways,
  updateGateway: (code: string, config: Partial<PaymentGatewayConfig>) => {
    const gw = paymentGateways.find((g) => g.code === code);
    if (!gw) throw new Error('درگاه پرداخت یافت نشد.');
    Object.assign(gw, config);
    return gw;
  },

  // --- COUPONS ---
  getCoupons: () => coupons,
  createCoupon: (couponData: Omit<Coupon, 'id' | 'usedCount'>) => {
    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}`,
      ...couponData,
      usedCount: 0,
    };
    coupons.unshift(newCoupon);
    return newCoupon;
  },
  deleteCoupon: (id: string) => {
    coupons = coupons.filter((c) => c.id !== id);
    return { success: true };
  },
  validateCoupon: (code: string, cartAmount: number) => {
    const cpn = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.isActive);
    if (!cpn) {
      throw new Error('کد تخفیف وارد شده معتبر نیست یا منقضی شده است.');
    }
    if (cartAmount < cpn.minCartAmount) {
      throw new Error(`حداقل مبلغ خرید برای اعمال این کوپن ${cpn.minCartAmount.toLocaleString('fa-IR')} تومان است.`);
    }
    if (cpn.usedCount >= cpn.maxUsages) {
      throw new Error('ظرفیت استفاده از این کد تخفیف به پایان رسیده است.');
    }

    let discount = 0;
    if (cpn.type === 'percentage') {
      discount = Math.round((cartAmount * cpn.value) / 100);
      if (cpn.maxDiscountAmount && discount > cpn.maxDiscountAmount) {
        discount = cpn.maxDiscountAmount;
      }
    } else {
      discount = cpn.value;
    }

    return {
      isValid: true,
      coupon: cpn,
      discountAmount: discount,
      message: `کد تخفیف ${cpn.code} به مبلغ ${discount.toLocaleString('fa-IR')} تومان اعمال گردید.`,
    };
  },

  // --- REVIEWS ---
  getReviews: (productId?: string) => {
    if (productId) {
      return productReviews.filter((r) => r.productId === productId && r.status === 'approved');
    }
    return productReviews;
  },
  approveReview: (id: string) => {
    const rev = productReviews.find((r) => r.id === id);
    if (!rev) throw new Error('دیدگاه یافت نشد.');
    rev.status = 'approved';
    return rev;
  },
  rejectReview: (id: string) => {
    const rev = productReviews.find((r) => r.id === id);
    if (!rev) throw new Error('دیدگاه یافت نشد.');
    rev.status = 'rejected';
    return rev;
  },
  replyReview: (id: string, replyText: string) => {
    const rev = productReviews.find((r) => r.id === id);
    if (!rev) throw new Error('دیدگاه یافت نشد.');
    rev.adminReply = replyText;
    return rev;
  },
  createReview: (data: { productId: string; productName: string; customerName: string; rating: number; comment: string }) => {
    const newRev: ProductReview = {
      id: `rev_${Date.now()}`,
      productId: data.productId,
      productName: data.productName,
      customerName: data.customerName,
      rating: Math.max(1, Math.min(5, data.rating)),
      comment: data.comment,
      status: 'pending', // نیاز به تایید ادمین
      createdAt: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };
    productReviews.unshift(newRev);
    cmsEngine.triggerEvent('review:submitted', { reviewId: newRev.id, productName: data.productName });
    return newRev;
  },

  // --- AUDIT LOGS ---
  getAuditLogs: () => auditLogs,
  logAudit: (item: Omit<AdminAuditLog, 'id' | 'timestamp'>) => {
    const log: AdminAuditLog = {
      id: `log_${Date.now()}`,
      ...item,
      timestamp: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };
    auditLogs.unshift(log);
    return log;
  },
};
