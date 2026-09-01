export type UserRole =
  | 'admin' // مدیر کل
  | 'site_manager' // مدیر سایت
  | 'seller' // فروشنده
  | 'accountant' // حسابدار
  | 'chief_accountant'; // مدیر حسابداری

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

export type StaffUser = User;

export type BaseUnitType =
  | 'عدد'
  | 'بسته'
  | 'جلد'
  | 'کارتن'
  | 'حلقه'
  | 'دست'
  | 'جفت'
  | 'توپ'
  | 'متر'
  | 'کیلوگرم'
  | 'گرم'
  | 'لیتر'
  | 'جین';

export interface UnitDefinition {
  id: string;
  name: string; // e.g. کارتن
  subUnit: string; // e.g. عدد
  conversionFactor: number; // e.g. 24
  description?: string;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  productCount?: number;
  subcategories: SubCategory[];
}

export type PriceTier = 'manual' | 'shop1' | 'shop2' | 'shop3' | 'wholesale';

export interface ProductVariant {
  id: string;
  name: string; // e.g. رنگ آبی / ۱۰۰ برگ
  sku: string;
  priceDelta: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  subCategoryId?: string;
  subCategoryName?: string;
  unit: string;
  subUnit?: string;
  conversionFactor?: number;
  buyPrice: number; // بهای تمام‌شده
  salePrice: number; // قیمت فروش اصلی / دستی
  priceShop1: number; // قیمت فروشگاه اول (حضوری / نقدی)
  priceShop2: number; // قیمت فروشگاه دوم (آنلاین / ترب)
  priceShop3: number; // قیمت فروشگاه سوم (همکار / شعبه ۲)
  wholesalePrice: number; // قیمت عمده‌فروشی
  minAllowedPrice: number;
  stock: number;
  minStockAlert: number;
  description?: string;
  image?: string;
  gallery?: string[];
  isSpecialOffer?: boolean;
  featured?: boolean;
  isPublished?: boolean;
  showOnWebsite?: boolean;
  onlyAccounting?: boolean;
  isService?: boolean;
  extraImages?: string[];
  variants?: ProductVariant[];
  avgRating?: number;
  reviewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  mobile: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  province?: string;
  city?: string;
  fullAddress?: string;
  email?: string;
  nationalCode?: string;
  creditLimit?: number;
  notes?: string;
  profileCompleted?: boolean;
  totalPurchaseAmount?: number;
  balance: number; // مثبت = بستانکار، منفی = بدهکار
  ordersCount?: number;
  totalSpent?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  isSimulated?: boolean;
  simulatedCode?: string;
  debugCode?: string;
}

export interface CustomerAuthResponse {
  success: boolean;
  token: string;
  customer: Customer;
  profileCompleted: boolean;
  message: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  mobile: string;
  phone?: string;
  address?: string;
  bankAccount?: string;
  shaba?: string;
  debtToSupplier: number; // بدهی فروشگاه به تامین‌کننده
  balance?: number; // تراز حساب (منفی = بدهکاریم)
  createdAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: 'purchase_credit' | 'payment_made' | 'manual_adjustment';
  amount: number;
  paymentMethod?: string;
  invoiceId?: string;
  description?: string;
  createdAt: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  customerName?: string;
  type: 'credit_sale' | 'payment_received' | 'manual_adjustment';
  amount: number;
  invoiceId?: string;
  description?: string;
  date: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  subCategoryName?: string;
  barcode: string;
  unit: string;
  quantity: number;
  buyPrice: number;
  unitPrice: number;
  priceTier: PriceTier;
  discount: number;
  total: number;
}

export type PaymentMethod =
  | 'cash' // نقدی
  | 'pos_pasargad' // کارتخوان پاسارگاد
  | 'credit' // نسیه
  | 'installment' // قسطی
  | 'sms_link'; // لینک پیامکی

export interface ChequeInfo {
  chequeNumber: string;
  bankName: string;
  dueDate: string;
  sayadId?: string;
  amount?: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerMobile?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  remainingAmount: number;
  cashAmount?: number;
  chequeAmount?: number;
  chequeInfo?: ChequeInfo;
  status: 'paid' | 'partial' | 'pending' | 'cancelled';
  posRefNumber?: string;
  posRrn?: string;
  smsPaymentStatus?: 'not_sent' | 'sent' | 'paid';
  notes?: string;
  warehouseId?: string;
  warehouseName?: string;
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit' | 'installment';
  chequeInfo?: ChequeInfo;
  notes?: string;
  warehouseId?: string;
  warehouseName?: string;
  createdAt: string;
}

