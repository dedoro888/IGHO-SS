import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Repeat,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { ActiveScreen, SubscriptionPlan } from '../types';
import { IghoLoadingEmblem } from './IghoLogo';
import { getAuthHeaders } from '../utils/storageUpload';

interface PaystackSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'annual' | '5year_contract';
  hotelId: string;
  customerEmail: string;
  hotelName: string;
  returnScreen?: ActiveScreen;
  onSuccess: (paymentReference: string, verificationResult?: any) => void;
}

export const PENDING_PAYSTACK_STORAGE_KEY = 'igho_pending_paystack_checkout';

function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export const PaystackSubscriptionModal: React.FC<PaystackSubscriptionModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle,
  hotelId,
  customerEmail,
  hotelName,
  returnScreen = 'hotel_subscription_plan',
  onSuccess,
}) => {
  const recurringSupported = billingCycle === 'monthly';
  const [paymentMode, setPaymentMode] = useState<'paystack_recurring' | 'paystack_one_time'>(
    recurringSupported ? 'paystack_recurring' : 'paystack_one_time'
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [initializedSession, setInitializedSession] = useState<{
    reference: string;
    authorizationUrl: string;
    pendingSubscriptionId: string;
    autoRenew: boolean;
    organizationId: string;
  } | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const silentVerifyInFlightRef = useRef(false);
  const onSuccessCalledRef = useRef(false);

  useEffect(() => {
    if (!recurringSupported && paymentMode === 'paystack_recurring') {
      setPaymentMode('paystack_one_time');
    }
  }, [recurringSupported, paymentMode]);

  useEffect(() => {
    if (!isOpen) {
      setInitializedSession(null);
      setVerifiedResult(null);
      setErrorMsg(null);
      setIsInitializing(false);
      setIsVerifying(false);
      setCopiedUrl(false);
      silentVerifyInFlightRef.current = false;
      onSuccessCalledRef.current = false;
    }
  }, [isOpen]);

  const clearPendingStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(PENDING_PAYSTACK_STORAGE_KEY);
      localStorage.removeItem(PENDING_PAYSTACK_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const verifyReference = useCallback(
    async (reference: string, silent: boolean) => {
      if (!reference) return;
      if (silent && silentVerifyInFlightRef.current) return;
      if (onSuccessCalledRef.current) return;

      if (silent) {
        silentVerifyInFlightRef.current = true;
      } else {
        setErrorMsg(null);
        setIsVerifying(true);
      }

      try {
        const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
        if (!headers['Authorization']) {
          if (!silent) {
            throw new Error('Authentication session expired. Please sign in and retry verification.');
          }
          return;
        }

        const verifyRes = await fetch('/api/subscriptions/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({ reference }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));

        if (!verifyRes.ok || !verifyData.success) {
          if (!silent) {
            throw new Error(
              verifyData.message || 'Payment has not completed on Paystack yet. Complete checkout first, then verify again.'
            );
          }
          return;
        }

        clearPendingStorage();
        setIsVerifying(false);
        setVerifiedResult(verifyData);

        if (!onSuccessCalledRef.current) {
          onSuccessCalledRef.current = true;
          setTimeout(() => {
            onSuccess(reference, verifyData);
          }, 900);
        }
      } catch (err: any) {
        if (!silent) {
          setIsVerifying(false);
          setErrorMsg(err?.message || 'Verification failed.');
        }
      } finally {
        if (silent) {
          silentVerifyInFlightRef.current = false;
        }
      }
    },
    [clearPendingStorage, onSuccess]
  );

  // Auto-check verification when returning from the Paystack Checkout tab (focus / visibility / light poll)
  useEffect(() => {
    if (!isOpen || !initializedSession?.reference || verifiedResult) return;

    const ref = initializedSession.reference;
    const handleReturnFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      verifyReference(ref, true);
    };

    window.addEventListener('focus', handleReturnFocus);
    document.addEventListener('visibilitychange', handleReturnFocus);
    const pollId = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        verifyReference(ref, true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('focus', handleReturnFocus);
      document.removeEventListener('visibilitychange', handleReturnFocus);
      window.clearInterval(pollId);
    };
  }, [isOpen, initializedSession, verifiedResult, verifyReference]);

  if (!isOpen) return null;

  const displayedDueAmount =
    billingCycle === '5year_contract'
      ? plan.contractAnnualPrice || Math.round(plan.monthlyPrice * 12 * 0.87)
      : billingCycle === 'annual'
      ? plan.annualPrice
      : plan.monthlyPrice;

  const handleInitializeCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!hotelId) {
      setErrorMsg('Organization record not found. Please ensure your hotel profile is saved before subscribing.');
      return;
    }

    setIsInitializing(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      if (!headers['Authorization']) {
        throw new Error('Please sign in with your verified IGHO account before starting subscription checkout.');
      }

      const initRes = await fetch('/api/subscriptions/initialize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          paymentMode: recurringSupported ? paymentMode : 'paystack_one_time',
          organizationId: hotelId,
          returnScreen,
          clientOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      const rawInitText = await initRes.text().catch(() => '');
      let initData: any = {};
      try {
        initData = rawInitText ? JSON.parse(rawInitText) : {};
      } catch {
        initData = {};
      }
      if (!initRes.ok || !initData.success || !initData.authorizationUrl) {
        const detail =
          initData.message ||
          initData.error ||
          (rawInitText && !rawInitText.trim().startsWith('<') ? rawInitText.slice(0, 180) : '') ||
          `Server returned HTTP ${initRes.status || 'error'}`;
        throw new Error(`Unable to initialize Paystack Test checkout (${detail}).`);
      }

      const sessionRecord = {
        reference: initData.reference,
        authorizationUrl: initData.authorizationUrl,
        pendingSubscriptionId: initData.pendingSubscriptionId,
        autoRenew: Boolean(initData.autoRenew),
        organizationId: initData.organizationId || hotelId,
        returnScreen,
        savedAt: Date.now(),
      };

      try {
        const serialized = JSON.stringify(sessionRecord);
        sessionStorage.setItem(PENDING_PAYSTACK_STORAGE_KEY, serialized);
        localStorage.setItem(PENDING_PAYSTACK_STORAGE_KEY, serialized);
      } catch {
        // Ignore storage errors if third-party storage is restricted
      }

      setInitializedSession(sessionRecord);
      setIsInitializing(false);

      // In a standalone browser window (published/shared URL), redirect cleanly to Paystack Checkout.
      // When embedded in an iframe preview, render the target="_blank" checkout CTA so sandbox rules never block navigation.
      if (!isRunningInIframe()) {
        window.location.assign(initData.authorizationUrl);
      }
    } catch (err: any) {
      setIsInitializing(false);
      setErrorMsg(err?.message || 'Unable to initialize Paystack checkout.');
    }
  };

  const handleCopyCheckoutUrl = async () => {
    if (!initializedSession?.authorizationUrl) return;
    try {
      await navigator.clipboard.writeText(initializedSession.authorizationUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setErrorMsg(`Checkout URL: ${initializedSession.authorizationUrl}`);
    }
  };

  const handleVerifyPayment = async () => {
    if (!initializedSession?.reference) return;
    await verifyReference(initializedSession.reference, false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-neutral-100 flex flex-col max-h-[92vh]">
        {/* Paystack Header Banner */}
        <div className="bg-[#0BA4DB] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm tracking-tight text-white">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium tracking-wide uppercase text-white/90">
                  Paystack Hosted Checkout
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-300 text-neutral-950">
                  Test Mode
                </span>
              </div>
              <div className="text-sm font-bold text-white tracking-tight">IGHO Stay Subscription Billing</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout modal"
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan Summary Header */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <div className="text-[11px] text-neutral-500 font-medium truncate">
              {hotelName} · {customerEmail}
            </div>
            <div className="text-xs font-bold text-neutral-900 truncate">
              {plan.name} ({billingCycle === '5year_contract' ? '5-Year Contract' : billingCycle})
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Amount Due</div>
            <div className="text-lg font-black text-black tabular-nums">₦{displayedDueAmount.toLocaleString()}</div>
          </div>
        </div>

        {verifiedResult ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-neutral-900">Payment Verified (Test Mode)</h3>
              <p className="text-xs text-neutral-500">
                {verifiedResult.autoRenew
                  ? 'Your recurring Paystack card subscription is now active and organization entitlements are unlocked.'
                  : 'Your one-time subscription payment is verified and organization entitlements are active for this term.'}
              </p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 font-mono text-center break-all">
              Ref: {verifiedResult.reference}
            </div>
            <div className="flex items-center justify-center py-2">
              <IghoLoadingEmblem size="sm" speed="fast" />
            </div>
          </div>
        ) : initializedSession ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2 text-xs">
              <div className="font-bold text-sky-950 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#0BA4DB]" />
                <span>Complete Payment on Paystack Checkout</span>
              </div>
              <p className="text-sky-900 leading-relaxed text-[11px]">
                A Paystack Test transaction has been initialized for <strong>{hotelName}</strong>. Tap the button below
                to open Paystack&apos;s secure checkout page in a new browser tab. Once you finish paying, return here
                or let verification complete automatically.
              </p>
              <div className="pt-1 font-mono text-[11px] text-sky-800 break-all">
                Ref: {initializedSession.reference}
              </div>
            </div>

            <a
              href={initializedSession.authorizationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#0BA4DB] hover:bg-[#0993C5] text-white py-3.5 rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Paystack Checkout</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleCopyCheckoutUrl}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 py-2.5 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Checkout Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Paystack Checkout Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleVerifyPayment}
              disabled={isVerifying}
              className="w-full border border-neutral-300 hover:bg-neutral-50 text-neutral-900 py-3 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <IghoLoadingEmblem size="xs" inverted={true} speed="fast" />
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>I Have Completed Checkout — Verify Payment</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-neutral-500 text-center">
              {initializedSession.autoRenew
                ? 'Mode: Auto-renewing monthly card subscription (Paystack Test Plan).'
                : 'Mode: One-time payment — manual renewal required at period end.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleInitializeCheckout} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                Select Payment Arrangement
              </label>

              {/* Option 1: Auto-Renewing Card Subscription (Paystack Plan) */}
              <button
                type="button"
                disabled={!recurringSupported}
                onClick={() => recurringSupported && setPaymentMode('paystack_recurring')}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                  !recurringSupported
                    ? 'border-neutral-200 bg-neutral-50 opacity-60 cursor-not-allowed'
                    : paymentMode === 'paystack_recurring'
                    ? 'border-[#0BA4DB] bg-sky-50/50 cursor-pointer'
                    : 'border-neutral-200 hover:border-neutral-300 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CreditCard className="w-4 h-4 text-[#0BA4DB] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <span>Card — Auto-Renewing Subscription</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          <Repeat className="w-2.5 h-2.5" /> Auto-Renew
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                        {recurringSupported
                          ? 'Attaches to the Paystack monthly subscription plan for automatic card billing each month.'
                          : 'Monthly Paystack recurring plans are available on the Monthly billing cycle only.'}
                      </p>
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 2: Non-Recurring One-Time Payment (Bank Transfer / USSD / Fixed Term) */}
              <button
                type="button"
                onClick={() => setPaymentMode('paystack_one_time')}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMode === 'paystack_one_time'
                    ? 'border-[#0BA4DB] bg-sky-50/50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                      <span>One-Time Payment (Bank Transfer / USSD / Card)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                        Manual Renewal Required
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                      Bank transfer and USSD payments on Paystack do not create an auto-renewing subscription. You will
                      renew manually at the end of this billing period.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <span>
                Paystack gateway fees are absorbed by IGHO. Plan pricing and entitlements are validated securely on the
                server before checkout starts.
              </span>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isInitializing}
                className="w-full bg-[#0BA4DB] hover:bg-[#0993C5] text-white py-3.5 rounded-full font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isInitializing ? (
                  <IghoLoadingEmblem size="xs" speed="fast" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Proceed to Paystack Checkout (₦{displayedDueAmount.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-400 pt-2 border-t border-neutral-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paystack Test Mode · Server-Verified Transaction · Raw Webhook HMAC</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
