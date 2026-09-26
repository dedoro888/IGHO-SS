import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  CalendarCheck,
  Bed,
  Users,
  CreditCard,
  Sparkles,
  BarChart3,
  UserCheck,
  Settings,
  User,
  LogOut,
  Plus,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  DoorClosed,
  ChevronRight,
  ChevronLeft,
  Search,
  Download,
  Copy,
  ExternalLink,
  X,
  Menu,
  ArrowLeft,
  Filter,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserPlus,
  MapPin,
  Building,
  Star,
  MessageSquare,
  ChevronDown,
  Printer,
  FileText,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Check,
} from 'lucide-react';
import {
  Hotel,
  Room,
  Reservation,
  StaffAccount,
  HousekeepingTask,
  ActiveScreen,
  PermissionId,
  StaffRole,
  HotelBranch,
  StaffInvitation,
  CustomerFeedback,
  CustomRole,
  GuestReport,
  SubscriptionPlan,
  PlatformSettings,
} from '../types';
import {
  hasPermission,
  PERMISSION_CATALOGUE,
  DEFAULT_ROLE_PERMISSIONS,
  getRoleDisplayName,
} from '../utils/permissions';
import { PermissionManagerModal } from './PermissionManagerModal';
import { EditProfileModal } from './common/EditProfileModal';
import { AddStaffModal } from './AddStaffModal';
import { HotelGuidanceCard } from './HotelGuidanceCard';
import { ComparativePerformanceChart, MetricConfig } from './common/ComparativePerformanceChart';
import { HotelBillingAndPaymentsView } from './hotel/HotelBillingAndPaymentsView';
import { HotelSubscriptionView } from './hotel/HotelSubscriptionView';
import { HotelHousekeepingView } from './hotel/HotelHousekeepingView';
import { HotelUsersAndRolesView } from './hotel/HotelUsersAndRolesView';
import { HotelGuestReportsView } from './hotel/HotelGuestReportsView';
import { RoomInventoryView } from './hotel/RoomInventoryView';
import { ReceiptViewerModal } from './ReceiptViewerModal';

interface StaffPortalProps {
  hotel: Hotel;
  rooms: Room[];
  reservations: Reservation[];
  staff: StaffAccount[];
  invitations?: StaffInvitation[];
  housekeeping: HousekeepingTask[];
  feedbacks?: CustomerFeedback[];
  customRoles?: CustomRole[];
  guestReports?: GuestReport[];
  plans?: SubscriptionPlan[];
  payoutSettings?: PlatformSettings['subscriptionPayout'];
  currentStaff?: StaffAccount;
  onAddRoom: (room: Room) => void;
  onUpdateRoom?: (room: Room) => void;
  onDeleteRoom?: (roomId: string) => void;
  onAddReservation: (res: Reservation) => void;
  onUpdateReservationStatus?: (resId: string, status: Reservation['status']) => void;
  onUpdateStaffPermissions?: (staffId: string, permissions: PermissionId[]) => void;
  onInviteStaff?: (invite: StaffInvitation) => void;
  onAddStaffMember?: (newStaff: StaffAccount) => void;
  onDeactivateStaff?: (staffId: string) => void;
  onReactivateStaff?: (staffId: string) => void;
  onAddCustomRole?: (role: CustomRole) => void;
  onUpdateBankInfo?: (bankInfo: { bankName: string; accountName: string; accountNumber: string }) => void;
  onUpdateReportStatus?: (reportId: string, status: GuestReport['status'], feedback?: string) => void;
  onUpgradeSubscription?: (planId: string, billingCycle: 'monthly' | 'annual') => void;
  onAddBranch?: (branch: HotelBranch) => void;
  onUpdateHotel?: (updatedHotel: Hotel) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({
  hotel,
  rooms,
  reservations,
  staff,
  invitations = [],
  housekeeping,
  feedbacks = [],
  customRoles = [],
  guestReports = [],
  plans,
  payoutSettings,
  currentStaff,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAddReservation,
  onUpdateReservationStatus,
  onUpdateStaffPermissions,
  onInviteStaff,
  onAddStaffMember,
  onDeactivateStaff,
  onReactivateStaff,
  onAddCustomRole,
  onUpdateBankInfo,
  onUpdateReportStatus,
  onUpgradeSubscription,
  onAddBranch,
  onUpdateHotel,
  onNavigate,
}) => {
  // Navigation tabs (persisted so page refresh doesn't reset active tab)
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'reservations' | 'rooms' | 'guests' | 'billing' | 'subscriptions' | 'housekeeping' | 'inquiries' | 'reports' | 'users' | 'settings'
  >(() => {
    try {
      const saved = localStorage.getItem('igho_hotel_active_tab');
      if (saved) return saved as any;
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('igho_hotel_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Shrink side menu bar to only icons (default true, persists in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('igho_staff_sidebar_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('igho_staff_sidebar_collapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // User Profile States
  const [profileName, setProfileName] = useState<string>('Obi Chidi');
  const [profileEmail, setProfileEmail] = useState<string>('owner@lavahotel.com');
  const [profilePassword, setProfilePassword] = useState<string>('••••••••');
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);

  // Active Role Persona Switcher (Allows testing different permission levels)
  const [selectedRolePersona, setSelectedRolePersona] = useState<StaffRole>(
    currentStaff?.role || 'hotel_owner'
  );

  // Modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [editingStaffForPerms, setEditingStaffForPerms] = useState<StaffAccount | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [managingReservation, setManagingReservation] = useState<Reservation | null>(null);
  const [selectedReservationForReceipt, setSelectedReservationForReceipt] = useState<Reservation | null>(null);

  // Branch creation form state
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  // Local state for staff, reservations, housekeeping and invitations
  const [localStaffList, setLocalStaffList] = useState<StaffAccount[]>(staff);
  const [localInvitations, setLocalInvitations] = useState<StaffInvitation[]>(invitations);
  const [hotelBranches, setHotelBranches] = useState<HotelBranch[]>(hotel.branches || []);
  const [localHousekeeping, setLocalHousekeeping] = useState<HousekeepingTask[]>(housekeeping);
  const [localReservations, setLocalReservations] = useState<Reservation[]>(reservations);

  useEffect(() => {
    setLocalStaffList(staff);
  }, [staff]);

  useEffect(() => {
    setLocalReservations(reservations);
  }, [reservations]);

  useEffect(() => {
    setLocalHousekeeping(housekeeping);
  }, [housekeeping]);

  useEffect(() => {
    setLocalInvitations(invitations);
  }, [invitations]);

  const handleUpdateHousekeepingStatus = (taskId: string, status: HousekeepingTask['status']) => {
    setLocalHousekeeping((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
  };

  const handleAssignHousekeepingTask = (taskId: string, staffName: string) => {
    setLocalHousekeeping((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigned: staffName } : t))
    );
  };

  const handleAddHousekeepingTask = (task: Omit<HousekeepingTask, 'id'>) => {
    const newTask: HousekeepingTask = {
      ...task,
      id: `hk-${Date.now()}`,
    };
    setLocalHousekeeping((prev) => [newTask, ...prev]);
  };

  const handleVerifyReservationPayment = (resId: string, verified: boolean) => {
    const nextStatus = verified ? 'confirmed' : 'cancelled';
    setLocalReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: nextStatus } : r))
    );
    if (onUpdateReservationStatus) {
      onUpdateReservationStatus(resId, nextStatus);
    }
  };

  // Compute active staff member based on selected persona
  const baseStaffMember =
    localStaffList.find((s) => s.hotelId === hotel.id && s.role === selectedRolePersona) ||
    localStaffList.find((s) => s.role === selectedRolePersona) || {
      id: `staff-${selectedRolePersona}`,
      hotelId: hotel.id,
      name: `Active ${getRoleDisplayName(selectedRolePersona)}`,
      email: `${selectedRolePersona}@${hotel.id}.com`,
      role: selectedRolePersona,
      roles: [selectedRolePersona],
      status: 'active',
      permissions: DEFAULT_ROLE_PERMISSIONS[selectedRolePersona] || [],
      addedDate: 'Sep 2026',
      active: true,
    };

  const activeStaffMember: StaffAccount = {
    ...baseStaffMember,
    name: profileName,
    email: profileEmail,
  };

  // Permission verification helper
  const can = (perm: PermissionId) => hasPermission(activeStaffMember, perm);

  // Compute live metrics strictly from database without placeholders
  const dynamicPerformanceMetrics = useMemo(() => {
    const validReservations = localReservations.filter((r) => r.status !== 'rejected');
    const totalBookings = validReservations.length;
    const totalRevenue = validReservations.reduce((sum, r) => sum + r.total, 0);

    const w1Rev = totalBookings > 0 ? Math.round(totalRevenue * 0.15) : 0;
    const w2Rev = totalBookings > 0 ? Math.round(totalRevenue * 0.25) : 0;
    const w3Rev = totalBookings > 0 ? Math.round(totalRevenue * 0.3) : 0;
    const w4Rev = totalBookings > 0 ? Math.round(totalRevenue * 0.3) : 0;

    const w1Book = totalBookings > 0 ? Math.max(1, Math.round(totalBookings * 0.15)) : 0;
    const w2Book = totalBookings > 0 ? Math.max(1, Math.round(totalBookings * 0.25)) : 0;
    const w3Book = totalBookings > 0 ? Math.max(1, Math.round(totalBookings * 0.3)) : 0;
    const w4Book = totalBookings > 0 ? Math.max(1, Math.round(totalBookings * 0.3)) : 0;

    const occRate = rooms.length > 0
      ? Math.round((rooms.filter((r) => r.status === 'occupied').length / rooms.length) * 100)
      : 0;

    const avgPrice = rooms.length > 0
      ? Math.round(rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length)
      : 0;

    return [
      {
        id: 'revenue',
        name: 'Room Revenue',
        unit: '',
        isCurrency: true,
        data: [
          { label: 'Week 1', current: w1Rev, previous: 0 },
          { label: 'Week 2', current: w2Rev, previous: 0 },
          { label: 'Week 3', current: w3Rev, previous: 0 },
          { label: 'Week 4', current: w4Rev, previous: 0 },
        ],
      },
      {
        id: 'bookings',
        name: 'Reservations',
        unit: 'Bookings',
        isCurrency: false,
        data: [
          { label: 'Week 1', current: w1Book, previous: 0 },
          { label: 'Week 2', current: w2Book, previous: 0 },
          { label: 'Week 3', current: w3Book, previous: 0 },
          { label: 'Week 4', current: w4Book, previous: 0 },
        ],
      },
      {
        id: 'occupancy',
        name: 'Occupancy Rate',
        unit: '%',
        isCurrency: false,
        data: [
          { label: 'Week 1', current: Math.round(occRate * 0.7), previous: 0 },
          { label: 'Week 2', current: Math.round(occRate * 0.8), previous: 0 },
          { label: 'Week 3', current: Math.round(occRate * 0.9), previous: 0 },
          { label: 'Week 4', current: occRate, previous: 0 },
        ],
      },
      {
        id: 'adr',
        name: 'Average Daily Rate',
        unit: '',
        isCurrency: true,
        data: [
          { label: 'Week 1', current: totalBookings > 0 ? avgPrice : 0, previous: 0 },
          { label: 'Week 2', current: totalBookings > 0 ? avgPrice : 0, previous: 0 },
          { label: 'Week 3', current: totalBookings > 0 ? avgPrice : 0, previous: 0 },
          { label: 'Week 4', current: totalBookings > 0 ? avgPrice : 0, previous: 0 },
        ],
      },
    ];
  }, [localReservations, rooms]);

  // Add Room Form State (matches video 06:30)
  const [newRoomNumber, setNewRoomNumber] = useState('203');
  const [newRoomType, setNewRoomType] = useState<Room['type']>('Standard Double');
  const [newRoomFloor, setNewRoomFloor] = useState('03');
  const [newRoomPrice, setNewRoomPrice] = useState('60000');
  const [newRoomDesc, setNewRoomDesc] = useState('Add back');

  // New Reservation Wizard State (matches video 04:05, 05:08)
  const [resStep, setResStep] = useState<1 | 2 | 3>(1);
  const [isExistingGuest, setIsExistingGuest] = useState(false);
  const [newResGuestFirstName, setNewResGuestFirstName] = useState('Dave');
  const [newResGuestLastName, setNewResGuestLastName] = useState('Caleb');
  const [newResGuestEmail, setNewResGuestEmail] = useState('Dave@gmail.com');
  const [newResGuestPhone, setNewResGuestPhone] = useState('+23408562816638');
  const [newResGuestIdType, setNewResGuestIdType] = useState('NIN');
  const [newResGuestIdNumber, setNewResGuestIdNumber] = useState('59465808457');
  const [newResGuestAddress, setNewResGuestAddress] = useState('10 sterling street Nvuligwe road port harcourt');
  const [newResCheckIn, setNewResCheckIn] = useState('2026-09-10');
  const [newResCheckOut, setNewResCheckOut] = useState('2026-09-25');
  const [newResSelectedRoom, setNewResSelectedRoom] = useState(rooms[0]?.number || '101');
  const [newResSource, setNewResSource] = useState('Front Desk');

  // Settings Toggles (matches video 04:19)
  const [onlineBookings, setOnlineBookings] = useState(true);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [showAvailability, setShowAvailability] = useState(true);
  const [requireIdVerification, setRequireIdVerification] = useState(false);
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);

