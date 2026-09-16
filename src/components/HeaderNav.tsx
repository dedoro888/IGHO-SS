import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  Building2,
  GraduationCap,
  Cross,
  User,
  Shield,
  LogOut,
  Calendar,
  Settings,
} from 'lucide-react';
import { ActiveScreen, CustomerProfile } from '../types';

interface HeaderNavProps {
  onNavigate: (screen: ActiveScreen) => void;
  activeScreen: ActiveScreen;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onNavigate,
  activeScreen,
  currentUserEmail = '',
  currentGuestProfile,
  onSignOut,
  onEditProfile,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = Boolean(currentUserEmail && currentUserEmail.trim() !== '');
  const isSuperAdmin = currentUserEmail.trim().toLowerCase() === 'rumeobire@gmail.com';

  const displayName = currentGuestProfile
    ? `${currentGuestProfile.firstName || ''} ${currentGuestProfile.lastName || ''}`.trim() ||
      currentUserEmail.split('@')[0]
    : currentUserEmail
    ? currentUserEmail.split('@')[0].replace(/[._]/g, ' ')
    : '';

  const initialLetter = (displayName || currentUserEmail || 'U').charAt(0).toUpperCase();

  // Close account menu when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  const handleGoToEditProfile = () => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    if (onEditProfile) {
      onEditProfile();
    } else {
      onNavigate('guest_dashboard');
    }
  };

  const handleLogoutAction = () => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto">
        {/* Brand Logo */}
        <button
          onClick={() => {
            onNavigate('landing');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2 text-left group cursor-pointer"
        >
          <div className="w-7 h-7 bg-black text-white font-black rounded flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
            <span className="translate-x-[0.5px]">I</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-black">IGHO</span>
        </button>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-6 xl:gap-8 text-[13px] xl:text-sm font-medium text-neutral-600">
          <div className="relative">
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className="flex items-center gap-1 hover:text-black py-1 transition-colors cursor-pointer"
            >
              Products{' '}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {productsOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    onNavigate('hotel_directory');
                    setProductsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="p-2 bg-neutral-100 rounded-xl text-black mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 text-sm">IGHO Stay</div>
                    <div className="text-xs text-neutral-500">
                      Hotel & hospitality management platform
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onNavigate('classroom_waitlist');
                    setProductsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="p-2 bg-neutral-100 rounded-xl text-neutral-700 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                      IGHO Classroom
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold border border-blue-200">
                        Waitlist
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      School management system & portal
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onNavigate('medbay_waitlist');
                    setProductsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="p-2 bg-neutral-100 rounded-xl text-neutral-700 mt-0.5">
                    <Cross className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                      IGHO MedBay
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-semibold border border-rose-200">
                        Waitlist
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      Hospital management system (wards & beds)
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('hotel_directory')}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Find Hotels
          </button>

          <button
            onClick={() => onNavigate('hotel_onboarding')}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Join IGHO Stay
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Conditional Account Area: If logged in, show Account Profile pill; if NOT, show Sign In */}
          {isLoggedIn ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/90 border border-neutral-200 transition-all text-xs font-semibold cursor-pointer active:scale-95"
                title="Your IGHO Account"
              >
                <div className="w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center">
                  {initialLetter}
                </div>
                <div className="flex flex-col text-left">
                  <span className="max-w-[110px] sm:max-w-[140px] truncate text-neutral-900 font-bold leading-tight">
                    {displayName || currentUserEmail}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${
                    accountMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Account Dropdown Menu */}
              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Account Header Details */}
                  <div className="px-3 py-2.5 bg-neutral-50 rounded-xl border border-neutral-100 mb-1.5">
                    <div className="text-xs font-bold text-neutral-900 truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {currentUserEmail}
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-700">
                      {isSuperAdmin ? 'Super Admin' : 'IGHO Guest Account'}
                    </div>
                  </div>

                  {/* Options: Edit Profile, My Bookings, Console, Sign Out */}
                  <div className="space-y-0.5">
                    <button
                      onClick={handleGoToEditProfile}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Edit profile information</span>
                    </button>

                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate('guest_dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>My bookings & stays</span>
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
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
                      onClick={handleLogoutAction}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sign in button when guest is NOT logged in */
            <button
              onClick={() => onNavigate('guest_login')}
              className="text-xs sm:text-[13px] font-semibold px-3.5 sm:px-4 py-1.5 text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-300/80 rounded-full transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Sign in or Join IGHO"
            >
              <User className="w-3.5 h-3.5 text-neutral-700" />
              <span>Sign in / Join IGHO</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('demo_request')}
            className="bg-black text-white text-xs sm:text-[13px] font-semibold px-3.5 sm:px-4 py-1.5 rounded-full hover:bg-neutral-800 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Book a Demo
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-neutral-700 hover:text-black rounded-full hover:bg-neutral-100 cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-4 pb-3 border-t border-neutral-100 mt-3 space-y-1 animate-in fade-in duration-200">
          {/* If Logged In on Mobile: Show Account details, Edit Profile, and Sign Out */}
          {isLoggedIn ? (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 mb-2 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  {initialLetter}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-neutral-900 text-sm">{displayName}</span>
                  <span className="text-xs text-neutral-500">{currentUserEmail}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleGoToEditProfile}
                  className="w-full py-2 px-3 text-xs font-semibold bg-white hover:bg-neutral-100 border border-neutral-200 rounded-full text-neutral-800 text-center"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogoutAction}
                  className="w-full py-2 px-3 text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full text-rose-600 text-center flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="px-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Products
          </div>
          <button
            onClick={() => {
              onNavigate('hotel_directory');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 text-left text-sm font-medium"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-black" />
              <span>IGHO Stay (Hotels)</span>
            </div>
          </button>
          <button
            onClick={() => {
              onNavigate('classroom_waitlist');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 text-left text-sm font-medium"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-neutral-600" />
              <span>IGHO Classroom (School System)</span>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold border border-blue-200">
              Waitlist
            </span>
          </button>
          <button
            onClick={() => {
              onNavigate('medbay_waitlist');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 text-left text-sm font-medium"
          >
            <div className="flex items-center gap-2.5">
              <Cross className="w-4 h-4 text-neutral-600" />
              <span>IGHO MedBay (Hospital System)</span>
            </div>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full font-semibold border border-rose-200">
              Waitlist
            </span>
          </button>

          <div className="pt-2 border-t border-neutral-100 space-y-1">
            <button
              onClick={() => {
                onNavigate('hotel_directory');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2 text-sm font-semibold text-black hover:bg-neutral-50 rounded-xl flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-black" />
              <span>Explore Hotels</span>
            </button>

            <button
              onClick={() => {
                onNavigate('hotel_onboarding');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2 text-sm font-semibold text-black hover:bg-neutral-50 rounded-xl flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-black" />
              <span>Join IGHO Stay (Register Hotel)</span>
            </button>

            {/* ONLY show Sign in if NOT logged in */}
            {!isLoggedIn && (
              <button
                onClick={() => {
                  onNavigate('guest_login');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left p-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 rounded-xl flex items-center gap-2"
              >
                <User className="w-4 h-4 text-neutral-500" />
                <span>Sign in / Join IGHO</span>
              </button>
            )}

            {isLoggedIn && (
              <button
                onClick={() => {
                  onNavigate('guest_dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-xl flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span>My IGHO Bookings & Stays</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
