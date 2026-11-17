import { Hotel, PlanPrivileges, Room, StaffAccount, SubscriptionExceptionOverride } from '../types';

export const STARTER_PLAN_ID = 'plan-starter-30k' as const;
export const PROFESSIONAL_PLAN_ID = 'plan-complete-50k' as const;

export type PlanTierKey = 'starter' | 'professional';

export const STARTER_PRIVILEGES: PlanPrivileges = {
  hasGuestPortal: false,
  maxRooms: 20,
  maxStaff: 5,
  maxBranches: 1,
  storageQuotaGb: 10,
  backupFrequency: 'weekly',
  monthlyNotificationLimit: 100,
  frontDeskPMS: true,
  housekeeping: false,
  guestFolios: false,
  nightAudit: false,
  cashierShifts: false,
  maintenanceBlocks: false,
  customRoles: false,
  multiBranch: false,
  cautionDeposits: false,
  financialExports: true, // Basic operational billing, invoices, receipts, CSV & PDF summary exports
  advancedReports: false,
  scheduledReports: false,
  brandedReceipts: false, // Standard IGHO invoices & receipts
  publicDirectoryListing: false,
  prioritySupport: false, // Email support during business hours only
  featureRequestsAccess: true,
  prioritySla: false,
};

export const PROFESSIONAL_PRIVILEGES: PlanPrivileges = {
  hasGuestPortal: true,
  maxRooms: 60,
  maxStaff: 15,
  maxBranches: 3,
  storageQuotaGb: 50,
  backupFrequency: 'daily',
  monthlyNotificationLimit: null, // Unlimited subject to fair-use anti-abuse protections
  frontDeskPMS: true,
  housekeeping: true,
  guestFolios: true,
  nightAudit: true,
  cashierShifts: true,
  maintenanceBlocks: true,
  customRoles: true,
  multiBranch: true,
  cautionDeposits: true,
  financialExports: true,
  advancedReports: true,
  scheduledReports: true,
  brandedReceipts: true,
  publicDirectoryListing: true,
  prioritySupport: true, // Priority WhatsApp & Telephone support
  featureRequestsAccess: true,
  prioritySla: true,
};

export const PREDEFINED_STARTER_ROLES = [
  { id: 'hotel_owner', label: 'Administrator (Hotel Owner)', description: 'Full PMS, staff, subscription, and billing oversight.' },
  { id: 'manager', label: 'Hotel Manager', description: 'Operations, room inventory, bookings, and staff supervision.' },
  { id: 'receptionist', label: 'Receptionist (Front Desk)', description: 'Check-ins, check-outs, reservations, and guest directory.' },
  { id: 'finance', label: 'Cashier / Finance', description: 'Basic billing, payment recording, invoices, receipts, and reports.' },
  { id: 'housekeeping', label: 'Housekeeping Staff', description: 'Basic room cleanliness & readiness status updates.' },
] as const;

export type StaffPortalTabId =
  | 'dashboard'
  | 'reservations'
  | 'rooms'
  | 'guests'
  | 'housekeeping'
  | 'maintenance'
  | 'billing'
  | 'folios'
  | 'cashier'
  | 'night_audit'
  | 'reports'
  | 'users'
  | 'downtime'
  | 'inquiries'
  | 'feature_requests'
  | 'custom_features'
  | 'subscription'
  | 'settings';

export type NavSectionId =
  | 'overview'
  | 'front_desk'
  | 'operations'
  | 'financial'
  | 'management'
  | 'system';

export interface NavSectionConfig {
  id: NavSectionId;
  title: string;
  items: {
    id: StaffPortalTabId;
    label: string;
    perm?: string;
    proOnly?: boolean;
  }[];
}

