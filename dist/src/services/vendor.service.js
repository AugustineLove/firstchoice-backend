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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVendor = registerVendor;
exports.getVendorProfile = getVendorProfile;
exports.getMyVendorProfile = getMyVendorProfile;
exports.updateVendorProfile = updateVendorProfile;
exports.getAllVendors = getAllVendors;
exports.getVendorOrders = getVendorOrders;
exports.getVendorStats = getVendorStats;
exports.validateOpeningHours = validateOpeningHours;
const prisma_1 = require("../config/prisma");
const NotificationService = __importStar(require("./notification.service"));
const hours_util_1 = require("../utils/hours.util");
async function registerVendor(userId, data) {
    const existingVendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (existingVendor)
        throw new Error('You already have a vendor profile');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const openingHours = data.openingHours ? validateOpeningHours(data.openingHours) : undefined;
    const vendor = await prisma_1.prisma.$transaction(async (tx) => {
        const newVendor = await tx.vendor.create({
            data: {
                userId,
                businessName: data.businessName.trim(),
                businessType: data.businessType.trim(),
                address: data.address.trim(),
                phone: data.phone.trim(),
                logo: data.logo || null,
                openingHours: openingHours ?? undefined,
            },
        });
        await tx.user.update({
            where: { id: userId },
            data: { role: 'VENDOR' },
        });
        await NotificationService.notifyVendorPendingApproval(data.businessName);
        return newVendor;
    });
    return vendor;
}
async function getVendorProfile(vendorId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
            user: {
                select: { name: true, phone: true, email: true },
            },
            products: {
                where: { available: true },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!vendor)
        throw new Error('Vendor not found');
    return { ...vendor, isOpen: (0, hours_util_1.isWithinHours)(vendor.openingHours) };
}
async function getMyVendorProfile(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({
        where: { userId },
        include: {
            products: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!vendor)
        throw new Error('No vendor profile found for this account');
    return vendor;
}
async function updateVendorProfile(userId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    // Basic sanity check: if provided, latitude/longitude must parse to real
    // numbers within valid GPS ranges before we persist them.
    if (data.latitude !== undefined) {
        const lat = Number(data.latitude);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            throw new Error('Invalid latitude value');
        }
    }
    if (data.longitude !== undefined) {
        const lng = Number(data.longitude);
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            throw new Error('Invalid longitude value');
        }
    }
    const payload = { ...data };
    if (data.openingHours !== undefined) {
        payload.openingHours = validateOpeningHours(data.openingHours);
    }
    return prisma_1.prisma.vendor.update({ where: { userId }, data: payload });
}
async function getAllVendors(filters) {
    const vendors = await prisma_1.prisma.vendor.findMany({
        where: {
            status: 'ACTIVE',
            ...(filters.businessType && { businessType: filters.businessType }),
            ...(filters.search && { businessName: { contains: filters.search, mode: 'insensitive' } }),
        },
        select: {
            id: true, businessName: true, businessType: true, address: true,
            logo: true, openingHours: true, rating: true, status: true,
        },
        orderBy: { rating: 'desc' },
    });
    return vendors.map((v) => ({ ...v, isOpen: (0, hours_util_1.isWithinHours)(v.openingHours) }));
}
async function getVendorOrders(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    return prisma_1.prisma.order.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
        include: {
            customer: { select: { name: true, phone: true } },
            rider: {
                select: { user: { select: { name: true, phone: true } } },
            },
            items: {
                include: { product: { select: { name: true, price: true } } },
            },
        },
    });
}
async function getVendorStats(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    const [totalOrders, completedOrders, pendingOrders, totalProducts] = await Promise.all([
        prisma_1.prisma.order.count({ where: { vendorId: vendor.id } }),
        prisma_1.prisma.order.count({
            where: { vendorId: vendor.id, orderStatus: 'DELIVERED' },
        }),
        prisma_1.prisma.order.count({
            where: {
                vendorId: vendor.id,
                orderStatus: { in: ['PENDING', 'ACCEPTED'] },
            },
        }),
        prisma_1.prisma.product.count({ where: { vendorId: vendor.id } }),
    ]);
    const revenue = await prisma_1.prisma.order.aggregate({
        where: { vendorId: vendor.id, orderStatus: 'DELIVERED' },
        _sum: { totalAmount: true },
    });
    return {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalProducts,
        totalRevenue: revenue._sum.totalAmount || 0,
    };
}
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function validateOpeningHours(hours) {
    if (typeof hours !== 'object' || hours === null) {
        throw new Error('openingHours must be an object keyed by day (0-6)');
    }
    const result = {};
    for (const [day, ranges] of Object.entries(hours)) {
        const dayNum = Number(day);
        if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
            throw new Error(`Invalid day key "${day}" — must be 0-6`);
        }
        if (!Array.isArray(ranges)) {
            throw new Error(`openingHours["${day}"] must be an array`);
        }
        result[day] = ranges.map((r) => {
            if (!r || typeof r.start !== 'string' || typeof r.end !== 'string') {
                throw new Error(`Invalid time range for day ${day}`);
            }
            if (!TIME_RE.test(r.start) || !TIME_RE.test(r.end)) {
                throw new Error(`Times must be HH:mm — got "${r.start}"–"${r.end}"`);
            }
            if (r.start >= r.end) {
                throw new Error(`Range start must be before end (day ${day})`);
            }
            return { start: r.start, end: r.end };
        });
    }
    return result;
}
//# sourceMappingURL=vendor.service.js.map