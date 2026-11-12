import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Edit3,
  Search,
  Plus,
  Trash2,
  Wallet,
  Building2,
  Save,
  Check,
  ArrowUpDown,
  Layers,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  X,
  Globe,
  HardDrive,
  ArrowRightLeft,
  ArrowUpRight,
  Shield,
  ShieldOff,
  Zap,
} from 'lucide-react';
import { SubscriptionPlan, HotelSubscription, Hotel, PlatformSettings, TrialToken, Room } from '../../types';
import { BackButton } from '../BackButton';
import { KeyRound, Copy, Clock, RefreshCw, Check as CheckIcon, Tag } from 'lucide-react';
import { INITIAL_PLANS } from '../../data/platformData';

interface ConsoleSubscriptionsViewProps {
  subscriptions: HotelSubscription[];
  plans: SubscriptionPlan[];
  hotels: Hotel[];
  rooms?: Room[];
  onUpdateHotels?: (newHotels: Hotel[]) => void;
  settings?: PlatformSettings;
  onUpdateSettings?: (newSettings: PlatformSettings) => void;
  onChangePlanPrice?: (planId: string, newMonthlyPrice: number, newAnnualPrice: number, reason: string) => void;
  onUpdatePlans?: (newPlans: SubscriptionPlan[]) => void;
  onUpdateSubscriptionStatus?: (subId: string, status: any, paymentStatus: any) => void;
  onNavigateBreadcrumb?: () => void;
}


const DEFAULT_TRIAL_TOKENS: TrialToken[] = [
  {
    id: 'tok-trial-30',
    code: 'IGHO-TRIAL-30',
    durationDays: 30,
    status: 'active',
    createdAt: '2026-10-01 10:00:00',
    createdBy: 'Super Admin',
    notes: 'Default launch 1-month free trial promo code',
  },
  {
    id: 'tok-ighofree',
    code: 'IGHOFREE',
    durationDays: 30,
    status: 'active',
    createdAt: '2026-10-05 14:30:00',
    createdBy: 'Super Admin',
    notes: 'Universal 1-month access token',
  },
  {
    id: 'tok-trial2026',
    code: 'TRIAL2026',
    durationDays: 30,
    status: 'active',
    createdAt: '2026-10-10 09:15:00',
    createdBy: 'Super Admin',
    notes: 'Partner hotelier pilot code',
  },
];

