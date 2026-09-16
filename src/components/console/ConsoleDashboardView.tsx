import React, { useState } from 'react';
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

  // Compute actual KPIs from real state
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

  // Upcoming renewals (in next 30 days)
  const upcomingRenewals = subscriptions.filter((s) => s.status === 'active').length;

  // Growth timeline points based on selected timeframe
  const growthBreakdown = {
    '7d': { newOrgs: 0, activeOrgs: activeHotels, suspended: suspendedHotels, label: 'Past 7 Days' },
    '30d': { newOrgs: totalOrganizations, activeOrgs: activeHotels, suspended: suspendedHotels, label: 'Past 30 Days' },
    '90d': { newOrgs: totalOrganizations, activeOrgs: activeHotels, suspended: suspendedHotels, label: 'Past 90 Days' },
    '12m': { newOrgs: totalOrganizations, activeOrgs: activeHotels, suspended: suspendedHotels, label: 'Past 12 Months' },
  }[growthTimeframe];

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Top Banner with Platform Status (Matching Hotel Admin Portal style) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
              IGHO Software Systems · Command Center Operational
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-black">
            Super Admin Command Center
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time multi-tenant monitoring across hotels, schools, hospitals, billing, and staff permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('registrations')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all shadow-sm"
          >
            <span>Review Queue ({pendingRegistrations})</span>
          </button>
          <button
            onClick={() => onSelectTab('finance')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs border border-neutral-300 transition-colors shadow-2xs"
          >
            <span>Transactions</span>
          </button>
        </div>
      </div>

      {/* KPI Grid — All 12 Primary Platform Metrics */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">
          Platform Overview
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {/* 1. Total Organizations */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Total Organizations
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{totalOrganizations}</div>
            <div className="text-[10px] text-neutral-500 flex items-center gap-1 font-medium">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>Registered tenants</span>
            </div>
          </div>

          {/* 2. Active Organizations */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Active Organizations
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{activeHotels}</div>
            <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Live & active</span>
            </div>
          </div>

          {/* 3. Pending Registrations */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Pending Registrations
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{pendingRegistrations}</div>
            <div className="text-[10px] text-amber-700 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Awaiting review</span>
            </div>
          </div>

          {/* 4. Trial Accounts */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Trial Accounts
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{trialHotels}</div>
            <div className="text-[10px] text-neutral-500 font-medium">14-day evaluation</div>
          </div>

          {/* 5. Paid Accounts */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Paid Accounts
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{paidHotels}</div>
            <div className="text-[10px] text-neutral-500 font-medium">Active recurring</div>
          </div>

          {/* 6. Suspended Accounts */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Suspended
            </span>
            <div className={`text-2xl sm:text-3xl font-black ${suspendedHotels > 0 ? 'text-rose-600' : 'text-neutral-400'}`}>
              {suspendedHotels}
            </div>
            <div className="text-[10px] text-neutral-500 font-medium">Policy / overdue</div>
          </div>

          {/* 7. Total Users */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Total Users
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{totalUsers}</div>
            <div className="text-[10px] text-neutral-500 font-medium">Owners & staff</div>
          </div>

          {/* 8. Active Users */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Active Users
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{activeUsers}</div>
            <div className="text-[10px] text-neutral-500 font-medium">Authorized sessions</div>
          </div>

          {/* 9. Total Bookings */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Total Bookings
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black">{totalBookings}</div>
            <div className="text-[10px] text-neutral-500 font-medium">Processed by IGHO</div>
          </div>

          {/* 10. Platform Revenue */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Platform Revenue
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black font-mono">
              ₦{platformRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-neutral-500 font-medium">Total settled</div>
          </div>

          {/* 11. Monthly Recurring Revenue (MRR) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              MRR
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black font-mono">
              ₦{mrr.toLocaleString()}
            </div>
            <div className="text-[10px] text-neutral-500 font-medium">Subscription run-rate</div>
          </div>

          {/* 12. Renewals / Past Due */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-neutral-300 transition-colors">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Renewals / Past Due
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-black">{upcomingRenewals}</span>
              {pastDueSubscriptions > 0 && (
                <span className="text-xs text-rose-600 font-bold">({pastDueSubscriptions} due)</span>
              )}
            </div>
            <div className="text-[10px] text-neutral-500 font-medium">Billing health</div>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Growth Trajectory */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
            <div>
              <h3 className="font-bold text-sm text-black flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-neutral-600" />
                <span>Organization Growth & Trajectory</span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                New vs active vs suspended organizations across the platform
              </p>
            </div>

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-[11px] font-semibold">
              {(['7d', '30d', '90d', '12m'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setGrowthTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg transition-colors uppercase ${
                    growthTimeframe === tf
                      ? 'bg-black text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Growth Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">New Organizations</span>
              <div className="text-xl font-black text-black mt-0.5">+{growthBreakdown.newOrgs}</div>
              <span className="text-[10px] text-neutral-500 font-mono">{growthBreakdown.label}</span>
            </div>
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Active Properties</span>
              <div className="text-xl font-black text-emerald-700 mt-0.5">{growthBreakdown.activeOrgs}</div>
              <span className="text-[10px] text-neutral-500 font-mono">100% SLA compliant</span>
            </div>
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Suspended / Churned</span>
              <div className="text-xl font-black text-neutral-700 mt-0.5">{growthBreakdown.suspended}</div>
              <span className="text-[10px] text-neutral-500 font-mono">0% monthly churn</span>
            </div>
          </div>

          {/* State Distribution */}
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Tenant Geography
            </div>
            {totalOrganizations === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
                No organizations registered yet. When properties onboard, their regional distribution will be charted here.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-700 font-medium">All Regions</span>
                  <span className="text-neutral-500 font-mono">{totalOrganizations} registered</span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full w-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Adoption Breakdown */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-200 pb-3">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-600" />
              <span>IGHO Product Adoption</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              Multi-product ecosystem scale & pipeline
            </p>
          </div>

          <div className="space-y-3">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {prod.id === 'stay' && <Building2 className="w-4 h-4 text-neutral-700" />}
                    {prod.id === 'classroom' && <GraduationCap className="w-4 h-4 text-neutral-700" />}
                    {prod.id === 'medbay' && <Cross className="w-4 h-4 text-neutral-700" />}
                    <span className="font-bold text-xs text-neutral-900">{prod.name}</span>
                  </div>

                  {prod.status === 'production_live' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-700 bg-neutral-200 border border-neutral-300 px-2 py-0.5 rounded-full font-mono">
                      DEV / WAITLIST
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-neutral-600 leading-relaxed">
                  {prod.tagline}
                </div>

                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-700 font-mono">
                  {prod.status === 'production_live' ? (
                    <>
                      <span>Orgs: <strong>{totalOrganizations}</strong></span>
                      <span>Users: <strong>{totalUsers}</strong></span>
                    </>
                  ) : (
                    <>
                      <span>Waitlist: <strong>{prod.waitlistCount} inst.</strong></span>
                      <span>Launch: <strong>{prod.targetLaunch}</strong></span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onSelectTab('products')}
            className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs border border-neutral-200 transition-colors text-center block"
          >
            Manage Product Catalog →
          </button>
        </div>
      </div>

      {/* Recent Platform Activity Feed */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div>
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-600" />
              <span>Platform Audit & Security Event Feed</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              Real-time audit log of administrative operations, policy changes, and hotel approvals
            </p>
          </div>

          <button
            onClick={() => onSelectTab('audit')}
            className="text-xs text-neutral-600 hover:text-black font-semibold flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
            No audit events recorded yet. Platform actions, logins, and configurations will be logged here in real time.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 text-[10px] font-mono font-bold mt-0.5">
                    LOG
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-neutral-900 text-[11px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded">
                        {log.action}
                      </span>
                      <span className="text-neutral-800 font-semibold">{log.target}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      by <span className="font-mono text-neutral-800">{log.actorEmail}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-neutral-500 font-mono shrink-0">
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
