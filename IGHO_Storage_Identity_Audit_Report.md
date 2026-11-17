# IGHO Software Systems — File Storage, Identity & Document Management Audit

**Scope:** IGHO Stay (Hotels), IGHO Classroom (Schools), IGHO MedBay (Hospitals)  
**Mode:** Audit-Only (Zero buckets, tables, policies, migrations, or code modified)  
**Date:** 2026-11-16

**Audit Status Legend:**
- `IMPLEMENTED` — Present and working as designed across frontend and backend
- `PARTIAL` — Exists in code/schema but incomplete, bypassed, or missing enforcement/persistence
- `NOT IMPLEMENTED` — Absent from codebase or waitlist-only
- `CRITICAL SECURITY GAP` — Active vulnerability allowing unauthorized access, data exposure, or cross-tenant tampering
- `CONFLICT / INCONSISTENCY` — Contradictory configuration values, schemas, or field names across layers
- `REQUIRES LEGAL / COMPLIANCE REVIEW` — Statutory/regulatory requirement requiring qualified legal or DPO sign-off

---

## 1. Existing Buckets & Supabase Storage Configuration

- **Supabase Runtime Configuration (`PARTIAL`):** `server.ts` (`lines 30–43`) initializes `supabaseAdminClient` only when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. In the inspected environment, both variables and `SUPABASE_PUBLISHABLE_KEY` are unset, so uploads currently fall back to local disk (`/uploads`) and `src/data/database_store.json`.
- **Single Public Bucket `igho-media` (`CRITICAL SECURITY GAP`):** When Supabase is active, `server.ts` (`lines 4713–4732`) uploads every file—including payment transfer proofs—into a single bucket named `igho-media`, creating it with `{ public: true }` and explicitly flipping any private `igho-media` bucket back to `{ public: true }`.
- **Unauthenticated Local Static Serving (`CRITICAL SECURITY GAP`):** `server.ts` (`lines 22–24`) exposes all uploaded files under `/uploads` via unauthenticated `express.static`.
- **Bucket Limits, MIME & Magic-Byte Checks (`PARTIAL`):** No bucket-level `fileSizeLimit` or `allowedMimeTypes` exist. App-level single-file limit is `10 MB` (`MAX_SINGLE_FILE_BYTES`). However, `server.ts` (`lines 4655–4677`) checks filename extensions and headers without verifying binary file magic bytes, and rewrites unknown extensions with an `image/*` header to `.jpg`.
- **Storage RLS Policies (`NOT IMPLEMENTED`):** Neither `src/lib/database_schema_phase2_4.sql` nor `src/lib/database_schema_phase3_saas.sql` defines any `storage.buckets` or `storage.objects` RLS policies.
- **Image Processing (`NOT IMPLEMENTED`):** No resizing, compression, or EXIF/GPS metadata stripping exists.

---

## 2. Missing Buckets & Recommended 5-Bucket Architecture

| Bucket Name | Visibility | Reuse / Action | Purpose & Access Control | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`public-brand-assets`** | Public | Repurpose `igho-media` (only after moving private proofs out) or create clean | Approved logos, covers, room/facility photos, school banners, hospital exteriors. Image-only MIME + EXIF strip. | `CONFLICT / INCONSISTENCY` |
| **`organisation-media`** | Private | Create new | Internal facility media, feature-request screenshots, staff uploads, school class media. Signed URLs + active org membership RLS. | `NOT IMPLEMENTED` |
| **`identity-documents`** | Private | Create new | Guest KYC IDs, staff credentials/contracts, student IDs & admissions, teacher/clinician licences. Short-TTL signed URLs + audit log. | `NOT IMPLEMENTED` |
| **`financial-documents`** | Private | Create new (currently exposed in `igho-media` / `/uploads`) | Bank transfer proofs (`payment_proofs`), folios, invoices, receipts, caution deposit evidence. Owner/Finance RLS (plus scoped guest upload). | `CRITICAL SECURITY GAP` |
| **`health-records`** | Strictly Private | Create new | Clinical notes, lab reports, diagnostic imaging, encounter attachments. Clinical care-team RLS + break-glass audit; blocked from admin/billing/Super Admin. | `NOT IMPLEMENTED` |

