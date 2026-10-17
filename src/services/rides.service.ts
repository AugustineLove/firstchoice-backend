import { Response, Router } from 'express';
import { RideStatus, RideVehicleType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../interface/auth-request.interface.ts';
import { authenticate } from '../middleware/auth.middleware';
import { notifyAdmins, notifyUser } from '../socket/socket.manager';
import { logAdminAction } from './adminLog.service';
import { sendCustomerMessage } from './message.service';
import { LOGISTICS_MANAGER_NUMBERS } from '../utils/constants';

/* ═══════════════════════ CONSTANTS & HELPERS ═══════════════════════ */

const VEHICLE_TYPES = Object.values(RideVehicleType) as RideVehicleType[];
const ACTIVE_STATUSES: RideStatus[] = ['PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];
const MAX_OPEN_RIDES_PER_CUSTOMER = 2;

// Straight-line distance understates real road distance, so nudge it up.
// Set to 1 to match how delivery fees are calculated.
const ROAD_FACTOR = 1.25;

const TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  PENDING:     ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:    ['ARRIVED', 'IN_PROGRESS', 'CANCELLED'],
  ARRIVED:     ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const shortId = (id: string) => id.slice(-6).toUpperCase();

function defaultRate(vehicleType: RideVehicleType) {
  return { vehicleType, baseFare: 5, perKm: 2, minFare: 5, active: vehicleType !== 'OTHER' };
}

async function getRate(vehicleType: RideVehicleType) {
  const row = await prisma.rideRate.findUnique({ where: { vehicleType } });
  return row ?? defaultRate(vehicleType);
}

/** Every vehicle type, using the DB row when it exists and defaults otherwise. */
async function allRates() {
  const rows = await prisma.rideRate.findMany();
  const byType = Object.fromEntries(rows.map((r) => [r.vehicleType, r]));
  return VEHICLE_TYPES.map((t) => byType[t] ?? defaultRate(t));
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceFrom(c: Record<string, any>): number | null {
  const pLat = num(c.pickupLatitude), pLng = num(c.pickupLongitude);
  const dLat = num(c.destinationLatitude), dLng = num(c.destinationLongitude);
  if (pLat == null || pLng == null || dLat == null || dLng == null) return null;
  return haversineKm(pLat, pLng, dLat, dLng);
}

function computeFare(rate: { baseFare: number; perKm: number; minFare: number }, km: number | null) {
  // No coordinates: charge the minimum fare and let admin set the final fare on completion.
  if (km == null) return { fare: rate.minFare, distanceKm: null as number | null, approximate: true };
  const roadKm = km * ROAD_FACTOR;
  return {
    fare: Math.max(rate.minFare, Math.round(rate.baseFare + rate.perKm * roadKm)),
    distanceKm: Math.round(roadKm * 10) / 10,
    approximate: false,
  };
}

const safe = (fn: () => unknown) => { try { Promise.resolve(fn()).catch(() => {}); } catch { /* never block a ride on an SMS */ } };

function pushRide(ride: { id: string; customerId: string }, event: string, extra: Record<string, unknown> = {}) {
  notifyUser(ride.customerId, event, { rideId: ride.id, ...extra, timestamp: new Date() });
  notifyAdmins('admin:ride_update', { rideId: ride.id, event });
}

const adminInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  driver: { select: { id: true, name: true, phone: true, photo: true, vehicleType: true, vehicleDescription: true, plateNumber: true } },
};

/* ═══════════════════════ CUSTOMER SERVICE ═══════════════════════ */

export async function listRates() {
  const [rates, online] = await Promise.all([
    allRates(),
    prisma.driver.groupBy({
      by: ['vehicleType'],
      where: { status: 'ACTIVE', availability: 'ONLINE' },
      _count: { id: true },
    }),
  ]);
  const onlineMap = Object.fromEntries(online.map((o) => [o.vehicleType, o._count.id]));
  return rates
    .filter((r) => r.active)
    .map((r) => ({
      vehicleType: r.vehicleType,
      baseFare: r.baseFare,
      perKm: r.perKm,
      minFare: r.minFare,
      driversOnline: onlineMap[r.vehicleType] || 0,
    }));
}

export async function estimateRide(data: Record<string, any>) {
  if (!isVehicleType(data.vehicleType)) throw new Error('Choose a valid vehicle type');
  const rate = await getRate(data.vehicleType);
  if (!rate.active) throw new Error('This vehicle type is not available right now');
  return { vehicleType: data.vehicleType, ...computeFare(rate, distanceFrom(data)) };
}

// export async function requestRide(customerId: string, data: Record<string, any>) {
//   if (!isVehicleType(data.vehicleType)) throw new Error('Choose a valid vehicle type');

//   const passengers = Number(data.passengers ?? 1);
//   if (!Number.isInteger(passengers) || passengers < 1 || passengers > 30) throw new Error('Passengers must be between 1 and 30');

//   const pickupAddress = String(data.pickupAddress || '').trim();
//   const destinationAddress = String(data.destinationAddress || '').trim();
//   if (!pickupAddress || !destinationAddress) throw new Error('Pickup and destination are required');

//   const open = await prisma.rideRequest.count({ where: { customerId, status: { in: ACTIVE_STATUSES } } });
//   if (open >= MAX_OPEN_RIDES_PER_CUSTOMER) throw new Error('You already have active ride requests. Finish or cancel one first.');

//   const rate = await getRate(data.vehicleType);
//   if (!rate.active) throw new Error('This vehicle type is not available right now');

//   // Fare is always computed on the server. The client's number is never trusted.
//   const { fare } = computeFare(rate, distanceFrom(data));

//   const ride = await prisma.rideRequest.create({
//     data: {
//       customerId,
//       vehicleType: data.vehicleType,
//       passengers,
//       pickupAddress,
//       pickupLatitude: num(data.pickupLatitude),
//       pickupLongitude: num(data.pickupLongitude),
//       destinationAddress,
//       destinationLatitude: num(data.destinationLatitude),
//       destinationLongitude: num(data.destinationLongitude),
//       notes: String(data.notes || '').trim().slice(0, 500) || null,
//       estimatedFare: fare,
//       paymentMethod: data.paymentMethod === 'MOMO' ? 'MOMO' : 'CASH',
//     },
//     include: { driver: driverPublic, customer: { select: { name: true, phone: true } } },
//   });

//   notifyAdmins('admin:ride_requested', { rideId: ride.id, vehicleType: ride.vehicleType, timestamp: new Date() });
//   safe(() => sendCustomerMessage({
//     messageTo: LOGISTICS_MANAGER_NUMBERS,
//     messageFrom: 'FirstChoice',
//     message: `New ride request (${ride.vehicleType}) from ${ride.customer.name}: ${ride.pickupAddress} → ${ride.destinationAddress}.\nPassengers: ${ride.passengers}. Est. fare: GHS ${ride.estimatedFare}.\nCustomer phone: ${ride.customer.phone}`,
//   }));

//   return ride;
// }

// export async function getMyRides(customerId: string) {
//   return prisma.rideRequest.findMany({
//     where: { customerId },
//     orderBy: { createdAt: 'desc' },
//     take: 30,
//     include: { driver: driverPublic },
//   });
// }

// export async function getRide(id: string, customerId: string) {
//   const ride = await prisma.rideRequest.findFirst({ where: { id, customerId }, include: { driver: driverPublic } });
//   if (!ride) throw new Error('Ride not found');
//   return ride;
// }

// export async function cancelRide(id: string, customerId: string) {
//   const ride = await prisma.rideRequest.findFirst({ where: { id, customerId } });
//   if (!ride) throw new Error('Ride not found');
//   if (!['PENDING', 'ACCEPTED'].includes(ride.status)) throw new Error('This ride can no longer be cancelled');

//   await prisma.$transaction(async (tx) => {
//     await tx.rideRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
//     if (ride.driverId) await tx.driver.update({ where: { id: ride.driverId }, data: { availability: 'ONLINE' } });
//   });

//   notifyAdmins('admin:ride_update', { rideId: id, event: 'ride:cancelled_by_customer' });
//   return getRide(id, customerId);
// }

/* ═══════════════════════ ADMIN: RIDES ═══════════════════════ */

export async function adminListRides(f: { status?: string; page?: number; limit?: number }) {
  const page = f.page || 1;
  const limit = Math.min(f.limit || 50, 100);
  const where = { ...(f.status && { status: f.status as RideStatus }) };
  const [rides, total] = await Promise.all([
    prisma.rideRequest.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: adminInclude,
    }),
    prisma.rideRequest.count({ where }),
  ]);
  return { rides, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function adminAssignDriver(rideId: string, driverId: string) {
  if (!driverId) throw new Error('driverId is required');
  const ride = await prisma.rideRequest.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error('Ride not found');
  if (!['PENDING', 'ACCEPTED', 'ARRIVED'].includes(ride.status)) throw new Error(`Cannot assign a driver to a ride that is ${ride.status}`);
  if (ride.driverId === driverId) throw new Error('Ride is already assigned to this driver');

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new Error('Driver not found');
  if (driver.status !== 'ACTIVE') throw new Error('Driver is not active');
  if (driver.availability === 'BUSY') throw new Error('Driver is busy on another ride');
  if (driver.vehicleType !== ride.vehicleType) throw new Error(`This ride needs a ${ride.vehicleType}, but the driver has a ${driver.vehicleType}`);

  const previousDriverId = ride.driverId;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.rideRequest.update({
      where: { id: rideId },
      data: { driverId, status: ride.status === 'PENDING' ? 'ACCEPTED' : ride.status },
      include: adminInclude,
    });
    if (previousDriverId) await tx.driver.update({ where: { id: previousDriverId }, data: { availability: 'ONLINE' } });
    await tx.driver.update({ where: { id: driverId }, data: { availability: 'BUSY' } });
    return result;
  });

  pushRide(updated, 'ride:driver_assigned', {
    status: updated.status,
    reassigned: !!previousDriverId,
    driver: {
      name: driver.name, phone: driver.phone, plateNumber: driver.plateNumber,
      vehicleDescription: driver.vehicleDescription,
    },
  });
  return updated;
}

