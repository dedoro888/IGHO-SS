-- =============================================================================
-- IGHO STAY — PHASE 2.4 COMPLETE DATABASE SCHEMA & SECURITY DEFINER FUNCTIONS
-- =============================================================================
-- Features:
-- 1. Dual-tier room hold engine (PostgreSQL DATERANGE with GiST exclusion constraint)
-- 2. Append-only accommodation payment ledger with Receptionist confirm-only rules
-- 3. Dedicated independent caution deposit accounting ledger
-- 4. Paystack platform SaaS subscription billing with 100% absorbed processing fees
-- 5. Tenant-isolated private banking details and sanitized public checkout RPC
-- 6. Hardened Security Definer functions with SET search_path = ''
-- =============================================================================

-- Ensure required PostgreSQL extensions are active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =============================================================================
-- STAGE 1: PLATFORM SUBSCRIPTION PLANS & INVOICING (FEES ABSORBED BY IGHO)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_subscription_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  monthly_price_kobo BIGINT NOT NULL,
  annual_price_kobo BIGINT NOT NULL,
  trial_duration_days INTEGER NOT NULL DEFAULT 14,
  has_guest_portal BOOLEAN NOT NULL DEFAULT FALSE,
  max_rooms INTEGER NOT NULL DEFAULT 20,
  max_staff INTEGER NOT NULL DEFAULT 5,
  paystack_test_plan_code VARCHAR(64),
  paystack_live_plan_code VARCHAR(64),
  privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_subscription_plans ADD COLUMN IF NOT EXISTS privileges JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Seed official plans if not present
INSERT INTO public.platform_subscription_plans (
  id, name, description, monthly_price_kobo, annual_price_kobo, trial_duration_days, has_guest_portal, max_rooms, max_staff, paystack_test_plan_code, privileges, is_active
) VALUES 
  (
    'plan-starter-30k',
    'IGHO Stay Starter',
    'Core front desk, room inventory, housekeeping & staff management. Guest portal not included.',
    3000000,
    30000000,
    14,
    FALSE,
    20,
    5,
    'PLN_672y4vfa529gnlb',
    '{"hasGuestPortal":false,"maxRooms":20,"maxStaff":5,"maxBranches":1,"storageQuotaGb":1,"frontDeskPMS":true,"housekeeping":true,"guestFolios":true,"nightAudit":true,"cashierShifts":true,"maintenanceBlocks":true,"customRoles":false,"multiBranch":false,"cautionDeposits":false,"financialExports":false,"publicDirectoryListing":false,"prioritySupport":false}'::jsonb,
    TRUE
  ),
  (
    'plan-complete-50k',
    'IGHO Stay Professional',
    'Unlimited rooms, direct guest booking portal, multi-branch, custom editable roles, and caution deposits.',
    5000000,
    50000000,
    30,
    TRUE,
    999,
    100,
    'PLN_ggbmt8eyb51o6t5',
    '{"hasGuestPortal":true,"maxRooms":999,"maxStaff":100,"maxBranches":25,"storageQuotaGb":10,"frontDeskPMS":true,"housekeeping":true,"guestFolios":true,"nightAudit":true,"cashierShifts":true,"maintenanceBlocks":true,"customRoles":true,"multiBranch":true,"cautionDeposits":true,"financialExports":true,"publicDirectoryListing":true,"prioritySupport":true}'::jsonb,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_kobo = EXCLUDED.monthly_price_kobo,
  annual_price_kobo = EXCLUDED.annual_price_kobo,
  has_guest_portal = EXCLUDED.has_guest_portal,
  max_rooms = EXCLUDED.max_rooms,
  max_staff = EXCLUDED.max_staff,
  paystack_test_plan_code = EXCLUDED.paystack_test_plan_code,
  privileges = EXCLUDED.privileges;

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.platform_subscription_plans(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'cancelled', 'trialing', 'paused', 'expired')),
  billing_interval VARCHAR(24) NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual', '5year_contract')),
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'paystack_recurring' CHECK (payment_mode IN ('paystack_recurring', 'paystack_one_time', 'trial')),
  paystack_mode VARCHAR(16) NOT NULL DEFAULT 'test' CHECK (paystack_mode IN ('test', 'live')),
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  amount_kobo BIGINT NOT NULL,
  paystack_fee_absorbed_kobo BIGINT NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  pending_reference VARCHAR(128),
  paystack_plan_code VARCHAR(64),
  paystack_subscription_code TEXT,
  paystack_customer_code TEXT,
  paystack_email_token TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce exactly one active subscription per organization while preserving full subscription history
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_active_subscription
ON public.organization_subscriptions (organization_id)
WHERE (status = 'active');

