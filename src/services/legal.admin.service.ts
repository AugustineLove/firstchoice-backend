// services/legal.admin.service.ts
//
// Terms versions live in the DB. Drafts are freely editable; once PUBLISHED a version is
// frozen (users accepted exactly that text), so changes mean creating a new version.
// Publishing makes it the live version, which turns the in-app gate on for everyone.

import { Response, Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { getSettings, invalidateSettingsCache } from './setting.service';

const VERSION_RE = /^[A-Za-z0-9._-]{1,40}$/;
const MIN_CONTENT = 100;
const MAX_CONTENT = 200_000;

const pageUrl = (baseUrl: string, type: 'terms' | 'privacy', version: string) =>
  `${baseUrl}/api/legal/page/${type}/${encodeURIComponent(version)}`;

function readFields(data: Record<string, any>, partial: boolean) {
  const out: { version?: string; summary?: string | null; termsContent?: string; privacyContent?: string } = {};

  if (!partial || data.version !== undefined) {
    const v = String(data.version ?? '').trim();
    if (!VERSION_RE.test(v)) throw new Error('Version can only use letters, numbers, dots and dashes (e.g. 2026-11-01)');
    out.version = v;
  }
  if (!partial || data.summary !== undefined) {
    out.summary = String(data.summary ?? '').trim().slice(0, 1000) || null;
  }
  for (const [key, label] of [['termsContent', 'Terms of Service'], ['privacyContent', 'Privacy Policy']] as const) {
    if (!partial || data[key] !== undefined) {
      const c = String(data[key] ?? '').trim();
      if (c.length < MIN_CONTENT) throw new Error(`The ${label} text looks too short`);
      if (c.length > MAX_CONTENT) throw new Error(`The ${label} text is too long`);
      out[key] = c;
    }
  }
  return out;
}

/* ═══════════════ CRUD ═══════════════ */

export async function adminListTerms() {
  const [rows, settings, counts] = await Promise.all([
    prisma.termsVersion.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, version: true, summary: true, publishedAt: true, createdAt: true, updatedAt: true },
    }),
    getSettings(),
    prisma.termsAcceptance.groupBy({ by: ['version'], _count: { id: true } }),
  ]);
  const accepted = Object.fromEntries(counts.map((c) => [c.version, c._count.id]));
  return {
    currentVersion: settings.termsVersion ?? null,
    versions: rows.map((r) => ({
      ...r,
      isCurrent: r.version === settings.termsVersion,
      acceptedCount: accepted[r.version] || 0,
    })),
  };
}

export async function adminGetTerms(id: string, baseUrl: string) {
  const row = await prisma.termsVersion.findUnique({ where: { id } });
  if (!row) throw new Error('Version not found');
  return {
    ...row,
    termsUrl: row.publishedAt ? pageUrl(baseUrl, 'terms', row.version) : null,
    privacyUrl: row.publishedAt ? pageUrl(baseUrl, 'privacy', row.version) : null,
  };
}

export async function adminCreateTerms(data: Record<string, any>) {
  const fields = readFields(data, false);
  try {
    return await prisma.termsVersion.create({ data: fields as Prisma.TermsVersionCreateInput });
  } catch (e: any) {
    if (e.code === 'P2002') throw new Error('That version name already exists. Pick a different one.');
    throw e;
  }
}

export async function adminUpdateTerms(id: string, data: Record<string, any>) {
  const row = await prisma.termsVersion.findUnique({ where: { id } });
  if (!row) throw new Error('Version not found');
  if (row.publishedAt) throw new Error('Published versions cannot be edited. Create a new version instead.');
  const fields = readFields(data, true);
  try {
    return await prisma.termsVersion.update({ where: { id }, data: fields });
  } catch (e: any) {
    if (e.code === 'P2002') throw new Error('That version name already exists. Pick a different one.');
    throw e;
  }
}

export async function adminDeleteTerms(id: string) {
  const row = await prisma.termsVersion.findUnique({ where: { id } });
  if (!row) throw new Error('Version not found');
  if (row.publishedAt) throw new Error('Published versions are kept as a record and cannot be deleted.');
  await prisma.termsVersion.delete({ where: { id } });
  return { deleted: true };
}