export async function adminUpdateRideStatus(rideId: string, newStatus: string, opts: { finalFare?: unknown } = {}) {
  if (!(Object.values(RideStatus) as string[]).includes(newStatus)) throw new Error('Invalid ride status');
  const status = newStatus as RideStatus;

  const ride = await prisma.rideRequest.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error('Ride not found');
  if (status === 'ACCEPTED') throw new Error('Assign a driver to accept a ride');
  if (!TRANSITIONS[ride.status].includes(status)) throw new Error(`Cannot move a ride from ${ride.status} to ${status}`);
  if (status !== 'CANCELLED' && !ride.driverId) throw new Error('Assign a driver first');

  let finalFare: number | undefined;
  if (status === 'COMPLETED') {
    const f = num(opts.finalFare);
    if (f != null && f < 0) throw new Error('Final fare cannot be negative');
    finalFare = f ?? ride.estimatedFare;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (ride.driverId) {
      if (status === 'COMPLETED') {
        await tx.driver.update({ where: { id: ride.driverId }, data: { totalRides: { increment: 1 }, availability: 'ONLINE' } });
      } else if (status === 'CANCELLED') {
        await tx.driver.update({ where: { id: ride.driverId }, data: { availability: 'ONLINE' } });
      }
    }
    return tx.rideRequest.update({
      where: { id: rideId },
      data: { status, ...(finalFare !== undefined && { finalFare }) },
      include: adminInclude,
    });
  });

  pushRide(updated, 'ride:status_update', { status, finalFare: updated.finalFare });
  return updated;
}

