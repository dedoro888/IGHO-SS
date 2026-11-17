import { PermissionId, StaffRole, StaffAccount } from '../types';

export interface PermissionGroup {
  module: string;
  label: string;
  description: string;
  permissions: {
    id: PermissionId;
    action: string;
    description: string;
  }[];
}

export const PERMISSION_CATALOGUE: PermissionGroup[] = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    description: 'Overview of operational metrics, daily check-ins and revenue',
    permissions: [
      { id: 'dashboard.view', action: 'View', description: 'View dashboard metrics, KPI tiles and live room grid' },
    ],
  },
  {
    module: 'reservations',
    label: 'Reservations',
    description: 'Guest bookings, calendar scheduling, and check-in / check-out',
    permissions: [
      { id: 'reservations.view', action: 'View', description: 'View reservation calendar, table and details' },
      { id: 'reservations.create', action: 'Create', description: 'Create new reservations and quick-book rooms' },
      { id: 'reservations.edit', action: 'Edit', description: 'Modify reservation dates, room assignments, and guest info' },
      { id: 'reservations.cancel', action: 'Cancel', description: 'Cancel existing bookings' },
      { id: 'reservations.check_in', action: 'Check-in', description: 'Process guest check-in arrival' },
      { id: 'reservations.check_out', action: 'Check-out', description: 'Process guest check-out departure' },
    ],
  },
  {
    module: 'rooms',
    label: 'Rooms',
    description: 'Room inventory, categories, pricing, and maintenance status',
    permissions: [
      { id: 'rooms.view', action: 'View', description: 'View room listings and current statuses' },
      { id: 'rooms.create', action: 'Create', description: 'Add new rooms and units to inventory' },
      { id: 'rooms.edit', action: 'Edit', description: 'Update room rates, photos, amenities and floor details' },
      { id: 'rooms.delete', action: 'Delete', description: 'Delete rooms from hotel inventory' },
    ],
  },
  {
    module: 'guests',
    label: 'Guests',
    description: 'Customer profiles, identification records, and stay history',
    permissions: [
      { id: 'guests.view', action: 'View', description: 'View guest records and contact information' },
      { id: 'guests.create', action: 'Create', description: 'Register new guests manually' },
      { id: 'guests.edit', action: 'Edit', description: 'Update guest identification, phone, or address' },
      { id: 'guests.delete', action: 'Delete', description: 'Delete guest profiles' },
    ],
  },
  {
    module: 'billing',
    label: 'Billing',
    description: 'Invoices, payment verification, folios, and refunds',
    permissions: [
      { id: 'billing.view', action: 'View', description: 'View transactions, invoices, and payments' },
      { id: 'billing.create', action: 'Create', description: 'Record payments and issue invoices' },
      { id: 'billing.edit', action: 'Edit', description: 'Edit line items and apply discounts' },
      { id: 'billing.delete', action: 'Delete', description: 'Void or delete billing records' },
      { id: 'billing.refund', action: 'Refund', description: 'Process customer transaction refunds' },
    ],
  },
  {
    module: 'housekeeping',
    label: 'Housekeeping',
    description: 'Room cleaning assignments, inspection, and maintenance',
    permissions: [
      { id: 'housekeeping.view', action: 'View', description: 'View housekeeping roster and room statuses' },
      { id: 'housekeeping.create', action: 'Create', description: 'Create and assign cleaning tasks' },
      { id: 'housekeeping.edit', action: 'Edit', description: 'Update cleaning status (e.g. In Progress, Completed)' },
      { id: 'housekeeping.delete', action: 'Delete', description: 'Delete housekeeping tasks' },
    ],
  },
  {
    module: 'reports',
    label: 'Reports',
    description: 'Occupancy statistics, revenue trends, and operational summaries',
    permissions: [
      { id: 'reports.view', action: 'View', description: 'View financial and operational reports' },
      { id: 'reports.export', action: 'Export', description: 'Export reports as PDF or spreadsheet' },
    ],
  },
  {
    module: 'users',
    label: 'Users & Staff',
    description: 'Staff directory, role assignments, and permission management',
    permissions: [
      { id: 'users.view', action: 'View', description: 'View staff directory and member profiles' },
      { id: 'users.invite', action: 'Invite', description: 'Send invitations to new staff members' },
      { id: 'users.edit', action: 'Edit', description: 'Modify staff roles and granular permissions' },
      { id: 'users.deactivate', action: 'Deactivate', description: 'Deactivate or remove staff accounts' },
    ],
  },
  {
    module: 'settings',
    label: 'Settings',
    description: 'Hotel policies, booking toggles, branding, and staff access',
    permissions: [
      { id: 'settings.view', action: 'View', description: 'View hotel configuration and settings' },
      { id: 'settings.edit', action: 'Edit', description: 'Update hotel settings, policies, and branding' },
    ],
  },
];

export const ALL_PERMISSION_IDS: PermissionId[] = PERMISSION_CATALOGUE.flatMap((g) =>
  g.permissions.map((p) => p.id)
);

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, PermissionId[]> = {
  hotel_owner: ALL_PERMISSION_IDS,
  manager: [
    'dashboard.view',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'reservations.check_in',
    'reservations.check_out',
    'rooms.view',
    'rooms.create',
    'rooms.edit',
    'guests.view',
    'guests.create',
    'guests.edit',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.refund',
    'housekeeping.view',
    'housekeeping.create',
    'housekeeping.edit',
    'housekeeping.delete',
    'reports.view',
    'reports.export',
    'users.view',
    'users.invite',
    'users.edit',
    'settings.view',
  ],
  receptionist: [
    'dashboard.view',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.check_in',
    'reservations.check_out',
    'rooms.view',
    'guests.view',
    'guests.create',
    'guests.edit',
    'billing.view',
    'billing.create',
    'housekeeping.view',
  ],
  finance: [
    'dashboard.view',
    'reservations.view',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.refund',
    'reports.view',
    'reports.export',
  ],
  housekeeping: [
    'dashboard.view',
    'rooms.view',
    'housekeeping.view',
    'housekeeping.create',
    'housekeeping.edit',
  ],
};

/**
 * Checks if a staff member has a given permission.
 * Requirement 27: 'hotel_owner' automatically receives full access to everything.
 */
export function hasPermission(
  staff: StaffAccount | null | undefined,
  permission: PermissionId
): boolean {
  if (!staff) return false;
  if (!staff.active || staff.status === 'deactivated') return false;
  if (staff.role === 'hotel_owner') return true;

  if (Array.isArray(staff.permissions) && staff.permissions.length > 0) {
    return staff.permissions.includes(permission);
  }

  // Fallback to default role permissions
  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[staff.role];
  return roleDefaults ? roleDefaults.includes(permission) : false;
}

export function getRoleDisplayName(role: StaffRole): string {
  switch (role) {
    case 'hotel_owner':
      return 'Hotel Owner';
    case 'manager':
      return 'Manager';
    case 'receptionist':
      return 'Receptionist';
    case 'finance':
      return 'Finance';
    case 'housekeeping':
      return 'Housekeeping';
    default:
      return role;
  }
}
