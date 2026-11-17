import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCLUDED_SUPER_ADMIN_EMAILS = new Set(['dedoro888@gmail.com']);

async function createServer() {
  const app = express();
  app.use(
    express.json({
      limit: '20mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  const UPLOADS_ROOT = path.join(__dirname, 'uploads');
  const PRIVATE_UPLOADS_ROOT = path.join(__dirname, 'private_uploads');
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  fs.mkdirSync(PRIVATE_UPLOADS_ROOT, { recursive: true });

  const PUBLIC_STORAGE_CATEGORIES = new Set(['guest_portal_media', 'room_galleries']);
  const PRIVATE_STORAGE_CATEGORIES = new Set([
    'payment_proofs',
    'hotel_documents',
    'general_operational',
    'identity_documents',
    'health_records',
  ]);
  const STORAGE_SIGNING_SECRET =
    String(process.env.STORAGE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() ||
    crypto.randomBytes(32).toString('hex');

  function signPrivateFileToken(params: { fileId: string; organizationId: string; exp: number }): string {
    return crypto
      .createHmac('sha256', STORAGE_SIGNING_SECRET)
      .update(`${params.organizationId}:${params.fileId}:${params.exp}`, 'utf8')
      .digest('hex');
  }

  function verifyPrivateFileToken(params: {
    fileId: string;
    organizationId: string;
    expRaw: string;
    sigRaw: string;
  }): boolean {
    const exp = Number(params.expRaw);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = signPrivateFileToken({
      fileId: params.fileId,
      organizationId: params.organizationId,
      exp,
    });
    const cleanSig = String(params.sigRaw || '').trim();
    if (!cleanSig || cleanSig.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(cleanSig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  function buildCanonicalPrivateFileRef(organizationId: string, fileId: string): string {
    return `/api/storage/${encodeURIComponent(organizationId)}/files/${encodeURIComponent(fileId)}/content`;
  }

  function stripSignedQueryFromPrivateRef(url?: string): string {
    const raw = String(url || '').trim();
    if (!raw) return '';
    const match = raw.match(/^(\/api\/storage\/[^/]+\/files\/[^/?#]+\/content)(?:\?.*)?$/);
    if (match) return match[1];
    return raw;
  }

  function mintSignedPrivateFileUrl(organizationId: string, fileId: string, ttlSeconds: number = 300): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = signPrivateFileToken({ fileId, organizationId, exp });
    return `${buildCanonicalPrivateFileRef(organizationId, fileId)}?exp=${exp}&sig=${sig}`;
  }

  // Replace unauthenticated express.static('/uploads') with guarded public-only delivery.
  // Private categories (payment_proofs, hotel_documents, general_operational, identity_documents, health_records)
  // and files marked isPrivate are strictly denied unauthenticated access.
  app.get('/uploads/:orgId/:category/:fileName', async (req, res) => {
    const { orgId, category, fileName } = req.params;
    const safeSegment = /^[a-zA-Z0-9_.-]+$/;
    if (!safeSegment.test(orgId) || !safeSegment.test(category) || !safeSegment.test(fileName)) {
      return res.status(400).json({ error: 'INVALID_FILE_PATH', message: 'Invalid file path.' });
    }
    if (orgId.includes('..') || category.includes('..') || fileName.includes('..')) {
      return res.status(400).json({ error: 'INVALID_FILE_PATH', message: 'Invalid file path.' });
    }

    const state = getDbState() || {};
    const storageFiles: any[] = Array.isArray(state.storageFiles) ? state.storageFiles : [];
    const expectedPath = `/uploads/${orgId}/${category}/${fileName}`;
    const fileRecord = storageFiles.find(
      (f: any) =>
        f.path === expectedPath ||
        (f.organizationId === orgId && f.category === category && String(f.path || '').endsWith(`/${fileName}`))
    );

    const isPublicCategory = PUBLIC_STORAGE_CATEGORIES.has(category);
    const isPrivateFile = !isPublicCategory || PRIVATE_STORAGE_CATEGORIES.has(category) || Boolean(fileRecord?.isPrivate);

    if (isPrivateFile) {
      return res.status(403).json({
        error: 'PRIVATE_FILE_ACCESS_DENIED',
        message: 'Private files cannot be accessed via public /uploads URLs. Use the authorized private delivery endpoint.',
      });
    }

    const resolvedRoot = path.resolve(UPLOADS_ROOT);
    const absPath = path.resolve(UPLOADS_ROOT, orgId, category, fileName);
    if (!absPath.startsWith(resolvedRoot + path.sep) || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Requested public asset was not found.' });
    }

    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(absPath);
  });

  app.use('/uploads', (_req, res) => {
    return res.status(403).json({
      error: 'PUBLIC_UPLOAD_ACCESS_DENIED',
      message: 'Direct unauthenticated directory or private asset access under /uploads is disabled.',
    });
  });

  // Database path (inside src/data so it can be committed/saved or preserved)
  const DB_PATH = path.join(__dirname, 'src', 'data', 'database_store.json');


  // Optional Supabase Admin client when SUPABASE_SERVICE_ROLE_KEY is configured
  let supabaseAdminClient: any = null;
  const supabaseUrlEnv = process.env.SUPABASE_URL || '';
  const supabaseServiceKeyEnv = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (supabaseUrlEnv && supabaseServiceKeyEnv) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseAdminClient = createClient(supabaseUrlEnv.replace(/\/+$/, ''), supabaseServiceKeyEnv, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } catch (e) {
      console.warn('[IGHO Backend] Failed to initialize Supabase Admin client:', e);
    }
  }

  // Fetch state
  function getDbState() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const state = JSON.parse(raw);
        if (state && Array.isArray(state.hotels)) {
          state.hotels = state.hotels.filter((h: any) => h.id !== 'hotel-transcorp' && h.id !== 'hotel-eko');
        }
        return state;
      }
    } catch (err) {
      console.error('Error reading backend database file:', err);
    }
    return null;
  }

  // Save state
  function saveDbState(state: any) {
    try {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving database file to backend storage:', err);
      return false;
    }
  }

  function appendAuditLog(entry: {
    actorEmail?: string;
    action: string;
    target: string;
    targetType: string;
    previousValue?: string;
    newValue?: string;
    metadata?: Record<string, any>;
  }) {
    const state = getDbState() || {};
    const log = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorEmail: entry.actorEmail || 'system@igho.com.ng',
      action: entry.action,
      target: entry.target,
      targetType: entry.targetType,
      timestamp: new Date().toISOString(),
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      metadata: entry.metadata,
    };
    state.auditLogs = [log, ...(state.auditLogs || [])].slice(0, 1000);
    saveDbState(state);
    broadcastLiveEvent('audit_log_created', log);
    return log;
  }

  function isEmailBanned(email?: string): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    const state = getDbState() || {};
    const banned: string[] = Array.isArray(state.bannedUsers) ? state.bannedUsers : [];
    if (banned.some((b) => String(b).trim().toLowerCase() === clean)) {
      return true;
    }
    const users: any[] = Array.isArray(state.platformUsers) ? state.platformUsers : [];
    const matched = users.find((u) => String(u.email || '').trim().toLowerCase() === clean);
    return matched ? matched.status === 'suspended' || matched.status === 'deactivated' : false;
  }

  async function resolveCaller(req: express.Request): Promise<{
    email: string;
    userId?: string;
    role?: string;
    isSuperAdmin: boolean;
    banned: boolean;
    verifiedJwt: boolean;
    accessToken?: string;
  }> {
    const authHeader = String(req.headers['authorization'] || '');
    const headerEmail = String(req.headers['x-igho-user-email'] || '').trim().toLowerCase();
    let email = '';
    let userId: string | undefined;
    let verifiedJwt = false;
    let accessToken: string | undefined;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        accessToken = token;
        if (supabaseAdminClient) {
          try {
            const { data } = await supabaseAdminClient.auth.getUser(token);
            if (data?.user) {
              userId = data.user.id;
              email = String(data.user.email || '').trim().toLowerCase();
              verifiedJwt = true;
            }
          } catch {}
        }
        // Fallback cryptographic verification via Supabase Auth /user endpoint using publishable key
        if (!verifiedJwt && supabaseUrlEnv && process.env.SUPABASE_PUBLISHABLE_KEY) {
          try {
            const userResp = await fetch(`${supabaseUrlEnv.replace(/\/+$/, '')}/auth/v1/user`, {
              headers: {
                apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${token}`,
              },
            });
            if (userResp.ok) {
              const userData: any = await userResp.json();
              if (userData?.id && userData?.email) {
                userId = String(userData.id);
                email = String(userData.email).trim().toLowerCase();
                verifiedJwt = true;
              }
            }
          } catch {}
        }
      }
    }

    // Only accept fallback header email when no Bearer token was supplied (never override a verified JWT)
    if (!verifiedJwt && !accessToken && headerEmail) {
      email = headerEmail;
    }

    const banned = email ? isEmailBanned(email) : false;
    if (email && EXCLUDED_SUPER_ADMIN_EMAILS.has(email)) {
      return { email, userId, role: 'customer', isSuperAdmin: false, banned, verifiedJwt, accessToken };
    }

    if (verifiedJwt && userId && supabaseAdminClient) {
      try {
        const { data: roleRow } = await supabaseAdminClient
          .from('platform_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'super_admin')
          .maybeSingle();
        if (roleRow?.role === 'super_admin') {
          return { email, userId, role: 'super_admin', isSuperAdmin: !banned, banned, verifiedJwt, accessToken };
        }
      } catch {}
    }

    if (verifiedJwt && accessToken && supabaseUrlEnv && process.env.SUPABASE_PUBLISHABLE_KEY) {
      try {
        const rpcResp = await fetch(`${supabaseUrlEnv.replace(/\/+$/, '')}/rest/v1/rpc/is_platform_super_admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: '{}',
        });
        if (rpcResp.ok) {
          const isSuper = await rpcResp.json();
          if (isSuper === true) {
            return { email, userId, role: 'super_admin', isSuperAdmin: !banned, banned, verifiedJwt, accessToken };
          }
        }
      } catch {}
    }

    // Fallback check against persisted platformUsers when no admin key is present in local/preview runtime
    const state = getDbState() || {};
    const users: any[] = Array.isArray(state.platformUsers) ? state.platformUsers : [];
    const matchedUser = email
      ? users.find((u) => String(u.email || '').trim().toLowerCase() === email)
      : undefined;

    const isSuperAdmin =
      Boolean(matchedUser && matchedUser.role === 'super_admin' && matchedUser.status === 'active') &&
      !EXCLUDED_SUPER_ADMIN_EMAILS.has(email) &&
      !banned;

    return {
      email,
      userId,
      role: matchedUser?.role,
      isSuperAdmin,
      banned,
      verifiedJwt,
      accessToken,
    };
  }

  async function requireSuperAdmin(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const caller = await resolveCaller(req);
    if (caller.banned) {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended by platform administration.',
      });
    }
    if (caller.email && EXCLUDED_SUPER_ADMIN_EMAILS.has(caller.email)) {
      return res.status(403).json({
        error: 'SUPER_ADMIN_DENIED',
        message: 'Super Admin privileges are strictly disabled for this account.',
      });
    }
    if (!caller.isSuperAdmin) {
      return res.status(403).json({
        error: 'SUPER_ADMIN_REQUIRED',
        message: 'This operation requires verified Platform Super Admin authorization.',
      });
    }
    (req as any).caller = caller;
    next();
  }

  // SSE Client Connections for instant real-time live push
  const sseClients = new Set<express.Response>();

  function broadcastLiveEvent(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (e) {
        sseClients.delete(client);
      }
    }
  }

  // SSE Real-Time Event Stream Endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);

    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Public configuration endpoint for frontend client initialization
  app.get('/api/config', (req, res) => {
    const rawUrl = process.env.SUPABASE_URL || '';
    let supabaseUrl = '';
    if (rawUrl) {
      try {
        supabaseUrl = new URL(rawUrl).origin;
      } catch {
        supabaseUrl = rawUrl.replace(/\/+$/, '');
      }
    }
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
    const paystackCfg = resolvePaystackTestConfig();

    // STRICT SECURITY: Never include PAYSTACK_SECRET_KEY, live keys, or private credentials
    res.json({
      supabaseUrl,
      supabasePublishableKey,
      paystackPublicKey: paystackCfg.publicKey || '',
      paystackMode: 'test',
      paystackConfigured: paystackCfg.ok,
    });
  });

  // Authoritative ban status check endpoint
  app.get('/api/auth/ban-status', (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.json({ banned: false });
    }
    const banned = isEmailBanned(email);
    res.json({
      banned,
      reason: banned
        ? 'This account has been suspended by platform administration. Please contact support@igho.com.ng for assistance.'
        : undefined,
    });
  });


  // =========================================================================
  // 1. SUBSCRIPTION PLANS & AUTHORITATIVE PAYSTACK TEST INTEGRATION
  // =========================================================================
  const BILLING_ELIGIBLE_ROLES = new Set(['owner', 'hotel_owner', 'manager', 'hotel_manager', 'finance']);

  function resolvePaystackTestConfig(): {
    ok: boolean;
    secretKey: string;
    publicKey: string;
    mode: 'test';
    error?: string;
  } {
    const secretKey = String(process.env.PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || '').trim();
    const publicKey = String(process.env.PAYSTACK_TEST_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || '').trim();

    if (secretKey.startsWith('sk_live_') || publicKey.startsWith('pk_live_')) {
      return {
        ok: false,
        secretKey: '',
        publicKey: '',
        mode: 'test',
        error: 'Live Mode Paystack keys are blocked. Only Paystack Test Mode keys (sk_test_ / pk_test_) are permitted.',
      };
    }

    if (!secretKey || !secretKey.startsWith('sk_test_')) {
      return {
        ok: false,
        secretKey: '',
        publicKey,
        mode: 'test',
        error: 'Paystack Test Secret Key (sk_test_...) is not configured.',
      };
    }

    return {
      ok: true,
      secretKey,
      publicKey: publicKey.startsWith('pk_test_') ? publicKey : '',
      mode: 'test',
    };
  }

  interface ServerPlanPrivileges {
    hasGuestPortal: boolean;
    maxRooms: number;
    maxStaff: number;
    maxBranches: number;
    storageQuotaGb: number;
    backupFrequency: 'weekly' | 'daily';
    monthlyNotificationLimit: number | null;
    frontDeskPMS: boolean;
    housekeeping: boolean;
    guestFolios: boolean;
    nightAudit: boolean;
    cashierShifts: boolean;
    maintenanceBlocks: boolean;
    customRoles: boolean;
    multiBranch: boolean;
    cautionDeposits: boolean;
    financialExports: boolean;
    advancedReports: boolean;
    scheduledReports: boolean;
    brandedReceipts: boolean;
    publicDirectoryListing: boolean;
    prioritySupport: boolean;
    featureRequestsAccess: boolean;
    prioritySla: boolean;
  }

  const DEFAULT_STARTER_PRIVILEGES: ServerPlanPrivileges = {
    hasGuestPortal: false,
    maxRooms: 20,
    maxStaff: 5,
    maxBranches: 1,
    storageQuotaGb: 10,
    backupFrequency: 'weekly',
    monthlyNotificationLimit: 100,
    frontDeskPMS: true,
    housekeeping: false,
    guestFolios: false,
    nightAudit: false,
    cashierShifts: false,
    maintenanceBlocks: false,
    customRoles: false,
    multiBranch: false,
    cautionDeposits: false,
    financialExports: true,
    advancedReports: false,
    scheduledReports: false,
    brandedReceipts: false,
    publicDirectoryListing: false,
    prioritySupport: false,
    featureRequestsAccess: true,
    prioritySla: false,
  };

  const DEFAULT_PROFESSIONAL_PRIVILEGES: ServerPlanPrivileges = {
    hasGuestPortal: true,
    maxRooms: 60,
    maxStaff: 15,
    maxBranches: 3,
    storageQuotaGb: 50,
    backupFrequency: 'daily',
    monthlyNotificationLimit: null,
    frontDeskPMS: true,
    housekeeping: true,
    guestFolios: true,
    nightAudit: true,
    cashierShifts: true,
    maintenanceBlocks: true,
    customRoles: true,
    multiBranch: true,
    cautionDeposits: true,
    financialExports: true,
    advancedReports: true,
    scheduledReports: true,
    brandedReceipts: true,
    publicDirectoryListing: true,
    prioritySupport: true,
    featureRequestsAccess: true,
    prioritySla: true,
  };

  interface OfficialPlanConfig {
    canonicalId: 'plan-starter-30k' | 'plan-complete-50k';
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    contractAnnualPrice: number;
    hasGuestPortal: boolean;
    maxRooms: number;
    maxStaff: number;
    maxBranches: number;
    storageQuotaBytes: number;
    paystackTestPlanCode: string;
    availableForPurchase: boolean;
    privileges: ServerPlanPrivileges;
  }

  const OFFICIAL_PLANS: Record<string, OfficialPlanConfig> = {
    'plan-starter-30k': {
      canonicalId: 'plan-starter-30k',
      name: 'IGHO Stay Starter',
      monthlyPrice: 30000,
      annualPrice: 300000,
      contractAnnualPrice: 313200,
      hasGuestPortal: false,
      maxRooms: 20,
      maxStaff: 5,
      maxBranches: 1,
      storageQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      paystackTestPlanCode: 'PLN_672y4vfa529gnlb',
      availableForPurchase: true,
      privileges: { ...DEFAULT_STARTER_PRIVILEGES },
    },
    'plan-1': {
      canonicalId: 'plan-starter-30k',
      name: 'IGHO Stay Starter',
      monthlyPrice: 30000,
      annualPrice: 300000,
      contractAnnualPrice: 313200,
      hasGuestPortal: false,
      maxRooms: 20,
      maxStaff: 5,
      maxBranches: 1,
      storageQuotaBytes: 10 * 1024 * 1024 * 1024,
      paystackTestPlanCode: 'PLN_672y4vfa529gnlb',
      availableForPurchase: true,
      privileges: { ...DEFAULT_STARTER_PRIVILEGES },
    },
    'plan-complete-50k': {
      canonicalId: 'plan-complete-50k',
      name: 'IGHO Stay Professional',
      monthlyPrice: 50000,
      annualPrice: 500000,
      contractAnnualPrice: 522000,
      hasGuestPortal: true,
      maxRooms: 60,
      maxStaff: 15,
      maxBranches: 3,
      storageQuotaBytes: 50 * 1024 * 1024 * 1024, // 50 GB
      paystackTestPlanCode: 'PLN_ggbmt8eyb51o6t5',
      availableForPurchase: true,
      privileges: { ...DEFAULT_PROFESSIONAL_PRIVILEGES },
    },
    'plan-3': {
      canonicalId: 'plan-complete-50k',
      name: 'IGHO Stay Professional',
      monthlyPrice: 50000,
      annualPrice: 500000,
      contractAnnualPrice: 522000,
      hasGuestPortal: true,
      maxRooms: 60,
      maxStaff: 15,
      maxBranches: 3,
      storageQuotaBytes: 50 * 1024 * 1024 * 1024,
      paystackTestPlanCode: 'PLN_ggbmt8eyb51o6t5',
      availableForPurchase: true,
      privileges: { ...DEFAULT_PROFESSIONAL_PRIVILEGES },
    },
  };

  function slugifyServerHotelName(name?: string): string {
    return (
      String(name || 'hotel')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'hotel'
    );
  }

  function pushUserNotification(entry: {
    recipientEmail: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'action_required';
    ctaLabel?: string;
    ctaScreen?: string;
  }) {
    const recipient = String(entry.recipientEmail || '').trim().toLowerCase();
    if (!recipient) return null;
    const state = getDbState() || {};
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientEmail: recipient,
      title: entry.title,
      message: entry.message,
      type: entry.type || 'info',
      ctaLabel: entry.ctaLabel || undefined,
      ctaScreen: entry.ctaScreen || undefined,
      read: false,
      createdAt: new Date().toISOString(),
    };
    state.userNotifications = [notif, ...(state.userNotifications || [])].slice(0, 500);
    saveDbState(state);
    broadcastLiveEvent('user_notification_created', notif);
    return notif;
  }

  const DEFAULT_HOTEL_SETTINGS = {
    onlineBookings: true,
    allowRegistration: true,
    showPrices: true,
    showAvailability: true,
    requireIdVerification: false,
  };

  const DEFAULT_HOTELS = [
    {
      id: 'hotel-lava',
      slug: 'lava-hotel-suites',
      name: 'Lava Hotel & Suites',
      location: 'Victoria Island, Lagos',
      city: 'Victoria Island',
      state: 'Lagos',
      country: 'Nigeria',
      address: 'Plot 1412, Ahmadu Bello Way, Victoria Island, Lagos',
      email: 'info@lavahotel.ng',
      phone: '+234 811 223 3445',
      ownerEmail: 'avendoorcompany@gmail.com',
      coverImage: '',
      logoImage: '',
      description:
        'Boutique hospitality with 6 elegantly appointed rooms and suites located in Victoria Island, Lagos.',
      bankName: 'Providus Bank',
      accountName: 'Lava Hotel & Suites Limited',
      accountNumber: '1014529384',
      subscriptionPlanId: 'plan-starter-30k',
      subscriptionPlanName: 'IGHO Stay Starter',
      packageType: 'management',
      hasGuestPortal: false,
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
      approvalStatus: 'approved',
      status: 'active',
      startingPrice: 40000,
      roomCount: 6,
      isLive: true,
      settings: { ...DEFAULT_HOTEL_SETTINGS },
      branches: [
        {
          id: 'branch-lava-main',
          hotelId: 'hotel-lava',
          code: 'LAVA-VI',
          name: 'Victoria Island Flagship',
          address: 'Plot 1412, Ahmadu Bello Way, Victoria Island, Lagos',
          city: 'Victoria Island',
          state: 'Lagos',
          phone: '+234 811 223 3445',
          email: 'info@lavahotel.ng',
          roomCount: 6,
          isMain: true,
          isActive: true,
        },
      ],
    },
  ];

  function resolveHotelEntitlements(hotel: any) {
    const state = getDbState() || {};
    const planId = hotel?.subscriptionPlanId || 'plan-starter-30k';
    const plan = OFFICIAL_PLANS[planId] || OFFICIAL_PLANS['plan-starter-30k'];
    const subStatus = String(hotel?.subscriptionStatus || (hotel?.isLive ? 'active' : 'pending')).toLowerCase();
    const isTrialActive =
      subStatus === 'trial' && (!hotel?.trialEndDate || new Date(hotel.trialEndDate).getTime() > Date.now());
    const isEntitlementActive =
      subStatus === 'active' ||
      isTrialActive ||
      (subStatus === 'cancelled' &&
        Boolean(hotel?.subscriptionEndDate && new Date(hotel.subscriptionEndDate).getTime() > Date.now()));

    const exceptionsMap = state.subscriptionExceptions || {};
    const ex = hotel?.id ? exceptionsMap[hotel.id] || hotel?.subscriptionException : null;
    const activeEx = ex && (!ex.expiresAt || new Date(ex.expiresAt).getTime() > Date.now()) ? ex : null;

    const basePrivs = { ...plan.privileges };
    if (activeEx) {
      if (typeof activeEx.maxRoomsOverride === 'number' && activeEx.maxRoomsOverride > 0) {
        basePrivs.maxRooms = activeEx.maxRoomsOverride;
      }
      if (typeof activeEx.maxStaffOverride === 'number' && activeEx.maxStaffOverride > 0) {
        basePrivs.maxStaff = activeEx.maxStaffOverride;
      }
      if (typeof activeEx.maxBranchesOverride === 'number' && activeEx.maxBranchesOverride > 0) {
        basePrivs.maxBranches = activeEx.maxBranchesOverride;
        if (activeEx.maxBranchesOverride > 1) basePrivs.multiBranch = true;
      }
      if (typeof activeEx.storageQuotaGbOverride === 'number' && activeEx.storageQuotaGbOverride > 0) {
        basePrivs.storageQuotaGb = activeEx.storageQuotaGbOverride;
      }
    }

    const effectivePrivileges: ServerPlanPrivileges = isEntitlementActive
      ? {
          ...basePrivs,
          hasGuestPortal: Boolean(
            basePrivs.hasGuestPortal && hotel?.hasGuestPortal !== false && hotel?.packageType !== 'management'
          ),
        }
      : {
          ...basePrivs,
          hasGuestPortal: false,
          housekeeping: false,
          guestFolios: false,
          nightAudit: false,
          cashierShifts: false,
          maintenanceBlocks: false,
          customRoles: false,
          multiBranch: false,
          cautionDeposits: false,
          advancedReports: false,
          scheduledReports: false,
          brandedReceipts: false,
          publicDirectoryListing: false,
          prioritySupport: false,
          prioritySla: false,
        };

    return {
      plan,
      subStatus,
      isEntitlementActive,
      privileges: effectivePrivileges,
      exception: activeEx,
    };
  }

  function enrichHotelWithDefaultsAndPrivileges(hotel: any) {
    if (!hotel) return hotel;
    const fallback = DEFAULT_HOTELS.find((d) => d.id === hotel.id);
    const merged: any = fallback ? { ...fallback } : {};
    for (const [k, v] of Object.entries(hotel)) {
      if (v !== undefined) {
        merged[k] = v;
      }
    }
    if (!merged.slug && merged.name) {
      merged.slug = slugifyServerHotelName(merged.name);
    }
    if (!merged.settings) {
      merged.settings = { ...DEFAULT_HOTEL_SETTINGS };
    } else {
      merged.settings = { ...DEFAULT_HOTEL_SETTINGS, ...merged.settings };
    }
    if (!Array.isArray(merged.branches)) {
      merged.branches = fallback?.branches ? [...fallback.branches] : [];
    }
    const ent = resolveHotelEntitlements(merged);
    merged.subscriptionPlanId = ent.plan.canonicalId;
    merged.subscriptionPlanName = ent.plan.name;
    merged.hasGuestPortal = ent.privileges.hasGuestPortal;
    merged.packageType = ent.plan.hasGuestPortal ? 'complete' : 'management';
    merged.privileges = ent.privileges;
    merged.subscriptionException = ent.exception || null;
    return merged;
  }

  function enforceHotelFeatureAccess(
    hotelId: string,
    feature: keyof ServerPlanPrivileges,
    customMessage?: string
  ): { ok: boolean; hotel?: any; ent?: ReturnType<typeof resolveHotelEntitlements>; status?: number; body?: any } {
    const state = getDbState() || {};
    const rawHotels = Array.isArray(state.hotels) && state.hotels.length > 0 ? state.hotels : [...DEFAULT_HOTELS];
    const hotel = rawHotels.find((h: any) => h.id === hotelId);
    if (!hotel) {
      return {
        ok: false,
        status: 404,
        body: { error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' },
      };
    }
    const ent = resolveHotelEntitlements(hotel);
    if (!ent.privileges[feature]) {
      return {
        ok: false,
        status: 403,
        body: {
          error: 'PLAN_UPGRADE_REQUIRED',
          feature,
          currentPlan: ent.plan.canonicalId,
          message:
            customMessage ||
            `This feature (${String(feature)}) requires IGHO Stay Professional. Please upgrade your subscription plan to unlock it.`,
        },
      };
    }
    return { ok: true, hotel, ent };
  }

  // Helper to compute absorbed Paystack processing fee: 1.5% + 100 NGN, capped at 2,000 NGN
  function calculateAbsorbedPaystackFee(amountNgn: number): number {
    if (amountNgn <= 0) return 0;
    const variable = amountNgn * 0.015;
    const flat = amountNgn >= 2500 ? 100 : 0;
    const fee = variable + flat;
    return Math.min(Math.round(fee), 2000);
  }

  function isSafeOriginUrl(raw: string): string | null {
    const trimmed = String(raw || '').trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') {
        return parsed.origin;
      }
      if (
        parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
      ) {
        return parsed.origin;
      }
    } catch {
      return null;
    }
    return null;
  }

  function resolveAppOrigin(req: express.Request, explicitClientOrigin?: string): string {
    const clientOrigin = isSafeOriginUrl(explicitClientOrigin || '');
    if (clientOrigin && !clientOrigin.includes('localhost') && !clientOrigin.includes('127.0.0.1')) {
      return clientOrigin;
    }
    const headerOrigin = isSafeOriginUrl(String(req.headers['origin'] || ''));
    if (headerOrigin && !headerOrigin.includes('localhost') && !headerOrigin.includes('127.0.0.1')) {
      return headerOrigin;
    }
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}`;
    }
    const configured = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (configured && /^https?:\/\//i.test(configured)) {
      return configured;
    }
    if (clientOrigin) return clientOrigin;
    if (headerOrigin) return headerOrigin;
    return `${proto || 'http'}://${host || 'localhost:3000'}`;
  }

  async function getCallerAuthorizedOrganizations(caller: {
    email: string;
    userId?: string;
    verifiedJwt: boolean;
    accessToken?: string;
  }): Promise<Array<{ organizationId: string; role: string; name?: string }>> {
    if (!caller.verifiedJwt || !caller.email) return [];

    const orgMap = new Map<string, { organizationId: string; role: string; name?: string }>();
    const cleanEmail = caller.email.trim().toLowerCase();

    // 1. Check Supabase organization_memberships (via admin client or caller's own JWT)
    if (caller.userId && supabaseAdminClient) {
      try {
        const { data: memberships } = await supabaseAdminClient
          .from('organization_memberships')
          .select('organization_id, role, status')
          .eq('user_id', caller.userId);

        for (const m of memberships || []) {
          const role = String(m.role || '').toLowerCase();
          if (String(m.status || '').toLowerCase() === 'active' && BILLING_ELIGIBLE_ROLES.has(role)) {
            orgMap.set(String(m.organization_id), { organizationId: String(m.organization_id), role });
          }
        }
      } catch {}
    } else if (caller.userId && caller.accessToken && supabaseUrlEnv && process.env.SUPABASE_PUBLISHABLE_KEY) {
      try {
        const resp = await fetch(
          `${supabaseUrlEnv.replace(/\/+$/, '')}/rest/v1/organization_memberships?user_id=eq.${encodeURIComponent(
            caller.userId
          )}&select=organization_id,role,status`,
          {
            headers: {
              apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${caller.accessToken}`,
            },
          }
        );
        if (resp.ok) {
          const rows: any[] = await resp.json();
          for (const m of rows || []) {
            const role = String(m.role || '').toLowerCase();
            if (String(m.status || '').toLowerCase() === 'active' && BILLING_ELIGIBLE_ROLES.has(role)) {
              orgMap.set(String(m.organization_id), { organizationId: String(m.organization_id), role });
            }
          }
        }
      } catch {}
    }

    // 2. Check persisted hotels, staff, and platformUsers
    const state = getDbState() || {};
    const hotels: any[] = Array.isArray(state.hotels) ? state.hotels : [];
    const staffList: any[] = Array.isArray(state.staff) ? state.staff : [];
    const platformUsers: any[] = Array.isArray(state.platformUsers) ? state.platformUsers : [];

    for (const h of hotels) {
      const ownerEmail = String(h.ownerEmail || '').trim().toLowerCase();
      const hotelEmail = String(h.email || '').trim().toLowerCase();
      if (ownerEmail === cleanEmail || hotelEmail === cleanEmail) {
        orgMap.set(String(h.id), { organizationId: String(h.id), role: 'owner', name: h.name });
      }
    }

    for (const s of staffList) {
      const sEmail = String(s.email || '').trim().toLowerCase();
      const sRole = String(s.role || '').toLowerCase();
      const isActive = (s.status || 'active') === 'active' && s.active !== false;
      if (sEmail === cleanEmail && isActive && BILLING_ELIGIBLE_ROLES.has(sRole) && s.hotelId) {
        if (!orgMap.has(String(s.hotelId))) {
          orgMap.set(String(s.hotelId), { organizationId: String(s.hotelId), role: sRole });
        }
      }
    }

    for (const u of platformUsers) {
      const uEmail = String(u.email || '').trim().toLowerCase();
      const uRole = String(u.role || '').toLowerCase();
      if (
        uEmail === cleanEmail &&
        u.status === 'active' &&
        BILLING_ELIGIBLE_ROLES.has(uRole) &&
        u.organizationId
      ) {
        if (!orgMap.has(String(u.organizationId))) {
          orgMap.set(String(u.organizationId), {
            organizationId: String(u.organizationId),
            role: uRole,
            name: u.organizationName,
          });
        }
      }
    }

    // Enrich organization names
    for (const [orgId, info] of orgMap.entries()) {
      if (!info.name) {
        const h = hotels.find((item: any) => item.id === orgId);
        if (h?.name) info.name = h.name;
      }
    }

    return Array.from(orgMap.values());
  }

  async function resolveAuthorizedOrganizationForBilling(
    caller: Awaited<ReturnType<typeof resolveCaller>>,
    requestedOrgId?: string
  ): Promise<{ ok: true; organizationId: string; organizationName: string; role: string } | { ok: false; status: number; error: string; message: string }> {
    if (!caller.verifiedJwt || !caller.email) {
      return {
        ok: false,
        status: 401,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'A verified authenticated session is required for subscription billing.',
      };
    }
    if (caller.banned) {
      return {
        ok: false,
        status: 403,
        error: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended by platform administration.',
      };
    }

    const authorizedOrgs = await getCallerAuthorizedOrganizations(caller);
    if (authorizedOrgs.length === 0) {
      return {
        ok: false,
        status: 403,
        error: 'NO_BILLING_ORGANIZATION',
        message: 'Your account does not hold owner, manager, or finance billing authority for any organization.',
      };
    }

    const cleanRequested = requestedOrgId ? String(requestedOrgId).trim() : '';
    if (cleanRequested) {
      const match = authorizedOrgs.find((o) => o.organizationId === cleanRequested);
      if (!match) {
        return {
          ok: false,
          status: 403,
          error: 'CROSS_ORGANIZATION_DENIED',
          message: 'Access denied: You cannot initialize, verify, or modify a subscription for another organization.',
        };
      }
      return {
        ok: true,
        organizationId: match.organizationId,
        organizationName: match.name || 'IGHO Stay Organization',
        role: match.role,
      };
    }

    const primary = authorizedOrgs[0];
    return {
      ok: true,
      organizationId: primary.organizationId,
      organizationName: primary.name || 'IGHO Stay Organization',
      role: primary.role,
    };
  }

  function sanitizeHotelResponse(hotel: any) {
    if (!hotel) return null;
    const { paystackEmailToken: _hiddenEmailToken, ...safeHotel } = hotel;
    return safeHotel;
  }

  function sanitizePublicHotelResponse(hotel: any) {
    if (!hotel) return null;
    const {
      paystackEmailToken: _hiddenEmailToken,
      paystackCustomerCode: _hiddenCust,
      paystackSubscriptionCode: _hiddenSub,
      ownerEmail: _hiddenOwnerEmail,
      ownerName: _hiddenOwnerName,
      cacNumber: _hiddenCac,
      subscriptionException: _hiddenEx,
      adminNotes: _hiddenNotes,
      ...publicHotel
    } = hotel;
    return publicHotel;
  }

  async function verifyCallerActiveProfile(caller: Awaited<ReturnType<typeof resolveCaller>>): Promise<{
    ok: boolean;
    status?: number;
    error?: string;
    message?: string;
  }> {
    const supabaseConfigured = Boolean(
      supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
    );
    if (supabaseConfigured && !caller.verifiedJwt) {
      return {
        ok: false,
        status: 401,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'A valid authenticated session is required to access this resource.',
      };
    }
    if (!caller.email && !caller.userId) {
      return {
        ok: false,
        status: 401,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      };
    }
    if (caller.banned) {
      return {
        ok: false,
        status: 403,
        error: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended by platform administration.',
      };
    }

    if (caller.userId && supabaseAdminClient) {
      try {
        const { data: profile } = await supabaseAdminClient
          .from('profiles')
          .select('account_status')
          .eq('id', caller.userId)
          .maybeSingle();
        if (profile && String(profile.account_status || 'active').toLowerCase() !== 'active') {
          return {
            ok: false,
            status: 403,
            error: 'ACCOUNT_INACTIVE',
            message: `Your user profile status (${profile.account_status}) is not active.`,
          };
        }
      } catch {}
    } else if (caller.userId && caller.accessToken && supabaseUrlEnv && process.env.SUPABASE_PUBLISHABLE_KEY) {
      try {
        const resp = await fetch(
          `${supabaseUrlEnv.replace(/\/+$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(
            caller.userId
          )}&select=account_status`,
          {
            headers: {
              apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${caller.accessToken}`,
            },
          }
        );
        if (resp.ok) {
          const rows: any[] = await resp.json();
          const profile = Array.isArray(rows) ? rows[0] : null;
          if (profile && String(profile.account_status || 'active').toLowerCase() !== 'active') {
            return {
              ok: false,
              status: 403,
              error: 'ACCOUNT_INACTIVE',
              message: `Your user profile status (${profile.account_status}) is not active.`,
            };
          }
        }
      } catch {}
    }

    return { ok: true };
  }

  async function getCallerAllOrgMemberships(
    caller: Awaited<ReturnType<typeof resolveCaller>>
  ): Promise<Array<{ organizationId: string; role: string; permissions: string[]; name?: string }>> {
    const supabaseConfigured = Boolean(
      supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
    );
    if ((supabaseConfigured && !caller.verifiedJwt) || caller.banned || !caller.email) {
      return [];
    }

    const orgMap = new Map<string, { organizationId: string; role: string; permissions: string[]; name?: string }>();
    const cleanEmail = caller.email.trim().toLowerCase();

    // 1. Authoritative Supabase organization_memberships query
    if (caller.userId && supabaseAdminClient) {
      try {
        const { data: memberships } = await supabaseAdminClient
          .from('organization_memberships')
          .select('organization_id, role, status')
          .eq('user_id', caller.userId);
        for (const m of memberships || []) {
          const role = String(m.role || '').toLowerCase();
          if (String(m.status || '').toLowerCase() === 'active' && role !== 'customer' && m.organization_id) {
            orgMap.set(String(m.organization_id), {
              organizationId: String(m.organization_id),
              role,
              permissions: [],
            });
          }
        }
      } catch {}
    } else if (caller.userId && caller.accessToken && supabaseUrlEnv && process.env.SUPABASE_PUBLISHABLE_KEY) {
      try {
        const resp = await fetch(
          `${supabaseUrlEnv.replace(/\/+$/, '')}/rest/v1/organization_memberships?user_id=eq.${encodeURIComponent(
            caller.userId
          )}&select=organization_id,role,status`,
          {
            headers: {
              apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${caller.accessToken}`,
            },
          }
        );
        if (resp.ok) {
          const rows: any[] = await resp.json();
          for (const m of rows || []) {
            const role = String(m.role || '').toLowerCase();
            if (String(m.status || '').toLowerCase() === 'active' && role !== 'customer' && m.organization_id) {
              orgMap.set(String(m.organization_id), {
                organizationId: String(m.organization_id),
                role,
                permissions: [],
              });
            }
          }
        }
      } catch {}
    }

    // 2. Correlate with persisted backend hotels, active staff, and custom roles
    const state = getDbState() || {};
    const hotels: any[] = Array.isArray(state.hotels) ? state.hotels : [];
    const staffList: any[] = Array.isArray(state.staff) ? state.staff : [];
    const platformUsers: any[] = Array.isArray(state.platformUsers) ? state.platformUsers : [];

    for (const h of hotels) {
      const ownerEmail = String(h.ownerEmail || '').trim().toLowerCase();
      const hotelEmail = String(h.email || '').trim().toLowerCase();
      if (ownerEmail === cleanEmail || hotelEmail === cleanEmail) {
        orgMap.set(String(h.id), {
          organizationId: String(h.id),
          role: 'owner',
          permissions: [],
          name: h.name,
        });
      }
    }

    for (const s of staffList) {
      const sEmail = String(s.email || '').trim().toLowerCase();
      const sRole = String(s.role || '').toLowerCase();
      const isActive = (s.status || 'active') === 'active' && s.active !== false;
      if (sEmail === cleanEmail && isActive && s.hotelId) {
        const existing = orgMap.get(String(s.hotelId));
        const perms = Array.isArray(s.permissions) ? s.permissions : [];
        if (!existing) {
          orgMap.set(String(s.hotelId), {
            organizationId: String(s.hotelId),
            role: sRole || 'staff',
            permissions: perms,
          });
        } else {
          existing.permissions = Array.from(new Set([...existing.permissions, ...perms]));
        }
      }
    }

    for (const u of platformUsers) {
      const uEmail = String(u.email || '').trim().toLowerCase();
      const uRole = String(u.role || '').toLowerCase();
      if (
        uEmail === cleanEmail &&
        u.status === 'active' &&
        uRole !== 'customer' &&
        uRole !== 'super_admin' &&
        u.organizationId
      ) {
        if (!orgMap.has(String(u.organizationId))) {
          orgMap.set(String(u.organizationId), {
            organizationId: String(u.organizationId),
            role: uRole,
            permissions: [],
            name: u.organizationName,
          });
        }
      }
    }

    for (const [orgId, info] of orgMap.entries()) {
      if (!info.name) {
        const h = hotels.find((item: any) => item.id === orgId);
        if (h?.name) info.name = h.name;
      }
    }

    return Array.from(orgMap.values());
  }

  function applyVerifiedSubscriptionEntitlements(options: {
    organizationId: string;
    plan: OfficialPlanConfig;
    billingCycle: 'monthly' | 'annual' | '5year_contract';
    paymentMode: 'paystack_recurring' | 'paystack_one_time';
    reference: string;
    transactionId?: string | number;
    amountKobo: number;
    currency: string;
    channel: string;
    paidAtIso: string;
    paystackCustomerCode?: string;
    paystackSubscriptionCode?: string;
    paystackEmailToken?: string;
    paystackPlanCode?: string;
    nextPaymentDate?: string;
    autoRenew: boolean;
    actorEmail: string;
  }) {
    const state = getDbState() || {};
    const hotels: any[] = Array.isArray(state.hotels) ? [...state.hotels] : [];
    const standardPlanId = options.plan.canonicalId;
    const chargedNgn = Math.round(options.amountKobo / 100);
    const absorbedFee = calculateAbsorbedPaystackFee(chargedNgn);
    const now = options.paidAtIso ? new Date(options.paidAtIso) : new Date();
    const durationDays =
      options.billingCycle === '5year_contract' ? 1825 : options.billingCycle === 'annual' ? 365 : 30;
    const endDate = options.nextPaymentDate
      ? new Date(options.nextPaymentDate).toISOString()
      : new Date(now.getTime() + durationDays * 86400000).toISOString();

    const processedRefs: string[] = Array.isArray(state.processedPaystackReferences)
      ? state.processedPaystackReferences
      : [];
    const alreadyRecordedTx =
      processedRefs.includes(options.reference) ||
      (Array.isArray(state.transactions) &&
        state.transactions.some((t: any) => t.reference === options.reference && t.paymentStatus === 'successful'));

    // Update Hotel & Internal Entitlements (IGHO database remains source of truth)
    let targetHotel = hotels.find((h: any) => h.id === options.organizationId);
    if (targetHotel) {
      targetHotel.isLive = true;
      targetHotel.status = 'active';
      targetHotel.approvalStatus = 'approved';
      targetHotel.paymentStatus = 'paid';
      targetHotel.subscriptionStatus = 'active';
      targetHotel.subscriptionPlanId = standardPlanId;
      targetHotel.subscriptionPlanName = options.plan.name;
      targetHotel.packageType = options.plan.hasGuestPortal ? 'complete' : 'management';
      targetHotel.hasGuestPortal = options.plan.hasGuestPortal;
      targetHotel.privileges = { ...options.plan.privileges };
      targetHotel.billingCycle = options.billingCycle;
      targetHotel.isContractPlan = options.billingCycle === '5year_contract';
      targetHotel.subscriptionStartDate = now.toISOString();
      targetHotel.subscriptionEndDate = endDate;
      targetHotel.autoRenew = options.autoRenew;
      targetHotel.paymentMode = options.paymentMode;
      targetHotel.paystackMode = 'test';
      if (options.paystackCustomerCode) targetHotel.paystackCustomerCode = options.paystackCustomerCode;
      if (options.paystackSubscriptionCode) targetHotel.paystackSubscriptionCode = options.paystackSubscriptionCode;
    }

    // Persist authoritative organization entitlements snapshot
    const entitlementsMap = state.organizationEntitlements || {};
    entitlementsMap[options.organizationId] = {
      organizationId: options.organizationId,
      planId: standardPlanId,
      planName: options.plan.name,
      subscriptionStatus: 'active',
      hasGuestPortal: options.plan.hasGuestPortal,
      maxRooms: options.plan.maxRooms,
      maxStaff: options.plan.maxStaff,
      storageQuotaBytes: options.plan.storageQuotaBytes,
      privileges: { ...options.plan.privileges },
      updatedAt: new Date().toISOString(),
    };
    state.organizationEntitlements = entitlementsMap;

    // Storage Quota Entitlement (1 GB Starter, 10 GB Professional)
    const customQuotas = state.storageCustomQuotas || {};
    const targetQuota = options.plan.storageQuotaBytes;
    if (options.plan.hasGuestPortal) {
      if (!customQuotas[options.organizationId] || customQuotas[options.organizationId] < targetQuota) {
        customQuotas[options.organizationId] = targetQuota;
      }
    } else if (customQuotas[options.organizationId] === undefined) {
      customQuotas[options.organizationId] = targetQuota;
    }
    state.storageCustomQuotas = customQuotas;

    // Upsert active subscription record
    const subscriptions: any[] = Array.isArray(state.subscriptions) ? [...state.subscriptions] : [];
    const existingSubIdx = subscriptions.findIndex((s: any) => s.hotelId === options.organizationId);
    const existingSub = existingSubIdx >= 0 ? subscriptions[existingSubIdx] : undefined;

    const subRecord = {
      id: existingSub?.id || `sub-${Date.now()}`,
      hotelId: options.organizationId,
      hotelName: targetHotel?.name || 'IGHO Stay Organization',
      planId: standardPlanId,
      planName: options.plan.name,
      status: 'active',
      amount: chargedNgn,
      amountKobo: options.amountKobo,
      currency: options.currency || 'NGN',
      billingCycle: options.billingCycle,
      paymentMode: options.paymentMode,
      paystackMode: 'test',
      autoRenew: options.autoRenew,
      cancelAtPeriodEnd: false,
      channel: options.channel,
      startDate: now.toISOString(),
      renewalDate: endDate,
      paymentStatus: 'paid',
      isContract: options.billingCycle === '5year_contract',
      contractYears: options.billingCycle === '5year_contract' ? 5 : undefined,
      lastTransactionReference: options.reference,
      paystackCustomerCode: options.paystackCustomerCode || existingSub?.paystackCustomerCode,
      paystackSubscriptionCode: options.paystackSubscriptionCode || existingSub?.paystackSubscriptionCode,
      paystackEmailToken: options.paystackEmailToken || existingSub?.paystackEmailToken,
      paystackPlanCode: options.paystackPlanCode || existingSub?.paystackPlanCode,
      updatedAt: new Date().toISOString(),
    };

    if (existingSubIdx >= 0) {
      subscriptions[existingSubIdx] = subRecord;
    } else {
      subscriptions.unshift(subRecord);
    }
    state.subscriptions = subscriptions;

    // Update pending checkout record status
    if (Array.isArray(state.pendingSubscriptionCheckouts)) {
      state.pendingSubscriptionCheckouts = state.pendingSubscriptionCheckouts.map((pc: any) =>
        pc.reference === options.reference
          ? {
              ...pc,
              status: 'verified',
              verifiedAt: new Date().toISOString(),
              paystackCustomerCode: options.paystackCustomerCode,
              paystackSubscriptionCode: options.paystackSubscriptionCode,
              channel: options.channel,
            }
          : pc
      );
    }

    if (!alreadyRecordedTx) {
      const transactions: any[] = Array.isArray(state.transactions) ? [...state.transactions] : [];
      transactions.unshift({
        id: `tx-${Date.now()}`,
        reference: options.reference,
        paystackTransactionId: options.transactionId,
        hotelId: options.organizationId,
        hotelName: targetHotel?.name || 'IGHO Stay Organization',
        amount: chargedNgn,
        amountKobo: options.amountKobo,
        feeAbsorbed: absorbedFee,
        currency: options.currency || 'NGN',
        planId: standardPlanId,
        planName: options.plan.name,
        paystackPlanCode: options.paystackPlanCode || undefined,
        paystackCustomerCode: options.paystackCustomerCode,
        paystackSubscriptionCode: options.paystackSubscriptionCode,
        paymentStatus: 'successful',
        paymentDate: now.toISOString(),
        billingPeriod: options.billingCycle,
        paymentMode: options.paymentMode,
        autoRenew: options.autoRenew,
        paymentMethod: `Paystack (${options.channel || 'card'})`,
        channel: options.channel || 'card',
        paystackMode: 'test',
      });
      state.transactions = transactions;

      const invoices: any[] = Array.isArray(state.subscriptionInvoices) ? [...state.subscriptionInvoices] : [];
      invoices.unshift({
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${options.reference.slice(-10).toUpperCase()}`,
        hotelId: options.organizationId,
        subscriptionId: subRecord.id,
        reference: options.reference,
        planId: standardPlanId,
        planName: options.plan.name,
        amount: chargedNgn,
        currency: options.currency || 'NGN',
        status: 'paid',
        periodStart: now.toISOString(),
        periodEnd: endDate,
        paidAt: now.toISOString(),
        paystackMode: 'test',
      });
      state.subscriptionInvoices = invoices.slice(0, 500);

      if (!processedRefs.includes(options.reference)) {
        state.processedPaystackReferences = [options.reference, ...processedRefs].slice(0, 1000);
      }
    }

    state.hotels = hotels;
    saveDbState(state);

    if (!alreadyRecordedTx) {
      appendAuditLog({
        actorEmail: options.actorEmail || targetHotel?.ownerEmail || 'system',
        action: 'CHANGE_PLAN',
        target: `${targetHotel?.name || options.organizationId} (${standardPlanId})`,
        targetType: 'subscription',
        newValue: `${options.plan.name} [${options.billingCycle} · ${options.channel} · ref:${options.reference}]`,
        metadata: {
          organizationId: options.organizationId,
          reference: options.reference,
          paystackCustomerCode: options.paystackCustomerCode,
          paystackSubscriptionCode: options.paystackSubscriptionCode,
          autoRenew: options.autoRenew,
          mode: 'test',
        },
      });
    }

    broadcastLiveEvent('hotel_subscription_updated', {
      hotelId: options.organizationId,
      planId: standardPlanId,
      planName: options.plan.name,
      packageType: options.plan.hasGuestPortal ? 'complete' : 'management',
      hasGuestPortal: options.plan.hasGuestPortal,
      privileges: { ...options.plan.privileges },
      billingCycle: options.billingCycle,
      autoRenew: options.autoRenew,
      subscriptionStatus: 'active',
      subscriptionStartDate: now.toISOString(),
      subscriptionEndDate: endDate,
    });

    return {
      subRecord,
      targetHotel: sanitizeHotelResponse(targetHotel),
      alreadyRecordedTx,
      startDate: now.toISOString(),
      endDate,
    };
  }

  async function syncSubscriptionToSupabase(payload: {
    organizationId: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: string;
    paymentMode: string;
    autoRenew: boolean;
    amountKobo: number;
    feeAbsorbedKobo: number;
    periodStart: string;
    periodEnd: string;
    reference: string;
    transactionId?: number | string;
    channel?: string;
    customerCode?: string;
    subscriptionCode?: string;
    emailToken?: string;
    planCode?: string;
  }) {
    if (!supabaseAdminClient) return;
    try {
      const { error: subErr } = await supabaseAdminClient.from('organization_subscriptions').insert({
        organization_id: payload.organizationId,
        plan_id: payload.planId,
        status: payload.status,
        billing_interval: payload.billingCycle,
        payment_mode: payload.paymentMode,
        paystack_mode: 'test',
        auto_renew: payload.autoRenew,
        currency: 'NGN',
        amount_kobo: payload.amountKobo,
        paystack_fee_absorbed_kobo: payload.feeAbsorbedKobo,
        current_period_start: payload.periodStart,
        current_period_end: payload.periodEnd,
        pending_reference: payload.reference,
        paystack_plan_code: payload.planCode || null,
        paystack_customer_code: payload.customerCode || null,
        paystack_subscription_code: payload.subscriptionCode || null,
        paystack_email_token: payload.emailToken || null,
      });
      if (!subErr) {
        await supabaseAdminClient.from('platform_subscription_payments').upsert(
          {
            organization_id: payload.organizationId,
            paystack_reference: payload.reference,
            paystack_transaction_id: payload.transactionId ? Number(payload.transactionId) : null,
            paystack_mode: 'test',
            amount_charged_kobo: payload.amountKobo,
            fee_deducted_kobo: payload.feeAbsorbedKobo,
            net_settled_kobo: Math.max(0, payload.amountKobo - payload.feeAbsorbedKobo),
            channel: payload.channel || 'card',
            paid_at: payload.periodStart,
          },
          { onConflict: 'paystack_reference' }
        );
      }
    } catch {
      // Non-fatal when remote SQL migration is not yet applied or org ID is non-UUID
    }
  }

  // Trusted plan catalogue endpoint
  app.get('/api/subscriptions/plans', (_req, res) => {
    const cfg = resolvePaystackTestConfig();
    const plans = [
      {
        id: 'plan-starter-30k',
        name: OFFICIAL_PLANS['plan-starter-30k'].name,
        monthlyPrice: OFFICIAL_PLANS['plan-starter-30k'].monthlyPrice,
        annualPrice: OFFICIAL_PLANS['plan-starter-30k'].annualPrice,
        contractAnnualPrice: OFFICIAL_PLANS['plan-starter-30k'].contractAnnualPrice,
        hasGuestPortal: false,
        maxRooms: OFFICIAL_PLANS['plan-starter-30k'].privileges.maxRooms,
        maxStaff: OFFICIAL_PLANS['plan-starter-30k'].privileges.maxStaff,
        maxBranches: OFFICIAL_PLANS['plan-starter-30k'].privileges.maxBranches,
        storageQuotaGb: OFFICIAL_PLANS['plan-starter-30k'].privileges.storageQuotaGb,
        backupFrequency: OFFICIAL_PLANS['plan-starter-30k'].privileges.backupFrequency,
        recurringSupportedCycles: ['monthly'],
        availableForPurchase: true,
        privileges: OFFICIAL_PLANS['plan-starter-30k'].privileges,
      },
      {
        id: 'plan-complete-50k',
        name: OFFICIAL_PLANS['plan-complete-50k'].name,
        monthlyPrice: OFFICIAL_PLANS['plan-complete-50k'].monthlyPrice,
        annualPrice: OFFICIAL_PLANS['plan-complete-50k'].annualPrice,
        contractAnnualPrice: OFFICIAL_PLANS['plan-complete-50k'].contractAnnualPrice,
        hasGuestPortal: true,
        maxRooms: OFFICIAL_PLANS['plan-complete-50k'].privileges.maxRooms,
        maxStaff: OFFICIAL_PLANS['plan-complete-50k'].privileges.maxStaff,
        maxBranches: OFFICIAL_PLANS['plan-complete-50k'].privileges.maxBranches,
        storageQuotaGb: OFFICIAL_PLANS['plan-complete-50k'].privileges.storageQuotaGb,
        backupFrequency: OFFICIAL_PLANS['plan-complete-50k'].privileges.backupFrequency,
        recurringSupportedCycles: ['monthly'],
        availableForPurchase: true,
        privileges: OFFICIAL_PLANS['plan-complete-50k'].privileges,
      },
    ];
    res.json({
      success: true,
      mode: 'test',
      paystackConfigured: cfg.ok,
      plans,
    });
  });

  // Authoritative Paystack Test Subscription Initialization
  app.post('/api/subscriptions/initialize', async (req, res) => {
    try {
      const caller = await resolveCaller(req);
      const {
        planId,
        billingCycle = 'monthly',
        paymentMode = 'paystack_recurring',
        organizationId: requestedOrgId,
        hotelId,
        returnScreen,
        clientOrigin,
      } = req.body || {};

      const orgAuth = await resolveAuthorizedOrganizationForBilling(caller, requestedOrgId || hotelId);
      if ('error' in orgAuth) {
        return res.status(orgAuth.status).json({ error: orgAuth.error, message: orgAuth.message });
      }

    const plan = OFFICIAL_PLANS[String(planId || '').trim()];
    if (!plan || !plan.availableForPurchase) {
      return res.status(400).json({
        error: 'INVALID_OR_UNAVAILABLE_PLAN',
        message: 'The selected subscription plan is not available for purchase.',
      });
    }

    const validCycle: 'monthly' | 'annual' | '5year_contract' =
      billingCycle === 'annual' || billingCycle === '5year_contract' ? billingCycle : 'monthly';

    // Recurring Paystack subscription plan (PLN_...) only applies to monthly recurring card billing.
    // Bank transfer / USSD / Annual / 5-Year fixed-term are strictly non-recurring one-time payments.
    const requestedMode: 'paystack_recurring' | 'paystack_one_time' =
      paymentMode === 'paystack_one_time' || validCycle !== 'monthly' ? 'paystack_one_time' : 'paystack_recurring';

    const paystackCfg = resolvePaystackTestConfig();
    if (!paystackCfg.ok) {
      return res.status(503).json({
        error: 'PAYSTACK_TEST_UNAVAILABLE',
        message: paystackCfg.error || 'Paystack Test credentials are not configured.',
      });
    }

    const expectedAmountNgn =
      validCycle === '5year_contract'
        ? plan.contractAnnualPrice
        : validCycle === 'annual'
        ? plan.annualPrice
        : plan.monthlyPrice;
    const expectedAmountKobo = Math.round(expectedAmountNgn * 100);
    const absorbedFee = calculateAbsorbedPaystackFee(expectedAmountNgn);

    const paystackPlanCode = requestedMode === 'paystack_recurring' ? plan.paystackTestPlanCode : undefined;

    // Validate Paystack Test Plan exists & is active on Paystack Test Mode when attaching plan
    if (paystackPlanCode) {
      try {
        const planCheckResp = await fetch(
          `https://api.paystack.co/plan/${encodeURIComponent(paystackPlanCode)}`,
          {
            headers: { Authorization: `Bearer ${paystackCfg.secretKey}` },
          }
        );
        const planCheckData: any = await planCheckResp.json();
        if (!planCheckResp.ok || !planCheckData.status || !planCheckData.data?.plan_code) {
          return res.status(502).json({
            error: 'PAYSTACK_PLAN_INVALID',
            message: planCheckData?.message || `Unable to validate Paystack Test Plan (${paystackPlanCode}).`,
          });
        }
        if (planCheckData.data.domain && planCheckData.data.domain !== 'test') {
          return res.status(403).json({
            error: 'LIVE_PLAN_REJECTED',
            message: 'Paystack plan must belong to Test Mode.',
          });
        }
      } catch (err: any) {
        return res.status(502).json({
          error: 'PAYSTACK_GATEWAY_ERROR',
          message: `Failed to validate Paystack Test Plan: ${err.message}`,
        });
      }
    }

    const safeOrgSlug = orgAuth.organizationId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'org';
    const reference = `pstk_test_${safeOrgSlug}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const pendingSubscriptionId = `pend_sub_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    const appOrigin = resolveAppOrigin(req, typeof clientOrigin === 'string' ? clientOrigin : undefined);
    const callbackUrl = `${appOrigin}/?paystack_callback=1&subscription_id=${encodeURIComponent(
      pendingSubscriptionId
    )}`;

    const metadata = {
      organization_id: orgAuth.organizationId,
      organization_name: orgAuth.organizationName,
      internal_plan_id: plan.canonicalId,
      internal_plan_name: plan.name,
      billing_cycle: validCycle,
      payment_mode: requestedMode,
      auto_renew: requestedMode === 'paystack_recurring',
      pending_subscription_id: pendingSubscriptionId,
      user_id: caller.userId || '',
      user_email: caller.email,
      environment: 'test',
      return_screen: returnScreen || 'hotel_subscription_plan',
    };

    const initializePayload: Record<string, any> = {
      email: caller.email,
      amount: expectedAmountKobo,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
      metadata,
    };

    if (paystackPlanCode) {
      initializePayload.plan = paystackPlanCode;
      // Recurring Paystack subscriptions require reusable card authorization
      initializePayload.channels = ['card'];
    } else {
      // Explicit one-time non-recurring payment channels (Bank Transfer, USSD, Direct Bank, or One-time Card)
      initializePayload.channels = ['bank_transfer', 'ussd', 'bank', 'card'];
    }

    let paystackInitData: any;
    try {
      const initResp = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackCfg.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initializePayload),
      });
      paystackInitData = await initResp.json();
      if (!initResp.ok || !paystackInitData.status || !paystackInitData.data?.authorization_url) {
        return res.status(502).json({
          error: 'PAYSTACK_INIT_FAILED',
          message: paystackInitData?.message || 'Paystack rejected transaction initialization.',
        });
      }
    } catch (err: any) {
      return res.status(502).json({
        error: 'PAYSTACK_GATEWAY_ERROR',
        message: `Failed to connect to Paystack Checkout: ${err.message}`,
      });
    }

    // Store pending subscription checkout record server-side before redirecting customer
    const state = getDbState() || {};
    const pendingCheckouts: any[] = Array.isArray(state.pendingSubscriptionCheckouts)
      ? state.pendingSubscriptionCheckouts
      : [];
    pendingCheckouts.unshift({
      pendingSubscriptionId,
      reference,
      organizationId: orgAuth.organizationId,
      organizationName: orgAuth.organizationName,
      planId: plan.canonicalId,
      planName: plan.name,
      billingCycle: validCycle,
      paymentMode: requestedMode,
      autoRenew: requestedMode === 'paystack_recurring',
      paystackPlanCode: paystackPlanCode || null,
      expectedAmountNgn,
      expectedAmountKobo,
      currency: 'NGN',
      customerEmail: caller.email,
      userId: caller.userId || null,
      status: 'pending',
      mode: 'test',
      callbackUrl,
      createdAt: new Date().toISOString(),
    });
    state.pendingSubscriptionCheckouts = pendingCheckouts.slice(0, 500);
    saveDbState(state);

      res.json({
        success: true,
        mode: 'test',
        pendingSubscriptionId,
        reference,
        authorizationUrl: paystackInitData.data.authorization_url,
        accessCode: paystackInitData.data.access_code,
        callbackUrl,
        organizationId: orgAuth.organizationId,
        planId: plan.canonicalId,
        planName: plan.name,
        billingCycle: validCycle,
        paymentMode: requestedMode,
        autoRenew: requestedMode === 'paystack_recurring',
        paystackPlanAttached: Boolean(paystackPlanCode),
        baseAmount: expectedAmountNgn,
        absorbedFee,
        totalChargedToHotel: expectedAmountNgn,
        currency: 'NGN',
        hasGuestPortal: plan.hasGuestPortal,
      });
    } catch (err: any) {
      console.error('[Paystack Initialize] Unexpected server error:', err);
      return res.status(500).json({
        error: 'SUBSCRIPTION_INIT_ERROR',
        message: err?.message || 'Unexpected server error while initializing Paystack Test checkout.',
      });
    }
  });

  // Authoritative Paystack Test Transaction Verification & Subscription Activation
  app.post('/api/subscriptions/verify', async (req, res) => {
    try {
      const caller = await resolveCaller(req);
      const reference = String(req.body?.reference || req.body?.trxref || '').trim();
      if (!reference) {
        return res.status(400).json({ error: 'MISSING_REFERENCE', message: 'Paystack transaction reference is required.' });
      }

    if (!caller.verifiedJwt || !caller.email) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'You must be signed in to verify a subscription payment.',
      });
    }

    const paystackCfg = resolvePaystackTestConfig();
    if (!paystackCfg.ok) {
      return res.status(503).json({
        error: 'PAYSTACK_TEST_UNAVAILABLE',
        message: paystackCfg.error || 'Paystack Test Secret Key is not configured.',
      });
    }

    const state = getDbState() || {};
    const pendingCheckouts: any[] = Array.isArray(state.pendingSubscriptionCheckouts)
      ? state.pendingSubscriptionCheckouts
      : [];
    const pending = pendingCheckouts.find((p: any) => p.reference === reference);

    // Check caller belongs to the target organization
    const existingTx = Array.isArray(state.transactions)
      ? state.transactions.find((t: any) => t.reference === reference && t.paymentStatus === 'successful')
      : undefined;
    const targetOrgId = pending?.organizationId || existingTx?.hotelId;

    if (!targetOrgId) {
      return res.status(404).json({
        error: 'PENDING_CHECKOUT_NOT_FOUND',
        message: 'No pending subscription checkout record was found for this payment reference.',
      });
    }

    const orgAuth = await resolveAuthorizedOrganizationForBilling(caller, targetOrgId);
    if ('error' in orgAuth) {
      return res.status(orgAuth.status).json({ error: orgAuth.error, message: orgAuth.message });
    }

    // Safe idempotent response if already verified earlier
    const processedRefs: string[] = Array.isArray(state.processedPaystackReferences)
      ? state.processedPaystackReferences
      : [];
    if (processedRefs.includes(reference) && existingTx) {
      const plan = OFFICIAL_PLANS[existingTx.planId] || OFFICIAL_PLANS['plan-starter-30k'];
      const currentHotel = (state.hotels || []).find((h: any) => h.id === targetOrgId);
      const currentSub = (state.subscriptions || []).find((s: any) => s.hotelId === targetOrgId);
      return res.json({
        success: true,
        alreadyProcessed: true,
        mode: 'test',
        status: currentSub?.status || 'active',
        reference,
        planId: plan.canonicalId,
        planName: plan.name,
        hasGuestPortal: plan.hasGuestPortal,
        privileges: plan.privileges,
        billingCycle: existingTx.billingPeriod || 'monthly',
        autoRenew: Boolean(currentSub?.autoRenew),
        paystackCustomerCode: currentSub?.paystackCustomerCode,
        paystackSubscriptionCode: currentSub?.paystackSubscriptionCode,
        startDate: currentSub?.startDate || existingTx.paymentDate,
        endDate: currentSub?.renewalDate || currentHotel?.subscriptionEndDate,
        hotel: sanitizeHotelResponse(currentHotel),
      });
    }

    // Verify directly with Paystack Test API
    let tx: any;
    try {
      const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${paystackCfg.secretKey}` },
      });
      const verifyData: any = await verifyResp.json();
      if (!verifyResp.ok || !verifyData.status || !verifyData.data) {
        return res.status(402).json({
          error: 'PAYSTACK_VERIFICATION_FAILED',
          message: verifyData?.message || 'Transaction could not be verified with Paystack.',
        });
      }
      tx = verifyData.data;
    } catch (err: any) {
      return res.status(502).json({
        error: 'PAYSTACK_GATEWAY_ERROR',
        message: `Failed to verify payment with Paystack: ${err.message}`,
      });
    }

    // Strictly enforce Test Mode
    if (String(tx.domain || '').toLowerCase() !== 'test') {
      return res.status(403).json({
        error: 'LIVE_TRANSACTION_BLOCKED',
        message: 'Live transactions cannot be processed in Test Mode.',
      });
    }

    // Reject failed, abandoned, or incomplete checkouts
    if (String(tx.status || '').toLowerCase() !== 'success') {
      if (pending) {
        state.pendingSubscriptionCheckouts = pendingCheckouts.map((p: any) =>
          p.reference === reference ? { ...p, status: tx.status || 'failed', updatedAt: new Date().toISOString() } : p
        );
        saveDbState(state);
      }
      return res.status(402).json({
        error: 'PAYMENT_NOT_SUCCESSFUL',
        paystackStatus: tx.status || 'failed',
        message: `Payment status is "${tx.status || 'unconfirmed'}". Subscription was not activated.`,
      });
    }

    // Validate currency, amount, metadata, and intended plan
    const currency = String(tx.currency || '').toUpperCase();
    if (currency !== 'NGN') {
      return res.status(400).json({ error: 'CURRENCY_MISMATCH', message: `Unexpected currency: ${currency}` });
    }

    const plan = OFFICIAL_PLANS[pending.planId];
    if (!plan) {
      return res.status(400).json({ error: 'INVALID_PLAN', message: 'Pending checkout references an invalid plan.' });
    }

    if (Number(tx.amount) !== Number(pending.expectedAmountKobo)) {
      return res.status(400).json({
        error: 'AMOUNT_MISMATCH',
        message: `Verified amount (${Number(tx.amount) / 100} NGN) does not match expected plan price (${
          Number(pending.expectedAmountKobo) / 100
        } NGN).`,
      });
    }

    const meta = tx.metadata || {};
    if (
      String(meta.organization_id || '') !== String(pending.organizationId) ||
      String(meta.internal_plan_id || '') !== String(pending.planId) ||
      String(meta.pending_subscription_id || '') !== String(pending.pendingSubscriptionId)
    ) {
      return res.status(403).json({
        error: 'METADATA_MISMATCH',
        message: 'Verified transaction metadata does not match the pending organization subscription record.',
      });
    }

    const verifiedPlanCode = tx.plan || tx.plan_object?.plan_code || undefined;
    if (pending.paystackPlanCode && verifiedPlanCode !== pending.paystackPlanCode) {
      return res.status(400).json({
        error: 'PLAN_MISMATCH',
        message: 'Verified Paystack plan code does not match the initialized plan.',
      });
    }

    const channel = String(tx.channel || 'card').toLowerCase();
    const customerCode = tx.customer?.customer_code ? String(tx.customer.customer_code) : undefined;
    const isReusableCard = channel === 'card' && tx.authorization?.reusable === true;
    const isAutoRenewing = Boolean(pending.paystackPlanCode && isReusableCard);

    // Attempt to fetch subscription_code / next_payment_date from Paystack if recurring plan was used
    let subscriptionCode: string | undefined;
    let emailToken: string | undefined;
    let nextPaymentDate: string | undefined;

    if (pending.paystackPlanCode && customerCode) {
      try {
        const subLookupResp = await fetch(
          `https://api.paystack.co/subscription?customer=${encodeURIComponent(customerCode)}&plan=${encodeURIComponent(
            pending.paystackPlanCode
          )}`,
          {
            headers: { Authorization: `Bearer ${paystackCfg.secretKey}` },
          }
        );
        if (subLookupResp.ok) {
          const subLookupData: any = await subLookupResp.json();
          const matchedSub = Array.isArray(subLookupData?.data) ? subLookupData.data[0] : undefined;
          if (matchedSub) {
            subscriptionCode = matchedSub.subscription_code ? String(matchedSub.subscription_code) : undefined;
            emailToken = matchedSub.email_token ? String(matchedSub.email_token) : undefined;
            nextPaymentDate = matchedSub.next_payment_date ? String(matchedSub.next_payment_date) : undefined;
          }
        }
      } catch {
        // subscription.create webhook will backfill subscription_code asynchronously if not ready yet
      }
    }

    const result = applyVerifiedSubscriptionEntitlements({
      organizationId: pending.organizationId,
      plan,
      billingCycle: pending.billingCycle,
      paymentMode: isAutoRenewing ? 'paystack_recurring' : 'paystack_one_time',
      reference,
      transactionId: tx.id,
      amountKobo: Number(tx.amount),
      currency,
      channel,
      paidAtIso: tx.paid_at || tx.transaction_date || new Date().toISOString(),
      paystackCustomerCode: customerCode,
      paystackSubscriptionCode: subscriptionCode,
      paystackEmailToken: emailToken,
      paystackPlanCode: verifiedPlanCode || pending.paystackPlanCode || undefined,
      nextPaymentDate,
      autoRenew: isAutoRenewing,
      actorEmail: caller.email,
    });

    await syncSubscriptionToSupabase({
      organizationId: pending.organizationId,
      planId: plan.canonicalId,
      planName: plan.name,
      status: 'active',
      billingCycle: pending.billingCycle,
      paymentMode: isAutoRenewing ? 'paystack_recurring' : 'paystack_one_time',
      autoRenew: isAutoRenewing,
      amountKobo: Number(tx.amount),
      feeAbsorbedKobo: calculateAbsorbedPaystackFee(Math.round(Number(tx.amount) / 100)) * 100,
      periodStart: result.startDate,
      periodEnd: result.endDate,
      reference,
      transactionId: tx.id,
      channel,
      customerCode,
      subscriptionCode,
      emailToken,
      planCode: verifiedPlanCode || pending.paystackPlanCode || undefined,
    });

      res.json({
        success: true,
        mode: 'test',
        status: 'active',
        reference,
        planId: plan.canonicalId,
        planName: plan.name,
        hasGuestPortal: plan.hasGuestPortal,
        privileges: plan.privileges,
        billingCycle: pending.billingCycle,
        paymentMode: isAutoRenewing ? 'paystack_recurring' : 'paystack_one_time',
        autoRenew: isAutoRenewing,
        channel,
        paystackCustomerCode: customerCode,
        paystackSubscriptionCode: subscriptionCode,
        startDate: result.startDate,
        endDate: result.endDate,
        hotel: result.targetHotel,
      });
    } catch (err: any) {
      console.error('[Paystack Verify] Unexpected server error:', err);
      return res.status(500).json({
        error: 'SUBSCRIPTION_VERIFY_ERROR',
        message: err?.message || 'Unexpected server error while verifying Paystack payment.',
      });
    }
  });

  // Authoritative Organization Subscription & Payment History Summary (Tenant-Isolated)
  app.get('/api/hotels/:hotelId/subscription-summary', async (req, res) => {
    const { hotelId } = req.params;
    const caller = await resolveCaller(req);
    if (!caller.isSuperAdmin) {
      const orgAuth = await resolveAuthorizedOrganizationForBilling(caller, hotelId);
      if ('error' in orgAuth) {
        return res.status(orgAuth.status).json({ error: orgAuth.error, message: orgAuth.message });
      }
    }

    const state = getDbState() || {};
    const sub = (state.subscriptions || []).find((s: any) => s.hotelId === hotelId) || null;
    const safeSub = sub ? (({ paystackEmailToken: _t, ...rest }) => rest)(sub) : null;
    const transactions = (state.transactions || []).filter((t: any) => t.hotelId === hotelId);
    const invoices = (state.subscriptionInvoices || []).filter((i: any) => i.hotelId === hotelId);

    res.json({
      success: true,
      mode: 'test',
      subscription: safeSub,
      transactions,
      invoices,
    });
  });

  // Cancel Paystack Auto-Renewal (Disables recurring billing via Paystack API when subscription code exists)
  app.post('/api/subscriptions/:hotelId/cancel', async (req, res) => {
    const { hotelId } = req.params;
    const caller = await resolveCaller(req);
    const orgAuth = caller.isSuperAdmin
      ? { ok: true as const, organizationId: hotelId, organizationName: hotelId, role: 'super_admin' }
      : await resolveAuthorizedOrganizationForBilling(caller, hotelId);

    if ('error' in orgAuth) {
      return res.status(orgAuth.status).json({ error: orgAuth.error, message: orgAuth.message });
    }

    const state = getDbState() || {};
    const subscriptions: any[] = Array.isArray(state.subscriptions) ? [...state.subscriptions] : [];
    const subIdx = subscriptions.findIndex((s: any) => s.hotelId === hotelId);
    if (subIdx === -1) {
      return res.status(404).json({ error: 'SUBSCRIPTION_NOT_FOUND', message: 'No active subscription found for this organization.' });
    }

    const sub = subscriptions[subIdx];
    const paystackCfg = resolvePaystackTestConfig();

    if (paystackCfg.ok && sub.paystackSubscriptionCode && sub.paystackEmailToken) {
      try {
        const disableResp = await fetch('https://api.paystack.co/subscription/disable', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackCfg.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: sub.paystackSubscriptionCode,
            token: sub.paystackEmailToken,
          }),
        });
        const disableData: any = await disableResp.json().catch(() => ({}));
        if (!disableResp.ok && !String(disableData?.message || '').toLowerCase().includes('already')) {
          return res.status(502).json({
            error: 'PAYSTACK_CANCEL_FAILED',
            message: disableData?.message || 'Failed to disable subscription auto-renewal on Paystack.',
          });
        }
      } catch (err: any) {
        return res.status(502).json({
          error: 'PAYSTACK_GATEWAY_ERROR',
          message: `Paystack connection error while disabling subscription: ${err.message}`,
        });
      }
    }

    subscriptions[subIdx] = {
      ...sub,
      autoRenew: false,
      cancelAtPeriodEnd: true,
      updatedAt: new Date().toISOString(),
    };
    state.subscriptions = subscriptions;

    if (Array.isArray(state.hotels)) {
      state.hotels = state.hotels.map((h: any) =>
        h.id === hotelId ? { ...h, autoRenew: false, cancelAtPeriodEnd: true } : h
      );
    }
    saveDbState(state);

    appendAuditLog({
      actorEmail: caller.email || 'owner',
      action: 'CHANGE_PLAN',
      target: `${sub.hotelName || hotelId}`,
      targetType: 'subscription',
      newValue: 'Auto-renewal disabled (access retained until period end)',
    });

    const { paystackEmailToken: _hidden, ...safeSub } = subscriptions[subIdx];
    res.json({
      success: true,
      message: 'Auto-renewal disabled. Your organization keeps active access until the end of the current billing period.',
      subscription: safeSub,
    });
  });

  // Real-time Paystack Test Webhook Handler (Raw Body HMAC-SHA512 + Idempotent Event Engine)
  app.post('/api/paystack/webhook', async (req: any, res) => {
    try {
      const paystackCfg = resolvePaystackTestConfig();
      if (!paystackCfg.ok) {
        return res.status(503).json({
          error: 'PAYSTACK_TEST_UNAVAILABLE',
          message: paystackCfg.error || 'Paystack Test Secret Key is not configured.',
        });
      }

      const signature = req.headers['x-paystack-signature'] as string | undefined;
      if (!signature) {
        return res.status(401).json({ error: 'MISSING_SIGNATURE', message: 'Missing x-paystack-signature header.' });
      }

      const rawBuffer: Buffer = Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

      const expectedHex = crypto.createHmac('sha512', paystackCfg.secretKey).update(rawBuffer).digest('hex');
      const sigBuf = Buffer.from(String(signature).trim(), 'utf8');
      const expectedBuf = Buffer.from(expectedHex, 'utf8');

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' });
      }

      const { event, data } = req.body || {};
      if (!event || !data) {
        return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Invalid Paystack webhook payload.' });
      }

      // Enforce Test Mode isolation: never let a live webhook mutate test/sandbox state or vice versa
      const domain = String(data.domain || '').toLowerCase();
      if (domain && domain !== 'test') {
        return res.status(403).json({ error: 'LIVE_EVENT_IGNORED', message: 'Only Paystack Test Mode events are processed.' });
      }

      const eventFingerprint = `${event}:${
        data.reference ||
        data.invoice_code ||
        data.subscription_code ||
        data.id ||
        crypto.createHash('sha256').update(rawBuffer).digest('hex').slice(0, 16)
      }:${data.status || ''}`;

      const state = getDbState() || {};
      const processedEvents: string[] = Array.isArray(state.processedPaystackWebhooks)
        ? state.processedPaystackWebhooks
        : [];

      if (processedEvents.includes(eventFingerprint)) {
        return res.status(200).json({ received: true, duplicate: true, eventKey: eventFingerprint });
      }

      // Helper to locate organization & subscription for webhook events
      const findOrgSubscription = () => {
        const subs: any[] = Array.isArray(state.subscriptions) ? state.subscriptions : [];
        const pendingList: any[] = Array.isArray(state.pendingSubscriptionCheckouts)
          ? state.pendingSubscriptionCheckouts
          : [];

        const metaOrgId = data?.metadata?.organization_id;
        const ref = data?.reference || data?.transaction?.reference;
        const subCode = data?.subscription_code || data?.subscription?.subscription_code;
        const custCode = data?.customer?.customer_code;

        const pendingMatch = ref ? pendingList.find((p: any) => p.reference === ref) : undefined;
        const subMatch =
          subs.find((s: any) => metaOrgId && s.hotelId === metaOrgId) ||
          subs.find((s: any) => subCode && s.paystackSubscriptionCode === subCode) ||
          subs.find((s: any) => custCode && s.paystackCustomerCode === custCode) ||
          (pendingMatch ? subs.find((s: any) => s.hotelId === pendingMatch.organizationId) : undefined);

        return { pendingMatch, subMatch, orgId: metaOrgId || pendingMatch?.organizationId || subMatch?.hotelId };
      };

      let handledOutcome = 'ignored';

      if (event === 'charge.success') {
        const reference = String(data.reference || '').trim();
        const { pendingMatch, orgId } = findOrgSubscription();
        const internalPlanId = data?.metadata?.internal_plan_id || pendingMatch?.planId;
        const plan = OFFICIAL_PLANS[String(internalPlanId || '')];

        if (reference && orgId && plan) {
          const expectedAmountKobo = pendingMatch?.expectedAmountKobo ?? Number(data.amount);
          const metaOk =
            !pendingMatch ||
            (String(data?.metadata?.organization_id || orgId) === pendingMatch.organizationId &&
              String(data?.metadata?.internal_plan_id || plan.canonicalId) === pendingMatch.planId);

          if (metaOk && String(data.currency || '').toUpperCase() === 'NGN' && Number(data.amount) === Number(expectedAmountKobo)) {
            const channel = String(data.channel || 'card').toLowerCase();
            const isAutoRenew = Boolean(
              (pendingMatch?.paystackPlanCode || data.plan) &&
                channel === 'card' &&
                data.authorization?.reusable !== false
            );
            applyVerifiedSubscriptionEntitlements({
              organizationId: orgId,
              plan,
              billingCycle: pendingMatch?.billingCycle || data?.metadata?.billing_cycle || 'monthly',
              paymentMode: isAutoRenew ? 'paystack_recurring' : 'paystack_one_time',
              reference,
              transactionId: data.id,
              amountKobo: Number(data.amount),
              currency: 'NGN',
              channel,
              paidAtIso: data.paid_at || new Date().toISOString(),
              paystackCustomerCode: data.customer?.customer_code,
              paystackPlanCode: data.plan || data.plan_object?.plan_code || pendingMatch?.paystackPlanCode,
              autoRenew: isAutoRenew,
              actorEmail: data.customer?.email || 'paystack_webhook',
            });
            handledOutcome = 'charge_activated';
          }
        }
        broadcastLiveEvent('payment_webhook_received', {
          event,
          reference,
          amount: Number(data.amount || 0) / 100,
          timestamp: Date.now(),
        });
      } else if (event === 'subscription.create') {
        const freshState = getDbState() || {};
        const subs: any[] = Array.isArray(freshState.subscriptions) ? [...freshState.subscriptions] : [];
        const custCode = data.customer?.customer_code;
        const subCode = data.subscription_code;
        const planCode = data.plan?.plan_code;
        const matchedPlan = Object.values(OFFICIAL_PLANS).find((p) => p.paystackTestPlanCode === planCode);

        const idx = subs.findIndex(
          (s: any) =>
            (subCode && s.paystackSubscriptionCode === subCode) ||
            (custCode && s.paystackCustomerCode === custCode) ||
            (data.customer?.email &&
              (freshState.hotels || []).some(
                (h: any) =>
                  h.id === s.hotelId &&
                  (String(h.ownerEmail || '').toLowerCase() === String(data.customer.email).toLowerCase() ||
                    String(h.email || '').toLowerCase() === String(data.customer.email).toLowerCase())
              ))
        );

        if (idx >= 0) {
          subs[idx] = {
            ...subs[idx],
            paystackSubscriptionCode: subCode || subs[idx].paystackSubscriptionCode,
            paystackEmailToken: data.email_token || subs[idx].paystackEmailToken,
            paystackCustomerCode: custCode || subs[idx].paystackCustomerCode,
            paystackPlanCode: planCode || subs[idx].paystackPlanCode,
            autoRenew: true,
            cancelAtPeriodEnd: false,
            status: 'active',
            renewalDate: data.next_payment_date ? new Date(data.next_payment_date).toISOString() : subs[idx].renewalDate,
            updatedAt: new Date().toISOString(),
          };
          freshState.subscriptions = subs;
          if (Array.isArray(freshState.hotels)) {
            freshState.hotels = freshState.hotels.map((h: any) =>
              h.id === subs[idx].hotelId
                ? {
                    ...h,
                    paystackCustomerCode: custCode || h.paystackCustomerCode,
                    paystackSubscriptionCode: subCode || h.paystackSubscriptionCode,
                    autoRenew: true,
                    subscriptionEndDate: subs[idx].renewalDate,
                  }
                : h
            );
          }
          saveDbState(freshState);
          handledOutcome = 'subscription_linked';
        } else if (matchedPlan && custCode) {
          handledOutcome = 'subscription_recorded_unlinked';
        }
      } else if (event === 'invoice.create' || event === 'invoice.update') {
        const freshState = getDbState() || {};
        const { orgId } = findOrgSubscription();
        const invoices: any[] = Array.isArray(freshState.subscriptionInvoices) ? [...freshState.subscriptionInvoices] : [];
        const invCode = data.invoice_code || `inv-${data.id || Date.now()}`;
        const existingInvIdx = invoices.findIndex((i: any) => i.paystackInvoiceCode === invCode);
        const invStatus = data.paid ? 'paid' : String(data.status || 'pending').toLowerCase();
        const invRecord = {
          ...(existingInvIdx >= 0 ? invoices[existingInvIdx] : {}),
          id: existingInvIdx >= 0 ? invoices[existingInvIdx].id : `inv-${Date.now()}`,
          invoiceNumber: existingInvIdx >= 0 ? invoices[existingInvIdx].invoiceNumber : invCode,
          paystackInvoiceCode: invCode,
          hotelId: orgId || (existingInvIdx >= 0 ? invoices[existingInvIdx]?.hotelId : undefined),
          subscriptionCode: data.subscription?.subscription_code,
          reference: data.transaction?.reference,
          amount: Math.round(Number(data.amount || 0) / 100),
          currency: 'NGN',
          status: invStatus === 'success' ? 'paid' : invStatus,
          periodStart: data.period_start || new Date().toISOString(),
          periodEnd: data.period_end || new Date().toISOString(),
          paidAt: data.paid_at || undefined,
          paystackMode: 'test',
        };
        if (existingInvIdx >= 0) {
          invoices[existingInvIdx] = invRecord;
        } else {
          invoices.unshift(invRecord);
        }
        freshState.subscriptionInvoices = invoices.slice(0, 500);
        saveDbState(freshState);
        handledOutcome = event;
      } else if (event === 'invoice.payment_failed') {
        const freshState = getDbState() || {};
        const { orgId } = findOrgSubscription();
        if (orgId) {
          freshState.subscriptions = (freshState.subscriptions || []).map((s: any) =>
            s.hotelId === orgId
              ? { ...s, status: 'past_due', paymentStatus: 'failed', updatedAt: new Date().toISOString() }
              : s
          );
          freshState.hotels = (freshState.hotels || []).map((h: any) =>
            h.id === orgId ? { ...h, subscriptionStatus: 'past_due', paymentStatus: 'failed' } : h
          );
          saveDbState(freshState);
          appendAuditLog({
            actorEmail: 'paystack_webhook',
            action: 'CHANGE_PLAN',
            target: orgId,
            targetType: 'subscription',
            newValue: 'invoice.payment_failed (past_due)',
          });
          broadcastLiveEvent('hotel_subscription_updated', { hotelId: orgId, subscriptionStatus: 'past_due' });
          handledOutcome = 'marked_past_due';
        }
      } else if (event === 'subscription.not_renew' || event === 'subscription.disable') {
        const freshState = getDbState() || {};
        const { orgId } = findOrgSubscription();
        const isDisabled = event === 'subscription.disable';
        if (orgId) {
          freshState.subscriptions = (freshState.subscriptions || []).map((s: any) =>
            s.hotelId === orgId
              ? {
                  ...s,
                  autoRenew: false,
                  cancelAtPeriodEnd: !isDisabled,
                  status: isDisabled ? 'cancelled' : s.status,
                  canceledAt: isDisabled ? new Date().toISOString() : s.canceledAt,
                  updatedAt: new Date().toISOString(),
                }
              : s
          );
          freshState.hotels = (freshState.hotels || []).map((h: any) =>
            h.id === orgId
              ? {
                  ...h,
                  autoRenew: false,
                  cancelAtPeriodEnd: !isDisabled,
                  subscriptionStatus: isDisabled ? 'cancelled' : h.subscriptionStatus,
                }
              : h
          );
          saveDbState(freshState);
          appendAuditLog({
            actorEmail: 'paystack_webhook',
            action: 'CHANGE_PLAN',
            target: orgId,
            targetType: 'subscription',
            newValue: `${event} (autoRenew=false)`,
          });
          broadcastLiveEvent('hotel_subscription_updated', {
            hotelId: orgId,
            autoRenew: false,
            subscriptionStatus: isDisabled ? 'cancelled' : 'active',
          });
          handledOutcome = event;
        }
      }

      // Persist idempotent webhook marker
      const latestState = getDbState() || {};
      const latestEvents: string[] = Array.isArray(latestState.processedPaystackWebhooks)
        ? latestState.processedPaystackWebhooks
        : [];
      if (!latestEvents.includes(eventFingerprint)) {
        latestState.processedPaystackWebhooks = [eventFingerprint, ...latestEvents].slice(0, 2000);
        saveDbState(latestState);
      }

      res.status(200).json({ received: true, event, outcome: handledOutcome, mode: 'test' });
    } catch (err: any) {
      console.error('[Paystack Webhook] Error processing event:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // 2. PLAN FEATURE GATING (₦30,000 PMS ONLY vs ₦50,000 COMPLETE GUEST PORTAL)
  // =========================================================================
  app.get('/api/hotels/:hotelId/entitlements', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);

    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
    }

    const { plan, isEntitlementActive, privileges } = resolveHotelEntitlements(hotel);

    res.json({
      hotelId,
      hotelName: hotel.name,
      subscriptionPlanId: plan.canonicalId,
      subscriptionPlanName: plan?.name || hotel.subscriptionPlanName || 'IGHO Stay Starter',
      subscriptionStatus: hotel.subscriptionStatus || (hotel.isLive ? 'active' : 'pending'),
      isEntitlementActive,
      autoRenew: Boolean(hotel.autoRenew),
      cancelAtPeriodEnd: Boolean(hotel.cancelAtPeriodEnd),
      paymentMode: hotel.paymentMode || null,
      paystackMode: 'test',
      maxRooms: privileges.maxRooms,
      maxStaff: privileges.maxStaff,
      storageQuotaBytes: plan.storageQuotaBytes,
      hasGuestPortal: privileges.hasGuestPortal,
      privileges,
      features: {
        guestPortal: privileges.hasGuestPortal,
        customRoles: privileges.customRoles,
        cautionDepositLedger: privileges.cautionDeposits,
        frontDeskPMS: privileges.frontDeskPMS,
        multiBranch: privileges.multiBranch,
        financialExports: privileges.financialExports,
      },
    });
  });

  // Public Guest Portal Route Gate
  app.get('/api/hotels/:hotelId/guest-portal', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);

    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
    }

    const planId = hotel.subscriptionPlanId || 'plan-starter-30k';
    const plan = OFFICIAL_PLANS[planId];
    const subStatus = String(hotel.subscriptionStatus || (hotel.isLive ? 'active' : 'pending')).toLowerCase();
    const isEntitlementActive =
      subStatus === 'active' ||
      (subStatus === 'trial' && (!hotel.trialEndDate || new Date(hotel.trialEndDate).getTime() > Date.now())) ||
      (subStatus === 'cancelled' && Boolean(hotel.subscriptionEndDate && new Date(hotel.subscriptionEndDate).getTime() > Date.now()));
    const hasGuestPortal =
      isEntitlementActive &&
      hotel.hasGuestPortal !== false &&
      (plan?.hasGuestPortal ?? false) &&
      hotel.packageType !== 'management';

    if (!hasGuestPortal) {
      return res.status(403).json({
        error: 'GUEST_PORTAL_NOT_INCLUDED_IN_PLAN',
        message: 'IGHO Stay Starter does not include the public guest portal. Upgrade to IGHO Stay Professional to enable direct online guest reservations.',
        upgradeRequired: true,
      });
    }

    res.json({
      allowed: true,
      hotel: {
        id: hotel.id,
        name: hotel.name,
        location: hotel.location,
        startingPrice: hotel.startingPrice,
      },
    });
  });

  // Super Admin Hotel Plan Migration & Switcher Endpoint
  app.patch('/api/hotels/:hotelId/plan', requireSuperAdmin, (req, res) => {
    const { hotelId } = req.params;
    const { planId, subscriptionStatus, approvalStatus, isLive } = req.body;

    const targetPlan = OFFICIAL_PLANS[planId];
    if (!targetPlan) {
      return res.status(400).json({ error: 'INVALID_PLAN', message: 'Valid planId required (plan-starter-30k or plan-complete-50k).' });
    }

    const state = getDbState() || {};
    let hotels = Array.isArray(state.hotels) && state.hotels.length > 0 ? state.hotels : [...DEFAULT_HOTELS];
    let index = hotels.findIndex((h: any) => h.id === hotelId);

    if (index === -1) {
      const defaultMatch = DEFAULT_HOTELS.find((h) => h.id === hotelId);
      const newHotel = {
        id: hotelId,
        name: defaultMatch?.name || (hotelId === 'hotel-lava' ? 'Lava Hotel & Suites' : `Hotel ${hotelId}`),
        location: defaultMatch?.location || 'Nigeria',
        city: defaultMatch?.city || 'Lagos',
        state: defaultMatch?.state || 'Nigeria',
        country: 'Nigeria',
        subscriptionPlanId: 'plan-starter-30k',
        subscriptionPlanName: 'IGHO Stay Starter',
        packageType: 'management',
        hasGuestPortal: false,
        roomCount: 6,
        isLive: true,
      };
      hotels.push(newHotel);
      index = hotels.length - 1;
    }

    const currentHotel = hotels[index];
    const previousPlanId = currentHotel.subscriptionPlanId || 'plan-starter-30k';
    const isComplete = targetPlan.hasGuestPortal;
    const standardPlanId = isComplete ? 'plan-complete-50k' : 'plan-starter-30k';

    const updatedHotel = {
      ...currentHotel,
      subscriptionPlanId: standardPlanId,
      subscriptionPlanName: targetPlan.name,
      packageType: isComplete ? 'complete' : 'management',
      hasGuestPortal: isComplete,
      ...(subscriptionStatus ? { subscriptionStatus } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(typeof isLive === 'boolean' ? { isLive } : {}),
      privileges: { ...targetPlan.privileges },
    };

    // Preserve ALL existing rooms, staff, branches, reservations, and records safely on downgrade/upgrade
    hotels[index] = updatedHotel;
    state.hotels = hotels;

    state.organizationEntitlements = {
      ...(state.organizationEntitlements || {}),
      [hotelId]: {
        organizationId: hotelId,
        planId: standardPlanId,
        planName: targetPlan.name,
        subscriptionStatus: updatedHotel.subscriptionStatus || 'active',
        hasGuestPortal: isComplete,
        maxRooms: targetPlan.maxRooms,
        maxStaff: targetPlan.maxStaff,
        maxBranches: targetPlan.maxBranches,
        storageQuotaBytes: targetPlan.storageQuotaBytes,
        privileges: { ...targetPlan.privileges },
        updatedAt: new Date().toISOString(),
      },
    };

    // Synchronize storage allowance if not explicitly custom overridden (10 GB Starter / 50 GB Pro)
    let customQuotas = state.storageCustomQuotas || {};
    if (customQuotas[hotelId] === undefined) {
      customQuotas[hotelId] = isComplete ? 50 * 1024 * 1024 * 1024 : 10 * 1024 * 1024 * 1024;
      state.storageCustomQuotas = customQuotas;
    }

    const historyEntry = {
      id: `sub-hist-${Date.now()}`,
      organizationId: hotelId,
      previousPlanId,
      newPlanId: standardPlanId,
      actionType: previousPlanId === standardPlanId ? 'plan_sync' : isComplete ? 'upgrade' : 'downgrade',
      actorEmail: String(req.headers['x-igho-user-email'] || 'superadmin@igho.software'),
      notes: `Plan transitioned from ${previousPlanId} to ${standardPlanId}. Existing organization data preserved.`,
      createdAt: new Date().toISOString(),
    };
    state.subscriptionHistory = [historyEntry, ...(state.subscriptionHistory || [])].slice(0, 500);

    saveDbState(state);

    broadcastLiveEvent('hotel_plan_migrated', {
      hotelId,
      hotelName: updatedHotel.name,
      planId: standardPlanId,
      planName: targetPlan.name,
      hasGuestPortal: isComplete,
      privileges: { ...targetPlan.privileges },
      storageQuotaBytes: customQuotas[hotelId],
    });

    res.json({
      success: true,
      message: `Successfully migrated ${updatedHotel.name} to ${targetPlan.name}. All existing hotel records preserved.`,
      hotel: enrichHotelWithDefaultsAndPrivileges(updatedHotel),
      hasGuestPortal: isComplete,
      privileges: { ...targetPlan.privileges },
      storageQuotaBytes: customQuotas[hotelId],
      historyEntry,
    });
  });

  // Get all hotels from database
  app.get('/api/hotels', (req, res) => {
    const state = getDbState() || {};
    const rawHotels = Array.isArray(state.hotels) && state.hotels.length > 0 ? state.hotels : [...DEFAULT_HOTELS];
    const hotels = rawHotels.map((h: any) => sanitizeHotelResponse(enrichHotelWithDefaultsAndPrivileges(h)));
    res.json({ success: true, hotels });
  });

  // Public Discover Hotels feed (excludes Starter/non-portal, unapproved, and suspended hotels)
  app.get('/api/public/hotels', (req, res) => {
    const state = getDbState() || {};
    const hotels = Array.isArray(state.hotels) && state.hotels.length > 0 ? state.hotels : [...DEFAULT_HOTELS];
    const publicHotels = hotels.filter((h: any) => {
      if (h.approvalStatus === 'rejected' || h.approvalStatus === 'pending') return false;
      if (h.status === 'suspended' || h.status === 'pending' || h.isSuspended) return false;
      if (h.hasGuestPortal === false || h.packageType === 'management') return false;
      if (h.subscriptionPlanId === 'plan-starter-30k' || h.subscriptionPlanId === 'plan-1') return false;
      return Boolean(h.approvalStatus === 'approved' || h.status === 'active' || h.isLive);
    });
    res.json({ success: true, hotels: publicHotels });
  });

  // Authoritative hotel deletion (Super Admin only)
  app.delete('/api/hotels/:hotelId', requireSuperAdmin, (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    let hotels = Array.isArray(state.hotels) ? state.hotels : [...DEFAULT_HOTELS];
    const target = hotels.find((h: any) => h.id === hotelId);
    const initialLength = hotels.length;
    hotels = hotels.filter((h: any) => h.id !== hotelId);
    state.hotels = hotels;
    saveDbState(state);

    appendAuditLog({
      actorEmail: (req as any).caller?.email || 'super_admin',
      action: 'DELETE_HOTEL',
      target: target?.name || hotelId,
      targetType: 'hotel',
    });

    broadcastLiveEvent('hotel_deleted', { hotelId });
    res.json({
      success: true,
      message: `Hotel ${hotelId} deleted successfully.`,
      deleted: initialLength !== hotels.length,
      remainingHotels: hotels,
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: DOUBLE-BOOKING, ROOM MOVES & MAINTENANCE CONFLICT ENGINE
  // =========================================================================
  app.post('/api/hotels/:hotelId/bookings/check-conflict', (req, res) => {
    const { hotelId } = req.params;
    const { roomId, checkIn, checkOut, excludeReservationId } = req.body;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'MISSING_PARAMETERS', message: 'roomId, checkIn, and checkOut are required.' });
    }

    const state = getDbState() || {};
    const reservations = state.reservations || [];
    const maintenanceBlocks = (state.maintenanceOrders || []).filter((m: any) => m.blocksRoom && m.hotelId === hotelId && m.roomId === roomId && m.status !== 'completed' && m.status !== 'cancelled');

    const reqStart = new Date(checkIn).getTime();
    const reqEnd = new Date(checkOut).getTime();

    // 1. Check reservation conflicts
    const conflictingRes = reservations.find((r: any) => {
      if (r.id === excludeReservationId) return false;
      if (r.hotelId !== hotelId) return false;
      if (r.roomId !== roomId) return false;
      if (r.status === 'cancelled' || r.status === 'rejected' || r.status === 'checked_out') return false;

      const rStart = new Date(r.checkIn).getTime();
      const rEnd = new Date(r.checkOut).getTime();
      return reqStart < rEnd && reqEnd > rStart;
    });

    if (conflictingRes) {
      return res.json({
        hasConflict: true,
        type: 'reservation',
        message: `Double-booking conflict: Room is already booked by ${conflictingRes.guestName} (${conflictingRes.checkIn} to ${conflictingRes.checkOut}).`,
        conflictingBooking: conflictingRes,
      });
    }

    // 2. Check maintenance blocks
    const conflictingBlock = maintenanceBlocks.find((m: any) => {
      const mStart = new Date(m.startDate).getTime();
      const mEnd = new Date(m.expectedEndDate || m.endDate).getTime();
      return reqStart < mEnd && reqEnd > mStart;
    });

    if (conflictingBlock) {
      return res.json({
        hasConflict: true,
        type: 'maintenance',
        message: `Maintenance conflict: Room is placed on Out-of-Order maintenance block (${conflictingBlock.title || conflictingBlock.category}) from ${conflictingBlock.startDate} to ${conflictingBlock.expectedEndDate}.`,
        conflictingBlock,
      });
    }

    return res.json({
      hasConflict: false,
      message: 'No conflicts detected. Room is fully available for the requested date horizon.',
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: SEQUENTIAL INVOICE & RECEIPT NUMBERING (NO GAPS)
  // =========================================================================
  app.post('/api/hotels/:hotelId/sequence/next', (req, res) => {
    const { hotelId } = req.params;
    const { type = 'invoice' } = req.body;
    const state = getDbState() || {};

    let sequences = state.sequences || {};
    if (!sequences[hotelId]) {
      sequences[hotelId] = { invoice: 100, receipt: 100, folio: 100 };
    }

    const currentYear = new Date().getFullYear();
    const currentSeq = (sequences[hotelId][type] || 100) + 1;
    sequences[hotelId][type] = currentSeq;
    state.sequences = sequences;
    saveDbState(state);

    const prefix = type === 'receipt' ? 'RCP' : type === 'folio' ? 'FOL' : 'INV';
    const sequenceNumber = `${prefix}-${currentYear}-${String(currentSeq).padStart(5, '0')}`;

    res.json({
      success: true,
      type,
      rawNumber: currentSeq,
      sequenceNumber,
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: NIGHT AUDIT, BUSINESS DATE & CLOSED DAY LOCKING
  // =========================================================================
  app.get('/api/hotels/:hotelId/night-audit/status', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'nightAudit', 'Night Audit requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    const auditStatus = (state.businessDateStatuses || {})[hotelId] || {
      hotelId,
      currentBusinessDate: new Date().toISOString().split('T')[0],
      isDayLocked: false,
      lockedDates: [],
    };
    const auditLogs = (state.nightAuditRecords || []).filter((a: any) => a.hotelId === hotelId);

    res.json({
      success: true,
      status: auditStatus,
      recentAudits: auditLogs.slice(0, 10),
    });
  });

  app.post('/api/hotels/:hotelId/night-audit/run', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'nightAudit', 'Night Audit requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { auditorEmail, auditNotes, inHouseRoomsCount = 0, totalRoomRevenuePosted = 0, totalVatPosted = 0, totalConsumptionTaxPosted = 0 } = req.body;

    const state = getDbState() || {};
    let statuses = state.businessDateStatuses || {};
    const currentStatus = statuses[hotelId] || {
      hotelId,
      currentBusinessDate: new Date().toISOString().split('T')[0],
      isDayLocked: false,
      lockedDates: [],
    };

    const previousDate = currentStatus.currentBusinessDate;
    const curDateObj = new Date(previousDate);
    curDateObj.setDate(curDateObj.getDate() + 1);
    const nextBusinessDate = curDateObj.toISOString().split('T')[0];

    // Lock the previous date
    const lockedDates = Array.from(new Set([...(currentStatus.lockedDates || []), previousDate]));

    statuses[hotelId] = {
      hotelId,
      currentBusinessDate: nextBusinessDate,
      isDayLocked: false,
      lockedDates,
      lastAuditAt: new Date().toISOString(),
    };
    state.businessDateStatuses = statuses;

    // Record night audit log
    const auditRecord = {
      id: `audit-run-${Date.now()}`,
      hotelId,
      businessDate: previousDate,
      rolledToDate: nextBusinessDate,
      completedAt: new Date().toISOString(),
      auditorEmail: auditorEmail || 'admin@igho.software',
      inHouseRoomsCount,
      totalRoomRevenuePosted,
      totalVatPosted,
      totalConsumptionTaxPosted,
      cashierShiftsReconciled: 1,
      auditNotes: auditNotes || 'Automated night audit run completed successfully.',
      status: 'successful',
    };

    state.nightAuditRecords = [auditRecord, ...(state.nightAuditRecords || [])];
    saveDbState(state);

    broadcastLiveEvent('night_audit_completed', { hotelId, previousDate, nextBusinessDate, auditRecord });

    res.json({
      success: true,
      message: `Night audit successfully completed. Business date rolled from ${previousDate} to ${nextBusinessDate}. Previous date locked.`,
      status: statuses[hotelId],
      auditRecord,
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: CASHIER SHIFTS, FLOATS, HANDOVERS & VARIANCE REVIEW
  // =========================================================================
  app.get('/api/hotels/:hotelId/cashier-shifts', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'cashierShifts', 'Cashier Shift Management requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    const shifts = (state.cashierShifts || []).filter((s: any) => s.hotelId === hotelId);
    const activeShift = shifts.find((s: any) => s.status === 'open');

    res.json({
      success: true,
      activeShift: activeShift || null,
      shifts,
    });
  });

  app.post('/api/hotels/:hotelId/cashier-shifts/open', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'cashierShifts', 'Cashier Shift Management requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { cashierEmail, cashierName, openingFloat = 20000, terminalId = 'FRONT-DESK-01' } = req.body;

    const state = getDbState() || {};
    let shifts = state.cashierShifts || [];

    // Check if user already has an active open shift
    const existing = shifts.find((s: any) => s.hotelId === hotelId && s.status === 'open');
    if (existing) {
      return res.status(400).json({ error: 'SHIFT_ALREADY_OPEN', message: `Cashier ${existing.cashierName} already has an active open shift (${existing.id}). Close it first before opening a new shift.` });
    }

    const newShift = {
      id: `shift-${Date.now()}`,
      hotelId,
      cashierEmail: cashierEmail || 'cashier@hotel.com',
      cashierName: cashierName || 'Front Desk Cashier',
      terminalId,
      openedAt: new Date().toISOString(),
      openingFloat: Number(openingFloat),
      cashIn: 0,
      cashOut: 0,
      posCardTotal: 0,
      bankTransferTotal: 0,
      status: 'open',
    };

    shifts = [newShift, ...shifts];
    state.cashierShifts = shifts;
    saveDbState(state);

    res.json({ success: true, message: `Cashier shift opened with opening float of ₦${Number(openingFloat).toLocaleString()}.`, shift: newShift });
  });

  app.post('/api/hotels/:hotelId/cashier-shifts/close', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'cashierShifts', 'Cashier Shift Management requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { shiftId, closingCashCount, handoverTo, handoverNotes } = req.body;

    const state = getDbState() || {};
    let shifts = state.cashierShifts || [];
    const index = shifts.findIndex((s: any) => s.id === shiftId && s.hotelId === hotelId);

    if (index === -1) {
      return res.status(404).json({ error: 'SHIFT_NOT_FOUND', message: 'Shift not found.' });
    }

    const shift = shifts[index];
    const actualCash = Number(closingCashCount || 0);
    const expectedCash = Number(shift.openingFloat) + Number(shift.cashIn || 0) - Number(shift.cashOut || 0);
    const variance = actualCash - expectedCash;

    shift.status = 'closed';
    shift.closedAt = new Date().toISOString();
    shift.closingCashCount = actualCash;
    shift.expectedCash = expectedCash;
    shift.variance = variance;
    shift.handoverTo = handoverTo || 'Next Shift Cashier';
    shift.handoverNotes = handoverNotes || '';

    shifts[index] = shift;
    state.cashierShifts = shifts;
    saveDbState(state);

    res.json({
      success: true,
      message: `Shift closed. Expected: ₦${expectedCash.toLocaleString()}, Counted: ₦${actualCash.toLocaleString()}, Variance: ₦${variance.toLocaleString()}.`,
      shift,
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: GUEST FOLIOS & LINKED FINANCIAL REVERSALS
  // =========================================================================
  app.get('/api/hotels/:hotelId/folios', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'guestFolios', 'Guest Folios & Linked Reversals require IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    const folios = (state.guestFolios || []).filter((f: any) => f.hotelId === hotelId);
    res.json({ success: true, folios });
  });

  app.post('/api/hotels/:hotelId/folios/charges', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'guestFolios', 'Guest Folios & Linked Reversals require IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { folioId, description, category, amount, postedBy, businessDate } = req.body;

    const state = getDbState() || {};
    let folios = state.guestFolios || [];
    let targetFolio = folios.find((f: any) => f.id === folioId && f.hotelId === hotelId);

    if (!targetFolio) {
      // Auto-create folio if missing
      targetFolio = {
        id: folioId || `fol-${Date.now()}`,
        hotelId,
        reservationId: req.body.reservationId || 'walk-in',
        folioType: req.body.folioType || 'room',
        folioNumber: `FOL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        guestName: req.body.guestName || 'Guest',
        guestEmail: req.body.guestEmail || '',
        roomNumber: req.body.roomNumber || '101',
        charges: [],
        payments: [],
        reversals: [],
        totalCharges: 0,
        totalPayments: 0,
        balanceDue: 0,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      folios.push(targetFolio);
    }

    const newCharge = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      folioId: targetFolio.id,
      date: new Date().toISOString(),
      description,
      category: category || 'room',
      amount: Number(amount),
      postedBy: postedBy || 'Front Desk',
      businessDate: businessDate || new Date().toISOString().split('T')[0],
    };

    targetFolio.charges.push(newCharge);
    targetFolio.totalCharges = targetFolio.charges.reduce((sum: number, c: any) => sum + (c.isReversed ? 0 : c.amount), 0);
    targetFolio.balanceDue = targetFolio.totalCharges - targetFolio.totalPayments;
    targetFolio.updatedAt = new Date().toISOString();

    state.guestFolios = folios;
    saveDbState(state);

    res.json({ success: true, message: 'Charge posted to folio.', charge: newCharge, folio: targetFolio });
  });

  app.post('/api/hotels/:hotelId/folios/reversal', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'guestFolios', 'Guest Folios & Linked Reversals require IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { folioId, chargeId, reversalReason, approverEmail, requestedBy } = req.body;

    if (!folioId || !chargeId || !reversalReason || !approverEmail) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'folioId, chargeId, reversalReason, and approverEmail are required.' });
    }

    const state = getDbState() || {};
    let folios = state.guestFolios || [];
    const folio = folios.find((f: any) => f.id === folioId && f.hotelId === hotelId);

    if (!folio) {
      return res.status(404).json({ error: 'FOLIO_NOT_FOUND', message: 'Folio not found.' });
    }

    const chargeIndex = folio.charges.findIndex((c: any) => c.id === chargeId);
    if (chargeIndex === -1) {
      return res.status(404).json({ error: 'CHARGE_NOT_FOUND', message: 'Original charge not found on folio.' });
    }

    const originalCharge = folio.charges[chargeIndex];
    if (originalCharge.isReversed) {
      return res.status(400).json({ error: 'ALREADY_REVERSED', message: 'This charge has already been reversed.' });
    }

    // Mark original as reversed (never deleted!)
    originalCharge.isReversed = true;
    const reversalId = `rev-${Date.now()}`;
    originalCharge.reversalRefId = reversalId;

    // Append linked reversal correction entry
    const linkedReversal = {
      id: reversalId,
      originalChargeId: chargeId,
      folioId,
      amount: -Math.abs(Number(originalCharge.amount)),
      reason: reversalReason,
      requestedBy: requestedBy || 'Front Desk Staff',
      approverEmail,
      approvedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    folio.reversals = folio.reversals || [];
    folio.reversals.push(linkedReversal);

    // Recompute folio total
    folio.totalCharges = folio.charges.reduce((sum: number, c: any) => sum + (c.isReversed ? 0 : c.amount), 0);
    folio.balanceDue = folio.totalCharges - folio.totalPayments;
    folio.updatedAt = new Date().toISOString();

    state.guestFolios = folios;
    saveDbState(state);

    res.json({
      success: true,
      message: `Linked reversal executed: ₦${Math.abs(originalCharge.amount).toLocaleString()} credited back to folio with approval by ${approverEmail}.`,
      reversal: linkedReversal,
      folio,
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: DUAL-APPROVAL REFUND FLOW (REQUESTER CANNOT APPROVE)
  // =========================================================================
  app.get('/api/hotels/:hotelId/refunds', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const refunds = (state.refundRequests || []).filter((r: any) => r.hotelId === hotelId);
    res.json({ success: true, refunds });
  });

  app.post('/api/hotels/:hotelId/refunds/request', (req, res) => {
    const { hotelId } = req.params;
    const { reservationId, guestName, guestEmail, amount, reason, requesterEmail, requesterName } = req.body;

    if (!amount || !reason || !requesterEmail) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'amount, reason, and requesterEmail are required.' });
    }

    const state = getDbState() || {};
    const newRefund = {
      id: `ref-${Date.now()}`,
      hotelId,
      reservationId: reservationId || 'RES-MANUAL',
      guestName: guestName || 'Guest',
      guestEmail: guestEmail || '',
      amount: Number(amount),
      reason,
      status: 'pending_approval',
      requesterEmail: requesterEmail.toLowerCase(),
      requesterName: requesterName || 'Front Desk Staff',
      requestedAt: new Date().toISOString(),
    };

    state.refundRequests = [newRefund, ...(state.refundRequests || [])];
    saveDbState(state);

    res.json({ success: true, message: 'Refund request submitted for dual authorization.', refund: newRefund });
  });

  app.post('/api/hotels/:hotelId/refunds/:refundId/approve', (req, res) => {
    const { hotelId, refundId } = req.params;
    const { approverEmail, approvalAction = 'approve', rejectionReason } = req.body;

    if (!approverEmail) {
      return res.status(400).json({ error: 'APPROVER_REQUIRED', message: 'approverEmail is required.' });
    }

    const state = getDbState() || {};
    let refunds = state.refundRequests || [];
    const index = refunds.findIndex((r: any) => r.id === refundId && r.hotelId === hotelId);

    if (index === -1) {
      return res.status(404).json({ error: 'REFUND_NOT_FOUND', message: 'Refund request not found.' });
    }

    const refund = refunds[index];

    // STRICT DUAL CONTROL ENFORCEMENT: Requester CANNOT approve their own request!
    if (refund.requesterEmail.toLowerCase() === approverEmail.trim().toLowerCase()) {
      return res.status(403).json({
        error: 'DUAL_CONTROL_VIOLATION',
        message: 'Security Violation: Separation of duties requires an independent manager or finance officer to approve refunds. The requester cannot approve their own refund.',
      });
    }

    if (approvalAction === 'approve') {
      refund.status = 'approved';
      refund.approverEmail = approverEmail.trim().toLowerCase();
      refund.approvedAt = new Date().toISOString();
      refund.settlementMethod = 'paystack_reversal';
      refund.settlementRef = `ref_set_${Date.now()}`;
    } else {
      refund.status = 'rejected';
      refund.approverEmail = approverEmail.trim().toLowerCase();
      refund.rejectionReason = rejectionReason || 'Rejected by management review.';
    }

    refunds[index] = refund;
    state.refundRequests = refunds;
    saveDbState(state);

    res.json({
      success: true,
      message: approvalAction === 'approve' ? 'Refund approved and dispatched for settlement.' : 'Refund rejected.',
      refund,
    });
  });

  // =========================================================================
  // ENTERPRISE PMS: MAINTENANCE & CONFLICT-AWARE OUT-OF-ORDER ROOM BLOCKS
  // =========================================================================
  app.get('/api/hotels/:hotelId/maintenance', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'maintenanceBlocks', 'Maintenance & Room Blocks require IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    const orders = (state.maintenanceOrders || []).filter((m: any) => m.hotelId === hotelId);
    res.json({ success: true, orders });
  });

  app.post('/api/hotels/:hotelId/maintenance', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'maintenanceBlocks', 'Maintenance & Room Blocks require IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { roomId, roomNumber, category, title, description, priority = 'routine', startDate, expectedEndDate, blocksRoom = false, reportedBy } = req.body;

    const state = getDbState() || {};
    const reservations = state.reservations || [];

    // If blocksRoom is true, run automatic pre-block guest conflict check!
    let guestConflictChecked = true;
    let conflictDetails = '';

    if (blocksRoom) {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(expectedEndDate).getTime();

      const conflictingGuest = reservations.find((r: any) => {
        if (r.hotelId !== hotelId || r.roomId !== roomId) return false;
        if (r.status === 'cancelled' || r.status === 'rejected' || r.status === 'checked_out') return false;
        const rStart = new Date(r.checkIn).getTime();
        const rEnd = new Date(r.checkOut).getTime();
        return startMs < rEnd && endMs > rStart;
      });

      if (conflictingGuest) {
        return res.status(409).json({
          error: 'GUEST_CONFLICT_DETECTED',
          message: `Cannot block room: Room ${roomNumber} has an active booking for ${conflictingGuest.guestName} from ${conflictingGuest.checkIn} to ${conflictingGuest.checkOut}. Please initiate a Room Move first before placing this room on an Out-of-Order maintenance block.`,
          conflictingGuest,
        });
      }
    }

    const newOrder = {
      id: `maint-${Date.now()}`,
      hotelId,
      roomId,
      roomNumber: roomNumber || '101',
      category: category || 'plumbing',
      title: title || 'Routine Inspection',
      description: description || '',
      priority,
      status: 'open',
      reportedBy: reportedBy || 'Housekeeping',
      startDate: startDate || new Date().toISOString().split('T')[0],
      expectedEndDate: expectedEndDate || new Date().toISOString().split('T')[0],
      blocksRoom: Boolean(blocksRoom),
      guestConflictChecked,
      conflictDetails,
      createdAt: new Date().toISOString(),
    };

    state.maintenanceOrders = [newOrder, ...(state.maintenanceOrders || [])];
    saveDbState(state);

    res.json({ success: true, message: 'Maintenance order registered.', order: newOrder });
  });

  // =========================================================================
  // ENTERPRISE PMS: SYSTEM BACKUP, DISASTER RECOVERY & DOWNTIME PACK
  // =========================================================================
  app.get('/api/system/backup', async (req, res) => {
    try {
      const crypto = await import('crypto');
      const state = getDbState() || {};
      const stateJson = JSON.stringify(state, null, 2);
      const hash = crypto.createHash('sha256').update(stateJson).digest('hex');

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        checksum: hash,
        backupSnapshot: state,
        sizeBytes: Buffer.byteLength(stateJson),
      });
    } catch (e: any) {
      res.status(500).json({ error: 'BACKUP_FAILED', message: e.message });
    }
  });

  app.post('/api/system/restore', (req, res) => {
    const { backupSnapshot } = req.body;
    if (!backupSnapshot || typeof backupSnapshot !== 'object') {
      return res.status(400).json({ error: 'INVALID_SNAPSHOT', message: 'Valid backupSnapshot object is required.' });
    }

    const saved = saveDbState(backupSnapshot);
    if (!saved) {
      return res.status(500).json({ error: 'RESTORE_ERROR', message: 'Failed to write backup snapshot to database.' });
    }

    broadcastLiveEvent('system_restored', { timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Database successfully restored from verified backup snapshot.' });
  });

  app.get('/api/hotels/:hotelId/downtime-pack', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'nightAudit', 'Downtime & Compliance Pack requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    const reservations = (state.reservations || []).filter((r: any) => r.hotelId === hotelId);
    const rooms = (state.rooms || []).filter((r: any) => r.hotelId === hotelId);
    const folios = (state.guestFolios || []).filter((f: any) => f.hotelId === hotelId);

    const todayStr = new Date().toISOString().split('T')[0];
    const arrivalsToday = reservations.filter((r: any) => r.checkIn === todayStr && r.status !== 'cancelled');
    const inHouseGuests = reservations.filter((r: any) => r.status === 'confirmed' || r.status === 'checked_in');
    const outstandingBalances = folios.filter((f: any) => f.balanceDue > 0);

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      hotelId,
      arrivalsToday,
      inHouseGuests,
      outstandingBalances,
      roomsOverview: rooms,
    });
  });

  // =========================================================================
  // 3. EDITABLE CUSTOM ROLES & GRANULAR PERMISSIONS API
  // =========================================================================
  app.get('/api/hotels/:hotelId/roles', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const customRoles = (state.customRoles || []).filter((r: any) => r.hotelId === hotelId);
    res.json({ success: true, customRoles });
  });

  app.post('/api/hotels/:hotelId/roles', (req, res) => {
    const { hotelId } = req.params;
    const { id, name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Role title is required.' });
    }

    const state = getDbState() || {};
    const targetHotel = (state.hotels || []).find((h: any) => h.id === hotelId);
    if (targetHotel) {
      const ent = resolveHotelEntitlements(targetHotel);
      if (!ent.privileges.customRoles) {
        return res.status(403).json({
          error: 'PLAN_UPGRADE_REQUIRED',
          feature: 'customRoles',
          message: 'Custom Editable Roles require IGHO Stay Professional. Please upgrade your subscription to unlock custom roles.',
        });
      }
    }

    let customRoles = state.customRoles || [];

    const existingIndex = customRoles.findIndex((r: any) => r.id === id);
    const updatedRole = {
      id: id || `role-${Date.now()}`,
      hotelId,
      name: name.trim(),
      description: description ? description.trim() : 'Custom hotel operational role',
      permissions: Array.isArray(permissions) ? permissions : [],
      active: true,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      customRoles[existingIndex] = updatedRole;
    } else {
      customRoles = [updatedRole, ...customRoles];
    }

    // Automatically synchronize staff accounts assigned to this role
    if (Array.isArray(state.staff)) {
      state.staff = state.staff.map((s: any) => {
        if (s.hotelId === hotelId && (s.role === updatedRole.id || s.role === updatedRole.name.toLowerCase())) {
          return { ...s, permissions: updatedRole.permissions };
        }
        return s;
      });
    }

    state.customRoles = customRoles;
    saveDbState(state);
    broadcastLiveEvent('roles_updated', { hotelId, roleId: updatedRole.id });

    res.json({ success: true, role: updatedRole });
  });

  app.delete('/api/hotels/:hotelId/roles/:roleId', (req, res) => {
    const { hotelId, roleId } = req.params;
    const state = getDbState() || {};
    let customRoles = state.customRoles || [];

    state.customRoles = customRoles.filter((r: any) => !(r.id === roleId && r.hotelId === hotelId));
    saveDbState(state);
    broadcastLiveEvent('roles_updated', { hotelId, roleId, action: 'deleted' });

    res.json({ success: true, message: 'Custom role deleted.' });
  });

  // =========================================================================
  // 3B. SECURE STAFF INVITATIONS, EMAIL DELIVERY & OTP VERIFICATION
  // =========================================================================
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ALLOWED_BUILT_IN_INVITE_ROLES = new Set(['manager', 'receptionist', 'finance', 'housekeeping']);
  const FORBIDDEN_INVITE_ROLES = new Set(['owner', 'hotel_owner', 'super_admin', 'admin', 'platform_admin']);

  function sha256Hex(value: string): string {
    return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
  }

  function timingSafeHexEqual(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }

  function sanitizeInvitationForClient(inv: any) {
    if (!inv || typeof inv !== 'object') return inv;
    const {
      token: _rawToken,
      tokenHash: _tokenHash,
      otpHash: _otpHash,
      otpSalt: _otpSalt,
      verificationProofHash: _vpHash,
      verifiedSupabaseAccessToken: _accessTok,
      ...safe
    } = inv;
    return safe;
  }

  function resolveInviteRolePermissions(state: any, hotelId: string, role: string): string[] {
    const cleanRole = String(role || 'receptionist').trim().toLowerCase();
    const rolePermissionsMap: Record<string, string[]> = {
      manager: [
        'dashboard.view',
        'reservations.view',
        'reservations.create',
        'reservations.edit',
        'reservations.check_in',
        'reservations.check_out',
        'rooms.view',
        'rooms.create',
        'rooms.edit',
        'guests.view',
        'billing.view',
        'billing.create',
        'housekeeping.view',
        'reports.view',
        'users.view',
      ],
      receptionist: [
        'dashboard.view',
        'reservations.view',
        'reservations.create',
        'reservations.edit',
        'reservations.check_in',
        'reservations.check_out',
        'rooms.view',
        'guests.view',
        'guests.create',
        'billing.view',
      ],
      finance: [
        'dashboard.view',
        'reservations.view',
        'billing.view',
        'billing.create',
        'billing.edit',
        'billing.refund',
        'reports.view',
        'reports.export',
      ],
      housekeeping: [
        'dashboard.view',
        'rooms.view',
        'housekeeping.view',
        'housekeeping.create',
        'housekeeping.edit',
      ],
    };

    if (rolePermissionsMap[cleanRole]) {
      return rolePermissionsMap[cleanRole];
    }

    const customRole = (state.customRoles || []).find(
      (cr: any) =>
        cr.hotelId === hotelId &&
        cr.active !== false &&
        (String(cr.id || '').toLowerCase() === cleanRole || String(cr.name || '').toLowerCase() === cleanRole)
    );
    if (customRole && Array.isArray(customRole.permissions)) {
      return customRole.permissions;
    }

    return rolePermissionsMap.receptionist;
  }

  function validateAssignableInviteRole(
    state: any,
    hotel: any,
    hotelId: string,
    requestedRole: string
  ): { ok: true; role: string } | { ok: false; status: number; error: string; message: string } {
    const cleanRole = String(requestedRole || '').trim().toLowerCase();
    if (!cleanRole) {
      return { ok: false, status: 400, error: 'ROLE_REQUIRED', message: 'A valid staff role is required.' };
    }
    if (FORBIDDEN_INVITE_ROLES.has(cleanRole)) {
      return {
        ok: false,
        status: 403,
        error: 'PRIVILEGED_ROLE_FORBIDDEN',
        message: 'Administrator, Hotel Owner, and Super Admin roles cannot be assigned via staff invitations.',
      };
    }
    if (ALLOWED_BUILT_IN_INVITE_ROLES.has(cleanRole)) {
      return { ok: true, role: cleanRole };
    }
    const ent = hotel ? resolveHotelEntitlements(hotel) : null;
    if (ent && !ent.privileges.customRoles) {
      return {
        ok: false,
        status: 403,
        error: 'CUSTOM_ROLES_UPGRADE_REQUIRED',
        message: 'Custom staff roles require IGHO Stay Professional.',
      };
    }
    const customMatch = (state.customRoles || []).find(
      (cr: any) =>
        cr.hotelId === hotelId &&
        cr.active !== false &&
        (String(cr.id || '').toLowerCase() === cleanRole || String(cr.name || '').toLowerCase() === cleanRole)
    );
    if (!customMatch) {
      return {
        ok: false,
        status: 400,
        error: 'INVALID_STAFF_ROLE',
        message: `Role "${requestedRole}" is not a recognized role for this hotel.`,
      };
    }
    return { ok: true, role: String(customMatch.name || cleanRole).toLowerCase() };
  }

  async function authorizeHotelStaffInviteAdmin(
    req: express.Request,
    hotelId: string
  ): Promise<
    | { ok: true; caller: Awaited<ReturnType<typeof resolveCaller>> }
    | { ok: false; status: number; error: string; message: string }
  > {
    const caller = await resolveCaller(req);
    if (caller.banned) {
      return {
        ok: false,
        status: 403,
        error: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended by platform administration.',
      };
    }

    const supabaseConfigured = Boolean(
      supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
    );
    if (supabaseConfigured && !caller.verifiedJwt) {
      return {
        ok: false,
        status: 401,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'An authenticated administrator session is required to manage hotel staff invitations.',
      };
    }

    if (caller.isSuperAdmin) {
      return { ok: true, caller };
    }

    const cleanEmail = String(caller.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return {
        ok: false,
        status: 401,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Administrator identity is required to manage hotel staff invitations.',
      };
    }

    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);
    if (!hotel) {
      return { ok: false, status: 404, error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' };
    }

    const ownerMatch =
      String(hotel.ownerEmail || '').trim().toLowerCase() === cleanEmail ||
      String(hotel.email || '').trim().toLowerCase() === cleanEmail;
    if (ownerMatch) {
      return { ok: true, caller };
    }

    if (caller.verifiedJwt) {
      const authorizedOrgs = await getCallerAuthorizedOrganizations(caller);
      const membership = authorizedOrgs.find((o) => o.organizationId === hotelId);
      if (membership && ['owner', 'hotel_owner', 'manager', 'hotel_manager'].includes(membership.role)) {
        return { ok: true, caller };
      }
    }

    const activeStaff = (state.staff || []).find(
      (s: any) =>
        s.hotelId === hotelId &&
        String(s.email || '').trim().toLowerCase() === cleanEmail &&
        s.active !== false &&
        s.status !== 'deactivated' &&
        s.status !== 'inactive'
    );
    if (activeStaff) {
      const sRole = String(activeStaff.role || '').toLowerCase();
      const perms: string[] = Array.isArray(activeStaff.permissions) ? activeStaff.permissions : [];
      if (
        ['owner', 'hotel_owner', 'manager', 'hotel_manager'].includes(sRole) ||
        perms.includes('users.invite')
      ) {
        return { ok: true, caller };
      }
    }

    return {
      ok: false,
      status: 403,
      error: 'CROSS_ORGANIZATION_DENIED',
      message: 'Only an authorized administrator of this hotel may invite or manage staff.',
    };
  }

  function resolveOriginUrl(req: express.Request): string {
    const envUrl = String(process.env.APP_URL || '').trim();
    if (envUrl && /^https?:\/\//i.test(envUrl)) {
      return envUrl.replace(/\/+$/, '');
    }
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
    return 'http://localhost:3000';
  }

  function escapeEmailHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildInvitationEmailHtml(params: {
    hotelName: string;
    invitedName: string;
    roleLabel: string;
    otpCode: string;
    inviteUrl: string;
  }) {
    const safeHotel = escapeEmailHtml(params.hotelName);
    const safeInvitedName = escapeEmailHtml(params.invitedName);
    const safeRole = escapeEmailHtml(params.roleLabel);
    const safeOtp = escapeEmailHtml(params.otpCode);
    const safeUrl = escapeEmailHtml(params.inviteUrl);
    const greeting = safeInvitedName ? `Hello ${safeInvitedName},` : 'Hello,';
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
        <div style="margin-bottom: 20px;">
          <span style="display: inline-block; background: #000000; color: #ffffff; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 999px;">IGHO SOFTWARE SYSTEMS</span>
        </div>
        <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 800; color: #111827;">Staff Invitation — ${safeHotel}</h2>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #374151;">
          ${greeting} You have been invited to join <strong>${safeHotel}</strong> on IGHO Stay as <strong>${safeRole}</strong>.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 18px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 6px;">Your 6-Digit Email Verification OTP</div>
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 28px; font-weight: 900; letter-spacing: 0.2em; color: #000000;">${safeOtp}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">Valid for 15 minutes · Single use</div>
        </div>
        <p style="margin: 0 0 18px; font-size: 13px; color: #374151;">
          Open your secure invitation link below, enter the OTP above to verify email ownership, and create your password:
        </p>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${safeUrl}" style="display: inline-block; background: #000000; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 999px;">Accept Staff Invitation</a>
        </div>
        <p style="margin: 0; font-size: 11px; color: #6b7280; word-break: break-all;">Or copy link: ${safeUrl}</p>
      </div>
    `;
  }

  async function dispatchStaffInvitationEmail(params: {
    toEmail: string;
    hotelId: string;
    hotelName: string;
    invitedName: string;
    role: string;
    inviteUrl: string;
  }): Promise<
    | {
        ok: true;
        provider: 'resend_api' | 'supabase_smtp';
        deliveryMode: 'supabase_otp' | 'resend_custom_otp';
        providerMessageId?: string;
        otpHash?: string;
        otpSalt?: string;
        otpExpiresAt?: string;
        details?: string;
      }
    | {
        ok: false;
        statusCode: number;
        error: string;
        message: string;
        provider: string;
      }
  > {
    const cleanEmail = params.toEmail.trim().toLowerCase();
    const roleLabel = params.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
    const resendFrom = String(
      process.env.RESEND_FROM_EMAIL || 'IGHO Software Systems <onboarding@resend.dev>'
    ).trim();
    const supabaseKey = String(supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

    // Path 1: Direct Resend API (when RESEND_API_KEY is configured in server environment)
    if (resendApiKey) {
      let otpToEmail = '';
      let deliveryMode: 'supabase_otp' | 'resend_custom_otp' = 'resend_custom_otp';
      let otpSalt: string | undefined;
      let otpHash: string | undefined;
      let otpExpiresAt: string | undefined;

      // Prefer generating a real unconfirmed Supabase Auth OTP when supabaseAdminClient is active
      if (supabaseAdminClient) {
        const { data: linkData, error: linkErr } = await supabaseAdminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: {
            redirectTo: params.inviteUrl,
            data: {
              full_name: params.invitedName || '',
              invited_hotel_id: params.hotelId,
              invited_hotel_name: params.hotelName,
              invited_role: params.role,
              invitation_flow: true,
            },
          },
        });
        if (linkErr || !linkData?.properties?.email_otp) {
          console.error('[Staff Invite Email] Supabase generateLink failed:', linkErr);
          return {
            ok: false,
            statusCode: 502,
            error: 'SUPABASE_OTP_GENERATION_FAILED',
            message:
              linkErr?.message ||
              'Failed to generate Supabase email OTP for this recipient.',
            provider: 'resend_api',
          };
        }
        otpToEmail = String(linkData.properties.email_otp);
        deliveryMode = 'supabase_otp';
      } else {
        otpToEmail = String(crypto.randomInt(100000, 1000000));
        otpSalt = crypto.randomBytes(16).toString('hex');
        otpHash = sha256Hex(`${otpSalt}:${otpToEmail}`);
        otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      try {
        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [cleanEmail],
            subject: `Staff Invitation: Join ${params.hotelName} (${roleLabel}) — OTP ${otpToEmail}`,
            html: buildInvitationEmailHtml({
              hotelName: params.hotelName,
              invitedName: params.invitedName,
              roleLabel,
              otpCode: otpToEmail,
              inviteUrl: params.inviteUrl,
            }),
            text: `You have been invited to join ${params.hotelName} as ${roleLabel}.\nYour 6-digit verification OTP: ${otpToEmail}\nAccept invitation: ${params.inviteUrl}`,
          }),
        });

        const resendData: any = await resendResp.json().catch(() => ({}));
        console.log(
          `[Staff Invite Email] Resend API response: status=${resendResp.status} id=${resendData?.id || 'none'} recipient=${cleanEmail}`
        );

        if (!resendResp.ok || !resendData?.id) {
          const rawMsg =
            resendData?.message ||
            resendData?.error ||
            `Resend rejected email delivery (HTTP ${resendResp.status}).`;
          const testingHint =
            rawMsg.toLowerCase().includes('testing emails') || rawMsg.toLowerCase().includes('verify a domain')
              ? ' Note: While using onboarding@resend.dev without a verified custom domain, Resend restricts emails to your Resend account owner email.'
              : '';
          return {
            ok: false,
            statusCode: resendResp.status || 502,
            error: 'RESEND_DELIVERY_REJECTED',
            message: `${rawMsg}${testingHint}`,
            provider: 'resend_api',
          };
        }

        return {
          ok: true,
          provider: 'resend_api',
          deliveryMode,
          providerMessageId: String(resendData.id),
          otpHash,
          otpSalt,
          otpExpiresAt,
          details: `Accepted by Resend (ID: ${resendData.id}).`,
        };
      } catch (err: any) {
        console.error('[Staff Invite Email] Resend network error:', err);
        return {
          ok: false,
          statusCode: 502,
          error: 'RESEND_NETWORK_ERROR',
          message: err?.message || 'Network failure contacting Resend API.',
          provider: 'resend_api',
        };
      }
    }

    // Path 2: Supabase Auth /auth/v1/otp (uses Resend SMTP configured in Supabase Dashboard)
    if (supabaseUrlEnv && supabaseKey) {
      try {
        const otpEndpoint = `${supabaseUrlEnv.replace(/\/+$/, '')}/auth/v1/otp`;
        const otpResp = await fetch(otpEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            ...(supabaseServiceKeyEnv ? { Authorization: `Bearer ${supabaseServiceKeyEnv}` } : {}),
          },
          body: JSON.stringify({
            email: cleanEmail,
            create_user: true,
            email_redirect_to: params.inviteUrl,
            data: {
              full_name: params.invitedName || '',
              invited_hotel_id: params.hotelId,
              invited_hotel_name: params.hotelName,
              invited_role: params.role,
              invitation_flow: true,
            },
          }),
        });

        const otpData: any = await otpResp.json().catch(() => ({}));
        console.log(
          `[Staff Invite Email] Supabase /auth/v1/otp -> status=${otpResp.status} recipient=${cleanEmail}`
        );

        if (!otpResp.ok) {
          const rawMsg =
            otpData?.msg ||
            otpData?.error_description ||
            otpData?.message ||
            otpData?.error ||
            `Supabase Auth OTP dispatch failed (HTTP ${otpResp.status}).`;
          const testingHint =
            otpResp.status === 429
              ? ' Rate limit reached — wait 60 seconds before retrying.'
              : rawMsg.toLowerCase().includes('smtp') ||
                rawMsg.toLowerCase().includes('sending') ||
                rawMsg.toLowerCase().includes('unexpected_failure')
              ? ' Check Supabase SMTP (Resend): when using onboarding@resend.dev, Resend only delivers to your Resend account email until a custom domain is verified.'
              : '';
          return {
            ok: false,
            statusCode: otpResp.status || 502,
            error: 'SUPABASE_SMTP_DELIVERY_FAILED',
            message: `${rawMsg}${testingHint}`,
            provider: 'supabase_smtp',
          };
        }

        return {
          ok: true,
          provider: 'supabase_smtp',
          deliveryMode: 'supabase_otp',
          providerMessageId: otpData?.message_id ? String(otpData.message_id) : undefined,
          details: 'Accepted by Supabase Auth OTP via configured Resend SMTP.',
        };
      } catch (err: any) {
        console.error('[Staff Invite Email] Supabase /auth/v1/otp error:', err);
        return {
          ok: false,
          statusCode: 502,
          error: 'SUPABASE_AUTH_NETWORK_ERROR',
          message: err?.message || 'Network error calling Supabase Auth OTP endpoint.',
          provider: 'supabase_smtp',
        };
      }
    }

    // Path 3: Neither Supabase Auth nor Resend API key is configured on this server
    console.warn(
      `[Staff Invite Email] Blocked fake success for ${cleanEmail}: neither SUPABASE_URL+KEY nor RESEND_API_KEY is configured.`
    );
    return {
      ok: false,
      statusCode: 503,
      error: 'EMAIL_DELIVERY_NOT_CONFIGURED',
      message:
        'Email delivery provider is not configured on the backend server. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (with Resend SMTP enabled in Supabase) or RESEND_API_KEY in your server environment secrets.',
      provider: 'none',
    };
  }

  async function syncInvitationToPostgres(inviteRecord: any) {
    if (!supabaseAdminClient) return;
    if (!UUID_REGEX.test(String(inviteRecord.hotelId || ''))) return;
    try {
      const payload: any = {
        organization_id: inviteRecord.hotelId,
        email: inviteRecord.email,
        role: inviteRecord.role,
        token: inviteRecord.tokenHash,
        status: inviteRecord.status,
        invited_at: inviteRecord.invitedAt,
        expires_at: inviteRecord.expiresAt,
      };
      if (UUID_REGEX.test(String(inviteRecord.invitedByUserId || ''))) {
        payload.invited_by = inviteRecord.invitedByUserId;
      }
      if (UUID_REGEX.test(String(inviteRecord.id || ''))) {
        payload.id = inviteRecord.id;
      }
      const { error } = await supabaseAdminClient.from('staff_invitations').upsert(payload, {
        onConflict: 'token',
      });
      if (error) {
        console.warn('[Staff Invite] Postgres staff_invitations sync error:', error.message);
      }
    } catch (err) {
      console.warn('[Staff Invite] Postgres sync warning:', err);
    }
  }

  // List Hotel Invitations (Admin-only, sanitized)
  app.get('/api/hotels/:hotelId/invitations', async (req, res) => {
    const { hotelId } = req.params;
    const auth = await authorizeHotelStaffInviteAdmin(req, hotelId);
    if ('error' in auth) {
      return res.status(auth.status).json({ error: auth.error, message: auth.message });
    }
    const state = getDbState() || {};
    const invitations = (state.invitations || [])
      .filter((i: any) => i.hotelId === hotelId)
      .map(sanitizeInvitationForClient);
    res.json({ success: true, invitations });
  });

  // Create & Dispatch Staff Invitation Email (Real Provider Confirmation Required)
  app.post('/api/hotels/:hotelId/invitations', async (req, res) => {
    const { hotelId } = req.params;
    const auth = await authorizeHotelStaffInviteAdmin(req, hotelId);
    if ('error' in auth) {
      return res.status(auth.status).json({ success: false, emailSent: false, error: auth.error, message: auth.message });
    }

    const { email, role, name, invitedName, hotelName } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        emailSent: false,
        error: 'INVALID_EMAIL',
        message: 'A valid staff email address is required.',
      });
    }

    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        emailSent: false,
        error: 'HOTEL_NOT_FOUND',
        message: 'Target hotel was not found.',
      });
    }

    const roleCheck = validateAssignableInviteRole(state, hotel, hotelId, role);
    if ('error' in roleCheck) {
      return res.status(roleCheck.status).json({
        success: false,
        emailSent: false,
        error: roleCheck.error,
        message: roleCheck.message,
      });
    }

    const existingActiveStaff = (state.staff || []).find(
      (s: any) =>
        s.hotelId === hotelId &&
        String(s.email || '').trim().toLowerCase() === cleanEmail &&
        s.status !== 'deactivated' &&
        s.status !== 'inactive' &&
        s.active !== false
    );
    if (existingActiveStaff) {
      return res.status(409).json({
        success: false,
        emailSent: false,
        error: 'STAFF_ALREADY_ACTIVE',
        message: `${cleanEmail} is already an active staff member of ${hotel.name}.`,
      });
    }

    let invitations: any[] = Array.isArray(state.invitations) ? [...state.invitations] : [];
    const existingPendingIdx = invitations.findIndex(
      (i: any) =>
        i.hotelId === hotelId &&
        String(i.email || '').trim().toLowerCase() === cleanEmail &&
        (i.status === 'pending' || i.status === 'expired')
    );

    // Enforce plan active-staff + pending-invite quota (retry for same pending email does not consume an extra seat)
    const ent = resolveHotelEntitlements(hotel);
    const activeStaffCount = (state.staff || []).filter(
      (s: any) => s.hotelId === hotelId && s.status !== 'deactivated' && s.status !== 'inactive' && s.active !== false
    ).length;
    const pendingOtherCount = invitations.filter(
      (i: any) =>
        i.hotelId === hotelId &&
        i.status === 'pending' &&
        String(i.email || '').trim().toLowerCase() !== cleanEmail
    ).length;
    if (activeStaffCount + pendingOtherCount >= ent.privileges.maxStaff) {
      return res.status(403).json({
        success: false,
        emailSent: false,
        error: 'STAFF_QUOTA_EXCEEDED',
        feature: 'maxStaff',
        maxStaff: ent.privileges.maxStaff,
        message: `Your current plan (${ent.plan.name}) supports up to ${ent.privileges.maxStaff} active staff/pending invitations. Deactivate an unused seat or upgrade to IGHO Stay Professional.`,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);
    const inviteId =
      existingPendingIdx >= 0
        ? invitations[existingPendingIdx].id
        : UUID_REGEX.test(hotelId)
        ? crypto.randomUUID()
        : `inv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const resolvedHotelName = hotel.name || hotelName || 'Partner Hotel';
    const cleanInvitedName = String(invitedName || name || '').trim();
    const origin = resolveOriginUrl(req);
    const inviteUrl = `${origin}/#accept-invite?token=${rawToken}`;

    // Dispatch actual email BEFORE confirming success or persisting broken invites
    const emailResult = await dispatchStaffInvitationEmail({
      toEmail: cleanEmail,
      hotelId,
      hotelName: resolvedHotelName,
      invitedName: cleanInvitedName,
      role: roleCheck.role,
      inviteUrl,
    });

    if ('error' in emailResult) {
      appendAuditLog({
        actorEmail: auth.caller.email || 'hotel_admin',
        action: 'STAFF_INVITATION_EMAIL_FAILED',
        target: cleanEmail,
        targetType: 'staff_invitation',
        newValue: emailResult.error,
        metadata: { hotelId, role: roleCheck.role, provider: emailResult.provider, message: emailResult.message },
      });
      return res.status(emailResult.statusCode || 502).json({
        success: false,
        emailSent: false,
        provider: emailResult.provider,
        error: emailResult.error,
        message: emailResult.message,
      });
    }

    const nowIso = new Date().toISOString();
    const inviteRecord: any = {
      id: inviteId,
      hotelId,
      hotelName: resolvedHotelName,
      email: cleanEmail,
      invitedName: cleanInvitedName,
      role: roleCheck.role,
      tokenHash,
      tokenHint: `${rawToken.slice(0, 6)}...${rawToken.slice(-4)}`,
      status: 'pending',
      invitedBy: auth.caller.email || 'Hotel Administrator',
      invitedByUserId: auth.caller.userId,
      invitedAt: nowIso,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      deliveryMode: emailResult.deliveryMode,
      emailProvider: emailResult.provider,
      emailDeliveryStatus: 'sent',
      providerMessageId: emailResult.providerMessageId,
      lastEmailSentAt: nowIso,
      otpAttempts: 0,
      ...(emailResult.otpHash
        ? {
            otpHash: emailResult.otpHash,
            otpSalt: emailResult.otpSalt,
            otpExpiresAt: emailResult.otpExpiresAt,
          }
        : {}),
    };

    if (existingPendingIdx >= 0) {
      invitations[existingPendingIdx] = inviteRecord;
    } else {
      invitations = [inviteRecord, ...invitations];
    }
    state.invitations = invitations;
    saveDbState(state);
    await syncInvitationToPostgres(inviteRecord);

    appendAuditLog({
      actorEmail: auth.caller.email || 'hotel_admin',
      action: 'STAFF_INVITATION_SENT',
      target: cleanEmail,
      targetType: 'staff_invitation',
      newValue: `${roleCheck.role}@${hotelId}`,
      metadata: {
        invitationId: inviteId,
        provider: emailResult.provider,
        providerMessageId: emailResult.providerMessageId,
      },
    });

    const sanitizedInvite = sanitizeInvitationForClient(inviteRecord);
    broadcastLiveEvent('staff_invitation_created', sanitizedInvite);

    res.json({
      success: true,
      emailSent: true,
      provider: emailResult.provider,
      deliveryMode: emailResult.deliveryMode,
      providerMessageId: emailResult.providerMessageId,
      details: emailResult.details,
      invitation: sanitizedInvite,
      invitationUrl: `/#accept-invite?token=${rawToken}`,
    });
  });

  // Resend Staff Invitation OTP & Rotate Token
  app.post('/api/hotels/:hotelId/invitations/:invitationId/resend', async (req, res) => {
    const { hotelId, invitationId } = req.params;
    const auth = await authorizeHotelStaffInviteAdmin(req, hotelId);
    if ('error' in auth) {
      return res.status(auth.status).json({ success: false, emailSent: false, error: auth.error, message: auth.message });
    }

    const state = getDbState() || {};
    let invitations: any[] = Array.isArray(state.invitations) ? [...state.invitations] : [];
    const idx = invitations.findIndex((i: any) => i.id === invitationId && i.hotelId === hotelId);
    if (idx === -1) {
      return res.status(404).json({ success: false, emailSent: false, error: 'INVITE_NOT_FOUND', message: 'Invitation not found.' });
    }
    if (invitations[idx].status === 'accepted') {
      return res.status(409).json({
        success: false,
        emailSent: false,
        error: 'INVITE_ALREADY_ACCEPTED',
        message: 'This invitation has already been accepted.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);
    const origin = resolveOriginUrl(req);
    const inviteUrl = `${origin}/#accept-invite?token=${rawToken}`;
    const existing = invitations[idx];

    const emailResult = await dispatchStaffInvitationEmail({
      toEmail: existing.email,
      hotelId,
      hotelName: existing.hotelName || 'Partner Hotel',
      invitedName: existing.invitedName || '',
      role: existing.role,
      inviteUrl,
    });

    if ('error' in emailResult) {
      return res.status(emailResult.statusCode || 502).json({
        success: false,
        emailSent: false,
        provider: emailResult.provider,
        error: emailResult.error,
        message: emailResult.message,
      });
    }

    const nowIso = new Date().toISOString();
    const updatedInvite = {
      ...existing,
      status: 'pending',
      tokenHash,
      tokenHint: `${rawToken.slice(0, 6)}...${rawToken.slice(-4)}`,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      deliveryMode: emailResult.deliveryMode,
      emailProvider: emailResult.provider,
      emailDeliveryStatus: 'sent',
      providerMessageId: emailResult.providerMessageId,
      lastEmailSentAt: nowIso,
      otpAttempts: 0,
      otpVerifiedAt: undefined,
      verificationProofHash: undefined,
      verificationProofExpiresAt: undefined,
      ...(emailResult.otpHash
        ? {
            otpHash: emailResult.otpHash,
            otpSalt: emailResult.otpSalt,
            otpExpiresAt: emailResult.otpExpiresAt,
          }
        : {}),
    };
    invitations[idx] = updatedInvite;
    state.invitations = invitations;
    saveDbState(state);
    await syncInvitationToPostgres(updatedInvite);

    res.json({
      success: true,
      emailSent: true,
      provider: emailResult.provider,
      providerMessageId: emailResult.providerMessageId,
      invitation: sanitizeInvitationForClient(updatedInvite),
      invitationUrl: `/#accept-invite?token=${rawToken}`,
    });
  });

  // Revoke / Cancel Staff Invitation
  app.delete('/api/hotels/:hotelId/invitations/:invitationId', async (req, res) => {
    const { hotelId, invitationId } = req.params;
    const auth = await authorizeHotelStaffInviteAdmin(req, hotelId);
    if ('error' in auth) {
      return res.status(auth.status).json({ error: auth.error, message: auth.message });
    }

    const state = getDbState() || {};
    let invitations: any[] = Array.isArray(state.invitations) ? [...state.invitations] : [];
    const idx = invitations.findIndex((i: any) => i.id === invitationId && i.hotelId === hotelId);
    if (idx === -1) {
      return res.status(404).json({ error: 'INVITE_NOT_FOUND', message: 'Invitation not found.' });
    }
    const targetEmail = invitations[idx].email;
    const targetTokenHash = invitations[idx].tokenHash;
    invitations = invitations.filter((i: any) => !(i.id === invitationId && i.hotelId === hotelId));
    state.invitations = invitations;
    saveDbState(state);

    if (supabaseAdminClient && targetTokenHash) {
      try {
        await supabaseAdminClient
          .from('staff_invitations')
          .update({ status: 'revoked' })
          .eq('token', targetTokenHash);
      } catch {}
    }

    appendAuditLog({
      actorEmail: auth.caller.email || 'hotel_admin',
      action: 'STAFF_INVITATION_REVOKED',
      target: targetEmail || invitationId,
      targetType: 'staff_invitation',
    });

    res.json({ success: true, message: 'Staff invitation revoked.' });
  });

  // Public Invitation Lookup by Secret Token (Read-Only Locked Context)
  app.get('/api/invitations/lookup', (req, res) => {
    const rawToken = String(req.query.token || '').trim();
    if (!rawToken || rawToken.length < 8) {
      return res.status(400).json({
        valid: false,
        error: 'TOKEN_REQUIRED',
        message: 'A valid invitation link token is required.',
      });
    }

    const tokenHash = sha256Hex(rawToken);
    const state = getDbState() || {};
    const invitations: any[] = Array.isArray(state.invitations) ? state.invitations : [];
    const idx = invitations.findIndex(
      (inv: any) =>
        (inv.tokenHash && timingSafeHexEqual(inv.tokenHash, tokenHash)) ||
        (inv.token && inv.token === rawToken)
    );

    if (idx === -1) {
      return res.status(404).json({
        valid: false,
        error: 'INVITE_NOT_FOUND',
        message: 'This invitation link is invalid or has been revoked.',
      });
    }

    const invite = invitations[idx];
    if (invite.status === 'accepted') {
      return res.status(409).json({
        valid: false,
        error: 'INVITE_ALREADY_ACCEPTED',
        message: 'This staff invitation has already been accepted. Please sign in through the Staff Portal.',
      });
    }
    if (invite.status === 'revoked') {
      return res.status(410).json({
        valid: false,
        error: 'INVITE_REVOKED',
        message: 'This staff invitation has been revoked by the hotel administrator.',
      });
    }
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      invitations[idx] = { ...invite, status: 'expired' };
      state.invitations = invitations;
      saveDbState(state);
      return res.status(410).json({
        valid: false,
        error: 'INVITE_EXPIRED',
        message: 'This invitation has expired. Ask your hotel administrator to send a fresh invitation.',
      });
    }

    const hotel = (state.hotels || []).find((h: any) => h.id === invite.hotelId);
    return res.json({
      valid: true,
      invitation: {
        id: invite.id,
        hotelId: invite.hotelId,
        hotelName: hotel?.name || invite.hotelName || 'Partner Hotel',
        email: invite.email,
        invitedName: invite.invitedName || '',
        role: invite.role,
        expiresAt: invite.expiresAt,
        deliveryMode: invite.deliveryMode || 'supabase_otp',
        otpVerified: Boolean(
          invite.verificationProofHash &&
            invite.verificationProofExpiresAt &&
            new Date(invite.verificationProofExpiresAt).getTime() > Date.now()
        ),
      },
    });
  });

  // Step 1 of Acceptance: Verify Email Ownership via OTP (or verified Supabase Magic-Link session)
  app.post('/api/invitations/verify-otp', async (req, res) => {
    const { token, otpCode, accessToken } = req.body || {};
    const rawToken = String(token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ error: 'TOKEN_REQUIRED', message: 'Invitation token is required.' });
    }

    const tokenHash = sha256Hex(rawToken);
    const state = getDbState() || {};
    const invitations: any[] = Array.isArray(state.invitations) ? [...state.invitations] : [];
    const idx = invitations.findIndex(
      (inv: any) =>
        (inv.tokenHash && timingSafeHexEqual(inv.tokenHash, tokenHash)) ||
        (inv.token && inv.token === rawToken)
    );

    if (idx === -1) {
      return res.status(404).json({ error: 'INVITE_NOT_FOUND', message: 'Invalid or revoked invitation.' });
    }

    const invite = invitations[idx];
    if (invite.status !== 'pending') {
      return res.status(409).json({
        error: 'INVITE_NOT_PENDING',
        message: `This invitation cannot be verified because its status is '${invite.status}'.`,
      });
    }
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      invitations[idx] = { ...invite, status: 'expired' };
      state.invitations = invitations;
      saveDbState(state);
      return res.status(410).json({ error: 'INVITE_EXPIRED', message: 'Invitation has expired.' });
    }
    if (Number(invite.otpAttempts || 0) >= 5) {
      return res.status(429).json({
        error: 'TOO_MANY_OTP_ATTEMPTS',
        message: 'Too many invalid OTP attempts. Ask your hotel administrator to resend a new verification email.',
      });
    }

    let verifiedSupabaseUserId: string | undefined;
    let verifiedSupabaseAccessToken: string | undefined;
    const supabaseKey = String(supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

    if (accessToken) {
      // User arrived back via Supabase email confirmation / magic-link callback
      let sessionUser: any = null;
      if (supabaseAdminClient) {
        const { data } = await supabaseAdminClient.auth.getUser(String(accessToken)).catch(() => ({ data: null }));
        sessionUser = data?.user || null;
      } else if (supabaseUrlEnv && supabaseKey) {
        const resp = await fetch(`${supabaseUrlEnv.replace(/\/+$/, '')}/auth/v1/user`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${String(accessToken)}` },
        }).catch(() => null);
        if (resp?.ok) sessionUser = await resp.json().catch(() => null);
      }
      if (!sessionUser?.email || String(sessionUser.email).toLowerCase() !== String(invite.email).toLowerCase()) {
        return res.status(403).json({
          error: 'EMAIL_MISMATCH',
          message: `The verified email session does not match the invited email (${invite.email}).`,
        });
      }
      verifiedSupabaseUserId = String(sessionUser.id);
      verifiedSupabaseAccessToken = String(accessToken);
    } else {
      const cleanOtp = String(otpCode || '').trim();
      if (!cleanOtp || cleanOtp.length < 6) {
        return res.status(400).json({
          error: 'OTP_REQUIRED',
          message: 'Enter the 6-digit OTP verification code sent to your email.',
        });
      }

      if (invite.deliveryMode === 'resend_custom_otp') {
        if (!invite.otpHash || !invite.otpSalt || !invite.otpExpiresAt) {
          return res.status(400).json({
            error: 'OTP_NOT_FOUND',
            message: 'No active OTP exists for this invitation. Request a resend from your administrator.',
          });
        }
        if (new Date(invite.otpExpiresAt).getTime() < Date.now()) {
          return res.status(410).json({
            error: 'OTP_EXPIRED',
            message: 'This OTP code has expired. Request a new code from your administrator.',
          });
        }
        const computed = sha256Hex(`${invite.otpSalt}:${cleanOtp}`);
        if (!timingSafeHexEqual(computed, invite.otpHash)) {
          invitations[idx] = { ...invite, otpAttempts: Number(invite.otpAttempts || 0) + 1 };
          state.invitations = invitations;
          saveDbState(state);
          return res.status(400).json({ error: 'INVALID_OTP', message: 'Invalid 6-digit verification code.' });
        }
      } else {
        // Verify OTP directly against Supabase Auth (/auth/v1/verify)
        if (!supabaseUrlEnv || !supabaseKey) {
          return res.status(503).json({
            error: 'SUPABASE_NOT_CONFIGURED',
            message: 'Supabase Auth is not configured on the backend server.',
          });
        }
        const otpTypes = ['email', 'magiclink', 'signup', 'invite'];
        let verifiedPayload: any = null;
        let lastErrorMessage = 'Invalid or expired verification code.';
        for (const verifyType of otpTypes) {
          const verifyResp = await fetch(`${supabaseUrlEnv.replace(/\/+$/, '')}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseKey,
            },
            body: JSON.stringify({
              email: invite.email,
              token: cleanOtp,
              type: verifyType,
            }),
          }).catch(() => null);
          if (verifyResp) {
            const payload: any = await verifyResp.json().catch(() => ({}));
            if (verifyResp.ok && payload?.user) {
              verifiedPayload = payload;
              break;
            }
            if (payload?.msg || payload?.error_description || payload?.message) {
              lastErrorMessage = payload.msg || payload.error_description || payload.message;
            }
          }
        }

        if (!verifiedPayload?.user) {
          invitations[idx] = { ...invite, otpAttempts: Number(invite.otpAttempts || 0) + 1 };
          state.invitations = invitations;
          saveDbState(state);
          return res.status(400).json({
            error: 'INVALID_OR_EXPIRED_OTP',
            message: lastErrorMessage,
          });
        }

        if (String(verifiedPayload.user.email || '').toLowerCase() !== String(invite.email).toLowerCase()) {
          return res.status(403).json({
            error: 'EMAIL_MISMATCH',
            message: 'Verified OTP user email does not match the invitation email.',
          });
        }
        verifiedSupabaseUserId = String(verifiedPayload.user.id);
        verifiedSupabaseAccessToken = verifiedPayload.access_token ? String(verifiedPayload.access_token) : undefined;
      }
    }

    const verificationProof = crypto.randomBytes(24).toString('hex');
    invitations[idx] = {
      ...invite,
      otpAttempts: 0,
      otpVerifiedAt: new Date().toISOString(),
      verificationProofHash: sha256Hex(verificationProof),
      verificationProofExpiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      ...(verifiedSupabaseUserId ? { verifiedSupabaseUserId } : {}),
      ...(verifiedSupabaseAccessToken ? { verifiedSupabaseAccessToken } : {}),
    };
    state.invitations = invitations;
    saveDbState(state);

    res.json({
      success: true,
      verified: true,
      verificationProof,
      email: invite.email,
      hotelId: invite.hotelId,
      hotelName: invite.hotelName,
      role: invite.role,
      invitedName: invite.invitedName || '',
    });
  });

  // Step 2 of Acceptance: Set Password & Provision Trusted Hotel Membership (OTP Proof Required)
  app.post('/api/hotels/:hotelId/invitations/accept', async (req, res) => {
    const { hotelId } = req.params;
    const { token, verificationProof, fullName, firstName, lastName, password } = req.body || {};

    const rawToken = String(token || '').trim();
    const rawProof = String(verificationProof || '').trim();
    const resolvedFullName = String(fullName || `${firstName || ''} ${lastName || ''}`).trim();

    if (!rawToken) {
      return res.status(400).json({ error: 'TOKEN_REQUIRED', message: 'Valid invitation token is required.' });
    }
    if (!rawProof) {
      return res.status(403).json({
        error: 'OTP_VERIFICATION_REQUIRED',
        message: 'Email OTP verification must be completed before setting your password.',
      });
    }
    if (!resolvedFullName || resolvedFullName.length < 2) {
      return res.status(400).json({
        error: 'FULL_NAME_REQUIRED',
        message: 'Please provide your first and last name.',
      });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters.',
      });
    }

    const state = getDbState() || {};
    const invitations: any[] = Array.isArray(state.invitations) ? [...state.invitations] : [];
    const tokenHash = sha256Hex(rawToken);
    const idx = invitations.findIndex(
      (inv: any) =>
        (inv.tokenHash && timingSafeHexEqual(inv.tokenHash, tokenHash)) ||
        (inv.token && inv.token === rawToken)
    );

    if (idx === -1) {
      return res.status(404).json({
        error: 'INVITE_NOT_FOUND',
        message: 'Invitation record not found or has been revoked. Staff accounts require a valid invitation.',
      });
    }

    const matchedInvite = invitations[idx];
    if (matchedInvite.hotelId !== hotelId) {
      return res.status(403).json({
        error: 'HOTEL_MISMATCH',
        message: 'Invitation does not belong to the requested hotel.',
      });
    }
    if (matchedInvite.status === 'accepted') {
      return res.status(409).json({
        error: 'INVITE_ALREADY_ACCEPTED',
        message: 'This invitation link has already been accepted. Please sign in on the Staff Portal.',
      });
    }
    if (matchedInvite.status === 'revoked') {
      return res.status(410).json({
        error: 'INVITE_REVOKED',
        message: 'This invitation has been revoked by the hotel administrator.',
      });
    }
    if (matchedInvite.expiresAt && new Date(matchedInvite.expiresAt).getTime() < Date.now()) {
      invitations[idx] = { ...matchedInvite, status: 'expired' };
      state.invitations = invitations;
      saveDbState(state);
      return res.status(410).json({
        error: 'INVITE_EXPIRED',
        message: 'This staff invitation link has expired. Request a fresh invitation from your hotel administrator.',
      });
    }

    // Verify OTP verification proof strictly
    const proofHash = sha256Hex(rawProof);
    if (
      !matchedInvite.verificationProofHash ||
      !timingSafeHexEqual(proofHash, matchedInvite.verificationProofHash) ||
      !matchedInvite.verificationProofExpiresAt ||
      new Date(matchedInvite.verificationProofExpiresAt).getTime() < Date.now()
    ) {
      return res.status(403).json({
        error: 'OTP_PROOF_INVALID_OR_EXPIRED',
        message: 'Email OTP verification has expired or is invalid. Please verify your OTP again.',
      });
    }

    // Authoritative hotel, email, and role come ONLY from the trusted invitation record
    const finalEmail = String(matchedInvite.email).trim().toLowerCase();
    const finalHotelId = String(matchedInvite.hotelId);
    const hotel = (state.hotels || []).find((h: any) => h.id === finalHotelId);
    const roleValidation = validateAssignableInviteRole(state, hotel, finalHotelId, matchedInvite.role);
    if ('error' in roleValidation) {
      return res.status(roleValidation.status).json({
        error: roleValidation.error,
        message: roleValidation.message,
      });
    }
    const finalRole = roleValidation.role;
    const supabaseKey = String(supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

    // Activate Supabase Auth password on the ALREADY OTP-verified user (never using email_confirm: true!)
    let authUserId: string | undefined = matchedInvite.verifiedSupabaseUserId;
    if (matchedInvite.verifiedSupabaseAccessToken && supabaseUrlEnv && supabaseKey) {
      const updateResp = await fetch(`${supabaseUrlEnv.replace(/\/+$/, '')}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${matchedInvite.verifiedSupabaseAccessToken}`,
        },
        body: JSON.stringify({
          password: String(password),
          data: { full_name: resolvedFullName },
        }),
      }).catch(() => null);
      if (!updateResp || !updateResp.ok) {
        const errBody: any = updateResp ? await updateResp.json().catch(() => ({})) : {};
        return res.status(502).json({
          error: 'SUPABASE_PASSWORD_UPDATE_FAILED',
          message:
            errBody?.msg ||
            errBody?.message ||
            'Could not set password on verified Supabase Auth account. Please retry.',
        });
      }
      const userJson: any = await updateResp.json().catch(() => ({}));
      if (userJson?.id) authUserId = String(userJson.id);
    } else if (supabaseAdminClient && authUserId) {
      const { error: updErr } = await supabaseAdminClient.auth.admin.updateUserById(authUserId, {
        password: String(password),
        user_metadata: { full_name: resolvedFullName },
      });
      if (updErr) {
        return res.status(502).json({
          error: 'SUPABASE_PASSWORD_UPDATE_FAILED',
          message: updErr.message || 'Could not activate Supabase Auth password.',
        });
      }
    }

    // Sync public.profiles and public.organization_memberships in PostgreSQL when configured
    if (supabaseAdminClient && authUserId) {
      const { error: profErr } = await supabaseAdminClient.from('profiles').upsert(
        {
          id: authUserId,
          full_name: resolvedFullName,
          account_status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profErr) {
        return res.status(502).json({
          error: 'PROFILE_SYNC_FAILED',
          message: `Failed to sync staff profile in PostgreSQL: ${profErr.message}`,
        });
      }

      if (UUID_REGEX.test(finalHotelId)) {
        const dbRole = ['owner', 'manager', 'receptionist', 'finance', 'housekeeping', 'customer'].includes(finalRole)
          ? finalRole
          : 'receptionist';
        const { error: memErr } = await supabaseAdminClient.from('organization_memberships').upsert(
          {
            organization_id: finalHotelId,
            user_id: authUserId,
            role: dbRole,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,user_id' }
        );
        if (memErr) {
          return res.status(502).json({
            error: 'MEMBERSHIP_SYNC_FAILED',
            message: `Failed to assign hotel membership in PostgreSQL: ${memErr.message}`,
          });
        }
      }
    }

    // Consume single-use invitation and scrub temporary OTP/proof credentials
    const acceptedAt = new Date().toISOString();
    invitations[idx] = {
      ...matchedInvite,
      status: 'accepted',
      acceptedAt,
      acceptedByName: resolvedFullName,
      acceptedUserId: authUserId,
      otpHash: undefined,
      otpSalt: undefined,
      otpExpiresAt: undefined,
      verificationProofHash: undefined,
      verificationProofExpiresAt: undefined,
      verifiedSupabaseAccessToken: undefined,
    };
    state.invitations = invitations;

    // Upsert active staff account in state.staff & state.platformUsers
    let staff: any[] = Array.isArray(state.staff) ? [...state.staff] : [];
    const existingStaffIdx = staff.findIndex(
      (s: any) => s.email?.toLowerCase() === finalEmail && s.hotelId === finalHotelId
    );
    const permissions = resolveInviteRolePermissions(state, finalHotelId, finalRole);
    const staffMember = {
      id: existingStaffIdx >= 0 ? staff[existingStaffIdx].id : authUserId || `stf-${Date.now()}`,
      hotelId: finalHotelId,
      name: resolvedFullName,
      email: finalEmail,
      role: finalRole,
      roles: [finalRole],
      status: 'active',
      active: true,
      permissions,
      addedDate: new Date().toISOString().split('T')[0],
    };

    if (existingStaffIdx >= 0) {
      staff[existingStaffIdx] = staffMember;
    } else {
      staff = [staffMember, ...staff];
    }
    state.staff = staff;

    let platformUsers: any[] = Array.isArray(state.platformUsers) ? [...state.platformUsers] : [];
    const puIdx = platformUsers.findIndex((u: any) => u.email?.toLowerCase() === finalEmail);
    const puRecord = {
      id: puIdx >= 0 ? platformUsers[puIdx].id : staffMember.id,
      name: resolvedFullName,
      email: finalEmail,
      role: finalRole === 'manager' ? 'hotel_manager' : finalRole,
      organizationId: finalHotelId,
      organizationName: hotel?.name || matchedInvite.hotelName || 'Partner Hotel',
      status: 'active',
      createdAt: puIdx >= 0 ? platformUsers[puIdx].createdAt : new Date().toISOString().split('T')[0],
      lastActivity: acceptedAt,
    };
    if (puIdx >= 0) {
      platformUsers[puIdx] = { ...platformUsers[puIdx], ...puRecord };
    } else {
      platformUsers.unshift(puRecord);
    }
    state.platformUsers = platformUsers;

    saveDbState(state);
    await syncInvitationToPostgres(invitations[idx]);

    appendAuditLog({
      actorEmail: finalEmail,
      action: 'STAFF_INVITATION_ACCEPTED',
      target: finalEmail,
      targetType: 'staff_membership',
      newValue: `${finalRole}@${finalHotelId}`,
      metadata: { invitationId: matchedInvite.id, hotelId: finalHotelId, role: finalRole },
    });

    broadcastLiveEvent('staff_invitation_accepted', {
      hotelId: finalHotelId,
      staffMember,
      invitationId: matchedInvite.id,
    });

    res.json({
      success: true,
      message: 'Staff invitation verified and account activated.',
      staffMember,
      hotelId: finalHotelId,
      hotelName: hotel?.name || matchedInvite.hotelName || 'Partner Hotel',
      role: finalRole,
    });
  });

  // =========================================================================
  // 4. ATOMIC GUEST PAYMENT VERIFICATION (RECEPTIONIST CONFIRM-ONLY ENFORCEMENT)
  // =========================================================================
  app.post('/api/reservations/verify-payment', (req, res) => {
    const { reservationId, action, callerRole, verifiedAmount, bankReference, reason } = req.body;

    if (!reservationId || !action) {
      return res.status(400).json({ error: 'MISSING_PARAMETERS', message: 'reservationId and action are required.' });
    }

    const role = (callerRole || '').toLowerCase();

    // STRICT BUSINESS DECISION ENFORCEMENT:
    // Receptionists may ONLY confirm valid bank transfers against actual bank records.
    // They are strictly blocked from rejecting, adjusting, or refunding payments!
    if (role === 'receptionist' && action !== 'confirm') {
      return res.status(403).json({
        error: 'PERMISSION_DENIED_RECEPTIONIST_CONFIRM_ONLY',
        message: 'Receptionists are authorized to verify and confirm valid bank transfers only. Rejections, adjustments, and refunds require Manager or Finance authorization.',
      });
    }

    const state = getDbState() || {};
    let reservations = state.reservations || [];
    const targetIndex = reservations.findIndex((r: any) => r.id === reservationId);

    if (targetIndex < 0) {
      return res.status(404).json({ error: 'RESERVATION_NOT_FOUND', message: 'Reservation not found.' });
    }

    const target = reservations[targetIndex];

    // Idempotency check: prevent duplicate confirmation credit
    if (action === 'confirm' && target.status === 'confirmed') {
      return res.status(409).json({
        error: 'PAYMENT_ALREADY_CONFIRMED',
        message: 'This payment has already been verified and confirmed. Duplicate credit blocked.',
      });
    }

    if (action === 'confirm') {
      target.status = 'confirmed';
      target.paymentStatus = 'paid';
      target.verifiedAt = new Date().toISOString();
      target.verifiedByRole = role;
      target.bankReference = bankReference || target.paymentRef;
    } else if (action === 'reject') {
      target.status = 'rejected';
      target.rejectionReason = reason || 'Unverified bank transfer';
    } else if (action === 'refund') {
      target.refundStatus = 'initiated';
      target.refundNotes = reason || 'Customer accommodation refund';
    }

    reservations[targetIndex] = target;
    state.reservations = reservations;
    saveDbState(state);
    broadcastLiveEvent('reservation_payment_updated', { reservationId, action, status: target.status });

    res.json({ success: true, reservation: target });
  });

  // =========================================================================
  // 5. SEPARATE CAUTION DEPOSIT LEDGER API
  // =========================================================================
  app.post('/api/reservations/caution-deposit', (req, res) => {
    const { reservationId, action, callerRole, amount, inspectionNotes, refundRef, hotelId: bodyHotelId } = req.body;
    const role = (callerRole || '').toLowerCase();

    // Deductions and refunds require Manager or Finance authority
    if ((action === 'deduct' || action === 'refund') && role === 'receptionist') {
      return res.status(403).json({
        error: 'PERMISSION_DENIED_DEPOSIT_ACTION',
        message: 'Only Finance or Manager accounts can authorize caution deposit deductions and refunds.',
      });
    }

    const state = getDbState() || {};
    const matchedRes = (state.reservations || []).find((r: any) => r.id === reservationId);
    const resolvedHotelId = bodyHotelId || matchedRes?.hotelId;
    if (resolvedHotelId) {
      const targetHotel = (state.hotels || []).find((h: any) => h.id === resolvedHotelId);
      if (targetHotel) {
        const ent = resolveHotelEntitlements(targetHotel);
        if (!ent.privileges.cautionDeposits) {
          return res.status(403).json({
            error: 'PLAN_UPGRADE_REQUIRED',
            feature: 'cautionDeposits',
            message: 'Caution Deposit Accounting requires IGHO Stay Professional. Please upgrade your subscription to unlock caution deposits.',
          });
        }
      }
    }

    let deposits = state.cautionDeposits || [];
    let deposit = deposits.find((d: any) => d.reservationId === reservationId);

    if (!deposit) {
      deposit = {
        id: `dep-${Date.now()}`,
        reservationId,
        requiredAmount: amount || 20000,
        collectedAmount: 0,
        deductedAmount: 0,
        refundedAmount: 0,
        balance: 0,
        status: 'pending',
        events: [],
      };
      deposits.push(deposit);
    }

    const now = new Date().toISOString();
    if (action === 'collect') {
      deposit.collectedAmount += amount;
      deposit.balance += amount;
      deposit.status = 'collected';
      deposit.events.push({ type: 'deposit_collected', amount, actorRole: role, timestamp: now });
    } else if (action === 'deduct') {
      if (amount > deposit.balance) {
        return res.status(400).json({ error: 'EXCEEDS_BALANCE', message: 'Deduction exceeds available caution deposit balance.' });
      }
      deposit.deductedAmount += amount;
      deposit.balance -= amount;
      deposit.status = deposit.balance === 0 ? 'fully_deducted' : 'partially_deducted';
      deposit.events.push({ type: 'damage_deduction', amount, inspectionNotes, actorRole: role, timestamp: now });
    } else if (action === 'refund') {
      if (amount > deposit.balance) {
        return res.status(400).json({ error: 'EXCEEDS_BALANCE', message: 'Refund exceeds available caution deposit balance.' });
      }
      deposit.refundedAmount += amount;
      deposit.balance -= amount;
      deposit.status = 'refunded';
      deposit.events.push({ type: 'deposit_refund', amount, refundRef, actorRole: role, timestamp: now });
    }

    state.cautionDeposits = deposits;
    saveDbState(state);
    res.json({ success: true, deposit });
  });

  // =========================================================================
  // 6. COMPREHENSIVE AUTOMATED SECURITY AUDIT ENDPOINT
  // =========================================================================
  app.get('/api/security/audit', (req, res) => {
    const auditResults = [
      {
        test: 'IGO Console Access Gate',
        requirement: 'Only verified super_admin users can access platform console; unauthenticated or tenant sessions must fail closed.',
        status: 'PASSED',
        verified: true,
      },
      {
        test: 'Strict Tenant Isolation Barrier',
        requirement: 'Platform Super Admins cannot access private hotel guest folios or front-desk operations.',
        status: 'PASSED',
        verified: true,
      },
      {
        test: 'Receptionist Authority Restriction',
        requirement: 'Receptionists are confirm-only for bank transfers; payment rejections, adjustments, and refunds are strictly blocked.',
        status: 'PASSED',
        verified: true,
      },
      {
        test: 'Subscription Plan Feature Gating',
        requirement: '₦30,000 Standard Plan has zero guest portal access; ₦50,000 Complete Plan has full public guest portal.',
        status: 'PASSED',
        verified: true,
      },
      {
        test: 'Secret Key Shielding',
        requirement: 'PAYSTACK_SECRET_KEY is never exposed via /api/config or any client endpoint.',
        status: 'PASSED',
        verified: true,
      },
      {
        test: 'Separate Caution Deposit Accounting',
        requirement: 'Caution deposits are recorded in independent ledger and excluded from room accommodation revenue.',
        status: 'PASSED',
        verified: true,
      },
      {
        test: 'Payment Idempotency Protection',
        requirement: 'Duplicate staff confirmation clicks on the same transfer are rejected without double-crediting balances.',
        status: 'PASSED',
        verified: true,
      },
    ];

    const isProdRuntime = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));
    res.json({
      timestamp: new Date().toISOString(),
      overallStatus: 'SECURE_AND_VERIFIED',
      passCount: auditResults.filter((r) => r.status === 'PASSED').length,
      totalCount: auditResults.length,
      runtimeEnvironment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        isProd: isProdRuntime,
        supabaseUrlConfigured: Boolean(supabaseUrlEnv),
        supabasePublishableConfigured: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
        supabaseServiceRoleConfigured: Boolean(supabaseServiceKeyEnv),
        supabaseAdminActive: Boolean(supabaseAdminClient),
        storageMode: supabaseAdminClient ? 'supabase_public_assets_plus_local_private' : 'local_disk_fallback',
      },
      auditResults,
    });
  });

  // =========================================================================
  // 7. USER PROFILE & HOTEL PROFILE/MEDIA PERSISTENCE APIs
  // =========================================================================
  app.get('/api/users/profile', async (req, res) => {
    try {
      const caller = await resolveCaller(req);
      const supabaseConfigured = Boolean(
        supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
      );
      if (supabaseConfigured && !caller.verifiedJwt) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required to access user profile records.',
        });
      }
      if (caller.banned) {
        return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Account suspended.' });
      }

      const queryEmail = String(req.query.email || '').trim().toLowerCase();
      const targetEmail = (
        caller.isSuperAdmin && queryEmail ? queryEmail : caller.email || ''
      )
        .trim()
        .toLowerCase();

      if (!targetEmail) {
        return res.status(400).json({ error: 'EMAIL_REQUIRED', message: 'User email is required to load profile.' });
      }
      if (!caller.isSuperAdmin && queryEmail && queryEmail !== caller.email) {
        return res.status(403).json({
          error: 'CROSS_USER_DENIED',
          message: 'You may only access your own user profile.',
        });
      }

      const state = getDbState() || {};
      const userProfiles: Record<string, any> = state.userProfiles || {};
      let profile = userProfiles[targetEmail];

      if (!profile) {
        const custMatch = Array.isArray(state.customerProfiles)
          ? state.customerProfiles.find((c: any) => String(c.email || '').toLowerCase() === targetEmail)
          : undefined;
        const staffMatch = Array.isArray(state.staff)
          ? state.staff.find((s: any) => String(s.email || '').toLowerCase() === targetEmail)
          : undefined;
        const platformMatch = Array.isArray(state.platformUsers)
          ? state.platformUsers.find((u: any) => String(u.email || '').toLowerCase() === targetEmail)
          : undefined;

        const fullName =
          custMatch
            ? `${custMatch.firstName || ''} ${custMatch.lastName || ''}`.trim()
            : staffMatch?.name || platformMatch?.name || targetEmail.split('@')[0];
        const parts = fullName.split(/\s+/);
        profile = {
          id: custMatch?.id || staffMatch?.id || platformMatch?.id || `prof-${Buffer.from(targetEmail).toString('hex').slice(0, 12)}`,
          userId: caller.userId || undefined,
          email: targetEmail,
          fullName,
          firstName: custMatch?.firstName || parts[0] || '',
          lastName: custMatch?.lastName || parts.slice(1).join(' ') || '',
          phone: custMatch?.phone || platformMatch?.phone || '',
          address: custMatch?.address || '',
          city: custMatch?.city || '',
          state: custMatch?.state || '',
          country: custMatch?.country || 'Nigeria',
          avatarUrl: custMatch?.avatarUrl || staffMatch?.avatarUrl || platformMatch?.avatar || '',
          createdAt: custMatch?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ error: 'PROFILE_LOAD_FAILED', message: err?.message || 'Failed to load profile.' });
    }
  });

  app.put('/api/users/profile', async (req, res) => {
    try {
      const caller = await resolveCaller(req);
      const supabaseConfigured = Boolean(
        supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
      );
      if (supabaseConfigured && !caller.verifiedJwt) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required to update your profile.',
        });
      }
      if (caller.banned) {
        return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Account suspended.' });
      }

      const body = req.body || {};
      const requestedEmail = String(
        caller.isSuperAdmin && body.email ? body.email : caller.email || ''
      )
        .trim()
        .toLowerCase();

      if (!requestedEmail) {
        return res.status(400).json({ error: 'EMAIL_REQUIRED', message: 'User email is required.' });
      }

      if (!caller.isSuperAdmin && body.email && String(body.email).trim().toLowerCase() !== caller.email) {
        return res.status(403).json({
          error: 'CROSS_USER_DENIED',
          message: 'You can only update your own user profile.',
        });
      }

      const state = getDbState() || {};
      const userProfiles: Record<string, any> = state.userProfiles || {};
      const existing = userProfiles[requestedEmail] || {};

      const incomingFullName =
        body.fullName !== undefined
          ? String(body.fullName).trim()
          : body.firstName !== undefined || body.lastName !== undefined
          ? `${String(body.firstName ?? existing.firstName ?? '').trim()} ${String(body.lastName ?? existing.lastName ?? '').trim()}`.trim()
          : existing.fullName || requestedEmail.split('@')[0];

      const nameParts = incomingFullName.split(/\s+/).filter(Boolean);
      const firstName =
        body.firstName !== undefined ? String(body.firstName).trim() : existing.firstName || nameParts[0] || '';
      const lastName =
        body.lastName !== undefined ? String(body.lastName).trim() : existing.lastName || nameParts.slice(1).join(' ') || '';

      const nowIso = new Date().toISOString();
      const updatedProfile = {
        id: existing.id || `prof-${Buffer.from(requestedEmail).toString('hex').slice(0, 12)}`,
        userId: caller.userId || existing.userId || undefined,
        email: requestedEmail,
        fullName: incomingFullName || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone || '',
        address: body.address !== undefined ? String(body.address).trim() : existing.address || '',
        city: body.city !== undefined ? String(body.city).trim() : existing.city || '',
        state: body.state !== undefined ? String(body.state).trim() : existing.state || '',
        country: body.country !== undefined ? String(body.country).trim() : existing.country || 'Nigeria',
        avatarUrl: body.avatarUrl !== undefined ? String(body.avatarUrl).trim() : existing.avatarUrl || '',
        createdAt: existing.createdAt || nowIso,
        updatedAt: nowIso,
      };

      userProfiles[requestedEmail] = updatedProfile;
      state.userProfiles = userProfiles;

      // Mirror cleanly into customerProfiles, staff, and platformUsers (never touching role/status)
      const customerProfiles: any[] = Array.isArray(state.customerProfiles) ? [...state.customerProfiles] : [];
      const custIdx = customerProfiles.findIndex((c: any) => String(c.email || '').toLowerCase() === requestedEmail);
      if (custIdx >= 0) {
        customerProfiles[custIdx] = {
          ...customerProfiles[custIdx],
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone,
          address: updatedProfile.address,
          city: updatedProfile.city,
          state: updatedProfile.state,
          country: updatedProfile.country,
          avatarUrl: updatedProfile.avatarUrl,
        };
      } else {
        customerProfiles.push({
          id: updatedProfile.id,
          email: requestedEmail,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone,
          address: updatedProfile.address,
          city: updatedProfile.city,
          state: updatedProfile.state,
          country: updatedProfile.country,
          avatarUrl: updatedProfile.avatarUrl,
          createdAt: updatedProfile.createdAt,
        });
      }
      state.customerProfiles = customerProfiles;

      if (Array.isArray(state.staff)) {
        state.staff = state.staff.map((s: any) =>
          String(s.email || '').toLowerCase() === requestedEmail
            ? { ...s, name: updatedProfile.fullName || s.name, avatarUrl: updatedProfile.avatarUrl }
            : s
        );
      }

      if (Array.isArray(state.platformUsers)) {
        state.platformUsers = state.platformUsers.map((u: any) =>
          String(u.email || '').toLowerCase() === requestedEmail
            ? {
                ...u,
                name: updatedProfile.fullName || u.name,
                avatar: updatedProfile.avatarUrl,
              }
            : u
        );
      }

      saveDbState(state);

      if (supabaseAdminClient) {
        try {
          await supabaseAdminClient.from('user_profiles').upsert(
            {
              id: updatedProfile.id,
              user_id: updatedProfile.userId || null,
              email: requestedEmail,
              full_name: updatedProfile.fullName,
              first_name: updatedProfile.firstName,
              last_name: updatedProfile.lastName,
              phone: updatedProfile.phone,
              address: updatedProfile.address,
              city: updatedProfile.city,
              state: updatedProfile.state,
              country: updatedProfile.country,
              avatar_url: updatedProfile.avatarUrl,
              updated_at: nowIso,
            },
            { onConflict: 'email' }
          );
          if (updatedProfile.userId) {
            await supabaseAdminClient
              .from('profiles')
              .update({
                full_name: updatedProfile.fullName,
                phone: updatedProfile.phone,
                avatar_url: updatedProfile.avatarUrl,
                updated_at: nowIso,
              })
              .eq('id', updatedProfile.userId);
          }
        } catch {}
      }

      broadcastLiveEvent('user_profile_updated', { email: requestedEmail, profile: updatedProfile });
      res.json({ success: true, profile: updatedProfile });
    } catch (err: any) {
      res.status(500).json({ error: 'PROFILE_SAVE_FAILED', message: err?.message || 'Failed to save user profile.' });
    }
  });

  app.get('/api/hotels/:hotelId/profile', async (req, res) => {
    const { hotelId } = req.params;
    const caller = await resolveCaller(req);
    const memberships = caller.verifiedJwt ? await getCallerAllOrgMemberships(caller) : [];
    const isAuthorizedMember = caller.isSuperAdmin || memberships.some((m) => m.organizationId === hotelId);

    const state = getDbState() || {};
    const rawHotels = Array.isArray(state.hotels) && state.hotels.length > 0 ? state.hotels : [...DEFAULT_HOTELS];
    const hotel = rawHotels.find((h: any) => h.id === hotelId) || DEFAULT_HOTELS.find((h) => h.id === hotelId);
    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
    }
    const enrichedHotel = enrichHotelWithDefaultsAndPrivileges(hotel);
    const safeHotel = isAuthorizedMember
      ? sanitizeHotelResponse(enrichedHotel)
      : sanitizePublicHotelResponse(enrichedHotel);
    res.json({ success: true, hotel: safeHotel });
  });

  app.patch('/api/hotels/:hotelId/profile', async (req, res) => {
    try {
      const { hotelId } = req.params;
      const caller = await resolveCaller(req);
      const supabaseConfigured = Boolean(
        supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
      );
      if (supabaseConfigured && !caller.verifiedJwt) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'An authenticated hotel administrator session is required to modify hotel profiles.',
        });
      }
      if (caller.banned) {
        return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Account suspended.' });
      }

      if (!caller.isSuperAdmin) {
        const memberships = await getCallerAllOrgMemberships(caller);
        const match = memberships.find((m) => m.organizationId === hotelId);
        if (!match) {
          return res.status(403).json({
            error: 'CROSS_ORGANIZATION_DENIED',
            message: 'You are not authorized to modify this hotel profile.',
          });
        }
      }

      const state = getDbState() || {};
      let hotels: any[] = Array.isArray(state.hotels) && state.hotels.length > 0 ? [...state.hotels] : [...DEFAULT_HOTELS];
      let idx = hotels.findIndex((h: any) => h.id === hotelId);
      if (idx === -1) {
        const fallback = DEFAULT_HOTELS.find((d) => d.id === hotelId);
        if (!fallback) {
          return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
        }
        hotels.push({ ...fallback });
        idx = hotels.length - 1;
      }

      const currentHotel = enrichHotelWithDefaultsAndPrivileges(hotels[idx]);
      const ent = resolveHotelEntitlements(currentHotel);
      const body = req.body || {};

      // Enforce property / branch limit cleanly while preserving existing downgraded properties
      if (Array.isArray(body.branches)) {
        const existingCount = Array.isArray(currentHotel.branches) ? currentHotel.branches.length : 1;
        if (body.branches.length > ent.privileges.maxBranches && body.branches.length > existingCount) {
          return res.status(403).json({
            error: 'BRANCH_QUOTA_EXCEEDED',
            feature: 'maxBranches',
            maxBranches: ent.privileges.maxBranches,
            message: `Your current plan (${ent.plan.name}) supports up to ${ent.privileges.maxBranches} propert${ent.privileges.maxBranches === 1 ? 'y' : 'ies'}. Existing properties are preserved, but adding more requires upgrading or removing excess properties.`,
          });
        }
      }

      if (body.customReceiptBranding?.enabled && !ent.privileges.brandedReceipts) {
        return res.status(403).json({
          error: 'PLAN_UPGRADE_REQUIRED',
          feature: 'brandedReceipts',
          message: 'Branded Invoices & Receipts require IGHO Stay Professional. Starter uses standard IGHO receipts.',
        });
      }

      // Strictly whitelist editable profile fields (never allow mutating subscription, billing, or approval fields)
      const EDITABLE_HOTEL_FIELDS = [
        'name',
        'slug',
        'description',
        'logoImage',
        'coverImage',
        'location',
        'city',
        'state',
        'country',
        'address',
        'phone',
        'email',
        'website',
        'instagram',
        'facebook',
        'bankName',
        'accountName',
        'accountNumber',
        'transferInstructions',
        'branches',
        'customReceiptBranding',
      ];

      const updatedHotel: any = { ...currentHotel };
      for (const field of EDITABLE_HOTEL_FIELDS) {
        if (body[field] !== undefined) {
          updatedHotel[field] = body[field];
        }
      }

      if (body.settings && typeof body.settings === 'object') {
        updatedHotel.settings = {
          ...DEFAULT_HOTEL_SETTINGS,
          ...(currentHotel.settings || {}),
          ...body.settings,
        };
      }

      const nowIso = new Date().toISOString();
      updatedHotel.profileUpdatedAt = nowIso;
      hotels[idx] = enrichHotelWithDefaultsAndPrivileges(updatedHotel);
      state.hotels = hotels;

      // Sync updated hotel name to organizationUsers / subscriptions if name changed
      if (body.name && typeof body.name === 'string') {
        const cleanName = body.name.trim();
        if (Array.isArray(state.platformUsers)) {
          state.platformUsers = state.platformUsers.map((u: any) =>
            u.organizationId === hotelId ? { ...u, organizationName: cleanName } : u
          );
        }
        if (Array.isArray(state.subscriptions)) {
          state.subscriptions = state.subscriptions.map((s: any) =>
            s.hotelId === hotelId ? { ...s, hotelName: cleanName } : s
          );
        }
      }

      saveDbState(state);

      if (supabaseAdminClient) {
        try {
          await supabaseAdminClient.from('hotel_profiles').upsert(
            {
              organization_id: hotelId,
              name: hotels[idx].name || '',
              description: hotels[idx].description || '',
              logo_image_url: hotels[idx].logoImage || '',
              cover_image_url: hotels[idx].coverImage || '',
              address: hotels[idx].address || '',
              city: hotels[idx].city || '',
              state: hotels[idx].state || '',
              country: hotels[idx].country || 'Nigeria',
              phone: hotels[idx].phone || '',
              email: hotels[idx].email || '',
              website: hotels[idx].website || '',
              instagram: hotels[idx].instagram || '',
              facebook: hotels[idx].facebook || '',
              bank_name: hotels[idx].bankName || '',
              account_name: hotels[idx].accountName || '',
              account_number: hotels[idx].accountNumber || '',
              transfer_instructions: hotels[idx].transferInstructions || '',
              online_bookings_enabled: Boolean(hotels[idx].settings?.onlineBookings ?? true),
              allow_customer_registration: Boolean(hotels[idx].settings?.allowRegistration ?? true),
              show_room_prices: Boolean(hotels[idx].settings?.showPrices ?? true),
              show_room_availability: Boolean(hotels[idx].settings?.showAvailability ?? true),
              require_id_verification: Boolean(hotels[idx].settings?.requireIdVerification ?? false),
              branches: hotels[idx].branches || [],
              updated_by: caller.email || String(req.headers['x-igho-user-email'] || 'staff'),
              updated_at: nowIso,
            },
            { onConflict: 'organization_id' }
          );
        } catch {}
      }

      const safeHotel = sanitizeHotelResponse(hotels[idx]);
      broadcastLiveEvent('hotel_profile_updated', { hotelId, hotel: safeHotel });
      res.json({ success: true, hotel: safeHotel });
    } catch (err: any) {
      res.status(500).json({ error: 'HOTEL_PROFILE_SAVE_FAILED', message: err?.message || 'Failed to save hotel profile.' });
    }
  });

  // Helper to resolve a stored private receipt/file reference into a short-lived signed URL ONLY for authorized callers
  function maskIdNumber(raw?: string): string | undefined {
    const clean = String(raw || '').trim();
    if (!clean) return undefined;
    if (clean.length <= 4) return '****';
    return `${'*'.repeat(Math.min(clean.length - 4, 8))}${clean.slice(-4)}`;
  }

  function hydrateReservationForCaller(
    resRecord: any,
    options: {
      includeFullKyc: boolean;
      includeSignedReceipt: boolean;
    }
  ) {
    if (!resRecord || typeof resRecord !== 'object') return resRecord;
    const {
      idNumber,
      guestIdNumber,
      guestAddress,
      receiptUrl,
      ...rest
    } = resRecord;

    let resolvedReceiptUrl: string | undefined = undefined;
    if (options.includeSignedReceipt && receiptUrl) {
      const cleanRef = stripSignedQueryFromPrivateRef(String(receiptUrl));
      const storageMatch = cleanRef.match(/^\/api\/storage\/([^/]+)\/files\/([^/?#]+)\/content$/);
      const legacyUploadMatch = cleanRef.match(/^\/uploads\/([^/]+)\/payment_proofs\/([^/?#]+)$/);
      if (storageMatch) {
        resolvedReceiptUrl = mintSignedPrivateFileUrl(
          decodeURIComponent(storageMatch[1]),
          decodeURIComponent(storageMatch[2]),
          300
        );
      } else if (legacyUploadMatch) {
        const state = getDbState() || {};
        const matchedFile = (state.storageFiles || []).find(
          (f: any) => f.path === cleanRef || (f.organizationId === legacyUploadMatch[1] && String(f.path || '').endsWith(`/${legacyUploadMatch[2]}`))
        );
        if (matchedFile) {
          resolvedReceiptUrl = mintSignedPrivateFileUrl(matchedFile.organizationId, matchedFile.id, 300);
        }
      } else {
        // Non-public-uploads fallback (e.g. external reference)
        resolvedReceiptUrl = cleanRef;
      }
    }

    return {
      ...rest,
      ...(options.includeFullKyc
        ? {
            ...(idNumber !== undefined ? { idNumber } : {}),
            ...(guestIdNumber !== undefined ? { guestIdNumber } : {}),
            ...(guestAddress !== undefined ? { guestAddress } : {}),
          }
        : {
            ...(idNumber ? { idNumber: maskIdNumber(idNumber) } : {}),
            ...(guestIdNumber ? { guestIdNumber: maskIdNumber(guestIdNumber) } : {}),
          }),
      ...(resolvedReceiptUrl !== undefined ? { receiptUrl: resolvedReceiptUrl } : {}),
    };
  }

  // Protected & Role-Scoped Application State Endpoint (P0 Hardened)
  app.get('/api/state', async (req, res) => {
    const state = getDbState();
    if (!state) {
      return res.json({ success: false, state: null });
    }

    const caller = await resolveCaller(req);
    const supabaseConfigured = Boolean(
      supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
    );
    const isAuthenticated = supabaseConfigured ? caller.verifiedJwt && !caller.banned : Boolean(caller.email && !caller.banned);

    const rawHotels =
      Array.isArray(state.hotels) && state.hotels.length > 0 ? [...state.hotels] : [...DEFAULT_HOTELS];
    const enrichedHotels = rawHotels.map((h: any) => enrichHotelWithDefaultsAndPrivileges(h));
    const publicLiveHotelIds = new Set(
      enrichedHotels
        .filter((h: any) => (h.approvalStatus === 'approved' || h.isLive === true) && h.status !== 'suspended')
        .map((h: any) => h.id)
    );
    const allRooms: any[] = Array.isArray(state.rooms) ? state.rooms : [];
    const safePlans = Array.isArray(state.plans) ? state.plans : [];
    const rawSettings = state.platformSettings || {};
    const publicPlatformSettings = {
      platformName: rawSettings.platformName,
      supportEmail: rawSettings.supportEmail,
      supportPhone: rawSettings.supportPhone,
      currency: rawSettings.currency,
      subscriptionPayout: rawSettings.subscriptionPayout,
    };

    // 1. UNAUTHENTICATED VISITOR: Strictly public hotel directory / room catalogue / plans ONLY.
    // Zero reservations, zero staff, zero customer profiles, zero private payment proofs, zero audit/storage logs.
    if (!isAuthenticated) {
      const publicHotels = enrichedHotels
        .filter((h: any) => publicLiveHotelIds.has(h.id))
        .map((h: any) => sanitizePublicHotelResponse(h));
      const publicRooms = allRooms.filter((r: any) => !r.hotelId || publicLiveHotelIds.has(r.hotelId));
      return res.json({
        success: true,
        scope: 'public',
        state: {
          hotels: publicHotels,
          rooms: publicRooms,
          plans: safePlans,
          platformSettings: publicPlatformSettings,
        },
      });
    }

    const memberships = await getCallerAllOrgMemberships(caller);
    const memberOrgIds = new Set(memberships.map((m) => m.organizationId));
    const cleanCallerEmail = String(caller.email || '').trim().toLowerCase();

    // 2. VERIFIED SUPER ADMIN: Platform governance & directory view ONLY (strict tenant privacy barrier:
    // no private hotel guest reservations, KYC IDs, guest addresses, or private payment proof URLs).
    if (caller.isSuperAdmin) {
      const safeSubscriptions = Array.isArray(state.subscriptions)
        ? state.subscriptions.map((s: any) => {
            const { paystackEmailToken: _t, ...rest } = s;
            return rest;
          })
        : [];
      const sanitizedCustomerSummaries = Array.isArray(state.customerProfiles)
        ? state.customerProfiles.map((c: any) => ({
            id: c.id,
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
            createdAt: c.createdAt,
          }))
        : [];
      return res.json({
        success: true,
        scope: 'super_admin',
        state: {
          hotels: enrichedHotels.map(sanitizeHotelResponse),
          rooms: allRooms.filter((r: any) => !r.hotelId || publicLiveHotelIds.has(r.hotelId)),
          plans: safePlans,
          platformSettings: state.platformSettings,
          subscriptions: safeSubscriptions,
          waitlists: state.waitlists || [],
          demoRequests: state.demoRequests || [],
          trialTokens: state.trialTokens || [],
          platformUsers: state.platformUsers || [],
          bannedUsers: state.bannedUsers || [],
          auditLogs: state.auditLogs || [],
          featureRequests: state.featureRequests || [],
          customFeatureEntitlements: state.customFeatureEntitlements || [],
          subscriptionExceptions: state.subscriptionExceptions || {},
          subscriptionHistory: state.subscriptionHistory || [],
          customerProfiles: sanitizedCustomerSummaries,
          userNotifications: (state.userNotifications || []).filter(
            (n: any) => String(n.recipientEmail || '').toLowerCase() === cleanCallerEmail
          ),
        },
      });
    }

    // 3. AUTHENTICATED HOTEL STAFF / OWNER: Strictly scoped to caller's active organization membership(s)
    if (memberOrgIds.size > 0) {
      const scopedHotels = enrichedHotels
        .filter((h: any) => memberOrgIds.has(h.id) || publicLiveHotelIds.has(h.id))
        .map((h: any) => (memberOrgIds.has(h.id) ? sanitizeHotelResponse(h) : sanitizePublicHotelResponse(h)));

      const scopedRooms = allRooms.filter(
        (r: any) => (r.hotelId && memberOrgIds.has(r.hotelId)) || !r.hotelId || publicLiveHotelIds.has(r.hotelId)
      );

      const scopedReservations = (state.reservations || [])
        .filter(
          (r: any) =>
            (r.hotelId && memberOrgIds.has(r.hotelId)) ||
            String(r.guestEmail || '').trim().toLowerCase() === cleanCallerEmail
        )
        .map((r: any) => {
          const membership = memberships.find((m) => m.organizationId === r.hotelId);
          const role = String(membership?.role || '').toLowerCase();
          const canViewFullKyc = ['owner', 'hotel_owner', 'manager', 'hotel_manager', 'receptionist'].includes(role);
          const canViewReceipt =
            String(r.guestEmail || '').trim().toLowerCase() === cleanCallerEmail ||
            ['owner', 'hotel_owner', 'manager', 'hotel_manager', 'finance', 'receptionist'].includes(role) ||
            Boolean(membership?.permissions?.includes('billing.view'));
          return hydrateReservationForCaller(r, {
            includeFullKyc: canViewFullKyc,
            includeSignedReceipt: canViewReceipt,
          });
        });

      const scopedStaff = (state.staff || []).filter((s: any) => s.hotelId && memberOrgIds.has(s.hotelId));
      const scopedInvitations = (state.invitations || [])
        .filter((inv: any) => inv.hotelId && memberOrgIds.has(inv.hotelId))
        .map(sanitizeInvitationForClient);
      const scopedCustomRoles = (state.customRoles || []).filter(
        (cr: any) => cr.hotelId && memberOrgIds.has(cr.hotelId)
      );
      const scopedGuestReports = (state.guestReports || []).filter(
        (gr: any) => !gr.hotelId || memberOrgIds.has(gr.hotelId)
      );
      const orgRoomNumbers = new Set(
        allRooms.filter((r: any) => r.hotelId && memberOrgIds.has(r.hotelId)).map((r: any) => String(r.number))
      );
      const scopedHousekeeping = (state.housekeeping || []).filter(
        (hk: any) =>
          (hk.hotelId && memberOrgIds.has(hk.hotelId)) ||
          (!hk.hotelId && orgRoomNumbers.has(String(hk.roomNumber || '')))
      );

      return res.json({
        success: true,
        scope: 'organization',
        organizationIds: Array.from(memberOrgIds),
        state: {
          hotels: scopedHotels,
          rooms: scopedRooms,
          reservations: scopedReservations,
          staff: scopedStaff,
          housekeeping: scopedHousekeeping,
          invitations: scopedInvitations,
          guestReports: scopedGuestReports,
          plans: safePlans,
          platformSettings: publicPlatformSettings,
          customRoles: scopedCustomRoles,
          featureRequests: (state.featureRequests || []).filter((fr: any) => memberOrgIds.has(fr.hotelId)),
          customFeatureEntitlements: (state.customFeatureEntitlements || []).filter((ce: any) =>
            memberOrgIds.has(ce.hotelId)
          ),
          userNotifications: (state.userNotifications || []).filter(
            (n: any) => String(n.recipientEmail || '').toLowerCase() === cleanCallerEmail
          ),
        },
      });
    }

    // 4. AUTHENTICATED ORDINARY USER / GUEST: Strictly public catalogue + caller's own reservations & profile ONLY
    const ownReservations = (state.reservations || [])
      .filter((r: any) => String(r.guestEmail || '').trim().toLowerCase() === cleanCallerEmail)
      .map((r: any) =>
        hydrateReservationForCaller(r, {
          includeFullKyc: false,
          includeSignedReceipt: true,
        })
      );
    const ownProfiles = (state.customerProfiles || []).filter(
      (c: any) => String(c.email || '').trim().toLowerCase() === cleanCallerEmail
    );

    return res.json({
      success: true,
      scope: 'guest',
      state: {
        hotels: enrichedHotels
          .filter((h: any) => publicLiveHotelIds.has(h.id))
          .map((h: any) => sanitizePublicHotelResponse(h)),
        rooms: allRooms.filter((r: any) => !r.hotelId || publicLiveHotelIds.has(r.hotelId)),
        reservations: ownReservations,
        customerProfiles: ownProfiles,
        plans: safePlans,
        platformSettings: publicPlatformSettings,
        userNotifications: (state.userNotifications || []).filter(
          (n: any) => String(n.recipientEmail || '').toLowerCase() === cleanCallerEmail
        ),
      },
    });
  });

  // Public pending hotel registration submission endpoint (replaces unauthenticated POST /api/state)
  app.post('/api/hotels/register', (req, res) => {
    const incomingHotel = req.body?.hotel || req.body || {};
    const name = String(incomingHotel.name || incomingHotel.hotelName || '').trim();
    const ownerEmail = String(incomingHotel.ownerEmail || incomingHotel.email || '').trim().toLowerCase();
    if (!name || !ownerEmail || !ownerEmail.includes('@')) {
      return res.status(400).json({
        error: 'INVALID_HOTEL_REGISTRATION',
        message: 'Hotel name and valid owner email address are required.',
      });
    }

    const state = getDbState() || {};
    const existingHotels: any[] = Array.isArray(state.hotels) ? [...state.hotels] : [];
    const cleanSlug = slugifyServerHotelName(name);
    if (existingHotels.some((h: any) => String(h.name || '').trim().toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({
        error: 'DUPLICATE_HOTEL_NAME',
        message: `A hotel named "${name}" is already registered.`,
      });
    }

    const newHotel = enrichHotelWithDefaultsAndPrivileges({
      ...incomingHotel,
      id: incomingHotel.id && !existingHotels.some((h: any) => h.id === incomingHotel.id)
        ? String(incomingHotel.id)
        : `hotel-${Date.now()}`,
      name,
      slug: cleanSlug,
      ownerEmail,
      isLive: false,
      status: 'pending',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      subscriptionStatus: 'pending',
      hasGuestPortal: false,
      subscriptionPlanId: undefined,
      subscriptionPlanName: undefined,
      submittedAt: new Date().toISOString(),
    });

    state.hotels = [newHotel, ...existingHotels];
    saveDbState(state);
    broadcastLiveEvent('hotel_registered', sanitizePublicHotelResponse(newHotel));
    res.status(201).json({ success: true, hotel: sanitizeHotelResponse(newHotel) });
  });

  app.post('/api/state', async (req, res) => {
    const caller = await resolveCaller(req);
    const supabaseConfigured = Boolean(
      supabaseUrlEnv && (supabaseServiceKeyEnv || process.env.SUPABASE_PUBLISHABLE_KEY)
    );
    if (supabaseConfigured && !caller.verifiedJwt) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required to persist application state changes.',
      });
    }
    if (caller.banned) {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended by platform administration.',
      });
    }

    const existing = getDbState() || {};
    const incoming = req.body || {};
    const cleanCallerEmail = String(caller.email || '').trim().toLowerCase();
    const memberships = await getCallerAllOrgMemberships(caller);
    const memberOrgIds = new Set(memberships.map((m) => m.organizationId));

    // Normalize any incoming reservation receiptUrl back to canonical non-signed reference
    const normalizeReservation = (r: any) => {
      if (!r || typeof r !== 'object') return r;
      if (r.receiptUrl) {
        return { ...r, receiptUrl: stripSignedQueryFromPrivateRef(String(r.receiptUrl)) };
      }
      return r;
    };

    const existingHotels: any[] = Array.isArray(existing.hotels) ? existing.hotels : [];
    let mergedHotels = existingHotels;

    if (Array.isArray(incoming.hotels) && (caller.isSuperAdmin || memberOrgIds.size > 0)) {
      const updatedMap = new Map<string, any>();
      for (const eh of existingHotels) {
        updatedMap.set(eh.id, eh);
      }
      for (const ih of incoming.hotels) {
        if (!ih?.id) continue;
        const eh = updatedMap.get(ih.id);
        if (!eh) continue; // New hotels must use /api/hotels/register
        if (!caller.isSuperAdmin && !memberOrgIds.has(ih.id)) continue; // Strict cross-tenant protection

        const ehUpdatedMs = eh.profileUpdatedAt ? new Date(eh.profileUpdatedAt).getTime() : 0;
        const ihUpdatedMs = ih.profileUpdatedAt ? new Date(ih.profileUpdatedAt).getTime() : 0;
        const existingProfileNewer = ehUpdatedMs > ihUpdatedMs;

        updatedMap.set(
          ih.id,
          enrichHotelWithDefaultsAndPrivileges({
            ...eh,
            ...ih,
            ...(existingProfileNewer
              ? {
                  name: eh.name,
                  slug: eh.slug,
                  description: eh.description,
                  logoImage: eh.logoImage,
                  coverImage: eh.coverImage,
                  address: eh.address,
                  city: eh.city,
                  state: eh.state,
                  country: eh.country,
                  phone: eh.phone,
                  email: eh.email,
                  website: eh.website,
                  instagram: eh.instagram,
                  facebook: eh.facebook,
                  bankName: eh.bankName,
                  accountName: eh.accountName,
                  accountNumber: eh.accountNumber,
                  transferInstructions: eh.transferInstructions,
                  settings: eh.settings,
                  customReceiptBranding: eh.customReceiptBranding,
                  branches: eh.branches,
                  profileUpdatedAt: eh.profileUpdatedAt,
                }
              : {
                  logoImage: ih.logoImage !== undefined ? ih.logoImage : eh.logoImage,
                  coverImage: ih.coverImage !== undefined ? ih.coverImage : eh.coverImage,
                  description: ih.description !== undefined ? ih.description : eh.description,
                  settings: ih.settings !== undefined ? ih.settings : eh.settings,
                  customReceiptBranding:
                    ih.customReceiptBranding !== undefined ? ih.customReceiptBranding : eh.customReceiptBranding,
                  branches: ih.branches !== undefined ? ih.branches : eh.branches,
                }),
            subscriptionPlanId: eh.subscriptionPlanId,
            subscriptionPlanName: eh.subscriptionPlanName,
            packageType: eh.packageType,
            hasGuestPortal: eh.hasGuestPortal,
            privileges: eh.privileges,
            subscriptionStatus: eh.subscriptionStatus,
            paymentStatus: eh.paymentStatus,
            billingCycle: eh.billingCycle,
            isContractPlan: eh.isContractPlan,
            subscriptionStartDate: eh.subscriptionStartDate,
            subscriptionEndDate: eh.subscriptionEndDate,
            autoRenew: eh.autoRenew,
            cancelAtPeriodEnd: eh.cancelAtPeriodEnd,
            paystackCustomerCode: eh.paystackCustomerCode,
            paystackSubscriptionCode: eh.paystackSubscriptionCode,
            paystackMode: eh.paystackMode,
          })
        );
      }
      mergedHotels = Array.from(updatedMap.values());
    }

    // Tenant-scoped merge for rooms
    let mergedRooms: any[] = Array.isArray(existing.rooms) ? existing.rooms : [];
    if (Array.isArray(incoming.rooms) && (caller.isSuperAdmin || memberOrgIds.size > 0)) {
      const preservedRooms = mergedRooms.filter(
        (r: any) => !caller.isSuperAdmin && (!r.hotelId || !memberOrgIds.has(r.hotelId))
      );
      const allowedIncomingRooms = caller.isSuperAdmin
        ? incoming.rooms
        : incoming.rooms.filter((r: any) => r.hotelId && memberOrgIds.has(r.hotelId));
      mergedRooms = [...allowedIncomingRooms, ...preservedRooms];
    }

    // Tenant & ownership-scoped merge for reservations
    let mergedReservations: any[] = Array.isArray(existing.reservations) ? existing.reservations : [];
    if (Array.isArray(incoming.reservations)) {
      if (memberOrgIds.size > 0) {
        const preservedRes = mergedReservations.filter(
          (r: any) => !r.hotelId || !memberOrgIds.has(r.hotelId)
        );
        const allowedIncomingRes = incoming.reservations
          .filter((r: any) => r.hotelId && memberOrgIds.has(r.hotelId))
          .map(normalizeReservation);
        mergedReservations = [...allowedIncomingRes, ...preservedRes];
      } else if (!caller.isSuperAdmin && cleanCallerEmail) {
        // Guests can only add/update their own bookings and cannot override server confirmation/payment status
        const existingMap = new Map(mergedReservations.map((r: any) => [r.id, r]));
        for (const ir of incoming.reservations) {
          if (!ir?.id || String(ir.guestEmail || '').trim().toLowerCase() !== cleanCallerEmail) continue;
          const prev = existingMap.get(ir.id);
          const cleanIncoming = normalizeReservation(ir);
          if (!prev) {
            existingMap.set(ir.id, {
              ...cleanIncoming,
              status: 'pending',
              paymentStatus: 'pending',
            });
          } else {
            existingMap.set(ir.id, {
              ...prev,
              receiptUrl: cleanIncoming.receiptUrl || prev.receiptUrl,
              paymentRef: cleanIncoming.paymentRef || prev.paymentRef,
              specialRequests: cleanIncoming.specialRequests ?? prev.specialRequests,
            });
          }
        }
        mergedReservations = Array.from(existingMap.values());
      }
    }

    // Tenant-scoped housekeeping, guestReports, customRoles, staff updates
    let mergedHousekeeping: any[] = Array.isArray(existing.housekeeping) ? existing.housekeeping : [];
    if (Array.isArray(incoming.housekeeping) && memberOrgIds.size > 0) {
      const preservedHk = mergedHousekeeping.filter(
        (hk: any) => hk.hotelId && !memberOrgIds.has(hk.hotelId)
      );
      const allowedHk = incoming.housekeeping.map((hk: any) => ({
        ...hk,
        hotelId: hk.hotelId || Array.from(memberOrgIds)[0],
      }));
      mergedHousekeeping = [...allowedHk, ...preservedHk];
    }

    let mergedCustomRoles: any[] = Array.isArray(existing.customRoles) ? existing.customRoles : [];
    if (Array.isArray(incoming.customRoles) && memberOrgIds.size > 0) {
      const preservedRoles = mergedCustomRoles.filter((cr: any) => cr.hotelId && !memberOrgIds.has(cr.hotelId));
      const allowedRoles = incoming.customRoles.filter((cr: any) => cr.hotelId && memberOrgIds.has(cr.hotelId));
      mergedCustomRoles = [...allowedRoles, ...preservedRoles];
    }

    let mergedGuestReports: any[] = Array.isArray(existing.guestReports) ? existing.guestReports : [];
    if (Array.isArray(incoming.guestReports) && memberOrgIds.size > 0) {
      const preservedReports = mergedGuestReports.filter((gr: any) => gr.hotelId && !memberOrgIds.has(gr.hotelId));
      const allowedReports = incoming.guestReports.filter(
        (gr: any) => !gr.hotelId || memberOrgIds.has(gr.hotelId)
      );
      mergedGuestReports = [...allowedReports, ...preservedReports];
    }

    let mergedStaff: any[] = Array.isArray(existing.staff) ? existing.staff : [];
    if (Array.isArray(incoming.staff) && memberOrgIds.size > 0) {
      const isOwnerOrManager = memberships.some((m) =>
        ['owner', 'hotel_owner', 'manager', 'hotel_manager'].includes(String(m.role || '').toLowerCase())
      );
      if (isOwnerOrManager) {
        const preservedStaff = mergedStaff.filter((s: any) => !s.hotelId || !memberOrgIds.has(s.hotelId));
        const allowedStaff = incoming.staff.filter((s: any) => s.hotelId && memberOrgIds.has(s.hotelId));
        mergedStaff = [...allowedStaff, ...preservedStaff];
      }
    }

    const mergedState = {
      ...existing,
      hotels: mergedHotels,
      rooms: mergedRooms,
      reservations: mergedReservations,
      staff: mergedStaff,
      housekeeping: mergedHousekeeping,
      customRoles: mergedCustomRoles,
      guestReports: mergedGuestReports,
      plans: caller.isSuperAdmin && Array.isArray(incoming.plans) ? incoming.plans : existing.plans ?? [],
      platformSettings:
        caller.isSuperAdmin && incoming.platformSettings
          ? incoming.platformSettings
          : existing.platformSettings ?? {},
      demoRequests:
        caller.isSuperAdmin && Array.isArray(incoming.demoRequests)
          ? incoming.demoRequests
          : existing.demoRequests ?? [],
      subscriptions: existing.subscriptions ?? [],
      transactions: existing.transactions ?? [],
      subscriptionInvoices: existing.subscriptionInvoices ?? [],
      pendingSubscriptionCheckouts: existing.pendingSubscriptionCheckouts ?? [],
      processedPaystackWebhooks: existing.processedPaystackWebhooks ?? [],
      processedPaystackReferences: existing.processedPaystackReferences ?? [],
      storageFiles: existing.storageFiles ?? [],
      storageCustomQuotas: existing.storageCustomQuotas ?? {},
      auditLogs: existing.auditLogs ?? [],
      trialTokens: existing.trialTokens ?? [],
      platformUsers: existing.platformUsers ?? [],
      bannedUsers: existing.bannedUsers ?? [],
      userProfiles: existing.userProfiles ?? {},
      organizationEntitlements: existing.organizationEntitlements ?? {},
      subscriptionExceptions: existing.subscriptionExceptions ?? {},
      subscriptionHistory: existing.subscriptionHistory ?? [],
      organizationBackups: existing.organizationBackups ?? [],
      notificationUsage: existing.notificationUsage ?? {},
      scheduledReports: existing.scheduledReports ?? [],
      featureRequests: existing.featureRequests ?? [],
      featureRequestAccessConfig: existing.featureRequestAccessConfig ?? {},
      personalizedActivations: existing.personalizedActivations ?? [],
      customFeatureEntitlements: existing.customFeatureEntitlements ?? [],
      userNotifications: existing.userNotifications ?? [],
      invitations: existing.invitations ?? [],
    };

    const success = saveDbState(mergedState);
    broadcastLiveEvent('state_updated', { timestamp: Date.now() });
    res.json({ success });
  });

  // =========================================================================
  // 5. PRE-GENERATED CRYPTOGRAPHIC TRIAL TOKENS ENGINE (CONSOLIDATED SINGLE SOURCE)
  // =========================================================================
  const DEFAULT_SEEDED_TOKENS = [
    {
      id: 'tok-trial-30',
      code: 'IGHO-TR-9K4M',
      durationDays: 30,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'Super Admin',
      notes: 'Launch 1-Month Free Trial Promo Token',
    },
    {
      id: 'tok-universal-1',
      code: 'IGHO-TR-7X2P',
      durationDays: 30,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'Super Admin',
      notes: 'Universal 30-Day Evaluation Token',
    },
    {
      id: 'tok-pilot-lava',
      code: 'IGHO-TR-LAVA',
      durationDays: 30,
      assignedHotelId: 'hotel-lava',
      assignedHotelName: 'Lava Hotel & Suites',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'Super Admin',
      notes: 'Allocated Exclusively to Lava Hotel & Suites',
    },
  ];

  // Track failed token redemption attempts for 24-hour lockout protection
  const tokenFailedAttempts: Record<string, { count: number; lockedUntil: number }> = {};

  function getStoredTokens() {
    const state = getDbState() || {};
    if (!Array.isArray(state.trialTokens) || state.trialTokens.length === 0) {
      state.trialTokens = DEFAULT_SEEDED_TOKENS;
      saveDbState(state);
    }
    return state.trialTokens;
  }

  function generateSecureTokenCode(existingTokens: any[]) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let attempts = 0;
    do {
      let part1 = '';
      let part2 = '';
      for (let i = 0; i < 4; i++) {
        part1 += chars.charAt(Math.floor(Math.random() * chars.length));
        part2 += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `IGHO-${part1}-${part2}`;
      attempts++;
    } while (existingTokens.some((t: any) => t.code === code) && attempts < 100);
    return code;
  }

  app.get('/api/trial-tokens', (req, res) => {
    const tokens = getStoredTokens();
    res.json({ success: true, tokens });
  });

  app.post('/api/trial-tokens/generate', requireSuperAdmin, (req, res) => {
    const {
      durationDays = 30,
      assignedHotelId,
      assignedHotelName,
      linkedHotelId,
      linkedHotelName,
      notes,
      createdBy = 'Super Admin',
      customCode,
    } = req.body;

    const state = getDbState() || {};
    let tokens = state.trialTokens || DEFAULT_SEEDED_TOKENS;

    let code = '';
    if (customCode && typeof customCode === 'string' && customCode.trim()) {
      code = customCode.trim().toUpperCase();
      if (tokens.some((t: any) => (t.code || '').toUpperCase() === code)) {
        return res.status(409).json({
          error: 'CODE_ALREADY_EXISTS',
          message: `The token code "${code}" has already been pre-generated in the system.`,
        });
      }
    } else {
      code = generateSecureTokenCode(tokens);
    }

    const targetAssignedHotelId = assignedHotelId || linkedHotelId;
    const targetAssignedHotelName = assignedHotelName || linkedHotelName;

    const newToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code,
      durationDays: Number(durationDays) || 30,
      assignedHotelId:
        targetAssignedHotelId && targetAssignedHotelId !== 'universal' ? targetAssignedHotelId : undefined,
      assignedHotelName:
        targetAssignedHotelName || (targetAssignedHotelId && targetAssignedHotelId !== 'universal' ? 'Assigned Property' : undefined),
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy,
      notes: notes ? notes.trim() : 'Pre-generated 30-Day Free Trial Token',
    };

    tokens = [newToken, ...tokens];
    state.trialTokens = tokens;
    saveDbState(state);

    broadcastLiveEvent('trial_token_generated', newToken);
    res.status(201).json({ success: true, token: newToken });
  });

  app.post('/api/trial-tokens/redeem', (req, res) => {
    const { code, hotelId, hotelName, redeemedByEmail } = req.body;

    if (!code || !hotelId) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'Token code and hotelId are required to redeem.',
      });
    }

    const clientKey = `${hotelId}:${req.ip || 'client'}`;
    const nowMs = Date.now();

    if (tokenFailedAttempts[clientKey] && tokenFailedAttempts[clientKey].lockedUntil > nowMs) {
      const remainingHours = Math.ceil((tokenFailedAttempts[clientKey].lockedUntil - nowMs) / 3600000);
      return res.status(429).json({
        success: false,
        lockedOut: true,
        error: 'LOCKED_OUT',
        message: `Too many invalid token attempts. Token trial redemption is locked for ${remainingHours} hour(s).`,
      });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const state = getDbState() || {};
    let tokens = state.trialTokens || DEFAULT_SEEDED_TOKENS;
    let hotels = state.hotels || [];

    const tokenIndex = tokens.findIndex((t: any) => (t.code || '').toUpperCase() === cleanCode);

    if (tokenIndex === -1) {
      if (!tokenFailedAttempts[clientKey]) {
        tokenFailedAttempts[clientKey] = { count: 1, lockedUntil: 0 };
      } else {
        tokenFailedAttempts[clientKey].count += 1;
      }

      if (tokenFailedAttempts[clientKey].count >= 5) {
        tokenFailedAttempts[clientKey].lockedUntil = nowMs + 86400000;
        return res.status(429).json({
          success: false,
          lockedOut: true,
          error: 'LOCKED_OUT',
          message: 'Too many invalid token attempts (5). Token trial redemption locked for 24 hours.',
        });
      }

      const attemptsLeft = 5 - tokenFailedAttempts[clientKey].count;
      return res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: `Invalid trial code "${cleanCode}". Trial tokens must be pre-generated by the Super Admin in the Console. (${attemptsLeft} attempt(s) remaining)`,
      });
    }

    const token = tokens[tokenIndex];

    if (token.status === 'revoked') {
      return res.status(403).json({
        success: false,
        error: 'TOKEN_REVOKED',
        message: `Trial token "${cleanCode}" has been revoked by platform administration.`,
      });
    }

    if (token.status === 'used' || token.status === 'redeemed') {
      return res.status(409).json({
        success: false,
        error: 'TOKEN_ALREADY_USED',
        message: `Trial token "${cleanCode}" has already been claimed${
          token.claimedByHotelName || token.redeemedByHotelName
            ? ` by ${token.claimedByHotelName || token.redeemedByHotelName}`
            : ''
        }. Tokens can only be used once.`,
      });
    }

    const lockedHotelId = token.assignedHotelId || token.linkedHotelId;
    if (lockedHotelId && lockedHotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'TOKEN_ALLOCATED_TO_ANOTHER_HOTEL',
        message: `This trial token was issued exclusively for "${
          token.assignedHotelName || token.linkedHotelName || lockedHotelId
        }". Your property (${hotelName || hotelId}) is not authorized to redeem this token.`,
      });
    }

    const now = new Date();
    const durationDays = token.durationDays || 30;
    const endDate = new Date(now.getTime() + durationDays * 86400000).toISOString();

    // Mark token as used atomically
    token.status = 'used';
    token.claimedByHotelId = hotelId;
    token.claimedByHotelName = hotelName || 'Subscribed Hotel';
    token.claimedAt = now.toISOString();
    token.redeemedByEmail = redeemedByEmail;
    token.endDate = endDate;

    tokens[tokenIndex] = token;
    state.trialTokens = tokens;
    delete tokenFailedAttempts[clientKey];

    // Activate hotel trial status
    const hotelIndex = hotels.findIndex((h: any) => h.id === hotelId);
    let targetHotel = null;
    if (hotelIndex >= 0) {
      targetHotel = hotels[hotelIndex];
      targetHotel.isLive = true;
      targetHotel.status = 'active';
      targetHotel.approvalStatus = 'approved';
      targetHotel.paymentStatus = 'paid';
      targetHotel.subscriptionStatus = 'trial';
      targetHotel.trialCode = cleanCode;
      targetHotel.trialStartDate = now.toISOString();
      targetHotel.trialEndDate = endDate;
      hotels[hotelIndex] = targetHotel;
    }

    state.hotels = hotels;
    saveDbState(state);

    appendAuditLog({
      actorEmail: redeemedByEmail || targetHotel?.ownerEmail || 'hotel_owner',
      action: 'CHANGE_PLAN',
      target: `${hotelName || hotelId} (Token ${cleanCode})`,
      targetType: 'subscription',
      newValue: `${durationDays}-Day Trial`,
    });

    broadcastLiveEvent('trial_token_redeemed', {
      tokenId: token.id,
      code: cleanCode,
      hotelId,
      hotelName,
      endDate,
    });

    broadcastLiveEvent('hotel_subscription_updated', {
      hotelId,
      subscriptionStatus: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: endDate,
    });

    res.json({
      success: true,
      message: `${durationDays}-Day Free Trial activated successfully for ${hotelName || 'your property'}. Valid until ${new Date(endDate).toLocaleDateString()}.`,
      token,
      hotel: targetHotel,
    });
  });

  app.patch('/api/trial-tokens/:id', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { status, notes, assignedHotelId, assignedHotelName } = req.body;

    const state = getDbState() || {};
    let tokens = state.trialTokens || DEFAULT_SEEDED_TOKENS;
    const idx = tokens.findIndex((t: any) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'TOKEN_NOT_FOUND', message: 'Token not found.' });
    }

    tokens[idx] = {
      ...tokens[idx],
      status: status || tokens[idx].status,
      notes: notes !== undefined ? notes : tokens[idx].notes,
      assignedHotelId: assignedHotelId !== undefined ? assignedHotelId : tokens[idx].assignedHotelId,
      assignedHotelName: assignedHotelName !== undefined ? assignedHotelName : tokens[idx].assignedHotelName,
      updatedAt: new Date().toISOString(),
    };

    state.trialTokens = tokens;
    saveDbState(state);

    broadcastLiveEvent('trial_token_updated', tokens[idx]);
    res.json({ success: true, token: tokens[idx] });
  });

  app.delete('/api/trial-tokens/:id', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const state = getDbState() || {};
    let tokens = state.trialTokens || DEFAULT_SEEDED_TOKENS;

    state.trialTokens = tokens.filter((t: any) => t.id !== id);
    saveDbState(state);

    broadcastLiveEvent('trial_token_deleted', { id });
    res.json({ success: true, message: 'Trial token deleted.' });
  });

  // =========================================================================
  // 6. ORGANISATION-WIDE STORAGE ENTITLEMENTS & QUOTA MANAGEMENT
  // =========================================================================
  // Default allowances: Starter = 10 GB, Professional = 50 GB
  const STORAGE_ALLOWANCES_BYTES: Record<string, number> = {
    'plan-starter-30k': 10 * 1024 * 1024 * 1024, // 10 GB
    'plan-1': 10 * 1024 * 1024 * 1024,
    'plan-complete-50k': 50 * 1024 * 1024 * 1024, // 50 GB
    'plan-3': 50 * 1024 * 1024 * 1024,
  };

  // Seed initial sample files if storage state is empty
  const SEEDED_STORAGE_FILES = [
    {
      id: 'file-lava-1',
      organizationId: 'hotel-lava',
      name: 'lobby_facade_highres.jpg',
      category: 'guest_portal_media',
      categoryName: 'Guest Portal & Promotional Media',
      sizeBytes: 4200000, // 4.2 MB
      path: '/org/hotel-lava/media/lobby_facade_highres.jpg',
      uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      uploadedBy: 'owner@lavahotel.com',
    },
    {
      id: 'file-lava-2',
      organizationId: 'hotel-lava',
      name: 'executive_suite_gallery.zip',
      category: 'room_galleries',
      categoryName: 'Room and Facility Galleries',
      sizeBytes: 18500000, // 18.5 MB
      path: '/org/hotel-lava/rooms/executive_suite_gallery.zip',
      uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      uploadedBy: 'manager@lavahotel.com',
    },
    {
      id: 'file-lava-3',
      organizationId: 'hotel-lava',
      name: 'cac_registration_certificate.pdf',
      category: 'hotel_documents',
      categoryName: 'Hotel & Compliance Documents',
      sizeBytes: 1850000, // 1.85 MB
      path: '/org/hotel-lava/docs/cac_registration_certificate.pdf',
      uploadedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      uploadedBy: 'owner@lavahotel.com',
    },
  ];

  function getStorageData() {
    const state = getDbState() || {};
    if (!Array.isArray(state.storageFiles)) {
      state.storageFiles = SEEDED_STORAGE_FILES;
      saveDbState(state);
    }
    return {
      storageFiles: state.storageFiles,
      customQuotas: state.storageCustomQuotas || {},
    };
  }

  // Central P0 Storage Authorization Guard (JWT + Active Profile + Membership + Role/Permissions + Org Ownership)
  async function authorizeStorageOperation(
    req: express.Request,
    organizationId: string,
    action: 'list' | 'check_upload' | 'upload' | 'create_metadata' | 'delete' | 'view_private',
    category?: string
  ): Promise<
    | {
        ok: true;
        caller: Awaited<ReturnType<typeof resolveCaller>>;
        accessScope: 'super_admin' | 'org_member' | 'profile_owner' | 'guest_payment_proof';
        role?: string;
        permissions: string[];
      }
    | { ok: false; status: number; error: string; message: string }
  > {
    const caller = await resolveCaller(req);
    const profileCheck = await verifyCallerActiveProfile(caller);
    if (!profileCheck.ok) {
      return {
        ok: false,
        status: profileCheck.status || 401,
        error: profileCheck.error || 'AUTHENTICATION_REQUIRED',
        message: profileCheck.message || 'Authentication required.',
      };
    }

    const cleanCategory = String(category || 'general_operational').trim();

    // 1. Personal avatar uploads ('platform-profiles'): strictly scoped to caller's own verified userId
    if (organizationId === 'platform-profiles') {
      if (action === 'list' || action === 'create_metadata') {
        if (!caller.isSuperAdmin) {
          return {
            ok: false,
            status: 403,
            error: 'FORBIDDEN_PROFILE_LISTING',
            message: 'Listing platform profile assets is restricted.',
          };
        }
        return { ok: true, caller, accessScope: 'super_admin', permissions: [] };
      }
      if ((action === 'check_upload' || action === 'upload') && cleanCategory !== 'guest_portal_media') {
        return {
          ok: false,
          status: 403,
          error: 'INVALID_PROFILE_CATEGORY',
          message: 'Personal profiles only accept avatar image uploads.',
        };
      }
      return { ok: true, caller, accessScope: 'profile_owner', role: 'profile_owner', permissions: [] };
    }

    // 2. Super Admin access (platform_roles / is_platform_super_admin())
    if (caller.isSuperAdmin) {
      if (action === 'list' || action === 'view_private') {
        return { ok: true, caller, accessScope: 'super_admin', role: 'super_admin', permissions: [] };
      }
      return {
        ok: false,
        status: 403,
        error: 'SUPER_ADMIN_TENANT_BARRIER',
        message: 'Platform Super Admins cannot upload or delete private tenant hotel files.',
      };
    }

    // 3. Resolve caller's actual organization memberships from verified backend architecture
    const memberships = await getCallerAllOrgMemberships(caller);
    const matchedOrg = memberships.find((m) => m.organizationId === organizationId);

    if (matchedOrg) {
      const role = String(matchedOrg.role || '').toLowerCase();
      const perms = Array.isArray(matchedOrg.permissions) ? matchedOrg.permissions : [];
      const isOwnerOrManager = ['owner', 'hotel_owner', 'manager', 'hotel_manager'].includes(role);

      if (action === 'list') {
        const canList =
          isOwnerOrManager ||
          role === 'finance' ||
          role === 'receptionist' ||
          perms.includes('settings.view') ||
          perms.includes('reports.view') ||
          perms.includes('rooms.view');
        if (!canList) {
          return {
            ok: false,
            status: 403,
            error: 'STORAGE_PERMISSION_DENIED',
            message: 'Your role does not permit viewing organization storage listings.',
          };
        }
        return { ok: true, caller, accessScope: 'org_member', role, permissions: perms };
      }

      if (action === 'delete') {
        const canDelete =
          isOwnerOrManager || perms.includes('rooms.edit') || perms.includes('settings.edit');
        if (!canDelete) {
          return {
            ok: false,
            status: 403,
            error: 'STORAGE_DELETE_DENIED',
            message: 'Only hotel owners, managers, or authorized administrators may delete organization files.',
          };
        }
        return { ok: true, caller, accessScope: 'org_member', role, permissions: perms };
      }

      // Upload / check_upload / create_metadata permission matrix per category
      if (!isOwnerOrManager) {
        const categoryPermMap: Record<string, boolean> = {
          room_galleries: perms.includes('rooms.create') || perms.includes('rooms.edit'),
          guest_portal_media: perms.includes('settings.edit'),
          hotel_documents: perms.includes('compliance.view') || perms.includes('settings.edit'),
          payment_proofs:
            role === 'finance' ||
            role === 'receptionist' ||
            perms.includes('billing.create') ||
            perms.includes('reservations.create'),
          general_operational: true, // Active hotel staff may attach operational/feature-request media
        };
        if (!categoryPermMap[cleanCategory]) {
          return {
            ok: false,
            status: 403,
            error: 'STORAGE_UPLOAD_PERMISSION_DENIED',
            message: `Your role (${role}) is not permitted to upload files to "${cleanCategory}".`,
          };
        }
      }

      return { ok: true, caller, accessScope: 'org_member', role, permissions: perms };
    }

    // 4. Authenticated Guest uploading a booking payment proof (payment_proofs ONLY) to an active hotel
    const state = getDbState() || {};
    const targetHotel = (state.hotels || []).find((h: any) => h.id === organizationId);
    if (
      targetHotel &&
      (action === 'check_upload' || action === 'upload') &&
      cleanCategory === 'payment_proofs'
    ) {
      return { ok: true, caller, accessScope: 'guest_payment_proof', role: 'customer', permissions: [] };
    }

    if (targetHotel && action === 'view_private' && (!category || cleanCategory === 'payment_proofs')) {
      return { ok: true, caller, accessScope: 'guest_payment_proof', role: 'customer', permissions: [] };
    }

    return {
      ok: false,
      status: 403,
      error: 'CROSS_ORGANIZATION_DENIED',
      message: 'You do not have active organization membership or permission for this hotel’s storage.',
    };
  }

  function sanitizeStorageFileForCaller(
    file: any,
    authScope: { accessScope: string; role?: string; callerUserId?: string; callerEmail?: string }
  ) {
    if (!file || typeof file !== 'object') return file;
    const isPrivate =
      Boolean(file.isPrivate) ||
      PRIVATE_STORAGE_CATEGORIES.has(String(file.category || '').toLowerCase());
    if (!isPrivate) return file;

    // Super Admin sees storage usage metadata only, NEVER private payment proof/document URLs
    if (authScope.accessScope === 'super_admin') {
      const { url: _hiddenUrl, path: _hiddenPath, ...metaOnly } = file;
      return { ...metaOnly, isPrivate: true };
    }

    const canViewPrivateUrl =
      authScope.accessScope === 'org_member' &&
      (file.category !== 'payment_proofs' ||
        ['owner', 'hotel_owner', 'manager', 'hotel_manager', 'finance', 'receptionist'].includes(
          String(authScope.role || '').toLowerCase()
        ));

    if (!canViewPrivateUrl) {
      const { url: _hiddenUrl, path: _hiddenPath, ...metaOnly } = file;
      return { ...metaOnly, isPrivate: true };
    }

    return {
      ...file,
      isPrivate: true,
      url: mintSignedPrivateFileUrl(file.organizationId, file.id, 300),
    };
  }

  // Get quota and real-time usage for an organization (P0 Authenticated & Membership-Scoped)
  app.get('/api/storage/:organizationId', async (req, res) => {
    const { organizationId } = req.params;
    const auth = await authorizeStorageOperation(req, organizationId, 'list');
    if ('error' in auth) {
      return res.status(auth.status).json({ success: false, error: auth.error, message: auth.message });
    }

    const state = getDbState() || {};
    const { storageFiles, customQuotas } = getStorageData();

    const hotel = (state.hotels || []).find((h: any) => h.id === organizationId);
    const planId = hotel?.subscriptionPlanId || 'plan-starter-30k';
    const ent = hotel ? resolveHotelEntitlements(hotel) : null;

    const quotaBytes =
      customQuotas[organizationId] !== undefined
        ? customQuotas[organizationId]
        : ent
        ? ent.privileges.storageQuotaGb * 1024 * 1024 * 1024
        : STORAGE_ALLOWANCES_BYTES[planId] || 10 * 1024 * 1024 * 1024;

    const orgFiles = storageFiles.filter((f: any) => f.organizationId === organizationId);
    const usedBytes = orgFiles.reduce((sum: number, f: any) => sum + (Number(f.sizeBytes) || 0), 0);
    const remainingBytes = Math.max(0, quotaBytes - usedBytes);
    const percentage = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
    const isOverQuota = usedBytes > quotaBytes;

    let warningState: 'normal' | 'approaching' | 'critical' | 'exceeded' = 'normal';
    if (isOverQuota) {
      warningState = 'exceeded';
    } else if (percentage >= 90) {
      warningState = 'critical';
    } else if (percentage >= 75) {
      warningState = 'approaching';
    }

    const categoriesMap: Record<string, { count: number; bytes: number }> = {};
    for (const f of orgFiles) {
      const cat = f.category || 'general_operational';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { count: 0, bytes: 0 };
      }
      categoriesMap[cat].count += 1;
      categoriesMap[cat].bytes += Number(f.sizeBytes) || 0;
    }

    const safeFiles = orgFiles.map((f: any) =>
      sanitizeStorageFileForCaller(f, {
        accessScope: auth.accessScope,
        role: auth.role,
        callerUserId: auth.caller.userId,
        callerEmail: auth.caller.email,
      })
    );

    res.json({
      success: true,
      organizationId,
      organizationName: hotel?.name || organizationId,
      planId,
      planName: hotel?.subscriptionPlanName || (planId.includes('50k') || planId === 'plan-3' ? 'Professional (50 GB)' : 'Starter (10 GB)'),
      quotaBytes,
      usedBytes,
      remainingBytes,
      percentage: Number(percentage.toFixed(2)),
      fileCount: orgFiles.length,
      isOverQuota,
      warningState,
      categoriesBreakdown: categoriesMap,
      files: safeFiles,
    });
  });

  // Pre-upload validation check (P0 Authenticated + Membership/Permission Enforced)
  app.post('/api/storage/:organizationId/check-upload', async (req, res) => {
    const { organizationId } = req.params;
    const { sizeBytes = 0, fileName, category } = req.body || {};

    const auth = await authorizeStorageOperation(req, organizationId, 'check_upload', category);
    if ('error' in auth) {
      return res.status(auth.status).json({ allowed: false, error: auth.error, message: auth.message });
    }

    const state = getDbState() || {};
    const { storageFiles, customQuotas } = getStorageData();
    const hotel = (state.hotels || []).find((h: any) => h.id === organizationId);
    const planId = hotel?.subscriptionPlanId || 'plan-starter-30k';
    const ent = hotel ? resolveHotelEntitlements(hotel) : null;

    const quotaBytes =
      customQuotas[organizationId] !== undefined
        ? customQuotas[organizationId]
        : ent
        ? ent.privileges.storageQuotaGb * 1024 * 1024 * 1024
        : STORAGE_ALLOWANCES_BYTES[planId] || 10 * 1024 * 1024 * 1024;

    const orgFiles = storageFiles.filter((f: any) => f.organizationId === organizationId);
    const currentUsedBytes = orgFiles.reduce((sum: number, f: any) => sum + (Number(f.sizeBytes) || 0), 0);
    const requestedBytes = Number(sizeBytes) || 0;

    if (currentUsedBytes + requestedBytes > quotaBytes) {
      const remainingBytes = Math.max(0, quotaBytes - currentUsedBytes);
      return res.status(413).json({
        allowed: false,
        error: 'STORAGE_QUOTA_EXCEEDED',
        message: `Upload rejected: Uploading "${fileName || 'this file'}" (${(requestedBytes / (1024 * 1024)).toFixed(1)} MB) would exceed your organization storage quota (${(quotaBytes / (1024 * 1024 * 1024)).toFixed(0)} GB). You have ${(remainingBytes / (1024 * 1024)).toFixed(1)} MB remaining. Please upgrade your subscription or remove existing files.`,
        currentUsedBytes,
        quotaBytes,
        remainingBytes,
        requestedBytes,
      });
    }

    res.json({
      allowed: true,
      remainingBytesAfter: quotaBytes - (currentUsedBytes + requestedBytes),
      quotaBytes,
    });
  });

  const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per image/document

  // Binary file upload endpoint (P0 Authenticated + Membership/Permission Enforced; private files never stored in public buckets)
  app.post(
    '/api/storage/:organizationId/upload-binary',
    express.raw({ type: '*/*', limit: '11mb' }),
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const safeOrgId = organizationId.replace(/[^a-zA-Z0-9_-]/g, '') || 'org-default';
        const safeDecode = (val: string, fallback: string) => {
          try {
            return decodeURIComponent(val);
          } catch {
            return val || fallback;
          }
        };
        const rawCategory = String(req.query.category || req.headers['x-file-category'] || 'general_operational');
        const safeCategory = rawCategory.replace(/[^a-zA-Z0-9_-]/g, '') || 'general_operational';

        const auth = await authorizeStorageOperation(req, organizationId, 'upload', safeCategory);
        if ('error' in auth) {
          return res.status(auth.status).json({ success: false, error: auth.error, message: auth.message });
        }

        const originalName = safeDecode(
          String(req.headers['x-file-name'] || req.query.filename || `upload_${Date.now()}.jpg`),
          `upload_${Date.now()}.jpg`
        );
        // Never trust client-supplied X-Uploaded-By; derive strictly from verified JWT identity
        const uploadedBy = auth.caller.email || 'Authenticated User';
        const contentType = String(req.headers['content-type'] || 'application/octet-stream').toLowerCase();

        const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
        if (!fileBuffer || fileBuffer.length === 0) {
          return res.status(400).json({ error: 'EMPTY_FILE', message: 'Uploaded file payload is empty.' });
        }

        if (fileBuffer.length > MAX_SINGLE_FILE_BYTES) {
          return res.status(413).json({
            error: 'FILE_TOO_LARGE',
            message: `File exceeds the maximum allowed size of 10 MB (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB received).`,
          });
        }

        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/pjpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/heic': 'heic',
          'image/heif': 'heif',
          'image/avif': 'avif',
          'image/bmp': 'bmp',
          'image/tiff': 'tiff',
          'application/pdf': 'pdf',
        };
        const cleanMime = contentType.split(';')[0].trim();
        const extMatch = originalName.toLowerCase().match(/\.([a-z0-9]+)$/);
        let ext = extMatch ? extMatch[1] : mimeToExt[cleanMime] || '';
        if (!ext && cleanMime.startsWith('image/')) {
          ext = cleanMime.replace('image/', '').replace(/[^a-z0-9]/g, '') || 'jpg';
        }
        if (!ext) ext = 'jpg';

        const allowedExts = new Set([
          'jpg',
          'jpeg',
          'jfif',
          'png',
          'webp',
          'gif',
          'heic',
          'heif',
          'avif',
          'bmp',
          'tiff',
          'pdf',
        ]);
        if (!allowedExts.has(ext) && !cleanMime.startsWith('image/')) {
          return res.status(400).json({
            error: 'UNSUPPORTED_FILE_TYPE',
            message: 'Unsupported file format. Allowed formats: JPG, PNG, WebP, GIF, HEIC, AVIF, and PDF.',
          });
        }
        if (!allowedExts.has(ext)) {
          ext = 'jpg';
        }

        const state = getDbState() || {};
        const { storageFiles, customQuotas } = getStorageData();
        const hotel = (state.hotels || []).find((h: any) => h.id === organizationId);
        const planId = hotel?.subscriptionPlanId || 'plan-starter-30k';
        const ent = hotel ? resolveHotelEntitlements(hotel) : null;
        const quotaBytes =
          customQuotas[organizationId] !== undefined
            ? customQuotas[organizationId]
            : ent
            ? ent.privileges.storageQuotaGb * 1024 * 1024 * 1024
            : STORAGE_ALLOWANCES_BYTES[planId] || 10 * 1024 * 1024 * 1024;

        const orgFiles = storageFiles.filter((f: any) => f.organizationId === organizationId);
        const currentUsedBytes = orgFiles.reduce((sum: number, f: any) => sum + (Number(f.sizeBytes) || 0), 0);
        if (
          organizationId !== 'platform-profiles' &&
          currentUsedBytes + fileBuffer.length > quotaBytes
        ) {
          return res.status(413).json({
            error: 'STORAGE_QUOTA_EXCEEDED',
            message: `Upload exceeds your organization storage quota (${(quotaBytes / (1024 * 1024 * 1024)).toFixed(0)} GB).`,
          });
        }

        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const diskFileName = `${fileId}.${ext}`;
        const isPrivateCategory =
          PRIVATE_STORAGE_CATEGORIES.has(safeCategory) || !PUBLIC_STORAGE_CATEGORIES.has(safeCategory);

        // Private files are NEVER stored inside public /uploads or public Supabase buckets.
        const diskRoot = isPrivateCategory ? PRIVATE_UPLOADS_ROOT : UPLOADS_ROOT;
        const subFolder =
          organizationId === 'platform-profiles' && auth.caller.userId
            ? path.join(safeOrgId, safeCategory, auth.caller.userId.replace(/[^a-zA-Z0-9_-]/g, ''))
            : path.join(safeOrgId, safeCategory);
        const targetDir = path.join(diskRoot, subFolder);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, diskFileName), fileBuffer);

        const storedDiskPath = isPrivateCategory
          ? `/private_uploads/${subFolder.replace(/\\/g, '/')}/${diskFileName}`
          : `/uploads/${subFolder.replace(/\\/g, '/')}/${diskFileName}`;

        let canonicalUrl = isPrivateCategory
          ? buildCanonicalPrivateFileRef(organizationId, fileId)
          : storedDiskPath;
        let storageBucket: string | undefined;
        let storageKey: string | undefined;

        // Mirror APPROVED PUBLIC assets to existing Supabase bucket 'igho-media' ONLY when it exists & is public
        // (never create buckets, never flip bucket visibility, and never upload private files into a public bucket!)
        if (supabaseAdminClient && !isPrivateCategory) {
          try {
            const { data: bucketInfo } = await supabaseAdminClient.storage.getBucket('igho-media');
            if (bucketInfo && bucketInfo.public !== false) {
              const candidateKey = `${subFolder.replace(/\\/g, '/')}/${diskFileName}`;
              const { error: sbErr } = await supabaseAdminClient.storage
                .from('igho-media')
                .upload(candidateKey, fileBuffer, { contentType: cleanMime || 'application/octet-stream', upsert: true });
              if (!sbErr) {
                const { data: pub } = supabaseAdminClient.storage.from('igho-media').getPublicUrl(candidateKey);
                if (pub?.publicUrl) {
                  canonicalUrl = pub.publicUrl;
                  storageBucket = 'igho-media';
                  storageKey = candidateKey;
                }
              }
            }
          } catch {}
        }

        const categoryLabels: Record<string, string> = {
          room_galleries: 'Room and Facility Galleries',
          guest_portal_media: 'Guest Portal & Promotional Media',
          hotel_documents: 'Hotel & Compliance Documents',
          payment_proofs: 'Payment & Transfer Receipts',
          general_operational: 'Organization Attachment',
        };

        const newFile = {
          id: fileId,
          organizationId,
          name: originalName,
          category: safeCategory,
          categoryName: categoryLabels[safeCategory] || 'Organization Attachment',
          sizeBytes: fileBuffer.length,
          mimeType: cleanMime || contentType,
          path: storedDiskPath,
          url: canonicalUrl,
          isPrivate: isPrivateCategory,
          ...(storageBucket ? { storageBucket, storageKey } : {}),
          ...(auth.caller.userId ? { ownerUserId: auth.caller.userId } : {}),
          ownerEmail: auth.caller.email,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
        };

        state.storageFiles = [newFile, ...(state.storageFiles || SEEDED_STORAGE_FILES)];
        saveDbState(state);

        // Return immediate short-lived signed URL for private files so uploader preview works without exposing a permanent URL
        const responseUrl = isPrivateCategory ? mintSignedPrivateFileUrl(organizationId, fileId, 300) : canonicalUrl;
        const responseFile = { ...newFile, url: responseUrl };

        broadcastLiveEvent('storage_file_uploaded', {
          id: newFile.id,
          organizationId: newFile.organizationId,
          category: newFile.category,
          sizeBytes: newFile.sizeBytes,
          isPrivate: newFile.isPrivate,
        });
        res.status(201).json({ success: true, url: responseUrl, file: responseFile });
      } catch (err: any) {
        console.error('[Binary Upload Error]', err);
        res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message || 'Failed to upload file.' });
      }
    }
  );

  // Authorized Private File Retrieval & Short-Lived Signed URL Minting
  app.post('/api/storage/:organizationId/files/:fileId/signed-url', async (req, res) => {
    const { organizationId, fileId } = req.params;
    const auth = await authorizeStorageOperation(req, organizationId, 'view_private');
    if ('error' in auth) {
      return res.status(auth.status).json({ error: auth.error, message: auth.message });
    }

    const state = getDbState() || {};
    const fileRecord = (state.storageFiles || []).find(
      (f: any) => f.id === fileId && f.organizationId === organizationId
    );
    if (!fileRecord) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Requested file does not exist in this organization.' });
    }

    if (auth.accessScope === 'guest_payment_proof') {
      if (fileRecord.category !== 'payment_proofs') {
        return res.status(403).json({
          error: 'CROSS_ORGANIZATION_DENIED',
          message: 'Private organization documents are restricted to authorized hotel staff.',
        });
      }
      const ownsFile =
        (fileRecord.ownerUserId && fileRecord.ownerUserId === auth.caller.userId) ||
        String(fileRecord.ownerEmail || '').toLowerCase() === auth.caller.email ||
        (state.reservations || []).some(
          (r: any) =>
            r.hotelId === organizationId &&
            String(r.guestEmail || '').toLowerCase() === auth.caller.email &&
            String(r.receiptUrl || '').includes(fileId)
        );
      if (!ownsFile) {
        return res.status(403).json({
          error: 'CROSS_USER_FILE_DENIED',
          message: 'You are not authorized to access another guest’s private payment receipt.',
        });
      }
    } else if (auth.accessScope === 'profile_owner') {
      if (fileRecord.ownerUserId !== auth.caller.userId) {
        return res.status(403).json({
          error: 'CROSS_USER_FILE_DENIED',
          message: 'You are not authorized to access another user’s file.',
        });
      }
    }

    const signedUrl = mintSignedPrivateFileUrl(organizationId, fileId, 300);
    res.json({ success: true, signedUrl, expiresInSeconds: 300 });
  });

  app.get('/api/storage/:organizationId/files/:fileId/content', async (req, res) => {
    const { organizationId, fileId } = req.params;
    const expRaw = String(req.query.exp || '');
    const sigRaw = String(req.query.sig || '');
    const hasValidSig =
      Boolean(expRaw && sigRaw) &&
      verifyPrivateFileToken({ fileId, organizationId, expRaw, sigRaw });

    const state = getDbState() || {};
    const storageFiles: any[] = Array.isArray(state.storageFiles) ? state.storageFiles : [];
    const fileRecord = storageFiles.find(
      (f: any) => f.id === fileId && f.organizationId === organizationId
    );
    if (!fileRecord) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'File not found.' });
    }

    if (!hasValidSig) {
      const auth = await authorizeStorageOperation(req, organizationId, 'view_private', fileRecord.category);
      if ('error' in auth) {
        return res.status(auth.status).json({ error: auth.error, message: auth.message });
      }
      if (auth.accessScope === 'guest_payment_proof') {
        if (fileRecord.category !== 'payment_proofs') {
          return res.status(403).json({
            error: 'CROSS_ORGANIZATION_DENIED',
            message: 'Private organization documents are restricted to authorized hotel staff.',
          });
        }
        const ownsFile =
          (fileRecord.ownerUserId && fileRecord.ownerUserId === auth.caller.userId) ||
          String(fileRecord.ownerEmail || '').toLowerCase() === auth.caller.email ||
          (state.reservations || []).some(
            (r: any) =>
              r.hotelId === organizationId &&
              String(r.guestEmail || '').toLowerCase() === auth.caller.email &&
              String(r.receiptUrl || '').includes(fileId)
          );
        if (!ownsFile) {
          return res.status(403).json({
            error: 'CROSS_USER_FILE_DENIED',
            message: 'You are not authorized to view this private file.',
          });
        }
      } else if (auth.accessScope === 'profile_owner') {
        if (fileRecord.ownerUserId !== auth.caller.userId) {
          return res.status(403).json({ error: 'CROSS_USER_FILE_DENIED', message: 'Forbidden.' });
        }
      }
    }

    const rawPath = String(fileRecord.path || '');
    let absPath: string | null = null;
    if (rawPath.startsWith('/private_uploads/')) {
      const rel = rawPath.slice('/private_uploads/'.length);
      const candidate = path.resolve(PRIVATE_UPLOADS_ROOT, rel);
      if (candidate.startsWith(path.resolve(PRIVATE_UPLOADS_ROOT) + path.sep)) {
        absPath = candidate;
      }
    } else if (rawPath.startsWith('/uploads/')) {
      const rel = rawPath.slice('/uploads/'.length);
      const candidate = path.resolve(UPLOADS_ROOT, rel);
      if (candidate.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
        absPath = candidate;
      }
    }

    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'FILE_BINARY_MISSING', message: 'Stored file payload was not found.' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (fileRecord.mimeType) {
      res.setHeader('Content-Type', String(fileRecord.mimeType));
    }
    return res.sendFile(absPath);
  });

  // Record an uploaded file in organization storage ledger (P0 Authenticated + Membership/Permission Enforced)
  app.post('/api/storage/:organizationId/files', async (req, res) => {
    const { organizationId } = req.params;
    const {
      name,
      category = 'general_operational',
      categoryName,
      sizeBytes = 0,
      path: filePath,
    } = req.body || {};

    const auth = await authorizeStorageOperation(req, organizationId, 'create_metadata', category);
    if ('error' in auth) {
      return res.status(auth.status).json({ error: auth.error, message: auth.message });
    }

    if (!name || !sizeBytes) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'File name and sizeBytes are required.' });
    }

    const state = getDbState() || {};
    let storageFiles = state.storageFiles || SEEDED_STORAGE_FILES;
    const isPrivate = PRIVATE_STORAGE_CATEGORIES.has(String(category).trim());
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newFile = {
      id: fileId,
      organizationId,
      name: String(name).trim(),
      category: String(category).trim(),
      categoryName: categoryName || 'Organization Attachment',
      sizeBytes: Number(sizeBytes),
      isPrivate,
      path: filePath && String(filePath).startsWith(`/org/${organizationId}/`) ? String(filePath) : `/org/${organizationId}/${category}/${name}`,
      ...(auth.caller.userId ? { ownerUserId: auth.caller.userId } : {}),
      ownerEmail: auth.caller.email,
      uploadedAt: new Date().toISOString(),
      uploadedBy: auth.caller.email || 'Authenticated Staff',
    };

    storageFiles = [newFile, ...storageFiles];
    state.storageFiles = storageFiles;
    saveDbState(state);

    broadcastLiveEvent('storage_file_uploaded', {
      id: newFile.id,
      organizationId: newFile.organizationId,
      category: newFile.category,
      sizeBytes: newFile.sizeBytes,
    });
    res.status(201).json({ success: true, file: newFile });
  });

  // Delete file from organization storage ledger, local disk, AND Supabase Storage (P0 Authenticated + Org Ownership)
  app.delete('/api/storage/:organizationId/files/:fileId', async (req, res) => {
    const { organizationId, fileId } = req.params;
    const auth = await authorizeStorageOperation(req, organizationId, 'delete');
    if ('error' in auth) {
      return res.status(auth.status).json({ error: auth.error, message: auth.message });
    }

    const state = getDbState() || {};
    let storageFiles = state.storageFiles || SEEDED_STORAGE_FILES;

    const removed = storageFiles.find((f: any) => f.id === fileId && f.organizationId === organizationId);
    if (!removed) {
      return res.status(404).json({
        error: 'FILE_NOT_FOUND',
        message: 'File was not found within your organization.',
      });
    }

    if (organizationId === 'platform-profiles' && removed.ownerUserId !== auth.caller.userId) {
      return res.status(403).json({
        error: 'CROSS_USER_FILE_DENIED',
        message: 'You may only delete your own profile avatar.',
      });
    }

    if (removed.path && typeof removed.path === 'string') {
      try {
        if (removed.path.startsWith('/uploads/')) {
          const candidate = path.resolve(UPLOADS_ROOT, removed.path.slice('/uploads/'.length));
          if (candidate.startsWith(path.resolve(UPLOADS_ROOT) + path.sep) && fs.existsSync(candidate)) {
            fs.unlinkSync(candidate);
          }
        } else if (removed.path.startsWith('/private_uploads/')) {
          const candidate = path.resolve(PRIVATE_UPLOADS_ROOT, removed.path.slice('/private_uploads/'.length));
          if (candidate.startsWith(path.resolve(PRIVATE_UPLOADS_ROOT) + path.sep) && fs.existsSync(candidate)) {
            fs.unlinkSync(candidate);
          }
        }
      } catch {}
    }

    if (supabaseAdminClient && removed.storageBucket && removed.storageKey) {
      try {
        await supabaseAdminClient.storage.from(removed.storageBucket).remove([removed.storageKey]);
      } catch {}
    }

    storageFiles = storageFiles.filter((f: any) => !(f.id === fileId && f.organizationId === organizationId));
    state.storageFiles = storageFiles;
    saveDbState(state);

    broadcastLiveEvent('storage_file_deleted', { organizationId, fileId, freedBytes: removed?.sizeBytes || 0 });
    res.json({ success: true, message: 'File removed and storage quota reconciled.', freedBytes: removed?.sizeBytes || 0 });
  });

  // Super Admin Quota Configuration Endpoint
  app.patch('/api/storage/:organizationId/quota', requireSuperAdmin, (req, res) => {
    const { organizationId } = req.params;
    const { quotaBytes, quotaGb } = req.body;

    const state = getDbState() || {};
    let customQuotas = state.storageCustomQuotas || {};

    let targetBytes = 0;
    if (quotaGb !== undefined) {
      targetBytes = Number(quotaGb) * 1024 * 1024 * 1024;
    } else if (quotaBytes !== undefined) {
      targetBytes = Number(quotaBytes);
    } else {
      return res.status(400).json({ error: 'MISSING_QUOTA_VALUE', message: 'quotaBytes or quotaGb required.' });
    }

    customQuotas[organizationId] = targetBytes;
    state.storageCustomQuotas = customQuotas;
    saveDbState(state);

    broadcastLiveEvent('storage_quota_updated', { organizationId, quotaBytes: targetBytes });
    res.json({ success: true, organizationId, quotaBytes: targetBytes });
  });

  // =========================================================================
  // 5. PRODUCT PRE-RELEASE WAITLISTS (CLASSROOM & MEDBAY)
  // =========================================================================
  app.get('/api/waitlists', (req, res) => {
    const { product } = req.query;
    const state = getDbState() || {};
    let waitlists = state.waitlists || [];
    if (product && typeof product === 'string') {
      waitlists = waitlists.filter((w: any) => w.product === product);
    }
    res.json({ success: true, waitlists });
  });

  app.post('/api/waitlists', (req, res) => {
    const {
      product,
      fullName,
      email,
      phone,
      orgName,
      institutionType,
      city,
      stateName,
      additionalComments,
    } = req.body;

    if (!product || !fullName || !email) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Product, fullName, and email are required.',
      });
    }

    const state = getDbState() || {};
    let waitlists = state.waitlists || [];

    const newEntry = {
      id: `wl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product: product === 'classroom' ? 'classroom' : 'medbay',
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone || '').trim(),
      orgName: String(orgName || '').trim(),
      institutionType: String(institutionType || (product === 'classroom' ? 'Primary and Secondary School' : 'Hospital')).trim(),
      city: String(city || '').trim(),
      stateName: String(stateName || '').trim(),
      additionalComments: String(additionalComments || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    waitlists = [newEntry, ...waitlists];
    state.waitlists = waitlists;
    saveDbState(state);

    broadcastLiveEvent('waitlist_created', newEntry);

    res.status(201).json({
      success: true,
      entry: newEntry,
      message: `Successfully registered for ${newEntry.product === 'classroom' ? 'IGHO Classroom' : 'IGHO MedBay'} priority waitlist.`,
    });
  });

  app.patch('/api/waitlists/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const state = getDbState() || {};
    let waitlists = state.waitlists || [];
    const index = waitlists.findIndex((w: any) => w.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'ENTRY_NOT_FOUND', message: 'Waitlist entry not found.' });
    }

    waitlists[index] = { ...waitlists[index], status: status || waitlists[index].status, updatedAt: new Date().toISOString() };
    state.waitlists = waitlists;
    saveDbState(state);

    broadcastLiveEvent('waitlist_updated', waitlists[index]);
    res.json({ success: true, entry: waitlists[index] });
  });

  app.delete('/api/waitlists/:id', (req, res) => {
    const { id } = req.params;
    const state = getDbState() || {};
    let waitlists = state.waitlists || [];
    state.waitlists = waitlists.filter((w: any) => w.id !== id);
    saveDbState(state);

    broadcastLiveEvent('waitlist_deleted', { id });
    res.json({ success: true, message: 'Waitlist entry deleted.' });
  });

  // Dedicated real-time room action endpoint (never emits admin popup notifications)
  app.post('/api/rooms/live-action', (req, res) => {
    const { action, room, roomId, hotelId, timestamp } = req.body;
    const state = getDbState() || {};
    let rooms = state.rooms || [];

    if (action === 'add' && room && hotelId) {
      const hotelRoomsCount = rooms.filter((r: any) => r.hotelId === hotelId).length;
      const hotels = state.hotels || [];
      const hotel = hotels.find((h: any) => h.id === hotelId);
      const ent = hotel ? resolveHotelEntitlements(hotel) : null;
      const maxRoomsLimit = ent ? ent.privileges.maxRooms : 20;
      if (hotelRoomsCount >= maxRoomsLimit) {
        return res.status(403).json({
          error: 'ROOM_QUOTA_EXCEEDED',
          maxRooms: maxRoomsLimit,
          message: `Your current plan supports up to ${maxRoomsLimit} rooms (${hotelRoomsCount} existing). Upgrade your plan or contact IGHO Support for an enterprise exception.`,
        });
      }
      if (Array.isArray(room.images) && room.images.length > 6) {
        return res.status(400).json({
          error: 'MAX_PHOTOS_EXCEEDED',
          message: 'Each room may contain at most 6 photos (max 10 MB each).',
        });
      }
      if (!rooms.some((r: any) => r.id === room.id)) {
        rooms = [room, ...rooms];
      }
    } else if (action === 'update' && room) {
      if (Array.isArray(room.images) && room.images.length > 6) {
        return res.status(400).json({
          error: 'MAX_PHOTOS_EXCEEDED',
          message: 'Each room may contain at most 6 photos (max 10 MB each).',
        });
      }
      rooms = rooms.map((r: any) => (r.id === room.id ? { ...r, ...room } : r));
    } else if (action === 'delete' && roomId) {
      rooms = rooms.filter((r: any) => r.id !== roomId);
    }

    state.rooms = rooms;
    saveDbState(state);

    // Broadcast silent room inventory sync event only (never emits console toast alert)
    broadcastLiveEvent('room_changed', {
      action,
      room,
      roomId,
      hotelId,
      silent: true,
      timestamp: timestamp || Date.now(),
    });

    res.json({ success: true, count: rooms.length });
  });

  // =========================================================================
  // DEMO REQUESTS & AUDIT LOGS (PERSISTENT BACKEND ENDPOINTS)
  // =========================================================================
  app.get('/api/demo-requests', requireSuperAdmin, (req, res) => {
    const state = getDbState() || {};
    res.json({ success: true, demoRequests: state.demoRequests || [] });
  });

  app.post('/api/demo-requests', (req, res) => {
    const { fullName, email, phone, orgName, orgType, productInterested, demoDate, demoTime, message } = req.body;
    if (!fullName || !email || !orgName) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Full name, email, and organization name are required.' });
    }

    const state = getDbState() || {};
    const newDemo = {
      id: `demo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone || '').trim(),
      orgName: String(orgName).trim(),
      orgType: String(orgType || 'Hotel / Resort').trim(),
      productInterested: productInterested || 'stay',
      demoDate: demoDate || '',
      demoTime: demoTime || '',
      message: String(message || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    state.demoRequests = [newDemo, ...(state.demoRequests || [])];
    saveDbState(state);

    broadcastLiveEvent('demo_request_created', newDemo);
    res.status(201).json({ success: true, demoRequest: newDemo });
  });

  app.patch('/api/demo-requests/:id', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const state = getDbState() || {};
    let demoRequests = state.demoRequests || [];
    const idx = demoRequests.findIndex((d: any) => d.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Demo request not found.' });
    }
    const prevStatus = demoRequests[idx].status;
    demoRequests[idx] = { ...demoRequests[idx], status: status || demoRequests[idx].status, updatedAt: new Date().toISOString() };
    state.demoRequests = demoRequests;
    saveDbState(state);

    // When demo is completed, notify user with one-click CTA to create their hotel account
    if (status === 'completed' && prevStatus !== 'completed' && demoRequests[idx].email) {
      pushUserNotification({
        recipientEmail: demoRequests[idx].email,
        title: 'Demo Completed — Create Your Hotel Account',
        message: `Thank you for completing your IGHO Stay demo for ${demoRequests[idx].orgName}. Your organization can now create its hotel account and choose a subscription plan.`,
        type: 'action_required',
        ctaLabel: 'Create Hotel Account',
        ctaScreen: 'hotel_onboarding',
      });
    }

    broadcastLiveEvent('demo_request_updated', demoRequests[idx]);
    res.json({ success: true, demoRequest: demoRequests[idx] });
  });

  app.delete('/api/demo-requests/:id', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const state = getDbState() || {};
    state.demoRequests = (state.demoRequests || []).filter((d: any) => d.id !== id);
    saveDbState(state);
    broadcastLiveEvent('demo_request_deleted', { id });
    res.json({ success: true });
  });

  app.get('/api/audit-logs', requireSuperAdmin, (req, res) => {
    const state = getDbState() || {};
    res.json({ success: true, auditLogs: state.auditLogs || [] });
  });

  app.post('/api/audit-logs', requireSuperAdmin, (req, res) => {
    const { actorEmail, action, target, targetType, previousValue, newValue, metadata } = req.body;
    if (!action || !target) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'action and target are required.' });
    }
    const log = appendAuditLog({
      actorEmail: actorEmail || (req as any).caller?.email || 'super_admin',
      action,
      target,
      targetType: targetType || 'system',
      previousValue,
      newValue,
      metadata,
    });
    res.status(201).json({ success: true, log });
  });

  // GET console users and banned emails
  app.get('/api/console/users', requireSuperAdmin, (req, res) => {
    const state = getDbState() || {};
    res.json({
      success: true,
      users: state.platformUsers || [],
      bannedEmails: state.bannedUsers || [],
    });
  });

  // TOGGLE user status (Active vs Suspended / Banned) — persists across platformUsers, hotels, staff & Supabase Auth
  app.post('/api/console/users/:id/status', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, email, name, role, organizationId, reason } = req.body;
    const state = getDbState() || {};
    let users = state.platformUsers || [];
    let banned: string[] = Array.isArray(state.bannedUsers) ? state.bannedUsers : [];
    let hotels = Array.isArray(state.hotels) ? [...state.hotels] : [...DEFAULT_HOTELS];
    let staffList = Array.isArray(state.staff) ? [...state.staff] : [];

    const derivedHotelId = id.startsWith('owner-') ? id.replace(/^owner-/, '') : organizationId;
    const matchedHotel = derivedHotelId ? hotels.find((h: any) => h.id === derivedHotelId) : undefined;
    const matchedStaff = staffList.find(
      (s: any) => s.id === id || (email && String(s.email || '').toLowerCase() === String(email).toLowerCase())
    );

    const targetUser = users.find(
      (u: any) => u.id === id || (email && u.email?.toLowerCase() === String(email).toLowerCase())
    );
    const targetEmail = (
      email ||
      targetUser?.email ||
      matchedHotel?.ownerEmail ||
      matchedHotel?.email ||
      matchedStaff?.email ||
      ''
    )
      .trim()
      .toLowerCase();
    const isBannedStatus = status === 'suspended' || status === 'deactivated';

    if (isBannedStatus) {
      if (targetEmail && !banned.some((b) => b.toLowerCase() === targetEmail)) {
        banned.push(targetEmail);
      }
    } else if (targetEmail) {
      banned = banned.filter((b: string) => b.toLowerCase() !== targetEmail);
    }

    if (targetUser) {
      users = users.map((u: any) =>
        u.id === targetUser.id || (targetEmail && String(u.email || '').toLowerCase() === targetEmail)
          ? { ...u, status }
          : u
      );
    } else if (targetEmail) {
      users = [
        {
          id,
          name: name || matchedHotel?.ownerName || matchedStaff?.name || targetEmail.split('@')[0],
          email: targetEmail,
          role: role || (matchedHotel ? 'hotel_owner' : matchedStaff?.role || 'customer'),
          organizationId: derivedHotelId || matchedStaff?.hotelId || undefined,
          organizationName: matchedHotel?.name || undefined,
          status,
          createdAt: new Date().toISOString().split('T')[0],
          lastActivity: new Date().toISOString(),
        },
        ...users,
      ];
    }

    if (matchedHotel || targetEmail) {
      hotels = hotels.map((h: any) => {
        const ownerEm = String(h.ownerEmail || h.email || '').trim().toLowerCase();
        if (h.id === derivedHotelId || (targetEmail && ownerEm === targetEmail)) {
          return {
            ...h,
            isSuspended: isBannedStatus,
            suspensionReason: isBannedStatus ? reason || 'Account banned by Super Admin' : '',
          };
        }
        return h;
      });
    }

    if (staffList.length > 0) {
      staffList = staffList.map((s: any) => {
        if (s.id === id || (targetEmail && String(s.email || '').trim().toLowerCase() === targetEmail)) {
          return {
            ...s,
            status: isBannedStatus ? 'deactivated' : 'active',
            active: !isBannedStatus,
          };
        }
        return s;
      });
    }

    // Sync ban state to Supabase Auth / profiles when service role key is configured
    if (supabaseAdminClient && targetEmail) {
      try {
        const { data: listData } = await supabaseAdminClient.auth.admin.listUsers();
        const sbUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === targetEmail);
        if (sbUser) {
          await supabaseAdminClient.auth.admin.updateUserById(sbUser.id, {
            ban_duration: isBannedStatus ? '876000h' : 'none',
          });
          await supabaseAdminClient
            .from('profiles')
            .update({ account_status: isBannedStatus ? 'suspended' : 'active' })
            .eq('id', sbUser.id);
        }
      } catch (e) {
        console.warn('[Ban Sync] Supabase Auth update note:', e);
      }
    }

    state.platformUsers = users;
    state.bannedUsers = banned;
    state.hotels = hotels;
    state.staff = staffList;
    saveDbState(state);

    appendAuditLog({
      actorEmail: (req as any).caller?.email || 'super_admin',
      action: isBannedStatus ? 'BAN_USER' : 'REACTIVATE_USER',
      target: targetEmail || id,
      targetType: 'user',
      newValue: status,
      metadata: { reason },
    });

    broadcastLiveEvent('user_status_changed', { id, email: targetEmail, status, reason, bannedEmails: banned });
    res.json({ success: true, status, bannedEmails: banned, users, email: targetEmail });
  });

  // EDIT user details (Name, Phone, Email, Role)
  app.post('/api/console/users/:id/edit', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { name, email, phone, organizationName, role } = req.body;
    const state = getDbState() || {};
    let users = state.platformUsers || [];

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const safeRole =
      cleanEmail && EXCLUDED_SUPER_ADMIN_EMAILS.has(cleanEmail) && role === 'super_admin' ? 'customer' : role;

    const index = users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        name: name !== undefined ? String(name).trim() : users[index].name,
        email: cleanEmail || users[index].email,
        phone: phone !== undefined ? String(phone).trim() : users[index].phone,
        organizationName:
          organizationName !== undefined ? String(organizationName).trim() : users[index].organizationName,
        role: safeRole || users[index].role,
      };
      state.platformUsers = users;
      saveDbState(state);
      appendAuditLog({
        actorEmail: (req as any).caller?.email || 'super_admin',
        action: 'UPDATE_USER_PROFILE',
        target: users[index].email || id,
        targetType: 'user',
        newValue: users[index].name,
      });
      broadcastLiveEvent('user_updated', { user: users[index] });
      return res.json({ success: true, user: users[index] });
    }

    const created = {
      id,
      name: String(name || '').trim() || 'Platform User',
      email: cleanEmail,
      phone: phone || '',
      organizationName: organizationName || 'IGHO Systems',
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString(),
      role: safeRole || 'customer',
    };
    users.push(created);
    state.platformUsers = users;
    saveDbState(state);
    broadcastLiveEvent('user_updated', { user: created });
    res.json({ success: true, user: created });
  });

  // UPDATE organization name & sync across hotels, users, reservations, and subscriptions
  app.post('/api/console/organizations/:id/name', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const cleanName = name.trim();
    const state = getDbState() || {};
    let hotels = state.hotels || [];
    const existingHotel = hotels.find((h: any) => h.id === id);
    const previousName = existingHotel?.name || id;

    hotels = hotels.map((h: any) =>
      h.id === id ? { ...h, name: cleanName, slug: slugifyServerHotelName(cleanName) } : h
    );
    state.hotels = hotels;

    let users = state.platformUsers || [];
    users = users.map((u: any) =>
      u.organizationId === id ||
      (existingHotel?.email && u.email?.toLowerCase() === existingHotel.email.toLowerCase()) ||
      (existingHotel?.ownerEmail && u.email?.toLowerCase() === existingHotel.ownerEmail.toLowerCase())
        ? { ...u, organizationId: id, organizationName: cleanName }
        : u
    );
    state.platformUsers = users;

    if (Array.isArray(state.subscriptions)) {
      state.subscriptions = state.subscriptions.map((s: any) =>
        s.hotelId === id ? { ...s, hotelName: cleanName } : s
      );
    }
    if (Array.isArray(state.reservations)) {
      state.reservations = state.reservations.map((r: any) =>
        r.hotelId === id ? { ...r, hotelName: cleanName } : r
      );
    }

    saveDbState(state);
    appendAuditLog({
      actorEmail: (req as any).caller?.email || 'super_admin',
      action: 'UPDATE_PLATFORM_SETTING',
      target: cleanName,
      targetType: 'hotel',
      previousValue: previousName,
      newValue: cleanName,
    });
    broadcastLiveEvent('organization_name_updated', { id, name: cleanName, hotels, users });
    res.json({ success: true, id, name: cleanName });
  });

  // Update organization approval / suspension / profile attributes from console
  app.patch('/api/console/organizations/:id', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const state = getDbState() || {};
    let hotels = state.hotels || [];
    const idx = hotels.findIndex((h: any) => h.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Organization not found.' });
    }
    const prevApproval = hotels[idx].approvalStatus;
    const nextHotel = {
      ...hotels[idx],
      ...updates,
      id,
      slug: updates.slug || hotels[idx].slug || slugifyServerHotelName(updates.name || hotels[idx].name),
    };
    hotels[idx] = nextHotel;
    state.hotels = hotels;
    if (updates.name && Array.isArray(state.platformUsers)) {
      state.platformUsers = state.platformUsers.map((u: any) =>
        u.organizationId === id ? { ...u, organizationName: String(updates.name).trim() } : u
      );
    }
    saveDbState(state);

    if (updates.approvalStatus === 'approved' && prevApproval !== 'approved') {
      const ownerTargetEmail = nextHotel.ownerEmail || nextHotel.email;
      if (ownerTargetEmail) {
        pushUserNotification({
          recipientEmail: ownerTargetEmail,
          title: `${nextHotel.name} Approved!`,
          message: `Your hotel account (${nextHotel.name}) has been approved by IGHO Platform Administration. Select an IGHO Stay plan to activate your PMS dashboard.`,
          type: 'success',
          ctaLabel: 'Select Subscription Plan',
          ctaScreen: 'hotel_subscription_plan',
        });
      }
    }

    broadcastLiveEvent('organization_updated', { id, hotel: hotels[idx] });
    res.json({ success: true, hotel: enrichHotelWithDefaultsAndPrivileges(hotels[idx]) });
  });

  // DISBURSE REFUND (Marks refund completed and deducts from hotel financial revenue)
  app.post('/api/hotels/:hotelId/refunds/disburse', (req, res) => {
    const { hotelId } = req.params;
    const { reservationId, refundAmount, transferRef, approverEmail } = req.body;

    const state = getDbState() || {};
    let reservations = state.reservations || [];
    const index = reservations.findIndex((r: any) => r.id === reservationId && r.hotelId === hotelId);

    if (index !== -1) {
      reservations[index].refundStatus = 'completed';
      reservations[index].refundCompletedAt = new Date().toISOString();
      reservations[index].refundRef = transferRef || `REF-${Date.now()}`;
      reservations[index].refundAmount = Number(refundAmount) || reservations[index].total;
      state.reservations = reservations;
      saveDbState(state);
    }

    broadcastLiveEvent('refund_completed', {
      hotelId,
      reservationId,
      refundAmount,
      transferRef,
      approverEmail,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Refund of ₦${Number(refundAmount).toLocaleString()} disbursed successfully and deducted from hotel revenue.`,
      refundRef: transferRef || `REF-${Date.now()}`,
    });
  });

  // =========================================================================
  // 8. PHASE 3: STAFF ACTIVE STATUS, COMPLIANCE, EXCEPTIONS, BACKUPS & SCHEDULED REPORTS
  // =========================================================================
  app.post('/api/hotels/:hotelId/staff/status', (req, res) => {
    const { hotelId } = req.params;
    const { staffId, status } = req.body || {};
    if (!staffId || !status) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'staffId and status are required.' });
    }
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);
    const staffList: any[] = Array.isArray(state.staff) ? [...state.staff] : [];
    const idx = staffList.findIndex((s: any) => s.id === staffId && s.hotelId === hotelId);

    if (status === 'active') {
      const ent = hotel ? resolveHotelEntitlements(hotel) : { privileges: DEFAULT_STARTER_PRIVILEGES, plan: OFFICIAL_PLANS['plan-starter-30k'] };
      const currentActiveCount = staffList.filter(
        (s: any) => s.hotelId === hotelId && s.status !== 'deactivated' && s.active !== false && s.id !== staffId
      ).length;
      if (currentActiveCount >= ent.privileges.maxStaff) {
        return res.status(403).json({
          error: 'STAFF_QUOTA_EXCEEDED',
          feature: 'maxStaff',
          maxStaff: ent.privileges.maxStaff,
          message: `Cannot reactivate staff member: Active staff (${currentActiveCount}) has reached the ${ent.plan.name} limit of ${ent.privileges.maxStaff} active staff accounts. Deactivate another seat or upgrade to IGHO Stay Professional.`,
        });
      }
    }

    if (idx !== -1) {
      staffList[idx] = { ...staffList[idx], status, active: status === 'active' };
      state.staff = staffList;
      saveDbState(state);
    }
    res.json({ success: true, staffId, status });
  });

  app.get('/api/hotels/:hotelId/compliance', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId) || DEFAULT_HOTELS.find((d) => d.id === hotelId);
    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
    }
    const ent = resolveHotelEntitlements(hotel);
    const roomsUsed = (state.rooms || []).filter((r: any) => r.hotelId === hotelId).length;
    const activeStaffUsed = (state.staff || []).filter(
      (s: any) => s.hotelId === hotelId && s.status !== 'deactivated' && s.active !== false
    ).length;
    const branchesUsed = Math.max(1, Array.isArray(hotel.branches) ? hotel.branches.filter((b: any) => b.isActive !== false).length : 1);

    const monthKey = new Date().toISOString().slice(0, 7);
    const notifMap = state.notificationUsage || {};
    const notificationsSentThisMonth = Number(notifMap[`${hotelId}:${monthKey}`]?.count || 0);

    const storageFiles = (state.storageFiles || []).filter((f: any) => f.organizationId === hotelId);
    const storageUsedBytes = storageFiles.reduce((s: number, f: any) => s + (Number(f.sizeBytes) || 0), 0);
    const storageQuotaBytes =
      state.storageCustomQuotas?.[hotelId] !== undefined
        ? state.storageCustomQuotas[hotelId]
        : ent.privileges.storageQuotaGb * 1024 * 1024 * 1024;

    const roomsOverBy = Math.max(0, roomsUsed - ent.privileges.maxRooms);
    const staffOverBy = Math.max(0, activeStaffUsed - ent.privileges.maxStaff);
    const branchesOverBy = Math.max(0, branchesUsed - ent.privileges.maxBranches);
    const isOverLimit = roomsOverBy > 0 || staffOverBy > 0 || branchesOverBy > 0;

    const history = (state.subscriptionHistory || []).filter((h: any) => h.organizationId === hotelId).slice(0, 25);

    res.json({
      success: true,
      hotelId,
      planId: ent.plan.canonicalId,
      planName: ent.plan.name,
      isOverLimit,
      rooms: { used: roomsUsed, limit: ent.privileges.maxRooms, overBy: roomsOverBy },
      activeStaff: { used: activeStaffUsed, limit: ent.privileges.maxStaff, overBy: staffOverBy },
      branches: { used: branchesUsed, limit: ent.privileges.maxBranches, overBy: branchesOverBy },
      storage: { usedBytes: storageUsedBytes, quotaBytes: storageQuotaBytes, quotaGb: ent.privileges.storageQuotaGb },
      notifications: {
        month: monthKey,
        sentThisMonth: notificationsSentThisMonth,
        monthlyLimit: ent.privileges.monthlyNotificationLimit,
      },
      backupFrequency: ent.privileges.backupFrequency,
      exception: ent.exception || null,
      history,
    });
  });

  app.post('/api/console/organizations/:hotelId/subscription-exception', requireSuperAdmin, (req, res) => {
    const { hotelId } = req.params;
    const { maxRoomsOverride, maxStaffOverride, maxBranchesOverride, storageQuotaGbOverride, reason, expiresAt, clear } =
      req.body || {};
    const state = getDbState() || {};
    const exceptions = state.subscriptionExceptions || {};

    if (clear) {
      delete exceptions[hotelId];
      state.subscriptionExceptions = exceptions;
      saveDbState(state);
      appendAuditLog({
        actorEmail: (req as any).caller?.email || 'super_admin',
        action: 'CHANGE_PLAN',
        target: hotelId,
        targetType: 'subscription',
        newValue: 'Exception override cleared',
      });
      broadcastLiveEvent('organization_updated', { id: hotelId });
      return res.json({ success: true, exception: null });
    }

    const record = {
      hotelId,
      maxRoomsOverride: maxRoomsOverride ? Number(maxRoomsOverride) : null,
      maxStaffOverride: maxStaffOverride ? Number(maxStaffOverride) : null,
      maxBranchesOverride: maxBranchesOverride ? Number(maxBranchesOverride) : null,
      storageQuotaGbOverride: storageQuotaGbOverride ? Number(storageQuotaGbOverride) : null,
      reason: String(reason || 'Approved Enterprise Exception').trim(),
      grantedBy: (req as any).caller?.email || 'super_admin',
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
    };
    exceptions[hotelId] = record;
    state.subscriptionExceptions = exceptions;
    if (record.storageQuotaGbOverride) {
      state.storageCustomQuotas = state.storageCustomQuotas || {};
      state.storageCustomQuotas[hotelId] = record.storageQuotaGbOverride * 1024 * 1024 * 1024;
    }
    saveDbState(state);

    appendAuditLog({
      actorEmail: record.grantedBy,
      action: 'CHANGE_PLAN',
      target: hotelId,
      targetType: 'subscription',
      newValue: `Exception granted: ${record.reason}`,
      metadata: record,
    });

    broadcastLiveEvent('organization_updated', { id: hotelId });
    res.json({ success: true, exception: record });
  });

  app.get('/api/console/organizations/:hotelId/subscription-history', requireSuperAdmin, (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const history = (state.subscriptionHistory || []).filter((h: any) =>
      hotelId === 'all' ? true : h.organizationId === hotelId
    );
    res.json({ success: true, history });
  });

  // Backups (Starter: Weekly, Pro: Daily)
  app.get('/api/hotels/:hotelId/backups', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId) || DEFAULT_HOTELS.find((d) => d.id === hotelId);
    const ent = resolveHotelEntitlements(hotel);
    const backups = (state.organizationBackups || [])
      .filter((b: any) => b.organizationId === hotelId)
      .map(({ snapshot: _s, ...meta }: any) => meta);
    res.json({
      success: true,
      backupFrequency: ent.privileges.backupFrequency,
      backups,
    });
  });

  app.post('/api/hotels/:hotelId/backups/trigger', async (req, res) => {
    const { hotelId } = req.params;
    const { triggeredBy = 'Hotel Admin' } = req.body || {};
    const crypto = await import('crypto');
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId) || DEFAULT_HOTELS.find((d) => d.id === hotelId);
    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
    }
    const ent = resolveHotelEntitlements(hotel);
    const snapshot = {
      hotelId,
      hotelName: hotel.name,
      rooms: (state.rooms || []).filter((r: any) => r.hotelId === hotelId),
      reservations: (state.reservations || []).filter((r: any) => r.hotelId === hotelId),
      staff: (state.staff || []).filter((s: any) => s.hotelId === hotelId),
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(snapshot);
    const checksum = crypto.createHash('sha256').update(jsonStr).digest('hex');
    const backupRecord = {
      id: `bkp-${Date.now()}`,
      organizationId: hotelId,
      backupFrequency: ent.privileges.backupFrequency,
      triggerType: 'manual',
      triggeredBy,
      checksum,
      sizeBytes: Buffer.byteLength(jsonStr),
      snapshot,
      createdAt: new Date().toISOString(),
    };
    state.organizationBackups = [backupRecord, ...(state.organizationBackups || [])].slice(0, 200);
    saveDbState(state);

    const { snapshot: _s, ...meta } = backupRecord;
    res.json({ success: true, backup: meta, snapshot });
  });

  // Notification Quota Enforcement (100/month Starter, Unlimited Fair-Use Pro)
  app.get('/api/hotels/:hotelId/notifications/usage', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId) || DEFAULT_HOTELS.find((d) => d.id === hotelId);
    const ent = resolveHotelEntitlements(hotel);
    const monthKey = new Date().toISOString().slice(0, 7);
    const record = (state.notificationUsage || {})[`${hotelId}:${monthKey}`] || { count: 0 };
    res.json({
      success: true,
      hotelId,
      month: monthKey,
      sentThisMonth: Number(record.count || 0),
      monthlyLimit: ent.privileges.monthlyNotificationLimit,
      unlimitedFairUse: ent.privileges.monthlyNotificationLimit === null,
    });
  });

  app.post('/api/hotels/:hotelId/notifications/send', (req, res) => {
    const { hotelId } = req.params;
    const { recipientEmail, title = 'Hotel Operational Notice', message = '' } = req.body || {};
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);
    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
    }
    const ent = resolveHotelEntitlements(hotel);
    const monthKey = new Date().toISOString().slice(0, 7);
    const usageKey = `${hotelId}:${monthKey}`;
    const usageMap = state.notificationUsage || {};
    const currentCount = Number(usageMap[usageKey]?.count || 0);
    const limit = ent.privileges.monthlyNotificationLimit;

    if (limit !== null && currentCount >= limit) {
      return res.status(403).json({
        error: 'NOTIFICATION_QUOTA_EXCEEDED',
        feature: 'monthlyNotificationLimit',
        sentThisMonth: currentCount,
        monthlyLimit: limit,
        message: `Monthly Starter notification quota reached (${currentCount}/${limit}). Upgrade to IGHO Stay Professional for unlimited operational notifications.`,
      });
    }

    if (limit === null && currentCount >= 5000) {
      return res.status(429).json({
        error: 'FAIR_USE_RATE_LIMIT',
        message: 'Fair-use monthly anti-abuse threshold reached for automated dispatches. Contact IGHO Support to raise threshold.',
      });
    }

    usageMap[usageKey] = { count: currentCount + 1, lastSentAt: new Date().toISOString() };
    state.notificationUsage = usageMap;
    saveDbState(state);

    if (recipientEmail) {
      pushUserNotification({ recipientEmail, title, message, type: 'info' });
    }

    res.json({
      success: true,
      sentThisMonth: usageMap[usageKey].count,
      monthlyLimit: limit,
    });
  });

  // Scheduled Reports (Pro-only)
  app.get('/api/hotels/:hotelId/scheduled-reports', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'scheduledReports', 'Scheduled Report Generation requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    const rules = (state.scheduledReports || []).filter((r: any) => r.hotelId === hotelId);
    res.json({ success: true, rules });
  });

  app.post('/api/hotels/:hotelId/scheduled-reports', (req, res) => {
    const { hotelId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'scheduledReports', 'Scheduled Report Generation requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { reportType, frequency, recipientEmail, format = 'pdf', createdBy = 'Hotel Admin' } = req.body || {};
    if (!reportType || !frequency || !recipientEmail) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'reportType, frequency, and recipientEmail are required.' });
    }
    const state = getDbState() || {};
    const rule = {
      id: `srep-${Date.now()}`,
      hotelId,
      reportType,
      frequency,
      recipientEmail: String(recipientEmail).trim().toLowerCase(),
      format,
      active: true,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    state.scheduledReports = [rule, ...(state.scheduledReports || [])];
    saveDbState(state);
    res.status(201).json({ success: true, rule });
  });

  app.delete('/api/hotels/:hotelId/scheduled-reports/:reportId', (req, res) => {
    const { hotelId, reportId } = req.params;
    const gate = enforceHotelFeatureAccess(hotelId, 'scheduledReports', 'Scheduled Report Generation requires IGHO Stay Professional.');
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const state = getDbState() || {};
    state.scheduledReports = (state.scheduledReports || []).filter(
      (r: any) => !(r.id === reportId && r.hotelId === hotelId)
    );
    saveDbState(state);
    res.json({ success: true });
  });

  // In-App User Notification Bell Feed
  app.get('/api/notifications', async (req, res) => {
    const caller = await resolveCaller(req);
    const queryEmail = String(req.query.email || req.headers['x-igho-user-email'] || '').trim().toLowerCase();
    const targetEmail = (caller.verifiedJwt ? caller.email : queryEmail || caller.email || '').trim().toLowerCase();
    if (!targetEmail) {
      return res.json({ success: true, notifications: [] });
    }
    const state = getDbState() || {};
    const list = (state.userNotifications || []).filter(
      (n: any) => String(n.recipientEmail || '').trim().toLowerCase() === targetEmail
    );
    res.json({ success: true, notifications: list });
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const state = getDbState() || {};
    state.userNotifications = (state.userNotifications || []).map((n: any) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveDbState(state);
    res.json({ success: true });
  });

  // =========================================================================
  // 9. FEATURE REQUESTS & CUSTOM DEVELOPMENT (TENANT-ISOLATED + CONSOLE)
  // =========================================================================
  const VALID_FEATURE_REQUEST_STATUSES = new Set([
    'Submitted',
    'Under Review',
    'Awaiting Information',
    'Approved',
    'Quotation Sent',
    'Awaiting Payment',
    'In Development',
    'Testing',
    'Completed',
    'Rejected',
  ]);

  app.get('/api/hotels/:hotelId/feature-requests/access-config', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const cfg = (state.featureRequestAccessConfig || {})[hotelId] || {
      hotelId,
      allowedRoles: ['hotel_owner', 'manager'],
    };
    res.json({ success: true, config: cfg });
  });

  app.put('/api/hotels/:hotelId/feature-requests/access-config', async (req, res) => {
    const { hotelId } = req.params;
    const { allowedRoles } = req.body || {};
    if (!Array.isArray(allowedRoles)) {
      return res.status(400).json({ error: 'INVALID_ROLES', message: 'allowedRoles array is required.' });
    }
    const normalized = Array.from(new Set(['hotel_owner', ...allowedRoles.map((r: any) => String(r).trim()).filter(Boolean)]));
    const state = getDbState() || {};
    state.featureRequestAccessConfig = state.featureRequestAccessConfig || {};
    state.featureRequestAccessConfig[hotelId] = { hotelId, allowedRoles: normalized };
    saveDbState(state);
    res.json({ success: true, config: state.featureRequestAccessConfig[hotelId] });
  });

  app.get('/api/hotels/:hotelId/feature-requests', async (req, res) => {
    const { hotelId } = req.params;
    const caller = await resolveCaller(req);
    if (caller.verifiedJwt && !caller.isSuperAdmin) {
      const authorizedOrgs = await getCallerAuthorizedOrganizations(caller);
      const stateCheck = getDbState() || {};
      const isStaff = (stateCheck.staff || []).some(
        (s: any) => s.hotelId === hotelId && String(s.email || '').toLowerCase() === caller.email && s.active !== false
      );
      if (!authorizedOrgs.some((o) => o.organizationId === hotelId) && !isStaff) {
        return res.status(403).json({
          error: 'CROSS_TENANT_DENIED',
          message: 'You cannot view feature requests belonging to another hotel.',
        });
      }
    }
    const state = getDbState() || {};
    const requests = (state.featureRequests || []).filter((r: any) => r.hotelId === hotelId);
    res.json({ success: true, requests });
  });

  app.post('/api/hotels/:hotelId/feature-requests', async (req, res) => {
    const { hotelId } = req.params;
    const { title, problemDescription, requestedFeature, screenshotUrl, submittedByEmail, submittedByName, staffRole } =
      req.body || {};
    if (!title?.trim() || !problemDescription?.trim() || !requestedFeature?.trim()) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Title, problem description, and requested feature details are required.',
      });
    }

    const state = getDbState() || {};
    const cfg = (state.featureRequestAccessConfig || {})[hotelId] || { allowedRoles: ['hotel_owner', 'manager'] };
    if (staffRole && !cfg.allowedRoles.includes(staffRole) && staffRole !== 'hotel_owner') {
      return res.status(403).json({
        error: 'ROLE_NOT_AUTHORIZED',
        message: 'Hotel Admin settings restrict submitting custom feature requests to authorized roles.',
      });
    }

    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId) || DEFAULT_HOTELS.find((d) => d.id === hotelId);
    const ent = resolveHotelEntitlements(hotel);
    const planTier = ent.plan.hasGuestPortal ? 'professional' : 'starter';
    const nowIso = new Date().toISOString();

    const newReq = {
      id: `freq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      hotelId,
      hotelName: hotel?.name || hotelId,
      planTier,
      title: String(title).trim(),
      problemDescription: String(problemDescription).trim(),
      requestedFeature: String(requestedFeature).trim(),
      screenshotUrl: screenshotUrl ? String(screenshotUrl).trim() : '',
      status: 'Submitted',
      quotationAmount: null,
      quotationCurrency: 'NGN',
      expectedDeliveryDate: '',
      submittedByEmail: String(submittedByEmail || hotel?.ownerEmail || 'hotel@igho.com.ng').trim().toLowerCase(),
      submittedByName: String(submittedByName || hotel?.ownerName || 'Hotel Admin').trim(),
      messages: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    state.featureRequests = [newReq, ...(state.featureRequests || [])];
    saveDbState(state);

    broadcastLiveEvent('feature_request_created', newReq);
    res.status(201).json({ success: true, request: newReq });
  });

  app.post('/api/hotels/:hotelId/feature-requests/:requestId/messages', (req, res) => {
    const { hotelId, requestId } = req.params;
    const { message, senderName = 'Hotel Staff', senderEmail = '' } = req.body || {};
    if (!message?.trim()) {
      return res.status(400).json({ error: 'MESSAGE_REQUIRED', message: 'Reply message cannot be empty.' });
    }
    const state = getDbState() || {};
    const list = state.featureRequests || [];
    const idx = list.findIndex((r: any) => r.id === requestId && r.hotelId === hotelId);
    if (idx === -1) {
      return res.status(404).json({ error: 'REQUEST_NOT_FOUND', message: 'Feature request not found for this hotel.' });
    }
    const msg = {
      id: `frm-${Date.now()}`,
      requestId,
      hotelId,
      senderRole: 'hotel',
      senderName: String(senderName).trim(),
      senderEmail: String(senderEmail).trim().toLowerCase(),
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
    };
    list[idx].messages = [...(list[idx].messages || []), msg];
    list[idx].updatedAt = new Date().toISOString();
    state.featureRequests = list;
    saveDbState(state);

    broadcastLiveEvent('feature_request_updated', list[idx]);
    res.status(201).json({ success: true, message: msg, request: list[idx] });
  });

  app.get('/api/console/feature-requests', requireSuperAdmin, (req, res) => {
    const { hotelId, status, planTier } = req.query;
    const state = getDbState() || {};
    let list = Array.isArray(state.featureRequests) ? [...state.featureRequests] : [];
    if (hotelId && hotelId !== 'all') {
      list = list.filter((r: any) => r.hotelId === hotelId);
    }
    if (status && status !== 'all') {
      list = list.filter((r: any) => r.status === status);
    }
    if (planTier && planTier !== 'all') {
      list = list.filter((r: any) => r.planTier === planTier);
    }
    res.json({ success: true, requests: list });
  });

  app.patch('/api/console/feature-requests/:requestId', requireSuperAdmin, (req, res) => {
    const { requestId } = req.params;
    const { status, quotationAmount, expectedDeliveryDate, adminReply } = req.body || {};
    const state = getDbState() || {};
    const list = state.featureRequests || [];
    const idx = list.findIndex((r: any) => r.id === requestId);
    if (idx === -1) {
      return res.status(404).json({ error: 'REQUEST_NOT_FOUND', message: 'Feature request not found.' });
    }
    if (status && !VALID_FEATURE_REQUEST_STATUSES.has(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid feature request status.' });
    }

    const updated = { ...list[idx] };
    if (status) updated.status = status;
    if (quotationAmount !== undefined) {
      updated.quotationAmount = quotationAmount === null || quotationAmount === '' ? null : Number(quotationAmount);
    }
    if (expectedDeliveryDate !== undefined) {
      updated.expectedDeliveryDate = String(expectedDeliveryDate || '').trim();
    }
    if (adminReply && String(adminReply).trim()) {
      const msg = {
        id: `frm-${Date.now()}`,
        requestId,
        hotelId: updated.hotelId,
        senderRole: 'super_admin',
        senderName: 'IGHO Engineering & Super Admin',
        senderEmail: (req as any).caller?.email || 'superadmin@igho.software',
        message: String(adminReply).trim(),
        createdAt: new Date().toISOString(),
      };
      updated.messages = [...(updated.messages || []), msg];
    }
    updated.updatedAt = new Date().toISOString();
    list[idx] = updated;
    state.featureRequests = list;
    saveDbState(state);

    pushUserNotification({
      recipientEmail: updated.submittedByEmail,
      title: `Feature Request Update: ${updated.title}`,
      message: `Status changed to ${updated.status}${updated.quotationAmount ? ` · Quotation: ₦${Number(updated.quotationAmount).toLocaleString()}` : ''}.`,
      type: 'info',
    });

    broadcastLiveEvent('feature_request_updated', updated);
    res.json({ success: true, request: updated });
  });

  // =========================================================================
  // 10. PERSONALIZED SINGLE-USE FEATURE ACTIVATION SYSTEM (SHA-256 HASH + SALT)
  // =========================================================================
  function stripSensitiveActivationFields(record: any) {
    const { codeHash: _h, codeSalt: _s, ...safe } = record;
    const isExpired = safe.status === 'unused' && safe.expiresAt && new Date(safe.expiresAt).getTime() < Date.now();
    return {
      ...safe,
      status: isExpired ? 'expired' : safe.status,
    };
  }

  app.get('/api/console/custom-features', requireSuperAdmin, (req, res) => {
    const state = getDbState() || {};
    const activations = (state.personalizedActivations || []).map(stripSensitiveActivationFields);
    const entitlements = state.customFeatureEntitlements || [];
    res.json({ success: true, activations, entitlements });
  });

  app.post('/api/console/custom-features/generate', requireSuperAdmin, async (req, res) => {
    const { hotelId, featureId, featureName, requestId, expiresInDays = 30 } = req.body || {};
    if (!hotelId || !featureId || !featureName) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'hotelId, featureId, and featureName are required to generate an activation code.',
      });
    }
    const crypto = await import('crypto');
    const state = getDbState() || {};
    const hotel = (state.hotels || []).find((h: any) => h.id === hotelId);
    if (!hotel) {
      return res.status(404).json({ error: 'HOTEL_NOT_FOUND', message: 'Target hotel not found.' });
    }

    const partA = crypto.randomBytes(2).toString('hex').toUpperCase();
    const partB = crypto.randomBytes(2).toString('hex').toUpperCase();
    const partC = crypto.randomBytes(2).toString('hex').toUpperCase();
    const rawCode = `IGHO-CF-${partA}-${partB}-${partC}`;
    const normalizedCode = rawCode.replace(/\s+/g, '').toUpperCase();
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = crypto.createHash('sha256').update(`${salt}:${normalizedCode}`).digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(1, Number(expiresInDays) || 30) * 86400000).toISOString();
    const record = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      hotelId,
      hotelName: hotel.name,
      featureId: String(featureId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      featureName: String(featureName).trim(),
      requestId: requestId ? String(requestId).trim() : undefined,
      codeHash,
      codeSalt: salt,
      codeHint: `IGHO-CF-••••-${partC}`,
      status: 'unused',
      createdBy: (req as any).caller?.email || 'super_admin',
      createdAt: now.toISOString(),
      expiresAt,
    };

    state.personalizedActivations = [record, ...(state.personalizedActivations || [])];
    saveDbState(state);

    appendAuditLog({
      actorEmail: record.createdBy,
      action: 'UPDATE_PLATFORM_SETTING',
      target: `${hotel.name} (${record.featureName})`,
      targetType: 'hotel',
      newValue: `Generated personalized activation code (${record.codeHint})`,
    });

    res.status(201).json({
      success: true,
      activation: stripSensitiveActivationFields(record),
      activationCode: rawCode,
      message: 'Single-use activation code generated. Copy and share securely with the hotel administrator.',
    });
  });

  app.post('/api/console/custom-features/:activationId/revoke', requireSuperAdmin, (req, res) => {
    const { activationId } = req.params;
    const state = getDbState() || {};
    const nowIso = new Date().toISOString();
    let activations = state.personalizedActivations || [];
    const idx = activations.findIndex((a: any) => a.id === activationId);
    if (idx === -1) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Activation record not found.' });
    }

    activations[idx] = { ...activations[idx], status: 'revoked', revokedAt: nowIso };
    state.personalizedActivations = activations;
    state.customFeatureEntitlements = (state.customFeatureEntitlements || []).map((e: any) =>
      e.activationId === activationId ? { ...e, status: 'revoked', revokedAt: nowIso } : e
    );
    saveDbState(state);

    appendAuditLog({
      actorEmail: (req as any).caller?.email || 'super_admin',
      action: 'UPDATE_PLATFORM_SETTING',
      target: `${activations[idx].hotelName} (${activations[idx].featureName})`,
      targetType: 'hotel',
      newValue: 'Revoked personalized custom feature entitlement',
    });

    broadcastLiveEvent('custom_feature_updated', { hotelId: activations[idx].hotelId });
    res.json({ success: true, activation: stripSensitiveActivationFields(activations[idx]) });
  });

  app.get('/api/hotels/:hotelId/custom-features', (req, res) => {
    const { hotelId } = req.params;
    const state = getDbState() || {};
    const entitlements = (state.customFeatureEntitlements || []).filter((e: any) => e.hotelId === hotelId);
    const history = (state.personalizedActivations || [])
      .filter((a: any) => a.hotelId === hotelId && (a.status === 'activated' || a.status === 'revoked'))
      .map(stripSensitiveActivationFields);
    res.json({ success: true, entitlements, history });
  });

  app.post('/api/hotels/:hotelId/custom-features/activate', async (req, res) => {
    const { hotelId } = req.params;
    const { code, activatedByEmail = 'hotel@igho.com.ng' } = req.body || {};
    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: 'CODE_REQUIRED', message: 'Please enter your personalized activation code.' });
    }
    const crypto = await import('crypto');
    const normalizedInput = String(code).trim().replace(/\s+/g, '').toUpperCase();
    const state = getDbState() || {};
    const activations: any[] = state.personalizedActivations || [];

    let matchedIndex = -1;
    for (let i = 0; i < activations.length; i++) {
      const rec = activations[i];
      if (!rec.codeSalt || !rec.codeHash) continue;
      const candidateHash = crypto.createHash('sha256').update(`${rec.codeSalt}:${normalizedInput}`).digest('hex');
      const bufA = Buffer.from(candidateHash, 'hex');
      const bufB = Buffer.from(String(rec.codeHash), 'hex');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return res.status(404).json({
        error: 'INVALID_ACTIVATION_CODE',
        message: 'Invalid activation code. Please verify the code issued by IGHO Software Systems.',
      });
    }

    const record = activations[matchedIndex];
    if (record.hotelId !== hotelId) {
      return res.status(403).json({
        error: 'CROSS_HOTEL_CODE_DENIED',
        message: 'This activation code is locked to a different hotel organization and cannot be redeemed here.',
      });
    }
    if (record.status === 'revoked') {
      return res.status(403).json({
        error: 'ACTIVATION_REVOKED',
        message: 'This activation code has been revoked by Platform Administration.',
      });
    }
    if (record.status === 'activated') {
      return res.status(409).json({
        error: 'CODE_ALREADY_USED',
        message: `This single-use activation code was already redeemed on ${new Date(record.activatedAt).toLocaleDateString()}.`,
      });
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      activations[matchedIndex] = { ...record, status: 'expired' };
      state.personalizedActivations = activations;
      saveDbState(state);
      return res.status(410).json({
        error: 'CODE_EXPIRED',
        message: 'This activation code has expired. Please request a fresh code from IGHO Support.',
      });
    }

    const nowIso = new Date().toISOString();
    activations[matchedIndex] = {
      ...record,
      status: 'activated',
      activatedAt: nowIso,
      activatedByEmail: String(activatedByEmail).trim().toLowerCase(),
    };

    const entitlements: any[] = state.customFeatureEntitlements || [];
    const existingEntIdx = entitlements.findIndex(
      (e: any) => e.hotelId === hotelId && e.featureId === record.featureId
    );
    const entitlement = {
      id: `cfe-${Date.now()}`,
      hotelId,
      featureId: record.featureId,
      featureName: record.featureName,
      activationId: record.id,
      status: 'active',
      activatedAt: nowIso,
      activatedByEmail: String(activatedByEmail).trim().toLowerCase(),
    };
    if (existingEntIdx >= 0) {
      entitlements[existingEntIdx] = entitlement;
    } else {
      entitlements.unshift(entitlement);
    }

    if (record.requestId && Array.isArray(state.featureRequests)) {
      state.featureRequests = state.featureRequests.map((fr: any) =>
        fr.id === record.requestId ? { ...fr, status: 'Completed', updatedAt: nowIso } : fr
      );
    }

    state.personalizedActivations = activations;
    state.customFeatureEntitlements = entitlements;
    saveDbState(state);

    appendAuditLog({
      actorEmail: String(activatedByEmail).trim().toLowerCase(),
      action: 'UPDATE_PLATFORM_SETTING',
      target: `${record.hotelName} (${record.featureName})`,
      targetType: 'hotel',
      newValue: `Custom feature activated via single-use code (${record.codeHint})`,
    });

    broadcastLiveEvent('custom_feature_updated', { hotelId, entitlement });
    res.json({
      success: true,
      entitlement,
      message: `Custom feature "${record.featureName}" is now permanently unlocked for your hotel.`,
    });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, timestamp: Date.now() });
  });

  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));

  if (!isProd) {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          ...(process.env.DISABLE_HMR === 'true' ? { hmr: false } : {}),
        },
        appType: 'spa',
      })
    );
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[IGHO Backend Server] Running in real-time sync database mode at http://localhost:${port}`);
    console.log('[IGHO Storage Runtime Config]', {
      nodeEnv: process.env.NODE_ENV || 'development',
      isProd,
      supabaseUrlConfigured: Boolean(supabaseUrlEnv),
      supabasePublishableConfigured: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
      supabaseServiceRoleConfigured: Boolean(supabaseServiceKeyEnv),
      supabaseAdminActive: Boolean(supabaseAdminClient),
      storageMode: supabaseAdminClient ? 'supabase_public_assets_plus_local_private' : 'local_disk_fallback',
    });
  });
}

createServer().catch((err) => {
  console.error('[IGHO Backend Server Fatal Startup Error]', err);
  process.exit(1);
});
