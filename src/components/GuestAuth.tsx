import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  X,
  Bed,
  LogOut,
  Calendar,
  Shield,
  Building2,
  Plus,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { ActiveScreen, CustomerProfile, ResolvedAuthAccount } from '../types';
import { resolveUserAccount, getSavedCustomerProfile, saveCustomerProfile } from '../utils/auth';
import { authService, HardenedResolvedAuthAccount } from '../lib/authService';
import { IghoLogo, IghoOfficialEmblem, IghoLoadingEmblem } from './IghoLogo';
import { IghoLoadingScreen } from './IghoLoadingScreen';

interface GuestAuthProps {
  onLoginSuccess: (
    email: string,
    profile?: CustomerProfile,
    resolved?: HardenedResolvedAuthAccount | ResolvedAuthAccount
  ) => void;
  onNavigate: (screen: ActiveScreen) => void;

  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
  isSuperAdmin?: boolean;
}

export const GuestAuth: React.FC<GuestAuthProps> = ({
  onLoginSuccess,
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
  isSuperAdmin = false,
}) => {
  const [allowSwitchAccount, setAllowSwitchAccount] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Signing in to IGHO Software Systems...');

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Email confirmation and resend state
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
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
          setResendStatusMessage('Email rate limit reached. Please wait a few moments before requesting another confirmation email.');
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    setLoadingMessage('Redirecting to Google Authentication...');
    try {
      const { error: oauthErr } = await authService.signInWithGoogle();
      if (oauthErr) {
        setLoading(false);
        const msg = oauthErr.message || '';
        if (
          msg.toLowerCase().includes('provider is not enabled') ||
          msg.toLowerCase().includes('not enabled') ||
          msg.toLowerCase().includes('unauthorized') ||
          msg.toLowerCase().includes('validation_failed')
        ) {
          setError(
            'Google OAuth provider is not enabled in your Supabase project. To enable real Google Sign-In, go to Supabase Dashboard -> Authentication -> Providers -> Google, enable it, and enter your Google OAuth credentials.'
          );
        } else {
          setError(msg || 'Failed to initiate Google OAuth sign-in.');
        }
        return;
      }
      // Browser automatically redirects to Google OAuth endpoint
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Error initiating Google OAuth.');
    }
  };

  const executeLoginWithEmail = async (targetEmail: string, explicitPassword?: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const pwd = explicitPassword || password;
    if (!pwd) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Authenticating with IGHO Software Systems...');

    try {
      const { data, error: signInErr } = await authService.signIn(cleanEmail, pwd);
      if (signInErr) {
        setLoading(false);
        const msg = signInErr.message || '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setError('Email not confirmed. Please check your inbox and verify your email before signing in.');
          setUnconfirmedEmailForResend(cleanEmail);
        } else if (msg.toLowerCase().includes('invalid login credentials')) {
          setError('Incorrect email or password. Please verify your credentials.');
        } else {
          setError(msg || 'Invalid login credentials.');
        }
        return;
      }

      if (data?.user) {
        // Resolve authenticated user against real PostgreSQL database
        const resolved = await authService.resolveAuthenticatedUser(data.user.id, cleanEmail);

        if (!resolved.accessGranted) {
          setLoading(false);
          setError(resolved.denialReason || 'Access denied for this account.');
          return;
        }

        let userProfile = getSavedCustomerProfile(cleanEmail);
        if (!userProfile) {
          const parts = (resolved.profile?.full_name || cleanEmail.split('@')[0]).split(/\s+/);
          userProfile = {
            id: resolved.profile?.id || data.user.id,
            email: cleanEmail,
            firstName: parts[0] || 'Guest',
            lastName: parts.slice(1).join(' ') || '',
            phone: resolved.profile?.phone || '',
            address: '',
            createdAt: resolved.profile?.created_at || new Date().toISOString(),
          };
          saveCustomerProfile(userProfile);
        }

        setLoading(false);
        onLoginSuccess(cleanEmail, userProfile, resolved);
        if (!resolved.isSuperAdmin) {
          onNavigate(resolved.targetScreen);
        }
        return;
      }

      setLoading(false);
      setError('Authentication failed. No active session established.');
      return;
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication service error. Please try again.');
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (isRegister) {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      // Create new CustomerProfile specifically for this user
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Guest';
      const lastName = nameParts.slice(1).join(' ') || '';

      const newAccountProfile: CustomerProfile = {
        id: `cust-${Date.now()}`,
        email: cleanEmail,
        firstName,
        lastName,
        phone: phone.trim(),
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        createdAt: new Date().toISOString(),
      };

      setLoading(true);
      setLoadingMessage(`Creating IGHO account for ${fullName.trim()}...`);

      try {
        const { data, error: signUpErr } = await authService.signUp(
          cleanEmail,
          password,
          fullName.trim(),
          phone.trim()
        );

        if (signUpErr) {
          setLoading(false);
          setError(signUpErr.message || 'Registration failed. Please check your details.');
          return;
        }

        // If data.user exists but data.session is null, email confirmation is pending
        if (data?.user && !data.session) {
          setLoading(false);
          setPendingConfirmationEmail(cleanEmail);
          setUnconfirmedEmailForResend(cleanEmail);
          return;
        }

        if (data?.user && data.session) {
          try {
            const raw = localStorage.getItem('igho_db_customer_profiles');
            const existing: CustomerProfile[] = raw ? JSON.parse(raw) : [];
            const filtered = existing.filter((p) => p.email.toLowerCase() !== cleanEmail);
            localStorage.setItem('igho_db_customer_profiles', JSON.stringify([newAccountProfile, ...filtered]));
          } catch {}

          const resolved = await authService.resolveAuthenticatedUser(data.user.id, cleanEmail);
          setLoading(false);
          onLoginSuccess(cleanEmail, newAccountProfile, resolved);
          if (resolved.isSuperAdmin) {
            onNavigate('super_admin_console');
          } else {
            onNavigate(resolved.targetScreen || 'landing');
          }
          return;
        }

        setLoading(false);
        setError('Registration could not be completed. Please try again.');
        return;
      } catch (err: any) {
        setLoading(false);
        setError(err?.message || 'Registration failed. Please try again.');
        return;
      }
    }

    await executeLoginWithEmail(cleanEmail, password);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 sm:p-6 text-neutral-900 selection:bg-black selection:text-white">
      {/* Custom Fullscreen Loading Screen */}
      {loading && (
        <IghoLoadingScreen
          message={loadingMessage}
          subMessage="Connecting to IGHO Software Systems enterprise directory"
        />
      )}

      <div className="w-full max-w-md flex flex-col gap-3 my-auto">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="group flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-black transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 group-hover:border-neutral-300 group-hover:bg-neutral-100 flex items-center justify-center shadow-2xs transition-all">
              <ArrowLeft className="w-4 h-4 text-neutral-700 group-hover:text-black transition-transform group-hover:-translate-x-0.5" />
            </div>
            <span>Back to site</span>
          </button>
        </div>

        {/* Main Authentication Card */}
        <div className="w-full bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-200 space-y-6">
        {currentUserEmail && !allowSwitchAccount ? (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-xl font-black shadow-sm">
                {(currentGuestProfile?.firstName || currentUserEmail).charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Currently Signed In</span>
              </div>
              <h1 className="text-2xl font-black text-black tracking-tight">
                {currentGuestProfile
                  ? `${currentGuestProfile.firstName} ${currentGuestProfile.lastName}`.trim()
                  : currentUserEmail.split('@')[0]}
              </h1>
              <p className="text-xs text-neutral-500 font-medium">
                {currentUserEmail}
              </p>
              {currentGuestProfile?.phone && (
                <p className="text-xs text-neutral-400 font-mono">
                  {currentGuestProfile.phone}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => onNavigate('super_admin_console')}
                  className="w-full py-3 px-4 rounded-full bg-[#10b981] hover:bg-[#0da06f] text-white text-xs font-bold transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Shield className="w-4 h-4" />
                  <span>Go to IGHO Super Admin Console</span>
                </button>
              ) : currentUserEmail && resolveUserAccount(currentUserEmail).role !== 'customer' ? (
                <button
                  type="button"
                  onClick={() => onNavigate('staff_portal')}
                  className="w-full py-3 px-4 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Go to Hotel Staff Portal</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => onNavigate('guest_dashboard')}
                className="w-full py-3 px-4 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-bold hover:bg-neutral-200 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Go to My Stays & Bookings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onEditProfile) onEditProfile();
                  else onNavigate('guest_dashboard');
                }}
                className="w-full py-2.5 px-4 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-bold hover:bg-neutral-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4 text-neutral-600" />
                <span>Edit profile information</span>
              </button>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full py-2.5 px-4 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign out</span>
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setAllowSwitchAccount(true)}
                className="text-xs text-neutral-500 hover:text-black font-medium underline cursor-pointer"
              >
                Need to sign in with a different account? Switch account
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentUserEmail && allowSwitchAccount && (
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                <span className="text-neutral-600 truncate max-w-[200px]">
                  Logged in as <strong>{currentUserEmail}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setAllowSwitchAccount(false)}
                  className="text-xs font-bold text-neutral-900 hover:underline cursor-pointer"
                >
                  Keep active account
                </button>
              </div>
            )}

            {pendingConfirmationEmail ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                  <Mail className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-black text-black">Confirm your email address</h2>
                  <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
                    We've sent a verification link to <strong className="text-neutral-900 font-mono">{pendingConfirmationEmail}</strong>.
                    Please check your inbox (and spam folder) and click the confirmation link to activate your IGHO account before signing in.
                  </p>
                </div>

                {resendStatusMessage && (
                  <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs text-neutral-800 font-medium text-left">
                    {resendStatusMessage}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={resendingEmail}
                    onClick={() => handleResendConfirmation(pendingConfirmationEmail)}
                    className="w-full py-2.5 px-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {resendingEmail ? 'Sending verification email...' : 'Resend Confirmation Email'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingConfirmationEmail(null);
                      setIsRegister(false);
                      setError(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-semibold hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Brand Icon & Heading */}
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <IghoOfficialEmblem className="w-14 h-14" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl font-black text-black tracking-tight">
                      {isRegister ? 'Create your Account' : 'Sign in to IGHO'}
                    </h1>
                    <p className="text-xs text-neutral-500 font-medium">
                      IGHO Software Systems unified identity directory.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                    {unconfirmedEmailForResend && (
                      <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-rose-700 font-medium">Email not confirmed yet?</span>
                        <button
                          type="button"
                          disabled={resendingEmail}
                          onClick={() => handleResendConfirmation(unconfirmedEmailForResend)}
                          className="font-bold underline text-rose-800 hover:text-rose-950 cursor-pointer disabled:opacity-50"
                        >
                          {resendingEmail ? 'Sending...' : 'Resend Email'}
                        </button>
                      </div>
                    )}
                    {resendStatusMessage && (
                      <p className="text-[11px] text-neutral-700 font-medium bg-white/60 p-2 rounded-lg">
                        {resendStatusMessage}
                      </p>
                    )}
                    {error.toLowerCase().includes('credential') && (
                      <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-rose-600">Password not working?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email);
                            setShowForgotPassword(true);
                          }}
                          className="font-bold underline text-rose-800 hover:text-rose-950 cursor-pointer"
                        >
                          Reset Password
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Genuine Google OAuth Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/80 text-xs font-semibold text-neutral-800 transition-all active:scale-[0.99] shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>

        {/* Clean Center-Aligned Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 select-none">
            or with email
          </span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="flex p-1 bg-neutral-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isRegister
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isRegister
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form with Clean Placeholders */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegister && (
            <>
              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Full name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Phone number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +234 800 000 0000"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block font-semibold text-neutral-700">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-neutral-700">Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotSubmitted(false);
                    setForgotEmail(email);
                  }}
                  className="text-[11px] font-semibold text-neutral-600 hover:text-black hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-black"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700">Confirm password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-black"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Remember me checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rememberMeCheckbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
            />
            <label
              htmlFor="rememberMeCheckbox"
              className="text-xs text-neutral-600 font-medium select-none cursor-pointer"
            >
              Remember me on this device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all active:scale-[0.99] shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <IghoLoadingEmblem size="xs" speed="fast" />
            ) : (
              <span>{isRegister ? 'Create Account' : 'Sign in to IGHO Systems'}</span>
            )}
          </button>
        </form>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer System Notice */}
      <div className="text-center text-[11px] text-neutral-400 py-2 font-medium">
        IGHO Software Systems • Global Identity Infrastructure
      </div>
    </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-black">Reset your password</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSubmitted(false);
                  setForgotError(null);
                }}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-black">Password reset link sent</h4>
                  <p className="text-xs text-neutral-500">
                    We sent a secure password reset link to{' '}
                    <strong className="text-neutral-900">{forgotEmail}</strong>. Please check your inbox.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSubmitted(false);
                    setForgotError(null);
                  }}
                  className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const clean = forgotEmail.trim().toLowerCase();
                  if (!clean) return;
                  setForgotLoading(true);
                  setForgotError(null);
                  try {
                    const { error: resetErr } = await authService.resetPasswordForEmail(clean);
                    setForgotLoading(false);
                    if (resetErr) {
                      setForgotError(
                        resetErr.message ||
                          'Could not send reset link. If rate limited, you can set the password directly in Supabase Dashboard (Authentication -> Users -> Change Password).'
                      );
                    } else {
                      setForgotSubmitted(true);
                    }
                  } catch (err: any) {
                    setForgotLoading(false);
                    setForgotError(err?.message || 'Error communicating with Supabase Auth.');
                  }
                }}
                className="space-y-3 text-xs"
              >
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Enter your registered IGHO account email. We will send a secure link via Supabase Auth to reset your password.
                </p>

                {forgotError && (
                  <div className={`p-3.5 rounded-xl border text-xs font-medium space-y-2 ${
                    forgotError.toLowerCase().includes('rate limit')
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        forgotError.toLowerCase().includes('rate limit') ? 'text-amber-600' : 'text-rose-600'
                      }`} />
                      <div>
                        {forgotError.toLowerCase().includes('rate limit') ? (
                          <>
                            <span className="font-bold block text-amber-950">Email Rate Limit Exceeded</span>
                            <span className="text-[11px] text-amber-800 leading-relaxed block pt-0.5">
                              Supabase restricts automated email sending on the free tier (max 3-4 emails/hr). You do not have to wait for email recovery to update your credentials.
                            </span>
                          </>
                        ) : (
                          <span className="leading-relaxed">{forgotError}</span>
                        )}
                      </div>
                    </div>

                    {forgotError.toLowerCase().includes('rate limit') && (
                      <div className="bg-white/90 border border-amber-200 rounded-lg p-2.5 text-[11px] text-neutral-700 space-y-1">
                        <span className="font-bold text-neutral-900 block">Instant Fix via Supabase Dashboard:</span>
                        <ol className="list-decimal list-inside space-y-0.5 text-neutral-600 text-[10.5px]">
                          <li>Open <strong className="text-neutral-800">Supabase Dashboard</strong> &rarr; <strong className="text-neutral-800">Authentication</strong> &rarr; <strong className="text-neutral-800">Users</strong></li>
                          <li>Click <strong className="text-neutral-800">...</strong> next to <code className="bg-neutral-100 px-1 py-0.5 rounded text-[10px]">{forgotEmail || 'your email'}</code></li>
                          <li>Select <strong className="text-neutral-800">Change Password</strong>, enter your password, and save</li>
                        </ol>
                        <span className="block pt-1 text-[10px] text-neutral-500">
                          After saving in Supabase, you can return and sign in immediately with that password.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email address"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all active:scale-[0.99] mt-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
