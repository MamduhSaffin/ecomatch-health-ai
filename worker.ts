import { handleAsNodeRequest } from 'cloudflare:node';
import express from 'express';
import manifest from './submission/submission-manifest.json';
import { z } from 'zod';
import {
  DEFAULT_SCENARIO_PARAMS,
  FACILITIES,
  ORGANISATIONS,
  PRODUCTS,
  assessBatchWasteRisks,
  computeImpactSummary,
  computeIntelligentMatches,
  createInitialInventoryBatches,
  forecastFacilitySku,
  getNetworkModelBenchmark,
  runPrescriptiveOptimisation,
} from './src/engines/index';
import type {
  AuditLogEntry,
  InventoryBatch,
  ScenarioParameters,
  TransferRecord,
  TransferStatus,
} from './src/types/domain';
import {
  runDeterministicOperationalQuery,
  runGeminiOperationalAgent,
} from './server/services/aiAgent';
import {
  authenticateUser,
  claimFirstRunAdmin,
  isAdminConfigured,
  issueSessionToken,
  listRegisteredUsers,
  registerFacilityAccount,
  verifySessionToken,
  type AuthUser,
} from './server/services/authService';



// ============================================================================
// ISOLATED STATE STORES (Production Store vs. Public Judge Demo Sandbox)
// Public Judge Demo operations can NEVER mutate production operational records.
// ============================================================================
interface OperationalStore {
  batches: InventoryBatch[];
  transfers: TransferRecord[];
  auditLogs: AuditLogEntry[];
}

function createFreshStore(isDemo: boolean): OperationalStore {
  const nowIso = new Date().toISOString();
  const initialTransfers: TransferRecord[] = [
    {
      transferId: isDemo ? 'TRF-DEMO-1001' : 'TRF-PROD-1001',
      matchId: 'MCH-2615-007',
      donorFacilityId: 'FAC-005',
      donorFacilityName: 'Northshore Maternal & Paediatric Hospital',
      recipientFacilityId: 'FAC-007',
      recipientFacilityName: 'Valley Primary Health Hub',
      batchId: 'BCH-GLU-2615',
      sku: 'SKU-GLU-050',
      productName: 'Point-of-Care Glucometer Test Strips',
      quantity: 45,
      matchScore: 91,
      status: 'Completed',
      requestedBy: 'Inventory Manager (Northshore)',
      approvedBy: 'Regional Supply Director',
      createdAt: '2026-11-24T09:15:00Z',
      updatedAt: '2026-11-25T14:30:00Z',
      netSavingsUsd: 822.4,
      wasteDivertedKg: 4.05,
      avoidedCo2eKg: 6.9,
      notes: 'Approved FEFO surplus redistribution ahead of 41-day expiry window.',
      isDemoSandbox: isDemo,
    },
  ];

  const initialLogs: AuditLogEntry[] = [
    {
      id: `AUD-${isDemo ? 'DEMO' : 'PROD'}-001`,
      timestamp: nowIso,
      actor: 'System Initialiser',
      role: isDemo ? 'judge_demo' : 'founder_admin',
      action: 'STORE_INITIALISED',
      target: isDemo ? 'Judge Demo Isolated Sandbox' : 'Operational Store',
      outcome: 'Completed',
      details: 'Loaded seeded synthetic healthcare consumables dataset (seed 20261012).',
    },
    {
      id: `AUD-${isDemo ? 'DEMO' : 'PROD'}-002`,
      timestamp: '2026-11-25T14:30:00Z',
      actor: 'Regional Supply Director',
      role: 'procurement_officer',
      action: 'TRANSFER_COMPLETED',
      target: initialTransfers[0].transferId,
      outcome: 'Allowed',
      details: 'Verified receipt of 45 units SKU-GLU-050 at Valley Primary Health Hub.',
    },
  ];

  return {
    batches: createInitialInventoryBatches(),
    transfers: initialTransfers,
    auditLogs: initialLogs,
  };
}

let productionStore = createFreshStore(false);
let demoSandboxStore = createFreshStore(true);

