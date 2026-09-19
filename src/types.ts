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
  typeName: string; // e.g. 'Cozy luxury suite with modern amenities'
  pricePerNight: number; // in Naira (₦)
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  floor: number;
  maxGuests: number;
  roomSize: number; // sqm
  bed: string;
  description: string;
  amenities: string[];
  images: string[];
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
  nights: number;
  guests: number;
  total: number;
  status: 'pending_verification' | 'pending_payment' | 'confirmed' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';
  createdAt: string;
  paymentRef?: string;
  receiptUrl?: string;
  specialRequests?: string;
  source?: string;
  verifiedAt?: string;
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
  active: boolean;
}

export interface HotelSubscription {
  id: string;
  hotelId: string;
  hotelName: string;
  planId: string;
  planName: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';
  amount: number;
  billingCycle: 'monthly' | 'annual';
  startDate: string;
  renewalDate: string;
  trialEndDate?: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'overdue';
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
    | 'REACTIVATE_USER'
    | 'CHANGE_SUBSCRIPTION_PRICE'
    | 'CHANGE_PLAN'
    | 'REFUND_PAYMENT'
    | 'UPDATE_PLATFORM_SETTING'
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
  };
  subscriptionPayout?: {
    walletOrAccount: string;
    networkOrBank: string;
    recipientName: string;
    accountNumber: string;
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