/* ═══════════════════════ ADMIN: DRIVERS ═══════════════════════ */

export async function adminUpdateDriver(id: string, data: Record<string, any>) {
  const allowed = ['name', 'phone', 'photo', 'vehicleType', 'vehicleDescription', 'plateNumber', 'verified', 'status', 'availability'];
  const payload: Record<string, any> = {};
  for (const k of allowed) if (data[k] !== undefined) payload[k] = data[k];
  if (payload.vehicleType !== undefined && !isVehicleType(payload.vehicleType)) throw new Error('Invalid vehicle type');
  if (payload.availability !== undefined && !['ONLINE', 'OFFLINE', 'BUSY'].includes(payload.availability)) throw new Error('Invalid availability');
  return prisma.driver.update({ where: { id }, data: payload });
}

/* ═══════════════════════ ADMIN: FARES ═══════════════════════ */

export async function adminListRates() {
  return allRates();
}

export async function adminUpsertRate(vehicleType: string, data: Record<string, any>) {
  if (!isVehicleType(vehicleType)) throw new Error('Invalid vehicle type');
  const payload: Record<string, any> = {};
  for (const k of ['baseFare', 'perKm', 'minFare'] as const) {
    if (data[k] !== undefined) {
      const n = num(data[k]);
      if (n == null || n < 0) throw new Error(`${k} must be a number, 0 or more`);
      payload[k] = n;
    }
  }
  if (data.active !== undefined) payload.active = !!data.active;
  return prisma.rideRate.upsert({
    where: { vehicleType },
    create: { ...defaultRate(vehicleType), ...payload },
    update: payload,
  });
}

const isVehicleType = (v: unknown): v is RideVehicleType =>
  typeof v === 'string' && (VEHICLE_TYPES as string[]).includes(v);
 
// Only what the customer needs to call a driver.
const driverPublic = {
  id: true, name: true, phone: true, whatsapp: true, photo: true,
  vehicleType: true, vehicleDescription: true, plateNumber: true,
  area: true, rating: true, totalRides: true, verified: true, availability: true,
} as const;
 
/* ═══════════════ CUSTOMER ═══════════════ */
 
/** Vehicle types for the picker, with how many drivers are listed / online. */
export async function listVehicleTypes() {
  const rows = await prisma.driver.groupBy({
    by: ['vehicleType', 'availability'],
    where: { status: 'ACTIVE' },
    _count: { id: true },
  });
 
  const total: Record<string, number> = {};
  const online: Record<string, number> = {};
  for (const r of rows) {
    total[r.vehicleType] = (total[r.vehicleType] || 0) + r._count.id;
    if (r.availability === 'ONLINE') online[r.vehicleType] = r._count.id;
  }
 
  return VEHICLE_TYPES
    .filter((t) => t !== 'OTHER' || total[t] > 0)
    .map((t) => ({ vehicleType: t, driverCount: total[t] || 0, driversOnline: online[t] || 0 }));
}
 
