import React, { useState } from 'react';
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
} from 'lucide-react';
import { SubscriptionPlan, HotelSubscription, Hotel, PlatformSettings } from '../../types';
import { BackButton } from '../BackButton';

interface ConsoleSubscriptionsViewProps {
  subscriptions: HotelSubscription[];
  plans: SubscriptionPlan[];
  hotels: Hotel[];
  settings?: PlatformSettings;
  onUpdateSettings?: (newSettings: PlatformSettings) => void;
  onChangePlanPrice?: (planId: string, newMonthlyPrice: number, newAnnualPrice: number, reason: string) => void;
  onUpdatePlans?: (newPlans: SubscriptionPlan[]) => void;
  onUpdateSubscriptionStatus?: (subId: string, status: any, paymentStatus: any) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleSubscriptionsView: React.FC<ConsoleSubscriptionsViewProps> = ({
  subscriptions,
  plans: initialPlans,
  hotels,
  settings,
  onUpdateSettings,
  onChangePlanPrice,
  onUpdatePlans,
  onUpdateSubscriptionStatus,
  onNavigateBreadcrumb,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'subscriptions' | 'wallet'>('plans');
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [newMonthly, setNewMonthly] = useState<number>(0);
  const [newAnnual, setNewAnnual] = useState<number>(0);
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');
  const [newFeatureText, setNewFeatureText] = useState<{ [planId: string]: string }>({});

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
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
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
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Payments</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting verification</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Available Tiers</span>
          <div className="text-2xl font-black text-black mt-1">{plans.length}</div>
          <span className="text-[10px] text-neutral-500">Configured plans</span>
        </div>
      </div>

      {/* TAB 1: AVAILABLE PLANS CATALOG & FEATURE MANAGEMENT */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-black">Available Subscription Plans</h2>
              <p className="text-xs text-neutral-500">
                Change pricing tiers, add features, and modify what's included in each package.
              </p>
            </div>
            <div className="text-xs text-neutral-500 font-medium">
              Note: Customer Portal is exclusively available on the Complete (₦50,000) package.
            </div>
          </div>

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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                      {plan.trialDurationDays} Days Trial
                    </span>
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
                        className="px-2.5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors"
                        title="Add feature"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPriceModal(plan)}
                  className="w-full py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-3"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Adjust Plan Price</span>
                </button>
              </div>
            ))}
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

      {/* TAB 3: WALLET / BANK RECIPIENT DESTINATION */}
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
    </div>
  );
};
