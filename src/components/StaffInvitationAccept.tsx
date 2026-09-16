import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ActiveScreen, StaffAccount, StaffRole } from '../types';
import { getRoleDisplayName, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

interface StaffInvitationAcceptProps {
  invitationData?: {
    id: string;
    hotelId: string;
    hotelName: string;
    email: string;
    role: StaffRole;
  };
  onComplete: (newStaffAccount: StaffAccount) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const StaffInvitationAccept: React.FC<StaffInvitationAcceptProps> = ({
  invitationData = {
    id: 'inv-demo',
    hotelId: 'hotel-6',
    hotelName: 'Palmview Grand Hotel',
    email: 'auditor@palmviewgrand.com',
    role: 'finance' as StaffRole,
  },
  onComplete,
  onNavigate,
}) => {
  const safeRole: StaffRole = (invitationData.role as StaffRole) || 'receptionist';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const newAccount: StaffAccount = {
        id: `staff-${Date.now()}`,
        hotelId: invitationData.hotelId,
        name: `${firstName} ${lastName}`.trim() || 'Staff Member',
        email: invitationData.email,
        role: safeRole,
        roles: [safeRole],
        status: 'active',
        permissions: DEFAULT_ROLE_PERMISSIONS[safeRole] || [],
        addedDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        active: true,
      };

      setSuccess(true);
      onComplete(newAccount);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-between p-4 sm:p-6 text-neutral-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to IGHO</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-black text-white font-black rounded flex items-center justify-center text-xs">
            I
          </div>
          <span className="font-extrabold text-xs text-black">IGHO Ecosystem</span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200/80 space-y-6 my-auto">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-neutral-900">Staff Account Setup</h1>
            <p className="text-xs text-neutral-500">
              Complete your profile to join {invitationData.hotelName}
            </p>
          </div>
        </div>

        {/* Locked Invitation Parameters Card (Requirement 23) */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Hotel:</span>
            <span className="font-bold text-neutral-900 flex items-center gap-1">
              {invitationData.hotelName}
              <Lock className="w-3 h-3 text-neutral-400" />
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-200/60 pt-1.5">
            <span className="text-neutral-500">Role:</span>
            <span className="font-bold text-neutral-900 flex items-center gap-1 bg-neutral-200/70 px-2 py-0.5 rounded-lg">
              {getRoleDisplayName(safeRole)}
              <Lock className="w-3 h-3 text-neutral-600" />
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-200/60 pt-1.5">
            <span className="text-neutral-500">Invited Email:</span>
            <span className="font-mono text-neutral-800 text-[11px] font-semibold">
              {invitationData.email}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-black">Account Activated!</h3>
              <p className="text-xs text-neutral-500">
                Welcome to {invitationData.hotelName}. Redirecting to your staff portal...
              </p>
            </div>
            <button
              onClick={() => onNavigate('staff_portal')}
              className="bg-black text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-neutral-800"
            >
              Enter Staff Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Sandra"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Okon"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700">Email Address (Locked)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={invitationData.email}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 bg-neutral-100 font-mono text-neutral-600 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password with Eye toggle (Requirement 33) */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700">Set Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password with Eye toggle (Requirement 33) */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-3"
            >
              {isSubmitting ? 'Creating account...' : 'Complete Registration & Access Portal'}
            </button>
          </form>
        )}
      </div>

      <div className="text-center text-[10px] text-neutral-400 py-2 font-mono">
        IGHO Hotel Network · Invitation Token Verified
      </div>
    </div>
  );
};