export async function listDrivers(f: { vehicleType?: string; sort?: string; search?: string; limit?: number }) {
  if (!isVehicleType(f.vehicleType)) throw new Error('Choose a valid vehicle type');
  const search = f.search?.trim();
 
  const drivers = await prisma.driver.findMany({
    where: {
      status: 'ACTIVE',
      vehicleType: f.vehicleType,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { area: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: driverPublic,
    take: Math.min(f.limit || 50, 100),
  });
 
  const secondary = f.sort === 'rides'
    ? (a: typeof drivers[number], b: typeof drivers[number]) => b.totalRides - a.totalRides
    : (a: typeof drivers[number], b: typeof drivers[number]) => b.rating - a.rating;
 
  // Online drivers first, then by the chosen sort.
  const rank = (d: { availability: string }) => (d.availability === 'ONLINE' ? 0 : d.availability === 'BUSY' ? 1 : 2);
  return drivers.sort((a, b) => rank(a) - rank(b) || secondary(a, b));
}
 
/* ═══════════════ ADMIN: DRIVERS ═══════════════ */
 
export async function adminListDrivers(f: { status?: string; vehicleType?: string }) {
  return prisma.driver.findMany({
    where: {
      ...(f.status && { status: f.status as any }),
      ...(f.vehicleType && isVehicleType(f.vehicleType) && { vehicleType: f.vehicleType }),
    },
    orderBy: { createdAt: 'desc' },
  });
}
 
export async function adminCreateDriver(data: Record<string, any>) {
  if (!data.name?.trim() || !data.phone?.trim()) throw new Error('Name and phone are required');
  if (!isVehicleType(data.vehicleType)) throw new Error('Choose a vehicle type');
  return prisma.driver.create({
    data: {
      name: data.name.trim(),
      phone: data.phone.trim(),
      whatsapp: data.whatsapp?.trim() || null,
      photo: data.photo || null,
      vehicleType: data.vehicleType,
      vehicleDescription: data.vehicleDescription?.trim() || null,
      plateNumber: data.plateNumber?.trim() || null,
      area: data.area?.trim() || null,
      rating: Number(data.rating) || 0,
      verified: !!data.verified,
      status: data.status ?? 'ACTIVE',
      availability: data.availability ?? 'OFFLINE',
    },
  });
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

  export function registerRidesRoutes(router: Router) {
  router.get('/types', h(() => listVehicleTypes()));
  router.get('/drivers', h((req) => listDrivers({
    vehicleType: req.query.vehicleType as string | undefined,
    sort: req.query.sort as string | undefined,
    search: req.query.search as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  })));
}

export function registerRidesAdminRoutes(adminRouter: Router) {
  adminRouter.get('/rides', h((req) => adminListRides({
    status: req.query.status as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  })));

  adminRouter.patch('/rides/:id/assign', h(async (req) => {
    const ride = await adminAssignDriver(req.params.id as string, req.body?.driverId);
    await logAdminAction({
      adminId: req.user!.id,
      action: 'RIDE_DRIVER_ASSIGN' as any,
      targetType: 'Ride',
      targetId: ride.id,
      summary: `Assigned ${ride.driver?.name || 'a driver'} to ride #${shortId(ride.id)}`,
      metadata: { driverId: req.body?.driverId },
    });
    return ride;
  }));

  adminRouter.patch('/rides/:id/status', h(async (req) => {
    const ride = await adminUpdateRideStatus(req.params.id as string, req.body?.status, { finalFare: req.body?.finalFare });
    await logAdminAction({
      adminId: req.user!.id,
      action: 'RIDE_STATUS_CHANGE' as any,
      targetType: 'Ride',
      targetId: ride.id,
      summary: `Set ride #${shortId(ride.id)} to ${ride.status}`,
      metadata: { newStatus: ride.status, finalFare: ride.finalFare },
    });
    return ride;
  }));

  adminRouter.get('/drivers', h((req) => adminListDrivers({
    status: req.query.status as string | undefined,
    vehicleType: req.query.vehicleType as string | undefined,
  })));
  adminRouter.post('/drivers', h((req) => adminCreateDriver(req.body), 201));
  adminRouter.patch('/drivers/:id', h((req) => adminUpdateDriver(req.params.id as string, req.body)));

  adminRouter.get('/ride-rates', h(() => adminListRates()));
  adminRouter.put('/ride-rates/:vehicleType', h((req) => adminUpsertRate(req.params.vehicleType as string, req.body)));
}