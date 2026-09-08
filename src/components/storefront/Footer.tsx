import React from 'react';
import { BookOpen, Phone, MapPin, Clock, ShieldCheck, Truck, Headphones, Instagram, MessageCircle } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';
import { WebsiteSettings, StoreSettings } from '../../types';

interface FooterProps {
  onOpenCalculator: () => void;
  onOpenTracker: () => void;
  websiteSettings?: WebsiteSettings | null;
  storeSettings?: StoreSettings | null;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCalculator, onOpenTracker, websiteSettings, storeSettings }) => {
  const siteTitle = websiteSettings?.siteTitle || storeSettings?.storeName || 'خطی‌نو';
  const address = websiteSettings?.address || storeSettings?.address || 'دفتر و فروشگاه خطی‌نو';
  const phone = websiteSettings?.supportPhone || storeSettings?.phone || '۰۳۱۵۲۴۰۸۳۹۰';
  const workingHours = websiteSettings?.workingHours || 'شنبه تا پنج‌شنبه ۹ الی ۲۱';

  const footerLayout = websiteSettings?.footerLayout || 'multi_column';
  const isCompact = footerLayout === 'compact' || footerLayout === 'simple';
  const isDetailed = footerLayout === 'detailed';
  const isTwoColumn = footerLayout === 'default';

  // Compact Layout: Logo + single line address/phone + copyright
  if (isCompact) {
    return (
      <footer className="bg-[var(--paper)] dark:bg-[#0E0F12] text-slate-600 dark:text-[#8E9299] py-6 border-t border-[var(--line-soft)] dark:border-[#1E1F26] text-xs transition-colors">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {websiteSettings?.logoUrl ? (
              <img
                src={websiteSettings.logoUrl}
                alt={siteTitle}
                style={{
                  height: `${Math.min(Math.max((websiteSettings.logoHeight || 48) * 0.7, 26), 44)}px`,
                  objectFit: websiteSettings.logoFit || 'contain',
                }}
                className={`${websiteSettings.logoBorderRadius || 'rounded-xl'} object-cover ring-1 ring-[var(--coral)]/40 shadow-xs`}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[var(--coral)] flex items-center justify-center text-white font-black shadow-xs">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-black text-slate-900 dark:text-[#F3F4F6] text-sm">{siteTitle}</span>
            <span className="hidden sm:inline text-slate-300 dark:text-[#2D2D33]">•</span>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#8E9299]">
              <MapPin className="w-3.5 h-3.5 text-[var(--coral)] shrink-0" />
              <span>{websiteSettings?.address || address}</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-[#2D2D33]">•</span>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#8E9299]">
              <Phone className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
              <span className="font-mono">{toPersianDigits(phone)}</span>
            </div>
          </div>

          <div className="text-slate-500 dark:text-[#8E9299] text-[11px] text-center md:text-left">
            © {toPersianDigits(1404)} کلیه حقوق محفوظ است.
          </div>
        </div>
      </footer>
    );
  }

  // Render Trust Symbols Helper
  const renderTrustSymbols = (large = false) => (
    <div className="flex flex-wrap items-center gap-3">
      {/* Enamad */}
      {websiteSettings?.enamadImageUrl ? (
        <div className={`p-2 bg-white dark:bg-[#161619] rounded-xl border border-[var(--line-soft)] dark:border-[#222225] shadow-xs flex flex-col items-center hover:border-[var(--teal)] transition-colors ${large ? 'p-3' : ''}`}>
          <img src={websiteSettings.enamadImageUrl} alt="نماد اعتماد الکترونیکی" className={`${large ? 'w-20 h-20' : 'w-14 h-14'} object-contain`} />
          <span className="text-[9px] text-slate-500 mt-1">اینماد خطی‌نو</span>
        </div>
      ) : (
        <div className={`p-2.5 bg-white dark:bg-[#161619] rounded-xl border border-[var(--line-soft)] dark:border-[#222225] shadow-xs text-center flex flex-col items-center ${large ? 'p-3.5' : ''}`}>
          <ShieldCheck className={`${large ? 'w-12 h-12' : 'w-8 h-8'} text-[var(--teal)] mb-1`} />
          <span className="text-[10px] font-bold text-slate-800 dark:text-[#E0E0E0]">نماد اعتماد</span>
          <span className="text-[9px] text-slate-400 font-mono">{websiteSettings?.enamadCode || 'ENM-987654'}</span>
        </div>
      )}

      {/* Samandehi */}
      {websiteSettings?.samandehiImageUrl ? (
        <div className={`p-2 bg-white dark:bg-[#161619] rounded-xl border border-[var(--line-soft)] dark:border-[#222225] shadow-xs flex flex-col items-center hover:border-[var(--coral)] transition-colors ${large ? 'p-3' : ''}`}>
          <img src={websiteSettings.samandehiImageUrl} alt="نماد ساماندهی" className={`${large ? 'w-20 h-20' : 'w-14 h-14'} object-contain`} />
          <span className="text-[9px] text-slate-500 mt-1">ساماندهی</span>
        </div>
      ) : (
        <div className={`p-2.5 bg-white dark:bg-[#161619] rounded-xl border border-[var(--line-soft)] dark:border-[#222225] shadow-xs text-center flex flex-col items-center ${large ? 'p-3.5' : ''}`}>
          <BookOpen className={`${large ? 'w-12 h-12' : 'w-8 h-8'} text-[var(--coral)] mb-1`} />
          <span className="text-[10px] font-bold text-slate-800 dark:text-[#E0E0E0]">نشان ساماندهی</span>
          <span className="text-[9px] text-slate-400 font-mono">{websiteSettings?.samandehiCode || 'SMD-123456'}</span>
        </div>
      )}

      {/* Additional Custom Uploaded Symbols */}
      {websiteSettings?.customSymbols?.filter(s => s.isEnabled !== false).map((sym) => (
        <div key={sym.id} className={`p-2 bg-white dark:bg-[#161619] rounded-xl border border-[var(--line-soft)] dark:border-[#222225] shadow-xs flex flex-col items-center hover:border-[var(--teal)] transition-colors ${large ? 'p-3' : ''}`}>
          {sym.linkUrl ? (
            <a href={sym.linkUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
              <img src={sym.imageUrl} alt={sym.title} className={`${large ? 'w-20 h-20' : 'w-14 h-14'} object-contain`} />
              <span className="text-[9px] text-slate-500 mt-1 text-center max-w-[70px] truncate">{sym.title}</span>
            </a>
          ) : (
            <>
              <img src={sym.imageUrl} alt={sym.title} className={`${large ? 'w-20 h-20' : 'w-14 h-14'} object-contain`} />
              <span className="text-[9px] text-slate-500 mt-1 text-center max-w-[70px] truncate">{sym.title}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <footer className="bg-[var(--paper)] dark:bg-[#0E0F12] text-slate-600 dark:text-[#8E9299] pt-12 pb-8 border-t border-[var(--line-soft)] dark:border-[#1E1F26] text-xs transition-colors">
      <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16">
        {/* Value props */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-10 border-b border-[var(--line-soft)] dark:border-[#222225] text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161619] border border-[var(--line-soft)] dark:border-[#222225] text-[var(--teal)] flex items-center justify-center shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">ارسال سریع به سراسر کشور</h4>
            <p className="text-slate-500 dark:text-[#8E9299] text-[11px]">پست پیشتاز، تیپاکس و پیک شهری فوری</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161619] border border-[var(--line-soft)] dark:border-[#222225] text-emerald-500 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">ضمانت اصالت و کیفیت</h4>
            <p className="text-slate-500 dark:text-[#8E9299] text-[11px]">عرضه برترین برندهای نوشت‌افزار داخلی و خارجی</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161619] border border-[var(--line-soft)] dark:border-[#222225] text-[var(--coral)] flex items-center justify-center shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">تولید کارگاهی دفاتر خطی‌نو</h4>
            <p className="text-slate-500 dark:text-[#8E9299] text-[11px]">دفاتر مشق، شطرنجی، نقاشی و برنامه‌ریزی سیمی</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161619] border border-[var(--line-soft)] dark:border-[#222225] text-[var(--grape)] flex items-center justify-center shadow-xs">
              <Headphones className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm">پشتیبانی تلفنی و سازمانی</h4>
            <p className="text-slate-500 dark:text-[#8E9299] text-[11px]">تخفیف ویژه مدارس، شرکت‌ها و ارگان‌ها</p>
          </div>
        </div>

        {/* Links & Contact */}
        {isTwoColumn ? (
          /* Default 2-Column Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                {websiteSettings?.logoUrl ? (
                  <img
                    src={websiteSettings.logoUrl}
                    alt={siteTitle}
                    style={{
                      height: `${Math.min(Math.max((websiteSettings.logoHeight || 48) * 0.75, 28), 54)}px`,
                      objectFit: websiteSettings.logoFit || 'contain',
                    }}
                    className={`${websiteSettings.logoBorderRadius || 'rounded-xl'} object-cover ring-1 ring-[var(--coral)]/40 shadow-xs`}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[var(--coral)] flex items-center justify-center text-white font-black shadow-xs">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="text-xl font-black text-slate-900 dark:text-[#F3F4F6]">{siteTitle}</span>
                <span className="text-[10px] bg-white dark:bg-[#161619] text-[var(--teal)] border border-[var(--teal)]/30 px-1.5 py-0.5 rounded-full font-mono shadow-xs">khatynoo.ir</span>
              </div>
              <p className="text-slate-500 dark:text-[#8E9299] leading-relaxed text-[11px] max-w-md">
                {websiteSettings?.siteSubtitle || 'پلتفرم جامع فروش آنلاین لوازم‌تحریر، ملزومات اداری و مهندسی همراه با خدمات چاپ، تکثیر و تولید اختصاصی دفاتر باکیفیت.'}
              </p>
              <div className="flex flex-wrap gap-4 pt-1">
                <button onClick={onOpenCalculator} className="text-slate-600 dark:text-[#8E9299] hover:text-[var(--teal)] transition-colors cursor-pointer font-bold">
                  محاسبه آنلاین پرینت
                </button>
                <button onClick={onOpenTracker} className="text-slate-600 dark:text-[#8E9299] hover:text-[var(--teal)] transition-colors cursor-pointer font-bold">
                  پیگیری سفارش
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2 text-slate-600 dark:text-[#8E9299]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--coral)] shrink-0 mt-0.5" />
                  <span>{websiteSettings?.address || address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[var(--teal)] shrink-0" />
                  <span>شماره تماس: {toPersianDigits(phone)}</span>
                </div>
              </div>
              <div>
                <h5 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-xs mb-2">مجوزها و نمادها</h5>
                {renderTrustSymbols(false)}
              </div>
            </div>
          </div>
        ) : (
          /* Multi-column or Detailed Layout */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10">
            {/* Brand */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                {websiteSettings?.logoUrl ? (
                  <img
                    src={websiteSettings.logoUrl}
                    alt={siteTitle}
                    style={{
                      height: `${Math.min(Math.max((websiteSettings.logoHeight || 48) * 0.75, 28), 54)}px`,
                      objectFit: websiteSettings.logoFit || 'contain',
                    }}
                    className={`${websiteSettings.logoBorderRadius || 'rounded-xl'} object-cover ring-1 ring-[var(--coral)]/40 shadow-xs`}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[var(--coral)] flex items-center justify-center text-white font-black shadow-xs">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="text-xl font-black text-slate-900 dark:text-[#F3F4F6]">{siteTitle}</span>
                <span className="text-[10px] bg-white dark:bg-[#161619] text-[var(--teal)] border border-[var(--teal)]/30 px-1.5 py-0.5 rounded-full font-mono shadow-xs">khatynoo.ir</span>
              </div>
              <p className="text-slate-500 dark:text-[#8E9299] leading-relaxed text-[11px]">
                {websiteSettings?.siteSubtitle || 'پلتفرم جامع فروش آنلاین لوازم‌تحریر، ملزومات اداری و مهندسی همراه با خدمات چاپ، تکثیر و تولید اختصاصی دفاتر باکیفیت.'}
              </p>
              {websiteSettings?.instagram && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#8E9299] text-[11px]">
                  <Instagram className="w-3.5 h-3.5 text-[var(--coral)]" />
                  <span className="font-mono">{websiteSettings.instagram}</span>
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm mb-3">دسترسی سریع</h4>
              <ul className="space-y-2 text-slate-600 dark:text-[#8E9299]">
                <li>
                  <button onClick={onOpenCalculator} className="hover:text-[var(--teal)] transition-colors cursor-pointer">
                    محاسبه آنلاین هزینه پرینت و کپی
                  </button>
                </li>
                <li>
                  <button onClick={onOpenTracker} className="hover:text-[var(--teal)] transition-colors cursor-pointer">
                    پیگیری وضعیت سفارش آنلاین
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Location */}
            <div className="space-y-2.5 md:col-span-1">
              <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm mb-3">اطلاعات فروشگاه، آدرس و مسیریابی</h4>
              <div className="space-y-2.5 text-slate-600 dark:text-[#8E9299]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--coral)] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="leading-relaxed block">{websiteSettings?.address || address}</span>
                    {websiteSettings?.postalCode && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        کد پستی: {toPersianDigits(websiteSettings.postalCode)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation and map links */}
                {websiteSettings?.showLocationMap !== false && (websiteSettings?.googleMapsUrl || websiteSettings?.neshanUrl || websiteSettings?.baladUrl) && (
                  <div className="pt-1.5 flex flex-wrap gap-1.5">
                    {websiteSettings.googleMapsUrl && (
                      <a
                        href={websiteSettings.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Google Maps</span>
                      </a>
                    )}
                    {websiteSettings.neshanUrl && (
                      <a
                        href={websiteSettings.neshanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>مسیریابی در نشان</span>
                      </a>
                    )}
                    {websiteSettings.baladUrl && (
                      <a
                        href={websiteSettings.baladUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>مسیریابی در بلد</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Phone className="w-4 h-4 text-[var(--teal)] shrink-0" />
                  <span>شماره تماس: {toPersianDigits(phone)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--sunshine)] shrink-0" />
                  <span>ساعات کاری: {workingHours}</span>
                </div>
              </div>
            </div>

            {/* Electronic Trust & Symbols */}
            <div className={`space-y-2.5 md:col-span-1 ${isDetailed ? 'bg-slate-50 dark:bg-[#121316] p-4 rounded-2xl border border-[var(--line-soft)] dark:border-[#222225]' : ''}`}>
              <h4 className="font-bold text-slate-900 dark:text-[#F3F4F6] text-sm mb-3">
                {isDetailed ? 'نمادهای رسمی، اینماد و مجوزها' : 'نمادهای اعتماد و مجوزها'}
              </h4>
              {renderTrustSymbols(isDetailed)}
            </div>
          </div>
        )}

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-[var(--line-soft)] dark:border-[#222225] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 dark:text-[#8E9299] text-[11px]">
          <div>© {toPersianDigits(1404)} کلیه حقوق مادی و معنوی برای سامانه {siteTitle} محفوظ است.</div>
          <div className="flex items-center gap-4">
            <span>سامانه متصل به شبکه بانکی و پوز پاسارگاد</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
