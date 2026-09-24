import React, { useState, useEffect } from 'react';
import {
  ActiveScreen,
  Hotel,
  Room,
  Reservation,
  StaffAccount,
  StaffInvitation,
  HousekeepingTask,
  SubscriptionPlan,
  PlatformSettings,
  CustomRole,
  GuestReport,
  CustomerProfile,
} from './types';
import {
  INITIAL_HOTELS,
  INITIAL_ROOMS,
  INITIAL_RESERVATIONS,
  INITIAL_STAFF,
  INITIAL_HOUSEKEEPING,
} from './data/mockData';
import { INITIAL_PLANS, INITIAL_PLATFORM_SETTINGS } from './data/platformData';
import { resolveUserAccount, SUPER_ADMIN_EMAIL, getSavedCustomerProfile, saveCustomerProfile } from './utils/auth';

// Core Components
import { LandingPage } from './components/LandingPage';
import { SetupSelector } from './components/SetupSelector';
import { HotelOnboarding } from './components/HotelOnboarding';
import { HotelDirectory } from './components/HotelDirectory';
import { HotelGuestPortal } from './components/HotelGuestPortal';
import { RoomDetailView } from './components/RoomDetailView';
import { GuestBookingCheckout } from './components/GuestBookingCheckout';
import { GuestDashboard } from './components/GuestDashboard';
import { GuestAuth } from './components/GuestAuth';
import { StaffLogin } from './components/StaffLogin';
import { StaffPortal } from './components/StaffPortal';
import { DemoRequestModal } from './components/DemoRequestModal';
import { WaitlistView } from './components/WaitlistViews';
import { SuperAdminConsole } from './components/SuperAdminConsole';
import { StaffInvitationAccept } from './components/StaffInvitationAccept';
import { INITIAL_INVITATIONS } from './data/mockData';