/** Makes a draft the live version. Every customer is asked to accept it. */
export async function adminPublishTerms(id: string, baseUrl: string) {
  const row = await prisma.termsVersion.findUnique({ where: { id } });
  if (!row) throw new Error('Version not found');
  if (row.publishedAt) throw new Error('This version is already published. Create a new version to make changes.');

  await getSettings(); // make sure the settings row exists
  await prisma.$transaction([
    prisma.termsVersion.update({ where: { id }, data: { publishedAt: new Date() } }),
    prisma.settings.update({
      where: { id: 1 },
      data: {
        termsVersion: row.version,
        termsUrl: pageUrl(baseUrl, 'terms', row.version),
        privacyUrl: pageUrl(baseUrl, 'privacy', row.version),
        termsSummary: row.summary,
      },
    }),
  ]);
  invalidateSettingsCache();
  return { published: true, version: row.version };
}

/** Switches the in-app gate off (nobody is asked to accept). Versions are kept. */
export async function adminDisableGate() {
  await getSettings();
  await prisma.settings.update({ where: { id: 1 }, data: { termsVersion: null } });
  invalidateSettingsCache();
  return { enabled: false };
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

// Set PUBLIC_API_URL (e.g. https://firstchoice-backend.onrender.com) so links never depend on the request.
const baseUrlOf = (req: AuthRequest) => process.env.PUBLIC_API_URL?.replace(/\/$/, '') || `https://${req.get('host')}`;

/** Mount on the admin router (already behind authenticate + authorize('ADMIN')). */
export function registerLegalAdminRoutes(adminRouter: Router) {
  adminRouter.get('/terms', h(() => adminListTerms()));
  adminRouter.get('/terms/stats', h(() => adminTermsStats()));          // before /terms/:id
  adminRouter.post('/terms/disable', h(() => adminDisableGate()));      // before /terms/:id/...
  adminRouter.get('/terms/:id', h((req) => adminGetTerms(req.params.id as string, baseUrlOf(req))));
  adminRouter.post('/terms', h((req) => adminCreateTerms(req.body), 201));
  adminRouter.patch('/terms/:id', h((req) => adminUpdateTerms(req.params.id as string, req.body)));
  adminRouter.delete('/terms/:id', h((req) => adminDeleteTerms(req.params.id as string)));
  adminRouter.post('/terms/:id/publish', h((req) => adminPublishTerms(req.params.id as string, baseUrlOf(req))));
}

/* ═══════════════ PUBLIC HOSTED PAGES ═══════════════ */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Mount on the same /legal router as the other public routes (no authentication). */
export function registerLegalPageRoutes(router: Router) {
  router.get('/page/:type/:version', async (req, res) => {
    try {
      const type = req.params.type;
      const version = req.params.version as string;
      if (type !== 'terms' && type !== 'privacy') return void res.status(404).send('Not found');

      const row = await prisma.termsVersion.findUnique({ where: { version } });
      if (!row || !row.publishedAt) return void res.status(404).send('Not found');

      const title = type === 'terms' ? 'Terms of Service' : 'Privacy Policy';
      const body = type === 'terms' ? row.termsContent : row.privacyContent;
      const date = row.publishedAt.toISOString().slice(0, 10);

      res
        .set('Cache-Control', 'public, max-age=3600') // published text never changes
        .type('html')
        .send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · FirstChoice</title>
<style>
  body{margin:0;background:#f8faf8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937}
  main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
  h1{font-size:26px;margin:0 0 4px;color:#0c3324}
  .meta{color:#6b7280;font-size:13px;margin-bottom:28px}
  .body{white-space:pre-wrap;line-height:1.7;font-size:15px}
</style></head><body><main>
<h1>${title}</h1>
<div class="meta">FirstChoice · Version ${esc(row.version)} · Effective ${date}</div>
<div class="body">${esc(body)}</div>
</main></body></html>`);
    } catch {
      res.status(500).send('Something went wrong');
    }
  });
}