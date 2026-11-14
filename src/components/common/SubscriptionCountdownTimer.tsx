import React, { useState, useEffect } from 'react';
import {
  Clock,
  Zap,
  RefreshCw,
  X,
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
    Boolean(hotel.trialEndDate && !hotel.subscriptionEndDate);

  const cycleDays =
    hotel.billingCycle === '5year_contract'
      ? 365 * 5
      : hotel.billingCycle === 'annual'
      ? 365
      : 30;
  const totalDurationMs = cycleDays * 86400000;

  let targetDateMs: number;
  if (isTrial && hotel.trialEndDate) {
    targetDateMs = new Date(hotel.trialEndDate).getTime();
  } else if (hotel.subscriptionEndDate) {
    targetDateMs = new Date(hotel.subscriptionEndDate).getTime();
  } else {
    const baseTime = hotel.submittedAt ? new Date(hotel.submittedAt).getTime() : Date.now();
    let target = baseTime + totalDurationMs;
    while (target <= Date.now()) {
      target += totalDurationMs;
    }
    targetDateMs = target;
  }

  let startDateMs: number;
  if (isTrial && hotel.trialStartDate) {
    startDateMs = new Date(hotel.trialStartDate).getTime();
  } else if (hotel.subscriptionStartDate) {
    startDateMs = new Date(hotel.subscriptionStartDate).getTime();
  } else {
    startDateMs = targetDateMs - totalDurationMs;
  }

  const effectiveTotalMs = Math.max(86400000, targetDateMs - startDateMs);

  const planName =
    hotel.subscriptionPlanName ||
    (hotel.subscriptionPlanId === 'plan-complete-50k' || hotel.packageType === 'complete'
      ? 'Plan 2 — Complete Hospitality Cloud'
      : 'Plan 1 — Standard Operations');

  return {
    isTrial,
    startDateMs,
    targetDateMs,
    effectiveTotalMs,
    targetDate: new Date(targetDateMs),
    planName,
  };
};

export const SubscriptionCountdownTimer: React.FC<SubscriptionCountdownProps> = ({
  hotel,
  mode = 'pill',
  onRenewClick,
}) => {
  const { isTrial, startDateMs, targetDateMs, effectiveTotalMs, targetDate, planName } =
    getSubscriptionRenewalInfo(hotel);
  const [modalOpen, setModalOpen] = useState(false);

  const computeTimeLeft = () => {
    const now = Date.now();
    const diff = Math.max(0, targetDateMs - now);
    const elapsedMs = Math.max(0, now - startDateMs);
    return {
      total: diff,
      elapsedMs,
      days: Math.ceil(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(computeTimeLeft);

  useEffect(() => {
    setTimeLeft(computeTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDateMs, startDateMs]);

  const formattedTargetDate = targetDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isExpired = timeLeft.total <= 0;
  const elapsedFraction = Math.min(1, Math.max(0, timeLeft.elapsedMs / effectiveTotalMs));
  const remainingFraction = isExpired ? 0 : Math.max(0, Math.min(1, timeLeft.total / effectiveTotalMs));

  // Hide compact header countdown completely until halfway through the billing/trial cycle
  if ((mode === 'pill' || mode === 'banner') && !isExpired && elapsedFraction < 0.5) {
    return null;
  }

  // Details Modal when Ring or Card is Tapped
  const detailsModal = modalOpen && (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isExpired ? 'bg-rose-100 text-rose-700' : 'bg-neutral-900 text-white'
              }`}
            >
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
            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div
            className={`p-4 rounded-xl border text-center space-y-1 ${
              isExpired
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-neutral-950 border-neutral-800 text-white'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              {isTrial ? 'Trial Days Remaining' : 'Active Plan Duration'}
            </span>
            <div className="text-3xl font-black font-mono tabular-nums">
              {isExpired ? 'Expired' : `${timeLeft.days} Days Left`}
            </div>
            {!isExpired && (
              <p className="text-[11px] font-mono tabular-nums text-neutral-400">
                {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m :{' '}
                {String(timeLeft.seconds).padStart(2, '0')}s
              </p>
            )}
          </div>

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
                  ? 'Free Trial Period'
                  : `${hotel.billingCycle || 'Monthly'} Subscription`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Expiry / Renewal Date</span>
              <span className="font-mono font-bold text-neutral-900">{formattedTargetDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Guest Portal Access</span>
              <span className="font-semibold text-neutral-800">
                {hotel.hasGuestPortal === false || hotel.packageType === 'management'
                  ? 'Locked (Upgrade to Plan 2)'
                  : 'Included & Live'}
              </span>
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
            className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
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
              className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Upgrade / Renew Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Apple Watch-Style Circular Black Progress Ring (shown only from halfway mark onward)
  if (mode === 'pill' || mode === 'banner') {
    const size = 44;
    const strokeWidth = 3.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - remainingFraction);

    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title={`${isExpired ? 'Plan expired' : `${timeLeft.days} days remaining`} — tap for plan details & upgrade`}
          className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-white hover:bg-neutral-50 transition-transform active:scale-95 cursor-pointer shrink-0 shadow-xs"
          aria-label={isExpired ? 'Subscription expired, click for details' : `${timeLeft.days} days left on subscription`}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90 transform"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e5e5e5"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isExpired ? '#e11d48' : '#000000'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span
              className={`text-xs font-black tabular-nums tracking-tight ${
                isExpired ? 'text-rose-600' : 'text-black'
              }`}
            >
              {isExpired ? '0' : timeLeft.days}
            </span>
            <span className="text-[7px] font-bold lowercase text-neutral-500 mt-0.5">
              {isExpired ? 'due' : 'days'}
            </span>
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
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
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

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">{timeLeft.days}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Days</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Hours</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Mins</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
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
              type="button"
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
