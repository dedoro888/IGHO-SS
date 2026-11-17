import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Key,
  Building2,
  Mail,
  Phone,
  Eye,
  X,
  Lock,
  Calendar,
  UserCheck,
  Edit2,
  Check,
} from 'lucide-react';
import { PlatformUser, Hotel } from '../../types';
import { BackButton } from '../BackButton';
import { getAuthHeaders } from '../../utils/storageUpload';

interface ConsoleUsersViewProps {
  users: PlatformUser[];
  hotels: Hotel[];
  onChangeUserRole?: (userId: string, newRole: any) => void;
  onToggleUserStatus?: (
    userId: string,
    targetStatus?: 'active' | 'suspended' | 'deactivated',
    reason?: string
  ) => void;
  onEditUser?: (
    userId: string,
    updatedData: { name: string; phone?: string; email?: string }
  ) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleUsersView: React.FC<ConsoleUsersViewProps> = ({
  users = [],
  hotels = [],
  onChangeUserRole,
  onToggleUserStatus,
  onEditUser,
  onNavigateBreadcrumb,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectingUser, setInspectingUser] = useState<PlatformUser | null>(null);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState('');
  const [banModalUser, setBanModalUser] = useState<PlatformUser | null>(null);
  const [banReason, setBanReason] = useState('Administrative action via IGO Console');

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q);

    let matchesRole = true;
    if (roleFilter === 'all') {
      matchesRole = true;
    } else if (roleFilter === 'super_admin') {
      matchesRole = u.role === 'super_admin';
    } else if (roleFilter === 'hotel_owner') {
      matchesRole = u.role === 'hotel_owner';
    } else if (roleFilter === 'staff') {
      matchesRole = ['manager', 'receptionist', 'finance', 'housekeeping'].includes(u.role);
    } else if (roleFilter === 'customer') {
      matchesRole = u.role === 'customer';
    } else if (roleFilter === 'suspended') {
      matchesRole = u.status === 'suspended' || u.status === 'deactivated';
    }

