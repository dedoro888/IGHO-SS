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
  // In-flight resolution deduplication keyed by authenticated user UUID + optional organizationId
  private inFlightResolutions = new Map<string, Promise<HardenedResolvedAuthAccount>>();
  // Monotonic generation counter to detect when a session is invalidated (sign-out, account switch)
  private sessionGeneration = 0;
  // Current active user ID to protect against cross-session overwriting
  private activeUserId: string | null = null;

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
   * Initiate genuine Google OAuth with Supabase.
   * Prompts user with Google account chooser (select_account) and redirects back.
   */
  async signInWithGoogle(redirectTo?: string): Promise<{ data: any; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured.') };
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirect = redirectTo || (origin ? `${origin}/` : undefined);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirect,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });

    return { data, error };
  }

  /**
   * Resend signup confirmation email for unconfirmed accounts.
   */
  async resendConfirmationEmail(email: string): Promise<{ data: any; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured.') };
    }

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });

    return { data, error };
  }

  /**
   * Set or update active user UUID for session consistency tracking.
   */
  setActiveUserId(userId: string | null) {
    if (this.activeUserId !== userId) {
      this.sessionGeneration++;
      this.inFlightResolutions.clear();
      this.activeUserId = userId;
    }
  }

  /**
   * Sign out the currently active user session.
   * Invalidates any in-flight resolutions and increments session generation.
   */
  async signOut() {
    this.sessionGeneration++;
    this.inFlightResolutions.clear();
    this.activeUserId = null;
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
   * Send a password reset email via Supabase Auth.
   */
  async resetPasswordForEmail(email: string, redirectTo?: string): Promise<{ data: any; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured.') };
    }
    const cleanEmail = email.trim().toLowerCase();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirect = redirectTo || (origin ? `${origin}/#reset-password` : undefined);

    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirect,
    });
    return { data, error };
  }

  /**
   * Update user password using active session (e.g., during recovery or profile settings).
   */
  async updateUserPassword(newPassword: string): Promise<{ data: any; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured.') };
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
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
   * Priority 1: Call existing Supabase RPC function public.is_platform_super_admin() (SECURITY DEFINER),
   *             which safely queries platform_roles & active profile without being blocked by RLS default-deny.
   * Priority 2: Direct SELECT query fallback on public.platform_roles preserving granted_at
   *             if RPC is unavailable or returns an error.
   * Strict Rule: If RPC returns false without error, immediately return isSuperAdmin: false.
   *              Do NOT use direct query to override this explicit denial.
   * If both fail, deny access and preserve actual verification error for diagnostics.
   */
  async getPlatformRole(userId: string): Promise<{ isSuperAdmin: boolean; platformRole: DbPlatformRole | null; error: any }> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { isSuperAdmin: false, platformRole: null, error: new Error('Supabase client not initialized') };

    let rpcErrorToPreserve: any = null;

    // 1. Primary Check: Existing Supabase RPC function (SECURITY DEFINER)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('is_platform_super_admin');

      if (!rpcError && typeof rpcData === 'boolean') {
        if (rpcData === true) {
          return {
            isSuperAdmin: true,
            platformRole: {
              id: `platform-super-admin-${userId}`,
              user_id: userId,
              role: 'super_admin',
              granted_at: new Date().toISOString(),
            },
            error: null,
          };
        } else {
          // Strict Denial: RPC affirmatively verified user is NOT a Super Admin.
          // Do not attempt direct table query to override this denial.
          return {
            isSuperAdmin: false,
            platformRole: null,
            error: null,
          };
        }
      }

      if (rpcError) {
        rpcErrorToPreserve = rpcError;
      }
    } catch (err: any) {
      rpcErrorToPreserve = err;
    }

    // 2. Fallback: Direct table query against public.platform_roles preserving granted_at
    // Only attempted if RPC errors or is unavailable
    const { data, error: directError } = await supabase
      .from('platform_roles')
      .select('id, user_id, role, granted_at')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (directError) {
      // Both RPC and direct query failed: preserve actual verification error for diagnostics
      return {
        isSuperAdmin: false,
        platformRole: null,
        error: directError || rpcErrorToPreserve,
      };
    }

    const isDirectSuperAdmin = !!data && data.role === 'super_admin';

    return {
      isSuperAdmin: isDirectSuperAdmin,
      platformRole: data as DbPlatformRole | null,
      error: isDirectSuperAdmin ? null : rpcErrorToPreserve,
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
  resolveAuthenticatedUser(
    userId: string,
    email: string,
    selectedOrganizationId?: string
  ): Promise<HardenedResolvedAuthAccount> {
    const dedupeKey = `${userId}:${selectedOrganizationId || ''}`;
    const generationAtStart = this.sessionGeneration;

    // Deduplication: Reuse existing in-flight promise for the exact same user & org context
    const existing = this.inFlightResolutions.get(dedupeKey);
    if (existing) {
      return existing;
    }

    const resolutionPromise = (async (): Promise<HardenedResolvedAuthAccount> => {
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

      // Helper to ensure an outdated session or sign-out cannot authorise a newer session
      const isStale = () => this.sessionGeneration !== generationAtStart;

      // 1. Fetch user profile from public.profiles
      const { profile, error: profileError } = await this.getProfile(userId);
      if (isStale()) {
        return { ...baseResult, accessGranted: false, denialReason: 'Session changed or signed out during resolution.' };
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

      // 3. Check Platform Super Admin in public.platform_roles (preserves granted_at)
      const { isSuperAdmin, error: adminError } = await this.getPlatformRole(userId);
      if (isStale()) {
        return { ...baseResult, accessGranted: false, denialReason: 'Session changed or signed out during resolution.' };
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
      if (isStale()) {
        return { ...baseResult, accessGranted: false, denialReason: 'Session changed or signed out during resolution.' };
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
        if (isStale()) {
          return { ...baseResult, accessGranted: false, denialReason: 'Session changed or signed out during resolution.' };
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
    })();

    this.inFlightResolutions.set(dedupeKey, resolutionPromise);
    resolutionPromise.finally(() => {
      this.inFlightResolutions.delete(dedupeKey);
    });

    return resolutionPromise;
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