export type ReturnReason = 'defective' | 'unwanted';
export type ReturnRefundMethod = 'cash' | 'customer_credit' | 'bank_transfer' | 'none';

export interface ReturnInvoiceItem {
  productId: string;
  productName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reasonCategory: ReturnReason; // 'defective' (معیوب / خرابی) | 'unwanted' (انصراف / نخواستن)
  reasonNote?: string;
  targetWarehouseId?: string;
}

export interface ReturnInvoice {
  id: string;
  returnNumber: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  customerId?: string;
  customerName: string;
  customerMobile?: string;
  type: 'sales_return' | 'purchase_return';
  reasonCategory: ReturnReason;
  reasonNote?: string;
  items: ReturnInvoiceItem[];
  totalRefundAmount: number;
  refundMethod: ReturnRefundMethod;
  warehouseId: string;
  status: 'completed' | 'pending' | 'rejected';
  createdByUserId?: string;
  createdByUserName?: string;
  createdAt: string;
}

export interface Cheque {
  id: string;
  chequeNumber: string;
  sayadId: string;
  type: 'received' | 'paid';
  bankName: string;
  branchCode?: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  drawerName: string;
  contactNumber: string;
  entityId?: string;
  entityName?: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  notes?: string;
}

export interface OnlineOrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  image?: string;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  items: OnlineOrderItem[];
  subtotal: number;
  shippingCost: number;
  shippingMethod: string;
  discountAmount: number;
  couponCode?: string;
  finalAmount: number;
  paymentGateway: 'zarinpal' | 'idpay' | 'nextpay' | 'behpardakht' | 'zibal' | 'card_to_card' | 'cod';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  orderStatus: 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingCode?: string;
  transactionRef?: string;
  salesInvoiceId?: string;
  warehouseId?: string;
  warehouseName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  code: 'zarinpal' | 'idpay' | 'nextpay' | 'behpardakht' | 'zibal' | 'card_to_card' | 'cod';
  isActive: boolean;
  isEnabled?: boolean;
  merchantId?: string;
  apiKey?: string;
  terminalId?: string;
  sandbox: boolean;
  description?: string;
  icon?: string;
  feePercent?: number;
}

