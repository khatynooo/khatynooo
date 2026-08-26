import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  PieChart,
  ShoppingBag,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  Receipt,
  Plus,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, formatNumber } from '../../lib/utils';
import { TreasuryTransaction, TreasurySummary } from '../../types';
import { useToast } from '../common/Toast';

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pnl' | 'treasury'>('pnl');
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [treasurySummary, setTreasurySummary] = useState<TreasurySummary | null>(null);
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>([]);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTreasury, setIsRefreshingTreasury] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // New Voucher Form State
  const [voucherType, setVoucherType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [voucherAmount, setVoucherAmount] = useState<string>('');
  const [voucherAccount, setVoucherAccount] = useState<string>('صندوق مرکزی');
  const [voucherMethod, setVoucherMethod] = useState<string>('cash');
  const [voucherDesc, setVoucherDesc] = useState<string>('');
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [dashRes, invRes, prodRes, trSummaryRes, trTxRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ stats: {} })),
        api.getSalesInvoices().catch(() => ({ invoices: [] })),
        api.getProducts().catch(() => ({ products: [] })),
        api.getTreasurySummary().catch(() => ({ summary: null })),
        api.getTreasuryTransactions().catch(() => ({ transactions: [] })),
      ]);
      setStats(dashRes.stats || {});
      setInvoices(invRes.invoices || []);
      setProducts(prodRes.products || []);
      setTreasurySummary(trSummaryRes.summary || null);
      setTreasuryTransactions(trTxRes.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshTreasury() {
    setIsRefreshingTreasury(true);
    try {
      const [summaryRes, txRes] = await Promise.all([
        api.getTreasurySummary(),
        api.getTreasuryTransactions(moduleFilter !== 'all' ? { sourceModule: moduleFilter } : undefined),
      ]);
      setTreasurySummary(summaryRes.summary || null);
      setTreasuryTransactions(txRes.transactions || []);
      showToast('دفتر معین خزانه با موفقیت به‌روز شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در به‌روزرسانی خزانه', 'error');
    } finally {
      setIsRefreshingTreasury(false);
    }
  }

  const handleExportPL = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      'شاخص مالی,مبلغ (تومان)\n' +
      `"فروش ناخالص کل","${totalRevenue}"\n` +
      `"بهای تمام شده کالای فروش رفته (COGS)","${totalCostOfGoods}"\n` +
      `"سود ناخالص عملیاتی","${grossProfit}"\n` +
      `"ارزش دارایی موجودی انبار","${totalInventoryValuation}"\n` +
      `"مطالبات از مشتریان (نسیه)","${stats?.totalCustomerDebt || 0}"\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `khatinoo_financial_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('گزارش سود و زیان دانلود شد.', 'success');
  };

  const handleExportTreasury = () => {
    let csv = 'data:text/csv;charset=utf-8,\uFEFFشناسه سند,تاریخ و زمان,نوع تراکنش,ماژول مرجع,مبلغ (تومان),شیوه تسویه,حساب معین,شرح سند\n';
    treasuryTransactions.forEach((tx) => {
      csv += `"${tx.id}","${new Date(tx.createdAt).toLocaleDateString('fa-IR')}","${tx.transactionType}","${tx.sourceModule}","${tx.amount}","${tx.paymentMethod}","${tx.accountTitle}","${tx.description || ''}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `khatinoo_treasury_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('دفتر معین نقدینگی دانلود شد.', 'success');
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(voucherAmount);
    if (!amt || amt <= 0) {
      showToast('مبلغ سند معتبر وارد نمایید.', 'error');
      return;
    }

    setIsSavingVoucher(true);
    try {
      const finalAmt = voucherType === 'cash_out' ? -amt : amt;
      await api.createTreasuryTransaction({
        transactionType: voucherType,
        sourceModule: 'sales',
        amount: finalAmt,
        paymentMethod: voucherMethod,
        accountTitle: voucherAccount,
        description: voucherDesc || (voucherType === 'cash_in' ? 'دریافت متفرقه خزانه' : 'پرداخت و هزینه متفرقه'),
      });
      showToast('سند حسابداری خزانه با موفقیت ثبت شد.', 'success');
      setShowVoucherModal(false);
      setVoucherAmount('');
      setVoucherDesc('');
      refreshTreasury();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت سند', 'error');
    } finally {
      setIsSavingVoucher(false);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-slate-500 text-xs">در حال پردازش ترازهای مالی و جریان نقدینگی...</div>;
  }

  const totalRevenue = invoices.reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);
  const totalCostOfGoods = invoices.reduce(
    (s, i) => s + (i.items || []).reduce((is: number, it: any) => is + (Number(it.buyPrice) || 0) * (Number(it.quantity) || 1), 0),
    0
  );
  const grossProfit = totalRevenue - totalCostOfGoods;
  const totalInventoryValuation = products.reduce((s, p) => s + (Number(p.stock) || 0) * (Number(p.buyPrice) || 0), 0);

  const posSales = invoices
    .filter((i) => i.paymentMethod === 'pos_pasargad' || i.paymentMethod === 'cash')
    .reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);

  const creditSales = invoices
    .filter((i) => i.paymentMethod === 'credit' || i.paymentMethod === 'cheque')
    .reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);

  const filteredTreasuryTx = treasuryTransactions.filter((tx) => {
    if (moduleFilter === 'all') return true;
    return tx.sourceModule === moduleFilter;
  });

  return (
    <div className="space-y-6 text-[#E0E0E0]">
      {/* Tab Switcher & Header */}
      <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-black text-[#F3F4F6] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#C9A227]" />
            <span>گزارش‌های مالی جامع و دفتر معین متمرکز خزانه خطی‌نو</span>
          </h2>
          <p className="text-xs text-[#8E9299]">
            صورت سود و زیان، دارایی‌های انبار و دفتر روزنامه گردش نقدینگی (صندوق، کارتخوان پاسارگاد و چک‌ها)
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-[#161619] p-1.5 rounded-2xl border border-[#2D2D33]">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'pnl'
                ? 'bg-[#C9A227] text-slate-950 shadow-md'
                : 'text-[#8E9299] hover:text-[#E0E0E0]'
            }`}
          >
            صورت سود و زیان (P&L)
          </button>
          <button
            onClick={() => setActiveTab('treasury')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'treasury'
                ? 'bg-[#C9A227] text-slate-950 shadow-md'
                : 'text-[#8E9299] hover:text-[#E0E0E0]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>دفتر معین نقدینگی و خزانه</span>
          </button>
        </div>
      </div>

      {/* TAB 1: P&L Statement */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleExportPL}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود صورت سود و زیان (CSV)</span>
            </button>
          </div>

          {/* Financial Statement Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-lg space-y-3">
              <span className="text-xs font-bold text-[#8E9299]">فروش ناخالص کل (درآمد عملیاتی):</span>
              <div className="text-2xl font-black text-[#F3F4F6] font-mono">{formatToman(totalRevenue)}</div>
              <div className="text-[11px] text-[#8E9299] font-medium">مجموع فاکتورهای فروش ثبت‌شده</div>
            </div>

            <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-lg space-y-3">
              <span className="text-xs font-bold text-[#8E9299]">بهای تمام‌شده کالای فروش‌رفته (COGS):</span>
              <div className="text-2xl font-black text-rose-400 font-mono">{formatToman(totalCostOfGoods)}</div>
              <div className="text-[11px] text-[#8E9299] font-medium">مجموع بهای خرید اقلام فروخته شده</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950 via-[#142A1D] to-[#111113] text-white border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-3">
              <span className="text-xs text-emerald-300 font-bold">سود ناخالص عملیاتی (Gross Profit):</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{formatToman(grossProfit)}</div>
              <div className="text-[11px] text-emerald-200 font-bold">
                حاشیه سود ناخالص: {toPersianDigits(Math.round((grossProfit / (totalRevenue || 1)) * 100))}٪
              </div>
            </div>
          </div>

          {/* Comparison: POS vs Credit & Balance Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-lg space-y-4">
              <h3 className="text-sm font-black text-[#F3F4F6] pb-2 border-b border-[#222225]">
                تفکیک شیوه‌های تسویه فروش
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-[#161619] rounded-2xl border border-[#2D2D33]">
                  <span className="font-bold text-[#E0E0E0]">فروش نقدی و کارتخوان (تسویه آنی):</span>
                  <span className="font-mono font-black text-emerald-400">{formatToman(posSales)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-[#161619] rounded-2xl border border-[#2D2D33]">
                  <span className="font-bold text-[#E0E0E0]">فروش نسیه و اسناد دریافتنی (چک):</span>
                  <span className="font-mono font-black text-[#C9A227]">{formatToman(creditSales)}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-lg space-y-4">
              <h3 className="text-sm font-black text-[#F3F4F6] pb-2 border-b border-[#222225]">
                ارزیابی دارایی‌های جاری انبار و سرمایه
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-[#161619] rounded-2xl border border-[#2D2D33]">
                  <span className="font-bold text-[#E0E0E0]">ارزش کل موجودی انبار به قیمت خرید:</span>
                  <span className="font-mono font-black text-[#F3F4F6]">{formatToman(totalInventoryValuation)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-[#161619] rounded-2xl border border-[#2D2D33]">
                  <span className="font-bold text-[#E0E0E0]">کل مطالبات وصول‌نشده از مشتریان:</span>
                  <span className="font-mono font-black text-rose-400">{formatToman(stats?.totalCustomerDebt || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Central Treasury Ledger */}
      {activeTab === 'treasury' && (
        <div className="space-y-6">
          {/* Treasury Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={refreshTreasury}
                disabled={isRefreshingTreasury}
                className="bg-[#161619] hover:bg-[#1E1E24] text-[#E0E0E0] border border-[#2D2D33] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTreasury ? 'animate-spin' : ''}`} />
                <span>به‌روزرسانی دفتر</span>
              </button>

              <div className="flex items-center gap-1 bg-[#161619] px-2.5 py-1.5 rounded-xl border border-[#2D2D33] text-xs">
                <Filter className="w-3.5 h-3.5 text-[#8E9299]" />
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="bg-transparent text-[#E0E0E0] outline-none text-xs cursor-pointer font-bold"
                >
                  <option value="all" className="bg-[#161619]">همه ماژول‌ها</option>
                  <option value="sales" className="bg-[#161619]">فروشگاه و POS</option>
                  <option value="purchases" className="bg-[#161619]">فاکتورهای خرید</option>
                  <option value="cheques" className="bg-[#161619]">وصول و پاس چک‌ها</option>
                  <option value="services" className="bg-[#161619]">خدمات چاپ و کپی</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportTreasury}
                className="bg-[#161619] hover:bg-[#1E1E24] text-[#E0E0E0] border border-[#2D2D33] text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>خروجی اکسل / CSV</span>
              </button>

              <button
                onClick={() => setShowVoucherModal(true)}
                className="bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>ثبت سند دستی نقدینگی</span>
              </button>
            </div>
          </div>

          {/* Treasury Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111113] p-5 rounded-3xl border border-[#222225] shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8E9299]">
                <span>مانده کل نقدینگی و خزانه:</span>
                <Wallet className="w-4 h-4 text-[#C9A227]" />
              </div>
              <div className="text-xl font-black text-[#F3F4F6] font-mono">
                {formatToman(treasurySummary?.totalBalance || 0)}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold">
                مجموع موجودی در دسترس صندوق‌ها
              </div>
            </div>

            <div className="bg-[#111113] p-5 rounded-3xl border border-[#222225] shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8E9299]">
                <span>موجودی صندوق نقدی:</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {formatToman(treasurySummary?.cashBalance || 0)}
              </div>
              <div className="text-[10px] text-[#8E9299]">وجه نقد فیزیکی موجود</div>
            </div>

            <div className="bg-[#111113] p-5 rounded-3xl border border-[#222225] shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8E9299]">
                <span>کارتخوان پاسارگاد (POS):</span>
                <CreditCard className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-black text-sky-400 font-mono">
                {formatToman(treasurySummary?.posBalance || 0)}
              </div>
              <div className="text-[10px] text-[#8E9299]">حساب متصل به پایانه فروشگاهی</div>
            </div>

            <div className="bg-[#111113] p-5 rounded-3xl border border-[#222225] shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8E9299]">
                <span>گردش ورودی امروز:</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-[#F3F4F6] font-mono">
                {formatToman(treasurySummary?.todayInflow || 0)}
              </div>
              <div className="text-[10px] text-rose-400">
                خروجی امروز: {formatToman(treasurySummary?.todayOutflow || 0)}
              </div>
            </div>
          </div>

          {/* Treasury Transactions Ledger Table */}
          <div className="bg-[#111113] rounded-3xl p-6 border border-[#222225] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#222225]">
              <h3 className="text-sm font-black text-[#F3F4F6] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C9A227]" />
                <span>ریز گردش اسناد دفتر معین خزانه ({toPersianDigits(filteredTreasuryTx.length)} سند)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#222225] text-[#8E9299]">
                    <th className="pb-3 pr-2">تاریخ و زمان</th>
                    <th className="pb-3">نوع تراکنش</th>
                    <th className="pb-3">ماژول مرجع</th>
                    <th className="pb-3">حساب معین / شیوه</th>
                    <th className="pb-3">مبلغ (تومان)</th>
                    <th className="pb-3">شرح سند</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222225]/60">
                  {filteredTreasuryTx.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#8E9299]">
                        هنوز تراکنشی در دفتر معین خزانه با این فیلتر ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredTreasuryTx.map((tx) => {
                      const isPositive = tx.amount >= 0;
                      return (
                        <tr key={tx.id} className="hover:bg-[#161619] transition-colors">
                          <td className="py-3 pr-2 text-[#8E9299] font-mono text-[11px]">
                            {new Date(tx.createdAt).toLocaleDateString('fa-IR')} -{' '}
                            {new Date(tx.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPositive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {tx.transactionType === 'sale_income'
                                ? 'درآمد فروش'
                                : tx.transactionType === 'purchase_expense'
                                ? 'هزینه خرید'
                                : tx.transactionType === 'pos_settlement'
                                ? 'تسویه کارتخوان'
                                : tx.transactionType === 'cheque_cleared'
                                ? 'وصول چک'
                                : tx.transactionType === 'cash_in'
                                ? 'واریز دستی'
                                : 'برداشت دستی'}
                            </span>
                          </td>
                          <td className="py-3 text-[#E0E0E0] font-medium">
                            {tx.sourceModule === 'sales'
                              ? 'فروشگاه / POS'
                              : tx.sourceModule === 'purchases'
                              ? 'فاکتور خرید'
                              : tx.sourceModule === 'cheques'
                              ? 'مدیریت چک‌ها'
                              : tx.sourceModule === 'services'
                              ? 'خدمات چاپ'
                              : tx.sourceModule}
                          </td>
                          <td className="py-3 text-[#C9A227] font-medium">
                            {tx.accountTitle}
                          </td>
                          <td className="py-3 font-mono font-black">
                            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                              {isPositive ? '+' : ''}
                              {formatToman(tx.amount)}
                            </span>
                          </td>
                          <td className="py-3 text-[#8E9299] max-w-xs truncate">
                            {tx.description || 'بدون شرح'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Treasury Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161619] border border-[#2D2D33] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-[#F3F4F6] pb-2 border-b border-[#222225] flex items-center justify-between">
              <span>ثبت سند دستی نقدینگی و خزانه</span>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-[#8E9299] hover:text-[#E0E0E0] text-xs cursor-pointer"
              >
                بستن ✕
              </button>
            </h3>

            <form onSubmit={handleSaveVoucher} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8E9299] mb-1 font-bold">نوع عملیات:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoucherType('cash_in')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      voucherType === 'cash_in'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-[#111113] text-[#8E9299] border-[#2D2D33]'
                    }`}
                  >
                    واریز / دریافت به خزانه (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherType('cash_out')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      voucherType === 'cash_out'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                        : 'bg-[#111113] text-[#8E9299] border-[#2D2D33]'
                    }`}
                  >
                    برداشت / هزینه از خزانه (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#8E9299] mb-1 font-bold">مبلغ (تومان):</label>
                <input
                  type="number"
                  required
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(e.target.value)}
                  placeholder="مثلاً ۱۰۰۰۰۰"
                  className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8E9299] mb-1 font-bold">حساب معین:</label>
                <select
                  value={voucherAccount}
                  onChange={(e) => setVoucherAccount(e.target.value)}
                  className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none cursor-pointer"
                >
                  <option value="صندوق مرکزی">صندوق مرکزی فروشگاه</option>
                  <option value="کارتخوان پاسارگاد">کارتخوان پاسارگاد</option>
                  <option value="حساب بانکی ملت">حساب بانکی ملت</option>
                  <option value="حساب بانکی ملی">حساب بانکی ملی</option>
                  <option value="تنخواه‌گردان کارگاه">تنخواه‌گردان کارگاه</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8E9299] mb-1 font-bold">شیوه تسویه:</label>
                <select
                  value={voucherMethod}
                  onChange={(e) => setVoucherMethod(e.target.value)}
                  className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none cursor-pointer"
                >
                  <option value="cash">نقدی</option>
                  <option value="pos_pasargad">کارتخوان (POS)</option>
                  <option value="bank_transfer">انتقال شبا / کارت به کارت</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8E9299] mb-1 font-bold">شرح سند:</label>
                <textarea
                  rows={2}
                  value={voucherDesc}
                  onChange={(e) => setVoucherDesc(e.target.value)}
                  placeholder="توضیحات بابت دریافت یا پرداخت..."
                  className="w-full bg-[#111113] border border-[#2D2D33] focus:border-[#C9A227] rounded-xl px-3 py-2 text-[#E0E0E0] outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingVoucher}
                  className="flex-1 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>ثبت سند در دفتر معین</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="bg-[#111113] text-[#8E9299] hover:text-[#E0E0E0] px-4 py-2.5 rounded-xl border border-[#2D2D33] cursor-pointer"
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

