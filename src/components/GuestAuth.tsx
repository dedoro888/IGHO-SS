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
} from 'lucide-react';
import { ActiveScreen, CustomerProfile } from '../types';
import { resolveUserAccount, SUPER_ADMIN_EMAIL, getSavedCustomerProfile, saveCustomerProfile } from '../utils/auth';
import { IghoLogo, IghoOfficialEmblem } from './IghoLogo';
import { IghoLoadingScreen } from './IghoLoadingScreen';
import { BackButton } from './BackButton';

interface GuestAuthProps {
  onLoginSuccess: (email: string, profile?: CustomerProfile) => void;
  onNavigate: (screen: ActiveScreen) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const GuestAuth: React.FC<GuestAuthProps> = ({
  onLoginSuccess,
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
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

  // Social account picker modal
  const [showSocialModal, setShowSocialModal] = useState<'google' | 'apple' | null>(null);
  const [socialCustomEmail, setSocialCustomEmail] = useState('');

  const executeLoginWithEmail = (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Authenticating with IGHO Software Systems...');

    // Look up or synthesize profile for this exact email
    let userProfile = getSavedCustomerProfile(cleanEmail);
    if (!userProfile) {
      const parts = cleanEmail.split('@')[0].replace(/[._]/g, ' ').split(/\s+/);
      userProfile = {
        id: `cust-${Date.now()}`,
        email: cleanEmail,
        firstName: parts[0] || 'Guest',
        lastName: parts.slice(1).join(' ') || '',
        phone: '',
        address: '',
        createdAt: new Date().toISOString(),
      };
      try {
        const raw = localStorage.getItem('igho_db_customer_profiles');
        const list: CustomerProfile[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem('igho_db_customer_profiles', JSON.stringify([userProfile, ...list]));
      } catch {}
    }

    setTimeout(() => {
      onLoginSuccess(cleanEmail, userProfile || undefined);
      const resolved = resolveUserAccount(cleanEmail, userProfile || undefined);
      setLoading(false);
      onNavigate(resolved.targetScreen);
    }, 150);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

      // Persist to local customer profiles registry
      try {
        const raw = localStorage.getItem('igho_db_customer_profiles');
        const existing: CustomerProfile[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter((p) => p.email.toLowerCase() !== cleanEmail);
        localStorage.setItem('igho_db_customer_profiles', JSON.stringify([newAccountProfile, ...filtered]));
      } catch {}

      setLoading(true);
      setLoadingMessage(`Creating IGHO account for ${fullName.trim()}...`);

      setTimeout(() => {
        onLoginSuccess(cleanEmail, newAccountProfile);
        const resolved = resolveUserAccount(cleanEmail, newAccountProfile);
        setLoading(false);
        onNavigate(resolved.targetScreen);
      }, 150);
      return;
    }

    executeLoginWithEmail(cleanEmail);
  };

  const handleSocialSelect = (provider: 'google' | 'apple', selectedEmail: string) => {
    setShowSocialModal(null);
    const cleanEmail = selectedEmail.trim().toLowerCase();
    setEmail(cleanEmail);
    setLoading(true);
    setLoadingMessage(`Authenticating via ${provider === 'google' ? 'Google' : 'Apple'} ID...`);

    let userProfile = getSavedCustomerProfile(cleanEmail);
    if (!userProfile) {
      const parts = cleanEmail.split('@')[0].replace(/[._]/g, ' ').split(/\s+/);
      userProfile = {
        id: `cust-${Date.now()}`,
        email: cleanEmail,
        firstName: parts[0] || 'Guest',
        lastName: parts.slice(1).join(' ') || '',
        phone: '',
        address: '',
        createdAt: new Date().toISOString(),
      };
      try {
        const raw = localStorage.getItem('igho_db_customer_profiles');
        const list: CustomerProfile[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem('igho_db_customer_profiles', JSON.stringify([userProfile, ...list]));
      } catch {}
    }

    setTimeout(() => {
      onLoginSuccess(cleanEmail, userProfile || undefined);
      const resolved = resolveUserAccount(cleanEmail, userProfile || undefined);
      setLoading(false);
      onNavigate(resolved.targetScreen);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 text-neutral-900 selection:bg-black selection:text-white">
      {/* Custom Fullscreen Loading Screen */}
      {loading && (
        <IghoLoadingScreen
          message={loadingMessage}
          subMessage="Connecting to IGHO Software Systems enterprise directory"
        />
      )}

      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Back Button closely hugging the Card */}
        <div className="flex items-center justify-start">
          <BackButton onClick={() => onNavigate('landing')} />
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
              {currentUserEmail && ['rumeobire@gmail.com', 'dedoro888@gmail.com', 'admin@igho.com'].includes(currentUserEmail.trim().toLowerCase()) ? (
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
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium">
                {error}
              </div>
            )}

            {/* Social Authentication Buttons */}
            <div className="space-y-2">
          {/* Google Button */}
          <button
            type="button"
            onClick={() => {
              setShowSocialModal('google');
              setSocialCustomEmail('');
            }}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/80 text-xs font-semibold text-neutral-800 transition-all active:scale-[0.99] shadow-2xs"
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

          {/* Apple Button */}
          <button
            type="button"
            onClick={() => {
              setShowSocialModal('apple');
              setSocialCustomEmail('');
            }}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-all active:scale-[0.99] shadow-2xs"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.57.65-1.07 1.71-.93 2.73 1 .08 2.02-.48 2.64-1.23z" />
            </svg>
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider relative">
            or with email
          </span>
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
            className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all active:scale-[0.99] shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>{isRegister ? 'Create Account' : 'Sign in to IGHO Systems'}</span>
          </button>
        </form>

        {/* Quick Demo Access (for convenience & testing) */}
        {!isRegister && (
          <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2">
            <p className="text-[10px] text-neutral-400 font-bold text-center uppercase tracking-widest font-mono">
              Quick Access Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => executeLoginWithEmail('rumeobire@gmail.com')}
                className="py-2.5 px-3.5 text-[11px] font-bold border border-neutral-200 rounded-xl hover:border-black bg-neutral-50/50 hover:bg-white text-neutral-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Shield className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => executeLoginWithEmail('avendoorcompany@gmail.com')}
                className="py-2.5 px-3.5 text-[11px] font-bold border border-neutral-200 rounded-xl hover:border-black bg-neutral-50/50 hover:bg-white text-neutral-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Building2 className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span>Hotel Owner</span>
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Footer System Notice */}
      <div className="text-center text-[11px] text-neutral-400 py-2 font-medium">
        IGHO Software Systems • Global Identity Infrastructure
      </div>
    </div>

      {/* Social Provider Email Confirmation Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-black capitalize">
                  {showSocialModal} Sign In
                </span>
              </div>
              <button
                onClick={() => setShowSocialModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Select or enter the {showSocialModal === 'google' ? 'Google' : 'Apple'} email linked
              to your account:
            </p>

            {/* Quick Suggestions */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSocialSelect(showSocialModal, SUPER_ADMIN_EMAIL)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 hover:border-black text-left flex items-center justify-between transition-all"
              >
                <div>
                  <div className="font-semibold text-xs text-neutral-900">{SUPER_ADMIN_EMAIL}</div>
                  <div className="text-[10px] text-neutral-500 font-mono">IGHO Console Platform Owner</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSocialSelect(showSocialModal, 'avendoorcompany@gmail.com')}
                className="w-full p-2.5 rounded-xl border border-neutral-200 hover:border-black text-left flex items-center justify-between transition-all"
              >
                <div>
                  <div className="font-semibold text-xs text-neutral-900">avendoorcompany@gmail.com</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Hotel Owner Portal</div>
                </div>
              </button>
            </div>

            {/* Custom Input */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <label className="block text-[11px] font-semibold text-neutral-700">
                Or enter custom {showSocialModal} email:
              </label>
              <input
                type="email"
                value={socialCustomEmail}
                onChange={(e) => setSocialCustomEmail(e.target.value)}
                placeholder={`user@${showSocialModal === 'google' ? 'gmail.com' : 'icloud.com'}`}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-black"
              />
              <button
                type="button"
                disabled={!socialCustomEmail.trim()}
                onClick={() => handleSocialSelect(showSocialModal, socialCustomEmail)}
                className="w-full py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 disabled:opacity-50"
              >
                Continue with this email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-black">Reset your password</h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black"
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
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotEmail.trim()) {
                    setForgotSubmitted(true);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Enter your registered IGHO account email. We will send you instructions to reset
                  your password.
                </p>
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
                  className="w-full bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all active:scale-[0.99] mt-2"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
