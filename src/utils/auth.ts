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

  if (resolved.isSuperAdmin) {
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
    // Dispatch custom event to notify App of customer profile updates
    window.dispatchEvent(new Event('igho_profiles_updated'));
  } catch (e) {
    console.warn('Failed to save customer profile', e);
  }
}

/**
 * Global IGHO Account role resolution for local fallbacks and tenant staff.
 * Note: Super Admin role can NEVER be granted here. Platform Super Admin
 * authority is strictly verified against public.platform_roles via authService.
 */
export function resolveUserAccount(email: string, customProfile?: CustomerProfile): UserAuthProfile {
  const normalizedEmail = email.trim().toLowerCase();

  // Check dynamic staff list in localStorage first to resolve newly created hotel accounts
  if (typeof window !== 'undefined') {
    try {
      const rawStaff = localStorage.getItem('igho_db_staff');
      if (rawStaff) {
        const staffList = JSON.parse(rawStaff);
        const foundStaff = staffList.find((s: any) => s.email?.toLowerCase() === normalizedEmail);
        if (foundStaff) {
          let orgName = 'Palmview Grand Hotel';
          const rawHotels = localStorage.getItem('igho_db_hotels');
          if (rawHotels) {
            const hotelsList = JSON.parse(rawHotels);
            const hotel = hotelsList.find((h: any) => h.id === foundStaff.hotelId);
            if (hotel) orgName = hotel.name;
          }
          return {
            email: normalizedEmail,
            name: foundStaff.name || foundStaff.email.split('@')[0],
            role: foundStaff.role,
            roleLabel: String(foundStaff.role).replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            targetScreen: 'staff_portal',
            organizationId: foundStaff.hotelId,
            organizationName: orgName,
            description: `Staff portal access for ${foundStaff.role}`,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to resolve dynamic staff member from storage', e);
    }
  }

  // Check dynamic hotels list in localStorage to resolve registered hotel owners
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
    normalizedEmail === 'manager@lavahotel.com' ||
    (normalizedEmail.includes('lava') && (normalizedEmail.includes('hotel') || normalizedEmail.includes('admin') || normalizedEmail.includes('owner')))
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
