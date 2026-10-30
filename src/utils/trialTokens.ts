export interface TrialToken {
  id: string;
  code: string;
  durationDays: number; // 30 (1 month)
  status: 'active' | 'redeemed' | 'revoked';
  createdAt: string;
  createdBy: string;
  notes?: string;
  redeemedByHotelId?: string;
  redeemedByHotelName?: string;
  redeemedAt?: string;
}

const STORAGE_KEY = 'igho_db_trial_tokens';

// Default seeded trial tokens generated from IGHO Console
const DEFAULT_TRIAL_TOKENS: TrialToken[] = [
  {
    id: 'tok-1',
    code: 'IGHO-TRIAL-30',
    durationDays: 30,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: 'Super Admin (rumeobire@gmail.com)',
    notes: 'Standard 1-Month Launch Promotion Token',
  },
  {
    id: 'tok-2',
    code: 'IGHOFREE',
    durationDays: 30,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: 'Super Admin (rumeobire@gmail.com)',
    notes: 'Partner VIP 1-Month Access',
  },
  {
    id: 'tok-3',
    code: 'TRIAL2026',
    durationDays: 30,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'Super Admin (rumeobire@gmail.com)',
    notes: 'Hospitality Partner Direct Token',
  },
];

/**
 * Load all trial tokens from persistent storage.
 */
export function getStoredTrialTokens(): TrialToken[] {
  if (typeof window === 'undefined') return DEFAULT_TRIAL_TOKENS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.warn('Error reading trial tokens from localStorage', err);
  }
  // Initialize with defaults if none stored yet
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRIAL_TOKENS));
  } catch {}
  return DEFAULT_TRIAL_TOKENS;
}

/**
 * Save updated trial tokens list to persistent storage.
 */
export function saveTrialTokens(tokens: TrialToken[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    window.dispatchEvent(new Event('igho_trial_tokens_updated'));
  } catch (err) {
    console.warn('Error saving trial tokens to localStorage', err);
  }
}

/**
 * Generate a new trial token in the IGHO Console.
 */
export function generateTrialToken(params: {
  customCode?: string;
  notes?: string;
  createdBy?: string;
}): TrialToken {
  const currentTokens = getStoredTrialTokens();

  // Generate random 4-digit or custom uppercase code
  let cleanCode = (params.customCode || '').trim().toUpperCase();
  if (!cleanCode) {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    cleanCode = `IGHO-TRIAL-${randNum}`;
  }

  const newToken: TrialToken = {
    id: `tok-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code: cleanCode,
    durationDays: 30, // 1 month
    status: 'active',
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy || 'Super Admin',
    notes: params.notes || '1-Month Free Trial Access Token',
  };

  const updated = [newToken, ...currentTokens];
  saveTrialTokens(updated);
  return newToken;
}

/**
 * Revoke or Delete a trial token.
 */
export function revokeTrialToken(tokenId: string): TrialToken[] {
  const currentTokens = getStoredTrialTokens();
  const updated = currentTokens.map((t) =>
    t.id === tokenId ? { ...t, status: 'revoked' as const } : t
  );
  saveTrialTokens(updated);
  return updated;
}

export function deleteTrialToken(tokenId: string): TrialToken[] {
  const currentTokens = getStoredTrialTokens();
  const updated = currentTokens.filter((t) => t.id !== tokenId);
  saveTrialTokens(updated);
  return updated;
}

/**
 * Validate and redeem a token when entered by a hotel on the Subscription page.
 */
export function validateAndRedeemTrialToken(
  code: string,
  hotel: { id: string; name: string }
): {
  success: boolean;
  message: string;
  token?: TrialToken;
} {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      success: false,
      message: 'Please enter a special trial token to activate your free trial.',
    };
  }

  const currentTokens = getStoredTrialTokens();
  const found = currentTokens.find((t) => t.code === cleanCode);

  if (!found) {
    return {
      success: false,
      message: `Invalid trial token "${cleanCode}". Tokens must be generated from the IGHO Console (Subscriptions page).`,
    };
  }

  if (found.status === 'revoked') {
    return {
      success: false,
      message: `Trial token "${cleanCode}" has been revoked by the Super Admin.`,
    };
  }

  if (found.status === 'redeemed') {
    return {
      success: false,
      message: `Trial token "${cleanCode}" has already been redeemed${
        found.redeemedByHotelName ? ` by ${found.redeemedByHotelName}` : ''
      }.`,
    };
  }

  // Mark token as redeemed
  const now = new Date().toISOString();
  const updated = currentTokens.map((t) =>
    t.id === found.id
      ? {
          ...t,
          status: 'redeemed' as const,
          redeemedByHotelId: hotel.id,
          redeemedByHotelName: hotel.name,
          redeemedAt: now,
        }
      : t
  );

  saveTrialTokens(updated);

  return {
    success: true,
    message: `Trial token "${cleanCode}" validated successfully! 1-Month Free Trial activated.`,
    token: {
      ...found,
      status: 'redeemed',
      redeemedByHotelId: hotel.id,
      redeemedByHotelName: hotel.name,
      redeemedAt: now,
    },
  };
}
