import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCode2,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldAlert,
  Clock,
  X,
  Plus,
} from 'lucide-react';
import {
  Hotel,
  HotelFeatureRequest,
  FeatureRequestStatus,
  PersonalizedActivationSummary,
  CustomFeatureEntitlement,
} from '../../types';
import { getAuthHeaders } from '../../utils/storageUpload';
import { formatHotelId } from '../../lib/entitlements';

interface ConsoleFeatureRequestsViewProps {
  hotels: Hotel[];
}

const ALL_STATUSES: FeatureRequestStatus[] = [
  'Submitted',
  'Under Review',
  'Awaiting Information',
  'Approved',
  'Quotation Sent',
  'Awaiting Payment',
  'In Development',
  'Testing',
  'Completed',
  'Rejected',
];

export const ConsoleFeatureRequestsView: React.FC<ConsoleFeatureRequestsViewProps> = ({ hotels }) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'activations'>('requests');
  const [requests, setRequests] = useState<HotelFeatureRequest[]>([]);
  const [activations, setActivations] = useState<PersonalizedActivationSummary[]>([]);
  const [entitlements, setEntitlements] = useState<CustomFeatureEntitlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [hotelFilter, setHotelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // Selected request editing
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<FeatureRequestStatus>('Under Review');
  const [editQuote, setEditQuote] = useState('');
  const [editEta, setEditEta] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Activation Generator State
  const [genHotelId, setGenHotelId] = useState(hotels[0]?.id || '');
  const [genFeatureId, setGenFeatureId] = useState('');
  const [genFeatureName, setGenFeatureName] = useState('');
  const [genRequestId, setGenRequestId] = useState('');
  const [genExpiresDays, setGenExpiresDays] = useState('30');
  const [generating, setGenerating] = useState(false);
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<{
    code: string;
    hotelName: string;
    featureName: string;
    expiresAt: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadConsoleData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [reqRes, actRes] = await Promise.all([
        fetch('/api/console/feature-requests', { headers }),
        fetch('/api/console/custom-features', { headers }),
      ]);
      if (reqRes.ok) {
        const d = await reqRes.json();
        if (d.success) {
          const list = Array.isArray(d.requests) ? d.requests : [];
          setRequests(list);
          if (!selectedRequestId && list[0]) {
            setSelectedRequestId(list[0].id);
          }
        }
      }
      if (actRes.ok) {
        const d = await actRes.json();
        if (d.success) {
          setActivations(Array.isArray(d.activations) ? d.activations : []);
          setEntitlements(Array.isArray(d.entitlements) ? d.entitlements : []);
        }
      }
    } catch {
      setErrorMsg('Unable to load feature requests or custom activations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsoleData();
  }, []);

  useEffect(() => {
    if (!genHotelId && hotels[0]?.id) {
      setGenHotelId(hotels[0].id);
    }
  }, [hotels, genHotelId]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (hotelFilter !== 'all' && r.hotelId !== hotelFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (tierFilter !== 'all' && r.planTier !== tierFilter) return false;
      return true;
    });
  }, [requests, hotelFilter, statusFilter, tierFilter]);

  const selectedRequest = useMemo(
    () => filteredRequests.find((r) => r.id === selectedRequestId) || filteredRequests[0] || null,
    [filteredRequests, selectedRequestId]
  );

  useEffect(() => {
    if (selectedRequest) {
      setEditStatus(selectedRequest.status);
      setEditQuote(
        selectedRequest.quotationAmount !== null && selectedRequest.quotationAmount !== undefined
          ? String(selectedRequest.quotationAmount)
          : ''
      );
      setEditEta(selectedRequest.expectedDeliveryDate || '');
    }
  }, [selectedRequest?.id]);

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSavingUpdate(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/console/feature-requests/${encodeURIComponent(selectedRequest.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: editStatus,
          quotationAmount: editQuote === '' ? null : Number(editQuote),
          expectedDeliveryDate: editEta.trim(),
          adminReply: adminReply.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update feature request.');
      }
      setRequests((prev) => prev.map((r) => (r.id === selectedRequest.id ? data.request : r)));
      setAdminReply('');
      setSuccessMsg(`Updated request "${data.request.title}" (${data.request.status}).`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to update feature request.');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleShortcutGenerateCode = (req: HotelFeatureRequest) => {
    setGenHotelId(req.hotelId);
    setGenFeatureId(
      req.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32) || 'custom_feature'
    );
    setGenFeatureName(req.title);
    setGenRequestId(req.id);
    setActiveSubTab('activations');
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genHotelId || !genFeatureId.trim() || !genFeatureName.trim()) {
      setErrorMsg('Target hotel, feature identifier, and feature name are required.');
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/console/custom-features/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hotelId: genHotelId,
          featureId: genFeatureId.trim(),
          featureName: genFeatureName.trim(),
          requestId: genRequestId.trim() || undefined,
          expiresInDays: Number(genExpiresDays) || 30,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate activation code.');
      }

      setNewlyGeneratedCode({
        code: data.activationCode,
        hotelName: data.activation?.hotelName || genHotelId,
        featureName: data.activation?.featureName || genFeatureName,
        expiresAt: data.activation?.expiresAt,
      });
      setCopiedCode(false);
      setGenFeatureId('');
      setGenFeatureName('');
      setGenRequestId('');
      await loadConsoleData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not generate activation code.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeActivation = async (activationId: string) => {
    setErrorMsg(null);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/console/custom-features/${encodeURIComponent(activationId)}/revoke`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to revoke activation.');
      }
      setSuccessMsg('Custom feature entitlement revoked immediately.');
      await loadConsoleData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to revoke activation.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Custom Requests &amp; Feature Activations
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Triage hotel custom engineering requests, issue quotations, and mint organization-locked single-use activation keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-neutral-100 p-1 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('requests')}
              className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                activeSubTab === 'requests' ? 'bg-black text-white font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Requests ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('activations')}
              className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                activeSubTab === 'activations' ? 'bg-black text-white font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Activation Codes ({activations.length})
            </button>
          </div>
          <button
            type="button"
            onClick={loadConsoleData}
            className="p-2 rounded-full border border-neutral-200 text-neutral-600 hover:text-black cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: FEATURE REQUESTS TRIAGE */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
            <select
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
              className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-xs font-semibold text-black"
            >
              <option value="all">All Hotels</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({formatHotelId(h.id)})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-xs font-semibold text-black"
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-xs font-semibold text-black"
            >
              <option value="all">All Plan Tiers</option>
              <option value="professional">Professional (Priority SLA)</option>
              <option value="starter">Starter</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* List */}
            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-2.5 max-h-[640px] overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  No custom feature requests match the selected filters.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      selectedRequest?.id === req.id
                        ? 'border-black bg-neutral-50 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        {req.hotelName}
                      </span>
                      {req.planTier === 'professional' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase">
                          Priority SLA
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-black text-black line-clamp-1">{req.title}</div>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold">
                        {req.status}
                      </span>
                      <span className="text-neutral-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Detail & Actions */}
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-5">
              {!selectedRequest ? (
                <div className="py-16 text-center text-xs text-neutral-400">
                  Select a request on the left to review specifications, send a quote, or generate an activation code.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        {selectedRequest.hotelName} · {formatHotelId(selectedRequest.hotelId)}
                      </div>
                      <h2 className="text-base font-black text-black mt-0.5">{selectedRequest.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleShortcutGenerateCode(selectedRequest)}
                      className="px-3.5 py-2 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Generate Activation Code</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-neutral-400 block">Problem Description</span>
                      <p className="text-neutral-800 whitespace-pre-wrap">{selectedRequest.problemDescription}</p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-neutral-400 block">Requested Feature</span>
                      <p className="text-neutral-800 whitespace-pre-wrap">{selectedRequest.requestedFeature}</p>
                    </div>
                  </div>

                  {selectedRequest.screenshotUrl && (
                    <img
                      src={selectedRequest.screenshotUrl}
                      alt="Submitted mockup"
                      className="max-h-44 rounded-xl border border-neutral-200 object-contain"
                    />
                  )}

                  {/* Messages */}
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1 border-t border-neutral-100 pt-3">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Thread</span>
                    {(selectedRequest.messages || []).length === 0 ? (
                      <div className="text-[11px] text-neutral-400">No messages in thread yet.</div>
                    ) : (
                      selectedRequest.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-xl text-xs border ${
                            m.senderRole === 'super_admin'
                              ? 'bg-neutral-900 text-white border-neutral-800'
                              : 'bg-neutral-50 text-neutral-800 border-neutral-200'
                          }`}
                        >
                          <div className="flex justify-between text-[10px] opacity-75 mb-0.5">
                            <span className="font-bold">{m.senderName}</span>
                            <span>{new Date(m.createdAt).toLocaleString()}</span>
                          </div>
                          <p>{m.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Triage Form */}
                  <form onSubmit={handleUpdateRequest} className="space-y-3 border-t border-neutral-100 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as FeatureRequestStatus)}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-black"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">Quotation (₦)</label>
                        <input
                          type="number"
                          min="0"
                          value={editQuote}
                          onChange={(e) => setEditQuote(e.target.value)}
                          placeholder="e.g. 250000"
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">Expected Delivery</label>
                        <input
                          type="date"
                          value={editEta}
                          onChange={(e) => setEditEta(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-black"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                        placeholder="Optional message / scope update to send to the hotel..."
                        className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-xs text-black"
                      />
                      <button
                        type="submit"
                        disabled={savingUpdate}
                        className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{savingUpdate ? 'Saving...' : 'Save & Notify Hotel'}</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONALIZED ACTIVATION CODES */}
      {activeSubTab === 'activations' && (
        <div className="space-y-5">
          {/* One-time plain code reveal box */}
          {newlyGeneratedCode && (
            <div className="bg-emerald-950 text-white border border-emerald-700 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-black">Single-Use Activation Code Generated</h3>
                    <p className="text-xs text-emerald-200">
                      Locked to <strong>{newlyGeneratedCode.hotelName}</strong> for{' '}
                      <strong>{newlyGeneratedCode.featureName}</strong>. Copy now — the raw code is not stored in plaintext and cannot be viewed again.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewlyGeneratedCode(null)}
                  className="text-emerald-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/40 border border-emerald-800 rounded-xl p-3">
                <code className="flex-1 font-mono text-sm font-black tracking-widest text-emerald-300">
                  {newlyGeneratedCode.code}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newlyGeneratedCode.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2500);
                  }}
                  className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Generator Form */}
          <form
            onSubmit={handleGenerateCode}
            className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Plus className="w-4 h-4 text-black" />
              <h2 className="text-sm font-black text-black">Mint Personalized Single-Use Feature Key (SHA-256)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Target Hotel Organization *</label>
                <select
                  required
                  value={genHotelId}
                  onChange={(e) => setGenHotelId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-black"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({formatHotelId(h.id)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Feature Display Name *</label>
                <input
                  type="text"
                  required
                  value={genFeatureName}
                  onChange={(e) => setGenFeatureName(e.target.value)}
                  placeholder="e.g. Shuttle Dispatch Module"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Feature Entitlement Key *</label>
                <input
                  type="text"
                  required
                  value={genFeatureId}
                  onChange={(e) => setGenFeatureId(e.target.value)}
                  placeholder="e.g. shuttle_dispatch"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Expires In (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={genExpiresDays}
                  onChange={(e) => setGenExpiresDays(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-black"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={generating}
                className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{generating ? 'Minting SHA-256 Key...' : 'Generate Single-Use Key'}</span>
              </button>
            </div>
          </form>

          {/* Issued Keys Ledger */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-black">Issued Personalized Keys &amp; Entitlements</h3>
            {activations.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">No personalized activation codes generated yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[680px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase text-neutral-400">
                      <th className="pb-2">Hotel</th>
                      <th className="pb-2">Feature</th>
                      <th className="pb-2">Code Hint</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Expires / Redeemed</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {activations.map((act) => (
                      <tr key={act.id} className="hover:bg-neutral-50">
                        <td className="py-3 font-semibold text-black">{act.hotelName}</td>
                        <td className="py-3">
                          <div className="font-bold text-neutral-900">{act.featureName}</div>
                          <div className="text-[10px] font-mono text-neutral-400">{act.featureId}</div>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-neutral-500">{act.codeHint}</td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              act.status === 'activated'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : act.status === 'unused'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>
                        <td className="py-3 text-[11px] text-neutral-500">
                          {act.activatedAt ? (
                            <span>Redeemed {new Date(act.activatedAt).toLocaleDateString()}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(act.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {act.status !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() => handleRevokeActivation(act.id)}
                              className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {entitlements.length > 0 && (
              <div className="pt-2 text-[11px] text-neutral-500">
                Active custom entitlements across organizations: <strong>{entitlements.filter((e) => e.status === 'active').length}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
