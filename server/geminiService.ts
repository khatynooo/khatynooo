// ==============================================================================
// ماژول هوش مصنوعی تحلیلی و مشاور جامع خطی‌نو بر پایه Google Gemini
// Khatinoo Advanced Business, Accounting & Stationery AI Engine (@google/genai)
// ==============================================================================

import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { db } from './db';
import { auditAllInventoryAgainstMarket } from './market/marketAggregator';

let aiClient: GoogleGenAI | null = null;

/**
 * دریافت یا ایجاد نمونه کلاینت رسمی GoogleGenAI
 */
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error: any = new Error(
      'کلید دسترسی Gemini API (متغیر GEMINI_API_KEY) در سرور تنظیم نشده است. لطفاً برای فعال‌سازی، کلید معتبر خود را در تنظیمات پروژه یا فایل .env قرار دهید.'
    );
    error.code = 'GEMINI_KEY_MISSING';
    error.status = 503;
    throw error;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * نام مدل پیش‌فرض مدرن و رسمی طبق مستندات Google GenAI
 */
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface AssistantResponse {
  reply: string;
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
  groundingEnabled?: boolean;
}

export interface GroundedSearchResult {
  query: string;
  summary: string;
  analysis: string;
  sources: GroundingSource[];
  groundingSources: GroundingSource[];
  searchQueries: string[];
  isFallback: boolean;
}

export interface AiConfigStatus {
  configured: boolean;
  model: string;
  searchGroundingAvailable: boolean;
  tools: string[];
}

/**
 * وضعیت پیکربندی و در دسترس بودن هوش مصنوعی سرور
 */
export function getAiConfigStatus(): AiConfigStatus {
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = Boolean(apiKey && apiKey.trim().length > 5);
  return {
    configured,
    model: DEFAULT_GEMINI_MODEL,
    searchGroundingAvailable: true,
    tools: [
      'getFinancialSummary',
      'getInventoryAlerts',
      'getTopSellingProducts',
      'getProductionCostingAndBOM',
      'checkInventoryMarketPrices',
    ],
  };
}

// -----------------------------------------------------------------------------
// ابزارهای واقعی (Tools / Function Calling) متصل به پایگاه‌داده حسابداری و انبار
// -----------------------------------------------------------------------------

const getFinancialSummaryDeclaration: FunctionDeclaration = {
  name: 'getFinancialSummary',
  description:
    'دریافت اطلاعات و آمار زنده مالی از دیتابیس خطی‌نو شامل: فروش امروز، سود تخمینی، گردش نقدینگی، مانده بدهی مشتریان و فروش ۷ روز اخیر',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

async function executeGetFinancialSummary() {
  try {
    const [dashboardStats, treasurySummary] = await Promise.all([
      db.getDashboardStats().catch(() => null),
      db.getTreasurySummary().catch(() => null),
    ]);

    return {
      salesTodayToman: dashboardStats?.salesToday || 0,
      invoicesTodayCount: dashboardStats?.invoiceCountToday || 0,
      estimatedProfitTodayToman: dashboardStats?.estimatedProfitToday || 0,
      totalCustomerDebtToman: dashboardStats?.totalCustomerDebt || 0,
      totalCashInTreasuryToman: treasurySummary?.totalCash || 0,
      recentDailySales: (dashboardStats?.dailySales || []).slice(-7),
    };
  } catch (err: any) {
    return { error: 'امکان واکشی آمار مالی از دیتابیس میسر نشد: ' + err.message };
  }
}

const getInventoryAlertsDeclaration: FunctionDeclaration = {
  name: 'getInventoryAlerts',
  description:
    'دریافت لیست کالاهای دارای کسری موجودی یا در مرز هشدار انبار (نقطه سفارش مجدد) جهت برنامه‌ریزی تامین موجودی',
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: 'تعداد کالاهای بحرانی جهت نمایش (پیش‌فرض ۱۰)',
      },
    },
  },
};

