/**
 * سیستم انتشار چندکاناله خطی‌نو (Khatynoo Multi-Channel Publication System V2)
 * تعاریف نوع‌ها و قراردادهای مشترک (Types & Interfaces)
 */

export type PublicationProvider =
  | 'eitaa'
  | 'bale'
  | 'telegram'
  | 'instagram'
  | 'website';

export type PublicationEvent =
  | 'product_created'
  | 'product_updated'
  | 'price_changed'
  | 'stock_restocked'
  | 'manual';

export type PublicationStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled'
  | 'not_configured';

export interface PublicationProduct {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  boxBarcode?: string;
  categoryId?: string;
  categoryName?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  description?: string;
  salePrice?: number;
  buyPrice?: number;
  stock?: number;
  unit?: string;
  image?: string;
  gallery?: string[];
  productUrl?: string;
  showOnWebsite?: boolean;
}

export interface PublicationRequest {
  productId: string;
  providers: PublicationProvider[];
  event: PublicationEvent;
  customText?: string;
  sendImage?: boolean;
  generateHashtags?: boolean;
}

export interface PublicationResult {
  provider: PublicationProvider;
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  externalUrl?: string;
}

export interface PublicationChannelConfig {
  token?: string;
  channelId?: string;
  baseUrl?: string;
  businessAccountId?: string; // For Instagram Professional
  accessToken?: string; // For Meta Graph API
  autoPublish?: boolean;
  sendImage?: boolean;
  generateHashtags?: boolean;
  customTemplate?: string;
  [key: string]: any;
}

export interface PublicationChannel {
  id: string;
  provider: PublicationProvider;
  name: string;
  enabled: boolean;
  config: PublicationChannelConfig;
  createdAt: string;
  updatedAt: string;
  // فیلدهای ایمن‌شده برای فرانت‌اند (عدم ارسال توکن و سکرت)
  tokenConfigured?: boolean;
  tokenMasked?: string;
}

export interface ProductPublicationRecord {
  id: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productImage?: string;
  channelId?: string;
  channelName?: string;
  provider: PublicationProvider;
  eventType: PublicationEvent;
  status: PublicationStatus;
  idempotencyKey?: string;
  messageId?: string;
  externalUrl?: string;
  payload: {
    text?: string;
    imageUrl?: string;
    hashtags?: string[];
    customText?: string;
    productSnapshot?: Partial<PublicationProduct>;
  };
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  processingStartedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationSettings {
  id: string;
  publishOnCreate: boolean;
  publishOnUpdate: boolean;
  publishOnPriceChange: boolean;
  publishOnRestock: boolean;
  sendImageByDefault: boolean;
  generateHashtagsByDefault: boolean;
  defaultTemplate: string;
  updatedAt: string;
}

export interface PublicationProviderAdapter {
  readonly provider: PublicationProvider;

  sendProduct(params: {
    product: PublicationProduct;
    event: PublicationEvent;
    text: string;
    imageUrl?: string;
  }): Promise<PublicationResult>;

  testConnection(): Promise<{
    success: boolean;
    message: string;
  }>;
}