---

## 3. Existing Upload, Display, Download & Deletion Functionality

### Frontend Components Audited
1. `RoomInventoryView.tsx` — Uploads room gallery photos (`room_galleries`). Deleting a photo removes only the URL string from the room record without deleting the underlying file or freeing quota.
2. `StaffPortal.tsx` — Uploads hotel logo & cover (`guest_portal_media`) and persists via `PATCH /api/hotels/:hotelId/profile`. Replacing leaves previous files orphaned.
3. `HotelOnboarding.tsx` (`PARTIAL`) — Uploads logo/cover under placeholder `'hotel-onboarding-temp'`; files stay under temp folder forever, excluded from org quota.
4. `GuestBookingCheckout.tsx` (`CRITICAL SECURITY GAP`) — Uploads guest transfer receipts (`payment_proofs`) via desktop file picker, mobile Camera, and Files picker into public storage.
5. `ReceiptViewerModal.tsx` — Displays, prints, `<a download>` downloads, and replaces receipts without deleting previous proofs.
6. `FeatureRequestsView.tsx` — Uploads feature screenshots (`general_operational`).
7. `GuestDashboard.tsx` & `EditProfileModal.tsx` — Upload user avatars under `'platform-profiles'`; `GuestDashboard` persists immediately via `PUT /api/users/profile`.
8. `HotelSubscriptionView.tsx` & `ConsoleStorageView.tsx` — Display storage usage/breakdowns; neither exposes file deletion UI.

### Lifecycle Gaps
- **Upload Progress (`NOT IMPLEMENTED`):** Boolean loading state only; no percentage progress or resumable upload.
- **Duplicate Detection (`NOT IMPLEMENTED`):** Random filename generation with no SHA-256 deduplication.
- **Deletion & Cascade Cleanup (`PARTIAL`):** `DELETE /api/storage/:organizationId/files/:fileId` (`server.ts:4808–4827`) deletes local `/uploads` disk file and JSON metadata **only**, failing to delete the object from Supabase Storage (`igho-media`), and no frontend component calls it.

---

## 4. File Ownership, Auth & Cross-Tenant Security

- **Unauthenticated Storage APIs (`CRITICAL SECURITY GAP`):**
  - `GET /api/storage/:organizationId` (`server.ts:4492`) — No auth; exposes all org filenames, categories, sizes, uploader emails, and URLs.
  - `POST /api/storage/:organizationId/check-upload` (`server.ts:4554`) — No auth.
  - `POST /api/storage/:organizationId/upload-binary` (`server.ts:4599`) — No JWT/membership validation; trusts URL `:organizationId` and `X-Uploaded-By`. Any caller can plant files or fill another tenant's quota, or bypass quota using `platform-profiles` / `hotel-onboarding-temp`.
  - `POST /api/storage/:organizationId/files` (`server.ts:4769`) — Unauthenticated metadata injection.
  - `DELETE /api/storage/:organizationId/files/:fileId` (`server.ts:4808`) — Unauthenticated; enables cross-tenant deletion.
- **Recommended Object Path Convention:**
  `{org_uuid}/{property_uuid_or_shared}/{subject_type}/{subject_uuid}/{category}/{document_uuid}.{ext}`  
  *(Authorization must enforce verified JWT `auth.uid()`, active `organization_memberships`, and `document_registry` ownership—never path string matching.)*

---

## 5. Storage Quotas

- **Quota Specification Conflict (`CONFLICT / INCONSISTENCY`):**
  - Expected / `phase2_4.sql` (`lines 56, 70`) / `ConsoleStorageView.tsx` (`line 144`): **Starter = 1 GB, Professional = 10 GB**.
  - Active runtime (`server.ts`, `src/lib/entitlements.ts`, `phase3_saas.sql`, `database_store.json`): **Starter = 10 GB, Professional = 50 GB**.
  - `organization_entitlements` table default (`phase2_4.sql:883`): **5 GB**.
