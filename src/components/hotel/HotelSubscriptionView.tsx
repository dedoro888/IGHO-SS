import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  Lock,
} from 'lucide-react';
import { Hotel, SubscriptionPlan } from '../../types';
import { INITIAL_PLANS } from '../../data/platformData';
import { PaystackSubscriptionModal } from '../PaystackSubscriptionModal';

interface HotelSubscriptionViewProps {
  hotel: Hotel;
  plans?: SubscriptionPlan[];
  onUpgradePlan?: (planId: string, billingCycle: 'monthly' | 'annual') => void;
}

export const HotelSubscriptionView: React.FC<HotelSubscriptionViewProps> = ({
  hotel,
  plans = INITIAL_PLANS,
  onUpgradePlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    hotel.packageType === 'complete' ? plans[1]?.id || plans[0]?.id : plans[0]?.id || 'plan-1'
  );
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [planToPay, setPlanToPay] = useState<SubscriptionPlan>(plans[0]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [updatePaymentModal, setUpdatePaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Mastercard ending in 4821');

  // Check if hotel registration is pending approval
  const isPendingApproval = hotel.approvalStatus === 'pending' || !hotel.isLive;

  // Active plan calculations
  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const activePlanPrice = billingCycle === 'annual' ? activePlan?.annualPrice : activePlan?.monthlyPrice;

  // Payment history records
  const [paymentHistory, setPaymentHistory] = useState([
    {
      id: 'tx-1',
      date: 'Sep 1, 2026',
      plan: activePlan?.name || 'Plan 1 — Starter',
      amount: activePlanPrice || 30000,
      billingCycle: 'monthly',
      gateway: 'Paystack',
      reference: 'pstk_sub_8492048192',
      status: 'success',
    },
  ]);

  const handleOpenPaystack = (targetPlan: SubscriptionPlan) => {
    if (isPendingApproval) return;
    setPlanToPay(targetPlan);
    setShowPaystackModal(true);
  };

  const handlePaystackSuccess = (ref: string) => {
    setSelectedPlanId(planToPay.id);
    setShowPaystackModal(false);

    // Add to payment history
    const dueAmount = billingCycle === 'annual' ? planToPay.annualPrice : planToPay.monthlyPrice;
    setPaymentHistory((prev) => [
      {
        id: `tx-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        plan: planToPay.name,
        amount: dueAmount,
        billingCycle,
        gateway: 'Paystack',
        reference: ref,
        status: 'success',
      },
      ...prev,
    ]);

    if (onUpgradePlan) {
      onUpgradePlan(planToPay.id, billingCycle);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPendingApproval ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
              }`}
            ></span>
            <h1 className="text-2xl font-black text-black tracking-tight">IGHO Stay Subscription</h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your organization plan, automated Paystack billing, and platform features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPendingApproval ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Active License</span>
            </span>
          )}
        </div>
      </div>

      {/* REQUIREMENT 7: SUBSCRIPTION ACCESS GATE FOR PENDING HOTELS */}
      {isPendingApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              Your registration request is currently under review by IGHO Software Systems
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Before your organization can purchase or activate a live subscription package, the registration must be
              verified and approved by the IGHO Super Admin in the central Console. You will be able to complete payment
              once verification is finished.
            </p>
          </div>
        </div>
      )}

      {/* Current Active Plan Card */}
      <div className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Current Subscription Status: {isCancelled ? 'Cancelled (Grace Period)' : 'Active'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activePlan?.name || 'Plan 1 — Starter'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Enables full hotel property management, online booking engine, staff role permissions, housekeeping, and
              instant Paystack checkout.
            </p>

            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Room Limit</span>
                <span className="font-bold text-white">Up to {activePlan?.maxRooms} Rooms</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Staff Limit</span>
                <span className="font-bold text-white">Up to {activePlan?.maxStaff} Seats</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Start Date</span>
                <span className="font-bold text-white">Sep 1, 2026</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Renewal Date</span>
                <span className="font-bold text-white">Oct 1, 2026</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs">
              <span className="text-neutral-400">Payment Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3" /> Paid via Paystack
              </span>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700 rounded-2xl p-5 text-center space-y-3 shrink-0 min-w-[240px]">
            <div>
              <span className="text-neutral-400 text-xs block">Subscription Dues</span>
              <span className="text-3xl font-black text-white font-mono">₦{activePlanPrice?.toLocaleString()}</span>
              <span className="text-xs text-neutral-400 block mt-0.5">/ {billingCycle}</span>
            </div>
            <button
              onClick={() => handleOpenPaystack(activePlan)}
              disabled={isPendingApproval}
              className={`w-full py-2.5 rounded-full font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                isPendingApproval
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  : 'bg-[#0BA4DB] hover:bg-[#0993C5] text-white active:scale-95'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Renew via Paystack</span>
            </button>
            <div className="flex gap-2 text-[11px]">
              <button
                onClick={() => setUpdatePaymentModal(true)}
                className="flex-1 text-neutral-300 hover:text-white underline py-1"
              >
                Update Card
              </button>
              <span className="text-neutral-600">·</span>
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 text-rose-400 hover:text-rose-300 underline py-1"
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans Section (Dynamic from IGHO Console) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-black tracking-tight">Available Subscription Packages</h3>
            <p className="text-xs text-neutral-500">
              Upgrade or switch between plans configured centrally in the IGHO Console.
            </p>
          </div>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center bg-neutral-100 p-1 rounded-full border border-neutral-200/60 text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                billingCycle === 'monthly' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                billingCycle === 'annual' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>Annual</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const isCurrent = selectedPlanId === plan.id;
            const isEnterprise = plan.id.includes('3') || plan.id.includes('enterprise');

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 border-2 transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-black bg-white shadow-lg ring-1 ring-black'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-neutral-900">{plan.name}</h4>
                      <p className="text-[11px] text-neutral-500">
                        Up to {plan.maxRooms} rooms · {plan.maxStaff} staff
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-3xl font-black text-black">₦{price.toLocaleString()}</span>
                    <span className="text-xs text-neutral-500">
                      {billingCycle === 'annual' ? ' / year' : ' / month'}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs text-neutral-700">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-500 cursor-default"
                    >
                      Currently Active
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPaystack(plan)}
                      disabled={isPendingApproval}
                      className={`w-full py-2.5 rounded-full text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                        isPendingApproval
                          ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-black hover:bg-neutral-800 text-white active:scale-95'
                      }`}
                    >
                      <span>Upgrade / Switch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAYMENT HISTORY TABLE */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-black">Subscription Payment History</h3>
            <p className="text-xs text-neutral-500">
              Real-time settlement receipts processed securely via Paystack.
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
            {paymentHistory.length} Invoices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[10px] font-bold">
                <th className="pb-2">Date</th>
                <th className="pb-2">Package</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Gateway</th>
                <th className="pb-2">Paystack Reference</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paymentHistory.map((item) => (
                <tr key={item.id} className="text-neutral-700">
                  <td className="py-3 font-medium">{item.date}</td>
                  <td className="py-3 font-semibold text-neutral-900">{item.plan}</td>
                  <td className="py-3 font-mono font-bold text-black">₦{item.amount.toLocaleString()}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#0BA4DB] font-bold text-[10px]">
                      Paystack
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-neutral-500">{item.reference}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => alert(`Official Paystack Invoice #${item.reference} downloaded.`)}
                      className="text-neutral-500 hover:text-black font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paystack Payment Modal */}
      <PaystackSubscriptionModal
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        plan={planToPay}
        billingCycle={billingCycle}
        customerEmail="hotel.admin@lavahotels.ng"
        hotelName={hotel.name}
        onSuccess={handlePaystackSuccess}
      />

      {/* Cancel Plan Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-neutral-900">Cancel Subscription</h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to cancel your {activePlan?.name}? Your hotel workspace will remain active until
                the end of the current billing cycle (Oct 1, 2026).
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setIsCancelled(true);
                  setShowCancelModal(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-full font-bold text-xs transition-colors"
              >
                Confirm Cancellation
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 py-2.5 rounded-full font-semibold text-xs"
              >
                Keep Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Card / Payment Method Modal */}
      {updatePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-neutral-900">Update Paystack Payment Method</h3>
              <button onClick={() => setUpdatePaymentModal(false)} className="text-neutral-400 hover:text-black">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-900 block">{paymentMethod}</span>
                  <span className="text-neutral-500 text-[10px]">Active automatic renewal card</span>
                </div>
                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                To update your recurring billing card, Paystack will perform a ₦50 pre-authorization charge which is
                refunded immediately.
              </p>
              <button
                onClick={() => {
                  setPaymentMethod('Visa ending in 9102');
                  setUpdatePaymentModal(false);
                  alert('Payment method updated via Paystack tokenization.');
                }}
                className="w-full bg-[#0BA4DB] hover:bg-[#0993C5] text-white py-3 rounded-full font-bold text-xs transition-colors shadow-sm"
              >
                Authorize New Card on Paystack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
