import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import {
  DbProfile,
  DbOrganization,
  DbOrganizationMembership,
  DbPlatformRole,
  ResolvedAuthAccount,
  DbOrganizationRole,
} from '../types';

export interface HardenedResolvedAuthAccount extends ResolvedAuthAccount {
  requiresOrganizationSelection?: boolean;
  availableMemberships?: DbOrganizationMembership[];
}

/**
 * Service to manage Supabase Authentication and Authorisation
 * using real PostgreSQL tables, strict status verification, and fail-closed security.
 */
export class SupabaseAuthService {
  private activeResolutionSeq = 0;

  /**
   * Register a new user using Supabase Auth.
   */
  async signUp(email: string, password: string, fullName?: string, phone?: string) {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName || '',
          phone: phone || '',
        },
      },
    });

    return { data, error };
  }

  /**
   * Sign in an existing user with email and password.
   */
  async signIn(email: string, password: string) {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    return { data, error };
  }

  /**
   * Sign out the currently active user session.
   */
  async signOut() {
    this.activeResolutionSeq++;
    const supabase = await getSupabaseClient();
    if (!supabase) return { error: null };
    return await supabase.auth.signOut();
  }

  /**
   * Get the current active session.
   */
  async getSession(): Promise<{ session: Session | null; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { session: null, error: null };
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session ?? null, error };
  }

  /**
   * Get the current authenticated user.
   */
  async getUser(): Promise<{ user: User | null; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { user: null, error: null };
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user ?? null, error };
  }

  /**
   * Retrieve the profile record for an authenticated user from public.profiles.
   * profiles.id references auth.users.id.
   */
  async getProfile(userId: string): Promise<{ profile: DbProfile | null; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { profile: null, error: new Error('Supabase client not initialized') };

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, account_status, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    return { profile: data as DbProfile | null, error };
  }

  /**
   * Check if the authenticated user has the platform Super Admin role in public.platform_roles.
   * platform_roles.user_id references profiles.id.
   */
  async getPlatformRole(userId: string): Promise<{ isSuperAdmin: boolean; platformRole: DbPlatformRole | null; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { isSuperAdmin: false, platformRole: null, error: new Error('Supabase client not initialized') };

    const { data, error } = await supabase
      .from('platform_roles')
      .select('id, user_id, role, granted_at')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .maybeSingle();

    return {
      isSuperAdmin: !!data && data.role === 'super_admin',
      platformRole: data as DbPlatformRole | null,
      error,
    };
  }

  /**
   * Retrieve all organization memberships for a user from public.organization_memberships.
   * Supports users belonging to multiple organizations.
   * Note: Unique constraint enforces at most one role per organization for each user.
   */
  async getOrganizationMemberships(userId: string): Promise<{ memberships: DbOrganizationMembership[]; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { memberships: [], error: new Error('Supabase client not initialized') };

    const { data, error } = await supabase
      .from('organization_memberships')
      .select('id, organization_id, user_id, role, status, created_at, updated_at')
      .eq('user_id', userId);

    return { memberships: (data || []) as DbOrganizationMembership[], error };
  }

  /**
   * Helper for backward compatibility returning a single primary membership.
   */
  async getOrganizationMembership(userId: string): Promise<{ membership: DbOrganizationMembership | null; error: any }> {
    const { memberships, error } = await this.getOrganizationMemberships(userId);
    return { membership: memberships[0] || null, error };
  }

  /**
   * Retrieve the organization details from public.organizations.
   */
  async getOrganization(organizationId: string): Promise<{ organization: DbOrganization | null; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { organization: null, error: new Error('Supabase client not initialized') };

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, status, created_at, updated_at')
      .eq('id', organizationId)
      .maybeSingle();

    return { organization: data as DbOrganization | null, error };
  }

  /**
   * Comprehensive, fail-closed role and authorization resolution for an authenticated user.
   * Verifies:
   * 1. A valid Supabase Auth session & profile.
   * 2. Strict profile.account_status === 'active'.
   * 3. Platform Super Admin role in public.platform_roles (role = 'super_admin').
   * 4. Strict membership.status === 'active'.
   * 5. Array-based multi-membership resolution with deterministic handling.
   * 6. Strict organization.status === 'active' (mandatory before granting any staff access).
   * 7. Fail-closed: Any database query error immediately halts and denies access. Never falls back to customer on errors.
   */
  async resolveAuthenticatedUser(
    userId: string,
    email: string,
    selectedOrganizationId?: string
  ): Promise<HardenedResolvedAuthAccount> {
    const currentSeq = ++this.activeResolutionSeq;

    const baseResult: HardenedResolvedAuthAccount = {
      userId,
      email,
      profile: null,
      isSuperAdmin: false,
      membership: null,
      organization: null,
      effectiveRole: 'customer',
      targetScreen: 'guest_dashboard',
      accessGranted: false,
    };

    // 1. Fetch user profile from public.profiles
    const { profile, error: profileError } = await this.getProfile(userId);
    if (this.activeResolutionSeq !== currentSeq) {
      return { ...baseResult, denialReason: 'Stale authentication request cancelled.' };
    }

    if (profileError) {
      return {
        ...baseResult,
        accessGranted: false,
        denialReason: `Database error querying profile: ${profileError.message}`,
      };
    }

    if (!profile) {
      return {
        ...baseResult,
        accessGranted: false,
        denialReason: 'User profile record not found in public.profiles.',
      };
    }

    baseResult.profile = profile;

    // 2. Strict Check: profile.account_status MUST explicitly equal 'active'
    if ((profile.account_status || '').toLowerCase() !== 'active') {
      return {
        ...baseResult,
        accessGranted: false,
        denialReason: `Profile account status is '${profile.account_status || 'unverified'}'. Access denied.`,
      };
    }

    // 3. Check Platform Super Admin
    const { isSuperAdmin, error: adminError } = await this.getPlatformRole(userId);
    if (this.activeResolutionSeq !== currentSeq) {
      return { ...baseResult, denialReason: 'Stale authentication request cancelled.' };
    }

    if (adminError && adminError.code !== 'PGRST116') {
      return {
        ...baseResult,
        accessGranted: false,
        denialReason: `Database error checking platform permissions: ${adminError.message}`,
      };
    }

    if (isSuperAdmin) {
      return {
        ...baseResult,
        isSuperAdmin: true,
        effectiveRole: 'super_admin',
        targetScreen: 'super_admin_console',
        accessGranted: true,
      };
    }

    // 4. Retrieve Organization Memberships via array-based query
    const { memberships, error: membershipsError } = await this.getOrganizationMemberships(userId);
    if (this.activeResolutionSeq !== currentSeq) {
      return { ...baseResult, denialReason: 'Stale authentication request cancelled.' };
    }

    // Fail-closed: Never convert query errors into customer accounts
    if (membershipsError) {
      return {
        ...baseResult,
        accessGranted: false,
        denialReason: `Database error retrieving organization memberships: ${membershipsError.message}`,
      };
    }

    const staffRoles: DbOrganizationRole[] = ['owner', 'manager', 'receptionist', 'finance', 'housekeeping'];

    const activeStaffMemberships = memberships.filter(
      (m) => (m.status || '').toLowerCase() === 'active' && staffRoles.includes(m.role)
    );

    const inactiveStaffMemberships = memberships.filter(
      (m) => (m.status || '').toLowerCase() !== 'active' && staffRoles.includes(m.role)
    );

    let chosenMembership: DbOrganizationMembership | null = null;

    if (selectedOrganizationId) {
      // User explicitly selected an organization
      const matched = activeStaffMemberships.find((m) => m.organization_id === selectedOrganizationId);
      if (matched) {
        chosenMembership = matched;
      } else {
        const inactiveMatch = inactiveStaffMemberships.find((m) => m.organization_id === selectedOrganizationId);
        if (inactiveMatch) {
          return {
            ...baseResult,
            accessGranted: false,
            denialReason: `Membership in selected organization is '${inactiveMatch.status}'. Access denied.`,
          };
        }
        return {
          ...baseResult,
          accessGranted: false,
          denialReason: 'No active staff membership found for the selected organization.',
        };
      }
    } else {
      // Deterministic multi-membership handling
      if (activeStaffMemberships.length > 1) {
        // Multiple active organizations exist and none has been explicitly selected
        return {
          ...baseResult,
          accessGranted: true,
          requiresOrganizationSelection: true,
          availableMemberships: activeStaffMemberships,
          effectiveRole: 'customer',
          targetScreen: 'setup_selector',
        };
      } else if (activeStaffMemberships.length === 1) {
        chosenMembership = activeStaffMemberships[0];
      } else {
        // No active staff memberships
        if (inactiveStaffMemberships.length > 0) {
          return {
            ...baseResult,
            accessGranted: false,
            denialReason: `Organization staff membership is '${inactiveStaffMemberships[0].status}'. Access denied.`,
          };
        }

        // Check if there are customer memberships
        const customerMemberships = memberships.filter((m) => m.role === 'customer');
        const inactiveCustomer = customerMemberships.find((m) => (m.status || '').toLowerCase() !== 'active');
        if (inactiveCustomer) {
          return {
            ...baseResult,
            accessGranted: false,
            denialReason: `Account membership is '${inactiveCustomer.status}'. Access denied.`,
          };
        }

        // Default: Authenticated user with no staff memberships is a guest
        // (Guests never receive staff permissions)
        return {
          ...baseResult,
          effectiveRole: 'customer',
          targetScreen: 'guest_dashboard',
          accessGranted: true,
        };
      }
    }

    // 5. Operational Staff Role Verification:
    // Mandatory: An organisation must be successfully retrieved and verified before granting any organisation staff role.
    if (chosenMembership) {
      if ((chosenMembership.status || '').toLowerCase() !== 'active') {
        return {
          ...baseResult,
          accessGranted: false,
          denialReason: `Membership status is '${chosenMembership.status}'. Access denied.`,
        };
      }

      if (!chosenMembership.organization_id) {
        return {
          ...baseResult,
          accessGranted: false,
          denialReason: 'Membership record has no organization reference. Access denied.',
        };
      }

      const { organization, error: orgError } = await this.getOrganization(chosenMembership.organization_id);
      if (this.activeResolutionSeq !== currentSeq) {
        return { ...baseResult, denialReason: 'Stale authentication request cancelled.' };
      }

      if (orgError) {
        return {
          ...baseResult,
          accessGranted: false,
          denialReason: `Database error retrieving organization: ${orgError.message}`,
        };
      }

      if (!organization) {
        return {
          ...baseResult,
          accessGranted: false,
          denialReason: 'Associated organization record not found in public.organizations. Access denied.',
        };
      }

      // Strict check: organization.status MUST explicitly equal 'active'
      if ((organization.status || '').toLowerCase() !== 'active') {
        return {
          ...baseResult,
          accessGranted: false,
          denialReason: `Organization status is '${organization.status || 'inactive'}'. Access denied.`,
        };
      }

      return {
        ...baseResult,
        membership: chosenMembership,
        organization,
        effectiveRole: chosenMembership.role,
        targetScreen: 'staff_portal',
        accessGranted: true,
      };
    }

    return {
      ...baseResult,
      effectiveRole: 'customer',
      targetScreen: 'guest_dashboard',
      accessGranted: true,
    };
  }

  /**
   * Subscribe to Supabase auth state changes.
   */
  async onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const supabase = await getSupabaseClient();
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new SupabaseAuthService();