async function executeGetInventoryAlerts(args?: { limit?: number }) {
  try {
    const products = await db.getProducts();
    const maxItems = Math.min(Math.max(Number(args?.limit) || 10, 1), 25);
    const criticalItems = products
      .filter((p) => Number(p.stock) <= Number(p.minStockAlert || 5))
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .slice(0, maxItems)
      .map((p) => ({
        name: p.name,
        code: p.code,
        currentStock: p.stock,
        minAlert: p.minStockAlert,
        unit: p.unit,
        buyPrice: p.buyPrice,
        salePrice: p.salePrice,
      }));

    return {
      totalProductsCount: products.length,
      lowStockTotalCount: products.filter((p) => Number(p.stock) <= Number(p.minStockAlert || 5)).length,
      criticalItems,
    };
  } catch (err: any) {
    return { error: 'امکان دریافت وضعیت انبار از دیتابیس وجود ندارد: ' + err.message };
  }
}

const getTopSellingProductsDeclaration: FunctionDeclaration = {
  name: 'getTopSellingProducts',
  description: 'دریافت پرفروش‌ترین کالاهای فروشگاه خطی‌نو بر اساس گردش مالی و تعداد فاکتورهای فروش',
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: 'تعداد کالاهای پرفروش (پیش‌فرض ۵)',
      },
    },
  },
};

async function executeGetTopSellingProducts(args?: { limit?: number }) {
  try {
    const stats = await db.getDashboardStats();
    const limit = Math.min(Math.max(Number(args?.limit) || 5, 1), 10);
    return {
      topSelling: (stats?.topProducts || []).slice(0, limit),
    };
  } catch (err: any) {
    return { error: 'امکان واکشی کالاهای پرفروش وجود ندارد: ' + err.message };
  }
}

const getProductionCostingDeclaration: FunctionDeclaration = {
  name: 'getProductionCostingAndBOM',
  description: 'دریافت فرمولاسیون‌های فعال کارگاهی (BOM) برای تولید دفاتر، یادداشت‌ها و بهای تمام‌شده مستقیم مواد و دستمزد',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

async function executeGetProductionCostingAndBOM() {
  try {
    const formulas = await db.getProductionFormulas();
    return {
      totalFormulasCount: formulas.length,
      formulas: formulas.slice(0, 10).map((f) => ({
        title: f.title,
        outputProductName: f.outputProductName,
        materialsCount: f.materials?.length || 0,
        estimatedTotalCostToman: f.materials?.reduce(
          (sum: number, m: any) => sum + (Number(m.unitCost) || 0) * (Number(m.quantity) || 1),
          0
        ) || 0,
      })),
    };
  } catch (err: any) {
    return { error: 'خطا در واکشی فرمول‌های تولید کارگاه: ' + err.message };
  }
}

const checkInventoryMarketPricesDeclaration: FunctionDeclaration = {
  name: 'checkInventoryMarketPrices',
  description:
    'بررسی زنده و تطبیق قیمت‌های موجودی انبار فروشگاه با کف قیمت بازار آزاد (ترب، دیجی‌کالا، تحریر۲۰) و ارائه تحلیل کالاهای گران‌تر یا ارزان‌تر از بازار',
  parameters: {
    type: Type.OBJECT,
    properties: {
      categoryFilter: {
        type: Type.STRING,
        description: 'نام یا فیلتر دسته‌بندی خاص برای بررسی، مثلا: "دفتر"، "خودکار"، "کاغذ" یا خالی برای کل انبار',
      },
      limit: {
        type: Type.NUMBER,
        description: 'تعداد کالاهای مورد استعلام و بررسی (پیش‌فرض ۸)',
      },
    },
  },
};

async function executeCheckInventoryMarketPrices(args?: { categoryFilter?: string; limit?: number }) {
  const allProds = await db.getProducts();
  let targetProds = allProds;
  if (args?.categoryFilter?.trim()) {
    const filter = args.categoryFilter.trim().toLowerCase();
    targetProds = allProds.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(filter)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(filter))
    );
  }
  const maxItems = Math.min(Math.max(Number(args?.limit) || 8, 1), 15);
  const toAudit = targetProds.slice(0, maxItems);
  const auditResult = await auditAllInventoryAgainstMarket(toAudit);

  return {
    totalAudited: auditResult.totalAudited,
    overpricedCount: auditResult.overpricedCount,
    underpricedCount: auditResult.underpricedCount,
    competitiveCount: auditResult.competitiveCount,
    potentialProfitIncreaseToman: auditResult.potentialProfitIncrease,
    items: auditResult.items.map((i) => ({
      productName: i.productName,
      stock: i.stock,
      buyPrice: i.buyPrice,
      currentPrice: i.currentPrice,
      marketFloorPrice: i.torobFloorPrice,
      digikalaPrice: i.digikalaPrice,
      statusLabel: i.statusLabel,
      suggestedPrice: i.suggestedShop2Price,
      potentialGain: i.potentialGain,
    })),
  };
}

