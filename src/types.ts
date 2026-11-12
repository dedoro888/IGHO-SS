export type ActiveScreen =
  | 'landing'
  | 'setup_selector'
  | 'hotel_onboarding'
  | 'hotel_directory'
  | 'hotel_guest_portal'
  | 'room_detail'
  | 'guest_checkout'
  | 'guest_payment'
  | 'guest_dashboard'
  | 'guest_login'
  | 'staff_login'
  | 'staff_portal'
  | 'hotel_subscription_plan'
  | 'staff_invitation_accept'
  | 'super_admin_console'
  | 'classroom_waitlist'
  | 'medbay_waitlist'
  | 'demo_request';

export type PermissionId =
  | 'dashboard.view'
  | 'reservations.view'
  | 'reservations.create'
  | 'reservations.edit'
  | 'reservations.cancel'
  | 'reservations.check_in'
  | 'reservations.check_out'
  | 'rooms.view'
  | 'rooms.create'
  | 'rooms.edit'
  | 'rooms.delete'
  | 'guests.view'
  | 'guests.create'
  | 'guests.edit'
  | 'guests.delete'
  | 'billing.view'
  | 'billing.create'
  | 'billing.edit'
  | 'billing.delete'
  | 'billing.refund'
  | 'housekeeping.view'
  | 'housekeeping.create'
  | 'housekeeping.edit'
  | 'housekeeping.delete'
  | 'reports.view'
  | 'reports.export'
  | 'users.view'
  | 'users.invite'
  | 'users.edit'
  | 'users.deactivate'
  | 'settings.view'
  | 'settings.edit';

// ==========================================
// Supabase PostgreSQL Database Schema Types
// ==========================================

export type DbOrganizationRole =
  | 'owner'
  | 'manager'
  | 'receptionist'
  | 'finance'
  | 'housekeeping'
  | 'customer';

export interface DbProfile {
  id: string; // references auth.users.id
  full_name: string | null;
  phone: string | null;
  account_status: 'active' | 'suspended' | 'pending' | string;
  created_at: string;
  updated_at: string;
}

export interface DbOrganization {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'suspended' | string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface DbOrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string; // references profiles.id
  role: DbOrganizationRole;
  status: 'active' | 'pending' | 'suspended' | string;
  created_at: string;
  updated_at: string;
}

export interface DbPlatformRole {
  id: string;
  user_id: string; // references profiles.id
  role: 'super_admin' | string;
  granted_at: string;
}

export interface ResolvedAuthAccount {
  userId: string;
  email: string;
  profile: DbProfile | null;
  isSuperAdmin: boolean;
  membership: DbOrganizationMembership | null;
  organization: DbOrganization | null;
  effectiveRole: 'super_admin' | DbOrganizationRole;
  targetScreen: ActiveScreen;
  accessGranted: boolean;
  denialReason?: string;
}

export type StaffRole = 'hotel_owner' | 'manager' | 'receptionist' | 'finance' | 'housekeeping';

