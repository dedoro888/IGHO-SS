import { getSupabaseClient } from '../lib/supabaseClient';

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB strictly enforced

export type StorageUploadCategory =
  | 'room_galleries'
  | 'guest_portal_media'
  | 'hotel_documents'
  | 'payment_proofs'
  | 'general_operational';

export interface UploadedFileRecord {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  categoryName: string;
  sizeBytes: number;
  mimeType: string;
  path: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Retrieve auth headers for backend API calls when a Supabase JWT session exists,
 * plus safe caller metadata for sandboxed verification.
 */
export async function getAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    ...(extra || {}),
  };

  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      const email = data?.session?.user?.email;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      if (email && !headers['X-IGHO-User-Email']) {
        headers['X-IGHO-User-Email'] = email.toLowerCase();
      }
    }
  } catch {
    // Ignore session lookup errors; callers rely on stored session fallback below
  }

  if (!headers['X-IGHO-User-Email'] && typeof window !== 'undefined') {
    try {
      const storedEmail =
        localStorage.getItem('igho_active_user_email') ||
        sessionStorage.getItem('igho_active_user_email') ||
        '';
      if (storedEmail) {
        headers['X-IGHO-User-Email'] = storedEmail.trim().toLowerCase();
      }
    } catch {}
  }

  return headers;
}

/**
 * Validate file size (max 10MB) and allowed MIME type client-side before sending over network.
 */
export function validateImageOrDocumentFile(
  file: File,
  options: { maxBytes?: number; allowPdf?: boolean } = {}
): string | null {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_UPLOAD_BYTES;
  if (!file) return 'No file selected.';
  if (file.size > maxBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    return `File "${file.name}" is ${mb} MB, which exceeds the ${limitMb} MB maximum file size.`;
  }

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    ...(options.allowPdf ? ['application/pdf'] : []),
  ];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', ...(options.allowPdf ? ['pdf'] : [])];

  if (file.type && !allowedTypes.includes(file.type.toLowerCase()) && !allowedExts.includes(ext)) {
    return options.allowPdf
      ? 'Unsupported file type. Please upload JPG, PNG, WebP, GIF, or PDF.'
      : 'Unsupported image type. Please upload JPG, PNG, WebP, or GIF.';
  }

  return null;
}

/**
 * Uploads binary file bytes directly to the backend (/api/storage/:organizationId/upload-binary)
 * with pre-upload quota verification and persistent disk / cloud URL return.
 * Never returns ephemeral blob: URLs or bloated Base64 strings.
 */
export async function uploadOrganizationFile(
  organizationId: string,
  file: File,
  category: StorageUploadCategory = 'general_operational',
  uploadedBy: string = 'Staff',
  options: { allowPdf?: boolean; maxBytes?: number } = {}
): Promise<UploadedFileRecord> {
  const validationError = validateImageOrDocumentFile(file, options);
  if (validationError) {
    throw new Error(validationError);
  }

  const safeOrgId = (organizationId || 'hotel-onboarding-temp').trim();

  // 1. Pre-upload quota check
  const authHeaders = await getAuthHeaders({
    'Content-Type': 'application/json',
  });

  const quotaRes = await fetch(`/api/storage/${encodeURIComponent(safeOrgId)}/check-upload`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      sizeBytes: file.size,
      fileName: file.name,
      category,
    }),
  });

  if (!quotaRes.ok) {
    const quotaErr = await quotaRes.json().catch(() => ({}));
    throw new Error(
      quotaErr.message || 'Storage quota exceeded or upload blocked by organization storage limits.'
    );
  }

  // 2. Binary upload directly to disk / cloud endpoint
  const binaryHeaders = await getAuthHeaders({
    'Content-Type': file.type || 'application/octet-stream',
    'X-File-Name': encodeURIComponent(file.name),
    'X-File-Category': category,
    'X-Uploaded-By': encodeURIComponent(uploadedBy || 'Staff'),
  });

  const arrayBuffer = await file.arrayBuffer();
  const uploadRes = await fetch(
    `/api/storage/${encodeURIComponent(safeOrgId)}/upload-binary?category=${encodeURIComponent(category)}`,
    {
      method: 'POST',
      headers: binaryHeaders,
      body: arrayBuffer,
    }
  );

  const data = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !data.success || !data.url) {
    throw new Error(data.message || 'Failed to upload file to persistent storage.');
  }

  return data.file as UploadedFileRecord;
}
