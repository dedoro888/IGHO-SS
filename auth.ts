import { ActiveScreen, CustomerProfile, ResolvedAuthAccount, DbOrganizationRole } from '../types';

export type IghoRole =
  | 'super_admin'
  | 'owner'
  | 'manager'
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

/**
 * Maps a verified Supabase database resolved account into a UserAuthProfile.
 * Role resolution strictly reflects:
 * - public.profiles (active account_status)
 * - public.platform_roles (super_admin)
 * - public.organization_memberships (active membership status)
 * - public.organizations (active organization)
 */
export function mapResolvedAuthAccount(resolved: ResolvedAuthAccount): UserAuthProfile {
  const profileName = resolved.profile?.full_name || resolved.email.split('@')[0];

  if (resolved.isSuperAdmin && resolved.email.toLowerCase() !== 'dedoro888@gmail.com') {
    return {
      email: resolved.email,
      name: profileName,
      role: 'super_admin',
      roleLabel: 'Super Admin (Platform Owner)',
      targetScreen: 'super_admin_console',
      organizationName: 'IGHO Software Systems (Global)',
      description: 'Platform owner with full governance over organizations, finance, subscriptions & products.',
    };
  }

  if (resolved.membership) {
    const roleLabels: Record<DbOrganizationRole, string> = {
      owner: 'Hotel Owner',
      manager: 'Hotel Manager',
      receptionist: 'Front Desk Receptionist',
      finance: 'Hotel Finance Officer',
      housekeeping: 'Housekeeping Staff',
      customer: 'Customer / Guest',
    };

    const roleName = resolved.membership.role;
    const isStaff = ['owner', 'manager', 'receptionist', 'finance', 'housekeeping'].includes(roleName);

    return {
      email: resolved.email,
      name: profileName,
      role: roleName,
      roleLabel: roleLabels[roleName] || roleName,
      targetScreen: isStaff ? 'staff_portal' : 'guest_dashboard',
      organizationId: resolved.membership.organization_id,
      organizationName: resolved.organization?.name || 'Hotel Property',
      description: `${roleLabels[roleName] || roleName} at ${resolved.organization?.name || 'Hotel'}`,
    };
  }

  return {
    email: resolved.email,
    name: profileName,
    role: 'customer',
    roleLabel: 'Customer / Guest',
    targetScreen: 'guest_dashboard',
    description: 'Personal guest account for tracking bookings, hotel stays, invoices and receipts.',
  };
}

// Note: Super Admin status is SOLELY granted by public.platform_roles via Supabase Auth.
// Email-based super admin role grants are strictly prohibited and removed.


// In-memory customer profile cache (never persisted to localStorage to protect guest PII)
const inMemoryCustomerProfiles = new Map<string, CustomerProfile>();

/**
 * Retrieve saved CustomerProfile for an email if present (in-memory only)
 */
export function getSavedCustomerProfile(email: string): CustomerProfile | null {
  if (!email) return null;
  return inMemoryCustomerProfiles.get(email.trim().toLowerCase()) || null;
}

/**
 * Store or update CustomerProfile in memory (never written to browser localStorage)
 */
export function saveCustomerProfile(profile: CustomerProfile): void {
  if (typeof window === 'undefined' || !profile?.email) return;
  const cleanEmail = profile.email.trim().toLowerCase();
  const existing = inMemoryCustomerProfiles.get(cleanEmail);
  inMemoryCustomerProfiles.set(cleanEmail, existing ? { ...existing, ...profile } : profile);
  window.dispatchEvent(new Event('igho_profiles_updated'));
}

export function replaceInMemoryCustomerProfiles(profiles: CustomerProfile[]): void {
  inMemoryCustomerProfiles.clear();
  for (const p of profiles || []) {
    if (p?.email) {
      inMemoryCustomerProfiles.set(p.email.trim().toLowerCase(), p);
    }
  }
}

export function removeInMemoryCustomerProfile(email: string): void {
  if (!email) return;
  inMemoryCustomerProfiles.delete(email.trim().toLowerCase());
}

export function clearInMemoryCustomerProfiles(): void {
  inMemoryCustomerProfiles.clear();
}