export const ConsoleSubscriptionsView: React.FC<ConsoleSubscriptionsViewProps> = ({
  subscriptions,
  plans: initialPlans,
  hotels,
  rooms = [],
  onUpdateHotels,
  settings,
  onUpdateSettings,
  onChangePlanPrice,
  onUpdatePlans,
  onUpdateSubscriptionStatus,
  onNavigateBreadcrumb,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'subscriptions' | 'wallet' | 'tokens'>('plans');
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Hotel Plan Switcher State
  const [migratingHotelId, setMigratingHotelId] = useState<string | null>(null);
  const [migrationSuccessMsg, setMigrationSuccessMsg] = useState<string | null>(null);
  const [switcherSearchQuery, setSwitcherSearchQuery] = useState('');

  const handleMigrateHotelPlan = async (hotelId: string, targetPlanId: string) => {
    try {
      setMigratingHotelId(hotelId);
      const res = await fetch(`/api/hotels/${hotelId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: targetPlanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to update hotel plan.');
        return;
      }

      const isComplete = targetPlanId.includes('50k') || targetPlanId === 'plan-3';
      const updatedHotels = hotels.map((h) =>
        h.id === hotelId
          ? {
              ...h,
              subscriptionPlanId: isComplete ? 'plan-complete-50k' : 'plan-starter-30k',
              subscriptionPlanName: isComplete ? 'Plan 2 — Complete Hospitality Cloud' : 'Plan 1 — Standard Operations (PMS)',
              packageType: isComplete ? ('complete' as const) : ('management' as const),
              hasGuestPortal: isComplete,
            }
          : h
      );

      if (onUpdateHotels) {
        onUpdateHotels(updatedHotels);
      }

      // Also dispatch event for any listening components
      window.dispatchEvent(new CustomEvent('igho_hotel_plan_migrated', { detail: { hotelId, planId: targetPlanId } }));

      setMigrationSuccessMsg(data.message || `Hotel plan successfully updated.`);
      setTimeout(() => setMigrationSuccessMsg(null), 4500);
    } catch (err) {
      console.error(err);
      alert('Network error communicating with server.');
    } finally {
      setMigratingHotelId(null);
    }
  };

  // 1-Month Free Trial Tokens state
  const [trialTokens, setTrialTokens] = useState<TrialToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  const loadBackendTokens = async () => {
    try {
      setTokensLoading(true);
      const res = await fetch('/api/trial-tokens');
      const data = await res.json();
      if (data.success && Array.isArray(data.tokens)) {
        setTrialTokens(data.tokens);
        localStorage.setItem('igho_trial_tokens', JSON.stringify(data.tokens));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    loadBackendTokens();
    window.addEventListener('igho_tokens_updated', loadBackendTokens);
    return () => window.removeEventListener('igho_tokens_updated', loadBackendTokens);
  }, []);

  // Trial Token Generator Form States
  const [newTokenCode, setNewTokenCode] = useState('');
  const [newTokenHotelId, setNewTokenHotelId] = useState('universal');
  const [newTokenNotes, setNewTokenNotes] = useState('');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [tokenGeneratedSuccess, setTokenGeneratedSuccess] = useState<string | null>(null);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'active' | 'used' | 'revoked'>('all');

  const generateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTokenCode(`IGHO-${p1}-${p2}`);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignedHotel = hotels.find((h) => h.id === newTokenHotelId);

    try {
      const res = await fetch('/api/trial-tokens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationDays: 30, // strictly 1 month
          assignedHotelId: newTokenHotelId === 'universal' ? undefined : newTokenHotelId,
          assignedHotelName: assignedHotel?.name,
          notes: newTokenNotes.trim() || '1-Month Free Trial Token',
          customCode: newTokenCode.trim() ? newTokenCode.trim().toUpperCase() : undefined,
          createdBy: 'Super Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to generate token.');
        return;
      }

      setTrialTokens((prev) => [data.token, ...prev]);
      setTokenGeneratedSuccess(data.token.code);
      setNewTokenCode('');
      setNewTokenNotes('');
      setTimeout(() => setTokenGeneratedSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Error generating token from backend server.');
    }
  };

  const handleCopyToken = (token: TrialToken) => {
    navigator.clipboard.writeText(token.code);
    setCopiedTokenId(token.id);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      const res = await fetch(`/api/trial-tokens/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' }),
      });
      if (res.ok) {
        setTrialTokens((prev) =>
          prev.map((t) => (t.id === tokenId ? { ...t, status: 'revoked' as const } : t))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to permanently delete this trial token?')) return;
    try {
      const res = await fetch(`/api/trial-tokens/${tokenId}`, { method: 'DELETE' });
      if (res.ok) {
        setTrialTokens((prev) => prev.filter((t) => t.id !== tokenId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [newMonthly, setNewMonthly] = useState<number>(0);
  const [newAnnual, setNewAnnual] = useState<number>(0);
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');
  const [newFeatureText, setNewFeatureText] = useState<{ [planId: string]: string }>({});

  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  const handleConfirmDeletePlan = () => {
    if (!planToDelete) return;
    const deletedName = planToDelete.name;
    const updated = plans.filter((p) => p.id !== planToDelete.id);
    setPlans(updated);
    if (onUpdatePlans) {
      onUpdatePlans(updated);
    }
    setPlanToDelete(null);
    setDeleteSuccessMsg(`Plan "${deletedName}" was successfully deleted.`);
    setTimeout(() => {
      setDeleteSuccessMsg(null);
    }, 4000);
  };

  const handleRestoreDefaultPlans = () => {
    setPlans(INITIAL_PLANS);
    if (onUpdatePlans) {
      onUpdatePlans(INITIAL_PLANS);
    }
    setDeleteSuccessMsg('Default subscription plans have been restored.');
    setTimeout(() => {
      setDeleteSuccessMsg(null);
    }, 4000);
  };

  // Wallet / Payout State
  const defaultPayout = settings?.subscriptionPayout || {
    walletOrAccount: 'Corporate Bank Account & USDT TRC20',
    networkOrBank: 'Providus Bank PLC / USDT (TRC-20)',
    recipientName: 'IGHO PLATFORMS NIGERIA LTD',
    accountNumber: '0938475811 / TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    notes: 'Please quote your Hotel ID or CAC number in the transaction remark for instant auto-clearing.',
  };
  const [payoutForm, setPayoutForm] = useState(defaultPayout);
  const [walletSavedSuccess, setWalletSavedSuccess] = useState(false);

  // Metrics
  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;
  const pendingCount = subscriptions.filter((s) => s.paymentStatus === 'pending').length;
  const mrr = subscriptions
    .filter((s) => s.status === 'active' || s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + (s.billingCycle === 'annual' ? Math.round(s.amount / 12) : s.amount), 0);

  // Plan Adoption Metrics (Standard ₦30,000 PMS Only vs Complete ₦50,000 Hospitality Cloud)
  const standardHotels = hotels.filter((h) => {
    const plan = h.subscriptionPlanId || '';
    return (
      plan === 'plan-starter-30k' ||
      plan === 'plan-1' ||
      h.packageType === 'management' ||
      h.hasGuestPortal === false
    );
  });

  const completeHotels = hotels.filter((h) => {
    const plan = h.subscriptionPlanId || '';
    return (
      plan === 'plan-complete-50k' ||
      plan === 'plan-3' ||
      h.packageType === 'complete' ||
      h.hasGuestPortal === true
    );
  });

  const standardRoomsCount = standardHotels.reduce((sum, h) => {
    const count = rooms.filter((r) => r.hotelId === h.id).length;
    return sum + (count || h.roomCount || 0);
  }, 0);

  const completeRoomsCount = completeHotels.reduce((sum, h) => {
    const count = rooms.filter((r) => r.hotelId === h.id).length;
    return sum + (count || h.roomCount || 0);
  }, 0);

  const standardMRR = standardHotels.length * 30000;
  const completeMRR = completeHotels.length * 50000;
  const totalTrackedHotels = Math.max(1, hotels.length);
  const standardPct = Math.round((standardHotels.length / totalTrackedHotels) * 100);
  const completePct = 100 - standardPct;

  const filteredSubs = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const hotel = hotels.find((h) => h.id === s.hotelId);
    const hotelName = hotel?.name.toLowerCase() || '';

    const matchesSearch = !q || hotelName.includes(q) || s.planName.toLowerCase().includes(q);
    const matchesStatus = subStatusFilter === 'all' || s.status === subStatusFilter || s.paymentStatus === subStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Price Modal handlers
  const handleOpenPriceModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setNewMonthly(plan.monthlyPrice);
    setNewAnnual(plan.annualPrice);
    setPriceChangeReason('');
  };

  const handleSavePriceChange = () => {
    if (!editingPlan) return;
    const updated = plans.map((p) =>
      p.id === editingPlan.id ? { ...p, monthlyPrice: newMonthly, annualPrice: newAnnual } : p
    );
    setPlans(updated);
    if (onUpdatePlans) onUpdatePlans(updated);
    if (onChangePlanPrice) {
      onChangePlanPrice(editingPlan.id, newMonthly, newAnnual, priceChangeReason || 'Price updated by Super Admin');
    }
    setEditingPlan(null);
  };

  // Add Feature to Plan
  const handleAddFeature = (planId: string) => {
    const feat = newFeatureText[planId]?.trim();
    if (!feat) return;

    const updated = plans.map((p) =>
      p.id === planId ? { ...p, features: [...p.features, feat] } : p
    );
    setPlans(updated);
    if (onUpdatePlans) onUpdatePlans(updated);
    setNewFeatureText({ ...newFeatureText, [planId]: '' });
  };

  // Remove Feature from Plan
  const handleRemoveFeature = (planId: string, featureIndex: number) => {
    const updated = plans.map((p) =>
      p.id === planId ? { ...p, features: p.features.filter((_, i) => i !== featureIndex) } : p
    );
    setPlans(updated);
    if (onUpdatePlans) onUpdatePlans(updated);
  };

  // Save Wallet / Payout info
  const handleSavePayoutWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        subscriptionPayout: payoutForm,
      });
    }
    setWalletSavedSuccess(true);
    setTimeout(() => setWalletSavedSuccess(false), 3500);
  };

  // Quick action: Confirm and activate hotel subscription
  const handleConfirmSubscription = (sub: HotelSubscription) => {
    if (onUpdateSubscriptionStatus) {
      onUpdateSubscriptionStatus(sub.id, 'active', 'paid');
    }
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <BackButton onClick={onNavigateBreadcrumb} />
        <span className="text-neutral-900 font-bold text-sm">Subscriptions & Billing</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">Subscriptions & Billing</h1>
            <p className="text-xs text-neutral-500">
              Manage plans, modify pricing, add tier features, and configure destination payment wallets.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center flex-wrap gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('plans')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'plans'
                ? 'bg-black text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Available Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveSubTab('subscriptions')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'subscriptions'
                ? 'bg-black text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Hotel Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('tokens')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'tokens'
                ? 'bg-black text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Trial Tokens ({trialTokens.filter((t) => t.status === 'active').length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('wallet')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'wallet'
                ? 'bg-black text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Payment Wallet / Bank
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Monthly Run-rate</span>
          <div className="text-2xl font-black text-black mt-1 font-mono">₦{mrr.toLocaleString()}</div>
          <span className="text-[10px] text-neutral-400">Total recurring revenue</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Active Accounts</span>
          <div className="text-2xl font-black text-black mt-1">{activeSubsCount}</div>
          <span className="text-[10px] text-emerald-700 font-medium">Paying live hotels</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Trial Tokens</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{trialTokens.filter((t) => t.status === 'active').length}</div>
          <span className="text-[10px] text-neutral-400">1-Month active tokens</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Payments</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting verification</span>
        </div>
      </div>

      {/* TAB 1: AVAILABLE PLANS CATALOG & FEATURE MANAGEMENT */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-black">Available Subscription Plans</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                  {plans.length} {plans.length === 1 ? 'Plan' : 'Plans'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage pricing tiers, remove unneeded plans, and modify what's included in each package.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {plans.length < INITIAL_PLANS.length && (
                <button
                  type="button"
                  onClick={handleRestoreDefaultPlans}
                  className="px-3 py-1.5 rounded-full border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-3xs transition-colors"
                  title="Reset to default platform plans"
                >
                  <RefreshCw className="w-3 h-3 text-neutral-500" />
                  <span>Restore Default Plans</span>
                </button>
              )}
            </div>
          </div>

          {/* Delete success notification banner */}
          {deleteSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{deleteSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* REQUIREMENT: PLAN ADOPTION BREAKDOWN & COMPARISON WIDGET (₦30,000 vs ₦50,000) */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">
                  Market Adoption & Entitlement Matrix
                </span>
                <h3 className="text-base font-black text-black">
                  ₦30,000 Standard vs ₦50,000 Complete Plan Comparison
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                  {hotels.length} Registered Properties
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                  ₦{(standardMRR + completeMRR).toLocaleString()} Total MRR
                </span>
              </div>
            </div>

            {/* Side-by-side Plan Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plan 1: ₦30,000 Standard */}
              <div className="bg-neutral-50/70 border border-neutral-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-800 border border-neutral-300">
                      <span>PLAN 1 — STARTER</span>
                    </div>
                    <h4 className="text-lg font-black text-black mt-1">₦30,000 / month</h4>
                    <p className="text-xs text-neutral-500">Standard Operations PMS Only</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-black font-mono">{standardHotels.length}</span>
                    <span className="text-[10px] text-neutral-400 block font-medium">Hotels ({standardPct}%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-neutral-200/80 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Managed Rooms</span>
                    <span className="text-base font-black text-neutral-900 font-mono">{standardRoomsCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Monthly Run-rate</span>
                    <span className="text-base font-black text-neutral-900 font-mono">₦{standardMRR.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <HardDrive className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Storage Entitlement:</span>
                    </span>
                    <span className="font-bold font-mono text-black">1 GB Total Org Storage</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ShieldOff className="w-3.5 h-3.5 text-rose-500" />
                      <span>Public Guest Portal:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200 text-neutral-700">
                      NO Guest Portal (PMS Only)
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan 2: ₦50,000 Complete */}
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>PLAN 2 — COMPLETE</span>
                    </div>
                    <h4 className="text-lg font-black text-black mt-1">₦50,000 / month</h4>
                    <p className="text-xs text-neutral-500">Complete Hospitality Cloud</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-700 font-mono">{completeHotels.length}</span>
                    <span className="text-[10px] text-emerald-600 block font-medium">Hotels ({completePct}%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-emerald-200/80 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Managed Rooms</span>
                    <span className="text-base font-black text-neutral-900 font-mono">{completeRoomsCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Monthly Run-rate</span>
                    <span className="text-base font-black text-emerald-700 font-mono">₦{completeMRR.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Storage Entitlement:</span>
                    </span>
                    <span className="font-bold font-mono text-emerald-900">10 GB Total Org Storage</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Public Guest Portal:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Included (Direct Online Booking)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proportion Distribution Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-bold text-neutral-500">
                <span>Standard ₦30k ({standardPct}%)</span>
                <span>Complete ₦50k ({completePct}%)</span>
              </div>
              <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex p-0.5 border border-neutral-200">
                <div
                  className="h-full bg-neutral-700 rounded-l-full transition-all duration-500"
                  style={{ width: `${standardPct}%` }}
                />
                <div
                  className="h-full bg-emerald-500 rounded-r-full transition-all duration-500"
                  style={{ width: `${completePct}%` }}
                />
              </div>
            </div>
          </div>


          {plans.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 bg-neutral-100 text-neutral-500 rounded-2xl flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">No Subscription Plans Available</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  All subscription plans have been deleted. You can restore the initial default platform tiers at any time.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreDefaultPlans}
                className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-full shadow-sm cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore Default Plans</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-black/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-black">{plan.name}</h3>
                        <span className="text-[10px] font-mono text-neutral-400">{plan.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {plan.trialDurationDays} Days Trial
                        </span>
                        <button
                          type="button"
                          onClick={() => setPlanToDelete(plan)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Delete ${plan.name} Plan`}
                          aria-label={`Delete ${plan.name} Plan`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                      <div className="text-2xl font-black text-black font-mono">
                        ₦{plan.monthlyPrice.toLocaleString()}{' '}
                        <span className="text-xs text-neutral-500 font-normal">/ month</span>
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">
                        ₦{plan.annualPrice.toLocaleString()} / year (save 17%)
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 pt-2 border-t border-neutral-100">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                        <span>Included Features ({plan.features.length})</span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {plan.features.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 group"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{feat}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(plan.id, idx)}
                              className="text-neutral-400 hover:text-rose-600 p-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Remove feature"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add Feature input */}
                      <div className="pt-2 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newFeatureText[plan.id] || ''}
                          onChange={(e) =>
                            setNewFeatureText({ ...newFeatureText, [plan.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFeature(plan.id);
                            }
                          }}
                          placeholder="Add new feature..."
                          className="flex-1 p-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:border-black"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddFeature(plan.id)}
                          className="px-2.5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Add feature"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => handleOpenPriceModal(plan)}
                      className="w-full py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Adjust Price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanToDelete(plan)}
                      className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      title={`Delete ${plan.name} Plan`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Plan</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REQUIREMENT: HOTEL PLAN MIGRATION & DIRECT SWITCHER TABLE */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-neutral-800" />
                  <h3 className="text-base font-black text-black">
                    Hotel Plan Assignment & Live Switcher
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                    {hotels.length} Properties
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Super Admin override: switch any hotel between ₦30,000 Standard (PMS only, 1GB storage) and ₦50,000 Complete (PMS + Guest Portal, 10GB storage) tiers.
                </p>
              </div>

              {/* Local Search input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={switcherSearchQuery}
                  onChange={(e) => setSwitcherSearchQuery(e.target.value)}
                  placeholder="Filter hotel by name or ID..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Migration Success Banner */}
            {migrationSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{migrationSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMigrationSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="p-3.5 text-center w-12">S/N</th>
                    <th className="p-3.5">Hotel ID</th>
                    <th className="p-3.5">Hotel / Property</th>
                    <th className="p-3.5 text-center">Live Rooms</th>
                    <th className="p-3.5">Current Plan</th>
                    <th className="p-3.5">Storage Quota</th>
                    <th className="p-3.5">Guest Portal</th>
                    <th className="p-3.5 text-right">Switch / Migrate Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {hotels
                    .filter((h) => {
                      const q = switcherSearchQuery.toLowerCase();
                      return (
                        !q ||
                        h.name.toLowerCase().includes(q) ||
                        h.id.toLowerCase().includes(q) ||
                        (h.city || '').toLowerCase().includes(q)
                      );
                    })
                    .map((hotel, idx) => {
                      const isComplete =
                        hotel.hasGuestPortal === true ||
                        hotel.subscriptionPlanId === 'plan-complete-50k' ||
                        hotel.subscriptionPlanId === 'plan-3' ||
                        hotel.packageType === 'complete';

                      const dynamicRoomCount =
                        rooms.filter((r) => r.hotelId === hotel.id).length || hotel.roomCount || 0;

                      const isMigrating = migratingHotelId === hotel.id;

                      const serialNumber = idx + 1;
                      const formattedHotelId = hotel.id.startsWith('HTL-')
                        ? hotel.id
                        : `HTL-${hotel.id.replace(/[^0-9]/g, '').padStart(3, '0') || String(serialNumber).padStart(3, '0')}`;

                      return (
                        <tr key={hotel.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="p-3.5 text-center font-mono font-bold text-neutral-400">
                            {serialNumber}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-[11px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200">
                              {formattedHotelId}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-neutral-900">{hotel.name}</div>
                            <div className="text-[10px] text-neutral-400">
                              {hotel.city || 'Lagos'}, {hotel.state || 'Nigeria'}
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-neutral-900">
                            {dynamicRoomCount}
                          </td>
                          <td className="p-3.5">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>Complete (₦50,000)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                                <span>Standard (₦30,000)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-semibold text-neutral-700 flex items-center gap-1">
                              <HardDrive className="w-3 h-3 text-neutral-400" />
                              <span>{isComplete ? '10 GB' : '1 GB'}</span>
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Active & Live</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                                <ShieldOff className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Disabled (PMS Only)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isMigrating ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating...</span>
                              </span>
                            ) : isComplete ? (
                              <button
                                type="button"
                                onClick={() => handleMigrateHotelPlan(hotel.id, 'plan-starter-30k')}
                                className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all shadow-3xs cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                title="Downgrade to Standard ₦30k plan (PMS only, 1GB storage, no guest portal)"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-neutral-500" />
                                <span>Switch to ₦30,000 Standard</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMigrateHotelPlan(hotel.id, 'plan-complete-50k')}
                                className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                title="Upgrade to Complete ₦50k plan (10GB storage + Guest Portal enabled)"
                              >
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Upgrade to ₦50,000 Complete</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: HOTEL SUBSCRIPTIONS & PAYMENT PLANS */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hotel subscriptions..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none"
              >
                <option value="all">All Subscriptions</option>
                <option value="active">Active Status</option>
                <option value="pending">Pending Payment</option>
                <option value="paid">Paid & Verified</option>
                <option value="trial">Free Trial</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="p-4">Hotel / Organization</th>
                    <th className="p-4">Chosen Plan Tier</th>
                    <th className="p-4">Billing Cycle</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Payment Status</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-400">
                        No hotel subscriptions found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => {
                      const hotel = hotels.find((h) => h.id === sub.hotelId);
                      const isPending = sub.paymentStatus === 'pending' || sub.status === 'trial';
                      return (
                        <tr key={sub.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-neutral-900">{sub.hotelName || hotel?.name}</div>
                            <div className="text-[11px] text-neutral-500 font-mono">{sub.hotelId}</div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-black">{sub.planName}</span>
                          </td>
                          <td className="p-4 capitalize text-neutral-600">{sub.billingCycle}</td>
                          <td className="p-4 font-mono font-bold">₦{sub.amount?.toLocaleString()}</td>
                          <td className="p-4">
                            {sub.paymentStatus === 'paid' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Paid & Confirmed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Pending Payment
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 capitalize">
                              {sub.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleConfirmSubscription(sub)}
                                className="px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-2xs transition-all"
                              >
                                Confirm & Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 1-MONTH FREE TRIAL TOKENS GENERATOR & MANAGER */}
      {activeSubTab === 'tokens' && (
        <div className="space-y-6">
          {/* Header & Token Generator */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-black">Generate 1-Month Free Trial Token</h2>
                  <p className="text-xs text-neutral-500">
                    Create special codes for approved hotels to claim their 1-month free trial before paying.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>Valid for 1 Month (30 Days)</span>
                </span>
              </div>
            </div>

            {/* Success notification banner */}
            {tokenGeneratedSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    New Trial Token created: <strong className="font-mono text-sm tracking-wider text-black">{tokenGeneratedSuccess}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tokenGeneratedSuccess);
                    setCopiedTokenId(tokenGeneratedSuccess);
                    setTimeout(() => setCopiedTokenId(null), 2500);
                  }}
                  className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1 shadow-2xs"
                >
                  {copiedTokenId === tokenGeneratedSuccess ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateToken} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              <div className="md:col-span-4 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                    Special Token Code
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomToken}
                    className="text-[11px] text-black font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={newTokenCode}
                  onChange={(e) => setNewTokenCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IGHO-TRIAL-30 or IGHO-TR-9428"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900 uppercase focus:outline-none focus:border-black"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Assigned Hotel (Optional)
                </label>
                <select
                  value={newTokenHotelId}
                  onChange={(e) => setNewTokenHotelId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                >
                  <option value="universal">Universal (Any Approved Hotel)</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city || 'Nigeria'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={newTokenNotes}
                  onChange={(e) => setNewTokenNotes(e.target.value)}
                  placeholder="e.g. Pilot launch partner token"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Token</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tokens List & History */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-bold text-black">
                  Issued Free Trial Tokens ({trialTokens.length})
                </h3>
              </div>

              <div className="flex items-center gap-1.5 bg-neutral-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTokenFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tokenFilter === 'all' ? 'bg-white text-black shadow-xs font-bold' : 'text-neutral-600'
                  }`}
                >
                  All ({trialTokens.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTokenFilter('active')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tokenFilter === 'active' ? 'bg-white text-black shadow-xs font-bold' : 'text-neutral-600'
                  }`}
                >
                  Active ({trialTokens.filter((t) => t.status === 'active').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTokenFilter('used')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tokenFilter === 'used' ? 'bg-white text-black shadow-xs font-bold' : 'text-neutral-600'
                  }`}
                >
                  Claimed / Used ({trialTokens.filter((t) => t.status === 'used').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTokenFilter('revoked')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tokenFilter === 'revoked' ? 'bg-white text-black shadow-xs font-bold' : 'text-neutral-600'
                  }`}
                >
                  Revoked ({trialTokens.filter((t) => t.status === 'revoked').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="p-3">Special Token Code</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Designated Scope</th>
                    <th className="p-3">Token Status</th>
                    <th className="p-3">Created / Claimed Details</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {trialTokens
                    .filter((t) => tokenFilter === 'all' || t.status === tokenFilter)
                    .map((token) => {
                      const isCopied = copiedTokenId === token.id;
                      return (
                        <tr key={token.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm tracking-wide text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                                {token.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyToken(token)}
                                className="p-1 hover:bg-neutral-200 rounded text-neutral-600 hover:text-black transition-colors"
                                title="Copy code"
                              >
                                {isCopied ? (
                                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {token.notes && (
                              <div className="text-[10px] text-neutral-500 mt-1 truncate max-w-xs">
                                {token.notes}
                              </div>
                            )}
                          </td>

                          <td className="p-3 font-semibold text-neutral-900">
                            1 Month ({token.durationDays} Days)
                          </td>

                          <td className="p-3">
                            {token.assignedHotelName ? (
                              <div>
                                <span className="font-bold text-black">{token.assignedHotelName}</span>
                                <span className="block text-[10px] font-mono text-neutral-400">{token.assignedHotelId}</span>
                              </div>
                            ) : (
                              <span className="text-neutral-500 italic">Universal (Any Hotel)</span>
                            )}
                          </td>

                          <td className="p-3">
                            {token.status === 'active' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active & Valid
                              </span>
                            )}
                            {token.status === 'used' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                Claimed
                              </span>
                            )}
                            {token.status === 'revoked' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                                Revoked
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-[11px] text-neutral-500 space-y-0.5">
                            <div>Created: {token.createdAt}</div>
                            {token.claimedByHotelName && (
                              <div className="text-blue-700 font-semibold">
                                Claimed by: {token.claimedByHotelName} on {new Date(token.claimedAt || '').toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyToken(token)}
                                className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700"
                              >
                                {isCopied ? 'Copied' : 'Copy'}
                              </button>
                              {token.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeToken(token.id)}
                                  className="px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-50 text-xs font-semibold text-amber-700"
                                >
                                  Revoke
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteToken(token.id)}
                                className="p-1 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                                title="Delete token"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WALLET / BANK RECIPIENT DESTINATION */}
      {activeSubTab === 'wallet' && (
        <div className="max-w-2xl bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <Wallet className="w-5 h-5 text-neutral-800" />
              <span>Subscription Payout Destination Wallet / Bank</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Hotels paying for IGHO subscriptions are directed to make payments to this bank account or crypto wallet.
            </p>
          </div>

          {walletSavedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Subscription payout destination updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSavePayoutWallet} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Account / Wallet Type Label:
              </label>
              <input
                type="text"
                value={payoutForm.walletOrAccount}
                onChange={(e) => setPayoutForm({ ...payoutForm, walletOrAccount: e.target.value })}
                placeholder="e.g. Corporate Bank Account & USDT TRC20"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Bank Name or Crypto Network:
              </label>
              <input
                type="text"
                value={payoutForm.networkOrBank}
                onChange={(e) => setPayoutForm({ ...payoutForm, networkOrBank: e.target.value })}
                placeholder="e.g. Providus Bank PLC / USDT (TRC-20)"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Account Number or Wallet Address:
              </label>
              <input
                type="text"
                value={payoutForm.accountNumber}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                placeholder="e.g. 0938475811 or TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Account Name / Beneficiary:
              </label>
              <input
                type="text"
                value={payoutForm.recipientName}
                onChange={(e) => setPayoutForm({ ...payoutForm, recipientName: e.target.value })}
                placeholder="e.g. IGHO PLATFORMS NIGERIA LTD"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Payment Instructions / Notes for Hotels:
              </label>
              <textarea
                value={payoutForm.notes || ''}
                onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                rows={3}
                placeholder="e.g. Please quote your hotel name or reference in narration"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-full transition-all shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Payment Wallet & Account</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Pricing Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">Adjust Pricing for {editingPlan.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase">Monthly Price (₦)</label>
                <input
                  type="number"
                  value={newMonthly}
                  onChange={(e) => setNewMonthly(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase">Annual Price (₦)</label>
                <input
                  type="number"
                  value={newAnnual}
                  onChange={(e) => setNewAnnual(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase">Reason for Update</label>
                <input
                  type="text"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  placeholder="e.g. Q3 general tariff revision"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePriceChange}
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
              >
                Save New Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Plan Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">Delete Subscription Plan</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Are you sure you want to permanently delete the{' '}
                  <strong className="text-neutral-900 font-semibold">{planToDelete.name}</strong> plan?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-600">
                <span>Plan Identifier:</span>
                <span className="font-mono font-bold text-neutral-900">{planToDelete.id}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Monthly Tariff:</span>
                <span className="font-mono font-bold text-neutral-900">₦{planToDelete.monthlyPrice.toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Annual Tariff:</span>
                <span className="font-mono font-bold text-neutral-900">₦{planToDelete.annualPrice.toLocaleString()} / yr</span>
              </div>
            </div>

            {(() => {
              const activeCount = subscriptions.filter(
                (s) =>
                  s.planName.toLowerCase() === planToDelete.name.toLowerCase() ||
                  s.id.toLowerCase().includes(planToDelete.id.toLowerCase())
              ).length;
              if (activeCount > 0) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> {activeCount} active hotel subscription(s) currently reference this plan tier. Deleting it will remove it from the available catalogue for future onboarding and renewals.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
