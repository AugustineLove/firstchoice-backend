"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.notifyUser = notifyUser;
exports.notifyOrderRoom = notifyOrderRoom;
exports.notifyAdmins = notifyAdmins;
exports.notifyVendor = notifyVendor;
exports.notifyRiders = notifyRiders;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
let io;
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
            methods: ['GET', 'POST'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: payload.id },
                select: { id: true, role: true, status: true },
            });
            if (!user)
                return next(new Error('User not found'));
            if (user.status === 'SUSPENDED')
                return next(new Error('Account suspended'));
            socket.userId = user.id;
            socket.userRole = user.role;
            next();
        }
        catch {
            next(new Error('Invalid or expired token'));
        }
    });
    // ─── CONNECTION ───────────────────────────────────────
    io.on('connection', (socket) => {
        console.log(`🔌 Connected: ${socket.userId} [${socket.userRole}] — ${socket.id}`);
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
                await prisma_1.prisma.rider
                    .update({
                    where: { userId: socket.userId },
                    data: { availability: 'OFFLINE' },
                })
                    .catch(() => { });
            }
        });
    });
    return io;
}
// ─── RIDER EVENTS ─────────────────────────────────────────
function handleRiderEvents(socket) {
    // Rider joins their order room
    socket.on('rider:join_order', (orderId) => {
        socket.join(`order:${orderId}`);
        console.log(`Rider ${socket.userId} joined order room: ${orderId}`);
    });
    // Rider explicitly fetches pending deliveries on connect
    socket.on('rider:fetch_pending', async () => {
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/prisma')));
            const pending = await prisma.deliveryRequest.findMany({
                where: { status: 'PENDING', assignedRiderId: null },
                include: { customer: { select: { name: true, phone: true } } },
                orderBy: { createdAt: 'desc' },
            });
            socket.emit('delivery:pending_list', pending);
        }
        catch { }
    });
    // Rider updates live location
    socket.on('rider:location_update', async (data) => {
        if (!data.latitude || !data.longitude)
            return;
        // Save to DB
        await prisma_1.prisma.rider
            .update({
            where: { userId: socket.userId },
            data: {
                currentLatitude: data.latitude,
                currentLongitude: data.longitude,
            },
        })
            .catch(() => { });
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
    });
    // Rider goes online/offline
    socket.on('rider:availability', async (availability) => {
        await prisma_1.prisma.rider
            .update({
            where: { userId: socket.userId },
            data: { availability },
        })
            .catch(() => { });
        io.to('room:admins').emit('admin:rider_availability', {
            riderId: socket.userId,
            availability,
            timestamp: new Date(),
        });
        socket.emit('rider:availability_updated', { availability });
    });
}
// ─── VENDOR EVENTS ────────────────────────────────────────
function handleVendorEvents(socket) {
    // Vendor joins their order room
    socket.on('vendor:join', async () => {
        const vendor = await prisma_1.prisma.vendor
            .findUnique({ where: { userId: socket.userId } })
            .catch(() => null);
        if (vendor) {
            socket.join(`vendor:${vendor.id}`);
            console.log(`Vendor ${socket.userId} joined vendor room: ${vendor.id}`);
        }
    });
}
// ─── CUSTOMER EVENTS ──────────────────────────────────────
function handleCustomerEvents(socket) {
    // Customer tracks a specific order
    socket.on('customer:track_order', (orderId) => {
        socket.join(`order:${orderId}`);
        console.log(`Customer ${socket.userId} tracking order: ${orderId}`);
    });
    // Customer stops tracking
    socket.on('customer:untrack_order', (orderId) => {
        socket.leave(`order:${orderId}`);
    });
}
// ─── EMIT HELPERS ─────────────────────────────────────────
// These are called from services to push events to clients
function getIO() {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
}
// Notify a specific user
function notifyUser(userId, event, data) {
    getIO().to(`user:${userId}`).emit(event, data);
}
// Notify everyone in an order room
function notifyOrderRoom(orderId, event, data) {
    getIO().to(`order:${orderId}`).emit(event, data);
}
// Notify all admins
function notifyAdmins(event, data) {
    getIO().to('room:admins').emit(event, data);
}
// Notify a vendor
function notifyVendor(vendorId, event, data) {
    getIO().to(`vendor:${vendorId}`).emit(event, data);
}
// Notify all online riders
function notifyRiders(event, data) {
    getIO().to('room:riders').emit(event, data);
}
//# sourceMappingURL=socket.manager.js.map