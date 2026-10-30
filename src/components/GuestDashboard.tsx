import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  User,
  AlertTriangle,
  Receipt,
  Eye,
  LogOut,
  X,
  Trash2,
  AlertOctagon,
  Timer,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  ArrowUpCircle,
  CalendarRange,
  CalendarPlus,
  CreditCard,
  Sparkles,
  Ban,
  Check,
  ChevronRight,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Reservation, Room, ActiveScreen, CustomerProfile, Hotel } from '../types';
import { BackButton } from './BackButton';
import { getSavedCustomerProfile } from '../utils/auth';
import { IghoOfficialEmblem } from './IghoLogo';
import { getRoomCategories, getRoomLevelInfo, RoomCategory } from '../utils/roomCategories';

interface GuestDashboardProps {
  hotel?: Hotel | null;
  reservations: Reservation[];
  rooms: Room[];
  onNavigate: (screen: ActiveScreen) => void;
  onSelectRoom: (room: Room) => void;
  currentUserEmail?: string;
  guestProfile?: CustomerProfile | null;
  onUpdateGuestProfile?: (profile: CustomerProfile) => void;
  onUpdateReservation?: (updated: Reservation) => void;
  onSignOut?: () => void;
  initialTab?: 'dashboard' | 'bookings' | 'profile';
}

