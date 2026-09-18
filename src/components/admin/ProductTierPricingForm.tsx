import React, { useState } from 'react';
import {
  Store,
  Globe,
  Building2,
  Layers,
  ShieldAlert,
  Boxes,
  AlertTriangle,
  TrendingUp,
  Percent,
  Sparkles,
  Calculator,
  Check,
  RotateCcw,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { CurrencyInput } from '../common/CurrencyInput';

export interface ProductTierPricingData {
  buyPrice: number;
  salePrice: number;
  priceShop1: number;
  priceShop2: number;
  priceShop3: number;
  wholesalePrice: number;
  minAllowedPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string;
  packagingUnit?: string;
  packagingFactor?: number;
}

interface ProductTierPricingFormProps {
  data: ProductTierPricingData;
  onChange: (updated: Partial<ProductTierPricingData>) => void;
}

export const ProductTierPricingForm: React.FC<ProductTierPricingFormProps> = ({
  data,
  onChange,
}) => {
  const [roundingUnit, setRoundingUnit] = useState<number>(1000); // 1,000 تومان پیش‌فرض

  const unitLabel = data.unit && data.unit.trim() !== '' ? data.unit.trim() : 'عدد';
  const hasPackaging = Boolean(data.packagingUnit && (data.packagingFactor || 0) > 1);
  const pkgFactor = Number(data.packagingFactor || 1);
  const pkgUnit = data.packagingUnit || 'بسته';

  const renderPackagingHint = (price: number) => {
    if (!hasPackaging || !price || price <= 0) return null;
    return (
      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-sans">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>
          هر {pkgUnit} = {toPersianDigits(pkgFactor)} {unitLabel} → قیمت هر {pkgUnit}:{' '}
          <strong className="text-slate-700 dark:text-slate-200">{formatToman(price * pkgFactor)}</strong>
        </span>
      </div>
    );
  };

  const roundPrice = (num: number, rUnit: number = roundingUnit) => {
    if (rUnit <= 1) return Math.round(num);
    return Math.round(num / rUnit) * rUnit;
  };

  // Helper to calculate profit and margin
  const getProfit = (price: number) => {
    const profit = price - (data.buyPrice || 0);
    const margin = data.buyPrice > 0 ? Math.round((profit / data.buyPrice) * 100) : 0;
    return { profit, margin };
  };

  // Apply quick markup to a single tier
  const applyTierPercentage = (
    field: 'priceShop1' | 'priceShop2' | 'priceShop3' | 'wholesalePrice' | 'minAllowedPrice',
    percent: number
  ) => {
    if (!data.buyPrice || data.buyPrice <= 0) {
      return;
    }
    const rawTarget = data.buyPrice * (1 + percent / 100);
    const calculated = roundPrice(rawTarget);
    if (field === 'priceShop1') {
      onChange({ priceShop1: calculated, salePrice: calculated });
    } else {
      onChange({ [field]: calculated });
    }
  };

  // Batch markup presets
  const applyBatchPreset = (
    shop1Pct: number,
    shop2Pct: number,
    shop3Pct: number,
    wholesalePct: number,
    minPct: number
  ) => {
    if (!data.buyPrice || data.buyPrice <= 0) return;
    const base = data.buyPrice;
    const p1 = roundPrice(base * (1 + shop1Pct / 100));
    const p2 = roundPrice(base * (1 + shop2Pct / 100));
    const p3 = roundPrice(base * (1 + shop3Pct / 100));
    const pw = roundPrice(base * (1 + wholesalePct / 100));
    const pmin = roundPrice(base * (1 + minPct / 100));

    onChange({
      priceShop1: p1,
      salePrice: p1,
      priceShop2: p2,
      priceShop3: p3,
      wholesalePrice: pw,
      minAllowedPrice: pmin,
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. Base Purchasing & Inventory Card */}
      <div className="bg-slate-50 dark:bg-[#161619] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#2D2D33] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#26262B] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">بهای تمام‌شده و موجودی انبار</h4>
              <p className="text-[11px] text-slate-500 dark:text-[#8E9299]">
                مبنای اصلی محاسبه سود تمام سطوح قیمت، بهای خرید از تامین‌کننده است.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#8E9299]">
            <span>واحد کالا:</span>
            <span className="font-bold text-slate-800 dark:text-white bg-slate-200 dark:bg-[#25252A] px-2 py-0.5 rounded-lg">
              {data.unit || 'عدد'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Buy Price */}
          <div className="sm:col-span-1">
            <CurrencyInput
              label={`بهای خرید هر ${unitLabel} از تامین‌کننده (تومان):`}
              value={data.buyPrice}
              onChange={(val) => {
                onChange({ buyPrice: val });
              }}
              required
              helperText="قیمت فاکتور خرید بدون ارزش افزوده"
            />
            {renderPackagingHint(data.buyPrice)}
          </div>

          {/* Initial Stock */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>موجودی اولیه در انبار ({unitLabel}):</span>
              </span>
              {hasPackaging && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                  (معادل {toPersianDigits((data.stock / pkgFactor).toFixed(1).replace(/\.0$/, ''))} {pkgUnit})
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              value={data.stock}
              onChange={(e) => onChange({ stock: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#111113] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm outline-none font-bold focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Minimum Stock Alert */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>حداقل موجودی (نقطه هشدار کسری):</span>
            </label>
            <input
              type="number"
              min="0"
              value={data.minStockAlert}
              onChange={(e) => onChange({ minStockAlert: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#111113] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm outline-none focus:border-indigo-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Smart Batch Pricing Wizard & Rounding Bar */}
      <div className="bg-indigo-50/50 dark:bg-[#151724] p-3.5 sm:p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
              فرمول‌ساز هوشمند و تنظیم یکجای سطوح بر اساس درصد سود:
            </span>
          </div>

          {/* Rounding Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-[#8E9299]">رُند به:</span>
            {[
              { val: 1000, label: '۱,۰۰۰ تومان' },
              { val: 5000, label: '۵,۰۰۰ تومان' },
              { val: 10000, label: '۱۰,۰۰۰ تومان' },
            ].map((r) => (
              <button
                key={r.val}
                type="button"
                onClick={() => setRoundingUnit(r.val)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  roundingUnit === r.val
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#202230] text-slate-600 dark:text-slate-300 border border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-400'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Packages */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!data.buyPrice || data.buyPrice <= 0}
            onClick={() => applyBatchPreset(30, 25, 15, 8, 5)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2130] text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="فروشگاه ۱: ۳۰٪ | آنلاین: ۲۵٪ | همکار: ۱۵٪ | عمده: ۸٪ | کف قیمت: ۵٪"
          >
            <span>📦 پک استاندارد خرده‌فروشی</span>
            <span className="text-[10px] opacity-75 font-mono">(+۳۰٪ / +۲۵٪ / +۱۵٪)</span>
          </button>

          <button
            type="button"
            disabled={!data.buyPrice || data.buyPrice <= 0}
            onClick={() => applyBatchPreset(20, 15, 10, 5, 2)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2130] text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="فروشگاه ۱: ۲۰٪ | آنلاین: ۱۵٪ | همکار: ۱۰٪ | عمده: ۵٪ | کف قیمت: ۲٪"
          >
            <span>⚡ پک رقابتی آنلاین و ترب</span>
            <span className="text-[10px] opacity-75 font-mono">(+۲۰٪ / +۱۵٪ / +۱۰٪)</span>
          </button>

          <button
            type="button"
            disabled={!data.buyPrice || data.buyPrice <= 0}
            onClick={() => applyBatchPreset(50, 40, 25, 15, 10)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2130] text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="فروشگاه ۱: ۵۰٪ | آنلاین: ۴۰٪ | همکار: ۲۵٪ | عمده: ۱۵٪ | کف قیمت: ۱۰٪"
          >
            <span>💎 پک حاشیه سود بالا / تک‌فروشی</span>
            <span className="text-[10px] opacity-75 font-mono">(+۵۰٪ / +۴۰٪ / +۲۵٪)</span>
          </button>
        </div>
      </div>

      {/* 3. The 5 Color-Coded Tier Cards Matching POS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tier 1: Shop 1 (In-store Cash) */}
        <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-3 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                    سطح ۱: فروشگاه حضوری (نقدی)
                  </h5>
                  <span className="text-[10px] text-slate-500 dark:text-[#8E9299] block">
                    پیش‌فرض صندوق، کارتخوان و مشتریان حضوری
                  </span>
                </div>
              </div>
            </div>

            <CurrencyInput
              label={`قیمت فروشگاه ۱ (تومان برای هر ${unitLabel}):`}
              value={data.priceShop1}
              onChange={(val) => onChange({ priceShop1: val, salePrice: val })}
              required
            />
            {renderPackagingHint(data.priceShop1)}
          </div>

          <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
            {/* Quick Percent Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">افزودن سود:</span>
              {[15, 20, 25, 30, 40, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTierPercentage('priceShop1', pct)}
                  disabled={!data.buyPrice}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-[#1E2130] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                >
                  +{toPersianDigits(pct)}٪
                </button>
              ))}
            </div>

            {/* Profit & Margin Display */}
            {data.buyPrice > 0 && data.priceShop1 > 0 && (
              <div className="flex items-center justify-between text-[11px] bg-white dark:bg-[#1A1C28] p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-1 text-slate-600 dark:text-[#8E9299]">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>سود ناخالص:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatToman(getProfit(data.priceShop1).profit)}
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      getProfit(data.priceShop1).profit >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {toPersianDigits(getProfit(data.priceShop1).margin)}٪
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier 2: Shop 2 (Online & Website & Torob) */}
        <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-blue-950 dark:text-blue-200">
                    سطح ۲: آنلاین، وبسایت و ترب
                  </h5>
                  <span className="text-[10px] text-slate-500 dark:text-[#8E9299] block">
                    عرضه در سایت اینترنتی، اپلیکیشن و ایمالز
                  </span>
                </div>
              </div>
            </div>

            <CurrencyInput
              label={`قیمت فروشگاه ۲ / آنلاین (تومان برای هر ${unitLabel}):`}
              value={data.priceShop2}
              onChange={(val) => onChange({ priceShop2: val })}
            />
            {renderPackagingHint(data.priceShop2)}
          </div>

          <div className="space-y-2 pt-2 border-t border-blue-100 dark:border-blue-900/40">
            {/* Quick Percent Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">افزودن سود:</span>
              {[10, 15, 20, 25, 30, 35].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTierPercentage('priceShop2', pct)}
                  disabled={!data.buyPrice}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-[#1A2234] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-600 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                >
                  +{toPersianDigits(pct)}٪
                </button>
              ))}
            </div>

            {/* Profit & Margin Display */}
            {data.buyPrice > 0 && data.priceShop2 > 0 && (
              <div className="flex items-center justify-between text-[11px] bg-white dark:bg-[#151D2C] p-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-1 text-slate-600 dark:text-[#8E9299]">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>سود آنلاین:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatToman(getProfit(data.priceShop2).profit)}
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      getProfit(data.priceShop2).profit >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {toPersianDigits(getProfit(data.priceShop2).margin)}٪
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier 3: Shop 3 (Partners & Branches) */}
        <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-900/60 shadow-xs space-y-3 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-purple-950 dark:text-purple-200">
                    سطح ۳: همکار، شعب و نمایندگی
                  </h5>
                  <span className="text-[10px] text-slate-500 dark:text-[#8E9299] block">
                    همکاران بازار، شعبات دوم و خریداران دائمی
                  </span>
                </div>
              </div>
            </div>

            <CurrencyInput
              label={`قیمت فروشگاه ۳ / همکار (تومان برای هر ${unitLabel}):`}
              value={data.priceShop3}
              onChange={(val) => onChange({ priceShop3: val })}
            />
            {renderPackagingHint(data.priceShop3)}
          </div>

          <div className="space-y-2 pt-2 border-t border-purple-100 dark:border-purple-900/40">
            {/* Quick Percent Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">افزودن سود:</span>
              {[8, 10, 12, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTierPercentage('priceShop3', pct)}
                  disabled={!data.buyPrice}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-[#221C2E] text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-600 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                >
                  +{toPersianDigits(pct)}٪
                </button>
              ))}
            </div>

            {/* Profit & Margin Display */}
            {data.buyPrice > 0 && data.priceShop3 > 0 && (
              <div className="flex items-center justify-between text-[11px] bg-white dark:bg-[#1A1624] p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                <div className="flex items-center gap-1 text-slate-600 dark:text-[#8E9299]">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                  <span>سود همکار:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatToman(getProfit(data.priceShop3).profit)}
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      getProfit(data.priceShop3).profit >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {toPersianDigits(getProfit(data.priceShop3).margin)}٪
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier 4: Wholesale (Schools, Bulk, Cartons) */}
        <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 shadow-xs space-y-3 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-amber-950 dark:text-amber-200">
                    سطح ۴: عمده‌فروشی و مدارس
                  </h5>
                  <span className="text-[10px] text-slate-500 dark:text-[#8E9299] block">
                    خرید تیراژ بالا، بسته‌ای، کارتنی و فاکتور سازمانی
                  </span>
                </div>
              </div>
            </div>

            <CurrencyInput
              label={`قیمت فروش عمده (تومان برای هر ${unitLabel}):`}
              value={data.wholesalePrice}
              onChange={(val) => onChange({ wholesalePrice: val })}
            />
            {renderPackagingHint(data.wholesalePrice)}
          </div>

          <div className="space-y-2 pt-2 border-t border-amber-100 dark:border-amber-900/40">
            {/* Quick Percent Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">افزودن سود:</span>
              {[5, 7, 10, 12, 15, 18].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTierPercentage('wholesalePrice', pct)}
                  disabled={!data.buyPrice}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-[#262016] text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-600 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                >
                  +{toPersianDigits(pct)}٪
                </button>
              ))}
            </div>

            {/* Profit & Margin Display */}
            {data.buyPrice > 0 && data.wholesalePrice > 0 && (
              <div className="flex items-center justify-between text-[11px] bg-white dark:bg-[#1E1A14] p-2 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <div className="flex items-center gap-1 text-slate-600 dark:text-[#8E9299]">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>سود عمده:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatToman(getProfit(data.wholesalePrice).profit)}
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      getProfit(data.wholesalePrice).profit >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {toPersianDigits(getProfit(data.wholesalePrice).margin)}٪
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier 5: Minimum Allowed Price (Kaf-e-Gheymat & Max Discount) */}
        <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-600 text-white shadow-xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-rose-950 dark:text-rose-200">
                    سطح ۵: کف قیمت مجاز (حداقل فروش)
                  </h5>
                  <span className="text-[10px] text-slate-500 dark:text-[#8E9299] block">
                    سقف تخفیف صندوقدار، جلوگیری از فروش زیر قیمت خرید
                  </span>
                </div>
              </div>
            </div>

            <CurrencyInput
              label={`کف قیمت مجاز (تومان برای هر ${unitLabel}):`}
              value={data.minAllowedPrice}
              onChange={(val) => onChange({ minAllowedPrice: val })}
            />
            {renderPackagingHint(data.minAllowedPrice)}
          </div>

          <div className="space-y-2 pt-2 border-t border-rose-100 dark:border-rose-900/40">
            {/* Quick Percent Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-[#8E9299]">حداقل سود:</span>
              {[2, 3, 5, 7, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTierPercentage('minAllowedPrice', pct)}
                  disabled={!data.buyPrice}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-[#2E1A1F] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                >
                  +{toPersianDigits(pct)}٪
                </button>
              ))}
            </div>

            {/* Warning or Margin */}
            {data.minAllowedPrice > 0 && data.buyPrice > 0 && data.minAllowedPrice < data.buyPrice ? (
              <div className="flex items-center gap-1.5 text-[11px] bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 p-2 rounded-xl border border-rose-300 dark:border-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>هشدار: کف قیمت زیر قیمت خرید است و باعث زیان می‌شود!</span>
              </div>
            ) : data.minAllowedPrice > 0 && data.buyPrice > 0 ? (
              <div className="flex items-center justify-between text-[11px] bg-white dark:bg-[#201418] p-2 rounded-xl border border-rose-100 dark:border-rose-900/40">
                <span className="text-slate-500 dark:text-[#8E9299]">حداقل حاشیه سود مجاز:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {toPersianDigits(getProfit(data.minAllowedPrice).margin)}٪ ({formatToman(getProfit(data.minAllowedPrice).profit)})
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
