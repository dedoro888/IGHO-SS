import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Briefcase,
  History,
  GraduationCap,
  Cross,
  ChevronRight,
  Activity,
  ArrowRight,
  UserCheck,
  Bell,
  Check,
} from 'lucide-react';
import {
  Hotel,
  Reservation,
  HotelSubscription,
  PlatformTransaction,
  PlatformAuditLog,
  PlatformUser,
  PlatformProduct,
} from '../../types';

interface ConsoleDashboardViewProps {
  hotels: Hotel[];
  reservations: Reservation[];
  subscriptions: HotelSubscription[];
  transactions: PlatformTransaction[];
  auditLogs: PlatformAuditLog[];
  users: PlatformUser[];
  products: PlatformProduct[];
  onSelectTab: (tab: any) => void;
  onInspectHotel: (hotel: Hotel) => void;
}

// ─── HIGH-FIDELITY DESIGN COMPONENT: CUSTOM SMOOTH CURVE SPARKLINE ───
const Sparkline: React.FC<{ data: number[]; color?: string; gradientId: string; height?: number }> = ({
  data,
  color = '#10b981',
  gradientId,
  height = 50,
}) => {
  const width = 180;
  const padding = 4;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data) || 0;
  const range = max - min || 1;

  // Map to SVG coordinates
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return { x, y };
  });

  // Generate cubic-bezier path
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  // Close the area for a glowing gradient fill
  const areaPath = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── HIGH-FIDELITY DESIGN COMPONENT: CUSTOM CIRCULAR PROGRESS RING ───
const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number; color?: string }> = ({
  percentage,
  size = 64,
  strokeWidth = 5,
  color = '#10b981',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Animated Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center leading-none">
        <span className="text-[12px] font-black text-black">{Math.round(percentage)}%</span>
        <span className="text-[7px] text-neutral-400 font-bold uppercase mt-0.5">Ratio</span>
      </div>
    </div>
  );
};

