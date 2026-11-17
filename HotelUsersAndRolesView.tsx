import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Check,
  Copy,
  Trash2,
  Lock,
  Plus,
  Edit2,
  Mail,
  UserCheck,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  RefreshCw,
  Loader2,
  Send,
} from 'lucide-react';
import {
  Hotel,
  StaffAccount,
  StaffInvitation,
  StaffRole,
  PermissionId,
  CustomRole,
  PlanPrivileges,
} from '../../types';
import {
  PERMISSION_CATALOGUE,
  DEFAULT_ROLE_PERMISSIONS,
  getRoleDisplayName,
} from '../../utils/permissions';
import { resolveEffectivePrivileges, PREDEFINED_STARTER_ROLES } from '../../lib/entitlements';
import { getAuthHeaders } from '../../utils/storageUpload';

export interface HotelUsersAndRolesViewProps {
  hotel: Hotel;
  staff: StaffAccount[];
  invitations?: StaffInvitation[];
  customRoles?: CustomRole[];
  privileges?: PlanPrivileges;
  onRequestUpgrade?: () => void;
  onInviteStaff: (invite: StaffInvitation) => void;
  onAddStaffMember?: (newStaff: StaffAccount) => void;
  onDeactivateStaff?: (staffId: string) => void;
  onReactivateStaff?: (staffId: string) => void;
  onDeleteStaff?: (staffId: string) => void;
  onCancelInvitation?: (invitationId: string) => void;
  onAddCustomRole?: (role: CustomRole) => void;
  onUpdateCustomRole?: (role: CustomRole) => void;
  onDeleteCustomRole?: (roleId: string) => void;
  onUpdatePermissions?: (staffId: string, perms: PermissionId[]) => void;
  onUpdateStaffRole?: (staffId: string, role: StaffRole, permissions?: PermissionId[]) => void;
}

