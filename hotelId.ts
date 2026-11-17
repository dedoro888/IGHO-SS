/**
 * Standardizes Hotel ID across all views, invoices, console records and URLs.
 * Format requirement: IGHO-HTL-XXXX
 */
export function formatHotelId(id?: string): string {
  if (!id) return 'IGHO-HTL-001';

  const clean = id.trim().toUpperCase();

  // If already in standard IGHO-HTL- format, return as is
  if (clean.startsWith('IGHO-HTL-')) {
    return clean;
  }

  // If starts with HTL- (e.g. HTL-LAVA-005), prefix with IGHO-
  if (clean.startsWith('HTL-')) {
    return `IGHO-${clean}`;
  }

  // If starts with hotel- (e.g. hotel-lava), transform to IGHO-HTL-LAVA
  if (clean.startsWith('HOTEL-')) {
    return `IGHO-HTL-${clean.replace('HOTEL-', '')}`;
  }

  // Fallback: extract alpha-numeric and prefix
  const alphanumeric = clean.replace(/[^A-Z0-9]/g, '');
  return `IGHO-HTL-${alphanumeric || '001'}`;
}
