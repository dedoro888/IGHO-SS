import React, { useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Sparkles,
  KeyRound,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Zap,
  Lock,
} from 'lucide-react';
import { Hotel, SubscriptionPlan, ActiveScreen } from '../types';
import { INITIAL_PLANS } from '../data/platformData';
import { BackButton } from './BackButton';
import { PaystackSubscriptionModal } from './PaystackSubscriptionModal';
import { IghoLoadingEmblem } from './IghoLogo';

interface HotelSubscriptionPlanScreenProps {
  hotel: Hotel;
  plans: SubscriptionPlan[];
  currentUserEmail?: string;
  onSubscriptionActivated: (updatedHotel: Hotel) => void;
  onNavigate: (screen: ActiveScreen) => void;
  onSignOut?: () => void;
}

export const HotelSubscriptionPlanScreen: React.FC<HotelSubscriptionPlanScreenProps> = ({
  hotel,
  plans,
  currentUserEmail = '',
  onSubscriptionActivated,
  onNavigate,
  onSignOut,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual' | '5year_contract'>('monthly');
  const [specialCode, setSpecialCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [trialSuccessMessage, setTrialSuccessMessage] = useState<string | null>(null);

  // Paystack checkout modal state
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);

  // Authoritative fallback plans sourced from platformData
  const displayPlans = plans && plans.length > 0 ? plans : INITIAL_PLANS;

  // Handle Free Trial Activation with Authoritative Pre-Generated Token
  const handleActivateTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const cleanCode = specialCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeError('Please enter a special trial code issued from the IGHO Console.');
      return;
    }

    setIsActivatingTrial(true);

    try {
      const res = await fetch('/api/trial-tokens/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          hotelId: hotel.id,
          hotelName: hotel.name,
          redeemedByEmail: currentUserEmail || hotel.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsActivatingTrial(false);
        setCodeError(data.message || 'Invalid or expired trial token.');
        return;
      }

      const now = new Date();
      const durationDays = data.token?.durationDays || 30;
      const trialEndDate =
        data.token?.endDate || new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const updatedHotel: Hotel = {
        ...hotel,
        ...(data.hotel || {}),
        isLive: true,
        status: 'active',
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        subscriptionStatus: 'trial',
        subscriptionPlanId: hotel.subscriptionPlanId || 'plan-starter-30k',
        subscriptionPlanName: hotel.subscriptionPlanName || '1-Month Free Trial',
        billingCycle: 'monthly',
        trialCode: cleanCode,
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate,
      };

      setTrialSuccessMessage(
        data.message ||
          `Token "${cleanCode}" verified! Your Free Trial is active until ${new Date(trialEndDate).toLocaleDateString()}.`
      );
      setIsActivatingTrial(false);

      setTimeout(() => {
        onSubscriptionActivated(updatedHotel);
      }, 900);
    } catch {
      setIsActivatingTrial(false);
      setCodeError('Unable to connect to server to verify trial token. Please try again.');
    }
  };

  // Handle Paid Plan Activation via Server-Verified Paystack Result
  const handlePaystackSuccess = (_paymentReference: string, verificationResult?: any) => {
    if (!selectedPlanForPayment || !verificationResult?.success) return;

    const updatedHotel: Hotel = {
      ...hotel,
      ...(verificationResult.hotel || {}),
      isLive: true,
      status: 'active',
      approvalStatus: 'approved',
      paymentStatus: 'paid',
      subscriptionStatus: verificationResult.status || 'active',
      subscriptionPlanId: verificationResult.planId || selectedPlanForPayment.id,
      subscriptionPlanName: verificationResult.planName || selectedPlanForPayment.name,
      packageType: verificationResult.hasGuestPortal ? 'complete' : 'management',
      hasGuestPortal: Boolean(verificationResult.hasGuestPortal),
      privileges: verificationResult.privileges || selectedPlanForPayment.privileges || hotel.privileges,
      billingCycle: verificationResult.billingCycle || billingCycle,
      paymentMode: verificationResult.paymentMode,
      paystackMode: verificationResult.mode || 'test',
      autoRenew: Boolean(verificationResult.autoRenew),
      paystackCustomerCode: verificationResult.paystackCustomerCode || hotel.paystackCustomerCode,
      paystackSubscriptionCode: verificationResult.paystackSubscriptionCode || hotel.paystackSubscriptionCode,
      isContractPlan: (verificationResult.billingCycle || billingCycle) === '5year_contract',
      subscriptionStartDate: verificationResult.startDate || hotel.subscriptionStartDate,
      subscriptionEndDate: verificationResult.endDate || hotel.subscriptionEndDate,
    };

    setSelectedPlanForPayment(null);
    onSubscriptionActivated(updatedHotel);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => onNavigate('landing')} />
            <div className="h-4 w-px bg-neutral-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-black text-xs shadow-xs">
                I
              </div>
              <span className="font-extrabold text-sm tracking-tight text-black">IGHO Stay</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Partner Registration Approved
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-neutral-500 hidden md:inline truncate max-w-[220px]">
              {hotel.name || 'Your Hotel'}
            </span>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs font-semibold text-neutral-600 hover:text-black px-3.5 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-12 w-full space-y-10">
        {/* Centered Flexible Plans Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-neutral-700 border border-neutral-200 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Flexible Plans · Hospitality SaaS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight leading-[1.1]">
            Built for Growth at Every Stage
          </h1>

          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            Congratulations! <strong className="text-neutral-900">{hotel.name}</strong> is approved. Select Starter or Professional to unlock your dashboard immediately, or activate a 30-day free trial with an official access token.
          </p>

          {/* Centered Monthly / Annual / 5-Year Contract Toggle */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1.5 bg-neutral-200/70 rounded-full border border-neutral-200">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold">
                  -17%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('5year_contract')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === '5year_contract'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>5-Yr Contract</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-300 text-black font-extrabold">
                  87% Lock
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Framed Pricing Comparison Showcase (Screenshot-inspired Light Card vs Elevated Obsidian Popular Card) */}
        <div className="bg-neutral-100/90 border border-neutral-200/80 rounded-[28px] p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch text-left">
            {displayPlans.map((plan) => {
              const isPopular =
                plan.id.includes('complete') ||
                plan.name.toLowerCase().includes('complete') ||
                plan.name.toLowerCase().includes('professional') ||
                plan.monthlyPrice >= 50000;
              const price =
                billingCycle === '5year_contract'
                  ? plan.contractAnnualPrice || Math.round(plan.monthlyPrice * 12 * 0.87)
                  : billingCycle === 'annual'
                  ? plan.annualPrice
                  : plan.monthlyPrice;
              const period =
                billingCycle === '5year_contract'
                  ? '/year (5-yr fixed)'
                  : billingCycle === 'annual'
                  ? '/year'
                  : '/month';
              const storageGb = plan.storageQuotaGb || (isPopular ? 50 : 10);
              const propertyCount = plan.maxBranches || (isPopular ? 3 : 1);

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                    isPopular
                      ? 'bg-[#0F111A] text-white border border-neutral-800 shadow-2xl md:-my-2'
                      : 'bg-white text-neutral-900 border border-neutral-200/90 shadow-sm hover:border-neutral-300'
                  }`}
                >
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
                          isPopular
                            ? 'bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 text-white'
                            : 'bg-neutral-900 text-white'
                        }`}
                      >
                        {isPopular ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>

                      {isPopular && (
                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                          POPULAR
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className={`font-black text-xl tracking-tight ${isPopular ? 'text-white' : 'text-black'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-xs mt-1 ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} · Up to {plan.maxRooms} rooms · {plan.maxStaff} active staff · {storageGb} GB cloud
                      </p>
                    </div>

                    <div className={`pt-4 border-t ${isPopular ? 'border-neutral-800' : 'border-neutral-100'}`}>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`font-mono text-3xl sm:text-4xl font-black tracking-tight ${isPopular ? 'text-white' : 'text-black'}`}>
                          ₦{price.toLocaleString()}
                        </span>
                        <span className={`text-xs font-semibold ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {period}
                        </span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className={`text-[11px] mt-1 font-semibold ${isPopular ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Billed annually (Includes 2 months free)
                        </p>
                      )}
                      {billingCycle === '5year_contract' && (
                        <p className={`text-[11px] mt-1 font-semibold ${isPopular ? 'text-amber-300' : 'text-amber-700'}`}>
                          87% fixed rate guaranteed for 5 years
                        </p>
                      )}
                    </div>

                    <div className={`space-y-2.5 pt-4 border-t ${isPopular ? 'border-neutral-800' : 'border-neutral-100'}`}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider block ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {isPopular ? "Everything in Starter, plus:" : "What's included:"}
                      </span>
                      <ul className={`space-y-2.5 text-xs ${isPopular ? 'text-neutral-200' : 'text-neutral-700'}`}>
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <span className="leading-relaxed">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => setSelectedPlanForPayment(plan)}
                      className={`w-full py-3 px-5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 ${
                        isPopular
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
                          : 'bg-black hover:bg-neutral-800 text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Subscribe with Paystack</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1-Month Free Trial with Special Access Code */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl text-left">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[10px] uppercase tracking-wider">
                  Trial Access Token
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Valid for 1 Month (30 Days)
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                Have an Official 1-Month Free Trial Code?
              </h2>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Evaluate IGHO Stay for 30 days with room inventory, front desk check-in/out, billing & receipts, and staff permissions before committing to a paid subscription.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                <span>Available Codes:</span>
                {['IGHO-TRIAL-30', 'IGHOFREE', 'TRIAL2026', 'FREETRIAL30'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setSpecialCode(code);
                      setCodeError(null);
                    }}
                    className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 hover:border-black transition-colors cursor-pointer"
                    title="Click to fill this code"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleActivateTrial} className="w-full lg:max-w-md bg-[#F8FAFC] border border-neutral-200 p-5 rounded-2xl space-y-3 shrink-0">
              <div className="space-y-1 text-left">
                <label className="block text-xs font-bold text-neutral-800">
                  Enter Special Trial Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={specialCode}
                    onChange={(e) => {
                      setSpecialCode(e.target.value);
                      if (codeError) setCodeError(null);
                    }}
                    placeholder="e.g. IGHO-TRIAL-30"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm font-mono font-bold text-black uppercase placeholder:normal-case placeholder:font-normal placeholder:text-neutral-400 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {codeError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{codeError}</span>
                </div>
              )}

              {trialSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{trialSuccessMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isActivatingTrial || !!trialSuccessMessage}
                className="w-full py-3 px-4 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isActivatingTrial ? (
                  <IghoLoadingEmblem size="xs" inverted={false} speed="fast" />
                ) : trialSuccessMessage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Redirecting to Hotel Dashboard...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Activate 1-Month Free Trial</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant activation · Valid for 30 days from today</span>
              </div>
            </form>
          </div>
        </div>

        {/* Soft Iridescent Consultation Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-50 via-fuchsia-50 to-sky-100 border border-neutral-200/80 p-6 sm:p-8 text-center space-y-3 shadow-xs">
          <h3 className="text-base sm:text-lg font-black text-black">
            Not sure which plan fits your property?
          </h3>
          <p className="text-xs text-neutral-600 max-w-md mx-auto">
            Need multi-branch enterprise invoicing or a guided walkthrough for your hotel management team?
          </p>
          <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('demo_request')}
              className="px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Request Guided Walkthrough</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="pt-3 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Paystack Test Mode: Monthly card subscriptions auto-renew via Paystack Plans; Bank Transfer & USSD process as one-time payments.
            </span>
          </div>
        </div>
      </main>

      {/* Paystack Payment Modal */}
      {selectedPlanForPayment && (
        <PaystackSubscriptionModal
          isOpen={!!selectedPlanForPayment}
          onClose={() => setSelectedPlanForPayment(null)}
          plan={selectedPlanForPayment}
          billingCycle={billingCycle}
          hotelId={hotel.id}
          customerEmail={currentUserEmail || hotel.email || ''}
          hotelName={hotel.name || 'Your Hotel'}
          returnScreen="hotel_subscription_plan"
          onSuccess={handlePaystackSuccess}
        />
      )}
    </div>
  );
};