export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: 'overview',
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', perm: 'dashboard.view' },
    ],
  },
  {
    id: 'front_desk',
    title: 'FRONT DESK',
    items: [
      { id: 'reservations', label: 'Reservations', perm: 'reservations.view' },
      { id: 'rooms', label: 'Rooms', perm: 'rooms.view' },
      { id: 'guests', label: 'Guests', perm: 'guests.view' },
      { id: 'inquiries', label: 'Guest Portal & Inquiries', perm: 'reservations.view', proOnly: true },
    ],
  },
  {
    id: 'operations',
    title: 'HOTEL OPERATIONS',
    items: [
      { id: 'housekeeping', label: 'Housekeeping', perm: 'housekeeping.view', proOnly: true },
      { id: 'maintenance', label: 'Maintenance & Blocks', perm: 'rooms.edit', proOnly: true },
    ],
  },
  {
    id: 'financial',
    title: 'FINANCIAL MANAGEMENT',
    items: [
      { id: 'billing', label: 'Billing & Invoices', perm: 'billing.view' },
      { id: 'folios', label: 'Guest Folios', perm: 'billing.view', proOnly: true },
      { id: 'cashier', label: 'Cashier Management', perm: 'billing.view', proOnly: true },
      { id: 'night_audit', label: 'Night Audit', perm: 'reports.view', proOnly: true },
    ],
  },
  {
    id: 'management',
    title: 'MANAGEMENT & REPORTING',
    items: [
      { id: 'reports', label: 'Reports', perm: 'reports.view' },
      { id: 'users', label: 'Staff Management', perm: 'users.view' },
      { id: 'downtime', label: 'Downtime & Compliance', perm: 'settings.view', proOnly: true },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    items: [
      { id: 'feature_requests', label: 'Feature Requests & Custom Development', perm: 'dashboard.view' },
      { id: 'custom_features', label: 'Custom Features & Activations', perm: 'dashboard.view' },
      { id: 'subscription', label: 'IGHO Subscription', perm: 'settings.view' },
      { id: 'settings', label: 'Settings', perm: 'settings.view' },
    ],
  },
];

export const STARTER_ALLOWED_TABS = new Set<StaffPortalTabId>([
  'dashboard',
  'reservations',
  'rooms',
  'guests',
  'billing',
  'reports',
  'users',
  'feature_requests',
  'custom_features',
  'subscription',
  'settings',
]);

export function resolveHotelPlanTier(hotel?: Partial<Hotel> | null): PlanTierKey {
  if (!hotel) return 'starter';
  const planId = String(hotel.subscriptionPlanId || '').trim().toLowerCase();
  const planName = String(hotel.subscriptionPlanName || '').trim().toLowerCase();

  if (
    planId === PROFESSIONAL_PLAN_ID ||
    planId === 'plan-3' ||
    planId.includes('complete') ||
    planId.includes('50k') ||
    planName.includes('professional') ||
    planName.includes('complete')
  ) {
    return 'professional';
  }

  return 'starter';
}

export function resolveEffectivePrivileges(
  hotel?: Partial<Hotel> | null,
  overrideException?: SubscriptionExceptionOverride | null
): PlanPrivileges {
  const tier = resolveHotelPlanTier(hotel);
  const base: PlanPrivileges =
    tier === 'professional' ? { ...PROFESSIONAL_PRIVILEGES } : { ...STARTER_PRIVILEGES };

  const ex = overrideException ?? hotel?.subscriptionException ?? null;
  if (ex) {
    const notExpired = !ex.expiresAt || new Date(ex.expiresAt).getTime() > Date.now();
    if (notExpired) {
      if (typeof ex.maxRoomsOverride === 'number' && ex.maxRoomsOverride > 0) {
        base.maxRooms = ex.maxRoomsOverride;
      }
      if (typeof ex.maxStaffOverride === 'number' && ex.maxStaffOverride > 0) {
        base.maxStaff = ex.maxStaffOverride;
      }
      if (typeof ex.maxBranchesOverride === 'number' && ex.maxBranchesOverride > 0) {
        base.maxBranches = ex.maxBranchesOverride;
        if (ex.maxBranchesOverride > 1) {
          base.multiBranch = true;
        }
      }
      if (typeof ex.storageQuotaGbOverride === 'number' && ex.storageQuotaGbOverride > 0) {
        base.storageQuotaGb = ex.storageQuotaGbOverride;
      }
    }
  }

  return base;
}

export function isTabAllowedForHotel(tabId: StaffPortalTabId, hotel?: Partial<Hotel> | null): boolean {
  const tier = resolveHotelPlanTier(hotel);
  if (tier === 'professional') return true;
  return STARTER_ALLOWED_TABS.has(tabId);
}

