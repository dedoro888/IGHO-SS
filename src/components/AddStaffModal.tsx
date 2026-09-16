import React, { useState } from 'react';
import { X, Mail, Shield, UserPlus, CheckCircle2, Copy, ExternalLink, Sparkles } from 'lucide-react';
import { StaffRole, StaffInvitation } from '../types';
import { getRoleDisplayName, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

interface AddStaffModalProps {
  hotelId: string;
  hotelName: string;
  onClose: () => void;
  onSendInvite: (invite: StaffInvitation) => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  hotelId,
  hotelName,
  onClose,
  onSendInvite,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'receptionist' | 'finance' | 'housekeeping'>('receptionist');
  const [createdInvite, setCreatedInvite] = useState<StaffInvitation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Requirement 22: The form should contain Email, and Role (Manager, Receptionist, Finance, Housekeeping).
  // Do NOT include Hotel Owner or Super Admin!
  const availableRoles: { id: 'manager' | 'receptionist' | 'finance' | 'housekeeping'; title: string; desc: string }[] = [
    {
      id: 'manager',
      title: 'Manager',
      desc: 'Operational management, guest bookings, room rates, cleaning schedules and staff oversight.',
    },
    {
      id: 'receptionist',
      title: 'Receptionist',
      desc: 'Front desk check-in, check-out, room status check, and quick reservation entries.',
    },
    {
      id: 'finance',
      title: 'Finance',
      desc: 'Invoices, transaction folios, payment tracking, reconciliation and financial reports.',
    },
    {
      id: 'housekeeping',
      title: 'Housekeeping',
      desc: 'Room cleaning rosters, task updates, inspection notes and maintenance requests.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const newInvite: StaffInvitation = {
      id: `inv-${Date.now()}`,
      hotelId,
      hotelName,
      email: email.trim().toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    onSendInvite(newInvite);
    setCreatedInvite(newInvite);
  };

  const inviteUrl = createdInvite
    ? `${window.location.origin}/accept-invite?id=${createdInvite.id}&hotel=${encodeURIComponent(
        hotelName
      )}&email=${encodeURIComponent(createdInvite.email)}&role=${createdInvite.role}`
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900">Add Staff Member</h2>
              <p className="text-xs text-neutral-500">Send an invitation to join {hotelName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdInvite ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-neutral-900">Invitation Dispatched!</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                An onboarding invite has been issued for{' '}
                <strong className="text-neutral-800">{createdInvite.email}</strong> as{' '}
                <span className="font-semibold text-neutral-800">
                  {getRoleDisplayName(createdInvite.role)}
                </span>
                .
              </p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-left space-y-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Invitation Setup Link
              </span>
              <p className="font-mono text-xs text-neutral-700 break-all select-all bg-white p-2 rounded-xl border border-neutral-200">
                {inviteUrl}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied to clipboard!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
            {/* Target Hotel Display (Locked) */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700">Hotel</label>
              <div className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 font-medium flex items-center justify-between">
                <span>{hotelName}</span>
                <span className="text-[10px] font-mono text-neutral-400">Locked to tenant</span>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700">Staff email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. colleague@yourhotel.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
              <p className="text-[10px] text-neutral-400">
                The staff member will complete account registration with this email.
              </p>
            </div>

            {/* Role Selection (Requirement 22: Manager, Receptionist, Finance, Housekeeping) */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-neutral-700">Assigned Role</label>
              <div className="space-y-2">
                {availableRoles.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-black bg-neutral-50 ring-1 ring-black shadow-2xs'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="staff-role"
                        value={r.id}
                        checked={isSelected}
                        onChange={() => setRole(r.id)}
                        className="mt-1 text-black focus:ring-0 accent-black"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                          <span>{r.title}</span>
                          <span className="text-[10px] font-normal text-neutral-500 font-mono">
                            ({DEFAULT_ROLE_PERMISSIONS[r.id].length} default perms)
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-tight">{r.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-black text-white font-bold hover:bg-neutral-800 transition-all text-xs active:scale-95 shadow-xs"
              >
                Send Invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
