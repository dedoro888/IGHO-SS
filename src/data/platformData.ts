import {
  SubscriptionPlan,
  HotelSubscription,
  PlatformTransaction,
  PlatformAuditLog,
  PlatformUser,
  PlatformProduct,
  PlatformSettings,
} from '../types';

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-1',
    name: 'Plan 1 — Starter',
    monthlyPrice: 30000,
    annualPrice: 300000,
    trialDurationDays: 14,
    features: [
      'Up to 15 Rooms',
      '2 Staff Accounts',
      'Direct Guest Booking Portal',
      'Standard Housekeeping',
      'Paystack Online Checkout',
      'Email Financial Reports',
    ],
    maxRooms: 15,
    maxStaff: 2,
    maxUsers: 5,
    productAccess: ['stay'],
    active: true,
  },
  {
    id: 'plan-2',
    name: 'Plan 2 — Growth',
    monthlyPrice: 40000,
    annualPrice: 400000,
    trialDurationDays: 14,
    features: [
      'Up to 50 Rooms',
      'Multi-branch Support (up to 3 branches)',
      '10 Staff Accounts with RBAC',
      'Paystack Instant Settlement & Webhooks',
      'Housekeeping Dispatch & Guest Inquiries',
      'Audit Logging & Operational Analytics',
      'Priority Technical Support',
    ],
    maxRooms: 50,
    maxStaff: 10,
    maxUsers: 25,
    productAccess: ['stay'],
    active: true,
  },
  {
    id: 'plan-3',
    name: 'Plan 3 — Premium Enterprise',
    monthlyPrice: 50000,
    annualPrice: 500000,
    trialDurationDays: 30,
    features: [
      'Unlimited Rooms & Suites',
      'Unlimited Branches & Franchises',
      'Unlimited Staff Accounts with Custom Roles',
      'Enterprise Paystack Gateway Integration',
      'Advanced Multi-Property Dashboard',
      'Automated Guest Register & Invoicing',
      'Dedicated IGHO Account Manager & 24/7 SLA',
    ],
    maxRooms: 999,
    maxStaff: 100,
    maxUsers: 200,
    productAccess: ['stay', 'classroom', 'medbay'],
    active: true,
  },
];

// Clean state: all placeholder subscriptions and transactions removed
export const INITIAL_SUBSCRIPTIONS: HotelSubscription[] = [];

export const INITIAL_TRANSACTIONS: PlatformTransaction[] = [];

export const INITIAL_AUDIT_LOGS: PlatformAuditLog[] = [];

// Keep only the official Platform Super Admin identity
export const INITIAL_PLATFORM_USERS: PlatformUser[] = [
  {
    id: 'user-001',
    name: 'Rume Obire',
    email: 'rumeobire@gmail.com',
    role: 'super_admin',
    organizationName: 'IGHO Software Systems',
    status: 'active',
    createdAt: '2026-01-01',
    lastActivity: 'Active Now',
  },
];

export const INITIAL_PRODUCTS: PlatformProduct[] = [
  {
    id: 'stay',
    name: 'IGHO Stay',
    tagline: 'All-in-One Hospitality Management Cloud',
    description:
      'Cloud PMS, front desk management, multi-branch operations, real-time room inventory, direct guest reservation portal, and staff role governance for hotels and serviced apartments.',
    status: 'production_live',
    activeOrganizations: 0,
    totalUsers: 1,
    launchedDate: 'June 2026',
  },
  {
    id: 'classroom',
    name: 'IGHO Classroom',
    tagline: 'Modern School Operations & Academic ERP',
    description:
      'Next-generation school management software: automated grade book calculation, student term reports, parent portal, tuition billing, biometric/ID attendance, and staff timetabling.',
    status: 'development',
    activeOrganizations: 0,
    totalUsers: 0,
    waitlistCount: 0,
    targetLaunch: 'Q3 2027',
  },
  {
    id: 'medbay',
    name: 'IGHO MedBay',
    tagline: 'Integrated Clinical & Hospital ERP',
    description:
      'Healthcare and clinic operating system: electronic medical records (EMR), patient triage queue, pharmacy dispensary & inventory control, laboratory investigations, and bed occupancy management.',
    status: 'development',
    activeOrganizations: 0,
    totalUsers: 0,
    waitlistCount: 0,
    targetLaunch: 'Q1 2028',
  },
];

export const INITIAL_PLATFORM_SETTINGS: PlatformSettings = {
  general: {
    platformName: 'IGHO Software Systems',
    supportEmail: 'support@igho.software',
    supportPhone: '+234 803 000 0000',
    companyInfo: 'IGHO Systems Technology Nig. Ltd · RC 1892041 · Asaba, Delta State',
  },
  subscriptionPayout: {
    walletOrAccount: 'Corporate Bank Account & USDT TRC20',
    networkOrBank: 'Providus Bank PLC / USDT (TRC-20)',
    recipientName: 'IGHO PLATFORMS NIGERIA LTD',
    accountNumber: '0938475811',
    notes: 'Please quote your registered Hotel Name or Hotel ID in the payment narration.',
  },
  subscription: {
    defaultTrialDays: 14,
    gracePeriodDays: 5,
    currency: 'NGN (₦)',
    autoRenewalDefault: true,
  },
  registration: {
    registrationEnabled: true,
    autoApproveHotels: false,
    requireCacVerification: true,
    requireBankVerification: true,
  },
  notifications: {
    notifyOnNewRegistration: true,
    notifyOnPaymentFailure: true,
    notifyOnSuspension: true,
  },
  security: {
    sessionTimeoutHours: 24,
    enforceSuperAdmin2FA: true,
    requireSensitiveActionConfirmation: true,
  },
  featureFlags: {
    enableMultiBranch: true,
    enableAiRoomPricing: false,
    enablePublicReviews: true,
    enableClassroomBeta: false,
    enableMedBayBeta: false,
  },
};
