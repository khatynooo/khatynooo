// ==============================================================================
// انواع داده‌ها و مدل‌های ماژول رصد چندمنبعی قیمت و هوش بازار خطی‌نو
// Market Intelligence & Multi-Source Price Monitoring Types
// ==============================================================================

import { TorobProductInfo, TorobSellerInfo } from '../../src/types';

export interface PriceHistoryPoint {
  date: string;
  dayLabel: string;
  torobMinPrice: number;
  digikalaPrice: number;
  marketAvgPrice: number;
  khatinooPrice: number;
  isEstimated?: boolean; // آیا این نقطه تاریخی تخمینی/محاسباتی است یا ثبت واقعی
  source?: string;
}

export interface PriceHistoryMetadata {
  isFullyReal: boolean;
  realPointsCount: number;
  totalPointsCount: number;
  firstRecordedDate?: string;
  lastRecordedDate?: string;
  estimationNotice?: string;
}

export interface MarketItemResult {
  productTitle: string;
  category: string;
  brand: string;
  unit: string;
  image: string;
  gallery?: string[];
  extraImages?: string[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  torobPrice?: number;
  digikalaPrice?: number;
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
  torobUrl?: string;
  digikalaUrl?: string;
  emallsUrl?: string;
  timetahrireUrl?: string;
  sources: {
    torob: { count: number; minPrice: number; topSeller?: string; url?: string };
    digikala: { available: boolean; price?: number; seller?: string; rating?: number; url?: string; image?: string };
    specialized: { count: number; avgPrice: number; stores: string[] };
  };
  sellers: TorobSellerInfo[];
  priceHistory?: PriceHistoryPoint[];
  priceHistoryMeta?: PriceHistoryMetadata;
  bundleSuggestion?: string;
  priceElasticity?: 'high' | 'medium' | 'low';
  demandSeason?: string;
  aiRecommendation: {
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
    suggestedShop1Price: number; // فروشگاه حضوری
    suggestedShop2Price: number; // آنلاین/ترب (رتبه ۱)
    suggestedShop3Price: number; // عمده‌فروشی و مدارس
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

export interface ProductMatchResult<T = any> {
  item: T;
  score: number; // 0.0 to 1.0
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
}

export interface ApiClientConfig {
  timeoutMs?: number;
  maxRetries?: number;
  cacheTtlMs?: number;
  proxyUrl?: string;
}
