import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle2,
  XCircle,
  CornerDownLeft,
  Filter,
  User,
  Clock,
  Package,
  Send,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ProductReview } from '../../types';
import { useToast } from '../common/Toast';

export const ReviewsView: React.FC = () => {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [replyingReview, setReplyingReview] = useState<ProductReview | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.getProductReviews();
      setReviews(res.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await api.approveProductReview(id);
      setReviews((prev) => prev.map((r) => (r.id === id ? res.review : r)));
      showToast('دیدگاه تایید و در سایت منتشر گردید.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در تایید دیدگاه', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await api.rejectProductReview(id);
      setReviews((prev) => prev.map((r) => (r.id === id ? res.review : r)));
      showToast('دیدگاه رد شد.', 'info');
    } catch (err: any) {
      showToast(err.message || 'خطا در رد دیدگاه', 'error');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview || !replyText.trim()) return;
    try {
      const res = await api.replyProductReview(replyingReview.id, replyText);
      setReviews((prev) => prev.map((r) => (r.id === replyingReview.id ? res.review : r)));
      showToast('پاسخ مدیریت برای دیدگاه ثبت گردید.', 'success');
      setReplyingReview(null);
      setReplyText('');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت پاسخ', 'error');
    }
  };

  const filteredReviews = reviews.filter((r) =>
    statusFilter === 'all' ? true : r.status === statusFilter
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-white dark:via-[#111113] to-white dark:to-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md dark:shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#C9A227] font-bold text-xs">
            <MessageSquare className="w-4 h-4" />
            <span>مدیریت نظرات، امتیازدهی و بازخورد مشتریان (Customer Reviews Moderation)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F3F4F6]">
            دیدگاه‌های کاربران درباره محصولات
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8E9299] max-w-2xl leading-relaxed">
            بررسی نظرات ثبت‌شده، تایید قبل از انتشار در صفحه محصول، رد دیدگاه‌های نامناسب و درج پاسخ رسمی پشتیبانی خطی‌نو.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#111113] p-3 rounded-2xl border border-slate-200 dark:border-[#222225] shadow-sm">
        {[
          { id: 'all', label: 'همه نظرات' },
          { id: 'pending', label: 'در انتظار تایید' },
          { id: 'approved', label: 'تایید شده و منتشر' },
          { id: 'rejected', label: 'رد شده' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === f.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-[#161619] text-slate-600 dark:text-[#8E9299] hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-5 sm:p-6 space-y-4 shadow-md transition-all hover:border-[#C9A227]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#222225]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-[#C9A227] font-black">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                    {rev.customerName}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <Package className="w-3 h-3" />
                    <span>{rev.productName}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{rev.createdAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Star Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-[#2A2A30]'
                      }`}
                    />
                  ))}
                </div>

                {/* Status Badge */}
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${
                    rev.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : rev.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-[#C9A227] border border-amber-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                >
                  {rev.status === 'approved' ? 'تایید شده' : rev.status === 'pending' ? 'در انتظار تایید' : 'رد شده'}
                </span>
              </div>
            </div>

            {/* Comment Text */}
            <p className="text-xs text-slate-700 dark:text-[#D1D5DB] leading-relaxed">
              {rev.comment}
            </p>

            {/* Admin Reply (if exists) */}
            {rev.adminReply && (
              <div className="p-3.5 bg-amber-50/50 dark:bg-[#161619] border border-amber-500/20 rounded-2xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-[#C9A227] font-bold text-[11px]">
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>پاسخ پشتیبانی فروشگاه:</span>
                </div>
                <p className="text-slate-600 dark:text-[#8E9299] text-[11px] leading-relaxed">
                  {rev.adminReply}
                </p>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setReplyingReview(rev);
                  setReplyText(rev.adminReply || '');
                }}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-[#8E9299] hover:bg-slate-100 dark:hover:bg-[#161619] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>{rev.adminReply ? 'ویرایش پاسخ' : 'ارسال پاسخ'}</span>
              </button>

              {rev.status !== 'rejected' && (
                <button
                  onClick={() => handleReject(rev.id)}
                  className="px-3 py-1.5 rounded-xl text-xs text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>رد نظر</span>
                </button>
              )}

              {rev.status !== 'approved' && (
                <button
                  onClick={() => handleApprove(rev.id)}
                  className="px-3.5 py-1.5 rounded-xl text-xs bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1 cursor-pointer font-bold shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تایید و انتشار</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reply Modal */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-slate-200 dark:border-[#222225] rounded-3xl p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222225]">
              <h3 className="text-xs font-black text-slate-900 dark:text-[#F3F4F6]">
                ثبت پاسخ به دیدگاه {replyingReview.customerName}
              </h3>
              <button
                onClick={() => setReplyingReview(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#161619] rounded-xl text-[11px] text-slate-500">
                دیدگاه کاربر: {replyingReview.comment}
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">متن پاسخ رسمی فروشگاه:</label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ محترمانه خود را وارد نمایید..."
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-[#2D2D33] rounded-xl p-3 text-xs outline-none focus:border-[#C9A227] text-slate-900 dark:text-[#E0E0E0] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-[#161619] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C9A227] text-slate-950 hover:bg-[#B38E1E] cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ثبت پاسخ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
