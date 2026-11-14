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

  // Fallback plans if none provided in props
  const displayPlans = plans && plans.length > 0 ? plans : [
    {
      id: 'plan-starter-30k',
      name: 'IGHO Stay Starter',
      monthlyPrice: 30000,
      annualPrice: 300000,
      trialDurationDays: 30,
      maxRooms: 20,
      maxStaff: 5,
      maxUsers: 10,
      productAccess: ['stay' as const],
      hasGuestPortal: false,
      active: true,
      features: [
        'Up to 20 Rooms & Suites',
        '5 Staff Accounts & Roles',
        '1 GB Organization Cloud Storage',
        'Front Desk Check-in & Check-out',
        'Live Room Inventory & Housekeeping',
        'Direct Hotel Bank Transfer Verification',
        'Guest Folios & Printable Receipts',
        'Guest Portal: Not Included (No Online Guest Booking)',
      ],
    },
    {
      id: 'plan-complete-50k',
      name: 'IGHO Stay Professional',
      monthlyPrice: 50000,
      annualPrice: 500000,
      trialDurationDays: 30,
      maxRooms: 999,
      maxStaff: 100,
      maxUsers: 200,
      productAccess: ['stay' as const],
      hasGuestPortal: true,
      active: true,
      features: [
        'Unlimited Rooms & Suites',
        '10 GB Organization Cloud Storage',
        'Direct Public Guest Booking Portal (Online Stays)',
        'Unlimited Staff Accounts with Custom Editable Roles',
        'Separate Caution Deposit Accounting & Refunds',
        'Multi-Branch Property Management',
        'Guest Inquiries, Reports & Service Dispatch',
        'Audit Logging & Financial Analytics Export',
        '24/7 Priority Support & Onboarding SLA',
      ],
    },
  ];

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
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-black/60 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => onNavigate('landing')} />
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-black text-xs">
                I
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">IGHO Stay</span>
              <span className="hidden sm:inline-block text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Partner Registration Approved
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-neutral-400 hidden md:inline truncate max-w-[180px]">
              {hotel.name || 'Your Hotel'}
            </span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-xs text-neutral-400 hover:text-white px-3 py-1 rounded-full border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full space-y-10">
        {/* Hero Banner: Approved status & Requirement explanation */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Registration Approved by Administration</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Select Your Subscription Plan
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Congratulations! <strong>{hotel.name}</strong> is approved. Select a subscription package to unlock your hotel dashboard, or activate a <strong>1-month free trial</strong> using a special access code.
          </p>
        </div>

        {/* SECTION 1: 1-MONTH FREE TRIAL WITH SPECIAL CODE (Requirement Focus) */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle glowing background orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider">
                  Special Offer
                </span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Valid for 1 Month (30 Days)
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                1-Month Free Trial with Special Access Code
              </h2>

              <p className="text-xs text-neutral-300 leading-relaxed">
                Try IGHO Stay with full platform access for 1 month: unlimited room management, live booking folios, front desk check-in/out, staff accounts, and your public guest booking page. No credit card required.
              </p>

              {/* Sample codes chips for convenience */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
                <span>Available Codes:</span>
                {['IGHO-TRIAL-30', 'IGHOFREE', 'TRIAL2026', 'FREETRIAL30'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setSpecialCode(code);
                      setCodeError(null);
                    }}
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-emerald-400 border border-neutral-700 hover:border-emerald-500 transition-colors cursor-pointer"
                    title="Click to fill this code"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Code Input Form */}
            <form onSubmit={handleActivateTrial} className="w-full lg:max-w-md bg-black/60 border border-neutral-800 p-5 rounded-2xl space-y-3 shrink-0">
              <div className="space-y-1 text-left">
                <label className="block text-xs font-bold text-neutral-200">
                  Enter Special Trial Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={specialCode}
                    onChange={(e) => {
                      setSpecialCode(e.target.value);
                      if (codeError) setCodeError(null);
                    }}
                    placeholder="e.g. IGHO-TRIAL-30"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-mono font-bold text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {codeError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{codeError}</span>
                </div>
              )}

              {trialSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{trialSuccessMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isActivatingTrial || !!trialSuccessMessage}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isActivatingTrial ? (
                  <IghoLoadingEmblem size="xs" inverted={true} speed="fast" />
                ) : trialSuccessMessage ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Redirecting to Hotel Dashboard...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black text-black" />
                    <span>Activate 1-Month Free Trial</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Instant activation · Valid for 30 days from today</span>
              </div>
            </form>
          </div>
        </div>

        {/* SECTION 2: PAID SUBSCRIPTION TIERS (PAYSTACK GATEWAY) */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white text-left">Or Select a Standard Subscription Plan</h2>
              <p className="text-xs text-neutral-400 text-left">Continuous uninterrupted access with priority support and scalable features</p>
            </div>

            {/* Monthly / Annual / 5-Year Contract Toggle */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-800 rounded-full border border-neutral-700">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-black font-extrabold">
                  -17%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('5year_contract')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === '5year_contract' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>5-Yr Contract</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-extrabold">
                  87% Lock
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {displayPlans.map((plan) => {
              const isPopular = plan.id.includes('complete') || plan.name.toLowerCase().includes('complete');
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

              return (
                <div
                  key={plan.id}
                  className={`bg-neutral-900 border rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                    isPopular
                      ? 'border-white/80 ring-1 ring-white/50 shadow-2xl bg-gradient-to-b from-neutral-800 to-neutral-900'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                      Includes Guest Portal
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {plan.maxRooms >= 999 ? 'Unlimited rooms capacity' : `Up to ${plan.maxRooms} rooms`}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-800">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-white">
                          ₦{price.toLocaleString()}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">{period}</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                          Billed annually (Includes 2 months free)
                        </p>
                      )}
                      {billingCycle === '5year_contract' && (
                        <p className="text-[11px] text-amber-300 mt-1 font-semibold">
                          87% fixed rate guaranteed for 5 years
                        </p>
                      )}
                    </div>

                    {/* Features list */}
                    <div className="space-y-2.5 pt-4 border-t border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                        INCLUDED FEATURES
                      </span>
                      <ul className="space-y-2 text-xs text-neutral-300">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => setSelectedPlanForPayment(plan)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-98 ${
                        isPopular
                          ? 'bg-white hover:bg-neutral-200 text-black'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Subscribe with Paystack</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Guarantee Trust Footnote */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Paystack Test Mode: Monthly card subscriptions auto-renew via Paystack Plans; Bank Transfer & USSD process as one-time payments requiring manual renewal.
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] shrink-0">
            <span>Need an enterprise invoice?</span>
            <button
              onClick={() => onNavigate('demo_request')}
              className="text-white hover:underline font-bold cursor-pointer"
            >
              Contact Support
            </button>
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
