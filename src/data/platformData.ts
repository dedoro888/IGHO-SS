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
    id: 'plan-starter-30k',
    name: 'Plan 1 — Standard Operations',
    monthlyPrice: 30000,
    annualPrice: 300000,
    trialDurationDays: 14,
    features: [
      'Up to 20 Rooms & Suites',
      '5 Staff Accounts with Role Assignment',
      'Front Desk Check-in & Check-out',
      'Live Room Inventory & Housekeeping Roster',
      'Direct Hotel Bank Transfer Verification',
      'Guest Folios & Printable Receipts',
      'Financial & Occupancy PDF Reports',
      'Paystack Gateway Fees Absorbed by IGHO',
      'Guest Portal: Not Included (No Online Guest Booking)',
    ],
    maxRooms: 20,
    maxStaff: 5,
    maxUsers: 10,
    productAccess: ['stay'],
    hasGuestPortal: false,
    active: true,
    contractDiscountPercent: 87,
    contractAnnualPrice: 313200, // 87% of (30,000 * 12)
    contractFiveYearTotal: 1566000,
    contractDepositRequired: 313200, // 20% contract deposit
  },
  {
    id: 'plan-complete-50k',
    name: 'Plan 2 — Complete Hospitality Cloud',
    monthlyPrice: 50000,
    annualPrice: 500000,
    trialDurationDays: 30,
    features: [
      'Unlimited Rooms & Suites',
      'Direct Public Guest Booking Portal (Online Stays)',
      'Unlimited Staff Accounts with Custom Editable Roles',
      'Separate Caution Deposit Accounting & Refunds',
      'Multi-Branch Property Management',
      'Guest Inquiries, Reports & Service Dispatch',
      'Audit Logging & Financial Analytics Export',
      'Paystack Gateway Fees Absorbed by IGHO',
      '24/7 Priority Support & Onboarding SLA',
      '5-Year Fixed-Price Contract Guarantee Available',
    ],
    maxRooms: 999,
    maxStaff: 100,
    maxUsers: 200,
    productAccess: ['stay', 'classroom', 'medbay'],
    hasGuestPortal: true,
    active: true,
    contractDiscountPercent: 87,
    contractAnnualPrice: 522000, // 87% of (50,000 * 12)
    contractFiveYearTotal: 2610000,
    contractDepositRequired: 522000, // 20% contract deposit
  },
];

// Clean state: all placeholder subscriptions and transactions removed
export const INITIAL_SUBSCRIPTIONS: HotelSubscription[] = [];

export const INITIAL_TRANSACTIONS: PlatformTransaction[] = [];

export const INITIAL_AUDIT_LOGS: PlatformAuditLog[] = [];

// Official Platform accounts: strictly the Super Admin console account and the Lava Hotel account
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
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'user-002',
    name: 'Obi Chidi',
    email: 'owner@lavahotel.com',
    role: 'hotel_owner',
    organizationName: 'Lava Hotel & Suites',
    status: 'active',
    createdAt: '2026-02-15',
    lastActivity: 'Active Now',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
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
    supportPhone: '+234 902 0886 597',
    companyInfo: 'IGHO Systems Technology Nig. Ltd · RC 1892041 · Asaba, Delta State',
    footerAboutText: 'Building smart software that helps organisations operate better and grow faster.',
    copyrightText: '© 2026 IGHO Software Systems. All rights reserved.',
  },
  socialHandles: [
    { id: 'soc-fb', platform: 'facebook', platformName: 'Facebook', handle: 'IGHO Software', url: 'https://facebook.com/ighosoftware' },
    { id: 'soc-ig', platform: 'instagram', platformName: 'Instagram', handle: '@ighostay', url: 'https://instagram.com/ighostay' },
    { id: 'soc-x', platform: 'x', platformName: 'X (Twitter)', handle: '@ighostay', url: 'https://x.com/ighostay' },
    { id: 'soc-li', platform: 'linkedin', platformName: 'LinkedIn', handle: 'igho-stay', url: 'https://linkedin.com/company/igho-stay' },
  ],
  subscriptionPayout: {
    walletOrAccount: 'Paystack Subaccount (Split Settlement)',
    networkOrBank: 'Paystack Automated Settlement Engine',
    recipientName: 'IGHO SOFTWARE SYSTEMS (PAYSTACK SETTLEMENT)',
    accountNumber: 'ACCT_igho_sub_98475811',
    paystackSubaccountId: 'ACCT_igho_sub_98475811',
    linkedBankName: 'Providus Bank PLC (Paystack Linked)',
    linkedAccountNumber: '0938475811',
    notes: 'Subscription dues and hotel transaction payouts process through Paystack Subaccounts. Commercial bank accounts are linked to Paystack for automated next-day clearing, rather than direct manual bank deposits.',
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
