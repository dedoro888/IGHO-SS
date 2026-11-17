-- =========================================================================
-- IGHO SOFTWARE SYSTEMS — PHASE 3 SAAS RESTRUCTURING MIGRATION (BACKWARD-COMPATIBLE)
-- =========================================================================

-- 1. Ensure organization subdomain slug and custom receipt branding columns exist safely
ALTER TABLE IF EXISTS organizations
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS custom_receipt_branding JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique
  ON organizations(slug) WHERE slug IS NOT NULL;

-- 2. Authoritative Subscription Plans Table
CREATE TABLE IF NOT EXISTS platform_subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price NUMERIC NOT NULL,
  annual_price NUMERIC NOT NULL,
  max_rooms INTEGER NOT NULL,
  max_staff INTEGER NOT NULL,
  max_branches INTEGER NOT NULL,
  storage_quota_gb INTEGER NOT NULL,
  backup_frequency TEXT NOT NULL CHECK (backup_frequency IN ('weekly', 'daily')),
  monthly_notification_limit INTEGER NULL,
  privileges JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_subscription_plans (
  id, name, monthly_price, annual_price, max_rooms, max_staff, max_branches,
  storage_quota_gb, backup_frequency, monthly_notification_limit, privileges
) VALUES
(
  'plan-starter-30k',
  'IGHO Stay Starter',
  30000,
  300000,
  20,
  5,
  1,
  10,
  'weekly',
  100,
  '{"hasGuestPortal":false,"maxRooms":20,"maxStaff":5,"maxBranches":1,"storageQuotaGb":10,"backupFrequency":"weekly","monthlyNotificationLimit":100,"frontDeskPMS":true,"housekeeping":false,"guestFolios":false,"nightAudit":false,"cashierShifts":false,"maintenanceBlocks":false,"customRoles":false,"multiBranch":false,"financialExports":true,"advancedReports":false,"scheduledReports":false,"brandedReceipts":false,"publicDirectoryListing":false,"prioritySupport":false,"featureRequestsAccess":true,"prioritySla":false}'::jsonb
),
(
  'plan-complete-50k',
  'IGHO Stay Professional',
  50000,
  500000,
  60,
  15,
  3,
  50,
  'daily',
  NULL,
  '{"hasGuestPortal":true,"maxRooms":60,"maxStaff":15,"maxBranches":3,"storageQuotaGb":50,"backupFrequency":"daily","monthlyNotificationLimit":null,"frontDeskPMS":true,"housekeeping":true,"guestFolios":true,"nightAudit":true,"cashierShifts":true,"maintenanceBlocks":true,"customRoles":true,"multiBranch":true,"financialExports":true,"advancedReports":true,"scheduledReports":true,"brandedReceipts":true,"publicDirectoryListing":true,"prioritySupport":true,"featureRequestsAccess":true,"prioritySla":true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  max_rooms = EXCLUDED.max_rooms,
  max_staff = EXCLUDED.max_staff,
  max_branches = EXCLUDED.max_branches,
  storage_quota_gb = EXCLUDED.storage_quota_gb,
  backup_frequency = EXCLUDED.backup_frequency,
  monthly_notification_limit = EXCLUDED.monthly_notification_limit,
  privileges = EXCLUDED.privileges,
  updated_at = NOW();

-- 3. Subscription Exception Overrides & History (Auditability + Enterprise Overrides)
CREATE TABLE IF NOT EXISTS subscription_exceptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  max_rooms_override INTEGER,
  max_staff_override INTEGER,
  max_branches_override INTEGER,
  storage_quota_gb_override INTEGER,
  reason TEXT,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS subscription_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  previous_plan_id TEXT,
  new_plan_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Organization Backups & Notification Monthly Quota Usage
CREATE TABLE IF NOT EXISTS organization_backups (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  backup_frequency TEXT NOT NULL CHECK (backup_frequency IN ('weekly', 'daily')),
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  triggered_by TEXT NOT NULL,
  checksum TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_notification_usage (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  usage_month TEXT NOT NULL, -- YYYY-MM
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, usage_month)
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipient_email TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'pdf',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Feature Requests & Custom Development System (Strict Multi-Tenant Isolation)
CREATE TABLE IF NOT EXISTS hotel_feature_requests (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'professional')),
  title TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  requested_feature TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  quotation_amount NUMERIC,
  quotation_currency TEXT DEFAULT 'NGN',
  expected_delivery_date TEXT,
  submitted_by_email TEXT NOT NULL,
  submitted_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_request_messages (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES hotel_feature_requests(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('hotel', 'super_admin')),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Personalized Single-Use Feature Activation System (Hashed Codes + Per-Tenant Entitlements)
CREATE TABLE IF NOT EXISTS personalized_feature_activations (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  request_id TEXT,
  code_hash TEXT NOT NULL,
  code_salt TEXT NOT NULL,
  code_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'activated', 'revoked', 'expired')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ,
  activated_by_email TEXT,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS custom_feature_entitlements (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  activation_id TEXT NOT NULL REFERENCES personalized_feature_activations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by_email TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  UNIQUE(hotel_id, feature_id)
);

-- 7. In-App User Notification Feed (Demo Completed, Registration Approved, Activation Alerts)
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  cta_label TEXT,
  cta_screen TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies (Safe Multi-Tenant Isolation)
ALTER TABLE hotel_feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalized_feature_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_requests_tenant_isolation ON hotel_feature_requests;
CREATE POLICY feature_requests_tenant_isolation ON hotel_feature_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM platform_roles pr WHERE pr.user_id = auth.uid() AND pr.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = hotel_feature_requests.hotel_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS custom_entitlements_tenant_isolation ON custom_feature_entitlements;
CREATE POLICY custom_entitlements_tenant_isolation ON custom_feature_entitlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_roles pr WHERE pr.user_id = auth.uid() AND pr.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = custom_feature_entitlements.hotel_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS notifications_owner_only ON user_notifications;
CREATE POLICY notifications_owner_only ON user_notifications
  FOR ALL USING (LOWER(recipient_email) = LOWER(auth.jwt()->>'email'));