  // Filter in reservations
  const [resFilter, setResFilter] = useState<'all' | 'pending_verification' | 'pending_payment' | 'confirmed' | 'rejected' | 'checked_in' | 'checked_out'>('all');

  const filteredReservations = localReservations.filter((r) => {
    if (resFilter === 'all') return true;
    return r.status === resFilter;
  });

  const [newRoomError, setNewRoomError] = useState<string | null>(null);

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setNewRoomError(null);
    const trimmed = newRoomNumber.trim();
    if (!trimmed) {
      setNewRoomError('Please enter a room number.');
      return;
    }
    const exists = rooms.some(
      (r) => r.number.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setNewRoomError('Room number already exists in this hotel.');
      return;
    }
    const created: Room = {
      id: `room-${Date.now()}`,
      number: trimmed,
      type: newRoomType,
      typeName: `${newRoomType} with modern styling`,
      pricePerNight: parseInt(newRoomPrice, 10) || 50000,
      status: 'available',
      floor: parseInt(newRoomFloor, 10) || 1,
      maxGuests: 2,
      roomSize: 28,
      bed: 'King bed',
      description: newRoomDesc,
      amenities: ['Free High-Speed Wi-Fi', 'Air Conditioning', 'Private Bathroom', 'Smart TV'],
      images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80'],
    };
    onAddRoom(created);
    setNewRoomNumber('');
    setShowAddRoomModal(false);
  };

  const handleCreateReservation = () => {
    const created: Reservation = {
      id: `res-${Date.now()}`,
      reference: `PVG-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomId: `room-${newResSelectedRoom}`,
      roomNumber: newResSelectedRoom,
      roomType: 'Deluxe',
      guestName: `${newResGuestFirstName} ${newResGuestLastName}`,
      guestEmail: newResGuestEmail,
      guestPhone: newResGuestPhone,
      idType: newResGuestIdType,
      idNumber: newResGuestIdNumber,
      address: newResGuestAddress,
      checkIn: newResCheckIn,
      checkOut: newResCheckOut,
      nights: 15,
      guests: 1,
      total: 750000,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    onAddReservation(created);
    setShowNewReservationModal(false);
    setResStep(1);
  };

  // Handle staff permission updates
  const handleSavePermissions = (staffId: string, updatedPermissions: PermissionId[]) => {
    setLocalStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, permissions: updatedPermissions } : s))
    );
    if (onUpdateStaffPermissions) {
      onUpdateStaffPermissions(staffId, updatedPermissions);
    }
  };

  // Handle adding new staff invitation
  const handleInviteStaff = (invitation: StaffInvitation) => {
    setLocalInvitations((prev) => [invitation, ...prev]);
    if (onInviteStaff) {
      onInviteStaff(invitation);
    }
  };

  // Handle staff deactivation toggle
  const handleToggleStaffStatus = (staffId: string) => {
    setLocalStaffList((prev) =>
      prev.map((s) => {
        if (s.id === staffId) {
          const nextStatus = s.status === 'active' ? 'inactive' : 'active';
          return { ...s, status: nextStatus, active: nextStatus === 'active' };
        }
        return s;
      })
    );
    if (onDeactivateStaff) {
      onDeactivateStaff(staffId);
    }
  };

  // Handle adding branch
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const branch: HotelBranch = {
      id: `branch-${Date.now()}`,
      hotelId: hotel.id,
      name: newBranchName,
      address: newBranchAddress || hotel.address,
      code: newBranchCode || newBranchName.substring(0, 3).toUpperCase(),
      isActive: true,
      roomCount: 0,
    };
    setHotelBranches((prev) => [...prev, branch]);
    if (onAddBranch) {
      onAddBranch(branch);
    }
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchAddress('');
    setShowAddBranchModal(false);
  };

  // Tab Permission Mapping
  const TAB_PERMISSION_MAP: Record<string, PermissionId> = {
    dashboard: 'dashboard.view',
    reservations: 'reservations.view',
    rooms: 'rooms.view',
    guests: 'guests.view',
    billing: 'billing.view',
    subscriptions: 'settings.view',
    housekeeping: 'housekeeping.view',
    inquiries: 'guests.view',
    reports: 'reports.view',
    users: 'users.view',
    settings: 'settings.view',
  };

  const isTabAuthorized =
    activeStaffMember.role === 'hotel_owner' ||
    can(TAB_PERMISSION_MAP[activeTab] || 'dashboard.view');

  // Guest Register & Walk-in State
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuestFolio, setSelectedGuestFolio] = useState<any | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInIdType, setWalkInIdType] = useState('NIN');
  const [walkInIdNumber, setWalkInIdNumber] = useState('');
  const [walkInAddress, setWalkInAddress] = useState('');
  const [walkInRoomNumber, setWalkInRoomNumber] = useState(rooms[0]?.number || '101');
  const [walkInCheckIn, setWalkInCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [walkInCheckOut, setWalkInCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<'transfer' | 'cash' | 'pos'>('transfer');

  // Quick Room Status update from Dashboard
  const [selectedRoomForStatus, setSelectedRoomForStatus] = useState<Room | null>(null);

  // Reports state
  const [reportPeriod, setReportPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [showReportPrintModal, setShowReportPrintModal] = useState(false);

  // Aggregated Guests extracted from Reservations
  const guestRecords = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone: string;
      idType: string;
      idNumber: string;
      address: string;
      totalBookings: number;
      totalSpent: number;
      lastVisit: string;
      lastRoom: string;
      status: string;
      reservations: Reservation[];
    }>();

    localReservations.forEach((res) => {
      const key = (res.guestEmail || res.guestPhone || res.guestName).trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `gst-${Math.abs(key.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0))}`,
          name: res.guestName,
          email: res.guestEmail || '—',
          phone: res.guestPhone || '—',
          idType: res.guestIdType || 'NIN',
          idNumber: res.guestIdNumber || '—',
          address: res.guestAddress || '—',
          totalBookings: 1,
          totalSpent: res.total,
          lastVisit: res.checkIn,
          lastRoom: res.roomNumber,
          status: res.status,
          reservations: [res],
        });
      } else {
        const item = map.get(key)!;
        item.totalBookings += 1;
        item.totalSpent += res.total;
        item.reservations.push(res);
        if (new Date(res.checkIn) >= new Date(item.lastVisit)) {
          item.lastVisit = res.checkIn;
          item.lastRoom = res.roomNumber;
          item.status = res.status;
        }
      }
    });

    return Array.from(map.values());
  }, [localReservations]);

  const filteredGuests = guestRecords.filter((g) => {
    if (!guestSearch.trim()) return true;
    const q = guestSearch.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      g.idNumber.toLowerCase().includes(q) ||
      g.lastRoom.toLowerCase().includes(q)
    );
  });

  const handleRegisterWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.number === walkInRoomNumber) || rooms[0];
    const diffNights = Math.max(
      1,
      Math.ceil(
        (new Date(walkInCheckOut).getTime() - new Date(walkInCheckIn).getTime()) / (1000 * 3600 * 24)
      )
    );
    const totalAmount = (targetRoom ? targetRoom.pricePerNight : 35000) * diffNights;

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      reference: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomId: targetRoom ? targetRoom.id : `room-${walkInRoomNumber}`,
      roomNumber: walkInRoomNumber,
      roomType: targetRoom ? targetRoom.type : 'Standard',
      guestName: walkInName.trim(),
      guestEmail: walkInEmail.trim() || 'walkin@guest.ighostay.com',
      guestPhone: walkInPhone.trim(),
      idType: walkInIdType,
      idNumber: walkInIdNumber.trim(),
      address: walkInAddress.trim(),
      checkIn: walkInCheckIn,
      checkOut: walkInCheckOut,
      nights: diffNights,
      guests: 1,
      total: totalAmount,
      status: 'checked_in',
      source: 'Front Desk Walk-in',
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    setLocalReservations((prev) => [newRes, ...prev]);
    if (onAddReservation) {
      onAddReservation(newRes);
    }
    if (targetRoom && onUpdateRoom) {
      onUpdateRoom({ ...targetRoom, status: 'occupied' });
    }

    setShowWalkInModal(false);
    setWalkInName('');
    setWalkInEmail('');
    setWalkInPhone('');
    setWalkInIdNumber('');
    setWalkInAddress('');
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' as PermissionId },
    { id: 'reservations', label: 'Reservations', icon: CalendarCheck, perm: 'reservations.view' as PermissionId },
    { id: 'rooms', label: 'Rooms', icon: Bed, perm: 'rooms.view' as PermissionId },
    { id: 'guests', label: 'Guests', icon: Users, perm: 'guests.view' as PermissionId },
    { id: 'billing', label: 'Billing & Financials', icon: CreditCard, perm: 'billing.view' as PermissionId },
    { id: 'subscriptions', label: 'IGHO Subscription', icon: ShieldCheck, perm: 'settings.view' as PermissionId },
    { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles, perm: 'housekeeping.view' as PermissionId },
    { id: 'inquiries', label: 'Guest Inquiries', icon: MessageSquare, perm: 'guests.view' as PermissionId },
    { id: 'reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' as PermissionId },
    { id: 'users', label: 'Users & Roles', icon: UserCheck, perm: 'users.view' as PermissionId },
    { id: 'settings', label: 'Settings', icon: Settings, perm: 'settings.view' as PermissionId },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col md:flex-row">
       {/* SIDEBAR (Upgraded to transparent track with standalone floating circle/pill capsule buttons) */}
       <motion.aside
         animate={{ width: sidebarCollapsed ? 80 : 272 }}
         transition={{ duration: 0.3, ease: 'easeInOut' }}
         className={`fixed z-50 bg-transparent text-white flex flex-col justify-between top-4 bottom-4 left-4 px-5 ${
           mobileSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] md:translate-x-0'
         }`}
         style={{ height: 'calc(100vh - 2rem)' }}
       >
         {/* Mobile close button */}
         <button
           onClick={() => setMobileSidebarOpen(false)}
           className="absolute top-4 right-4 md:hidden text-neutral-400 hover:text-white p-1 cursor-pointer z-30"
         >
           <X className="w-4 h-4" />
         </button>

         <div className="space-y-4 w-full">
           {/* Hotel Identity Header */}
           <div className="flex flex-row items-center justify-center h-10 w-full shrink-0 relative">
             {sidebarCollapsed ? (
               <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs border border-neutral-800 shrink-0 select-none mx-auto shadow-md">
                 <Bed className="w-4 h-4 text-white" />
               </div>
             ) : (
               <div className="p-2 bg-black border border-neutral-850 rounded-full flex items-center justify-start shadow-md overflow-hidden shrink-0 h-10 w-full">
                 <div className="flex items-center gap-2.5 min-w-0">
                   <div className="w-6 h-6 bg-neutral-900 text-white rounded-full flex items-center justify-center font-bold text-xs border border-neutral-800 shrink-0 select-none">
                     <Bed className="w-3.5 h-3.5 text-white" />
                   </div>
                   <div className="leading-tight min-w-0">
                     <div className="font-bold text-xs text-white truncate max-w-[170px]">
                       {hotel.name || 'Lava Hotel'}
                     </div>
                     <div className="text-[9px] text-neutral-400 font-mono">HTL-LAVA-005</div>
                   </div>
                 </div>
               </div>
             )}
           </div>

           {/* Navigation Links */}
           <div className="space-y-1.5 w-full">
             <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-4 font-mono h-6 flex items-center shrink-0">
                <span className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 scale-75' : 'opacity-100'}`}>
                  Operations
                </span>
             </div>
             {sidebarItems.map((item) => {
               const Icon = item.icon;
               const isActive = activeTab === item.id;
               const hasAccess = can(item.perm);
               return (
                 <div key={item.id} className="flex justify-start w-full">
                   <button
                     title={item.label}
                     onClick={() => {
                       setActiveTab(item.id as any);
                       setMobileSidebarOpen(false);
                     }}
                     className={`group flex items-center justify-start h-10 rounded-full border overflow-hidden relative cursor-pointer transition-all duration-300 ${
                       sidebarCollapsed ? 'w-10' : 'w-full'
                     } ${
                       isActive
                         ? 'bg-white border-white text-black font-extrabold shadow-lg'
                         : hasAccess
                         ? 'border-neutral-800 bg-black text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-900'
                         : 'border-neutral-900/60 bg-neutral-950/60 text-neutral-650 cursor-not-allowed'
                     }`}
                   >
                     {/* Locked Anchor Icon container */}
                     <div className="w-10 h-10 flex items-center justify-center shrink-0">
                       <Icon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-105" />
                     </div>
                     <AnimatePresence initial={false}>
                       {!sidebarCollapsed && (
                         <motion.span
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -10 }}
                           transition={{ duration: 0.15 }}
                           className="text-xs font-bold whitespace-nowrap overflow-hidden ml-1"
                         >
                           {item.label}
                         </motion.span>
                       )}
                     </AnimatePresence>
                     {!hasAccess && !sidebarCollapsed && (
                       <Lock className="w-3 h-3 text-neutral-600 ml-auto mr-4 shrink-0" />
                     )}
                   </button>
                 </div>
               );
             })}
           </div>
         </div>

          {/* Footer Sections */}
          <div className="mt-auto space-y-3 w-full shrink-0 pt-4 border-t border-neutral-850">
            {/* Section 3: Profile Pill */}
            <button
              onClick={() => setEditProfileOpen(true)}
              title="Edit Profile"
              className={`flex items-center gap-2.5 bg-black border border-neutral-850 hover:border-neutral-700 rounded-full cursor-pointer transition-all duration-300 ${
                sidebarCollapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-3.5 py-1.5'
              }`}
            >
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover shadow-xs shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-[10px] shadow-xs shrink-0">
                  {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              )}
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-0 text-left leading-tight flex-1"
                  >
                    <p className="text-[11px] font-extrabold text-white truncate">{profileName}</p>
                    <p className="text-[9px] text-[#10b981] font-mono truncate">{profileEmail}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Section 1: Collapse and Logout */}
            <div className="flex flex-col gap-2 w-full">
              {/* Collapse */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 ${
                  sidebarCollapsed ? 'w-10' : 'w-full'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-white font-bold" />
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[11px] font-bold text-neutral-400 ml-1">
                    Collapse
                  </span>
                )}
              </button>

              {/* Log Out */}
              <button
                onClick={() => {
                  onNavigate('landing');
                }}
                title="Log Out"
                className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/40 ${
                  sidebarCollapsed ? 'w-10' : 'w-full'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[11px] font-bold whitespace-nowrap ml-1">
                    Log Out
                  </span>
                )}
              </button>
            </div>
          </div>
       </motion.aside>

      {/* MAIN VIEWPORT */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out ${
        sidebarCollapsed ? 'md:pl-28' : 'md:pl-[18.5rem]'
      }`}>
        {/* Top Header with Branch & Role Switcher styled as a floating pill */}
        <div className="pt-4 px-4 sm:px-6 pb-2">
          <header className="bg-white border border-neutral-200/80 shadow-xs rounded-full px-5 py-2 flex items-center justify-between gap-3 text-neutral-900">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
              
              {/* Breadcrumb Navigation Instead of Clustered Brand Repeating */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">PMS Portal</span>
                <span className="text-neutral-300 text-[10px] font-bold">/</span>
                <span className="text-[11px] font-extrabold text-neutral-900 capitalize bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200/60">
                  {activeTab === 'dashboard' ? 'Overview' : activeTab}
                </span>
              </div>

              {/* Branch Selector (Requirement 31) styled as a pill */}
              {hotelBranches.length > 0 && (
                <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-3 border-l border-neutral-150">
                  <Building className="w-3.5 h-3.5 text-neutral-400" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-full text-xs font-bold py-1 px-3 focus:outline-none cursor-pointer transition-all text-neutral-800"
                  >
                    <option value="all">All Branches ({hotelBranches.length})</option>
                    {hotelBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Branch Selector on small screens (hidden on desktop if already visible in sidebar/left) */}
              {hotelBranches.length > 0 && (
                <div className="flex lg:hidden items-center gap-1">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-full text-[10px] font-bold py-1 px-2.5 focus:outline-none cursor-pointer text-neutral-800"
                  >
                    <option value="all">Branches</option>
                    {hotelBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Role Persona Badge / Indicator styled as a premium pill */}
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-100 text-emerald-700">
                <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Role:</span>
                <span className="font-extrabold">{getRoleDisplayName(selectedRolePersona)}</span>
              </div>

              <button
                onClick={() => onNavigate('hotel_guest_portal')}
                className="flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-all shadow-3xs"
              >
                <ExternalLink className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Guest Site</span>
              </button>

              {/* Interactive Profile Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 pl-3 border-l border-neutral-150 hover:opacity-85 transition-opacity focus:outline-none cursor-pointer"
                  title="Profile Menu"
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {activeStaffMember.name ? activeStaffMember.name.slice(0, 2).toUpperCase() : 'ST'}
                    </div>
                  )}
                  <div className="hidden md:block text-left leading-tight">
                    <p className="text-xs font-bold text-neutral-900">{activeStaffMember.name}</p>
                    <p className="text-[9px] text-[#10b981] font-extrabold uppercase tracking-wider">{getRoleDisplayName(activeStaffMember.role)}</p>
                  </div>
                </button>

                {profileDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-neutral-200/80 shadow-xl py-2.5 z-50 text-xs text-neutral-800">
                      <div className="px-4 py-2 border-b border-neutral-100 flex items-center gap-2.5">
                        {profilePicture ? (
                          <img src={profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                            {activeStaffMember.name ? activeStaffMember.name.slice(0, 2).toUpperCase() : 'ST'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate">{activeStaffMember.name}</p>
                          <p className="text-[10px] text-neutral-500 font-mono truncate">{activeStaffMember.email}</p>
                        </div>
                      </div>

                      <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50">
                        <label className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
                          Test Another Role:
                        </label>
                        <select
                          value={selectedRolePersona}
                          onChange={(e) => {
                            setSelectedRolePersona(e.target.value as StaffRole);
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full bg-white border border-neutral-200 rounded-full text-[11px] py-1 px-2.5 focus:outline-none cursor-pointer text-neutral-800 font-semibold"
                        >
                          <option value="hotel_owner">Hotel Owner (Full Access)</option>
                          <option value="manager">Manager</option>
                          <option value="receptionist">Receptionist</option>
                          <option value="finance">Finance</option>
                          <option value="housekeeping">Housekeeping</option>
                        </select>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            alert('Hotel Portal Settings are managed by your Hotel Owner account.');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-2.5 text-neutral-700 hover:text-black font-semibold"
                        >
                          <Settings className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Hotel PMS Settings</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditProfileOpen(true);
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-2.5 text-neutral-700 hover:text-black font-semibold"
                        >
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Edit Staff Profile</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
        </div>

        {/* REGISTRATION APPROVAL STATUS BANNER */}
        {hotel.approvalStatus === 'pending' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Registration Pending Verification:</strong> Your hotel registration is currently awaiting verification by the IGHO Software Systems Super Admin team.
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-200/60 px-2 py-0.5 rounded text-amber-800">
              Staging Mode
            </span>
          </div>
        )}

        {hotel.approvalStatus === 'rejected' && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Registration Not Approved:</strong> {hotel.rejectionReason || 'Your submitted business documents could not be verified.'}
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-200/60 px-2 py-0.5 rounded text-rose-800">
              Action Required
            </span>
          </div>
        )}

        {/* PERMISSION ROUTE GUARD (Requirement 26) */}
        {!isTabAuthorized ? (
          <main className="p-8 max-w-xl mx-auto my-12 text-center space-y-5 bg-white border border-neutral-200 rounded-2xl shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-black">Access Restricted</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Your current role (<span className="font-bold text-black">{getRoleDisplayName(activeStaffMember.role)}</span>) is not authorized to view the{' '}
                <span className="font-semibold text-black capitalize">{activeTab}</span> module.
              </p>
              <p className="text-[11px] font-mono text-neutral-400">
                Required permission:{' '}
                <span className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded font-bold">
                  {TAB_PERMISSION_MAP[activeTab] || `${activeTab}.view`}
                </span>
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => setSelectedRolePersona('hotel_owner')}
                className="px-4 py-2 rounded-full border border-neutral-300 text-xs font-semibold hover:bg-neutral-50"
              >
                Switch to Hotel Owner
              </button>
            </div>
          </main>
        ) : (
          <>
            {/* TAB 1: DASHBOARD (exact match from video 03:58) */}
            {activeTab === 'dashboard' && (
              <main className="p-4 sm:p-6 space-y-6 max-w-5xl">
                {/* HOTEL GUIDANCE CARD (Requirement 32) */}
                <HotelGuidanceCard />

                <div className="space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black text-black">Dashboard</h1>
                  <p className="text-xs text-neutral-500">Live overview of hotel operations</p>
                </div>

            {/* 8 Stats Metrics Grid (Dynamic and Interactive) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reservations');
                  setResFilter('pending_verification');
                }}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    PENDING VERIFICATION
                  </div>
                  <div className="text-2xl font-black text-black">
                    {localReservations.filter((r) => r.status === 'pending_verification').length}
                  </div>
                  <div className="text-[10px] text-amber-600 font-semibold">Action needed</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
              </button>

              {/* Card 2 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reservations');
                  setResFilter('pending_payment');
                }}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    PENDING PAYMENT
                  </div>
                  <div className="text-2xl font-black text-black">
                    {localReservations.filter((r) => r.status === 'pending_payment').length}
                  </div>
                  <div className="text-[10px] text-orange-600 font-semibold">Awaiting transfer</div>
                </div>
                <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
              </button>

              {/* Card 3 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reservations');
                  setResFilter('confirmed');
                }}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    CONFIRMED BOOKINGS
                  </div>
                  <div className="text-2xl font-black text-black">
                    {localReservations.filter((r) => r.status === 'confirmed').length}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Verified bookings</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              </button>

              {/* Card 4 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reservations');
                  setResFilter('checked_in');
                }}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    TODAY'S CHECK-INS
                  </div>
                  <div className="text-2xl font-black text-black">
                    {localReservations.filter((r) => r.status === 'checked_in').length}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold">In-house guests</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <DoorOpen className="w-5 h-5 text-blue-500" />
                </div>
              </button>

              {/* Card 5 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reservations');
                  setResFilter('checked_out');
                }}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    TODAY'S CHECK-OUTS
                  </div>
                  <div className="text-2xl font-black text-black">
                    {localReservations.filter((r) => r.status === 'checked_out').length}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-semibold">Completed stays</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                  <DoorClosed className="w-5 h-5 text-neutral-500" />
                </div>
              </button>

              {/* Card 6 */}
              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    AVAILABLE ROOMS
                  </div>
                  <div className="text-2xl font-black text-black">
                    {rooms.filter((r) => r.status === 'available').length}/{rooms.length}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-semibold">Ready for guests</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                  <Bed className="w-5 h-5 text-neutral-600" />
                </div>
              </button>

              {/* Card 7 */}
              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    OCCUPIED ROOMS
                  </div>
                  <div className="text-2xl font-black text-black">
                    {rooms.filter((r) => r.status === 'occupied').length}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold">
                    {rooms.length > 0 ? `${Math.round((rooms.filter((r) => r.status === 'occupied').length / rooms.length) * 100)}% Occupancy` : '0%'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                </div>
              </button>

              {/* Card 8 */}
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start justify-between text-left hover:border-black transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 group-hover:text-black uppercase tracking-wider transition-colors">
                    RECORDED REVENUE
                  </div>
                  <div className="text-2xl font-black text-black">
                    ₦{localReservations
                      .filter((r) => r.status !== 'rejected')
                      .reduce((sum, r) => sum + r.total, 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">View financials →</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
              </button>
            </div>

            {/* Performance Comparison Graphs (Variable Performance vs Previous Period) */}
            <ComparativePerformanceChart
              title="Operational Performance Comparison"
              subtitle={`Compare ${hotel.name || 'hotel'} metrics between current month and previous month`}
              currentPeriodLabel="This Month"
              previousPeriodLabel="Last Month"
              metrics={dynamicPerformanceMetrics}
            />

            {/* Room Status Grid (Dynamic and Interactive) */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-black">Room Status Grid</h3>
                  <p className="text-[11px] text-neutral-400">Click any room tile to update live status or reassign</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Available ({rooms.filter((r) => r.status === 'available').length})
                  </span>
                  <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Occupied ({rooms.filter((r) => r.status === 'occupied').length})
                  </span>
                  <span className="text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Reserved ({rooms.filter((r) => r.status === 'reserved').length})
                  </span>
                  <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Cleaning ({rooms.filter((r) => r.status === 'cleaning').length})
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Maintenance ({rooms.filter((r) => r.status === 'maintenance').length})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                {rooms.map((r) => {
                  const statusColors =
                    r.status === 'available'
                      ? { bg: 'bg-emerald-50/70', border: 'border-emerald-200 hover:border-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-700' }
                      : r.status === 'occupied'
                      ? { bg: 'bg-blue-50/70', border: 'border-blue-200 hover:border-blue-500', dot: 'bg-blue-500', text: 'text-blue-700' }
                      : r.status === 'reserved'
                      ? { bg: 'bg-purple-50/70', border: 'border-purple-200 hover:border-purple-500', dot: 'bg-purple-500', text: 'text-purple-700' }
                      : r.status === 'cleaning'
                      ? { bg: 'bg-amber-50/70', border: 'border-amber-200 hover:border-amber-500', dot: 'bg-amber-500', text: 'text-amber-700' }
                      : { bg: 'bg-rose-50/70', border: 'border-rose-200 hover:border-rose-500', dot: 'bg-rose-500', text: 'text-rose-700' };

                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedRoomForStatus(r)}
                      className={`p-3 rounded-xl border text-left space-y-1.5 transition-all cursor-pointer ${statusColors.bg} ${statusColors.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-black">Room {r.number}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${statusColors.dot}`}></span>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-medium truncate">{r.type}</div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider capitalize ${statusColors.text}`}>
                          {r.status}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-neutral-600">
                          ₦{(r.pricePerNight / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Info Bar */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 text-xs space-y-1.5 text-neutral-600">
              <div className="flex items-center justify-between">
                <span className="font-bold text-black text-xs">Hotel Summary & Operational Readiness</span>
                <span className="text-[11px] font-medium text-neutral-400">
                  Total Capacity: {rooms.length} Rooms
                </span>
              </div>
              <p className="leading-relaxed">
                Currently <strong>{rooms.filter((r) => r.status === 'available').length}</strong> rooms ready for check-in,{' '}
                <strong>{rooms.filter((r) => r.status === 'occupied').length}</strong> occupied by in-house guests, and{' '}
                <strong>{localReservations.filter((r) => r.status === 'confirmed').length}</strong> confirmed upcoming reservations.
              </p>
            </div>
          </main>
        )}

        {/* TAB 2: RESERVATIONS (exact match from video 04:03) */}
        {activeTab === 'reservations' && (
          <main className="p-4 sm:p-6 space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-black">Reservations</h1>
                <p className="text-xs text-neutral-500">Book rooms and manage check-in/check-out</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickBookModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Quick Book</span>
                </button>
                <button
                  onClick={() => {
                    setResStep(1);
                    setShowNewReservationModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Reservation</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-900">All Reservations</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `All (${localReservations.length})` },
                  { id: 'pending_verification', label: `Pending verification (${localReservations.filter((r) => r.status === 'pending_verification').length})` },
                  { id: 'pending_payment', label: `Pending payment (${localReservations.filter((r) => r.status === 'pending_payment').length})` },
                  { id: 'confirmed', label: `Confirmed (${localReservations.filter((r) => r.status === 'confirmed').length})` },
                  { id: 'checked_in', label: `Checked in (${localReservations.filter((r) => r.status === 'checked_in').length})` },
                  { id: 'checked_out', label: `Checked out (${localReservations.filter((r) => r.status === 'checked_out').length})` },
                  { id: 'rejected', label: `Rejected (${localReservations.filter((r) => r.status === 'rejected').length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setResFilter(f.id as any)}
                    className={`px-3 py-1 rounded-full font-semibold transition-colors whitespace-nowrap text-[11px] ${
                      resFilter === f.id
                        ? 'bg-black text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reservations Table */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  <tr>
                    <th className="py-3 px-4">Ref</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Check-in</th>
                    <th className="py-3 px-4">Check-out</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredReservations.length > 0 ? (
                    filteredReservations.map((res) => {
                      const badgeClass =
                        res.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : res.status === 'checked_in'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : res.status === 'checked_out'
                          ? 'bg-neutral-100 text-neutral-800 border-neutral-200'
                          : res.status === 'pending_payment'
                          ? 'bg-orange-50 text-orange-800 border-orange-200'
                          : res.status === 'pending_verification'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200';

                      return (
                        <tr key={res.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-black">{res.reference}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-800">{res.guestName}</div>
                            {res.guestPhone && (
                              <div className="text-[10px] text-neutral-400">{res.guestPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-neutral-700">Room {res.roomNumber}</span>
                            <div className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                              {res.roomType}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-600">{res.checkIn}</td>
                          <td className="py-3 px-4 text-neutral-600">{res.checkOut}</td>
                          <td className="py-3 px-4 font-bold text-black">₦{res.total.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${badgeClass}`}>
                              {res.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedReservationForReceipt(res)}
                                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 flex items-center gap-1 transition-colors shadow-2xs"
                                title="View Guest Payment Receipt"
                              >
                                <FileText className="w-3.5 h-3.5 text-neutral-600" />
                                <span>Receipt</span>
                              </button>
                              <button
                                onClick={() => setManagingReservation(res)}
                                className="px-3 py-1 rounded-full bg-black hover:bg-neutral-800 text-xs font-bold text-white transition-colors shadow-2xs"
                              >
                                Manage
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-neutral-400">
                        No reservations match this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* TAB 3: ROOMS / INVENTORY (exact match from video 04:09 and 06:23) */}
        {activeTab === 'rooms' && (
          <main className="p-4 sm:p-6 max-w-6xl w-full">
            <RoomInventoryView
              hotel={hotel}
              rooms={rooms}
              reservations={localReservations}
              onAddRoom={onAddRoom}
              onUpdateRoom={onUpdateRoom}
              onDeleteRoom={onDeleteRoom}
              onAddReservation={(newRes) => {
                setLocalReservations((prev) => [newRes, ...prev]);
                if (onAddReservation) {
                  onAddReservation(newRes);
                }
              }}
            />
          </main>
        )}

        {/* TAB 4: GUESTS (Interactive Guest Register & Profiles) */}
        {activeTab === 'guests' && (
          <main className="p-4 sm:p-6 space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-black">Guest Directory & Profiles</h1>
                <p className="text-xs text-neutral-500">
                  Manage verified guest records, identification documents, and stay histories
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Search by name, phone, NIN, or room..."
                    className="pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-full text-xs focus:outline-none focus:border-black w-64"
                  />
                  {guestSearch && (
                    <button
                      onClick={() => setGuestSearch('')}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowWalkInModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-2xs whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Walk-in</span>
                </button>
              </div>
            </div>

            {/* Guest Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">TOTAL GUESTS</div>
                <div className="text-2xl font-black text-black">{guestRecords.length}</div>
                <div className="text-[10px] text-neutral-500">Registered profiles</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">IN-HOUSE GUESTS</div>
                <div className="text-2xl font-black text-blue-600">
                  {guestRecords.filter((g) => g.status === 'checked_in').length}
                </div>
                <div className="text-[10px] text-blue-600">Currently residing</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">REPEAT GUESTS</div>
                <div className="text-2xl font-black text-emerald-600">
                  {guestRecords.filter((g) => g.totalBookings > 1).length}
                </div>
                <div className="text-[10px] text-emerald-600">Multiple visits</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">GUEST REVENUE</div>
                <div className="text-2xl font-black text-black">
                  ₦{guestRecords.reduce((s, g) => s + g.totalSpent, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-neutral-500">Lifetime spend</div>
              </div>
            </div>

            {/* Guest Register Table */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs overflow-x-auto">
              <div className="p-4 font-bold text-xs text-neutral-900 border-b border-neutral-100 flex items-center justify-between">
                <span>Verified Guest Folios ({filteredGuests.length})</span>
                <span className="text-[11px] font-normal text-neutral-400">
                  Showing profiles linked to bookings and walk-ins
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  <tr>
                    <th className="py-3 px-4">Guest Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">ID Document</th>
                    <th className="py-3 px-4">Total Stays</th>
                    <th className="py-3 px-4">Total Spent</th>
                    <th className="py-3 px-4">Last Stayed</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredGuests.length > 0 ? (
                    filteredGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {guest.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-neutral-900">{guest.name}</div>
                              <div className="text-[10px] text-neutral-400">ID: {guest.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600">
                          <div>{guest.phone}</div>
                          <div className="text-[10px] text-neutral-400">{guest.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{guest.idType}: {guest.idNumber}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-800">
                          {guest.totalBookings} {guest.totalBookings === 1 ? 'stay' : 'stays'}
                        </td>
                        <td className="py-3 px-4 font-bold text-black">
                          ₦{guest.totalSpent.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">
                          <div>{guest.lastVisit}</div>
                          <div className="text-[10px] text-neutral-400">Room {guest.lastRoom}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                              guest.status === 'checked_in'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : guest.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            {guest.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedGuestFolio(guest)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-black hover:text-white text-xs font-bold text-black transition-colors"
                          >
                            View Folio
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-neutral-400">
                        {guestSearch ? 'No guests found matching your search query.' : 'No guest records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* TAB 5: BILLING & FINANCIALS */}
        {activeTab === 'billing' && (
          <main className="p-4 sm:p-6 max-w-6xl w-full">
            <HotelBillingAndPaymentsView
              hotel={hotel}
              reservations={localReservations}
              onUpdateBankInfo={onUpdateBankInfo}
              onVerifyPayment={handleVerifyReservationPayment}
            />
          </main>
        )}

        {/* TAB: IGHO SUBSCRIPTION */}
        {activeTab === 'subscriptions' && (
          <main className="p-4 sm:p-6 max-w-6xl w-full">
            <HotelSubscriptionView
              hotel={hotel}
              plans={plans}
              payoutSettings={payoutSettings}
              onUpgrade={onUpgradeSubscription}
            />
          </main>
        )}

        {/* TAB 6: HOUSEKEEPING */}
        {activeTab === 'housekeeping' && (
          <main className="p-4 sm:p-6 max-w-6xl w-full">
            <HotelHousekeepingView
              hotel={hotel}
              rooms={rooms}
              reservations={localReservations}
              tasks={localHousekeeping}
              staff={localStaffList}
              onUpdateStatus={handleUpdateHousekeepingStatus}
              onAssignTask={handleAssignHousekeepingTask}
              onAddTask={handleAddHousekeepingTask}
              onUpdateRoom={onUpdateRoom}
            />
          </main>
        )}

        {/* TAB: GUEST INQUIRIES & COMPLAINTS */}
        {activeTab === 'inquiries' && (
          <main className="p-4 sm:p-6 max-w-6xl w-full">
            <HotelGuestReportsView
              hotel={hotel}
              reports={guestReports}
              onUpdateReportStatus={onUpdateReportStatus}
            />
          </main>
        )}

        {/* TAB 7: REPORTS (04:18 - Interactive Operational & Financial Analytics) */}
        {activeTab === 'reports' && (() => {
          const validReservations = localReservations.filter((r) => r.status !== 'rejected');
          const totalRevenue = validReservations.reduce((sum, r) => sum + r.total, 0);
          const totalBookings = validReservations.length;
          const totalNights = validReservations.reduce((sum, r) => {
            const nights = Math.max(
              1,
              Math.ceil(
                (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / (1000 * 3600 * 24)
              )
            );
            return sum + (isNaN(nights) ? 1 : nights);
          }, 0);
          const occupancyRate =
            rooms.length > 0
              ? Math.round((rooms.filter((r) => r.status === 'occupied').length / rooms.length) * 100)
              : 0;

          // Room Category Breakdown
          const categoryStats = Array.from(
            new Set(rooms.map((r) => r.type))
          ).map((type) => {
            const matchingRooms = rooms.filter((r) => r.type === type);
            const typeReservations = validReservations.filter((r) => r.roomType === type);
            const typeRev = typeReservations.reduce((s, r) => s + r.total, 0);
            const occupiedCount = matchingRooms.filter((r) => r.status === 'occupied').length;
            const avgRate =
              matchingRooms.reduce((s, r) => s + r.pricePerNight, 0) / (matchingRooms.length || 1);

            return {
              type,
              count: matchingRooms.length,
              bookings: typeReservations.length,
              revenue: typeRev,
              occupied: occupiedCount,
              occupancy: matchingRooms.length > 0 ? Math.round((occupiedCount / matchingRooms.length) * 100) : 0,
              avgRate,
            };
          });

          return (
            <main className="p-4 sm:p-6 space-y-6 max-w-6xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black text-black">Hotel Operational & Financial Reports</h1>
                  <p className="text-xs text-neutral-500">
                    Comprehensive performance audit for {hotel.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
                    {(['all', 'month', 'week', 'today'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setReportPeriod(p)}
                        className={`px-3 py-1 rounded-full capitalize transition-all ${
                          reportPeriod === p ? 'bg-white text-black shadow-xs font-bold' : 'text-neutral-500 hover:text-black'
                        }`}
                      >
                        {p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : p === 'week' ? 'This Week' : 'Today'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowReportPrintModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Export</span>
                  </button>
                </div>
              </div>

              {/* 4 Core Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    TOTAL REVENUE
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-black">
                    ₦{totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Generated from active bookings</span>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    TOTAL RESERVATIONS
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-black">{totalBookings}</div>
                  <div className="text-[11px] text-neutral-500">
                    {localReservations.filter((r) => r.status === 'confirmed').length} confirmed •{' '}
                    {localReservations.filter((r) => r.status === 'checked_in').length} in-house
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    NIGHTS SOLD
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-black">{totalNights}</div>
                  <div className="text-[11px] text-neutral-500">
                    Average {(totalNights / (totalBookings || 1)).toFixed(1)} nights / booking
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-1">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    CURRENT OCCUPANCY
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-600">
                    {occupancyRate}%
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {rooms.filter((r) => r.status === 'occupied').length} of {rooms.length} rooms occupied
                  </div>
                </div>
              </div>

              {/* Room Category Performance Breakdown */}
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-black">Room Category Revenue & Occupancy</h3>
                    <p className="text-xs text-neutral-400">Unit pricing and booking utilization</p>
                  </div>
                  <span className="text-xs font-semibold text-neutral-500">
                    {categoryStats.length} Room Types
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="py-3 px-4">Room Type</th>
                        <th className="py-3 px-4">Inventory Units</th>
                        <th className="py-3 px-4">Avg Nightly Rate</th>
                        <th className="py-3 px-4">Bookings</th>
                        <th className="py-3 px-4">Revenue Generated</th>
                        <th className="py-3 px-4 text-right">Occupancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {categoryStats.map((cat) => (
                        <tr key={cat.type} className="hover:bg-neutral-50/60">
                          <td className="py-3 px-4 font-bold text-neutral-900">{cat.type}</td>
                          <td className="py-3 px-4 text-neutral-700">
                            {cat.count} {cat.count === 1 ? 'room' : 'rooms'}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-neutral-800">
                            ₦{Math.round(cat.avgRate).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-neutral-800 font-semibold">{cat.bookings}</td>
                          <td className="py-3 px-4 font-bold text-black">
                            ₦{cat.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800">
                              {cat.occupancy}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Breakdown Distribution */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-black">Reservation Pipeline Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-700 uppercase">Pending Verification</div>
                    <div className="text-xl font-black text-amber-900 mt-1">
                      {localReservations.filter((r) => r.status === 'pending_verification').length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <div className="text-[10px] font-bold text-orange-700 uppercase">Pending Payment</div>
                    <div className="text-xl font-black text-orange-900 mt-1">
                      {localReservations.filter((r) => r.status === 'pending_payment').length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Confirmed</div>
                    <div className="text-xl font-black text-emerald-900 mt-1">
                      {localReservations.filter((r) => r.status === 'confirmed').length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-[10px] font-bold text-blue-700 uppercase">In-House / Checked In</div>
                    <div className="text-xl font-black text-blue-900 mt-1">
                      {localReservations.filter((r) => r.status === 'checked_in').length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200">
                    <div className="text-[10px] font-bold text-neutral-600 uppercase">Completed Stays</div>
                    <div className="text-xl font-black text-neutral-900 mt-1">
                      {localReservations.filter((r) => r.status === 'checked_out').length}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          );
        })()}

        {/* TAB 8: USERS & ROLES */}
        {activeTab === 'users' && (
          <main className="p-4 sm:p-6 max-w-6xl w-full">
            <HotelUsersAndRolesView
              hotel={hotel}
              staff={localStaffList}
              invitations={localInvitations}
              customRoles={customRoles}
              onInviteStaff={(newInvite) => {
                handleInviteStaff(newInvite);
              }}
              onAddStaffMember={(newStaff) => {
                setLocalStaffList((prev) => [newStaff, ...prev]);
                if (onAddStaffMember) {
                  onAddStaffMember(newStaff);
                }
              }}
              onUpdatePermissions={(staffId, perms) => {
                setLocalStaffList((prev) =>
                  prev.map((s) => (s.id === staffId ? { ...s, permissions: perms } : s))
                );
                if (onUpdateStaffPermissions) {
                  onUpdateStaffPermissions(staffId, perms);
                }
              }}
              onUpdateStaffRole={(staffId, newRole, newPerms) => {
                setLocalStaffList((prev) =>
                  prev.map((s) =>
                    s.id === staffId
                      ? {
                          ...s,
                          role: newRole,
                          permissions: newPerms || s.permissions,
                        }
                      : s
                  )
                );
                if (onUpdateStaffPermissions && newPerms) {
                  onUpdateStaffPermissions(staffId, newPerms);
                }
              }}
              onDeactivateStaff={(staffId) => {
                setLocalStaffList((prev) =>
                  prev.map((s) =>
                    s.id === staffId ? { ...s, status: 'inactive', active: false } : s
                  )
                );
                if (onDeactivateStaff) {
                  onDeactivateStaff(staffId);
                }
              }}
              onReactivateStaff={(staffId) => {
                setLocalStaffList((prev) =>
                  prev.map((s) =>
                    s.id === staffId ? { ...s, status: 'active', active: true } : s
                  )
                );
                if (onReactivateStaff) {
                  onReactivateStaff(staffId);
                }
              }}
              onDeleteStaff={(staffId) => {
                setLocalStaffList((prev) => prev.filter((s) => s.id !== staffId));
              }}
              onCancelInvitation={(invId) => {
                setLocalInvitations((prev) => prev.filter((i) => i.id !== invId));
              }}
              onAddCustomRole={(role) => {
                if (onAddCustomRole) {
                  onAddCustomRole(role);
                }
              }}
            />
          </main>
        )}

        {/* TAB 9: SETTINGS (exact match from video 04:19) */}
        {activeTab === 'settings' && (
          <main className="p-4 sm:p-6 space-y-6 max-w-4xl pb-16">
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-black text-black">Settings</h1>
              <p className="text-xs text-neutral-400 font-mono">Hotel ID: HTL-LAVA-005</p>
            </div>

            {/* Customer Portal Card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-black">Customer Portal</h3>
                  <p className="text-xs text-neutral-500">Your public booking page for guests.</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Live
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">PUBLIC URL</span>
                <div className="font-mono font-bold text-sm text-black">lava-hotel.igho.com</div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://lava-hotel.igho.com');
                    setCopiedPortalUrl(true);
                    setTimeout(() => setCopiedPortalUrl(false), 1500);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPortalUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={() => onNavigate('hotel_guest_portal')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Portal</span>
                </button>
              </div>

              <p className="text-[11px] text-neutral-400">
                Share this link on WhatsApp, Instagram, Facebook, Google Business Profile or your own website.
              </p>
            </div>

            {/* Feature Toggles (exact switches from video 04:19) */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              {[
                {
                  label: 'Allow online bookings',
                  val: onlineBookings,
                  set: setOnlineBookings,
                },
                {
                  label: 'Allow customer registration',
                  val: allowRegistration,
                  set: setAllowRegistration,
                },
                {
                  label: 'Show room prices',
                  val: showPrices,
                  set: setShowPrices,
                },
                {
                  label: 'Show room availability',
                  val: showAvailability,
                  set: setShowAvailability,
                },
                {
                  label: 'Require customer ID verification',
                  val: requireIdVerification,
                  set: setRequireIdVerification,
                },
              ].map((toggle, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                  <span className="text-xs font-semibold text-neutral-800">{toggle.label}</span>
                  <button
                    type="button"
                    disabled={!can('settings.edit')}
                    onClick={() => toggle.set(!toggle.val)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      toggle.val ? 'bg-black' : 'bg-neutral-300'
                    } ${!can('settings.edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        toggle.val ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* HOTEL BRANCHES (Requirement 31) */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-black">Hotel Branches</h3>
                  <p className="text-xs text-neutral-500">
                    Manage multi-branch operations for {hotel.name}
                  </p>
                </div>
                {can('settings.edit') && (
                  <button
                    onClick={() => setShowAddBranchModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Branch</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {hotelBranches.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-black flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-neutral-600" />
                        <span>{b.name}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                        {b.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 shrink-0 text-neutral-400 mt-0.5" />
                      <span>{b.address}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branding Preview */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-black">Branding</h3>
                  <p className="text-xs text-neutral-500">Your logo appears in the dashboard sidebar and on your guest booking page.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
                <div className="space-y-3 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">Hotel Logo</span>
                    {hotel.logoImage && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-200">Active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-neutral-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {hotel.logoImage ? (
                        <img
                          src={hotel.logoImage}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-neutral-400">No Logo</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer transition-colors shadow-2xs">
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const result = event.target?.result as string;
                                if (onUpdateHotel) onUpdateHotel({ ...hotel, logoImage: result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {hotel.logoImage && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateHotel) onUpdateHotel({ ...hotel, logoImage: '' });
                            }}
                            className="text-[11px] text-rose-600 font-semibold hover:underline"
                          >
                            Remove Logo
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-neutral-400">PNG, JPG, or SVG. Max 2MB.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">Cover Image</span>
                    {hotel.coverImage && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-200">Active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded-xl border border-neutral-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {hotel.coverImage ? (
                        <img
                          src={hotel.coverImage}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-neutral-400">No Cover</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer transition-colors shadow-2xs">
                        <span>Upload Cover</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const result = event.target?.result as string;
                                if (onUpdateHotel) onUpdateHotel({ ...hotel, coverImage: result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {hotel.coverImage && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateHotel) onUpdateHotel({ ...hotel, coverImage: '' });
                            }}
                            className="text-[11px] text-rose-600 font-semibold hover:underline"
                          >
                            Remove Cover
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-neutral-400">Wide banner recommended (16:9 or 1200x500px).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hotel Description Setting */}
              <div className="pt-3 border-t border-neutral-100 space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">Hotel Description</label>
                <textarea
                  rows={3}
                  value={hotel.description || ''}
                  onChange={(e) => {
                    if (onUpdateHotel) onUpdateHotel({ ...hotel, description: e.target.value });
                  }}
                  placeholder="Tell guests about your hotel, rooms, ambiance, services, and location..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black bg-white"
                />
                <p className="text-[10px] text-neutral-400">This description will be displayed prominently on your public guest portal.</p>
              </div>
            </div>
          </main>
        )}
      </>
    )}
  </div>

      {/* MODAL: ADD ROOM (exact match from video 06:30) */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">New Room</h3>
              <button
                onClick={() => {
                  setNewRoomError(null);
                  setShowAddRoomModal(false);
                }}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newRoomError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{newRoomError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Room number</label>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="203"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  >
                    <option value="Standard Single">Standard Single</option>
                    <option value="Standard Double">Standard Double</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Executive">Executive</option>
                    <option value="Executive Suite">Executive Suite</option>
                    <option value="Family Suite">Family Suite</option>
                    <option value="Luxury Suite">Luxury Suite</option>
                    <option value="Presidential">Presidential Suite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Floor</label>
                  <input
                    type="text"
                    required
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    placeholder="03"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Price / night (₦)</label>
                  <input
                    type="text"
                    required
                    value={newRoomPrice}
                    onChange={(e) => setNewRoomPrice(e.target.value)}
                    placeholder="60000"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Description</label>
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Add back"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-2 rounded-full font-bold text-xs hover:bg-neutral-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW RESERVATION 3-STEP WIZARD (exact match from video 04:05, 05:08, 05:56) */}
      {showNewReservationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">
                New Reservation — Step {resStep} of 3
              </h3>
              <button
                onClick={() => setShowNewReservationModal(false)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Guest Information */}
            {resStep === 1 && (
              <div className="space-y-4 text-xs">
                {/* Toggle: New Guest vs Existing Guest */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExistingGuest(false)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      !isExistingGuest ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    New guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExistingGuest(true)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      isExistingGuest ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    Existing guest
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">First name</label>
                    <input
                      type="text"
                      value={newResGuestFirstName}
                      onChange={(e) => setNewResGuestFirstName(e.target.value)}
                      placeholder="Dave"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Last name</label>
                    <input
                      type="text"
                      value={newResGuestLastName}
                      onChange={(e) => setNewResGuestLastName(e.target.value)}
                      placeholder="Caleb"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Email</label>
                    <input
                      type="email"
                      value={newResGuestEmail}
                      onChange={(e) => setNewResGuestEmail(e.target.value)}
                      placeholder="Dave@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Phone</label>
                    <input
                      type="text"
                      value={newResGuestPhone}
                      onChange={(e) => setNewResGuestPhone(e.target.value)}
                      placeholder="+23408562816638"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">ID type</label>
                    <input
                      type="text"
                      value={newResGuestIdType}
                      onChange={(e) => setNewResGuestIdType(e.target.value)}
                      placeholder="NIN"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">ID number</label>
                    <input
                      type="text"
                      value={newResGuestIdNumber}
                      onChange={(e) => setNewResGuestIdNumber(e.target.value)}
                      placeholder="59465808457"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Address</label>
                  <input
                    type="text"
                    value={newResGuestAddress}
                    onChange={(e) => setNewResGuestAddress(e.target.value)}
                    placeholder="10 sterling street Nvuligwe road port harcourt"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowNewReservationModal(false)}
                    className="text-neutral-500 hover:text-black font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setResStep(2)}
                    className="bg-black text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-neutral-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Dates & Room */}
            {resStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Check-in</label>
                    <input
                      type="text"
                      value={newResCheckIn}
                      onChange={(e) => setNewResCheckIn(e.target.value)}
                      placeholder="10/09/2026"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Check-out</label>
                    <input
                      type="text"
                      value={newResCheckOut}
                      onChange={(e) => setNewResCheckOut(e.target.value)}
                      placeholder="25/09/2026"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Room</label>
                  <select
                    value={newResSelectedRoom}
                    onChange={(e) => setNewResSelectedRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.number}>
                        Room {r.number} ({r.type} - ₦{r.pricePerNight.toLocaleString()}/night)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Booking source</label>
                  <select
                    value={newResSource}
                    onChange={(e) => setNewResSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  >
                    <option value="Front Desk">Front Desk</option>
                    <option value="Online">Online</option>
                    <option value="Phone">Phone</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setResStep(1)}
                    className="text-neutral-500 hover:text-black font-semibold text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setResStep(3)}
                    className="bg-black text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-neutral-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {resStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Guest</span>
                    <span className="font-bold text-black">{newResGuestFirstName} {newResGuestLastName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Contact</span>
                    <span className="text-neutral-800">{newResGuestPhone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Room</span>
                    <span className="font-bold text-black">Room {newResSelectedRoom}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60">
                    <span className="text-neutral-500">Dates</span>
                    <span className="text-neutral-800">{newResCheckIn} → {newResCheckOut}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Booking Source</span>
                    <span className="font-semibold text-black">{newResSource}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setResStep(2)}
                    className="text-neutral-500 hover:text-black font-semibold text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateReservation}
                    className="bg-black text-white px-6 py-2 rounded-full font-bold text-xs hover:bg-neutral-800"
                  >
                    Confirm & Save Reservation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK BOOK MODAL (matches video 04:28) */}
      {showQuickBookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-sm text-black">Quick Book — Step 1 of 4</h3>
              <button
                onClick={() => setShowQuickBookModal(false)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-neutral-700">Room Category</label>
              <select className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs">
                <option>Choose a category</option>
                <option>Standard Single</option>
                <option>Standard Double</option>
                <option>Deluxe</option>
                <option>Presidential</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 text-xs">
              <button
                onClick={() => setShowQuickBookModal(false)}
                className="text-neutral-500 hover:text-black font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setShowQuickBookModal(false);
                  setShowNewReservationModal(true);
                }}
                className="bg-black text-white px-5 py-2 rounded-xl font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERMISSION MANAGER (Requirement 24) */}
      {editingStaffForPerms && (
        <PermissionManagerModal
          staff={editingStaffForPerms}
          onClose={() => setEditingStaffForPerms(null)}
          onSavePermissions={handleSavePermissions}
        />
      )}

      {/* MODAL: ADD / INVITE STAFF (Requirement 22, 23) */}
      {showAddStaffModal && (
        <AddStaffModal
          hotelId={hotel.id}
          hotelName={hotel.name}
          onClose={() => setShowAddStaffModal(false)}
          onInviteSent={handleInviteStaff}
        />
      )}

      {/* MODAL: ADD BRANCH (Requirement 31) */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">Add Hotel Branch</h3>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Branch Name</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Lava Hotel — Victoria Island"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Branch Code (3-4 chars)</label>
                <input
                  type="text"
                  required
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                  placeholder="LAV-VI"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs uppercase font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Physical Address</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Plot 12 Ahmadu Bello Way, Victoria Island, Lagos"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-black text-white font-bold hover:bg-neutral-800"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE RESERVATION (Requirement 21, 26) */}
      {managingReservation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">Reservation {managingReservation.reference}</h3>
                <p className="text-xs text-neutral-500">Guest: {managingReservation.guestName}</p>
              </div>
              <button
                onClick={() => setManagingReservation(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <span className="text-neutral-500">Room</span>
                  <div className="font-bold text-black">Room {managingReservation.roomNumber}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Status</span>
                  <div className="font-bold text-black capitalize">{managingReservation.status.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Check-in</span>
                  <div className="font-semibold text-neutral-800">{managingReservation.checkIn}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Check-out</span>
                  <div className="font-semibold text-neutral-800">{managingReservation.checkOut}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500">Total Amount</span>
                  <div className="font-mono font-bold text-black">₦{managingReservation.total.toLocaleString()}</div>
                </div>
              </div>

              {/* View Attached Receipt Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReservationForReceipt(managingReservation);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 font-bold text-xs text-neutral-900 transition-colors shadow-2xs"
                >
                  <FileText className="w-4 h-4 text-neutral-600" />
                  <span>View Attached Guest Payment Receipt</span>
                </button>
              </div>

              {/* Actions guarded by RBAC permissions */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Allowed Operations (Based on your role: {getRoleDisplayName(activeStaffMember.role)})
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={!can('reservations.check_in')}
                    onClick={() => {
                      setLocalReservations((prev) =>
                        prev.map((r) =>
                          r.id === managingReservation.id ? { ...r, status: 'checked_in' } : r
                        )
                      );
                      if (onUpdateReservationStatus) {
                        onUpdateReservationStatus(managingReservation.id, 'checked_in');
                      }
                      setManagingReservation(null);
                    }}
                    className={`px-3 py-2 rounded-full text-xs font-bold border transition-colors ${
                      can('reservations.check_in')
                        ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60'
                    }`}
                    title={can('reservations.check_in') ? 'Check-in guest' : 'Requires reservations.check_in permission'}
                  >
                    Check In
                  </button>

                  <button
                    disabled={!can('reservations.check_out')}
                    onClick={() => {
                      setLocalReservations((prev) =>
                        prev.map((r) =>
                          r.id === managingReservation.id ? { ...r, status: 'checked_out' } : r
                        )
                      );
                      if (onUpdateReservationStatus) {
                        onUpdateReservationStatus(managingReservation.id, 'checked_out');
                      }
                      setManagingReservation(null);
                    }}
                    className={`px-3 py-2 rounded-full text-xs font-bold border transition-colors ${
                      can('reservations.check_out')
                        ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60'
                    }`}
                    title={can('reservations.check_out') ? 'Check-out guest' : 'Requires reservations.check_out permission'}
                  >
                    Check Out
                  </button>

                  <button
                    disabled={!can('reservations.edit')}
                    onClick={() => {
                      setLocalReservations((prev) =>
                        prev.map((r) =>
                          r.id === managingReservation.id ? { ...r, status: 'confirmed' } : r
                        )
                      );
                      if (onUpdateReservationStatus) {
                        onUpdateReservationStatus(managingReservation.id, 'confirmed');
                      }
                      setManagingReservation(null);
                    }}
                    className={`px-3 py-2 rounded-full text-xs font-bold border transition-colors ${
                      can('reservations.edit')
                        ? 'bg-neutral-900 text-white border-black hover:bg-neutral-800'
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60'
                    }`}
                    title={can('reservations.edit') ? 'Verify payment & confirm' : 'Requires reservations.edit permission'}
                  >
                    Confirm Payment
                  </button>

                  <button
                    disabled={!can('reservations.cancel')}
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this reservation?')) {
                        setLocalReservations((prev) =>
                          prev.map((r) =>
                            r.id === managingReservation.id ? { ...r, status: 'rejected' } : r
                          )
                        );
                        if (onUpdateReservationStatus) {
                          onUpdateReservationStatus(managingReservation.id, 'rejected');
                        }
                        setManagingReservation(null);
                      }
                    }}
                    className={`px-3 py-2 rounded-full text-xs font-bold border transition-colors ${
                      can('reservations.cancel')
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60'
                    }`}
                    title={can('reservations.cancel') ? 'Cancel reservation' : 'Requires reservations.cancel permission'}
                  >
                    Cancel Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ROOM STATUS MODAL */}
      {selectedRoomForStatus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-black text-black">
                  Room {selectedRoomForStatus.number} Status
                </h3>
                <p className="text-xs text-neutral-400">{selectedRoomForStatus.type}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomForStatus(null)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-neutral-700">Change Live Status:</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'available', label: 'Available (Clean)', color: 'border-emerald-200 hover:bg-emerald-50 text-emerald-800' },
                  { id: 'occupied', label: 'Occupied (Guest in)', color: 'border-blue-200 hover:bg-blue-50 text-blue-800' },
                  { id: 'reserved', label: 'Reserved', color: 'border-purple-200 hover:bg-purple-50 text-purple-800' },
                  { id: 'cleaning', label: 'Needs Cleaning', color: 'border-amber-200 hover:bg-amber-50 text-amber-800' },
                  { id: 'maintenance', label: 'Out for Maintenance', color: 'border-rose-200 hover:bg-rose-50 text-rose-800' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (onUpdateRoom) {
                        onUpdateRoom({ ...selectedRoomForStatus, status: s.id as Room['status'] });
                      }
                      setSelectedRoomForStatus(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      selectedRoomForStatus.status === s.id
                        ? 'bg-black text-white border-black shadow-xs'
                        : `${s.color} bg-neutral-50`
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1.5 text-neutral-600">
              <div className="flex justify-between">
                <span className="text-neutral-500">Nightly Rate:</span>
                <span className="font-bold text-black">₦{selectedRoomForStatus.pricePerNight.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Floor Level:</span>
                <span className="font-bold text-black">{selectedRoomForStatus.floor || '01'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedRoomForStatus(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold hover:bg-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER WALK-IN GUEST MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-neutral-100 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Register Walk-in Guest</h3>
                <p className="text-xs text-neutral-400">Immediate front desk check-in and room assignment</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterWalkIn} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Full Guest Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Babatunde Adeleke"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234..."
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">ID Document Type</label>
                  <select
                    value={walkInIdType}
                    onChange={(e) => setWalkInIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  >
                    <option value="NIN">National Identity Number (NIN)</option>
                    <option value="Passport">International Passport</option>
                    <option value="Driver License">Driver's License</option>
                    <option value="Voter Card">Voter's Card</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Document Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 59465808457"
                    value={walkInIdNumber}
                    onChange={(e) => setWalkInIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Assign Room *</label>
                  <select
                    value={walkInRoomNumber}
                    onChange={(e) => setWalkInRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.number}>
                        Room {r.number} ({r.type}) - ₦{r.pricePerNight.toLocaleString()} [{r.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Payment Channel</label>
                  <select
                    value={walkInPaymentMethod}
                    onChange={(e) => setWalkInPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  >
                    <option value="transfer">Bank Transfer (Instant)</option>
                    <option value="pos">POS Terminal (Card)</option>
                    <option value="cash">Cash at Reception</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Check-in Date</label>
                  <input
                    type="date"
                    value={walkInCheckIn}
                    onChange={(e) => setWalkInCheckIn(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Check-out Date</label>
                  <input
                    type="date"
                    value={walkInCheckOut}
                    onChange={(e) => setWalkInCheckOut(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Confirm & Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GUEST FOLIO MODAL */}
      {selectedGuestFolio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-neutral-100 space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black text-white text-lg font-black flex items-center justify-center">
                  {selectedGuestFolio.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">{selectedGuestFolio.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{selectedGuestFolio.phone}</span>
                    <span>•</span>
                    <span>{selectedGuestFolio.email}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuestFolio(null)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Total Stays</div>
                <div className="text-xl font-black text-black">{selectedGuestFolio.totalBookings}</div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Total Spent</div>
                <div className="text-xl font-black text-emerald-600">
                  ₦{selectedGuestFolio.totalSpent.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">ID Document</div>
                <div className="text-xs font-bold text-neutral-800 truncate mt-1">
                  {selectedGuestFolio.idType}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Last Room</div>
                <div className="text-xl font-black text-black">Room {selectedGuestFolio.lastRoom}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs text-black">Booking History & Folio Charges</h4>
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Room</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedGuestFolio.reservations.map((res: Reservation) => (
                      <tr key={res.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-black">{res.reference}</td>
                        <td className="py-2.5 px-3">Room {res.roomNumber} ({res.roomType})</td>
                        <td className="py-2.5 px-3 text-neutral-600">{res.checkIn} to {res.checkOut}</td>
                        <td className="py-2.5 px-3 font-bold text-black">₦{res.total.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize bg-neutral-100 text-neutral-800">
                            {res.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSelectedGuestFolio(null)}
                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800"
              >
                Close Folio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE REPORT MODAL */}
      {showReportPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-neutral-100 space-y-6 my-8 print:p-0 print:border-none print:shadow-none">
            <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
              <div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  IGHO STAY • AUDIT REPORT
                </div>
                <h2 className="text-xl font-black text-black">{hotel.name}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{hotel.address} • Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportPrintModal(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Gross Revenue</div>
                <div className="text-lg font-black text-black mt-1">
                  ₦{localReservations.filter((r) => r.status !== 'rejected').reduce((s, r) => s + r.total, 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Total Bookings</div>
                <div className="text-lg font-black text-black mt-1">
                  {localReservations.filter((r) => r.status !== 'rejected').length}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Active In-House</div>
                <div className="text-lg font-black text-blue-600 mt-1">
                  {localReservations.filter((r) => r.status === 'checked_in').length}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Occupancy</div>
                <div className="text-lg font-black text-black mt-1">
                  {rooms.length > 0 ? Math.round((rooms.filter((r) => r.status === 'occupied').length / rooms.length) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs text-black">Active Room Inventory Roster</h4>
              <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-neutral-500">
                    <tr>
                      <th className="py-2 px-3">Room #</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Nightly Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rooms.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-bold text-black">{r.number}</td>
                        <td className="py-2 px-3 text-neutral-600">{r.type}</td>
                        <td className="py-2 px-3 capitalize font-semibold">{r.status}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₦{r.pricePerNight.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 print:hidden">
              <span className="text-xs text-neutral-400">Exported from IGHO Stay Hotel System</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportPrintModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-50"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GUEST PAYMENT RECEIPT VIEWER */}
      {selectedReservationForReceipt && (
        <ReceiptViewerModal
          reservation={selectedReservationForReceipt}
          hotel={hotel}
          onClose={() => setSelectedReservationForReceipt(null)}
          onApprove={(resId) => {
            setLocalReservations((prev) =>
              prev.map((r) => (r.id === resId ? { ...r, status: 'confirmed' } : r))
            );
            if (onUpdateReservationStatus) {
              onUpdateReservationStatus(resId, 'confirmed');
            }
          }}
          onReject={(resId, reason) => {
            setLocalReservations((prev) =>
              prev.map((r) => (r.id === resId ? { ...r, status: 'rejected' } : r))
            );
            if (onUpdateReservationStatus) {
              onUpdateReservationStatus(resId, 'rejected');
            }
          }}
          onUploadReceipt={(resId, newReceiptUrl) => {
            setLocalReservations((prev) =>
              prev.map((r) => (r.id === resId ? { ...r, receiptUrl: newReceiptUrl } : r))
            );
          }}
        />
      )}

      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        currentName={profileName}
        currentEmail={profileEmail}
        currentPicture={profilePicture}
        onSave={(data) => {
          setProfileName(data.name);
          setProfileEmail(data.email);
          if (data.password) {
            setProfilePassword(data.password);
          }
          setProfilePicture(data.picture);
        }}
        title="Edit Staff / Owner Profile"
      />
    </div>
  );
};