export const GuestDashboard: React.FC<GuestDashboardProps> = ({
  hotel,
  reservations,
  rooms,
  onNavigate,
  onSelectRoom,
  currentUserEmail,
  guestProfile,
  onUpdateGuestProfile,
  onUpdateReservation,
  onSignOut,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'profile'>(initialTab);
  const [viewingReceiptRes, setViewingReceiptRes] = useState<Reservation | null>(null);

  // Cancellation state
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Change of travel plans');
  const [cancelCustomReason, setCancelCustomReason] = useState<string>('');

  // Date Change state
  const [changingDateRes, setChangingDateRes] = useState<Reservation | null>(null);
  const [newCheckIn, setNewCheckIn] = useState<string>('');
  const [newCheckOut, setNewCheckOut] = useState<string>('');
  const [dateChangeError, setDateChangeError] = useState<string>('');

  // Upgrade Room state
  const [upgradingRes, setUpgradingRes] = useState<Reservation | null>(null);
  const [selectedUpgradeRoom, setSelectedUpgradeRoom] = useState<Room | null>(null);
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<'paystack' | 'card' | 'bank_transfer'>('paystack');
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState<boolean>(false);

  // Stay Extension state
  const [extendingRes, setExtendingRes] = useState<Reservation | null>(null);
  const [extensionNights, setExtensionNights] = useState<number>(1);
  const [extensionPaymentMethod, setExtensionPaymentMethod] = useState<'paystack' | 'card' | 'bank_transfer'>('paystack');
  const [isProcessingExtension, setIsProcessingExtension] = useState<boolean>(false);

  // Toast feedback state
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Profile fields initialized from logged-in guest account
  const [profile, setProfile] = useState(() => {
    const cleanEmail = (currentUserEmail || '').trim().toLowerCase();
    const stored = cleanEmail ? getSavedCustomerProfile(cleanEmail) : null;
    const active = guestProfile || stored;

    if (active) {
      return {
        email: active.email || cleanEmail,
        phone: active.phone || '',
        firstName: active.firstName || '',
        lastName: active.lastName || '',
        address: active.address || '',
        city: active.city || '',
        state: active.state || '',
      };
    }
    const namePart = cleanEmail ? cleanEmail.split('@')[0].replace(/[._]/g, ' ') : 'Guest';
    return {
      email: cleanEmail,
      phone: '',
      firstName: namePart,
      lastName: '',
      address: '',
      city: '',
      state: '',
    };
  });

  // Sync profile when guestProfile or currentUserEmail changes
  useEffect(() => {
    const cleanEmail = (currentUserEmail || '').trim().toLowerCase();
    const stored = cleanEmail ? getSavedCustomerProfile(cleanEmail) : null;
    const active = guestProfile || stored;

    if (active) {
      setProfile({
        email: active.email || cleanEmail,
        phone: active.phone || '',
        firstName: active.firstName || '',
        lastName: active.lastName || '',
        address: active.address || '',
        city: active.city || '',
        state: active.state || '',
      });
    } else if (cleanEmail) {
      const namePart = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
      setProfile({
        email: cleanEmail,
        phone: '',
        firstName: namePart,
        lastName: '',
        address: '',
        city: '',
        state: '',
      });
    }
  }, [guestProfile, currentUserEmail]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Delete Account Slider & Countdown State
  const [deleteSlider, setDeleteSlider] = useState<number>(0);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [accountDeleted, setAccountDeleted] = useState<boolean>(false);

  useEffect(() => {
    let timer: any;
    if (isCountingDown && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isCountingDown && countdown === 0) {
      setIsCountingDown(false);
      setAccountDeleted(true);
      const cleanEmail = (profile.email || currentUserEmail || '').trim().toLowerCase();
      try {
        const raw = localStorage.getItem('igho_db_customer_profiles');
        if (raw) {
          const list: CustomerProfile[] = JSON.parse(raw);
          const filtered = list.filter((p) => p.email.toLowerCase() !== cleanEmail);
          localStorage.setItem('igho_db_customer_profiles', JSON.stringify(filtered));
        }
      } catch {}
      setTimeout(() => {
        if (onSignOut) {
          onSignOut();
        } else {
          onNavigate('landing');
        }
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [isCountingDown, countdown, onNavigate]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setDeleteSlider(val);
    if (val >= 100) {
      setIsCountingDown(true);
      setCountdown(5);
    }
  };

  const handleCancelDelete = () => {
    setIsCountingDown(false);
    setDeleteSlider(0);
    setCountdown(5);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = (profile.email || currentUserEmail || '').trim().toLowerCase();
    const updated: CustomerProfile = {
      id: guestProfile?.id || `cust-${Date.now()}`,
      email: cleanEmail,
      firstName: (profile.firstName || '').trim(),
      lastName: (profile.lastName || '').trim(),
      phone: (profile.phone || '').trim(),
      address: (profile.address || '').trim(),
      city: profile.city?.trim() || '',
      state: profile.state?.trim() || '',
      country: 'Nigeria',
      createdAt: guestProfile?.createdAt || new Date().toISOString(),
    };

    if (onUpdateGuestProfile) {
      onUpdateGuestProfile(updated);
    }

    try {
      const raw = localStorage.getItem('igho_db_customer_profiles');
      const list: CustomerProfile[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((p) => p.email.toLowerCase() !== cleanEmail);
      localStorage.setItem('igho_db_customer_profiles', JSON.stringify([updated, ...filtered]));
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const effectiveEmail = (profile.email || currentUserEmail || '').trim().toLowerCase();
  const userReservations = reservations.filter((r) => {
    if (!effectiveEmail) return false;
    return r.guestEmail && r.guestEmail.trim().toLowerCase() === effectiveEmail;
  });

  const upcomingReservations = userReservations.filter(
    (r) =>
      r.status === 'pending_verification' ||
      r.status === 'confirmed' ||
      r.status === 'checked_in' ||
      r.status === 'date_changed' ||
      r.status === 'upgraded'
  );

  return (
    <div className="min-h-screen bg-white text-neutral-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('hotel_guest_portal')}
            className="flex items-center gap-2 text-left"
          >
            <IghoOfficialEmblem className="w-6 h-6 shrink-0" inverted={false} />
            <span className="font-extrabold text-sm text-black tracking-tight">IGHO Stay</span>
          </button>

          <nav className="hidden sm:flex items-center gap-4 text-xs font-medium text-neutral-600">
            <button onClick={() => onNavigate('landing')} className="hover:text-black">
              Home
            </button>
            <button onClick={() => onNavigate('hotel_guest_portal')} className="hover:text-black">
              Rooms
            </button>
            <button onClick={() => onNavigate('hotel_directory')} className="hover:text-black">
              Hotels
            </button>
          </nav>
        </div>

        {/* User Account Controls */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-neutral-800">
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100/90 rounded-full border border-neutral-200/80">
            <div className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
              {(profile.firstName || profile.email || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col text-left">
              <span className="max-w-[130px] sm:max-w-[180px] truncate font-bold text-neutral-900 leading-tight">
                {profile.firstName ? `${profile.firstName} ${profile.lastName}`.trim() : profile.email}
              </span>
              <span className="max-w-[130px] sm:max-w-[180px] truncate text-[10px] text-neutral-500 leading-tight">
                {profile.email}
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className={`hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeTab === 'profile'
                ? 'bg-black text-white border-black'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Edit profile
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-full hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              title="Sign out of IGHO"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </header>

      {/* Internal Navigation Tabs (Dashboard / My bookings / Profile) */}
      <div className="border-b border-neutral-200 bg-neutral-50/50 px-4 sm:px-6 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2 sm:gap-3">
            <BackButton onClick={() => onNavigate('hotel_guest_portal')} />
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-black text-white'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-200/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'bookings'
                  ? 'bg-black text-white'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-200/60'
              }`}
            >
              My bookings ({userReservations.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'profile'
                  ? 'bg-black text-white'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-200/60'
              }`}
            >
              Profile & Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* Status Alert Banners for pending bookings */}
          {userReservations.filter((r) => r.status === 'pending_verification').length > 0 && (
            <div className="space-y-2">
              {userReservations
                .filter((r) => r.status === 'pending_verification')
                .map((res) => (
                  <div
                    key={res.id}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Pending verification — {res.reference}. </span>
                      <span className="text-amber-800">
                        We're reviewing your payment receipt for {res.roomType}. You'll be notified once confirmed.
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Welcome Banner */}
          {hotel ? (
            <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8 text-white shadow-lg bg-neutral-950 flex flex-col items-start justify-between gap-6">
              {hotel.coverImage ? (
                <img
                  src={hotel.coverImage}
                  alt={hotel.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 select-none pointer-events-none transition-opacity duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 opacity-40" />
              )}
              {/* Deeper Soft Gradient Overlay to ensure absolute perfect text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 bg-black/35" />

              <div className="relative z-10 flex-1 space-y-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 max-w-full">
                    {/* Hotel Logo */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                      {hotel.logoImage ? (
                        <img src={hotel.logoImage} alt={`${hotel.name} Logo`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-white font-black text-xl uppercase">
                          {hotel.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="leading-tight min-w-0">
                      <span className="text-[10px] uppercase font-black tracking-widest text-neutral-300 block">
                        CURRENT PORTAL
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 break-words drop-shadow-md">
                        {hotel.name}
                      </h2>
                    </div>
                  </div>
                  <span className="bg-white/10 border border-white/10 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full self-start sm:self-auto uppercase tracking-wider">
                    IGHO Stay Portal
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome back{profile.firstName ? `, ${profile.firstName}` : ''}
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-200 max-w-2xl leading-relaxed font-medium whitespace-pre-line">
                    {hotel.description || `Welcome back to the guest portal of ${hotel.name}. Manage your bookings, view verified receipts, and request guest services directly.`}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => onNavigate('hotel_guest_portal')}
                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    Book another stay
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="bg-neutral-900/80 border border-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    View my bookings
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden p-6 text-white shadow-md bg-neutral-950">
              <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80"
                alt="Hotel Banner"
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div className="relative z-10 space-y-3">
                <span className="bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  IGHO Stay Guest Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Welcome back{profile.firstName ? `, ${profile.firstName}` : ''}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-300 max-w-md leading-relaxed">
                  Manage your stays, view booking receipts, update your profile details, and explore top hotels across Nigeria.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => onNavigate('hotel_guest_portal')}
                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-neutral-200 transition-colors"
                  >
                    Book a stay
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="bg-neutral-900/80 border border-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    View my bookings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Metric Cards Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-1">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <div className="text-xl sm:text-2xl font-black text-black">{upcomingReservations.length}</div>
              <div className="text-[11px] text-neutral-500">Upcoming bookings</div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-1">
              <FileText className="w-4 h-4 text-neutral-500" />
              <div className="text-xl sm:text-2xl font-black text-black">{userReservations.length}</div>
              <div className="text-[11px] text-neutral-500">Total bookings</div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-1">
              <Clock className="w-4 h-4 text-neutral-500" />
              <div className="text-xl sm:text-2xl font-black text-black">
                {userReservations.filter((r) => r.status === 'checked_out').length}
              </div>
              <div className="text-[11px] text-neutral-500">Past stays</div>
            </div>
          </div>

          {/* Upcoming Stays Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-black">Upcoming stays</h3>
              <button
                onClick={() => onNavigate('hotel_guest_portal')}
                className="text-xs font-semibold text-neutral-500 hover:text-black"
              >
                Book another stay
              </button>
            </div>

            {upcomingReservations.length > 0 ? (
              <div className="space-y-3">
                {upcomingReservations.map((res) => {
                  const isCancelled = res.status === 'cancelled';
                  const isDateChanged = res.status === 'date_changed' || !!res.originalDates;
                  const isUpgraded = res.status === 'upgraded' || !!res.upgradeDetails;
                  const isPendingAllocation = isUpgraded && (!res.upgradeDetails?.roomAllocated || res.roomNumber === 'Pending Allocation');

                  const statusColor =
                    res.status === 'confirmed'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : res.status === 'upgraded'
                      ? 'text-purple-700 bg-purple-50 border-purple-200'
                      : res.status === 'date_changed'
                      ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      : res.status === 'checked_in'
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : res.status === 'cancelled'
                      ? 'text-rose-700 bg-rose-50 border-rose-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200';

                  return (
                    <div
                      key={res.id}
                      className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xs transition-all hover:border-neutral-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <img
                            src="https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=200&q=80"
                            alt={res.roomType}
                            className="w-16 h-14 object-cover rounded-xl shrink-0"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-black">
                                {res.roomType}
                              </span>
                              <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                                {getRoomLevelInfo({ type: res.roomType }, rooms).levelLabel}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block capitalize border ${statusColor}`}>
                                {res.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 flex items-center gap-2">
                              <span>{res.checkIn} → {res.checkOut} ({res.nights} night{res.nights > 1 ? 's' : ''})</span>
                              {res.hotelName && <span className="text-neutral-400">· {res.hotelName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                          <div className="text-[11px] text-neutral-400">Total Paid</div>
                          <div className="font-extrabold text-base text-black">
                            ₦{res.total.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Informational banners for date change or upgrade */}
                      {isDateChanged && res.originalDates && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900">
                          <CalendarRange className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>
                            <strong>Dates Rescheduled:</strong> New stay is <strong>{res.checkIn}</strong> to <strong>{res.checkOut}</strong> (originally booked {res.originalDates.checkIn} to {res.originalDates.checkOut}).
                          </span>
                        </div>
                      )}

                      {isUpgraded && res.upgradeDetails && (
                        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>
                              <strong>Upgraded Stay:</strong> Upgraded from {res.upgradeDetails.previousRoomType} to {res.upgradeDetails.upgradedRoomType}. Upgrade fee of <strong>₦{res.upgradeDetails.upgradeBalancePaid.toLocaleString()}</strong> paid.
                            </span>
                          </div>
                          {isPendingAllocation && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                              Hotel Room Allocation Pending
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons row */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 flex-wrap gap-2">
                        <div className="text-[11px] font-mono text-neutral-400">
                          Ref: <span className="font-bold text-neutral-700">{res.reference}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {!isCancelled && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setExtendingRes(res);
                                  setExtensionNights(1);
                                  setIsProcessingExtension(false);
                                }}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-200 cursor-pointer shadow-3xs"
                                title="Extend your stay and add more nights"
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Extend Stay</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setChangingDateRes(res);
                                  setNewCheckIn(res.checkIn);
                                  setNewCheckOut(res.checkOut);
                                  setDateChangeError('');
                                }}
                                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                                title="Change booking dates within paid days"
                              >
                                <CalendarRange className="w-3.5 h-3.5 text-neutral-600" />
                                <span>Change Dates</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setUpgradingRes(res);
                                  setSelectedUpgradeRoom(null);
                                  setIsProcessingUpgrade(false);
                                }}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer shadow-3xs"
                                title="Upgrade room category and pay balance"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5 text-purple-600" />
                                <span>Upgrade</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingRes(res);
                                  setCancelReason('Change of travel plans');
                                  setCancelCustomReason('');
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-rose-200 cursor-pointer"
                                title="Cancel booking and request refund"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Cancel Booking</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setViewingReceiptRes(res)}
                            className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <p className="text-xs text-neutral-500">No upcoming bookings for {profile.email}</p>
                <button
                  onClick={() => onNavigate('hotel_guest_portal')}
                  className="text-xs font-bold text-black underline"
                >
                  Browse rooms
                </button>
              </div>
            )}
          </div>

          {/* Suggested Rooms (exact match from video 10:31 and 13:16) */}
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  SUGGESTED FOR YOU
                </span>
                <h3 className="font-bold text-base text-black">Rooms you might love</h3>
              </div>
              <button
                onClick={() => onNavigate('hotel_guest_portal')}
                className="text-xs font-semibold text-neutral-500 hover:text-black"
              >
                <span>View all</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getRoomCategories(rooms).map((category) => {
                const categoryImg =
                  (category.images && category.images.length > 0 && category.images[0]) ||
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';
                const isAvailable = category.isAvailable;

                return (
                  <div
                    key={category.id}
                    onClick={() => {
                      if (isAvailable) {
                        onSelectRoom(category.representativeRoom);
                        onNavigate('room_detail');
                      }
                    }}
                    className={`border rounded-2xl overflow-hidden shadow-2xs group flex flex-col justify-between transition-all ${
                      isAvailable
                        ? 'bg-white border-neutral-200 hover:border-black hover:shadow-md cursor-pointer'
                        : 'bg-neutral-100/90 border-neutral-300 opacity-65 grayscale-[35%] cursor-not-allowed'
                    }`}
                  >
                    <div className="h-44 w-full overflow-hidden relative bg-neutral-100">
                      <img
                        src={categoryImg}
                        alt={category.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isAvailable ? 'group-hover:scale-105' : ''
                        }`}
                      />
                      <div className="absolute top-2.5 right-2.5 bg-white/95 text-neutral-900 text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                        {category.levelLabel}
                      </div>
                      <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {category.tier}
                      </div>
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] flex items-center justify-center p-3">
                          <span className="bg-white/95 text-neutral-800 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-md border border-neutral-200">
                            Not available for your dates
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-black group-hover:text-neutral-900">{category.name}</span>
                          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                            {category.levelLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {category.bed} · Up to {category.maxGuests} {category.maxGuests === 1 ? 'guest' : 'guests'}
                        </div>
                        <div className="text-xs font-extrabold text-neutral-900 mt-1">
                          ₦{category.pricePerNight.toLocaleString()}
                          <span className="text-[10px] text-neutral-500 font-normal"> per night</span>
                        </div>
                      </div>
                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRoom(category.representativeRoom);
                            onNavigate('room_detail');
                          }}
                          className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs active:scale-95"
                        >
                          Book
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-2 bg-neutral-200 text-neutral-400 text-xs font-bold rounded-xl cursor-not-allowed"
                        >
                          Not available
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* Tab 2: MY BOOKINGS (exact table matching video 13:02) */}
      {activeTab === 'bookings' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-black">All bookings</h1>
              <p className="text-xs text-neutral-500">Track and manage your reservations and receipts</p>
            </div>
            <button
              onClick={() => onNavigate('hotel_guest_portal')}
              className="px-3.5 py-1.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800"
            >
              New booking
            </button>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Check in</th>
                  <th className="py-3 px-4">Check out</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {userReservations.length > 0 ? (
                  userReservations.map((res) => {
                    const isCancelled = res.status === 'cancelled';
                    const isDateChanged = res.status === 'date_changed' || !!res.originalDates;
                    const isUpgraded = res.status === 'upgraded' || !!res.upgradeDetails;
                    const isPendingAllocation = isUpgraded && (!res.upgradeDetails?.roomAllocated || res.roomNumber === 'Pending Allocation');

                    const statusBadgeClass =
                      res.status === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : res.status === 'upgraded'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : res.status === 'date_changed'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : res.status === 'checked_in'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : res.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200';

                    return (
                      <tr key={res.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-black">
                          {res.reference}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                            <span>{res.roomType}</span>
                            <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                              {getRoomLevelInfo({ type: res.roomType }, rooms).levelLabel}
                            </span>
                          </div>
                          {isUpgraded && res.upgradeDetails && (
                            <div className="text-[10px] text-purple-700 font-medium">
                              Upgraded from {res.upgradeDetails.previousRoomType} (+₦{res.upgradeDetails.upgradeBalancePaid.toLocaleString()})
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600">
                          <div>{res.checkIn}</div>
                          {isDateChanged && res.originalDates && (
                            <div className="text-[10px] text-neutral-400 line-through">
                              Was: {res.originalDates.checkIn}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600">
                          <div>{res.checkOut}</div>
                          {isDateChanged && res.originalDates && (
                            <div className="text-[10px] text-neutral-400 line-through">
                              Was: {res.originalDates.checkOut}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-black">
                          ₦{res.total.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block capitalize border ${statusBadgeClass}`}>
                              {res.status.replace('_', ' ')}
                            </span>
                            {isCancelled && (
                              <div className="text-[10px] font-semibold text-rose-600">
                                {res.refundStatus === 'initiated' ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Refund Initiated ({res.refundRef || 'Ref Pending'})
                                  </span>
                                ) : res.refundStatus === 'completed' ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Refunded ₦{(res.refundAmount || res.total).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    Refund Pending (₦{(res.refundAmount || res.total).toLocaleString()})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setViewingReceiptRes(res)}
                              className="text-xs font-semibold px-2.5 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-800 cursor-pointer"
                              title="View receipt"
                            >
                              Receipt
                            </button>
                            {!isCancelled && res.status !== 'checked_out' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtendingRes(res);
                                    setExtensionNights(1);
                                    setIsProcessingExtension(false);
                                  }}
                                  className="text-xs font-semibold px-2 py-1 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer shadow-3xs"
                                  title="Extend stay dates"
                                >
                                  Extend
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChangingDateRes(res);
                                    setNewCheckIn(res.checkIn);
                                    setNewCheckOut(res.checkOut);
                                    setDateChangeError('');
                                  }}
                                  className="text-xs font-semibold px-2 py-1 rounded border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 cursor-pointer"
                                  title="Change stay dates"
                                >
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUpgradingRes(res);
                                    setSelectedUpgradeRoom(null);
                                    setIsProcessingUpgrade(false);
                                  }}
                                  className="text-xs font-semibold px-2 py-1 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer"
                                  title="Upgrade room category"
                                >
                                  Upgrade
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancellingRes(res);
                                    setCancelReason('Change of travel plans');
                                    setCancelCustomReason('');
                                  }}
                                  className="text-xs font-semibold px-2 py-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                  title="Cancel booking"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500">
                      <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <div className="font-bold text-sm text-neutral-800">No bookings found for {profile.email}</div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                        Your reservations and payment receipts will appear here once you book a room.
                      </p>
                      <button
                        onClick={() => onNavigate('hotel_guest_portal')}
                        className="mt-3 px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-all inline-flex items-center gap-1.5"
                      >
                        Book a stay
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* Tab 3: PROFILE (exact form matching video 13:10) */}
      {activeTab === 'profile' && (
        <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-black">Your profile</h1>
            <p className="text-xs text-neutral-500">Update your account details and contact information</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-600 text-xs font-medium cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">First name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  placeholder="First name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">Last name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  placeholder="Last name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Street address"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">City</label>
                <input
                  type="text"
                  value={profile.city || ''}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">State</label>
                <input
                  type="text"
                  value={profile.state || ''}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  Save changes
                </button>
                {savedSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Changes saved ✓</span>
                  </span>
                )}
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="border border-neutral-300 hover:bg-neutral-100 text-neutral-800 px-4 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </form>

          {/* DANGER ZONE: DELETE ACCOUNT SLIDER & COUNTDOWN */}
          <div className="border border-rose-200 bg-rose-50/50 rounded-2xl p-5 space-y-4 pt-4 mt-8">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-950">Danger Zone: Delete Account</h3>
                <p className="text-xs text-rose-800/80 leading-relaxed">
                  Permanently erase your guest account, reservations history, and credentials from IGHO Stay.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Countdown Active State */}
            {isCountingDown ? (
              <div className="p-4 bg-white border border-rose-300 rounded-xl space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                    <Timer className="w-4 h-4 animate-spin" />
                    <span>Permanent Account Deletion In Progress</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-rose-600">
                    00:0{countdown}
                  </span>
                </div>

                {/* Progress countdown bar */}
                <div className="w-full bg-rose-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-600 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 5) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-neutral-500">
                    Account will be permanently wiped when timer hits zero.
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="px-4 py-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Deletion</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Slider Confirmation */
              <div className="space-y-3 bg-white p-4 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between text-xs font-semibold text-rose-900">
                  <span>Slide to confirm deletion:</span>
                  <span className="font-mono font-bold text-rose-700">{deleteSlider}%</span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={deleteSlider}
                    onChange={handleSliderChange}
                    className="w-full h-3 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-600 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Safe (0%)</span>
                  <span>Drag right to 100% to trigger 5-second countdown</span>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Account Deletion Finished Modal */}
      {accountDeleted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Account Deleted</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Your guest profile and account credentials have been permanently deleted from the IGHO Stay system.
              </p>
            </div>
            <span className="text-[10px] text-neutral-400 block">Redirecting to home page...</span>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {viewingReceiptRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="font-bold text-sm text-black">Payment Receipt</div>
              <button
                onClick={() => setViewingReceiptRes(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Booking Reference</span>
                <span className="font-mono font-bold text-black">{viewingReceiptRes.reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Amount</span>
                <span className="font-extrabold text-black">
                  ₦{viewingReceiptRes.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Payment Reference</span>
                <span className="font-mono text-neutral-700">
                  {viewingReceiptRes.paymentRef || 'N/A'}
                </span>
              </div>
            </div>

            {viewingReceiptRes.receiptUrl && (
              <div className="h-44 w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                <img
                  src={viewingReceiptRes.receiptUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <button
              onClick={() => setViewingReceiptRes(null)}
              className="w-full bg-black text-white py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: CANCEL BOOKING & REQUEST REFUND */}
      {cancellingRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black">Cancel Reservation</h3>
                  <p className="text-[11px] text-neutral-500">Ref: {cancellingRes.reference}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingRes(null)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Booking Summary */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Room Category</span>
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <span>{cancellingRes.roomType}</span>
                  <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/80 px-2 py-0.5 rounded-full">
                    {getRoomLevelInfo({ type: cancellingRes.roomType }, rooms).levelLabel}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Dates</span>
                <span className="font-semibold text-neutral-800">{cancellingRes.checkIn} → {cancellingRes.checkOut} ({cancellingRes.nights} night{cancellingRes.nights > 1 ? 's' : ''})</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200/80 pt-2">
                <span className="font-bold text-neutral-700">Total Paid Amount</span>
                <span className="font-extrabold text-black text-sm">₦{cancellingRes.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Refund Information */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Refund Policy & Hotel Notice</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-800">
                Cancelling this booking will automatically submit a refund request of <strong>₦{cancellingRes.total.toLocaleString()}</strong> to the hotel dashboard ({cancellingRes.hotelName || 'Lava Hotels'}). The hotel finance team will initiate and disburse your refund.
              </p>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-neutral-700">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black bg-white"
              >
                <option value="Change of travel plans">Change of travel plans</option>
                <option value="Emergency or personal reasons">Emergency or personal reasons</option>
                <option value="Booked incorrect dates or hotel">Booked incorrect dates or hotel</option>
                <option value="Found alternative accommodation">Found alternative accommodation</option>
                <option value="Other">Other reason</option>
              </select>
              {cancelReason === 'Other' && (
                <textarea
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Please specify your reason for cancellation..."
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black mt-2"
                  rows={2}
                />
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCancellingRes(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-700 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!cancellingRes) return;
                  const finalReason = cancelReason === 'Other' ? (cancelCustomReason || 'Guest requested cancellation') : cancelReason;
                  const updated: Reservation = {
                    ...cancellingRes,
                    status: 'cancelled',
                    cancellationReason: finalReason,
                    cancellationRequestedAt: new Date().toISOString(),
                    refundStatus: 'pending',
                    refundAmount: cancellingRes.total,
                  };
                  if (onUpdateReservation) {
                    onUpdateReservation(updated);
                  }
                  setCancellingRes(null);
                  setCancelReason('Change of travel plans');
                  setCancelCustomReason('');
                  setFeedbackToast({
                    type: 'success',
                    message: `Booking ${cancellingRes.reference} cancelled. A refund of ₦${cancellingRes.total.toLocaleString()} was requested on the hotel dashboard.`,
                  });
                  setTimeout(() => setFeedbackToast(null), 5000);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Confirm Cancellation & Request Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: CHANGE BOOKING DATES */}
      {changingDateRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black">Change Booking Dates</h3>
                  <p className="text-[11px] text-neutral-500">Ref: {changingDateRes.reference}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangingDateRes(null)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Original Paid Stay Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Room Category</span>
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <span>{changingDateRes.roomType}</span>
                  <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/80 px-2 py-0.5 rounded-full">
                    {getRoomLevelInfo({ type: changingDateRes.roomType }, rooms).levelLabel}
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Originally Paid Stay</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {changingDateRes.nights} night{changingDateRes.nights > 1 ? 's' : ''} ({changingDateRes.checkIn} → {changingDateRes.checkOut})
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-neutral-200/80 pt-2">
                <span className="text-neutral-500">Amount Paid</span>
                <span className="font-mono font-bold text-black">₦{changingDateRes.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Policy Requirement notice */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Flexible Stay:</strong> You can reschedule within your paid nights at no extra charge, or extend your stay by selecting additional nights (charged at your room's nightly rate).
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">New Check-in Date</label>
                <input
                  type="date"
                  value={newCheckIn}
                  onChange={(e) => {
                    setNewCheckIn(e.target.value);
                    setDateChangeError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">New Check-out Date</label>
                <input
                  type="date"
                  value={newCheckOut}
                  onChange={(e) => {
                    setNewCheckOut(e.target.value);
                    setDateChangeError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Live Duration Calculation & Validation */}
            {(() => {
              if (!newCheckIn || !newCheckOut) return null;
              const diffTime = new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime();
              const nights = Math.round(diffTime / (1000 * 3600 * 24));

              if (nights <= 0) {
                return (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Check-out date must be after check-in date.</span>
                  </div>
                );
              }

              if (nights > changingDateRes.nights) {
                const extraNights = nights - changingDateRes.nights;
                const nightlyRate = Math.round(changingDateRes.total / Math.max(1, changingDateRes.nights));
                const extraAmount = extraNights * nightlyRate;

                return (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1 text-emerald-800">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Stay Extension: +{extraNights} extra night{extraNights > 1 ? 's' : ''}
                      </span>
                      <span className="text-emerald-700 font-extrabold text-sm">
                        +₦{extraAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Total stay increases to <strong>{nights} nights</strong>. Extra balance will be billed for your extended stay.
                    </p>
                  </div>
                );
              }

              return (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Valid Stay: <strong>{nights} night{nights > 1 ? 's' : ''}</strong> (Within paid {changingDateRes.nights} nights)
                    </span>
                  </div>
                  {nights === changingDateRes.nights && (
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      Exact Match
                    </span>
                  )}
                </div>
              );
            })()}

            {dateChangeError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {dateChangeError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setChangingDateRes(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!changingDateRes) return;
                  const diffTime = new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime();
                  const nights = Math.round(diffTime / (1000 * 3600 * 24));
                  if (nights <= 0) {
                    setDateChangeError('Check-out must be after check-in date.');
                    return;
                  }

                  const extraNights = Math.max(0, nights - changingDateRes.nights);
                  const nightlyRate = Math.round(changingDateRes.total / Math.max(1, changingDateRes.nights));
                  const extraAmount = extraNights * nightlyRate;

                  const updated: Reservation = {
                    ...changingDateRes,
                    originalDates: changingDateRes.originalDates || {
                      checkIn: changingDateRes.checkIn,
                      checkOut: changingDateRes.checkOut,
                      nights: changingDateRes.nights,
                    },
                    checkIn: newCheckIn,
                    checkOut: newCheckOut,
                    nights: nights,
                    total: changingDateRes.total + extraAmount,
                    status: 'date_changed',
                    dateChangedAt: new Date().toISOString(),
                    dateChangeStatus: 'confirmed',
                  };
                  if (onUpdateReservation) {
                    onUpdateReservation(updated);
                  }
                  setChangingDateRes(null);
                  setFeedbackToast({
                    type: 'success',
                    message: extraNights > 0
                      ? `Stay extended to ${newCheckIn} → ${newCheckOut} (${nights} nights)! Extra ₦${extraAmount.toLocaleString()} billed.`
                      : `Dates changed to ${newCheckIn} → ${newCheckOut} (${nights} nights). Hotel dashboard updated.`,
                  });
                  setTimeout(() => setFeedbackToast(null), 5000);
                }}
                className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Confirm Dates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: DEDICATED EXTEND STAY */}
      {extendingRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black">Extend Your Stay</h3>
                  <p className="text-[11px] text-neutral-500">Ref: {extendingRes.reference}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtendingRes(null)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Stay Card */}
            {(() => {
              const currentRate = Math.round(extendingRes.total / Math.max(1, extendingRes.nights));
              const resLevel = getRoomLevelInfo({ type: extendingRes.roomType }, rooms);
              const extraCost = extensionNights * currentRate;

              // Calculate new checkout date
              const currentCheckOutDate = new Date(extendingRes.checkOut);
              const newCheckOutDateObj = new Date(currentCheckOutDate);
              newCheckOutDateObj.setDate(newCheckOutDateObj.getDate() + extensionNights);
              const newCheckOutFormatted = newCheckOutDateObj.toISOString().split('T')[0];

              return (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Booked Room Category</span>
                      <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <span>{extendingRes.roomType}</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {resLevel.levelLabel}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Current Stay Duration</span>
                      <span className="font-medium text-neutral-800">
                        {extendingRes.nights} night{extendingRes.nights > 1 ? 's' : ''} ({extendingRes.checkIn} → {extendingRes.checkOut})
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-200/60 pt-2">
                      <span className="text-neutral-500">Nightly Rate</span>
                      <span className="font-bold text-neutral-900">₦{currentRate.toLocaleString()} / night</span>
                    </div>
                  </div>

                  {/* Extension Nights Selection */}
                  <div className="space-y-2">
                    <label className="block font-bold text-neutral-800">How many extra nights would you like to add?</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 7].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setExtensionNights(n)}
                          className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                            extensionNights === n
                              ? 'bg-black text-white border-black shadow-2xs'
                              : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          +{n} {n === 1 ? 'Night' : 'Nights'}
                        </button>
                      ))}
                    </div>

                    {/* Stepper for custom nights */}
                    <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-xl p-2 mt-2">
                      <span className="text-xs text-neutral-600 font-medium">Custom duration:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExtensionNights((n) => Math.max(1, n - 1))}
                          disabled={extensionNights <= 1}
                          className="w-7 h-7 rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-neutral-900 w-8 text-center">{extensionNights}</span>
                        <button
                          type="button"
                          onClick={() => setExtensionNights((n) => Math.min(30, n + 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary of Extension */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">New Check-out Date</span>
                      <span className="font-bold text-neutral-900">{newCheckOutFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Total Stay Duration</span>
                      <span className="font-semibold text-neutral-800">
                        {extendingRes.nights + extensionNights} nights (+{extensionNights} extended)
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-neutral-200/80 pt-2">
                      <span className="font-bold text-neutral-700">Extra Amount Due</span>
                      <span className="font-extrabold text-emerald-700 text-base">₦{extraCost.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-neutral-700 text-[11px]">Payment Method for Extension</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'paystack', label: 'Paystack' },
                        { id: 'card', label: 'Debit Card' },
                        { id: 'bank_transfer', label: 'Transfer' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setExtensionPaymentMethod(m.id as any)}
                          className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                            extensionPaymentMethod === m.id
                              ? 'bg-black text-white border-black shadow-2xs'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setExtendingRes(null)}
                      className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingExtension}
                      onClick={() => {
                        setIsProcessingExtension(true);
                        setTimeout(() => {
                          const updated: Reservation = {
                            ...extendingRes,
                            checkOut: newCheckOutFormatted,
                            nights: extendingRes.nights + extensionNights,
                            total: extendingRes.total + extraCost,
                            status: 'confirmed',
                            dateChangedAt: new Date().toISOString(),
                            originalDates: extendingRes.originalDates || {
                              checkIn: extendingRes.checkIn,
                              checkOut: extendingRes.checkOut,
                              nights: extendingRes.nights,
                            },
                          };

                          if (onUpdateReservation) {
                            onUpdateReservation(updated);
                          }
                          setIsProcessingExtension(false);
                          setExtendingRes(null);
                          setFeedbackToast({
                            type: 'success',
                            message: `Stay successfully extended by ${extensionNights} night(s) to ${newCheckOutFormatted}! Paid ₦${extraCost.toLocaleString()}. Hotel dashboard updated.`,
                          });
                          setTimeout(() => setFeedbackToast(null), 5000);
                        }, 1000);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {isProcessingExtension ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay ₦{extraCost.toLocaleString()} & Extend Stay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal 3: UPGRADE ROOM OR BOOKING */}
      {upgradingRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <ArrowUpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black">Upgrade Room Tier</h3>
                  <p className="text-[11px] text-neutral-500">Ref: {upgradingRes.reference} · Current: {upgradingRes.roomType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUpgradingRes(null);
                  setSelectedUpgradeRoom(null);
                }}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Stay & Paid Credit */}
            {(() => {
              const currentRate = Math.round(upgradingRes.total / Math.max(1, upgradingRes.nights));
              const resLevel = getRoomLevelInfo({ type: upgradingRes.roomType }, rooms);
              return (
                <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700">Current Booking Credit</span>
                    <div className="font-extrabold text-sm text-neutral-900 mt-0.5 flex items-center gap-1.5">
                      <span>{upgradingRes.roomType}</span>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                        {resLevel.levelLabel}
                      </span>
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5">
                      {upgradingRes.nights} night{upgradingRes.nights > 1 ? 's' : ''} ({upgradingRes.checkIn} → {upgradingRes.checkOut})
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-neutral-500">Current Paid Total</span>
                    <div className="font-extrabold text-base text-purple-900">
                      ₦{upgradingRes.total.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-neutral-500">≈ ₦{currentRate.toLocaleString()}/night</span>
                  </div>
                </div>
              );
            })()}

            {/* Step 1: Select Available Category for Upgrade */}
            {!selectedUpgradeRoom ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-neutral-800">
                    Select higher room category to upgrade:
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    Pay only the difference for your remaining stay
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const currentRate = Math.round(upgradingRes.total / Math.max(1, upgradingRes.nights));
                    const currentLevel = getRoomLevelInfo({ type: upgradingRes.roomType }, rooms).level;
                    const allCategories = getRoomCategories(rooms);

                    const upgradeCandidates = allCategories
                      .filter(
                        (c) =>
                          c.name.toLowerCase() !== upgradingRes.roomType.toLowerCase() &&
                          (c.pricePerNight > currentRate || c.level > currentLevel)
                      )
                      .sort((a, b) => a.pricePerNight - b.pricePerNight);

                    if (upgradeCandidates.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
                          No higher room tiers available in this hotel. You are currently booked in the premier tier.
                        </div>
                      );
                    }

                    return upgradeCandidates.map((candidate) => {
                      const rateDiff = Math.max(0, candidate.pricePerNight - currentRate);
                      const balanceToPay = Math.round(rateDiff * upgradingRes.nights);
                      const isAvailable = candidate.isAvailable;

                      return (
                        <div
                          key={candidate.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                            isAvailable
                              ? 'border-neutral-200 hover:border-purple-500 bg-white hover:bg-purple-50/20'
                              : 'bg-neutral-100/90 border-neutral-300 opacity-65 grayscale-[35%] cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {candidate.images && candidate.images[0] ? (
                              <img
                                src={candidate.images[0]}
                                alt={candidate.name}
                                className="w-16 h-14 object-cover rounded-xl shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-14 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                                Category
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-sm text-black flex items-center gap-2">
                                <span>{candidate.name}</span>
                                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                                  {candidate.levelLabel}
                                </span>
                              </div>
                              <div className="text-xs text-neutral-500">
                                ₦{candidate.pricePerNight.toLocaleString()} / night
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate max-w-xs mt-0.5">
                                {candidate.bed} · Up to {candidate.maxGuests} guests
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-neutral-400 block">Upgrade Balance</span>
                              <span className="font-extrabold text-sm text-purple-700">
                                +₦{balanceToPay.toLocaleString()}
                              </span>
                            </div>
                            {isAvailable ? (
                              <button
                                type="button"
                                onClick={() => setSelectedUpgradeRoom(candidate.representativeRoom)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <span>Select</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-2 bg-neutral-200 text-neutral-400 text-xs font-bold rounded-xl cursor-not-allowed"
                              >
                                <span>Not available for your dates</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              /* Step 2: Confirm & Pay Upgrade Balance */
              <div className="space-y-4">
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3 text-xs">
                  <div className="font-bold text-sm text-black border-b border-neutral-200 pb-2 flex items-center justify-between">
                    <span>Upgrade Summary & Calculation</span>
                    <button
                      type="button"
                      onClick={() => setSelectedUpgradeRoom(null)}
                      className="text-xs text-purple-600 hover:underline cursor-pointer"
                    >
                      Choose different room
                    </button>
                  </div>

                  {(() => {
                    const currentRate = Math.round(upgradingRes.total / Math.max(1, upgradingRes.nights));
                    const rateDiff = Math.max(0, selectedUpgradeRoom.pricePerNight - currentRate);
                    const balanceToPay = Math.round(rateDiff * upgradingRes.nights);

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">New Room Category</span>
                          <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                            <span>{selectedUpgradeRoom.type}</span>
                            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                              {getRoomLevelInfo(selectedUpgradeRoom, rooms).levelLabel}
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">New Category Rate</span>
                          <span className="font-semibold text-neutral-800">
                            ₦{selectedUpgradeRoom.pricePerNight.toLocaleString()} / night
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Nightly Rate Difference</span>
                          <span className="font-semibold text-neutral-800">
                            +₦{rateDiff.toLocaleString()} / night
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Stay Duration</span>
                          <span className="font-semibold text-neutral-800">{upgradingRes.nights} night(s)</span>
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 pt-2 font-extrabold text-sm text-black">
                          <span>Total Balance to Pay</span>
                          <span className="text-purple-700 font-black text-base">₦{balanceToPay.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2 text-xs">
                  <label className="block font-bold text-neutral-700">Select Payment Method for Upgrade Balance</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'paystack', label: 'Paystack (Instant)' },
                      { id: 'card', label: 'Debit Card' },
                      { id: 'bank_transfer', label: 'Bank Transfer' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setUpgradePaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          upgradePaymentMethod === m.id
                            ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                            : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hotel Front Desk Allocation Notice */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    Once payment of the upgrade balance is completed, your reservation immediately updates to <strong>{selectedUpgradeRoom.type}</strong>. The hotel dashboard will receive an instant notification to allocate your room keys upon check-in.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setSelectedUpgradeRoom(null)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-700 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingUpgrade}
                    onClick={() => {
                      if (!upgradingRes || !selectedUpgradeRoom) return;
                      setIsProcessingUpgrade(true);
                      setTimeout(() => {
                        const currentRate = Math.round(upgradingRes.total / Math.max(1, upgradingRes.nights));
                        const rateDiff = Math.max(0, selectedUpgradeRoom.pricePerNight - currentRate);
                        const balanceToPay = Math.round(rateDiff * upgradingRes.nights);

                        const updated: Reservation = {
                          ...upgradingRes,
                          roomId: selectedUpgradeRoom.id,
                          roomType: selectedUpgradeRoom.type,
                          roomNumber: 'Pending Allocation',
                          total: upgradingRes.total + balanceToPay,
                          status: 'upgraded',
                          upgradeDetails: {
                            previousRoomType: upgradingRes.roomType,
                            previousRoomNumber: upgradingRes.roomNumber,
                            previousPricePerNight: currentRate,
                            upgradedRoomType: selectedUpgradeRoom.type,
                            newPricePerNight: selectedUpgradeRoom.pricePerNight,
                            upgradeBalancePaid: balanceToPay,
                            upgradePaymentRef: `UPG-PAY-${Date.now().toString(36).toUpperCase()}`,
                            upgradedAt: new Date().toISOString(),
                            roomAllocated: false,
                          },
                        };

                        if (onUpdateReservation) {
                          onUpdateReservation(updated);
                        }
                        setIsProcessingUpgrade(false);
                        setUpgradingRes(null);
                        setSelectedUpgradeRoom(null);
                        setFeedbackToast({
                          type: 'success',
                          message: `Room upgraded to ${selectedUpgradeRoom.type}! Paid ₦${balanceToPay.toLocaleString()} balance. Hotel dashboard notified to allocate room.`,
                        });
                        setTimeout(() => setFeedbackToast(null), 5000);
                      }, 1000);
                    }}
                    className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    {isProcessingUpgrade ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Upgrade Balance & Confirm</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold ${
              feedbackToast.type === 'success'
                ? 'bg-neutral-950 text-white border-neutral-800'
                : 'bg-rose-900 text-white border-rose-800'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-neutral-400 hover:text-white ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

