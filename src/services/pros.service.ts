// Pros ("call a professional") backend.
// Split into pros.service.ts / pros.controller.ts / pros.routes.ts if you prefer your
// usual layout — sections are marked. Run the Prisma migration first.

import { Response, Router } from 'express';
import { ServiceJobStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { notifyAdmins, notifyUser } from '../socket/socket.manager';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { requireService } from '../services/service-flags.service';

/* ═══════════════════════ SERVICE ═══════════════════════ */

const jobInclude = {
  trade: { select: { id: true, name: true, icon: true } },
  professional: { select: { id: true, name: true, phone: true, photo: true, rating: true, verified: true } },
  customer: { select: { id: true, name: true, phone: true } },
};

// What an admin may move a job to (customer-driven moves are handled separately).
const ADMIN_TRANSITIONS: Record<ServiceJobStatus, ServiceJobStatus[]> = {
  PENDING: ['QUOTED', 'CANCELLED'],
  QUOTED: ['QUOTED', 'CANCELLED'],       // re-quote allowed until the customer accepts
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function emitJob(job: { id: string; customerId: string; status: ServiceJobStatus; quotedAmount: number | null }) {
  notifyUser(job.customerId, 'job:update', {
    jobId: job.id,
    status: job.status,
    quotedAmount: job.quotedAmount,
    timestamp: new Date(),
  });
}

// ── customer ──

export async function listTrades() {
  return prisma.trade.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, icon: true },
  });
}

export async function createJob(
  customerId: string,
  data: {
    tradeId: string;
    description: string;
    address: string;
    latitude?: number;
    longitude?: number;
    isUrgent?: boolean;
    preferredTime?: string;
    imageUrls?: string[];
    paymentMethod?: 'CASH' | 'MOMO';
  },
) {
  const trade = await prisma.trade.findUnique({ where: { id: data.tradeId } });
  if (!trade || !trade.active) throw new Error('This service is not available');

  const description = (data.description || '').trim();
  const address = (data.address || '').trim();
  if (description.length < 5) throw new Error('Please describe the job (at least a few words)');
  if (!address) throw new Error('Please add the job address');

  const preferredTime = data.preferredTime ? new Date(data.preferredTime) : null;
  if (preferredTime && Number.isNaN(preferredTime.getTime())) throw new Error('Invalid preferred time');

  const job = await prisma.serviceJob.create({
    data: {
      customerId,
      tradeId: trade.id,
      description,
      address,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      isUrgent: !!data.isUrgent,
      preferredTime,
      imageUrls: (data.imageUrls || []).slice(0, 4),
      paymentMethod: data.paymentMethod === 'MOMO' ? 'MOMO' : 'CASH',
    },
    include: jobInclude,
  });

  notifyAdmins('admin:job_created', { jobId: job.id, trade: trade.name, urgent: job.isUrgent, timestamp: new Date() });
  return job;
}

export async function listMyJobs(customerId: string) {
  return prisma.serviceJob.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: jobInclude,
  });
}

export async function getMyJob(id: string, customerId: string) {
  const job = await prisma.serviceJob.findUnique({ where: { id }, include: jobInclude });
  if (!job || job.customerId !== customerId) throw new Error('Request not found');
  return job;
}

export async function acceptQuote(id: string, customerId: string) {
  const job = await getMyJob(id, customerId);
  if (job.status !== 'QUOTED' || job.quotedAmount == null) throw new Error('There is no quote to accept');
  const updated = await prisma.serviceJob.update({ where: { id }, data: { status: 'ACCEPTED' }, include: jobInclude });
  notifyAdmins('admin:job_update', { jobId: id, status: 'ACCEPTED' });
  emitJob(updated);
  return updated;
}

export async function cancelMyJob(id: string, customerId: string) {
  const job = await getMyJob(id, customerId);
  if (!['PENDING', 'QUOTED', 'ACCEPTED'].includes(job.status)) throw new Error('This request can no longer be cancelled');
  const updated = await prisma.serviceJob.update({ where: { id }, data: { status: 'CANCELLED' }, include: jobInclude });
  notifyAdmins('admin:job_update', { jobId: id, status: 'CANCELLED' });
  emitJob(updated);
  return updated;
}

// ── admin ──

export async function adminCreateTrade(data: { name: string; icon?: string; sortOrder?: number }) {
  const name = (data.name || '').trim();
  if (!name) throw new Error('Trade name is required');
  return prisma.trade.create({ data: { name, icon: data.icon || null, sortOrder: data.sortOrder ?? 0 } });
}

export async function adminCreateProfessional(data: {
  name: string; phone: string; tradeIds: string[]; area?: string; bio?: string;
  photo?: string; yearsExp?: number; verified?: boolean;
}) {
  if (!data.name?.trim() || !data.phone?.trim()) throw new Error('Name and phone are required');
  if (!Array.isArray(data.tradeIds) || data.tradeIds.length === 0) throw new Error('Pick at least one trade');
  return prisma.professional.create({
    data: {
      name: data.name.trim(),
      phone: data.phone.trim(),
      area: data.area?.trim() || null,
      bio: data.bio?.trim() || null,
      photo: data.photo || null,
      yearsExp: data.yearsExp ?? null,
      verified: !!data.verified,
      status: 'ACTIVE',
      availability: 'ONLINE',
      trades: { connect: data.tradeIds.map((id) => ({ id })) },
    },
    include: { trades: true },
  });
}

