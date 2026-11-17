import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react';
import {
  Hotel,
  CustomFeatureEntitlement,
  PersonalizedActivationSummary,
} from '../../types';
import { getAuthHeaders } from '../../utils/storageUpload';

interface CustomFeaturesViewProps {
  hotel: Hotel;
  currentUserEmail?: string;
  onEntitlementsChanged?: (entitlements: CustomFeatureEntitlement[]) => void;
}

export const CustomFeaturesView: React.FC<CustomFeaturesViewProps> = ({
  hotel,
  currentUserEmail = '',
  onEntitlementsChanged,
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [entitlements, setEntitlements] = useState<CustomFeatureEntitlement[]>([]);
  const [history, setHistory] = useState<PersonalizedActivationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadEntitlements = async () => {
    if (!hotel?.id) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/custom-features`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const list = Array.isArray(data.entitlements) ? data.entitlements : [];
          setEntitlements(list);
          setHistory(Array.isArray(data.history) ? data.history : []);
          onEntitlementsChanged?.(list);
        }
      }
    } catch {
      setErrorMsg('Unable to load custom feature entitlements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntitlements();
  }, [hotel.id]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = activationCode.trim();
    if (!cleaned) {
      setErrorMsg('Please enter the personalized activation code issued by IGHO Software Systems.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/custom-features/activate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: cleaned,
          activatedByEmail: currentUserEmail || hotel.ownerEmail || 'hotel@igho.com.ng',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Activation failed. Please verify the code and try again.');
      }

      setActivationCode('');
      setSuccessMsg(
        data.message || `Custom feature "${data.entitlement?.featureName || 'Module'}" activated for ${hotel.name}.`
      );
      await loadEntitlements();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify activation code.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeEntitlements = entitlements.filter((e) => e.status === 'active');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              Custom Features &amp; Activations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-wider">
              Organization-Locked
            </span>
          </div>
          <p className="text-xs text-neutral-500 max-w-2xl">
            Redeem single-use activation keys issued for bespoke engineering commissions built specifically for{' '}
            <strong className="text-neutral-800">{hotel.name}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEntitlements}
          className="p-2.5 rounded-full border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh custom features"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activation Form */}
      <div className="bg-neutral-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Redeem Personalized Feature Activation Code</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Each code is cryptographically bound to your organization ID, verified with SHA-256 hashing, and expires automatically after single redemption.
            </p>
          </div>
        </div>

        <form onSubmit={handleActivate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={activationCode}
            onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
            placeholder="IGHO-CF-XXXX-XXXX-XXXX"
            className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none focus:border-white tracking-wider"
          />
          <button
            type="submit"
            disabled={submitting || !activationCode.trim()}
            className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs hover:bg-neutral-200 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? 'Verifying Code...' : 'Activate Feature'}</span>
          </button>
        </form>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Active Custom Features */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-black">Enabled Custom Entitlements ({activeEntitlements.length})</h3>
            <p className="text-[11px] text-neutral-500">
              Custom engineering capabilities unlocked exclusively for {hotel.name}.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400">Checking custom entitlements...</div>
        ) : entitlements.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-neutral-200 rounded-xl space-y-2">
            <Lock className="w-8 h-8 text-neutral-300 mx-auto" />
            <div className="text-xs font-bold text-neutral-800">No Custom Features Activated</div>
            <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
              Commission custom features via the Feature Requests section. Once developed, IGHO Support will issue a private single-use activation code here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entitlements.map((ent) => {
              const isActive = ent.status === 'active';
              return (
                <div
                  key={ent.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isActive ? 'border-emerald-200 bg-emerald-50/40' : 'border-neutral-200 bg-neutral-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-neutral-300 text-neutral-700'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-black">{ent.featureName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">{ent.featureId}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {ent.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-2 border-t border-neutral-200/70">
                    <span>Activated by {ent.activatedByEmail}</span>
                    <span>{new Date(ent.activatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activation Redemption Audit History */}
      {history.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-black text-black uppercase tracking-wider">Activation History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-400">
                  <th className="pb-2">Feature</th>
                  <th className="pb-2">Code Hint</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Redeemed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 font-semibold text-neutral-900">{h.featureName}</td>
                    <td className="py-2.5 font-mono text-[11px] text-neutral-500">{h.codeHint}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'activated'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-neutral-500">
                      {h.activatedAt ? new Date(h.activatedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