CREATE TABLE IF NOT EXISTS public.platform_subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  paystack_invoice_code VARCHAR(128),
  plan_snapshot JSONB NOT NULL,
  base_amount_kobo BIGINT NOT NULL,
  paystack_fee_absorbed_kobo BIGINT NOT NULL DEFAULT 0,
  total_charged_kobo BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.platform_subscription_invoices(id) ON DELETE SET NULL,
  paystack_reference VARCHAR(128) NOT NULL UNIQUE,
  paystack_transaction_id BIGINT,
  paystack_mode VARCHAR(16) NOT NULL DEFAULT 'test',
  amount_charged_kobo BIGINT NOT NULL,
  fee_deducted_kobo BIGINT NOT NULL DEFAULT 0,
  net_settled_kobo BIGINT NOT NULL,
  channel VARCHAR(32),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(64) NOT NULL,
  reference VARCHAR(128),
  paystack_mode VARCHAR(16) NOT NULL DEFAULT 'test',
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STAGE 2: HOTEL RESERVATION POLICIES & PRIVATE PAYMENT SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hotel_reservation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  initial_unpaid_hold_minutes INTEGER CHECK (initial_unpaid_hold_minutes IS NULL OR (initial_unpaid_hold_minutes >= 5 AND initial_unpaid_hold_minutes <= 120)),
  max_unpaid_hold_minutes INTEGER NOT NULL DEFAULT 120,
  allow_guest_hold_extension BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hotel_private_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID,
  bank_name VARCHAR(128) NOT NULL,
  account_number VARCHAR(32) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  sort_code VARCHAR(32),
  transfer_instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STAGE 3: INVENTORY & DATERANGE ROOM OCCUPANCY ENGINE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hotel_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(32),
  address TEXT NOT NULL,
  city VARCHAR(128),
  state VARCHAR(128),
  phone VARCHAR(32),
  email VARCHAR(255),
  is_main BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.hotel_branches(id) ON DELETE SET NULL,
  room_number VARCHAR(32) NOT NULL,
  room_type VARCHAR(128) NOT NULL,
  price_per_night NUMERIC(14,2) NOT NULL CHECK (price_per_night >= 0),
  floor INTEGER DEFAULT 1,
  max_guests INTEGER DEFAULT 2,
  room_size INTEGER,
  bed_type VARCHAR(64),
  description TEXT,
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, room_number)
);

CREATE TABLE IF NOT EXISTS public.room_occupancy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  block_type VARCHAR(32) NOT NULL CHECK (block_type IN ('initial_hold', 'pending_verification_hold', 'reservation_confirmed', 'maintenance_block')),
  occupancy_period DATERANGE NOT NULL,
  reference_id UUID NOT NULL,
  lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'released', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Concurrency-Safe GiST Exclusion Constraint: Non-overlapping occupancy intervals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exclude_overlapping_room_occupancy'
  ) THEN
    ALTER TABLE public.room_occupancy_blocks
    ADD CONSTRAINT exclude_overlapping_room_occupancy
    EXCLUDE USING gist (
      room_id WITH =,
      occupancy_period WITH &&
    ) WHERE (lifecycle_state = 'active');
  END IF;
END $$;