// Local persistence helper utilities
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (item !== null) {
      return JSON.parse(item);
    }
  } catch (err) {
    console.warn(`Error reading storage key "${key}":`, err);
  }
  return fallback;
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error writing storage key "${key}":`, err);
  }
};

// Safe fallbacks when data arrays are empty
const DEFAULT_FALLBACK_HOTEL: Hotel = {
  id: '',
  name: '',
  location: '',
  city: '',
  state: '',
  isLive: false,
  roomCount: 0,
  coverImage: '',
  logoImage: '',
  address: '',
  email: '',
  phone: '',
  registeredBusiness: false,
  bankName: '',
  accountName: '',
  accountNumber: '',
  coordinates: {
    lat: 0,
    lng: 0,
  },
};

const DEFAULT_FALLBACK_ROOM: Room = {
  id: '',
  number: '',
  type: '',
  typeName: '',
  pricePerNight: 0,
  status: 'available',
  floor: 1,
  maxGuests: 0,
  roomSize: 0,
  bed: '',
  description: '',
  amenities: [],
  images: [],
};

export default function App() {
  // User session state (persisted so refresh preserves user session)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return loadFromStorage('igho_currentUserEmail', '');
  });
  const [currentGuestProfile, setCurrentGuestProfile] = useState<CustomerProfile | null>(() => {
    const savedEmail = loadFromStorage('igho_currentUserEmail', '');
    if (!savedEmail) return null;
    return getSavedCustomerProfile(savedEmail);
  });
  const [guestDashboardTab, setGuestDashboardTab] = useState<'overview' | 'bookings' | 'profile'>('overview');
  const [currentStaffEmail, setCurrentStaffEmail] = useState<string>(() => {
    return loadFromStorage('igho_currentStaffEmail', 'admin@lavahotels.ng');
  });

  useEffect(() => {
    saveToStorage('igho_currentUserEmail', currentUserEmail);
    if (currentUserEmail) {
      const p = getSavedCustomerProfile(currentUserEmail);
      if (p) setCurrentGuestProfile(p);
    } else {
      setCurrentGuestProfile(null);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    saveToStorage('igho_currentStaffEmail', currentStaffEmail);
  }, [currentStaffEmail]);

  // Active Screen (persisted so refresh does not log the user out or return to landing)
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#console' || hash === '#/console' || window.location.pathname === '/console') {
        return 'super_admin_console';
      }
      try {
        const savedScreen = localStorage.getItem('igho_active_screen');
        if (savedScreen) return savedScreen as ActiveScreen;
      } catch {}
    }
    return 'landing';
  });

  useEffect(() => {
    try {
      if (activeScreen) {
        localStorage.setItem('igho_active_screen', activeScreen);
      }
    } catch {}
  }, [activeScreen]);

  // Handle URL hash changes for direct routing (/console or #console)
  useEffect(() => {
    const handleHashRouting = () => {
      const hash = window.location.hash.toLowerCase();
      const superAdminEmails = ['rumeobire@gmail.com', 'dedoro888@gmail.com', 'admin@igho.com'];
      if (hash === '#console' || hash === '#/console' || window.location.pathname === '/console') {
        if (superAdminEmails.includes(currentUserEmail.toLowerCase())) {
          setActiveScreen('super_admin_console');
        } else {
          // Strictly block non-super-admins from /console
          window.location.hash = '';
          setActiveScreen('landing');
        }
      }
    };
    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
    return () => window.removeEventListener('hashchange', handleHashRouting);
  }, [currentUserEmail]);

  const navigateTo = (screen: ActiveScreen, authEmail?: string) => {
    const emailToCheck = (authEmail || currentUserEmail || '').trim().toLowerCase();
    const superAdminEmails = ['rumeobire@gmail.com', 'dedoro888@gmail.com', 'admin@igho.com'];

    if (screen === 'super_admin_console') {
      if (!superAdminEmails.includes(emailToCheck)) {
        alert('Access Denied: IGHO Console is strictly restricted to authorized IGHO Platform Super Admins.');
        return;
      }
      window.location.hash = 'console';
    } else if (screen === 'staff_portal') {
      const userHotel = hotels.find((h) => h.email?.toLowerCase() === emailToCheck);
      if (userHotel) {
        if (userHotel.approvalStatus !== 'approved') {
          alert(`Your hotel "${userHotel.name}" registration is currently ${userHotel.approvalStatus}. Access to the dashboard is locked.`);
          return;
        }
        if (userHotel.paymentStatus !== 'paid') {
          alert(`Your subscription for "${userHotel.name}" is unpaid. Please choose a subscription plan first via the Notification Bell in the header.`);
          return;
        }
      }
    } else if (window.location.hash === '#console' || window.location.hash === '#/console') {
      history.replaceState(null, '', window.location.pathname);
    }
    setActiveScreen(screen);
  };

  const handleGuestSignOut = () => {
    setCurrentUserEmail('');
    setCurrentGuestProfile(null);
    try {
      localStorage.removeItem('igho_currentUserEmail');
      localStorage.setItem('igho_active_screen', 'landing');
    } catch {}
    navigateTo('landing');
  };

  const handleEditProfile = () => {
    setGuestDashboardTab('profile');
    navigateTo('guest_dashboard');
  };

  const handleLoginSuccess = (email: string, profile?: CustomerProfile) => {
    const cleanEmail = email.trim().toLowerCase();
    setCurrentUserEmail(cleanEmail);

    if (profile) {
      setCurrentGuestProfile(profile);
      saveCustomerProfile(profile);
    } else {
      const existing = getSavedCustomerProfile(cleanEmail);
      if (existing) {
        setCurrentGuestProfile(existing);
      } else {
        const parts = cleanEmail.split('@')[0].replace(/[._]/g, ' ').split(/\s+/);
        const fallbackProfile: CustomerProfile = {
          id: `cust-${Date.now()}`,
          email: cleanEmail,
          firstName: parts[0] || 'Guest',
          lastName: parts.slice(1).join(' ') || '',
          phone: '',
          address: '',
          createdAt: new Date().toISOString(),
        };
        saveCustomerProfile(fallbackProfile);
        setCurrentGuestProfile(fallbackProfile);
      }
    }

    const account = resolveUserAccount(cleanEmail, profile);
    if (account.role === 'super_admin') {
      navigateTo('super_admin_console', cleanEmail);
    } else if (account.role === 'customer') {
      setGuestDashboardTab('overview');
      navigateTo('guest_dashboard', cleanEmail);
    } else {
      setCurrentStaffEmail(cleanEmail);
      navigateTo('staff_portal', cleanEmail);
    }
  };

  // Application Data States (Persisted across refreshes in localStorage)
  const [hotels, setHotels] = useState<Hotel[]>(() =>
    loadFromStorage<Hotel[]>('igho_db_hotels', INITIAL_HOTELS)
  );
  useEffect(() => {
    saveToStorage('igho_db_hotels', hotels);
  }, [hotels]);

  const [selectedHotel, setSelectedHotel] = useState<Hotel>(() => {
    const savedHotels = loadFromStorage<Hotel[]>('igho_db_hotels', INITIAL_HOTELS);
    try {
      const savedHotelId = localStorage.getItem('igho_db_selected_hotel_id');
      if (savedHotelId) {
        const found = savedHotels.find((h) => h.id === savedHotelId);
        if (found) return found;
      }
    } catch {}
    return savedHotels[0] || DEFAULT_FALLBACK_HOTEL;
  });
  useEffect(() => {
    try {
      if (selectedHotel?.id) {
        localStorage.setItem('igho_db_selected_hotel_id', selectedHotel.id);
      }
    } catch {}
  }, [selectedHotel]);

  const [rooms, setRooms] = useState<Room[]>(() =>
    loadFromStorage<Room[]>('igho_db_rooms', INITIAL_ROOMS)
  );
  useEffect(() => {
    saveToStorage('igho_db_rooms', rooms);
  }, [rooms]);

  const [selectedRoom, setSelectedRoom] = useState<Room>(() => {
    const currentRooms = loadFromStorage<Room[]>('igho_db_rooms', INITIAL_ROOMS);
    return currentRooms[0] || DEFAULT_FALLBACK_ROOM;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() =>
    loadFromStorage<Reservation[]>('igho_db_reservations', INITIAL_RESERVATIONS)
  );
  useEffect(() => {
    saveToStorage('igho_db_reservations', reservations);
  }, [reservations]);

  const [staff, setStaff] = useState<StaffAccount[]>(() =>
    loadFromStorage<StaffAccount[]>('igho_db_staff', INITIAL_STAFF)
  );
  useEffect(() => {
    saveToStorage('igho_db_staff', staff);
  }, [staff]);

  const [housekeeping, setHousekeeping] = useState<HousekeepingTask[]>(() =>
    loadFromStorage<HousekeepingTask[]>('igho_db_housekeeping', INITIAL_HOUSEKEEPING)
  );
  useEffect(() => {
    saveToStorage('igho_db_housekeeping', housekeeping);
  }, [housekeeping]);

  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    loadFromStorage<SubscriptionPlan[]>('igho_db_plans', INITIAL_PLANS)
  );
  useEffect(() => {
    saveToStorage('igho_db_plans', plans);
  }, [plans]);

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() =>
    loadFromStorage<PlatformSettings>('igho_db_platform_settings', INITIAL_PLATFORM_SETTINGS)
  );
  useEffect(() => {
    saveToStorage('igho_db_platform_settings', platformSettings);
  }, [platformSettings]);

  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() =>
    loadFromStorage<CustomRole[]>('igho_db_customRoles', [])
  );
  useEffect(() => {
    saveToStorage('igho_db_customRoles', customRoles);
  }, [customRoles]);

  const [invitations, setInvitations] = useState<StaffInvitation[]>(() =>
    loadFromStorage<StaffInvitation[]>('igho_db_invitations', [
      {
        id: 'inv-1',
        hotelId: 'hotel-lava',
        hotelName: 'Lava Hotels & Suites',
        email: 'tunde.adebayo@lavahotels.ng',
        role: 'receptionist',
        token: 'tok-tunde-2026',
        status: 'pending',
        invitedBy: 'admin@lavahotels.ng',
        invitedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      },
    ])
  );
  useEffect(() => {
    saveToStorage('igho_db_invitations', invitations);
  }, [invitations]);

  const [guestReports, setGuestReports] = useState<GuestReport[]>(() =>
    loadFromStorage<GuestReport[]>('igho_db_guestReports', [])
  );
  useEffect(() => {
    saveToStorage('igho_db_guestReports', guestReports);
  }, [guestReports]);

  // Booking draft state for checkout
  const [bookingDraft, setBookingDraft] = useState({
    room: rooms[0] || DEFAULT_FALLBACK_ROOM,
    checkIn: '2026-09-08',
    checkOut: '2026-09-09',
    nights: 1,
    guests: 1,
    total: 35000,
  });

  // Handler for adding a hotel from onboarding wizard
  const handleHotelCreated = (newHotelData: any) => {
    const createdHotel: Hotel = {
      id: `hotel-${Date.now()}`,
      name: newHotelData.hotelName || 'Lava Hotel',
      location: `${newHotelData.city || 'Asaba'}, ${newHotelData.state || 'Delta'}`,
      city: newHotelData.city || 'Asaba',
      state: newHotelData.state || 'Delta',
      country: newHotelData.country || 'Nigeria',
      rating: 0,
      reviewCount: 0,
      isLive: true,
      roomCount: parseInt(newHotelData.roomCount, 10) || 30,
      startingPrice: 35000,
      coverImage:
        newHotelData.coverImage ||
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      logoImage: newHotelData.logoImage || '',
      address: newHotelData.address || 'Okpanam Road, Asaba',
      email: newHotelData.email || newHotelData.hotelEmail || 'info@lavahotel.ng',
      phone: newHotelData.phone || newHotelData.hotelPhone || '+234 811 223 3445',
      registeredBusiness: !!newHotelData.isRegisteredBusiness || !!newHotelData.registeredBusiness,
      cacNumber: newHotelData.cacNumber,
      bankName: newHotelData.bankName || 'Zenith Bank',
      accountName: newHotelData.accountName || 'Lava Hotel Ltd',
      accountNumber: newHotelData.accountNumber || '1014529384',
      coordinates: { lat: 6.1982, lng: 6.7335 },
      approvalStatus: 'approved',
      paymentStatus: 'paid',
      status: 'active',
      submittedAt: new Date().toISOString(),
    };

    setHotels((prev) => [createdHotel, ...prev]);
    setSelectedHotel(createdHotel);
    setActiveScreen('staff_portal');
  };

  const handleAddRoom = (newRoom: Room) => {
    setRooms((prev) => [newRoom, ...prev]);
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    if (selectedRoom.id === updatedRoom.id) {
      setSelectedRoom(updatedRoom);
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const handleAddReservation = (newRes: Reservation) => {
    setReservations((prev) => [newRes, ...prev]);
  };

  const handleUpdateReservationStatus = (resId: string, status: Reservation['status']) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status } : r))
    );
  };

  const handleUpdateStaffPermissions = (staffId: string, permissions: any[]) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, permissions } : s))
    );
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 w-full flex flex-col">
      {/* SCREEN 1: LANDING */}
      {activeScreen === 'landing' && (
        <LandingPage
          onNavigate={navigateTo}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
        />
      )}

      {/* SCREEN 2: SETUP SELECTOR */}
      {activeScreen === 'setup_selector' && (
        <SetupSelector onNavigate={navigateTo} />
      )}

      {/* SCREEN 3: HOTEL ONBOARDING (6-STEP WIZARD) */}
      {activeScreen === 'hotel_onboarding' && (
        <HotelOnboarding
          onNavigate={navigateTo}
          onHotelCreated={handleHotelCreated}
          plans={plans}
          payoutSettings={platformSettings.subscriptionPayout}
          existingHotels={hotels}
          onRegisterRequest={(hotelData) => {
            const pendingHotel: Hotel = {
              id: `hotel-${Date.now()}`,
              name: hotelData.hotelName || 'Pending Hotel',
              location: `${hotelData.city || 'Lagos'}, ${hotelData.state || 'Lagos'}`,
              city: hotelData.city || 'Lagos',
              state: hotelData.state || 'Lagos',
              rating: 5.0,
              isLive: false,
              approvalStatus: 'pending',
              roomCount: parseInt(hotelData.roomCount, 10) || 20,
              startingPrice: 35000,
              coverImage:
                hotelData.coverImage ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
              logoImage: hotelData.logoImage,
              address: hotelData.address || '',
              email: hotelData.email || '',
              phone: hotelData.phone || '',
              registeredBusiness: hotelData.registeredBusiness,
              cacNumber: hotelData.cacNumber,
              bankName: hotelData.bankName || '',
              accountName: hotelData.accountName || '',
              accountNumber: hotelData.accountNumber || '',
              coordinates: { lat: 6.5244, lng: 3.3792 },
            };
            setHotels((prev) => [pendingHotel, ...prev]);
          }}
        />
      )}

      {/* SCREEN 4: HOTEL DIRECTORY (SEARCH, NEAR ME, POPULAR LOCATIONS, 9 HOTELS) */}
      {activeScreen === 'hotel_directory' && (
        <HotelDirectory
          hotels={hotels}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onSelectHotel={(h) => {
            setSelectedHotel(h);
            navigateTo('hotel_guest_portal');
          }}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 5: HOTEL PUBLIC GUEST PORTAL (ROOMS & SUITES) */}
      {activeScreen === 'hotel_guest_portal' && (
        <HotelGuestPortal
          hotel={selectedHotel}
          rooms={rooms}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onSelectRoom={(r) => {
            setSelectedRoom(r);
            navigateTo('room_detail');
          }}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 6: ROOM DETAIL VIEW (SPECS, AMENITIES, CALENDAR PICKER, BOOKING WIDGET) */}
      {activeScreen === 'room_detail' && (
        <RoomDetailView
          room={selectedRoom}
          hotel={selectedHotel}
          allRooms={rooms}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onSelectRoom={setSelectedRoom}
          onNavigate={navigateTo}
          onStartBooking={(draft) => {
            setBookingDraft(draft);
            navigateTo('guest_checkout');
          }}
        />
      )}

      {/* SCREEN 7: GUEST CHECKOUT & BANK TRANSFER PAYMENT */}
      {activeScreen === 'guest_checkout' && (
        <GuestBookingCheckout
          room={bookingDraft.room}
          hotel={selectedHotel}
          bookingDraft={bookingDraft}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onCompleteBooking={(res) => {
            handleAddReservation(res);
          }}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 8: GUEST DASHBOARD (BOOKINGS, PROFILE, STATUS BANNERS) */}
      {activeScreen === 'guest_dashboard' && (
        <GuestDashboard
          hotel={selectedHotel}
          reservations={reservations}
          rooms={rooms}
          currentUserEmail={currentUserEmail}
          guestProfile={currentGuestProfile}
          initialTab={guestDashboardTab}
          onUpdateGuestProfile={(updated) => {
            setCurrentGuestProfile(updated);
            saveCustomerProfile(updated);
          }}
          onSignOut={handleGuestSignOut}
          onNavigate={navigateTo}
          onSelectRoom={(r) => {
            setSelectedRoom(r);
            navigateTo('room_detail');
          }}
        />
      )}

      {/* SCREEN 9: UNIFIED AUTHENTICATION (ALL USER ROLES) */}
      {(activeScreen === 'guest_login' || activeScreen === 'staff_login') && (
        <GuestAuth
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onLoginSuccess={handleLoginSuccess}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 11: STAFF PORTAL (DASHBOARD, ROOM INVENTORY, RESERVATIONS, SETTINGS) */}
      {activeScreen === 'staff_portal' && (
        <StaffPortal
          hotel={selectedHotel}
          rooms={rooms}
          reservations={reservations}
          staff={staff}
          invitations={invitations}
          housekeeping={housekeeping}
          plans={plans}
          customRoles={customRoles}
          guestReports={guestReports}
          payoutSettings={platformSettings.subscriptionPayout}
          onAddRoom={handleAddRoom}
          onUpdateRoom={handleUpdateRoom}
          onDeleteRoom={handleDeleteRoom}
          onInviteStaff={(invite) => {
            setInvitations((prev) => [invite, ...prev]);
          }}
          onAddStaffMember={(newStaff) => {
            setStaff((prev) => [newStaff, ...prev]);
          }}
          onDeactivateStaff={(staffId) => {
            setStaff((prev) =>
              prev.map((s) => (s.id === staffId ? { ...s, status: 'inactive', active: false } : s))
            );
          }}
          onReactivateStaff={(staffId) => {
            setStaff((prev) =>
              prev.map((s) => (s.id === staffId ? { ...s, status: 'active', active: true } : s))
            );
          }}
          onUpdateHotel={(updatedHotel) => {
            setHotels((prev) =>
              prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h))
            );
            setSelectedHotel(updatedHotel);
          }}
          onAddReservation={handleAddReservation}
          onUpdateReservationStatus={handleUpdateReservationStatus}
          onUpdateStaffPermissions={handleUpdateStaffPermissions}
          onUpdateBankInfo={(bankInfo) => {
            setHotels((prev) =>
              prev.map((h) => (h.id === selectedHotel.id ? { ...h, ...bankInfo } : h))
            );
            setSelectedHotel((prev) => ({ ...prev, ...bankInfo }));
          }}
          onUpgradeSubscription={(planId, billingCycle, proof) => {
            alert(`Payment proof uploaded for ${planId} (${billingCycle}). Pending verification by IGHO Super Admin.`);
          }}
          onAddCustomRole={(newRole) => {
            setCustomRoles((prev) => [...prev, newRole]);
          }}
          onUpdateReportStatus={(reportId, status, notes) => {
            setGuestReports((prev) =>
              prev.map((r) => (r.id === reportId ? { ...r, status, resolutionNotes: notes } : r))
            );
          }}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 12: DEMO REQUEST */}
      {activeScreen === 'demo_request' && (
        <DemoRequestModal
          onClose={() => navigateTo('landing')}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 13: CLASSROOM WAITLIST */}
      {activeScreen === 'classroom_waitlist' && (
        <WaitlistView type="classroom" onNavigate={navigateTo} />
      )}

      {/* SCREEN 14: MEDBAY WAITLIST */}
      {activeScreen === 'medbay_waitlist' && (
        <WaitlistView type="medbay" onNavigate={navigateTo} />
      )}

      {/* SCREEN 15: SUPER ADMIN PLATFORM GOVERNANCE CONSOLE */}
      {activeScreen === 'super_admin_console' && (
        <SuperAdminConsole
          currentUserEmail={currentUserEmail}
          hotels={hotels}
          rooms={rooms}
          reservations={reservations}
          staff={staff}
          plans={plans}
          settings={platformSettings}
          onUpdatePlans={(updatedPlans) => setPlans(updatedPlans)}
          onUpdateSettings={(updatedSettings) => setPlatformSettings(updatedSettings)}
          onNavigate={navigateTo}
          onUpdateHotels={(updatedHotels) => setHotels(updatedHotels)}
          onSelectHotel={(h) => {
            setSelectedHotel(h);
            navigateTo('staff_portal');
          }}
        />
      )}

      {/* SCREEN 16: STAFF INVITATION ACCEPTANCE & ONBOARDING */}
      {activeScreen === 'staff_invitation_accept' && (
        <StaffInvitationAccept
          invitation={INITIAL_INVITATIONS[0]}
          onAccept={(_token, _password, name) => {
            alert(`Welcome to IGHO, ${name}! Your staff account is activated.`);
            navigateTo('staff_portal');
          }}
          onNavigate={navigateTo}
        />
      )}
    </div>
  );
}
