import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Truck,
  CreditCard,
  Sparkles,
  CheckCircle2,
  User,
  KeyRound,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { formatToman, toPersianDigits } from '../../lib/utils';
import { api } from '../../lib/api';
import { useToast } from '../common/Toast';
import { MandatoryProfileModal } from '../customer/MandatoryProfileModal';

export const CartDrawer: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice, isCartOpen, setIsCartOpen } = useCart();
  const { customer, isAuthenticated, openAuthModal, isProfileCompleted, refreshCustomer, totalPurchaseAmount } = useCustomerAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [shippingMethod, setShippingMethod] = useState('courier');
  const [paymentGateway, setPaymentGateway] = useState('zarinpal');
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Sync state when customer logs in or changes
  useEffect(() => {
    if (customer) {
      if (customer.name) setCustomerName(customer.name);
      if (customer.mobile) setCustomerMobile(customer.mobile);
      if (customer.fullAddress || customer.address) setCustomerAddress(customer.fullAddress || customer.address || '');
      if (customer.postalCode) setPostalCode(customer.postalCode);
      if (customer.province) setProvince(customer.province);
      if (customer.city) setCity(customer.city);
    }
  }, [customer]);

  const shippingCost = totalPrice >= 300000 ? 0 : 35000;
  const finalPayable = Math.max(0, totalPrice + shippingCost - discountAmount);

  // Check if purchase exceeds 100,000 Toman threshold requiring profile completion
  const isHighValuePurchase = finalPayable >= 100000 || (totalPurchaseAmount + finalPayable) >= 100000;
  const needsProfileCompletion = isAuthenticated && isHighValuePurchase && !isProfileCompleted;

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    if (couponCode.toUpperCase() === 'KHATINOO10' || couponCode.toUpperCase() === 'NOROOZ' || couponCode.toUpperCase() === 'KHATINOO') {
      const disc = Math.round(totalPrice * 0.1);
      setDiscountAmount(disc);
      showToast(`کد تخفیف ۱۰٪ با موفقیت اعمال شد (${formatToman(disc)} تخفیف).`, 'success');
    } else {
      showToast('کد تخفیف وارد شده معتبر نیست یا منقضی شده است.', 'error');
    }
  };

  const handleProceedToCheckout = () => {
    if (needsProfileCompletion) {
      setShowProfileModal(true);
      return;
    }
    setStep('checkout');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerMobile.trim() || !customerAddress.trim()) {
      showToast('لطفاً تمامی مشخصات گیرنده و آدرس را تکمیل فرمایید.', 'warning');
      return;
    }

    const cleanMobile = customerMobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      showToast('شماره تلفن همراه معتبر نیست.', 'warning');
      return;
    }

    // If purchase is over threshold and customer is logged in, verify profile completion
    if (isHighValuePurchase && isAuthenticated && !isProfileCompleted && (!postalCode || postalCode.length < 10)) {
      setShowProfileModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerId: customer?.id,
        customerName: customerName.trim(),
        customerMobile: cleanMobile,
        customerAddress: customerAddress.trim(),
        customerPostalCode: postalCode.trim() || customer?.postalCode,
        customerProvince: province || customer?.province,
        customerCity: city || customer?.city,
        customerEmail: customer?.email,
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.selectedPrice,
          totalPrice: i.selectedPrice * i.quantity,
        })),
        shippingMethodCode: shippingMethod,
        paymentGatewayCode: paymentGateway,
        couponCode: couponCode || undefined,
      };

      const result = await api.placeOrder(orderPayload);
      if (result.success) {
        setCompletedOrder(result.order);
        setStep('success');
        clearCart();
        refreshCustomer();
        showToast('سفارش شما با موفقیت ثبت شد و پیامک تایید ارسال گردید.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت سفارش', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-xs"
        />

        <div className="absolute inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-[#111113] border-r border-[#222225] text-[#E0E0E0] shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 bg-[#0A0A0B] border-b border-[#222225] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#F3F4F6]">
                  {step === 'cart' ? 'سبد خرید شما' : step === 'checkout' ? 'تکمیل اطلاعات و پرداخت' : 'تایید نهایی سفارش'}
                </h2>
                {cart.length > 0 && step === 'cart' && (
                  <span className="bg-[#C9A227] text-slate-950 text-xs font-black px-2 py-0.5 rounded-full">
                    {toPersianDigits(cart.length)} قلم
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setStep('cart');
                }}
                className="p-1.5 text-[#8E9299] hover:text-[#E0E0E0] rounded-lg hover:bg-[#161619] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* STEP 1: CART ITEMS */}
              {step === 'cart' && (
                <>
                  {/* Customer Auth Quick Banner */}
                  {!isAuthenticated ? (
                    <div className="p-3 rounded-2xl bg-[#161619] border border-[#2D2D33] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#C9A227]" />
                        <span className="text-xs text-[#E0E0E0] font-medium">عضو فروشگاه هستید؟</span>
                      </div>
                      <button
                        onClick={() => openAuthModal('برای اعمال تخفیف و ذخیره فاکتور در حسابتان وارد شوید.')}
                        className="bg-[#C9A227]/20 hover:bg-[#C9A227]/30 text-[#C9A227] text-xs font-bold px-3 py-1 rounded-xl transition-colors cursor-pointer"
                      >
                        ورود با پیامک
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-[#C9A227]/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#C9A227]" />
                        <span className="text-[#F3F4F6] font-bold">
                          خرید با حساب: {customer?.name || toPersianDigits(customer?.mobile || '')}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-bold">متصل به حساب</span>
                    </div>
                  )}

                  {cart.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-[#161619] border border-[#222225] flex items-center justify-center mx-auto text-[#8E9299]">
                        <Truck className="w-8 h-8 text-[#C9A227]" />
                      </div>
                      <div className="text-[#F3F4F6] font-bold text-sm">سبد خرید شما خالی است</div>
                      <p className="text-xs text-[#8E9299] max-w-xs mx-auto">
                        از میان کالاهای متنوع و دفترهای تولیدی خطی‌نو، اقلام مورد نیاز خود را انتخاب کنید.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-3 p-3 rounded-2xl border border-[#222225] bg-[#161619] hover:border-[#2D2D33] transition-colors"
                        >
                          <img
                            src={item.product.image || 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=200&auto=format&fit=crop&q=80'}
                            alt={item.product.name}
                            className="w-16 h-16 object-contain rounded-xl bg-[#0A0A0B] p-1 border border-[#222225]"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#F3F4F6] truncate">{item.product.name}</h4>
                            <div className="text-xs text-[#8E9299] mt-0.5">{formatToman(item.selectedPrice)}</div>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1.5 bg-[#0A0A0B] rounded-lg p-0.5 border border-[#2D2D33]">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-[#1C1C20] text-[#E0E0E0] font-bold text-xs hover:bg-[#25252A] flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-[#F3F4F6]">
                                  {toPersianDigits(item.quantity)}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.product.stock}
                                  className="w-6 h-6 rounded bg-[#1C1C20] text-[#E0E0E0] font-bold text-xs hover:bg-[#25252A] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs font-black text-[#C9A227]">
                                {formatToman(item.selectedPrice * item.quantity)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[#8E9299] hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: CHECKOUT FORM */}
              {step === 'checkout' && (
                <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
                  {/* Threshold Notification for Profile */}
                  {isHighValuePurchase && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-[#C9A227]/40 text-[#C9A227] text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        سفارش بالای ۱۰۰ هزار تومان جهت صدور بارنامه رسمی و ارسال پستی مستلزم ثبت آدرس و کد پستی دقیق است.
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-bold text-[#E0E0E0]">نام و نام خانوادگی تحویل‌گیرنده:</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="مثال: علی حسینی"
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#E0E0E0]">شماره موبایل جهت هماهنگی و پیامک:</label>
                    <input
                      type="tel"
                      required
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="09123456789"
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-[#E0E0E0]">استان:</label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="تهران"
                        className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#E0E0E0]">شهر:</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="تهران"
                        className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#E0E0E0]">کد پستی ۱۰ رقمی:</label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={10}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="1234567890"
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#E0E0E0]">آدرس دقیق پستی:</label>
                    <textarea
                      required
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="خیابان، پلاک، واحد..."
                      className="w-full bg-[#161619] border border-[#2D2D33] rounded-xl p-2.5 text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none"
                    />
                  </div>

                  {/* Shipping Method */}
                  <div className="space-y-1.5 pt-2">
                    <label className="font-bold text-[#E0E0E0]">شیوه ارسال مرسوله:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                        shippingMethod === 'courier' ? 'border-[#C9A227] bg-[#1C1C20]' : 'border-[#2D2D33] bg-[#161619]'
                      }`}>
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingMethod === 'courier'}
                          onChange={() => setShippingMethod('courier')}
                          className="accent-[#C9A227]"
                        />
                        <div>
                          <div className="font-bold text-[#F3F4F6]">پیک فوری / تیپاکس</div>
                          <div className="text-[10px] text-[#8E9299]">تحویل ۲۴ ساعته</div>
                        </div>
                      </label>
                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                        shippingMethod === 'post' ? 'border-[#C9A227] bg-[#1C1C20]' : 'border-[#2D2D33] bg-[#161619]'
                      }`}>
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingMethod === 'post'}
                          onChange={() => setShippingMethod('post')}
                          className="accent-[#C9A227]"
                        />
                        <div>
                          <div className="font-bold text-[#F3F4F6]">پست پیشتاز سراسری</div>
                          <div className="text-[10px] text-[#8E9299]">تحویل ۲ تا ۳ روز کاری</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Gateway */}
                  <div className="space-y-1.5 pt-2">
                    <label className="font-bold text-[#E0E0E0]">درگاه امن پرداخت آنلاین:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                        paymentGateway === 'zarinpal' ? 'border-[#C9A227] bg-[#1C1C20]' : 'border-[#2D2D33] bg-[#161619]'
                      }`}>
                        <input
                          type="radio"
                          name="gateway"
                          checked={paymentGateway === 'zarinpal'}
                          onChange={() => setPaymentGateway('zarinpal')}
                          className="accent-[#C9A227]"
                        />
                        <span className="font-bold text-[#F3F4F6]">زرین‌پال (شاپرک)</span>
                      </label>
                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                        paymentGateway === 'pasargad_online' ? 'border-[#C9A227] bg-[#1C1C20]' : 'border-[#2D2D33] bg-[#161619]'
                      }`}>
                        <input
                          type="radio"
                          name="gateway"
                          checked={paymentGateway === 'pasargad_online'}
                          onChange={() => setPaymentGateway('pasargad_online')}
                          className="accent-[#C9A227]"
                        />
                        <span className="font-bold text-[#F3F4F6]">بانک پاسارگاد</span>
                      </label>
                    </div>
                  </div>

                  {/* Coupon */}
                  <div className="pt-2">
                    <label className="font-bold text-[#E0E0E0] block mb-1">کد تخفیف دارید؟</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="مثال: KHATINOO10"
                        className="flex-1 bg-[#161619] border border-[#2D2D33] rounded-xl p-2 font-mono uppercase text-center text-[#E0E0E0] placeholder-[#8E9299] focus:border-[#C9A227] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-[#2D2D33] hover:bg-[#3D3D45] text-[#E0E0E0] px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                      >
                        اعمال کد
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 3: SUCCESS CONFIRMATION */}
              {step === 'success' && completedOrder && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#161619] border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-black text-[#F3F4F6]">سفارش شما با موفقیت ثبت شد!</h3>
                  <p className="text-xs text-[#8E9299] leading-relaxed max-w-xs mx-auto">
                    شماره پیگیری و فاکتور شما صادر شد. پیامک تایید با جزییات سفارش به شماره {toPersianDigits(completedOrder.customerMobile)} ارسال گردید.
                  </p>

                  <div className="bg-[#161619] border border-[#222225] rounded-2xl p-4 text-xs space-y-2 text-right">
                    <div className="flex justify-between border-b border-[#222225] pb-1.5">
                      <span className="text-[#8E9299]">شماره سفارش:</span>
                      <span className="font-mono font-bold text-[#C9A227]">{completedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222225] pb-1.5">
                      <span className="text-[#8E9299]">کد پیگیری مرسوله:</span>
                      <span className="font-mono font-bold text-slate-200">{completedOrder.trackingCode || 'در انتظار صدور بارنامه'}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222225] pb-1.5">
                      <span className="text-[#8E9299]">مبلغ پرداخت شده:</span>
                      <span className="font-bold text-[#F3F4F6]">{formatToman(completedOrder.finalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8E9299]">وضعیت سفارش:</span>
                      <span className="font-bold text-emerald-400">در حال پردازش و بسته‌بندی</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {cart.length > 0 && step !== 'success' && (
              <div className="p-4 sm:p-6 bg-[#0A0A0B] border-t border-[#222225] space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#8E9299]">
                    <span>جمع کل اقلام:</span>
                    <span>{formatToman(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-[#8E9299]">
                    <span>هزینه بسته‌بندی و ارسال:</span>
                    <span>{shippingCost === 0 ? 'رایگان (سفارش بالای ۳۰۰ تومان)' : formatToman(shippingCost)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>تخفیف:</span>
                      <span>- {formatToman(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#F3F4F6] font-black text-sm pt-2 border-t border-[#222225]">
                    <span>مبلغ قابل پرداخت:</span>
                    <span className="text-[#C9A227] text-base">{formatToman(finalPayable)}</span>
                  </div>
                </div>

                {step === 'cart' ? (
                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-3 rounded-xl transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ادامه و تکمیل مشخصات سفارش</span>
                    <ArrowLeft className="w-4 h-4 text-black" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('cart')}
                      className="w-1/3 bg-[#1C1C20] hover:bg-[#25252A] text-[#E0E0E0] border border-[#2D2D33] font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      بازگشت
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="w-2/3 bg-[#C9A227] hover:bg-[#B38E1E] text-slate-950 font-black py-3 rounded-xl transition-all shadow-md shadow-[#C9A227]/20 flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4 text-black" />
                      <span>{isSubmitting ? 'در حال اتصال به شاپرک...' : 'پرداخت آنلاین و ثبت نهایی'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="p-4 sm:p-6 bg-[#0A0A0B] border-t border-[#222225]">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setStep('cart');
                  }}
                  className="w-full bg-[#1C1C20] hover:bg-[#25252A] text-[#E0E0E0] border border-[#2D2D33] font-bold py-3 rounded-xl transition-colors text-xs cursor-pointer"
                >
                  بستن و ادامه خرید
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mandatory Profile Completion Modal */}
      <MandatoryProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={() => {
          setStep('checkout');
        }}
        reasonText="ثبت سفارش بالای ۱۰۰ هزار تومان نیازمند تکمیل اطلاعات پستی و کد پستی است."
      />
    </>
  );
};
