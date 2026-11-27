import crypto from 'crypto';
import type { UserRole } from '../../src/types/domain';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string | 'ALL';
}

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string | 'ALL';
  salt: string;
  passwordHash: string;
}

let sessionSecret: string | undefined;

function getSessionSecret(): string {
  sessionSecret ??= process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  return sessionSecret;
}
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

// In-memory account store for self-contained demonstration runtime
const accounts = new Map<string, StoredAccount>();
let claimedAdminHash: { salt: string; hash: string; email: string } | null = null;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): {
  salt: string;
  hash: string;
} {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

export function isAdminConfigured(): { configuredViaEnv: boolean; claimed: boolean } {
  const configuredViaEnv = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  return {
    configuredViaEnv,
    claimed: configuredViaEnv || claimedAdminHash !== null,
  };
}

export function claimFirstRunAdmin(email: string, password: string): { ok: boolean; error?: string; user?: AuthUser } {
  const status = isAdminConfigured();
  if (status.claimed) {
    return { ok: false, error: 'Administrator credentials are already configured.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Administrator password must be at least 8 characters.' };
  }
  const normalizedEmail = email.trim().toLowerCase();
  const { salt, hash } = hashPassword(password);
  claimedAdminHash = { salt, hash, email: normalizedEmail };

  const user: AuthUser = {
    id: 'USR-ADMIN-001',
    email: normalizedEmail,
    name: 'Platform Administrator',
    role: 'founder_admin',
    orgId: 'ALL',
  };
  return { ok: true, user };
}

export function registerFacilityAccount(params: {
  email: string;
  name: string;
  password: string;
  role: Exclude<UserRole, 'founder_admin' | 'judge_demo'>;
  orgId: string;
}): { ok: boolean; error?: string; user?: AuthUser } {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (accounts.has(normalizedEmail)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const { salt, hash } = hashPassword(params.password);
  const id = `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const record: StoredAccount = {
    id,
    email: normalizedEmail,
    name: params.name.trim(),
    role: params.role,
    orgId: params.orgId,
    salt,
    passwordHash: hash,
  };
  accounts.set(normalizedEmail, record);
  return {
    ok: true,
    user: {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      orgId: record.orgId,
    },
  };
}

export function authenticateUser(email: string, password: string): AuthUser | null {
  const normalizedEmail = email.trim().toLowerCase();

  // Check configured ADMIN_PASSCODE first (always overrides claimed fallback hash)
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode && envPasscode.length > 0) {
    const a = Buffer.from(password);
    const b = Buffer.from(envPasscode);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return {
        id: 'USR-ADMIN-001',
        email: normalizedEmail || 'admin@ecomatch.tgpu.tech',
        name: 'Platform Administrator',
        role: 'founder_admin',
        orgId: 'ALL',
      };
    }
  } else if (claimedAdminHash && claimedAdminHash.email === normalizedEmail) {
    if (verifyPassword(password, claimedAdminHash.salt, claimedAdminHash.hash)) {
      return {
        id: 'USR-ADMIN-001',
        email: claimedAdminHash.email,
        name: 'Platform Administrator',
        role: 'founder_admin',
        orgId: 'ALL',
      };
    }
    return null;
  }

  const acc = accounts.get(normalizedEmail);
  if (!acc) return null;
  if (!verifyPassword(password, acc.salt, acc.passwordHash)) return null;
  return {
    id: acc.id,
    email: acc.email,
    name: acc.name,
    role: acc.role,
    orgId: acc.orgId,
  };
}

export function issueSessionToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      sub: string;
      email: string;
      name: string;
      role: UserRole;
      orgId: string | 'ALL';
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return {
      id: parsed.sub,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      orgId: parsed.orgId,
    };
  } catch {
    return null;
  }
}

export function listRegisteredUsers(): Array<Omit<AuthUser, 'id'> & { id: string; status: string }> {
  const list: Array<Omit<AuthUser, 'id'> & { id: string; status: string }> = [
    {
      id: 'USR-ADMIN-001',
      email: claimedAdminHash?.email ?? 'admin@ecomatch.tgpu.tech',
      name: 'Platform Administrator',
      role: 'founder_admin',
      orgId: 'ALL',
      status: isAdminConfigured().claimed ? 'Active' : 'Unclaimed',
    },
  ];
  for (const acc of accounts.values()) {
    list.push({
      id: acc.id,
      email: acc.email,
      name: acc.name,
      role: acc.role,
      orgId: acc.orgId,
      status: 'Active',
    });
  }
  return list;
}
