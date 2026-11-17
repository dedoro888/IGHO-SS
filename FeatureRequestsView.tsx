import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Upload,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Shield,
  Clock,
  Image as ImageIcon,
  X,
  RefreshCw,
  FileCode2,
} from 'lucide-react';
import {
  Hotel,
  HotelFeatureRequest,
  FeatureRequestStatus,
  FeatureRequestRoleAccessConfig,
} from '../../types';
import { getAuthHeaders, uploadOrganizationFile } from '../../utils/storageUpload';
import { resolveHotelPlanTier, PREDEFINED_STARTER_ROLES } from '../../lib/entitlements';

interface FeatureRequestsViewProps {
  hotel: Hotel;
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserRole?: string;
}

const STATUS_BADGE_MAP: Record<FeatureRequestStatus, string> = {
  Submitted: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  'Under Review': 'bg-sky-50 text-sky-800 border-sky-200',
  'Awaiting Information': 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Quotation Sent': 'bg-purple-50 text-purple-800 border-purple-200',
  'Awaiting Payment': 'bg-orange-50 text-orange-800 border-orange-200',
  'In Development': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Testing: 'bg-teal-50 text-teal-800 border-teal-200',
  Completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

export const FeatureRequestsView: React.FC<FeatureRequestsViewProps> = ({
  hotel,
  currentUserEmail = '',
  currentUserName = 'Hotel Staff',
  currentUserRole = 'hotel_owner',
}) => {
  const tier = resolveHotelPlanTier(hotel);
  const isAdminRole = currentUserRole === 'hotel_owner' || currentUserRole === 'super_admin';

  const [requests, setRequests] = useState<HotelFeatureRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [accessConfig, setAccessConfig] = useState<FeatureRequestRoleAccessConfig>({
    hotelId: hotel.id,
    allowedRoles: ['hotel_owner', 'manager'],
  });
  const [loading, setLoading] = useState(true);
  const [savingAccess, setSavingAccess] = useState(false);

  // Submission Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [requestedFeature, setRequestedFeature] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reply Thread State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Feedback Banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isRoleAuthorized = useMemo(() => {
    if (isAdminRole) return true;
    return accessConfig.allowedRoles.includes(currentUserRole);
  }, [isAdminRole, accessConfig.allowedRoles, currentUserRole]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || requests[0] || null,
    [requests, selectedRequestId]
  );

  const loadData = async () => {
    if (!hotel?.id) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [reqRes, cfgRes] = await Promise.all([
        fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/feature-requests`, { headers }),
        fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/feature-requests/access-config`, { headers }),
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        if (data.success) {
          const list = Array.isArray(data.requests) ? data.requests : [];
          setRequests(list);
          if (!selectedRequestId && list[0]) {
            setSelectedRequestId(list[0].id);
          }
        }
      }
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.success && cfgData.config) {
          setAccessConfig(cfgData.config);
        }
      }
    } catch {
      setErrorMsg('Unable to load custom feature requests right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hotel.id]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingScreenshot(true);
    try {
      const uploaded = await uploadOrganizationFile(
        hotel.id,
        file,
        'general_operational',
        currentUserEmail || hotel.ownerEmail || 'Hotel Staff',
        { allowPdf: false }
      );
      setScreenshotUrl(uploaded.url);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload screenshot.');
    } finally {
      setUploadingScreenshot(false);
      e.target.value = '';
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problemDescription.trim() || !requestedFeature.trim()) {
      setErrorMsg('Please complete the request title, operational problem, and requested feature details.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/feature-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          problemDescription: problemDescription.trim(),
          requestedFeature: requestedFeature.trim(),
          screenshotUrl,
          submittedByEmail: currentUserEmail || hotel.ownerEmail || '',
          submittedByName: currentUserName || hotel.ownerName || 'Hotel Admin',
          staffRole: currentUserRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not submit feature request.');
      }
      setRequests((prev) => [data.request, ...prev]);
      setSelectedRequestId(data.request.id);
      setTitle('');
      setProblemDescription('');
      setRequestedFeature('');
      setScreenshotUrl('');
      setShowNewForm(false);
      setSuccessMsg('Custom feature request submitted to the IGHO Engineering team.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit custom feature request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !replyText.trim()) return;
    setSendingReply(true);
    setErrorMsg(null);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(
        `/api/hotels/${encodeURIComponent(hotel.id)}/feature-requests/${encodeURIComponent(selectedRequest.id)}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: replyText.trim(),
            senderName: currentUserName || hotel.ownerName || 'Hotel Staff',
            senderEmail: currentUserEmail || hotel.ownerEmail || '',
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send reply.');
      }
      setRequests((prev) => prev.map((r) => (r.id === selectedRequest.id ? data.request : r)));
      setReplyText('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send message.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleRoleAccess = async (roleId: string) => {
    if (!isAdminRole || roleId === 'hotel_owner') return;
    const exists = accessConfig.allowedRoles.includes(roleId);
    const nextRoles = exists
      ? accessConfig.allowedRoles.filter((r) => r !== roleId)
      : [...accessConfig.allowedRoles, roleId];

    setSavingAccess(true);
    setErrorMsg(null);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/feature-requests/access-config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ allowedRoles: nextRoles }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update role permissions.');
      }
      setAccessConfig(data.config);
      setSuccessMsg('Updated custom feature request role permissions.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update role access settings.');
    } finally {
      setSavingAccess(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              Feature Requests &amp; Custom Development
            </h1>
            {tier === 'professional' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Priority Review SLA</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-wider">
                <span>Standard Commission Queue</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
            Commission bespoke hotel modules, workflow automations, or third-party integrations engineered specifically for{' '}
            <strong className="text-neutral-800">{hotel.name}</strong>. Custom-developed features are scoped, quoted, and delivered individually outside standard subscription plans.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-full border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors cursor-pointer"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isRoleAuthorized && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowNewForm((prev) => !prev);
              }}
              className="px-4 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{showNewForm ? 'Close Form' : 'New Feature Request'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-bold cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="font-bold cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role Access Restriction Notice */}
      {!isRoleAuthorized && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Submission restricted by Hotel Administration</span>
            <p className="text-amber-800 mt-0.5">
              Your current staff role ({currentUserRole}) can view hotel requests when enabled, while submitting new custom development commissions is restricted to configured leadership roles.
            </p>
          </div>
        </div>
      )}

      {/* New Request Form */}
      {showNewForm && isRoleAuthorized && (
        <form
          onSubmit={handleSubmitRequest}
          className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-black">Submit Custom Development Request</h2>
              <p className="text-[11px] text-neutral-500">
                Requests are tenant-isolated to {hotel.name} and reviewed directly by IGHO Engineering.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">Feature Request Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Automated Airport Shuttle Dispatch & Billing Add-On"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800">Operational Problem / Context *</label>
              <textarea
                rows={4}
                required
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the manual workflow, bottleneck, or business goal this custom feature will solve..."
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-black focus:outline-none focus:border-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800">Requested Feature Specification *</label>
              <textarea
                rows={4}
                required
                value={requestedFeature}
                onChange={(e) => setRequestedFeature(e.target.value)}
                placeholder="Detail the screens, reports, staff roles, or automation steps you need built..."
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-black focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingScreenshot ? 'Uploading...' : 'Attach Mockup / Screenshot'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  disabled={uploadingScreenshot}
                  className="hidden"
                />
              </label>
              {screenshotUrl && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Screenshot attached</span>
                  <button
                    type="button"
                    onClick={() => setScreenshotUrl('')}
                    className="text-neutral-400 hover:text-rose-600 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingScreenshot}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Hotel Admin Role Access Control Panel */}
      {isAdminRole && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-700" />
              <h3 className="text-xs font-black text-black uppercase tracking-wider">
                Role Access Control — Feature Requests
              </h3>
            </div>
            {savingAccess && <span className="text-[11px] text-neutral-500 font-mono">Saving...</span>}
          </div>
          <p className="text-[11px] text-neutral-500">
            Select which internal hotel roles are permitted to submit and participate in custom feature requests for {hotel.name}.
          </p>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_STARTER_ROLES.map((roleObj) => {
              const isChecked = roleObj.id === 'hotel_owner' || accessConfig.allowedRoles.includes(roleObj.id);
              const lockedOwner = roleObj.id === 'hotel_owner';
              return (
                <label
                  key={roleObj.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                    lockedOwner ? 'cursor-not-allowed bg-neutral-900 text-white border-neutral-900' : 'cursor-pointer'
                  } ${
                    !lockedOwner && isChecked
                      ? 'bg-neutral-100 border-black text-black'
                      : !lockedOwner
                      ? 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={lockedOwner || savingAccess}
                    onChange={() => handleToggleRoleAccess(roleObj.id)}
                    className="rounded text-black focus:ring-black"
                  />
                  <span>{roleObj.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Split Master-Detail Requests & Communication Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-black uppercase tracking-wider">
              Submitted Requests ({requests.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-400">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2 border border-dashed border-neutral-200 rounded-xl">
              <FileCode2 className="w-8 h-8 text-neutral-300 mx-auto" />
              <div className="text-xs font-bold text-neutral-800">No Custom Requests Yet</div>
              <p className="text-[11px] text-neutral-500">
                Have a unique operational workflow or integration in mind? Submit a request to receive a tailored quotation.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {requests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'border-black bg-neutral-50 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-black line-clamp-1">{req.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          STATUS_BADGE_MAP[req.status] || 'bg-neutral-100 text-neutral-800 border-neutral-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-2">{req.requestedFeature}</p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-100">
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-neutral-600">
                        <MessageSquare className="w-3 h-3" />
                        <span>{req.messages?.length || 0}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail & Thread */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[460px]">
          {!selectedRequest ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-neutral-400">
              <MessageSquare className="w-9 h-9 text-neutral-200 mb-2" />
              <span>Select a feature request on the left to view specifications, quotation, and messages.</span>
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col">
              {/* Top meta */}
              <div className="space-y-2 border-b border-neutral-100 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-black text-black">{selectedRequest.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                      STATUS_BADGE_MAP[selectedRequest.status] || 'bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                  <span>Submitted by {selectedRequest.submittedByName}</span>
                  <span>•</span>
                  <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                  {selectedRequest.quotationAmount !== null && selectedRequest.quotationAmount !== undefined && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-bold text-black bg-neutral-100 px-2.5 py-0.5 rounded-full">
                        Quote: ₦{Number(selectedRequest.quotationAmount).toLocaleString()}
                      </span>
                    </>
                  )}
                  {selectedRequest.expectedDeliveryDate && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-neutral-700">
                        <Clock className="w-3 h-3" /> ETA: {selectedRequest.expectedDeliveryDate}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Operational Problem
                  </span>
                  <p className="text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.problemDescription}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Requested Feature Scope
                  </span>
                  <p className="text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.requestedFeature}
                  </p>
                </div>
              </div>

              {selectedRequest.screenshotUrl && (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Attached Reference Mockup
                  </span>
                  <img
                    src={selectedRequest.screenshotUrl}
                    alt="Feature request reference"
                    className="max-h-48 rounded-lg border border-neutral-200 object-contain"
                  />
                </div>
              )}

              {/* Conversation Thread */}
              <div className="flex-1 flex flex-col space-y-3 pt-2 border-t border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Communication Thread ({selectedRequest.messages?.length || 0})
                </span>

                <div className="flex-1 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {(selectedRequest.messages || []).length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-neutral-400 bg-neutral-50 rounded-xl">
                      No messages yet. Updates or clarifications from IGHO Engineering will appear here.
                    </div>
                  ) : (
                    selectedRequest.messages.map((msg) => {
                      const isAdmin = msg.senderRole === 'super_admin';
                      return (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl text-xs space-y-1 border ${
                            isAdmin
                              ? 'bg-neutral-900 text-white border-neutral-800 ml-4'
                              : 'bg-neutral-50 text-neutral-900 border-neutral-200 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] opacity-75">
                            <span className="font-bold">{msg.senderName}</span>
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {isRoleAuthorized && (
                  <form onSubmit={handleSendReply} className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply to IGHO Engineering regarding scope, quotation, or details..."
                      className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs text-black focus:outline-none focus:border-black"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