export interface SubscriptionComplianceSummary {
  tier: PlanTierKey;
  isOverLimit: boolean;
  roomsUsed: number;
  maxRooms: number;
  roomsOverBy: number;
  activeStaffUsed: number;
  maxStaff: number;
  staffOverBy: number;
  branchesUsed: number;
  maxBranches: number;
  branchesOverBy: number;
  reasons: string[];
}

export function calculateSubscriptionCompliance(
  hotel: Partial<Hotel> | null | undefined,
  rooms: Room[] = [],
  staff: StaffAccount[] = [],
  overrideException?: SubscriptionExceptionOverride | null
): SubscriptionComplianceSummary {
  const tier = resolveHotelPlanTier(hotel);
  const privs = resolveEffectivePrivileges(hotel, overrideException);
  const hotelId = hotel?.id;

  const hotelRooms = hotelId ? rooms.filter((r) => !r.hotelId || r.hotelId === hotelId) : rooms;
  const roomsUsed = hotelRooms.length;

  const activeStaff = hotelId
    ? staff.filter(
        (s) => (!s.hotelId || s.hotelId === hotelId) && s.status !== 'deactivated' && s.active !== false
      )
    : staff.filter((s) => s.status !== 'deactivated' && s.active !== false);
  const activeStaffUsed = activeStaff.length;

  const branchesList = Array.isArray(hotel?.branches) ? hotel!.branches! : [];
  const branchesUsed = Math.max(1, branchesList.filter((b) => b.isActive !== false).length || 1);

  const roomsOverBy = Math.max(0, roomsUsed - privs.maxRooms);
  const staffOverBy = Math.max(0, activeStaffUsed - privs.maxStaff);
  const branchesOverBy = Math.max(0, branchesUsed - privs.maxBranches);

  const reasons: string[] = [];
  if (roomsOverBy > 0) {
    reasons.push(
      `Rooms (${roomsUsed}/${privs.maxRooms}): Exceeds ${tier === 'starter' ? 'Starter' : 'Professional'} limit by ${roomsOverBy}. Existing rooms remain preserved, but adding new rooms is blocked.`
    );
  }
  if (staffOverBy > 0) {
    reasons.push(
      `Active Staff (${activeStaffUsed}/${privs.maxStaff}): Exceeds ${tier === 'starter' ? 'Starter' : 'Professional'} limit by ${staffOverBy}. Existing staff remain preserved, but inviting or activating more staff is blocked.`
    );
  }
  if (branchesOverBy > 0) {
    reasons.push(
      `Properties / Branches (${branchesUsed}/${privs.maxBranches}): Exceeds ${tier === 'starter' ? 'Starter' : 'Professional'} limit by ${branchesOverBy}. Existing properties remain preserved, but adding new properties is blocked.`
    );
  }

  return {
    tier,
    isOverLimit: roomsOverBy > 0 || staffOverBy > 0 || branchesOverBy > 0,
    roomsUsed,
    maxRooms: privs.maxRooms,
    roomsOverBy,
    activeStaffUsed,
    maxStaff: privs.maxStaff,
    staffOverBy,
    branchesUsed,
    maxBranches: privs.maxBranches,
    branchesOverBy,
    reasons,
  };
}

export function formatHotelId(id?: string | null): string {
  if (!id) return 'IGHO-HTL-NEW';
  const clean = String(id).trim();
  if (clean === 'hotel-lava') return 'IGHO-HTL-LAVA01';
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length >= 6) {
    return `IGHO-HTL-${digits.slice(-6)}`;
  }
  return `IGHO-HTL-${clean.replace(/^hotel-/i, '').toUpperCase().slice(0, 8) || '001'}`;
}

export function slugifyHotelName(name?: string | null): string {
  const base = String(name || 'hotel')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'hotel';
}

export function getHotelSubdomainUrl(hotel?: Partial<Hotel> | null): string {
  const slug = hotel?.slug || slugifyHotelName(hotel?.name);
  return `${slug}.igho.com.ng`;
}
