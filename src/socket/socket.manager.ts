import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { Role } from '../../generated/prisma/enums';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: Role;
}

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── AUTH MIDDLEWARE ──────────────────────────────────
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        role: Role;
      };

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, role: true, status: true },
      });

      if (!user) return next(new Error('User not found'));
      if (user.status === 'SUSPENDED')
        return next(new Error('Account suspended'));

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── CONNECTION ───────────────────────────────────────
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(
      `🔌 Connected: ${socket.userId} [${socket.userRole}] — ${socket.id}`
    );

    // Join personal room immediately on connect
    socket.join(`user:${socket.userId}`);

    // Role-based rooms
    if (socket.userRole === 'ADMIN') {
      socket.join('room:admins');
    }

    if (socket.userRole === 'RIDER') {
      socket.join('room:riders');
      handleRiderEvents(socket);
    }

    if (socket.userRole === 'VENDOR') {
      handleVendorEvents(socket);
    }

    if (socket.userRole === 'CUSTOMER') {
      handleCustomerEvents(socket);
    }

    // ─── DISCONNECT ─────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${socket.userId}`);

      // If rider disconnects, set them offline
      if (socket.userRole === 'RIDER') {
        await prisma.rider
          .update({
            where: { userId: socket.userId },
            data: { availability: 'OFFLINE' },
          })
          .catch(() => {});
      }
    });
  });

  return io;
}

// ─── RIDER EVENTS ─────────────────────────────────────────

function handleRiderEvents(socket: AuthenticatedSocket) {
  // Rider joins their order room
  socket.on('rider:join_order', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`Rider ${socket.userId} joined order room: ${orderId}`);
  });

  // Rider explicitly fetches pending deliveries on connect
  socket.on('rider:fetch_pending', async () => {
    try {
      const { prisma } = await import('../config/prisma');
      const pending = await prisma.deliveryRequest.findMany({
        where: { status: 'PENDING', assignedRiderId: null },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      });
      socket.emit('delivery:pending_list', pending);
    } catch {}
  });

  // Rider updates live location
  socket.on(
    'rider:location_update',
    async (data: { latitude: number; longitude: number; orderId?: string }) => {
      if (!data.latitude || !data.longitude) return;

      // Save to DB
      await prisma.rider
        .update({
          where: { userId: socket.userId },
          data: {
            currentLatitude: data.latitude,
            currentLongitude: data.longitude,
          },
        })
        .catch(() => {});

      // Broadcast to order room if active delivery
      if (data.orderId) {
        socket.to(`order:${data.orderId}`).emit('order:rider_location', {
          orderId: data.orderId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date(),
        });
      }

      // Broadcast to admins
      io.to('room:admins').emit('admin:rider_location', {
        riderId: socket.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date(),
      });
    }
  );

  // Rider goes online/offline
  socket.on('rider:availability', async (availability: 'ONLINE' | 'OFFLINE') => {
    await prisma.rider
      .update({
        where: { userId: socket.userId },
        data: { availability },
      })
      .catch(() => {});

    io.to('room:admins').emit('admin:rider_availability', {
      riderId: socket.userId,
      availability,
      timestamp: new Date(),
    });

    socket.emit('rider:availability_updated', { availability });
  });
}

// ─── VENDOR EVENTS ────────────────────────────────────────

function handleVendorEvents(socket: AuthenticatedSocket) {
  // Vendor joins their order room
  socket.on('vendor:join', async () => {
    const vendor = await prisma.vendor
      .findUnique({ where: { userId: socket.userId } })
      .catch(() => null);

    if (vendor) {
      socket.join(`vendor:${vendor.id}`);
      console.log(`Vendor ${socket.userId} joined vendor room: ${vendor.id}`);
    }
  });
}

// ─── CUSTOMER EVENTS ──────────────────────────────────────

function handleCustomerEvents(socket: AuthenticatedSocket) {
  // Customer tracks a specific order
  socket.on('customer:track_order', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`Customer ${socket.userId} tracking order: ${orderId}`);
  });

  // Customer stops tracking
  socket.on('customer:untrack_order', (orderId: string) => {
    socket.leave(`order:${orderId}`);
  });
}

// ─── EMIT HELPERS ─────────────────────────────────────────
// These are called from services to push events to clients

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

// Notify a specific user
export function notifyUser(userId: string, event: string, data: any) {
  getIO().to(`user:${userId}`).emit(event, data);
}

// Notify everyone in an order room
export function notifyOrderRoom(orderId: string, event: string, data: any) {
  getIO().to(`order:${orderId}`).emit(event, data);
}

// Notify all admins
export function notifyAdmins(event: string, data: any) {
  getIO().to('room:admins').emit(event, data);
}

// Notify a vendor
export function notifyVendor(vendorId: string, event: string, data: any) {
  getIO().to(`vendor:${vendorId}`).emit(event, data);
}

// Notify all online riders
export function notifyRiders(event: string, data: any) {
  getIO().to('room:riders').emit(event, data);
}