export async function adminListProfessionals(tradeId?: string) {
  return prisma.professional.findMany({
    where: { status: 'ACTIVE', ...(tradeId && { trades: { some: { id: tradeId } } }) },
    include: { trades: { select: { id: true, name: true } } },
    orderBy: [{ rating: 'desc' }, { totalJobs: 'desc' }],
  });
}

export async function adminListJobs(filters: { status?: string; page?: number; limit?: number }) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const where = { ...(filters.status && { status: filters.status as ServiceJobStatus }) };
  const [jobs, total] = await Promise.all([
    prisma.serviceJob.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'asc' }], // urgent + oldest first
      include: jobInclude,
    }),
    prisma.serviceJob.count({ where }),
  ]);
  return { jobs, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function adminQuoteJob(id: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid quote amount');
  const job = await prisma.serviceJob.findUnique({ where: { id } });
  if (!job) throw new Error('Request not found');
  if (!ADMIN_TRANSITIONS[job.status].includes('QUOTED')) throw new Error(`Cannot quote a request that is ${job.status}`);
  const updated = await prisma.serviceJob.update({
    where: { id }, data: { quotedAmount: amount, status: 'QUOTED' }, include: jobInclude,
  });
  emitJob(updated);
  return updated;
}

export async function adminAssignProfessional(id: string, professionalId: string) {
  const [job, pro] = await Promise.all([
    prisma.serviceJob.findUnique({ where: { id } }),
    prisma.professional.findUnique({ where: { id: professionalId } }),
  ]);
  if (!job) throw new Error('Request not found');
  if (!pro || pro.status !== 'ACTIVE') throw new Error('Professional not found');
  if (['COMPLETED', 'CANCELLED'].includes(job.status)) throw new Error(`Cannot assign on a ${job.status} request`);
  const updated = await prisma.serviceJob.update({ where: { id }, data: { professionalId }, include: jobInclude });
  emitJob(updated);
  return updated;
}

export async function adminUpdateJobStatus(id: string, status: ServiceJobStatus) {
  const job = await prisma.serviceJob.findUnique({ where: { id } });
  if (!job) throw new Error('Request not found');
  if (!ADMIN_TRANSITIONS[job.status].includes(status)) throw new Error(`Cannot move from ${job.status} to ${status}`);
  if (status === 'IN_PROGRESS' && !job.professionalId) throw new Error('Assign a professional first');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.serviceJob.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && { finalAmount: job.finalAmount ?? job.quotedAmount ?? 0 }),
      },
      include: jobInclude,
    });
    if (status === 'COMPLETED' && job.professionalId) {
      await tx.professional.update({ where: { id: job.professionalId }, data: { totalJobs: { increment: 1 } } });
    }
    return result;
  });
  emitJob(updated);
  return updated;
}

/* ═══════════════════════ CONTROLLER HELPER ═══════════════════════ */

const h =
  (fn: (req: AuthRequest) => Promise<unknown>, okStatus = 200) =>
  async (req: AuthRequest, res: Response) => {
    try {
      res.status(okStatus).json({ success: true, data: await fn(req) });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message || 'Something went wrong' });
    }
  };


/* ═══════════════════════ ADMIN ROUTES ═══════════════════════
   call once in admin.routes.ts, after adminRouter.use(authenticate, authorize('ADMIN')):
     registerProsAdminRoutes(adminRouter);                                              */

export function registerProsAdminRoutes(adminRouter: Router) {
  adminRouter.post('/trades', h((req) => adminCreateTrade(req.body), 201));
  adminRouter.get('/pros', h((req) => adminListProfessionals(req.query.tradeId as string | undefined)));
  adminRouter.post('/pros', h((req) => adminCreateProfessional(req.body), 201));

  adminRouter.get('/pro-jobs', h((req) =>
    adminListJobs({
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    })));
  adminRouter.patch('/pro-jobs/:id/quote', h((req) => adminQuoteJob(req.params.id as string, Number(req.body.amount))));
  adminRouter.patch('/pro-jobs/:id/assign', h((req) => adminAssignProfessional(req.params.id as string, req.body.professionalId)));
  adminRouter.patch('/pro-jobs/:id/status', h((req) => adminUpdateJobStatus(req.params.id as string, req.body.status)));
}

/* ═══════════════════════ SEED (run once) ═══════════════════════
await prisma.trade.createMany({ skipDuplicates: true, data: [
  { name: 'Electrician', icon: '⚡', sortOrder: 1 },
  { name: 'Plumber',     icon: '🚰', sortOrder: 2 },
  { name: 'Carpenter',   icon: '🪚', sortOrder: 3 },
  { name: 'Mason',       icon: '🧱', sortOrder: 4 },
  { name: 'Painter',     icon: '🎨', sortOrder: 5 },
  { name: 'Mechanic',    icon: '🔧', sortOrder: 6 },
  { name: 'Phone/Electronics Repair', icon: '📱', sortOrder: 7 },
  { name: 'Cleaner',     icon: '🧹', sortOrder: 8 },
  { name: 'Other',       icon: '🛠️', sortOrder: 99 },
]});
*/