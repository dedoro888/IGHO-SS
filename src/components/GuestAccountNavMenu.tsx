import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Calendar, ChevronDown, Shield, Check } from 'lucide-react';
import { CustomerProfile, ActiveScreen } from '../types';
import { SUPER_ADMIN_EMAIL } from '../utils/auth';

interface GuestAccountNavMenuProps {
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onNavigate: (screen: ActiveScreen) => void;
  onSignOut?: () => void;
  onEditProfile?: () => void;
  signInLabel?: string;
  className?: string;
}

export const GuestAccountNavMenu: React.FC<GuestAccountNavMenuProps> = ({
  currentUserEmail,
  currentGuestProfile,
  onNavigate,
  onSignOut,
  onEditProfile,
  signInLabel = 'Sign in',
  className = '',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = Boolean(currentUserEmail && currentUserEmail.trim() !== '');
  const isSuperAdmin = currentUserEmail?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (!isLoggedIn) {
    return (
      <button
        onClick={() => onNavigate('guest_login')}
        className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 ${className}`}
        title="Sign in or create an IGHO account"
      >
        <User className="w-3.5 h-3.5 text-neutral-700" />
        <span>{signInLabel}</span>
      </button>
    );
  }

  const cleanEmail = currentUserEmail?.trim() || '';
  const fullName = currentGuestProfile
    ? `${currentGuestProfile.firstName || ''} ${currentGuestProfile.lastName || ''}`.trim()
    : cleanEmail.split('@')[0].replace(/[._]/g, ' ');
  const displayName = fullName || cleanEmail.split('@')[0];
  const initialLetter = (displayName || cleanEmail || 'G').charAt(0).toUpperCase();

  const handleEditProfileClick = () => {
    setMenuOpen(false);
    if (onEditProfile) {
      onEditProfile();
    } else {
      onNavigate('guest_dashboard');
    }
  };

  const handleBookingsClick = () => {
    setMenuOpen(false);
    onNavigate('guest_dashboard');
  };

  const handleSignOutClick = () => {
    setMenuOpen(false);
    if (onSignOut) {
      onSignOut();
    } else {
      onNavigate('landing');
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Account pill button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/90 border border-neutral-200 transition-all text-xs font-semibold cursor-pointer active:scale-95 shadow-2xs"
        title="Logged in account & profile options"
        aria-expanded={menuOpen}
      >
        <div className="w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {initialLetter}
        </div>
        <div className="flex flex-col text-left">
          <span className="max-w-[120px] sm:max-w-[150px] truncate text-neutral-900 font-bold leading-tight">
            {displayName}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${
            menuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Account dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-neutral-900">
          {/* Account Profile Header */}
          <div className="px-3.5 py-3 bg-neutral-50 rounded-xl border border-neutral-100 mb-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {initialLetter}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-neutral-900 truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {cleanEmail}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-1 border-t border-neutral-200/50">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700">
                <Check className="w-2.5 h-2.5 text-emerald-600" />
                {isSuperAdmin ? 'Platform Super Admin' : 'Logged In Guest'}
              </span>
              {currentGuestProfile?.phone && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  {currentGuestProfile.phone}
                </span>
              )}
            </div>
          </div>

          {/* Menu Actions */}
          <div className="space-y-0.5">
            <button
              onClick={handleEditProfileClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors text-left cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span>Edit profile information</span>
            </button>

            <button
              onClick={handleBookingsClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors text-left cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>My bookings & stays</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('super_admin_console');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors text-left cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>IGHO Super Admin Console</span>
              </button>
            )}

            <div className="border-t border-neutral-100 my-1 pt-1" />

            <button
              onClick={handleSignOutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
