// services/legal.service.ts
import { NextFunction, Response, Router } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { getSettings, invalidateSettingsCache } from './setting.service';

/*
  Add to model Settings in schema.prisma (all nullable, so the live app is unaffected):

    termsVersion  String?   // e.g. "2026-11-01". null = terms gate is OFF
    termsUrl      String?
    privacyUrl    String?
    termsSummary  String?   // short "what changed" text shown on the gate screen
*/

/* ═══════════════ HELPERS ═══════════════ */

/** True when this user must accept the current terms. Gate is off until admin sets a version. */
export async function termsRequiredFor(user: { termsVersion?: string | null }) {
  const s = await getSettings();
  return !!s.termsVersion && user.termsVersion !== s.termsVersion;
}

/* ═══════════════ CUSTOMER ═══════════════ */

export async function getCurrentTerms() {
  const s = await getSettings();
  if (!s.termsVersion) return null;
  return {
    version: s.termsVersion,
    termsUrl: s.termsUrl,
    privacyUrl: s.privacyUrl,
    summary: s.termsSummary,
  };
}

export async function acceptTerms(
  userId: string,
  version: unknown,
  meta: { appVersion?: string; platform?: string; ipAddress?: string },
) {
  const s = await getSettings();
  if (!s.termsVersion) throw new Error('There are no terms to accept right now');
  if (typeof version !== 'string' || version !== s.termsVersion) {
    // Client is looking at an older version; make it reload the current one.
    throw new Error('Our terms were just updated. Please review the latest version.');
  }

  await prisma.$transaction([
    prisma.termsAcceptance.upsert({
      where: { userId_version: { userId, version } },
      create: {
        userId,
        version,
        documents: ['terms', 'privacy'],
        appVersion: meta.appVersion?.slice(0, 40) || null,
        platform: meta.platform?.slice(0, 20) || null,
        ipAddress: meta.ipAddress?.slice(0, 64) || null,
      },
      update: {}, // already accepted this version, keep the original timestamp
    }),
    prisma.user.update({
      where: { id: userId },
      data: { termsVersion: version, termsAcceptedAt: new Date() },
    }),
  ]);

  return { accepted: true, version };
}

/* ═══════════════ ADMIN ═══════════════ */

export async function adminSetTerms(data: Record<string, any>) {
  const version = String(data.version || '').trim();
  if (!version) throw new Error('version is required (e.g. 2026-11-01)');

  const url = (v: unknown, label: string) => {
    const s = String(v || '').trim();
    if (!/^https:\/\/\S+$/.test(s)) throw new Error(`${label} must be a valid https link`);
    return s;
  };

  await getSettings(); // make sure the row exists
  const updated = await prisma.settings.update({
    where: { id: 1 },
    data: {
      termsVersion: version,
      termsUrl: url(data.termsUrl, 'termsUrl'),
      privacyUrl: url(data.privacyUrl, 'privacyUrl'),
      termsSummary: data.summary ? String(data.summary).trim().slice(0, 1000) : null,
    },
  });
  invalidateSettingsCache();
  return updated;
}

/** Turn the gate off (e.g. if you published the wrong version). */
export async function adminClearTerms() {
  await getSettings();
  const updated = await prisma.settings.update({ where: { id: 1 }, data: { termsVersion: null } });
  invalidateSettingsCache();
  return updated;
}

export async function adminTermsStats() {
  const s = await getSettings();
  if (!s.termsVersion) return { version: null, accepted: 0, pending: 0, total: 0 };
  const base = { role: 'CUSTOMER' as const, status: { not: 'DELETED' as const } };
  const [total, accepted] = await Promise.all([
    prisma.user.count({ where: base }),
    prisma.user.count({ where: { ...base, termsVersion: s.termsVersion } }),
  ]);
  return { version: s.termsVersion, accepted, pending: total - accepted, total };
}

/* ═══════════════ MIDDLEWARE ═══════════════ */

/**
 * Put AFTER `authenticate` on routes that need accepted terms (start with the 2.0 services).
 * Old v1 apps never reach these routes, so this is safe to switch on right away for them.
 * The app's Dio interceptor looks for code === 'TERMS_REQUIRED' and opens the gate screen.
 */
export async function requireTerms(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const s = await getSettings();
    if (!s.termsVersion) return next();

    // Vendor / rider / admin apps don't have the gate yet.
    const role = (req.user as any)?.role;
    if (role && role !== 'CUSTOMER') return next();

    const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { termsVersion: true } });
    if (u?.termsVersion === s.termsVersion) return next();

    return res.status(403).json({
      success: false,
      code: 'TERMS_REQUIRED',
      message: 'Please accept our updated terms to continue.',
    });
  } catch (e) {
    next(e);
  }
}

/* ═══════════════ ROUTES ═══════════════ */

const h =
  (fn: (req: AuthRequest) => Promise<unknown>, okStatus = 200) =>
  async (req: AuthRequest, res: Response) => {
    try {
      res.status(okStatus).json({ success: true, data: await fn(req) });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message || 'Something went wrong' });
    }
  };

/** Mount at /legal. `authenticate` goes on /accept only; /current is public (shown before login too). */
export function registerLegalRoutes(router: Router, authenticate: any) {
  router.get('/current', h(() => getCurrentTerms()));
  router.post('/accept', authenticate, h((req) => acceptTerms(req.user!.id, req.body?.version, {
    appVersion: req.body?.appVersion,
    platform: req.body?.platform,
    ipAddress: req.ip, // needs `app.set('trust proxy', 1)` if you're behind a proxy/load balancer
  })));
}

/** Mount on the admin router (already behind authenticate + authorize('ADMIN')). */
// export function registerLegalAdminRoutes(adminRouter: Router) {
//   adminRouter.put('/terms', h((req) => adminSetTerms(req.body)));
//   adminRouter.delete('/terms', h(() => adminClearTerms()));
//   adminRouter.get('/terms/stats', h(() => adminTermsStats()));
// }