-- =============================================================================
-- STAGE 4: RESERVATIONS & DUAL-TIER HOLD DECISION AUDIT
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.hotel_branches(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE RESTRICT,
  reference VARCHAR(64) NOT NULL UNIQUE,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(32),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  reservation_status VARCHAR(32) NOT NULL DEFAULT 'pending_verification' CHECK (reservation_status IN ('draft', 'pending_initial_payment', 'pending_verification', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired', 'rejected')),
  payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid', 'refunded')),
  hold_status VARCHAR(32) NOT NULL DEFAULT 'none' CHECK (hold_status IN ('none', 'initial_hold', 'pending_verification_hold', 'retained_hold', 'released', 'expired')),
  initial_hold_expires_at TIMESTAMPTZ,
  total_accommodation_amount NUMERIC(14,2) NOT NULL CHECK (total_accommodation_amount >= 0),
  amount_paid_accommodation NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid_accommodation >= 0),
  outstanding_accommodation_balance NUMERIC(14,2) NOT NULL,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS public.reservation_hold_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_taken VARCHAR(64) NOT NULL,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STAGE 5: APPEND-ONLY ACCOMMODATION PAYMENT LEDGER
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reservation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  submitted_amount NUMERIC(14,2) NOT NULL CHECK (submitted_amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  payment_method VARCHAR(32) NOT NULL DEFAULT 'bank_transfer',
  guest_bank_name VARCHAR(128),
  guest_account_name VARCHAR(255),
  guest_transfer_reference VARCHAR(128),
  proof_document_url TEXT,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reservation_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.reservation_payments(id) ON DELETE SET NULL,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL CHECK (event_type IN ('verification_confirmed', 'amount_adjustment', 'payment_reversal', 'accommodation_refund')),
  delta_amount NUMERIC(14,2) NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  event_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reservation_bank_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  bank_name VARCHAR(128) NOT NULL,
  account_number VARCHAR(32) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  sort_code VARCHAR(32),
  transfer_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STAGE 6: DEDICATED CAUTION DEPOSIT LEDGER (INDEPENDENT ACCOUNTING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reservation_caution_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.hotel_branches(id) ON DELETE SET NULL,
  reservation_id UUID NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  required_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (required_amount >= 0),
  collected_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
  deducted_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deducted_amount >= 0),
  refunded_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  current_deposit_balance NUMERIC(14,2) GENERATED ALWAYS AS (collected_amount - deducted_amount - refunded_amount) STORED,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'partially_deducted', 'fully_deducted', 'refunded', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (collected_amount >= (deducted_amount + refunded_amount))
);

CREATE TABLE IF NOT EXISTS public.caution_deposit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.reservation_caution_deposits(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL CHECK (event_type IN ('deposit_submitted', 'deposit_verified', 'damage_deduction', 'incidentals_deduction', 'fee_deduction', 'deposit_refund', 'forfeiture')),
  amount NUMERIC(14,2) NOT NULL,
  recipient_account_name VARCHAR(255),
  recipient_account_number VARCHAR(32),
  recipient_bank_name VARCHAR(128),
  refund_transfer_reference VARCHAR(128),
  itemized_deduction_items JSONB,
  inspection_notes TEXT,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STAGE 7: CUSTOM ROLES & STAFF INVITATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- =============================================================================
-- STAGE 8: HARDENED SECURITY DEFINER FUNCTIONS (SET search_path = '')
-- =============================================================================

-- Helper function: Check if caller has permission within an organization
CREATE OR REPLACE FUNCTION public.has_tenant_permission(
  p_org_id UUID,
  p_permission_code TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_memberships
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND status = 'active';

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Hotel owner has full permissions
  IF v_role = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- Manager permissions
  IF v_role = 'manager' AND p_permission_code NOT IN ('banking.edit_settings') THEN
    RETURN TRUE;
  END IF;

  -- Finance permissions
  IF v_role = 'finance' AND p_permission_code IN (
    'payments.view', 'payments.confirm_transfer', 'payments.reject', 'payments.adjust',
    'payments.refund', 'deposits.view', 'deposits.collect', 'deposits.verify',
    'deposits.deduct', 'deposits.refund', 'billing.view', 'reports.view', 'reports.export'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Receptionist permissions: CONFIRM ONLY for payments
  IF v_role = 'receptionist' AND p_permission_code IN (
    'payments.view', 'payments.confirm_transfer', 'holds.view', 'holds.retain',
    'deposits.view', 'deposits.collect', 'deposits.verify', 'reservations.view',
    'reservations.create', 'reservations.check_in', 'reservations.check_out',
    'rooms.view', 'rooms.update_status'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Housekeeping permissions
  IF v_role = 'housekeeping' AND p_permission_code IN ('rooms.view', 'rooms.update_status') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Sanitized Public RPC: Retrieve active hotel bank details for guest checkout
CREATE OR REPLACE FUNCTION public.get_hotel_guest_payment_instructions(
  p_org_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bank RECORD;
BEGIN
  SELECT bank_name, account_number, account_name, transfer_instructions
  INTO v_bank
  FROM public.hotel_private_payment_settings
  WHERE organization_id = p_org_id AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment instructions unconfigured.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bank_name', v_bank.bank_name,
    'account_number', v_bank.account_number,
    'account_name', v_bank.account_name,
    'transfer_instructions', v_bank.transfer_instructions
  );
END;
$$;

-- Atomic Guest Payment Verification: Receptionist CONFIRM ONLY
CREATE OR REPLACE FUNCTION public.verify_guest_payment_atomic(
  p_payment_id UUID,
  p_bank_reference VARCHAR
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment RECORD;
  v_res RECORD;
  v_new_paid NUMERIC(14,2);
  v_new_balance NUMERIC(14,2);
  v_new_pay_status TEXT;
  v_new_res_status TEXT;
BEGIN
  -- 1. Lock payment row FOR UPDATE
  SELECT * INTO v_payment
  FROM public.reservation_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  -- Authorize caller
  IF NOT public.has_tenant_permission(v_payment.organization_id, 'payments.confirm_transfer') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED_CANNOT_CONFIRM_PAYMENT';
  END IF;

  -- Prevent duplicate confirmation credit
  IF v_payment.verification_status != 'pending' THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_RESOLVED: %', v_payment.verification_status;
  END IF;

  -- 2. Mark payment verified
  UPDATE public.reservation_payments
  SET verification_status = 'verified',
      verified_by = auth.uid(),
      verified_at = NOW()
  WHERE id = p_payment_id;

  -- 3. Append to immutable payment events ledger
  INSERT INTO public.reservation_payment_events (
    payment_id, reservation_id, organization_id, event_type, delta_amount, actor_id, reason
  ) VALUES (
    p_payment_id, v_payment.reservation_id, v_payment.organization_id,
    'verification_confirmed', v_payment.submitted_amount, auth.uid(),
    'Bank transfer verified against actual bank records'
  );

  -- 4. Lock reservation and update balances
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = v_payment.reservation_id
  FOR UPDATE;

  v_new_paid := v_res.amount_paid_accommodation + v_payment.submitted_amount;
  v_new_balance := GREATEST(0, v_res.total_accommodation_amount - v_new_paid);

  IF v_new_balance = 0 THEN
    v_new_pay_status := 'fully_paid';
    v_new_res_status := 'confirmed';
  ELSE
    v_new_pay_status := 'partially_paid';
    v_new_res_status := v_res.reservation_status;
  END IF;

  UPDATE public.reservations
  SET amount_paid_accommodation = v_new_paid,
      outstanding_accommodation_balance = v_new_balance,
      payment_status = v_new_pay_status,
      reservation_status = v_new_res_status,
      hold_status = 'retained_hold',
      updated_at = NOW()
  WHERE id = v_res.id;

  -- If fully paid, transition occupancy block to confirmed
  IF v_new_pay_status = 'fully_paid' THEN
    UPDATE public.room_occupancy_blocks
    SET block_type = 'reservation_confirmed',
        updated_at = NOW()
    WHERE reference_id = v_res.id AND lifecycle_state = 'active';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'reservation_id', v_res.id,
    'amount_paid', v_new_paid,
    'outstanding_balance', v_new_balance,
    'payment_status', v_new_pay_status,
    'reservation_status', v_new_res_status
  );
END;
$$;

-- Atomic Payment Rejection: Receptionists are strictly forbidden!
CREATE OR REPLACE FUNCTION public.reject_guest_payment_atomic(
  p_payment_id UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment RECORD;
  v_caller_role TEXT;
BEGIN
  SELECT * INTO v_payment
  FROM public.reservation_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  -- Check caller role
  SELECT role INTO v_caller_role
  FROM public.organization_memberships
  WHERE organization_id = v_payment.organization_id AND user_id = auth.uid() AND status = 'active';

  IF v_caller_role = 'receptionist' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED_RECEPTIONIST_CANNOT_REJECT: Receptionists have confirm-only authority.';
  END IF;

  IF NOT public.has_tenant_permission(v_payment.organization_id, 'payments.reject') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  -- Update payment
  UPDATE public.reservation_payments
  SET verification_status = 'rejected',
      rejection_reason = p_reason,
      verified_by = auth.uid(),
      verified_at = NOW()
  WHERE id = p_payment_id;

  -- Release room occupancy hold
  UPDATE public.room_occupancy_blocks
  SET lifecycle_state = 'released',
      updated_at = NOW()
  WHERE reference_id = v_payment.reservation_id AND lifecycle_state = 'active';

  UPDATE public.reservations
  SET reservation_status = 'rejected',
      hold_status = 'released',
      updated_at = NOW()
  WHERE id = v_payment.reservation_id;

  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id, 'status', 'rejected');
END;
$$;

-- Atomic Caution Deposit Deduction (Damage / Mini-bar / Incidentals)
CREATE OR REPLACE FUNCTION public.deduct_caution_deposit_atomic(
  p_deposit_id UUID,
  p_amount NUMERIC(14,2),
  p_items JSONB,
  p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deposit RECORD;
  v_new_deducted NUMERIC(14,2);
  v_new_balance NUMERIC(14,2);
BEGIN
  SELECT * INTO v_deposit
  FROM public.reservation_caution_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_FOUND';
  END IF;

  IF NOT public.has_tenant_permission(v_deposit.organization_id, 'deposits.deduct') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED_DEPOSIT_DEDUCTION';
  END IF;

  IF p_amount > v_deposit.current_deposit_balance THEN
    RAISE EXCEPTION 'DEDUCTION_EXCEEDS_BALANCE: Requested %, available %', p_amount, v_deposit.current_deposit_balance;
  END IF;

  v_new_deducted := v_deposit.deducted_amount + p_amount;

  UPDATE public.reservation_caution_deposits
  SET deducted_amount = v_new_deducted,
      status = CASE WHEN (v_deposit.collected_amount - v_new_deducted - v_deposit.refunded_amount) = 0 THEN 'fully_deducted' ELSE 'partially_deducted' END,
      updated_at = NOW()
  WHERE id = p_deposit_id;

  INSERT INTO public.caution_deposit_events (
    deposit_id, reservation_id, organization_id, event_type, amount,
    itemized_deduction_items, inspection_notes, actor_id
  ) VALUES (
    p_deposit_id, v_deposit.reservation_id, v_deposit.organization_id,
    'damage_deduction', p_amount, p_items, p_notes, auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'deposit_id', p_deposit_id, 'deducted_amount', v_new_deducted);
END;
$$;

-- Atomic Caution Deposit Refund
CREATE OR REPLACE FUNCTION public.refund_caution_deposit_atomic(
  p_deposit_id UUID,
  p_amount NUMERIC(14,2),
  p_account_name VARCHAR,
  p_account_number VARCHAR,
  p_bank_name VARCHAR,
  p_transfer_ref VARCHAR
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deposit RECORD;
  v_new_refunded NUMERIC(14,2);
BEGIN
  SELECT * INTO v_deposit
  FROM public.reservation_caution_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_FOUND';
  END IF;

  IF NOT public.has_tenant_permission(v_deposit.organization_id, 'deposits.refund') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED_DEPOSIT_REFUND';
  END IF;

  IF p_amount > v_deposit.current_deposit_balance THEN
    RAISE EXCEPTION 'REFUND_EXCEEDS_BALANCE: Requested %, available %', p_amount, v_deposit.current_deposit_balance;
  END IF;

  v_new_refunded := v_deposit.refunded_amount + p_amount;

  UPDATE public.reservation_caution_deposits
  SET refunded_amount = v_new_refunded,
      status = CASE WHEN (v_deposit.collected_amount - v_deposit.deducted_amount - v_new_refunded) = 0 THEN 'refunded' ELSE 'partially_deducted' END,
      updated_at = NOW()
  WHERE id = p_deposit_id;

  INSERT INTO public.caution_deposit_events (
    deposit_id, reservation_id, organization_id, event_type, amount,
    recipient_account_name, recipient_account_number, recipient_bank_name,
    refund_transfer_reference, actor_id
  ) VALUES (
    p_deposit_id, v_deposit.reservation_id, v_deposit.organization_id,
    'deposit_refund', p_amount, p_account_name, p_account_number, p_bank_name,
    p_transfer_ref, auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'deposit_id', p_deposit_id, 'refunded_amount', v_new_refunded);
END;
$$;

-- Manual Room Hold Action: Retain or Release
CREATE OR REPLACE FUNCTION public.manage_room_hold_manual(
  p_reservation_id UUID,
  p_action VARCHAR,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res RECORD;
  v_caller_role TEXT;
BEGIN
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.organization_memberships
  WHERE organization_id = v_res.organization_id AND user_id = auth.uid() AND status = 'active';

  -- Receptionists can retain, but release/cancellation requires Manager or Finance
  IF p_action = 'release_hold' AND v_caller_role = 'receptionist' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED_RECEPTIONIST_CANNOT_RELEASE_HOLD';
  END IF;

  INSERT INTO public.reservation_hold_decisions (
    reservation_id, organization_id, action_taken, decided_by, decision_reason
  ) VALUES (
    p_reservation_id, v_res.organization_id, p_action, auth.uid(), p_reason
  );

  IF p_action = 'release_hold' THEN
    UPDATE public.room_occupancy_blocks
    SET lifecycle_state = 'released',
        updated_at = NOW()
    WHERE reference_id = p_reservation_id AND lifecycle_state = 'active';

    UPDATE public.reservations
    SET reservation_status = 'cancelled',
        hold_status = 'released',
        updated_at = NOW()
  WHERE id = p_reservation_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'action', p_action);
END;
$$;

-- =============================================================================
-- STAGE 5: USER PROFILES, HOTEL MEDIA/PROFILES & ORGANIZATION ENTITLEMENTS
-- =============================================================================

ALTER TABLE public.organization_subscriptions ADD COLUMN IF NOT EXISTS privileges JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_image_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  first_name VARCHAR(128) NOT NULL DEFAULT '',
  last_name VARCHAR(128) NOT NULL DEFAULT '',
  phone VARCHAR(64) DEFAULT '',
  address TEXT DEFAULT '',
  city VARCHAR(128) DEFAULT '',
  state VARCHAR(128) DEFAULT '',
  country VARCHAR(128) DEFAULT 'Nigeria',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hotel_profiles (
  organization_id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  logo_image_url TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city VARCHAR(128) DEFAULT '',
  state VARCHAR(128) DEFAULT '',
  country VARCHAR(128) DEFAULT 'Nigeria',
  phone VARCHAR(64) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  website TEXT DEFAULT '',
  instagram VARCHAR(255) DEFAULT '',
  facebook VARCHAR(255) DEFAULT '',
  bank_name VARCHAR(128) DEFAULT '',
  account_name VARCHAR(255) DEFAULT '',
  account_number VARCHAR(32) DEFAULT '',
  transfer_instructions TEXT DEFAULT '',
  online_bookings_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_customer_registration BOOLEAN NOT NULL DEFAULT TRUE,
  show_room_prices BOOLEAN NOT NULL DEFAULT TRUE,
  show_room_availability BOOLEAN NOT NULL DEFAULT TRUE,
  require_id_verification BOOLEAN NOT NULL DEFAULT FALSE,
  branches JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by VARCHAR(255) DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_entitlements (
  organization_id TEXT PRIMARY KEY,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.platform_subscription_plans(id),
  plan_name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(32) NOT NULL DEFAULT 'active',
  has_guest_portal BOOLEAN NOT NULL DEFAULT FALSE,
  max_rooms INTEGER NOT NULL DEFAULT 20,
  max_staff INTEGER NOT NULL DEFAULT 5,
  storage_quota_bytes BIGINT NOT NULL DEFAULT 5368709120,
  privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS across all tables
ALTER TABLE public.platform_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_reservation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_private_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_occupancy_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_hold_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_bank_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_caution_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caution_deposit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles, hotel_profiles, and organization_entitlements
DROP POLICY IF EXISTS "Users can view own profile row" ON public.user_profiles;
CREATE POLICY "Users can view own profile row" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "Users can upsert own profile row" ON public.user_profiles;
CREATE POLICY "Users can upsert own profile row" ON public.user_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  WITH CHECK (auth.uid() = user_id OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "Public can read active hotel profiles" ON public.hotel_profiles;
CREATE POLICY "Public can read active hotel profiles" ON public.hotel_profiles
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated staff can view org entitlements" ON public.organization_entitlements;
CREATE POLICY "Authenticated staff can view org entitlements" ON public.organization_entitlements
  FOR SELECT TO authenticated
  USING (TRUE);

-- Grant EXECUTE to authenticated users
GRANT EXECUTE ON FUNCTION public.has_tenant_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hotel_guest_payment_instructions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_guest_payment_atomic(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_guest_payment_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_caution_deposit_atomic(UUID, NUMERIC, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_caution_deposit_atomic(UUID, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_room_hold_manual(UUID, VARCHAR, TEXT) TO authenticated;
