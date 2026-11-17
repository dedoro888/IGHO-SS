import React, { useState, useEffect } from 'react';
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
  HardDrive,
  Info,
  Layers,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Hotel, SubscriptionPlan, ActiveScreen } from '../../types';
import { INITIAL_PLANS } from '../../data/platformData';
import { resolveEffectivePrivileges, resolveHotelPlanTier } from '../../lib/entitlements';
import { PaystackSubscriptionModal } from '../PaystackSubscriptionModal';
import { SubscriptionCountdownTimer } from '../common/SubscriptionCountdownTimer';
import { getAuthHeaders } from '../../utils/storageUpload';

interface HotelSubscriptionViewProps {
  hotel: Hotel;
  plans?: SubscriptionPlan[];
  payoutSettings?: any;
  onUpgrade?: (planId: string, billingCycle: 'monthly' | 'annual' | '5year_contract', verificationResult?: any) => void;
  onUpgradePlan?: (planId: string, billingCycle: 'monthly' | 'annual' | '5year_contract', verificationResult?: any) => void;
  onNavigate?: (screen: ActiveScreen) => void;
}

export const HotelSubscriptionView: React.FC<HotelSubscriptionViewProps> = ({
  hotel,
  plans = INITIAL_PLANS,
  payoutSettings,
  onUpgrade,
  onUpgradePlan,
  onNavigate,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual' | '5year_contract'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    hotel.packageType === 'complete' || hotel.subscriptionPlanId === 'plan-complete-50k'
      ? plans[1]?.id || plans[0]?.id
      : plans[0]?.id || 'plan-starter-30k'
  );
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [planToPay, setPlanToPay] = useState<SubscriptionPlan>(plans[0]);
  const [portalUnlockedBanner, setPortalUnlockedBanner] = useState(false);
  const [downloadedRef, setDownloadedRef] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [updatePaymentModal, setUpdatePaymentModal] = useState(false);
  const [backendSub, setBackendSub] = useState<any | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // De-cluttered Collapsible Section Toggles
  const [showStorageBreakdown, setShowStorageBreakdown] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);

  const effectivePrivs = resolveEffectivePrivileges(hotel);
  const tier = resolveHotelPlanTier(hotel);

  // Live Organisation Storage State
  const [storageInfo, setStorageInfo] = useState<{
    quotaBytes: number;
    usedBytes: number;
    percentage: number;
    warningState: 'normal' | 'approaching' | 'critical' | 'exceeded';
    categoriesBreakdown?: any;
    fileCount?: number;
  }>({
    quotaBytes: effectivePrivs.storageQuotaGb * 1024 * 1024 * 1024,
    usedBytes: 0,
    percentage: 0,
    warningState: 'normal',
  });

  const loadStorage = async () => {
    if (!hotel?.id) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/storage/${encodeURIComponent(hotel.id)}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStorageInfo({
          quotaBytes: data.quotaBytes,
          usedBytes: data.usedBytes,
          percentage: data.percentage,
          warningState: data.warningState,
          categoriesBreakdown: data.categoriesBreakdown,
          fileCount: data.fileCount,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSummary = async () => {
    if (!hotel?.id) return;
    setLoadingSummary(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/subscription-summary`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBackendSub(data.subscription || null);
          const rows = (data.transactions || []).map((t: any) => ({
            id: t.id || t.reference,
            date: t.paymentDate
              ? new Date(t.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—',
            plan: t.planName || 'IGHO Stay Subscription',
            amount: Number(t.amount || 0),
            billingCycle: t.billingPeriod || 'monthly',
            gateway: t.paymentMethod || 'Paystack Test',
            reference: t.reference,
            status: t.paymentStatus || 'successful',
          }));
          setPaymentHistory(rows);
        }
      }
    } catch {
      // Non-fatal fallback
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    setSelectedPlanId(
      hotel.packageType === 'complete' || hotel.subscriptionPlanId === 'plan-complete-50k'
        ? plans[1]?.id || plans[0]?.id
        : plans[0]?.id || 'plan-starter-30k'
    );
  }, [hotel.id, hotel.packageType, hotel.subscriptionPlanId, plans]);

  useEffect(() => {
    loadStorage();
    loadSummary();
    window.addEventListener('storage_file_uploaded', loadStorage);
    window.addEventListener('storage_file_deleted', loadStorage);
    window.addEventListener('igho_hotel_plan_migrated', loadStorage);
    return () => {
      window.removeEventListener('storage_file_uploaded', loadStorage);
      window.removeEventListener('storage_file_deleted', loadStorage);
      window.removeEventListener('igho_hotel_plan_migrated', loadStorage);
    };
  }, [hotel.id]);

  // Check if hotel registration is pending approval (approved hotels awaiting payment can proceed to pay)
  const isPendingApproval = hotel.approvalStatus === 'pending';

  // Active plan calculations
  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const activePlanPrice =
    billingCycle === '5year_contract'
      ? activePlan?.contractAnnualPrice || Math.round((activePlan?.monthlyPrice || 30000) * 12 * 0.87)
      : billingCycle === 'annual'
      ? activePlan?.annualPrice
      : activePlan?.monthlyPrice;

  const isAutoRenew = Boolean(backendSub?.autoRenew ?? hotel.autoRenew);
  const isCancelAtPeriodEnd = Boolean(backendSub?.cancelAtPeriodEnd ?? hotel.cancelAtPeriodEnd);
  const subStatusLabel =
    backendSub?.status === 'cancelled' || hotel.subscriptionStatus === 'cancelled'
      ? 'Cancelled'
      : backendSub?.status === 'past_due' || hotel.subscriptionStatus === 'past_due'
      ? 'Payment Past Due'
      : isCancelAtPeriodEnd
      ? 'Active (Auto-Renew Cancelled)'
      : 'Active License';

  const handleOpenPaystack = (targetPlan: SubscriptionPlan) => {
    if (isPendingApproval) return;
    setPlanToPay(targetPlan);
    setShowPaystackModal(true);
  };

  const handleConfirmCancelAutoRenew = async () => {
    setCancelError(null);
    setIsCancelling(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/subscriptions/${encodeURIComponent(hotel.id)}/cancel`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to cancel subscription auto-renewal.');
      }
      setBackendSub(data.subscription || { ...(backendSub || {}), autoRenew: false, cancelAtPeriodEnd: true });
      setCancelSuccessMsg(
        data.message || 'Auto-renewal disabled. Access remains active until the end of your current period.'
      );
      setShowCancelModal(false);
    } catch (err: any) {
      setCancelError(err?.message || 'Unable to cancel auto-renewal.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePaystackSuccess = (_ref: string, verificationResult?: any) => {
    setSelectedPlanId(verificationResult?.planId || planToPay.id);
    setShowPaystackModal(false);

    const unlockedPortal = Boolean(
      verificationResult?.hasGuestPortal ??
        (planToPay.hasGuestPortal ||
          planToPay.id.includes('complete') ||
          planToPay.id === 'plan-3' ||
          planToPay.monthlyPrice >= 50000)
    );
    if (unlockedPortal) {
      setPortalUnlockedBanner(true);
    }

    if (onUpgradePlan) {
      onUpgradePlan(planToPay.id, billingCycle, verificationResult);
    } else if (onUpgrade) {
      onUpgrade(planToPay.id, billingCycle, verificationResult);
    }

    loadStorage();
    loadSummary();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Guest Portal Unlocked Celebration & Direct Preview CTA */}
      {portalUnlockedBanner && (
        <div className="bg-emerald-950 text-white border border-emerald-700 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Guest Portal Unlocked</h3>
              <p className="text-xs text-emerald-200 mt-0.5 leading-relaxed">
                {hotel.name} is now active on IGHO Stay Professional with 50 GB storage, up to 60 rooms, 15 active staff seats, 3 properties, and live listing on Discover Hotels.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('hotel_guest_portal')}
                className="px-4 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Preview Your Guest Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setPortalUnlockedBanner(false)}
              className="px-3 py-2 rounded-full bg-emerald-900 text-emerald-200 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPendingApproval ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <h1 className="text-2xl font-black text-black tracking-tight">IGHO Stay Subscription & Entitlements</h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your organization license, enterprise 5-year price-lock contracts, and cloud storage quotas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SubscriptionCountdownTimer
            hotel={hotel}
            mode="pill"
            onRenewClick={() => handleOpenPaystack(activePlan)}
          />

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

      {/* Subscription Access Gate For Pending Hotels */}
      {isPendingApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              Your registration request is currently under review by IGHO Software Systems
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Before your organization can activate a live subscription package, the registration must be
              verified and approved by the IGHO Super Admin in the central Console.
            </p>
          </div>
        </div>
      )}

      {/* Cancellation Notice */}
      {cancelSuccessMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{cancelSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setCancelSuccessMsg(null)}
            className="text-amber-700 hover:text-amber-950 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Active Plan Card */}
      <div className="bg-[#0F111A] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden border border-neutral-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Current Status: {subStatusLabel}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider">
                Paystack Test Mode
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activePlan?.name || 'IGHO Stay Starter'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {isAutoRenew
                ? 'Auto-renewing monthly subscription billed via Paystack Plan.'
                : 'One-time / manual renewal term — bank transfer and USSD payments do not auto-renew.'}
            </p>
            {(backendSub?.paystackCustomerCode || backendSub?.paystackSubscriptionCode || hotel.paystackCustomerCode || hotel.paystackSubscriptionCode) && (
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-neutral-400 pt-1">
                {(backendSub?.paystackCustomerCode || hotel.paystackCustomerCode) && (
                  <span>Customer: {backendSub?.paystackCustomerCode || hotel.paystackCustomerCode}</span>
                )}
                {(backendSub?.paystackSubscriptionCode || hotel.paystackSubscriptionCode) && (
                  <span>Subscription: {backendSub?.paystackSubscriptionCode || hotel.paystackSubscriptionCode}</span>
                )}
              </div>
            )}

            <div className="pt-2 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Room Quota</span>
                <span className="font-bold text-white">Up to {effectivePrivs.maxRooms} Rooms</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Staff Seats</span>
                <span className="font-bold text-white">Up to {effectivePrivs.maxStaff} Active</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Properties</span>
                <span className="font-bold text-white">Up to {effectivePrivs.maxBranches}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Cloud Storage</span>
                <span className="font-bold text-emerald-400">{Math.round(storageInfo.quotaBytes / (1024 * 1024 * 1024))} GB</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Backups</span>
                <span className="font-bold text-white capitalize">{effectivePrivs.backupFrequency}</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-700/80 rounded-2xl p-5 text-center space-y-3 shrink-0 min-w-[250px]">
            <div>
              <span className="text-neutral-400 text-xs block">Subscription Dues</span>
              <span className="text-3xl font-black text-white font-mono">₦{activePlanPrice?.toLocaleString()}</span>
              <span className="text-xs text-neutral-400 block mt-0.5">
                / {billingCycle === '5year_contract' ? 'year (5-yr fixed rate)' : billingCycle}
              </span>
            </div>
            <button
              onClick={() => handleOpenPaystack(activePlan)}
              disabled={isPendingApproval}
              className={`w-full py-2.5 rounded-full font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isPendingApproval
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  : 'bg-white hover:bg-neutral-100 text-black active:scale-95'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Renew / Change Billing</span>
            </button>
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setUpdatePaymentModal(true)}
                className="flex-1 text-neutral-300 hover:text-white underline py-1 cursor-pointer"
              >
                Update Card
              </button>
              <span className="text-neutral-600">·</span>
              <button
                type="button"
                onClick={() => {
                  setCancelError(null);
                  setShowCancelModal(true);
                }}
                disabled={isCancelAtPeriodEnd || !backendSub}
                className="flex-1 text-rose-400 hover:text-rose-300 underline py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCancelAtPeriodEnd ? 'Renewal Off' : 'Cancel Renewal'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ORGANISATION-WIDE STORAGE ENTITLEMENT CARD (DE-CLUTTERED) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-black">Organisation Cloud Storage Quota</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                  {Math.round(storageInfo.quotaBytes / (1024 * 1024 * 1024))} GB Allowance ({tier === 'professional' ? 'Professional' : 'Starter'})
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Covers room galleries, guest receipts, folios, reports, and all hotel attachments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-xs font-black text-neutral-900">
                {(storageInfo.usedBytes / (1024 * 1024)).toFixed(1)} MB{' '}
                <span className="text-[10px] text-neutral-500 font-normal">
                  / {(storageInfo.quotaBytes / (1024 * 1024 * 1024)).toFixed(0)} GB
                </span>
              </div>
              <span className="text-[10px] font-bold text-neutral-400">
                {storageInfo.percentage.toFixed(1)}% Used
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowStorageBreakdown(!showStorageBreakdown)}
              className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-neutral-700 flex items-center gap-1"
            >
              <span>{showStorageBreakdown ? 'Hide Breakdown' : 'Details'}</span>
              {showStorageBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Progress bar — white track + solid black progression fill */}
        <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-neutral-300">
          <div
            className="h-full bg-black rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(storageInfo.percentage > 0 ? 2 : 0, storageInfo.percentage))}%` }}
          />
        </div>

        {/* Expandable 8 Asset Categories Details */}
        {showStorageBreakdown && (
          <div className="pt-3 border-t border-neutral-100 animate-in fade-in duration-150 space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
              All 8 Asset Categories Included In This Storage Quota:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-neutral-700">
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">1. Guest Portal Media</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">2. Room Galleries</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">3. Transfer Receipts</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">4. Booking Attachments</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">5. Hotel Documents</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">6. Staff Uploads</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">7. Generated Reports</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">8. Operational Files</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Plans Section With Screenshot-Inspired Clean SaaS Frame */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="inline-block px-3 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
            Flexible Plans
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Built for Growth at Every Stage
          </h3>
          <p className="text-xs text-neutral-500">
            Choose your payment cycle or lock in guaranteed rates with a 5-year fixed enterprise contract.
          </p>

          {/* Monthly / Annual / 5-Year Contract Selector */}
          <div className="pt-1 flex justify-center">
            <div className="inline-flex flex-wrap items-center justify-center bg-neutral-100 p-1 rounded-full border border-neutral-200/80 text-xs font-semibold gap-1">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  billingCycle === 'annual' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>Annual</span>
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  -17%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('5year_contract')}
                className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  billingCycle === '5year_contract'
                    ? 'bg-purple-900 text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>5-Yr Contract</span>
                <span className="bg-amber-300 text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  87% Lock
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 5-Year Contract Notice Banner */}
        {billingCycle === '5year_contract' && (
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-purple-950 block">
                5-Year Enterprise Price-Lock Guarantee (87% Fixed Rate)
              </span>
              <p className="text-purple-900 leading-relaxed">
                Shield your hotel from annual price hikes with an 87% fixed-price lock for 5 full years. Professional Plan is ₦522,000/yr (regular ₦600k) and Starter Plan is ₦313,200/yr (regular ₦360k), with flexible annual payments or contract deposit options.
              </p>
            </div>
          </div>
        )}

        {/* Framed Comparison Grid */}
        <div className="bg-neutral-100/80 border border-neutral-200/80 rounded-3xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {plans.map((plan) => {
              const price =
                billingCycle === '5year_contract'
                  ? plan.contractAnnualPrice || Math.round(plan.monthlyPrice * 12 * 0.87)
                  : billingCycle === 'annual'
                  ? plan.annualPrice
                  : plan.monthlyPrice;

              const isCurrent = selectedPlanId === plan.id;
              const isPopular =
                plan.id.includes('complete') ||
                plan.name.toLowerCase().includes('complete') ||
                plan.name.toLowerCase().includes('professional') ||
                plan.monthlyPrice >= 50000;
              const storageGb = plan.storageQuotaGb || (isPopular ? 50 : 10);
              const propertyCount = plan.maxBranches || (isPopular ? 3 : 1);

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 sm:p-8 border transition-all flex flex-col justify-between ${
                    isPopular
                      ? 'bg-[#0F111A] text-white border-neutral-800 shadow-2xl'
                      : 'bg-white text-neutral-900 border-neutral-200/90 shadow-sm hover:border-neutral-300'
                  } ${isCurrent ? (isPopular ? 'ring-2 ring-emerald-400' : 'ring-2 ring-black') : ''}`}
                >
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isPopular
                            ? 'bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 text-white'
                            : 'bg-neutral-900 text-white'
                        }`}
                      >
                        {isPopular ? <Sparkles className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPopular && (
                          <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            Most Popular
                          </span>
                        )}
                        {isCurrent && (
                          <span className="bg-emerald-500 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                            Active Plan
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-lg font-black tracking-tight ${isPopular ? 'text-white' : 'text-neutral-900'}`}>
                        {plan.name}
                      </h4>
                      <p className={`text-xs mt-1 ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} · Up to {plan.maxRooms} rooms · {plan.maxStaff} staff · {storageGb} GB cloud
                      </p>
                    </div>

                    <div className={`pt-4 border-t ${isPopular ? 'border-neutral-800' : 'border-neutral-100'}`}>
                      <span className={`text-3xl sm:text-4xl font-black font-mono ${isPopular ? 'text-white' : 'text-black'}`}>
                        ₦{price.toLocaleString()}
                      </span>
                      <span className={`text-xs font-medium ${isPopular ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {billingCycle === '5year_contract'
                          ? ' / year (5-Year Lock)'
                          : billingCycle === 'annual'
                          ? ' / year'
                          : ' / month'}
                      </span>
                      {billingCycle === '5year_contract' && plan.contractDepositRequired && (
                        <span className={`text-[11px] block mt-1 font-semibold ${isPopular ? 'text-amber-300' : 'text-purple-700'}`}>
                          Commitment deposit: ₦{plan.contractDepositRequired.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className={`pt-4 border-t space-y-2.5 text-xs ${isPopular ? 'border-neutral-800 text-neutral-200' : 'border-neutral-100 text-neutral-700'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isPopular ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {isPopular ? 'Everything in Starter, plus:' : "What's included:"}
                      </span>
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-7">
                    {isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPaystack(plan)}
                        disabled={isPendingApproval}
                        className={`w-full py-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPopular
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Currently Active · Renew Early</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPaystack(plan)}
                        disabled={isPendingApproval}
                        className={`w-full py-3 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPendingApproval
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                            : isPopular
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-98'
                            : 'bg-black hover:bg-neutral-800 text-white active:scale-98'
                        }`}
                      >
                        <span>
                          {isPopular ? 'Upgrade to ' : 'Switch to '}
                          {plan.name.split('—')[1] || plan.name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soft Gradient Support / Consultation Footer Strip */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-purple-50 to-sky-100 border border-neutral-200/80 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-black text-black">Not sure which plan fits your property?</h4>
            <p className="text-xs text-neutral-600 mt-0.5">
              Speak with IGHO Stay onboarding support about multi-property licensing, 5-year rate locks, or billing cycles.
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('demo_request')}
              className="px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Request Consultation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* COLLAPSIBLE BILLING HISTORY */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-black">Subscription Payment History</h3>
            <p className="text-[11px] text-neutral-500">
              Audit license renewals and receipts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBillingHistory(!showBillingHistory)}
            className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-neutral-700 flex items-center gap-1"
          >
            <span>{showBillingHistory ? 'Hide Invoices' : `View Invoices (${paymentHistory.length})`}</span>
            {showBillingHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showBillingHistory && (
          <div className="overflow-x-auto pt-2 border-t border-neutral-100 animate-in fade-in duration-150">
            {loadingSummary ? (
              <div className="py-6 text-center text-xs text-neutral-500">Loading verified Paystack payment history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No verified Paystack subscription payments recorded for this organization yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[10px] font-bold">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Package</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Gateway</th>
                    <th className="pb-2">Reference</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paymentHistory.map((item) => (
                    <tr key={item.id} className="text-neutral-700">
                      <td className="py-2.5 font-medium">{item.date}</td>
                      <td className="py-2.5 font-semibold text-neutral-900">{item.plan}</td>
                      <td className="py-2.5 font-mono font-bold text-black">₦{item.amount.toLocaleString()}</td>
                      <td className="py-2.5 font-semibold text-neutral-600">{item.gateway}</td>
                      <td className="py-2.5 font-mono text-[11px] text-neutral-500">{item.reference}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.status === 'failed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <Check className="w-3 h-3" /> {item.status === 'failed' ? 'Failed' : 'Verified'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadedRef(item.reference);
                            setTimeout(() => setDownloadedRef(null), 3500);
                          }}
                          className="text-neutral-500 hover:text-black font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> {downloadedRef === item.reference ? 'Ready' : 'Ref'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Cancel Auto-Renewal Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Cancel Subscription Auto-Renewal</h3>
                  <p className="text-[11px] text-neutral-500">Paystack Recurring Subscription Management</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              This will disable recurring billing on Paystack for <strong>{hotel.name}</strong>. Your organization will
              keep full access until the end of the current paid period.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelAutoRenew}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Disable Auto-Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Card Info Modal */}
      {updatePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0BA4DB] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-neutral-900">Update Subscription Payment Card</h3>
                <p className="text-[11px] text-neutral-500">Paystack Hosted Authorization</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              For PCI security, IGHO Stay never collects or stores raw card numbers directly. To switch to a new card
              for monthly auto-renewal, start a new Paystack Hosted Checkout session with Card Auto-Renewal selected.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUpdatePaymentModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdatePaymentModal(false);
                  setBillingCycle('monthly');
                  handleOpenPaystack(activePlan);
                }}
                className="px-4 py-2 rounded-xl bg-[#0BA4DB] hover:bg-[#0993C5] text-white text-xs font-bold cursor-pointer"
              >
                Authorize New Card on Paystack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paystack Checkout Modal */}
      {showPaystackModal && (
        <PaystackSubscriptionModal
          isOpen={showPaystackModal}
          hotelId={hotel.id}
          customerEmail={hotel.ownerEmail || hotel.email || ''}
          hotelName={hotel.name || 'Partner Hotel'}
          plan={planToPay}
          billingCycle={billingCycle}
          returnScreen="staff_portal"
          onSuccess={handlePaystackSuccess}
          onClose={() => setShowPaystackModal(false)}
        />
      )}
    </div>
  );
};