    return matchesSearch && matchesRole;
  });

  const pageSize = 12;
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <BackButton onClick={onNavigateBreadcrumb} />
        <span className="text-neutral-900 font-bold text-sm">System Users & Accounts</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              System Accounts & Credentials
            </h1>
            <p className="text-xs text-neutral-500">
              Audit all accounts created on the system: hotel owners, staff members, and regular users (passwords securely protected).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700">
            Total System Accounts: <strong className="text-black">{users.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, email, account UID, or hotel..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
          >
            <option value="all">All Accounts ({users.length})</option>
            <option value="super_admin">Super Admins</option>
            <option value="hotel_owner">Hotel Owners</option>
            <option value="staff">Hotel Staff Members</option>
            <option value="customer">Regular Users / Guests</option>
            <option value="suspended">Suspended / Banned Accounts</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No accounts found</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              No system accounts match your current filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4">Account UID / Name</th>
                  <th className="p-4">Email Credentials</th>
                  <th className="p-4">Account Type</th>
                  <th className="p-4">Organization / Tenant</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Password Protection</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-neutral-900">{user.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        UID: {user.id}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{user.email}</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        Created: {user.createdAt || 'Sep 2026'}
                      </div>
                    </td>
                    <td className="p-4">
                      {user.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Shield className="w-3 h-3" />
                          Super Admin
                        </span>
                      ) : user.role === 'hotel_owner' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building2 className="w-3 h-3" />
                          Hotel Owner
                        </span>
                      ) : user.role === 'customer' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3" />
                          Regular Guest
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 capitalize">
                          {user.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-700 font-medium">
                      {user.organizationName || 'Platform General'}
                    </td>
                    <td className="p-4">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        <Lock className="w-3 h-3 text-neutral-500" />
                        <span>•••••••• (Encrypted)</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectingUser(user)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setEditName(user.name);
                            setEditEmail(user.email);
                            setEditPhone((user as any).phone || '');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {user.role !== 'super_admin' && onToggleUserStatus && (
                          user.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBanModalUser(user);
                                setBanReason('Policy violation or administrative lockout');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                            >
                              Ban Account
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onToggleUserStatus(user.id, 'active', 'Reactivated by platform administrator')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              Reactivate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-100 text-xs text-neutral-600">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1 rounded-lg border border-neutral-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3 py-1 rounded-lg border border-neutral-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inspect User Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-black font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Account Credentials & Identity</h3>
                  <span className="text-[10px] font-mono text-neutral-400">UID: {inspectingUser.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl space-y-2 border border-neutral-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Full Name</span>
                  <span className="font-bold text-black">{inspectingUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Email Address</span>
                  <span className="font-mono font-bold text-neutral-900">{inspectingUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Account Type</span>
                  <span className="capitalize font-bold text-neutral-900">{inspectingUser.role.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tenant / Hotel</span>
                  <span className="font-semibold text-neutral-800">{inspectingUser.organizationName || 'Platform General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Account Status</span>
                  <span className="font-bold text-emerald-700 capitalize">{inspectingUser.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Created Date</span>
                  <span className="font-mono text-neutral-700">{inspectingUser.createdAt || 'Sep 2026'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Password</span>
                  <span className="font-mono text-neutral-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-neutral-400" />
                    <span>Protected (Argon2 / bcrypt hash)</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectingUser(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            >
              Close Account Details
            </button>
          </div>
        </div>
      )}

      {/* Ban / Suspend Confirmation Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Ban User Account</h3>
                  <span className="text-[10px] font-mono text-rose-600 font-bold uppercase tracking-wider">
                    Immediate Lockout Protocol
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-rose-800">
                <p className="font-bold">
                  Are you sure you want to ban {banModalUser.name}?
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  UID: <span className="font-mono">{banModalUser.id}</span> ({banModalUser.email}).
                  This action immediately revokes active credentials, invalidates sessions, and prevents future sign-ins.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Reason for Ban (Audit Ledger):
                </label>
                <textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Terms of service violation, fraudulent payment, suspicious activity..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs focus:outline-none focus:border-black focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onToggleUserStatus) {
                    onToggleUserStatus(banModalUser.id, 'suspended', banReason.trim());
                  }
                  setBanModalUser(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Confirm & Ban Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-neutral-200 text-black flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Edit Account Details</h3>
                  <span className="text-[10px] font-mono text-neutral-400">UID: {editingUser.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditError('');
                const updatedData = { name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() };
                try {
                  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
                  const res = await fetch(`/api/console/users/${encodeURIComponent(editingUser.id)}/edit`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(updatedData),
                  });
                  if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    setEditError(errBody.message || 'Failed to save user changes on server.');
                    return;
                  }
                } catch (err) {
                  console.error(err);
                }

                if (onEditUser) {
                  onEditUser(editingUser.id, updatedData);
                }

                try {
                  const stored = JSON.parse(localStorage.getItem('igho_platform_users') || '[]');
                  const updated = stored.map((u: any) =>
                    u.id === editingUser.id ? { ...u, ...updatedData } : u
                  );
                  localStorage.setItem('igho_platform_users', JSON.stringify(updated));
                  window.dispatchEvent(new CustomEvent('igho_users_updated', { detail: updatedData }));
                } catch (err) {
                  console.error(err);
                }

                setEditSuccess(true);
                setTimeout(() => {
                  setEditSuccess(false);
                  setEditingUser(null);
                }, 1200);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Full Name / Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-semibold focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+234 902 0886 597"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px] text-neutral-500">
                Organization: <strong className="text-black">{editingUser.organizationName || 'Platform General'}</strong> · Role: <strong className="text-black capitalize">{editingUser.role.replace('_', ' ')}</strong>
              </div>

              {editError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {editError}
                </div>
              )}

              {editSuccess ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" /> Account Details Saved Successfully!
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