export interface HotelBranch {
  id: string;
  hotelId?: string;
  code?: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  roomCount?: number;
  isMain?: boolean;
  isActive?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Room {
  id: string;
  number: string;
  type: string; // e.g. 'Luxury Suite', 'Presidential Suite', 'Standard Double', etc.
  typeName?: string; // e.g. 'Cozy luxury suite with modern amenities'
  pricePerNight: number; // in Naira (₦)
  status:
    | 'Vacant / Clean'
    | 'Vacant / Dirty'
    | 'Occupied / Clean'
    | 'Occupied / Needs Service'
    | 'Cleaning in Progress'
    | 'Inspected'
    | 'Maintenance'
    | 'available'
    | 'occupied'
    | 'reserved'
    | 'cleaning'
    | 'maintenance';
  floor?: number;
  maxGuests?: number;
  roomSize?: number; // sqm
  bed?: string;
  description: string;
  amenities?: string[];
  images?: string[];
  hotelId?: string;
  tier?: string;
  capacity?: number;
  beds?: string;
  view?: string;
  features?: string[];
  image?: string;
  branchId?: string;
  branchName?: string;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
  country?: string;
  rating?: number;
  isLive: boolean;
  roomCount: number;
  startingPrice?: number;
  coverImage: string;
  logoImage?: string;
  address: string;
  email: string;
  phone: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  registeredBusiness: boolean;
  cacNumber?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  paystackSubaccountId?: string;
  paystackAccountCode?: string;
  settlementType?: 'paystack_subaccount' | 'direct_bank';
  website?: string;
  instagram?: string;
  facebook?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  branches?: HotelBranch[];
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  organizationType?: 'hotel' | 'school' | 'hospital';
  reviewCount?: number;
  packageType?: 'management' | 'complete';
  paymentStatus?: 'pending' | 'paid';
  status?: 'active' | 'pending' | 'suspended';
  description?: string;
  subscriptionPlanId?: string;
  subscriptionPlanName?: string;
  hasGuestPortal?: boolean;
  subscriptionStatus?: 'trial' | 'active' | 'pending' | 'expired' | 'none';
  billingCycle?: 'monthly' | 'annual' | '5year_contract';
  trialCode?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isContractPlan?: boolean;
}

export interface Reservation {
  id: string;
  reference: string;
  hotelId: string;
  hotelName: string;
  branchId?: string;
  branchName?: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  idType?: string;
  idNumber?: string;
  address?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  checkInTime?: string; // e.g. 14:00
  checkOutTime?: string; // e.g. 11:00
  nights: number;
  guests: number;
  total: number;
  lockedRatePerNight?: number; // Immutable locked rate from booking creation time
  status:
    | 'pending_verification'
    | 'pending_payment'
    | 'confirmed'
    | 'rejected'
    | 'checked_in'
    | 'checked_out'
    | 'cancelled'
    | 'date_changed'
    | 'upgraded';
  createdAt: string;
  paymentRef?: string;
  receiptUrl?: string;
  specialRequests?: string;
  source?: string;
  verifiedAt?: string;
  cancellationReason?: string;
  cancellationRequestedAt?: string;
  refundStatus?: 'none' | 'pending' | 'initiated' | 'completed';
  refundAmount?: number;
  refundBankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  refundInitiatedAt?: string;
  refundCompletedAt?: string;
  refundRef?: string;
  refundNotes?: string;
  originalDates?: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  dateChangedAt?: string;
  dateChangeStatus?: 'pending_review' | 'confirmed';
  upgradeDetails?: {
    previousRoomType: string;
    previousRoomNumber: string;
    previousPricePerNight: number;
    upgradedRoomType: string;
    upgradedRoomNumber?: string;
    newPricePerNight: number;
    upgradeBalancePaid: number;
    upgradePaymentRef?: string;
    upgradedAt: string;
    roomAllocated?: boolean;
    allocatedRoomNumber?: string;
  };
}

export interface StaffAccount {
  id: string;
  hotelId: string;
  name: string;
  email: string;
  role: StaffRole;
  roles?: string[];
  status: 'active' | 'invited' | 'deactivated';
  permissions: PermissionId[];
  addedDate: string;
  active: boolean;
}

export interface StaffInvitation {
  id: string;
  hotelId: string;
  hotelName?: string;
  email: string;
  role: 'manager' | 'receptionist' | 'finance' | 'housekeeping' | string;
  token?: string;
  createdAt?: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy?: string;
  invitedAt?: string;
  expiresAt?: string;
}

export interface CustomerFeedback {
  id: string;
  hotelId: string;
  hotelName: string;
  reservationRef?: string;
  guestEmail: string;
  guestName: string;
  type: 'review' | 'complaint';
  rating?: number; // 1-5 for reviews
  category: string;
  subject: string;
  content: string;
  createdAt: string;
  status: 'new' | 'open' | 'investigating' | 'resolved' | 'closed';
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
}

export interface CustomRole {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  permissions: PermissionId[];
  active: boolean;
  createdAt: string;
}

export interface GuestReport {
  id: string;
  hotelId: string;
  hotelName: string;
  reservationId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomNumber?: string;
  category: 'maintenance' | 'cleanliness' | 'noise' | 'billing' | 'staff_service' | 'amenity' | 'other';
  subject: string;
  description: string;
  status: 'submitted' | 'under_review' | 'in_progress' | 'resolved';
  createdAt: string;
  hotelFeedback?: string;
  respondedAt?: string;
}

export interface HousekeepingTask {
  id: string;
  hotelId?: string;
  roomId?: string;
  roomNumber?: string;
  room?: string;
  roomType?: string;
  type?: string;
  task?: string;
  taskType?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'normal' | string;
  assigned?: string;
  assignedTo?: string;
  assignedStaffEmail?: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedDate?: string;
  requestedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDurationDays: number;
  features: string[];
  maxRooms: number;
  maxStaff: number;
  maxUsers: number;
  productAccess: ('stay' | 'classroom' | 'medbay')[];
  hasGuestPortal?: boolean;
  active: boolean;
  contractDiscountPercent?: number; // e.g. 87% rate
  contractAnnualPrice?: number;
  contractFiveYearTotal?: number;
  contractDepositRequired?: number; // e.g. 20% deposit
}

export interface HotelSubscription {
  id: string;
  hotelId: string;
  hotelName: string;
  planId: string;
  planName: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';
  amount: number;
  billingCycle: 'monthly' | 'annual' | '5year_contract';
  startDate: string;
  renewalDate: string;
  trialEndDate?: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'overdue';
  isContract?: boolean;
  contractYears?: number;
  depositPaid?: number;
}

export interface PlatformTransaction {
  id: string;
  reference: string;
  hotelId: string;
  hotelName: string;
  amount: number;
  currency: string;
  planId?: string;
  planName?: string;
  paymentStatus: 'successful' | 'pending' | 'failed' | 'refunded';
  paymentDate: string;
  billingPeriod: string;
  paymentMethod: string;
}

export interface PlatformAuditLog {
  id: string;
  actorEmail: string;
  action:
    | 'APPROVE_HOTEL'
    | 'REJECT_HOTEL'
    | 'SUSPEND_HOTEL'
    | 'REACTIVATE_HOTEL'
    | 'DELETE_HOTEL'
    | 'ASSIGN_ROLE'
    | 'CHANGE_ROLE'
    | 'DEACTIVATE_USER'
    | 'BAN_USER'
    | 'REACTIVATE_USER'
    | 'CHANGE_SUBSCRIPTION_PRICE'
    | 'CHANGE_PLAN'
    | 'REFUND_PAYMENT'
    | 'UPDATE_PLATFORM_SETTING'
    | 'UPDATE_USER_PROFILE'
    | 'RESOLVE_COMPLAINT';
  target: string;
  targetType: 'hotel' | 'user' | 'subscription' | 'setting' | 'complaint' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
  previousValue?: string;
  newValue?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'hotel_owner' | 'hotel_manager' | 'receptionist' | 'finance' | 'housekeeping' | 'customer';
  organizationId?: string;
  organizationName?: string;
  status: 'active' | 'deactivated' | 'suspended';
  createdAt: string;
  lastActivity: string;
  avatar?: string;
}

export interface PlatformProduct {
  id: 'stay' | 'classroom' | 'medbay';
  name: string;
  tagline: string;
  description: string;
  status: 'production_live' | 'development' | 'waitlist';
  activeOrganizations: number;
  totalUsers: number;
  waitlistCount?: number;
  targetLaunch?: string;
  launchedDate?: string;
}

export interface PlatformSocialHandle {
  id: string;
  platform: 'x' | 'instagram' | 'linkedin' | 'facebook' | 'youtube' | 'tiktok' | 'other';
  platformName: string;
  handle: string;
  url: string;
}

export interface PlatformSettings {
  general: {
    platformName: string;
    supportEmail: string;
    supportPhone: string;
    companyInfo: string;
    footerAboutText?: string;
    copyrightText?: string;
  };
  subscriptionPayout?: {
    walletOrAccount: string;
    networkOrBank: string;
    recipientName: string;
    accountNumber: string;
    paystackSubaccountId?: string;
    linkedBankName?: string;
    linkedAccountNumber?: string;
    notes?: string;
  };
  socialHandles?: PlatformSocialHandle[];
  subscription: {
    defaultTrialDays: number;
    gracePeriodDays: number;
    currency: string;
    autoRenewalDefault: boolean;
  };
  registration: {
    registrationEnabled: boolean;
    autoApproveHotels: boolean;
    requireCacVerification: boolean;
    requireBankVerification: boolean;
  };
  notifications: {
    notifyOnNewRegistration: boolean;
    notifyOnPaymentFailure: boolean;
    notifyOnSuspension: boolean;
  };
  security: {
    sessionTimeoutHours: number;
    enforceSuperAdmin2FA: boolean;
    requireSensitiveActionConfirmation: boolean;
  };
  featureFlags: {
    enableMultiBranch: boolean;
    enableAiRoomPricing: boolean;
    enablePublicReviews: boolean;
    enableClassroomBeta: boolean;
    enableMedBayBeta: boolean;
  };
}

export interface DemoRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  orgName: string;
  orgType: string;
  productInterested: 'stay' | 'classroom' | 'medbay';
  demoDate: string;
  demoTime: string;
  message?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface TrialToken {
  id: string;
  code: string;
  durationDays: number; // 30 days default for 1 month
  assignedHotelId?: string;
  assignedHotelName?: string;
  status: 'active' | 'used' | 'revoked';
  createdAt: string;
  createdBy: string;
  claimedByHotelId?: string;
  claimedByHotelName?: string;
  claimedAt?: string;
  notes?: string;
}

export interface WaitlistEntry {
  id: string;
  product: 'classroom' | 'medbay';
  fullName: string;
  email: string;
  phone: string;
  orgName: string;
  institutionType: string;
  city: string;
  stateName: string;
  additionalComments?: string;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

// ─── ENTERPRISE PMS HOSPITALITY DATA MODELS ───

export interface CashierShift {
  id: string;
  hotelId: string;
  cashierEmail: string;
  cashierName: string;
  terminalId: string;
  openedAt: string;
  openingFloat: number; // in NGN (₦)
  closedAt?: string;
  closingCashCount?: number;
  expectedCash?: number;
  variance?: number; // actual - expected
  varianceReason?: string;
  cashIn: number;
  cashOut: number;
  posCardTotal: number;
  bankTransferTotal: number;
  status: 'open' | 'closed';
  handoverTo?: string;
  handoverNotes?: string;
}

export interface FolioCharge {
  id: string;
  folioId: string;
  date: string;
  description: string;
  category: 'room' | 'vat' | 'consumption_tax' | 'service_charge' | 'food_beverage' | 'laundry' | 'caution_deposit' | 'other';
  amount: number; // in NGN
  postedBy: string;
  isReversed?: boolean;
  reversalRefId?: string;
  businessDate: string;
}

export interface LinkedReversal {
  id: string;
  originalChargeId: string;
  folioId: string;
  amount: number; // negative number
  reason: string;
  requestedBy: string;
  approverEmail: string;
  approvedAt: string;
  timestamp: string;
}

export interface FolioPayment {
  id: string;
  folioId: string;
  date: string;
  amount: number;
  method: 'cash' | 'pos_card' | 'bank_transfer' | 'paystack' | 'deposit_credit';
  receiptNumber: string; // sequential no-gap
  receivedBy: string;
  notes?: string;
  businessDate: string;
}

export interface GuestFolio {
  id: string;
  hotelId: string;
  reservationId: string;
  folioType: 'master' | 'room' | 'incidentals' | 'corporate_split';
  folioNumber: string; // e.g. FOL-2026-001
  guestName: string;
  guestEmail: string;
  roomNumber: string;
  charges: FolioCharge[];
  payments: FolioPayment[];
  reversals: LinkedReversal[];
  totalCharges: number;
  totalPayments: number;
  balanceDue: number;
  status: 'open' | 'settled' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface RefundRequest {
  id: string;
  hotelId: string;
  reservationId: string;
  guestName: string;
  guestEmail: string;
  amount: number;
  reason: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'settled';
  requesterEmail: string;
  requesterName: string;
  requestedAt: string;
  approverEmail?: string;
  approvedAt?: string;
  rejectionReason?: string;
  settlementMethod?: string;
  settlementRef?: string;
}

export interface NightAuditRecord {
  id: string;
  hotelId: string;
  businessDate: string;
  rolledToDate: string;
  completedAt: string;
  auditorEmail: string;
  inHouseRoomsCount: number;
  totalRoomRevenuePosted: number;
  totalVatPosted: number;
  totalConsumptionTaxPosted: number;
  cashierShiftsReconciled: number;
  auditNotes?: string;
  status: 'successful' | 'flagged';
}

export interface BusinessDateStatus {
  hotelId: string;
  currentBusinessDate: string; // YYYY-MM-DD
  isDayLocked: boolean;
  lockedDates: string[];
  lastAuditAt?: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  category: 'hvac' | 'plumbing' | 'electrical' | 'carpentry' | 'painting' | 'furniture' | 'other';
  title: string;
  description: string;
  priority: 'critical' | 'urgent' | 'routine';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  reportedBy: string;
  assignedTechnician?: string;
  startDate: string;
  expectedEndDate: string;
  blocksRoom: boolean;
  guestConflictChecked: boolean;
  conflictDetails?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TaxConfiguration {
  hotelId: string;
  vatRate: number; // 7.5% in Nigeria
  vatEnabled: boolean;
  consumptionTaxRate: number; // 5% State Hotel Consumption Tax
  consumptionTaxEnabled: boolean;
  serviceChargeRate: number; // 10% standard hotel service charge
  serviceChargeEnabled: boolean;
  calculationOrder: 'subtotal_then_service_then_tax' | 'compound';
  firsTinNumber?: string;
}