- **Size Validation (`IMPLEMENTED` with bypass):** `upload-binary` enforces actual `fileBuffer.length` rather than client-supplied size, except for `'hotel-onboarding-temp'` and `'platform-profiles'`.
- **Concurrency & Reconciliation (`NOT IMPLEMENTED`):** JSON read-sum-write allows parallel upload quota races. Seeded dummy files (`file-lava-1..3`, 24.55 MB) exist only in JSON with non-existent `/org/hotel-lava/...` paths.
- **Downgrade & Super Admin Controls (`IMPLEMENTED`):** Downgrades preserve existing files while blocking new uploads over limit (`413`). Super Admin `PATCH /api/storage/:organizationId/quota` is protected by `requireSuperAdmin`.

---

## 6. Universal Identity Architecture

- **ID Type Conflict (`CONFLICT / INCONSISTENCY`):** App runtime generates non-UUID strings (`hotel-${Date.now()}`, `res-${Date.now()}`, `stf-${Date.now()}`, `gst-${hash}`), while `database_schema_phase2_4.sql` defines `UUID` primary keys. Phase 3 SQL tables reverted to `TEXT` keys as a workaround.
- **Recommended 3-Tier Identity Separation:**
  1. **Internal System IDs:** Immutable `UUID` primary keys (`gen_random_uuid()` / UUIDv7) for orgs, branches/campuses/facilities, domain subjects, reservations/encounters, and documents.
  2. **Organisation-Issued IDs:** Dedicated indexed `(organization_id, public_code)` columns (`IGHO-HTL-XXXX`, `GST-XXXX`, `ADM-XXXX`, `MRN-XXXX`).
  3. **Government IDs (NIN / Passport / Licence):** Never primary keys or URLs; stored encrypted/masked (`last4` + salted hash) in an isolated KYC verification table.

---

## 7. Hotel Identity Records (IGHO Stay)

- **Organisation, Branch, Room, Staff, Reservation, Payment IDs (`PARTIAL`):** Functional in JSON/Express; mismatched string vs UUID types with PostgreSQL schema.
- **No Persistent Guest Identity (`CRITICAL SECURITY GAP`):** There is no `hotel_guests` table. `StaffPortal.tsx` (`lines 1098–1147`) synthesizes `gst-${hash(email||phone||name)}` from reservations. Walk-in guests without email share `'walkin@guest.ighostay.com'` (`line 1182`), merging unrelated guests under one ID.
- **Property Name Mismatch (`CONFLICT / INCONSISTENCY`):** `Reservation` stores `idType`/`idNumber`, whereas `StaffPortal.tsx` (`line 1123`) reads `res.guestIdType`/`res.guestIdNumber` (always `undefined`).
- **Guest & Staff Identity Documents (`NOT IMPLEMENTED`):** No document upload slots or verification records exist for guest ID scans or staff credentials.

---

## 8. School Identity & Records (IGHO Classroom)

- **Current Status (`NOT IMPLEMENTED`):** Pre-launch waitlist only (`WaitlistViews.tsx`, `ConsoleSchoolsView.tsx`, `/api/waitlists`). Note: `ConsoleSchoolsView.tsx` still reads `localStorage` instead of `/api/waitlists`.
- **Target Requirements:** Separate internal UUIDs from school-issued admission/staff numbers; keep student photos, birth certificates, admission files, academic records, and teacher credentials strictly in private buckets (`identity-documents`, `organisation-media`) with guardian linkage and minor-privacy RLS.

---

## 9. Hospital Identity & Records (IGHO MedBay)

