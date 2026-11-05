import React, { useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, Lock, Mail, ShieldAlert, AlertCircle } from 'lucide-react';
import { ActiveScreen, CustomerProfile, ResolvedAuthAccount } from '../types';
import { IghoOfficialEmblem, IghoLoadingEmblem } from './IghoLogo';
import { authService, HardenedResolvedAuthAccount } from '../lib/authService';

interface StaffLoginProps {
  onLoginSuccess: (
    staffEmail: string,
    profile?: CustomerProfile,
    resolved?: HardenedResolvedAuthAccount | ResolvedAuthAccount
  ) => void;
  onNavigate: (screen: ActiveScreen) => void;
}


export const StaffLogin: React.FC<StaffLoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmailForResend, setUnconfirmedEmailForResend] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatusMessage, setResendStatusMessage] = useState<string | null>(null);

  const handleResendConfirmation = async (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean) return;
    setResendingEmail(true);
    setResendStatusMessage(null);
    try {
      const { error: resendErr } = await authService.resendConfirmationEmail(clean);
      setResendingEmail(false);
      if (resendErr) {
        const msg = resendErr.message || '';
        if (msg.toLowerCase().includes('rate limit')) {
          setResendStatusMessage('Email rate limit reached. Please wait a few moments.');
        } else {
          setResendStatusMessage(msg || 'Failed to resend confirmation email.');
        }
      } else {
        setResendStatusMessage('Verification email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setResendingEmail(false);
      setResendStatusMessage(err?.message || 'Error communicating with Supabase Auth.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconfirmedEmailForResend(null);
    setResendStatusMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt Supabase Auth login
    try {
      const { data, error: signInErr } = await authService.signIn(cleanEmail, password);

      if (signInErr) {
        setLoading(false);
        const msg = signInErr.message || '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setUnconfirmedEmailForResend(cleanEmail);
          setError('Email not confirmed. Please check your inbox and confirm your email before signing in.');
        } else if (msg.toLowerCase().includes('invalid login credentials')) {
          setError('Incorrect email or password. Please verify your staff credentials.');
        } else {
          setError(msg || 'Invalid staff credentials.');
        }
        return;
      }

      if (data?.user) {
        // 2. Perform database role & permission verification
        const resolved = await authService.resolveAuthenticatedUser(data.user.id, cleanEmail);

        // Verification checks
        if (!resolved.accessGranted) {
          setLoading(false);
          setError(resolved.denialReason || 'Access denied for this account.');
          return;
        }

        // Verify that user possesses a staff or super_admin role
        const staffRoles = ['owner', 'manager', 'receptionist', 'finance', 'housekeeping'];
        if (!resolved.isSuperAdmin && !staffRoles.includes(resolved.effectiveRole)) {
          setLoading(false);
          setError('Access denied: This account does not have staff or hotel management permissions.');
          return;
        }

        setLoading(false);
        onLoginSuccess(cleanEmail, undefined, resolved);
        if (!resolved.isSuperAdmin) {
          onNavigate(resolved.targetScreen || 'staff_portal');
        }
        return;
      }

      setLoading(false);
      setError('Authentication failed. No active session returned.');
      return;
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication error. Please try again.');
      return;
    }
  };


  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to site</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-white text-black font-black rounded flex items-center justify-center text-xs">
            I
          </div>
          <span className="font-extrabold text-xs text-white">IGHO</span>
        </div>
      </div>

      {/* Center Staff Login Card */}
      <div className="w-full max-w-sm mx-auto bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 my-auto shadow-2xl">
        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center mx-auto shadow-lg p-2.5">
            <IghoOfficialEmblem className="w-full h-full" />
          </div>
          <div className="space-y-0.5 pt-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Staff Portal</h1>
            <p className="text-xs text-neutral-400">Hotel admin & operations</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-3 text-red-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {unconfirmedEmailForResend && (
              <div className="pt-2 border-t border-red-500/30 flex items-center justify-between text-[11px]">
                <span className="text-neutral-300">Need another confirmation link?</span>
                <button
                  type="button"
                  disabled={resendingEmail}
                  onClick={() => handleResendConfirmation(unconfirmedEmailForResend)}
                  className="font-bold underline text-white hover:text-red-200 cursor-pointer disabled:opacity-50"
                >
                  {resendingEmail ? 'Sending...' : 'Resend Email'}
                </button>
              </div>
            )}
            {resendStatusMessage && (
              <p className="text-[11px] text-neutral-300 font-medium bg-black/40 p-2 rounded-lg">
                {resendStatusMessage}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold text-neutral-300">Staff email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@yourhotel.com"
                className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-700 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-white text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-neutral-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your staff password"
                className="w-full pl-9 pr-10 py-2.5 bg-black border border-neutral-700 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-white text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-full font-bold text-xs hover:bg-neutral-200 transition-all active:scale-95 shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <IghoLoadingEmblem size="xs" inverted={true} speed="fast" />
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>


        {/* Bottom Links */}
        <div className="pt-2 text-center text-xs text-neutral-500 border-t border-neutral-800 flex flex-wrap items-center justify-center gap-2">
          <span>Not hotel staff?</span>
          <button
            onClick={() => onNavigate('guest_login')}
            className="text-neutral-300 hover:text-white underline font-semibold"
          >
            IGHO Login
          </button>
          <span>·</span>
          <button
            onClick={() => onNavigate('landing')}
            className="text-neutral-300 hover:text-white underline font-semibold"
          >
            Back to site
          </button>
        </div>
      </div>

      <div className="text-center text-[10px] text-neutral-600 py-2 font-mono">
        IGHO Hotel Management System v2.4
      </div>
    </div>
  );
};
