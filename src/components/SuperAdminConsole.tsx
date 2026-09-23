import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Shield,
  Menu,
  X,
  ExternalLink,
  Building2,
  Lock,
  ArrowLeft,
  ChevronRight,
  Bell,
  Search,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import {
  ActiveScreen,
  Hotel,
  Room,
  Reservation,
  StaffAccount,
  CustomerFeedback,
  HotelSubscription,
  SubscriptionPlan,
  PlatformTransaction,
  PlatformAuditLog,
  PlatformUser,
  PlatformProduct,
  PlatformSettings,
} from '../types';
import {
  INITIAL_PLANS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PLATFORM_USERS,
  INITIAL_PRODUCTS,
  INITIAL_PLATFORM_SETTINGS,
} from '../data/platformData';
import { INITIAL_FEEDBACK as INITIAL_FEEDBACKS } from '../data/mockData';

import { ConsoleSidebar, ConsoleTab } from './console/ConsoleSidebar';
import { ConsoleDashboardView } from './console/ConsoleDashboardView';
import { ConsoleHotelsView } from './console/ConsoleHotelsView';
import { ConsoleSchoolsView } from './console/ConsoleSchoolsView';
import { ConsoleHospitalsView } from './console/ConsoleHospitalsView';
import { ConsoleRegistrationsView } from './console/ConsoleRegistrationsView';
import { ConsoleUsersView } from './console/ConsoleUsersView';
import { ConsoleSubscriptionsView } from './console/ConsoleSubscriptionsView';
import { ConsoleFinanceView } from './console/ConsoleFinanceView';
import { ConsoleAnalyticsView } from './console/ConsoleAnalyticsView';
import { ConsoleReviewsView } from './console/ConsoleReviewsView';
import { ConsoleProductsView } from './console/ConsoleProductsView';
import { ConsoleSettingsView } from './console/ConsoleSettingsView';
import { ConsoleAuditLogsView } from './console/ConsoleAuditLogsView';
import { EditProfileModal } from './common/EditProfileModal';

interface SuperAdminConsoleProps {
  currentUserEmail?: string;
  hotels: Hotel[];
  rooms?: Room[];
  reservations?: Reservation[];
  staff?: StaffAccount[];
  plans?: SubscriptionPlan[];
  settings?: PlatformSettings;
  onNavigate: (screen: ActiveScreen) => void;
  onSelectHotel?: (hotel: Hotel) => void;
  onUpdateHotels?: (hotels: Hotel[]) => void;
  onUpdatePlans?: (plans: SubscriptionPlan[]) => void;
  onUpdateSettings?: (settings: PlatformSettings) => void;
}

