import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Zap,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  X,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Hotel } from '../../types';

interface SubscriptionCountdownProps {
  hotel: Hotel;
  mode?: 'pill' | 'banner' | 'card';
  onRenewClick?: () => void;
}

export const getSubscriptionRenewalInfo = (hotel: Hotel) => {
  const isTrial =
    hotel.subscriptionStatus === 'trial' ||
    hotel.paymentStatus === 'pending' ||
    Boolean(hotel.trialEndDate);

  let targetDateMs: number;

  if (isTrial && hotel.trialEndDate) {
    targetDateMs = new Date(hotel.trialEndDate).getTime();
  } else if (hotel.subscriptionEndDate) {
    targetDateMs = new Date(hotel.subscriptionEndDate).getTime();
  } else {
    // Generate deterministic target based on hotel.submittedAt or current date
    const baseTime = hotel.submittedAt ? new Date(hotel.submittedAt).getTime() : Date.now();
    const cycleDays =
      hotel.billingCycle === 'annual'
        ? 365
        : hotel.billingCycle === '5year_contract'
        ? 365 * 5
        : 30;
    let target = baseTime + cycleDays * 86400000;
    while (target <= Date.now()) {
      target += cycleDays * 86400000;
    }
    targetDateMs = target;
  }

  const planName =
    hotel.subscriptionPlanName ||
    (hotel.subscriptionPlanId === 'plan-complete-50k' || hotel.packageType === 'complete'
      ? 'Plan 2 — Complete Hospitality Cloud'
      : 'Plan 1 — Standard Operations');

  return {
    isTrial,
    targetDateMs,
    targetDate: new Date(targetDateMs),
    planName,
  };
};

export const SubscriptionCountdownTimer: React.FC<SubscriptionCountdownProps> = ({
  hotel,
  mode = 'pill',
  onRenewClick,
}) => {
  const { isTrial, targetDateMs, targetDate, planName } = getSubscriptionRenewalInfo(hotel);
  const [modalOpen, setModalOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, targetDateMs - Date.now());
    return {
      total: diff,
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, targetDateMs - Date.now());
      setTimeLeft({
        total: diff,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDateMs]);

  const formattedTargetDate = targetDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.days <= 5;

  const statusColorClass = isExpired
    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
    : isUrgent
    ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100';

  const dotColorClass = isExpired
    ? 'bg-rose-500'
    : isUrgent
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  // Details Modal when Pill or Card is Tapped
  const detailsModal = modalOpen && (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Subscription & Plan Status</h3>
              <p className="text-[10px] text-neutral-400 font-mono">Hotel: {hotel.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Main Days Left Callout */}
          <div className={`p-4 rounded-xl border text-center space-y-1 ${
            isExpired
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-neutral-900 border-neutral-800 text-white'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              {isTrial ? 'Trial Days Remaining' : 'Active Plan Duration'}
            </span>
            <div className="text-3xl font-black font-mono">
              {isExpired ? 'Expired' : `${timeLeft.days} Days Left`}
            </div>
            {!isExpired && (
              <p className="text-[11px] font-mono text-neutral-400">
                {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
              </p>
            )}
          </div>

          {/* Key Plan Details */}
          <div className="p-3 bg-neutral-50 rounded-xl space-y-2 border border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Subscribed Tier</span>
              <span className="font-bold text-black">{planName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Plan Type</span>
              <span className="font-semibold text-neutral-800 capitalize">
                {hotel.billingCycle === '5year_contract'
                  ? '5-Year Fixed-Price Contract'
                  : isTrial
                  ? '1-Month Free Trial'
                  : `${hotel.billingCycle || 'Monthly'} Subscription`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Expiry / Renewal Date</span>
              <span className="font-mono font-bold text-neutral-900">{formattedTargetDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Storage Allowance</span>
              <span className="font-semibold text-neutral-800">
                {hotel.packageType === 'complete' ? '10 GB (Complete)' : '1 GB (Standard)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Dismiss
          </button>
          {onRenewClick && (
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                onRenewClick();
              }}
              className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTrial ? 'Upgrade Plan' : 'Renew / Change Plan'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Pill Mode: Sleek, compact pill requested by user
  if (mode === 'pill' || mode === 'banner') {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Click to view subscription details & renewal"
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-3xs active:scale-95 ${statusColorClass}`}
        >
          <span className={`w-2 h-2 rounded-full ${dotColorClass} animate-pulse shrink-0`} />
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold">
            {isExpired ? 'Plan Expired' : `${timeLeft.days} Days Left`}
          </span>
          <span className="text-[10px] text-neutral-500 font-normal hidden sm:inline">
            • {isTrial ? 'Trial' : 'Active Plan'} (Tap for details)
          </span>
        </button>
        {detailsModal}
      </>
    );
  }

  // Card Mode (for HotelSubscriptionView)
  return (
    <>
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white rounded-2xl p-5 sm:p-6 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {isTrial ? 'Free Trial Period' : 'Subscription Cycle'}
              </div>
              <h3 className="text-base font-black text-white">
                {isExpired ? 'Subscription Expired' : `${timeLeft.days} Days Remaining`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
              Due: {formattedTargetDate}
            </span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
            >
              Inspect
            </button>
          </div>
        </div>

        {/* Compact Summary Bar */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-white">{timeLeft.days}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Days</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Hours</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Mins</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Secs</div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800 text-xs text-neutral-400">
          <div>
            <span>Plan: </span>
            <strong className="text-white">{planName}</strong>
          </div>
          {onRenewClick && (
            <button
              onClick={onRenewClick}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-100 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Renew / Upgrade Plan</span>
            </button>
          )}
        </div>
      </div>
      {detailsModal}
    </>
  );
};