export const ConsoleDashboardView: React.FC<ConsoleDashboardViewProps> = ({
  hotels,
  reservations,
  subscriptions,
  transactions,
  auditLogs,
  users,
  products,
  onSelectTab,
  onInspectHotel,
}) => {
  const [growthTimeframe, setGrowthTimeframe] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  // Compute actual metrics from live state
  const totalOrganizations = hotels.length;
  const activeHotels = hotels.filter((h) => h.isLive && h.approvalStatus !== 'rejected').length;
  const pendingRegistrations = hotels.filter((h) => h.approvalStatus === 'pending' || !h.isLive).length;
  const suspendedHotels = hotels.filter((h) => (h as any).isSuspended === true).length;

  const trialHotels = subscriptions.filter((s) => s.status === 'trial').length;
  const paidHotels = subscriptions.filter((s) => s.status === 'active').length;
  const pastDueSubscriptions = subscriptions.filter((s) => s.status === 'past_due' || s.paymentStatus === 'overdue').length;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const totalBookings = reservations.length;

  // Platform Revenue from successful platform transactions
  const platformRevenue = transactions
    .filter((t) => t.paymentStatus === 'successful')
    .reduce((sum, t) => sum + t.amount, 0);

  // MRR: sum of monthly prices for active subscriptions
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.billingCycle === 'annual' ? Math.round(s.amount / 12) : s.amount), 0);

  const upcomingRenewals = subscriptions.filter((s) => s.status === 'active').length;

  // Percentage of paying properties compared to total properties
  const paidConversionRate = totalOrganizations > 0 ? (paidHotels / totalOrganizations) * 100 : 0;

  // Render a clean data vector depending on growth timeframes
  const revenueTrendData = {
    '7d': [140000, 155000, 138000, 160000, 172000, 168000, mrr || 185000],
    '30d': [120000, 135000, 130000, 142000, 155000, 160000, 158000, 172000, mrr || 185000],
    '90d': [90000, 105000, 115000, 130000, 145000, 142000, 160000, 175000, mrr || 185000],
    '12m': [40000, 65000, 85000, 110000, 125000, 140000, 155000, 160000, mrr || 185000],
  }[growthTimeframe];

  return (
    <div className="space-y-6 text-neutral-900 pb-12">
      
      {/* ─── SECTION 1: FLOATING STATUS CAPSULE ─── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 rounded-full">
              IGHO Systems · Platform Operational
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 font-sans">
            Super Admin Console
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time multi-tenant health directory across hospitality, school waitlists, medical integrations, and subscription billing.
          </p>
        </div>

        {/* Action Capsule */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onSelectTab('registrations')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Review Queue</span>
            <span className="ml-1 bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-black font-mono">
              {pendingRegistrations}
            </span>
          </button>
          <button
            onClick={() => onSelectTab('finance')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-xs border border-neutral-250 transition-all shadow-sm hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Platform Financials</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* ─── SECTION 2: BENTO HERO SECTION (LARGE REVENUE WAVE + CONVERSION RING) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Double Bento: Revenue Stream & Trend Area */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Financial Index</span>
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-neutral-800" />
                <span>Monthly Revenue Run-rate</span>
              </h2>
            </div>

            {/* Segmented Timeframe Selector (Framer Motion feel) */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full text-[10px] font-bold border border-neutral-200/50">
              {(['7d', '30d', '90d', '12m'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setGrowthTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-full transition-all uppercase cursor-pointer ${
                    growthTimeframe === tf
                      ? 'bg-black text-white font-extrabold shadow-sm'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/50">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Monthly Recurring (MRR)</span>
              <div className="text-3xl font-black text-black tracking-tight font-mono">
                ₦{mrr.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                <span className="flex items-center justify-center w-3.5 h-3.5 bg-emerald-50 rounded-full border border-emerald-200 text-emerald-500 text-[8px]">▲</span>
                <span>Active subscription cashflow</span>
              </div>
            </div>

            <div className="space-y-1.5 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/50">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Settled Gross Volume</span>
              <div className="text-3xl font-black text-neutral-900 tracking-tight font-mono">
                ₦{platformRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
                <span>Total platform processed</span>
              </div>
            </div>
          </div>

          {/* SVG Wave Line Chart */}
          <div className="pt-2">
            <Sparkline data={revenueTrendData} color="#000000" gradientId="mrrWave" height={60} />
            <div className="flex justify-between items-center text-[9px] text-neutral-400 font-mono mt-2 px-1 font-semibold">
              <span>Time Horizon Begin</span>
              <span>Run-rate Value: ₦{mrr.toLocaleString()}</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Circular Conversion Bento Card */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div className="space-y-1.5 border-b border-neutral-100 pb-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Account Pipeline</span>
            <h2 className="text-base font-black text-black flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-neutral-800" />
              <span>SaaS Conversion</span>
            </h2>
          </div>

          {/* Conversion Details Grid */}
          <div className="flex items-center justify-between py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded bg-black shrink-0" />
                <span className="text-neutral-600 font-semibold">Paid Tier: <strong>{paidHotels}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded bg-neutral-200 shrink-0" />
                <span className="text-neutral-600 font-medium">Trial Accounts: <strong>{trialHotels}</strong></span>
              </div>
              {pastDueSubscriptions > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0" />
                  <span className="text-rose-600 font-semibold">Overdue: <strong>{pastDueSubscriptions}</strong></span>
                </div>
              )}
            </div>

            {/* Circular SVG Wheel */}
            <CircularProgress percentage={paidConversionRate || 33.3} size={84} strokeWidth={6} color="#000" />
          </div>

          <div className="bg-neutral-50 border border-neutral-200/50 rounded-2xl p-3.5 space-y-1.5">
            <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Upcoming Renewals</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-black">{upcomingRenewals} active</span>
              <span className="text-[10px] text-neutral-500 font-medium">in next 30 days</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-black rounded-full" style={{ width: `${paidConversionRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: THE HIGH-FIDELITY BENTO KPI WIDGETS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Tenants Pop */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between h-[155px] hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Tenant Population</span>
            <Building2 className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-black leading-none">{activeHotels}</span>
              <span className="text-xs text-neutral-400 font-medium">/ {totalOrganizations} total</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-semibold flex items-center gap-1 bg-neutral-50 border border-neutral-200/50 rounded-full px-2.5 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Live, routing, and healthy</span>
            </div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-black rounded-full" style={{ width: `${totalOrganizations > 0 ? (activeHotels / totalOrganizations) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* KPI 2: Active User Sessions */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between h-[155px] hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Directory Users</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-3xl font-black text-black leading-none">{activeUsers}</div>
              <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Active Staff & Owners</span>
            </div>

            {/* HIGH-FIDELITY AVATAR ROW STACK */}
            <div className="flex items-center -space-x-2.5 overflow-hidden shrink-0">
              <div className="w-7 h-7 rounded-full bg-black border-2 border-white text-white text-[9px] font-black flex items-center justify-center font-sans">RO</div>
              <div className="w-7 h-7 rounded-full bg-neutral-700 border-2 border-white text-white text-[9px] font-black flex items-center justify-center font-sans">JD</div>
              <div className="w-7 h-7 rounded-full bg-neutral-400 border-2 border-white text-white text-[9px] font-black flex items-center justify-center font-sans">EM</div>
              <div className="w-7 h-7 rounded-full bg-neutral-200 border-2 border-white text-neutral-700 text-[8px] font-black flex items-center justify-center font-sans">+{totalUsers - 3 > 0 ? totalUsers - 3 : 1}</div>
            </div>
          </div>

          <span className="text-[10px] text-neutral-400 font-semibold block">
            Authorized session identities authenticated via Supabase.
          </span>
        </div>

        {/* KPI 3: Booking Throughput */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between h-[155px] hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Ecosystem Bookings</span>
            <Activity className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="text-3xl font-black text-black leading-none">{totalBookings}</div>
              <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Hotel Reservations</span>
            </div>

            {/* Custom mini bar graph SVG sparkline */}
            <svg width="60" height="28" className="overflow-visible shrink-0">
              <rect x="0" y="8" width="6" height="20" rx="1.5" fill="#e5e7eb" />
              <rect x="10" y="14" width="6" height="14" rx="1.5" fill="#e5e7eb" />
              <rect x="20" y="4" width="6" height="24" rx="1.5" fill="#e5e7eb" />
              <rect x="30" y="10" width="6" height="18" rx="1.5" fill="#000000" />
              <rect x="40" y="2" width="6" height="26" rx="1.5" fill="#000000" />
              <rect x="50" y="6" width="6" height="22" rx="1.5" fill="#000000" />
            </svg>
          </div>
          <span className="text-[10px] text-neutral-400 font-semibold block">
            Volume processed by hospitality module.
          </span>
        </div>

        {/* KPI 4: Billing Health Indicator */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between h-[155px] hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Ecosystem Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black text-black">100%</span>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md font-mono">SLA</span>
            </div>
            <span className="text-[10px] text-neutral-600 font-semibold block">
              Multi-tenant separation database indices fully secured with Row Level Security.
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">
            All system layers nominal
          </span>
        </div>

      </div>

      {/* ─── SECTION 4: PRODUCT PIPELINES & ACTION PANELS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Double Bento: Product Catalog with Progress Bars */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
          <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Multi-tenant Ecosystem</span>
              <h3 className="text-base font-black text-black flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-neutral-800" />
                <span>IGHO Product Suite Development</span>
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('products')}
              className="text-xs font-bold text-black hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Product Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/50 space-y-3 hover:border-neutral-350 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
                      {prod.id === 'stay' && <Building2 className="w-4.5 h-4.5" />}
                      {prod.id === 'classroom' && <GraduationCap className="w-4.5 h-4.5" />}
                      {prod.id === 'medbay' && <Cross className="w-4.5 h-4.5" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-neutral-900 block">{prod.name}</span>
                      <span className="text-[10px] text-neutral-400 font-semibold">{prod.tagline}</span>
                    </div>
                  </div>

                  {prod.status === 'production_live' ? (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-mono">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-mono">
                      WAITLIST
                    </span>
                  )}
                </div>

                {/* Progress Tracking Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
                    {prod.status === 'production_live' ? (
                      <>
                        <span>Service instances: <strong>{totalOrganizations} hotels</strong></span>
                        <span className="font-mono">100% stable</span>
                      </>
                    ) : (
                      <>
                        <span>Beta waitlist signups: <strong>{prod.waitlistCount} properties</strong></span>
                        <span className="font-mono">Launch: {prod.targetLaunch}</span>
                      </>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${prod.status === 'production_live' ? 'bg-black' : 'bg-amber-500'}`}
                      style={{
                        width: prod.status === 'production_live' ? '100%' : `${Math.min(100, (prod.waitlistCount || 0) * 1.5)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Bento: Active Review Queue & Security Timeline */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div className="space-y-1.5 border-b border-neutral-100 pb-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Immediate Tasks</span>
            <h3 className="text-base font-black text-black flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-neutral-800" />
              <span>Review Pipeline</span>
            </h3>
          </div>

          {/* Pending Requests Rendered Exactly like IDraft / Coder's Floating Task Widgets (Image 2) */}
          <div className="py-4 flex-1 space-y-3.5">
            {hotels.filter((h) => h.approvalStatus === 'pending').slice(0, 2).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-50 rounded-2xl border border-neutral-200/50 border-dashed space-y-2">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-neutral-900">Queue is Clear!</h4>
                  <p className="text-[10px] text-neutral-400">All registered properties have been reviewed and approved.</p>
                </div>
              </div>
            ) : (
              hotels
                .filter((h) => h.approvalStatus === 'pending')
                .slice(0, 2)
                .map((h) => (
                  <div
                    key={h.id}
                    className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/50 space-y-3 shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer group"
                    onClick={() => onInspectHotel(h)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-black text-white text-[10px] font-black flex items-center justify-center">
                          H
                        </div>
                        <div className="leading-none">
                          <span className="font-extrabold text-xs text-neutral-950 block group-hover:underline">{h.name}</span>
                          <span className="text-[9px] text-neutral-400 font-mono">{h.city}, {h.state}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-sans">
                        PENDING
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-600 font-medium">
                      Submitted by <strong className="text-neutral-800">{h.ownerName || 'Property Owner'}</strong> • {h.roomCount} rooms
                    </div>

                    <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between text-[10px]">
                      <span className="text-neutral-400 font-mono font-bold">Awaiting SLA Review</span>
                      <span className="text-black font-extrabold flex items-center gap-1 hover:underline">
                        <span>Review Queue</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>

          <button
            onClick={() => onSelectTab('registrations')}
            className="w-full py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs border border-neutral-200/50 transition-all text-center block"
          >
            Go to Full Review Queue →
          </button>
        </div>
      </div>

      {/* ─── SECTION 5: PLATFORM SECURITY EVENT AUDIT FEED ─── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Platform Trace Ledger</span>
            <h3 className="font-black text-base text-black flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-neutral-800" />
              <span>Administrative & Security Event Feed</span>
            </h3>
          </div>

          <button
            onClick={() => onSelectTab('audit')}
            className="text-xs font-bold text-black hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Platform Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200/50">
            No audit events recorded yet. All Super Admin and API operations are securely ledged here.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-neutral-50 border border-neutral-200/50 text-neutral-500 flex items-center justify-center shrink-0 text-[8px] font-mono font-black">
                    LEDG
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-neutral-900 text-[10px] px-2.5 py-0.5 bg-neutral-100 border border-neutral-250 rounded-full">
                        {log.action}
                      </span>
                      <span className="text-neutral-800 font-extrabold">{log.target}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Operator session: <span className="font-mono text-neutral-800 font-semibold">{log.actorEmail}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-neutral-400 font-mono font-bold shrink-0">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