export const SuperAdminConsole: React.FC<SuperAdminConsoleProps> = ({
  currentUserEmail = 'rumeobire@gmail.com',
  hotels: initialHotels,
  rooms = [],
  reservations = [],
  staff = [],
  plans: initialPassedPlans,
  settings: initialPassedSettings,
  onNavigate,
  onSelectHotel,
  onUpdateHotels,
  onUpdatePlans,
  onUpdateSettings,
}) => {
  // Current user identity
  const [activeUserEmail, setActiveUserEmail] = useState<string>(currentUserEmail);
  const isAuthorized = activeUserEmail.toLowerCase() === 'rumeobire@gmail.com';

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<ConsoleTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);

  // User Profile States
  const [profileName, setProfileName] = useState<string>('Rume Obire');
  const [profileEmail, setProfileEmail] = useState<string>(currentUserEmail || 'rumeobire@gmail.com');
  const [profilePassword, setProfilePassword] = useState<string>('••••••••');
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);

  // Platform local states
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
  const [subscriptions, setSubscriptions] = useState<HotelSubscription[]>(INITIAL_SUBSCRIPTIONS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPassedPlans || INITIAL_PLANS);
  const [transactions, setTransactions] = useState<PlatformTransaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>(INITIAL_AUDIT_LOGS);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>(INITIAL_PLATFORM_USERS);
  const [products] = useState<PlatformProduct[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<PlatformSettings>(initialPassedSettings || INITIAL_PLATFORM_SETTINGS);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>(INITIAL_FEEDBACKS as CustomerFeedback[]);

  // Helper to record immutable audit log entry
  const recordAuditLog = (
    action: PlatformAuditLog['action'],
    target: string,
    targetType: PlatformAuditLog['targetType'],
    metadata?: Record<string, any>,
    previousValue?: string,
    newValue?: string
  ) => {
    const now = new Date();
    const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const newLog: PlatformAuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorEmail: activeUserEmail,
      action,
      target,
      targetType,
      timestamp: timestampStr,
      metadata,
      previousValue,
      newValue,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Synchronize hotels to parent if onUpdateHotels passed
  const updateHotelsList = (newHotels: Hotel[]) => {
    setHotels(newHotels);
    if (onUpdateHotels) {
      onUpdateHotels(newHotels);
    }
  };

  // 1. APPROVE HOTEL
  const handleApproveHotel = (hotelId: string) => {
    const target = hotels.find((h) => h.id === hotelId);
    if (!target) return;

    const updated = hotels.map((h) =>
      h.id === hotelId
        ? {
            ...h,
            isLive: true,
            status: 'active' as const,
            approvalStatus: 'approved' as const,
            reviewedBy: 'Super Admin',
            reviewedAt: new Date().toISOString(),
          }
        : h
    );
    updateHotelsList(updated);

    // Create / activate subscription
    setSubscriptions((prev) => [
      {
        id: `sub-${Date.now()}`,
        hotelId: target.id,
        hotelName: target.name,
        planId: 'plan-starter',
        planName: 'Starter Tier',
        status: 'trial',
        amount: 45000,
        billingCycle: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        renewalDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        trialEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        paymentStatus: 'pending',
      },
      ...prev,
    ]);

    recordAuditLog(
      'APPROVE_HOTEL',
      `${target.name} (${target.id})`,
      'hotel',
      { rooms: target.roomCount, city: target.city, state: target.state },
      'status: pending, approvalStatus: pending, isLive: false',
      'status: active, approvalStatus: approved, isLive: true'
    );
  };

  // 2. REJECT HOTEL
  const handleRejectHotel = (hotelId: string, reason: string) => {
    const target = hotels.find((h) => h.id === hotelId);
    if (!target) return;

    const updated = hotels.map((h) =>
      h.id === hotelId
        ? {
            ...h,
            isLive: false,
            status: 'rejected' as const,
            approvalStatus: 'rejected' as const,
            rejectionReason: reason,
            reviewedBy: 'Super Admin',
            reviewedAt: new Date().toISOString(),
          }
        : h
    );
    updateHotelsList(updated);

    recordAuditLog(
      'REJECT_HOTEL',
      `${target.name} (${target.id})`,
      'hotel',
      { reason, city: target.city },
      'approvalStatus: pending',
      `approvalStatus: rejected (Reason: ${reason})`
    );
  };

  // 3. SUSPEND HOTEL
  const handleSuspendHotel = (hotelId: string, reason: string) => {
    const target = hotels.find((h) => h.id === hotelId);
    if (!target) return;

    const updated = hotels.map((h) =>
      h.id === hotelId ? ({ ...h, isSuspended: true, suspensionReason: reason } as Hotel) : h
    );
    updateHotelsList(updated);

    // Also update subscription status to suspended
    setSubscriptions((prev) =>
      prev.map((s) => (s.hotelId === hotelId ? { ...s, status: 'suspended' } : s))
    );

    recordAuditLog(
      'SUSPEND_HOTEL',
      `${target.name} (${target.id})`,
      'hotel',
      { reason },
      'isSuspended: false',
      `isSuspended: true (Reason: ${reason})`
    );
  };

  // 4. REACTIVATE HOTEL
  const handleReactivateHotel = (hotelId: string) => {
    const target = hotels.find((h) => h.id === hotelId);
    if (!target) return;

    const updated = hotels.map((h) =>
      h.id === hotelId ? ({ ...h, isSuspended: false } as Hotel) : h
    );
    updateHotelsList(updated);

    setSubscriptions((prev) =>
      prev.map((s) => (s.hotelId === hotelId ? { ...s, status: 'active' } : s))
    );

    recordAuditLog(
      'REACTIVATE_HOTEL',
      `${target.name} (${target.id})`,
      'hotel',
      {},
      'isSuspended: true',
      'isSuspended: false'
    );
  };

  // 5. DELETE HOTEL (Soft delete / deactivation protection)
  const handleDeleteHotel = (hotelId: string) => {
    const target = hotels.find((h) => h.id === hotelId);
    if (!target) return;

    const updated = hotels.filter((h) => h.id !== hotelId);
    updateHotelsList(updated);

    setSubscriptions((prev) => prev.filter((s) => s.hotelId !== hotelId));

    recordAuditLog(
      'DELETE_HOTEL',
      `${target.name} (${target.id})`,
      'hotel',
      { rooms: target.roomCount },
      'status: active',
      'status: deleted'
    );
  };

  // 6. USER ROLE CHANGE
  const handleChangeUserRole = (userId: string, newRole: any, orgId?: string) => {
    const target = platformUsers.find((u) => u.id === userId);
    if (!target) return;

    const org = hotels.find((h) => h.id === orgId);

    setPlatformUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: newRole,
              organizationId: orgId,
              organizationName: org ? org.name : undefined,
            }
          : u
      )
    );

    recordAuditLog(
      'CHANGE_ROLE',
      `${target.name} (${target.email})`,
      'user',
      { organization: org?.name || 'Unassigned' },
      `role: ${target.role}`,
      `role: ${newRole}`
    );
  };

  // 7. USER STATUS TOGGLE (Deactivate / Activate)
  const handleToggleUserStatus = (userId: string, newStatus: 'active' | 'deactivated') => {
    const target = platformUsers.find((u) => u.id === userId);
    if (!target) return;

    setPlatformUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );

    recordAuditLog(
      newStatus === 'active' ? 'REACTIVATE_USER' : 'DEACTIVATE_USER',
      `${target.name} (${target.email})`,
      'user',
      {},
      `status: ${target.status}`,
      `status: ${newStatus}`
    );
  };

  // 8. CHANGE SUBSCRIPTION PRICE
  const handleChangePlanPrice = (
    planId: string,
    newMonthlyPrice: number,
    newAnnualPrice: number,
    reason: string
  ) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const prevMonthly = plan.monthlyPrice;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, monthlyPrice: newMonthlyPrice, annualPrice: newAnnualPrice } : p
      )
    );

    recordAuditLog(
      'CHANGE_SUBSCRIPTION_PRICE',
      `${plan.name} (${plan.id})`,
      'subscription',
      { reason, newAnnualPrice },
      `monthlyPrice: ₦${prevMonthly.toLocaleString()}`,
      `monthlyPrice: ₦${newMonthlyPrice.toLocaleString()}`
    );
  };

  // 9. UPDATE SUBSCRIPTION STATUS
  const handleUpdateSubscriptionStatus = (subId: string, status: any, paymentStatus: any) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status, paymentStatus } : s))
    );
  };

  // 10. ISSUE REFUND
  const handleIssueRefund = (transactionId: string, reason: string) => {
    const txn = transactions.find((t) => t.id === transactionId);
    if (!txn) return;

    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, paymentStatus: 'refunded' } : t))
    );

    recordAuditLog(
      'REFUND_PAYMENT',
      `${txn.reference} (${txn.hotelName})`,
      'subscription',
      { amount: txn.amount, reason },
      'paymentStatus: successful',
      'paymentStatus: refunded'
    );
  };

  // 11. SAVE PLATFORM SETTINGS
  const handleSaveSettings = (newSettings: PlatformSettings) => {
    setSettings(newSettings);
    recordAuditLog(
      'UPDATE_PLATFORM_SETTING',
      'Platform Global Configuration',
      'setting',
      { updatedBy: activeUserEmail },
      'previousSettings',
      'updatedSettings'
    );
  };

  // 12. UPDATE COMPLAINT STATUS
  const handleUpdateFeedbackStatus = (feedbackId: string, status: any, resolutionNotes?: string) => {
    const fb = feedbacks.find((f) => f.id === feedbackId);
    if (!fb) return;

    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId
          ? {
              ...f,
              status,
              resolutionNotes,
              resolvedAt:
                status === 'resolved' || status === 'closed'
                  ? new Date().toISOString().split('T')[0]
                  : undefined,
            }
          : f
      )
    );

    recordAuditLog(
      'RESOLVE_COMPLAINT',
      `Feedback Case ${feedbackId} (${fb.hotelName})`,
      'complaint',
      { status, notes: resolutionNotes },
      `status: ${fb.status}`,
      `status: ${status}`
    );
  };

  // Consolidate all system accounts: Owners, Staff, and Regular Users (Guests)
  const allSystemUsers: PlatformUser[] = React.useMemo(() => {
    const list: PlatformUser[] = [...platformUsers];

    // 1. Add hotel owners
    hotels.forEach((h) => {
      const ownerEmail = h.contactEmail || `owner@${h.id}.com`;
      if (!list.some((u) => u.email.toLowerCase() === ownerEmail.toLowerCase())) {
        list.push({
          id: `owner-${h.id}`,
          name: h.ownerName || `${h.name} Owner`,
          email: ownerEmail,
          role: 'hotel_owner',
          organizationId: h.id,
          organizationName: h.name,
          status: h.isSuspended ? 'suspended' : 'active',
          createdAt: h.joinedDate || '2026-09-01',
          lastActivity: 'Active on PMS',
        });
      }
    });

    // 2. Add staff members
    staff.forEach((s) => {
      if (!list.some((u) => u.email.toLowerCase() === s.email.toLowerCase())) {
        const hotel = hotels.find((h) => h.id === s.hotelId);
        list.push({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role as any,
          organizationId: s.hotelId,
          organizationName: hotel?.name || 'Hotel Staff Member',
          status: s.status === 'active' ? 'active' : 'suspended',
          createdAt: s.addedDate || '2026-09-01',
          lastActivity: 'Staff PMS Access',
        });
      }
    });

    // 3. Add regular guest / customer users from reservations
    reservations.forEach((r) => {
      const guestEmail = r.guestEmail;
      if (guestEmail && !list.some((u) => u.email.toLowerCase() === guestEmail.toLowerCase())) {
        list.push({
          id: `guest-${r.id.slice(0, 8)}`,
          name: `${r.guestFirstName || 'Guest'} ${r.guestLastName || ''}`.trim() || 'Verified Guest',
          email: guestEmail,
          role: 'customer',
          organizationName: 'Guest Portal / IGHO Stay',
          status: 'active',
          createdAt: r.createdAt ? r.createdAt.split('T')[0] : '2026-09-10',
          lastActivity: r.checkedIn ? 'Checked In' : 'Reservation Created',
        });
      }
    });

    return list;
  }, [platformUsers, hotels, staff, reservations]);

  // Counters for badges in sidebar
  const pendingRegistrationsCount = hotels.filter(
    (h) => h.approvalStatus === 'pending' || !h.isLive
  ).length;
  const openComplaintsCount = feedbacks.filter(
    (f) => f.type === 'complaint' && f.status !== 'resolved' && f.status !== 'closed'
  ).length;

  // STRICT ACCESS CONTROL SCREEN (Section 2, 3, 30)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-900 text-xs font-mono font-bold">
              <span>UNAUTHORIZED ACCESS</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Super Admin Authorization Required
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The <strong>IGHO Console</strong> is the internal ecosystem management system. It is strictly restricted to the platform Super Admin identity:
              <br />
              <code className="text-white font-mono bg-neutral-950 px-2 py-0.5 rounded mt-1 inline-block">
                rumeobire@gmail.com
              </code>
            </p>
          </div>

          <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-left text-xs space-y-1">
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">
              Current Authenticated Session:
            </span>
            <div className="font-mono text-neutral-300 truncate">{activeUserEmail}</div>
            <span className="text-[10px] text-amber-400 font-medium block">
              Role: Tenant / Staff / Customer
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => setActiveUserEmail('rumeobire@gmail.com')}
              className="w-full py-3 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
            >
              Sign In as Super Admin (rumeobire@gmail.com)
            </button>

            <button
              onClick={() => onNavigate('staff_portal')}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              Return to Hotel Staff PMS
            </button>

            <button
              onClick={() => onNavigate('landing')}
              className="w-full py-2 text-neutral-400 hover:text-white text-xs transition-colors"
            >
              ← Back to IGHO Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHORIZED CONSOLE INTERFACE (Section 4, 5, 6 - 31)
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex font-sans overflow-x-hidden relative">
      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            />
            
            {/* Sidebar Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed top-0 bottom-0 left-0 z-50 md:hidden"
            >
              <ConsoleSidebar
                currentTab={currentTab}
                onSelectTab={(tab) => {
                  setCurrentTab(tab);
                  setMobileMenuOpen(false); // Auto-close drawer on click
                }}
                pendingRegistrationsCount={pendingRegistrationsCount}
                openComplaintsCount={openComplaintsCount}
                currentUserEmail={activeUserEmail}
                onNavigate={onNavigate}
                onSwitchPersona={(email) => setActiveUserEmail(email)}
                isCollapsed={false} // Keep expanded for maximum readability inside drawer
                onToggleCollapse={() => setMobileMenuOpen(false)} // Clicking collapse closes drawer on mobile
                isMobile={true}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Persistent Sidebar (Always visible on left on Desktop, completely side-by-side) */}
      <ConsoleSidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        pendingRegistrationsCount={pendingRegistrationsCount}
        openComplaintsCount={openComplaintsCount}
        currentUserEmail={activeUserEmail}
        onNavigate={onNavigate}
        onSwitchPersona={(email) => setActiveUserEmail(email)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area (Naturally side-by-side with no fixed overlap) */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 transition-all duration-300 ease-in-out">
        {/* Top Floating Navbar Capsule */}
        <div className="pt-4 px-4 sm:px-8">
          <header className="bg-white border border-neutral-200/80 shadow-xs rounded-full px-5 py-2 flex items-center justify-between gap-4 text-neutral-900">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Minimalist Indicator when Sidebar is Collapsed / on mobile */}
              {(sidebarCollapsed || mobileMenuOpen || true) && (
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-black">IGHO</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-xs text-[#10b981] font-bold">Console</span>
                </div>
              )}
            </div>

            {/* Center Search Input */}
            <div className="flex-1 max-w-xl relative hidden md:block">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search organizations, users, or metrics..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-10 pr-4 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>

            {/* Right User & Notifications Cluster */}
            <div className="flex items-center gap-3">
              {/* Notification Bell with Pill Badge */}
              <button className="relative p-2 text-neutral-400 hover:text-black hover:bg-neutral-50 rounded-full transition-all">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
                  {pendingRegistrationsCount}
                </span>
              </button>

              {/* User Profile Info with interactive Dropdown Menu */}
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
                      {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-bold text-neutral-900">{profileName}</div>
                    <div className="text-[9px] text-[#10b981] font-extrabold uppercase tracking-wider">Super Admin</div>
                  </div>
                </button>

                {profileDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200/80 shadow-xl py-2 z-50 text-xs text-neutral-800">
                      <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center gap-2.5">
                        {profilePicture ? (
                          <img src={profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                            {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate">{profileName}</p>
                          <p className="text-[10px] text-neutral-500 font-mono truncate">{profileEmail}</p>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setCurrentTab('settings');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-2.5 text-neutral-700 hover:text-black font-semibold"
                        >
                          <Settings className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Console Settings</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditProfileOpen(true);
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-2.5 text-neutral-700 hover:text-black font-semibold"
                        >
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Edit Profile</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
        </div>

        {/* Dynamic Section View with Floating Card Foundations */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1600px] w-full mx-auto space-y-6 bg-neutral-50 text-neutral-900">
          {currentTab === 'dashboard' && (
            <ConsoleDashboardView
              hotels={hotels}
              reservations={reservations}
              subscriptions={subscriptions}
              transactions={transactions}
              auditLogs={auditLogs}
              users={platformUsers}
              products={products}
              onSelectTab={(tab) => setCurrentTab(tab)}
              onInspectHotel={(hotel) => {
                if (onSelectHotel) onSelectHotel(hotel);
              }}
            />
          )}

          {currentTab === 'hotels' && (
            <ConsoleHotelsView
              hotels={hotels}
              rooms={rooms}
              reservations={reservations}
              staff={staff}
              subscriptions={subscriptions}
              auditLogs={auditLogs}
              onSuspendHotel={handleSuspendHotel}
              onReactivateHotel={handleReactivateHotel}
              onDeleteHotel={handleDeleteHotel}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'schools' && (
            <ConsoleSchoolsView onNavigateBreadcrumb={() => setCurrentTab('dashboard')} />
          )}

          {currentTab === 'hospitals' && (
            <ConsoleHospitalsView onNavigateBreadcrumb={() => setCurrentTab('dashboard')} />
          )}

          {currentTab === 'registrations' && (
            <ConsoleRegistrationsView
              hotels={hotels}
              onApproveHotel={handleApproveHotel}
              onRejectHotel={handleRejectHotel}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'users' && (
            <ConsoleUsersView
              users={allSystemUsers}
              hotels={hotels}
              onChangeUserRole={handleChangeUserRole}
              onToggleUserStatus={handleToggleUserStatus}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'subscriptions' && (
            <ConsoleSubscriptionsView
              subscriptions={subscriptions}
              plans={plans}
              hotels={hotels}
              settings={settings}
              onUpdateSettings={(newSettings) => {
                setSettings(newSettings);
                if (onUpdateSettings) onUpdateSettings(newSettings);
              }}
              onChangePlanPrice={(planId, newMonthlyPrice, newAnnualPrice, reason) => {
                handleChangePlanPrice(planId, newMonthlyPrice, newAnnualPrice, reason);
                if (onUpdatePlans) {
                  const updated = plans.map(p => p.id === planId ? { ...p, monthlyPrice: newMonthlyPrice, annualPrice: newAnnualPrice } : p);
                  onUpdatePlans(updated);
                }
              }}
              onUpdatePlans={(newPlans) => {
                setPlans(newPlans);
                if (onUpdatePlans) onUpdatePlans(newPlans);
              }}
              onUpdateSubscriptionStatus={handleUpdateSubscriptionStatus}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'finance' && (
            <ConsoleFinanceView
              transactions={transactions}
              onIssueRefund={handleIssueRefund}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'analytics' && (
            <ConsoleAnalyticsView
              hotels={hotels}
              reservations={reservations}
              subscriptions={subscriptions}
              transactions={transactions}
              users={platformUsers}
              products={products}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'reviews' && (
            <ConsoleReviewsView
              feedbacks={feedbacks}
              hotels={hotels}
              onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'products' && (
            <ConsoleProductsView
              products={products}
              onNavigate={onNavigate}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'settings' && (
            <ConsoleSettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'audit' && (
            <ConsoleAuditLogsView
              auditLogs={auditLogs}
              onNavigateBreadcrumb={() => setCurrentTab('dashboard')}
            />
          )}
        </main>
      </div>

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
        title="Edit Console Admin Profile"
      />
    </div>
  );
};