export const HotelUsersAndRolesView: React.FC<HotelUsersAndRolesViewProps> = ({
  hotel,
  staff,
  invitations = [],
  customRoles = [],
  privileges,
  onRequestUpgrade,
  onInviteStaff,
  onAddStaffMember,
  onDeactivateStaff,
  onReactivateStaff,
  onDeleteStaff,
  onCancelInvitation,
  onAddCustomRole,
  onUpdateCustomRole,
  onDeleteCustomRole,
  onUpdatePermissions,
  onUpdateStaffRole,
}) => {
  const effectivePrivileges: PlanPrivileges = useMemo(
    () => privileges || resolveEffectivePrivileges(hotel),
    [privileges, hotel]
  );
  const [subTab, setSubTab] = useState<'staff' | 'invitations' | 'roles'>('staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [editingCustomRole, setEditingCustomRole] = useState<CustomRole | null>(null);
  const [editingStaffPerms, setEditingStaffPerms] = useState<StaffAccount | null>(null);
  const [editRoleSelected, setEditRoleSelected] = useState<StaffRole>('receptionist');
  const [deletingStaff, setDeletingStaff] = useState<StaffAccount | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('receptionist');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const [sessionInviteUrls, setSessionInviteUrls] = useState<Record<string, string>>({});

  // Custom role form state
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDescription, setCustomRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>([
    'reservations.view',
    'rooms.view',
    'guests.view',
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyInviteUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedInviteId(id);
    showToast('Invitation link copied to clipboard');
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const cleanEmail = inviteEmail.trim().toLowerCase();
    const cleanName = inviteName.trim();
    if (!cleanEmail) return;

    if (activeHotelStaffCount >= effectivePrivileges.maxStaff) {
      setInviteError(
        `Active staff limit reached (${effectivePrivileges.maxStaff} active seats on your current plan). Deactivate an unused seat or upgrade to Professional.`
      );
      return;
    }

    setSendingInvite(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/invitations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          role: inviteRole,
          hotelName: hotel.name,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.emailSent) {
        setInviteError(
          data?.message ||
            `Failed to send invitation email (HTTP ${res.status}). No email was dispatched.`
        );
        return;
      }

      const persistedInvite: StaffInvitation = data.invitation || {
        id: `inv-${Date.now()}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        email: cleanEmail,
        invitedName: cleanName,
        role: inviteRole,
        status: 'pending',
        invitedAt: new Date().toISOString(),
        emailProvider: data.provider,
        emailDeliveryStatus: 'sent',
      };

      if (data.invitationUrl) {
        const rawPath = String(data.invitationUrl);
        const fullUrl = rawPath.startsWith('http')
          ? rawPath
          : `${window.location.origin}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
        setSessionInviteUrls((prev) => ({ ...prev, [persistedInvite.id]: fullUrl }));
      }

      onInviteStaff(persistedInvite);
      setInviteName('');
      setInviteEmail('');
      setInviteError(null);
      setShowInviteModal(false);
      setSubTab('invitations');

      const providerLabel =
        data.provider === 'resend_api'
          ? `via Resend${data.providerMessageId ? ` (${data.providerMessageId})` : ''}`
          : 'via Supabase Auth SMTP (Resend)';
      showToast(`Invitation & OTP email sent to ${cleanEmail} ${providerLabel}.`);
    } catch (err: any) {
      setInviteError(
        err?.message || 'Network error calling invitation endpoint. No email was sent.'
      );
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (inv: StaffInvitation) => {
    setResendingInviteId(inv.id);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(
        `/api/hotels/${encodeURIComponent(hotel.id)}/invitations/${encodeURIComponent(inv.id)}/resend`,
        {
          method: 'POST',
          headers,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.emailSent) {
        showToast(data?.message || `Failed to resend OTP email to ${inv.email}.`);
        return;
      }
      if (data.invitationUrl) {
        const rawPath = String(data.invitationUrl);
        const fullUrl = rawPath.startsWith('http')
          ? rawPath
          : `${window.location.origin}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
        setSessionInviteUrls((prev) => ({ ...prev, [inv.id]: fullUrl }));
      }
      if (data.invitation) {
        onInviteStaff(data.invitation);
      }
      showToast(`Fresh OTP email resent to ${inv.email}.`);
    } catch (err: any) {
      showToast(err?.message || `Network error resending OTP to ${inv.email}.`);
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRevokeInvite = async (inv: StaffInvitation) => {
    setCancelingInviteId(inv.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/hotels/${encodeURIComponent(hotel.id)}/invitations/${encodeURIComponent(inv.id)}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || `Failed to revoke invitation for ${inv.email}.`);
        return;
      }
      onCancelInvitation?.(inv.id);
      showToast(`Invitation for ${inv.email} revoked.`);
    } catch (err: any) {
      showToast(err?.message || `Network error revoking invitation.`);
    } finally {
      setCancelingInviteId(null);
    }
  };

  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim()) return;

    if (onAddCustomRole) {
      const newRole: CustomRole = {
        id: `role-${Date.now()}`,
        hotelId: hotel.id,
        name: customRoleName.trim(),
        description: customRoleDescription.trim(),
        permissions: selectedPermissions,
        active: true,
        createdAt: new Date().toISOString(),
      };
      onAddCustomRole(newRole);
    }
    setCustomRoleName('');
    setCustomRoleDescription('');
    setShowCustomRoleModal(false);
    showToast(`Custom role "${customRoleName}" published successfully`);
  };

  const togglePermission = (permId: PermissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleOpenEditPerms = (s: StaffAccount) => {
    setEditingStaffPerms({ ...s, permissions: [...(s.permissions || [])] });
    setEditRoleSelected(s.role);
  };

  const handleApplyRoleDefaults = (role: StaffRole) => {
    if (!editingStaffPerms) return;
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
    setEditingStaffPerms({
      ...editingStaffPerms,
      role,
      permissions: [...defaults],
    });
    setEditRoleSelected(role);
  };

  const handleSavePermsAndRole = () => {
    if (!editingStaffPerms) return;

    if (onUpdateStaffRole) {
      onUpdateStaffRole(editingStaffPerms.id, editRoleSelected, editingStaffPerms.permissions || []);
    } else if (onUpdatePermissions) {
      onUpdatePermissions(editingStaffPerms.id, editingStaffPerms.permissions || []);
    }

    showToast(`Updated permissions & role for ${editingStaffPerms.name}`);
    setEditingStaffPerms(null);
  };

  const hotelStaff = useMemo(() => {
    return staff.filter((s) => s.hotelId === hotel.id || !s.hotelId);
  }, [staff, hotel.id]);

  const activeHotelStaffCount = useMemo(
    () => hotelStaff.filter((s) => s.active !== false && s.status !== 'deactivated' && s.status !== 'inactive' && s.status !== 'suspended').length,
    [hotelStaff]
  );

  const isOverStaffLimit = activeHotelStaffCount > effectivePrivileges.maxStaff;

  const handleToggleStaffActivation = async (member: StaffAccount, nextActive: boolean) => {
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/hotels/${encodeURIComponent(hotel.id)}/staff/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          staffId: member.id,
          status: nextActive ? 'active' : 'deactivated',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || `Cannot update staff status (${res.status})`);
        return;
      }
      if (nextActive && onReactivateStaff) {
        onReactivateStaff(member.id);
        showToast(`${member.name} reactivated`);
      } else if (!nextActive && onDeactivateStaff) {
        onDeactivateStaff(member.id);
        showToast(`${member.name} deactivated`);
      }
    } catch {
      if (nextActive && onReactivateStaff) {
        if (activeHotelStaffCount >= effectivePrivileges.maxStaff) {
          showToast(`Active staff limit reached (${effectivePrivileges.maxStaff}). Deactivate another seat or upgrade.`);
          return;
        }
        onReactivateStaff(member.id);
        showToast(`${member.name} reactivated`);
      } else if (!nextActive && onDeactivateStaff) {
        onDeactivateStaff(member.id);
        showToast(`${member.name} deactivated`);
      }
    }
  };

  const filteredStaff = useMemo(() => {
    return hotelStaff.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q);

      const matchRole =
        roleFilter === 'all' ||
        s.role.toLowerCase() === roleFilter.toLowerCase();

      return matchSearch && matchRole;
    });
  }, [hotelStaff, searchQuery, roleFilter]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        inv.email.toLowerCase().includes(q) ||
        inv.role.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
      );
    });
  }, [invitations, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 border border-neutral-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Users, Staff & Roles
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Role-based access control, organizational permissions, and team management for {hotel.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border ${
            isOverStaffLimit
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-neutral-100 border-neutral-200 text-neutral-700'
          }`}>
            {activeHotelStaffCount} / {effectivePrivileges.maxStaff} active seats
          </span>

          <div className="flex items-center bg-neutral-100 p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setSubTab('staff')}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                subTab === 'staff'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Active Staff ({activeHotelStaffCount})
            </button>
            <button
              onClick={() => setSubTab('invitations')}
              className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                subTab === 'invitations'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>Invitations</span>
              {invitations.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    subTab === 'invitations'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-neutral-200 text-neutral-800'
                  }`}
                >
                  {invitations.length}
                </span>
              )}
            </button>
            {effectivePrivileges.customRoles && (
              <button
                onClick={() => setSubTab('roles')}
                className={`px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1 ${
                  subTab === 'roles'
                    ? 'bg-black text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>Custom Roles ({customRoles.length})</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              if (activeHotelStaffCount >= effectivePrivileges.maxStaff) {
                showToast(`Active staff limit reached (${effectivePrivileges.maxStaff} active seats on your current plan). Upgrade to Professional for more seats.`);
                return;
              }
              setShowInviteModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Staff</span>
          </button>
        </div>
      </div>

      {isOverStaffLimit && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Active staff exceeds current plan seat limit ({activeHotelStaffCount} / {effectivePrivileges.maxStaff}).</strong>{' '}
              Existing staff accounts remain preserved, but adding or reactivating additional seats is blocked until usage is within limit or you upgrade to Professional (up to 15 seats).
            </div>
          </div>
          {onRequestUpgrade && (
            <button
              type="button"
              onClick={onRequestUpgrade}
              className="px-4 py-1.5 rounded-full bg-amber-900 text-white text-xs font-bold hover:bg-black transition-colors shrink-0"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      )}

      {!effectivePrivileges.customRoles && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-neutral-700">
            <strong className="text-black font-bold">Starter Predefined Roles Only:</strong>{' '}
            {PREDEFINED_STARTER_ROLES.join(' · ')}. Custom Role Builder and granular per-capability overrides are available on Professional.
          </div>
          {onRequestUpgrade && (
            <button
              type="button"
              onClick={onRequestUpgrade}
              className="px-3.5 py-1.5 rounded-full border border-neutral-300 bg-white text-black text-[11px] font-bold hover:bg-neutral-100 shrink-0"
            >
              Unlock Custom Roles
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar (for Staff and Invitations) */}
      {subTab !== 'roles' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={subTab === 'staff' ? 'Search staff by name or email...' : 'Search invitations...'}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 hover:bg-white border border-neutral-200 rounded-full text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {subTab === 'staff' && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-neutral-500 font-semibold hidden sm:inline">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3.5 py-1.5 bg-neutral-50 hover:bg-white border border-neutral-200 rounded-full text-xs font-semibold text-black focus:outline-none focus:border-black transition-all"
              >
                <option value="all">All Roles</option>
                <option value="manager">Manager</option>
                <option value="receptionist">Receptionist</option>
                <option value="finance">Finance</option>
                <option value="housekeeping">Housekeeping</option>
                {customRoles.map((cr) => (
                  <option key={cr.id} value={cr.name.toLowerCase()}>
                    {cr.name} (Custom)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 1: ACTIVE STAFF */}
      {subTab === 'staff' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
          {filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <Users className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="font-semibold text-neutral-600">
                {searchQuery || roleFilter !== 'all'
                  ? 'No staff members match your filter.'
                  : 'No staff members enrolled yet.'}
              </p>
              <p className="text-neutral-400">
                {searchQuery || roleFilter !== 'all'
                  ? 'Try clearing the search query or selecting "All Roles".'
                  : 'Click "Invite Staff" above to add team members.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Permissions</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Enrolled</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredStaff.map((s) => {
                    const isActive = s.active !== false && s.status !== 'inactive' && s.status !== 'suspended';
                    return (
                      <tr key={s.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-black">{s.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">{s.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 uppercase tracking-wider inline-block">
                            {getRoleDisplayName(s.role)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600">
                          <button
                            onClick={() => handleOpenEditPerms(s)}
                            className="hover:underline font-semibold text-neutral-800 inline-flex items-center gap-1.5 group"
                            title="Click to inspect and modify permissions"
                          >
                            <Shield className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black" />
                            <span>{s.permissions?.length || 0} capabilities</span>
                            <span className="text-[10px] text-blue-600 font-bold">(Edit)</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold inline-block ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                            }`}
                          >
                            {isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500">{s.addedDate || 'Recently'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditPerms(s)}
                              className="px-3 py-1 bg-neutral-100 text-neutral-800 text-[11px] font-semibold rounded-full hover:bg-neutral-200 transition-colors"
                            >
                              Edit Role
                            </button>

                            {isActive ? (
                              <button
                                onClick={() => handleToggleStaffActivation(s, false)}
                                className="px-3 py-1 border border-neutral-200 text-rose-600 text-[11px] font-semibold rounded-full hover:bg-rose-50 transition-colors"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStaffActivation(s, true)}
                                className="px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full hover:bg-neutral-800 transition-colors"
                              >
                                Reactivate
                              </button>
                            )}

                            {onDeleteStaff && (
                              <button
                                onClick={() => setDeletingStaff(s)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                                title="Remove staff account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: PENDING INVITATIONS */}
      {subTab === 'invitations' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
          {filteredInvitations.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <Mail className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="font-semibold text-neutral-600">No pending staff invitations.</p>
              <p>Invited members who have not yet claimed their accounts will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  <tr>
                    <th className="py-3.5 px-4">Invited Email</th>
                    <th className="py-3.5 px-4">Designated Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Sent Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredInvitations.map((inv) => {
                    const sessionUrl = sessionInviteUrls[inv.id];
                    const isPending = inv.status === 'pending' || inv.status === 'expired';
                    return (
                      <tr key={inv.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          {inv.invitedName && (
                            <div className="font-bold text-black">{inv.invitedName}</div>
                          )}
                          <div className="font-semibold text-neutral-800">{inv.email}</div>
                          {inv.emailProvider && (
                            <div className="text-[10px] text-neutral-400 font-mono">
                              via {inv.emailProvider === 'resend_api' ? 'Resend API' : 'Supabase SMTP (Resend)'}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 uppercase tracking-wider inline-block">
                            {getRoleDisplayName(inv.role)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold inline-block ${
                              inv.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : inv.status === 'revoked' || inv.status === 'expired'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500">
                          {inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString() : 'Recently'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sessionUrl && isPending && (
                              <button
                                type="button"
                                onClick={() => handleCopyInviteUrl(sessionUrl, inv.id)}
                                className="px-3 py-1.5 border border-neutral-200 text-neutral-700 text-[11px] font-semibold rounded-full hover:bg-neutral-50 inline-flex items-center gap-1.5 transition-colors"
                              >
                                {copiedInviteId === inv.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedInviteId === inv.id ? 'Copied' : 'Copy Link'}</span>
                              </button>
                            )}

                            {isPending && (
                              <button
                                type="button"
                                disabled={resendingInviteId === inv.id}
                                onClick={() => handleResendInvite(inv)}
                                className="px-3 py-1.5 border border-neutral-200 text-neutral-800 text-[11px] font-semibold rounded-full hover:bg-neutral-100 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                {resendingInviteId === inv.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                <span>{resendingInviteId === inv.id ? 'Sending...' : 'Resend OTP'}</span>
                              </button>
                            )}

                            {inv.status !== 'accepted' && (
                              <button
                                type="button"
                                disabled={cancelingInviteId === inv.id}
                                onClick={() => handleRevokeInvite(inv)}
                                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-neutral-200 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                {cancelingInviteId === inv.id ? 'Revoking...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: CUSTOM ROLES ARCHITECT */}
      {subTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-black">Organizational Role Architect</h3>
              <p className="text-xs text-neutral-500">
                Create and manage custom roles with granular permission grants tailored to your hotel operations.
              </p>
            </div>
            {effectivePrivileges.customRoles ? (
              <button
                onClick={() => setShowCustomRoleModal(true)}
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Custom Role</span>
              </button>
            ) : (
              <button
                onClick={() => onRequestUpgrade?.()}
                className="px-4 py-2 bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold rounded-full hover:bg-amber-200 shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Upgrade to Professional for Custom Roles</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Built-in Roles */}
            {(['manager', 'receptionist', 'finance', 'housekeeping'] as StaffRole[]).map((rKey) => (
              <div key={rKey} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-black capitalize">{getRoleDisplayName(rKey)}</span>
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-3 py-0.5 rounded-full font-bold border border-neutral-200 uppercase">
                    Built-in Standard
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {DEFAULT_ROLE_PERMISSIONS[rKey]?.length || 0} permissions bound to this default role profile.
                </p>
              </div>
            ))}

            {/* Custom Created Roles */}
            {customRoles.map((cr) => (
              <div key={cr.id} className="bg-white border border-neutral-300 rounded-2xl p-5 shadow-xs space-y-2 relative group hover:border-black transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-black">{cr.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full font-bold">
                      Custom Role
                    </span>
                    <button
                      onClick={() => setEditingCustomRole({ ...cr, permissions: [...cr.permissions] })}
                      className="text-neutral-400 hover:text-black p-1 transition-colors"
                      title="Edit custom role & permissions"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteCustomRole && (
                      <button
                        onClick={() => {
                          onDeleteCustomRole(cr.id);
                          showToast(`Role "${cr.name}" removed`);
                        }}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                        title="Delete custom role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-neutral-600">{cr.description || 'Custom hotel operational role.'}</p>
                <div className="text-[11px] text-neutral-500 font-medium">
                  {cr.permissions.length} granular capabilities assigned
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVITE STAFF MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">Invite Staff Member</h3>
              <button
                type="button"
                disabled={sendingInvite}
                onClick={() => {
                  setInviteError(null);
                  setShowInviteModal(false);
                }}
                className="text-neutral-400 hover:text-black font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. John Okoro"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. john.okoro@hotel.ng"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
                <p className="text-[10px] text-neutral-400 mt-1 px-1">
                  Sends a 6-digit email OTP verification code through Resend / Supabase Auth.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                >
                  <option value="manager">Manager (Property Control)</option>
                  <option value="receptionist">Receptionist (Front Desk & Bookings)</option>
                  <option value="finance">Finance (Invoices & Settlements)</option>
                  <option value="housekeeping">Housekeeping (Room Turnover)</option>
                  {effectivePrivileges.customRoles &&
                    customRoles.map((cr) => (
                      <option key={cr.id} value={cr.name.toLowerCase()}>
                        {cr.name} (Custom Role)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-neutral-100">
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="flex-1 bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {sendingInvite ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending OTP Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={sendingInvite}
                  onClick={() => {
                    setInviteError(null);
                    setShowInviteModal(false);
                  }}
                  className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF PERMISSIONS & ROLE MODAL */}
      {editingStaffPerms && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">
                  Edit Role & Permissions: {editingStaffPerms.name}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">{editingStaffPerms.email}</p>
              </div>
              <button
                onClick={() => setEditingStaffPerms(null)}
                className="text-neutral-400 hover:text-black font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Role assignment dropdown */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-black">Change Assigned Role</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={editRoleSelected}
                  onChange={(e) => {
                    const newR = e.target.value as StaffRole;
                    setEditRoleSelected(newR);
                  }}
                  className="flex-1 bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black font-semibold"
                >
                  <option value="manager">Manager</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="finance">Finance</option>
                  <option value="housekeeping">Housekeeping</option>
                  {customRoles.map((cr) => (
                    <option key={cr.id} value={cr.name.toLowerCase()}>
                      {cr.name} (Custom)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleApplyRoleDefaults(editRoleSelected)}
                  className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-full text-xs font-semibold text-neutral-700 whitespace-nowrap transition-colors"
                >
                  Apply Role Defaults
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black uppercase tracking-wider block">
                  Granular Permissions ({editingStaffPerms.permissions?.length || 0} enabled)
                </span>
                {effectivePrivileges.customRoles ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = PERMISSION_CATALOGUE.flatMap((g) => g.permissions.map((p) => p.id));
                        setEditingStaffPerms({ ...editingStaffPerms, permissions: allIds });
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStaffPerms({ ...editingStaffPerms, permissions: [] });
                      }}
                      className="text-[11px] font-semibold text-neutral-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Predefined role matrix (Professional required to customize)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {PERMISSION_CATALOGUE.flatMap((group) =>
                  group.permissions.map((p) => {
                    const hasPerm = editingStaffPerms.permissions?.includes(p.id);
                    const locked = !effectivePrivileges.customRoles;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${
                          locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          hasPerm ? 'bg-neutral-50 border-black' : 'border-neutral-200 hover:bg-neutral-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={locked}
                          checked={hasPerm}
                          onChange={() => {
                            if (locked) return;
                            const current = editingStaffPerms.permissions || [];
                            const updated = hasPerm
                              ? current.filter((id) => id !== p.id)
                              : [...current, p.id];
                            setEditingStaffPerms({ ...editingStaffPerms, permissions: updated });
                          }}
                          className="mt-0.5 rounded text-black focus:ring-black"
                        />
                        <div className="text-[11px] leading-tight">
                          <span className="font-semibold text-neutral-900 block">{p.action}</span>
                          <span className="text-neutral-500 block text-[10px]">{group.label}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleSavePermsAndRole}
                className="flex-1 bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingStaffPerms(null)}
                className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-black">Remove Staff Account?</h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to remove <strong>{deletingStaff.name}</strong> ({deletingStaff.email}) from {hotel.name}?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onDeleteStaff) {
                    onDeleteStaff(deletingStaff.id);
                    showToast(`${deletingStaff.name} was removed`);
                  }
                  setDeletingStaff(null);
                }}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-full font-bold text-xs hover:bg-rose-700 transition-colors shadow-xs"
              >
                Yes, Remove
              </button>
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM ROLE MODAL */}
      {showCustomRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">Create Custom Role</h3>
                <p className="text-xs text-neutral-500">Define role title and select enabled permissions.</p>
              </div>
              <button
                onClick={() => setShowCustomRoleModal(false)}
                className="text-neutral-400 hover:text-black font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="e.g. Night Auditor / Concierge Lead"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                <input
                  type="text"
                  value={customRoleDescription}
                  onChange={(e) => setCustomRoleDescription(e.target.value)}
                  placeholder="Brief description of operational responsibilities"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <span className="text-xs font-bold text-black uppercase tracking-wider block">
                  Permissions Matrix ({selectedPermissions.length} selected)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {PERMISSION_CATALOGUE.flatMap((group) =>
                    group.permissions.map((p) => {
                      const isChecked = selectedPermissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                            isChecked ? 'bg-neutral-50 border-black' : 'border-neutral-200 hover:bg-neutral-50/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 rounded text-black focus:ring-black"
                          />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold text-neutral-900 block">{p.action}</span>
                            <span className="text-neutral-500 block text-[10px]">{group.label} · {p.description}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-neutral-100">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  Save & Publish Role
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomRoleModal(false)}
                  className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOM ROLE MODAL */}
      {editingCustomRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">Edit Role: {editingCustomRole.name}</h3>
                <p className="text-xs text-neutral-500">Edit role title, description, and assigned granular permissions.</p>
              </div>
              <button
                onClick={() => setEditingCustomRole(null)}
                className="text-neutral-400 hover:text-black font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingCustomRole.name.trim()) return;
                if (onUpdateCustomRole) {
                  onUpdateCustomRole(editingCustomRole);
                }
                showToast(`Custom role "${editingCustomRole.name}" updated successfully`);
                setEditingCustomRole(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Role Title / Name</label>
                <input
                  type="text"
                  required
                  value={editingCustomRole.name}
                  onChange={(e) => setEditingCustomRole({ ...editingCustomRole, name: e.target.value })}
                  placeholder="e.g. Accountant / Head Chef / Kitchen Lead"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingCustomRole.description}
                  onChange={(e) => setEditingCustomRole({ ...editingCustomRole, description: e.target.value })}
                  placeholder="Brief description of responsibilities"
                  className="w-full bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-black uppercase tracking-wider block">
                    Permissions Matrix ({editingCustomRole.permissions.length} selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = PERMISSION_CATALOGUE.flatMap((g) => g.permissions.map((p) => p.id));
                        setEditingCustomRole({ ...editingCustomRole, permissions: allIds });
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomRole({ ...editingCustomRole, permissions: [] });
                      }}
                      className="text-[11px] font-semibold text-neutral-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {PERMISSION_CATALOGUE.flatMap((group) =>
                    group.permissions.map((p) => {
                      const isChecked = editingCustomRole.permissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                            isChecked ? 'bg-neutral-50 border-black' : 'border-neutral-200 hover:bg-neutral-50/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const updatedPerms = isChecked
                                ? editingCustomRole.permissions.filter((id) => id !== p.id)
                                : [...editingCustomRole.permissions, p.id];
                              setEditingCustomRole({ ...editingCustomRole, permissions: updatedPerms });
                            }}
                            className="mt-0.5 rounded text-black focus:ring-black"
                          />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold text-neutral-900 block">{p.action}</span>
                            <span className="text-neutral-500 block text-[10px]">{group.label} · {p.description}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-neutral-100">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  Save Role Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCustomRole(null)}
                  className="px-5 border border-neutral-200 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
