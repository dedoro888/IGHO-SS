import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Users,
  Wallet,
  PieChart,
} from 'lucide-react';
import {
  Hotel,
  Reservation,
  HotelSubscription,
  PlatformTransaction,
  PlatformUser,
  PlatformProduct,
} from '../../types';
import { BackButton } from '../BackButton';
import { ComparativePerformanceChart, MetricConfig } from '../common/ComparativePerformanceChart';

interface ConsoleAnalyticsViewProps {
  hotels: Hotel[];
  reservations: Reservation[];
  subscriptions: HotelSubscription[];
  transactions: PlatformTransaction[];
  users: PlatformUser[];
  products: PlatformProduct[];
  adminEmail?: string;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleAnalyticsView: React.FC<ConsoleAnalyticsViewProps> = ({
  hotels,
  reservations,
  subscriptions,
  transactions,
  users,
  products,
  adminEmail,
  onNavigateBreadcrumb,
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const activeHotels = hotels.filter((h) => h.isLive);
  const totalRevenue = transactions
    .filter((t) => t.paymentStatus === 'successful')
    .reduce((sum, t) => sum + t.amount, 0);

  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce(
      (sum, s) => sum + (s.billingCycle === 'annual' ? Math.round(s.amount / 12) : s.amount),
      0
    );

  const averageRevenuePerOrg =
    activeHotels.length > 0 ? Math.round(totalRevenue / activeHotels.length) : 0;

  const comparativeMetrics: MetricConfig[] = React.useMemo(() => {
    const now = Date.now();
    const daysWindow = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const bucketMs = (daysWindow * 86400000) / 4;

    const bucketFor = (dateStr?: string): number => {
      if (!dateStr) return 3;
      const t = new Date(dateStr).getTime();
      if (Number.isNaN(t)) return 3;
      const diff = now - t;
      if (diff < 0) return 3;
      const idx = 3 - Math.floor(diff / bucketMs);
      if (idx < 0 || idx > 3) return -1;
      return idx;
    };

    const prevBucketFor = (dateStr?: string): number => {
      if (!dateStr) return -1;
      const t = new Date(dateStr).getTime();
      if (Number.isNaN(t)) return -1;
      const windowMs = daysWindow * 86400000;
      const diff = now - windowMs - t;
      if (diff < 0 || diff > windowMs) return -1;
      const idx = 3 - Math.floor(diff / bucketMs);
      return idx >= 0 && idx <= 3 ? idx : -1;
    };

    const revCurr = [0, 0, 0, 0];
    const revPrev = [0, 0, 0, 0];
    transactions
      .filter((t) => t.paymentStatus === 'successful')
      .forEach((t) => {
        const c = bucketFor(t.timestamp);
        if (c >= 0) revCurr[c] += Number(t.amount || 0);
        const p = prevBucketFor(t.timestamp);
        if (p >= 0) revPrev[p] += Number(t.amount || 0);
      });
    // Include active reservation totals if platform transactions haven't logged yet
    if (revCurr.every((v) => v === 0) && totalRevenue === 0) {
      reservations.forEach((r) => {
        const c = bucketFor(r.createdAt || r.checkIn);
        if (c >= 0) revCurr[c] += Number(r.total || r.totalAmount || 0);
      });
    }

    const subCurr = [0, 0, 0, 0];
    const subPrev = [0, 0, 0, 0];
    subscriptions.forEach((s) => {
      const c = bucketFor(s.startDate);
      if (c >= 0) subCurr[c] += 1;
      const p = prevBucketFor(s.startDate);
      if (p >= 0) subPrev[p] += 1;
    });

    const regCurr = [0, 0, 0, 0];
    const regPrev = [0, 0, 0, 0];
    hotels.forEach((h) => {
      const c = bucketFor(h.joinedDate || h.reviewedAt);
      if (c >= 0) regCurr[c] += 1;
      const p = prevBucketFor(h.joinedDate || h.reviewedAt);
      if (p >= 0) regPrev[p] += 1;
    });

    const bookCurr = [0, 0, 0, 0];
    const bookPrev = [0, 0, 0, 0];
    reservations.forEach((r) => {
      const c = bucketFor(r.createdAt || r.checkIn);
      if (c >= 0) bookCurr[c] += 1;
      const p = prevBucketFor(r.createdAt || r.checkIn);
      if (p >= 0) bookPrev[p] += 1;
    });

    const labels = timeframe === '7d'
      ? ['Day 1-2', 'Day 3-4', 'Day 5-6', 'Today']
      : timeframe === '30d'
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      : timeframe === '90d'
      ? ['Days 1-22', 'Days 23-45', 'Days 46-68', 'Recent']
      : ['Q1', 'Q2', 'Q3', 'Q4'];

    return [
      {
        id: 'revenue',
        name: 'Total Platform Revenue',
        unit: '',
        isCurrency: true,
        data: labels.map((label, i) => ({ label, current: revCurr[i], previous: revPrev[i] })),
      },
      {
        id: 'subscriptions',
        name: 'Active Subscriptions',
        unit: 'Hotels',
        isCurrency: false,
        data: labels.map((label, i) => ({ label, current: subCurr[i], previous: subPrev[i] })),
      },
      {
        id: 'registrations',
        name: 'Hotel Registrations',
        unit: 'Hotels',
        isCurrency: false,
        data: labels.map((label, i) => ({ label, current: regCurr[i], previous: regPrev[i] })),
      },
      {
        id: 'bookings',
        name: 'Guest Bookings',
        unit: 'Stays',
        isCurrency: false,
        data: labels.map((label, i) => ({ label, current: bookCurr[i], previous: bookPrev[i] })),
      },
    ];
  }, [timeframe, transactions, subscriptions, hotels, reservations, totalRevenue]);

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <BackButton onClick={onNavigateBreadcrumb} />
        <span className="text-neutral-900 font-bold text-sm">Analytics & Intelligence</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Analytics & Intelligence
            </h1>
            <p className="text-xs text-neutral-500">
              Cross-sectional growth trajectory, tenant telemetry, and revenue unit economics.
            </p>
          </div>
        </div>

        {/* Timeframe Filter */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {(['7d', '30d', '90d', '12m'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg transition-colors uppercase ${
                timeframe === tf
                  ? 'bg-black text-white font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Comparative Performance Chart (Comparing variable performance vs previous periods) */}
      <ComparativePerformanceChart
        title="Comparative Platform Performance Graph"
        subtitle="Compare key variables (Revenue, Subscriptions, Hotels, Bookings) against previous performance"
        metrics={comparativeMetrics}
        currentPeriodLabel="This Period"
        previousPeriodLabel="Prior Period"
      />

      {/* 4 Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Organizations Sector */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-600" />
              <span>Organizations & Tenants</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Period: {timeframe.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Registered</span>
              <div className="text-xl font-black text-black mt-1">{hotels.length}</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Active Live</span>
              <div className="text-xl font-black text-emerald-700 mt-1">{activeHotels.length}</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Monthly Churn</span>
              <div className="text-xl font-black text-neutral-500 mt-1">0.0%</div>
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500">Live Properties Ratio:</span>
              <span className="font-mono font-bold text-black">
                {hotels.length > 0
                  ? `${Math.round((activeHotels.length / hotels.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500">Verified Organization Records:</span>
              <span className="font-mono font-bold text-black">{activeHotels.length}</span>
            </div>
          </div>
        </div>

        {/* 2. Platform Users Sector */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-600" />
              <span>Platform Users & Access</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Period: {timeframe.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Total Accounts</span>
              <div className="text-xl font-black text-black mt-1">{users.length}</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Active Status</span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {users.filter((u) => u.status === 'active').length}
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Super Admins</span>
              <div className="text-xl font-black text-purple-700 mt-1">
                {users.filter((u) => u.role === 'super_admin').length}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500">Console Admin Email:</span>
              <span className="font-mono font-bold text-black">{adminEmail || 'superadmin@igho.software'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500">Authentication Protocol:</span>
              <span className="font-mono font-bold text-emerald-700">Single Sign-On Unified</span>
            </div>
          </div>
        </div>

        {/* 3. Financial Sector */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neutral-600" />
              <span>Revenue Unit Economics</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Period: {timeframe.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Settled Revenue</span>
              <div className="text-xl font-black text-black mt-1 font-mono">
                ₦{totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">MRR Run-rate</span>
              <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
                ₦{mrr.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">ARPU</span>
              <div className="text-xl font-black text-neutral-600 mt-1 font-mono">
                ₦{averageRevenuePerOrg.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Reservations / Bookings Activity */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-600" />
              <span>Guest & Booking Telemetry</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Period: {timeframe.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Reservations</span>
              <div className="text-xl font-black text-black mt-1">{reservations.length}</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Completed</span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {reservations.filter((r) => r.status === 'checked_out').length}
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Active Stays</span>
              <div className="text-xl font-black text-blue-700 mt-1">
                {reservations.filter((r) => r.status === 'checked_in').length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
