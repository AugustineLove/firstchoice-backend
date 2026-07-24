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
exports.createErrand = createErrand;
exports.getErrandById = getErrandById;
exports.updateErrandStatus = updateErrandStatus;
exports.getAllErrands = getAllErrands;
const prisma_1 = require("../config/prisma");
const socket_manager_1 = require("../socket/socket.manager");
const NotificationService = __importStar(require("./notification.service"));
async function createErrand(customerId, data) {
    if (data.budget <= 0)
        throw new Error('Budget must be greater than 0');
    const errand = prisma_1.prisma.errand.create({
        data: {
            customerId,
            description: data.description.trim(),
            instructions: data.instructions?.trim() || null,
            budget: data.budget,
            pickupLocation: data.pickupLocation?.trim() || null,
        },
    });
    await NotificationService.notifyNewErrand((await errand).id);
    return errand;
}
async function getErrandById(errandId, userId) {
    const errand = await prisma_1.prisma.errand.findUnique({
        where: { id: errandId },
        include: {
            customer: { select: { name: true, phone: true } },
        },
    });
    if (!errand)
        throw new Error('Errand not found');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const isCustomer = errand.customerId === userId;
    const isAdmin = user.role === 'ADMIN';
    const isRider = user.role === 'RIDER';
    if (!isCustomer && !isAdmin && !isRider)
        throw new Error('Access denied');
    return errand;
}
const validErrandTransitions = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
};
async function updateErrandStatus(errandId, userId, newStatus) {
    const errand = await prisma_1.prisma.errand.findUnique({ where: { id: errandId } });
    if (!errand)
        throw new Error('Errand not found');
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    if (newStatus === 'CANCELLED') {
        const isCustomer = errand.customerId === userId;
        const isAdmin = user.role === 'ADMIN';
        if (!isCustomer && !isAdmin)
            throw new Error('Only the customer or admin can cancel an errand');
        if (!['PENDING', 'ACCEPTED'].includes(errand.status))
            throw new Error('Errand can no longer be cancelled');
    }
    const allowed = validErrandTransitions[errand.status];
    if (!allowed.includes(newStatus))
        throw new Error(`Cannot transition from ${errand.status} to ${newStatus}`);
    (0, socket_manager_1.notifyUser)(errand.customerId, 'errand:status_update', {
        errandId,
        status: newStatus,
        timestamp: new Date(),
    });
    (0, socket_manager_1.notifyAdmins)('admin:errand_update', {
        errandId,
        status: newStatus,
        timestamp: new Date(),
    });
    const updatedErrand = prisma_1.prisma.errand.update({
        where: { id: errandId },
        data: { status: newStatus },
        include: {
            customer: { select: { name: true, phone: true } },
        },
    });
    await NotificationService.notifyErrandStatusChange(errandId, newStatus, errand.customerId);
    return updatedErrand;
}
async function getAllErrands(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
        ...(filters.status && { status: filters.status }),
    };
    const [errands, total] = await Promise.all([
        prisma_1.prisma.errand.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true, phone: true } },
            },
        }),
        prisma_1.prisma.errand.count({ where }),
    ]);
    return {
        errands,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
//# sourceMappingURL=errand.service.js.map