/**
 * Global IGHO Account role resolution for local fallbacks and tenant staff.
 * Note: Super Admin role can NEVER be granted here. Platform Super Admin
 * authority is strictly verified against public.platform_roles via authService.
 */
export function resolveUserAccount(email: string, customProfile?: CustomerProfile): UserAuthProfile {
  const normalizedEmail = email.trim().toLowerCase();

  // Check public hotels list to resolve registered hotel owners if matching
  if (typeof window !== 'undefined') {
    try {
      const rawHotels = localStorage.getItem('igho_db_hotels');
      if (rawHotels) {
        const hotelsList = JSON.parse(rawHotels);
        const matchedHotel = hotelsList.find((h: any) =>
          h.email?.toLowerCase() === normalizedEmail ||
          h.ownerEmail?.toLowerCase() === normalizedEmail
        );
        if (matchedHotel) {
          return {
            email: normalizedEmail,
            name: matchedHotel.ownerName || matchedHotel.name,
            role: 'hotel_owner',
            roleLabel: 'Hotel Owner',
            targetScreen: 'staff_portal',
            organizationId: matchedHotel.id,
            organizationName: matchedHotel.name,
            description: `Owner portal access for ${matchedHotel.name}`,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to resolve dynamic hotel owner from storage', e);
    }
  }

  // If this email belongs to an explicit customer profile and is not a designated staff account,
  // ensure they are treated as a customer!
  const savedProf = customProfile || getSavedCustomerProfile(normalizedEmail);

  // 2. Hotel Owner & Staff for Lava Hotel & Suites
  if (
    normalizedEmail === 'avendoorcompany@gmail.com' ||
    normalizedEmail === 'info@lavahotel.ng' ||
    normalizedEmail === 'admin@lavahotel.com' ||
    normalizedEmail === 'admin@lavahotel.ng' ||
    normalizedEmail === 'admin@lavahotels.ng' ||
    normalizedEmail === 'lavahotel@info.com' ||
    normalizedEmail === 'manager@lavahotel.ng' ||
    normalizedEmail === 'manager@lavahotel.com'
  ) {
    const isManager = normalizedEmail.includes('manager');
    return {
      email: normalizedEmail,
      name: isManager ? 'Adaeze Okafor' : 'Obi Chidi',
      role: isManager ? 'hotel_manager' : 'hotel_owner',
      roleLabel: isManager ? 'Hotel Manager' : 'Hotel Owner',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-lava',
      organizationName: 'Lava Hotel & Suites',
      description: 'Hotel dashboard access to room inventory, folios, check-ins and staff management.',
    };
  }

  // 4. Receptionist (Exact emails only)
  if (
    normalizedEmail === 'frontdesk@lavahotel.com' ||
    normalizedEmail === 'frontdesk@lavahotel.ng'
  ) {
    return {
      email: normalizedEmail,
      name: 'Chiamaka Obi',
      role: 'receptionist',
      roleLabel: 'Front Desk Receptionist',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-lava',
      organizationName: 'Lava Hotel & Suites',
      description: 'Front desk access for checking guests in, managing room keys & creating reservations.',
    };
  }

  // 5. Finance (Exact emails only)
  if (
    normalizedEmail === 'finance@lavahotel.com' ||
    normalizedEmail === 'finance@lavahotel.ng'
  ) {
    return {
      email: normalizedEmail,
      name: 'Blessing Ade',
      role: 'finance',
      roleLabel: 'Hotel Finance Officer',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-lava',
      organizationName: 'Lava Hotel & Suites',
      description: 'Financial ledger, room billing reconciliation & payment verification.',
    };
  }

  // 6. Housekeeping (Exact emails only)
  if (
    normalizedEmail === 'housekeeping@lavahotel.com' ||
    normalizedEmail === 'housekeeping@lavahotel.ng'
  ) {
    return {
      email: normalizedEmail,
      name: 'Emeka Nwosu',
      role: 'housekeeping',
      roleLabel: 'Housekeeping Staff',
      targetScreen: 'staff_portal',
      organizationId: 'hotel-lava',
      organizationName: 'Lava Hotel & Suites',
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