export interface WebsiteBanner {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  image: string;
  targetUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ShippingMethodConfig {
  id: string;
  name: string;
  code: 'courier' | 'post' | 'tipax' | 'in_person';
  cost: number;
  freeShippingThreshold: number;
  estimatedDays: string;
  isActive: boolean;
}

export interface HeaderMenuItem {
  id: string;
  title: string;
  url: string; // e.g. /category/cat_writing or #products or #calculator
  icon?: string;
  badge?: string; // e.g. تولید اختصاصی, جدید, تخفیف
  highlight?: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export interface CustomSymbol {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  code?: string;
  type: 'enamad' | 'samandehi' | 'ecunion' | 'shamad' | 'custom';
  isEnabled: boolean;
  sortOrder: number;
}

export interface CustomBadge {
  id: string;
  title: string;
  color: string; // hex or tailwind class
  textColor?: string;
  iconName?: string;
  isEnabled: boolean;
}

export type HeaderElementType = 'logo' | 'search' | 'theme_toggle' | 'auth' | 'calculator' | 'cart' | 'custom_button';

export interface HeaderElement {
  id: string;
  type: HeaderElementType;
  title: string;
  enabled: boolean;
  order: number;
  icon?: string;
  customText?: string;
  customLink?: string;
  buttonStyle?: 'gold' | 'subtle' | 'outline' | 'ghost' | 'primary';
  showOnMobile?: boolean;
  alignment?: 'start' | 'center' | 'end';
}

export interface WebsiteSettings {
  siteTitle: string;
  siteSubtitle: string;
  noticeText: string;
  noticeBadgeText?: string;
  noticeLink?: string;
  showNotice: boolean;
  quickTrackingText?: string;
  showQuickTracking?: boolean;
  searchPlaceholder?: string;
  calculatorButtonText?: string;
  showCalculatorButton?: boolean;
  cartButtonText?: string;
  supportPhone: string;
  whatsapp: string;
  telegram: string;
  workingHours: string;
  instagram: string;
  enamadCode: string;
  enamadImageUrl?: string;
  samandehiCode: string;
  samandehiImageUrl?: string;
  defaultPriceTier: PriceTier;
  minOrderAmount: number;
  logoUrl?: string;
  logoHeight?: number; // Height in pixels (e.g., 24 to 240px)
  logoWidth?: number; // Width in pixels (optional or proportional)
  logoFit?: 'contain' | 'cover' | 'fill' | 'none';
  logoBorderRadius?: 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' | 'rounded-full';
  logoHasBorder?: boolean; // When false, removes border and ring framing
  showLogoText?: boolean;
  faviconUrl?: string;
  noticeLinkText?: string;
  noticeBannerStyle?: 'default' | 'gold_gradient' | 'emerald_deals' | 'indigo_promo' | 'rose_hot' | 'dark_luxury';
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  footerText?: string;
  twoFactorRequired?: boolean;
  headerMenuItems?: HeaderMenuItem[];
  headerElements?: HeaderElement[];
  // Visual Theme, Button & Display Customization
  buttonColorTheme?: 'gold' | 'amber' | 'emerald' | 'indigo' | 'rose' | 'slate' | 'custom';
  primaryColorHex?: string;
  buttonBorderRadius?: 'rounded-md' | 'rounded-xl' | 'rounded-2xl' | 'rounded-full';
  catalogLayoutMode?: 'grid' | 'list' | 'compact';
  showProductBadges?: boolean;
  customBadges?: CustomBadge[];
  customSymbols?: CustomSymbol[];
  headerLayoutStyle?: 'default' | 'centered' | 'minimal';
  footerLayoutStyle?: 'default' | 'compact' | 'detailed';
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  address: string;
  taxRate: number; // e.g. 10%
  barcodePrefix: string;
  autoPrintReceipt: boolean;
  defaultReceiptFormat: '80mm' | '58mm' | 'a4' | 'a5';
  soundEffectsEnabled: boolean;
  currencySymbol: string;
  priceTier1Name: string; // e.g. حضوری و نقدی
  priceTier2Name: string; // e.g. آنلاین و ترب
  priceTier3Name: string; // e.g. عمده و همکار
}

export interface PosConfig {
  terminalId: string;
  merchantId: string;
  ip: string;
  port: number;
  timeoutMs: number;
  autoSend: boolean;
  isEnabled: boolean;
  isSimulation: boolean;
  protocolType: 'pasargad_tcp';
}

export interface PosTransactionLog {
  id: string;
  timestamp: string;
  invoiceId?: string;
  amount: number;
  status: 'success' | 'failed' | 'cancelled' | 'timeout' | 'unknown_error';
  rawRequestHex: string;
  rawResponseHex: string;
  refNumber?: string;
  rrn?: string;
  terminalId?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs: number;
}

export type ServiceVisibility = 'only_accounting' | 'only_website' | 'both';

export interface ServicePreset {
  id: string;
  name: string;
  title?: string;
  category: 'copy_print' | 'internet' | 'type_scan' | 'binding' | 'other';
  serviceType?: string;
  unit: string;
  price: number;
  
  // چند قیمتی بودن: یک‌رو دو قیمت و دورو دو قیمت
  priceSingle1: number; // قیمت یک‌رو ۱ (عادی / تک‌فروشی)
  priceSingle2: number; // قیمت یک‌رو ۲ (همکار / تیراژ / مدارس)
  basePriceSingle?: number; // alias
  
  priceDouble1: number; // قیمت دورو ۱ (عادی / تک‌فروشی)
  priceDouble2: number; // قیمت دورو ۲ (همکار / تیراژ / مدارس)
  basePriceDouble?: number; // alias

  // هزینه‌های صحافی و خدمات تکمیلی
  bindingSpiralPrice?: number;
  bindingHardcoverPrice?: number;
  bindingCellophanePrice?: number;

  // قواعد تخفیف تیراژ
  volumeDiscountThreshold?: number;
  volumeDiscountPercent?: number;

  // وضعیت نمایش و کانال انتشار (فقط حسابداری، فقط سایت، هر دو)
  visibility?: ServiceVisibility;
  showInPos: boolean;
  showOnWebsite?: boolean;
  onlyAccounting?: boolean;