function getStore(isDemo: boolean): OperationalStore {
  return isDemo ? demoSandboxStore : productionStore;
}

function appendAudit(store: OperationalStore, entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  store.auditLogs.unshift({
    id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (store.auditLogs.length > 200) store.auditLogs.length = 200;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================
const BatchInputSchema = z.object({
  batchId: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  facilityId: z.string().min(3).max(20),
  sku: z.string().min(3).max(30),
  quantityOnHand: z.number().int().min(1).max(50000),
  unitCostUsd: z.number().positive().max(10000),
  receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  condition: z.enum(['sealed_nominal', 'recalled', 'damaged', 'restricted']),
  storageLocation: z.string().min(2).max(80),
});

const BatchUpdateSchema = z.object({
  quantityOnHand: z.number().int().min(0).max(50000).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  condition: z.enum(['sealed_nominal', 'recalled', 'damaged', 'restricted']).optional(),
  storageLocation: z.string().min(2).max(80).optional(),
});

const TransferCreateSchema = z.object({
  matchId: z.string().min(3).max(40),
  quantity: z.number().int().min(1).max(10000).optional(),
  notes: z.string().max(400).optional(),
});

const TransferStatusSchema = z.object({
  status: z.enum(['Approved', 'In Transit', 'Completed', 'Rejected']),
  notes: z.string().max(400).optional(),
});

const ScenarioSchema = z.object({
  demandSurgePct: z.number().min(-30).max(80),
  procurementBudgetCutPct: z.number().min(0).max(50),
  supplyDisruptionWeeks: z.number().min(0).max(8),
  maxTransferRadiusKm: z.number().min(15).max(500),
  safetyStockMultiplier: z.number().min(0.5).max(2.5),
});

const AgentQuerySchema = z.object({
  query: z.string().min(2).max(600),
  mode: z.enum(['gemini_ai', 'deterministic_analytics']).default('gemini_ai'),
});

// ============================================================================
// EXPRESS APPLICATION FACTORY (Exported for Vitest API testing)
// ============================================================================
export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Security headers (iframe-compatible: no X-Frame-Options: DENY)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Simple sliding-window in-memory rate limiter for /api/* (120 req/min per IP)
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  app.use('/api', (req, res, next) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (bucket.count >= 180) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before retrying.' });
    }
    bucket.count += 1;
    next();
  });

  // Optional Bearer token parser
  function extractAuthUser(req: express.Request): AuthUser | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    return verifySessionToken(header.slice(7).trim());
  }

  // Helper to resolve whether request targets isolated Demo Sandbox or Authenticated Production Store
  function resolveScope(
    req: express.Request,
    requireWriteRole?: Array<AuthUser['role']>
  ): { ok: true; store: OperationalStore; isDemo: boolean; actor: AuthUser } | { ok: false; status: number; error: string } {
    const isDemoHeader = req.headers['x-ecomatch-demo'] === 'true' || req.query.demo === 'true';
    const authUser = extractAuthUser(req);

    if (isDemoHeader) {
      return {
        ok: true,
        store: getStore(true),
        isDemo: true,
        actor: {
          id: 'DEMO-JUDGE',
          email: 'judge.demo@10alytics-hackathon.local',
          name: 'Competition Judge (Demo Sandbox)',
          role: 'judge_demo',
          orgId: 'ALL',
        },
      };
    }

    if (!authUser) {
      return {
        ok: false,
        status: 401,
        error: 'Authentication required for production workspace. Use Sign In or Explore Live Demo.',
      };
    }

    if (requireWriteRole && !requireWriteRole.includes(authUser.role)) {
      return {
        ok: false,
        status: 403,
        error: `Role '${authUser.role}' is not authorised to perform this operational mutation.`,
      };
    }

    return { ok: true, store: getStore(false), isDemo: false, actor: authUser };
  }

  // Organisation isolation filter for non-admin authenticated users
  function filterBatchesForActor(batches: InventoryBatch[], actor: AuthUser): InventoryBatch[] {
    if (actor.orgId === 'ALL' || actor.role === 'founder_admin' || actor.role === 'judge_demo') {
      return batches;
    }
    const allowedFacilityIds = new Set(
      FACILITIES.filter((f) => f.orgId === actor.orgId).map((f) => f.id)
    );
    return batches.filter((b) => allowedFacilityIds.has(b.facilityId));
  }

  // ---- Health Check ----
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'EcoMatch Health AI API',
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      adminStatus: isAdminConfigured(),
    });
  });

  // ---- Auth Routes ----
  app.get('/api/auth/status', (req, res) => {
    const user = extractAuthUser(req);
    res.json({
      authenticated: Boolean(user),
      user,
      adminConfig: isAdminConfigured(),
      organisations: ORGANISATIONS,
    });
  });

  app.post('/api/auth/claim-admin', (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid email and password (min 8 chars) required.' });
    }
    const result = claimFirstRunAdmin(parsed.data.email, parsed.data.password);
    if (!result.ok || !result.user) {
      return res.status(409).json({ error: result.error });
    }
    const token = issueSessionToken(result.user);
    appendAudit(productionStore, {
      actor: result.user.email,
      role: 'founder_admin',
      action: 'ADMIN_CLAIMED',
      target: 'Platform Governance',
      outcome: 'Completed',
      details: 'First-run administrator credential claimed and hashed via scrypt.',
    });
    res.status(201).json({ token, user: result.user });
  });

  app.post('/api/auth/register', (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2).max(80),
      password: z.string().min(8).max(128),
      role: z.enum([
        'facility_manager',
        'inventory_manager',
        'procurement_officer',
        'sustainability_analyst',
        'read_only_reviewer',
      ]),
      orgId: z.string().min(3),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid registration details.', issues: parsed.error.issues });
    }
    const orgExists = ORGANISATIONS.some((o) => o.id === parsed.data.orgId);
    if (!orgExists) {
      return res.status(400).json({ error: 'Unknown organisation identifier.' });
    }
    const result = registerFacilityAccount(parsed.data);
    if (!result.ok || !result.user) {
      return res.status(409).json({ error: result.error });
    }
    const token = issueSessionToken(result.user);
    appendAudit(productionStore, {
      actor: result.user.email,
      role: result.user.role,
      action: 'USER_REGISTERED',
      target: result.user.orgId,
      outcome: 'Completed',
      details: `Registered ${result.user.role} under ${result.user.orgId}.`,
    });
    res.status(201).json({ token, user: result.user });
  });

  app.post('/api/auth/login', (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1).max(128),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = issueSessionToken(user);
    appendAudit(productionStore, {
      actor: user.email,
      role: user.role,
      action: 'USER_LOGIN',
      target: 'Auth Session',
      outcome: 'Allowed',
      details: 'Issued signed Bearer session token.',
    });
    res.json({ token, user });
  });

  // ---- Demo Sandbox Reset (strictly affects ONLY demoSandboxStore) ----
  app.post('/api/demo/reset', (_req, res) => {
    demoSandboxStore = createFreshStore(true);
    res.json({ ok: true, message: 'Judge Demo sandbox reset to baseline synthetic dataset.' });
  });

  // ---- Core Workspace Snapshot ----
  app.get('/api/workspace/snapshot', (req, res) => {
    const scope = resolveScope(req);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const { store, actor, isDemo } = scope;
    const visibleBatches = filterBatchesForActor(store.batches, actor);
    const wasteRisks = assessBatchWasteRisks(visibleBatches);
    // Network matching operates across verified network surplus/shortage while preserving org visibility
    const { matches, ineligibleAudit } = computeIntelligentMatches(store.batches);
    const optimisation = runPrescriptiveOptimisation(store.batches, DEFAULT_SCENARIO_PARAMS);
    const impact = computeImpactSummary(store.batches, store.transfers);
    const benchmark = getNetworkModelBenchmark();

    res.json({
      isDemo,
      actor,
      organisations: ORGANISATIONS,
      facilities: FACILITIES,
      products: PRODUCTS,
      batches: visibleBatches,
      wasteRisks,
      matches,
      ineligibleAudit,
      transfers: store.transfers,
      optimisation,
      impact,
      modelBenchmark: benchmark,
      auditLogs: store.auditLogs.slice(0, 60),
      users: !isDemo && actor.role === 'founder_admin' ? listRegisteredUsers() : [],
    });
  });

  // ---- Forecast Endpoint (Engine A) ----
  app.get('/api/forecast', (req, res) => {
    const scope = resolveScope(req);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const facilityId = String(req.query.facilityId || 'FAC-001');
    const sku = String(req.query.sku || 'SKU-IVS-020');
    if (!FACILITIES.some((f) => f.id === facilityId) || !PRODUCTS.some((p) => p.sku === sku)) {
      return res.status(400).json({ error: 'Invalid facilityId or sku parameter.' });
    }
    const result = forecastFacilitySku(facilityId, sku, scope.store.batches);
    res.json(result);
  });

  // ---- Inventory CRUD (Module D) ----
  app.post('/api/inventory/batches', (req, res) => {
    const scope = resolveScope(req, ['founder_admin', 'facility_manager', 'inventory_manager']);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const parsed = BatchInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Batch validation failed.', issues: parsed.error.issues });
    }
    const data = parsed.data;
    const fac = FACILITIES.find((f) => f.id === data.facilityId);
    const prod = PRODUCTS.find((p) => p.sku === data.sku);
    if (!fac || !prod) {
      return res.status(400).json({ error: 'Referenced facility or SKU does not exist.' });
    }
    if (scope.actor.orgId !== 'ALL' && fac.orgId !== scope.actor.orgId) {
      return res.status(403).json({ error: 'Cannot create batches outside your assigned organisation.' });
    }
    if (scope.store.batches.some((b) => b.batchId === data.batchId)) {
      return res.status(409).json({ error: `Batch ${data.batchId} already exists.` });
    }

    const newBatch: InventoryBatch = {
      ...data,
      dataTag: 'User Entry',
    };
    scope.store.batches.unshift(newBatch);
    appendAudit(scope.store, {
      actor: scope.actor.name,
      role: scope.actor.role,
      action: 'BATCH_CREATED',
      target: newBatch.batchId,
      outcome: 'Completed',
      details: `Added ${newBatch.quantityOnHand} units of ${newBatch.sku} at ${fac.name}.`,
    });
    res.status(201).json(newBatch);
  });

  app.patch('/api/inventory/batches/:batchId', (req, res) => {
    const scope = resolveScope(req, ['founder_admin', 'facility_manager', 'inventory_manager']);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const parsed = BatchUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid batch update payload.', issues: parsed.error.issues });
    }
    const target = scope.store.batches.find((b) => b.batchId === req.params.batchId);
    if (!target) return res.status(404).json({ error: 'Batch not found.' });

    const fac = FACILITIES.find((f) => f.id === target.facilityId);
    if (scope.actor.orgId !== 'ALL' && fac && fac.orgId !== scope.actor.orgId) {
      return res.status(403).json({ error: 'Organisation isolation prevents editing external batches.' });
    }

    Object.assign(target, parsed.data);
    appendAudit(scope.store, {
      actor: scope.actor.name,
      role: scope.actor.role,
      action: 'BATCH_UPDATED',
      target: target.batchId,
      outcome: 'Completed',
      details: `Updated batch ${target.batchId} (${JSON.stringify(parsed.data)}).`,
    });
    res.json(target);
  });

  app.delete('/api/inventory/batches/:batchId', (req, res) => {
    const scope = resolveScope(req, ['founder_admin', 'facility_manager', 'inventory_manager']);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const idx = scope.store.batches.findIndex((b) => b.batchId === req.params.batchId);
    if (idx === -1) return res.status(404).json({ error: 'Batch not found.' });

    const fac = FACILITIES.find((f) => f.id === scope.store.batches[idx].facilityId);
    if (scope.actor.orgId !== 'ALL' && fac && fac.orgId !== scope.actor.orgId) {
      return res.status(403).json({ error: 'Organisation isolation prevents deleting external batches.' });
    }
    const [removed] = scope.store.batches.splice(idx, 1);
    appendAudit(scope.store, {
      actor: scope.actor.name,
      role: scope.actor.role,
      action: 'BATCH_DELETED',
      target: removed.batchId,
      outcome: 'Completed',
      details: `Removed batch ${removed.batchId} (${removed.sku}).`,
    });
    res.json({ ok: true, removedBatchId: removed.batchId });
  });

  // Bulk CSV Batch Import (validated row-by-row via Zod)
  app.post('/api/inventory/import', (req, res) => {
    const scope = resolveScope(req, ['founder_admin', 'facility_manager', 'inventory_manager']);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const rowsSchema = z.object({ rows: z.array(BatchInputSchema).min(1).max(100) });
    const parsed = rowsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'CSV rows failed schema validation.', issues: parsed.error.issues });
    }

    let importedCount = 0;
    const skipped: string[] = [];
    for (const row of parsed.data.rows) {
      const fac = FACILITIES.find((f) => f.id === row.facilityId);
      const prod = PRODUCTS.find((p) => p.sku === row.sku);
      if (!fac || !prod) {
        skipped.push(`${row.batchId}: unknown facility or SKU`);
        continue;
      }
      if (scope.actor.orgId !== 'ALL' && fac.orgId !== scope.actor.orgId) {
        skipped.push(`${row.batchId}: outside organisation scope`);
        continue;
      }
      if (scope.store.batches.some((b) => b.batchId === row.batchId)) {
        skipped.push(`${row.batchId}: duplicate batch ID`);
        continue;
      }
      scope.store.batches.unshift({ ...row, dataTag: 'User Entry' });
      importedCount++;
    }

    appendAudit(scope.store, {
      actor: scope.actor.name,
      role: scope.actor.role,
      action: 'CSV_BATCH_IMPORT',
      target: `${importedCount} batches`,
      outcome: 'Completed',
      details: `Imported ${importedCount} validated rows; skipped ${skipped.length}.`,
    });
    res.status(201).json({ importedCount, skipped });
  });

  // ---- Resource Exchange Transfers & Human Approval Workflow (Module E) ----
  app.post('/api/transfers/request', (req, res) => {
    const scope = resolveScope(req, [
      'founder_admin',
      'facility_manager',
      'inventory_manager',
      'procurement_officer',
    ]);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const parsed = TransferCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid transfer request.', issues: parsed.error.issues });
    }

    const { matches } = computeIntelligentMatches(scope.store.batches);
    const match = matches.find((m) => m.matchId === parsed.data.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match recommendation is no longer eligible or available.' });
    }

    const qty = Math.min(parsed.data.quantity ?? match.recommendedTransferQty, match.availableSurplusUnits);
    const prod = PRODUCTS.find((p) => p.sku === match.sku);
    const ratio = qty / Math.max(1, match.recommendedTransferQty);
    const now = new Date().toISOString();

    const transfer: TransferRecord = {
      transferId: `TRF-${scope.isDemo ? 'DEMO' : 'PROD'}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      matchId: match.matchId,
      donorFacilityId: match.donorFacilityId,
      donorFacilityName: match.donorFacilityName,
      recipientFacilityId: match.recipientFacilityId,
      recipientFacilityName: match.recipientFacilityName,
      batchId: match.batchId,
      sku: match.sku,
      productName: match.productName,
      quantity: qty,
      matchScore: match.matchScore,
      status: 'Pending Approval',
      requestedBy: scope.actor.name,
      createdAt: now,
      updatedAt: now,
      netSavingsUsd: Math.round(match.netFinancialSavingsUsd * ratio * 100) / 100,
      wasteDivertedKg: Math.round(qty * (prod?.unitWeightKg ?? 0.5) * 100) / 100,
      avoidedCo2eKg: Math.round(match.avoidedCo2eKg * ratio * 100) / 100,
      notes: parsed.data.notes || 'Created from Engine C intelligent match; awaiting authorised human approval.',
      isDemoSandbox: scope.isDemo,
    };

    scope.store.transfers.unshift(transfer);
    appendAudit(scope.store, {
      actor: scope.actor.name,
      role: scope.actor.role,
      action: 'TRANSFER_REQUESTED',
      target: transfer.transferId,
      outcome: 'Completed',
      details: `Proposed ${qty} units ${transfer.sku} (${transfer.donorFacilityName} -> ${transfer.recipientFacilityName}).`,
    });

    res.status(201).json(transfer);
  });

  app.patch('/api/transfers/:transferId/status', (req, res) => {
    const scope = resolveScope(req, ['founder_admin', 'facility_manager', 'procurement_officer']);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const parsed = TransferStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid status transition.' });
    }

    const transfer = scope.store.transfers.find((t) => t.transferId === req.params.transferId);
    if (!transfer) return res.status(404).json({ error: 'Transfer record not found.' });

    const prevStatus: TransferStatus = transfer.status;
    const nextStatus: TransferStatus = parsed.data.status;

    // Apply physical stock movement once when transitioning from Pending Approval -> Approved
    if (prevStatus === 'Pending Approval' && nextStatus === 'Approved') {
      const donorBatch = scope.store.batches.find((b) => b.batchId === transfer.batchId);
      if (!donorBatch || donorBatch.quantityOnHand < transfer.quantity) {
        return res.status(409).json({ error: 'Insufficient donor batch stock remaining for approval.' });
      }
      if (donorBatch.condition !== 'sealed_nominal') {
        return res.status(409).json({ error: 'Donor batch is no longer eligible for transfer.' });
      }
      donorBatch.quantityOnHand -= transfer.quantity;
      // Credit recipient inventory with transferred batch preserving original expiry date!
      scope.store.batches.unshift({
        batchId: `${transfer.batchId}-R${transfer.recipientFacilityId.slice(-2)}`,
        facilityId: transfer.recipientFacilityId,
        sku: transfer.sku,
        quantityOnHand: transfer.quantity,
        unitCostUsd: donorBatch.unitCostUsd,
        receivedDate: '2026-11-27',
        expiryDate: donorBatch.expiryDate,
        condition: 'sealed_nominal',
        storageLocation: 'Redistributed Intake Bay',
        dataTag: 'User Entry',
      });
      transfer.approvedBy = scope.actor.name;
    }

    transfer.status = nextStatus;
    transfer.updatedAt = new Date().toISOString();
    if (parsed.data.notes) transfer.notes = parsed.data.notes;

    appendAudit(scope.store, {
      actor: scope.actor.name,
      role: scope.actor.role,
      action: `TRANSFER_${nextStatus.toUpperCase().replace(/\s+/g, '_')}`,
      target: transfer.transferId,
      outcome: 'Allowed',
      details: `Transitioned ${transfer.transferId} from ${prevStatus} to ${nextStatus}.`,
    });

    res.json(transfer);
  });

  // ---- Scenario Simulation Laboratory (Engine D) ----
  app.post('/api/simulation/run', (req, res) => {
    const scope = resolveScope(req);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const parsed = ScenarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid simulation parameters.', issues: parsed.error.issues });
    }
    const result = runPrescriptiveOptimisation(scope.store.batches, parsed.data as ScenarioParameters);
    res.json(result);
  });

  // ---- Engine F: AI Resource Operations Agent ----
  app.post('/api/agent/query', async (req, res) => {
    const scope = resolveScope(req);
    if (!scope.ok) return res.status(scope.status).json({ error: scope.error });

    const parsed = AgentQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Query must be between 2 and 600 characters.' });
    }

    const { store } = scope;
    const wasteRisks = assessBatchWasteRisks(store.batches);
    const { matches } = computeIntelligentMatches(store.batches);
    const optimisation = runPrescriptiveOptimisation(store.batches, DEFAULT_SCENARIO_PARAMS);
    const impact = computeImpactSummary(store.batches, store.transfers);

    const ctx = {
      wasteRisks,
      matches,
      optimisation,
      impact,
      transfers: store.transfers,
    };

    try {
      const result =
        parsed.data.mode === 'deterministic_analytics'
          ? runDeterministicOperationalQuery(parsed.data.query, ctx)
          : await runGeminiOperationalAgent(parsed.data.query, ctx);

      appendAudit(store, {
        actor: scope.actor.name,
        role: scope.actor.role,
        action: 'AGENT_QUERY',
        target: result.mode,
        outcome: 'Completed',
        details: `Queried operational agent (${result.modelUsed}).`,
      });
      res.json(result);
    } catch (err) {
      const errorObj = err as Error & { statusCode?: number; status?: number };
      const statusCode = errorObj.statusCode || errorObj.status || 502;
      res.status(statusCode).json({
        error: errorObj.message || 'AI Operations Agent request failed.',
        hint: 'Check GEMINI_API_KEY in Settings > Secrets, or switch to the Deterministic Ledger Query mode.',
      });
    }
  });

  // ---- Competition Submission Manifest & Artifacts Read Endpoint ----
  app.get('/api/submission/manifest', (_req, res) => {
    res.json(manifest);
  });

  return app;
}


const API_PORT = 3000;
createApiApp().listen(API_PORT);

interface WorkerBindings {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const publicApiPaths = new Set(['/api/health', '/api/submission/manifest', '/api/auth/status']);

export default {
  async fetch(request: Request, env: WorkerBindings): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // Hosted preview: verify Supabase identities on every private request.
    const origin = 'https://mpidjwjghtpeybedmbkd.supabase.co';
    const key = 'sb_publishable_LUGX_-Co3zolt94Qaj9AQg_m2zidH68';
    const founderId = '6b3d75b8-924e-46e8-8e2d-972f0818f353';
    const founder: AuthUser = { id: founderId, email: 'mamduh@tgpu.my', name: 'Platform Administrator', role: 'founder_admin', orgId: 'ALL' };
    const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    const verify = async (token: string) => {
      if (!token) return false;
      try {
        const result = await fetch(origin + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token } });
        if (!result.ok) return false;
        const identity = await result.json() as { id?: string; email?: string; email_confirmed_at?: string };
        return identity.id === founderId && identity.email?.toLowerCase() === founder.email && Boolean(identity.email_confirmed_at);
      } catch { return false; }
    };
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return response({ error: 'Invalid origin.' }, 403);
      const input = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
      if (!input || typeof input.email !== 'string' || input.email.trim().toLowerCase() !== founder.email || typeof input.password !== 'string' || input.password.length > 128) return response({ error: 'Invalid credentials or access not approved.' }, 401);
      try {
        const result = await fetch(origin + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: founder.email, password: input.password }) });
        if (!result.ok) return response({ error: 'Invalid credentials or access not approved.' }, 401);
        const session = await result.json() as { access_token?: string };
        if (!session.access_token || !await verify(session.access_token)) return response({ error: 'Access not approved.' }, 403);
        return response({ token: session.access_token, user: founder });
      } catch { return response({ error: 'Identity provider unavailable.' }, 503); }
    }
    const bearer = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] || '';
    if (url.pathname === '/api/auth/status' && request.method === 'GET') {
      const authenticated = await verify(bearer);
      return response({ authenticated, user: authenticated ? founder : null, adminConfig: { configuredViaEnv: true, claimed: true }, organisations: ORGANISATIONS, inviteOnly: true });
    }
    if (url.pathname.startsWith('/api/auth/')) return response({ error: 'Workspace access is invitation only.' }, 403);
    const isDemo = request.headers.get('x-ecomatch-demo') === 'true' || url.searchParams.get('demo') === 'true';
    if (publicApiPaths.has(url.pathname) || (isDemo && !bearer)) return handleAsNodeRequest(API_PORT, request);
    if (!await verify(bearer)) return response({ error: 'Authentication required. Use Sign In or Explore Live Demo.' }, 401);
    // Bridge only the verified identity to the existing internal role checks.
    // Strip all demo selectors so private requests cannot accidentally mutate the demo.
    url.searchParams.delete('demo');
    const headers = new Headers(request.headers);
    headers.delete('x-ecomatch-demo');
    headers.set('Authorization', 'Bearer ' + issueSessionToken(founder));
    return handleAsNodeRequest(API_PORT, new Request(url, { method: request.method, headers, body: request.body }));
  },
};
