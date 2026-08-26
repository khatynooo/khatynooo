import React from 'react';
import { ShieldAlert, ArrowRight, Lock, UserCheck } from 'lucide-react';
import { getRoleTitle, getRoleBadgeClass } from '../../lib/utils';
import { UserRole } from '../../types';

interface AccessDeniedViewProps {
  currentRole: UserRole;
  requiredRoles: UserRole[];
  title?: string;
  description?: string;
  redirectUrl?: string;
  redirectLabel?: string;
  onRedirect?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentRole,
  requiredRoles,
  title = 'دسترسی غیرمجاز (عدم احراز سطح دسترسی)',
  description = 'حساب کاربری شما اجازه مشاهده یا ویرایش این بخش را ندارد. لطفاً با مدیر کل سیستم تماس حاصل فرمایید.',
  redirectUrl,
  redirectLabel = 'بازگشت به بخش مجاز',
  onRedirect,
}) => {
  return (
    <div className="bg-white dark:bg-[#111113] border border-rose-200 dark:border-rose-900/30 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xl">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-[#F3F4F6] mb-2">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-[#8E9299] leading-relaxed mb-6">
        {description}
      </p>

      {/* Role details box */}
      <div className="bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#222225] rounded-2xl p-4 mb-6 text-xs text-right space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-[#8E9299]">نقش حساب شما:</span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold border ${getRoleBadgeClass(currentRole)}`}>
            {getRoleTitle(currentRole)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#222225]">
          <span className="text-slate-500 dark:text-[#8E9299]">نقش‌های مجاز برای این بخش:</span>
          <div className="flex flex-wrap gap-1 justify-end">
            {requiredRoles.map((r) => (
              <span key={r} className="bg-slate-200 dark:bg-[#222225] text-slate-800 dark:text-[#E0E0E0] px-2 py-0.5 rounded text-[11px] font-medium">
                {getRoleTitle(r)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {onRedirect && (
        <button
          onClick={onRedirect}
          className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 -rotate-180" />
          <span>{redirectLabel}</span>
        </button>
      )}
    </div>
  );
};
