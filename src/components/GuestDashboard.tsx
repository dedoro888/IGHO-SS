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
} from 'lucide-react';
import { Reservation, Room, ActiveScreen, CustomerProfile } from '../types';
import { BackButton } from './BackButton';
import { getSavedCustomerProfile } from '../utils/auth';

interface GuestDashboardProps {
  reservations: Reservation[];
  rooms: Room[];
  onNavigate: (screen: ActiveScreen) => void;
  onSelectRoom: (room: Room) => void;
  currentUserEmail?: string;
  guestProfile?: CustomerProfile | null;
  onUpdateGuestProfile?: (profile: CustomerProfile) => void;
  onSignOut?: () => void;
  initialTab?: 'dashboard' | 'bookings' | 'profile';
}

export const GuestDashboard: React.FC<GuestDashboardProps> = ({
  reservations,
  rooms,
  onNavigate,
  onSelectRoom,
  currentUserEmail,
  guestProfile,
  onUpdateGuestProfile,
  onSignOut,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'profile'>(initialTab);
  const [viewingReceiptRes, setViewingReceiptRes] = useState<Reservation | null>(null);

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
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      phone: profile.phone.trim(),
      address: profile.address.trim(),
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
    (r) => r.status === 'pending_verification' || r.status === 'confirmed' || r.status === 'checked_in'
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
            <div className="w-6 h-6 bg-black text-white font-black rounded flex items-center justify-center text-xs">
              I
            </div>
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
                {upcomingReservations.map((res) => (
                  <div
                    key={res.id}
                    className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=200&q=80"
                        alt={res.roomType}
                        className="w-16 h-14 object-cover rounded-xl shrink-0"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-black">
                          {res.roomType} — Room {res.roomNumber}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {res.checkIn} → {res.checkOut}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-black">
                          ₦{res.total.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block capitalize">
                          {res.status.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={() => setViewingReceiptRes(res)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
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
              {rooms.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs group flex flex-col justify-between"
                >
                  <div className="h-40 w-full overflow-hidden relative">
                    <img
                      src={r.images[0]}
                      alt={r.type}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/95 text-[11px] font-bold px-2 py-0.5 rounded shadow-2xs">
                      Room {r.number}
                    </div>
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-black">{r.type}</div>
                      <div className="text-xs font-extrabold text-neutral-900 mt-0.5">
                        ₦{r.pricePerNight.toLocaleString()}
                        <span className="text-[10px] text-neutral-400 font-normal"> per night</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onSelectRoom(r);
                        onNavigate('room_detail');
                      }}
                      className="px-3.5 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
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
                  userReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-black">{res.reference}</td>
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        {res.roomType} · {res.roomNumber}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">{res.checkIn}</td>
                      <td className="py-3.5 px-4 text-neutral-600">{res.checkOut}</td>
                      <td className="py-3.5 px-4 font-extrabold text-black">
                        ₦{res.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block capitalize">
                          {res.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setViewingReceiptRes(res)}
                          className="text-xs font-semibold px-2.5 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-800"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))
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
              className="w-full bg-black text-white py-2 rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
