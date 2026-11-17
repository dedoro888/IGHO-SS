import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ActiveScreen, StaffAccount, StaffRole } from '../types';
import { getRoleDisplayName } from '../utils/permissions';
import { authService } from '../lib/authService';

interface LockedInvitationInfo {
  id: string;
  hotelId: string;
  hotelName: string;
  email: string;
  invitedName?: string;
  role: StaffRole;
  expiresAt?: string;
  deliveryMode?: 'supabase_otp' | 'resend_custom_otp';
  otpVerified?: boolean;
}

interface StaffInvitationAcceptProps {
  inviteToken?: string | null;
  onComplete: (newStaffAccount: StaffAccount) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const StaffInvitationAccept: React.FC<StaffInvitationAcceptProps> = ({
  inviteToken,
  onComplete,
  onNavigate,
}) => {
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<LockedInvitationInfo | null>(null);

  // Step 1: OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationProof, setVerificationProof] = useState<string | null>(null);

  // Step 2: Profile & Password Setup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAccount, setSuccessAccount] = useState<StaffAccount | null>(null);

  // Validate invitation token strictly against backend on mount
  useEffect(() => {
    let active = true;
    const tokenToCheck = String(inviteToken || '').trim();
    if (!tokenToCheck) {
      setLookupLoading(false);
      setLookupError(
        'No invitation token was found in this link. Please open the exact invitation link sent to your email.'
      );
      return;
    }

    (async () => {
      setLookupLoading(true);
      setLookupError(null);
      try {
        const res = await fetch(`/api/invitations/lookup?token=${encodeURIComponent(tokenToCheck)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;

        if (!res.ok || !data?.valid || !data?.invitation) {
          setLookupError(
            data?.message || 'This invitation link is invalid, expired, or has already been used.'
          );
          setInviteInfo(null);
          setLookupLoading(false);
          return;
        }

        const loaded: LockedInvitationInfo = data.invitation;
        setInviteInfo(loaded);

        if (loaded.invitedName) {
          const parts = loaded.invitedName.trim().split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }

        // Check if user returned from clicking a Supabase magic-link / OTP redirect
        try {
          const { session } = await authService.getSession();
          if (
            session?.access_token &&
            session?.user?.email &&
            session.user.email.toLowerCase() === loaded.email.toLowerCase()
          ) {
            const verifyRes = await fetch('/api/invitations/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: tokenToCheck,
                accessToken: session.access_token,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (active && verifyRes.ok && verifyData?.verificationProof) {
              setVerificationProof(verifyData.verificationProof);
            }
          }
        } catch {}

        if (active) setLookupLoading(false);
      } catch {
        if (active) {
          setLookupError('Network error validating your invitation token. Please retry.');
          setLookupLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [inviteToken]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken || !inviteInfo) return;
    setError(null);

    const cleanCode = otpCode.trim();
    if (cleanCode.length < 6) {
      setError('Please enter the 6-digit verification OTP sent to your email.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch('/api/invitations/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          otpCode: cleanCode,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.verified || !data?.verificationProof) {
        setError(
          data?.message || 'Invalid or expired OTP code. Please check your email and try again.'
        );
        return;
      }

      setVerificationProof(data.verificationProof);
    } catch {
      setError('Network error verifying OTP code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken || !inviteInfo || !verificationProof) return;
    setError(null);

    const fName = firstName.trim();
    const lName = lastName.trim();
    const fullName = `${fName} ${lName}`.trim();

    if (fullName.length < 2) {
      setError('Please enter your first and last name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/hotels/${encodeURIComponent(inviteInfo.hotelId)}/invitations/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: inviteToken,
            verificationProof,
            firstName: fName,
            lastName: lName,
            fullName,
            password,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.staffMember) {
        setError(
          data?.message ||
            'Could not complete invitation setup. Please verify your OTP or ask your hotel administrator to resend.'
        );
        setIsSubmitting(false);
        return;
      }

      // Sign in with the newly set password so browser has an active Supabase session
      try {
        await authService.signIn(inviteInfo.email, password);
      } catch {}

      setSuccessAccount(data.staffMember);
      onComplete(data.staffMember);
    } catch {
      setError('Network error activating staff account. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeRole: StaffRole = (inviteInfo?.role as StaffRole) || 'receptionist';

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

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-200/80 space-y-6 my-auto">
        {lookupLoading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-black mx-auto" />
            <p className="text-xs font-semibold text-neutral-600">
              Validating secure hotel invitation token...
            </p>
          </div>
        ) : lookupError || !inviteInfo ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-neutral-900">Invitation Unavailable</h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {lookupError || 'This invitation link is no longer valid.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('staff_login')}
                className="w-full bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800"
              >
                Go to Staff Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-full font-semibold text-xs hover:bg-neutral-50"
              >
                Return Home
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-2xl font-black text-neutral-900">Staff Account Setup</h1>
                <p className="text-xs text-neutral-500">
                  {verificationProof
                    ? `Email verified · Set your password to join ${inviteInfo.hotelName}`
                    : `Verify your email OTP to join ${inviteInfo.hotelName}`}
                </p>
              </div>
            </div>

            {/* Locked Server-Verified Invitation Context */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Hotel:</span>
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  {inviteInfo.hotelName}
                  <Lock className="w-3 h-3 text-neutral-400" />
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200/60 pt-1.5">
                <span className="text-neutral-500">Assigned Role:</span>
                <span className="font-bold text-neutral-900 flex items-center gap-1 bg-neutral-200/70 px-2 py-0.5 rounded-lg">
                  {getRoleDisplayName(safeRole)}
                  <Lock className="w-3 h-3 text-neutral-600" />
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200/60 pt-1.5">
                <span className="text-neutral-500">Invited Email:</span>
                <span className="font-mono text-neutral-800 text-[11px] font-semibold">
                  {inviteInfo.email}
                </span>
              </div>
            </div>

            {/* 2-Step Progress Pill */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div
                className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 ${
                  verificationProof
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-black text-white border-black'
                }`}
              >
                {verificationProof ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                <span>1. Verify OTP</span>
              </div>
              <div
                className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 ${
                  successAccount
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : verificationProof
                    ? 'bg-black text-white border-black'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2. Set Password</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successAccount ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-black">Account Activated</h3>
                  <p className="text-xs text-neutral-500">
                    Welcome to {inviteInfo.hotelName}. Your account is linked and active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('staff_portal')}
                  className="bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800"
                >
                  Enter Staff Portal
                </button>
              </div>
            ) : !verificationProof ? (
              /* STEP 1: ENTER 6-DIGIT EMAIL OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-neutral-700">
                    6-Digit Verification OTP
                  </label>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Enter the verification code sent to{' '}
                    <strong className="text-neutral-800">{inviteInfo.email}</strong> to prove email
                    ownership before creating your password.
                  </p>
                  <div className="relative pt-1">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 font-mono text-sm tracking-widest focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.trim().length < 6}
                  className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Email OTP...</span>
                    </>
                  ) : (
                    <span>Verify Email OTP & Continue</span>
                  )}
                </button>

                <p className="text-[10px] text-neutral-400 text-center">
                  Didn&apos;t receive the code? Check spam or ask your hotel administrator to click{' '}
                  <strong>Resend OTP</strong> in Users &amp; Roles.
                </p>
              </form>
            ) : (
              /* STEP 2: PROFILE & PASSWORD CREATION (ONLY AFTER OTP VERIFIED) */
              <form onSubmit={handleAcceptSubmit} className="space-y-3.5 text-xs">
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

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">
                    Verified Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={inviteInfo.email}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 font-mono text-neutral-700 text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Create Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
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

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
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
                  className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-3 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating Staff Account...</span>
                    </>
                  ) : (
                    <span>Complete Setup &amp; Access Portal</span>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <div className="text-center text-[10px] text-neutral-400 py-2 font-mono">
        IGHO Hotel Network · Cryptographically Verified Invitation &amp; OTP Flow
      </div>
    </div>
  );
};