/**
 * مدیریت یکپارچه خطاهای Google Gemini و تبدیل به پیام‌های صریح فارسی
 */
function handleGeminiError(error: any): never {
  const errMsg = String(error?.message || error || '');
  const status = error?.status || error?.statusCode;

  console.error('[Gemini Service Error]:', errMsg, error);

  if (errMsg.includes('API_KEY_INVALID') || status === 401 || status === 403) {
    const err: any = new Error(
      'کلید API وارد شده برای Google Gemini معتبر نیست یا مجوز دسترسی ندارد. لطفاً کلید صحیح را بررسی کنید.'
    );
    err.code = 'GEMINI_AUTH_FAILED';
    err.status = 401;
    throw err;
  }

  if (errMsg.includes('RESOURCE_EXHAUSTED') || status === 429 || errMsg.includes('quota') || errMsg.includes('Quota')) {
    const err: any = new Error(
      'سقف مصرف یا نرخ درخواست مجاز به Google Gemini API تکمیل شده است (Rate Limit / Quota Exceeded). لطفاً چند لحظه بعد مجدداً تلاش نمایید.'
    );
    err.code = 'GEMINI_QUOTA_EXCEEDED';
    err.status = 429;
    throw err;
  }

  if (errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED')) {
    const err: any = new Error(
      'ارتباط سرور با سرویس‌های هوش مصنوعی Google برقرار نشد. لطفاً وضعیت اینترنت سرور یا DNS را بررسی نمایید.'
    );
    err.code = 'GEMINI_NETWORK_ERROR';
    err.status = 502;
    throw err;
  }

  const err: any = new Error(`خطای پردازش هوش مصنوعی Gemini: ${errMsg}`);
  err.code = 'GEMINI_INTERNAL_ERROR';
  err.status = status || 500;
  throw err;
}

/**
 * گفتگو و تحلیل هوشمند با دستیار رسمی Gemini
 */
