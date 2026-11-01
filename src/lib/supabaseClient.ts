import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabasePublicConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Retrieve public configuration from the server-side /api/config endpoint
 * or from Vite client environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).
 */
export async function fetchSupabaseConfig(): Promise<SupabasePublicConfig> {
  // Check Vite client-side variables first if defined
  const viteUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const viteKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (viteUrl && viteKey) {
    let cleanUrl = viteUrl;
    try {
      cleanUrl = new URL(viteUrl).origin;
    } catch {
      cleanUrl = viteUrl.replace(/\/+$/, '');
    }
    return {
      supabaseUrl: cleanUrl,
      supabasePublishableKey: viteKey,
    };
  }

  // Otherwise retrieve from server endpoint /api/config
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      return {
        supabaseUrl: data.supabaseUrl || '',
        supabasePublishableKey: data.supabasePublishableKey || '',
      };
    }
  } catch (err) {
    console.warn('[Supabase Config] Failed to fetch /api/config:', err);
  }

  return { supabaseUrl: '', supabasePublishableKey: '' };
}

/**
 * Initializes and returns the singleton Supabase client.
 * Configured with standard browser session persistence and auto-refresh.
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabaseInstance) return supabaseInstance;

  if (!initPromise) {
    initPromise = (async () => {
      const config = await fetchSupabaseConfig();
      if (!config.supabaseUrl || !config.supabasePublishableKey) {
        console.warn(
          '[Supabase Client] Supabase URL or Publishable Key is not configured yet. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Secrets.'
        );
        return null;
      }

      supabaseInstance = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      });

      return supabaseInstance;
    })();
  }

  return initPromise;
}

/**
 * Synchronous accessor for the initialized Supabase client singleton.
 * Returns null if initialization is pending or unconfigured.
 */
export function getActiveSupabase(): SupabaseClient | null {
  return supabaseInstance;
}