  description?: string;
  imageUrl?: string;
  extraImages?: string[];
}

export interface ServiceRecord {
  id: string;
  customerName: string;
  customerMobile: string;
  serviceName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  status: 'done' | 'pending' | 'cancelled';
  date: string;
}

export interface CopyPrintCalculation {
  paperSize: 'A4' | 'A3' | 'A5';
  colorType: 'bw' | 'color';
  printSide: 'single' | 'double';
  paperWeight: '80g' | '100g' | 'glossy' | 'card';
  pageCount: number;
  copyCount: number;
  bindingType: 'none' | 'spiral' | 'cellophane' | 'hardcover' | 'staple';
  unitPagePrice: number;
  bindingPrice: number;
  totalPages: number;
  finalAmount: number;
}

export interface ProductionMaterial {
  id: string;
  linkedProductId?: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface ProductionOverhead {
  id: string;
  name: string;
  amount: number;
}

export interface ProductionFormula {
  id: string;
  name: string;
  outputProductId?: string;
  outputProductName: string;
  outputCategory: string;
  outputUnit: string;
  baseOutputQuantity: number;
  materials: ProductionMaterial[];
  overheads: ProductionOverhead[];
  suggestedSalePrice: number;
  description?: string;
  createdAt: string;
}

export interface ProductionRun {
  id: string;
  runNumber: string;
  formulaId: string;
  formulaName: string;
  outputProductId: string;
  outputProductName: string;
  producedQuantity: number;
  outputUnit: string;
  totalMaterialCost: number;
  totalOverheadCost: number;
  totalCost: number;
  unitCost: number;
  consumedMaterials: Array<{
    materialName: string;
    linkedProductId?: string;
    quantity: number;
    unit: string;
    cost: number;
  }>;
  date: string;
  userId: string;
  userName: string;
  warehouseId?: string;
  warehouseName?: string;
  notes?: string;
}

export interface TorobSellerInfo {
  storeName: string;
  city: string;
  score: number;
  price: number;
  inStock: boolean;
  lastUpdated: string;
  updatedRecently: boolean;
  warranty: string;
  shopUrl: string;
}

export interface TorobProductInfo {
  torobCode: string;
  title: string;
  category: string;
  subCategory?: string;
  brand: string;
  unit: string;
  image: string;
  gallery?: string[];
  extraImages?: string[];
  torobUrl: string;
  specs: Record<string, string>;
  description?: string;
  sellers: TorobSellerInfo[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  suggestedBuyPrice: number;
  suggestedSalePrice: number;
  suggestedShop1Price: number;
  suggestedShop2Price: number;
  suggestedShop3Price: number;
  activeSellersCount: number;
  totalSellersCount: number;
  lastUpdated: string;
  isLiveScraped: boolean;
  isBenchmarkCatalog?: boolean;
  isGenericStockPhoto?: boolean;
  sourceLink: string;
  globalMarket?: {
    usdPrice: number;
    eurPrice: number;
    originCountry: string;
    eanBarcode: string;
    hsCode: string;
    exchangeRateUsd: number;
  };
  aiRecommendation?: {
    marginStrategy: string;
    competitiveEdge: string;
    targetAudience: string;
    inventoryAdvice: string;
  };
}

export interface TorobStationeryCategoryItem {
  id: string;
  torobCode: string;
  title: string;
  category: string;
  subCategory: string;
  brand: string;
  unit: string;
  image: string;
  gallery?: string[];
  extraImages?: string[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  torobPrice: number;
  digikalaPrice?: number;
  sellersCount: number;
  torobUrl: string;
  digikalaUrl?: string;
  emallsUrl?: string;
  timetahrireUrl?: string;
  specs: Record<string, string>;
  multiTierPricing: {
    suggestedBuyPrice: number;
    suggestedShop1Price: number;
    suggestedShop2Price: number;
    suggestedShop3Price: number;
    estimatedMarginPercent: number;
  };
  sellers: TorobSellerInfo[];
  inInventory?: boolean;
  inventoryProductId?: string;
  inventoryStock?: number;
  inventoryCurrentPrice?: number;
  matchScore?: number;
  isLiveScraped?: boolean;
  isBenchmarkCatalog?: boolean;
  isGenericStockPhoto?: boolean;
  lastUpdated?: string;
}

// =============================================================================
// CMS ARCHITECTURE & MODULAR SYSTEM TYPES (Core + Modules)
// =============================================================================

export type ModuleCategory = 'core' | 'commerce' | 'marketing' | 'system' | 'communication';

export interface CmsModule {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: ModuleCategory;
  isEnabled: boolean;
  isCore: boolean; // هسته اصلی قابل غیرفعال‌سازی نیست
  author: string;
  hooks: string[];
  lastUpdated: string;
}

export interface EventHook {
  name: string;
  description: string;
  registeredModules: string[];
}

export type PageBuilderBlockType =
  | 'header'
  | 'top_notice'
  | 'banner_slider'
  | 'category_grid'
  | 'featured_products'
  | 'special_offers'
  | 'features_badges'
  | 'services_cta'
  | 'custom_banner'
  | 'custom_text_html'
  | 'newsletter'
  | 'footer';

export interface BlockItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  imageUrl?: string;
  linkUrl?: string;
  badge?: string;
  highlight?: boolean;
}

export interface PageBuilderBlock {
  id: string;
  type: PageBuilderBlockType;
  title: string;
  isEnabled: boolean;
  sortOrder: number;
  settings: {
    layout?: 'grid' | 'carousel' | 'bento' | 'compact' | 'fullwidth';
    columns?: number;
    limitCount?: number;
    categoryId?: string;
    backgroundColor?: string;
    textColor?: string;
    headingText?: string;
    subheadingText?: string;
    buttonText?: string;
    buttonLink?: string;
    buttonPosition?: 'left' | 'center' | 'right' | 'hidden';
    buttonStyle?: 'gold' | 'amber' | 'dark' | 'outline';
    customHtml?: string;
    bannerImageUrl?: string;
    badgeText?: string;
    paddingY?: 'none' | 'small' | 'medium' | 'large';
    items?: BlockItem[];
  };
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  blocks: PageBuilderBlock[];
  isDefault: boolean;
}

export interface MediaItem {
  id: string;
  filename: string;
  title: string;
  url: string;
  fileType: string; // e.g. 'image/jpeg', 'image/webp'
  sizeBytes: number;
  dimensions?: string;
  altText: string;
  category: 'product' | 'banner' | 'logo' | 'document' | 'other';
  createdAt: string;
}

export interface SmsProviderConfig {
  provider: 'kavenegar' | 'melipayamak' | 'farazsms' | 'ghasedak';
  apiKey: string;
  senderNumber: string;
  isEnabled: boolean;
  patternOrderPlaced: string;
  patternOrderShipped: string;
  patternOtp: string;
  lowStockAlertMobile: string;
  isSimulated: boolean;
}

export interface SmsLog {
  id: string;
  recipient: string;
  message: string;
  provider: string;
  status: 'sent' | 'failed' | 'delivered' | 'pending';
  sentAt: string;
  costRials: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number; // e.g. 15 (%) or 50000 (Tomans)
  minCartAmount: number;
  maxDiscountAmount?: number;
  maxUsages: number;
  usedCount: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  description?: string;
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
  minOrderAmount?: number;
  maxUsageCount?: number;
  expiresAt?: string;
  isEnabled?: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerMobile?: string;
  rating: number; // 1 to 5
  comment: string;
  adminReply?: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
}

export interface DashboardStats {
  salesToday: number;
  invoiceCountToday: number;
  estimatedProfitToday: number;
  lowStockCount: number;
  totalCustomers: number;
  totalProducts: number;
  totalCustomerDebt: number;
  topProducts: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  latestInvoices: SalesInvoice[];
  dailySales: Array<{
    day: string;
    sales: number;
    profit: number;
    invoices: number;
  }>;
}

// Aliases for compatibility
export type Banner = WebsiteBanner;
export type ShippingMethod = ShippingMethodConfig;
export type ProductionOrder = ProductionRun;
export type CopyPrintService = ServicePreset;
export type ServiceOrder = ServiceRecord;
export type DiscountCoupon = Coupon;
export type SmsGatewayConfig = SmsProviderConfig & {
  orderCreatedPattern?: string;
  orderShippedPattern?: string;
  otpPattern?: string;
};

export interface TreasuryTransaction {
  id: string;
  transactionType: 'sale_income' | 'purchase_expense' | 'pos_settlement' | 'cheque_cleared' | 'cash_in' | 'cash_out';
  sourceModule: 'sales' | 'purchases' | 'pos' | 'cheques' | 'services';
  referenceId?: string;
  amount: number;
  paymentMethod: string;
  accountTitle: string;
  description?: string;
  balanceAfter?: number;
  createdAt: string;
}

export interface TreasurySummary {
  totalBalance: number;
  totalInflow: number;
  totalOutflow: number;
  cashBalance: number;
  posBalance: number;
  bankBalance: number;
  todayInflow: number;
  todayOutflow: number;
  transactionsCount: number;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: 'central_warehouse' | 'store' | 'online';
  address?: string;
  phone?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface InventoryByLocation {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  warehouseCode?: string;
  warehouseType?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  barcode?: string;
  unit?: string;
  buyPrice?: number;
  stock: number;
  minStockAlert: number;
  aisleShelf?: string;
  updatedAt: string;
}

export interface InventoryTransfer {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouseName?: string;
  toWarehouseId: string;
  toWarehouseName?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  unit?: string;
  quantity: number;
  transferredBy?: string;
  userName?: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  productName?: string;
  productCode?: string;
  warehouseId?: string;
  warehouseName?: string;
  userId?: string;
  userName?: string;
  previousStock: number;
  newStock: number;
  delta: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface SystemAuditLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  module: string;
  targetId?: string;
  details?: Record<string, any>;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  createdAt: string;
}