export async function askGeminiAssistant(
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  storeContext?: string,
  enableSearchGrounding: boolean = true
): Promise<AssistantResponse> {
  const ai = getAiClient();

  const systemPrompt = `شما دستیار هوشمند، تحلیلگر ارشد مالی و مشاور استراتژیک سیستم یکپارچه لوازم‌تحریر، چاپ و حسابداری «خطی‌نو» (Khatinoo) هستید.
پلتفرم خطی‌نو شامل:
- فروشگاه آنلاین و حضوری لوازم‌تحریر
- کارگاه تولید دفاتر سیمی و صحافی
- خدمات چاپ، فتوکپی و خدمات دانشجویی
- سیستم حسابداری، انبارداری و اتصال به پوز و درگاه‌های شاپرک
- موتور رصد زنده قیمت‌ها در ترب و دیجی‌کالا

شما دارای ابزارهای تخصصی واقعی (Function Calling) هستید:
۱. getFinancialSummary: واکشی آمار دقیق فروش امروز، سود، گردش نقدینگی و بدهی مشتریان از دیتابیس
۲. getInventoryAlerts: بررسی کالاهای دارای کسری و مرز هشدار انبار
۳. getTopSellingProducts: دریافت پرفروش‌ترین‌های فروشگاه
۴. getProductionCostingAndBOM: استعلام فرمولاسیون بهای تمام‌شده تولید دفاتر کارگاه
۵. checkInventoryMarketPrices: تطبیق قیمت‌های انبار با کف بازار (ترب/دیجی‌کالا)

دستورالعمل‌ها:
- پاسخ‌ها باید به زبان فارسی رسمی، روان، کاملاً ساختاریافته با مارک‌داون (تیترها، جداول، بولت‌ها) باشد.
- تمام مبالغ پولی را دقیق و به تومان ذکر کنید.
- هرگز داده‌های مالی یا ارقام را جعل نکنید؛ اگر نیاز به آمار دیتابیس است از ابزار مربوطه استفاده کنید.
- زمینه و اطلاعات محیطی سیستم: ${storeContext || 'فروشگاه و کارگاه تخصصی خطی‌نو'}`;

  const formattedContents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  try {
    // تنظیم ابزارها: اگر جستجوی زنده گوگل مد نظر باشد از googleSearch استفاده می‌شود، در غیر این صورت از توابع پایگاه‌داده
    const toolsConfig = enableSearchGrounding
      ? [{ googleSearch: {} }]
      : [
          {
            functionDeclarations: [
              getFinancialSummaryDeclaration,
              getInventoryAlertsDeclaration,
              getTopSellingProductsDeclaration,
              getProductionCostingDeclaration,
              checkInventoryMarketPricesDeclaration,
            ],
          },
        ];

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
        tools: toolsConfig as any,
      },
    });

    // بررسی آیا مدل تابعی را برای دریافت دیتای واقعی فراخوانی کرده است
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const toolFollowupParts: any[] = [];

      for (const call of functionCalls) {
        let resultData: any = null;
        if (call.name === 'getFinancialSummary') {
          resultData = await executeGetFinancialSummary();
        } else if (call.name === 'getInventoryAlerts') {
          resultData = await executeGetInventoryAlerts(call.args as any);
        } else if (call.name === 'getTopSellingProducts') {
          resultData = await executeGetTopSellingProducts(call.args as any);
        } else if (call.name === 'getProductionCostingAndBOM') {
          resultData = await executeGetProductionCostingAndBOM();
        } else if (call.name === 'checkInventoryMarketPrices') {
          resultData = await executeCheckInventoryMarketPrices(call.args as any);
        }

        toolFollowupParts.push({
          functionResponse: {
            name: call.name,
            response: resultData || { status: 'success' },
          },
        });
      }

      // ارسال پاسخ توابع به مدل برای جمع‌بندی و نگارش پاسخ تحلیلی نهایی
      const followupResponse = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: [
          ...formattedContents,
          response.candidates?.[0]?.content as any,
          {
            role: 'user',
            parts: toolFollowupParts,
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });

      return {
        reply: followupResponse.text || 'پاسخ تحلیلی آماده گردید.',
        groundingEnabled: false,
      };
    }

    // استخراج متادیتای جستجوی گوگل (Grounding Sources) در صورت وجود
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const searchQueries = groundingMetadata?.webSearchQueries || [];

    const groundingSources: GroundingSource[] = [];
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web && chunk.web.uri) {
          groundingSources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
          });
        }
      }
    }

    const replyText = response.text || '';
    if (!replyText.trim()) {
      throw new Error('پاسخی از مدل هوش مصنوعی دریافت نشد.');
    }

    return {
      reply: replyText,
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      groundingEnabled: enableSearchGrounding && groundingSources.length > 0,
    };
  } catch (error: any) {
    handleGeminiError(error);
  }
}

/**
 * جستجوی زنده در وب با Google Search Grounding برای رصد کالاها و اخبار بازار
 */