- **Current Status (`NOT IMPLEMENTED`):** Pre-launch waitlist only (`WaitlistViews.tsx`, `ConsoleHospitalsView.tsx`, `/api/waitlists`). Note: `ConsoleHospitalsView.tsx` also reads `localStorage` directly.
- **Target Requirements:** Separate internal `patient_uuid` from hospital MRN; isolate `health-records` (clinical reports, lab PDFs, diagnostic scans) behind clinical care-team RBAC + audit logs so receptionists, billing/finance staff, general admins, and platform Super Admins cannot read patient clinical records.

---

## 10. Privacy, Data Protection & NDPA 2023

- **Unauthenticated `GET /api/state` Leak (`CRITICAL SECURITY GAP`):** Returns reservations (with guest `idNumber` & addresses), `userProfiles`, `staff`, and payment proof URLs without authentication, and caches guest PII into browser `localStorage`.
- **Public Transfer Proofs & Unstripped EXIF (`CRITICAL SECURITY GAP`):** Financial receipts are publicly reachable; photos retain GPS/device EXIF metadata.
- **Biometrics (`NOT IMPLEMENTED`):** Not collected in code (must remain disabled absent DPIA + statutory authorization).
- **Legal Review (`REQUIRES LEGAL / COMPLIANCE REVIEW`):** Under Nigeria Data Protection Act (NDPA) 2023 (Data Minimisation, Security of Processing, Children's Data s.31, Sensitive Personal Data including health data & NIN, 72h breach reporting, cross-border transfers), qualified legal/DPO review is mandatory before storing real NINs, minors' files, or medical records.

---

## 11. Central Document Metadata Registry

- **Current Status (`PARTIAL`):** `state.storageFiles` JSON array tracks basic file properties for uploaded files only.
- **Required Design:** PostgreSQL `public.document_registry` (no binary blobs in DB) tracking: `id` (UUID), `organization_id`, `property_id`, `subject_type`, `subject_id` (UUID), `category`, `bucket_name`, `object_key`, `mime_type`, `size_bytes`, `sha256_checksum`, `uploaded_by`, `uploaded_at`, `verification_status`, `expires_at`, `retention_until`, `deleted_at`, paired with an immutable `public.document_access_logs` table.

---

## 12. Prioritized Action Roadmap & Security Test Scenarios

1. **P0 — Security Hotfixes:** Require JWT + org membership on `/api/storage/*`; remove public `express.static('/uploads')` and force-public `igho-media` behavior; move `payment_proofs` to private signed-URL access; strip PII/KYC fields from unauthenticated `/api/state` and `localStorage`.
2. **P1 — Bucket Split & Quota Fix:** Standardize quota tier numbers (`1/10 GB` vs `10/50 GB`); provision the 5 buckets with Storage RLS; enforce binary magic-byte inspection, EXIF stripping, SHA-256 deduplication, atomic quota locking, and actual Supabase deletion.
3. **P2 — Universal UUIDs & Document Registry:** Standardize on internal UUID primary keys + org-scoped human codes + `document_registry` + `document_access_logs`.
4. **P3 — Hotel Guest & KYC Records:** Create `hotel_guests` table (eliminating walk-in collisions), fix `idType`/`idNumber` field mismatch, and store KYC/staff docs in `identity-documents`.
5. **P4 — Classroom & MedBay + NDPA Legal Review:** Build isolated School and Clinical schemas/RLS and obtain NDPA 2023 DPO sign-off before ingesting live minor, NIN, or health data.

### Key Security Tests Required After Implementation
- Cross-tenant `GET/DELETE /api/storage/hotel-B` and direct public URL fetches on private buckets → must return `403`/`404`.
- MIME/size spoofing (`.html` renamed `.jpg`, mismatched `sizeBytes`) → rejected by magic-byte + actual byte-stream checks.
- Concurrent parallel uploads near quota limit → atomic rejection on excess; deletion frees exact bytes in both Supabase Storage and DB.
- Walk-in hotel guests without email → distinct `guest_uuid` records created.
- Hospital billing/reception/Super Admin access to `health-records` → denied without audited clinical authorization.
- School teacher access across unassigned classes/students → denied by RLS.
