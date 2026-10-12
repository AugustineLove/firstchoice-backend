// src/services/service-flags.service.ts
//
// Controls which 2.0 verticals each user can see. Three modes per service:
//   OFF  – nobody (default; v1 behaviour is untouched)
//   BETA – admins + users listed in betaUserIds (test in production safely)
//   ON   – everyone
//
// Stored in Settings.enabledServices (JSON), so flipping a service on/off is a
// data change — no redeploy, no app-store release.

import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export const SERVICE_KINDS = ['HOTEL', 'PROFESSIONAL', 'RIDE', 'RENTAL'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];
export type ServiceMode = 'OFF' | 'BETA' | 'ON';

export interface ServiceFlags {
  modes: Partial<Record<ServiceKind, ServiceMode>>;
  betaUserIds: string[];
}

let cache: { at: number; flags: ServiceFlags } | null = null;
const TTL_MS = 30_000;

async function loadFlags(): Promise<ServiceFlags> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.flags;
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  const raw = ((row as any)?.enabledServices ?? {}) as Partial<ServiceFlags>;
  const flags: ServiceFlags = {
    modes: raw.modes ?? {},
    betaUserIds: raw.betaUserIds ?? [],
  };
  cache = { at: Date.now(), flags };
  return flags;
}

function allowed(flags: ServiceFlags, kind: ServiceKind, userId: string, role?: string) {
  const mode = flags.modes[kind] ?? 'OFF';
  if (mode === 'ON') return true;
  if (mode === 'BETA') return role === 'ADMIN' || flags.betaUserIds.includes(userId);
  return false;
}

/** { HOTEL: true, PROFESSIONAL: false, ... } for one user. */
export async function getServiceAccess(userId: string, role?: string) {
  const flags = await loadFlags();
  return Object.fromEntries(
    SERVICE_KINDS.map((k) => [k, allowed(flags, k, userId, role)]),
  ) as Record<ServiceKind, boolean>;
}

/** Guard for every 2.0 route: a disabled service behaves as if it doesn't exist. */
export function requireService(kind: ServiceKind) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const flags = await loadFlags();
      if (allowed(flags, kind, req.user!.id, (req.user as any)?.role)) return next();
      res.status(404).json({ success: false, message: 'This service is not available yet' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  };
}

/** GET /settings/services  (authenticated) — what the app uses to draw the Home strip. */
export async function getMyServices(req: AuthRequest, res: Response) {
  try {
    const data = await getServiceAccess(req.user!.id, (req.user as any)?.role);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

/** PATCH /admin/services  body: { modes?: {HOTEL:"BETA"}, betaUserIds?: string[] } */
export async function updateServiceFlags(patch: Partial<ServiceFlags>) {
  const current = await loadFlags();

  for (const [k, v] of Object.entries(patch.modes ?? {})) {
    if (!SERVICE_KINDS.includes(k as ServiceKind)) throw new Error(`Unknown service: ${k}`);
    if (!['OFF', 'BETA', 'ON'].includes(v as string)) throw new Error(`Invalid mode for ${k}`);
  }

  const next: ServiceFlags = {
    modes: { ...current.modes, ...(patch.modes ?? {}) },
    betaUserIds: patch.betaUserIds ?? current.betaUserIds,
  };

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { enabledServices: next as any },
    create: { id: 1, enabledServices: next as any },
  });
  cache = null;
  return next;
}

/* ── wiring ──────────────────────────────────────────────────────
// settings.routes.ts
settingsRouter.get('/services', authenticate, getMyServices);

// admin.routes.ts (already behind authenticate + authorize('ADMIN'))
adminRouter.patch('/services', async (req, res) => {
  try {
    const data = await updateServiceFlags(req.body);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// each new router, e.g. rentals.routes.ts
rentalRouter.use(authenticate, requireService('RENTAL'));
*/