export async function groundedWebMarketSearch(queryText: string): Promise<GroundedSearchResult> {
  const q = (queryText || '').trim();
  if (!q) {
    const err: any = new Error('متن جستجو برای هوش بازار نباید خالی باشد.');
    err.status = 400;
    throw err;
  }

  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: `با جستجوی زنده در وب (Google Search)، قیمت روز، برندهای برتر و وضعیت عرضه کالای زیر را در بازار ایران (سایت‌های ترب، دیجی‌کالا، ایمالز، باسلام و بنکداران بازار تهران) بررسی و مستند کن:
«${q}»
پاسخ شما باید شامل:
۱. کمترین و بیشترین قیمت بازار
۲. میانگین قیمت مصرف‌کننده
۳. برندهای برتر بازار
۴. پیشنهاد استراتژی قیمت‌گذاری برای فروشگاه حضوری و آنلاین خطی‌نو باشد.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
    });

    const text = response.text || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const searchQueries = groundingMetadata?.webSearchQueries || [];

    const sources: GroundingSource[] = [];
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web && chunk.web.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
          });
        }
      }
    }

    return {
      query: q,
      summary: text,
      analysis: text,
      sources,
      groundingSources: sources,
      searchQueries: searchQueries.length > 0 ? searchQueries : [q],
      isFallback: false,
    };
  } catch (error: any) {
    handleGeminiError(error);
  }
}

/**
 * تحلیل و تعیین قیمت ۵ سطحی کالا بر اساس داده‌های خرید و بازار با Gemini
 */
export async function analyzeProductMarketAndPricing(
  productName: string,
  buyPrice: number,
  category: string,
  torobMinPrice?: number,
  torobAvgPrice?: number
): Promise<{
  suggestedRetailPrice: number;
  suggestedOnlinePrice: number;
  suggestedWholesalePrice: number;
  marginAnalysis: string;
  competitiveStrategy: string;
}> {
  const baseBuy = Number(buyPrice) || 50000;
  const minMarket = Number(torobMinPrice) || Math.round(baseBuy * 1.25);
  const avgMarket = Number(torobAvgPrice) || Math.round(baseBuy * 1.38);

  const ai = getAiClient();

  const prompt = `شما مشاور مالی و استراتژی قیمت‌گذاری خطی‌نو هستید.
کالای نوشت‌افزار: ${productName}
دسته‌بندی: ${category}
بهای تمام‌شده خرید انبار: ${baseBuy} تومان
کمترین قیمت رقبا در ترب و بازار: ${minMarket} تومان
میانگین قیمت بازار: ${avgMarket} تومان

یک JSON معتبر و بدون هیچ متن اضافه‌ای با ساختار زیر تولید کن:
{
  "suggestedRetailPrice": عدد صحیح به تومان برای فروشگاه حضوری,
  "suggestedOnlinePrice": عدد صحیح به تومان رقابتی برای ترب و آنلاین,
  "suggestedWholesalePrice": عدد صحیح به تومان برای فروش عمده به مدارس و همکاران,
  "marginAnalysis": "متن فارسی تحلیل درصد سود ناخالص هر سطح",
  "competitiveStrategy": "متن فارسی استراتژی قیمت‌گذاری و پیروزی در رتبه ۱ ترب"
}`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      suggestedRetailPrice: Number(parsed.suggestedRetailPrice) || Math.round(baseBuy * 1.35),
      suggestedOnlinePrice: Number(parsed.suggestedOnlinePrice) || Math.round(minMarket * 0.98),
      suggestedWholesalePrice: Number(parsed.suggestedWholesalePrice) || Math.round(baseBuy * 1.1),
      marginAnalysis: parsed.marginAnalysis || `حاشیه سود آنلاین: ${Math.round(((minMarket * 0.98 - baseBuy) / baseBuy) * 100)}٪`,
      competitiveStrategy: parsed.competitiveStrategy || 'تنظیم قیمت رقابتی در ترب با ۲٪ پایین‌تر از رقبا جهت صدرنشینی.',
    };
  } catch (error: any) {
    handleGeminiError(error);
  }
}
