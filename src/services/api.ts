import type {
  AuditLogEntry,
  BatchWasteRisk,
  Facility,
  ImpactSummary,
  IneligibleAuditItem,
  InventoryBatch,
  OptimisationComparison,
  Organisation,
  Product,
  ResourceMatch,
  ScenarioParameters,
  SeriesForecastResult,
  TransferRecord,
  TransferStatus,
  UserRole,
} from '../types/domain';
import type { AgentResponsePayload } from '../../server/services/aiAgent';

export interface AuthUserClient {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string | 'ALL';
}

export interface WorkspaceSnapshot {
  isDemo: boolean;
  actor: AuthUserClient;
  organisations: Organisation[];
  facilities: Facility[];
  products: Product[];
  batches: InventoryBatch[];
  wasteRisks: BatchWasteRisk[];
  matches: ResourceMatch[];
  ineligibleAudit: IneligibleAuditItem[];
  transfers: TransferRecord[];
  optimisation: OptimisationComparison;
  impact: ImpactSummary;
  modelBenchmark: {
    totalSeriesEvaluated: number;
    models: Array<{
      modelId: string;
      modelName: string;
      role: 'Baseline' | 'Candidate ML';
      avgTestMae: number;
      avgTestRMSE: number;
      avgTestWape: number;
      winCount: number;
    }>;
  };
  auditLogs: AuditLogEntry[];
  users: Array<AuthUserClient & { status: string }>;
}

export interface SubmissionManifest {
  projectName: string;
  competition: string;
  track: string;
  sdgAlignment: string;
  generatedAt: string;
  deliverables: Array<{
    id: string;
    name: string;
    fileLocation: string;
    publicUrl: string;
    fileSizeBytes: number | null;
    completionStatus: string;
    validationStatus: string;
    knownLimitations: string;
    outstandingAction: string;
  }>;
}

// Session token held strictly in memory (never localStorage/sessionStorage)
let inMemoryBearerToken: string | null = null;
let inMemoryDemoMode = true;

export function setAuthSession(token: string | null, demoMode: boolean) {
  inMemoryBearerToken = token;
  inMemoryDemoMode = demoMode;
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (inMemoryDemoMode) {
    headers['X-EcoMatch-Demo'] = 'true';
  } else if (inMemoryBearerToken) {
    headers['Authorization'] = `Bearer ${inMemoryBearerToken}`;
  }
  return headers;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string; hint?: string }).error || `Request failed (${res.status})`;
    const hint = (data as { hint?: string }).hint;
    throw new Error(hint ? `${msg} — ${hint}` : msg);
  }
  return data as T;
}

export const api = {
  getHealth: () =>
    requestJson<{
      status: string;
      service: string;
      geminiConfigured: boolean;
      adminStatus: { configuredViaEnv: boolean; claimed: boolean };
    }>('/api/health'),

  getAuthStatus: () =>
    requestJson<{
      authenticated: boolean;
      user: AuthUserClient | null;
      adminConfig: { configuredViaEnv: boolean; claimed: boolean };
      organisations: Organisation[];
    }>('/api/auth/status'),

  claimAdmin: (email: string, password: string) =>
    requestJson<{ token: string; user: AuthUserClient }>('/api/auth/claim-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  registerAccount: (payload: {
    email: string;
    name: string;
    password: string;
    role: Exclude<UserRole, 'founder_admin' | 'judge_demo'>;
    orgId: string;
  }) =>
    requestJson<{ token: string; user: AuthUserClient }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    requestJson<{ token: string; user: AuthUserClient }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getSnapshot: () => requestJson<WorkspaceSnapshot>('/api/workspace/snapshot'),

  resetDemo: () => requestJson<{ ok: boolean; message: string }>('/api/demo/reset', { method: 'POST' }),

  getForecast: (facilityId: string, sku: string) =>
    requestJson<SeriesForecastResult>(
      `/api/forecast?facilityId=${encodeURIComponent(facilityId)}&sku=${encodeURIComponent(sku)}`
    ),

  createBatch: (payload: Omit<InventoryBatch, 'dataTag'>) =>
    requestJson<InventoryBatch>('/api/inventory/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBatch: (
    batchId: string,
    payload: Partial<Pick<InventoryBatch, 'quantityOnHand' | 'expiryDate' | 'condition' | 'storageLocation'>>
  ) =>
    requestJson<InventoryBatch>(`/api/inventory/batches/${encodeURIComponent(batchId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteBatch: (batchId: string) =>
    requestJson<{ ok: boolean; removedBatchId: string }>(
      `/api/inventory/batches/${encodeURIComponent(batchId)}`,
      { method: 'DELETE' }
    ),

  importBatchesCsv: (rows: Array<Omit<InventoryBatch, 'dataTag'>>) =>
    requestJson<{ importedCount: number; skipped: string[] }>('/api/inventory/import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),

  requestTransfer: (matchId: string, quantity?: number, notes?: string) =>
    requestJson<TransferRecord>('/api/transfers/request', {
      method: 'POST',
      body: JSON.stringify({ matchId, quantity, notes }),
    }),

  updateTransferStatus: (transferId: string, status: TransferStatus, notes?: string) =>
    requestJson<TransferRecord>(`/api/transfers/${encodeURIComponent(transferId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  runSimulation: (params: ScenarioParameters) =>
    requestJson<OptimisationComparison>('/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  queryAgent: (query: string, mode: 'gemini_ai' | 'deterministic_analytics') =>
    requestJson<AgentResponsePayload>('/api/agent/query', {
      method: 'POST',
      body: JSON.stringify({ query, mode }),
    }),

  getSubmissionManifest: () => requestJson<SubmissionManifest>('/api/submission/manifest'),
};

export function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
