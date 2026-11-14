import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2, X, AlertCircle } from 'lucide-react';
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
  DemoRequest,
} from './types';
import {
  INITIAL_HOTELS,
  INITIAL_ROOMS,
  INITIAL_RESERVATIONS,
  INITIAL_STAFF,
  INITIAL_HOUSEKEEPING,
} from './data/mockData';
import { INITIAL_PLANS, INITIAL_PLATFORM_SETTINGS } from './data/platformData';
import { resolveUserAccount, getSavedCustomerProfile, saveCustomerProfile } from './utils/auth';
import { broadcastLiveRoomAction, subscribeToLiveEvents } from './utils/realtime';
import { authService, HardenedResolvedAuthAccount } from './lib/authService';
import { ResolvedAuthAccount } from './types';


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
import { HotelSubscriptionPlanScreen } from './components/HotelSubscriptionPlanScreen';
import { PENDING_PAYSTACK_STORAGE_KEY } from './components/PaystackSubscriptionModal';
import { getAuthHeaders } from './utils/storageUpload';
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
    return loadFromStorage('igho_currentStaffEmail', '');
  });

  // Sole authority for Platform Super Admin status: verified against public.platform_roles
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isVerifyingSuperAdmin, setIsVerifyingSuperAdmin] = useState<boolean>(true);

  // Password Recovery Modal State (triggered by Supabase password reset link)
  const [showPasswordRecoveryModal, setShowPasswordRecoveryModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('type=recovery');
    }
    return false;
  });
  const [recoveryNewPassword, setRecoveryNewPassword] = useState<string>('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState<string>('');
  const [recoveryShowPassword, setRecoveryShowPassword] = useState<boolean>(false);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<boolean>(false);

  useEffect(() => {
    saveToStorage('igho_currentUserEmail', currentUserEmail);
    try {
      if (currentUserEmail) {
        localStorage.setItem('igho_active_user_email', currentUserEmail.trim().toLowerCase());
      } else {
        localStorage.removeItem('igho_active_user_email');
      }
    } catch {}
    if (currentUserEmail) {
      const p = getSavedCustomerProfile(currentUserEmail);
      if (p) setCurrentGuestProfile(p);

      // Hydrate user profile (including avatarUrl, fullName, phone, address) from authoritative backend
      let active = true;
      (async () => {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/users/profile?email=${encodeURIComponent(currentUserEmail)}`, { headers });
          if (!res.ok) return;
          const data = await res.json();
          if (active && data.success && data.profile) {
            const pRec = data.profile;
            const fullName = String(pRec.fullName || '').trim();
            const parts = fullName ? fullName.split(/\s+/) : [];
            const hydrated: CustomerProfile = {
              ...(p || {
                id: pRec.id || `cust-${Date.now()}`,
                email: pRec.email || currentUserEmail,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
                phone: '',
                address: '',
                createdAt: pRec.createdAt || new Date().toISOString(),
              }),
              email: pRec.email || currentUserEmail,
              firstName: pRec.firstName || parts[0] || p?.firstName || '',
              lastName: pRec.lastName || parts.slice(1).join(' ') || p?.lastName || '',
              phone: pRec.phone !== undefined ? pRec.phone : (p?.phone || ''),
              address: pRec.address !== undefined ? pRec.address : (p?.address || ''),
              avatarUrl: pRec.avatarUrl !== undefined ? pRec.avatarUrl : p?.avatarUrl,
            };
            saveCustomerProfile(hydrated);
            setCurrentGuestProfile(hydrated);
          }
        } catch {}
      })();
      return () => {
        active = false;
      };
    } else {
      setCurrentGuestProfile(null);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    saveToStorage('igho_currentStaffEmail', currentStaffEmail);
  }, [currentStaffEmail]);

  // Monotonic sequence counter to protect against stale asynchronous auth updates
  const authSeqRef = useRef<number>(0);

  // Synchronize active Supabase Auth sessions across reloads and state changes
  // Handles Supabase INITIAL_SESSION natively without competing initial getSession calls
  useEffect(() => {
    let unsub: (() => void) | undefined;

    authService.onAuthStateChange((event, session) => {
      const currentSeq = ++authSeqRef.current;

      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordRecoveryModal(true);
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        authService.setActiveUserId(null);
        if (authSeqRef.current === currentSeq) {
          setCurrentUserEmail('');
          setCurrentGuestProfile(null);
          setIsSuperAdmin(false);
          setIsVerifyingSuperAdmin(false);
          setActiveScreen((prev) => (prev === 'super_admin_console' ? 'landing' : prev));
          if (window.location.hash.toLowerCase() === '#console' || window.location.hash.toLowerCase() === '#/console') {
            window.location.hash = '';
          }
        }
      } else if (session?.user?.email) {
        const authEmail = session.user.email.toLowerCase();
        const userId = session.user.id;
        authService.setActiveUserId(userId);

        if (authSeqRef.current === currentSeq) {
          setCurrentUserEmail(authEmail);
          setIsVerifyingSuperAdmin(true);
        }

        // Authoritative verification: queries public.profiles (active account_status) and public.platform_roles (super_admin role)
        authService.resolveAuthenticatedUser(userId, authEmail).then((resolved) => {
          if (authSeqRef.current === currentSeq) {
            // Guard against stale user resolution overwriting current session
            if (resolved.userId !== userId) {
              return;
            }
            const verified = Boolean(
              resolved.isSuperAdmin &&
              resolved.accessGranted &&
              authEmail !== 'dedoro888@gmail.com'
            );
            setIsSuperAdmin(verified);
            setIsVerifyingSuperAdmin(false);

            const hash = window.location.hash.toLowerCase();
            const wantsConsole = hash === '#console' || hash === '#/console';

            if (verified) {
              window.location.hash = 'console';
              setActiveScreen((prev) => {
                // When Super Admin authenticates, immediately route to IGHO console if on landing, login or directory
                if (
                  prev === 'landing' ||
                  prev === 'guest_login' ||
                  prev === 'staff_login' ||
                  prev === 'hotel_guest_portal' ||
                  wantsConsole
                ) {
                  return 'super_admin_console';
                }
                return prev;
              });
            } else {
              // Denied: clear console hash and redirect if on console
              if (wantsConsole) {
                window.location.hash = '';
              }
              setActiveScreen((prev) => {
                if (prev === 'super_admin_console') return 'landing';
                if (prev === 'guest_login' || prev === 'staff_login') return 'landing';
                return prev;
              });
            }
          }
        }).catch(() => {
          if (authSeqRef.current === currentSeq) {
            setIsSuperAdmin(false);
            setIsVerifyingSuperAdmin(false);
            if (window.location.hash.toLowerCase() === '#console' || window.location.hash.toLowerCase() === '#/console') {
              window.location.hash = '';
            }
            setActiveScreen((prev) => (prev === 'super_admin_console' ? 'landing' : prev));
          }
        });
      }
    }).then((sub) => {
      if (sub && (sub as any).data?.subscription) {
        unsub = () => (sub as any).data.subscription.unsubscribe();
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  // Active Screen (persisted so refresh does not log the user out or return to landing)
  // Super Admin Console verifies database role during verification state
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const savedEmail = loadFromStorage('igho_currentUserEmail', '');
      if ((hash === '#console' || hash === '#/console') && savedEmail) {
        return 'super_admin_console';
      }
      try {
        const savedScreen = localStorage.getItem('igho_active_screen');
        if (savedScreen && (savedScreen !== 'super_admin_console' || savedEmail)) {
          return savedScreen as ActiveScreen;
        }
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

  const [activeInviteToken, setActiveInviteToken] = useState<string | null>(null);

  // Handle URL hash changes for direct routing (/console or #console, #invite=)
  useEffect(() => {
    const handleHashRouting = () => {
      const rawHash = window.location.hash;
      const hash = rawHash.toLowerCase();

      // Check for staff invitation link format: /#invite=TOKEN or #invite=TOKEN
      if (rawHash.includes('invite=')) {
        const token = rawHash.split('invite=')[1]?.split('&')[0];
        if (token) {
          setActiveInviteToken(token);
          setActiveScreen('staff_invitation_accept');
          return;
        }
      }

      if (hash === '#console' || hash === '#/console' || window.location.pathname === '/console') {
        if (isVerifyingSuperAdmin) {
          // While verifying against Supabase database, mount console so database verification gate runs
          if (activeScreen !== 'super_admin_console') {
            setActiveScreen('super_admin_console');
          }
          return;
        }
        if (currentUserEmail && isSuperAdmin) {
          setActiveScreen('super_admin_console');
        } else {
          // Strictly fail closed: block logged out or non-super-admins from /console
          window.location.hash = '';
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          if (activeScreen === 'super_admin_console') {
            setActiveScreen('landing');
          }
        }
      }
    };
    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
    return () => window.removeEventListener('hashchange', handleHashRouting);
  }, [isSuperAdmin, isVerifyingSuperAdmin, activeScreen, currentUserEmail]);

  const navigateTo = (screen: ActiveScreen, authEmail?: string) => {
    const emailToCheck = (authEmail || currentUserEmail || '').trim().toLowerCase();

    if (screen === 'super_admin_console') {
      if (isVerifyingSuperAdmin) {
        // Authoritative verification is in progress: transition to console and let the database verification gate resolve
        window.location.hash = 'console';
        setActiveScreen('super_admin_console');
        return;
      }
      if (!currentUserEmail || !isSuperAdmin) {
        // Strictly fail closed: redirected to login if not authenticated as super admin
        window.location.hash = '';
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        setActiveScreen('guest_login');
        return;
      }
      window.location.hash = 'console';
    } else if (screen === 'staff_portal') {
      if (isSuperAdmin) {
        triggerLiveToast(
          'Access Restricted: Platform console cannot open private hotel operational portals.',
          'delete'
        );
        return;
      }
      const userHotel = hotels.find((h) => h.email?.toLowerCase() === emailToCheck);
      if (userHotel) {
        if (userHotel.approvalStatus !== 'approved') {
          triggerLiveToast(
            `Hotel "${userHotel.name}" registration is currently ${userHotel.approvalStatus}.`,
            'delete'
          );
          return;
        }
        if (userHotel.paymentStatus !== 'paid') {
          triggerLiveToast(
            `Subscription for "${userHotel.name}" is pending payment. Select a plan to continue.`,
            'update'
          );
          setActiveScreen('hotel_subscription_plan');
          return;
        }
      }
    } else if (screen === 'hotel_guest_portal') {
      if (
        selectedHotel &&
        (selectedHotel.hasGuestPortal === false ||
          selectedHotel.subscriptionPlanId === 'plan-starter-30k' ||
          selectedHotel.subscriptionPlanId === 'plan-1' ||
          selectedHotel.packageType === 'management')
      ) {
        triggerLiveToast(
          `Guest Portal Unavailable: ${selectedHotel.name} is on Standard Operations (PMS only). Upgrade to Complete Cloud to enable the Guest Portal.`,
          'delete'
        );
        return;
      }
    } else if (window.location.hash === '#console' || window.location.hash === '#/console') {
      history.replaceState(null, '', window.location.pathname);
    }
    setActiveScreen(screen);
  };

  const handleGuestSignOut = () => {
    // Invalidate any in-flight asynchronous auth callbacks immediately
    authSeqRef.current++;

    // Clear Supabase session and reset active user in authService
    authService.setActiveUserId(null);
    authService.signOut().catch((err) => {
      console.warn('[App] Supabase signOut notice:', err);
    });

    setCurrentUserEmail('');
    setCurrentGuestProfile(null);
    setCurrentStaffEmail('');
    setIsSuperAdmin(false);
    setIsVerifyingSuperAdmin(false);
    try {
      window.location.hash = '';
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      localStorage.removeItem('igho_currentUserEmail');
      localStorage.removeItem('igho_currentStaffEmail');
      localStorage.removeItem('igho_auth_user');
      localStorage.setItem('igho_active_screen', 'landing');
    } catch {}
    setActiveScreen('landing');
  };

  const handleEditProfile = () => {
    setGuestDashboardTab('profile');
    navigateTo('guest_dashboard');
  };

  const handleLoginSuccess = (
    email: string,
    profile?: CustomerProfile,
    resolvedAuth?: HardenedResolvedAuthAccount | ResolvedAuthAccount
  ) => {
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

    // Direct database-verified resolution from Supabase:
    const isSuperAdminAccount = Boolean(
      resolvedAuth?.isSuperAdmin &&
      cleanEmail !== 'dedoro888@gmail.com'
    );
    if (isSuperAdminAccount) {
      setIsSuperAdmin(true);
      setIsVerifyingSuperAdmin(false);
      window.location.hash = 'console';
      setActiveScreen('super_admin_console');
      return;
    } else {
      setIsSuperAdmin(false);
      setIsVerifyingSuperAdmin(false);
      if (window.location.hash.toLowerCase() === '#console' || window.location.hash.toLowerCase() === '#/console') {
        window.location.hash = '';
      }
    }

    const account = resolveUserAccount(cleanEmail, profile);
    const resolvedStaffRoles = ['owner', 'manager', 'receptionist', 'finance', 'housekeeping'];
    const isResolvedStaff = Boolean(
      resolvedAuth &&
      (resolvedAuth.targetScreen === 'staff_portal' || resolvedStaffRoles.includes(resolvedAuth.effectiveRole))
    );
    if (
      isResolvedStaff ||
      account.targetScreen === 'staff_portal' ||
      account.role === 'hotel_owner' ||
      account.role === 'hotel_manager' ||
      account.role === 'receptionist'
    ) {
      // Hotel owner or staff logging into their hotel dashboard!
      const targetOrgId = resolvedAuth?.organization?.id || resolvedAuth?.membership?.organization_id || account.organizationId;
      const matchingHotel = hotels.find(
        (h) =>
          (targetOrgId && h.id === targetOrgId) ||
          h.email?.toLowerCase() === cleanEmail ||
          h.ownerEmail?.toLowerCase() === cleanEmail
      );
      if (matchingHotel) {
        setSelectedHotel(matchingHotel);
      }
      setCurrentStaffEmail(cleanEmail);
      navigateTo('staff_portal', cleanEmail);
    } else {
      // Default to landing page
      navigateTo('landing', cleanEmail);
    }
  };

  // Application Data States (Persisted across refreshes in localStorage)
  const [hotels, setHotels] = useState<Hotel[]>(() => {
    const saved = loadFromStorage<Hotel[]>('igho_db_hotels', INITIAL_HOTELS);
    // Filter out legacy mock hotels from earlier prototypes
    const legacyMockIds = [
      'hotel-radisson',
      'hotel-eko',
      'hotel-george',
      'hotel-transcorp',
      'hotel-ibom',
      'hotel-golden',
      'hotel-dedge',
      'hotel-cubana',
    ];
    let cleaned = (saved || []).filter((h) => !legacyMockIds.includes(h.id));
    
    // Ensure Lava Hotel & Suites is registered, approved, and live with 6 rooms as requested
    const hasLava = cleaned.some(
      (h) => h.id === 'hotel-lava' || h.name.toLowerCase().includes('lava')
    );
    if (!hasLava && INITIAL_HOTELS[0]) {
      cleaned = [INITIAL_HOTELS[0], ...cleaned];
    } else {
      // Ensure Lava Hotel & Suites has proper live and approved status, 6 rooms, and canonical name
      cleaned = cleaned.map((h) => {
        if (h.id === 'hotel-cold-lava' || h.id === 'hotel-lava' || h.name.toLowerCase().includes('lava')) {
          return {
            ...h,
            id: 'hotel-lava',
            name: 'Lava Hotel & Suites',
            roomCount: 6,
            isLive: true,
            approvalStatus: 'approved',
            paymentStatus: 'paid',
            subscriptionStatus: 'active',
          };
        }
        return h;
      });
    }
    return cleaned;
  });
  useEffect(() => {
    saveToStorage('igho_db_hotels', hotels);
  }, [hotels]);

  const [selectedHotel, setSelectedHotel] = useState<Hotel>(() => {
    const legacyMockIds = [
      'hotel-radisson',
      'hotel-eko',
      'hotel-george',
      'hotel-transcorp',
      'hotel-ibom',
      'hotel-golden',
      'hotel-dedge',
      'hotel-cubana',
    ];
    try {
      const savedHotelId = localStorage.getItem('igho_db_selected_hotel_id');
      if (savedHotelId && !legacyMockIds.includes(savedHotelId)) {
        const found = hotels.find((h) => h.id === savedHotelId);
        if (found) return found;
      }
    } catch {}
    const lava = hotels.find((h) => h.id === 'hotel-lava' || h.name.toLowerCase().includes('lava'));
    return lava || hotels[0] || INITIAL_HOTELS[0] || DEFAULT_FALLBACK_HOTEL;
  });
  useEffect(() => {
    try {
      if (selectedHotel?.id) {
        localStorage.setItem('igho_db_selected_hotel_id', selectedHotel.id);
      }
    } catch {}
  }, [selectedHotel]);

  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const stored = localStorage.getItem('igho_db_rooms');
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {}
    return INITIAL_ROOMS;
  });
  useEffect(() => {
    saveToStorage('igho_db_rooms', rooms);
  }, [rooms]);

  const [selectedRoom, setSelectedRoom] = useState<Room>(() => {
    const currentRooms = loadFromStorage<Room[]>('igho_db_rooms', INITIAL_ROOMS);
    return currentRooms[0] || DEFAULT_FALLBACK_ROOM;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const stored = localStorage.getItem('igho_db_reservations');
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {}
    return INITIAL_RESERVATIONS;
  });
  useEffect(() => {
    saveToStorage('igho_db_reservations', reservations);
  }, [reservations]);

  const [staff, setStaff] = useState<StaffAccount[]>(() => {
    const saved = loadFromStorage<StaffAccount[]>('igho_db_staff', INITIAL_STAFF);
    const nonLavaStaff = (saved || []).filter(
      (s) => s.hotelId && s.hotelId !== 'hotel-cold-lava' && s.hotelId !== 'hotel-lava'
    );
    return [...INITIAL_STAFF, ...nonLavaStaff];
  });
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

  // Demo requests state (synced with backend and localStorage)
  const [demoRequests, setDemoRequests] = useState<any[]>(() =>
    loadFromStorage<any[]>('igho_demo_requests', [])
  );
  useEffect(() => {
    saveToStorage('igho_demo_requests', demoRequests);
  }, [demoRequests]);

  // Real-Time Full-Stack Backend Database Synchronization Hooks
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfileUpdateTrigger((prev) => prev + 1);
    };
    window.addEventListener('igho_profiles_updated', handleProfileUpdate);
    return () => window.removeEventListener('igho_profiles_updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const handleDemoRequestsUpdate = () => {
      setDemoRequests(loadFromStorage<any[]>('igho_demo_requests', []));
    };
    window.addEventListener('igho_demo_requests_updated', handleDemoRequestsUpdate);
    return () => window.removeEventListener('igho_demo_requests_updated', handleDemoRequestsUpdate);
  }, []);

  useEffect(() => {
    const handleHotelsUpdate = () => {
      const stored = loadFromStorage<Hotel[]>('igho_db_hotels', []);
      const sanitized = (stored || []).filter((h: any) => h.id !== 'hotel-transcorp' && h.id !== 'hotel-eko');
      setHotels(sanitized);
    };
    window.addEventListener('igho_hotels_updated', handleHotelsUpdate);
    return () => window.removeEventListener('igho_hotels_updated', handleHotelsUpdate);
  }, []);

  // Immediate Security Lockout Listener (When an account is banned from IGO Console)
  useEffect(() => {
    const handleUserBanned = (e: any) => {
      const bannedEmail = e.detail?.email?.toLowerCase();
      const status = e.detail?.status;
      if (
        bannedEmail &&
        currentUserEmail.toLowerCase() === bannedEmail &&
        (status === 'suspended' || status === 'deactivated')
      ) {
        handleGuestSignOut();
        triggerLiveToast(
          'Your account has been suspended by platform administration. Please contact support@igho.com.ng.',
          'delete'
        );
      }
    };
    window.addEventListener('igho_user_banned', handleUserBanned);
    return () => window.removeEventListener('igho_user_banned', handleUserBanned);
  }, [currentUserEmail]);

  // Prevent race conditions and infinite write-back loops on load / sync
  const [initialStateLoaded, setInitialStateLoaded] = React.useState(false);
  const isSyncingFromServer = React.useRef(false);
  const lastFetchedStateJson = React.useRef<string>('');

  // 1. Polling interval to retrieve database state from backend (Real-Time Sync)
  useEffect(() => {
    let active = true;

    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.state && active) {
          const s = data.state;
          
          // Compute stringified version of server state to prevent redundant postbacks
          const serverStateStr = JSON.stringify({
            hotels: s.hotels || [],
            rooms: s.rooms || [],
            reservations: s.reservations || [],
            staff: s.staff || [],
            housekeeping: s.housekeeping || [],
            invitations: s.invitations || [],
            guestReports: s.guestReports || [],
            plans: s.plans || [],
            platformSettings: s.platformSettings || null,
            customRoles: s.customRoles || [],
            demoRequests: s.demoRequests || [],
          });

          lastFetchedStateJson.current = serverStateStr;
          
          // Mark that we are applying server state so write-back does not trigger a POST
          isSyncingFromServer.current = true;

          // Only update states if they exist in response to avoid overriding with empty
          if (Array.isArray(s.hotels)) {
            setHotels((prev) => {
              // Retain any pending or freshly registered local hotels not yet committed to backend
              const localUnsynced = (prev || []).filter(
                (lh) => lh.id !== 'hotel-transcorp' && lh.id !== 'hotel-eko' && !s.hotels.some((sh: any) => sh.id === lh.id)
              );
              const merged = [...localUnsynced, ...s.hotels].filter((h: any) => h.id !== 'hotel-transcorp' && h.id !== 'hotel-eko');
              saveToStorage('igho_db_hotels', merged);
              return merged;
            });
          }
          if (Array.isArray(s.rooms)) setRooms(s.rooms);
          if (Array.isArray(s.reservations)) setReservations(s.reservations);
          if (Array.isArray(s.staff)) setStaff(s.staff);
          if (Array.isArray(s.housekeeping)) setHousekeeping(s.housekeeping);
          if (Array.isArray(s.invitations)) setInvitations(s.invitations);
          if (Array.isArray(s.guestReports)) setGuestReports(s.guestReports);
          if (Array.isArray(s.plans)) setPlans(s.plans);
          if (s.platformSettings) setPlatformSettings(s.platformSettings);
          if (Array.isArray(s.customRoles)) setCustomRoles(s.customRoles);
          
          if (Array.isArray(s.demoRequests)) {
            setDemoRequests((prev) => {
              const localUnsynced = (prev || []).filter(
                (ld: any) => !s.demoRequests.some((sd: any) => sd.id === ld.id)
              );
              const merged = [...localUnsynced, ...s.demoRequests];
              saveToStorage('igho_demo_requests', merged);
              return merged;
            });
          }

          if (Array.isArray(s.customerProfiles)) {
            localStorage.setItem('igho_db_customer_profiles', JSON.stringify(s.customerProfiles));
          }

          setInitialStateLoaded(true);
          
          // Release the sync lock after a brief layout settle
          setTimeout(() => {
            if (active) isSyncingFromServer.current = false;
          }, 100);
        }
      } catch (err) {
        console.warn('Backend real-time sync poll error:', err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 15000); // Lightweight fallback sync (SSE handles live updates immediately)

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Automatically post state changes to the backend server (Real-Time Sync Write-Back)
  useEffect(() => {
    let active = true;
    
    // Strictly guard to prevent writing empty / old state before first load is complete
    if (!initialStateLoaded) return;
    
    // Skip posting back if the trigger was an incoming sync event
    if (isSyncingFromServer.current) {
      isSyncingFromServer.current = false;
      return;
    }

    const currentProfiles = JSON.parse(localStorage.getItem('igho_db_customer_profiles') || '[]');
    
    const currentPayload = {
      hotels,
      rooms,
      reservations,
      staff,
      housekeeping,
      invitations,
      guestReports,
      plans,
      platformSettings,
      customRoles,
      customerProfiles: currentProfiles,
      demoRequests,
    };

    const currentLocalStateStr = JSON.stringify({
      hotels: hotels || [],
      rooms: rooms || [],
      reservations: reservations || [],
      staff: staff || [],
      housekeeping: housekeeping || [],
      invitations: invitations || [],
      guestReports: guestReports || [],
      plans: plans || [],
      platformSettings: platformSettings || null,
      customRoles: customRoles || [],
      demoRequests: demoRequests || [],
    });

    // Skip posting back if local state exactly matches the last fetched server state
    if (currentLocalStateStr === lastFetchedStateJson.current) {
      return;
    }

    const saveState = async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPayload),
        });
        if (!res.ok) throw new Error('Network response not ok');
        
        // Track the successfully persisted state as our base
        lastFetchedStateJson.current = currentLocalStateStr;
      } catch (err) {
        console.warn('Backend state persist write-back error:', err);
      }
    };

    const timer = setTimeout(() => {
      if (active) saveState();
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    hotels,
    rooms,
    reservations,
    staff,
    housekeeping,
    invitations,
    guestReports,
    plans,
    platformSettings,
    customRoles,
    demoRequests,
    profileUpdateTrigger,
    initialStateLoaded,
  ]);

  // Booking draft state for checkout
  const [bookingDraft, setBookingDraft] = useState({
    room: rooms[0] || DEFAULT_FALLBACK_ROOM,
    checkIn: '2026-09-08',
    checkOut: '2026-09-09',
    nights: 1,
    guests: 1,
    total: 35000,
  });

  // Handler for adding or activating a hotel from onboarding wizard
  const handleHotelCreated = (newHotelData: any) => {
    const targetId = newHotelData.id || `hotel-${Date.now()}`;
    const existing = hotels.find((h) => h.id === targetId);
    const createdHotel: Hotel = {
      ...(existing || {}),
      id: targetId,
      name: newHotelData.hotelName || existing?.name || 'Partner Hotel',
      location: `${newHotelData.city || existing?.city || 'Lagos'}, ${newHotelData.state || existing?.state || 'Lagos'}`,
      city: newHotelData.city || existing?.city || 'Lagos',
      state: newHotelData.state || existing?.state || 'Lagos',
      country: newHotelData.country || existing?.country || 'Nigeria',
      rating: existing?.rating ?? 0,
      reviewCount: existing?.reviewCount ?? 0,
      isLive: true,
      roomCount: parseInt(newHotelData.roomCount, 10) || existing?.roomCount || 20,
      startingPrice: existing?.startingPrice || 35000,
      coverImage:
        newHotelData.coverImage ||
        existing?.coverImage ||
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      logoImage: newHotelData.logoImage || existing?.logoImage || '',
      address: newHotelData.address || existing?.address || '',
      email: newHotelData.email || newHotelData.hotelEmail || existing?.email || '',
      phone: newHotelData.phone || newHotelData.hotelPhone || existing?.phone || '',
      ownerName: newHotelData.fullName || existing?.ownerName,
      ownerEmail: newHotelData.email || existing?.ownerEmail,
      registeredBusiness: !!newHotelData.isRegisteredBusiness || !!newHotelData.registeredBusiness,
      cacNumber: newHotelData.cacNumber || existing?.cacNumber,
      bankName: newHotelData.bankName || existing?.bankName || '',
      accountName: newHotelData.accountName || existing?.accountName || '',
      accountNumber: newHotelData.accountNumber || existing?.accountNumber || '',
      coordinates: existing?.coordinates || { lat: 6.1982, lng: 6.7335 },
      approvalStatus: 'approved',
      paymentStatus:
        newHotelData.subscriptionStatus === 'active' || newHotelData.subscriptionStatus === 'trial'
          ? 'paid'
          : existing?.paymentStatus || 'pending',
      subscriptionStatus: newHotelData.subscriptionStatus || existing?.subscriptionStatus || 'pending',
      packageType: newHotelData.packageType || existing?.packageType,
      hasGuestPortal:
        newHotelData.hasGuestPortal !== undefined ? Boolean(newHotelData.hasGuestPortal) : existing?.hasGuestPortal,
      subscriptionPlanId: newHotelData.subscriptionPlanId || existing?.subscriptionPlanId,
      subscriptionPlanName: newHotelData.subscriptionPlanName || existing?.subscriptionPlanName,
      subscriptionStartDate: newHotelData.subscriptionStartDate || existing?.subscriptionStartDate,
      subscriptionEndDate: newHotelData.subscriptionEndDate || existing?.subscriptionEndDate,
      status: 'active',
      submittedAt: existing?.submittedAt || new Date().toISOString(),
    };

    setHotels((prev) => {
      if (prev.some((h) => h.id === targetId)) {
        return prev.map((h) => (h.id === targetId ? createdHotel : h));
      }
      return [createdHotel, ...prev];
    });
    setSelectedHotel(createdHotel);
    setActiveScreen('staff_portal');
  };

  // Real-Time Live Sync Notification Toast State
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'add' | 'update' | 'delete' } | null>(null);

  const triggerLiveToast = (message: string, type: 'add' | 'update' | 'delete' = 'update') => {
    setLiveToast({ message, type });
    setTimeout(() => {
      setLiveToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Verify Paystack Hosted Checkout redirect callbacks server-side before activating entitlements
  const verifiedCallbackRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const isPaystackCallback =
      params.get('paystack_callback') === '1' || params.has('trxref') || params.has('reference');
    const reference = (params.get('reference') || params.get('trxref') || '').trim();
    if (!isPaystackCallback || !reference || verifiedCallbackRef.current === reference) {
      return;
    }

    let cancelled = false;
    const verifyReturn = async () => {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      // Wait for Supabase session hydration on fresh page load after Paystack redirect
      if (!headers['Authorization']) return;

      verifiedCallbackRef.current = reference;
      try {
        const res = await fetch('/api/subscriptions/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({ reference }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        // Clear URL callback parameters cleanly so reloads do not re-trigger verification
        try {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash || ''}`);
          sessionStorage.removeItem(PENDING_PAYSTACK_STORAGE_KEY);
        } catch {}

        if (res.ok && data.success && data.hotel) {
          setHotels((prev) => {
            const exists = prev.some((h) => h.id === data.hotel.id);
            return exists ? prev.map((h) => (h.id === data.hotel.id ? data.hotel : h)) : [data.hotel, ...prev];
          });
          setSelectedHotel(data.hotel);
          setActiveScreen('staff_portal');
          triggerLiveToast(
            `${data.hotel.name} activated on ${data.planName || 'IGHO Stay'} (Paystack Test Verified).`,
            'add'
          );
        } else {
          triggerLiveToast(
            data.message || 'Paystack payment was not completed. Subscription remains inactive.',
            'delete'
          );
        }
      } catch {
        if (!cancelled) {
          triggerLiveToast('Unable to verify Paystack transaction status with server.', 'delete');
        }
      }
    };

    verifyReturn();
    return () => {
      cancelled = true;
    };
  }, [currentUserEmail, initialStateLoaded]);

  // Instant Real-Time Synchronization Listener (SSE + BroadcastChannel across tabs/devices)
  useEffect(() => {
    const unsubscribe = subscribeToLiveEvents((event) => {
      const { action, room, roomId } = event;

      if (action === 'add' && room) {
        setRooms((prev) => {
          if (prev.some((r) => r.id === room.id)) return prev;
          return [room, ...prev];
        });
        setHotels((prev) =>
          prev.map((h) => {
            if (h.id === room.hotelId) {
              const newMinPrice = h.startingPrice ? Math.min(h.startingPrice, room.pricePerNight) : room.pricePerNight;
              return {
                ...h,
                roomCount: (h.roomCount || 0) + 1,
                startingPrice: newMinPrice,
              };
            }
            return h;
          })
        );
        // Data sync happens silently in background without spamming console notifications
      } else if (action === 'update' && room) {
        setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
        setSelectedRoom((prev) => (prev.id === room.id ? room : prev));
        setBookingDraft((prev) =>
          prev.room?.id === room.id
            ? { ...prev, room, total: room.pricePerNight * prev.nights }
            : prev
        );
      } else if (action === 'delete' && roomId) {
        setRooms((prev) => {
          const remaining = prev.filter((r) => r.id !== roomId);

          // If guest was looking at this exact room in RoomDetailView, safely navigate them back to portal
          if (selectedRoom.id === roomId) {
            if (remaining.length > 0) {
              setSelectedRoom(remaining[0]);
            }
            if (activeScreen === 'room_detail') {
              setActiveScreen('hotel_guest_portal');
            }
          }

          if (bookingDraft.room?.id === roomId && remaining.length > 0) {
            setBookingDraft((b) => ({
              ...b,
              room: remaining[0],
              total: remaining[0].pricePerNight * b.nights,
            }));
          }

          return remaining;
        });

        setHotels((prev) =>
          prev.map((h) => ({
            ...h,
            roomCount: Math.max(0, (h.roomCount || 1) - 1),
          }))
        );
      }
    });

    // Official Console Notifications strictly for: Waitlists, Demos, and Support Inquiries
    const handleWaitlistEvent = (e: any) => {
      const product = e.detail?.product === 'classroom' ? 'Classroom' : e.detail?.product === 'medbay' ? 'Medbay' : 'Product';
      triggerLiveToast(`📋 New Waitlist: ${e.detail?.name || 'A user'} joined the ${product} waitlist`, 'add');
    };

    const handleDemoEvent = (e: any) => {
      triggerLiveToast(`📅 Demo Request: New demo inquiry from ${e.detail?.orgName || e.detail?.fullName || 'Organization'}`, 'add');
    };

    const handleSupportEvent = (e: any) => {
      triggerLiveToast(`💬 Customer Support: New inquiry from ${e.detail?.guestName || 'Guest'} (${e.detail?.subject || 'Feedback'})`, 'update');
    };

    window.addEventListener('igho_waitlist_joined', handleWaitlistEvent);
    window.addEventListener('igho_demo_requested', handleDemoEvent);
    window.addEventListener('igho_feedback_submitted', handleSupportEvent);

    // Subscribe to server SSE stream for subscription upgrades, org renames, bans, waitlists, and demos
    let sseSource: EventSource | null = null;
    if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      try {
        sseSource = new EventSource('/api/events');
        sseSource.addEventListener('hotel_subscription_updated', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            if (!payload.hotelId) return;
            const applySubscriptionUpdate = (h: Hotel): Hotel =>
              h.id === payload.hotelId
                ? {
                    ...h,
                    subscriptionPlanId: payload.planId || h.subscriptionPlanId,
                    subscriptionPlanName: payload.planName || h.subscriptionPlanName,
                    packageType: payload.packageType || h.packageType,
                    hasGuestPortal:
                      payload.hasGuestPortal !== undefined ? payload.hasGuestPortal : h.hasGuestPortal,
                    privileges: payload.privileges || h.privileges,
                    billingCycle: payload.billingCycle || h.billingCycle,
                    subscriptionStatus: payload.subscriptionStatus || 'active',
                    subscriptionStartDate: payload.subscriptionStartDate || h.subscriptionStartDate,
                    subscriptionEndDate: payload.subscriptionEndDate || h.subscriptionEndDate,
                    trialStartDate: payload.trialStartDate || h.trialStartDate,
                    trialEndDate: payload.trialEndDate || h.trialEndDate,
                    paymentStatus: 'paid',
                    isLive: true,
                  }
                : h;
            isSyncingFromServer.current = true;
            setHotels((prev) => prev.map(applySubscriptionUpdate));
            setSelectedHotel((prev) => applySubscriptionUpdate(prev));
          } catch {}
        });
        sseSource.addEventListener('hotel_plan_migrated', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            if (!payload.hotelId) return;
            const applyPlanMigration = (h: Hotel): Hotel =>
              h.id === payload.hotelId
                ? {
                    ...h,
                    subscriptionPlanId: payload.newPlanId || h.subscriptionPlanId,
                    subscriptionPlanName: payload.newPlanName || h.subscriptionPlanName,
                    hasGuestPortal:
                      payload.privileges?.hasGuestPortal !== undefined
                        ? payload.privileges.hasGuestPortal
                        : h.hasGuestPortal,
                    privileges: payload.privileges || h.privileges,
                  }
                : h;
            isSyncingFromServer.current = true;
            setHotels((prev) => prev.map(applyPlanMigration));
            setSelectedHotel((prev) => applyPlanMigration(prev));
          } catch {}
        });
        sseSource.addEventListener('hotel_profile_updated', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            const updatedHotel = payload?.hotel;
            if (!updatedHotel?.id) return;
            isSyncingFromServer.current = true;
            setHotels((prev) => prev.map((h) => (h.id === updatedHotel.id ? { ...h, ...updatedHotel } : h)));
            setSelectedHotel((prev) => (prev.id === updatedHotel.id ? { ...prev, ...updatedHotel } : prev));
          } catch {}
        });
        sseSource.addEventListener('user_profile_updated', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            const pRec = payload?.profile;
            if (!pRec?.email) return;
            if (currentUserEmail && pRec.email.toLowerCase() === currentUserEmail.trim().toLowerCase()) {
              const fullName = String(pRec.fullName || '').trim();
              const parts = fullName ? fullName.split(/\s+/) : [];
              setCurrentGuestProfile((prev) => {
                const merged: CustomerProfile = {
                  ...(prev || {
                    id: pRec.id || `cust-${Date.now()}`,
                    email: pRec.email,
                    firstName: parts[0] || '',
                    lastName: parts.slice(1).join(' ') || '',
                    phone: '',
                    address: '',
                    createdAt: pRec.createdAt || new Date().toISOString(),
                  }),
                  firstName: pRec.firstName || parts[0] || prev?.firstName || '',
                  lastName: pRec.lastName || parts.slice(1).join(' ') || prev?.lastName || '',
                  phone: pRec.phone !== undefined ? pRec.phone : (prev?.phone || ''),
                  address: pRec.address !== undefined ? pRec.address : (prev?.address || ''),
                  avatarUrl: pRec.avatarUrl !== undefined ? pRec.avatarUrl : prev?.avatarUrl,
                };
                saveCustomerProfile(merged);
                return merged;
              });
            }
          } catch {}
        });
        sseSource.addEventListener('organization_name_updated', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            if (payload.id && payload.name) {
              setHotels((prev) => prev.map((h) => (h.id === payload.id ? { ...h, name: payload.name } : h)));
              setSelectedHotel((prev) => (prev.id === payload.id ? { ...prev, name: payload.name } : prev));
            }
          } catch {}
        });
        sseSource.addEventListener('user_status_changed', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            if (Array.isArray(payload.bannedEmails)) {
              localStorage.setItem('igho_banned_users', JSON.stringify(payload.bannedEmails));
            }
            window.dispatchEvent(new CustomEvent('igho_user_banned', { detail: payload }));
          } catch {}
        });
        sseSource.addEventListener('waitlist_created', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            if (isSuperAdmin) {
              triggerLiveToast(
                `New Waitlist: ${payload.fullName || 'Applicant'} (${payload.product || 'Waitlist'})`,
                'add'
              );
            }
          } catch {}
        });
        sseSource.addEventListener('demo_request_created', (ev: any) => {
          try {
            const payload = JSON.parse(ev.data || '{}');
            if (isSuperAdmin) {
              triggerLiveToast(
                `New Demo Request: ${payload.orgName || payload.fullName || 'Enterprise'}`,
                'add'
              );
            }
          } catch {}
        });
      } catch {}
    }

    return () => {
      unsubscribe();
      sseSource?.close();
      window.removeEventListener('igho_waitlist_joined', handleWaitlistEvent);
      window.removeEventListener('igho_demo_requested', handleDemoEvent);
      window.removeEventListener('igho_feedback_submitted', handleSupportEvent);
    };
  }, [selectedRoom.id, activeScreen, bookingDraft.room?.id, isSuperAdmin]);

  const handleAddRoom = (newRoom: Room) => {
    setRooms((prev) => {
      if (prev.some((r) => r.id === newRoom.id)) return prev;
      return [newRoom, ...prev];
    });

    setHotels((prev) =>
      prev.map((h) => {
        if (h.id === newRoom.hotelId) {
          const newMinPrice = h.startingPrice ? Math.min(h.startingPrice, newRoom.pricePerNight) : newRoom.pricePerNight;
          return {
            ...h,
            roomCount: (h.roomCount || 0) + 1,
            startingPrice: newMinPrice,
          };
        }
        return h;
      })
    );

    // Broadcast in real-time across tabs and SSE silently in background
    broadcastLiveRoomAction('add', newRoom);
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));

    if (selectedRoom.id === updatedRoom.id) {
      setSelectedRoom(updatedRoom);
    }

    if (bookingDraft.room?.id === updatedRoom.id) {
      setBookingDraft((prev) => ({
        ...prev,
        room: updatedRoom,
        total: updatedRoom.pricePerNight * prev.nights,
      }));
    }

    // Broadcast in real-time across tabs and SSE silently in background
    broadcastLiveRoomAction('update', updatedRoom);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms((prev) => {
      const remaining = prev.filter((r) => r.id !== roomId);

      if (selectedRoom.id === roomId && remaining.length > 0) {
        setSelectedRoom(remaining[0]);
      }

      if (bookingDraft.room?.id === roomId && remaining.length > 0) {
        setBookingDraft((b) => ({
          ...b,
          room: remaining[0],
          total: remaining[0].pricePerNight * b.nights,
        }));
      }

      return remaining;
    });

    setHotels((prev) =>
      prev.map((h) => ({
        ...h,
        roomCount: Math.max(0, (h.roomCount || 1) - 1),
      }))
    );

    // Broadcast in real-time across tabs and SSE silently in background
    broadcastLiveRoomAction('delete', null, roomId, selectedHotel.id);
  };

  const handleAddReservation = (newRes: Reservation) => {
    setReservations((prev) => [newRes, ...prev]);
  };

  const handleUpdateReservation = (updatedRes: Reservation) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === updatedRes.id ? updatedRes : r))
    );
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

  // Resolve current active hotel for PMS & subscription views:
  // Prefer the logged in user's hotel if they are an owner/staff, otherwise selectedHotel
  const userStaffMatch = currentUserEmail
    ? staff.find((s) => s.email?.toLowerCase() === currentUserEmail.trim().toLowerCase())
    : null;
  const userAccountMatch = currentUserEmail ? resolveUserAccount(currentUserEmail) : null;
  const currentUserHotel = currentUserEmail
    ? hotels.find(
        (h) =>
          h.email?.toLowerCase() === currentUserEmail.trim().toLowerCase() ||
          h.ownerEmail?.toLowerCase() === currentUserEmail.trim().toLowerCase() ||
          (userStaffMatch && h.id === userStaffMatch.hotelId) ||
          (userAccountMatch?.organizationId && h.id === userAccountMatch.organizationId) ||
          (userAccountMatch?.targetScreen === 'staff_portal' && h.name.toLowerCase().includes('lava'))
      )
    : null;
  const activeHotelForPMS = currentUserHotel || (hotels.find((h) => h.id === selectedHotel.id) || selectedHotel);
  const activeSelectedHotel = hotels.find((h) => h.id === selectedHotel.id) || selectedHotel;

  // Check if an approved hotel has unlocked their subscription:
  // Approved hotels MUST show subscription plans first, UNLESS they paid OR activated 1-month free trial with special code
  const isHotelSubscriptionUnlocked = (hotel: Hotel | null | undefined): boolean => {
    if (!hotel || !hotel.id) return true;
    if (hotel.approvalStatus !== 'approved') return true; // Only approved hotels are gated by subscription plan selection

    // 1. Paid active subscription
    if (hotel.paymentStatus === 'paid' && hotel.subscriptionStatus === 'active') {
      return true;
    }

    // 2. 1-Month Free trial with valid special code and trialEndDate in the future
    if (hotel.subscriptionStatus === 'trial' && hotel.trialEndDate) {
      const expires = new Date(hotel.trialEndDate).getTime();
      if (expires > Date.now()) {
        return true;
      }
    }

    // 3. Paid flag with non-pending subscription status
    if (hotel.paymentStatus === 'paid' && hotel.subscriptionStatus !== 'pending' && hotel.subscriptionStatus !== 'none') {
      return true;
    }

    return false;
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
          isSuperAdmin={isSuperAdmin}
          platformSettings={platformSettings}
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
            const pendingHotelId = hotelData.id || `hotel-${Date.now()}`;
            const pendingHotel: Hotel = {
              id: pendingHotelId,
              name: hotelData.hotelName || 'Pending Hotel',
              location: `${hotelData.city || 'Lagos'}, ${hotelData.state || 'Lagos'}`,
              city: hotelData.city || 'Lagos',
              state: hotelData.state || 'Lagos',
              country: hotelData.country || 'Nigeria',
              rating: 5.0,
              isLive: false,
              status: 'pending',
              approvalStatus: 'pending',
              paymentStatus: 'pending',
              subscriptionStatus: 'pending',
              roomCount: parseInt(hotelData.roomCount, 10) || 20,
              startingPrice: 35000,
              coverImage:
                hotelData.coverImage ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
              logoImage: hotelData.logoImage || '',
              address: hotelData.address || '',
              email: hotelData.hotelEmail || hotelData.email || '',
              phone: hotelData.hotelPhone || hotelData.phone || '',
              ownerName: hotelData.fullName || '',
              ownerEmail: hotelData.email || '',
              registeredBusiness: !!hotelData.isRegisteredBusiness || !!hotelData.registeredBusiness,
              cacNumber: hotelData.cacNumber || '',
              bankName: hotelData.bankName || '',
              accountName: hotelData.accountName || '',
              accountNumber: hotelData.accountNumber || '',
              coordinates: { lat: 6.5244, lng: 3.3792 },
              submittedAt: new Date().toISOString(),
            };

            setHotels((prev) => {
              const updated = [pendingHotel, ...prev];
              saveToStorage('igho_db_hotels', updated);
              return updated;
            });
            setSelectedHotel(pendingHotel);
            window.dispatchEvent(new Event('igho_hotels_updated'));

            // Immediately persist to backend server
            try {
              fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  hotels: [pendingHotel, ...hotels],
                  rooms,
                  reservations,
                  staff,
                  housekeeping,
                  invitations,
                  guestReports,
                  plans,
                  platformSettings,
                  customRoles,
                  demoRequests,
                }),
              }).catch(() => {});
            } catch {}
            return pendingHotelId;
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
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* SCREEN 5: HOTEL PUBLIC GUEST PORTAL (ROOMS & SUITES) */}
      {activeScreen === 'hotel_guest_portal' && (
        <HotelGuestPortal
          hotel={activeSelectedHotel}
          rooms={rooms.filter((r) => !r.hotelId || r.hotelId === activeSelectedHotel.id)}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onSelectRoom={(r) => {
            setSelectedRoom(r);
            navigateTo('room_detail');
          }}
          onNavigate={navigateTo}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* SCREEN 6: ROOM DETAIL VIEW (SPECS, AMENITIES, CALENDAR PICKER, BOOKING WIDGET) */}
      {activeScreen === 'room_detail' && (
        <RoomDetailView
          room={selectedRoom}
          hotel={activeSelectedHotel}
          allRooms={rooms}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          onSelectRoom={setSelectedRoom}
          onNavigate={navigateTo}
          isSuperAdmin={isSuperAdmin}
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
          hotel={activeSelectedHotel}
          bookingDraft={bookingDraft}
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onSignOut={handleGuestSignOut}
          onEditProfile={handleEditProfile}
          isSuperAdmin={isSuperAdmin}
          onCompleteBooking={(res) => {
            handleAddReservation(res);
          }}
          onNavigate={navigateTo}
        />
      )}

      {/* SCREEN 8: GUEST DASHBOARD (BOOKINGS, PROFILE, STATUS BANNERS) */}
      {activeScreen === 'guest_dashboard' && (
        <GuestDashboard
          hotel={activeSelectedHotel}
          reservations={reservations}
          rooms={rooms}
          currentUserEmail={currentUserEmail}
          guestProfile={currentGuestProfile}
          initialTab={guestDashboardTab}
          isSuperAdmin={isSuperAdmin}
          onUpdateGuestProfile={(updated) => {
            setCurrentGuestProfile(updated);
            saveCustomerProfile(updated);
            setProfileUpdateTrigger((p) => p + 1);
          }}
          onUpdateReservation={handleUpdateReservation}
          onSignOut={handleGuestSignOut}
          onNavigate={navigateTo}
          onSelectRoom={(r) => {
            const matchingHotel = hotels.find((h) => h.id === r.hotelId) || selectedHotel;
            if (matchingHotel) {
              setSelectedHotel(matchingHotel);
            }
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
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* SCREEN 10.5: HOTEL SUBSCRIPTION PLAN SELECTION SCREEN */}
      {activeScreen === 'hotel_subscription_plan' && (
        <HotelSubscriptionPlanScreen
          hotel={activeHotelForPMS}
          plans={plans}
          currentUserEmail={currentUserEmail}
          onSubscriptionActivated={(updatedHotel) => {
            setHotels((prev) =>
              prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h))
            );
            setSelectedHotel(updatedHotel);
            setActiveScreen('staff_portal');
          }}
          onNavigate={navigateTo}
          onSignOut={handleGuestSignOut}
        />
      )}

      {/* SCREEN 11: STAFF PORTAL (DASHBOARD, ROOM INVENTORY, RESERVATIONS, SETTINGS) */}
      {/* Requirement: Subscription plan after being approved should be the FIRST thing to show before hotel dashboard, unless 1-month free trial with special code */}
      {activeScreen === 'staff_portal' && (
        isSuperAdmin ? (
          <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                  Strict Tenant Privacy Barrier
                </span>
                <h2 className="text-xl font-black text-white">Hotel PMS Dashboard Restricted</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Hotel operational dashboards contain proprietary tenant operations and guest private records. By strict platform policy, the IGO Console cannot access or view private hotel dashboards.
                </p>
              </div>
              <button
                onClick={() => navigateTo('super_admin_console')}
                className="w-full py-3 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm"
              >
                Return to IGO Console
              </button>
            </div>
          </div>
        ) : !isHotelSubscriptionUnlocked(activeHotelForPMS) ? (
          <HotelSubscriptionPlanScreen
            hotel={activeHotelForPMS}
            plans={plans}
            currentUserEmail={currentUserEmail}
            onSubscriptionActivated={(updatedHotel) => {
              setHotels((prev) =>
                prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h))
              );
              setSelectedHotel(updatedHotel);
              setActiveScreen('staff_portal');
            }}
            onNavigate={navigateTo}
            onSignOut={handleGuestSignOut}
          />
        ) : (
          <StaffPortal
            hotel={activeHotelForPMS}
            currentUserEmail={currentUserEmail}
            rooms={rooms.filter((r) => !r.hotelId || r.hotelId === activeHotelForPMS.id)}
            reservations={reservations.filter((r) => !r.hotelId || r.hotelId === activeHotelForPMS.id)}
            staff={staff.filter((s) => !s.hotelId || s.hotelId === activeHotelForPMS.id)}
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
            onUpdateReservation={handleUpdateReservation}
            onUpdateReservationStatus={handleUpdateReservationStatus}
            onUpdateStaffPermissions={handleUpdateStaffPermissions}
            onUpdateBankInfo={(bankInfo) => {
              setHotels((prev) =>
                prev.map((h) => (h.id === activeHotelForPMS.id ? { ...h, ...bankInfo } : h))
              );
              setSelectedHotel((prev) => ({ ...prev, ...bankInfo }));
            }}
            onUpgradeSubscription={(planId, _billingCycle, verificationResult) => {
              if (!verificationResult?.success || !verificationResult?.hotel) {
                navigateTo('hotel_subscription_plan');
                return;
              }
              const verifiedHotel: Hotel = {
                ...activeHotelForPMS,
                ...verificationResult.hotel,
              };
              setHotels((prev) => prev.map((h) => (h.id === verifiedHotel.id ? verifiedHotel : h)));
              setSelectedHotel(verifiedHotel);
              const isComplete = Boolean(verifiedHotel.hasGuestPortal);
              const toastMsg = isComplete
                ? `${verifiedHotel.name} upgraded to ${verifiedHotel.subscriptionPlanName || planId}! Guest Portal is now live.`
                : `${verifiedHotel.name} updated to ${verifiedHotel.subscriptionPlanName || planId}.`;

              triggerLiveToast(toastMsg, 'add');
            }}
            onAddCustomRole={(newRole) => {
              setCustomRoles((prev) => [...prev, newRole]);
            }}
            onUpdateCustomRole={(updatedRole) => {
              setCustomRoles((prev) =>
                prev.map((r) => (r.id === updatedRole.id ? updatedRole : r))
              );
              setStaff((prev) =>
                prev.map((s) =>
                  s.role === updatedRole.id || s.role === updatedRole.name.toLowerCase()
                    ? { ...s, permissions: updatedRole.permissions }
                    : s
                )
              );
            }}
            onDeleteCustomRole={(roleId) => {
              setCustomRoles((prev) => prev.filter((r) => r.id !== roleId));
            }}
            onUpdateReportStatus={(reportId, status, notes) => {
              setGuestReports((prev) =>
                prev.map((r) => (r.id === reportId ? { ...r, status, resolutionNotes: notes } : r))
              );
            }}
            onNavigate={navigateTo}
            isSuperAdmin={isSuperAdmin}
          />
        )
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
          isSuperAdmin={isSuperAdmin}
          isVerifying={isVerifyingSuperAdmin}
          hotels={hotels}
          rooms={rooms}
          reservations={reservations}
          staff={staff}
          plans={plans}
          settings={platformSettings}
          onUpdatePlans={(updatedPlans) => setPlans(updatedPlans)}
          onUpdateSettings={(updatedSettings) => setPlatformSettings(updatedSettings)}
          onNavigate={(screen) => {
            if (screen === 'guest_login') {
              handleGuestSignOut();
              navigateTo('guest_login');
              return;
            }
            navigateTo(screen);
          }}
          onSignOut={handleGuestSignOut}
          onUpdateHotels={(updatedHotels) => setHotels(updatedHotels)}
          demoRequests={demoRequests}
          onUpdateDemoRequests={setDemoRequests}
        />
      )}

      {/* SCREEN 16: STAFF INVITATION ACCEPTANCE & ONBOARDING */}
      {activeScreen === 'staff_invitation_accept' && (() => {
        const matchingInvite =
          invitations.find((i) => i.token === activeInviteToken || i.id === activeInviteToken) ||
          invitations[0] || {
            id: 'inv-lava',
            hotelId: 'hotel-lava',
            hotelName: 'Lava Hotel & Suites',
            email: 'staff@lavahotels.ng',
            role: 'receptionist',
          };

        return (
          <StaffInvitationAccept
            invitationData={{
              id: matchingInvite.id,
              hotelId: matchingInvite.hotelId,
              hotelName: matchingInvite.hotelName || 'Lava Hotel & Suites',
              email: matchingInvite.email,
              role: (matchingInvite.role as any) || 'receptionist',
            }}
            onComplete={(newStaffAccount) => {
              setStaff((prev) => [newStaffAccount, ...prev]);
              setInvitations((prev) =>
                prev.map((i) =>
                  i.id === matchingInvite.id || i.token === activeInviteToken
                    ? { ...i, status: 'accepted' }
                    : i
                )
              );
              setCurrentStaffEmail(newStaffAccount.email);
              try {
                window.location.hash = '';
              } catch {}
              triggerLiveToast(
                `Account activated! Welcome to ${matchingInvite.hotelName}, ${newStaffAccount.name}.`,
                'add'
              );
              navigateTo('staff_portal');
            }}
            onNavigate={navigateTo}
          />
        );
      })()}

      {/* FLOATING REAL-TIME LIVE ACTIVITY NOTIFICATION TOAST */}
      {liveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-none max-w-[90vw]">
          <div className="bg-neutral-950/95 backdrop-blur-md text-white border border-neutral-800 px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 text-xs font-semibold">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                liveToast.type === 'delete' ? 'bg-rose-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                liveToast.type === 'delete' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <span className="text-neutral-100 font-medium truncate">{liveToast.message}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full font-bold border border-emerald-800 shrink-0">
              LIVE SYNC
            </span>
          </div>
        </div>
      )}
      {/* SUPABASE PASSWORD RECOVERY / RESET MODAL */}
      {showPasswordRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl p-6 sm:p-7 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Set New Password</h3>
                  <p className="text-[11px] text-neutral-500">IGHO Software Systems Security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordRecoveryModal(false);
                  setRecoveryError(null);
                  setRecoverySuccess(false);
                  if (window.location.hash.includes('type=recovery')) {
                    window.location.hash = '';
                  }
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recoverySuccess ? (
              <div className="py-4 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral-900">Password Updated Successfully!</h4>
                  <p className="text-xs text-neutral-500">Your account credentials have been updated in Supabase Auth.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordRecoveryModal(false);
                    setRecoverySuccess(false);
                    if (isSuperAdmin) {
                      navigateTo('super_admin_console');
                    } else {
                      navigateTo('landing');
                    }
                  }}
                  className="w-full py-2.5 bg-black text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Continue to IGHO
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRecoveryError(null);
                  if (recoveryNewPassword.length < 6) {
                    setRecoveryError('Password must be at least 6 characters.');
                    return;
                  }
                  if (recoveryNewPassword !== recoveryConfirmPassword) {
                    setRecoveryError('Passwords do not match.');
                    return;
                  }
                  setRecoveryLoading(true);
                  try {
                    const { error } = await authService.updateUserPassword(recoveryNewPassword);
                    setRecoveryLoading(false);
                    if (error) {
                      setRecoveryError(error.message || 'Failed to update password.');
                    } else {
                      setRecoverySuccess(true);
                      setRecoveryNewPassword('');
                      setRecoveryConfirmPassword('');
                    }
                  } catch (err: any) {
                    setRecoveryLoading(false);
                    setRecoveryError(err?.message || 'Error communicating with Supabase Auth.');
                  }
                }}
                className="space-y-3 text-xs"
              >
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Enter your new password below. This will update your login credentials in Supabase Auth.
                </p>

                {recoveryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type={recoveryShowPassword ? 'text' : 'password'}
                      required
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setRecoveryShowPassword(!recoveryShowPassword)}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-black cursor-pointer"
                    >
                      {recoveryShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type={recoveryShowPassword ? 'text' : 'password'}
                      required
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-black text-white py-2.5 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all active:scale-[0.99] mt-2 cursor-pointer disabled:opacity-50"
                >
                  {recoveryLoading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
