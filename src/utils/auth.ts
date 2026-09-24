import { ActiveScreen, CustomerProfile } from '../types';

export type IghoRole =
  | 'super_admin'
  | 'hotel_owner'
  | 'hotel_manager'
  | 'receptionist'
  | 'finance'
  | 'housekeeping'
  | 'customer';

export interface UserAuthProfile {
  email: string;
  name: string;
  role: IghoRole;
  roleLabel: string;
  targetScreen: ActiveScreen;
  organizationId?: string;
  organizationName?: string;
  description: string;
}

export const SUPER_ADMIN_EMAILS = ['rumeobire@gmail.com', 'dedoro888@gmail.com', 'admin@igho.com'];
export const SUPER_ADMIN_EMAIL = 'rumeobire@gmail.com';

/**
 * Retrieve saved CustomerProfile for an email if present
 */
export function getSavedCustomerProfile(email: string): CustomerProfile | null {
  if (typeof window === 'undefined' || !email) return null;
  try {
    const raw = localStorage.getItem('igho_db_customer_profiles');
    if (raw) {
      const profiles: CustomerProfile[] = JSON.parse(raw);
      return profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase()) || null;
    }
  } catch {}
  return null;
}

/**
 * Persist or update CustomerProfile in localStorage
 */
export function saveCustomerProfile(profile: CustomerProfile): void {
  if (typeof window === 'undefined' || !profile?.email) return;
  try {
    const raw = localStorage.getItem('igho_db_customer_profiles');
    let profiles: CustomerProfile[] = raw ? JSON.parse(raw) : [];
    const index = profiles.findIndex((p) => p.email.toLowerCase() === profile.email.trim().toLowerCase());
    if (index >= 0) {
      profiles[index] = { ...profiles[index], ...profile };
    } else {
      profiles.push(profile);
    }
    localStorage.setItem('igho_db_customer_profiles', JSON.stringify(profiles));
  } catch (e) {
    console.warn('Failed to save customer profile', e);
  }
}

/**
 * Global IGHO Account role resolution.
 * IGHO uses ONE central identity system.
 * The account's role determines where the user lands:
 * - super_admin -> /console (SuperAdminConsole)
 * - hotel_owner / staff -> Hotel PMS (StaffPortal)
 * - customer -> Customer Portal (GuestDashboard)
 */
export function resolveUserAccount(email: string, customProfile?: CustomerProfile): UserAuthProfile {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Super Admin (Platform Owner)
  if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) {
    const isDedoro = normalizedEmail === 'dedoro888@gmail.com';
    return {
      email: normalizedEmail,
      name: isDedoro ? 'dedoro888' : 'Rume Obire',
      role: 'super_admin',
      roleLabel: 'Super Admin (Platform Owner)',
      targetScreen: 'super_admin_console',
      organizationName: 'IGHO Software Systems (Global)',
      description: 'Platform owner with full governance over organizations, finance, subscriptions & products.',
    };
  }

  // If this email belongs to an explicit customer profile and is not a designated staff account,
  // ensure they are treated as a customer!
  const savedProf = customProfile || getSavedCustomerProfile(normalizedEmail);

  // 2. Hotel Owner (Exact emails only)
  if (
    normalizedEmail === 'avendoorcompany@gmail.com' ||
    normalizedEmail === 'owner@palmviewgrand.com' ||
    normalizedEmail === 'owner@grandkuba.com' ||
    normalizedEmail === 'admin@lavahotel.com'
  ) {
    return {
      email: normalizedEmail,
      name: normalizedEmail.includes('kuba') ? 'Kuba Obasi' : 'Avendoor Management',
      role: 'hotel_owner',
      roleLabel: 'Hotel Owner',
      targetScreen: 'staff_portal',
      organizationId: normalizedEmail.includes('kuba') ? 'hotel-5' : 'hotel-6',
      organizationName: normalizedEmail.includes('kuba') ? 'Grand Kuba Hotel' : 'Palmview Grand Hotel',
      description: 'Owner portal access to room inventory, folios, multi-branch operations & staff.',
    };
  }

  // 3. Hotel Manager (Exact emails only)
  if (
    normalizedEmail === 'manager@palmviewgrand.com' ||
    normalizedEmail === 'manager@lavahotel.com'
  ) {
    return {
      email: normalizedEmail,
      name: 'Sandra Eze',
      role: 'hotel_manager',
      roleLabel: 'Hotel Manager',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-6',
      organizationName: 'Palmview Grand Hotel',
      description: 'Operational manager with reservations, check-ins, staff & housekeeping management.',
    };
  }

  // 4. Receptionist (Exact emails only)
  if (
    normalizedEmail === 'reception@palmviewgrand.com' ||
    normalizedEmail === 'frontdesk@lavahotel.com'
  ) {
    return {
      email: normalizedEmail,
      name: 'David Adeleke',
      role: 'receptionist',
      roleLabel: 'Front Desk Receptionist',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-6',
      organizationName: 'Palmview Grand Hotel',
      description: 'Front desk access for checking guests in, managing room keys & creating reservations.',
    };
  }

  // 5. Finance (Exact emails only)
  if (
    normalizedEmail === 'finance@palmviewgrand.com' ||
    normalizedEmail === 'finance@lavahotel.com'
  ) {
    return {
      email: normalizedEmail,
      name: 'Blessing Ade',
      role: 'finance',
      roleLabel: 'Hotel Finance Officer',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-6',
      organizationName: 'Palmview Grand Hotel',
      description: 'Financial ledger, room billing reconciliation & payment verification.',
    };
  }

  // 6. Housekeeping (Exact emails only)
  if (
    normalizedEmail === 'housekeeping@palmviewgrand.com' ||
    normalizedEmail === 'housekeeping@lavahotel.com'
  ) {
    return {
      email: normalizedEmail,
      name: 'Emeka Nwosu',
      role: 'housekeeping',
      roleLabel: 'Housekeeping Staff',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-6',
      organizationName: 'Palmview Grand Hotel',
      description: 'Room cleaning, maintenance status & laundry operations.',
    };
  }

  // 7. Default: Customer Profile for this exact guest
  const displayName = savedProf
    ? `${savedProf.firstName || ''} ${savedProf.lastName || ''}`.trim() || normalizedEmail.split('@')[0]
    : normalizedEmail.split('@')[0].replace(/[._]/g, ' ');

  return {
    email: normalizedEmail,
    name: displayName,
    role: 'customer',
    roleLabel: 'Customer / Guest',
    targetScreen: 'guest_dashboard',
    description: 'Personal guest account for tracking bookings, hotel stays, invoices and receipts.',
  };
}
